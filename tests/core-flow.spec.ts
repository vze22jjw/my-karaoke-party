import { test, expect, type Page, type BrowserContext, request } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';


const ADMIN_TOKEN = process.env.ADMIN_TOKEN;
const BASE_URL = process.env.BASE_URL;


const fallbackTimestamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-');
const REPORT_DIR = process.env.PLAYWRIGHT_REPORT_DIR || path.join('playwright-report', `run-${fallbackTimestamp}`);
const VIDEO_DIR = path.join(REPORT_DIR, 'videos');
const SCREENSHOT_DIR = path.join(REPORT_DIR, 'screenshots');

if (!BASE_URL) throw new Error("❌ FATAL ERROR: BASE_URL is not set.");
if (!ADMIN_TOKEN) throw new Error("❌ FATAL ERROR: ADMIN_TOKEN is missing.");

if (ADMIN_TOKEN === 'change_this' || ADMIN_TOKEN === 'change-this') {
   console.warn("⚠️  WARNING: Using insecure ADMIN_TOKEN.");
}

console.log(`🚀 Starting Test Run`);
console.log(`📂 Writing all artifacts to: ${REPORT_DIR}`);

test.describe.configure({ mode: 'serial' });

async function handleTour(page: Page, nextButtonId: string) {
  const nextBtn = page.getByTestId(nextButtonId);
  const overlay = page.locator('[data-vaul-overlay]');

  console.log(`⏳ Waiting for Tour Overlay (Strict Mode)...`);

  await expect(overlay).toBeVisible({ timeout: 20000 });
  console.log(`ℹ️ Tour detected. Pausing 2s to read...`);
  await page.waitForTimeout(2000); 

  for (let i = 0; i < 20; i++) {
      if (!await overlay.isVisible()) break;

      if (await nextBtn.isVisible({ timeout: 2000 })) {
           await nextBtn.click({ force: true });
           await page.waitForTimeout(1000); 
      } else {
           // Fallback escape
           console.log('⚠️ "Next" button missing. Pressing Escape to clear overlay.');
           await page.keyboard.press('Escape');
           await page.waitForTimeout(500);
      }
  }
  
  await expect(overlay).toBeHidden({ timeout: 5000 });
  console.log(`✅ Tour dismissed.`);
}

let stepCounter = 1;
const takeScreenshot = async (page: Page, name: string, testInfo: any) => {
  if (!fs.existsSync(SCREENSHOT_DIR)) fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  
  const fileName = `${String(stepCounter).padStart(2, '0')}-${name}.png`;
  const filePath = path.join(SCREENSHOT_DIR, fileName);
  
  await page.screenshot({ path: filePath });
  await testInfo.attach(name, { path: filePath, contentType: 'image/png' });
  stepCounter++;
};


test.describe('Core Party Flow', () => {
  let hostContext: BrowserContext, guestContext: BrowserContext, playerContext: BrowserContext; 
  let hostPage: Page, guestPage: Page, playerPage: Page; 
  let partyCode: string | undefined;
  
  const partyName = `User Party ${Math.floor(Math.random() * 1000)}`;

  test.beforeAll(async ({ browser }) => {
    // Ensure directories exist
    if (!fs.existsSync(VIDEO_DIR)) fs.mkdirSync(VIDEO_DIR, { recursive: true });

    // 1. Host (Desktop)
    hostContext = await browser.newContext({ 
        viewport: { width: 1280, height: 720 }, 
        recordVideo: { dir: VIDEO_DIR }
    });
    hostPage = await hostContext.newPage();

    // 2. Guest (Mobile)
    guestContext = await browser.newContext({ 
        viewport: { width: 390, height: 844 }, 
        isMobile: true, 
        hasTouch: true, 
        recordVideo: { dir: VIDEO_DIR } 
    });
    guestPage = await guestContext.newPage();

    // 3. Player (TV)
    playerContext = await browser.newContext({ 
        viewport: { width: 1920, height: 1080 }, 
        recordVideo: { dir: VIDEO_DIR } 
    });
    playerPage = await playerContext.newPage();
  });

  test.afterAll(async () => {
    await hostContext.close();
    await guestContext.close();
    await playerContext.close(); 
    
    // Cleanup
    if (partyCode) {
      const apiContext = await request.newContext();
      await apiContext.delete(`${BASE_URL}/api/admin/party/delete`, {
        headers: { 'Authorization': `Bearer ${ADMIN_TOKEN}` },
        params: { hash: partyCode }
      });
    }
  });

  test('1. Host - Create Party', async ({}, testInfo) => {
    test.setTimeout(120000); 
    
    await hostPage.goto(`${BASE_URL}/en/start-party`);
    console.log('⏳ Page Loaded. Pausing 5s...');
    await hostPage.waitForTimeout(5000);
    
    // Open Form
    console.log('👆 Clicking "Start New Party"...');
    await hostPage.getByRole('button', { name: 'Start New Party' }).click();
    console.log('⏳ Waiting 5s for Modal...');
    await hostPage.waitForTimeout(5000); 

    // Fill Form
    const nameInput = hostPage.getByLabel('Party Name');
    await expect(nameInput).toBeVisible({ timeout: 10000 });
    
    await nameInput.fill(partyName);
    await hostPage.waitForTimeout(2000);

    await hostPage.getByLabel('Your Name').fill('Host User');
    await hostPage.waitForTimeout(2000); 

    await hostPage.getByLabel('Admin Password').fill(ADMIN_TOKEN!);
    
    console.log('⏳ Form Filled. Pausing 5s before Create...');
    await hostPage.waitForTimeout(5000);

    // Create
    console.log('👆 Clicking "Create Party"...');
    await hostPage.getByRole('button', { name: /Create Party/i }).click();

    // Handle Tour
    await handleTour(hostPage, 'host-tour-next');

    console.log('⏳ Tour done. Pausing 5s before checking URL...');
    await hostPage.waitForTimeout(5000);

    console.log('⏳ Checking Dashboard URL...');
    await expect(hostPage).toHaveURL(/\/host\//, { timeout: 45000 });
    
    partyCode = hostPage.url().split('/').pop()!;
    console.log(`🎉 Party Created: ${partyCode}`);

    // Connect Player
    await playerPage.goto(`${BASE_URL}/en/player/${partyCode}`);
    console.log('⏳ Player Loading. Pausing 5s...');
    await playerPage.waitForTimeout(5000);
    
    await expect(playerPage.getByText(/Party Will Start/i)).toBeVisible();
    await takeScreenshot(playerPage, 'player-connected', testInfo);

    // Start Party
    await hostPage.getByTestId('tab-settings').click();
    console.log('⏳ Settings Tab. Pausing 5s...');
    await hostPage.waitForTimeout(5000);
    
    await hostPage.getByRole('button', { name: 'Start Party' }).click();
    await expect(hostPage.getByRole('button', { name: /Intermission/i })).toBeVisible();
  });

  test('2. Guest - Join Party', async ({}, testInfo) => {
    test.setTimeout(120000);
    
    await guestPage.goto(`${BASE_URL}/en/join`);
    console.log('⏳ Guest Page Loaded. Pausing 5s...');
    await guestPage.waitForTimeout(5000);

    await guestPage.getByTestId('join-party-code-input').fill(partyCode!);
    await guestPage.getByTestId('avatar-select-mic').click();
    await guestPage.getByTestId('join-name-input').fill('MobileGuest');
    
    console.log('⏳ Form Filled. Pausing 5s...');
    await guestPage.waitForTimeout(5000);

    console.log('👆 Guest Clicking Join...');
    await guestPage.getByTestId('join-submit-button').click();
    
    await expect(guestPage).toHaveURL(/\/party\//, { timeout: 30000 });
    
    await handleTour(guestPage, 'party-tour-next');
    
    await takeScreenshot(guestPage, 'guest-joined', testInfo);
  });

  test('3. Guest - Add Songs', async ({}, testInfo) => {
    test.setTimeout(120000);
    
    await guestPage.getByTestId('tab-add').click();
    console.log('⏳ Tab Switched. Pausing 5s...');
    await guestPage.waitForTimeout(5000);

    const searchInput = guestPage.getByTestId('song-search-input');

    // Add Song 1
    await searchInput.fill('Song One');
    await searchInput.press('Enter');
    console.log('⏳ Search Sent. Pausing 5s for results...');
    await guestPage.waitForTimeout(5000); 
    
    await guestPage.locator('button[data-testid^="add-video-"]').first().click();
    
    // Add Song 2
    console.log('⏳ Waiting 5s before adding second song...');
    await guestPage.waitForTimeout(5000);
    
    await searchInput.fill('Song Two');
    await searchInput.press('Enter');
    await guestPage.waitForTimeout(5000); 
    
    await guestPage.locator('button[data-testid^="add-video-"]').first().click();

    console.log('📺 Checking TV for "Next Up"...');
    await expect(playerPage.locator('h3', { hasText: 'Next Up' })).toBeVisible({ timeout: 30000 });
    await expect(playerPage.locator('h3', { hasText: 'Next Up' })).toContainText('MobileGuest');
    
    await takeScreenshot(playerPage, 'tv-queue-updated', testInfo);
  });

  test('4. Host - Close Party', async ({}, testInfo) => {
    test.setTimeout(120000);
    await hostPage.bringToFront();
    
    try { await handleTour(hostPage, 'host-tour-next'); } catch(e) {}

    await hostPage.getByTestId('tab-settings').click();
    console.log('⏳ Settings Tab. Pausing 5s...');
    await hostPage.waitForTimeout(5000);
    
    const closeBtn = hostPage.getByRole('button', { name: 'Close Party' });
    await closeBtn.scrollIntoViewIfNeeded();
    await closeBtn.click();
    
    console.log('⏳ Confirmation Dialog. Pausing 2s...');
    await hostPage.waitForTimeout(2000);
    
    await hostPage.getByRole('button', { name: 'Yes, End Party' }).click();
    
    await expect(hostPage).toHaveURL(/\/en$/, { timeout: 30000 });
    await takeScreenshot(hostPage, 'party-closed', testInfo);
  });
});
