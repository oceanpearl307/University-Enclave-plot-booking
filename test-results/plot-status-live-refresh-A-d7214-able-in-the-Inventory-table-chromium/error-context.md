# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: plot-status-live-refresh.spec.js >> Admin inventory reflects plot status after booking actions (no reload) >> delete → plot is released back to "available" in the Inventory table
- Location: tests/e2e/plot-status-live-refresh.spec.js:218:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByText('✅ Booking deleted — plot released.')
Expected: visible
Timeout: 10000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 10000ms
  - waiting for getByText('✅ Booking deleted — plot released.')

```

```yaml
- main:
  - text: 👑
  - heading "Admin Dashboard" [level=1]
  - paragraph:
    - text: Welcome,
    - strong: Admin User
  - button "🔊"
  - button "🗺️ View Plots"
  - button "Logout"
  - button "👥 Dealers"
  - button "📋 Registrations"
  - button "📩 Bookings 3"
  - button "📦 Packages"
  - button "🏘️ Inventory"
  - button "🏷️ Deals"
  - button "Finance"
  - button "⚙️ Staff"
  - button "🗄️ Backups"
  - button "📢 Announcements"
  - button "🧾 Receipt"
  - heading "Plot Bookings" [level=3]
  - paragraph: Click a row to view details. Approve, reject or delete bookings.
  - text: "All: 16 Pending: 3 Confirmed: 8 Rejected: 5 🔔 Recent Notifications 15 new"
  - button "🔊"
  - button "Mark all read"
  - text: New booking UE-1025 — UE-R25 by Live Refresh Buyer 1783417977797649 Walk-in · 7 Jul, 09:52 am
  - button "✓ Read"
  - text: New booking UE-1024 — UE-T80 by Live Refresh Buyer 1783417975073641 Walk-in · 7 Jul, 09:52 am
  - button "✓ Read"
  - text: New booking UE-1023 — UE-R32 by Live Refresh Buyer 1783417968827681 Walk-in · 7 Jul, 09:52 am
  - button "✓ Read"
  - text: New booking UE-1022 — UE-R192 by Live Refresh Buyer 1783417966789325 Walk-in · 7 Jul, 09:52 am
  - button "✓ Read"
  - text: New booking UE-1021 — UE-T73 by Live Refresh Buyer 1783417964474352 Walk-in · 7 Jul, 09:52 am
  - button "✓ Read"
  - text: New booking UE-1020 — UE-J87 by Live Refresh Buyer 1783417955093576 Walk-in · 7 Jul, 09:52 am
  - button "✓ Read"
  - text: New booking UE-1019 — UE-O71 by Live Refresh Buyer 1783417949071969 Walk-in · 7 Jul, 09:52 am
  - button "✓ Read"
  - text: New booking UE-1018 — UE-R225 by Live Refresh Buyer 1783417945506480 Walk-in · 7 Jul, 09:52 am
  - button "✓ Read"
  - text: New booking UE-1017 — UE-J119 by Live Refresh Buyer 1783417942508585 Walk-in · 7 Jul, 09:52 am
  - button "✓ Read"
  - text: New booking UE-1016 — UE-J38 by Live Refresh Buyer 1783417918892152 Walk-in · 7 Jul, 09:51 am
  - button "✓ Read"
  - textbox "🔍 Search by client name or CNIC...":
    - /placeholder: 🔍  Search by client name or CNIC...
    - text: Live Refresh Buyer 1783417975073641
  - table:
    - rowgroup:
      - row "Ref Buyer Plot Dealer Amount Commission Date Status Actions":
        - columnheader "Ref"
        - columnheader "Buyer"
        - columnheader "Plot"
        - columnheader "Dealer"
        - columnheader "Amount"
        - columnheader "Commission"
        - columnheader "Date"
        - columnheader "Status"
        - columnheader "Actions"
    - rowgroup:
      - row "UE-1024 Live Refresh Buyer 1783417975073641 35202-5073641-1 UE-T80 Walk-in PKR 4.4M — 7 Jul 2026 pending ✓ ✕ 🗑️":
        - cell "UE-1024"
        - cell "Live Refresh Buyer 1783417975073641 35202-5073641-1"
        - cell "UE-T80"
        - cell "Walk-in"
        - cell "PKR 4.4M"
        - cell "—"
        - cell "7 Jul 2026"
        - cell "pending"
        - cell "✓ ✕ 🗑️":
          - button "✓"
          - button "✕"
          - button "🗑️"
  - text: 🗑️
  - heading "Delete Booking" [level=3]
  - paragraph:
    - text: You are about to permanently delete booking
    - strong: UE-1024
    - text: for
    - strong: Live Refresh Buyer 1783417975073641
    - text: .
  - paragraph:
    - text: ⚠️ Plot
    - strong: UE-T80
    - text: will be released back to available.
  - button "Yes, Delete"
  - button "Cancel"
```

# Test source

```ts
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
  148 | }
  149 | 
  150 | /**
  151 |  * From the Admin dashboard, open the Inventory tab, filter to a single plot and
  152 |  * assert its status badge. Uses only in-app navigation — never a page reload.
  153 |  */
  154 | async function assertAdminPlotStatus(page, plotNumber, expectedStatus) {
  155 |   await page.getByRole('button', { name: /Inventory/i }).click();
  156 |   const search = page.getByPlaceholder('Search plot number…');
  157 |   await expect(search).toBeVisible({ timeout: 10000 });
  158 |   await search.fill(plotNumber);
  159 |   const row = page.locator('tbody tr').filter({ has: page.getByText(plotNumber, { exact: true }) });
  160 |   await expect(row.first()).toBeVisible({ timeout: 10000 });
  161 |   // Status text renders lowercase in the DOM (capitalized only via CSS).
  162 |   await expect(row.first()).toContainText(expectedStatus);
  163 | }
  164 | 
  165 | // ─── Admin: approve / reject / delete → inventory updates without reload ───────
  166 | 
  167 | test.describe('Admin inventory reflects plot status after booking actions (no reload)', () => {
  168 |   let ctx;
  169 | 
  170 |   test.beforeAll(async ({ baseURL }) => {
  171 |     ctx = await pwRequest.newContext({ baseURL });
  172 |   });
  173 | 
  174 |   test.afterAll(async () => {
  175 |     await ctx.dispose();
  176 |   });
  177 | 
  178 |   test('approve → plot shows "sold" in the Inventory table', async ({ page }) => {
  179 |     const bkg = await createPendingBooking(ctx);
  180 | 
  181 |     await loginAsStaff(page, 'admin', 'admin123');
  182 |     await expect(page.getByText('Admin Dashboard')).toBeVisible({ timeout: 10000 });
  183 | 
  184 |     await page.getByRole('button', { name: /Bookings/i }).click();
  185 |     await page.getByPlaceholder(/Search by client name or CNIC/i).fill(bkg.customerName);
  186 |     const row = page.locator('tbody tr').filter({ hasText: bkg.bookingRef });
  187 |     await expect(row).toBeVisible({ timeout: 10000 });
  188 | 
  189 |     // Approve via the in-row ✓ button.
  190 |     await row.getByRole('button', { name: '✓', exact: true }).click();
  191 |     await expect(page.getByText('✅ Booking approved.')).toBeVisible({ timeout: 10000 });
  192 | 
  193 |     // The plot must show "sold" in the Inventory tab without a browser reload.
  194 |     await assertAdminPlotStatus(page, bkg.plotNumber, 'sold');
  195 |   });
  196 | 
  197 |   test('reject → plot is released back to "available" in the Inventory table', async ({ page }) => {
  198 |     const bkg = await createPendingBooking(ctx);
  199 | 
  200 |     await loginAsStaff(page, 'admin', 'admin123');
  201 |     await expect(page.getByText('Admin Dashboard')).toBeVisible({ timeout: 10000 });
  202 | 
  203 |     await page.getByRole('button', { name: /Bookings/i }).click();
  204 |     await page.getByPlaceholder(/Search by client name or CNIC/i).fill(bkg.customerName);
  205 |     const row = page.locator('tbody tr').filter({ hasText: bkg.bookingRef });
  206 |     await expect(row).toBeVisible({ timeout: 10000 });
  207 | 
  208 |     // Reject via the in-row ✕ button → confirmation modal.
  209 |     await row.getByRole('button', { name: '✕', exact: true }).click();
  210 |     await expect(page.getByRole('heading', { name: 'Reject Booking' })).toBeVisible();
  211 |     await page.getByPlaceholder('Enter rejection reason...').fill('e2e reject');
  212 |     await page.getByRole('button', { name: 'Confirm Reject' }).click();
  213 |     await expect(page.getByText('✅ Booking rejected.')).toBeVisible({ timeout: 10000 });
  214 | 
  215 |     await assertAdminPlotStatus(page, bkg.plotNumber, 'available');
  216 |   });
  217 | 
  218 |   test('delete → plot is released back to "available" in the Inventory table', async ({ page }) => {
  219 |     const bkg = await createPendingBooking(ctx);
  220 | 
  221 |     await loginAsStaff(page, 'admin', 'admin123');
  222 |     await expect(page.getByText('Admin Dashboard')).toBeVisible({ timeout: 10000 });
  223 | 
  224 |     await page.getByRole('button', { name: /Bookings/i }).click();
  225 |     await page.getByPlaceholder(/Search by client name or CNIC/i).fill(bkg.customerName);
  226 |     const row = page.locator('tbody tr').filter({ hasText: bkg.bookingRef });
  227 |     await expect(row).toBeVisible({ timeout: 10000 });
  228 | 
  229 |     // Delete via the in-row 🗑️ button → confirmation modal.
  230 |     await row.getByRole('button', { name: '🗑️' }).click();
  231 |     await page.getByRole('button', { name: 'Yes, Delete' }).click();
> 232 |     await expect(page.getByText('✅ Booking deleted — plot released.')).toBeVisible({ timeout: 10000 });
      |                                                                        ^ Error: expect(locator).toBeVisible() failed
  233 | 
  234 |     await assertAdminPlotStatus(page, bkg.plotNumber, 'available');
  235 |   });
  236 | });
  237 | 
  238 | // ─── Operations Staff approve / reject flow ───────────────────────────────────
  239 | //
  240 | // NOTE: the default Operations Staff role (ops1) has approveBookings but NOT
  241 | // viewPlots, so it has no Plots tab to inspect. These tests assert the booking
  242 | // row updates live in the ops bookings table (no reload) and confirm the plot
  243 | // transition server-side. The Ops-facing Plots-table refresh itself is covered
  244 | // by the "Operations staff with plot visibility" describe below, which
  245 | // provisions a combined approve+viewPlots account.
  246 | 
  247 | test.describe('Operations Staff approve/reject flow updates booking + plot', () => {
  248 |   let ctx;
  249 | 
  250 |   test.beforeAll(async ({ baseURL }) => {
  251 |     ctx = await pwRequest.newContext({ baseURL });
  252 |   });
  253 | 
  254 |   test.afterAll(async () => {
  255 |     await ctx.dispose();
  256 |   });
  257 | 
  258 |   test('approve → booking goes "confirmed" live and the plot becomes "sold"', async ({ page }) => {
  259 |     const bkg = await createPendingBooking(ctx);
  260 | 
  261 |     await loginAsStaff(page, 'ops1', 'ops123');
  262 |     await expect(page.getByText('Staff Portal')).toBeVisible({ timeout: 10000 });
  263 |     await expect(page.getByRole('heading', { name: 'Plot Bookings' })).toBeVisible({ timeout: 10000 });
  264 | 
  265 |     const row = page.locator('tbody tr').filter({ hasText: bkg.bookingRef });
  266 |     await expect(row).toBeVisible({ timeout: 10000 });
  267 |     await row.getByRole('button', { name: '✓', exact: true }).click();
  268 |     await expect(page.getByText('✅ Booking approved — plot marked as sold.')).toBeVisible({ timeout: 10000 });
  269 | 
  270 |     // A receipt modal opens after approval — dismiss it.
  271 |     await page.getByRole('button', { name: '✕ Close' }).click();
  272 | 
  273 |     // The bookings table refreshes live — the row now shows "confirmed", no reload.
  274 |     await expect(page.locator('tbody tr').filter({ hasText: bkg.bookingRef })).toContainText('confirmed', { timeout: 10000 });
  275 | 
  276 |     // The server moved the plot to "sold".
  277 |     const plot = await (await ctx.get(`/api/plots/${bkg.plotId}`)).json();
  278 |     expect(plot.status).toBe('sold');
  279 |   });
  280 | 
  281 |   test('reject → booking goes "rejected" live and the plot returns to "available"', async ({ page }) => {
  282 |     const bkg = await createPendingBooking(ctx);
  283 | 
  284 |     await loginAsStaff(page, 'ops1', 'ops123');
  285 |     await expect(page.getByText('Staff Portal')).toBeVisible({ timeout: 10000 });
  286 |     await expect(page.getByRole('heading', { name: 'Plot Bookings' })).toBeVisible({ timeout: 10000 });
  287 | 
  288 |     const row = page.locator('tbody tr').filter({ hasText: bkg.bookingRef });
  289 |     await expect(row).toBeVisible({ timeout: 10000 });
  290 |     await row.getByRole('button', { name: '✕', exact: true }).click();
  291 | 
  292 |     // Reject confirmation modal.
  293 |     await expect(page.getByRole('heading', { name: 'Reject Booking' })).toBeVisible();
  294 |     const reason = page.getByPlaceholder(/reason/i);
  295 |     if (await reason.count()) await reason.first().fill('e2e reject');
  296 |     await page.getByRole('button', { name: /Confirm Reject|Reject Booking/i }).last().click();
  297 |     await expect(page.getByText('✅ Booking rejected — plot is now available again.')).toBeVisible({ timeout: 10000 });
  298 | 
  299 |     // The bookings table refreshes live — the row now shows "rejected", no reload.
  300 |     await expect(page.locator('tbody tr').filter({ hasText: bkg.bookingRef })).toContainText('rejected', { timeout: 10000 });
  301 | 
  302 |     // The server released the plot back to "available".
  303 |     const plot = await (await ctx.get(`/api/plots/${bkg.plotId}`)).json();
  304 |     expect(plot.status).toBe('available');
  305 |   });
  306 | });
  307 | 
  308 | // ─── Operations staff WITH plot visibility → Plots table updates (no reload) ──
  309 | //
  310 | // Closes the coverage gap noted above: provisions a staff account that has BOTH
  311 | // approveBookings and viewPlots, actions a booking, then asserts the Ops-facing
  312 | // Plots table flips the plot's status with no browser reload — only in-app SPA
  313 | // navigation between the Bookings and Plots tabs.
  314 | 
  315 | test.describe('Operations staff with plot visibility see Plots table update after actions', () => {
  316 |   let ctx;
  317 |   let creds;
  318 | 
  319 |   test.beforeAll(async ({ baseURL }) => {
  320 |     ctx = await pwRequest.newContext({ baseURL });
  321 |     creds = await provisionOpsWithPlots(ctx);
  322 |   });
  323 | 
  324 |   test.afterAll(async () => {
  325 |     await ctx.dispose();
  326 |   });
  327 | 
  328 |   test('approve → plot shows "sold" in the Ops Plots table', async ({ page }) => {
  329 |     const bkg = await createPendingBooking(ctx);
  330 | 
  331 |     await loginAsStaff(page, creds.username, creds.password);
  332 |     await expect(page.getByText('Staff Portal')).toBeVisible({ timeout: 10000 });
```