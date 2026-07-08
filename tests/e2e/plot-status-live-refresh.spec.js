import { test, expect, request as pwRequest } from '@playwright/test';

// These flows drive the full React dashboards, which render the plot inventory
// on every tab switch. Tests run against a small deterministic fixture (see
// playwright.config.js → tests/fixtures/small-db.json), so renders are light
// and the 30s global default timeout is ample — no per-test override needed.

/**
 * Regression coverage for live plot-status refresh after booking actions.
 *
 * A bug once left the Admin and Operations inventory/plots tables showing stale
 * plot statuses after a booking action, because those handlers re-fetched the
 * bookings list but never re-fetched the plot inventory:
 *   - approve  → plot becomes "sold"
 *   - reject   → plot released to "available"
 *   - delete   → plot released to "available"
 * The Operations live new-booking SSE stream had a parallel gap: a newly created
 * booking never surfaced without a manual reload.
 *
 * These tests lock in the user-visible contract end-to-end (no page reload —
 * only in-app SPA navigation between tabs):
 *   1. Admin approve/reject/delete → the Inventory table reflects the new plot
 *      status (sold / available) without a browser reload.
 *   2. Operations Staff approve/reject → the Plots table reflects the new status.
 *   3. The Operations live new-booking stream surfaces a freshly created booking
 *      in the bookings table without any reload or tab switch.
 */

// ─── API helpers ──────────────────────────────────────────────────────────────

async function apiLogin(ctx, username, password) {
  const res = await ctx.post('/api/dealer/login', { data: { username, password } });
  expect(res.status(), `login for ${username} should succeed`).toBe(200);
  const body = await res.json();
  expect(body.token, `login for ${username} should return a token`).toBeTruthy();
  return body.token;
}

const authHeader = (token) => ({ Authorization: `Bearer ${token}` });

/**
 * Create a pending booking on a random available plot and confirm the server
 * moved that plot to "booked". Returns { id, bookingRef, plotId, plotNumber,
 * customerName }. The unique customerName lets the UI filter down to this one row.
 */
async function createPendingBooking(ctx) {
  const plotsRes = await ctx.get('/api/plots');
  expect(plotsRes.status()).toBe(200);
  const plots = await plotsRes.json();
  const availablePlots = plots.filter(p => p.status === 'available');
  expect(availablePlots.length, 'need at least one available plot to book').toBeGreaterThan(0);
  // Pick a random available plot to reduce collisions across parallel test runs.
  const plot = availablePlots[Math.floor(Math.random() * availablePlots.length)];

  const unique = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  const customerName = `Live Refresh Buyer ${unique}`;
  const bookingRes = await ctx.post('/api/bookings', {
    data: {
      plotId: plot.id,
      name: customerName,
      fatherName: 'Test Father',
      cnic: `35202-${unique.slice(-7)}-1`,
      phone: '03001234567',
      email: `buyer${unique}@example.com`,
      residentialAddress: '123 Test Street',
      postalAddress: '123 Test Street',
      photo: 'data:image/png;base64,TEST',
      nomineeName: 'Test Nominee',
      nomineeFatherName: 'Nominee Father',
      nomineeCnic: `35202-${unique.slice(-7)}-2`,
      nomineeRelation: 'Brother',
      nomineePhone: '03007654321',
      nomineeAddress: '123 Test Street',
      downPayment: 500000,
    },
  });
  expect(bookingRes.status(), 'booking creation should succeed').toBe(201);
  const booking = await bookingRes.json();

  // The plot must now be "booked" — this is what makes the later
  // "available" assertions after reject/delete meaningful (a real transition).
  const afterRes = await ctx.get(`/api/plots/${plot.id}`);
  expect(afterRes.status()).toBe(200);
  const afterPlot = await afterRes.json();
  expect(afterPlot.status, 'creating a booking should mark the plot booked').toBe('booked');

  return {
    id: booking.id,
    bookingRef: booking.bookingRef,
    plotId: plot.id,
    plotNumber: plot.number,
    customerName,
  };
}

// ─── UI helpers ───────────────────────────────────────────────────────────────

async function loginAsStaff(page, username, password) {
  await page.goto('/');
  await page.getByRole('button', { name: /Dealer Login/i }).click();
  await page.getByPlaceholder('Enter your username').fill(username);
  await page.getByPlaceholder('Enter your password').fill(password);
  await page.getByRole('button', { name: /Login to Dashboard/i }).click();
}

/**
 * Provision an Operations Staff account that has BOTH approve rights and plot
 * visibility. No default staff role combines these (ops1 approves but has no
 * Plots tab; manager1 sees plots but cannot approve), so we create one via the
 * admin staff API with custom privileges. Only the Super Admin may set custom
 * privileges — an Operations Manager is forced onto role presets.
 * Returns { username, password } for a fresh, uniquely-named account.
 */
async function provisionOpsWithPlots(ctx) {
  const adminToken = await apiLogin(ctx, 'admin', 'admin123');
  const unique = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  const username = `opsplots${unique}`;
  const password = 'opsplots123';
  const res = await ctx.post('/api/admin/staff', {
    headers: authHeader(adminToken),
    data: {
      username,
      password,
      name: `Ops Plots Tester ${unique}`,
      staffRole: 'Operations Staff',
      privileges: { approveBookings: true, editBookings: true, viewPlots: true },
    },
  });
  expect(res.status(), 'admin should create a combined approve+viewPlots staff account').toBe(201);
  const staff = await res.json();
  expect(staff.privileges.approveBookings, 'account must be able to approve').toBe(true);
  expect(staff.privileges.viewPlots, 'account must be able to view plots').toBe(true);
  return { username, password };
}

/**
 * From the Operations dashboard, open the Plots tab and assert a single plot's
 * status badge. The Ops Plots table has no search box, so we locate the row by
 * its (unique) plot number. Uses only in-app navigation — never a page reload.
 */
async function assertOpsPlotStatus(page, plotNumber, expectedStatus) {
  await page.getByRole('button', { name: /🏘️ Plots/ }).click();
  await expect(page.getByRole('heading', { name: 'Plot Inventory' })).toBeVisible({ timeout: 10000 });
  const row = page.locator('tbody tr').filter({ has: page.getByText(plotNumber, { exact: true }) });
  await expect(row.first()).toBeVisible({ timeout: 10000 });
  // Status text renders lowercase in the DOM (capitalized only via CSS).
  await expect(row.first()).toContainText(expectedStatus);
}

/**
 * From the Admin dashboard, open the Inventory tab, filter to a single plot and
 * assert its status badge. Uses only in-app navigation — never a page reload.
 */
async function assertAdminPlotStatus(page, plotNumber, expectedStatus) {
  await page.getByRole('button', { name: /Inventory/i }).click();
  const search = page.getByPlaceholder('Search plot number…');
  await expect(search).toBeVisible({ timeout: 10000 });
  await search.fill(plotNumber);
  const row = page.locator('tbody tr').filter({ has: page.getByText(plotNumber, { exact: true }) });
  await expect(row.first()).toBeVisible({ timeout: 10000 });
  // Status text renders lowercase in the DOM (capitalized only via CSS).
  await expect(row.first()).toContainText(expectedStatus);
}

// ─── Admin: approve / reject / delete → inventory updates without reload ───────

test.describe('Admin inventory reflects plot status after booking actions (no reload)', () => {
  let ctx;

  test.beforeAll(async ({ baseURL }) => {
    ctx = await pwRequest.newContext({ baseURL });
  });

  test.afterAll(async () => {
    await ctx.dispose();
  });

  test('approve → plot shows "sold" in the Inventory table', async ({ page }) => {
    const bkg = await createPendingBooking(ctx);

    await loginAsStaff(page, 'admin', 'admin123');
    await expect(page.getByText('Admin Dashboard')).toBeVisible({ timeout: 10000 });

    await page.getByRole('button', { name: /Bookings/i }).click();
    await page.getByPlaceholder(/Search by client name or CNIC/i).fill(bkg.customerName);
    const row = page.locator('tbody tr').filter({ hasText: bkg.bookingRef });
    await expect(row).toBeVisible({ timeout: 10000 });

    // Approve via the in-row ✓ button.
    await row.getByRole('button', { name: '✓', exact: true }).click();
    await expect(page.getByText('✅ Booking approved.')).toBeVisible({ timeout: 10000 });

    // The plot must show "sold" in the Inventory tab without a browser reload.
    await assertAdminPlotStatus(page, bkg.plotNumber, 'sold');
  });

  test('reject → plot is released back to "available" in the Inventory table', async ({ page }) => {
    const bkg = await createPendingBooking(ctx);

    await loginAsStaff(page, 'admin', 'admin123');
    await expect(page.getByText('Admin Dashboard')).toBeVisible({ timeout: 10000 });

    await page.getByRole('button', { name: /Bookings/i }).click();
    await page.getByPlaceholder(/Search by client name or CNIC/i).fill(bkg.customerName);
    const row = page.locator('tbody tr').filter({ hasText: bkg.bookingRef });
    await expect(row).toBeVisible({ timeout: 10000 });

    // Reject via the in-row ✕ button → confirmation modal.
    await row.getByRole('button', { name: '✕', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Reject Booking' })).toBeVisible();
    await page.getByPlaceholder('Enter rejection reason...').fill('e2e reject');
    await page.getByRole('button', { name: 'Confirm Reject' }).click();
    await expect(page.getByText('✅ Booking rejected.')).toBeVisible({ timeout: 10000 });

    await assertAdminPlotStatus(page, bkg.plotNumber, 'available');
  });

  test('delete → plot is released back to "available" in the Inventory table', async ({ page }) => {
    const bkg = await createPendingBooking(ctx);

    await loginAsStaff(page, 'admin', 'admin123');
    await expect(page.getByText('Admin Dashboard')).toBeVisible({ timeout: 10000 });

    await page.getByRole('button', { name: /Bookings/i }).click();
    await page.getByPlaceholder(/Search by client name or CNIC/i).fill(bkg.customerName);
    const row = page.locator('tbody tr').filter({ hasText: bkg.bookingRef });
    await expect(row).toBeVisible({ timeout: 10000 });

    // Delete via the in-row 🗑️ button → confirmation modal.
    await row.getByRole('button', { name: '🗑️' }).click();
    await page.getByRole('button', { name: 'Yes, Delete' }).click();
    await expect(page.getByText('✅ Booking deleted — plot released.')).toBeVisible({ timeout: 10000 });

    await assertAdminPlotStatus(page, bkg.plotNumber, 'available');
  });
});

// ─── Operations Staff approve / reject flow ───────────────────────────────────
//
// NOTE: the default Operations Staff role (ops1) has approveBookings but NOT
// viewPlots, so it has no Plots tab to inspect. These tests assert the booking
// row updates live in the ops bookings table (no reload) and confirm the plot
// transition server-side. The Ops-facing Plots-table refresh itself is covered
// by the "Operations staff with plot visibility" describe below, which
// provisions a combined approve+viewPlots account.

test.describe('Operations Staff approve/reject flow updates booking + plot', () => {
  let ctx;

  test.beforeAll(async ({ baseURL }) => {
    ctx = await pwRequest.newContext({ baseURL });
  });

  test.afterAll(async () => {
    await ctx.dispose();
  });

  test('approve → booking goes "confirmed" live and the plot becomes "sold"', async ({ page }) => {
    const bkg = await createPendingBooking(ctx);

    await loginAsStaff(page, 'ops1', 'ops123');
    await expect(page.getByText('Staff Portal')).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('heading', { name: 'Plot Bookings' })).toBeVisible({ timeout: 10000 });

    const row = page.locator('tbody tr').filter({ hasText: bkg.bookingRef });
    await expect(row).toBeVisible({ timeout: 10000 });
    await row.getByRole('button', { name: '✓', exact: true }).click();
    await expect(page.getByText('✅ Booking approved — plot marked as sold.')).toBeVisible({ timeout: 10000 });

    // A receipt modal opens after approval — dismiss it.
    await page.getByRole('button', { name: '✕ Close' }).click();

    // The bookings table refreshes live — the row now shows "confirmed", no reload.
    await expect(page.locator('tbody tr').filter({ hasText: bkg.bookingRef })).toContainText('confirmed', { timeout: 10000 });

    // The server moved the plot to "sold".
    const plot = await (await ctx.get(`/api/plots/${bkg.plotId}`)).json();
    expect(plot.status).toBe('sold');
  });

  test('reject → booking goes "rejected" live and the plot returns to "available"', async ({ page }) => {
    const bkg = await createPendingBooking(ctx);

    await loginAsStaff(page, 'ops1', 'ops123');
    await expect(page.getByText('Staff Portal')).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('heading', { name: 'Plot Bookings' })).toBeVisible({ timeout: 10000 });

    const row = page.locator('tbody tr').filter({ hasText: bkg.bookingRef });
    await expect(row).toBeVisible({ timeout: 10000 });
    await row.getByRole('button', { name: '✕', exact: true }).click();

    // Reject confirmation modal.
    await expect(page.getByRole('heading', { name: 'Reject Booking' })).toBeVisible();
    const reason = page.getByPlaceholder(/reason/i);
    if (await reason.count()) await reason.first().fill('e2e reject');
    await page.getByRole('button', { name: /Confirm Reject|Reject Booking/i }).last().click();
    await expect(page.getByText('✅ Booking rejected — plot is now available again.')).toBeVisible({ timeout: 10000 });

    // The bookings table refreshes live — the row now shows "rejected", no reload.
    await expect(page.locator('tbody tr').filter({ hasText: bkg.bookingRef })).toContainText('rejected', { timeout: 10000 });

    // The server released the plot back to "available".
    const plot = await (await ctx.get(`/api/plots/${bkg.plotId}`)).json();
    expect(plot.status).toBe('available');
  });
});

// ─── Operations staff WITH plot visibility → Plots table updates (no reload) ──
//
// Closes the coverage gap noted above: provisions a staff account that has BOTH
// approveBookings and viewPlots, actions a booking, then asserts the Ops-facing
// Plots table flips the plot's status with no browser reload — only in-app SPA
// navigation between the Bookings and Plots tabs.

test.describe('Operations staff with plot visibility see Plots table update after actions', () => {
  let ctx;
  let creds;

  test.beforeAll(async ({ baseURL }) => {
    ctx = await pwRequest.newContext({ baseURL });
    creds = await provisionOpsWithPlots(ctx);
  });

  test.afterAll(async () => {
    await ctx.dispose();
  });

  test('approve → plot shows "sold" in the Ops Plots table', async ({ page }) => {
    const bkg = await createPendingBooking(ctx);

    await loginAsStaff(page, creds.username, creds.password);
    await expect(page.getByText('Staff Portal')).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('heading', { name: 'Plot Bookings' })).toBeVisible({ timeout: 10000 });

    // Confirm the plot starts out "booked" in the Ops Plots table.
    await assertOpsPlotStatus(page, bkg.plotNumber, 'booked');

    // Back to Bookings and approve.
    await page.getByRole('button', { name: /📋 Bookings/ }).click();
    const row = page.locator('tbody tr').filter({ hasText: bkg.bookingRef });
    await expect(row).toBeVisible({ timeout: 10000 });
    await row.getByRole('button', { name: '✓', exact: true }).click();
    await expect(page.getByText('✅ Booking approved — plot marked as sold.')).toBeVisible({ timeout: 10000 });

    // A receipt modal opens after approval — dismiss it.
    await page.getByRole('button', { name: '✕ Close' }).click();

    // The Ops Plots table must show "sold" without a browser reload.
    await assertOpsPlotStatus(page, bkg.plotNumber, 'sold');
  });

  test('reject → plot is released to "available" in the Ops Plots table', async ({ page }) => {
    const bkg = await createPendingBooking(ctx);

    await loginAsStaff(page, creds.username, creds.password);
    await expect(page.getByText('Staff Portal')).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('heading', { name: 'Plot Bookings' })).toBeVisible({ timeout: 10000 });

    // Confirm the plot starts out "booked" in the Ops Plots table.
    await assertOpsPlotStatus(page, bkg.plotNumber, 'booked');

    // Back to Bookings and reject.
    await page.getByRole('button', { name: /📋 Bookings/ }).click();
    const row = page.locator('tbody tr').filter({ hasText: bkg.bookingRef });
    await expect(row).toBeVisible({ timeout: 10000 });
    await row.getByRole('button', { name: '✕', exact: true }).click();

    await expect(page.getByRole('heading', { name: 'Reject Booking' })).toBeVisible();
    const reason = page.getByPlaceholder(/reason/i);
    if (await reason.count()) await reason.first().fill('e2e reject');
    await page.getByRole('button', { name: /Confirm Reject|Reject Booking/i }).last().click();
    await expect(page.getByText('✅ Booking rejected — plot is now available again.')).toBeVisible({ timeout: 10000 });

    // The Ops Plots table must show "available" without a browser reload.
    await assertOpsPlotStatus(page, bkg.plotNumber, 'available');
  });
});

// ─── Operations live new-booking stream surfaces a booking without reload ──────

test.describe('Operations live new-booking stream', () => {
  let ctx;

  test.beforeAll(async ({ baseURL }) => {
    ctx = await pwRequest.newContext({ baseURL });
  });

  test.afterAll(async () => {
    await ctx.dispose();
  });

  test('a booking created after login appears in the bookings table with no reload', async ({ page }) => {
    await loginAsStaff(page, 'ops1', 'ops123');
    await expect(page.getByText('Staff Portal')).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('heading', { name: 'Plot Bookings' })).toBeVisible({ timeout: 10000 });

    // Give the SSE EventSource a moment to connect before we push an event.
    await page.waitForTimeout(1000);

    // Create the booking out-of-band (as a separate client) AFTER the ops user
    // is already sitting on the bookings tab. The SSE new_booking event must
    // trigger a live bookings refresh — no reload, no tab switch.
    const bkg = await createPendingBooking(ctx);

    // The new booking's ref must appear in the already-mounted bookings table.
    const row = page.locator('tbody tr').filter({ hasText: bkg.bookingRef });
    await expect(row).toBeVisible({ timeout: 10000 });
    await expect(row).toContainText(bkg.customerName);
  });
});
