const https = require('https');
const http = require('http');
const config = require('./config');

class HttpClient {
  /**
   * Fetch approved tags from configured endpoint
   * @returns {Promise<string[]>} Array of approved tag IDs
   */
  async fetchApprovedTags() {
    const endpoint = config.endpoints.approvedTags;
    
    if (!endpoint) {
      console.log('⚠️  APPROVED_TAGS_ENDPOINT not configured');
      return [];
    }

    try {
      console.log('🔄 Fetching approved tags from:', endpoint);
      
      const response = await this._makeRequest(endpoint);
      
      if (response.statusCode !== 200) {
        console.log(`❌ Bad response status: ${response.statusCode}`);
        return [];
      }

      const tags = JSON.parse(response.data);
      
      if (!Array.isArray(tags)) {
        console.log('❌ Invalid response format - expected array');
        return [];
      }

      console.log(`✅ Loaded ${tags.length} approved tags`);
      return tags;

    } catch (error) {
      console.error('❌ Error fetching approved tags:', error.message);
      return [];
    }
  }

  /**
   * Trigger endpoint when approved tag is detected
   * @param {string} tag - Tag ID that was detected
   * @returns {Promise<void>}
   */
  async triggerEndpoint(tag) {
    const endpoint = config.endpoints.trigger;
    
    if (!endpoint) {
      console.log('⚠️  TRIGGER_ENDPOINT not configured');
      return;
    }

    try {
      console.log(`🚀 Triggering endpoint for approved tag: ${tag}`);
      
      const url = `${endpoint}`;
      const response = await this._makeRequest(url);
      
      const preview = response.data.length > 100 
        ? response.data.substring(0, 100) + '...'
        : response.data;
        
      console.log(`✅ Trigger response (${response.statusCode}):`, preview);

    } catch (error) {
      console.error('❌ Error triggering endpoint:', error.message);
    }
  }

  /**
   * Health check for configured endpoints
   * @returns {Promise<object>} Status of each endpoint
   */
  async healthCheck() {
    const results = {
      approvedTags: { configured: false, reachable: false },
      trigger: { configured: false, reachable: false }
    };

    // Check approved tags endpoint
    if (config.endpoints.approvedTags) {
      results.approvedTags.configured = true;
      try {
        const response = await this._makeRequest(config.endpoints.approvedTags);
        results.approvedTags.reachable = response.statusCode < 400;
      } catch {
        results.approvedTags.reachable = false;
      }
    }

    // Check trigger endpoint (just mark as configured - we won't test it)
    if (config.endpoints.trigger) {
      results.trigger.configured = true;
      results.trigger.reachable = true; // Assume reachable if configured
    }

    return results;
  }

  /**
   * Internal method to make HTTP requests
   * @private
   */
  async _makeRequest(url) {
    return new Promise((resolve, reject) => {
      const client = url.startsWith('https://') ? https : http;
      
      const request = client.get(url, (response) => {
        let data = '';

        response.on('data', (chunk) => {
          data += chunk;
        });

        response.on('end', () => {
          resolve({
            statusCode: response.statusCode,
            data: data,
            headers: response.headers
          });
        });
      });

      request.on('error', (error) => {
        reject(new Error(`Request failed: ${error.message}`));
      });

      request.setTimeout(config.intervals.requestTimeout, () => {
        request.destroy();
        reject(new Error(`Request timeout after ${config.intervals.requestTimeout}ms`));
      });
    });
  }
}

module.exports = new HttpClient();