---
name: Admin API auth model
description: How auth is (and isn't) enforced across the Express /api/admin/* surface
---

Most `/api/admin/*` endpoints in `server/index.js` have **no auth check at all** —
they accept any request (mutations included: plots, deals, packages, targets,
booking delete, etc.). This is a pre-existing condition of the app, not specific to
any one role.

**Why it's wired this way:** `AdminDashboard.jsx` calls many of these endpoints with
plain `fetch` (no Authorization header). It does have an `aFetch` helper that adds
the admin bearer token, but only some calls use it (e.g. sectors GET); many
mutations and detail GETs (sector delete, notifications, commission-payouts,
login-history, dealer security) use bare `fetch`.

**How to apply:** If you ever lock down the admin surface (e.g. central `requireAdmin`
middleware on `/api/admin/*`), you MUST first convert every bare `fetch` in
`AdminDashboard.jsx` to the authenticated `aFetch`, or the admin UI breaks with 401s.
That conversion is a sizable, app-wide change — treat it as its own task, not a
drive-by fix.

Read endpoints that staff roles must reach use the `viewSession(req, res, privKeys)`
helper (admin OR operations-with-any-of-privKeys). It currently gates GET
`/api/admin/dealers` (viewDealers), `/api/admin/deals` (viewDeals),
`/api/admin/registrations` (viewRegistrations).
