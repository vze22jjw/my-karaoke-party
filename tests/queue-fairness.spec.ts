import { test, expect, type Page, type BrowserContext, request } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const ADMIN_TOKEN = process.env.ADMIN_TOKEN;
const BASE_URL = process.env.BASE_URL;

const fallbackTimestamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-');
const REPORT_DIR = process.env.PLAYWRIGHT_REPORT_DIR || path.join('playwright-report', `fairness-${fallbackTimestamp}`);
const SCREENSHOT_DIR = path.join(REPORT_DIR, 'screenshots');

if (!BASE_URL || !ADMIN_TOKEN) throw new Error("❌ FATAL: BASE_URL or ADMIN_TOKEN missing.");

if (!fs.existsSync(SCREENSHOT_DIR)) fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

test.describe.configure({ mode: 'serial' });

let stepCounter = 1;

async function takeScreenshot(page: Page, name: string, testInfo: any) {
  // If we are on the Host page, ensure we are looking at the playlist tab
  const playlistTab = page.getByTestId('tab-playlist');
  if (await playlistTab.count() > 0 && await playlistTab.isVisible()) {
      if ((await playlistTab.getAttribute('data-state')) !== 'active') {
          await playlistTab.click();
          await page.waitForTimeout(300); // Visual settle
      }
  }
  
  const fileName = `${String(stepCounter).padStart(2, '0')}-${name}.png`;
  const filePath = path.join(SCREENSHOT_DIR, fileName);
  
  await page.screenshot({ path: filePath, fullPage: true });
  await testInfo.attach(name, { path: filePath, contentType: 'image/png' });
  console.log(`📸 Screenshot: ${fileName}`);
  stepCounter++;
}

async function addSong(page: Page, query: string, screenshotName: string, testInfo: any) {
  await page.getByTestId('tab-add').click();
  await page.waitForTimeout(500);

  const input = page.getByTestId('song-search-input');
  await input.fill(query);
  await input.press('Enter');
  
  // Wait for results
  const addButtons = page.locator('button[data-testid^="add-video-"]');
  await expect(addButtons.first()).toBeVisible({ timeout: 15000 });
  
  // Capture specific ID to track this exact button's state
  const currentBtn = addButtons.first();
  const btnId = await currentBtn.getAttribute('data-testid');
  if (!btnId) throw new Error("Add button missing data-testid");

  const specificBtn = page.locator(`button[data-testid="${btnId}"]`);
  
  // Force click to bypass 'vds-blocker' overlay from the video player
  await specificBtn.click({ force: true });
  
  // Verify success by checking button state (Load Test Logic)
  await Promise.race([
      expect(specificBtn).toBeDisabled({ timeout: 10000 }),
      expect(specificBtn).toBeHidden({ timeout: 10000 })
  ]);

  await input.fill('');
  await page.waitForTimeout(500);

  // Capture Guest View
  await takeScreenshot(page, screenshotName, testInfo);
}

async function getHostQueueSingers(hostPage: Page) {
  await hostPage.getByTestId('tab-playlist').click();
  // Grab singer names visible in the list
  return await hostPage.locator('[data-testid^="playlist-item-"] p.text-muted-foreground').allInnerTexts();
}

test.describe('Queue Fairness & Stability', () => {
  let hostContext: BrowserContext;
  let guestContexts: BrowserContext[] = [];
  let hostPage: Page;
  let guestPages: Page[] = [];
  let partyCode: string;

  const GUEST_NAMES = ['User1', 'User2', 'User3'];

  test.beforeAll(async ({ browser }) => {
    // 1. Create Host
    hostContext = await browser.newContext({ 
        viewport: { width: 1280, height: 800 }, 
        extraHTTPHeaders: { 'Authorization': `Bearer ${ADMIN_TOKEN}` }
    });
    hostPage = await hostContext.newPage();

    // 2. Create Party
    await hostPage.goto(`${BASE_URL}/en/start-party`);
    await hostPage.getByRole('button', { name: 'Start New Party' }).click();
    await hostPage.getByLabel('Party Name').fill(`Fairness Test ${Date.now()}`);
    await hostPage.getByLabel('Your Name').fill('Host');
    await hostPage.getByLabel('Admin Password').fill(ADMIN_TOKEN!);
    await hostPage.getByRole('button', { name: /Create Party/i }).click();
    await expect(hostPage).toHaveURL(/\/host\//);
    partyCode = hostPage.url().split('/').pop()!;
    console.log(`🎉 Party Created: ${partyCode}`);
    
    // Bypass Host Tour
    await hostPage.evaluate((hash) => {
        window.localStorage.setItem(`host-${hash}-tour-seen`, 'true');
    }, partyCode);
    await hostPage.reload();
    await expect(hostPage.locator('[data-vaul-overlay]')).toBeHidden();

    // 3. Join Guests
    for (const name of GUEST_NAMES) {
        const ctx = await browser.newContext({ 
            viewport: { width: 390, height: 844 }, 
            isMobile: true
        });

        // Bypass Guest Tour
        await ctx.addInitScript(({ key }) => {
            window.localStorage.setItem(key, 'true');
        }, { key: `guest-${partyCode}-tour-seen` });

        guestContexts.push(ctx);
        const page = await ctx.newPage();
        guestPages.push(page);

        await page.goto(`${BASE_URL}/en/join`);
        await page.getByTestId('join-party-code-input').fill(partyCode);
        await page.getByTestId('avatar-select-mic').click();
        await page.getByTestId('join-name-input').fill(name);
        await page.getByTestId('join-submit-button').click();
        await expect(page).toHaveURL(/\/party\//);
        await expect(page.getByTestId('tab-add')).toBeVisible({ timeout: 15000 });
    }
  });

  test.afterAll(async () => {
    if (partyCode) {
        const apiContext = await request.newContext();
        await apiContext.delete(`${BASE_URL}/api/admin/party/delete`, {
            headers: { 'Authorization': `Bearer ${ADMIN_TOKEN}` },
            params: { hash: partyCode }
        });
        console.log(`🧹 Deleted Party ${partyCode}`);
    }
    await hostContext.close();
    for (const ctx of guestContexts) await ctx.close();
  });

  test('Step 1: Build Initial Queue (Interleaved)', async ({}, testInfo) => {
    test.setTimeout(120000); 
    
    // U1 adds Song A
    await addSong(guestPages[0], 'Song A', 'user1-add-song1', testInfo); 
    await takeScreenshot(hostPage, 'host-queue-after-user1-1', testInfo);

    // U2 adds Song B
    await addSong(guestPages[1], 'Song B', 'user2-add-song1', testInfo); 
    await takeScreenshot(hostPage, 'host-queue-after-user2-1', testInfo);

    // U3 adds Song C
    await addSong(guestPages[2], 'Song C', 'user3-add-song1', testInfo); 
    await takeScreenshot(hostPage, 'host-queue-after-user3-1', testInfo);
    
    // U1 adds Song D
    await addSong(guestPages[0], 'Song D', 'user1-add-song2', testInfo); 
    await takeScreenshot(hostPage, 'host-queue-after-user1-2', testInfo);

    // U2 adds Song E
    await addSong(guestPages[1], 'Song E', 'user2-add-song2', testInfo); 
    await takeScreenshot(hostPage, 'host-queue-after-user2-2', testInfo);

    // U3 adds Song F
    await addSong(guestPages[2], 'Song F', 'user3-add-song2', testInfo); 
    await takeScreenshot(hostPage, 'host-queue-after-user3-2', testInfo);

    await hostPage.waitForTimeout(1000);
    const singers = await getHostQueueSingers(hostPage);
    console.log('Final Queue Singers:', singers);
    
    // Expect: U1, U2, U3, U1, U2, U3
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
    await expect(deleteBtn).toBeVisible({ timeout: 5000 });
    await deleteBtn.click();
    
    await u2Page.waitForTimeout(1500);
    await takeScreenshot(u2Page, 'user2-deleted-song', testInfo);

    // EXIT MANAGE MODE
    await u2Page.getByRole('button', { name: 'Cancel' }).click();

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

    // 1. Delete Top Song
    u1Page.on('dialog', d => d.accept());
    const deleteBtn = u1Page.getByTestId('delete-song-btn').first();
    await expect(deleteBtn).toBeVisible();
    await deleteBtn.click();
    await u1Page.waitForTimeout(500);

    // 2. EXIT MANAGE MODE
    const exitBtn = u1Page.locator('button:has-text("Save Order"), button:has-text("Cancel")').first();
    await exitBtn.click();
    await u1Page.waitForTimeout(500);
    
    // 3. Add New Song
    await addSong(u1Page, 'Song G', 'user1-reorder-add-g', testInfo);

    const singers = await getHostQueueSingers(hostPage);
    console.log('Queue Singers after U1 swap:', singers);
    await takeScreenshot(hostPage, 'host-queue-after-reorder', testInfo);

    expect(singers[0]).toBe('User1');
    expect(singers[1]).toBe('User2');
  });

  test('Step 4: Start Party & Verify Restrictions', async ({}, testInfo) => {
    await hostPage.getByTestId('tab-settings').click();
    await hostPage.getByRole('button', { name: 'Start Party' }).click();
    await hostPage.waitForTimeout(1000);

    await takeScreenshot(hostPage, 'party-started', testInfo);

    const u1Page = guestPages[0];
    await u1Page.getByTestId('tab-add').click();
    await u1Page.getByRole('button', { name: 'Manage' }).click();
    await expect(u1Page.getByText('Queue modification disabled')).toBeVisible();
    await takeScreenshot(u1Page, 'user1-restricted', testInfo);

    const u3Page = guestPages[2];
    await u3Page.getByTestId('tab-add').click();
    await u3Page.getByRole('button', { name: 'Manage' }).click();
    await expect(u3Page.getByText('Queue modification disabled')).toBeHidden();
    await takeScreenshot(u3Page, 'user3-allowed', testInfo);
  });
});
