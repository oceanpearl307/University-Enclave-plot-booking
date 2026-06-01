const express = require('express');
const cors = require('cors');
const path = require('path');
const http = require('http');

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.set('trust proxy', true);

// ─── Utility: IP helpers ──────────────────────────────────────────────────────
function getClientIP(req) {
  const fwd = req.headers['x-forwarded-for'];
  if (fwd) return fwd.split(',')[0].trim();
  return req.socket?.remoteAddress || req.ip || 'unknown';
}

async function checkVPN(ip) {
  if (!ip || ip === 'unknown' || ip === '127.0.0.1' || ip === '::1' || /^(10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.)/.test(ip)) {
    return { isVpn: false, isp: 'Local/Private', country: 'Local' };
  }
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 3000);
    const r = await fetch(`http://ip-api.com/json/${ip}?fields=status,country,isp,org,proxy,hosting`, { signal: ctrl.signal });
    clearTimeout(t);
    const d = await r.json();
    return { isVpn: !!(d.proxy || d.hosting), isp: d.isp || d.org || 'Unknown', country: d.country || 'Unknown' };
  } catch { return { isVpn: false, isp: 'Unknown', country: 'Unknown', checkFailed: true }; }
}

function generatePassword() {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lower = 'abcdefghjkmnpqrstuvwxyz';
  const digits = '23456789';
  const special = '!@#$%&*';
  const all = upper + lower + digits + special;
  let pwd = upper[Math.floor(Math.random() * upper.length)] + lower[Math.floor(Math.random() * lower.length)] + digits[Math.floor(Math.random() * digits.length)] + special[Math.floor(Math.random() * special.length)];
  for (let i = 4; i < 12; i++) pwd += all[Math.floor(Math.random() * all.length)];
  return pwd.split('').sort(() => Math.random() - 0.5).join('');
}

function recordLogin(dealer, ip, extra) {
  if (!dealer.loginHistory) dealer.loginHistory = [];
  dealer.loginHistory.unshift({ ip, at: new Date().toISOString(), ...extra });
  if (dealer.loginHistory.length > 30) dealer.loginHistory = dealer.loginHistory.slice(0, 30);
  dealer.lastLoginIP = ip;
  dealer.lastLoginAt = new Date().toISOString();
}

// ─── Sectors ─────────────────────────────────────────────────────────────────
let sectors = [
  { id: 1, name: 'Block A', type: 'residential', description: 'Main residential block near the entrance', totalPlots: 0, createdAt: '2026-01-01T00:00:00.000Z' },
  { id: 2, name: 'Block B', type: 'residential', description: 'Quiet residential area near the mosque', totalPlots: 0, createdAt: '2026-01-01T00:00:00.000Z' },
  { id: 3, name: 'Block C', type: 'residential', description: 'Elevated block with community center', totalPlots: 0, createdAt: '2026-01-01T00:00:00.000Z' },
  { id: 4, name: 'Block D', type: 'commercial', description: 'Commercial zone near main boulevard', totalPlots: 0, createdAt: '2026-01-01T00:00:00.000Z' },
];
let sectorCounter = 4;

// ─── Plot Inventory ──────────────────────────────────────────────────────────
// ─── Premium Tag Pricing ──────────────────────────────────────────────────────
const TAG_PREMIUMS = { 'Corner Plot': 0.10, 'Park Facing': 0.10, 'Main Road': 0.10, 'Main Boulevard': 0.15 };
const PREMIUM_TAGS = Object.keys(TAG_PREMIUMS);
const computeEffectivePrice = (basePrice, tags = []) =>
  Math.round(basePrice * (1 + (tags || []).reduce((s, t) => s + (TAG_PREMIUMS[t] || 0), 0)));
const withEffectivePrice = p => ({ ...p, effectivePrice: computeEffectivePrice(p.price, p.tags), tags: p.tags || [] });

let plots = [
  { id: 1, number: 'A-101', size: '5 Marla', price: 2500000, status: 'available', category: 'residential', description: 'Corner plot with park facing, excellent location', area: 'Block A', tags: ['Corner Plot', 'Park Facing'] },
  { id: 2, number: 'A-102', size: '7 Marla', price: 3500000, status: 'booked', category: 'residential', description: 'Prime location near main gate', area: 'Block A', tags: [] },
  { id: 3, number: 'A-103', size: '10 Marla', price: 5000000, status: 'available', category: 'residential', description: 'Spacious plot with green belt view', area: 'Block A', tags: [] },
  { id: 4, number: 'B-201', size: '5 Marla', price: 2200000, status: 'available', category: 'residential', description: 'Quiet neighborhood, near mosque', area: 'Block B', tags: [] },
  { id: 5, number: 'B-202', size: '7 Marla', price: 3200000, status: 'sold', category: 'residential', description: 'Boulevard facing plot', area: 'Block B', tags: ['Main Boulevard'] },
  { id: 6, number: 'B-203', size: '1 Kanal', price: 9000000, status: 'available', category: 'residential', description: 'Large plot, ideal for luxury home', area: 'Block B', tags: [] },
  { id: 7, number: 'C-301', size: '5 Marla', price: 2800000, status: 'available', category: 'residential', description: 'Near community center, on main road', area: 'Block C', tags: ['Main Road'] },
  { id: 8, number: 'C-302', size: '10 Marla', price: 5500000, status: 'available', category: 'residential', description: 'Elevated corner plot with great view', area: 'Block C', tags: ['Corner Plot'] },
  { id: 9, number: 'D-401', size: '2 Kanal', price: 18000000, status: 'available', category: 'commercial', description: 'Prime commercial plot on main boulevard', area: 'Block D', tags: ['Main Boulevard'] },
  { id: 10, number: 'D-402', size: '4 Marla', price: 4000000, status: 'booked', category: 'commercial', description: 'Shop-facing commercial plot on main road', area: 'Block D', tags: ['Main Road'] },
];
let plotCounter = 10;

// ─── Packages ────────────────────────────────────────────────────────────────
let packages = [
  {
    id: 1, name: 'Normal Package', totalPlots: 25,
    sizes: [
      { size: '5 Marla', quota: 10 },
      { size: '7 Marla', quota: 8 },
      { size: '10 Marla', quota: 5 },
      { size: '1 Kanal', quota: 2 },
    ],
    rewardDescription: 'Umrah trip for 2 persons + PKR 50,000 cash bonus',
    rewardAmount: 50000,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 2, name: 'Premium Package', totalPlots: 50,
    sizes: [
      { size: '5 Marla', quota: 20 },
      { size: '7 Marla', quota: 15 },
      { size: '10 Marla', quota: 10 },
      { size: '1 Kanal', quota: 5 },
    ],
    rewardDescription: 'Luxury car (Honda Civic) + international trip for 2',
    rewardAmount: 1500000,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
];
let packageCounter = 2;

// ─── Dealers ─────────────────────────────────────────────────────────────────
let dealers = [
  { id: 1, username: 'admin', password: 'admin123', name: 'Admin User', role: 'admin' },
  {
    id: 2, username: 'dealer1', password: 'dealer123', name: 'Ahmed Raza', role: 'dealer',
    fatherName: 'Muhammad Raza', cnic: '35201-1234567-1',
    postalAddress: 'House 12, Street 3, Model Town, Lahore',
    officeAddress: 'Shop 5, Gulberg III, Lahore',
    mobilePhone: '0321-1234567', officePhone: '042-35111111',
    proprietorName: 'Ahmed Raza', proprietorPhone: '0321-1234567',
    securityDepositRequired: 200000, securityDepositPaid: true, rewardGiven: false,
    vpnRestricted: false, ipLocked: false, trustedIPs: [], loginHistory: [],
  },
  {
    id: 3, username: 'dealer2', password: 'dealer456', name: 'Sara Khan', role: 'dealer',
    fatherName: 'Iqbal Khan', cnic: '35201-7654321-2',
    postalAddress: 'Flat 8B, DHA Phase 5, Lahore',
    officeAddress: 'Office 2, Liberty Market, Lahore',
    mobilePhone: '0312-7654321', officePhone: '042-35222222',
    proprietorName: 'Sara Khan', proprietorPhone: '0312-7654321',
    securityDepositRequired: 200000, securityDepositPaid: false, rewardGiven: false,
    vpnRestricted: false, ipLocked: false, trustedIPs: [], loginHistory: [],
  },
  {
    id: 4, username: 'dealer3', password: 'dealer789', name: 'Usman Ali', role: 'dealer',
    fatherName: 'Ali Hassan', cnic: '35201-1111111-3',
    postalAddress: 'House 3, Johar Town, Lahore',
    officeAddress: 'Plot 7, Wapda Town, Lahore',
    mobilePhone: '0333-1111111', officePhone: '042-35333333',
    proprietorName: 'Usman Ali', proprietorPhone: '0333-1111111',
    securityDepositRequired: 200000, securityDepositPaid: false, rewardGiven: false,
    vpnRestricted: false, ipLocked: false, trustedIPs: [], loginHistory: [],
  },
];
let dealerCounter = 4;

// ─── Dealer Targets ──────────────────────────────────────────────────────────
let dealerTargets = {
  2: {
    dealerId: 2, packageId: 1,
    paymentTarget: 18000000,
    sizes: [
      { size: '5 Marla', target: 3 },
      { size: '7 Marla', target: 2 },
      { size: '10 Marla', target: 1 },
      { size: '1 Kanal', target: 1 },
    ],
    assignedAt: '2026-04-01T00:00:00.000Z',
    notes: 'Q2 2026 Sales Target',
  },
  3: {
    dealerId: 3, packageId: 1,
    paymentTarget: 12000000,
    sizes: [
      { size: '5 Marla', target: 2 },
      { size: '7 Marla', target: 3 },
      { size: '10 Marla', target: 0 },
      { size: '1 Kanal', target: 0 },
    ],
    assignedAt: '2026-04-01T00:00:00.000Z',
    notes: 'Q2 2026 Sales Target',
  },
};

// ─── Dealer Registrations ─────────────────────────────────────────────────────
let dealerRegistrations = [
  {
    id: 1, regRef: 'UEREG-001',
    name: 'Kamran Akhtar', fatherName: 'Muhammad Akhtar',
    cnic: '35201-9876543-1',
    postalAddress: 'House 5, Street 3, Model Town, Lahore',
    officeAddress: 'Office 12, Gulberg III, Lahore',
    mobilePhone: '0321-9876543', officePhone: '042-35123456',
    proprietorName: 'Kamran Akhtar', proprietorPhone: '0321-9876543',
    status: 'pending', createdAt: '2026-04-22T10:00:00.000Z',
  },
  {
    id: 2, regRef: 'UEREG-002',
    name: 'Fatima Malik', fatherName: 'Asif Malik',
    cnic: '35201-5551234-2',
    postalAddress: 'Flat 3A, Bahria Town, Lahore',
    officeAddress: 'Shop 15, Main Market, Gulshan-e-Ravi, Lahore',
    mobilePhone: '0300-5551234', officePhone: '042-35999999',
    proprietorName: 'Fatima Malik', proprietorPhone: '0300-5551234',
    status: 'pending', createdAt: '2026-04-24T09:00:00.000Z',
  },
];
let regCounter = 2;

// ─── Deals ───────────────────────────────────────────────────────────────────
let deals = [
  {
    id: 1,
    name: 'Spring Sale — 5 Marla Bundle',
    description: 'Limited time offer on 5 Marla residential plots. Special discount available for early bookings. Contact your dealer for exclusive rates.',
    plotIds: [1, 4, 7],
    specialPrice: 2300000,
    paymentPlanInfo: '24 easy monthly installments, 5% discount on total amount',
    validFrom: '2026-04-01',
    validUntil: '2026-12-31',
    highlighted: true,
    createdAt: '2026-04-01T00:00:00.000Z',
  },
];
let dealCounter = 1;

// ─── Bookings ─────────────────────────────────────────────────────────────────
let bookings = [];
let bookingCounter = 1000;

let customers = [];
let customerCounter = 100;

// ─── Operations Staff ─────────────────────────────────────────────────────────
let operationsStaff = [
  {
    id: 1, username: 'ops1', password: 'ops123', name: 'Operations Staff',
    role: 'operations',
    privileges: {
      approveBookings: true,
      viewPlots: true,
      viewDealers: false,
      viewDeals: false,
      viewRegistrations: false,
    },
    createdAt: '2026-01-01T00:00:00.000Z',
  },
];
let opsCounter = 1;

let announcements = [
  { id: 1, title: 'New Block D Plots Available!', body: 'We are pleased to announce the launch of commercial plots in Block D. Limited plots available — book early to secure your spot.', date: '2026-04-20', tag: 'New Launch', important: true },
  { id: 2, title: 'Revised Payment Plan 2026', body: 'Flexible installment plans are now available for all residential plots. Pay in 24 easy monthly installments with zero markup.', date: '2026-04-15', tag: 'Finance', important: false },
  { id: 3, title: 'Society Possession Update', body: 'Plot possession for Block A and B will begin from May 15, 2026. All plot holders are requested to ensure their documentation is complete.', date: '2026-04-10', tag: 'Possession', important: true },
  { id: 4, title: 'Development Work Progress', body: 'Roads, sewerage, and utility infrastructure work in Block C is 80% complete. Expected completion by end of April 2026.', date: '2026-04-05', tag: 'Development', important: false },
];

const PLOT_SIZES = ['5 Marla', '7 Marla', '10 Marla', '1 Kanal'];

function getDealerStats(dealerId) {
  const myBookings = bookings.filter(b => b.dealerId === dealerId);
  const achieved = myBookings.length;
  const paymentsCollected = myBookings.reduce((sum, b) => sum + b.plotPrice, 0);
  const achievedBySize = {};
  PLOT_SIZES.forEach(s => { achievedBySize[s] = 0; });
  myBookings.forEach(b => {
    if (achievedBySize[b.plotSize] !== undefined) achievedBySize[b.plotSize]++;
    else achievedBySize[b.plotSize] = (achievedBySize[b.plotSize] || 0) + 1;
  });
  return { myBookings, achieved, paymentsCollected, achievedBySize };
}

// ─── Sectors (public) ────────────────────────────────────────────────────────
app.get('/api/sectors', (req, res) => {
  const result = sectors.map(s => ({
    ...s,
    totalPlots: plots.filter(p => p.area === s.name).length,
  }));
  res.json(result);
});

// ─── Admin: Sectors CRUD ──────────────────────────────────────────────────────
app.get('/api/admin/sectors', (req, res) => {
  const result = sectors.map(s => ({
    ...s,
    totalPlots: plots.filter(p => p.area === s.name).length,
    availablePlots: plots.filter(p => p.area === s.name && p.status === 'available').length,
    bookedPlots: plots.filter(p => p.area === s.name && p.status === 'booked').length,
    soldPlots: plots.filter(p => p.area === s.name && p.status === 'sold').length,
  }));
  res.json(result);
});

app.post('/api/admin/sectors', (req, res) => {
  const { name, type, description } = req.body;
  if (!name) return res.status(400).json({ error: 'Sector name is required' });
  if (sectors.find(s => s.name.toLowerCase() === name.trim().toLowerCase()))
    return res.status(409).json({ error: 'A sector with this name already exists' });
  const sector = {
    id: ++sectorCounter,
    name: name.trim(),
    type: type || 'residential',
    description: description || '',
    createdAt: new Date().toISOString(),
  };
  sectors.push(sector);
  res.status(201).json({ ...sector, totalPlots: 0, availablePlots: 0, bookedPlots: 0, soldPlots: 0 });
});

app.put('/api/admin/sectors/:id', (req, res) => {
  const sector = sectors.find(s => s.id === parseInt(req.params.id));
  if (!sector) return res.status(404).json({ error: 'Sector not found' });
  const { name, type, description } = req.body;
  if (name && name.trim() !== sector.name) {
    if (sectors.find(s => s.id !== sector.id && s.name.toLowerCase() === name.trim().toLowerCase()))
      return res.status(409).json({ error: 'A sector with this name already exists' });
    const oldName = sector.name;
    sector.name = name.trim();
    plots.forEach(p => { if (p.area === oldName) p.area = sector.name; });
  }
  if (type) sector.type = type;
  if (description !== undefined) sector.description = description;
  res.json({ ...sector, totalPlots: plots.filter(p => p.area === sector.name).length });
});

app.delete('/api/admin/sectors/:id', (req, res) => {
  const idx = sectors.findIndex(s => s.id === parseInt(req.params.id));
  if (idx === -1) return res.status(404).json({ error: 'Sector not found' });
  const sectorName = sectors[idx].name;
  const plotCount = plots.filter(p => p.area === sectorName).length;
  if (plotCount > 0 && !req.query.force)
    return res.status(409).json({ error: `This sector has ${plotCount} plot(s). Use ?force=true to delete anyway.`, plotCount });
  sectors.splice(idx, 1);
  res.json({ success: true });
});

// ─── Public Stats ─────────────────────────────────────────────────────────────
app.get('/api/stats', (req, res) => {
  const total = plots.length;
  const available = plots.filter(p => p.status === 'available').length;
  const booked = plots.filter(p => p.status === 'booked').length;
  const sold = plots.filter(p => p.status === 'sold').length;
  res.json({ total, available, booked, sold, totalBookings: bookings.length });
});

// ─── Active Deals (public) ────────────────────────────────────────────────────
app.get('/api/deals', (req, res) => {
  const today = new Date().toISOString().slice(0, 10);
  const active = deals.filter(d => d.validFrom <= today && d.validUntil >= today).map(d => ({
    ...d,
    plots: d.plotIds.map(id => plots.find(p => p.id === id)).filter(Boolean),
  }));
  res.json(active);
});

// ─── Dealer Registration (public) ────────────────────────────────────────────
app.post('/api/dealer/register', (req, res) => {
  const { name, fatherName, cnic, postalAddress, officeAddress, businessName, businessCities, mobilePhone, altPhone, email, officePhone, proprietorName, proprietorPhone } = req.body;
  if (!name || !fatherName || !cnic || !postalAddress || !businessName || !businessCities || !mobilePhone || !altPhone || !email || !proprietorName) {
    return res.status(400).json({ error: 'Required fields missing' });
  }
  if (dealerRegistrations.find(r => r.cnic === cnic)) {
    return res.status(409).json({ error: 'A registration with this CNIC already exists' });
  }
  const reg = {
    id: ++regCounter,
    regRef: `UEREG-${String(regCounter).padStart(3, '0')}`,
    name, fatherName, cnic, postalAddress, officeAddress: officeAddress || '',
    businessName, businessCities,
    mobilePhone, altPhone, email, officePhone: officePhone || '',
    proprietorName, proprietorPhone: proprietorPhone || '',
    status: 'pending', createdAt: new Date().toISOString(),
  };
  dealerRegistrations.push(reg);
  res.status(201).json({ success: true, regRef: reg.regRef });
});

// ─── Announcements ────────────────────────────────────────────────────────────
app.get('/api/announcements', (req, res) => {
  res.json([...announcements].sort((a, b) => new Date(b.date) - new Date(a.date)));
});

// ─── Dealer / Operations Login ────────────────────────────────────────────────
app.post('/api/dealer/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Username and password required' });

    const clientIP = getClientIP(req);

    const dealer = dealers.find(d => d.username === username && d.password === password);
    if (dealer) {
      // IP lock check
      if (dealer.ipLocked && dealer.trustedIPs?.length > 0 && !dealer.trustedIPs.includes(clientIP)) {
        recordLogin(dealer, clientIP, { blocked: true, reason: 'ip_locked', vpnDetected: false, isp: 'Unknown', country: 'Unknown' });
        return res.status(403).json({ error: 'Access denied: your IP address is not authorised. Please contact the admin to whitelist your device.' });
      }

      // VPN check (always run to gather info; block only if vpnRestricted)
      const vpnInfo = await checkVPN(clientIP);
      if (dealer.vpnRestricted && vpnInfo.isVpn) {
        recordLogin(dealer, clientIP, { blocked: true, reason: 'vpn_detected', vpnDetected: true, isp: vpnInfo.isp, country: vpnInfo.country });
        return res.status(403).json({ error: 'Access denied: VPN / proxy usage is not allowed. Please disable your VPN and try again.' });
      }

      recordLogin(dealer, clientIP, { blocked: false, vpnDetected: vpnInfo.isVpn, isp: vpnInfo.isp, country: vpnInfo.country });
      const { password: _, ...safe } = dealer;
      return res.json({ success: true, dealer: safe, token: `dealer-${dealer.id}-${Date.now()}` });
    }

    const ops = operationsStaff.find(o => o.username === username && o.password === password);
    if (ops) {
      const { password: _, ...safe } = ops;
      return res.json({ success: true, dealer: safe, token: `ops-${ops.id}-${Date.now()}` });
    }

    return res.status(401).json({ error: 'Invalid credentials' });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Server error during login' });
  }
});

// ─── Per-Dealer Dashboard ─────────────────────────────────────────────────────
app.get('/api/dealer/dashboard/:dealerId', (req, res) => {
  const dealerId = parseInt(req.params.dealerId);
  const dealer = dealers.find(d => d.id === dealerId);
  if (!dealer) return res.status(404).json({ error: 'Dealer not found' });

  const target = dealerTargets[dealerId] || null;
  const { myBookings, achieved, paymentsCollected, achievedBySize } = getDealerStats(dealerId);
  const pkg = target?.packageId ? packages.find(p => p.id === target.packageId) : null;

  let sizeBreakdown = null;
  if (target) {
    sizeBreakdown = target.sizes.map(s => ({
      size: s.size, target: s.target, achieved: achievedBySize[s.size] || 0,
    }));
  }

  const totalTarget = target ? target.sizes.reduce((sum, s) => sum + s.target, 0) : 0;
  const targetPct = totalTarget > 0 ? Math.min(100, Math.round((achieved / totalTarget) * 100)) : 0;

  const monthlySales = [
    { month: 'Nov', bookings: 0, payments: 0 },
    { month: 'Dec', bookings: 1, payments: 2800000 },
    { month: 'Jan', bookings: 0, payments: 0 },
    { month: 'Feb', bookings: 1, payments: 3500000 },
    { month: 'Mar', bookings: 1, payments: 2200000 },
    { month: 'Apr', bookings: myBookings.filter(b => b.createdAt.startsWith('2026-04')).length, payments: myBookings.filter(b => b.createdAt.startsWith('2026-04')).reduce((s, b) => s + b.plotPrice, 0) },
  ];

  const plotDistribution = [
    { name: 'Available', value: plots.filter(p => p.status === 'available').length, color: '#059669' },
    { name: 'Booked', value: plots.filter(p => p.status === 'booked').length, color: '#d97706' },
    { name: 'Sold', value: plots.filter(p => p.status === 'sold').length, color: '#dc2626' },
  ];

  const recentBookings = [...myBookings].reverse().slice(0, 5).map(b => ({
    ref: b.bookingRef, plot: b.plotNumber, customer: b.name,
    amount: b.plotPrice, status: b.status, date: b.createdAt, size: b.plotSize,
  }));

  const today = new Date().toISOString().slice(0, 10);
  const activeDeals = deals.filter(d => d.validFrom <= today && d.validUntil >= today).map(d => ({
    ...d, plots: d.plotIds.map(id => plots.find(p => p.id === id)).filter(Boolean),
  }));

  res.json({
    dealer: { id: dealer.id, name: dealer.name, username: dealer.username, securityDepositPaid: dealer.securityDepositPaid || false, securityDepositRequired: dealer.securityDepositRequired || 0, rewardGiven: dealer.rewardGiven || false },
    target: target ? { ...target, totalTarget, paymentTarget: target.paymentTarget, packageId: target.packageId } : null,
    package: pkg ? { id: pkg.id, name: pkg.name, rewardDescription: pkg.rewardDescription, rewardAmount: pkg.rewardAmount } : null,
    sizeBreakdown, targetPct,
    stats: { achieved, totalTarget, paymentsCollected, paymentTarget: target?.paymentTarget || 0 },
    monthlySales, plotDistribution, recentBookings, activeDeals,
  });
});

// ─── Admin: List All Dealers ──────────────────────────────────────────────────
app.get('/api/admin/dealers', (req, res) => {
  const result = dealers.filter(d => d.role !== 'admin').map(d => {
    const target = dealerTargets[d.id];
    const pkg = target?.packageId ? packages.find(p => p.id === target.packageId) : null;
    const { achieved, paymentsCollected } = getDealerStats(d.id);
    const totalTarget = target ? target.sizes.reduce((sum, s) => sum + s.target, 0) : 0;
    const pct = totalTarget > 0 ? Math.round((achieved / totalTarget) * 100) : 0;
    const { password: _, ...safe } = d;
    return {
      ...safe, hasTarget: !!target, totalTarget, achieved, pct, paymentsCollected,
      paymentTarget: target?.paymentTarget || 0, notes: target?.notes || '',
      packageId: target?.packageId || null, packageName: pkg?.name || null,
    };
  });
  res.json(result);
});

// ─── Admin: Dealer Targets ────────────────────────────────────────────────────
app.get('/api/admin/targets/:dealerId', (req, res) => {
  const dealerId = parseInt(req.params.dealerId);
  res.json(dealerTargets[dealerId] || null);
});

app.post('/api/admin/targets/:dealerId', (req, res) => {
  const dealerId = parseInt(req.params.dealerId);
  const dealer = dealers.find(d => d.id === dealerId && d.role !== 'admin');
  if (!dealer) return res.status(404).json({ error: 'Dealer not found' });

  const { packageId, sizes, paymentTarget, notes } = req.body;

  let resolvedSizes;
  if (packageId) {
    const pkg = packages.find(p => p.id === parseInt(packageId));
    if (!pkg) return res.status(404).json({ error: 'Package not found' });
    resolvedSizes = pkg.sizes.map(s => ({ size: s.size, target: s.quota }));
  } else {
    if (!sizes || !Array.isArray(sizes)) return res.status(400).json({ error: 'sizes array required' });
    resolvedSizes = PLOT_SIZES.map(s => {
      const entry = sizes.find(x => x.size === s);
      return { size: s, target: entry ? parseInt(entry.target) || 0 : 0 };
    });
  }

  dealerTargets[dealerId] = {
    dealerId, packageId: packageId ? parseInt(packageId) : null,
    paymentTarget: paymentTarget || 0,
    sizes: resolvedSizes,
    assignedAt: new Date().toISOString(), notes: notes || '',
  };

  res.json({ success: true, target: dealerTargets[dealerId] });
});

// ─── Admin: Dealer Security Deposit ──────────────────────────────────────────
app.post('/api/admin/dealers/:id/deposit', (req, res) => {
  const dealer = dealers.find(d => d.id === parseInt(req.params.id) && d.role !== 'admin');
  if (!dealer) return res.status(404).json({ error: 'Dealer not found' });
  const { paid, amount } = req.body;
  dealer.securityDepositPaid = !!paid;
  if (amount !== undefined) dealer.securityDepositRequired = parseInt(amount) || 0;
  res.json({ success: true });
});

// ─── Admin: Mark Reward Given ─────────────────────────────────────────────────
app.post('/api/admin/dealers/:id/reward', (req, res) => {
  const dealer = dealers.find(d => d.id === parseInt(req.params.id) && d.role !== 'admin');
  if (!dealer) return res.status(404).json({ error: 'Dealer not found' });
  dealer.rewardGiven = !!req.body.given;
  res.json({ success: true });
});

// ─── Admin: Generate / Set Password ──────────────────────────────────────────
app.post('/api/admin/dealers/:id/generate-password', (req, res) => {
  const dealer = dealers.find(d => d.id === parseInt(req.params.id) && d.role !== 'admin');
  if (!dealer) return res.status(404).json({ error: 'Dealer not found' });
  const custom = req.body?.password;
  if (custom !== undefined) {
    if (typeof custom !== 'string' || custom.length < 6) return res.status(400).json({ error: 'Custom password must be at least 6 characters' });
    dealer.password = custom;
    return res.json({ success: true, password: custom });
  }
  const pwd = generatePassword();
  dealer.password = pwd;
  res.json({ success: true, password: pwd });
});

// ─── Admin: Security Settings ─────────────────────────────────────────────────
app.get('/api/admin/dealers/:id/security', (req, res) => {
  const dealer = dealers.find(d => d.id === parseInt(req.params.id) && d.role !== 'admin');
  if (!dealer) return res.status(404).json({ error: 'Dealer not found' });
  res.json({
    vpnRestricted: dealer.vpnRestricted || false,
    ipLocked: dealer.ipLocked || false,
    trustedIPs: dealer.trustedIPs || [],
    lastLoginIP: dealer.lastLoginIP || null,
    lastLoginAt: dealer.lastLoginAt || null,
  });
});

app.put('/api/admin/dealers/:id/security', (req, res) => {
  const dealer = dealers.find(d => d.id === parseInt(req.params.id) && d.role !== 'admin');
  if (!dealer) return res.status(404).json({ error: 'Dealer not found' });
  if (typeof req.body.vpnRestricted === 'boolean') dealer.vpnRestricted = req.body.vpnRestricted;
  if (typeof req.body.ipLocked === 'boolean') dealer.ipLocked = req.body.ipLocked;
  if (Array.isArray(req.body.trustedIPs)) dealer.trustedIPs = req.body.trustedIPs;
  res.json({ success: true });
});

// ─── Admin: Login History ─────────────────────────────────────────────────────
app.get('/api/admin/dealers/:id/login-history', (req, res) => {
  const dealer = dealers.find(d => d.id === parseInt(req.params.id) && d.role !== 'admin');
  if (!dealer) return res.status(404).json({ error: 'Dealer not found' });
  res.json(dealer.loginHistory || []);
});

// ─── Admin: Registrations ─────────────────────────────────────────────────────
app.get('/api/admin/registrations', (req, res) => {
  res.json([...dealerRegistrations].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
});

app.post('/api/admin/registrations/:id/approve', (req, res) => {
  const reg = dealerRegistrations.find(r => r.id === parseInt(req.params.id));
  if (!reg) return res.status(404).json({ error: 'Registration not found' });
  if (reg.status === 'approved') return res.status(409).json({ error: 'Already approved' });

  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Username and password required' });
  if (dealers.find(d => d.username === username)) return res.status(409).json({ error: 'Username already taken' });

  const newDealer = {
    id: ++dealerCounter, username, password, name: reg.name, role: 'dealer',
    fatherName: reg.fatherName, cnic: reg.cnic,
    postalAddress: reg.postalAddress, officeAddress: reg.officeAddress,
    mobilePhone: reg.mobilePhone, officePhone: reg.officePhone,
    proprietorName: reg.proprietorName, proprietorPhone: reg.proprietorPhone,
    securityDepositRequired: 200000, securityDepositPaid: false, rewardGiven: false,
    vpnRestricted: false, ipLocked: false, trustedIPs: [], loginHistory: [],
    registrationId: reg.id,
  };
  dealers.push(newDealer);
  reg.status = 'approved';
  reg.dealerId = newDealer.id;

  const { password: _, ...safe } = newDealer;
  res.status(201).json({ success: true, dealer: safe });
});

// ─── Admin: Packages ──────────────────────────────────────────────────────────
app.get('/api/admin/packages', (req, res) => res.json(packages));

app.post('/api/admin/packages', (req, res) => {
  const { name, sizes, rewardDescription, rewardAmount } = req.body;
  if (!name || !sizes) return res.status(400).json({ error: 'name and sizes required' });
  const totalPlots = sizes.reduce((sum, s) => sum + (parseInt(s.quota) || 0), 0);
  const pkg = {
    id: ++packageCounter, name, totalPlots,
    sizes: PLOT_SIZES.map(s => {
      const entry = sizes.find(x => x.size === s);
      return { size: s, quota: entry ? parseInt(entry.quota) || 0 : 0 };
    }),
    rewardDescription: rewardDescription || '',
    rewardAmount: parseInt(rewardAmount) || 0,
    createdAt: new Date().toISOString(),
  };
  packages.push(pkg);
  res.status(201).json(pkg);
});

app.put('/api/admin/packages/:id', (req, res) => {
  const pkg = packages.find(p => p.id === parseInt(req.params.id));
  if (!pkg) return res.status(404).json({ error: 'Package not found' });
  const { name, sizes, rewardDescription, rewardAmount } = req.body;
  if (name) pkg.name = name;
  if (sizes) {
    pkg.sizes = PLOT_SIZES.map(s => {
      const entry = sizes.find(x => x.size === s);
      return { size: s, quota: entry ? parseInt(entry.quota) || 0 : (pkg.sizes.find(x => x.size === s)?.quota || 0) };
    });
    pkg.totalPlots = pkg.sizes.reduce((sum, s) => sum + s.quota, 0);
  }
  if (rewardDescription !== undefined) pkg.rewardDescription = rewardDescription;
  if (rewardAmount !== undefined) pkg.rewardAmount = parseInt(rewardAmount) || 0;
  res.json(pkg);
});

app.delete('/api/admin/packages/:id', (req, res) => {
  const idx = packages.findIndex(p => p.id === parseInt(req.params.id));
  if (idx === -1) return res.status(404).json({ error: 'Package not found' });
  packages.splice(idx, 1);
  res.json({ success: true });
});

// ─── Admin: Bulk Import Plots ─────────────────────────────────────────────────
app.post('/api/admin/plots/bulk', (req, res) => {
  const { plots: incoming } = req.body;
  if (!Array.isArray(incoming) || incoming.length === 0)
    return res.status(400).json({ error: 'plots array required' });

  const results = { added: [], skipped: [], errors: [] };
  for (const item of incoming) {
    const { number, size, price, status, category, description, area } = item;
    if (!number || !size || !price || !area) {
      results.errors.push({ number: number || '?', reason: 'Missing required fields (number, size, price, area)' });
      continue;
    }
    if (plots.find(p => p.number === String(number).trim())) {
      results.skipped.push({ number, reason: 'Plot number already exists' });
      continue;
    }
    const plot = {
      id: ++plotCounter,
      number: String(number).trim(),
      size: String(size).trim(),
      price: parseInt(price) || 0,
      status: status || 'available',
      category: category || 'residential',
      description: description || '',
      area: String(area).trim(),
    };
    plots.push(plot);
    results.added.push(plot);
  }
  res.status(201).json(results);
});

// ─── Admin: Plot Inventory CRUD ───────────────────────────────────────────────
app.post('/api/admin/plots', (req, res) => {
  const { number, size, price, status, category, description, area, tags } = req.body;
  if (!number || !size || !price || !area) return res.status(400).json({ error: 'number, size, price, area required' });
  if (plots.find(p => p.number === number)) return res.status(409).json({ error: 'Plot number already exists' });
  const validTags = (Array.isArray(tags) ? tags : []).filter(t => PREMIUM_TAGS.includes(t));
  const plot = {
    id: ++plotCounter, number, size, price: parseInt(price),
    status: status || 'available', category: category || 'residential',
    description: description || '', area, tags: validTags,
  };
  plots.push(plot);
  res.status(201).json(withEffectivePrice(plot));
});

app.put('/api/admin/plots/:id', (req, res) => {
  const plot = plots.find(p => p.id === parseInt(req.params.id));
  if (!plot) return res.status(404).json({ error: 'Plot not found' });
  const { number, size, price, status, category, description, area, tags } = req.body;
  if (number) plot.number = number;
  if (size) plot.size = size;
  if (price) plot.price = parseInt(price);
  if (status) plot.status = status;
  if (category) plot.category = category;
  if (description !== undefined) plot.description = description;
  if (area) plot.area = area;
  if (Array.isArray(tags)) plot.tags = tags.filter(t => PREMIUM_TAGS.includes(t));
  res.json(withEffectivePrice(plot));
});

app.delete('/api/admin/plots/:id', (req, res) => {
  const idx = plots.findIndex(p => p.id === parseInt(req.params.id));
  if (idx === -1) return res.status(404).json({ error: 'Plot not found' });
  if (plots[idx].status !== 'available' && !req.query.force) {
    return res.status(409).json({ error: 'Cannot delete a booked or sold plot. Use ?force=true to override.' });
  }
  const plotId = plots[idx].id;
  plots.splice(idx, 1);
  const before = bookings.length;
  bookings = bookings.filter(b => b.plotId !== plotId);
  deals.forEach(d => { d.plotIds = d.plotIds.filter(id => id !== plotId); });
  res.json({ success: true, bookingsRemoved: before - bookings.length });
});

// ─── Admin: Deals CRUD ────────────────────────────────────────────────────────
app.get('/api/admin/deals', (req, res) => res.json([...deals].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))));

app.post('/api/admin/deals', (req, res) => {
  const { name, description, plotIds, specialPrice, paymentPlanInfo, validFrom, validUntil, highlighted } = req.body;
  if (!name || !validFrom || !validUntil) return res.status(400).json({ error: 'name, validFrom, validUntil required' });
  const deal = {
    id: ++dealCounter, name, description: description || '',
    plotIds: plotIds || [], specialPrice: specialPrice ? parseInt(specialPrice) : null,
    paymentPlanInfo: paymentPlanInfo || '', validFrom, validUntil,
    highlighted: !!highlighted, createdAt: new Date().toISOString(),
  };
  deals.push(deal);
  res.status(201).json(deal);
});

app.put('/api/admin/deals/:id', (req, res) => {
  const deal = deals.find(d => d.id === parseInt(req.params.id));
  if (!deal) return res.status(404).json({ error: 'Deal not found' });
  Object.assign(deal, req.body);
  res.json(deal);
});

app.delete('/api/admin/deals/:id', (req, res) => {
  const idx = deals.findIndex(d => d.id === parseInt(req.params.id));
  if (idx === -1) return res.status(404).json({ error: 'Deal not found' });
  deals.splice(idx, 1);
  res.json({ success: true });
});

// ─── Customer Register ────────────────────────────────────────────────────────
app.post('/api/customers/register', (req, res) => {
  const { name, email, phone, cnic, password } = req.body;
  if (!name || !email || !phone || !cnic || !password) return res.status(400).json({ error: 'All fields are required' });
  if (customers.find(c => c.email === email)) return res.status(409).json({ error: 'An account with this email already exists' });
  if (customers.find(c => c.cnic === cnic)) return res.status(409).json({ error: 'An account with this CNIC already exists' });
  const customer = { id: ++customerCounter, customerId: `UECUST-${customerCounter}`, name, email, phone, cnic, password, createdAt: new Date().toISOString() };
  customers.push(customer);
  const { password: _, ...safe } = customer;
  res.status(201).json({ success: true, customer: safe });
});

// ─── Plots (public) ───────────────────────────────────────────────────────────
app.get('/api/plots', (req, res) => {
  const { status, category, area } = req.query;
  let filtered = [...plots];
  if (status) filtered = filtered.filter(p => p.status === status);
  if (category) filtered = filtered.filter(p => p.category === category);
  if (area) filtered = filtered.filter(p => p.area === area);
  res.json(filtered.map(withEffectivePrice));
});

app.get('/api/plots/:id', (req, res) => {
  const plot = plots.find(p => p.id === parseInt(req.params.id));
  if (!plot) return res.status(404).json({ error: 'Plot not found' });
  res.json(withEffectivePrice(plot));
});

// ─── Bookings ─────────────────────────────────────────────────────────────────
app.post('/api/bookings', (req, res) => {
  const {
    plotId, dealerId,
    name, fatherName, cnic, phone, email,
    residentialAddress, postalAddress, photo,
    nomineeName, nomineeFatherName, nomineeCnic,
    nomineeRelation, nomineePhone, nomineeAddress,
    downPayment,
  } = req.body;
  if (!plotId || !name || !fatherName || !cnic || !phone || !residentialAddress || !postalAddress || !photo)
    return res.status(400).json({ error: 'Missing required fields' });
  if (!nomineeName || !nomineeFatherName || !nomineeCnic || !nomineeRelation || !nomineePhone || !nomineeAddress)
    return res.status(400).json({ error: 'Nominee information is incomplete' });
  const plot = plots.find(p => p.id === plotId);
  if (!plot) return res.status(404).json({ error: 'Plot not found' });
  if (plot.status !== 'available') return res.status(409).json({ error: 'Plot is not available for booking' });
  const resolvedDealerId = dealerId ? (dealers.find(d => d.id === dealerId && d.role !== 'admin') ? dealerId : null) : null;
  const booking = {
    id: ++bookingCounter, bookingRef: `UE-${bookingCounter}`,
    plotId, plotNumber: plot.number, plotSize: plot.size,
    plotPrice: computeEffectivePrice(plot.price, plot.tags || []), area: plot.area,
    name, fatherName, cnic, phone, email: email || '',
    residentialAddress, postalAddress, photo,
    nominee: { name: nomineeName, fatherName: nomineeFatherName, cnic: nomineeCnic, relation: nomineeRelation, phone: nomineePhone, address: nomineeAddress },
    dealerId: resolvedDealerId,
    downPayment: Number(downPayment) || 0,
    status: 'pending', createdAt: new Date().toISOString(),
  };
  bookings.push(booking);
  plot.status = 'booked';
  res.status(201).json(booking);
});

app.get('/api/bookings', (req, res) => res.json(bookings));

app.get('/api/bookings/:ref', (req, res) => {
  const booking = bookings.find(b => b.bookingRef === req.params.ref || b.id === parseInt(req.params.ref));
  if (!booking) return res.status(404).json({ error: 'Booking not found' });
  res.json(booking);
});

// ─── Admin: All Bookings ──────────────────────────────────────────────────────
app.get('/api/admin/bookings', (req, res) => {
  const enriched = [...bookings].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).map(b => ({
    ...b,
    dealerName: b.dealerId ? (dealers.find(d => d.id === b.dealerId)?.name || 'Unknown') : 'Walk-in',
  }));
  res.json(enriched);
});

app.post('/api/admin/bookings/:id/approve', (req, res) => {
  const booking = bookings.find(b => b.id === parseInt(req.params.id));
  if (!booking) return res.status(404).json({ error: 'Booking not found' });
  if (booking.status !== 'pending') return res.status(409).json({ error: 'Booking is not pending' });
  booking.status = 'confirmed';
  booking.approvedAt = new Date().toISOString();
  booking.approvedBy = req.body.approvedBy || 'Operations';
  booking.receiptNumber = `UE-RCPT-${booking.id}`;
  const plot = plots.find(p => p.id === booking.plotId);
  if (plot) plot.status = 'sold';
  res.json({ success: true, booking });
});

app.get('/api/admin/notifications', (req, res) => {
  const pendingBookings = bookings.filter(b => b.status === 'pending').length;
  res.json({ pendingBookings });
});

app.post('/api/admin/bookings/:id/reject', (req, res) => {
  const booking = bookings.find(b => b.id === parseInt(req.params.id));
  if (!booking) return res.status(404).json({ error: 'Booking not found' });
  if (booking.status !== 'pending') return res.status(409).json({ error: 'Booking is not pending' });
  booking.status = 'rejected';
  booking.rejectedAt = new Date().toISOString();
  booking.rejectedBy = req.body.rejectedBy || 'Operations';
  booking.rejectionReason = req.body.reason || '';
  const plot = plots.find(p => p.id === booking.plotId);
  if (plot && plot.status === 'booked') plot.status = 'available';
  res.json({ success: true, booking });
});

app.delete('/api/admin/bookings/:id', (req, res) => {
  const rawId = req.params.id;
  const numId = parseInt(rawId);
  console.log(`[DELETE /api/admin/bookings/${rawId}] parsed=${numId} totalBookings=${bookings.length} ids=${JSON.stringify(bookings.map(b => b.id))}`);
  const idx = bookings.findIndex(b => b.id === numId);
  if (idx === -1) return res.status(404).json({ error: `Booking not found. id=${numId}, existing ids: ${bookings.map(b=>b.id).join(',')}` });
  const [booking] = bookings.splice(idx, 1);
  const plot = plots.find(p => p.id === booking.plotId);
  if (plot && (plot.status === 'booked' || plot.status === 'sold')) plot.status = 'available';
  console.log(`[DELETE] Removed booking id=${numId} ref=${booking.bookingRef}`);
  res.json({ success: true });
});

// ─── Admin: Operations Staff CRUD ────────────────────────────────────────────
app.get('/api/admin/staff', (req, res) => {
  res.json(operationsStaff.map(({ password: _, ...safe }) => safe));
});

app.post('/api/admin/staff', (req, res) => {
  const { username, password, name, privileges } = req.body;
  if (!username || !password || !name) return res.status(400).json({ error: 'username, password, name required' });
  if (dealers.find(d => d.username === username) || operationsStaff.find(o => o.username === username))
    return res.status(409).json({ error: 'Username already taken' });
  const staff = {
    id: ++opsCounter, username, password, name, role: 'operations',
    privileges: privileges || { approveBookings: false, viewPlots: false, viewDealers: false, viewDeals: false, viewRegistrations: false },
    createdAt: new Date().toISOString(),
  };
  operationsStaff.push(staff);
  const { password: _, ...safe } = staff;
  res.status(201).json(safe);
});

app.put('/api/admin/staff/:id', (req, res) => {
  const staff = operationsStaff.find(o => o.id === parseInt(req.params.id));
  if (!staff) return res.status(404).json({ error: 'Staff not found' });
  const { name, password, privileges } = req.body;
  if (name) staff.name = name;
  if (password) staff.password = password;
  if (privileges) staff.privileges = privileges;
  const { password: _, ...safe } = staff;
  res.json(safe);
});

app.delete('/api/admin/staff/:id', (req, res) => {
  const idx = operationsStaff.findIndex(o => o.id === parseInt(req.params.id));
  if (idx === -1) return res.status(404).json({ error: 'Staff not found' });
  operationsStaff.splice(idx, 1);
  res.json({ success: true });
});

// ─── Production ───────────────────────────────────────────────────────────────
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../dist')));
  app.get('*', (req, res) => res.sendFile(path.join(__dirname, '../dist/index.html')));
}

const HOST = process.env.NODE_ENV === 'production' ? '0.0.0.0' : '127.0.0.1';
const listenPort = process.env.NODE_ENV === 'production' ? 5000 : PORT;
const server = http.createServer(app);
server.listen(listenPort, HOST, () => console.log(`Server running on http://${HOST}:${listenPort}`));
