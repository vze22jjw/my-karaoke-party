import { defineConfig, devices } from '@playwright/test';
import * as path from 'path';

const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const finalReportDir = path.join('playwright-report', timestamp);
const tempArtifactsDir = '/tmp/test-artifacts';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0, 
  workers: process.env.CI ? 2 : undefined,
  
  reporter: [['html', { outputFolder: finalReportDir, open: 'never' }]],
  
  outputDir: tempArtifactsDir,
  
  timeout: 600000,
  expect: {
    timeout: 10000,
  },

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
