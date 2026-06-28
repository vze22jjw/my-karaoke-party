import { defineConfig, devices } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';

// Helper function to cleanup old reports
function cleanupOldReports(reportsRoot: string, maxAgeDays: number) {
  if (!fs.existsSync(reportsRoot)) return;

  const now = Date.now();
  const maxAgeMs = maxAgeDays * 24 * 60 * 60 * 1000;

  try {
    const entries = fs.readdirSync(reportsRoot);
    for (const entry of entries) {
      const fullPath = path.join(reportsRoot, entry);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory() && entry.startsWith('run-')) {
        const ageMs = now - stat.mtimeMs;
        if (ageMs > maxAgeMs) {
          fs.rmSync(fullPath, { recursive: true, force: true });
          console.log(`🧹 Cleaned up old report directory: ${entry}`);
        }
      }
    }
  } catch (err) {
    console.error('Failed to cleanup old reports:', err);
  }
}

// Helper function to generate an HTML index dashboard of all available reports
function generateReportIndex(reportsRoot: string, maxAgeDays: number) {
  try {
    if (!fs.existsSync(reportsRoot)) return;
    const entries = fs.readdirSync(reportsRoot);
    const runs = entries
      .filter(entry => entry.startsWith('run-') && fs.statSync(path.join(reportsRoot, entry)).isDirectory())
      .sort()
      .reverse(); // Latest runs first

    let listHtml = '';
    for (const run of runs) {
      const reportPath = `${run}/report/index.html`;
      const parts = run.replace('run-', '').split('-');
      let dateStr = run;
      if (parts.length >= 5) {
        const year = parts[0];
        const month = parts[1];
        const day = parts[2];
        const hour = parts[3];
        const minute = parts[4];
        dateStr = `${year}-${month}-${day} ${hour}:${minute}`;
      }
      listHtml += `
        <li style="margin: 14px 0; font-size: 16px; list-style: none;">
          <span style="color: #ff007f; margin-right: 10px;">⚡</span>
          <a href="/reports/${reportPath}" style="color: #c77dff; text-decoration: none; font-weight: 600; font-family: monospace;">${run}</a>
          <span style="color: #6c757d; margin-left: 10px;">(${dateStr})</span>
        </li>
      `;
    }

    const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Playwright Test Reports Dashboard</title>
  <style>
    body {
      background-color: #0b090a;
      color: #f8f9fa;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      padding: 40px;
      max-width: 800px;
      margin: 0 auto;
    }
    h1 {
      color: #ff007f;
      border-bottom: 2px solid #1a1a1a;
      padding-bottom: 15px;
      font-weight: 800;
      letter-spacing: -0.5px;
    }
    ul {
      padding-left: 0px;
      background: #161a1d;
      border-radius: 8px;
      padding: 20px 30px;
      border: 1px solid #22252a;
    }
    a:hover {
      text-decoration: underline !important;
      color: #e0aaff !important;
    }
    .footer {
      margin-top: 50px;
      font-size: 12px;
      color: #6c757d;
      border-top: 1px solid #1a1a1a;
      padding-top: 15px;
    }
  </style>
</head>
<body>
  <h1>🎤 Playwright Test Run Reports</h1>
  ${runs.length === 0 ? '<p style="color: #6c757d;">No test runs found.</p>' : `<ul>${listHtml}</ul>`}
  <div class="footer">
    Auto-cleaned reports older than ${maxAgeDays} days.
  </div>
</body>
</html>
    `;

    fs.writeFileSync(path.join(reportsRoot, 'index.html'), htmlContent);
  } catch (err) {
    console.error('Failed to generate report index:', err);
  }
}

// Retrieve max age or default to 7 days
const maxAgeDays = process.env.PLAYWRIGHT_REPORTS_MAX_AGE_DAYS 
  ? parseInt(process.env.PLAYWRIGHT_REPORTS_MAX_AGE_DAYS, 10) 
  : 7;

const reportsRoot = path.join('public', 'reports');

// Clean up old reports before starting
cleanupOldReports(reportsRoot, maxAgeDays);

// Generate initial dashboard index
generateReportIndex(reportsRoot, maxAgeDays);

// Ensure the dashboard is updated after current run finishes
process.on('exit', () => {
  generateReportIndex(reportsRoot, maxAgeDays);
});

const timestamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-');
const runDir = path.join(reportsRoot, `run-${timestamp}`);

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
    screenshot: 'on', 
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
