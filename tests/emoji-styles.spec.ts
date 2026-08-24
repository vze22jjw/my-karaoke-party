import { test, expect, request } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { createParty, joinParty } from './helpers/party-utils';

const emojiMap = JSON.parse(readFileSync('./src/config/emoji-map.json', 'utf-8'));

const BASE_URL = process.env.BASE_URL;
const ADMIN_TOKEN = process.env.ADMIN_TOKEN;

if (!BASE_URL) throw new Error('BASE_URL is required for emoji style tests.');

type EmojiMap = {
  default_style: string;
  variables: Record<string, string>;
  styles: Record<string, string>;
};

const map = emojiMap as EmojiMap;

const expectedStyle: Record<string, string> = {};
for (const [key, emoji] of Object.entries(map.variables)) {
  expectedStyle[emoji] = map.styles[key] ?? map.default_style;
}

async function assertEmojiStyles(page: import('@playwright/test').Page) {
  const images = page.locator('img.emoji');
  await expect(images.first()).toBeAttached({ timeout: 10_000 });

  const count = await images.count();
  expect(count).toBeGreaterThan(0);

  for (let i = 0; i < count; i++) {
    const img = images.nth(i);
    const alt = await img.getAttribute('alt');
    const src = await img.getAttribute('src');

    expect(alt).toBeTruthy();
    expect(src).toBeTruthy();

    const style = expectedStyle[alt!];
    if (!style) {
      console.warn(`No expected style for emoji "${alt}"`);
      continue;
    }

    expect(src).toMatch(new RegExp(`[?&]style=${style}([&#]|$)`));
  }
}

test.describe('Emoji style enforcement', () => {
  test.describe.configure({ mode: 'default' });

  let partyCode: string | undefined;
  let guestContext: import('@playwright/test').BrowserContext | undefined;

  test.afterAll(async () => {
    if (partyCode) {
      const apiContext = await request.newContext();
      try {
        const res = await apiContext.delete(`${BASE_URL}/api/admin/party/delete`, { headers: { Authorization: `Bearer ${ADMIN_TOKEN}` }, params: { hash: partyCode } });
        console.log(`[Cleanup] DELETE party ${partyCode}: ${res.status()}`);
        if (!res.ok()) console.error(`[Cleanup] Failed to delete party ${partyCode}: ${await res.text()}`);
      } catch (e) {
        console.error(`[Cleanup] Error deleting party ${partyCode}:`, e);
      }
      await apiContext.dispose();
    }
    if (guestContext) await guestContext.close();
  });

  test('API serves a PNG for configured styles', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/emoji?emoji=${encodeURIComponent('🍺')}&style=facebook`);
    expect(res.status()).toBe(200);
    expect(res.headers()['content-type']).toContain('image/png');

    const badRes = await request.get(`${BASE_URL}/api/emoji?emoji=${encodeURIComponent('🍺')}&style=whatsapp`);
    expect(badRes.status()).toBe(400);
  });

  test('Host avatars on start-party page use styles from emoji-map', async ({ page }) => {
    await page.goto(`${BASE_URL}/en/start-party`);
    await expect(page.getByRole('button', { name: 'Start New Party' })).toBeVisible({ timeout: 15_000 });
    await page.getByRole('button', { name: 'Start New Party' }).click();
    await expect(page.getByLabel('Party Name')).toBeVisible();

    await assertEmojiStyles(page);
  });

  test('Guest avatars on join page use styles from emoji-map', async ({ page }) => {
    await page.goto(`${BASE_URL}/en/join`);
    await expect(page.locator('button[data-testid^="avatar-select-"]').first()).toBeVisible({ timeout: 15_000 });

    await assertEmojiStyles(page);
  });

  test('Party UI emojis use styles from emoji-map', async ({ browser }) => {
    const hostContext = await browser.newContext();
    const hostPage = await hostContext.newPage();
    partyCode = await createParty(hostPage, 'Emoji Style Party');
    await hostContext.close();

    guestContext = await browser.newContext();
    const guestPage = await guestContext.newPage();
    await joinParty(guestPage, partyCode, 'GuestOne', 1);

    await guestPage.getByRole('tab', { name: /Singers/i }).click();
    await expect(guestPage.locator(`img.emoji[alt="${map.variables.applause_emoji}"]`).first()).toBeVisible({ timeout: 10_000 });

    await assertEmojiStyles(guestPage);
  });
});
