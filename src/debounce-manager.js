const config = require('./config');

class DebounceManager {
  constructor() {
    this.tagLastTriggered = new Map();
    this.triggerLockedUntil = 0;
  }

  shouldDebounceTag(tag) {
    const debounceMs = config.debounce.tag.milliseconds;
    const now = Date.now();
    const lastTriggered = this.tagLastTriggered.get(tag);
    if (!lastTriggered) return false;
    return (now - lastTriggered) < debounceMs;
  }

  isTriggerLocked() {
    return Date.now() < this.triggerLockedUntil;
  }

  getTriggerLockTimeRemainingFormatted() {
    const remaining = Math.max(0, this.triggerLockedUntil - Date.now());
    if (remaining === 0) return 'Ready';
    const minutes = Math.ceil(remaining / (60 * 1000));
    return `${minutes}m remaining`;
  }

  markTriggered(tag) {
    const now = Date.now();
    this.tagLastTriggered.set(tag, now);

    const triggerMs = config.debounce.trigger.milliseconds;
    if (triggerMs > 0) {
      this.triggerLockedUntil = now + triggerMs;
      console.log(`🔒 Trigger lock armed for ${config.debounce.trigger.minutes}m — all tags blocked until lock expires`);
    }
  }

  getTimeRemainingFormatted(tag) {
    const lastTriggered = this.tagLastTriggered.get(tag);
    if (!lastTriggered) return 'Ready';

    const debounceMs = config.debounce.tag.milliseconds;
    const remaining = Math.max(0, debounceMs - (Date.now() - lastTriggered));
    if (remaining === 0) return 'Ready';

    const minutes = Math.ceil(remaining / (60 * 1000));
    return `${minutes}m remaining`;
  }

  cleanup() {
    const cleanupThreshold = Math.max(config.debounce.tag.milliseconds, config.debounce.trigger.milliseconds) * 2;
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