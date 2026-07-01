import { test, expect } from '@playwright/test';

/**
 * Regression coverage for the logout → re-login flow across different roles.
 *
 * If session state (localStorage: ue_dealer / ue_token / ue_page) is not fully
 * cleared on logout, a newly logged-in lower-privilege user could briefly see
 * content meant for the previous higher-privilege user (or vice versa). These
 * tests switch accounts within a single browser context and assert that no
 * stale dashboard ever leaks across the boundary.
 */

async function loginAsStaff(page, username, password) {
  await page.goto('/');
  await page.getByRole('button', { name: /Dealer Login/i }).click();
  await page.getByPlaceholder('Enter your username').fill(username);
  await page.getByPlaceholder('Enter your password').fill(password);
  await page.getByRole('button', { name: /Login to Dashboard/i }).click();
}

/**
 * Log out from whichever fullscreen dashboard is currently shown. Every
 * dashboard renders a "Logout" button wired to App.handleLogout().
 */
async function logout(page) {
  await page.getByRole('button', { name: /^Logout$/i }).first().click();
  // handleLogout() navigates back to home, which shows the "Dealer Login" button.
  await expect(page.getByRole('button', { name: /Dealer Login/i })).toBeVisible({ timeout: 10000 });
}

/** Read the persisted session keys straight out of localStorage. */
async function readSession(page) {
  return page.evaluate(() => ({
    dealer: localStorage.getItem('ue_dealer'),
    token: localStorage.getItem('ue_token'),
    page: localStorage.getItem('ue_page'),
    customer: localStorage.getItem('ue_customer'),
  }));
}

test.describe('Logout clears session state', () => {
  test('handleLogout wipes all persisted session keys', async ({ page }) => {
    await loginAsStaff(page, 'admin', 'admin123');
    await expect(page.getByText('Admin Dashboard')).toBeVisible({ timeout: 10000 });

    // Session is populated while logged in.
    const before = await readSession(page);
    expect(before.dealer).not.toBeNull();
    expect(before.token).not.toBeNull();

    await logout(page);

    // Every session key must be gone after logout.
    const after = await readSession(page);
    expect(after.dealer).toBeNull();
    expect(after.token).toBeNull();
    expect(after.customer).toBeNull();
    // ue_page must not point at any dashboard.
    expect(after.page === null || after.page === 'home').toBeTruthy();
  });
});

test.describe('Role switch: Admin → Sales Staff', () => {
  test('admin dashboard is never shown after switching to Sales Staff', async ({ page }) => {
    // Log in as Super Admin.
    await loginAsStaff(page, 'admin', 'admin123');
    await expect(page.getByText('Admin Dashboard')).toBeVisible({ timeout: 10000 });

    // Log out.
    await logout(page);
    await expect(page.getByText('Admin Dashboard')).not.toBeVisible();

    // Log in as Sales Staff.
    await loginAsStaff(page, 'sales1', 'sales123');

    // Correct lower-privilege dashboard loads.
    await expect(page.getByText('My Sales Dashboard')).toBeVisible({ timeout: 10000 });
    // Admin content from the previous session must never appear.
    await expect(page.getByText('Admin Dashboard')).not.toBeVisible();
    await expect(page.getByText('Staff Portal')).not.toBeVisible();

    // Persisted role reflects the new (lower-privilege) user only.
    const sess = await readSession(page);
    expect(sess.dealer).toContain('operations');
    expect(sess.dealer).toContain('Sales Staff');
    expect(sess.dealer).not.toContain('"role":"admin"');
  });
});

test.describe('Role switch: Sales Staff → Operations Staff', () => {
  test('correct dashboard loads cleanly with no stale sales content', async ({ page }) => {
    // Log in as Sales Staff.
    await loginAsStaff(page, 'sales1', 'sales123');
    await expect(page.getByText('My Sales Dashboard')).toBeVisible({ timeout: 10000 });

    // Log out.
    await logout(page);
    await expect(page.getByText('My Sales Dashboard')).not.toBeVisible();

    // Log in as Operations Staff.
    await loginAsStaff(page, 'ops1', 'ops123');

    // Operations Staff lands on the Staff Portal cleanly.
    await expect(page.getByText('Staff Portal')).toBeVisible({ timeout: 10000 });
    // No stale content from the previous Sales Staff session.
    await expect(page.getByText('My Sales Dashboard')).not.toBeVisible();
    await expect(page.getByText('Admin Dashboard')).not.toBeVisible();

    const sess = await readSession(page);
    expect(sess.dealer).toContain('operations');
    expect(sess.dealer).not.toContain('Sales Staff');
  });
});

test.describe('Role switch: Operations Staff → Admin', () => {
  test('escalating back to admin loads Admin Dashboard cleanly', async ({ page }) => {
    // Lower-privilege session first.
    await loginAsStaff(page, 'ops1', 'ops123');
    await expect(page.getByText('Staff Portal')).toBeVisible({ timeout: 10000 });

    await logout(page);
    await expect(page.getByText('Staff Portal')).not.toBeVisible();

    // Escalate to Super Admin.
    await loginAsStaff(page, 'admin', 'admin123');
    await expect(page.getByText('Admin Dashboard')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Staff Portal')).not.toBeVisible();
    await expect(page.getByText('My Sales Dashboard')).not.toBeVisible();
  });
});
