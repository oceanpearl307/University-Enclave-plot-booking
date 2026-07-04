import { test, expect, request as pwRequest } from '@playwright/test';

/**
 * Regression coverage for the Accounts role + finance dashboard.
 *
 * The Accounts role and its finance endpoints were only ever verified by hand.
 * A future change to roles, ledger logic, or routing could silently break the
 * Accounts experience. These tests lock in the contract:
 *
 *   1. accounts1 logs in and lands on the Accounts dashboard (not admin/ops/sales).
 *   2. Every /api/finance/* read endpoint returns 200 for Accounts (viewFinance)
 *      and 403 for a staff member without viewFinance (sales1), 401 unauthenticated.
 *   3. Recording a payment and regenerating a ledger works for Accounts and the
 *      paid installment survives regeneration (persists).
 *   4. paidBy is always derived server-side — a spoofed client paidBy is ignored.
 */

const FINANCE_GET_ENDPOINTS = [
  '/api/finance/overview',
  '/api/finance/dealers',
  '/api/finance/ledgers',
  '/api/finance/installments',
  '/api/finance/history',
];

// ─── UI: login routing ────────────────────────────────────────────────────────

async function loginAsStaff(page, username, password) {
  await page.goto('/');
  await page.getByRole('button', { name: /Dealer Login/i }).click();
  await page.getByPlaceholder('Enter your username').fill(username);
  await page.getByPlaceholder('Enter your password').fill(password);
  await page.getByRole('button', { name: /Login to Dashboard/i }).click();
}

test.describe('Accounts (accounts1) login routing', () => {
  test('lands on the Accounts financial dashboard, not admin/ops/sales', async ({ page }) => {
    await loginAsStaff(page, 'accounts1', 'accounts123');

    // The Accounts dashboard is the only page rendering this heading.
    await expect(page.getByText('Accounts — Financial Control Center')).toBeVisible({ timeout: 10000 });

    // No other role's dashboard should ever mount for an Accounts user.
    await expect(page.getByText('Admin Dashboard')).not.toBeVisible();
    await expect(page.getByText('My Sales Dashboard')).not.toBeVisible();
    await expect(page.getByText('Staff Portal')).not.toBeVisible();
  });

  test('programmatic navigate to admin-dashboard is blocked — stays on Accounts dashboard', async ({ page }) => {
    await loginAsStaff(page, 'accounts1', 'accounts123');
    await expect(page.getByText('Accounts — Financial Control Center')).toBeVisible({ timeout: 10000 });

    // resolveEffectivePage must pin an Accounts user to accounts-dashboard.
    await page.evaluate(() => window.__testNavigate && window.__testNavigate('admin-dashboard'));
    await page.waitForTimeout(300);

    await expect(page.getByText('Admin Dashboard')).not.toBeVisible();
    await expect(page.getByText('Accounts — Financial Control Center')).toBeVisible();
  });
});

// ─── API: auth helpers ────────────────────────────────────────────────────────

/** Log in via the public login endpoint and return the issued bearer token. */
async function apiLogin(ctx, username, password) {
  const res = await ctx.post('/api/dealer/login', { data: { username, password } });
  expect(res.status(), `login for ${username} should succeed`).toBe(200);
  const body = await res.json();
  expect(body.token, `login for ${username} should return a token`).toBeTruthy();
  return body.token;
}

const authHeader = (token) => ({ Authorization: `Bearer ${token}` });

// ─── API: finance endpoint access control ─────────────────────────────────────

test.describe('Finance API access control', () => {
  let ctx;
  let accountsToken;
  let salesToken;

  test.beforeAll(async ({ baseURL }) => {
    ctx = await pwRequest.newContext({ baseURL });
    accountsToken = await apiLogin(ctx, 'accounts1', 'accounts123');
    salesToken = await apiLogin(ctx, 'sales1', 'sales123');
  });

  test.afterAll(async () => {
    await ctx.dispose();
  });

  for (const endpoint of FINANCE_GET_ENDPOINTS) {
    test(`${endpoint} → 200 for Accounts, 403 for sales1, 401 unauthenticated`, async () => {
      const okRes = await ctx.get(endpoint, { headers: authHeader(accountsToken) });
      expect(okRes.status(), `${endpoint} should be 200 for Accounts`).toBe(200);

      const forbiddenRes = await ctx.get(endpoint, { headers: authHeader(salesToken) });
      expect(forbiddenRes.status(), `${endpoint} should be 403 for sales1 (no viewFinance)`).toBe(403);

      const unauthRes = await ctx.get(endpoint);
      expect(unauthRes.status(), `${endpoint} should be 401 unauthenticated`).toBe(401);
    });
  }

  test('regenerate-ledger endpoint requires manageLedger (403 for sales1)', async () => {
    // sales1 lacks manageLedger — even hitting a bogus id must be gated before 404.
    const res = await ctx.post('/api/finance/ledger/999999/generate', { headers: authHeader(salesToken) });
    expect(res.status()).toBe(403);
  });
});

// ─── API: record payment, regenerate ledger, paidBy integrity ─────────────────

/** Create a confirmed booking (as admin) so the test owns its own ledger data. */
async function createConfirmedBooking(ctx, adminToken) {
  const { id } = await createConfirmedBookingDetailed(ctx, adminToken);
  return id;
}

/** Like createConfirmedBooking but returns the booking's id, customer name and ref. */
async function createConfirmedBookingDetailed(ctx, adminToken) {
  const plotsRes = await ctx.get('/api/plots');
  expect(plotsRes.status()).toBe(200);
  const plots = await plotsRes.json();
  const available = plots.find(p => p.status === 'available');
  expect(available, 'need at least one available plot to book').toBeTruthy();

  const unique = Date.now();
  const customerName = `Test Buyer ${unique}`;
  const bookingRes = await ctx.post('/api/bookings', {
    data: {
      plotId: available.id,
      name: customerName,
      fatherName: 'Test Father',
      cnic: `35202-${unique.toString().slice(-7)}-1`,
      phone: '03001234567',
      email: `buyer${unique}@example.com`,
      residentialAddress: '123 Test Street',
      postalAddress: '123 Test Street',
      photo: 'data:image/png;base64,TEST',
      nomineeName: 'Test Nominee',
      nomineeFatherName: 'Nominee Father',
      nomineeCnic: `35202-${unique.toString().slice(-7)}-2`,
      nomineeRelation: 'Brother',
      nomineePhone: '03007654321',
      nomineeAddress: '123 Test Street',
      downPayment: 500000,
    },
  });
  expect(bookingRes.status(), 'booking creation should succeed').toBe(201);
  const booking = await bookingRes.json();

  const approveRes = await ctx.post(`/api/admin/bookings/${booking.id}/approve`, { headers: authHeader(adminToken) });
  expect(approveRes.status(), 'admin should be able to approve the booking').toBe(200);

  return { id: booking.id, customerName, bookingRef: booking.bookingRef };
}

test.describe('Accounts payment + ledger regeneration', () => {
  let ctx;
  let adminToken;
  let accountsToken;

  test.beforeAll(async ({ baseURL }) => {
    ctx = await pwRequest.newContext({ baseURL });
    adminToken = await apiLogin(ctx, 'admin', 'admin123');
    accountsToken = await apiLogin(ctx, 'accounts1', 'accounts123');
  });

  test.afterAll(async () => {
    await ctx.dispose();
  });

  test('Accounts records a payment; paidBy is server-derived and survives ledger regeneration', async () => {
    const bookingId = await createConfirmedBooking(ctx, adminToken);

    // Read the freshly generated ledger as Accounts (viewLedger/viewFinance).
    const ledgerRes = await ctx.get(`/api/ledger/${bookingId}`, { headers: authHeader(accountsToken) });
    expect(ledgerRes.status()).toBe(200);
    const { ledger } = await ledgerRes.json();
    const pending = ledger.find(i => i.status !== 'paid');
    expect(pending, 'a newly confirmed booking should have a pending installment').toBeTruthy();

    // Record the payment as Accounts, deliberately spoofing paidBy in the body.
    const payRes = await ctx.post(`/api/ledger/${bookingId}/${pending.id}/pay`, {
      headers: authHeader(accountsToken),
      data: { paidAmount: pending.amount, paidDate: '2026-07-04', notes: 'e2e test payment', paidBy: 'Admin' },
    });
    expect(payRes.status(), 'Accounts should be able to record a payment').toBe(200);
    const payBody = await payRes.json();
    expect(payBody.success).toBe(true);
    // paidBy must be derived server-side from the session, NOT the spoofed 'Admin'.
    expect(payBody.item.paidBy).toBe('Accounts');
    expect(payBody.item.status).toBe('paid');

    // Regenerate the ledger as Accounts (manageLedger) — must preserve paid items.
    const genRes = await ctx.post(`/api/finance/ledger/${bookingId}/generate`, { headers: authHeader(accountsToken) });
    expect(genRes.status(), 'Accounts should be able to regenerate a ledger').toBe(200);
    const genBody = await genRes.json();
    expect(genBody.success).toBe(true);
    const stillPaid = genBody.ledger.filter(i => i.status === 'paid');
    // Down payment (Customer) + the installment we just paid (Accounts) must remain paid.
    expect(stillPaid.some(i => i.paidBy === 'Accounts')).toBe(true);

    // Re-read to confirm the payment persisted (in-memory store survives the call).
    // NOTE: regeneration reassigns installment ids, so match on the preserved
    // paid attributes rather than the original id.
    const reReadRes = await ctx.get(`/api/ledger/${bookingId}`, { headers: authHeader(accountsToken) });
    expect(reReadRes.status()).toBe(200);
    const reRead = await reReadRes.json();
    const persisted = reRead.ledger.find(i => i.type === pending.type && i.status === 'paid');
    expect(persisted, 'the paid installment should still exist after regeneration').toBeTruthy();
    expect(persisted.paidBy).toBe('Accounts');
    expect(persisted.paidAmount).toBe(pending.amount);
  });
});

// ─── UI: AccountsDashboard renders real numbers & records a payment on screen ──

/**
 * A green finance API doesn't guarantee the React dashboard actually renders the
 * numbers or that the on-screen record-payment form works. These tests exercise
 * the AccountsDashboard UI end-to-end:
 *   1. Overview tab renders real totals (currency-formatted, never blank/NaN).
 *   2. Client Ledgers tab drills into a ledger and records a payment through the
 *      modal form; the installment's paid state updates on screen.
 */
test.describe('AccountsDashboard UI renders finance numbers end-to-end', () => {
  let ctx;
  let booking; // { id, customerName, bookingRef }

  test.beforeAll(async ({ baseURL }) => {
    ctx = await pwRequest.newContext({ baseURL });
    const adminToken = await apiLogin(ctx, 'admin', 'admin123');
    // Own our ledger data so the Client Ledgers list has a known, findable row.
    booking = await createConfirmedBookingDetailed(ctx, adminToken);
  });

  test.afterAll(async () => {
    await ctx.dispose();
  });

  test('Overview tab renders currency totals (not blank/NaN)', async ({ page }) => {
    await loginAsStaff(page, 'accounts1', 'accounts123');
    await expect(page.getByText('Accounts — Financial Control Center')).toBeVisible({ timeout: 10000 });

    // Overview is the default section — all four stat cards must render.
    for (const title of ['Total Sales', 'Payments Collected', 'Pending', 'Overdue']) {
      await expect(page.getByText(title, { exact: true })).toBeVisible();
    }

    // Totals are currency-formatted ("PKR …") and must never render as NaN/blank.
    const overview = page.locator('body');
    await expect(overview).toContainText('PKR');
    await expect(overview).not.toContainText('NaN');
    await expect(overview).not.toContainText('PKR undefined');
  });

  test('Client Ledgers tab drills in and records a payment via the UI form', async ({ page }) => {
    await loginAsStaff(page, 'accounts1', 'accounts123');
    await expect(page.getByText('Accounts — Financial Control Center')).toBeVisible({ timeout: 10000 });

    // Switch to the Client Ledgers section via its nav button.
    await page.getByRole('button', { name: /Client Ledgers/i }).click();

    // Find our own booking by its unique ref, then open its ledger.
    await page.getByPlaceholder(/Search by name, ref, plot/i).fill(booking.bookingRef);
    const card = page.getByRole('button').filter({ hasText: booking.bookingRef });
    await expect(card).toBeVisible({ timeout: 10000 });
    await card.click();

    // The ledger detail must render the client's name and at least one recordable
    // (pending) installment — proving the drill-down fetched real data.
    await expect(page.getByRole('heading', { name: booking.customerName })).toBeVisible({ timeout: 10000 });
    const recordButtons = page.getByRole('button', { name: 'Record', exact: true });
    await expect(recordButtons.first()).toBeVisible();
    const pendingBefore = await recordButtons.count();
    expect(pendingBefore).toBeGreaterThan(0);

    // Record the first pending installment through the on-screen modal form.
    await recordButtons.first().click();
    await expect(page.getByRole('heading', { name: 'Record Payment' })).toBeVisible();
    // Amount is pre-filled from the installment; submit as-is.
    await page.getByRole('button', { name: 'Record Payment' }).click();

    // Success flash confirms the write, and the paid state updates on screen:
    // the modal closes and one fewer installment remains recordable.
    await expect(page.getByText(/Payment recorded/i)).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('heading', { name: 'Record Payment' })).not.toBeVisible();
    await expect(recordButtons).toHaveCount(pendingBefore - 1);
    await expect(page.getByText('Paid').first()).toBeVisible();
  });
});
