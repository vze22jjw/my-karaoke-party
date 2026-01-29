import { expect, type Page, request } from '@playwright/test';

const BASE_URL = process.env.BASE_URL;
const ADMIN_TOKEN = process.env.ADMIN_TOKEN;

if (!BASE_URL || !ADMIN_TOKEN) throw new Error("❌ Configuration missing in Helper.");

/**
 * Creates a party using the exact API Polling + Cookie Injection strategy 
 * from queue-fairness.spec.ts
 */
export async function createPartyRobust(page: Page, partyName: string): Promise<string> {
    console.log(`🚀 Helper: Creating Party "${partyName}"...`);
    
    // 1. Navigate and Click Start
    await page.goto(`${BASE_URL}/en/start-party`);
    await expect(page.getByRole('button', { name: 'Start New Party' })).toBeVisible({ timeout: 15000 });
    await page.getByRole('button', { name: 'Start New Party' }).click();

    // 2. Fill Form
    await page.getByLabel('Party Name').fill(partyName);
    await page.getByLabel('Your Name').fill('Host');
    await page.getByLabel('Admin Password').fill(ADMIN_TOKEN!);
    
    // 3. Click Create
    const createBtn = page.getByRole('button', { name: /Create Party/i });
    console.log('⏳ Helper: Clicking Create Party...');
    await createBtn.click();

    // 4. API Polling (Source of Truth)
    console.log(`📡 Helper: Polling API for "${partyName}"...`);
    const apiContext = await request.newContext();
    let partyCode = '';
    const expectedDbName = partyName.toUpperCase();
    
    let foundParty = false;
    let attempts = 0;
    while (!foundParty && attempts < 30) { 
        await page.waitForTimeout(2000);
        attempts++;
        try {
            const listRes = await apiContext.get(`${BASE_URL}/api/parties/list`);
            if (listRes.ok()) {
                const parties = await listRes.json();
                const myParty = parties.find((p: any) => p.name === expectedDbName);
                if (myParty) {
                    partyCode = myParty.hash;
                    console.log(`✅ Party Found in API! Code: ${partyCode}`);
                    foundParty = true;
                }
            }
        } catch (e) {
            console.log(`⚠️ Polling error (attempt ${attempts}):`, e);
        }
    }

    if (!partyCode) throw new Error("❌ Helper: Party creation timed out via API.");

    // 5. Inject Auth
    const url = new URL(BASE_URL!);
    await page.context().addCookies([{
        name: 'admin_token', value: ADMIN_TOKEN!, domain: url.hostname, path: '/'
    }, {
        name: 'admin_token_verified', value: 'true', domain: url.hostname, path: '/'
    }]);

    // Note: We do NOT inject the Tour Skip for Host here, because core-flow wants to test it.
    
    // 6. Force Navigation
    console.log(`🚀 Helper: Force navigating to host dashboard: ${partyCode}`);
    await page.goto(`${BASE_URL}/en/host/${partyCode}`);
    await expect(page.getByTestId('tab-playlist')).toBeVisible({ timeout: 45000 });

    return partyCode;
}

/**
 * Joins a guest. 
 * EXACT logic from queue-fairness (Simple Fill -> Click -> Expect).
 */
export async function joinPartyRobust(page: Page, partyCode: string, name: string, index: number) {
    console.log(`👤 Helper: Guest ${index} joining...`);
    await page.goto(`${BASE_URL}/en/join`);
    
    await page.getByTestId('join-party-code-input').fill(partyCode);
    
    // We keep your requested "Random Avatar" tweak, but otherwise logic is identical
    await page.locator('button[data-testid^="avatar-select-"]').first().click();
    
    await page.getByTestId('join-name-input').fill(name);
    
    // Direct click, no waits, no listeners (Matches queue-fairness)
    await page.getByTestId('join-submit-button').click();
    
    // Simple URL expectation
    await expect(page).toHaveURL(/\/party\//, { timeout: 30000 });

    // Handle Tour (Queue-fairness skips via storage, but here we click through if it appears)
    const overlay = page.locator('[data-vaul-overlay]');
    try {
        if (await overlay.isVisible({ timeout: 5000 })) {
            for (let i = 0; i < 15; i++) {
                if (!await overlay.isVisible()) break;
                const btn = page.locator('button').filter({ hasText: /Finish|Got it|Concluir|Next|Avance/i }).first();
                if (await btn.isVisible()) await btn.click();
                else await page.keyboard.press('Escape');
            }
        }
    } catch (e) {}
}

/**
 * Adds a song.
 * EXACT logic from queue-fairness (Smart Retry Loop).
 */
export async function addSongRobust(page: Page, query: string) {
    console.log(`🎵 Helper: Adding song "${query}"...`);

    // Ensure tab is active
    await page.getByTestId('tab-add').click({ force: true });
    await page.waitForTimeout(1000); 

    const input = page.getByTestId('song-search-input');
    await input.fill(query);
    await input.press('Enter');

    const addButtons = page.locator('button[data-testid^="add-video-"]');
    await expect(addButtons.first()).toBeVisible({ timeout: 30000 });
  
    const currentBtn = addButtons.first();
    const btnId = await currentBtn.getAttribute('data-testid');
    const specificBtn = page.locator(`button[data-testid="${btnId}"]`);

    // --- SMART RETRY LOOP (From queue-fairness.spec.ts) ---
    let added = false;
    const maxRetries = 3;
  
    for (let i = 0; i < maxRetries; i++) {
        // 1. Check if button is already disabled (request in flight)
        if (await specificBtn.isDisabled()) {
            added = true;
            break;
        }
      
        // 2. Click if enabled
        if (!added) {
            await specificBtn.click({ force: true });
            try {
                // Wait for it to become disabled or disappear
                await expect(specificBtn).toBeDisabled({ timeout: 5000 });
                added = true;
                break; 
            } catch (e) {
                console.log(`⚠️ Helper: Add Song timed out attempt ${i+1}. Retrying...`);
            }
        }
      
        if (!added && i < maxRetries - 1) {
            await page.waitForTimeout(2000); 
        }
    }
    
    await page.waitForTimeout(500);
}
