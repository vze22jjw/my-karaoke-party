import { defineConfig, devices } from '@playwright/test';
import * as path from 'path';

const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const finalReportDir = path.join('playwright-report', timestamp);

// Use a distinct temp folder for raw artifacts
const tempArtifactsDir = '/tmp/test-artifacts';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0, 
  workers: process.env.CI ? 2 : undefined,
  
  reporter: [['html', { outputFolder: finalReportDir, open: 'never' }]],
  
  outputDir: tempArtifactsDir,
  
  timeout: 600000, // 5 minutes
  expect: {
    timeout: 10000,
  },

  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    
    // CHANGE THIS: Record traces for every test run
    trace: 'on',
    
    // Optional: Record video if you prefer MP4s (Trace is usually better)
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
