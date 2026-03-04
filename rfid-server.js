const net = require('net');
const config = require('./src/config');
const networkUtils = require('./src/network-utils');
const httpClient = require('./src/http-client');
const debounceManager = require('./src/debounce-manager');
const rfidProtocol = require('./src/rfid-protocol');
const tagDatabase = require('./src/tag-database');

class RfidServer {
  constructor() {
    this.server = null;
    this.isRunning = false;
    this.connectionCount = 0;
  }

  /**
   * Initialize the server
   */
  async initialize() {
    console.log('🚀 Initializing RFID Server...');
    console.log(`⚙️  Server configuration: ${config.server.host}:${config.server.port}`);
    console.log(`⏱️  Tag debounce: ${config.debounce.minutes} minutes`);
    
    // Load initial approved tags
    await this.loadApprovedTags();
    
    // Set up periodic tasks
    this.setupPeriodicTasks();
    
    // Perform health check
    await this.healthCheck();
    
    console.log('✅ Server initialization complete');
  }

  /**
   * Load approved tags from remote endpoint
   */
  async loadApprovedTags() {
    console.log('📋 Loading approved tags database...');
    const success = await tagDatabase.loadApprovedTags();
    
    if (success) {
      const stats = tagDatabase.getStats();
      console.log(`📊 Loaded ${stats.totalApprovedTags} approved tags`);
    }
  }

  /**
   * Set up periodic maintenance tasks
   */
  setupPeriodicTasks() {
    // Refresh approved tags (if auto-update enabled)
    if (config.tagDatabase.autoUpdate) {
      setInterval(async () => {
        console.log('🔄 Auto-refreshing approved tags database...');
        await tagDatabase.loadApprovedTags();
      }, config.intervals.refreshTags);
      
      console.log(`🔄 Tag database auto-update enabled (every ${config.tagDatabase.updateFrequencyMinutes} minutes)`);
    } else {
      console.log('⚠️  Tag database auto-update disabled');
    }
    
    // Cleanup debounce records (automatically every 2x debounce time)
    setInterval(() => {
      debounceManager.cleanup();
    }, config.intervals.cleanup);
    
    console.log(`🧹 Debounce cleanup runs every ${config.intervals.cleanup / 60000} minutes`);
    console.log('⏰ Periodic tasks configured');
  }

  /**
   * Perform health check on configured endpoints
   */
  async healthCheck() {
    console.log('🏥 Performing health check...');
    
    try {
      const health = await httpClient.healthCheck();
      
      console.log(`📡 Approved tags endpoint: ${health.approvedTags.configured ? '✅' : '❌'} configured, ${health.approvedTags.reachable ? '✅' : '⚠️'} reachable`);
      console.log(`🎯 Trigger endpoint: ${health.trigger.configured ? '✅' : '❌'} configured`);
    } catch (error) {
      console.warn('⚠️  Health check failed:', error.message);
    }
  }

  /**
   * Process received RFID tag
   */
  async processTag(tag, clientAddress) {
    console.log('🏷️ ', tag);
    
    // Check if tag is approved
    if (!tagDatabase.isApproved(tag)) {
      console.log('❌ Tag not in approved list:', tag);
      console.log('--break--');
      return;
    }

    // Check debounce
    if (debounceManager.shouldDebounce(tag)) {
      const timeRemaining = debounceManager.getTimeRemainingFormatted(tag);
      console.log(`⏱️  Tag ${tag} debounced (${timeRemaining})`);
      console.log('--break--');
      return;
    }

    // Tag is approved and not debounced - trigger endpoint
    console.log('✅ APPROVED TAG DETECTED:', tag);
    
    debounceManager.markTriggered(tag);
    
    if (config.isConfigured('trigger')) {
      await httpClient.triggerEndpoint(tag);
    } else {
      console.log('⚠️  Trigger endpoint not configured - skipping trigger');
    }
    
    console.log('--break--');
  }

  /**
   * Handle new TCP connection
   */
  handleConnection(socket) {
    this.connectionCount++;
    const clientAddress = networkUtils.formatClientAddress(socket);
    
    console.log(`🔌 Connected: ${clientAddress} (total: ${this.connectionCount})`);

    let buffer = [];

    socket.on('data', async (data) => {
      try {
        // Convert Buffer to array and append to our buffer
        buffer = buffer.concat(Array.from(data));
        
        // Extract tags using RFID protocol parser
        const tags = rfidProtocol.extractTags(buffer);
        
        // Process each extracted tag
        for (const tag of tags) {
          await this.processTag(tag, clientAddress);
        }
      } catch (error) {
        console.error(`🚨 Error processing data from ${clientAddress}:`, error.message);
      }
    });

    socket.on('close', () => {
      this.connectionCount--;
      console.log(`❌ Disconnected: ${clientAddress} (remaining: ${this.connectionCount})`);
    });

    socket.on('error', (err) => {
      console.error(`🚨 Socket error for ${clientAddress}:`, err.message);
    });
  }

  /**
   * Start the TCP server
   */
  async start() {
    if (this.isRunning) {
      console.log('⚠️  Server is already running');
      return;
    }

    await this.initialize();

    this.server = net.createServer((socket) => {
      this.handleConnection(socket);
    });

    const ip = networkUtils.getLocalIP();
    
    return new Promise((resolve, reject) => {
      this.server.listen(config.server.port, config.server.host, () => {
        this.isRunning = true;
        
        console.log(`🚀 RFID Server listening on ${ip}:${config.server.port}`);
        console.log(`🏷️  Ready to receive RFID tags`);
        
        resolve();
      });

      this.server.on('error', (err) => {
        console.error('🚨 Server error:', err);
        reject(err);
      });
    });
  }

  /**
   * Stop the server gracefully
   */
  async stop() {
    if (!this.isRunning || !this.server) {
      console.log('⚠️  Server is not running');
      return;
    }

    return new Promise((resolve) => {
      this.server.close(() => {
        this.isRunning = false;
        console.log('🛑 RFID Server stopped');
        resolve();
      });
    });
  }
}

// Main execution
async function main() {
  const server = new RfidServer();
  
  try {
    await server.start();
  } catch (error) {
    console.error('💥 Failed to start server:', error.message);
    process.exit(1);
  }

  // Graceful shutdown handling
  process.on('SIGINT', async () => {
    console.log('\n🛑 Received shutdown signal...');
    await server.stop();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    console.log('\n🛑 Received termination signal...');
    await server.stop();
    process.exit(0);
  });
}

// Export for testing
module.exports = RfidServer;

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}