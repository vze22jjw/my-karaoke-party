import { defineConfig, devices } from '@playwright/test';
import * as path from 'path';
import { getReportDirName } from './src/lib/report-dir';

function getTestNameFromArgv(): string | null {
  const specArg = process.argv.slice(2).find((arg) => arg.includes('.spec.ts'));
  if (!specArg) return null;
  return path.basename(specArg).replace(/\.spec\.ts$/, '');
}

const reportName = process.env.PLAYWRIGHT_REPORT_DIR || getReportDirName(getTestNameFromArgv() ?? 'run');
const runDir = path.isAbsolute(reportName) ? reportName : path.join('playwright-report', reportName);

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
