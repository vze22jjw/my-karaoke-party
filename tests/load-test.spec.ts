import { test, expect, type Page } from '@playwright/test';

const USER_COUNT = 30; // Adjust this number based on your Docker container's capacity
const BASE_URL = process.env.BASE_URL || 'http://mykaraoke-app:3000';
const PARTY_CODE = '0000'; // Replace with your active party code

test(`Load Test: ${USER_COUNT} Concurrent Guests (Bypassing Tour)`, async ({ browser }) => {
  // Increase timeout to handle high concurrency in Docker
  test.setTimeout(USER_COUNT * 15000); 
  const guestPages: Page[] = [];

  console.log(`🚀 Preparing ${USER_COUNT} guests...`);

  for (let i = 0; i < USER_COUNT; i++) {
    const context = await browser.newContext();
    
    // PRE-POPULATE LOCAL STORAGE
    // This script runs before any other script on the page
    await context.addInitScript(({ key, name }) => {
      window.localStorage.setItem(key, 'true');
      window.localStorage.setItem('name', name);
    }, { 
      key: `guest-${PARTY_CODE}-tour-seen`, 
      name: `LoadGuest-${i}` 
    });

    const page = await context.newPage();
    guestPages.push(page);
    
    // Navigate directly to the party page. 
    // Since 'name' and 'tour-seen' are in localStorage, it skips join and tour screens.
    await page.goto(`${BASE_URL}/en/party/${PARTY_CODE}`);
    
    // Small stagger to reduce CPU spikes in the Docker container
    await page.waitForTimeout(200); 
  }

  console.log(`✅ All guests active on Party Page. Starting concurrent searches...`);

  const tasks = guestPages.map(async (page, index) => {
    try {
      // Navigate to add tab
      await page.getByTestId('tab-add').click();
      
      const searchInput = page.getByTestId('song-search-input');
      await searchInput.fill('Test');
      await searchInput.press('Enter');
      
      // Wait for search results and click the first add button
      const addButton = page.locator('button[data-testid^="add-video-"]').first();
      await addButton.waitFor({ state: 'visible', timeout: 15000 });
      await addButton.click();
      
      console.log(`🎵 Guest ${index} successfully added a song.`);
    } catch (err) {
      console.error(`❌ Guest ${index} failed:`, err.message);
    }
  });

  await Promise.all(tasks);
  console.log('🏁 Load test complete.');
});