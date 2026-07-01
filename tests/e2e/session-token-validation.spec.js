import { test, expect } from '@playwright/test';

/**
 * Regression coverage for the startup token-validation path in App.jsx.
 *
 * On load, App.jsx runs GET /api/auth/check with the persisted ue_token. If the
 * server rejects the token (expired / revoked / never existed) the whole session
 * must be wiped and the user dropped back on the public home page — a stale token
 * must never quietly resurrect a dashboard. Separately, the server's staffRole is
 * authoritative: a hand-edited ue_dealer role in localStorage must be overwritten
 * by whatever /api/auth/check returns, so a lower-privilege user cannot escalate
 * by tampering with client storage.
 *
 * These complement the logout → re-login coverage in session-role-switch.spec.js
 * by exercising the token-validation path rather than the explicit logout path.
 */

/** Read the persisted session keys straight out of localStorage. */
async function readSession(page) {
  return page.evaluate(() => ({
    dealer: localStorage.getItem('ue_dealer'),
    token: localStorage.getItem('ue_token'),
    page: localStorage.getItem('ue_page'),
    customer: localStorage.getItem('ue_customer'),
  }));
}

async function loginAsStaff(page, username, password) {
  await page.goto('/');
  await page.getByRole('button', { name: /Dealer Login/i }).click();
  await page.getByPlaceholder('Enter your username').fill(username);
  await page.getByPlaceholder('Enter your password').fill(password);
  await page.getByRole('button', { name: /Login to Dashboard/i }).click();
}

test.describe('Startup auth check: server-rejected token', () => {
  test('an expired/revoked token with a persisted dashboard page redirects home and clears the session', async ({ page }) => {
    // Seed a valid-looking but server-unknown token, an admin-ish dealer, and a
    // dashboard page — the exact shape a leaked/stale session would leave behind.
    await page.addInitScript(() => {
      localStorage.setItem('ue_token', 'ops-999-9999999999999');
      localStorage.setItem('ue_dealer', JSON.stringify({
        id: 999, username: 'ghost', name: 'Ghost Admin', role: 'admin',
      }));
      localStorage.setItem('ue_page', 'admin-dashboard');
    });

    await page.goto('/');

    // The startup /api/auth/check rejects the token (401 → valid:false), so App
    // must land on the public home page — the "Dealer Login" button is only
    // rendered on the public shell, never inside a dashboard.
    await expect(page.getByRole('button', { name: /Dealer Login/i })).toBeVisible({ timeout: 10000 });

    // No dashboard content should ever have mounted from the stale session.
    await expect(page.getByText('Admin Dashboard')).not.toBeVisible();

    // Every session key tied to the rejected token must be cleared.
    const sess = await readSession(page);
    expect(sess.dealer).toBeNull();
    expect(sess.token).toBeNull();
    expect(sess.page === null || sess.page === 'home').toBeTruthy();
  });
});

test.describe('Startup auth check: server staffRole is authoritative', () => {
  test('a tampered ue_dealer staffRole in localStorage is overwritten by the server on auth check', async ({ page }) => {
    // Log in as a genuine low-privilege Sales Staff account to obtain a real,
    // server-issued token and dealer record.
    await loginAsStaff(page, 'sales1', 'sales123');
    await expect(page.getByText('My Sales Dashboard')).toBeVisible({ timeout: 10000 });

    // Tamper with the persisted dealer: forge a higher-privilege staffRole while
    // keeping the still-valid token. If the client trusted localStorage, this
    // would let a Sales Staff user act as an Operations Manager.
    await page.evaluate(() => {
      const d = JSON.parse(localStorage.getItem('ue_dealer'));
      d.staffRole = 'Operations Manager';
      localStorage.setItem('ue_dealer', JSON.stringify(d));
    });

    // Reload — App re-runs /api/auth/check with the (valid) token. The server
    // returns the real staffRole ('Sales Staff') and App overwrites the forged
    // value in state and, in turn, in localStorage.
    await page.reload();

    // The persisted staffRole must be corrected back to the server's truth.
    await expect
      .poll(async () => {
        const raw = await page.evaluate(() => localStorage.getItem('ue_dealer'));
        return raw ? JSON.parse(raw).staffRole : null;
      }, { timeout: 10000 })
      .toBe('Sales Staff');

    // The forged role must be gone, not merely shadowed.
    const sess = await readSession(page);
    expect(sess.dealer).toContain('Sales Staff');
    expect(sess.dealer).not.toContain('Operations Manager');

    // And the corrected role must actually govern routing: navigating toward an
    // admin/ops dashboard resolves to the Sales dashboard, never the Staff Portal.
    await page.evaluate(() => window.__testNavigate && window.__testNavigate('admin-dashboard'));
    await expect(page.getByText('My Sales Dashboard')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Staff Portal')).not.toBeVisible();
  });
});
