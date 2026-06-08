const express = require('express');
const cors = require('cors');
const path = require('path');
const http = require('http');
const fs = require('fs');

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json({ limit: '100mb' }));
app.set('trust proxy', true);

// Auto-persist on every mutating request once a response is sent
app.use((req, res, next) => {
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    const origJson = res.json.bind(res);
    res.json = function (data) {
      saveDb();
      return origJson(data);
    };
  }
  next();
});

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
  { id: 1, name: 'Rose', type: 'residential', description: 'Rose residential area — University Enclave Phase 1', totalPlots: 0, createdAt: '2026-01-01T00:00:00.000Z' },
];
let sectorCounter = 1;

// ─── Session store (token → { dealerId, role }) ───────────────────────────────
const sessions = {};

function validateSession(req) {
  const auth = req.headers['authorization'] || '';
  if (!auth.startsWith('Bearer ')) return null;
  const token = auth.slice(7).trim();
  return sessions[token] || null;
}

// ─── Plot Inventory ──────────────────────────────────────────────────────────
// ─── Premium Tag Pricing ──────────────────────────────────────────────────────
const TAG_PREMIUMS = { 'Corner Plot': 0.10, 'Park Facing': 0.10, 'Main Road': 0.10, 'Main Boulevard': 0.15 };
const PREMIUM_TAGS = Object.keys(TAG_PREMIUMS);
const computeEffectivePrice = (basePrice, tags = []) =>
  Math.round(basePrice * (1 + (tags || []).reduce((s, t) => s + (TAG_PREMIUMS[t] || 0), 0)));
const withEffectivePrice = p => ({ ...p, effectivePrice: computeEffectivePrice(p.price, p.tags), tags: p.tags || [] });

let plots = [
  { id: 1, number: 'UE-R01', area: 'Rose', size: '1 Kanal', price: 14400000, status: 'available', category: 'residential', description: 'Corner', tags: ['Corner Plot'] },
  { id: 2, number: 'UE-R02', area: 'Rose', size: '1 Kanal', price: 14400000, status: 'available', category: 'residential', description: 'Normal', tags: [] },
  { id: 3, number: 'UE-R03', area: 'Rose', size: '1 Kanal', price: 14400000, status: 'available', category: 'residential', description: 'Normal', tags: [] },
  { id: 4, number: 'UE-R04', area: 'Rose', size: '1 Kanal', price: 14400000, status: 'available', category: 'residential', description: 'Normal', tags: [] },
  { id: 5, number: 'UE-R05', area: 'Rose', size: '1 Kanal', price: 14400000, status: 'available', category: 'residential', description: 'Normal', tags: [] },
  { id: 6, number: 'UE-R06', area: 'Rose', size: '1 Kanal', price: 14400000, status: 'available', category: 'residential', description: 'Normal', tags: [] },
  { id: 7, number: 'UE-R07', area: 'Rose', size: '1 Kanal', price: 14400000, status: 'available', category: 'residential', description: 'Normal', tags: [] },
  { id: 8, number: 'UE-R08', area: 'Rose', size: '1 Kanal', price: 14400000, status: 'available', category: 'residential', description: 'Normal', tags: [] },
  { id: 9, number: 'UE-R09', area: 'Rose', size: '1 Kanal', price: 14400000, status: 'available', category: 'residential', description: 'Normal', tags: [] },
  { id: 10, number: 'UE-R10', area: 'Rose', size: '1 Kanal', price: 14400000, status: 'available', category: 'residential', description: 'Normal', tags: [] },
  { id: 11, number: 'UE-R11', area: 'Rose', size: '1 Kanal', price: 14400000, status: 'available', category: 'residential', description: 'Normal', tags: [] },
  { id: 12, number: 'UE-R12', area: 'Rose', size: '1 Kanal', price: 14400000, status: 'available', category: 'residential', description: 'Corner', tags: ['Corner Plot'] },
  { id: 13, number: 'UE-R13', area: 'Rose', size: '1 Kanal', price: 14400000, status: 'available', category: 'residential', description: 'Corner', tags: ['Corner Plot'] },
  { id: 14, number: 'UE-R14', area: 'Rose', size: '1 Kanal', price: 14400000, status: 'available', category: 'residential', description: 'Normal', tags: [] },
  { id: 15, number: 'UE-R15', area: 'Rose', size: '1 Kanal', price: 14400000, status: 'available', category: 'residential', description: 'Normal', tags: [] },
  { id: 16, number: 'UE-R16', area: 'Rose', size: '1 Kanal', price: 14400000, status: 'available', category: 'residential', description: 'Normal', tags: [] },
  { id: 17, number: 'UE-R17', area: 'Rose', size: '1 Kanal', price: 14400000, status: 'available', category: 'residential', description: 'Normal', tags: [] },
  { id: 18, number: 'UE-R18', area: 'Rose', size: '1 Kanal', price: 14400000, status: 'available', category: 'residential', description: 'Normal', tags: [] },
  { id: 19, number: 'UE-R19', area: 'Rose', size: '1 Kanal', price: 14400000, status: 'available', category: 'residential', description: 'Normal', tags: [] },
  { id: 20, number: 'UE-R20', area: 'Rose', size: '1 Kanal', price: 14400000, status: 'available', category: 'residential', description: 'Normal', tags: [] },
  { id: 21, number: 'UE-R21', area: 'Rose', size: '1 Kanal', price: 14400000, status: 'available', category: 'residential', description: 'Corner', tags: ['Corner Plot'] },
  { id: 22, number: 'UE-R22', area: 'Rose', size: '1 Kanal', price: 14400000, status: 'available', category: 'residential', description: 'Corner', tags: ['Corner Plot'] },
  { id: 23, number: 'UE-R23', area: 'Rose', size: '1 Kanal', price: 14400000, status: 'available', category: 'residential', description: 'Normal', tags: [] },
  { id: 24, number: 'UE-R24', area: 'Rose', size: '1 Kanal', price: 14400000, status: 'available', category: 'residential', description: 'Normal', tags: [] },
  { id: 25, number: 'UE-R25', area: 'Rose', size: '1 Kanal', price: 14400000, status: 'available', category: 'residential', description: 'Normal', tags: [] },
  { id: 26, number: 'UE-R26', area: 'Rose', size: '1 Kanal', price: 14400000, status: 'available', category: 'residential', description: 'Normal', tags: [] },
  { id: 27, number: 'UE-R27', area: 'Rose', size: '1 Kanal', price: 14400000, status: 'available', category: 'residential', description: 'Normal', tags: [] },
  { id: 28, number: 'UE-R28', area: 'Rose', size: '1 Kanal', price: 14400000, status: 'available', category: 'residential', description: 'Normal', tags: [] },
  { id: 29, number: 'UE-R29', area: 'Rose', size: '1 Kanal', price: 14400000, status: 'available', category: 'residential', description: 'Normal', tags: [] },
  { id: 30, number: 'UE-R30', area: 'Rose', size: '1 Kanal', price: 14400000, status: 'available', category: 'residential', description: 'Normal', tags: [] },
  { id: 31, number: 'UE-R31', area: 'Rose', size: '1 Kanal', price: 14400000, status: 'available', category: 'residential', description: 'Normal', tags: [] },
  { id: 32, number: 'UE-R32', area: 'Rose', size: '1 Kanal', price: 14400000, status: 'available', category: 'residential', description: 'Normal', tags: [] },
  { id: 33, number: 'UE-R33', area: 'Rose', size: '1 Kanal', price: 14400000, status: 'available', category: 'residential', description: 'Normal', tags: [] },
  { id: 34, number: 'UE-R34', area: 'Rose', size: '1 Kanal', price: 14400000, status: 'available', category: 'residential', description: 'Normal', tags: [] },
  { id: 35, number: 'UE-R35', area: 'Rose', size: '1 Kanal', price: 14400000, status: 'available', category: 'residential', description: 'Corner', tags: ['Corner Plot'] },
  { id: 36, number: 'UE-R36', area: 'Rose', size: '1 Kanal', price: 14400000, status: 'available', category: 'residential', description: 'Corner', tags: ['Corner Plot'] },
  { id: 37, number: 'UE-R37', area: 'Rose', size: '1 Kanal', price: 14400000, status: 'available', category: 'residential', description: 'Normal', tags: [] },
  { id: 38, number: 'UE-R38', area: 'Rose', size: '1 Kanal', price: 14400000, status: 'available', category: 'residential', description: 'Normal', tags: [] },
  { id: 39, number: 'UE-R39', area: 'Rose', size: '1 Kanal', price: 14400000, status: 'available', category: 'residential', description: 'Normal', tags: [] },
  { id: 40, number: 'UE-R40', area: 'Rose', size: '1 Kanal', price: 14400000, status: 'available', category: 'residential', description: 'Normal', tags: [] },
  { id: 41, number: 'UE-R41', area: 'Rose', size: '1 Kanal', price: 14400000, status: 'available', category: 'residential', description: 'Normal', tags: [] },
  { id: 42, number: 'UE-R42', area: 'Rose', size: '1 Kanal', price: 14400000, status: 'available', category: 'residential', description: 'Normal', tags: [] },
  { id: 43, number: 'UE-R43', area: 'Rose', size: '1 Kanal', price: 14400000, status: 'available', category: 'residential', description: 'Normal', tags: [] },
  { id: 44, number: 'UE-R44', area: 'Rose', size: '1 Kanal', price: 14400000, status: 'available', category: 'residential', description: 'Normal', tags: [] },
  { id: 45, number: 'UE-R45', area: 'Rose', size: '1 Kanal', price: 14400000, status: 'available', category: 'residential', description: 'Normal', tags: [] },
  { id: 46, number: 'UE-R46', area: 'Rose', size: '1 Kanal', price: 14400000, status: 'available', category: 'residential', description: 'Normal', tags: [] },
  { id: 47, number: 'UE-R47', area: 'Rose', size: '1 Kanal', price: 14400000, status: 'available', category: 'residential', description: 'Normal', tags: [] },
  { id: 48, number: 'UE-R48', area: 'Rose', size: '1 Kanal', price: 14400000, status: 'available', category: 'residential', description: 'Normal', tags: [] },
  { id: 49, number: 'UE-R49', area: 'Rose', size: '1 Kanal', price: 14400000, status: 'available', category: 'residential', description: 'Normal', tags: [] },
  { id: 50, number: 'UE-R50', area: 'Rose', size: '1 Kanal', price: 14400000, status: 'available', category: 'residential', description: 'Corner', tags: ['Corner Plot'] },
  { id: 51, number: 'UE-R51', area: 'Rose', size: '1 Kanal', price: 14400000, status: 'available', category: 'residential', description: 'Normal', tags: [] },
  { id: 52, number: 'UE-R52', area: 'Rose', size: '1 Kanal', price: 14400000, status: 'available', category: 'residential', description: 'Corner', tags: ['Corner Plot'] },
  { id: 53, number: 'UE-R53', area: 'Rose', size: '1 Kanal', price: 14400000, status: 'available', category: 'residential', description: 'Normal', tags: [] },
  { id: 54, number: 'UE-R54', area: 'Rose', size: '1 Kanal', price: 14400000, status: 'available', category: 'residential', description: 'Normal', tags: [] },
  { id: 55, number: 'UE-R55', area: 'Rose', size: '1 Kanal', price: 14400000, status: 'available', category: 'residential', description: 'Normal', tags: [] },
  { id: 56, number: 'UE-R56', area: 'Rose', size: '1 Kanal', price: 14400000, status: 'available', category: 'residential', description: 'Normal', tags: [] },
  { id: 57, number: 'UE-R57', area: 'Rose', size: '1 Kanal', price: 14400000, status: 'available', category: 'residential', description: 'Normal', tags: [] },
  { id: 58, number: 'UE-R58', area: 'Rose', size: '1 Kanal', price: 14400000, status: 'available', category: 'residential', description: 'Normal', tags: [] },
  { id: 59, number: 'UE-R59', area: 'Rose', size: '1 Kanal', price: 14400000, status: 'available', category: 'residential', description: 'Corner', tags: ['Corner Plot'] },
  { id: 60, number: 'UE-R60', area: 'Rose', size: '1 Kanal', price: 14400000, status: 'available', category: 'residential', description: 'Corner', tags: ['Corner Plot'] },
  { id: 61, number: 'UE-R61', area: 'Rose', size: '1 Kanal', price: 14400000, status: 'available', category: 'residential', description: 'Normal', tags: [] },
  { id: 62, number: 'UE-R62', area: 'Rose', size: '1 Kanal', price: 14400000, status: 'available', category: 'residential', description: 'Normal', tags: [] },
  { id: 63, number: 'UE-R63', area: 'Rose', size: '1 Kanal', price: 14400000, status: 'available', category: 'residential', description: 'Normal', tags: [] },
  { id: 64, number: 'UE-R64', area: 'Rose', size: '1 Kanal', price: 14400000, status: 'available', category: 'residential', description: 'Normal', tags: [] },
  { id: 65, number: 'UE-R65', area: 'Rose', size: '1 Kanal', price: 14400000, status: 'available', category: 'residential', description: 'Normal', tags: [] },
  { id: 66, number: 'UE-R66', area: 'Rose', size: '1 Kanal', price: 14400000, status: 'available', category: 'residential', description: 'Normal', tags: [] },
  { id: 67, number: 'UE-R67', area: 'Rose', size: '1 Kanal', price: 14400000, status: 'available', category: 'residential', description: 'Normal', tags: [] },
  { id: 68, number: 'UE-R68', area: 'Rose', size: '1 Kanal', price: 14400000, status: 'available', category: 'residential', description: 'Corner', tags: ['Corner Plot'] },
  { id: 69, number: 'UE-R69', area: 'Rose', size: '1 Kanal', price: 14400000, status: 'available', category: 'residential', description: 'Normal', tags: [] },
  { id: 70, number: 'UE-R70', area: 'Rose', size: '1 Kanal', price: 14400000, status: 'available', category: 'residential', description: 'Normal', tags: [] },
  { id: 71, number: 'UE-R71', area: 'Rose', size: '1 Kanal', price: 14400000, status: 'available', category: 'residential', description: 'Normal', tags: [] },
  { id: 72, number: 'UE-R72', area: 'Rose', size: '1 Kanal', price: 14400000, status: 'available', category: 'residential', description: 'Normal', tags: [] },
  { id: 73, number: 'UE-R73', area: 'Rose', size: '1 Kanal', price: 14400000, status: 'available', category: 'residential', description: 'Normal', tags: [] },
  { id: 74, number: 'UE-R74', area: 'Rose', size: '1 Kanal', price: 14400000, status: 'available', category: 'residential', description: 'Normal', tags: [] },
  { id: 75, number: 'UE-R75', area: 'Rose', size: '1 Kanal', price: 14400000, status: 'available', category: 'residential', description: 'Normal', tags: [] },
  { id: 76, number: 'UE-R76', area: 'Rose', size: '1 Kanal', price: 14400000, status: 'available', category: 'residential', description: 'Corner', tags: ['Corner Plot'] },
  { id: 77, number: 'UE-R77', area: 'Rose', size: '1 Kanal', price: 14400000, status: 'available', category: 'residential', description: 'Normal', tags: [] },
  { id: 78, number: 'UE-R78', area: 'Rose', size: '1 Kanal', price: 14400000, status: 'available', category: 'residential', description: 'Normal', tags: [] },
  { id: 79, number: 'UE-R79', area: 'Rose', size: '1 Kanal', price: 14400000, status: 'available', category: 'residential', description: 'Normal', tags: [] },
  { id: 80, number: 'UE-R80', area: 'Rose', size: '1 Kanal', price: 14400000, status: 'available', category: 'residential', description: 'Normal', tags: [] },
  { id: 81, number: 'UE-R81', area: 'Rose', size: '1 Kanal', price: 14400000, status: 'available', category: 'residential', description: 'Normal', tags: [] },
  { id: 82, number: 'UE-R82', area: 'Rose', size: '1 Kanal', price: 14400000, status: 'available', category: 'residential', description: 'Normal', tags: [] },
  { id: 83, number: 'UE-R83', area: 'Rose', size: '1 Kanal', price: 14400000, status: 'available', category: 'residential', description: 'Normal', tags: [] },
  { id: 84, number: 'UE-R84', area: 'Rose', size: '1 Kanal', price: 14400000, status: 'available', category: 'residential', description: 'Normal', tags: [] },
  { id: 85, number: 'UE-R85', area: 'Rose', size: '1 Kanal', price: 14400000, status: 'available', category: 'residential', description: 'Corner', tags: ['Corner Plot'] },
  { id: 86, number: 'UE-R86', area: 'Rose', size: '1 Kanal', price: 14400000, status: 'available', category: 'residential', description: 'Normal', tags: [] },
  { id: 87, number: 'UE-R87', area: 'Rose', size: '1 Kanal', price: 14400000, status: 'available', category: 'residential', description: 'Normal', tags: [] },
  { id: 88, number: 'UE-R88', area: 'Rose', size: '1 Kanal', price: 14400000, status: 'available', category: 'residential', description: 'Normal', tags: [] },
  { id: 89, number: 'UE-R89', area: 'Rose', size: '1 Kanal', price: 14400000, status: 'available', category: 'residential', description: 'Normal', tags: [] },
  { id: 90, number: 'UE-R90', area: 'Rose', size: '1 Kanal', price: 14400000, status: 'available', category: 'residential', description: 'Normal', tags: [] },
  { id: 91, number: 'UE-R91', area: 'Rose', size: '1 Kanal', price: 14400000, status: 'available', category: 'residential', description: 'Normal', tags: [] },
  { id: 92, number: 'UE-R92', area: 'Rose', size: '1 Kanal', price: 14400000, status: 'available', category: 'residential', description: 'Normal', tags: [] },
  { id: 93, number: 'UE-R93', area: 'Rose', size: '1 Kanal', price: 14400000, status: 'available', category: 'residential', description: 'Corner', tags: ['Corner Plot'] },
  { id: 94, number: 'UE-R94', area: 'Rose', size: '1 Kanal', price: 14400000, status: 'available', category: 'residential', description: 'Corner', tags: ['Corner Plot'] },
  { id: 95, number: 'UE-R95', area: 'Rose', size: '1 Kanal', price: 14400000, status: 'available', category: 'residential', description: 'Normal', tags: [] },
  { id: 96, number: 'UE-R96', area: 'Rose', size: '1 Kanal', price: 14400000, status: 'available', category: 'residential', description: 'Normal', tags: [] },
  { id: 97, number: 'UE-R97', area: 'Rose', size: '1 Kanal', price: 14400000, status: 'available', category: 'residential', description: 'Normal', tags: [] },
  { id: 98, number: 'UE-R98', area: 'Rose', size: '1 Kanal', price: 14400000, status: 'available', category: 'residential', description: 'Normal', tags: [] },
  { id: 99, number: 'UE-R99', area: 'Rose', size: '1 Kanal', price: 14400000, status: 'available', category: 'residential', description: 'Normal', tags: [] },
  { id: 100, number: 'UE-R100', area: 'Rose', size: '1 Kanal', price: 14400000, status: 'available', category: 'residential', description: 'Normal', tags: [] },
  { id: 101, number: 'UE-R101', area: 'Rose', size: '1 Kanal', price: 14400000, status: 'available', category: 'residential', description: 'Normal', tags: [] },
  { id: 102, number: 'UE-R102', area: 'Rose', size: '1 Kanal', price: 14400000, status: 'available', category: 'residential', description: 'Normal', tags: [] },
  { id: 103, number: 'UE-R103', area: 'Rose', size: '1 Kanal', price: 14400000, status: 'available', category: 'residential', description: 'Corner', tags: ['Corner Plot'] },
  { id: 104, number: 'UE-R104', area: 'Rose', size: '1 Kanal', price: 14400000, status: 'available', category: 'residential', description: 'Normal', tags: [] },
  { id: 105, number: 'UE-R105', area: 'Rose', size: '1 Kanal', price: 14400000, status: 'available', category: 'residential', description: 'Normal', tags: [] },
  { id: 106, number: 'UE-R106', area: 'Rose', size: '1 Kanal', price: 14400000, status: 'available', category: 'residential', description: 'Normal', tags: [] },
  { id: 107, number: 'UE-R107', area: 'Rose', size: '1 Kanal', price: 14400000, status: 'available', category: 'residential', description: 'Normal', tags: [] },
  { id: 108, number: 'UE-R108', area: 'Rose', size: '1 Kanal', price: 14400000, status: 'available', category: 'residential', description: 'Normal', tags: [] },
  { id: 109, number: 'UE-R109', area: 'Rose', size: '1 Kanal', price: 14400000, status: 'available', category: 'residential', description: 'Normal', tags: [] },
  { id: 110, number: 'UE-R110', area: 'Rose', size: '1 Kanal', price: 14400000, status: 'available', category: 'residential', description: 'Normal', tags: [] },
  { id: 111, number: 'UE-R111', area: 'Rose', size: '1 Kanal', price: 14400000, status: 'available', category: 'residential', description: 'Normal', tags: [] },
  { id: 112, number: 'UE-R112', area: 'Rose', size: '1 Kanal', price: 14400000, status: 'available', category: 'residential', description: 'Normal', tags: [] },
  { id: 113, number: 'UE-R113', area: 'Rose', size: '1 Kanal', price: 14400000, status: 'available', category: 'residential', description: 'Normal', tags: [] },
  { id: 114, number: 'UE-R114', area: 'Rose', size: '1 Kanal', price: 14400000, status: 'available', category: 'residential', description: 'Normal', tags: [] },
  { id: 115, number: 'UE-R115', area: 'Rose', size: '1 Kanal', price: 14400000, status: 'available', category: 'residential', description: 'Normal', tags: [] },
  { id: 116, number: 'UE-R116', area: 'Rose', size: '1 Kanal', price: 14400000, status: 'available', category: 'residential', description: 'Normal', tags: [] },
  { id: 117, number: 'UE-R117', area: 'Rose', size: '1 Kanal', price: 14400000, status: 'available', category: 'residential', description: 'Normal', tags: [] },
  { id: 118, number: 'UE-R118', area: 'Rose', size: '1 Kanal', price: 14400000, status: 'available', category: 'residential', description: 'Normal', tags: [] },
  { id: 119, number: 'UE-R119', area: 'Rose', size: '1 Kanal', price: 14400000, status: 'available', category: 'residential', description: 'Corner', tags: ['Corner Plot'] },
  { id: 120, number: 'UE-R120', area: 'Rose', size: '1 Kanal', price: 14400000, status: 'available', category: 'residential', description: 'Corner', tags: ['Corner Plot'] },
  { id: 121, number: 'UE-R121', area: 'Rose', size: '1 Kanal', price: 14400000, status: 'available', category: 'residential', description: 'Normal', tags: [] },
  { id: 122, number: 'UE-R122', area: 'Rose', size: '1 Kanal', price: 14400000, status: 'available', category: 'residential', description: 'Normal', tags: [] },
  { id: 123, number: 'UE-R123', area: 'Rose', size: '1 Kanal', price: 14400000, status: 'available', category: 'residential', description: 'Normal', tags: [] },
  { id: 124, number: 'UE-R124', area: 'Rose', size: '1 Kanal', price: 14400000, status: 'available', category: 'residential', description: 'Normal', tags: [] },
  { id: 125, number: 'UE-R125', area: 'Rose', size: '1 Kanal', price: 14400000, status: 'available', category: 'residential', description: 'Normal', tags: [] },
  { id: 126, number: 'UE-R126', area: 'Rose', size: '1 Kanal', price: 14400000, status: 'available', category: 'residential', description: 'Normal', tags: [] },
  { id: 127, number: 'UE-R127', area: 'Rose', size: '1 Kanal', price: 14400000, status: 'available', category: 'residential', description: 'Corner', tags: ['Corner Plot'] },
  { id: 128, number: 'UE-R128', area: 'Rose', size: '1 Kanal', price: 14400000, status: 'available', category: 'residential', description: 'Corner', tags: ['Corner Plot'] },
  { id: 129, number: 'UE-R129', area: 'Rose', size: '1 Kanal', price: 14400000, status: 'available', category: 'residential', description: 'Normal', tags: [] },
  { id: 130, number: 'UE-R130', area: 'Rose', size: '1 Kanal', price: 14400000, status: 'available', category: 'residential', description: 'Normal', tags: [] },
  { id: 131, number: 'UE-R131', area: 'Rose', size: '1 Kanal', price: 14400000, status: 'available', category: 'residential', description: 'Normal', tags: [] },
  { id: 132, number: 'UE-R132', area: 'Rose', size: '1 Kanal', price: 14400000, status: 'available', category: 'residential', description: 'Normal', tags: [] },
  { id: 133, number: 'UE-R133', area: 'Rose', size: '1 Kanal', price: 14400000, status: 'available', category: 'residential', description: 'Normal', tags: [] },
  { id: 134, number: 'UE-R134', area: 'Rose', size: '1 Kanal', price: 14400000, status: 'available', category: 'residential', description: 'Normal', tags: [] },
  { id: 135, number: 'UE-R135', area: 'Rose', size: '1 Kanal', price: 14400000, status: 'available', category: 'residential', description: 'Normal', tags: [] },
  { id: 136, number: 'UE-R136', area: 'Rose', size: '1 Kanal', price: 14400000, status: 'available', category: 'residential', description: 'Normal', tags: [] },
  { id: 137, number: 'UE-R137', area: 'Rose', size: '1 Kanal', price: 14400000, status: 'available', category: 'residential', description: 'Corner', tags: ['Corner Plot'] },
  { id: 138, number: 'UE-R138', area: 'Rose', size: '1 Kanal', price: 14400000, status: 'available', category: 'residential', description: 'Normal', tags: [] },
  { id: 139, number: 'UE-R139', area: 'Rose', size: '1 Kanal', price: 14400000, status: 'available', category: 'residential', description: 'Normal', tags: [] },
  { id: 140, number: 'UE-R140', area: 'Rose', size: '1 Kanal', price: 14400000, status: 'available', category: 'residential', description: 'Normal', tags: [] },
  { id: 141, number: 'UE-R141', area: 'Rose', size: '1 Kanal', price: 14400000, status: 'available', category: 'residential', description: 'Normal', tags: [] },
  { id: 142, number: 'UE-R142', area: 'Rose', size: '1 Kanal', price: 14400000, status: 'available', category: 'residential', description: 'Normal', tags: [] },
  { id: 143, number: 'UE-R143', area: 'Rose', size: '1 Kanal', price: 14400000, status: 'available', category: 'residential', description: 'Normal', tags: [] },
  { id: 144, number: 'UE-R144', area: 'Rose', size: '1 Kanal', price: 14400000, status: 'available', category: 'residential', description: 'Normal', tags: [] },
  { id: 145, number: 'UE-R145', area: 'Rose', size: '1 Kanal', price: 14400000, status: 'available', category: 'residential', description: 'Normal', tags: [] },
  { id: 146, number: 'UE-R146', area: 'Rose', size: '1 Kanal', price: 14400000, status: 'available', category: 'residential', description: 'Normal', tags: [] },
  { id: 147, number: 'UE-R147', area: 'Rose', size: '1 Kanal', price: 14400000, status: 'available', category: 'residential', description: 'Normal', tags: [] },
  { id: 148, number: 'UE-R148', area: 'Rose', size: '1 Kanal', price: 14400000, status: 'available', category: 'residential', description: 'Normal', tags: [] },
  { id: 149, number: 'UE-R149', area: 'Rose', size: '1 Kanal', price: 14400000, status: 'available', category: 'residential', description: 'Corner', tags: ['Corner Plot'] },
  { id: 150, number: 'UE-R150', area: 'Rose', size: '1 Kanal', price: 14400000, status: 'available', category: 'residential', description: 'Normal', tags: [] },
  { id: 151, number: 'UE-R151', area: 'Rose', size: '1 Kanal', price: 14400000, status: 'available', category: 'residential', description: 'Normal', tags: [] },
  { id: 152, number: 'UE-R152', area: 'Rose', size: '1 Kanal', price: 14400000, status: 'available', category: 'residential', description: 'Normal', tags: [] },
  { id: 153, number: 'UE-R153', area: 'Rose', size: '1 Kanal', price: 14400000, status: 'available', category: 'residential', description: 'Normal', tags: [] },
  { id: 154, number: 'UE-R154', area: 'Rose', size: '1 Kanal', price: 14400000, status: 'available', category: 'residential', description: 'Normal', tags: [] },
  { id: 155, number: 'UE-R155', area: 'Rose', size: '1 Kanal', price: 14400000, status: 'available', category: 'residential', description: 'Normal', tags: [] },
  { id: 156, number: 'UE-R156', area: 'Rose', size: '1 Kanal', price: 14400000, status: 'available', category: 'residential', description: 'Normal', tags: [] },
  { id: 157, number: 'UE-R157', area: 'Rose', size: '1 Kanal', price: 14400000, status: 'available', category: 'residential', description: 'Normal', tags: [] },
  { id: 158, number: 'UE-R158', area: 'Rose', size: '1 Kanal', price: 14400000, status: 'available', category: 'residential', description: 'Normal', tags: [] },
  { id: 159, number: 'UE-R159', area: 'Rose', size: '1 Kanal', price: 14400000, status: 'available', category: 'residential', description: 'Normal', tags: [] },
  { id: 160, number: 'UE-R160', area: 'Rose', size: '1 Kanal', price: 14400000, status: 'available', category: 'residential', description: 'Normal', tags: [] },
  { id: 161, number: 'UE-R161', area: 'Rose', size: '1 Kanal', price: 14400000, status: 'available', category: 'residential', description: 'Corner', tags: ['Corner Plot'] },
  { id: 162, number: 'UE-R162', area: 'Rose', size: '1 Kanal', price: 14400000, status: 'available', category: 'residential', description: 'Corner', tags: ['Corner Plot'] },
  { id: 163, number: 'UE-R163', area: 'Rose', size: '1 Kanal', price: 14400000, status: 'available', category: 'residential', description: 'Normal', tags: [] },
  { id: 164, number: 'UE-R164', area: 'Rose', size: '1 Kanal', price: 14400000, status: 'available', category: 'residential', description: 'Normal', tags: [] },
  { id: 165, number: 'UE-R165', area: 'Rose', size: '1 Kanal', price: 14400000, status: 'available', category: 'residential', description: 'Normal', tags: [] },
  { id: 166, number: 'UE-R166', area: 'Rose', size: '1 Kanal', price: 14400000, status: 'available', category: 'residential', description: 'Normal', tags: [] },
  { id: 167, number: 'UE-R167', area: 'Rose', size: '1 Kanal', price: 14400000, status: 'available', category: 'residential', description: 'Normal', tags: [] },
  { id: 168, number: 'UE-R168', area: 'Rose', size: '1 Kanal', price: 14400000, status: 'available', category: 'residential', description: 'Normal', tags: [] },
  { id: 169, number: 'UE-R169', area: 'Rose', size: '1 Kanal', price: 14400000, status: 'available', category: 'residential', description: 'Normal', tags: [] },
  { id: 170, number: 'UE-R170', area: 'Rose', size: '1 Kanal', price: 14400000, status: 'available', category: 'residential', description: 'Normal', tags: [] },
  { id: 171, number: 'UE-R171', area: 'Rose', size: '1 Kanal', price: 14400000, status: 'available', category: 'residential', description: 'Normal', tags: [] },
  { id: 172, number: 'UE-R172', area: 'Rose', size: '1 Kanal', price: 14400000, status: 'available', category: 'residential', description: 'Normal', tags: [] },
  { id: 173, number: 'UE-R173', area: 'Rose', size: '1 Kanal', price: 14400000, status: 'available', category: 'residential', description: 'Corner', tags: ['Corner Plot'] },
  { id: 174, number: 'UE-R174', area: 'Rose', size: '1 Kanal', price: 14400000, status: 'available', category: 'residential', description: 'Corner', tags: ['Corner Plot'] },
  { id: 175, number: 'UE-R175', area: 'Rose', size: '1 Kanal', price: 14400000, status: 'available', category: 'residential', description: 'Normal', tags: [] },
  { id: 176, number: 'UE-R176', area: 'Rose', size: '1 Kanal', price: 14400000, status: 'available', category: 'residential', description: 'Normal', tags: [] },
  { id: 177, number: 'UE-R177', area: 'Rose', size: '1 Kanal', price: 14400000, status: 'available', category: 'residential', description: 'Normal', tags: [] },
  { id: 178, number: 'UE-R178', area: 'Rose', size: '1 Kanal', price: 14400000, status: 'available', category: 'residential', description: 'Normal', tags: [] },
  { id: 179, number: 'UE-R179', area: 'Rose', size: '1 Kanal', price: 14400000, status: 'available', category: 'residential', description: 'Normal', tags: [] },
  { id: 180, number: 'UE-R180', area: 'Rose', size: '1 Kanal', price: 14400000, status: 'available', category: 'residential', description: 'Normal', tags: [] },
  { id: 181, number: 'UE-R181', area: 'Rose', size: '1 Kanal', price: 14400000, status: 'available', category: 'residential', description: 'Normal', tags: [] },
  { id: 182, number: 'UE-R182', area: 'Rose', size: '1 Kanal', price: 14400000, status: 'available', category: 'residential', description: 'Normal', tags: [] },
  { id: 183, number: 'UE-R183', area: 'Rose', size: '1 Kanal', price: 14400000, status: 'available', category: 'residential', description: 'Normal', tags: [] },
  { id: 184, number: 'UE-R184', area: 'Rose', size: '1 Kanal', price: 14400000, status: 'available', category: 'residential', description: 'Normal', tags: [] },
  { id: 185, number: 'UE-R185', area: 'Rose', size: '1 Kanal', price: 14400000, status: 'available', category: 'residential', description: 'Normal', tags: [] },
  { id: 186, number: 'UE-R186', area: 'Rose', size: '1 Kanal', price: 14400000, status: 'available', category: 'residential', description: 'Normal', tags: [] },
  { id: 187, number: 'UE-R187', area: 'Rose', size: '1 Kanal', price: 14400000, status: 'available', category: 'residential', description: 'Normal', tags: [] },
  { id: 188, number: 'UE-R188', area: 'Rose', size: '1 Kanal', price: 14400000, status: 'available', category: 'residential', description: 'Normal', tags: [] },
  { id: 189, number: 'UE-R189', area: 'Rose', size: '1 Kanal', price: 14400000, status: 'available', category: 'residential', description: 'Normal', tags: [] },
  { id: 190, number: 'UE-R190', area: 'Rose', size: '1 Kanal', price: 14400000, status: 'available', category: 'residential', description: 'Normal', tags: [] },
  { id: 191, number: 'UE-R191', area: 'Rose', size: '1 Kanal', price: 14400000, status: 'available', category: 'residential', description: 'Corner', tags: ['Corner Plot'] },
  { id: 192, number: 'UE-R192', area: 'Rose', size: '1 Kanal', price: 14400000, status: 'available', category: 'residential', description: 'Corner', tags: ['Corner Plot'] },
  { id: 193, number: 'UE-R193', area: 'Rose', size: '1 Kanal', price: 14400000, status: 'available', category: 'residential', description: 'Normal', tags: [] },
  { id: 194, number: 'UE-R194', area: 'Rose', size: '1 Kanal', price: 14400000, status: 'available', category: 'residential', description: 'Normal', tags: [] },
  { id: 195, number: 'UE-R195', area: 'Rose', size: '1 Kanal', price: 14400000, status: 'available', category: 'residential', description: 'Normal', tags: [] },
  { id: 196, number: 'UE-R196', area: 'Rose', size: '1 Kanal', price: 14400000, status: 'available', category: 'residential', description: 'Normal', tags: [] },
  { id: 197, number: 'UE-R197', area: 'Rose', size: '1 Kanal', price: 14400000, status: 'available', category: 'residential', description: 'Normal', tags: [] },
  { id: 198, number: 'UE-R198', area: 'Rose', size: '1 Kanal', price: 14400000, status: 'available', category: 'residential', description: 'Normal', tags: [] },
  { id: 199, number: 'UE-R199', area: 'Rose', size: '1 Kanal', price: 14400000, status: 'available', category: 'residential', description: 'Normal', tags: [] },
  { id: 200, number: 'UE-R200', area: 'Rose', size: '1 Kanal', price: 14400000, status: 'available', category: 'residential', description: 'Normal', tags: [] },
  { id: 201, number: 'UE-R201', area: 'Rose', size: '1 Kanal', price: 14400000, status: 'available', category: 'residential', description: 'Normal', tags: [] },
  { id: 202, number: 'UE-R202', area: 'Rose', size: '1 Kanal', price: 14400000, status: 'available', category: 'residential', description: 'Normal', tags: [] },
  { id: 203, number: 'UE-R203', area: 'Rose', size: '1 Kanal', price: 14400000, status: 'available', category: 'residential', description: 'Normal', tags: [] },
  { id: 204, number: 'UE-R204', area: 'Rose', size: '1 Kanal', price: 14400000, status: 'available', category: 'residential', description: 'Normal', tags: [] },
  { id: 205, number: 'UE-R205', area: 'Rose', size: '1 Kanal', price: 14400000, status: 'available', category: 'residential', description: 'Normal', tags: [] },
  { id: 206, number: 'UE-R206', area: 'Rose', size: '1 Kanal', price: 14400000, status: 'available', category: 'residential', description: 'Normal', tags: [] },
  { id: 207, number: 'UE-R207', area: 'Rose', size: '1 Kanal', price: 14400000, status: 'available', category: 'residential', description: 'Normal', tags: [] },
  { id: 208, number: 'UE-R208', area: 'Rose', size: '1 Kanal', price: 14400000, status: 'available', category: 'residential', description: 'Normal', tags: [] },
  { id: 209, number: 'UE-R209', area: 'Rose', size: '1 Kanal', price: 14400000, status: 'available', category: 'residential', description: 'Corner', tags: ['Corner Plot'] },
  { id: 210, number: 'UE-R210', area: 'Rose', size: '1 Kanal', price: 14400000, status: 'available', category: 'residential', description: 'Corner', tags: ['Corner Plot'] },
  { id: 211, number: 'UE-R211', area: 'Rose', size: '1 Kanal', price: 14400000, status: 'available', category: 'residential', description: 'Normal', tags: [] },
  { id: 212, number: 'UE-R212', area: 'Rose', size: '1 Kanal', price: 14400000, status: 'available', category: 'residential', description: 'Normal', tags: [] },
  { id: 213, number: 'UE-R213', area: 'Rose', size: '1 Kanal', price: 14400000, status: 'available', category: 'residential', description: 'Normal', tags: [] },
  { id: 214, number: 'UE-R214', area: 'Rose', size: '1 Kanal', price: 14400000, status: 'available', category: 'residential', description: 'Normal', tags: [] },
  { id: 215, number: 'UE-R215', area: 'Rose', size: '1 Kanal', price: 14400000, status: 'available', category: 'residential', description: 'Normal', tags: [] },
  { id: 216, number: 'UE-R216', area: 'Rose', size: '1 Kanal', price: 14400000, status: 'available', category: 'residential', description: 'Normal', tags: [] },
  { id: 217, number: 'UE-R217', area: 'Rose', size: '1 Kanal', price: 14400000, status: 'available', category: 'residential', description: 'Normal', tags: [] },
  { id: 218, number: 'UE-R218', area: 'Rose', size: '1 Kanal', price: 14400000, status: 'available', category: 'residential', description: 'Normal', tags: [] },
  { id: 219, number: 'UE-R219', area: 'Rose', size: '1 Kanal', price: 14400000, status: 'available', category: 'residential', description: 'Normal', tags: [] },
  { id: 220, number: 'UE-R220', area: 'Rose', size: '1 Kanal', price: 14400000, status: 'available', category: 'residential', description: 'Normal', tags: [] },
  { id: 221, number: 'UE-R221', area: 'Rose', size: '1 Kanal', price: 14400000, status: 'available', category: 'residential', description: 'Normal', tags: [] },
  { id: 222, number: 'UE-R222', area: 'Rose', size: '1 Kanal', price: 14400000, status: 'available', category: 'residential', description: 'Normal', tags: [] },
  { id: 223, number: 'UE-R223', area: 'Rose', size: '1 Kanal', price: 14400000, status: 'available', category: 'residential', description: 'Normal', tags: [] },
  { id: 224, number: 'UE-R224', area: 'Rose', size: '1 Kanal', price: 14400000, status: 'available', category: 'residential', description: 'Normal', tags: [] },
  { id: 225, number: 'UE-R225', area: 'Rose', size: '1 Kanal', price: 14400000, status: 'available', category: 'residential', description: 'Normal', tags: [] },
  { id: 226, number: 'UE-R226', area: 'Rose', size: '1 Kanal', price: 14400000, status: 'available', category: 'residential', description: 'Normal', tags: [] },
  { id: 227, number: 'UE-R227', area: 'Rose', size: '1 Kanal', price: 14400000, status: 'available', category: 'residential', description: 'Normal', tags: [] },
  { id: 228, number: 'UE-R228', area: 'Rose', size: '1 Kanal', price: 14400000, status: 'available', category: 'residential', description: 'Corner', tags: ['Corner Plot'] },
  { id: 229, number: 'UE-R229', area: 'Rose', size: '1 Kanal', price: 14400000, status: 'available', category: 'residential', description: 'Corner', tags: ['Corner Plot'] },
  { id: 230, number: 'UE-R230', area: 'Rose', size: '1 Kanal', price: 14400000, status: 'available', category: 'residential', description: 'Normal', tags: [] },
  { id: 231, number: 'UE-R231', area: 'Rose', size: '1 Kanal', price: 14400000, status: 'available', category: 'residential', description: 'Normal', tags: [] },
  { id: 232, number: 'UE-R232', area: 'Rose', size: '1 Kanal', price: 14400000, status: 'available', category: 'residential', description: 'Normal', tags: [] },
  { id: 233, number: 'UE-R233', area: 'Rose', size: '1 Kanal', price: 14400000, status: 'available', category: 'residential', description: 'Normal', tags: [] },
  { id: 234, number: 'UE-R234', area: 'Rose', size: '1 Kanal', price: 14400000, status: 'available', category: 'residential', description: 'Normal', tags: [] },
  { id: 235, number: 'UE-R235', area: 'Rose', size: '1 Kanal', price: 14400000, status: 'available', category: 'residential', description: 'Normal', tags: [] },
  { id: 236, number: 'UE-R236', area: 'Rose', size: '1 Kanal', price: 14400000, status: 'available', category: 'residential', description: 'Normal', tags: [] },
  { id: 237, number: 'UE-R237', area: 'Rose', size: '1 Kanal', price: 14400000, status: 'available', category: 'residential', description: 'Normal', tags: [] },
  { id: 238, number: 'UE-R238', area: 'Rose', size: '1 Kanal', price: 14400000, status: 'available', category: 'residential', description: 'Normal', tags: [] },
  { id: 239, number: 'UE-R239', area: 'Rose', size: '1 Kanal', price: 14400000, status: 'available', category: 'residential', description: 'Normal', tags: [] },
  { id: 240, number: 'UE-R240', area: 'Rose', size: '1 Kanal', price: 14400000, status: 'available', category: 'residential', description: 'Normal', tags: [] },
  { id: 241, number: 'UE-R241', area: 'Rose', size: '1 Kanal', price: 14400000, status: 'available', category: 'residential', description: 'Normal', tags: [] },
  { id: 242, number: 'UE-R242', area: 'Rose', size: '1 Kanal', price: 14400000, status: 'available', category: 'residential', description: 'Normal', tags: [] },
  { id: 243, number: 'UE-R243', area: 'Rose', size: '1 Kanal', price: 14400000, status: 'available', category: 'residential', description: 'Normal', tags: [] },
  { id: 244, number: 'UE-R244', area: 'Rose', size: '1 Kanal', price: 14400000, status: 'available', category: 'residential', description: 'Normal', tags: [] },
  { id: 245, number: 'UE-R245', area: 'Rose', size: '1 Kanal', price: 14400000, status: 'available', category: 'residential', description: 'Normal', tags: [] },
  { id: 246, number: 'UE-R246', area: 'Rose', size: '1 Kanal', price: 14400000, status: 'available', category: 'residential', description: 'Corner', tags: ['Corner Plot'] }
];
let plotCounter = 246;

// ─── Packages ────────────────────────────────────────────────────────────────
let packages = [
  {
    id: 1, name: 'Silver Package', totalPlots: 25, commissionPct: 12,
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
    id: 2, name: 'Gold Package', totalPlots: 50, commissionPct: 15,
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
    commissionPaidAmount: 0,
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
    commissionPaidAmount: 0,
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
    commissionPaidAmount: 0,
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
  { id: 1, title: 'Rose Area Plots Now Available!', body: 'We are pleased to announce the launch of 246 residential plots in the Rose area. All plots are 1 Kanal in size. Limited availability — book early to secure your preferred plot.', date: '2026-04-20', tag: 'New Launch', important: true, images: [] },
  { id: 2, title: 'Revised Payment Plan 2026', body: 'Flexible 4-year installment plans are now available for all Rose area plots. Pay a 10% down payment and spread the balance across monthly and semi-annual installments with zero markup.', date: '2026-04-15', tag: 'Finance', important: false, images: [] },
  { id: 3, title: 'Development Work Update', body: 'Roads, boundary walls, and utility infrastructure work in the Rose area is progressing rapidly. Underground water, electricity, and gas connections are being laid in phases. Expected first-phase completion by mid-2026.', date: '2026-04-10', tag: 'Development', important: true, images: [] },
  { id: 4, title: 'Corner Plot Premium Pricing', body: '34 corner plots in the Rose area carry a 10% premium on the base price. Corner plots offer extra frontage, natural light, and superior resale value. These are selling fast — enquire today.', date: '2026-04-05', tag: 'Notice', important: false, images: [] },
];
let annCounter = 4;

// ─── File-based Persistence ───────────────────────────────────────────────────
const DB_PATH = path.join(__dirname, 'data', 'db.json');
const DB_DIR = path.dirname(DB_PATH);
const MAX_BACKUPS = 5;
let lastAutoRestore = null;

function getBackupFiles() {
  try {
    return fs.readdirSync(DB_DIR)
      .filter(f => f.startsWith('db.json.bak-') && !f.endsWith('.meta.json'))
      .sort()
      .map(f => path.join(DB_DIR, f));
  } catch { return []; }
}

function applyDb(db) {
  if (db.sectors)              { sectors = db.sectors;                        }
  if (db.sectorCounter)        { sectorCounter = db.sectorCounter;            }
  if (db.plots)                { plots = db.plots;                            }
  if (db.plotCounter)          { plotCounter = db.plotCounter;                }
  if (db.packages)             { packages = db.packages;                      }
  if (db.packageCounter)       { packageCounter = db.packageCounter;          }
  if (db.dealers)              { dealers = db.dealers;                        }
  if (db.dealerCounter)        { dealerCounter = db.dealerCounter;            }
  if (db.dealerTargets)        { dealerTargets = db.dealerTargets;            }
  if (db.dealerRegistrations)  { dealerRegistrations = db.dealerRegistrations; }
  if (db.regCounter)           { regCounter = db.regCounter;                  }
  if (db.deals)                { deals = db.deals;                            }
  if (db.dealCounter)          { dealCounter = db.dealCounter;                }
  if (db.bookings)             { bookings = db.bookings;                      }
  if (db.bookingCounter)       { bookingCounter = db.bookingCounter;          }
  if (db.customers)            { customers = db.customers;                    }
  if (db.customerCounter)      { customerCounter = db.customerCounter;        }
  if (db.operationsStaff)      { operationsStaff = db.operationsStaff;        }
  if (db.opsCounter)           { opsCounter = db.opsCounter;                  }
  if (db.announcements)        { announcements = db.announcements; annCounter = announcements.reduce((m, a) => Math.max(m, a.id || 0), annCounter); }
  if (db.annCounter)           { annCounter = db.annCounter;                  }
  if (db.ledgerIdCounter)      { ledgerIdCounter = db.ledgerIdCounter;        }
}

function loadDb() {
  fs.mkdirSync(DB_DIR, { recursive: true });

  if (fs.existsSync(DB_PATH)) {
    try {
      const db = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
      applyDb(db);
      console.log('[DB] Data loaded from', DB_PATH);
      return;
    } catch (e) {
      console.error('[DB] db.json is corrupted:', e.message, '— attempting backup restore...');
    }
  }

  const backups = getBackupFiles().reverse();
  for (const bak of backups) {
    try {
      const db = JSON.parse(fs.readFileSync(bak, 'utf8'));
      applyDb(db);
      lastAutoRestore = { filename: path.basename(bak), restoredAt: new Date().toISOString() };
      console.warn('[DB] Restored from backup:', bak);
      return;
    } catch { /* try next */ }
  }

  if (backups.length > 0) {
    console.error('[DB] All backups are also corrupted — starting fresh.');
  } else {
    console.log('[DB] No existing data file — starting fresh.');
  }
}

let _saveTimer = null;
function saveDb() {
  if (_saveTimer) clearTimeout(_saveTimer);
  _saveTimer = setTimeout(() => {
    try {
      fs.mkdirSync(DB_DIR, { recursive: true });

      if (fs.existsSync(DB_PATH)) {
        const ts = new Date().toISOString().replace(/[:.]/g, '-');
        const bakPath = path.join(DB_DIR, `db.json.bak-${ts}`);
        fs.copyFileSync(DB_PATH, bakPath);

        const backups = getBackupFiles();
        if (backups.length > MAX_BACKUPS) {
          const toDelete = backups.slice(0, backups.length - MAX_BACKUPS);
          toDelete.forEach(f => { try { fs.unlinkSync(f); } catch {} try { fs.unlinkSync(f + '.meta.json'); } catch {} });
        }
      }

      const db = {
        sectors, sectorCounter,
        plots, plotCounter,
        packages, packageCounter,
        dealers, dealerCounter,
        dealerTargets,
        dealerRegistrations, regCounter,
        deals, dealCounter,
        bookings, bookingCounter,
        customers, customerCounter,
        operationsStaff, opsCounter,
        announcements, annCounter,
        ledgerIdCounter,
      };
      fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
    } catch (e) {
      console.error('[DB] Failed to save data:', e.message);
    }
  }, 500);
}

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

// ─── Load persisted data before serving routes ────────────────────────────────
loadDb();

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
      const token = `dealer-${dealer.id}-${Date.now()}`;
      sessions[token] = { dealerId: dealer.id, role: dealer.role || 'dealer' };
      const { password: _, ...safe } = dealer;
      return res.json({ success: true, dealer: safe, token });
    }

    const ops = operationsStaff.find(o => o.username === username && o.password === password);
    if (ops) {
      const token = `ops-${ops.id}-${Date.now()}`;
      sessions[token] = { dealerId: ops.id, role: 'operations' };
      const { password: _, ...safe } = ops;
      return res.json({ success: true, dealer: safe, token });
    }

    return res.status(401).json({ error: 'Invalid credentials' });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Server error during login' });
  }
});

// ─── Session Validation ───────────────────────────────────────────────────────
app.get('/api/auth/check', (req, res) => {
  const session = validateSession(req);
  if (!session) return res.status(401).json({ valid: false });
  res.json({ valid: true, role: session.role, dealerId: session.dealerId });
});

// ─── Per-Dealer Dashboard ─────────────────────────────────────────────────────
app.get('/api/dealer/dashboard/:dealerId', (req, res) => {
  const session = validateSession(req);
  const dealerId = parseInt(req.params.dealerId);
  if (!session) return res.status(401).json({ error: 'Authentication required' });
  if (session.role !== 'admin' && session.dealerId !== dealerId) return res.status(403).json({ error: 'Access denied' });
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

  const now = new Date();
  const monthlySales = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    const ym = d.toISOString().slice(0, 7);
    const month = d.toLocaleString('en-US', { month: 'short' });
    const mb = myBookings.filter(b => b.createdAt.startsWith(ym));
    return { month, bookings: mb.length, payments: mb.reduce((s, b) => s + b.plotPrice, 0) };
  });

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

  // ── Inventory: per package-size, available plots ──────────────────────────
  let inventory = null;
  if (target && target.sizes && target.sizes.length > 0) {
    inventory = target.sizes.map(s => {
      const assignedIds = (target.assignedPlots || {})[s.size] || [];
      const availablePlots = assignedIds.length > 0
        ? plots.filter(p => assignedIds.includes(p.id) && p.status === 'available')
        : [];
      return {
        size: s.size,
        quota: s.target,
        assignedCount: assignedIds.length,
        availableCount: availablePlots.length,
        plots: availablePlots.map(p => ({
          id: p.id, number: p.number, area: p.area, size: p.size,
          price: computeEffectivePrice(p.price, p.tags || []),
          description: p.description || '',
          tags: p.tags || [],
        })),
      };
    });
  }

  const commissionRate = (dealer.commissionPct !== undefined && dealer.commissionPct !== null)
    ? dealer.commissionPct
    : (pkg?.commissionPct || 0);
  const totalCommissionEarned = myBookings.reduce((s, b) => s + (b.commissionAmount || 0), 0);
  const commissions = [...myBookings].reverse().map(b => ({
    ref: b.bookingRef, plot: b.plotNumber, size: b.plotSize, area: b.area,
    plotPrice: b.plotPrice, commissionPct: b.commissionPct || 0,
    commissionAmount: b.commissionAmount || 0, status: b.status, date: b.createdAt,
  }));

  res.json({
    dealer: { id: dealer.id, name: dealer.name, username: dealer.username, securityDepositPaid: dealer.securityDepositPaid || false, securityDepositRequired: dealer.securityDepositRequired || 0, rewardGiven: dealer.rewardGiven || false, commissionPct: dealer.commissionPct ?? null },
    target: target ? { ...target, totalTarget, paymentTarget: target.paymentTarget, packageId: target.packageId } : null,
    package: pkg ? { id: pkg.id, name: pkg.name, rewardDescription: pkg.rewardDescription, rewardAmount: pkg.rewardAmount, commissionPct: pkg.commissionPct || 0 } : null,
    sizeBreakdown, targetPct,
    stats: { achieved, totalTarget, paymentsCollected, paymentTarget: target?.paymentTarget || 0 },
    commission: { rate: commissionRate, hasOverride: dealer.commissionPct !== undefined && dealer.commissionPct !== null, pkgRate: pkg?.commissionPct || 0, totalEarned: totalCommissionEarned, totalPaid: dealer.commissionPaidAmount || 0, totalOutstanding: Math.max(0, totalCommissionEarned - (dealer.commissionPaidAmount || 0)) },
    commissions,
    monthlySales, plotDistribution, recentBookings, activeDeals, inventory,
  });
});

// ─── Admin: List All Dealers ──────────────────────────────────────────────────
app.get('/api/admin/dealers', (req, res) => {
  const result = dealers.filter(d => d.role !== 'admin').map(d => {
    const target = dealerTargets[d.id];
    const pkg = target?.packageId ? packages.find(p => p.id === target.packageId) : null;
    const { myBookings, achieved, paymentsCollected } = getDealerStats(d.id);
    const totalTarget = target ? target.sizes.reduce((sum, s) => sum + s.target, 0) : 0;
    const pct = totalTarget > 0 ? Math.round((achieved / totalTarget) * 100) : 0;
    const commissionEarned = myBookings.reduce((s, b) => s + (b.commissionAmount || 0), 0);
    const commissionPaid = d.commissionPaidAmount || 0;
    const commissionOutstanding = Math.max(0, commissionEarned - commissionPaid);
    const { password: _, ...safe } = d;
    return {
      ...safe, hasTarget: !!target, totalTarget, achieved, pct, paymentsCollected,
      paymentTarget: target?.paymentTarget || 0, notes: target?.notes || '',
      packageId: target?.packageId || null, packageName: pkg?.name || null,
      commissionPct: (d.commissionPct !== undefined && d.commissionPct !== null) ? d.commissionPct : (pkg?.commissionPct || 0),
      hasCommissionOverride: d.commissionPct !== undefined && d.commissionPct !== null,
      commissionPctOverride: d.commissionPct ?? null,
      commissionEarned, commissionPaid, commissionOutstanding,
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

  const { packageId, sizes, paymentTarget, notes, assignedPlots } = req.body;

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

  // Trim assignedPlots to each size's quota
  const trimmedAssigned = {};
  resolvedSizes.forEach(s => {
    const ids = (assignedPlots || {})[s.size];
    trimmedAssigned[s.size] = Array.isArray(ids) ? ids.slice(0, s.target) : [];
  });

  dealerTargets[dealerId] = {
    dealerId, packageId: packageId ? parseInt(packageId) : null,
    paymentTarget: paymentTarget || 0,
    sizes: resolvedSizes,
    assignedPlots: trimmedAssigned,
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

// ─── Admin: Commission Payout ─────────────────────────────────────────────────
app.patch('/api/admin/dealers/:id/commission-payout', (req, res) => {
  const dealer = dealers.find(d => d.id === parseInt(req.params.id) && d.role !== 'admin');
  if (!dealer) return res.status(404).json({ error: 'Dealer not found' });
  const amount = parseInt(req.body.amount);
  if (isNaN(amount) || amount <= 0) return res.status(400).json({ error: 'Amount must be a positive number' });
  const notes = (req.body.notes || '').trim();
  const adminName = (req.body.adminName || 'Admin').trim();
  if (!dealer.commissionPayouts) dealer.commissionPayouts = [];
  const entry = {
    id: Date.now(),
    amount,
    notes,
    adminName,
    date: new Date().toISOString(),
  };
  dealer.commissionPayouts.push(entry);
  dealer.commissionPaidAmount = (dealer.commissionPaidAmount || 0) + amount;
  res.json({ success: true, entry, commissionPaidAmount: dealer.commissionPaidAmount });
});

// ─── Admin: Commission Payout History ─────────────────────────────────────────
app.get('/api/admin/dealers/:id/commission-payouts', (req, res) => {
  const dealer = dealers.find(d => d.id === parseInt(req.params.id) && d.role !== 'admin');
  if (!dealer) return res.status(404).json({ error: 'Dealer not found' });
  res.json([...(dealer.commissionPayouts || [])].reverse());
});

// ─── Admin: Dealer Account Ledger ─────────────────────────────────────────────
app.get('/api/admin/dealers/:id/account', (req, res) => {
  const dealer = dealers.find(d => d.id === parseInt(req.params.id) && d.role !== 'admin');
  if (!dealer) return res.status(404).json({ error: 'Dealer not found' });

  const target = dealerTargets[dealer.id];
  const pkg = target?.packageId ? packages.find(p => p.id === target.packageId) : null;
  const effectiveCommissionPct = (dealer.commissionPct !== null && dealer.commissionPct !== undefined)
    ? dealer.commissionPct
    : (pkg?.commissionPct || 0);

  const myBookings = bookings.filter(b => b.dealerId === dealer.id);
  const bookingList = myBookings.map(b => {
    const plot = plots.find(p => p.id === b.plotId);
    return {
      bookingRef: b.bookingRef,
      bookingId: b.id,
      plotNumber: b.plotNumber || plot?.plotNumber || '',
      plotSize: b.plotSize || plot?.size || '',
      bookingStatus: b.status,
      effectivePrice: b.plotPrice || 0,
      commissionPct: b.commissionPct ?? effectiveCommissionPct,
      commissionAmount: b.commissionAmount || 0,
      customerName: b.customerName || '',
      bookedAt: b.createdAt || b.bookedAt || '',
      downPayment: b.downPayment || 0,
    };
  }).sort((a, b) => new Date(b.bookedAt) - new Date(a.bookedAt));

  const commissionEarned = myBookings.reduce((s, b) => s + (b.commissionAmount || 0), 0);
  const commissionPaid = dealer.commissionPaidAmount || 0;
  const commissionOutstanding = Math.max(0, commissionEarned - commissionPaid);

  // Payment target: compute from assigned plots' effective prices × 20%
  const assignedPlotIds = target?.assignedPlots
    ? Object.values(target.assignedPlots).flat()
    : [];
  const assignedPlotsData = assignedPlotIds.map(id => plots.find(p => p.id === id)).filter(Boolean);
  const computedPaymentTarget = assignedPlotsData.length > 0
    ? Math.round(assignedPlotsData.reduce((s, p) => s + computeEffectivePrice(p.price, p.tags || []), 0) * 0.20)
    : (target?.paymentTarget || 0);

  // Collected: down-payments from confirmed bookings only
  const confirmedBookings = myBookings.filter(b => b.status === 'confirmed');
  const paymentsCollected = confirmedBookings.reduce((s, b) => s + (b.downPayment || 0), 0);
  const targetPct = computedPaymentTarget > 0 ? Math.min(100, Math.round((paymentsCollected / computedPaymentTarget) * 100)) : 0;
  const remainingPct = Math.max(0, 100 - targetPct);

  res.json({
    bookings: bookingList,
    commission: {
      pct: effectiveCommissionPct,
      hasOverride: dealer.commissionPct !== null && dealer.commissionPct !== undefined,
      earned: commissionEarned,
      paid: commissionPaid,
      outstanding: commissionOutstanding,
    },
    paymentTarget: {
      target: computedPaymentTarget,
      collected: paymentsCollected,
      pct: targetPct,
      remainingPct,
      remaining: Math.max(0, computedPaymentTarget - paymentsCollected),
    },
    payoutHistory: [...(dealer.commissionPayouts || [])].reverse(),
  });
});

// ─── Admin: Mark Reward Given ─────────────────────────────────────────────────
app.patch('/api/admin/dealers/:id/commission', (req, res) => {
  const dealer = dealers.find(d => d.id === parseInt(req.params.id) && d.role !== 'admin');
  if (!dealer) return res.status(404).json({ error: 'Dealer not found' });
  const pct = req.body.commissionPct;
  dealer.commissionPct = (pct === null || pct === '' || pct === undefined) ? null : parseFloat(pct) || 0;
  res.json({ success: true });
});

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
    commissionPaidAmount: 0,
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
  const { name, sizes, rewardDescription, rewardAmount, commissionPct } = req.body;
  if (!name || !sizes) return res.status(400).json({ error: 'name and sizes required' });
  const totalPlots = sizes.reduce((sum, s) => sum + (parseInt(s.quota) || 0), 0);
  const pkg = {
    id: ++packageCounter, name, totalPlots,
    commissionPct: parseFloat(commissionPct) || 0,
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
  const { name, sizes, rewardDescription, rewardAmount, commissionPct } = req.body;
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
  if (commissionPct !== undefined) pkg.commissionPct = parseFloat(commissionPct) || 0;
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
    if (!number || !size || price === undefined || price === null || price === '' || !area) {
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
      tags: [],
    };
    plots.push(plot);
    results.added.push(plot);
  }
  saveDb();
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
  const { status, category, area, dealerId } = req.query;
  let filtered = [...plots];
  if (status) filtered = filtered.filter(p => p.status === status);
  if (category) filtered = filtered.filter(p => p.category === category);
  if (area) filtered = filtered.filter(p => p.area === area);

  // ── Dealer-scoped filter ──────────────────────────────────────────────────
  if (dealerId) {
    const target = dealerTargets[parseInt(dealerId)];
    if (target && target.sizes && target.sizes.length > 0) {
      const allowedIds = new Set();
      target.sizes.forEach(s => {
        if ((s.target || 0) <= 0) return;
        const assignedIds = (target.assignedPlots || {})[s.size] || [];
        assignedIds.forEach(id => allowedIds.add(id));
      });
      filtered = filtered.filter(p => allowedIds.has(p.id));
    } else {
      filtered = [];
    }
  }

  res.json(filtered.map(withEffectivePrice));
});

app.get('/api/plots/:id', (req, res) => {
  const plot = plots.find(p => p.id === parseInt(req.params.id));
  if (!plot) return res.status(404).json({ error: 'Plot not found' });
  res.json(withEffectivePrice(plot));
});

// ─── Ledger / Installment helpers ─────────────────────────────────────────────
const PAYMENT_PLANS_SRV = {
  '5 Marla':  { total: 4000000,  downPayment: 400000,  confirmation: 400000,  monthlyInstallment: 20000, monthlyCount: 40, semiAnnualInstallment: 130000, semiAnnualCount: 8, possession: 1360000 },
  '7 Marla':  { total: 5460000,  downPayment: 546000,  confirmation: 546000,  monthlyInstallment: 25000, monthlyCount: 40, semiAnnualInstallment: 150000, semiAnnualCount: 8, possession: 2168000 },
  '10 Marla': { total: 7600000,  downPayment: 760000,  confirmation: 760000,  monthlyInstallment: 38000, monthlyCount: 40, semiAnnualInstallment: 200000, semiAnnualCount: 8, possession: 2960000 },
  '1 Kanal':  { total: 14400000, downPayment: 1440000, confirmation: 1440000, monthlyInstallment: 70000, monthlyCount: 40, semiAnnualInstallment: 300000, semiAnnualCount: 8, possession: 6320000 },
};

function addMonthsToDate(isoStr, months) {
  const d = new Date(isoStr);
  d.setMonth(d.getMonth() + months);
  return d.toISOString().split('T')[0];
}
function addDaysToDate(isoStr, days) {
  const d = new Date(isoStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

let ledgerIdCounter = 0;

function generateLedger(booking) {
  const plan = PAYMENT_PLANS_SRV[booking.plotSize];
  const totalPrice = booking.plotPrice || 0;
  const scale = plan ? totalPrice / plan.total : 1;
  const start = booking.createdAt || new Date().toISOString();
  const items = [];

  if (!plan) return items;

  const dp = booking.downPayment > 0 ? booking.downPayment : Math.round(plan.downPayment * scale);

  items.push({
    id: ++ledgerIdCounter, type: 'down-payment', label: 'Down Payment',
    dueDate: start.split('T')[0], amount: dp,
    status: 'paid', paidDate: start.split('T')[0], paidAmount: dp, paidBy: 'Customer', notes: 'Paid at booking',
  });

  items.push({
    id: ++ledgerIdCounter, type: 'confirmation', label: 'Confirmation',
    dueDate: addDaysToDate(start, 30), amount: Math.round(plan.confirmation * scale),
    status: 'pending', paidDate: null, paidAmount: null, paidBy: null, notes: null,
  });

  for (let i = 1; i <= plan.monthlyCount; i++) {
    items.push({
      id: ++ledgerIdCounter, type: 'monthly', label: `Monthly #${i}`,
      dueDate: addMonthsToDate(start, i), amount: Math.round(plan.monthlyInstallment * scale),
      status: 'pending', paidDate: null, paidAmount: null, paidBy: null, notes: null,
    });
  }

  for (let i = 1; i <= plan.semiAnnualCount; i++) {
    items.push({
      id: ++ledgerIdCounter, type: 'semi-annual', label: `Semi-Annual #${i}`,
      dueDate: addMonthsToDate(start, i * 6), amount: Math.round(plan.semiAnnualInstallment * scale),
      status: 'pending', paidDate: null, paidAmount: null, paidBy: null, notes: null,
    });
  }

  items.push({
    id: ++ledgerIdCounter, type: 'possession', label: 'Possession',
    dueDate: addMonthsToDate(start, 48), amount: Math.round(plan.possession * scale),
    status: 'pending', paidDate: null, paidAmount: null, paidBy: null, notes: null,
  });

  return items;
}

function recomputeOverdue(ledger) {
  const today = new Date().toISOString().split('T')[0];
  return ledger.map(item => ({
    ...item,
    status: item.status === 'paid' ? 'paid' : (item.dueDate < today ? 'overdue' : 'pending'),
  }));
}

function ledgerSummary(ledger) {
  const live = recomputeOverdue(ledger);
  const totalAmount = live.reduce((s, i) => s + i.amount, 0);
  const totalPaid = live.filter(i => i.status === 'paid').reduce((s, i) => s + (i.paidAmount || i.amount), 0);
  const totalPending = live.filter(i => i.status === 'pending').reduce((s, i) => s + i.amount, 0);
  const totalOverdue = live.filter(i => i.status === 'overdue').reduce((s, i) => s + i.amount, 0);
  const upcoming = live.filter(i => i.status !== 'paid').sort((a, b) => a.dueDate.localeCompare(b.dueDate))[0];
  return { totalAmount, totalPaid, totalPending, totalOverdue, nextDueDate: upcoming?.dueDate || null, nextDueAmount: upcoming?.amount || 0, nextDueLabel: upcoming?.label || null };
}

// ─── Bookings ─────────────────────────────────────────────────────────────────
app.post('/api/bookings', (req, res) => {
  const {
    plotId, dealerId,
    name, fatherName, cnic, phone, email,
    residentialAddress, postalAddress, photo, cnicImage,
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
  if (dealerId) {
    const dealerTargetCheck = dealerTargets[dealerId];
    const assignedForSize = (dealerTargetCheck?.assignedPlots || {})[plot.size] || [];
    if (!assignedForSize.includes(plotId)) {
      return res.status(403).json({ error: 'Plot not assigned to this dealer' });
    }
  }
  const resolvedDealerId = dealerId ? (dealers.find(d => d.id === dealerId && d.role !== 'admin') ? dealerId : null) : null;
  const dealerForCommission = resolvedDealerId ? dealers.find(d => d.id === resolvedDealerId) : null;
  const dealerTargetObj = resolvedDealerId ? dealerTargets[resolvedDealerId] : null;
  const dealerPkgForCommission = dealerTargetObj?.packageId ? packages.find(p => p.id === dealerTargetObj.packageId) : null;
  const effectiveCommissionPct = (dealerForCommission?.commissionPct !== undefined && dealerForCommission?.commissionPct !== null)
    ? dealerForCommission.commissionPct
    : (dealerPkgForCommission?.commissionPct || 0);
  const plotEffectivePrice = computeEffectivePrice(plot.price, plot.tags || []);
  const commissionAmount = Math.round(plotEffectivePrice * effectiveCommissionPct / 100);
  const booking = {
    id: ++bookingCounter, bookingRef: `UE-${bookingCounter}`,
    plotId, plotNumber: plot.number, plotSize: plot.size,
    plotPrice: computeEffectivePrice(plot.price, plot.tags || []), area: plot.area,
    name, fatherName, cnic, phone, email: email || '',
    residentialAddress, postalAddress, photo, cnicImage: cnicImage || null,
    nominee: { name: nomineeName, fatherName: nomineeFatherName, cnic: nomineeCnic, relation: nomineeRelation, phone: nomineePhone, address: nomineeAddress },
    dealerId: resolvedDealerId,
    downPayment: Number(downPayment) || 0,
    commissionPct: effectiveCommissionPct,
    commissionAmount,
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
  if (!booking.ledger || booking.ledger.length === 0) {
    booking.ledger = generateLedger(booking);
  }
  const plot = plots.find(p => p.id === booking.plotId);
  if (plot) plot.status = 'sold';
  res.json({ success: true, booking });
});

// ─── Ledger API ───────────────────────────────────────────────────────────────
app.get('/api/ledger/:bookingId', (req, res) => {
  const session = validateSession(req);
  if (!session) return res.status(401).json({ error: 'Authentication required' });

  const booking = bookings.find(b => b.id === parseInt(req.params.bookingId) || b.bookingRef === req.params.bookingId);
  if (!booking) return res.status(404).json({ error: 'Booking not found' });

  const isAdmin = session.role === 'admin';
  const isOwner = session.role === 'dealer' && booking.dealerId === session.dealerId;
  if (!isAdmin && !isOwner) return res.status(403).json({ error: 'Access denied' });

  if (!booking.ledger || booking.ledger.length === 0) {
    if (booking.status === 'confirmed') booking.ledger = generateLedger(booking);
    else return res.json({ ledger: [], summary: ledgerSummary([]) });
  }
  const ledger = recomputeOverdue(booking.ledger);
  res.json({ bookingRef: booking.bookingRef, customerName: booking.name, plotNumber: booking.plotNumber, plotSize: booking.plotSize, plotPrice: booking.plotPrice, ledger, summary: ledgerSummary(booking.ledger) });
});

app.post('/api/ledger/:bookingId/:installmentId/pay', (req, res) => {
  const session = validateSession(req);
  if (!session) return res.status(401).json({ error: 'Authentication required' });

  const booking = bookings.find(b => b.id === parseInt(req.params.bookingId));
  if (!booking) return res.status(404).json({ error: 'Booking not found' });

  const isAdmin = session.role === 'admin';
  const isOwner = session.role === 'dealer' && booking.dealerId === session.dealerId;
  if (!isAdmin && !isOwner) return res.status(403).json({ error: 'Access denied' });

  if (!booking.ledger) return res.status(400).json({ error: 'No ledger found' });
  const item = booking.ledger.find(i => i.id === parseInt(req.params.installmentId));
  if (!item) return res.status(404).json({ error: 'Installment not found' });
  if (item.status === 'paid') return res.status(409).json({ error: 'Already paid' });

  const { paidAmount, paidDate, notes, paidBy } = req.body;
  const amount = Number(paidAmount);
  if (!amount || amount <= 0) return res.status(400).json({ error: 'paidAmount must be a positive number' });
  const dateStr = paidDate || new Date().toISOString().split('T')[0];
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return res.status(400).json({ error: 'paidDate must be YYYY-MM-DD' });

  item.status = 'paid';
  item.paidAmount = amount;
  item.paidDate = dateStr;
  item.paidBy = paidBy || (isAdmin ? 'Admin' : 'Dealer');
  item.notes = notes || null;
  booking.ledger = recomputeOverdue(booking.ledger);
  res.json({ success: true, item, summary: ledgerSummary(booking.ledger) });
});

app.get('/api/dealer/:dealerId/ledger-summary', (req, res) => {
  const session = validateSession(req);
  if (!session) return res.status(401).json({ error: 'Authentication required' });
  const dealerId = parseInt(req.params.dealerId);
  const isAdmin = session.role === 'admin';
  const isOwner = session.role === 'dealer' && session.dealerId === dealerId;
  if (!isAdmin && !isOwner) return res.status(403).json({ error: 'Access denied' });
  const myBookings = bookings.filter(b => b.dealerId === dealerId && b.status === 'confirmed');
  const result = myBookings.map(b => {
    if (!b.ledger || b.ledger.length === 0) b.ledger = generateLedger(b);
    const summary = ledgerSummary(b.ledger);
    return {
      bookingId: b.id, bookingRef: b.bookingRef,
      customerName: b.name, customerPhone: b.phone, customerCnic: b.cnic,
      plotNumber: b.plotNumber, plotSize: b.plotSize, plotPrice: b.plotPrice,
      approvedAt: b.approvedAt, ...summary,
    };
  });
  res.json(result);
});

app.get('/api/dealer/:dealerId/calendar', (req, res) => {
  const session = validateSession(req);
  if (!session) return res.status(401).json({ error: 'Authentication required' });
  const dealerId = parseInt(req.params.dealerId);
  const isAdmin = session.role === 'admin';
  const isOwner = session.role === 'dealer' && session.dealerId === dealerId;
  if (!isAdmin && !isOwner) return res.status(403).json({ error: 'Access denied' });
  const month = req.query.month || new Date().toISOString().slice(0, 7);
  const myBookings = bookings.filter(b => b.dealerId === dealerId && b.status === 'confirmed');
  const events = [];
  for (const b of myBookings) {
    if (!b.ledger || b.ledger.length === 0) b.ledger = generateLedger(b);
    const live = recomputeOverdue(b.ledger);
    for (const item of live) {
      if (item.dueDate && item.dueDate.startsWith(month)) {
        events.push({
          ...item,
          bookingId: b.id, bookingRef: b.bookingRef,
          customerName: b.name, plotNumber: b.plotNumber, plotSize: b.plotSize,
        });
      }
    }
  }
  events.sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  res.json(events);
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
  const { username, password, name, staffRole, privileges } = req.body;
  if (!username || !password || !name) return res.status(400).json({ error: 'username, password, name required' });
  if (dealers.find(d => d.username === username) || operationsStaff.find(o => o.username === username))
    return res.status(409).json({ error: 'Username already taken' });
  const staff = {
    id: ++opsCounter, username, password, name, role: 'operations',
    staffRole: staffRole || 'Operations Staff',
    privileges: privileges || { approveBookings: false, viewPlots: false, manageInventory: false, viewDealers: false, viewDeals: false, viewRegistrations: false, viewReports: false, exportData: false, manageAnnouncements: false, viewCustomers: false },
    createdAt: new Date().toISOString(),
  };
  operationsStaff.push(staff);
  saveDb();
  const { password: _, ...safe } = staff;
  res.status(201).json(safe);
});

app.put('/api/admin/staff/:id', (req, res) => {
  const staff = operationsStaff.find(o => o.id === parseInt(req.params.id));
  if (!staff) return res.status(404).json({ error: 'Staff not found' });
  const { name, password, staffRole, privileges } = req.body;
  if (name) staff.name = name;
  if (password) staff.password = password;
  if (staffRole) staff.staffRole = staffRole;
  if (privileges) staff.privileges = privileges;
  saveDb();
  const { password: _, ...safe } = staff;
  res.json(safe);
});

app.delete('/api/admin/staff/:id', (req, res) => {
  const idx = operationsStaff.findIndex(o => o.id === parseInt(req.params.id));
  if (idx === -1) return res.status(404).json({ error: 'Staff not found' });
  operationsStaff.splice(idx, 1);
  saveDb();
  res.json({ success: true });
});

// ─── Admin: Customers list ────────────────────────────────────────────────────
app.get('/api/admin/customers', (req, res) => {
  res.json(customers.map(({ password: _, ...safe }) => safe));
});

// ─── Admin: Announcements CRUD ────────────────────────────────────────────────
app.post('/api/admin/announcements', (req, res) => {
  if (!requireAdmin(req, res)) return;
  const { title, body, date, tag, important, images } = req.body;
  if (!title || !body) return res.status(400).json({ error: 'title and body required' });
  if (Array.isArray(images) && images.length > 8) return res.status(400).json({ error: 'Maximum 8 images per announcement' });
  const validImages = Array.isArray(images) ? images.filter(img => typeof img === 'string' && img.startsWith('data:image/')) : [];
  const ann = { id: ++annCounter, title, body, date: date || new Date().toISOString().slice(0, 10), tag: tag || '', important: !!important, images: validImages };
  announcements.push(ann);
  saveDb();
  res.status(201).json(ann);
});

app.put('/api/admin/announcements/:id', (req, res) => {
  if (!requireAdmin(req, res)) return;
  const ann = announcements.find(a => a.id === parseInt(req.params.id));
  if (!ann) return res.status(404).json({ error: 'Not found' });
  const { title, body, date, tag, important, images } = req.body;
  if (Array.isArray(images) && images.length > 8) return res.status(400).json({ error: 'Maximum 8 images per announcement' });
  if (title !== undefined) ann.title = title;
  if (body !== undefined) ann.body = body;
  if (date !== undefined) ann.date = date;
  if (tag !== undefined) ann.tag = tag;
  if (important !== undefined) ann.important = !!important;
  if (images !== undefined) ann.images = Array.isArray(images) ? images.filter(img => typeof img === 'string' && img.startsWith('data:image/')) : [];
  saveDb();
  res.json(ann);
});

app.delete('/api/admin/announcements/:id', (req, res) => {
  if (!requireAdmin(req, res)) return;
  const idx = announcements.findIndex(a => a.id === parseInt(req.params.id));
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  announcements.splice(idx, 1);
  saveDb();
  res.json({ success: true });
});

// ─── Admin: Restore Alert ─────────────────────────────────────────────────────
app.get('/api/admin/restore-alert', (req, res) => {
  if (!requireAdmin(req, res)) return;
  const alert = lastAutoRestore;
  lastAutoRestore = null;
  res.json({ alert });
});

// ─── Admin: Backup Management ─────────────────────────────────────────────────
function requireAdmin(req, res) {
  const session = validateSession(req);
  if (!session) { res.status(401).json({ error: 'Authentication required' }); return null; }
  if (session.role !== 'admin') { res.status(403).json({ error: 'Access denied' }); return null; }
  return session;
}

app.get('/api/admin/backups', (req, res) => {
  if (!requireAdmin(req, res)) return;
  try {
    fs.mkdirSync(DB_DIR, { recursive: true });
    const files = fs.readdirSync(DB_DIR)
      .filter(f => f.startsWith('db.json.bak-') && !f.endsWith('.meta.json'))
      .sort()
      .reverse()
      .map(f => {
        const fullPath = path.join(DB_DIR, f);
        const stat = fs.statSync(fullPath);
        let label = '';
        try {
          const meta = JSON.parse(fs.readFileSync(fullPath + '.meta.json', 'utf8'));
          if (typeof meta.label === 'string') label = meta.label;
        } catch {}
        return { filename: f, size: stat.size, createdAt: stat.mtime.toISOString(), label };
      });
    res.json(files);
  } catch (e) {
    res.status(500).json({ error: 'Failed to list backups' });
  }
});

app.get('/api/admin/backups/:filename', (req, res) => {
  if (!requireAdmin(req, res)) return;
  const filename = path.basename(req.params.filename);
  if (!filename.startsWith('db.json.bak-') || filename.endsWith('.meta.json')) return res.status(400).json({ error: 'Invalid backup filename' });
  const fullPath = path.join(DB_DIR, filename);
  if (!fs.existsSync(fullPath)) return res.status(404).json({ error: 'Backup not found' });
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.setHeader('Content-Type', 'application/json');
  res.sendFile(fullPath);
});

app.delete('/api/admin/backups/:filename', (req, res) => {
  if (!requireAdmin(req, res)) return;
  const filename = path.basename(req.params.filename);
  if (!filename.startsWith('db.json.bak-') || filename.endsWith('.meta.json')) return res.status(400).json({ error: 'Invalid backup filename' });
  const fullPath = path.join(DB_DIR, filename);
  if (!fs.existsSync(fullPath)) return res.status(404).json({ error: 'Backup not found' });
  try {
    fs.unlinkSync(fullPath);
    try { fs.unlinkSync(fullPath + '.meta.json'); } catch {}
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Failed to delete backup' });
  }
});

app.patch('/api/admin/backups/:filename/label', (req, res) => {
  if (!requireAdmin(req, res)) return;
  const filename = path.basename(req.params.filename);
  if (!filename.startsWith('db.json.bak-') || filename.endsWith('.meta.json')) return res.status(400).json({ error: 'Invalid backup filename' });
  const fullPath = path.join(DB_DIR, filename);
  if (!fs.existsSync(fullPath)) return res.status(404).json({ error: 'Backup not found' });
  const label = typeof req.body.label === 'string' ? req.body.label.trim().slice(0, 120) : '';
  try {
    const metaPath = fullPath + '.meta.json';
    if (label) {
      fs.writeFileSync(metaPath, JSON.stringify({ label }));
    } else {
      try { fs.unlinkSync(metaPath); } catch {}
    }
    res.json({ success: true, label });
  } catch (e) {
    res.status(500).json({ error: 'Failed to update label' });
  }
});

app.post('/api/admin/backups/:filename/restore', (req, res) => {
  if (!requireAdmin(req, res)) return;
  const filename = path.basename(req.params.filename);
  if (!filename.startsWith('db.json.bak-') || filename.endsWith('.meta.json')) return res.status(400).json({ error: 'Invalid backup filename' });
  const fullPath = path.join(DB_DIR, filename);
  if (!fs.existsSync(fullPath)) return res.status(404).json({ error: 'Backup not found' });
  try {
    const db = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
    applyDb(db);
    saveDb();
    console.log(`[DB] Admin restored from backup: ${filename}`);
    res.json({ success: true, message: `Restored from ${filename}` });
  } catch (e) {
    res.status(500).json({ error: 'Failed to restore backup — file may be corrupted' });
  }
});

app.post('/api/admin/backups', (req, res) => {
  if (!requireAdmin(req, res)) return;
  try {
    fs.mkdirSync(DB_DIR, { recursive: true });
    if (!fs.existsSync(DB_PATH)) {
      return res.status(400).json({ error: 'No database file exists yet to back up' });
    }
    const ts = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `db.json.bak-${ts}`;
    const bakPath = path.join(DB_DIR, filename);
    fs.copyFileSync(DB_PATH, bakPath);
    const label = typeof req.body.label === 'string' ? req.body.label.trim().slice(0, 120) : '';
    if (label) {
      fs.writeFileSync(bakPath + '.meta.json', JSON.stringify({ label }));
    }
    const stat = fs.statSync(bakPath);
    res.json({ success: true, filename, size: stat.size, createdAt: stat.mtime.toISOString(), label });
  } catch (e) {
    res.status(500).json({ error: 'Failed to create backup' });
  }
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
