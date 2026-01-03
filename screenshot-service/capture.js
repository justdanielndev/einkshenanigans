const puppeteer = require('puppeteer');
const path = require('path');
require('dotenv').config();

const URL_TO_CAPTURE = process.env.CAPTURE_URL || 'https://www.google.com';
const HA_USERNAME = process.env.HA_USERNAME || '';
const HA_PASSWORD = process.env.HA_PASSWORD || '';
const SCREENSHOT_PATH = path.join(__dirname, '../shared/current_view.png');
const INTERVAL_MS = 5000;
const VIEWPORT_WIDTH = 800;
const VIEWPORT_HEIGHT = 480;

async function startCapture() {
    console.log('Starting browser...');
    const browser = await puppeteer.launch({
        executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium',
        headless: "new",
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu'
        ]
    });
    
    const page = await browser.newPage();
    
    await page.setViewport({
        width: VIEWPORT_WIDTH,
        height: VIEWPORT_HEIGHT,
        deviceScaleFactor: 1,
    });

    console.log(`Navigating to ${URL_TO_CAPTURE}...`);
    try {
        await page.goto(URL_TO_CAPTURE, { waitUntil: 'networkidle2' });

        if (HA_USERNAME && HA_PASSWORD) {
            console.log('Checking for Home Assistant login...');
            try {
                const usernameInput = await page.waitForSelector('input[name="username"]', { timeout: 5000 });
                
                if (usernameInput) {
                    console.log('Login page detected. Logging in...');
                    
                    await usernameInput.type(HA_USERNAME);
                    
                    const passwordInput = await page.waitForSelector('input[name="password"]');
                    await passwordInput.type(HA_PASSWORD);
                    
                    console.log('Submitting credentials...');
                    await passwordInput.press('Enter');
                    
                    await page.waitForFunction(() => {
                        return document.querySelector('home-assistant') || document.querySelector('ha-panel-lovelace');
                    }, { timeout: 20000 });
                    
                    console.log('Login successful!');
                    
                    await new Promise(r => setTimeout(r, 5000));
                }
            } catch (e) {
                console.log('Login check skipped or timed out (likely already logged in or not HA):', e.message);
            }
        }

    } catch (e) {
        console.error("Error navigating:", e);
    }

    console.log('Starting screenshot loop...');

    await takeScreenshot(page);

    setInterval(async () => {
        await takeScreenshot(page);
    }, INTERVAL_MS);

    process.on('SIGINT', async () => {
        console.log('Closing browser...');
        await browser.close();
        process.exit();
    });
}

async function takeScreenshot(page) {
    try {
        try {
            const refreshElements = await page.$x("//*[contains(text(), 'Refresh')]");
            for (const element of refreshElements) {
                if (await element.boundingBox() != null) {
                    console.log('Found visible "Refresh" text. Clicking...');
                    await element.click();
                    await new Promise(r => setTimeout(r, 2000));
                    break;
                }
            }
        } catch (e) {
        }

        console.log(`Taking screenshot at ${new Date().toISOString()}...`);
        await page.screenshot({ path: SCREENSHOT_PATH });
    } catch (error) {
        console.error('Error taking screenshot:', error);
    }
}

startCapture();
