const net = require('net');
const os = require('os');
const https = require('https');
const http = require('http');
require('dotenv').config();

const HOST = '0.0.0.0';
const PORT = 6969;
const STX = 0x02;
const ETX = 0x03;

// In-memory database for approved tags
let approvedTags = new Set();

// Debounce tracking - stores last trigger timestamp for each tag
const tagLastTriggered = new Map();

function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    const networkInterfaces = interfaces[name];
    if (networkInterfaces) {
      for (const netInterface of networkInterfaces) {
        if (netInterface.family === 'IPv4' && !netInterface.internal) {
          return netInterface.address;
        }
      }
    }
  }
  return 'localhost';
}

async function fetchApprovedTags() {
  const endpoint = process.env.APPROVED_TAGS_ENDPOINT;
  if (!endpoint) {
    console.log('⚠️  APPROVED_TAGS_ENDPOINT not configured in .env');
    return [];
  }

  return new Promise((resolve, reject) => {
    console.log('🔄 Fetching approved tags from:', endpoint);
    
    const client = endpoint.startsWith('https://') ? https : http;
    const request = client.get(endpoint, (response) => {
      let data = '';

      response.on('data', (chunk) => {
        data += chunk;
      });

      response.on('end', () => {
        try {
          const tags = JSON.parse(data);
          if (Array.isArray(tags)) {
            console.log(`✅ Loaded ${tags.length} approved tags`);
            resolve(tags);
          } else {
            console.log('❌ Invalid response format - expected array');
            resolve([]);
          }
        } catch (error) {
          console.error('❌ Error parsing approved tags response:', error.message);
          resolve([]);
        }
      });
    });

    request.on('error', (error) => {
      console.error('❌ Error fetching approved tags:', error.message);
      resolve([]);
    });

    request.setTimeout(5000, () => {
      console.error('❌ Timeout fetching approved tags');
      request.destroy();
      resolve([]);
    });
  });
}

async function triggerEndpoint(tag) {
  const endpoint = process.env.TRIGGER_ENDPOINT;
  if (!endpoint) {
    console.log('⚠️  TRIGGER_ENDPOINT not configured in .env');
    return;
  }

  return new Promise((resolve) => {
    console.log(`🚀 Triggering endpoint for approved tag: ${tag}`);
    
    const client = endpoint.startsWith('https://') ? https : http;
    const request = client.get(`${endpoint}?tag=${encodeURIComponent(tag)}`, (response) => {
      let data = '';

      response.on('data', (chunk) => {
        data += chunk;
      });

      response.on('end', () => {
        console.log(`✅ Trigger response (${response.statusCode}):`, data.substring(0, 100));
        resolve();
      });
    });

    request.on('error', (error) => {
      console.error('❌ Error triggering endpoint:', error.message);
      resolve();
    });

    request.setTimeout(5000, () => {
      console.error('❌ Timeout triggering endpoint');
      request.destroy();
      resolve();
    });
  });
}

async function loadApprovedTags() {
  try {
    const tags = await fetchApprovedTags();
    approvedTags = new Set(tags);
    console.log('📊 Approved tags database updated');
  } catch (error) {
    console.error('❌ Error loading approved tags:', error.message);
  }
}

function shouldDebounceTag(tag) {
  const debounceMinutes = parseInt(process.env.DEBOUNCE_MINUTES) || 5;
  const debounceMs = debounceMinutes * 60 * 1000;
  const now = Date.now();
  const lastTriggered = tagLastTriggered.get(tag);
  
  if (!lastTriggered) {
    // First time seeing this tag
    return false;
  }
  
  const timeSinceLastTrigger = now - lastTriggered;
  return timeSinceLastTrigger < debounceMs;
}

function markTagTriggered(tag) {
  tagLastTriggered.set(tag, Date.now());
}

function cleanupOldTriggers() {
  const debounceMinutes = parseInt(process.env.DEBOUNCE_MINUTES) || 5;
  const cleanupThreshold = debounceMinutes * 60 * 1000 * 2; // Keep entries for 2x debounce time
  const cutoffTime = Date.now() - cleanupThreshold;
  
  let cleanedCount = 0;
  for (const [tag, timestamp] of tagLastTriggered.entries()) {
    if (timestamp < cutoffTime) {
      tagLastTriggered.delete(tag);
      cleanedCount++;
    }
  }
  
  if (cleanedCount > 0) {
    console.log(`🧹 Cleaned up ${cleanedCount} old trigger records`);
  }
}

function extractTags(buf) {
  const tags = [];
  
  while (true) {
    // Find STX
    const stxIndex = buf.indexOf(STX);
    if (stxIndex === -1) {
      // No STX left; clear buffer
      buf.length = 0;
      break;
    }

    // Drop anything before STX
    if (stxIndex > 0) {
      buf.splice(0, stxIndex);
    }

    // Find ETX
    const etxIndex = buf.indexOf(ETX, 1);
    if (etxIndex === -1) {
      // Wait for more data
      break;
    }

    // Extract payload between STX and ETX
    const payload = Buffer.from(buf.slice(1, etxIndex));
    buf.splice(0, etxIndex + 1);

    // Strip CR/LF and spaces
    const cleanPayload = payload.toString('ascii').trim();
    if (cleanPayload) {
      tags.push(cleanPayload);
    }
  }

  return tags;
}

async function main() {
  // Load approved tags on startup
  console.log('📋 Loading approved tags database...');
  await loadApprovedTags();
  
  // Show debounce configuration
  const debounceMinutes = parseInt(process.env.DEBOUNCE_MINUTES) || 5;
  console.log(`⏱️  Tag debounce set to ${debounceMinutes} minutes`);
  
  // Refresh approved tags every 5 minutes
  setInterval(async () => {
    console.log('🔄 Refreshing approved tags database...');
    await loadApprovedTags();
  }, 5 * 60 * 1000);
  
  // Clean up old trigger records every 10 minutes
  setInterval(() => {
    cleanupOldTriggers();
  }, 10 * 60 * 1000);

  const server = net.createServer();

  server.on('connection', (socket) => {
    const clientAddress = `${socket.remoteAddress}:${socket.remotePort}`;
    console.log(`🔌 Connected: ${clientAddress}`);

    let buffer = [];

    socket.on('data', async (data) => {
      // Convert Buffer to array and append to our buffer
      buffer = buffer.concat(Array.from(data));
      
      const tags = extractTags(buffer);
      for (const tag of tags) {
        console.log('🏷️ ', tag);
        
        // Check if tag is approved
        if (approvedTags.has(tag)) {
          // Check debounce before triggering
          if (shouldDebounceTag(tag)) {
            const debounceMinutes = parseInt(process.env.DEBOUNCE_MINUTES) || 5;
            console.log(`⏱️  Tag ${tag} debounced (triggered within ${debounceMinutes} minutes)`);
          } else {
            console.log('✅ APPROVED TAG DETECTED:', tag);
            markTagTriggered(tag);
            await triggerEndpoint(tag);
          }
        } else {
          console.log('❌ Tag not in approved list:', tag);
        }
        
        console.log('--break--');
      }
    });

    socket.on('close', () => {
      console.log(`❌ Disconnected: ${clientAddress}`);
    });

    socket.on('error', (err) => {
      console.error(`🚨 Socket error for ${clientAddress}:`, err.message);
    });
  });

  const ip = getLocalIP();
  
  server.listen(PORT, HOST, () => {
    console.log(`🚀 RFID Server listening on ${ip}:${PORT}`);
  });

  server.on('error', (err) => {
    console.error('🚨 Server error:', err);
  });
}

if (require.main === module) {
  main().catch(console.error);
}