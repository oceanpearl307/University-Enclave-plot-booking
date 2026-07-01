---
name: Admin API auth model
description: How auth is enforced across the Express /api/admin/* surface
---

The `/api/admin/*` surface is gated by a single Express middleware
(`app.use('/api/admin', ...)`) registered just before the admin route handlers.
It requires a valid session whose role is `admin` OR `operations`:
- no/invalid token → 401
- dealer (or any non-staff) token → 403
- admin / operations → passes the gate

**Why admin-OR-operations (not admin-only):** the Operations dashboard
legitimately calls many `/api/admin/*` routes (bookings, plots CRUD, staff,
customers, notifications). A blanket admin-only gate would break those. Finer
per-route checks still run on top of the baseline: `viewSession(privKeys)`,
`requireAdmin`, `staffManageSession`, and inline role/privilege checks. So a
low-privilege ops user passing the gate still gets 403 from the inner check on
admin-only routes that have one.

**Inner guards on content-management routes:** plots CRUD + bulk use
`viewSession(req,res,['manageInventory'])` (admin OR ops w/ that priv). Deals,
packages, sectors, and all dealer targets & meta routes (targets, deposit,
reward, generate-password, security, login-history, commission-payouts) are
`requireAdmin` only. Read-only staff (e.g. Sales Staff) get 403 on all of these.

**SSE exception:** `/api/admin/notifications/stream` is exempted in the
middleware (`req.path === '/notifications/stream'`) because `EventSource` can't
send an Authorization header — it authenticates via a `?token=` query param
inside its own handler.

**Client contract:** both `AdminDashboard.jsx` and `OperationsDashboard.jsx`
define an `aFetch(url, opts)` helper that injects `Authorization: Bearer <token>`.
Every admin call MUST go through `aFetch` (or otherwise send the header), or the
gate returns 401. All bare `fetch('/api/admin...')` calls were converted to
`aFetch`. If you add a new admin call, use `aFetch`, never bare `fetch`.
Note: `aFetch` has a capital F, so a `fetch(` search/replace won't touch it.
