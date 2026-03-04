const config = require('./config');

class RfidProtocol {
  constructor() {
    this.STX = config.protocol.STX;
    this.ETX = config.protocol.ETX;
  }

  /**
   * Extract RFID tags from binary buffer using STX/ETX protocol
   * @param {Array<number>} buffer - Buffer array to process (will be modified)
   * @returns {string[]} Array of extracted tag IDs
   */
  extractTags(buffer) {
    const tags = [];
    
    while (true) {
      // Find STX (Start of Text)
      const stxIndex = buffer.indexOf(this.STX);
      if (stxIndex === -1) {
        // No STX left; clear remaining junk data
        buffer.length = 0;
        break;
      }

      // Drop any junk data before STX
      if (stxIndex > 0) {
        buffer.splice(0, stxIndex);
      }

      // Find ETX (End of Text) after STX
      const etxIndex = buffer.indexOf(this.ETX, 1);
      if (etxIndex === -1) {
        // ETX not found; wait for more data
        break;
      }

      // Extract payload between STX and ETX
      const payloadBytes = buffer.slice(1, etxIndex);
      const payload = Buffer.from(payloadBytes);
      
      // Remove the processed message from buffer
      buffer.splice(0, etxIndex + 1);

      // Clean and validate the tag
      const tag = this._cleanTag(payload);
      if (tag) {
        tags.push(tag);
      }
    }

    return tags;
  }

  /**
   * Clean and validate a tag from raw payload
   * @private
   * @param {Buffer} payload - Raw payload buffer
   * @returns {string|null} Cleaned tag ID or null if invalid
   */
  _cleanTag(payload) {
    try {
      // Convert to ASCII and strip whitespace
      const tagString = payload.toString('ascii').trim();
      
      // Basic validation - ensure it's not empty and has reasonable length
      if (!tagString || tagString.length < 1 || tagString.length > 50) {
        return null;
      }

      // Remove any control characters except printable ASCII
      const cleanTag = tagString.replace(/[^\x20-\x7E]/g, '');
      
      return cleanTag || null;
    } catch (error) {
      console.warn('⚠️  Error cleaning tag payload:', error.message);
      return null;
    }
  }
}

module.exports = new RfidProtocol();