# University Enclave Plot Booking

A web application for booking residential and commercial plots in University Enclave Housing Society.

## Architecture

- **Frontend**: React 19 + Vite (served on port 5000)
- **Backend**: Express.js (served on port 3001, all data in-memory)
- **Runtime**: Node.js 20
- **Charts**: Recharts

## Project Structure

```
├── client/
│   └── src/
│       ├── App.jsx                         # Routing & auth state
│       ├── components/
│       │   ├── Navbar.jsx
│       │   ├── DealerLoginModal.jsx
│       │   ├── DealerRegisterModal.jsx     # Public dealer registration form
│       │   └── SignUpModal.jsx
│       └── pages/
│           ├── Home.jsx                    # Landing page
│           ├── Plots.jsx
│           ├── BookingForm.jsx
│           ├── BookingStatus.jsx
│           ├── About.jsx
│           ├── DealerDashboard.jsx         # Per-dealer stats, target, deals
│           └── AdminDashboard.jsx          # 5-tab admin panel
├── server/
│   └── index.js                            # Express API — all data in-memory
├── vite.config.js
└── package.json
```

## Default Logins

| Role                | Username  | Password    |
|---------------------|-----------|-------------|
| Super Admin         | admin     | admin123    |
| Dealer              | dealer1   | dealer123   |
| Dealer              | dealer2   | dealer456   |
| Dealer              | dealer3   | dealer789   |
| Operations Manager  | manager1  | manager123  |
| Sales Staff         | sales1    | sales123    |
| Operations Staff    | ops1      | ops123      |
| Accounts            | accounts1 | accounts123 |

### Staff Roles & Permissions

- **Super Admin** — full control over every panel and action, including a **read-only Finance dashboard** tab (same views as Accounts).
- **Operations Manager** — view-only across all data (inventory, dealers/targets, deals, registrations, customers, ledger, reports, export) plus a **read-only Finance dashboard** (overview, dealer sales, client ledgers, installments, payment history) and the ability to assign Sales Staff and Operations Staff roles. Cannot approve/edit bookings, manage inventory, or record payments.
- **Sales Staff** — read-only view of plot inventory, dealers/targets, and customer records.
- **Operations Staff** — confirm (approve/reject) bookings and correct booking form data.
- **Accounts** — full financial dashboard: overview totals + revenue chart, dealer sales & commission, client ledger drill-down, consolidated installments feed with filters, payment history, plus record-payment and regenerate-ledger actions. Payments are recorded by **payment mode** (bank / cheque / cash / commodity) against the correct account head; bank/cheque capture a reference, commodity captures a description + market-agreed value. Assignable by Super Admin only.

## Features

### Public
- Browse residential and commercial plots with filtering
- Book available plots
- Check booking status
- Live stats on home page
- **"Become a Dealer" form** — 2-step registration form with all business details

### Dealer Portal
- Per-dealer analytics dashboard (bookings, payments, monthly charts)
- **Package info** displayed (Normal/Premium)
- **Security deposit status** badge
- **Target breakdown** by plot size
- **Reward banner** when target is 100% complete (from admin-defined reward)
- **Active deals** section showing current special offers with "Book Now" buttons

### Admin Panel (5 tabs)
1. **Dealers** — Team overview chart, dealer table with package/deposit/reward columns, assign target panel with package dropdown + security deposit toggle
2. **Registrations** — Review pending dealer registration requests, approve and create login credentials
3. **Packages** — Create/edit packages (Normal: 25 plots, Premium: 50 plots) with per-size quotas and reward definitions
4. **Inventory** — Full CRUD on plot inventory (add/edit/delete plots)
5. **Deals** — Create/edit time-limited special offers with plot selection, special pricing, and payment plan info

## API Endpoints

### Public
- `GET /api/stats` — overall plot counts
- `GET /api/plots` — list plots (with filters)
- `GET /api/plots/:id`
- `GET /api/announcements`
- `GET /api/deals` — active deals only
- `POST /api/bookings`
- `GET /api/bookings/:ref`
- `POST /api/customers/register`
- `POST /api/dealer/login`
- `POST /api/dealer/register` — submit dealer registration request

### Dealer
- `GET /api/dealer/dashboard/:dealerId` — full dashboard data

### Finance (Accounts role — `viewFinance` / `manageLedger`)
- `GET /api/finance/overview` — totals (sales, collected, pending, overdue) + monthly revenue trend
- `GET /api/finance/dealers` — per-dealer sales & commission summary
- `GET /api/finance/ledgers` — confirmed bookings with ledger summaries
- `GET /api/finance/installments` — consolidated installments feed
- `GET /api/finance/history` — chronological payment history
- `POST /api/finance/ledger/:bookingId/generate` — (re)generate a booking's ledger (preserves paid items)
- `GET /api/ledger/:bookingId` and `POST /api/ledger/:bookingId/:installmentId/pay` also accept Accounts staff. The pay endpoint accepts `paymentMode` (bank|cheque|cash|commodity); bank/cheque require `paymentRef`, commodity requires `commodityDescription` + `agreedValue`. Mode + reference are surfaced in the installments feed, payment history, and CSV exports.

### Admin
- `GET/POST /api/admin/dealers` + `/api/admin/dealers/:id/deposit` + `/api/admin/dealers/:id/reward`
- `GET/POST /api/admin/targets/:dealerId`
- `GET /api/admin/registrations` + `POST /api/admin/registrations/:id/approve`
- `GET/POST/PUT/DELETE /api/admin/packages`
- `POST/PUT/DELETE /api/admin/plots`
- `GET/POST/PUT/DELETE /api/admin/deals`

## Running the App

```bash
npm run dev       # Starts both frontend (port 5000) and backend (port 3001)
```
