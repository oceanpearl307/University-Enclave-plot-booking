---
name: Staff RBAC model
description: The four staff account types and where their permissions live
---

Four staff account types (in addition to dealers):

- **Super Admin** (`admin`) — every control.
- **Operations Manager** — view-only across all data + can assign Sales/Operations
  Staff roles. No approve/edit bookings, no inventory/content mutations.
- **Sales Staff** — read-only: plot inventory, dealers/targets, customers.
- **Operations Staff** — confirm (approve/reject) bookings + correct booking form data.

**Where it lives:**
- Server: `server/index.js` — `ROLE_PRESETS`, `blankPrivs()`, privilege keys
  (approveBookings, editBookings, viewLedger, viewPlots, manageInventory,
  viewDealers, viewDeals, viewRegistrations, viewCustomers, manageStaff,
  viewReports, exportData, manageAnnouncements). Operations accounts stored in the
  `operationsStaff` array; seeded idempotently via `rbacSeeded` flag persisted in db.
- Client: `client/src/pages/AdminDashboard.jsx` (admin assigns full privileges) and
  `client/src/pages/OperationsDashboard.jsx` (tab gating via PRIV_TABS anyOf; ops can
  also manage Sales/Operations Staff via the Staff tab when manageStaff is set).

**Why:** ROLE_PRESETS is duplicated on server and client. Keep them in sync — a
mismatch means the UI shows tabs the backend rejects (or vice versa).

**Anti-escalation rule (server staff CRUD):** managers can only create/edit
Sales Staff or Operations Staff (`ASSIGNABLE_BY_MANAGER`), get forced preset privs
(no manual escalation), and cannot modify or delete Operations Managers.
