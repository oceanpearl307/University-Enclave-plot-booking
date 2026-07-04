---
name: Finance dashboard sharing & RBAC
description: How the finance dashboard is shared across roles and how read vs write access is gated
---

# Finance dashboard sharing & RBAC

The finance dashboard UI lives in one component (`AccountsDashboard`) and is reused
by Super Admin and Operations Manager via an `embedded` prop (hides Logout, drops the
full-page `minHeight:100vh`/background/maxWidth wrapper). Embedded call sites must still
pass `onLogout` — the auth-expiry path calls it; use optional chaining as a safety net.

**Read vs write split:**
- Read finance endpoints (`/api/finance/*` overview/dealers/ledgers/installments/history) gate on `viewFinance`.
- Write endpoints (ledger generate, installment pay) gate on `manageLedger`.
- UI record-payment/regenerate controls are driven by `canManage = !!staff?.privileges?.manageLedger`.
- Presets: Accounts = viewFinance + manageLedger (full). Operations Manager = viewFinance only (read-only). Admin bypasses backend checks (isAdmin) but its user object has no `manageLedger`, so it renders read-only too.

**Why:** roles other than Accounts should *see* finances but not mutate them.

## Gotcha: seeding existing staff
`normalizeAndSeedStaff` in `server/index.js` only seeds new privileges when `!rbacSeeded`.
Once a DB is already seeded, changing a `ROLE_PRESETS` entry does NOT retroactively update
already-persisted staff. To grant a new privilege to an existing role you must add an
**idempotent backfill** loop that runs on every boot (mirrors the pattern used to seed the
`accounts1` demo account), then `saveDb()`.

**How to apply:** any time you add a privilege key to an existing role preset, add a backfill
that patches existing staff of that role, or existing users will silently lack the new access.
