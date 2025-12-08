import { test, expect, type Page, type BrowserContext, request } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'change_this_value_here';
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

test.describe.configure({ mode: 'serial' });

async function completeTour(page: Page, nextButtonId: string) {
  const nextBtn = page.getByTestId(nextButtonId);
  const overlay = page.locator('[data-vaul-overlay]');

  if (await nextBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
    console.log(`ℹ️ Tour detected (${nextButtonId}), clicking through...`);
    for (let i = 0; i < 20; i++) {
      if (!await nextBtn.isVisible({ timeout: 500 }).catch(() => false)) break;
      try {
        await nextBtn.click({ force: true, timeout: 1000 });
        await page.waitForTimeout(200); 
      } catch (e) { }
    }
    await expect(overlay).toBeHidden({ timeout: 10000 });
    console.log(`✅ Tour completed.`);
  }
}

let stepCounter = 1;
const takeScreenshot = async (page: Page, name: string, testInfo: any) => {
  const baseDir = process.env.PLAYWRIGHT_REPORT_DIR || 'playwright-report/latest';
  const screenshotsDir = path.join(baseDir, 'screenshots');
  
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }
  
  const fileName = `${String(stepCounter).padStart(2, '0')}-${name}.png`;
  const filePath = path.join(screenshotsDir, fileName);
  
  await page.screenshot({ path: filePath });
  await testInfo.attach(name, { path: filePath, contentType: 'image/png' });
  console.log(`📸 Captured: ${fileName}`);
  stepCounter++;
};

test.describe('Core Party Flow', () => {
  let hostContext: BrowserContext;
  let guestContext: BrowserContext;
  let playerContext: BrowserContext; 

  let hostPage: Page;
  let guestPage: Page;
  let playerPage: Page; 

  let partyCode: string | undefined;

  test.beforeAll(async ({ browser }) => {
    hostContext = await browser.newContext({ viewport: { width: 1280, height: 720 } });
    hostPage = await hostContext.newPage();

    guestContext = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    guestPage = await guestContext.newPage();

    playerContext = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
    playerPage = await playerContext.newPage();
  });

  test.afterAll(async () => {
    await hostContext.close();
    await guestContext.close();
    await playerContext.close(); 

    if (partyCode) {
      const apiContext = await request.newContext();
      await apiContext.delete(`${BASE_URL}/api/admin/party/delete`, {
        headers: { 'Authorization': `Bearer ${ADMIN_TOKEN}` },
        params: { hash: partyCode }
      });
    }
  });

  test('1. Host - Start Party & Player Connects', async ({}, testInfo) => {
    test.setTimeout(60000); 
    
    await hostPage.goto(`${BASE_URL}/en/start-party`);
    await hostPage.getByRole('button', { name: 'Start New Party' }).click();
    await hostPage.getByLabel('Party Name').fill('Core Test Party');
    await hostPage.getByLabel('Your Name').fill('Host User');
    await hostPage.getByLabel('Admin Password').fill(ADMIN_TOKEN);
    await hostPage.getByRole('button', { name: /Create Party/i }).click();

    const failureToast = hostPage.getByText(/Invalid password/i);
    const successUrl = /\/host\//;
    try {
      await Promise.race([
        expect(hostPage).toHaveURL(successUrl, { timeout: 30000 }),
        failureToast.waitFor({ state: 'visible', timeout: 5000 })
          .then(() => { throw new Error('Auth Failed'); })
          .catch((e) => { if (e.name === 'TimeoutError') return new Promise(() => {}); throw e; })
      ]);
    } catch (e) {
      if ((e as Error).message === 'Auth Failed') {
        await takeScreenshot(hostPage, 'auth-failure', testInfo);
        throw new Error(`❌ Test Failed: Invalid Admin Password.`);
      }
      throw e; 
    }
    
    partyCode = hostPage.url().split('/').pop()!;
    console.log(`🎉 Party Created: ${partyCode}`);

    await completeTour(hostPage, 'host-tour-next');
    
    console.log('📺 Connecting Player...');
    await playerPage.goto(`${BASE_URL}/en/player/${partyCode}`);
    
    await expect(playerPage.getByText(/Party Will Start/i)).toBeVisible();
    await takeScreenshot(playerPage, 'player-waiting-screen', testInfo);

    await hostPage.getByTestId('tab-settings').click();
    await hostPage.getByRole('button', { name: 'Start Party' }).click();
    await expect(hostPage.getByRole('button', { name: /Intermission/i })).toBeVisible();
    await takeScreenshot(hostPage, 'host-party-started', testInfo);
  });

  test('2. Guest - Join Party', async ({}, testInfo) => {
    test.setTimeout(60000); 
    await guestPage.goto(`${BASE_URL}/en/join`);

    await guestPage.getByTestId('join-party-code-input').fill(partyCode!);
    await guestPage.getByTestId('avatar-select-mic').click();
    await guestPage.getByTestId('join-name-input').fill('MobileGuest');
    await guestPage.getByTestId('join-submit-button').click();
    await expect(guestPage).toHaveURL(/\/party\//);
    
    await completeTour(guestPage, 'party-tour-next');
    await takeScreenshot(guestPage, 'guest-joined', testInfo);
  });

  test('3. Guest - Add Songs & Verify Player', async ({}, testInfo) => {
    test.setTimeout(120000);
    
    console.log('🎵 Adding First Song...');
    await guestPage.getByTestId('tab-add').click();
    const searchInput = guestPage.getByTestId('song-search-input');

    await searchInput.fill('Song One');
    await searchInput.press('Enter');
    let addBtn = guestPage.locator('button[data-testid^="add-video-"]').first();
    await expect(addBtn).toBeVisible({ timeout: 15000 });
    await addBtn.click();
    await expect(guestPage.getByText('Song added to queue!').first()).toBeVisible();

    console.log('📺 Verifying Player (Now Playing)...');
    await expect(playerPage.getByText(/Party Will Start/i)).not.toBeVisible();
    const videoIframe = playerPage.locator('iframe');
    const fallbackBtn = playerPage.getByRole('button', { name: 'Open on YouTube' });
    await expect(videoIframe.or(fallbackBtn)).toBeVisible({ timeout: 15000 });
    await takeScreenshot(playerPage, 'player-video-loaded', testInfo);

    console.log('🎵 Adding Second Song...');
    await searchInput.fill('Song Two');
    await searchInput.press('Enter');
    await guestPage.waitForTimeout(2000); 
    addBtn = guestPage.locator('button[data-testid^="add-video-"]').first();
    await addBtn.click();
    await expect(guestPage.getByText('Song added to queue!').first()).toBeVisible();

    console.log('📺 Verifying Player (Up Next)...');
    const nextUpSection = playerPage.locator('h3', { hasText: 'Next Up' });
    await expect(nextUpSection.getByText('MobileGuest')).toBeVisible();
    await takeScreenshot(playerPage, 'player-up-next', testInfo);
  });

  test('4. Guest - Interact (Applause, History) & Leave', async ({}, testInfo) => {
    test.setTimeout(90000); 
    
    await guestPage.getByTestId('tab-singers').click();
    await guestPage.waitForTimeout(500);

    console.log('👏 Testing Applause...');
    const applauseLink = guestPage.getByLabel('Send applause');
    await expect(applauseLink).toBeVisible();
    await applauseLink.click();
    await expect(guestPage).toHaveURL(/\/applause\//);
    
    const bigHandBtn = guestPage.locator('button').filter({ hasText: '👏🏾' }); 
    await expect(bigHandBtn).toBeVisible();
    await bigHandBtn.click();
    await guestPage.waitForTimeout(200);
    await bigHandBtn.click();
    
    await takeScreenshot(guestPage, 'guest-applause-screen', testInfo);

    await guestPage.getByRole('button', { name: 'Back to Party' }).click();
    await expect(guestPage).toHaveURL(/\/party\//);

    console.log('📜 Testing History Carousels...');
    await guestPage.getByTestId('tab-history').click();
    
    const historyDot1 = guestPage.getByTestId('history-dot-1');
    const historyDot2 = guestPage.getByTestId('history-dot-2');
    if (await historyDot1.isVisible()) {
        await historyDot1.click();
        await guestPage.waitForTimeout(300); 
        await historyDot2.click();
    }

    await guestPage.getByTestId('fun-stats-dot-1').scrollIntoViewIfNeeded();
    const statsDot1 = guestPage.getByTestId('fun-stats-dot-1');
    const statsDot0 = guestPage.getByTestId('fun-stats-dot-0');
    if (await statsDot1.isVisible()) {
        await statsDot1.click();
        await guestPage.waitForTimeout(300);
        await statsDot0.click();
    }
    
    await takeScreenshot(guestPage, 'guest-history-tab', testInfo);

    console.log('👋 Guest Leaving...');
    await guestPage.getByTestId('tab-singers').click();
    await guestPage.waitForTimeout(500);

    await guestPage.getByLabel('Leave party').click();
    await expect(guestPage).toHaveURL(/\/en$/);
    await takeScreenshot(guestPage, 'guest-left', testInfo);
  });

  test('5. Host - Delete Song & Close Party', async ({}, testInfo) => {
    test.setTimeout(90000); 
    await hostPage.bringToFront();
    await completeTour(hostPage, 'host-tour-next');

    await hostPage.getByTestId('tab-playlist').click();
    const songItem = hostPage.getByTestId('playlist-item-MobileGuest').last();
    await expect(songItem).toBeVisible({ timeout: 10000 });

    await songItem.getByTestId('item-menu-btn').click();
    await songItem.getByTestId('item-remove-btn').click();
    await expect(hostPage.getByTestId('playlist-item-MobileGuest')).not.toBeVisible();
    
    console.log('📺 Verifying Player (Removed)...');
    await expect(playerPage.locator('h3', { hasText: 'Next Up' })).not.toBeVisible();
    await takeScreenshot(playerPage, 'player-song-removed', testInfo);

    await hostPage.getByTestId('tab-settings').click();
    const closeBtn = hostPage.getByRole('button', { name: 'Close Party' });
    await closeBtn.scrollIntoViewIfNeeded();
    await closeBtn.click();

    await hostPage.getByRole('button', { name: 'Yes, End Party' }).click();
    await expect(hostPage).toHaveURL(/\/en$/);
    
    console.log('📺 Verifying Player (Closed)...');
    await playerPage.reload();
    await expect(playerPage.locator('iframe')).not.toBeVisible({ timeout: 15000 });
    
    await takeScreenshot(playerPage, 'player-party-closed', testInfo);
  });
});
