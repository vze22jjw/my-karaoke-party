import { defineConfig, devices } from '@playwright/test';
import * as path from 'path';

const timestamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-');

const runDir = path.join('playwright-report', `run-${timestamp}`);

process.env.PLAYWRIGHT_REPORT_DIR = runDir;

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: process.env.CI ? 2 : undefined,

  reporter: [['html', { outputFolder: path.join(runDir, 'report'), open: 'never' }]],

  outputDir: path.join(runDir, 'trace'),

  timeout: 120000,
  expect: { timeout: 10000 },

  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    trace: 'on',
    video: 'retain-on-failure', 
    screenshot: 'only-on-failure', 
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
