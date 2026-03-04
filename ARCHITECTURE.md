# RFID Server - Simplified Modular Architecture

## 📁 Project Structure

```
├── rfid-server.js          # Main server entry point (239 lines)
├── rfid-server-old.js      # Original monolithic version (backup)
├── server.py              # Original Python implementation
├── package.json           # Dependencies and scripts
├── .env                   # Environment configuration
└── src/                   # Modular components (~490 lines total)
    ├── config.js          # Environment configuration management (74 lines)
    ├── network-utils.js   # Network utilities (IP detection, client formatting) (34 lines)
    ├── http-client.js     # HTTP client for API calls (139 lines)
    ├── debounce-manager.js # Tag debouncing logic (85 lines)
    ├── rfid-protocol.js   # STX/ETX protocol parsing (81 lines)
    └── tag-database.js    # Approved tags database management (77 lines)
```

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Start the server
npm start

# Start old monolithic version (for comparison)
npm run start:old
```

## ⚙️ Configuration

Set these environment variables in `.env`:

```env
TAGS_DB_ENDPOINT="https://api.example.com/approved-tags"
TRIGGER_ENDPOINT="https://api.example.com/tag-detected"
DEBOUNCE_MINUTES=5
```

## 🏗️ Architecture Benefits

### **Lean & Maintainable Design**
- **Single Responsibility**: Each module handles one concern
- **Minimal Complexity**: Only essential features, no over-engineering
- **Fast Performance**: O(1) tag lookups, minimal overhead
- **Easy to Modify**: Clean interfaces between modules

### **Key Modules**

- **`config.js`** - Centralized environment configuration and validation
- **`network-utils.js`** - IP detection and client address formatting
- **`http-client.js`** - HTTP requests with timeout and error handling
- **`debounce-manager.js`** - Prevents duplicate tag triggers with cleanup
- **`rfid-protocol.js`** - STX/ETX binary protocol parsing
- **`tag-database.js`** - In-memory approved tags with exact matching

### **Core Features**

✅ **TCP Server** - Port 6969 with STX/ETX protocol parsing  
✅ **Tag Validation** - Exact 1:1 matching against approved database  
✅ **Debounce Protection** - Prevents spam triggers within time window  
✅ **Auto-refresh** - Updates approved tags every 5 minutes  
✅ **Memory Management** - Automatic cleanup of old records  
✅ **Health Checks** - Validates endpoint connectivity on startup  
✅ **Graceful Shutdown** - Proper cleanup on SIGINT/SIGTERM  
✅ **Error Resilience** - Comprehensive error handling  

## 🔧 Development

### Essential Module Methods

Each module exports a singleton instance with focused functionality:

```javascript
const config = require('./src/config');
const tagDatabase = require('./src/tag-database');
const debounceManager = require('./src/debounce-manager');

// Configuration access
console.log(config.server.port);        // 6969
console.log(config.debounce.minutes);   // 5
console.log(config.endpoints.trigger);  // API endpoint

// Tag validation (exact matching only)
console.log(tagDatabase.isApproved('TAG001'));  // true/false

// Basic statistics
console.log(tagDatabase.getStats());     // { totalApprovedTags, lastUpdateTime, ... }

// Debounce management  
console.log(debounceManager.shouldDebounce('TAG001'));  // true/false
debounceManager.markTriggered('TAG001');               // Record trigger
```

### Simplified Architecture

**Before Simplification**: 700+ lines with complex features  
**After Simplification**: 490 lines with essential features only

**Removed Complexity:**
- Statistics tracking and reporting
- Partial tag search functionality  
- Manual tag management methods
- Over-engineered HTTP client
- Debugging and testing utilities
- URL validation and building helpers

**Kept Essentials:**
- Core RFID processing pipeline
- Tag validation and debouncing  
- HTTP API integration
- Configuration management
- Error handling and cleanup

## 📊 Data Flow

```
TCP Connection → Protocol Parser → Tag Database → Debounce Check → HTTP Trigger
      ↓              ↓               ↓              ↓              ↓
   Port 6969    STX/ETX Parser   Exact Match   Time Window   GET Request
```

1. **RFID Reader** connects via TCP to port 6969
2. **Protocol Parser** extracts tag IDs from STX/ETX binary data  
3. **Tag Database** performs exact match against approved tags
4. **Debounce Manager** checks if tag was recently triggered
5. **HTTP Client** makes GET request to configured webhook

## 📊 Performance Characteristics

- **Memory**: O(1) tag lookups using JavaScript Set
- **Network**: Direct TCP connections, no HTTP parsing overhead
- **CPU**: Minimal processing, optimized for throughput  
- **Storage**: In-memory only, no disk I/O during operation
- **Cleanup**: Automatic memory management every 10 minutes

## 🧪 Testing & Comparison

```bash
# Run simplified version (current)
npm start

# Run original monolithic version (backup)
npm run start:old

# Both versions are functionally identical
# New version: better maintainability, reduced complexity
```

### Module Integration Testing

```javascript
// Test protocol parsing
const rfidProtocol = require('./src/rfid-protocol');
const buffer = [0x02, 65, 66, 67, 0x03]; // STX + "ABC" + ETX
console.log(rfidProtocol.extractTags(buffer)); // ["ABC"]

// Test tag validation
const tagDatabase = require('./src/tag-database');
await tagDatabase.loadApprovedTags();
console.log(tagDatabase.isApproved('ABC123')); // true/false based on remote DB
```

## 🎯 Design Principles

1. **Simplicity Over Features** - Only implement what's actually needed
2. **Exact Matching Only** - No fuzzy search or partial matching  
3. **Memory Efficiency** - Use appropriate data structures (Set vs Array)
4. **Single Responsibility** - Each module has one clear job
5. **Fail Gracefully** - Handle errors without crashing
6. **Clean Interfaces** - Simple, predictable method signatures

This architecture provides production-ready RFID processing with minimal complexity while maintaining extensibility for future requirements.