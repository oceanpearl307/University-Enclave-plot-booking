import { test, expect } from '@playwright/test';

/**
 * Helper: log in via the "Dealer Login" button on the home page.
 */
async function loginAsStaff(page, username, password) {
  await page.goto('/');
  await page.getByRole('button', { name: /Dealer Login/i }).click();
  await page.getByPlaceholder('Enter your username').fill(username);
  await page.getByPlaceholder('Enter your password').fill(password);
  await page.getByRole('button', { name: /Login to Dashboard/i }).click();
}

/**
 * Call the app's navigate() function directly via the __testNavigate hook
 * exposed in dev mode (import.meta.env.DEV). This exercises resolveEffectivePage()
 * synchronously during the following render — the same guard that would block any
 * real code path trying to navigate a user to a forbidden page.
 */
async function appNavigate(page, target) {
  return page.evaluate((t) => {
    if (typeof window.__testNavigate !== 'function') {
      throw new Error('__testNavigate is not available — ensure the app is running in dev mode');
    }
    window.__testNavigate(t);
  }, target);
}

// ─── Sales Staff ─────────────────────────────────────────────────────────────

test.describe('Sales Staff (sales1)', () => {
  test('lands on My Sales Dashboard after login', async ({ page }) => {
    await loginAsStaff(page, 'sales1', 'sales123');

    await expect(page.getByText('My Sales Dashboard')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Admin Dashboard')).not.toBeVisible();
    await expect(page.getByText('Staff Portal')).not.toBeVisible();
  });

  test('navigating via Navbar ⚙️ Operations is blocked — stays on My Sales Dashboard', async ({ page }) => {
    // Login → lands on sales-agent-dashboard (fullscreen, Navbar hidden)
    await loginAsStaff(page, 'sales1', 'sales123');
    await expect(page.getByText('My Sales Dashboard')).toBeVisible({ timeout: 10000 });

    // Click "View Plots" to leave the fullscreen dashboard (Navbar becomes visible)
    await page.getByRole('button', { name: /View Plots/i }).click();

    // Navbar now shows "⚙️ Operations" which calls navigate('ops-dashboard')
    await page.getByRole('button', { name: /Operations/i }).click();

    // resolveEffectivePage blocks ops-dashboard → redirects to sales-agent-dashboard
    await expect(page.getByText('My Sales Dashboard')).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('Staff Portal')).not.toBeVisible();
  });

  test('programmatic navigate to admin-dashboard is blocked — stays on My Sales Dashboard', async ({ page }) => {
    await loginAsStaff(page, 'sales1', 'sales123');
    await expect(page.getByText('My Sales Dashboard')).toBeVisible({ timeout: 10000 });

    // Call the app's navigate() with a forbidden target to test resolveEffectivePage
    await appNavigate(page, 'admin-dashboard');
    await page.waitForTimeout(300);

    await expect(page.getByText('Admin Dashboard')).not.toBeVisible();
    await expect(page.getByText('My Sales Dashboard')).toBeVisible();
  });
});

// ─── Operations Staff ─────────────────────────────────────────────────────────

test.describe('Operations Staff (ops1)', () => {
  test('lands on Staff Portal after login', async ({ page }) => {
    await loginAsStaff(page, 'ops1', 'ops123');

    await expect(page.getByText('Staff Portal')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Admin Dashboard')).not.toBeVisible();
    await expect(page.getByText('My Sales Dashboard')).not.toBeVisible();
  });

  test('programmatic navigate to admin-dashboard is blocked — stays on Staff Portal', async ({ page }) => {
    await loginAsStaff(page, 'ops1', 'ops123');
    await expect(page.getByText('Staff Portal')).toBeVisible({ timeout: 10000 });

    await appNavigate(page, 'admin-dashboard');
    await page.waitForTimeout(300);

    await expect(page.getByText('Admin Dashboard')).not.toBeVisible();
    await expect(page.getByText('Staff Portal')).toBeVisible();
  });
});

// ─── Operations Manager ───────────────────────────────────────────────────────

test.describe('Operations Manager (manager1)', () => {
  test('lands on Staff Portal after login', async ({ page }) => {
    await loginAsStaff(page, 'manager1', 'manager123');

    await expect(page.getByText('Staff Portal')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Admin Dashboard')).not.toBeVisible();
    await expect(page.getByText('My Sales Dashboard')).not.toBeVisible();
  });

  test('programmatic navigate to admin-dashboard is blocked — stays on Staff Portal', async ({ page }) => {
    await loginAsStaff(page, 'manager1', 'manager123');
    await expect(page.getByText('Staff Portal')).toBeVisible({ timeout: 10000 });

    await appNavigate(page, 'admin-dashboard');
    await page.waitForTimeout(300);

    await expect(page.getByText('Admin Dashboard')).not.toBeVisible();
    await expect(page.getByText('Staff Portal')).toBeVisible();
  });
});

// ─── Admin sanity check ───────────────────────────────────────────────────────

test.describe('Admin (admin)', () => {
  test('lands on Admin Dashboard after login', async ({ page }) => {
    await loginAsStaff(page, 'admin', 'admin123');

    await expect(page.getByText('Admin Dashboard')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('My Sales Dashboard')).not.toBeVisible();
    await expect(page.getByText('Staff Portal')).not.toBeVisible();
  });
});
