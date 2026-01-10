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

console.log(`🚀 Starting Test Run`);
console.log(`📂 Writing artifacts to: ${REPORT_DIR}`);

if (!fs.existsSync(VIDEO_DIR)) fs.mkdirSync(VIDEO_DIR, { recursive: true });
if (!fs.existsSync(SCREENSHOT_DIR)) fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

test.describe.configure({ mode: 'serial' });

let stepCounter = 1;
const takeScreenshot = async (page: Page, name: string, testInfo: any) => {
  const fileName = `${String(stepCounter).padStart(2, '0')}-${name}.png`;
  const filePath = path.join(SCREENSHOT_DIR, fileName);
  await page.screenshot({ path: filePath });
  if (testInfo) await testInfo.attach(name, { path: filePath, contentType: 'image/png' });
  console.log(`📸 Screenshot: ${fileName}`);
  stepCounter++;
};

async function walkthroughTour(page: Page, role: 'host' | 'guest') {
  console.log(`ℹ️ [${role}] Starting Tour Walkthrough...`);
  const overlay = page.locator('[data-vaul-overlay]');
  
  try {
    await expect(overlay).toBeVisible({ timeout: 10000 });
  } catch (e) {
    console.log(`ℹ️ [${role}] Tour not found (maybe bypassed), skipping.`);
    return;
  }
  await page.waitForTimeout(1000); 

  const nextBtn = page.getByRole('button', { name: 'Next' });
  const finishBtn = page.getByRole('button', { name: /Got it|Finish/i });

  for (let i = 0; i < 15; i++) {
    if (await finishBtn.isVisible()) {
      await finishBtn.click();
      break;
    } else if (await nextBtn.isVisible()) {
      await nextBtn.click();
      await page.waitForTimeout(1500); 
    } else {
      await page.keyboard.press('Escape');
      break; 
    }
  }
  
  await expect(overlay).toBeHidden();
  console.log(`✅ [${role}] Tour Completed.`);
}

test.describe('Core Party Flow (Full Feature)', () => {
  let hostContext: BrowserContext;
  let guestContexts: BrowserContext[] = [];
  let hostPage: Page;
  let guestPages: Page[] = [];
  let partyCode: string | undefined;
  
  const partyName = `AutoTest ${Math.floor(Math.random() * 1000)}`;
  const GUEST_COUNT = 3;

  test.beforeAll(async ({ browser }) => {
    hostContext = await browser.newContext({ 
        viewport: { width: 1280, height: 800 }, 
        recordVideo: { dir: VIDEO_DIR },
        extraHTTPHeaders: { 'Authorization': `Bearer ${ADMIN_TOKEN}` }
    });
    hostPage = await hostContext.newPage();

    for (let i = 0; i < GUEST_COUNT; i++) {
        const ctx = await browser.newContext({ 
            viewport: { width: 390, height: 844 }, 
            isMobile: true, 
            hasTouch: true, 
            recordVideo: { dir: VIDEO_DIR } 
        });
        guestContexts.push(ctx);
        const page = await ctx.newPage();
        guestPages.push(page);
    }
  });

  test.afterAll(async () => {
    if (partyCode) {
        try {
            const apiContext = await request.newContext();
            await apiContext.delete(`${BASE_URL}/api/admin/party/delete`, {
                headers: { 'Authorization': `Bearer ${ADMIN_TOKEN}` },
                params: { hash: partyCode }
            });
            console.log(`🧹 Cleanup: Deleted party ${partyCode}`);
        } catch (e) {
            console.warn("⚠️ Cleanup API call failed:", e);
        }
    }

    const hostVideo = await hostPage.video()?.path();
    const guestVideos = await Promise.all(guestPages.map(p => p.video()?.path()));

    await hostContext.close();
    for (const ctx of guestContexts) await ctx.close();

    if (hostVideo && fs.existsSync(hostVideo)) {
        fs.renameSync(hostVideo, path.join(VIDEO_DIR, 'role-host.webm'));
        console.log('🎥 Saved Video: role-host.webm');
    }
    guestVideos.forEach((vPath, i) => {
        if (vPath && fs.existsSync(vPath)) {
            fs.renameSync(vPath, path.join(VIDEO_DIR, `role-guest-${i}.webm`));
            console.log('🎥 Saved Video:', `role-guest-${i}.webm`);
        }
    });
  });

  test('1. Host Creates Party & Views Tour', async ({}, testInfo) => {
    test.setTimeout(60000);
    await hostPage.goto(`${BASE_URL}/en/start-party`);
    await hostPage.getByRole('button', { name: 'Start New Party' }).click();
    await hostPage.getByLabel('Party Name').fill(partyName);
    await hostPage.getByLabel('Your Name').fill('Host');
    await hostPage.getByLabel('Admin Password').fill(ADMIN_TOKEN!);
    await hostPage.getByRole('button', { name: /Create Party/i }).click();
    await expect(hostPage).toHaveURL(/\/host\//);
    partyCode = hostPage.url().split('/').pop()!;
    console.log(`🎉 Party Created: ${partyCode}`);
    await walkthroughTour(hostPage, 'host');
    await takeScreenshot(hostPage, 'host-dashboard', testInfo);
  });

  test('2. Guests Join (Random Intervals) & View Tour', async ({}, testInfo) => {
    test.setTimeout(90000);
    const joinPromises = guestPages.map(async (page, i) => {
        const delay = Math.floor(Math.random() * 3000) + 1000; 
        console.log(`⏳ Guest ${i} waiting ${delay}ms to join...`);
        await page.waitForTimeout(delay);
        await page.goto(`${BASE_URL}/en/join`);
        await page.getByTestId('join-party-code-input').fill(partyCode!);
        await page.getByTestId('avatar-select-mic').click();
        await page.getByTestId('join-name-input').fill(`Guest-${i}`);
        await page.getByTestId('join-submit-button').click();
        await expect(page).toHaveURL(/\/party\//);
        await walkthroughTour(page, 'guest');
        console.log(`✅ Guest ${i} joined.`);
    });
    await Promise.all(joinPromises);
    await takeScreenshot(guestPages[0], 'guests-joined', testInfo);
  });

  test('3. Guests Add Songs Until Limit', async () => {
    test.setTimeout(180000); 
    const addSongsTask = guestPages.map(async (page, index) => {
        await page.getByTestId('tab-add').click();
        const searchInput = page.getByTestId('song-search-input');
        await searchInput.fill('Karaoke Hits');
        await searchInput.press('Enter');
        const addButtons = page.locator('button[data-testid^="add-video-"]');
        await expect(addButtons.first()).toBeVisible({ timeout: 20000 });
        
        let addedCount = 0;
        for (let k = 0; k < 12; k++) {
            if (await page.getByText('Queue Full').isVisible()) {
                console.log(`✅ Guest ${index} hit limit at ${addedCount} songs.`);
                return;
            }
            const currentBtn = addButtons.first();
            if (!await currentBtn.isVisible()) break;
            const btnId = await currentBtn.getAttribute('data-testid');
            if (!btnId) break; 
            const specificBtn = page.locator(`button[data-testid="${btnId}"]`);
            await specificBtn.click();
            try {
                await Promise.race([
                    expect(specificBtn).toBeHidden({ timeout: 5000 }),
                    expect(page.getByText('Queue Full')).toBeVisible({ timeout: 5000 })
                ]);
            } catch(e) { }
            await page.waitForTimeout(2500); 
            addedCount++;
        }
    });
    await Promise.all(addSongsTask);
  });

  test('4. Host Starts Party', async () => {
    await hostPage.bringToFront();
    
    if (!hostPage.url().includes(`/host/${partyCode}`)) {
        await hostPage.goto(`${BASE_URL}/en/host/${partyCode}`);
    }
    await hostPage.waitForLoadState('domcontentloaded');

    await hostPage.evaluate((hash) => {
        window.localStorage.setItem(`host-${hash}-tour-seen`, 'true');
    }, partyCode);
    await hostPage.reload(); 
    await expect(hostPage.locator('[data-vaul-overlay]')).toBeHidden();

    const settingsTab = hostPage.getByTestId('tab-settings');
    await settingsTab.click({ force: true });
    await expect(settingsTab).toHaveAttribute('data-state', 'active', { timeout: 10000 });

    const startBtn = hostPage.getByRole('button', { name: 'Start Party' });
    const pauseBtn = hostPage.locator('button', { hasText: /Pause|Resume/i });

    await expect(async () => {
        const startVisible = await startBtn.isVisible();
        const pauseVisible = await pauseBtn.isVisible();
        if (!startVisible && !pauseVisible) await settingsTab.click({ force: true });
        expect(startVisible || pauseVisible).toBeTruthy();
    }).toPass({ timeout: 20000 });
    
    if (await startBtn.isVisible()) {
        await startBtn.click();
        await expect(pauseBtn).toBeVisible({ timeout: 20000 });
        console.log('▶️ Party Started.');
    } else {
        console.log('ℹ️ Party already started.');
    }
  });

  test('5. Guest Interactions & Restrictions', async ({}, testInfo) => {
    test.setTimeout(150000);

    const interactions = guestPages.map(async (page, index) => {
        await page.bringToFront(); 

        // A. Suggestions Carousel Interaction
        await page.getByTestId('tab-history').click();
        await page.waitForTimeout(2000); 
        
        const dots = page.locator('button[data-testid^="history-dot-"]');
        const dotCount = await dots.count();
        
        if (dotCount > 0) {
            console.log(`Guest ${index}: Clicking carousel dots...`);
            for (let d = 0; d < dotCount; d++) {
                const dot = dots.nth(d);
                if (await dot.isVisible()) {
                    await dot.click();
                    await page.waitForTimeout(2000);
                }
            }
        } else {
            const tiles = page.locator('[data-testid="suggestion-tile"]');
            if (await tiles.count() > 0) {
                await tiles.first().scrollIntoViewIfNeeded();
                await expect(tiles.first()).toBeVisible();
            }
        }

        // B. Applause (Singers Tab)
        await page.getByTestId('tab-singers').click();
        await page.waitForTimeout(2000);

        const applauseNavBtn = page.locator('a', { hasText: '👏' }).or(page.getByRole('button', { name: '👏' })); 
        
        if (await applauseNavBtn.isVisible()) {
            await applauseNavBtn.click();
            await expect(page).toHaveURL(/\/applause\//);
            await page.waitForTimeout(1000); 

            const handBtn = page.locator('button').filter({ hasText: '👏' }).first();
            await expect(handBtn).toBeVisible();
            await handBtn.click();
            await page.waitForTimeout(800);
            await handBtn.click();
            await page.waitForTimeout(2500); 

            const backBtn = page.getByRole('button', { name: /Back/i });
            await backBtn.click();
            await expect(page).toHaveURL(/\/party\//);
        }

        // C. Language (Reloads page)
        console.log(`Guest ${index} switching to PT...`);
        await page.locator('button[title="Change Language"]').click();
        await page.getByRole('button', { name: 'Português' }).click();
        await expect(page.getByTestId('tab-singers')).toContainText('Cantores', { timeout: 15000 }); 
        await page.waitForTimeout(1500); 
        
        console.log(`Guest ${index} switching to EN...`);
        await page.locator('button[title="Change Language"]').click();
        await page.getByRole('button', { name: 'English' }).click();
        await expect(page.getByTestId('tab-singers')).toContainText('Singers', { timeout: 15000 });
        await page.waitForTimeout(1500);

        // D. Delete / Reorder (Manage)
        await page.getByTestId('tab-add').click();
        const manageBtn = page.getByRole('button', { name: 'Manage' });
        
        if (await manageBtn.isVisible()) {
            await manageBtn.click();
            
            try {
                const deleteBtn = page.getByTestId('delete-song-btn').last();
                
                const result = await Promise.race([
                    page.getByText('modification disabled').waitFor({ state: 'visible', timeout: 5000 }).then(() => 'restricted'),
                    deleteBtn.waitFor({ state: 'visible', timeout: 5000 }).then(() => 'allowed')
                ]);
                
                if (result === 'restricted') {
                    console.log(`ℹ️ Guest ${index} is restricted.`);
                } else if (result === 'allowed') {
                    const upBtn = page.locator('button:has(svg.lucide-arrow-up)').last();
                    if (await upBtn.isVisible()) {
                        await upBtn.click();
                        await page.waitForTimeout(1000);
                    }

                    page.on('dialog', d => d.accept());
                    await deleteBtn.click();
                    await page.waitForTimeout(1000);
                    console.log(`✅ Guest ${index} deleted/reordered.`);
                }
            } catch(e) {
                console.log(`⚠️ Guest ${index}: Manage UI check failed/timed out.`);
            }
        }
    });

    await Promise.all(interactions);
    await takeScreenshot(guestPages[0], 'guest-interactions', testInfo);
  });

  test('6. Logout & Close', async () => {
    for (const page of guestPages) {
        await page.bringToFront();
        await page.getByTestId('tab-singers').click();
        await page.getByRole('button', { name: 'Leave' }).click();
        await expect(page).toHaveURL(/\/en$/); 
    }

    await hostPage.bringToFront();
    await expect(async () => {
        if (!await hostPage.getByRole('button', { name: 'Close Party' }).isVisible()) {
            await hostPage.getByTestId('tab-settings').click({ force: true });
        }
        await expect(hostPage.getByRole('button', { name: 'Close Party' })).toBeVisible({ timeout: 2000 });
    }).toPass({ timeout: 10000 });
    
    const closeBtn = hostPage.getByRole('button', { name: 'Close Party' });
    await closeBtn.scrollIntoViewIfNeeded();
    await closeBtn.click();
    
    await hostPage.getByRole('button', { name: 'Yes, End Party' }).click();
    await expect(hostPage).toHaveURL(/\/host$/);
  });

});
