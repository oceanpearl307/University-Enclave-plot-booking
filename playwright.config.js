import { defineConfig, devices } from '@playwright/test';
import { execSync } from 'child_process';

let nixChromium;
try {
  nixChromium = execSync('which chromium', { stdio: ['pipe', 'pipe', 'ignore'] }).toString().trim();
} catch {
  nixChromium = undefined;
}

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30000,
  retries: 1,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:5000',
    headless: true,
    screenshot: 'only-on-failure',
    video: 'off',
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: {
          executablePath: nixChromium,
        },
      },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5000',
    reuseExistingServer: true,
    timeout: 15000,
  },
});
