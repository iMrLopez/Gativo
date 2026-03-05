class HttpProtocol {
  /**
   * Extract RFID tag information from HTTP GET request data
   * @param {Buffer} data - Raw HTTP request data
   * @returns {Array} Array of tag objects with { tag, readerSn } or empty array
   */
  extractTags(data) {
    try {
      const text = data.toString();
      
      // Parse the first line of the HTTP request
      const firstLine = text.split("\r\n")[0];
      const parts = firstLine.split(" ");
      
      if (parts.length < 2) {
        return [];
      }
      
      const query = parts[1];
      
      // Parse query parameters - handle both /?param=value and direct param=value formats
      const params = {};
      let queryString = '';
      
      if (query.startsWith('/?')) {
        // Standard HTTP format: /?param=value
        queryString = query.substring(2);
      } else if (query.includes('=') && query.includes('&')) {
        // Direct parameter format: param=value&param2=value2
        queryString = query;
      } else if (query.startsWith('/') && query.includes('=')) {
        // Format: /param=value&param2=value2
        queryString = query.substring(1);
      }
      
      if (queryString) {
        queryString.split("&").forEach(pair => {
          const [key, value] = pair.split("=");
          if (key && value) {
            params[key] = decodeURIComponent(value);
          }
        });
      }

      // Check if this is a heartbeat/keep-alive request
      if (params.heart === '1' || params.heartbeat === '1') {
        console.log('💓 Heartbeat from reader:', params.readsn || 'unknown');
        return []; // Return empty - this is not a tag read
      }

      const tagId = params.id;
      const readerSn = params.readsn;
      
      if (!tagId) {
        console.warn('⚠️  HTTP request missing "id" parameter');
        return [];
      }
      
      // Clean and validate the tag
      const cleanTag = this._cleanTag(tagId);
      if (!cleanTag) {
        return [];
      }
      
      const tagInfo = {
        tag: cleanTag,
        readerSn: readerSn || 'unknown'
      };
      
      return [tagInfo];
      
    } catch (error) {
      console.warn('⚠️  Error parsing HTTP request:', error.message);
      return [];
    }
  }
  
  /**
   * Clean and validate a tag ID
   * @private
   * @param {string} tagString - Raw tag ID string
   * @returns {string|null} Cleaned tag ID or null if invalid
   */
  _cleanTag(tagString) {
    try {
      if (!tagString || typeof tagString !== 'string') {
        return null;
      }
      
      // Strip whitespace
      const trimmed = tagString.trim();
      
      // Basic validation - ensure it's not empty and has reasonable length
      if (!trimmed || trimmed.length < 1 || trimmed.length > 50) {
        return null;
      }

      // Remove any control characters except printable ASCII
      const cleanTag = trimmed.replace(/[^\x20-\x7E]/g, '');
      
      return cleanTag || null;
    } catch (error) {
      console.warn('⚠️  Error cleaning tag:', error.message);
      return null;
    }
  }
}

module.exports = new HttpProtocol();