const config = require('./config');

class DebounceManager {
  constructor() {
    // Map to track last trigger timestamp for each tag
    this.tagLastTriggered = new Map();
  }

  /**
   * Check if a tag should be debounced (blocked from triggering)
   * @param {string} tag - Tag ID to check
   * @returns {boolean} True if tag should be debounced
   */
  shouldDebounce(tag) {
    const debounceMs = config.debounce.milliseconds;
    const now = Date.now();
    const lastTriggered = this.tagLastTriggered.get(tag);
    
    if (!lastTriggered) {
      // First time seeing this tag
      return false;
    }
    
    const timeSinceLastTrigger = now - lastTriggered;
    return timeSinceLastTrigger < debounceMs;
  }

  /**
   * Mark a tag as triggered with current timestamp
   * @param {string} tag - Tag ID that was triggered
   */
  markTriggered(tag) {
    this.tagLastTriggered.set(tag, Date.now());
  }

  /**
   * Get human-readable time remaining
   * @param {string} tag - Tag ID to check
   * @returns {string} Human readable time string
   */
  getTimeRemainingFormatted(tag) {
    const lastTriggered = this.tagLastTriggered.get(tag);
    
    if (!lastTriggered) {
      return 'Ready';
    }
    
    const debounceMs = config.debounce.milliseconds;
    const now = Date.now();
    const timeSinceLastTrigger = now - lastTriggered;
    const remaining = Math.max(0, debounceMs - timeSinceLastTrigger);
    
    if (remaining === 0) {
      return 'Ready';
    }
    
    const minutes = Math.ceil(remaining / (60 * 1000));
    return `${minutes}m remaining`;
  }

  /**
   * Clean up old trigger records to prevent memory leaks
   * @returns {number} Number of records cleaned up
   */
  cleanup() {
    const cleanupThreshold = config.debounce.milliseconds * 2; // Keep entries for 2x debounce time
    const cutoffTime = Date.now() - cleanupThreshold;
    
    let cleanedCount = 0;
    
    for (const [tag, timestamp] of this.tagLastTriggered.entries()) {
      if (timestamp < cutoffTime) {
        this.tagLastTriggered.delete(tag);
        cleanedCount++;
      }
    }
    
    if (cleanedCount > 0) {
      console.log(`🧹 Cleaned up ${cleanedCount} old trigger records`);
    }
    
    return cleanedCount;
  }
}

module.exports = new DebounceManager();