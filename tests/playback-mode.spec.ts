// @ts-nocheck
import { test, expect, type Page, type BrowserContext, request } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { createParty, joinParty, addSong } from './helpers/party-utils';
import { getReportDirName } from '~/lib/report-dir';

const ADMIN_TOKEN = process.env.ADMIN_TOKEN;
const BASE_URL = process.env.BASE_URL;

const REPORT_DIR = process.env.PLAYWRIGHT_REPORT_DIR || path.join('playwright-report', getReportDirName('playback-mode'));
const SCREENSHOT_DIR = path.join(REPORT_DIR, 'screenshots');

if (!BASE_URL || !ADMIN_TOKEN) throw new Error("❌ FATAL: Configuration missing.");
if (!fs.existsSync(SCREENSHOT_DIR)) fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

test.describe.configure({ mode: 'serial' });

let stepCounter = 1;

async function takeScreenshot(page: Page, name: string, testInfo: any) {
    const fileName = `${String(stepCounter).padStart(2, '0')}-${name}.png`;
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, fileName), fullPage: true });
    await testInfo.attach(name, { path: path.join(SCREENSHOT_DIR, fileName), contentType: 'image/png' });
    stepCounter++;
    console.log(`📸 Screenshot: ${fileName}`);
}

async function togglePlaybackMode(hostPage: Page, disable: boolean) {
    await hostPage.getByTestId('tab-settings').click({ force: true });
    const toggle = hostPage.getByRole('switch', { name: /Playback:/ });
    await expect(toggle).toBeVisible({ timeout: 10000 });

    const checked = await toggle.getAttribute('aria-checked');
    const currentlyInApp = checked === 'true';

    if ((disable && currentlyInApp) || (!disable && !currentlyInApp)) {
        await toggle.click({ force: true });
        // Wait for aria-checked to flip
        await expect(async () => {
            const newChecked = await toggle.getAttribute('aria-checked');
            expect(newChecked).toBe(disable ? 'false' : 'true');
        }).toPass({ timeout: 10000, intervals: [500] });
    }
}

async function openPlayerPage(browser, partyCode: string): Promise<[BrowserContext, Page]> {
    const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
    const page = await ctx.newPage();
    await page.goto(`${BASE_URL}/en/player/${partyCode}`);
    await expect(page.getByAltText('My Karaoke Party')).toBeVisible({ timeout: 30000 });
    return [ctx, page];
}

test.describe('Playback Modes', () => {
  let hostContext: BrowserContext;
  let hostPage: Page;
  let playerContext: BrowserContext;
  let playerPage: Page;
  let guestPage: Page;
  let guestContext: BrowserContext;
  let partyCode: string;

  test.setTimeout(300000);

  test.beforeAll(async ({ browser }) => {
    test.setTimeout(180000);

    hostContext = await browser.newContext({ viewport: { width: 1280, height: 800 }, extraHTTPHeaders: { 'Authorization': `Bearer ${ADMIN_TOKEN}` } });
    hostPage = await hostContext.newPage();
    partyCode = await createParty(hostPage, `PlaybackMode ${Date.now()}`);

    guestContext = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true });
    guestPage = await guestContext.newPage();
    await joinParty(guestPage, partyCode, 'GuestPM', 0);

    [playerContext, playerPage] = await openPlayerPage(browser, partyCode);
    await playerPage.bringToFront();
    playerPage.on('console', msg => console.log(`[Player Console] ${msg.text()}`));
    playerPage.on('pageerror', err => console.error(`[Player Error] ${err.message}`));
  });

  test.afterAll(async () => {
    if (partyCode) {
        const apiContext = await request.newContext();
        await apiContext.delete(`${BASE_URL}/api/admin/party/delete`, { headers: { 'Authorization': `Bearer ${ADMIN_TOKEN}` }, params: { hash: partyCode } }).catch(()=>{});
    }
    await hostContext.close();
    await guestContext.close();
    if (playerContext) await playerContext.close();
  });

  test('In-App mode: a song from search is added to the queue', async ({}, testInfo) => {
    // Default mode is In-App (disablePlayback = false)
    await hostPage.getByTestId('tab-playlist').click({ force: true });
    await addSong(guestPage, 'Bohemian Rhapsody karaoke');

    // The song should appear in the host queue quickly (no player probe).
    await expect(async () => {
        const count = await hostPage.locator('[data-testid^="playlist-item-"]').count();
        expect(count).toBe(1);
    }).toPass({ timeout: 15000, intervals: [1000] });

    await takeScreenshot(hostPage, 'in-app-song-added', testInfo);

    const statusBadge = hostPage.locator('[data-testid^="playlist-item-"]').first().getByText(/Completed|Skipped|Error/);
    await expect(statusBadge).toHaveCount(0); // unplayed items should not show status badges
  });

  test('YouTube-open mode: song is added immediately and player shows Open on YouTube', async ({}, testInfo) => {
    await togglePlaybackMode(hostPage, true);

    await addSong(guestPage, 'Let It Go karaoke');

    // Switch to the playlist tab so we can count items.
    await hostPage.getByTestId('tab-playlist').click({ force: true });

    // In YouTube-open mode there is no embed filter, so the song should appear quickly.
    await expect(async () => {
        const count = await hostPage.locator('[data-testid^="playlist-item-"]').count();
        expect(count).toBe(2);
    }).toPass({ timeout: 15000, intervals: [1000] });

    await takeScreenshot(hostPage, 'youtube-open-song-added', testInfo);

    // Start the party and switch to the player to see the Open on YouTube button.
    await hostPage.getByTestId('tab-settings').click({ force: true });
    await expect(hostPage.getByRole('button', { name: 'Start Party' })).toBeVisible({ timeout: 5000 });
    await hostPage.getByRole('button', { name: 'Start Party' }).click({ force: true });
    await playerPage.bringToFront();
    await expect(playerPage.getByRole('button', { name: /Open on YouTube/i })).toBeVisible({ timeout: 20000 });
    await takeScreenshot(playerPage, 'youtube-open-player-view', testInfo);
  });
});
