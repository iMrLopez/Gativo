const net = require('net');
const os = require('os');

const HOST = '0.0.0.0';
const PORT = 6969;
const STX = 0x02;
const ETX = 0x03;

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

function main() {
  const server = net.createServer();

  server.on('connection', (socket) => {
    const clientAddress = `${socket.remoteAddress}:${socket.remotePort}`;
    console.log(`🔌 Connected: ${clientAddress}`);

    let buffer = [];

    socket.on('data', (data) => {
      // Convert Buffer to array and append to our buffer
      buffer = buffer.concat(Array.from(data));
      
      const tags = extractTags(buffer);
      for (const tag of tags) {
        console.log('🏷️ ', tag);
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
  main();
}