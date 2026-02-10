import { expect, type Page, request } from '@playwright/test';

const BASE_URL = process.env.BASE_URL;
const ADMIN_TOKEN = process.env.ADMIN_TOKEN;

if (!BASE_URL || !ADMIN_TOKEN) throw new Error("❌ Configuration missing in Helper.");

export async function createParty(page: Page, partyName: string): Promise<string> {
    console.log(`🚀 Helper: Creating Party "${partyName}"...`);
    
    await page.goto(`${BASE_URL}/en/start-party`);
    await page.waitForLoadState('domcontentloaded');
    
    // 1. Open Modal
    await expect(async () => {
        const startBtn = page.getByRole('button', { name: 'Start New Party' });
        if (!(await page.getByLabel('Party Name').isVisible())) {
            await startBtn.click({ timeout: 1000, force: true });
        }
        await expect(page.getByLabel('Party Name')).toBeVisible({ timeout: 2000 });
    }).toPass({
        timeout: 15_000,
        intervals: [1_000, 2_000, 4_000]
    });

    // 2. Fill Form
    await expect(async () => {
        await page.getByLabel('Party Name').fill(partyName);
        await page.getByLabel('Your Name').fill('Host');
        await page.getByLabel('Admin Password').fill(ADMIN_TOKEN!);
    }).toPass({ timeout: 15_000 });
    
    await page.getByRole('button', { name: /Create Party/i }).click();

    // 3. API Polling
    console.log(`📡 Helper: Polling API for "${partyName}"...`);
    const apiContext = await request.newContext();
    let partyCode = '';
    const expectedDbName = partyName.toUpperCase();
    
    await expect(async () => {
        const listRes = await apiContext.get(`${BASE_URL}/api/parties/list`);
        expect(listRes.ok()).toBeTruthy();
        const parties = await listRes.json();
        const myParty = parties.find((p: any) => p.name === expectedDbName);
        expect(myParty).toBeTruthy();
        partyCode = myParty.hash;
    }).toPass({
        timeout: 60_000,
        intervals: [2_000]
    });

    // 4. Inject Cookies & Navigate
    const url = new URL(BASE_URL!);
    await page.context().addCookies([{
        name: 'admin_token', value: ADMIN_TOKEN!, domain: url.hostname, path: '/'
    }, {
        name: 'admin_token_verified', value: 'true', domain: url.hostname, path: '/'
    }]);

    console.log(`🚀 Helper: Force navigating to host dashboard: ${partyCode}`);
    await page.goto(`${BASE_URL}/en/host/${partyCode}`);
    await expect(page.getByTestId('tab-playlist')).toBeVisible({ timeout: 60_000 });

    return partyCode;
}

export async function joinParty(page: Page, partyCode: string, name: string, index: number) {
    console.log(`👤 Helper: Guest ${index} joining...`);
    
    await page.goto(`${BASE_URL}/en/join`);
    
    // A. Join Logic
    await expect(async () => {
        if (page.url().includes('/party/')) return;
        if (!page.url().includes('/join')) await page.goto(`${BASE_URL}/en/join`);

        await page.getByTestId('join-party-code-input').fill(partyCode);
        await page.locator('button[data-testid^="avatar-select-"]').first().click();
        await page.getByTestId('join-name-input').fill(name);
        
        const joinBtn = page.getByTestId('join-submit-button');
        await expect(joinBtn).toBeEnabled({ timeout: 5000 });
        await joinBtn.click({ force: true });

        try {
            await expect(page).toHaveURL(/\/party\//, { timeout: 10_000 });
        } catch (e) {
            console.log(`⚠️ Guest ${index} join hung. Reloading page...`);
            await page.reload();
            await page.waitForLoadState('domcontentloaded');
            throw e;
        }
    }).toPass({ timeout: 90_000, intervals: [1000] });

    // B. Tour Handling
    const overlay = page.locator('[data-vaul-overlay]');
    
    await expect(async () => {
        if (!(await overlay.isVisible())) return;

        console.log(`ℹ️ Helper: Dismissing tour overlay for Guest ${index}...`);
        
        const btn = page.locator('button').filter({ hasText: /Finish|Got it|Concluir|Next|Avance/i }).first();
        
        if (await btn.isVisible()) {
            await btn.click({ force: true });
        } else {
            await page.keyboard.press('Escape');
        }
        
        await page.waitForTimeout(300);
        await expect(overlay).toBeHidden({ timeout: 1000 });
    }).toPass({
        timeout: 30_000, 
        intervals: [200]
    });
}

export async function addSong(page: Page, query: string) {
    console.log(`🎵 Helper: Adding song "${query}"...`);
    const tabAdd = page.getByTestId('tab-add');
    const input = page.getByTestId('song-search-input');

    await expect(async () => {
        if (!(await input.isVisible())) { await tabAdd.click({ force: true }); }
        await expect(input).toBeVisible({ timeout: 2000 });
    }).toPass({ timeout: 15_000 });
    
    await input.fill(query);
    await input.press('Enter');

    const addButtons = page.locator('button[data-testid^="add-video-"]');
    await expect(addButtons.first()).toBeVisible({ timeout: 30000 });

    const addBtn = addButtons.first();
    await expect(async () => {
        if (await addBtn.isEnabled()) { await addBtn.click({ force: true, timeout: 1000 }); }
        await expect(addBtn).toBeDisabled({ timeout: 3000 });
    }).toPass({ timeout: 20_000, intervals: [1_000, 2_000] });
    
    await input.fill(''); 
}