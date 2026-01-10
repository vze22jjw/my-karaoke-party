import { test, expect, type Page, type BrowserContext } from '@playwright/test';

const USER_COUNT = 5; // Adjust based on Docker capacity
const ADMIN_TOKEN = process.env.ADMIN_TOKEN;
const BASE_URL = process.env.BASE_URL || 'http://mykaraoke-app:3000';

if (!ADMIN_TOKEN) throw new Error("❌ FATAL ERROR: ADMIN_TOKEN is missing.");

test(`Load Test: Host Lifecycle + ${USER_COUNT} Guests (Add 3, Start, Delete 1)`, async ({ browser }) => {
  test.setTimeout(120000 + (USER_COUNT * 25000)); 

  // --- 1. HOST CREATES PARTY ---
  console.log(`👤 Host: Creating party...`);
  const hostContext = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    extraHTTPHeaders: { 'Authorization': `Bearer ${ADMIN_TOKEN}` }
  });
  
  const hostPage = await hostContext.newPage();
  await hostPage.goto(`${BASE_URL}/en/start-party`);
  
  await hostPage.getByRole('button', { name: 'Start New Party' }).click();
  await hostPage.getByLabel('Party Name').fill(`Load Test ${Date.now()}`);
  await hostPage.getByLabel('Your Name').fill('Host Admin');
  await hostPage.getByLabel('Admin Password').fill(ADMIN_TOKEN!);
  await hostPage.getByRole('button', { name: /Create Party/i }).click();

  await expect(hostPage).toHaveURL(/\/host\//);
  const partyCode = hostPage.url().split('/').pop()!;
  console.log(`✅ Party Created: ${partyCode}`);

  await hostPage.evaluate((hash) => {
      window.localStorage.setItem(`host-${hash}-tour-seen`, 'true');
  }, partyCode);
  
  console.log('🔄 Reloading Host to apply Tour Bypass...');
  await hostPage.reload();
  await expect(hostPage.locator('[data-vaul-overlay]')).toBeHidden();

  // --- 2. GUESTS JOIN ---
  const guestPages: Page[] = [];
  console.log(`🚀 Spawning ${USER_COUNT} guests...`);

  for (let i = 0; i < USER_COUNT; i++) {
    const context = await browser.newContext({ isMobile: true, viewport: { width: 375, height: 667 } });
    await context.addInitScript(({ key, name }) => {
      window.localStorage.setItem(key, 'true');
      window.localStorage.setItem('name', name);
    }, { key: `guest-${partyCode}-tour-seen`, name: `Guest-${i}` });

    const page = await context.newPage();
    guestPages.push(page);
    await page.goto(`${BASE_URL}/en/party/${partyCode}`);
    await page.waitForTimeout(200); 
  }

  console.log(`✅ Guests active. Adding songs...`);

  // --- 3. ADD SONGS (Parallel) ---
  const addErrors: string[] = [];
  const addTasks = guestPages.map(async (page, index) => {
    try {
      await page.getByTestId('tab-add').click();
      const searchInput = page.getByTestId('song-search-input');

      await searchInput.fill(`Karaoke Hits`);
      await searchInput.press('Enter');
      
      const addButtons = page.locator('button[data-testid^="add-video-"]');
      await expect(addButtons.first()).toBeVisible({ timeout: 20000 });

      for (let k = 1; k <= 3; k++) {
          const currentBtn = addButtons.first();
          await expect(currentBtn).toBeEnabled({ timeout: 5000 });
          const btnId = await currentBtn.getAttribute('data-testid');
          if (!btnId) throw new Error(`Guest ${index}: Button missing data-testid`);
          
          const specificBtn = page.locator(`button[data-testid="${btnId}"]`);
          await specificBtn.click();
          
          try {
            await Promise.race([
                expect(specificBtn).toBeHidden({ timeout: 5000 }),
                expect(specificBtn).toBeDisabled({ timeout: 5000 })
            ]);
          } catch (e) {
             throw new Error(`Guest ${index}: Button failed to hide/disable.`);
          }
          await page.waitForTimeout(3000); 
      }
    } catch (err: any) {
      console.error(`❌ Guest ${index} failed add:`, err.message);
      addErrors.push(`Guest ${index}: ${err.message}`);
    }
  });

  await Promise.all(addTasks);
  expect(addErrors, `Guests failed to add songs`).toHaveLength(0);
  console.log('🎵 Songs added successfully.');

  // --- 4. HOST STARTS PARTY ---
  console.log('▶️ Host Starting Party...');
  await hostPage.bringToFront();
  
  await hostPage.getByTestId('tab-settings').click();
  const startBtn = hostPage.getByRole('button', { name: 'Start Party' });
  await expect(startBtn).toBeVisible();
  await startBtn.click();
  
  await expect(hostPage.locator('button', { hasText: /Pause|Resume/i })).toBeVisible({ timeout: 15000 });
  console.log('✅ Party Started.');

  // --- 5. DELETE TEST (Dynamic) ---
  console.log('🗑️ Verifying Deletion where allowed...');
  const deleteErrors: string[] = [];

  const deleteTasks = guestPages.map(async (page, index) => {
    try {
      await page.waitForTimeout(2000); 

      const isSinging = await page.getByText('(Playing Now)').isVisible();
      const expectedListCount = isSinging ? 2 : 3;

      console.log(`Guest ${index}: Singing=${isSinging}. Expecting queue list: ${expectedListCount}`);
      
      await expect(page.locator('ul.space-y-3 li')).toHaveCount(expectedListCount, { timeout: 15000 });

      const manageBtn = page.getByRole('button', { name: 'Manage' });
      if (await manageBtn.isVisible()) {
          await manageBtn.click();
          
          const deleteBtn = page.getByTestId('delete-song-btn').first();
          if (await deleteBtn.isVisible()) {
              console.log(`Guest ${index}: Deleting...`);
              page.on('dialog', dialog => dialog.accept());
              await deleteBtn.click();
              
              await expect(page.locator('ul.space-y-3 li')).toHaveCount(expectedListCount - 1, { timeout: 10000 });
              console.log(`✅ Guest ${index}: Deleted.`);
          } else {
              console.log(`ℹ️ Guest ${index}: Restricted (No delete buttons).`);
          }
      } else {
          console.log(`ℹ️ Guest ${index}: Manage button hidden.`);
      }

    } catch (err: any) {
      console.error(`❌ Guest ${index} failed delete check:`, err.message);
      deleteErrors.push(`Guest ${index}: ${err.message}`);
    }
  });

  await Promise.all(deleteTasks);
  expect(deleteErrors, `Guests failed delete phase`).toHaveLength(0);

  // --- 6. CLOSE ---
  console.log('🛑 Closing...');
  await hostPage.bringToFront();
  
  if (!await hostPage.getByRole('button', { name: 'Close Party' }).isVisible()) {
      await hostPage.getByTestId('tab-settings').click();
  }
  
  const closeBtn = hostPage.getByRole('button', { name: 'Close Party' });
  await closeBtn.scrollIntoViewIfNeeded();
  await closeBtn.click();
  await hostPage.getByRole('button', { name: 'Yes, End Party' }).click();
  await expect(hostPage).toHaveURL(/\/host$/, { timeout: 30000 });
  
  console.log('🏁 Load test complete.');
});
