import { test, expect, type Page, type BrowserContext, request } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { createPartyRobust, joinPartyRobust, addSongRobust } from './helpers/party-utils';

const ADMIN_TOKEN = process.env.ADMIN_TOKEN;
const BASE_URL = process.env.BASE_URL;

const fallbackTimestamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-');
const REPORT_DIR = process.env.PLAYWRIGHT_REPORT_DIR || path.join('playwright-report', `run-${fallbackTimestamp}`);
const VIDEO_DIR = path.join(REPORT_DIR, 'videos');
const SCREENSHOT_DIR = path.join(REPORT_DIR, 'screenshots');

if (!BASE_URL || !ADMIN_TOKEN) throw new Error("❌ FATAL ERROR: Configuration missing.");

if (!fs.existsSync(VIDEO_DIR)) fs.mkdirSync(VIDEO_DIR, { recursive: true });
if (!fs.existsSync(SCREENSHOT_DIR)) fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

test.describe.configure({ mode: 'serial' });

let hostContext: BrowserContext;
let playerContext: BrowserContext;
let guestContexts: BrowserContext[] = [];

let hostPage: Page;
let playerPage: Page;
let guestPages: Page[] = [];

let partyCode: string;
const rawPartyName = `AutoTest ${Math.floor(Math.random() * 1000)}`;
const GUEST_COUNT = 3;

// --- HELPER: Screenshot with Logging ---
let stepCounter = 1;
const takeScreenshot = async (page: Page, name: string, testInfo: any) => {
  const fileName = `${String(stepCounter).padStart(2, '0')}-${name}.png`;
  const filePath = path.join(SCREENSHOT_DIR, fileName);
  await page.screenshot({ path: filePath });
  if (testInfo) await testInfo.attach(name, { path: filePath, contentType: 'image/png' });
  stepCounter++;
};

const videoPause = async (page: Page) => { await page.waitForTimeout(1000); };

// Host-specific tour walker
async function walkthroughHostTour(page: Page) {
  const overlay = page.locator('[data-vaul-overlay]');
  try {
    if (await overlay.isVisible({ timeout: 5000 })) {
        for (let i = 0; i < 15; i++) {
            if (!await overlay.isVisible()) break; 
            const nextBtn = page.locator('button').filter({ hasText: /Next|Avance|Próximo/i }).first();
            const finishBtn = page.locator('button').filter({ hasText: /Finish|Got it|Concluir/i }).first();
            
            if (await finishBtn.isVisible()) { await finishBtn.click(); break; }
            else if (await nextBtn.isVisible()) { await nextBtn.click(); await page.waitForTimeout(500); }
            else { await page.keyboard.press('Escape'); break; }
        }
    }
  } catch (e) {}
}

test.describe('Core Party Flow (Full Feature)', () => {
  test.setTimeout(300000); 

  test.beforeAll(async ({ browser }) => {
    hostContext = await browser.newContext({ 
        viewport: { width: 1024, height: 768 }, 
        recordVideo: { dir: VIDEO_DIR }, 
        extraHTTPHeaders: { 'Authorization': `Bearer ${ADMIN_TOKEN}` } 
    });
    hostPage = await hostContext.newPage();
  });

  test.afterAll(async () => {
    if (partyCode) {
        const apiContext = await request.newContext();
        try {
          await apiContext.delete(`${BASE_URL}/api/admin/party/delete`, { headers: { 'Authorization': `Bearer ${ADMIN_TOKEN}` }, params: { hash: partyCode } });
          console.log(`🧹 Cleanup: Deleted party ${partyCode}`);
        } catch (e) {}
    }
    await hostContext.close();
    if (playerContext) await playerContext.close();
    for (const ctx of guestContexts) await ctx.close();

    const rename = async (page: Page | undefined, name: string) => {
        const video = page?.video();
        if (video) {
             const vPath = await video.path();
             if (vPath && fs.existsSync(vPath)) {
                 try { fs.renameSync(vPath, path.join(VIDEO_DIR, name)); } catch(e) { console.error(e); }
             }
        }
    };

    await rename(hostPage, 'host.webm');
    await rename(playerPage, 'player.webm');
    for (let i = 0; i < guestPages.length; i++) {
        await rename(guestPages[i], `guest-${i}.webm`);
    }
  });

  test('1. Host Creates Party', async ({}, testInfo) => {
    partyCode = await createPartyRobust(hostPage, rawPartyName);
    console.log("👉 Performing Host Tour...");
    await walkthroughHostTour(hostPage);
    await takeScreenshot(hostPage, 'host-dashboard', testInfo);
  });

  test('1.5 Player Verifies Initial Idle State', async ({ browser }, testInfo) => {
    playerContext = await browser.newContext({ 
        viewport: { width: 1920, height: 1080 }, 
        recordVideo: { dir: VIDEO_DIR } 
    });
    playerPage = await playerContext.newPage();
    await playerPage.goto(`${BASE_URL}/en/player/${partyCode}`);
    await videoPause(playerPage);
    await expect(playerPage.getByAltText('My Karaoke Party')).toBeVisible({ timeout: 30000 });
    await takeScreenshot(playerPage, 'player-idle-initial', testInfo);
  });

  test('2. Guests Join & Tour', async ({ browser }, testInfo) => {
    for (let i = 0; i < GUEST_COUNT; i++) {
        const ctx = await browser.newContext({ 
            viewport: { width: 390, height: 844 }, 
            isMobile: true, 
            recordVideo: { dir: VIDEO_DIR } 
        });
        guestContexts.push(ctx);
        guestPages.push(await ctx.newPage());
    }

    for (let i = 0; i < guestPages.length; i++) {
        await joinPartyRobust(guestPages[i], partyCode, `Guest-${i}`, i);
        await videoPause(guestPages[i]);
    }
    await takeScreenshot(guestPages[0], 'guests-joined', testInfo);
  });

  test('3. Guests Add Songs', async ({}, testInfo) => {
    test.setTimeout(240000); 
    const queueingGuests = [guestPages[0], guestPages[1]];
    for (const [index, page] of queueingGuests.entries()) {
        await addSongRobust(page, 'Karaoke Hits');
        await addSongRobust(page, 'Karaoke Classics');
        if (index === 0) await takeScreenshot(page, `guest-${index}-songs-added`, testInfo);
    }
  });

  test('4. Host Starts Party & Adaptive Player Verification', async ({}, testInfo) => {
    await hostPage.bringToFront();
    await hostPage.reload();
    await videoPause(hostPage);
    
    await hostPage.getByTestId('tab-playlist').click({ force: true });
    await expect(hostPage.getByText('Guest-0')).toBeVisible({ timeout: 20000 });
    
    await hostPage.getByTestId('tab-settings').click({ force: true });
    await videoPause(hostPage);

    let startBtn = hostPage.getByRole('button', { name: 'Start Party' });
    if (await startBtn.isVisible()) {
        await startBtn.click();
        await videoPause(hostPage);
    }

    await expect(hostPage.locator('button', { hasText: /Pause|Resume/i })).toBeVisible({ timeout: 20000 });

    await playerPage.bringToFront();
    const restrictedUI = playerPage.getByText('Open on YouTube');
    const iframeUI = playerPage.locator('iframe[src*="youtube"]');
    
    let playerStarted = false;
    for (let i = 0; i < 3; i++) {
        try {
            console.log(`⏳ Waiting for Player Content (Attempt ${i+1})...`);
            await expect(restrictedUI.or(iframeUI)).toBeVisible({ timeout: 15000 });
            playerStarted = true;
            break; 
        } catch {
            await hostPage.bringToFront();
            const hostStartBtn = hostPage.getByRole('button', { name: 'Start Party' });
            if (await hostStartBtn.isVisible()) {
                await hostStartBtn.click();
            } else {
                const pause = hostPage.locator('button', { hasText: /Pause|Intermission/i }).first();
                const resume = hostPage.locator('button', { hasText: /Resume|Start/i }).first();
                if (await pause.isVisible()) { await pause.click(); await hostPage.waitForTimeout(500); await resume.click(); }
                else if (await resume.isVisible()) { await resume.click(); }
            }
            await videoPause(hostPage);
            await playerPage.bringToFront();
            await playerPage.reload();
            await videoPause(playerPage);
        }
    }

    if (!playerStarted) throw new Error("❌ FATAL: Player failed to show content.");

    if (await restrictedUI.isVisible()) {
        console.log('ℹ️ Video Restricted Mode detected.');
        await expect(playerPage.getByText('Guest-0')).toBeVisible({ timeout: 10000 });
        await takeScreenshot(playerPage, 'player-restricted-mode', testInfo);
    } else {
        console.log('ℹ️ Video Playable Mode detected.');
        await expect(iframeUI).toBeAttached({ timeout: 10000 });
        await takeScreenshot(playerPage, 'player-playing-clean', testInfo);
    }
  });

  test('5. Guest Interactions & Applause', async ({}, testInfo) => {
    test.setTimeout(300000); 

    const interactions = guestPages.map(async (page, index) => {
        await page.bringToFront(); 
        try { await expect(page.getByText('Playing Now')).toBeVisible({ timeout: 5000 }); } 
        catch { await page.reload(); }

        if (index === 0) {
            await page.getByTestId('tab-singers').click({ force: true });
            await videoPause(page);

            const navApplauseBtn = page.locator('button, a, [role="button"]').filter({ hasText: /👏|Applaud/i }).first();
            await expect(navApplauseBtn).toBeVisible({ timeout: 15000 });
            await navApplauseBtn.click();
            await expect(page).toHaveURL(/applause/);
            await videoPause(page);

            const bigApplauseBtn = page.locator('button').filter({ hasText: /👏|Applaud/i }).first();
            await expect(bigApplauseBtn).toBeVisible();
            for(let k=0; k<3; k++) { await bigApplauseBtn.click(); await page.waitForTimeout(200); }
            await page.waitForTimeout(2000); 

            await page.getByRole('button', { name: /Back to Party/i }).click();
            await expect(page).toHaveURL(/\/party\//, { timeout: 10000 });
            await videoPause(page);

            await page.getByTestId('tab-singers').click({ force: true });
            await videoPause(page);
            
            const guestCard = page.locator('li, div').filter({ hasText: 'Guest-0' }).filter({ hasText: /You|Me/i }).first();
            const chevron = guestCard.locator('svg.lucide-chevron-down, svg.lucide-chevron-up').first();
            if (await chevron.isVisible()) await chevron.click({ force: true });
            else await guestCard.click({ force: true });
            
            await videoPause(page);
            await expect(page.getByText(/Claps:\s*[1-9]/)).toBeVisible({ timeout: 10000 });
            await takeScreenshot(page, `guest-${index}-applause-verified`, testInfo);
        }

        if (index === 1) {
            await page.getByTestId('tab-add').click({ force: true });
            const manageBtn = page.getByRole('button', { name: 'Manage' });
            if (await manageBtn.isVisible()) {
                await manageBtn.click();
                await videoPause(page); 
                const closeBtn = page.locator('button:has-text("Save Order"), button:has-text("Cancel")').first();
                if (await closeBtn.isVisible()) await closeBtn.click();
            }
        }

        if (index === 2) {
            await page.getByTestId('tab-history').click({ force: true });
            await videoPause(page);
            const tiles = page.locator('[data-testid="suggestion-tile"]');
            if (await tiles.count() > 0) {
                await tiles.first().scrollIntoViewIfNeeded();
                await expect(tiles.first()).toBeVisible();
            }

            await page.locator('button[title="Change Language"]').click();
            await page.getByRole('button', { name: 'Português' }).click();
            await page.waitForTimeout(1500); 
            await expect(page.getByTestId('tab-singers')).toContainText('Cantores'); 
            
            await page.locator('button[title="Change Language"]').click();
            await page.getByRole('button', { name: 'English' }).click();
            await page.waitForTimeout(1500);
            await expect(page.getByTestId('tab-singers')).toContainText('Singers');
            await takeScreenshot(page, `guest-${index}-language-verified`, testInfo);
        }
    });

    await Promise.all(interactions);
    await takeScreenshot(guestPages[0], 'guest-interactions-full', testInfo);
  });

  test('6. Logout & Close', async () => {
    for (const page of guestPages) {
        await page.bringToFront();
        await page.getByTestId('tab-singers').click({ force: true });
        await page.getByRole('button', { name: 'Leave' }).click();
        await videoPause(page);
    }

    await hostPage.bringToFront();
    await hostPage.getByTestId('tab-settings').click({ force: true });
    await videoPause(hostPage);
    
    await hostPage.getByRole('button', { name: 'Close Party' }).click();
    await videoPause(hostPage); 
    
    await hostPage.getByRole('button', { name: 'Yes, End Party' }).click();
    await expect(hostPage).toHaveURL(/\/host$/);
  });
});
