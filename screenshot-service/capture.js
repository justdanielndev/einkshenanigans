const puppeteer = require('puppeteer');
const path = require('path');
const { PNG } = require('pngjs');
const pixelmatch = require('pixelmatch');
const axios = require('axios');
require('dotenv').config();

const JSON_URL = process.env.JSON_URL;
const HEALTH_URL = process.env.HEALTH_URL;
const FALLBACK_URL = process.env.CAPTURE_URL || 'https://www.google.com';
const HA_USERNAME = process.env.HA_USERNAME || '';
const HA_PASSWORD = process.env.HA_PASSWORD || '';
const HA_BASE_URL = process.env.HA_BASE_URL || 'http://homeassistant.local:8123';
const HA_ACCESS_TOKEN = process.env.HA_ACCESS_TOKEN || '';
const SCREENSHOT_PATH = path.join(__dirname, '../shared/current_view.png');
const VIEWPORT_WIDTH = 800;
const VIEWPORT_HEIGHT = 480;

let currentConfig = null;
let currentScreenIndex = 0;
let lastScreenChangeTime = 0;
let currentUrl = '';
let lastConfigFetchTime = null;

async function checkConditions(screen) {
    if (!screen.conditions || screen.conditions.length === 0) return true;

    for (const condition of screen.conditions) {
        const expected = condition.expected_state !== undefined ? condition.expected_state : true;
        let result = false;

        if (condition.type === 'if-user-zone') {
            if (!HA_ACCESS_TOKEN) {
                console.warn('HA_ACCESS_TOKEN missing, skipping condition check');
                result = false;
            } else {
                try {
                    const response = await axios.get(`${HA_BASE_URL}/api/states/${condition.user}`, {
                        headers: {
                            'Authorization': `Bearer ${HA_ACCESS_TOKEN}`,
                            'Content-Type': 'application/json',
                        }
                    });
                    const state = response.data.state;
                    result = (state === condition.zone);
                } catch (e) {
                    console.error(`Error checking HA condition for ${condition.user}:`, e.message);
                    result = false;
                }
            }
        } else if (condition.type === 'day-of-week') {
            const today = new Date().getDay();
            result = condition.days && condition.days.includes(today);
        }

        if (result !== expected) {
            return false;
        }
    }
    return true;
}

async function pingHealth() {
    if (!HEALTH_URL) return;
    try {
        let url = HEALTH_URL;
        if (lastConfigFetchTime) {
            const separator = url.includes('?') ? '&' : '?';
            url += `${separator}lastupdated=${encodeURIComponent(lastConfigFetchTime)}`;
        }
        await axios.get(url);
        console.log('Health ping successful');
    } catch (e) {
        console.error('Health ping failed:', e.message);
    }
}

async function fetchConfig() {
    if (!JSON_URL) return;
    try {
        console.log(`Fetching config from ${JSON_URL}...`);
        const response = await axios.get(JSON_URL);
        currentConfig = response.data;
        lastConfigFetchTime = new Date().toISOString();
        console.log('Config updated:', JSON.stringify(currentConfig, null, 2));
        
        pingHealth();

        const interval = (currentConfig.json_refresh_interval || 30) * 60 * 1000;
        setTimeout(fetchConfig, interval);
    } catch (e) {
        console.error('Error fetching config:', e.message);
        setTimeout(fetchConfig, 60000);
    }
}

setInterval(pingHealth, 5 * 60 * 1000);

function parseTime(timeStr) {
    if (!timeStr) return 0;
    const [h, m] = timeStr.split(':').map(Number);
    return h * 60 + m;
}

async function checkLogin(page) {
    if (HA_USERNAME && HA_PASSWORD) {
        try {
            const usernameInput = await page.$('input[name="username"]');
            
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
        }
    }
}

async function checkScreen(page) {
    if (!currentConfig || !currentConfig.screens) return;

    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();

    const validScreens = [];
    for (const screen of currentConfig.screens) {
        if (await checkConditions(screen)) {
            validScreens.push(screen);
        }
    }

    const forcedScreens = validScreens.filter(s => s.force_show_if_conditions_match);
    
    let targetScreen = null;

    if (forcedScreens.length > 0) {
        const nowMs = Date.now();
        if (currentScreenIndex >= forcedScreens.length) currentScreenIndex = 0;
        
        const currentDuration = (forcedScreens[currentScreenIndex]?.duration || 20) * 60 * 1000;
        
        if (lastScreenChangeTime === 0) lastScreenChangeTime = nowMs;

        if (nowMs - lastScreenChangeTime > currentDuration) {
             currentScreenIndex = (currentScreenIndex + 1) % forcedScreens.length;
             lastScreenChangeTime = nowMs;
             console.log(`Forced screen duration expired. Switching to index ${currentScreenIndex}`);
        }
        targetScreen = forcedScreens[currentScreenIndex];
    } else {
        let activeTimingScreen = null;
        for (const screen of validScreens) {
            if (screen.starttime && screen.endtime) {
                const start = parseTime(screen.starttime);
                const end = parseTime(screen.endtime);
                
                let isActive = false;
                if (start < end) {
                    isActive = currentTime >= start && currentTime < end;
                } else {
                    isActive = currentTime >= start || currentTime < end;
                }

                if (isActive) {
                    activeTimingScreen = screen;
                    break;
                }
            }
        }

        if (activeTimingScreen) {
            targetScreen = activeTimingScreen;
        } else {
            const normalScreens = validScreens.filter(s => !s.starttime);
            
            if (normalScreens.length > 0) {
                 const nowMs = Date.now();
                 if (currentScreenIndex >= normalScreens.length) currentScreenIndex = 0;
                 
                 const currentDuration = (normalScreens[currentScreenIndex]?.duration || 20) * 60 * 1000; 
                 
                 if (lastScreenChangeTime === 0) lastScreenChangeTime = nowMs;

                 if (nowMs - lastScreenChangeTime > currentDuration) {
                     if (currentConfig.randomize_screens) {
                         let newIndex = currentScreenIndex;
                         if (normalScreens.length > 1) {
                            while (newIndex === currentScreenIndex) {
                                newIndex = Math.floor(Math.random() * normalScreens.length);
                            }
                         }
                         currentScreenIndex = newIndex;
                     } else {
                         currentScreenIndex = (currentScreenIndex + 1) % normalScreens.length;
                     }
                     lastScreenChangeTime = nowMs;
                     console.log(`Duration expired. Switching to screen index ${currentScreenIndex}`);
                 }
                 targetScreen = normalScreens[currentScreenIndex];
            }
        }
    }

    if (targetScreen && targetScreen.url !== currentUrl) {
        console.log(`Switching URL to ${targetScreen.url}`);
        currentUrl = targetScreen.url;
        try {
            await page.goto(currentUrl, { waitUntil: 'networkidle2' });
            await checkLogin(page);
        } catch (e) {
            console.error('Navigation error:', e.message);
        }
    }
}

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

    await fetchConfig();

    if (!currentConfig) {
        console.log(`No config found, using fallback: ${FALLBACK_URL}`);
        currentUrl = FALLBACK_URL;
        try {
            await page.goto(currentUrl, { waitUntil: 'networkidle2' });
            await checkLogin(page);
        } catch (e) { console.error(e); }
    } else {
        await checkScreen(page);
    }

    console.log('Starting screenshot loop...');

    process.on('SIGINT', async () => {
        console.log('Closing browser...');
        await browser.close();
        process.exit();
    });

    let previousBuffer = null;
    let lastScreenCheck = 0;

    while (true) {
        try {
            const now = Date.now();
            const checkInterval = (currentConfig?.conditions_check_interval || 5) * 60 * 1000;
            
            if (now - lastScreenCheck > checkInterval) {
                await checkScreen(page);
                lastScreenCheck = now;
            }

            const currentBuffer = await page.screenshot({ encoding: 'binary' });

            let shouldSave = false;

            if (previousBuffer) {
                try {
                    const img1 = PNG.sync.read(previousBuffer);
                    const img2 = PNG.sync.read(currentBuffer);
                    const { width, height } = img1;
                    
                    const numDiffPixels = pixelmatch(img1.data, img2.data, null, width, height, { threshold: 0.1 });
                    const changePercent = numDiffPixels / (width * height);
                    
                    if (changePercent > 0.005) {
                        console.log(`Change detected: ${(changePercent * 100).toFixed(2)}%. Saving...`);
                        shouldSave = true;
                    }
                } catch (e) {
                    console.error('Error comparing images:', e);
                    shouldSave = true;
                }
            } else {
                console.log('First run. Saving...');
                shouldSave = true;
            }

            if (shouldSave) {
                const fs = require('fs');
                const tempPath = SCREENSHOT_PATH + '.tmp';
                fs.writeFileSync(tempPath, currentBuffer);
                fs.renameSync(tempPath, SCREENSHOT_PATH);
                previousBuffer = currentBuffer;
            }

        } catch (error) {
            console.error('Error in loop:', error);
        }

        await new Promise(r => setTimeout(r, 1000));
    }
}

startCapture();
