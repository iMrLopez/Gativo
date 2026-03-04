const httpClient = require('./http-client');
const config = require('./config');

class TagDatabase {
  constructor() {
    // In-memory set for fast exact lookups
    this.approvedTags = new Set();
    this.defaultTags = new Set();
    this.lastUpdateTime = null;
    this.isLoading = false;
    
    // Load default tags at startup
    this.loadDefaultTags();
  }

  /**
   * Load default tags from configuration
   */
  loadDefaultTags() {
    const defaults = config.defaultApprovedTags;
    if (defaults.length > 0) {
      this.defaultTags = new Set(defaults);
      // Initialize approved tags with defaults
      this.approvedTags = new Set(defaults);
      console.log(`📋 Loaded ${defaults.length} default approved tags`);
    }
  }

  /**
   * Load approved tags from remote endpoint and merge with defaults
   * @returns {Promise<boolean>} True if successful
   */
  async loadApprovedTags() {
    if (this.isLoading) {
      console.log('🔄 Tag loading already in progress, skipping...');
      return false;
    }

    if (!config.isConfigured('approvedTags')) {
      console.log('⚠️  Approved tags endpoint not configured - using default tags only');
      return false;
    }

    this.isLoading = true;

    try {
      const tags = await httpClient.fetchApprovedTags();
      
      if (Array.isArray(tags)) {
        // Merge endpoint tags with default tags
        const mergedTags = new Set([...this.defaultTags, ...tags]);
        this.approvedTags = mergedTags;
        this.lastUpdateTime = new Date();
        
        const endpointCount = tags.length;
        const defaultCount = this.defaultTags.size;
        const totalCount = mergedTags.size;
        
        console.log(`📊 Approved tags updated: ${endpointCount} from endpoint + ${defaultCount} defaults = ${totalCount} total`);
        return true;
      } else {
        console.log('❌ Invalid tags data received - falling back to default tags');
        this.approvedTags = new Set(this.defaultTags);
        return false;
      }
    } catch (error) {
      console.error('❌ Error loading approved tags:', error.message);
      console.log('🔄 Using default approved tags as fallback');
      this.approvedTags = new Set(this.defaultTags);
      return false;
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * Check if a tag is approved (exact 1-1 match only)
   * @param {string} tag - Tag ID to check
   * @returns {boolean} True if tag exactly matches an approved tag
   */
  isApproved(tag) {
    if (!tag || typeof tag !== 'string') {
      return false;
    }
    
    // Exact match only - no partial matching
    return this.approvedTags.has(tag.trim());
  }

  /**
   * Get basic database statistics
   * @returns {object} Statistics object
   */
  getStats() {
    return {
      totalApprovedTags: this.approvedTags.size,
      defaultTags: this.defaultTags.size,
      lastUpdateTime: this.lastUpdateTime,
      isLoading: this.isLoading,
      configured: config.isConfigured('approvedTags')
    };
  }
}

module.exports = new TagDatabase();