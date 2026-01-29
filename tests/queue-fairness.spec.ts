import { test, expect, type Page, type BrowserContext, request } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
// IMPORT HELPERS
import { createPartyRobust, joinPartyRobust, addSongRobust } from './helpers/party-utils';

const ADMIN_TOKEN = process.env.ADMIN_TOKEN;
const BASE_URL = process.env.BASE_URL;

const fallbackTimestamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-');
const REPORT_DIR = process.env.PLAYWRIGHT_REPORT_DIR || path.join('playwright-report', `fairness-${fallbackTimestamp}`);
const SCREENSHOT_DIR = path.join(REPORT_DIR, 'screenshots');

if (!BASE_URL || !ADMIN_TOKEN) throw new Error("❌ FATAL: BASE_URL or ADMIN_TOKEN missing.");

if (!fs.existsSync(SCREENSHOT_DIR)) fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

test.describe.configure({ mode: 'serial' });

// --- Helper Functions (Specific to Fairness) ---

let stepCounter = 1;

async function takeScreenshot(page: Page, name: string, testInfo: any) {
  const playlistTab = page.getByTestId('tab-playlist');
  try {
      if (await playlistTab.count() > 0 && await playlistTab.isVisible()) {
          if ((await playlistTab.getAttribute('data-state')) !== 'active') {
              await playlistTab.click({ force: true });
              await page.waitForTimeout(500); 
          }
      }
  } catch (e) {
      console.warn(`⚠️ Could not switch tab for screenshot '${name}'`);
  }
  
  const fileName = `${String(stepCounter).padStart(2, '0')}-${name}.png`;
  const filePath = path.join(SCREENSHOT_DIR, fileName);
  
  await page.screenshot({ path: filePath, fullPage: true });
  await testInfo.attach(name, { path: filePath, contentType: 'image/png' });
  console.log(`📸 Screenshot: ${fileName}`);
  stepCounter++;
}

async function waitForHostQueueSize(hostPage: Page, expectedCount: number) {
    const checkQueue = async () => {
        const tab = hostPage.getByTestId('tab-playlist');
        if ((await tab.getAttribute('data-state')) !== 'active') {
             await tab.click({ force: true });
        }
        return await hostPage.locator('[data-testid^="playlist-item-"]').count();
    };

    console.log(`⏳ Waiting for Host Queue to show ${expectedCount} items...`);
    
    let count = await checkQueue();
    
    if (count !== expectedCount) {
        console.log(`⚠️ Queue count mismatch (Found ${count}, Expected ${expectedCount}). Reloading Host to sync DB...`);
        await hostPage.reload();
        await hostPage.waitForLoadState('domcontentloaded');
        await hostPage.waitForTimeout(2000); 
        count = await checkQueue();
    }

    await expect(async () => {
        const currentCount = await checkQueue();
        expect(currentCount).toBe(expectedCount);
    }).toPass({ timeout: 30000, intervals: [1000] }); 
}

async function getHostQueueSingers(hostPage: Page) {
  const tab = hostPage.getByTestId('tab-playlist');
  if ((await tab.getAttribute('data-state')) !== 'active') {
       await tab.click({ force: true });
  }
  return await hostPage.locator('[data-testid^="playlist-item-"] p.text-muted-foreground').allInnerTexts();
}

// --- Host Tour Walker (Since Helper doesn't skip it) ---
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
    hostContext = await browser.newContext({ 
        viewport: { width: 1280, height: 800 }, 
        extraHTTPHeaders: { 'Authorization': `Bearer ${ADMIN_TOKEN}` }
    });
    hostPage = await hostContext.newPage();

    // 1. Create Party (Using Helper)
    const uniquePartyName = `Fairness Test ${Math.floor(Math.random() * 1000)}`;
    partyCode = await createPartyRobust(hostPage, uniquePartyName);
    
    // Clear Host Tour
    await walkthroughHostTour(hostPage);

    // 2. Guests Join (Using Helper)
    for (const [index, name] of GUEST_NAMES.entries()) {
        const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true });
        guestContexts.push(ctx);
        const page = await ctx.newPage();
        guestPages.push(page);

        await joinPartyRobust(page, partyCode, name, index);
    }
  });

  test.afterAll(async () => {
    if (partyCode) {
        const apiContext = await request.newContext();
        try {
            await apiContext.delete(`${BASE_URL}/api/admin/party/delete`, {
                headers: { 'Authorization': `Bearer ${ADMIN_TOKEN}` },
                params: { hash: partyCode }
            });
            console.log(`🧹 Deleted Party ${partyCode}`);
        } catch(e) {}
    }
    await hostContext.close();
    for (const ctx of guestContexts) await ctx.close();
  });

  test('Step 1: Build Initial Queue (Interleaved)', async ({}, testInfo) => {
    // Round 1
    await addSongRobust(guestPages[0], 'Karaoke Song 1'); 
    await takeScreenshot(hostPage, 'host-queue-after-user1-1', testInfo);

    await addSongRobust(guestPages[1], 'Karaoke Song 2'); 
    await takeScreenshot(hostPage, 'host-queue-after-user2-1', testInfo);

    await addSongRobust(guestPages[2], 'Karaoke Song 3'); 
    await takeScreenshot(hostPage, 'host-queue-after-user3-1', testInfo);
    
    // Round 2
    await addSongRobust(guestPages[0], 'Karaoke Song 4'); 
    await takeScreenshot(hostPage, 'host-queue-after-user1-2', testInfo);

    await addSongRobust(guestPages[1], 'Karaoke Song 5'); 
    await takeScreenshot(hostPage, 'host-queue-after-user2-2', testInfo);

    await addSongRobust(guestPages[2], 'Karaoke Song 6'); 
    await takeScreenshot(hostPage, 'host-queue-after-user3-2', testInfo);

    await waitForHostQueueSize(hostPage, 6);

    const singers = await getHostQueueSingers(hostPage);
    console.log('Final Queue Singers:', singers);
    
    // Fairness Check: Interleaved
    expect(singers[0]).toBe('User1');
    expect(singers[1]).toBe('User2');
    expect(singers[2]).toBe('User3');
    expect(singers[3]).toBe('User1');
    expect(singers[4]).toBe('User2');
    expect(singers[5]).toBe('User3');
  });

  test('Step 2: User 2 Deletes First Song (Verify No Queue Jump)', async ({}, testInfo) => {
    const u2Page = guestPages[1];
    await u2Page.getByTestId('tab-add').click();
    await u2Page.getByRole('button', { name: 'Manage' }).click();
    
    u2Page.on('dialog', d => d.accept());
    
    const deleteBtn = u2Page.getByTestId('delete-song-btn').first();
    await expect(deleteBtn).toBeVisible({ timeout: 10000 });
    await deleteBtn.click();
    
    await u2Page.waitForTimeout(2000);
    await takeScreenshot(u2Page, 'user2-deleted-song', testInfo);

    await u2Page.getByRole('button', { name: 'Cancel' }).click();

    await waitForHostQueueSize(hostPage, 5);

    const singers = await getHostQueueSingers(hostPage);
    console.log('Queue Singers after U2 delete:', singers);
    await takeScreenshot(hostPage, 'host-queue-after-delete', testInfo);

    expect(singers[0]).toBe('User1'); 
    expect(singers[1]).toBe('User2'); 
    expect(singers[2]).toBe('User3');
  });

  test('Step 3: User 1 Reorders Queue (Manual Sort Fix)', async ({}, testInfo) => {
    const u1Page = guestPages[0];
    await u1Page.getByTestId('tab-add').click();
    await u1Page.getByRole('button', { name: 'Manage' }).click();

    u1Page.on('dialog', d => d.accept());
    const deleteBtn = u1Page.getByTestId('delete-song-btn').first();
    await expect(deleteBtn).toBeVisible({ timeout: 10000 });
    await deleteBtn.click();
    await u1Page.waitForTimeout(1000);

    const exitBtn = u1Page.locator('button:has-text("Save Order"), button:has-text("Cancel")').first();
    await exitBtn.click();
    await u1Page.waitForTimeout(1000);
    
    // Re-add a song (triggers re-queue logic)
    await addSongRobust(u1Page, 'Karaoke Song 7');

    await waitForHostQueueSize(hostPage, 5);

    const singers = await getHostQueueSingers(hostPage);
    console.log('Queue Singers after U1 swap:', singers);
    await takeScreenshot(hostPage, 'host-queue-after-reorder', testInfo);

    expect(singers[0]).toBe('User1');
    expect(singers[1]).toBe('User2');
  });

  test('Step 4: Start Party & Verify Restrictions', async ({}, testInfo) => {
    await hostPage.getByTestId('tab-settings').click({ force: true });
    await hostPage.getByRole('button', { name: 'Start Party' }).click();
    await hostPage.waitForTimeout(2000);

    await takeScreenshot(hostPage, 'party-started', testInfo);

    const u1Page = guestPages[0];
    await u1Page.getByTestId('tab-add').click();
    
    // SYNC: Wait for Playing Now to ensure Guest knows party started
    try {
        await expect(u1Page.getByText('Playing Now')).toBeVisible({ timeout: 5000 });
    } catch {
        console.log("⚠️ Guest 1 sync issue. Reloading...");
        await u1Page.reload();
        await u1Page.waitForLoadState('domcontentloaded');
        await expect(u1Page.getByTestId('tab-add')).toBeVisible({ timeout: 10000 });
        const addTab = u1Page.getByTestId('tab-add');
        if ((await addTab.getAttribute('data-state')) !== 'active') {
             await addTab.click();
        }
    }
    
    await u1Page.getByRole('button', { name: 'Manage' }).click();
    await expect(u1Page.getByText(/Queue modification disabled/)).toBeVisible({ timeout: 20000 });
    await takeScreenshot(u1Page, 'user1-restricted', testInfo);

    const u3Page = guestPages[2];
    await u3Page.getByTestId('tab-add').click();
    await u3Page.getByRole('button', { name: 'Manage' }).click();
    await expect(u3Page.getByText(/Queue modification disabled/)).toBeHidden({ timeout: 20000 });
    await takeScreenshot(u3Page, 'user3-allowed', testInfo);
  });
});
