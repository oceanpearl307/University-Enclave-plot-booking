---
name: Session lifetime & revocation
description: How in-memory auth sessions expire and are revoked server-side
---

Server auth sessions (`server/index.js` `sessions` map) carry `issuedAt`/`expiresAt`
and are created via `createSession(token, data)`, read via `getSession(token)`
(evicts on expiry), and removed via `revokeSession(token)`. All reads go through
these helpers — `validateSession(req)`, the notifications SSE stream, and the
exchange-asset patch — so expiry/revocation is enforced everywhere.

**Sessions slide on activity:** `SESSION_TTL_MS` (default 12h) is an *idle*
timeout — `getSession` renews `expiresAt` to `now + SESSION_TTL_MS` on every
successful lookup (i.e. every authenticated request), capped by a per-session
`maxExpiresAt` = login + `SESSION_MAX_TTL_MS` (absolute lifetime, default 24h,
env-configurable, floored to never be below the idle TTL). So active users stay
signed in while idle sessions still lapse on the base TTL, and even a
continuously-warm token is eventually forced to re-auth at the hard cap.
`SERVER_PORT` (default 3001) is also env-configurable so tests can boot an
isolated instance.

**Why:** tokens previously lived forever until server restart. Logout now hits
`POST /api/auth/logout` (client `handleLogout` in `App.jsx`) for real server-side
revocation, not just localStorage clearing.

**How to apply / testing:** to test real expiry without waiting hours, spawn the
server with a tiny `SESSION_TTL_MS` on a spare `SERVER_PORT` and hit the API
directly (see `tests/e2e/session-expiry.spec.js`). Keep new session-token reads
routed through `getSession`, never raw `sessions[token]`.
