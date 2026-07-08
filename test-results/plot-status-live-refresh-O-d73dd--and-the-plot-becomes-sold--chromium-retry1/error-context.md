# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: plot-status-live-refresh.spec.js >> Operations Staff approve/reject flow updates booking + plot >> approve → booking goes "confirmed" live and the plot becomes "sold"
- Location: tests/e2e/plot-status-live-refresh.spec.js:258:7

# Error details

```
Error: apiRequestContext.get: connect EAFNOSUPPORT ::1:5000 - Local (undefined:undefined)
Call log:
  - → GET http://localhost:5000/api/plots
    - user-agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.7827.55 Safari/537.36
    - accept: */*
    - accept-encoding: gzip,deflate,br

```

# Test source

```ts
  1   | import { test, expect, request as pwRequest } from '@playwright/test';
  2   | 
  3   | // These flows drive the full React dashboards, which render a large plot
  4   | // inventory (hundreds of rows) on every tab switch. Give each test extra
  5   | // headroom beyond the 30s global default so heavy renders don't flake.
  6   | test.describe.configure({ timeout: 60000 });
  7   | 
  8   | /**
  9   |  * Regression coverage for live plot-status refresh after booking actions.
  10  |  *
  11  |  * A bug once left the Admin and Operations inventory/plots tables showing stale
  12  |  * plot statuses after a booking action, because those handlers re-fetched the
  13  |  * bookings list but never re-fetched the plot inventory:
  14  |  *   - approve  → plot becomes "sold"
  15  |  *   - reject   → plot released to "available"
  16  |  *   - delete   → plot released to "available"
  17  |  * The Operations live new-booking SSE stream had a parallel gap: a newly created
  18  |  * booking never surfaced without a manual reload.
  19  |  *
  20  |  * These tests lock in the user-visible contract end-to-end (no page reload —
  21  |  * only in-app SPA navigation between tabs):
  22  |  *   1. Admin approve/reject/delete → the Inventory table reflects the new plot
  23  |  *      status (sold / available) without a browser reload.
  24  |  *   2. Operations Staff approve/reject → the Plots table reflects the new status.
  25  |  *   3. The Operations live new-booking stream surfaces a freshly created booking
  26  |  *      in the bookings table without any reload or tab switch.
  27  |  */
  28  | 
  29  | // ─── API helpers ──────────────────────────────────────────────────────────────
  30  | 
  31  | async function apiLogin(ctx, username, password) {
  32  |   const res = await ctx.post('/api/dealer/login', { data: { username, password } });
  33  |   expect(res.status(), `login for ${username} should succeed`).toBe(200);
  34  |   const body = await res.json();
  35  |   expect(body.token, `login for ${username} should return a token`).toBeTruthy();
  36  |   return body.token;
  37  | }
  38  | 
  39  | const authHeader = (token) => ({ Authorization: `Bearer ${token}` });
  40  | 
  41  | /**
  42  |  * Create a pending booking on a random available plot and confirm the server
  43  |  * moved that plot to "booked". Returns { id, bookingRef, plotId, plotNumber,
  44  |  * customerName }. The unique customerName lets the UI filter down to this one row.
  45  |  */
  46  | async function createPendingBooking(ctx) {
> 47  |   const plotsRes = await ctx.get('/api/plots');
      |                              ^ Error: apiRequestContext.get: connect EAFNOSUPPORT ::1:5000 - Local (undefined:undefined)
  48  |   expect(plotsRes.status()).toBe(200);
  49  |   const plots = await plotsRes.json();
  50  |   const availablePlots = plots.filter(p => p.status === 'available');
  51  |   expect(availablePlots.length, 'need at least one available plot to book').toBeGreaterThan(0);
  52  |   // Pick a random available plot to reduce collisions across parallel test runs.
  53  |   const plot = availablePlots[Math.floor(Math.random() * availablePlots.length)];
  54  | 
  55  |   const unique = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  56  |   const customerName = `Live Refresh Buyer ${unique}`;
  57  |   const bookingRes = await ctx.post('/api/bookings', {
  58  |     data: {
  59  |       plotId: plot.id,
  60  |       name: customerName,
  61  |       fatherName: 'Test Father',
  62  |       cnic: `35202-${unique.slice(-7)}-1`,
  63  |       phone: '03001234567',
  64  |       email: `buyer${unique}@example.com`,
  65  |       residentialAddress: '123 Test Street',
  66  |       postalAddress: '123 Test Street',
  67  |       photo: 'data:image/png;base64,TEST',
  68  |       nomineeName: 'Test Nominee',
  69  |       nomineeFatherName: 'Nominee Father',
  70  |       nomineeCnic: `35202-${unique.slice(-7)}-2`,
  71  |       nomineeRelation: 'Brother',
  72  |       nomineePhone: '03007654321',
  73  |       nomineeAddress: '123 Test Street',
  74  |       downPayment: 500000,
  75  |     },
  76  |   });
  77  |   expect(bookingRes.status(), 'booking creation should succeed').toBe(201);
  78  |   const booking = await bookingRes.json();
  79  | 
  80  |   // The plot must now be "booked" — this is what makes the later
  81  |   // "available" assertions after reject/delete meaningful (a real transition).
  82  |   const afterRes = await ctx.get(`/api/plots/${plot.id}`);
  83  |   expect(afterRes.status()).toBe(200);
  84  |   const afterPlot = await afterRes.json();
  85  |   expect(afterPlot.status, 'creating a booking should mark the plot booked').toBe('booked');
  86  | 
  87  |   return {
  88  |     id: booking.id,
  89  |     bookingRef: booking.bookingRef,
  90  |     plotId: plot.id,
  91  |     plotNumber: plot.number,
  92  |     customerName,
  93  |   };
  94  | }
  95  | 
  96  | // ─── UI helpers ───────────────────────────────────────────────────────────────
  97  | 
  98  | async function loginAsStaff(page, username, password) {
  99  |   await page.goto('/');
  100 |   await page.getByRole('button', { name: /Dealer Login/i }).click();
  101 |   await page.getByPlaceholder('Enter your username').fill(username);
  102 |   await page.getByPlaceholder('Enter your password').fill(password);
  103 |   await page.getByRole('button', { name: /Login to Dashboard/i }).click();
  104 | }
  105 | 
  106 | /**
  107 |  * Provision an Operations Staff account that has BOTH approve rights and plot
  108 |  * visibility. No default staff role combines these (ops1 approves but has no
  109 |  * Plots tab; manager1 sees plots but cannot approve), so we create one via the
  110 |  * admin staff API with custom privileges. Only the Super Admin may set custom
  111 |  * privileges — an Operations Manager is forced onto role presets.
  112 |  * Returns { username, password } for a fresh, uniquely-named account.
  113 |  */
  114 | async function provisionOpsWithPlots(ctx) {
  115 |   const adminToken = await apiLogin(ctx, 'admin', 'admin123');
  116 |   const unique = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  117 |   const username = `opsplots${unique}`;
  118 |   const password = 'opsplots123';
  119 |   const res = await ctx.post('/api/admin/staff', {
  120 |     headers: authHeader(adminToken),
  121 |     data: {
  122 |       username,
  123 |       password,
  124 |       name: `Ops Plots Tester ${unique}`,
  125 |       staffRole: 'Operations Staff',
  126 |       privileges: { approveBookings: true, editBookings: true, viewPlots: true },
  127 |     },
  128 |   });
  129 |   expect(res.status(), 'admin should create a combined approve+viewPlots staff account').toBe(201);
  130 |   const staff = await res.json();
  131 |   expect(staff.privileges.approveBookings, 'account must be able to approve').toBe(true);
  132 |   expect(staff.privileges.viewPlots, 'account must be able to view plots').toBe(true);
  133 |   return { username, password };
  134 | }
  135 | 
  136 | /**
  137 |  * From the Operations dashboard, open the Plots tab and assert a single plot's
  138 |  * status badge. The Ops Plots table has no search box, so we locate the row by
  139 |  * its (unique) plot number. Uses only in-app navigation — never a page reload.
  140 |  */
  141 | async function assertOpsPlotStatus(page, plotNumber, expectedStatus) {
  142 |   await page.getByRole('button', { name: /🏘️ Plots/ }).click();
  143 |   await expect(page.getByRole('heading', { name: 'Plot Inventory' })).toBeVisible({ timeout: 10000 });
  144 |   const row = page.locator('tbody tr').filter({ has: page.getByText(plotNumber, { exact: true }) });
  145 |   await expect(row.first()).toBeVisible({ timeout: 10000 });
  146 |   // Status text renders lowercase in the DOM (capitalized only via CSS).
  147 |   await expect(row.first()).toContainText(expectedStatus);
```