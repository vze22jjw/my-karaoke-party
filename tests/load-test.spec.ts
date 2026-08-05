import { test, expect, type Page, type BrowserContext, request } from '@playwright/test';
import { createParty } from './helpers/party-utils';

const USER_COUNT = 5; // Adjust based on Docker capacity
const ADMIN_TOKEN = process.env.ADMIN_TOKEN;
const BASE_URL = process.env.BASE_URL || 'http://mykaraoke-app:3000';

if (!ADMIN_TOKEN) throw new Error("❌ FATAL ERROR: ADMIN_TOKEN is missing.");

let hostContext: BrowserContext | undefined;
let hostPage: Page | undefined;
let partyCode: string | undefined;
const guestContexts: BrowserContext[] = [];

test.afterAll(async () => {
  if (partyCode) {
    const apiContext = await request.newContext();
    await apiContext
      .delete(`${BASE_URL}/api/admin/party/delete`, {
        headers: { Authorization: `Bearer ${ADMIN_TOKEN}` },
        params: { hash: partyCode },
      })
      .catch(() => {});
    await apiContext.dispose();
  }
  if (hostContext) await hostContext.close();
  for (const ctx of guestContexts) await ctx.close();
});

test(`Load Test: Backend Stress (tRPC Injection)`, async ({ browser }) => {
  test.setTimeout(120000 + (USER_COUNT * 10000)); 

  // --- 1. HOST CREATES PARTY ---
  console.log(`👤 Host: Creating party...`);
  hostContext = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    extraHTTPHeaders: { 'Authorization': `Bearer ${ADMIN_TOKEN}` }
  });
  hostPage = await hostContext.newPage();
  partyCode = await createParty(hostPage, `Load Test ${Date.now()}`);
  
  if (await hostPage.locator('[data-vaul-overlay]').isVisible({ timeout: 3000 })) {
      await hostPage.keyboard.press('Escape');
  }

  // --- 2. GUESTS JOIN (Direct Injection) ---
  console.log(`🚀 Spawning ${USER_COUNT} guests...`);
  const guestPages: Page[] = [];

  for (let i = 0; i < USER_COUNT; i++) {
    const guestContext = await browser.newContext({ isMobile: true });
    await guestContext.addInitScript(({ key, name }) => {
      window.localStorage.setItem(key, 'true');
      window.localStorage.setItem('name', name);
    }, { key: `guest-${partyCode}-tour-seen`, name: `Guest-${i}` });

    const page = await guestContext.newPage();
    guestContexts.push(guestContext);
    guestPages.push(page);
    await page.goto(`${BASE_URL}/en/party/${partyCode}`);
  }
  
  // --- 3. STRESS TEST (Direct tRPC Injection) ---
  console.log(`🔥 STARTING API STRESS TEST (Direct Backend Injection)...`);
  
  const apiUrl = `${BASE_URL}/api/trpc/playlist.addVideo`;
  // Increase load: Keep adding until we hit a wall
  const SONGS_PER_USER = 20; 
  let totalRequestsSent = 0;

  const stressTasks = guestPages.map(async (page, index) => {
      for (let k = 0; k < SONGS_PER_USER; k++) {
          try {
              const payload = {
                  json: {
                      partyHash: partyCode,
                      videoId: `STRESS-${index}-${Date.now()}-${k}`,
                      title: `Stress Song ${index}-${k}`,
                      coverUrl: "https://i.ytimg.com/vi/placeholder/hqdefault.jpg",
                      singerName: `Guest-${index}`,
                      artist: "Load Tester",
                      song: `Song ${k}`,
                      duration: "PT3M30S"
                  }
              };

              const response = await page.request.post(apiUrl, {
                  data: payload,
                  headers: { 
                      'Content-Type': 'application/json',
                      'x-load-test': 'true' 
                  }
              });

              totalRequestsSent++;

              if (!response.ok()) {
                  // SOFT FAILURE: Log it, but don't fail the test. 
                  // Just stop this specific user from adding more.
                  console.log(`⚠️ Guest ${index} stopped adding at song ${k}. Status: ${response.status()}`);
                  break; 
              }
          } catch (e: any) {
              // Network/Timeout errors - also just stop this user
              console.log(`⚠️ Guest ${index} API Network Fail: ${e.message}`);
              break;
          }
          // Tiny throttle to prevent local networking exhaustion
          await page.waitForTimeout(50); 
      }
  });

  await Promise.all(stressTasks);
  
  console.log(`✅ API Stress Phase Complete. Total requests sent: ${totalRequestsSent}`);
  
  // --- 4. VERIFY QUEUE (Backend Survived?) ---
  console.log('👀 Verifying backend has data...');
  await hostPage.bringToFront();
  
  await hostPage.reload();
  await hostPage.getByTestId('tab-playlist').click();
  
  // Verify at least ONE item exists to prove the DB isn't dead
  try {
      await expect(hostPage.locator('[data-testid^="playlist-item-"]').first()).toBeVisible({ timeout: 20000 });
      const count = await hostPage.locator('[data-testid^="playlist-item-"]').count();
      console.log(`📉 Final Host Queue Count: ${count}`);
      expect(count).toBeGreaterThan(0);
  } catch (e) {
      console.error("❌ Backend seems unresponsive or empty after stress test.");
      throw e;
  }

  // Cleanup is handled by test.afterAll (admin API delete + context close)
});
