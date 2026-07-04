import { test, expect, request as pwRequest } from '@playwright/test';

/**
 * Read-only embedded Finance dashboard coverage for Super Admin & Ops Manager.
 *
 * AccountsDashboard is reused (via the `embedded` prop) inside the Super Admin
 * panel's "Finance" tab and the Operations Manager's "Finance" tab. Both roles
 * hold viewFinance but NOT manageLedger, so they must:
 *
 *   1. See the Overview totals render as currency (never blank/NaN/undefined).
 *   2. Drill into a Client Ledger and see real data render.
 *   3. NEVER see the write controls — the per-installment "Record" buttons or
 *      the "Regenerate" ledger button (both gate on manageLedger / canManage).
 *
 * A regression could leave these roles staring at NaN totals, or — worse —
 * expose payment/ledger mutation controls they are not permitted to use.
 */

// ─── helpers ──────────────────────────────────────────────────────────────────

async function loginAsStaff(page, username, password) {
  await page.goto('/');
  await page.getByRole('button', { name: /Dealer Login/i }).click();
  await page.getByPlaceholder('Enter your username').fill(username);
  await page.getByPlaceholder('Enter your password').fill(password);
  await page.getByRole('button', { name: /Login to Dashboard/i }).click();
}

/** Log in via the public login endpoint and return the issued bearer token. */
async function apiLogin(ctx, username, password) {
  const res = await ctx.post('/api/dealer/login', { data: { username, password } });
  expect(res.status(), `login for ${username} should succeed`).toBe(200);
  const body = await res.json();
  expect(body.token, `login for ${username} should return a token`).toBeTruthy();
  return body.token;
}

const authHeader = (token) => ({ Authorization: `Bearer ${token}` });

/** Create a confirmed booking (as admin) so we own a known, findable ledger. */
async function createConfirmedBooking(ctx, adminToken) {
  const plotsRes = await ctx.get('/api/plots');
  expect(plotsRes.status()).toBe(200);
  const plots = await plotsRes.json();
  const available = plots.find(p => p.status === 'available');
  expect(available, 'need at least one available plot to book').toBeTruthy();

  const unique = Date.now();
  const customerName = `RO Buyer ${unique}`;
  const bookingRes = await ctx.post('/api/bookings', {
    data: {
      plotId: available.id,
      name: customerName,
      fatherName: 'Test Father',
      cnic: `35202-${unique.toString().slice(-7)}-1`,
      phone: '03001234567',
      email: `robuyer${unique}@example.com`,
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

// ─── shared assertions for the embedded (read-only) finance dashboard ──────────

/**
 * Open the embedded Finance dashboard from whatever staff panel we're on, then
 * verify Overview totals render and no write controls exist. Assumes we've just
 * logged in and the staff panel is mounted.
 */
async function assertReadOnlyFinance(page, booking) {
  // Open the "Finance" tab of the current staff panel. AdminDashboard renders a
  // plain "Finance" button; OperationsDashboard prefixes it with an icon
  // ("💵 Finance"), so match on a trailing "Finance" rather than exact text.
  await page.getByRole('button', { name: /(^|\s)Finance$/ }).first().click();

  // The embedded AccountsDashboard renders this exact heading in both panels.
  await expect(page.getByText('Accounts — Financial Control Center')).toBeVisible({ timeout: 10000 });

  // ── Overview: all four stat cards must render with currency, never NaN. ──
  for (const title of ['Total Sales', 'Payments Collected', 'Pending', 'Overdue']) {
    await expect(page.getByText(title, { exact: true })).toBeVisible();
  }
  const body = page.locator('body');
  await expect(body).toContainText('PKR');
  await expect(body).not.toContainText('NaN');
  await expect(body).not.toContainText('PKR undefined');

  // Overview must not expose the ledger "Regenerate" write control.
  await expect(page.getByRole('button', { name: /Regenerate/i })).toHaveCount(0);

  // ── Drill into a Client Ledger to reach where write controls would live. ──
  await page.getByRole('button', { name: /Client Ledgers/i }).click();
  await page.getByPlaceholder(/Search by name, ref, plot/i).fill(booking.bookingRef);
  const card = page.getByRole('button').filter({ hasText: booking.bookingRef });
  await expect(card).toBeVisible({ timeout: 10000 });
  await card.click();

  // Real ledger data must render (proves the read path works for this role).
  await expect(page.getByRole('heading', { name: booking.customerName })).toBeVisible({ timeout: 10000 });

  // The read-only role must NOT see any write controls in the ledger detail:
  //   - per-installment "Record" buttons
  //   - the "Regenerate" ledger button
  //   - the "Generate Ledger" button
  await expect(page.getByRole('button', { name: 'Record', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /Regenerate/i })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /Generate Ledger/i })).toHaveCount(0);
}

// ─── tests ──────────────────────────────────────────────────────────────────

test.describe('Embedded read-only Finance dashboard (Admin & Ops Manager)', () => {
  let ctx;
  let booking; // { id, customerName, bookingRef }

  test.beforeAll(async ({ baseURL }) => {
    ctx = await pwRequest.newContext({ baseURL });
    const adminToken = await apiLogin(ctx, 'admin', 'admin123');
    // Own our ledger data so the Client Ledgers list has a known, findable row.
    booking = await createConfirmedBooking(ctx, adminToken);
  });

  test.afterAll(async () => {
    await ctx.dispose();
  });

  test('Super Admin sees finance totals but no record/regenerate controls', async ({ page }) => {
    await loginAsStaff(page, 'admin', 'admin123');
    // Super Admin lands on the Admin panel.
    await expect(page.getByText('Admin Dashboard')).toBeVisible({ timeout: 10000 });

    await assertReadOnlyFinance(page, booking);
  });

  test('Operations Manager sees finance totals but no record/regenerate controls', async ({ page }) => {
    await loginAsStaff(page, 'manager1', 'manager123');
    // Operations Manager lands on the Staff Portal.
    await expect(page.getByText('Staff Portal')).toBeVisible({ timeout: 10000 });

    await assertReadOnlyFinance(page, booking);
  });
});
