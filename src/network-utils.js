const os = require('os');

class NetworkUtils {
  /**
   * Get the local IP address of the device
   * @returns {string} Local IP address or 'localhost' if not found
   */
  getLocalIP() {
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

  /**
   * Format a client address for logging
   * @param {object} socket - TCP socket object
   * @returns {string} Formatted address string
   */
  formatClientAddress(socket) {
    return `${socket.remoteAddress}:${socket.remotePort}`;
  }
}

module.exports = new NetworkUtils();