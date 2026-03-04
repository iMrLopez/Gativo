require('dotenv').config();

class Config {
  constructor() {
    this.validateRequired();
  }

  get server() {
    return {
      host: '0.0.0.0',
      port: 6969
    };
  }

  get protocol() {
    return {
      STX: 0x02,
      ETX: 0x03
    };
  }

  get endpoints() {
    return {
      approvedTags: process.env.TAGS_DB_ENDPOINT,
      trigger: process.env.TRIGGER_ENDPOINT
    };
  }

  get debounce() {
    return {
      minutes: parseInt(process.env.DEBOUNCE_MINUTES) || 5,
      get milliseconds() {
        return this.minutes * 60 * 1000;
      }
    };
  }

  get defaultApprovedTags() {
    if (!process.env.DEFAULT_APPROVED_TAGS) {
      return [];
    }
    
    try {
      const parsed = JSON.parse(process.env.DEFAULT_APPROVED_TAGS);
      if (Array.isArray(parsed)) {
        return parsed.filter(tag => typeof tag === 'string' && tag.trim().length > 0);
      }
    } catch (error) {
      console.log('⚠️  Invalid DEFAULT_APPROVED_TAGS format, expected JSON array');
    }
    
    return [];
  }

  get tagDatabase() {
    const autoUpdate = process.env.TAGS_DB_AUTOUPDATE?.toLowerCase();
    const updateFrequency = parseInt(process.env.TAGS_DB_UPDATE_FREQUENCY) || 5;
    
    return {
      autoUpdate: autoUpdate === 'true' || autoUpdate === 'on' || autoUpdate === '1',
      updateFrequencyMinutes: updateFrequency,
      get updateFrequencyMs() {
        return this.updateFrequencyMinutes * 60 * 1000;
      }
    };
  }

  get intervals() {
    const timeoutSeconds = parseInt(process.env.REQUEST_TIMEOUT_SECONDS) || 5;
    
    return {
      refreshTags: this.tagDatabase.updateFrequencyMs, // Use tag DB frequency
      cleanup: this.debounce.milliseconds * 2,        // 2x debounce time for cleanup
      requestTimeout: timeoutSeconds * 1000           // seconds to milliseconds
    };
  }

  validateRequired() {
    const warnings = [];
    
    if (!this.endpoints.approvedTags) {
      warnings.push('TAGS_DB_ENDPOINT not configured - approved tags feature disabled');
    }
    
    if (!this.endpoints.trigger) {
      warnings.push('TRIGGER_ENDPOINT not configured - trigger feature disabled');
    }

    if (warnings.length > 0) {
      console.log('⚠️  Configuration warnings:');
      warnings.forEach(warning => console.log(`   ${warning}`));
    }
  }

  isConfigured(feature) {
    switch (feature) {
      case 'approvedTags':
        return !!this.endpoints.approvedTags;
      case 'trigger':
        return !!this.endpoints.trigger;
      default:
        return false;
    }
  }
}

module.exports = new Config();