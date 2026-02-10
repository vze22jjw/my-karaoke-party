import { test, expect, type Page, type BrowserContext, request } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { createParty, joinParty, addSong } from './helpers/party-utils';

const ADMIN_TOKEN = process.env.ADMIN_TOKEN;
const BASE_URL = process.env.BASE_URL;

const fallbackTimestamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-');
const REPORT_DIR = process.env.PLAYWRIGHT_REPORT_DIR || path.join('playwright-report', `fairness-${fallbackTimestamp}`);
const SCREENSHOT_DIR = path.join(REPORT_DIR, 'screenshots');

if (!BASE_URL || !ADMIN_TOKEN) throw new Error("❌ FATAL: Configuration missing.");
if (!fs.existsSync(SCREENSHOT_DIR)) fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

test.describe.configure({ mode: 'serial' });

let stepCounter = 1;

async function takeScreenshot(page: Page, name: string, testInfo: any) {
    const playlistTab = page.getByTestId('tab-playlist');
    try {
        if (await playlistTab.count() > 0 && await playlistTab.isVisible()) {
            if ((await playlistTab.getAttribute('data-state')) !== 'active') {
                await playlistTab.click({ force: true });
                await page.waitForTimeout(500); // Allow animation
            }
        }
    } catch (e) {
    }

    const fileName = `${String(stepCounter).padStart(2, '0')}-${name}.png`;
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, fileName), fullPage: true });
    await testInfo.attach(name, { path: path.join(SCREENSHOT_DIR, fileName), contentType: 'image/png' });
    stepCounter++;
    console.log(`📸 Screenshot: ${fileName}`);
}

/**
 * Strict Serial Ordering Wrapper
 * We use 'toPass' here to poll the Host UI. This confirms the WebSocket loop 
 * (Guest -> Server -> Host) is complete before moving to the next action.
 */
async function addSongWithHostWait(guestPage: Page, hostPage: Page, songName: string, expectedCount: number) {
    console.log(`📡 Spec: Guest adding "${songName}" (Target count: ${expectedCount})`);
    await addSong(guestPage, songName);
    
    await expect(async () => {
        const tab = hostPage.getByTestId('tab-playlist');
        if ((await tab.getAttribute('data-state')) !== 'active') await tab.click({ force: true });
        
        const count = await hostPage.locator('[data-testid^="playlist-item-"]').count();
        expect(count).toBe(expectedCount);
    }).toPass({ timeout: 25000, intervals: [1000] });
}

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

test.describe('Queue Fairness & Stability', () => {
  let hostContext: BrowserContext;
  let guestContexts: BrowserContext[] = [];
  let hostPage: Page;
  let guestPages: Page[] = [];
  let partyCode: string;
  const GUEST_NAMES = ['User1', 'User2', 'User3'];

  test.setTimeout(300000); 
  test.beforeAll(async ({ browser }) => {
    test.setTimeout(180000);

    hostContext = await browser.newContext({ viewport: { width: 1280, height: 800 }, extraHTTPHeaders: { 'Authorization': `Bearer ${ADMIN_TOKEN}` } });
    hostPage = await hostContext.newPage();
    partyCode = await createParty(hostPage, `Fairness ${Date.now()}`);
    await walkthroughHostTour(hostPage);

    for (const [index, name] of GUEST_NAMES.entries()) {
        const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true });
        
        await ctx.addInitScript(({ key }) => {
            window.localStorage.setItem(key, 'true');
        }, { key: `guest-${partyCode}-tour-seen` });

        guestContexts.push(ctx);
        const page = await ctx.newPage();
        guestPages.push(page);
        await joinParty(page, partyCode, name, index);
    }
  });

  test.afterAll(async () => {
    if (partyCode) {
        const apiContext = await request.newContext();
        await apiContext.delete(`${BASE_URL}/api/admin/party/delete`, { headers: { 'Authorization': `Bearer ${ADMIN_TOKEN}` }, params: { hash: partyCode } }).catch(()=>{});
    }
    await hostContext.close();
    for (const ctx of guestContexts) await ctx.close();
  });

  test('Step 1: Build Initial Queue (Interleaved)', async ({}, testInfo) => {
    // Round 1
    await addSongWithHostWait(guestPages[0], hostPage, 'Song 1', 1);
    await takeScreenshot(hostPage, 'host-queue-after-user1-1', testInfo);

    await addSongWithHostWait(guestPages[1], hostPage, 'Song 2', 2);
    await takeScreenshot(hostPage, 'host-queue-after-user2-1', testInfo);

    await addSongWithHostWait(guestPages[2], hostPage, 'Song 3', 3);
    await takeScreenshot(hostPage, 'host-queue-after-user3-1', testInfo);
    
    // Round 2
    await addSongWithHostWait(guestPages[0], hostPage, 'Song 4', 4);
    await takeScreenshot(hostPage, 'host-queue-after-user1-2', testInfo);

    await addSongWithHostWait(guestPages[1], hostPage, 'Song 5', 5);
    await takeScreenshot(hostPage, 'host-queue-after-user2-2', testInfo);

    await addSongWithHostWait(guestPages[2], hostPage, 'Song 6', 6);
    await takeScreenshot(hostPage, 'host-queue-after-user3-2', testInfo);

    const singers = await hostPage.locator('[data-testid^="playlist-item-"] p.text-muted-foreground').allInnerTexts();
    console.log('Final Queue Singers:', singers);
    
    // Verify Round-Robin Algorithm: U1, U2, U3, U1, U2, U3
    expect(singers).toEqual(['User1', 'User2', 'User3', 'User1', 'User2', 'User3']);
  });

  test('Step 2: User 2 Deletes Song (Verify Stability)', async ({}, testInfo) => {
    const u2Page = guestPages[1];
    await u2Page.getByTestId('tab-add').click();
    await u2Page.getByRole('button', { name: 'Manage' }).click();
    
    u2Page.on('dialog', d => d.accept());
    await u2Page.getByTestId('delete-song-btn').first().click();
    
    await takeScreenshot(u2Page, 'user2-deleted-song', testInfo);

    await u2Page.getByRole('button', { name: 'Cancel' }).click();

    // Verify host sees 5 items and turns are preserved
    await expect(hostPage.locator('[data-testid^="playlist-item-"]')).toHaveCount(5, { timeout: 15000 });
    const singers = await hostPage.locator('[data-testid^="playlist-item-"] p.text-muted-foreground').allInnerTexts();
    
    expect(singers[0]).toBe('User1'); 
    expect(singers[1]).toBe('User2'); 
    await takeScreenshot(hostPage, 'host-queue-after-delete', testInfo);
  });

  test('Step 3: User 1 Reorders Queue', async ({}, testInfo) => {
    const u1Page = guestPages[0];
    await u1Page.getByTestId('tab-add').click();
    await u1Page.getByRole('button', { name: 'Manage' }).click();
    u1Page.on('dialog', d => d.accept());
    
    await u1Page.getByTestId('delete-song-btn').first().click(); 
    await u1Page.locator('button:has-text("Save Order"), button:has-text("Cancel")').first().click();
    
    await addSongWithHostWait(u1Page, hostPage, 'Song 7', 5);
    const singers = await hostPage.locator('[data-testid^="playlist-item-"] p.text-muted-foreground').allInnerTexts();
    
    expect(singers[0]).toBe('User1');
    await takeScreenshot(hostPage, 'host-queue-after-reorder', testInfo);
  });

  test('Step 4: Verify Start Party Restrictions', async ({}, testInfo) => {
    await hostPage.bringToFront();
    console.log("🚀 Spec: Host starting party...");
    await expect(async () => {
        const settingsTab = hostPage.getByTestId('tab-settings');
        if ((await settingsTab.getAttribute('data-state')) !== 'active') {
            await settingsTab.click({ force: true });
        }

        const startBtn = hostPage.getByRole('button', { name: 'Start Party' });
        if (await startBtn.isVisible()) {
            await startBtn.click({ force: true });
        }
        
        const pauseBtn = hostPage.locator('button', { hasText: /Pause|Intermission/i }).first();
        await expect(pauseBtn).toBeVisible({ timeout: 3000 });
    }).toPass({ timeout: 20000, intervals: [2000] });

    await takeScreenshot(hostPage, 'party-started', testInfo);

    const u1Page = guestPages[0];
    await u1Page.bringToFront();
    
    console.log("📡 Spec: Waiting for Guest to sync 'Playing Now'...");
    await expect(async () => {
        const playingNow = u1Page.getByText('Playing Now');
        if (!(await playingNow.isVisible())) {
            await u1Page.getByTestId('tab-add').click({ force: true });
        }
        
        try {
            await expect(playingNow).toBeVisible({ timeout: 5000 });
        } catch (e) {
            console.log("⚠️ Guest sync lag. Reloading guest page...");
            await u1Page.reload();
            await u1Page.waitForLoadState('networkidle');
            await u1Page.getByTestId('tab-add').click({ force: true });
            throw e; 
        }
    }).toPass({ timeout: 30000, intervals: [1000] });

    await u1Page.getByRole('button', { name: 'Manage' }).click();
    // User 1 is currently singing - reordering should be disabled
    await expect(u1Page.getByText(/Queue modification disabled/)).toBeVisible({ timeout: 15000 });
    await takeScreenshot(u1Page, 'user1-restricted', testInfo);

    const u3Page = guestPages[2];
    await u3Page.bringToFront();
    await u3Page.getByTestId('tab-add').click();
    await u3Page.getByRole('button', { name: 'Manage' }).click();
    // User 3 is far back in queue - should still be able to manage
    await expect(u3Page.getByText(/Queue modification disabled/)).toBeHidden({ timeout: 15000 });
    await takeScreenshot(u3Page, 'user3-allowed', testInfo);
  });
});
