import { defineConfig, devices } from '@playwright/test';
import { execSync } from 'child_process';

// Tests run against a small, deterministic plot fixture so dashboards render a
// handful of rows (not ~846), keeping renders fast and the 30s timeout ample.
// Relative to the project root; the server resolves it via path.resolve().
const FIXTURE_DB = 'tests/fixtures/small-db.json';

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
    // In CI always start our own fixture-backed server so tests are fast and
    // deterministic. Locally, reuse a running dev server if one is already up.
    reuseExistingServer: !process.env.CI,
    timeout: 30000,
    env: {
      // Point the API at the small deterministic plot fixture and never persist,
      // so tests never mutate the real db.json or the fixture between runs.
      DB_PATH: FIXTURE_DB,
      DB_PERSIST: '0',
    },
  },
});
