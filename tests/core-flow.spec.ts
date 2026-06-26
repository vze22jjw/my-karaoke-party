import { test, expect, type Page, type BrowserContext, request } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { createParty, joinParty, addSong } from './helpers/party-utils';

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
const rawPartyName = `AutoTest ${Date.now()}`;
const GUEST_COUNT = 3;

const takeScreenshot = async (page: Page, name: string, testInfo: any) => {
  const fileName = `${Date.now()}-${name}.png`;
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, fileName) });
};

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
  test.setTimeout(600000); 

  test.beforeAll(async ({ browser }) => {
    hostContext = await browser.newContext({ viewport: { width: 1024, height: 768 }, recordVideo: { dir: VIDEO_DIR }, extraHTTPHeaders: { 'Authorization': `Bearer ${ADMIN_TOKEN}` } });
    hostPage = await hostContext.newPage();
  });

  test.afterAll(async () => {
    if (partyCode) {
        const apiContext = await request.newContext();
        await apiContext.delete(`${BASE_URL}/api/admin/party/delete`, { headers: { 'Authorization': `Bearer ${ADMIN_TOKEN}` }, params: { hash: partyCode } }).catch(()=>{});
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

    await rename(hostPage, '01-host-full-session.webm');
    await rename(playerPage, '02-player-session.webm');
    for (let i = 0; i < guestPages.length; i++) {
        await rename(guestPages[i], `03-guest-${i}-interactions.webm`);
    }
  });

  test('1. Host Creates Party', async ({}, testInfo) => {
    partyCode = await createParty(hostPage, rawPartyName);
    await walkthroughHostTour(hostPage);
    await takeScreenshot(hostPage, 'host-dashboard', testInfo);
  });

  test('1.5 Player Verifies Initial Idle State', async ({ browser }, testInfo) => {
    playerContext = await browser.newContext({ viewport: { width: 1920, height: 1080 }, recordVideo: { dir: VIDEO_DIR } });
    playerPage = await playerContext.newPage();
    await playerPage.goto(`${BASE_URL}/en/player/${partyCode}`);
    await expect(playerPage.getByAltText('My Karaoke Party')).toBeVisible({ timeout: 30000 });
  });

  test('2. Guests Join & Tour', async ({ browser }, testInfo) => {
    for (let i = 0; i < GUEST_COUNT; i++) {
        const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, recordVideo: { dir: VIDEO_DIR } });
        guestContexts.push(ctx);
        guestPages.push(await ctx.newPage());
    }
    for (let i = 0; i < guestPages.length; i++) {
        await joinParty(guestPages[i], partyCode, `Guest-${i}`, i);
    }
    await takeScreenshot(guestPages[0], 'guests-joined', testInfo);
  });

  test('3. Guests Add Songs', async ({}, testInfo) => {
    test.setTimeout(240000); 
    const queueingGuests = [guestPages[0], guestPages[1]];
    for (const [index, page] of queueingGuests.entries()) {
        await addSong(page, 'Karaoke Hits');
        await addSong(page, 'Karaoke Classics');
        if (index === 0) await takeScreenshot(page, `guest-${index}-songs-added`, testInfo);
    }
  });

  test('4. Host Starts Party & Adaptive Player Verification', async ({}, testInfo) => {
    await hostPage.bringToFront();
    await hostPage.reload();
    await hostPage.getByTestId('tab-playlist').click({ force: true });
    
    await expect(hostPage.getByText('Guest-0').first()).toBeVisible({ timeout: 20000 });
    
    await hostPage.getByTestId('tab-settings').click({ force: true });
    let startBtn = hostPage.getByRole('button', { name: 'Start Party' });
    if (await startBtn.isVisible()) await startBtn.click();

    await playerPage.bringToFront();
    const restrictedUI = playerPage.getByText('Open on YouTube');
    const iframeUI = playerPage.locator('iframe[src*="youtube"]');
    await expect(restrictedUI.or(iframeUI)).toBeVisible({ timeout: 30000 });

    if (await restrictedUI.isVisible()) {
        await expect(playerPage.getByText('Guest-0').first()).toBeVisible({ timeout: 10000 });
        await takeScreenshot(playerPage, 'player-restricted-view', testInfo);
    } else {
        await expect(iframeUI).toBeAttached({ timeout: 10000 });
        
        // Verify 16:9 player container aspect ratio and layout
        const container = playerPage.getByTestId('player-aspect-video-container');
        await expect(container).toBeVisible({ timeout: 10000 });
        const box = await container.boundingBox();
        expect(box).not.toBeNull();
        if (box) {
            const ratio = box.width / box.height;
            console.log(`Verified 16:9 player container: ${box.width}x${box.height} (ratio: ${ratio.toFixed(4)})`);
            expect(ratio).toBeCloseTo(16 / 9, 1);
        }
        await takeScreenshot(playerPage, 'player-aspect-ratio-verified', testInfo);
    }
  });

  test('5. Guest Interactions & Applause', async ({}, testInfo) => {
    test.setTimeout(300000); 

    const interactions = guestPages.map(async (page, index) => {
        await page.bringToFront(); 
        
        // --- GUEST 0: APPLAUSE VALIDATION ---
        if (index === 0) {
            await page.getByTestId('tab-singers').click({ force: true });
            
            const navApplauseBtn = page.locator('button, a, [role="button"]').filter({ hasText: /👏|Applaud/i }).first();
            await expect(navApplauseBtn).toBeVisible({ timeout: 15000 });
            await navApplauseBtn.click();
            await expect(page).toHaveURL(/applause/);
            
            const bigApplauseBtn = page.locator('button').filter({ hasText: /👏|Applaud/i }).first();
            for(let k=0; k<5; k++) { 
                await bigApplauseBtn.click({ force: true }); 
                await page.waitForTimeout(300); 
            }
            await page.waitForTimeout(1000); 

            await page.getByRole('button', { name: /Back to Party/i }).click();
            await expect(page).toHaveURL(/\/party\//, { timeout: 10000 });
            
            await page.getByTestId('tab-singers').click({ force: true });
            
            await expect(async () => {
                const clapsText = page.getByText(/Claps:\s*[1-9]/).first();
                if (await clapsText.isVisible()) return;

                const guestCard = page.locator('li, div')
                    .filter({ hasText: 'Guest-0' })
                    .filter({ hasText: /You|Me/i })
                    .first();
                
                const chevron = guestCard.locator('svg.lucide-chevron-down, svg.lucide-chevron-up').first();
                if (await chevron.isVisible()) {
                    await chevron.click({ force: true });
                } else {
                    await guestCard.click({ force: true });
                }
                
                await expect(clapsText).toBeVisible({ timeout: 2000 });
            }).toPass({ timeout: 20000, intervals: [2000] });

            await takeScreenshot(page, `guest-${index}-applause-verified`, testInfo);
        }

        // --- GUEST 1: QUEUE MANAGEMENT ---
        if (index === 1) {
            await page.getByTestId('tab-add').click({ force: true });
            const manageBtn = page.getByRole('button', { name: 'Manage' });
            if (await manageBtn.isVisible()) {
                await manageBtn.click();
                await page.waitForTimeout(500);
                const closeBtn = page.locator('button:has-text("Save Order"), button:has-text("Cancel")').first();
                if (await closeBtn.isVisible()) await closeBtn.click();
            }
        }

        // --- GUEST 2: HISTORY CAROUSEL & LANGUAGE ---
        if (index === 2) {
            await expect(async () => {
                const firstDot = page.getByTestId('history-dot-0');
                if (await firstDot.isVisible()) return;
                
                await page.getByTestId('tab-history').click({ force: true });
                await expect(firstDot).toBeVisible({ timeout: 5000 });
            }).toPass({ 
                timeout: 60000,
                intervals: [1000] 
            });

            // 1. NAV DOT INTERACTION (Main History Carousel)
            const historyDots = page.locator('[data-testid^="history-dot-"]');
            const historyDotCount = await historyDots.count();
            
            console.log(`Found ${historyDotCount} history carousel dots.`);
            
            if (historyDotCount > 1) {
                await historyDots.first().scrollIntoViewIfNeeded();
                await page.waitForTimeout(500);

                for (let d = 0; d < historyDotCount; d++) {
                     await historyDots.nth(d).click();
                     await page.waitForTimeout(1000);
                }
            }
            
            // 2. FUN STATS CAROUSEL
            const funDots = page.locator('[data-testid^="fun-stats-dot-"]');
            const funDotCount = await funDots.count();
            
            if (funDotCount > 1) {
                console.log(`Found ${funDotCount} fun stats dots.`);
                await funDots.first().scrollIntoViewIfNeeded();
                await page.waitForTimeout(500);

                for (let d = 0; d < funDotCount; d++) {
                     await funDots.nth(d).click();
                     await page.waitForTimeout(1000); 
                }
            }

            // 3. Language Switcher - Multi-language verification and screenshot capture
            // A. English layout screenshot
            await expect(page.getByTestId('tab-singers')).toContainText('Singers');
            await takeScreenshot(page, 'lang-en-active', testInfo);

            // B. Open dropdown and screenshot dropdown list
            await page.locator('button[title="Change Language"]').click();
            await page.waitForTimeout(500);
            await takeScreenshot(page, 'lang-switcher-dropdown', testInfo);

            // C. Switch to Português
            await page.getByRole('button', { name: 'Português' }).click();
            await page.waitForTimeout(1500); 
            await expect(page.getByTestId('tab-singers')).toContainText('Cantores'); 
            await takeScreenshot(page, 'lang-pt-active', testInfo);
            
            // D. Switch to Español
            await page.locator('button[title="Change Language"]').click();
            await page.waitForTimeout(500);
            await page.getByRole('button', { name: 'Español' }).click();
            await page.waitForTimeout(1500);
            await expect(page.getByTestId('tab-singers')).toContainText('Cantantes');
            await takeScreenshot(page, 'lang-es-active', testInfo);

            // E. Switch to 简体中文
            await page.locator('button[title="Change Language"]').click();
            await page.waitForTimeout(500);
            await page.getByRole('button', { name: '简体中文' }).click();
            await page.waitForTimeout(1500);
            await expect(page.getByTestId('tab-singers')).toContainText('歌手列表');
            await takeScreenshot(page, 'lang-zh-active', testInfo);

            // F. Switch back to English to leave guest session in English
            await page.locator('button[title="Change Language"]').click();
            await page.waitForTimeout(500);
            await page.getByRole('button', { name: 'English' }).click();
            await page.waitForTimeout(1500);
            await expect(page.getByTestId('tab-singers')).toContainText('Singers');
        }
    });

    await Promise.all(interactions);
  });

  test('6. Logout & Close', async () => {
    for (const page of guestPages) {
        await page.bringToFront();
        await page.getByTestId('tab-singers').click({ force: true });
        await page.getByRole('button', { name: 'Leave' }).click();
    }

    await hostPage.bringToFront();
    await hostPage.getByTestId('tab-settings').click({ force: true });
    await hostPage.getByRole('button', { name: 'Close Party' }).click();
    await hostPage.getByRole('button', { name: 'Yes, End Party' }).click();
    await expect(hostPage).toHaveURL(/\/host$/);
  });
});
