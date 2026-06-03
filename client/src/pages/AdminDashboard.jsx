import React, { useEffect, useRef, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import * as XLSX from 'xlsx';
import BookingReceipt from '../components/BookingReceipt.jsx';

const fmt = n => n >= 1000000 ? 'PKR ' + (n / 1000000).toFixed(1) + 'M' : n > 0 ? 'PKR ' + (n / 1000).toFixed(0) + 'K' : 'PKR 0';
const PLOT_SIZES = ['5 Marla', '7 Marla', '10 Marla', '1 Kanal'];
const ALL_SIZES = ['5 Marla', '7 Marla', '10 Marla', '1 Kanal', '2 Kanal', '4 Marla', 'Other'];

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: '#1e293b', borderRadius: 10, padding: '0.75rem 1rem', boxShadow: '0 8px 24px rgba(0,0,0,0.3)' }}>
      <div style={{ color: '#94a3b8', fontSize: '0.75rem', marginBottom: '0.4rem', fontWeight: 600 }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color, fontSize: '0.85rem', fontWeight: 700 }}>{p.name}: {p.value}</div>
      ))}
    </div>
  );
};

const TABS = ['Dealers', 'Registrations', 'Bookings', 'Packages', 'Inventory', 'Deals', 'Staff', 'Backups'];
const tabIcons = { Dealers: '👥', Registrations: '📋', Bookings: '📩', Packages: '📦', Inventory: '🏘️', Deals: '🏷️', Staff: '⚙️', Backups: '🗄️' };
const PRIV_OPTIONS = [
  { key: 'approveBookings', label: 'View & Approve Bookings' },
  { key: 'viewPlots', label: 'View Plot Inventory' },
  { key: 'viewDealers', label: 'View Dealers & Targets' },
  { key: 'viewDeals', label: 'View Deals' },
  { key: 'viewRegistrations', label: 'View Dealer Registrations' },
];

export default function AdminDashboard({ dealer: admin, authToken, onLogout, navigate }) {
  const [tab, setTab] = useState('Dealers');

  // ── Dealers tab ──
  const [dealers, setDealers] = useState([]);
  const [dealersLoading, setDealersLoading] = useState(true);
  const [packages, setPackages] = useState([]);
  const [selected, setSelected] = useState(null);
  const [tForm, setTForm] = useState({ packageId: '', sizes: {}, paymentTarget: '', notes: '', depositAmount: '', depositPaid: false, commissionPct: '' });
  const [payoutHistory, setPayoutHistory] = useState([]);
  const [payoutHistoryOpen, setPayoutHistoryOpen] = useState(false);
  const [payoutAmt, setPayoutAmt] = useState('');
  const [payoutNote, setPayoutNote] = useState('');
  const [payoutSaving, setPayoutSaving] = useState(false);
  const [payoutMsg, setPayoutMsg] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');

  // ── Registrations tab ──
  const [regs, setRegs] = useState([]);
  const [regsLoading, setRegsLoading] = useState(false);
  const [approveTarget, setApproveTarget] = useState(null);
  const [approveForm, setApproveForm] = useState({ username: '', password: '' });
  const [approveMsg, setApproveMsg] = useState('');
  const [approveSaving, setApproveSaving] = useState(false);

  // ── Packages tab ──
  const [pkgEdit, setPkgEdit] = useState(null);
  const [pkgForm, setPkgForm] = useState({ name: '', sizes: {}, rewardDescription: '', rewardAmount: '', commissionPct: '' });
  const [pkgSaving, setPkgSaving] = useState(false);
  const [pkgMsg, setPkgMsg] = useState('');

  // ── Inventory tab ──
  const [plots, setPlots] = useState([]);
  const [plotsLoading, setPlotsLoading] = useState(false);
  const [plotEdit, setPlotEdit] = useState(null);
  const [plotForm, setPlotForm] = useState({ number: '', size: '5 Marla', price: '', status: 'available', category: 'residential', description: '', area: '', tags: [] });
  const [plotSaving, setPlotSaving] = useState(false);
  const [plotMsg, setPlotMsg] = useState('');

  // ── Sectors ──
  const [sectors, setSectors] = useState([]);
  const [inventoryView, setInventoryView] = useState('plots'); // 'plots' | 'sectors'
  const [sectorEdit, setSectorEdit] = useState(null); // null | 'new' | sector object
  const [sectorForm, setSectorForm] = useState({ name: '', type: 'residential', description: '' });
  const [sectorSaving, setSectorSaving] = useState(false);
  const [sectorMsg, setSectorMsg] = useState('');

  // ── Bulk / Import ──
  const [bulkMode, setBulkMode] = useState(null); // null | 'manual' | 'import'
  const emptyBulkRow = () => ({ number: '', area: '', size: '5 Marla', price: '', category: 'residential', status: 'available', description: '' });
  const [bulkRows, setBulkRows] = useState([emptyBulkRow()]);
  const [bulkSaving, setBulkSaving] = useState(false);
  const [bulkMsg, setBulkMsg] = useState('');
  const [importRows, setImportRows] = useState([]);
  const [importMsg, setImportMsg] = useState('');
  const [importSaving, setImportSaving] = useState(false);
  const fileInputRef = useRef(null);

  // ── Bookings tab ──
  const [bkgs, setBkgs] = useState([]);
  const [bkgsLoading, setBkgsLoading] = useState(false);
  const [selectedBkg, setSelectedBkg] = useState(null);
  const [rejectBkg, setRejectBkg] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [bkgMsg, setBkgMsg] = useState('');
  const [showReceipt, setShowReceipt] = useState(null);
  const [deleteBkg, setDeleteBkg] = useState(null);
  const [bkgSearch, setBkgSearch] = useState('');
  const [adminLedger, setAdminLedger] = useState(null);
  const [adminLedgerLoading, setAdminLedgerLoading] = useState(false);
  const [adminPayItem, setAdminPayItem] = useState(null);
  const [adminPayAmount, setAdminPayAmount] = useState('');
  const [adminPayDate, setAdminPayDate] = useState('');
  const [adminPayNotes, setAdminPayNotes] = useState('');
  const [adminPaySaving, setAdminPaySaving] = useState(false);
  const [adminPayError, setAdminPayError] = useState('');
  const loadBookings = () => { setBkgsLoading(true); fetch('/api/admin/bookings').then(r => r.json()).then(d => { setBkgs(d); setBkgsLoading(false); }).catch(() => setBkgsLoading(false)); };

  const loadAdminLedger = (bookingId) => {
    setAdminLedgerLoading(true);
    setAdminLedger(null);
    fetch(`/api/ledger/${bookingId}`, { headers: { Authorization: `Bearer ${authToken}` } })
      .then(r => r.json())
      .then(d => { setAdminLedger(d); setAdminLedgerLoading(false); })
      .catch(() => setAdminLedgerLoading(false));
  };

  const STATUS_STYLE_ADMIN = { paid: { bg: '#d1fae5', color: '#065f46', label: 'Paid' }, pending: { bg: '#fef3c7', color: '#92400e', label: 'Pending' }, overdue: { bg: '#fee2e2', color: '#dc2626', label: 'Overdue' } };
  const TYPE_ICON_ADMIN = { 'down-payment': '⬇', 'confirmation': '✓', 'monthly': '📅', 'semi-annual': '📆', 'possession': '🔑' };
  const fmtDateAdmin = d => d ? new Date(d + 'T00:00:00').toLocaleDateString('en-PK', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';
  const pendingBkgCount = bkgs.filter(b => b.status === 'pending').length;
  const handleDeleteBkg = async (b) => {
    const res = await fetch(`/api/admin/bookings/${b.id}`, { method: 'DELETE' });
    if (res.ok) { setBkgMsg('✅ Booking deleted — plot released.'); if (selectedBkg?.id === b.id) setSelectedBkg(null); setDeleteBkg(null); loadBookings(); }
    else { const data = await res.json().catch(() => ({})); setBkgMsg(`❌ Delete failed: ${data.error || res.status}`); setDeleteBkg(null); }
  };

  // ── Deals tab ──
  const [deals, setDeals] = useState([]);
  const [dealsLoading, setDealsLoading] = useState(false);
  const [dealEdit, setDealEdit] = useState(null);
  const [dealForm, setDealForm] = useState({ name: '', description: '', plotIds: [], specialPrice: '', paymentPlanInfo: '', validFrom: '', validUntil: '', highlighted: false });
  const [dealSaving, setDealSaving] = useState(false);
  const [dealMsg, setDealMsg] = useState('');

  // ── Access Control panel ──
  const [accessDealer, setAccessDealer] = useState(null);
  const [loginHistory, setLoginHistory] = useState([]);
  const [loginHistoryLoading, setLoginHistoryLoading] = useState(false);
  const [genPwd, setGenPwd] = useState(null);
  const [genPwdSaving, setGenPwdSaving] = useState(false);
  const [genPwdCopied, setGenPwdCopied] = useState(false);
  const [customPwdInput, setCustomPwdInput] = useState('');
  const [customPwdMsg, setCustomPwdMsg] = useState('');
  const [accessSec, setAccessSec] = useState({ vpnRestricted: false, ipLocked: false, trustedIPs: [] });
  const [accessSecSaving, setAccessSecSaving] = useState(false);
  const [accessSecMsg, setAccessSecMsg] = useState('');
  const [newTrustedIP, setNewTrustedIP] = useState('');

  // ── Backups tab ──
  const [backups, setBackups] = useState([]);
  const [backupsLoading, setBackupsLoading] = useState(false);
  const [backupsMsg, setBackupsMsg] = useState('');
  const [deletingBackup, setDeletingBackup] = useState(null);
  const [creatingBackup, setCreatingBackup] = useState(false);

  // ── Staff tab ──
  const [staff, setStaff] = useState([]);
  const [dealerSort, setDealerSort] = useState({ col: null, dir: 'desc' });
  const [staffLoading, setStaffLoading] = useState(false);
  const [staffEdit, setStaffEdit] = useState(null);
  const defaultPrivs = () => ({ approveBookings: false, viewPlots: false, viewDealers: false, viewDeals: false, viewRegistrations: false });
  const [staffForm, setStaffForm] = useState({ name: '', username: '', password: '', privileges: defaultPrivs() });
  const [staffSaving, setStaffSaving] = useState(false);
  const [staffMsg, setStaffMsg] = useState('');

  const loadDealers = () => {
    setDealersLoading(true);
    fetch('/api/admin/dealers').then(r => r.json()).then(d => { setDealers(d); setDealersLoading(false); }).catch(() => setDealersLoading(false));
  };
  const loadPackages = () => fetch('/api/admin/packages').then(r => r.json()).then(setPackages).catch(() => {});
  const loadRegs = () => { setRegsLoading(true); fetch('/api/admin/registrations').then(r => r.json()).then(d => { setRegs(d); setRegsLoading(false); }).catch(() => setRegsLoading(false)); };
  const loadPlots = () => { setPlotsLoading(true); fetch('/api/plots').then(r => r.json()).then(d => { setPlots(d); setPlotsLoading(false); }).catch(() => setPlotsLoading(false)); };
  const loadSectors = () => fetch('/api/admin/sectors').then(r => r.json()).then(setSectors).catch(() => {});
  const loadDeals = () => { setDealsLoading(true); fetch('/api/admin/deals').then(r => r.json()).then(d => { setDeals(d); setDealsLoading(false); }).catch(() => setDealsLoading(false)); };
  const loadStaff = () => { setStaffLoading(true); fetch('/api/admin/staff').then(r => r.json()).then(d => { setStaff(d); setStaffLoading(false); }).catch(() => setStaffLoading(false)); };
  const loadBackups = () => { setBackupsLoading(true); setBackupsMsg(''); fetch('/api/admin/backups', { headers: { Authorization: `Bearer ${authToken}` } }).then(r => r.json()).then(d => { setBackups(d); setBackupsLoading(false); }).catch(() => { setBackupsLoading(false); setBackupsMsg('❌ Failed to load backups'); }); };

  const handleCreateBackup = async () => {
    setCreatingBackup(true);
    setBackupsMsg('');
    try {
      const res = await fetch('/api/admin/backups', { method: 'POST', headers: { Authorization: `Bearer ${authToken}` } });
      const d = await res.json().catch(() => ({}));
      if (res.ok) { setBackupsMsg(`✅ Backup created: ${d.filename}`); loadBackups(); }
      else { setBackupsMsg(`❌ ${d.error || 'Failed to create backup'}`); }
    } catch { setBackupsMsg('❌ Failed to create backup'); }
    setCreatingBackup(false);
  };

  const handleDeleteBackup = async (filename) => {
    setDeletingBackup(filename);
    const res = await fetch(`/api/admin/backups/${encodeURIComponent(filename)}`, { method: 'DELETE', headers: { Authorization: `Bearer ${authToken}` } });
    setDeletingBackup(null);
    if (res.ok) { setBackupsMsg('✅ Backup deleted.'); loadBackups(); }
    else { const d = await res.json().catch(() => ({})); setBackupsMsg(`❌ ${d.error || 'Delete failed'}`); }
  };

  const handleDownloadBackup = async (filename) => {
    try {
      const res = await fetch(`/api/admin/backups/${encodeURIComponent(filename)}`, { headers: { Authorization: `Bearer ${authToken}` } });
      if (!res.ok) { const d = await res.json().catch(() => ({})); setBackupsMsg(`❌ ${d.error || 'Download failed'}`); return; }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = filename; a.click();
      URL.revokeObjectURL(url);
    } catch { setBackupsMsg('❌ Download failed'); }
  };

  const fmtBytes = (b) => b >= 1048576 ? (b / 1048576).toFixed(2) + ' MB' : b >= 1024 ? (b / 1024).toFixed(1) + ' KB' : b + ' B';

  useEffect(() => { loadDealers(); loadPackages(); fetch('/api/admin/notifications').then(r => r.json()).then(d => { if (d.pendingBookings > 0) setBkgs(prev => prev.length === 0 ? [{ _placeholder: true }] : prev); }).catch(() => {}); }, []);
  useEffect(() => {
    if (tab === 'Registrations') loadRegs();
    if (tab === 'Bookings') loadBookings();
    if (tab === 'Inventory') { loadPlots(); loadSectors(); }
    if (tab === 'Deals') { loadDeals(); loadPlots(); }
    if (tab === 'Staff') loadStaff();
    if (tab === 'Backups') loadBackups();
  }, [tab]);

  useEffect(() => {
    if (selectedBkg && selectedBkg.status === 'confirmed') {
      loadAdminLedger(selectedBkg.id);
    } else {
      setAdminLedger(null);
    }
  }, [selectedBkg?.id, selectedBkg?.status]);

  // ── Dealer assign target ──
  const [assignPanelPlots, setAssignPanelPlots] = useState([]);

  const openAssign = async (d) => {
    setSelected(d); setSaveMsg('');
    setPayoutAmt(''); setPayoutNote(''); setPayoutMsg(''); setPayoutHistoryOpen(false);
    const [res, plotsData, history] = await Promise.all([
      fetch(`/api/admin/targets/${d.id}`).then(r => r.json()).catch(() => null),
      fetch('/api/plots').then(r => r.json()).catch(() => []),
      fetch(`/api/admin/dealers/${d.id}/commission-payouts`).then(r => r.json()).catch(() => []),
    ]);
    setAssignPanelPlots(plotsData);
    setPayoutHistory(history);
    const initSizes = {};
    PLOT_SIZES.forEach(s => { initSizes[s] = 0; });
    if (res && res.sizes) res.sizes.forEach(s => { initSizes[s.size] = s.target; });
    const initAssigned = {};
    PLOT_SIZES.forEach(s => { initAssigned[s] = []; });
    if (res?.assignedPlots) Object.entries(res.assignedPlots).forEach(([sz, ids]) => { initAssigned[sz] = ids || []; });
    setTForm({
      packageId: res?.packageId ? String(res.packageId) : '',
      sizes: initSizes,
      assignedPlots: initAssigned,
      paymentTarget: res?.paymentTarget || '',
      notes: res?.notes || '',
      depositAmount: d.securityDepositRequired || 200000,
      depositPaid: d.securityDepositPaid || false,
      commissionPct: d.commissionPctOverride !== null && d.commissionPctOverride !== undefined ? String(d.commissionPctOverride) : '',
    });
  };

  const handlePackageSelect = (pkgId) => {
    setTForm(f => {
      const resetAssigned = {};
      PLOT_SIZES.forEach(s => { resetAssigned[s] = []; });
      if (!pkgId) return { ...f, packageId: '', assignedPlots: resetAssigned };
      const pkg = packages.find(p => p.id === parseInt(pkgId));
      if (!pkg) return { ...f, packageId: pkgId, assignedPlots: resetAssigned };
      const newSizes = {};
      pkg.sizes.forEach(s => { newSizes[s.size] = s.quota; });
      return { ...f, packageId: pkgId, sizes: newSizes, assignedPlots: resetAssigned };
    });
  };

  const handleSaveTarget = async e => {
    e.preventDefault(); setSaving(true); setSaveMsg('');
    try {
      const sizes = PLOT_SIZES.map(s => ({ size: s, target: parseInt(tForm.sizes[s]) || 0 }));
      const assignedPlots = {};
      PLOT_SIZES.forEach(s => { assignedPlots[s] = (tForm.assignedPlots?.[s] || []).slice(0, parseInt(tForm.sizes[s]) || 0); });
      const body = { sizes, paymentTarget: parseInt(tForm.paymentTarget) || 0, notes: tForm.notes, assignedPlots };
      if (tForm.packageId) body.packageId = parseInt(tForm.packageId);
      await fetch(`/api/admin/targets/${selected.id}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      await fetch(`/api/admin/dealers/${selected.id}/deposit`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ paid: tForm.depositPaid, amount: parseInt(tForm.depositAmount) || 0 }) });
      await fetch(`/api/admin/dealers/${selected.id}/commission`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ commissionPct: tForm.commissionPct !== '' ? parseFloat(tForm.commissionPct) : null }) });
      setSaveMsg('✅ Saved successfully!');
      loadDealers();
    } catch { setSaveMsg('❌ Save failed'); } finally { setSaving(false); }
  };

  const handleRecordPayout = async () => {
    const amount = parseInt(payoutAmt);
    if (!amount || amount <= 0) { setPayoutMsg('❌ Enter a valid amount'); return; }
    setPayoutSaving(true); setPayoutMsg('');
    try {
      const res = await fetch(`/api/admin/dealers/${selected.id}/commission-payout`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount, notes: payoutNote, adminName: admin?.name || 'Admin' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setPayoutMsg('✅ Payout recorded!');
      setPayoutAmt(''); setPayoutNote('');
      const history = await fetch(`/api/admin/dealers/${selected.id}/commission-payouts`).then(r => r.json()).catch(() => []);
      setPayoutHistory(history);
      setPayoutHistoryOpen(true);
      loadDealers();
    } catch (err) { setPayoutMsg('❌ ' + (err.message || 'Failed')); } finally { setPayoutSaving(false); }
  };

  const handleMarkReward = async (dealerId) => {
    await fetch(`/api/admin/dealers/${dealerId}/reward`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ given: true }) });
    loadDealers();
  };

  // ── Approve registration ──
  const handleApprove = async e => {
    e.preventDefault(); setApproveSaving(true); setApproveMsg('');
    try {
      const res = await fetch(`/api/admin/registrations/${approveTarget.id}/approve`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(approveForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setApproveMsg('✅ Account created!');
      setApproveTarget(null); setApproveForm({ username: '', password: '' });
      loadRegs(); loadDealers();
    } catch (err) { setApproveMsg('❌ ' + (err.message || 'Failed')); } finally { setApproveSaving(false); }
  };

  // ── Packages ──
  const openPkgForm = (pkg) => {
    if (pkg) {
      setPkgEdit(pkg);
      const sizes = {};
      pkg.sizes.forEach(s => { sizes[s.size] = s.quota; });
      setPkgForm({ name: pkg.name, sizes, rewardDescription: pkg.rewardDescription, rewardAmount: pkg.rewardAmount, commissionPct: pkg.commissionPct ?? '' });
    } else {
      setPkgEdit('new');
      const sizes = {};
      PLOT_SIZES.forEach(s => { sizes[s] = 0; });
      setPkgForm({ name: '', sizes, rewardDescription: '', rewardAmount: '', commissionPct: '' });
    }
    setPkgMsg('');
  };

  const handleSavePkg = async e => {
    e.preventDefault(); setPkgSaving(true); setPkgMsg('');
    try {
      const sizes = PLOT_SIZES.map(s => ({ size: s, quota: parseInt(pkgForm.sizes[s]) || 0 }));
      const body = { name: pkgForm.name, sizes, rewardDescription: pkgForm.rewardDescription, rewardAmount: parseInt(pkgForm.rewardAmount) || 0, commissionPct: parseFloat(pkgForm.commissionPct) || 0 };
      const url = pkgEdit === 'new' ? '/api/admin/packages' : `/api/admin/packages/${pkgEdit.id}`;
      const method = pkgEdit === 'new' ? 'POST' : 'PUT';
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (!res.ok) throw new Error('Failed');
      setPkgMsg('✅ Saved!');
      setTimeout(() => { setPkgEdit(null); setPkgMsg(''); }, 800);
      loadPackages();
    } catch { setPkgMsg('❌ Save failed'); } finally { setPkgSaving(false); }
  };

  const handleDeletePkg = async (id) => {
    if (!confirm('Delete this package?')) return;
    await fetch(`/api/admin/packages/${id}`, { method: 'DELETE' });
    loadPackages();
  };

  // ── Plot CRUD ──
  const PREMIUM_TAGS = ['Corner Plot', 'Park Facing', 'Main Road', 'Main Boulevard'];
  const TAG_PREMIUMS = { 'Corner Plot': 10, 'Park Facing': 10, 'Main Road': 10, 'Main Boulevard': 15 };
  const effectivePrice = (base, tags = []) => Math.round(base * (1 + (tags || []).reduce((s, t) => s + (TAG_PREMIUMS[t] || 0) / 100, 0)));

  const openPlotForm = (plot) => {
    if (plot) {
      setPlotEdit(plot);
      setPlotForm({ number: plot.number, size: plot.size, price: plot.price, status: plot.status, category: plot.category, description: plot.description, area: plot.area, tags: plot.tags || [] });
    } else {
      setPlotEdit('new');
      setPlotForm({ number: '', size: '5 Marla', price: '', status: 'available', category: 'residential', description: '', area: '', tags: [] });
    }
    setPlotMsg('');
  };

  const handleSavePlot = async e => {
    e.preventDefault(); setPlotSaving(true); setPlotMsg('');
    try {
      const url = plotEdit === 'new' ? '/api/admin/plots' : `/api/admin/plots/${plotEdit.id}`;
      const method = plotEdit === 'new' ? 'POST' : 'PUT';
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(plotForm) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setPlotMsg('✅ Saved!');
      setTimeout(() => { setPlotEdit(null); setPlotMsg(''); }, 800);
      loadPlots();
    } catch (err) { setPlotMsg('❌ ' + (err.message || 'Save failed')); } finally { setPlotSaving(false); }
  };

  const handleDeletePlot = async (plot) => {
    if (!confirm(`Delete plot ${plot.number}? ${plot.status !== 'available' ? '⚠️ This plot is currently ' + plot.status + '.' : ''}`)) return;
    const res = await fetch(`/api/admin/plots/${plot.id}?force=true`, { method: 'DELETE' });
    if (!res.ok) { const d = await res.json(); alert(d.error); return; }
    loadPlots();
  };

  // ── Access Control ──
  const openAccessPanel = async (d) => {
    setSelected(null); setSaveMsg('');
    setAccessDealer(d);
    setGenPwd(null); setGenPwdCopied(false); setAccessSecMsg(''); setNewTrustedIP('');
    setLoginHistoryLoading(true);
    const [hist, sec] = await Promise.all([
      fetch(`/api/admin/dealers/${d.id}/login-history`).then(r => r.json()).catch(() => []),
      fetch(`/api/admin/dealers/${d.id}/security`).then(r => r.json()).catch(() => ({ vpnRestricted: false, ipLocked: false, trustedIPs: [] })),
    ]);
    setLoginHistory(hist);
    setAccessSec({ vpnRestricted: sec.vpnRestricted || false, ipLocked: sec.ipLocked || false, trustedIPs: sec.trustedIPs || [] });
    setLoginHistoryLoading(false);
  };

  const handleGeneratePassword = async (custom) => {
    setGenPwdSaving(true); setGenPwd(null); setGenPwdCopied(false); setCustomPwdMsg('');
    try {
      const body = custom ? { password: custom } : {};
      const res = await fetch(`/api/admin/dealers/${accessDealer.id}/generate-password`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      setGenPwd(data.password);
      if (custom) setCustomPwdInput('');
    } catch (err) { setCustomPwdMsg('❌ ' + (err.message || 'Failed')); } finally { setGenPwdSaving(false); }
  };

  const handleSaveAccessSec = async () => {
    setAccessSecSaving(true); setAccessSecMsg('');
    try {
      const res = await fetch(`/api/admin/dealers/${accessDealer.id}/security`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(accessSec),
      });
      if (!res.ok) throw new Error();
      setAccessSecMsg('✅ Settings saved!');
      setTimeout(() => setAccessSecMsg(''), 2500);
      loadDealers();
    } catch { setAccessSecMsg('❌ Save failed'); } finally { setAccessSecSaving(false); }
  };

  const addTrustedIP = () => {
    const ip = newTrustedIP.trim();
    if (!ip || accessSec.trustedIPs.includes(ip)) return;
    setAccessSec(s => ({ ...s, trustedIPs: [...s.trustedIPs, ip] }));
    setNewTrustedIP('');
  };

  const removeTrustedIP = (ip) => setAccessSec(s => ({ ...s, trustedIPs: s.trustedIPs.filter(x => x !== ip) }));

  // ── Sector CRUD ──
  const openSectorForm = (s) => {
    setSectorMsg('');
    if (s) {
      setSectorEdit(s);
      setSectorForm({ name: s.name, type: s.type, description: s.description });
    } else {
      setSectorEdit('new');
      setSectorForm({ name: '', type: 'residential', description: '' });
    }
  };

  const handleSaveSector = async (e) => {
    e.preventDefault(); setSectorSaving(true); setSectorMsg('');
    try {
      const isNew = sectorEdit === 'new';
      const url = isNew ? '/api/admin/sectors' : `/api/admin/sectors/${sectorEdit.id}`;
      const res = await fetch(url, { method: isNew ? 'POST' : 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(sectorForm) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSectorMsg('✅ Saved!');
      setTimeout(() => { setSectorEdit(null); setSectorMsg(''); }, 700);
      loadSectors();
    } catch (err) { setSectorMsg('❌ ' + (err.message || 'Save failed')); } finally { setSectorSaving(false); }
  };

  const handleDeleteSector = async (s) => {
    if (s.totalPlots > 0) {
      if (!confirm(`"${s.name}" has ${s.totalPlots} plot(s). Deleting the sector will NOT delete the plots — they will just have no sector. Continue?`)) return;
      await fetch(`/api/admin/sectors/${s.id}?force=true`, { method: 'DELETE' });
    } else {
      if (!confirm(`Delete sector "${s.name}"?`)) return;
      await fetch(`/api/admin/sectors/${s.id}`, { method: 'DELETE' });
    }
    loadSectors();
  };

  // ── Bulk manual add ──
  const updateBulkRow = (idx, field, val) => {
    setBulkRows(rows => rows.map((r, i) => i === idx ? { ...r, [field]: val } : r));
  };
  const addBulkRow = () => setBulkRows(r => [...r, emptyBulkRow()]);
  const removeBulkRow = (idx) => setBulkRows(r => r.filter((_, i) => i !== idx));

  const handleBulkSubmit = async () => {
    const valid = bulkRows.filter(r => r.number.trim() && r.area.trim() && r.price);
    if (valid.length === 0) { setBulkMsg('❌ Fill in at least one complete row (Number, Area, Price required).'); return; }
    setBulkSaving(true); setBulkMsg('');
    try {
      const res = await fetch('/api/admin/plots/bulk', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ plots: valid }) });
      const data = await res.json();
      const parts = [];
      if (data.added?.length) parts.push(`✅ ${data.added.length} plot${data.added.length > 1 ? 's' : ''} added`);
      if (data.skipped?.length) parts.push(`⚠️ ${data.skipped.length} skipped (duplicate numbers)`);
      if (data.errors?.length) parts.push(`❌ ${data.errors.length} failed`);
      setBulkMsg(parts.join(' · ') || '✅ Done');
      if (data.added?.length) { loadPlots(); setBulkRows([emptyBulkRow()]); }
    } catch { setBulkMsg('❌ Import failed, please try again.'); } finally { setBulkSaving(false); }
  };

  // ── Excel import ──
  const CNIC_PRICE_RULES = [
    { keywords: ['park facing+corner', 'main boulevard'], multiplier: 1.15 },
    { keywords: ['corner', 'park facing'], multiplier: 1.10 },
  ];
  const descMultiplier = (desc) => {
    const d = (desc || '').toLowerCase().trim();
    for (const rule of CNIC_PRICE_RULES) {
      if (rule.keywords.includes(d)) return rule.multiplier;
    }
    return 1.0;
  };

  const downloadTemplate = () => {
    const ws = XLSX.utils.aoa_to_sheet([
      ['Plot Number', 'Area', 'Size', 'Price (PKR)', 'Category', 'Status', 'Description'],
      ['', '', '', '', '', '', '--- Price Rules (auto-applied on import) ---'],
      ['', '', '', '', '', '', 'Corner → base price +10%'],
      ['', '', '', '', '', '', 'Park Facing → base price +10%'],
      ['', '', '', '', '', '', 'Park Facing+Corner → base price +15%'],
      ['', '', '', '', '', '', 'Main Boulevard → base price +15%'],
      ['', '', '', '', '', '', '(leave blank for standard price)'],
      ['E-501', 'Block E', '5 Marla', 2500000, 'residential', 'available', ''],
      ['E-502', 'Block E', '10 Marla', 5000000, 'residential', 'available', 'Corner'],
      ['E-503', 'Block E', '10 Marla', 5000000, 'residential', 'available', 'Park Facing'],
      ['E-504', 'Block E', '10 Marla', 5000000, 'residential', 'available', 'Park Facing+Corner'],
      ['E-505', 'Block E', '10 Marla', 5000000, 'residential', 'available', 'Main Boulevard'],
    ]);
    ws['!cols'] = [14, 12, 10, 14, 14, 12, 38].map(w => ({ wch: w }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Plots');
    XLSX.writeFile(wb, 'plots_import_template.xlsx');
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportMsg(''); setImportRows([]);
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const wb = XLSX.read(ev.target.result, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const raw = XLSX.utils.sheet_to_json(ws, { defval: '' });
        const mapped = raw.map(row => {
          const description = String(row['Description'] || row['description'] || '').trim();
          const basePrice = parseInt(row['Price (PKR)'] || row['price'] || 0) || 0;
          const mult = descMultiplier(description);
          const finalPrice = mult > 1 ? Math.round(basePrice * mult) : basePrice;
          return {
            number: String(row['Plot Number'] || row['number'] || '').trim(),
            area: String(row['Area'] || row['area'] || '').trim(),
            size: String(row['Size'] || row['size'] || '5 Marla').trim(),
            price: finalPrice,
            basePrice,
            priceAdjusted: mult > 1,
            priceMultiplier: mult,
            category: String(row['Category'] || row['category'] || 'residential').toLowerCase().trim(),
            status: String(row['Status'] || row['status'] || 'available').toLowerCase().trim(),
            description,
          };
        }).filter(r => r.number || r.area);
        if (mapped.length === 0) { setImportMsg('❌ No valid rows found. Make sure the file uses the correct column headers.'); return; }
        setImportRows(mapped);
        setImportMsg(`📋 ${mapped.length} row${mapped.length > 1 ? 's' : ''} ready to import. Review below then click Import.`);
      } catch (err) { setImportMsg('❌ Could not read the file. Use .xlsx or .csv format.'); }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = '';
  };

  const handleImportSubmit = async () => {
    if (importRows.length === 0) return;
    setImportSaving(true); setImportMsg('');
    try {
      const res = await fetch('/api/admin/plots/bulk', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ plots: importRows }) });
      const data = await res.json();
      const parts = [];
      if (data.added?.length) parts.push(`✅ ${data.added.length} added`);
      if (data.skipped?.length) parts.push(`⚠️ ${data.skipped.length} skipped (duplicates)`);
      if (data.errors?.length) parts.push(`❌ ${data.errors.length} errors`);
      setImportMsg(parts.join(' · ') || '✅ Done');
      if (data.added?.length) { loadPlots(); setImportRows([]); }
    } catch { setImportMsg('❌ Import failed, please try again.'); } finally { setImportSaving(false); }
  };

  // ── Deals ──
  const openDealForm = (deal) => {
    if (deal) {
      setDealEdit(deal);
      setDealForm({ name: deal.name, description: deal.description, plotIds: deal.plotIds || [], specialPrice: deal.specialPrice || '', paymentPlanInfo: deal.paymentPlanInfo || '', validFrom: deal.validFrom, validUntil: deal.validUntil, highlighted: deal.highlighted });
    } else {
      setDealEdit('new');
      const today = new Date().toISOString().slice(0, 10);
      setDealForm({ name: '', description: '', plotIds: [], specialPrice: '', paymentPlanInfo: '', validFrom: today, validUntil: '', highlighted: false });
    }
    setDealMsg('');
  };

  const handleSaveDeal = async e => {
    e.preventDefault(); setDealSaving(true); setDealMsg('');
    try {
      const url = dealEdit === 'new' ? '/api/admin/deals' : `/api/admin/deals/${dealEdit.id}`;
      const method = dealEdit === 'new' ? 'POST' : 'PUT';
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(dealForm) });
      if (!res.ok) throw new Error('Failed');
      setDealMsg('✅ Saved!');
      setTimeout(() => { setDealEdit(null); setDealMsg(''); }, 800);
      loadDeals();
    } catch { setDealMsg('❌ Save failed'); } finally { setDealSaving(false); }
  };

  const handleDeleteDeal = async (id) => {
    if (!confirm('Delete this deal?')) return;
    await fetch(`/api/admin/deals/${id}`, { method: 'DELETE' });
    loadDeals();
  };

  const openStaffForm = (s) => {
    setStaffMsg('');
    if (s) {
      setStaffEdit(s);
      setStaffForm({ name: s.name, username: s.username, password: '', privileges: { ...s.privileges } });
    } else {
      setStaffEdit('new');
      setStaffForm({ name: '', username: '', password: '', privileges: defaultPrivs() });
    }
  };

  const handleSaveStaff = async (e) => {
    e.preventDefault();
    setStaffSaving(true); setStaffMsg('');
    try {
      const payload = {
        name: staffForm.name, username: staffForm.username,
        privileges: staffForm.privileges,
        ...(staffForm.password ? { password: staffForm.password } : {}),
      };
      const isNew = staffEdit === 'new';
      if (isNew) payload.password = staffForm.password;
      const res = await fetch(isNew ? '/api/admin/staff' : `/api/admin/staff/${staffEdit.id}`, {
        method: isNew ? 'POST' : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) { setStaffMsg('❌ ' + (data.error || 'Save failed')); return; }
      setStaffMsg('✅ Staff account saved');
      loadStaff();
      setTimeout(() => { setStaffEdit(null); setStaffMsg(''); }, 1000);
    } catch { setStaffMsg('❌ Save failed'); } finally { setStaffSaving(false); }
  };

  const handleDeleteStaff = async (id) => {
    if (!confirm('Delete this staff account? They will no longer be able to log in.')) return;
    await fetch(`/api/admin/staff/${id}`, { method: 'DELETE' });
    loadStaff();
  };

  const togglePriv = (key) => {
    setStaffForm(f => ({ ...f, privileges: { ...f.privileges, [key]: !f.privileges[key] } }));
  };

  const toggleDealPlot = (id) => {
    setDealForm(f => ({
      ...f, plotIds: f.plotIds.includes(id) ? f.plotIds.filter(x => x !== id) : [...f.plotIds, id],
    }));
  };

  const chartData = dealers.map(d => ({ name: d.name.split(' ')[0], Target: d.totalTarget, Achieved: d.achieved }));
  const commissionChartData = [...dealers]
    .sort((a, b) => (b.commissionEarned || 0) - (a.commissionEarned || 0))
    .map(d => ({
      name: d.name.split(' ')[0],
      Paid: d.commissionPaid || 0,
      Outstanding: d.commissionOutstanding || 0,
    }));
  const statusColor = { available: '#059669', booked: '#d97706', sold: '#dc2626' };
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div style={{ background: '#f8fafc', minHeight: '100vh' }}>
      <div style={{ maxWidth: 1300, margin: '0 auto', padding: '2rem 1.5rem' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.75rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
              <div style={{ width: 36, height: 36, background: 'linear-gradient(135deg, #d4a017, #b8880e)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem' }}>👑</div>
              <h1 style={{ fontSize: '1.75rem', fontWeight: 900, color: '#0f172a' }}>Admin Dashboard</h1>
            </div>
            <p style={{ color: '#64748b', fontSize: '0.875rem', paddingLeft: '3rem' }}>Welcome, <strong style={{ color: '#1a6b3c' }}>{admin?.name}</strong></p>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button className="btn btn-outline btn-sm" onClick={() => navigate('plots')}>🗺️ View Plots</button>
            <button className="btn btn-primary btn-sm" onClick={onLogout}>Logout</button>
          </div>
        </div>

        {/* Tab Bar */}
        <div style={{ display: 'flex', gap: '0.25rem', marginBottom: '1.75rem', background: '#fff', borderRadius: 14, padding: '0.375rem', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', border: '1px solid #f1f5f9', overflowX: 'auto' }}>
          {TABS.map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              flex: '0 0 auto', display: 'flex', alignItems: 'center', gap: '0.4rem',
              padding: '0.6rem 1.1rem', borderRadius: 10, border: 'none', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 700,
              background: tab === t ? 'linear-gradient(135deg, #1a6b3c, #059669)' : 'transparent',
              color: tab === t ? '#fff' : '#64748b', transition: 'all 0.15s',
            }}>
              {tabIcons[t]} {t}
              {t === 'Registrations' && regs.filter(r => r.status === 'pending').length > 0 && (
                <span style={{ background: '#dc2626', color: '#fff', borderRadius: 9999, fontSize: '0.65rem', fontWeight: 800, padding: '0.1rem 0.4rem', minWidth: 18, textAlign: 'center' }}>{regs.filter(r => r.status === 'pending').length}</span>
              )}
              {t === 'Bookings' && pendingBkgCount > 0 && (
                <span style={{ background: '#dc2626', color: '#fff', borderRadius: 9999, fontSize: '0.65rem', fontWeight: 800, padding: '0.1rem 0.4rem', minWidth: 18, textAlign: 'center' }}>{pendingBkgCount}</span>
              )}
            </button>
          ))}
        </div>

        {/* ─── DEALERS TAB ─── */}
        {tab === 'Dealers' && (
          <div>
            {(() => {
              const totalCommEarned = dealers.reduce((s, d) => s + (d.commissionEarned || 0), 0);
              const totalCommPaid = dealers.reduce((s, d) => s + (d.commissionPaid || 0), 0);
              const totalCommOutstanding = dealers.reduce((s, d) => s + (d.commissionOutstanding || 0), 0);
              const summaryCards = [
                { label: 'Total Dealers', value: dealers.length, icon: '👥', color: '#6366f1', isNum: false },
                { label: 'With Targets', value: dealers.filter(d => d.hasTarget).length, icon: '🎯', color: '#d97706', isNum: false },
                { label: 'Total Achieved', value: dealers.reduce((s, d) => s + d.achieved, 0), icon: '✅', color: '#059669', isNum: false },
                { label: 'Deposit Paid', value: dealers.filter(d => d.securityDepositPaid).length, icon: '💳', color: '#0ea5e9', isNum: false },
                { label: 'Total Commission', value: fmt(totalCommEarned), icon: '💰', color: '#7c3aed', isNum: true, sub: totalCommOutstanding > 0 ? `${fmt(totalCommOutstanding)} outstanding` : totalCommPaid > 0 ? '✓ Fully settled' : null },
              ];
              return (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1.25rem', marginBottom: '1.75rem' }}>
                  {summaryCards.map(c => (
                    <div key={c.label} style={{ background: '#fff', borderRadius: 16, padding: '1.25rem', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', border: '1px solid #f1f5f9', position: 'relative', overflow: 'hidden' }}>
                      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: c.color, borderRadius: '16px 16px 0 0' }} />
                      <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>{c.label}</div>
                      <div style={{ fontSize: c.isNum ? '1.35rem' : '2rem', fontWeight: 900, color: '#0f172a' }}>{c.value}</div>
                      {c.sub && <div style={{ fontSize: '0.68rem', color: totalCommOutstanding > 0 ? '#b45309' : '#059669', fontWeight: 700, marginTop: '0.25rem' }}>{c.sub}</div>}
                    </div>
                  ))}
                </div>
              );
            })()}

            <div style={{ background: '#fff', borderRadius: 16, padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', border: '1px solid #f1f5f9', marginBottom: '1.5rem' }}>
              <h3 style={{ fontWeight: 800, color: '#0f172a', marginBottom: '0.25rem' }}>Team Performance Overview</h3>
              <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '1.25rem' }}>Target vs achieved plots per dealer</p>
              {dealers.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={chartData} barCategoryGap="30%">
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc' }} />
                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '0.75rem', paddingTop: '0.75rem' }} />
                    <Bar dataKey="Target" fill="#e2e8f0" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Achieved" fill="#1a6b3c" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : <div style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>No dealer data yet</div>}
            </div>

            {/* ─── Commission Leaderboard ─── */}
            <div style={{ background: '#fff', borderRadius: 16, padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', border: '1px solid #f1f5f9', marginBottom: '1.5rem' }}>
              <h3 style={{ fontWeight: 800, color: '#0f172a', marginBottom: '0.25rem' }}>Commission Leaderboard</h3>
              <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '1.25rem' }}>Total commission earned per dealer — ranked highest to lowest</p>
              {commissionChartData.some(d => d.Paid > 0 || d.Outstanding > 0) ? (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={commissionChartData} barCategoryGap="30%">
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <YAxis
                      tick={{ fontSize: 11, fill: '#94a3b8' }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={v => v >= 1000000 ? (v / 1000000).toFixed(1) + 'M' : v >= 1000 ? (v / 1000).toFixed(0) + 'K' : v}
                    />
                    <Tooltip
                      cursor={{ fill: '#f8fafc' }}
                      content={({ active, payload, label }) => {
                        if (!active || !payload?.length) return null;
                        const total = payload.reduce((s, p) => s + (p.value || 0), 0);
                        return (
                          <div style={{ background: '#1e293b', borderRadius: 10, padding: '0.75rem 1rem', boxShadow: '0 8px 24px rgba(0,0,0,0.3)' }}>
                            <div style={{ color: '#94a3b8', fontSize: '0.75rem', marginBottom: '0.4rem', fontWeight: 600 }}>{label}</div>
                            {payload.map((p, i) => (
                              <div key={i} style={{ color: p.color, fontSize: '0.82rem', fontWeight: 700 }}>
                                {p.name}: {fmt(p.value)}
                              </div>
                            ))}
                            <div style={{ color: '#fff', fontSize: '0.82rem', fontWeight: 800, marginTop: '0.3rem', borderTop: '1px solid #334155', paddingTop: '0.3rem' }}>
                              Total: {fmt(total)}
                            </div>
                          </div>
                        );
                      }}
                    />
                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '0.75rem', paddingTop: '0.75rem' }} />
                    <Bar dataKey="Paid" stackId="comm" fill="#1a6b3c" radius={[0, 0, 0, 0]} name="Paid" />
                    <Bar dataKey="Outstanding" stackId="comm" fill="#d97706" radius={[4, 4, 0, 0]} name="Outstanding" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>No commission data yet — assign packages with commission % to dealers</div>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: (selected || accessDealer) ? '1fr 460px' : '1fr', gap: '1.5rem', alignItems: 'start' }}>
              <div style={{ background: '#fff', borderRadius: 16, padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', border: '1px solid #f1f5f9' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                  <div>
                    <h3 style={{ fontWeight: 800, color: '#0f172a', marginBottom: '0.25rem' }}>All Dealers</h3>
                    <p style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Click a dealer to assign targets · use 🔐 to manage passwords & access</p>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      onClick={() => {
                        const ranked = [...dealers].sort((a, b) => (b.commissionEarned || 0) - (a.commissionEarned || 0));
                        const rows = [
                          ['Rank', 'Dealer Name', 'Username', 'Package', 'Bookings Achieved', 'Commission %', 'Commission Earned (PKR)', 'Commission Paid (PKR)', 'Outstanding (PKR)'],
                          ...ranked.map((d, i) => [
                            i + 1,
                            d.name,
                            d.username,
                            d.packageName || '—',
                            d.achieved,
                            d.commissionPct + '%',
                            d.commissionEarned || 0,
                            d.commissionPaid || 0,
                            d.commissionOutstanding || 0,
                          ]),
                        ];
                        const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
                        const blob = new Blob([csv], { type: 'text/csv' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url; a.download = 'commission_summary.csv'; a.click();
                        URL.revokeObjectURL(url);
                      }}
                      style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: '#f0fdf4', border: '1.5px solid #bbf7d0', color: '#065f46', borderRadius: 9, padding: '0.45rem 0.9rem', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}
                    >
                      ⬇ Export CSV
                    </button>
                    <button
                      onClick={() => {
                        const ranked = [...dealers].sort((a, b) => (b.commissionEarned || 0) - (a.commissionEarned || 0));
                        const wsData = [
                          ['Dealer Name', 'Booking Count', 'Commission Earned (PKR)', 'Commission Paid (PKR)', 'Outstanding (PKR)'],
                          ...ranked.map(d => [
                            d.name,
                            d.achieved,
                            d.commissionEarned || 0,
                            d.commissionPaid || 0,
                            d.commissionOutstanding || 0,
                          ]),
                          [],
                          ['TOTAL', ranked.reduce((s, d) => s + d.achieved, 0), ranked.reduce((s, d) => s + (d.commissionEarned || 0), 0), ranked.reduce((s, d) => s + (d.commissionPaid || 0), 0), ranked.reduce((s, d) => s + (d.commissionOutstanding || 0), 0)],
                        ];
                        const ws = XLSX.utils.aoa_to_sheet(wsData);
                        ws['!cols'] = [{ wch: 24 }, { wch: 16 }, { wch: 26 }, { wch: 24 }, { wch: 22 }];
                        const wb = XLSX.utils.book_new();
                        XLSX.utils.book_append_sheet(wb, ws, 'Commission Summary');
                        XLSX.writeFile(wb, `commission_summary_${new Date().toISOString().split('T')[0]}.xlsx`);
                      }}
                      style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: '#eff6ff', border: '1.5px solid #bfdbfe', color: '#1e40af', borderRadius: 9, padding: '0.45rem 0.9rem', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}
                    >
                      📊 Export Commissions
                    </button>
                  </div>
                </div>
                {dealersLoading ? <div className="loading"><div className="spinner"></div>Loading...</div> : (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                      <thead>
                        <tr style={{ borderBottom: '2px solid #f1f5f9' }}>
                          {[
                            { label: '#', col: null },
                            { label: 'Dealer', col: 'name' },
                            { label: 'Package', col: null },
                            { label: 'Commission %', col: null },
                            { label: 'Target', col: 'totalTarget' },
                            { label: 'Achieved', col: 'achieved' },
                            { label: 'Progress', col: 'progress' },
                            { label: 'Comm. Earned', col: 'commissionEarned' },
                            { label: 'Comm. Paid', col: 'commissionPaid' },
                            { label: 'Outstanding', col: 'commissionOutstanding' },
                            { label: 'Deposit', col: null },
                            { label: 'Reward', col: null },
                            { label: 'Actions', col: null },
                          ].map(({ label, col }) => {
                            const isActive = dealerSort.col === col && col !== null;
                            const canSort = col !== null;
                            return (
                              <th
                                key={label}
                                onClick={canSort ? () => setDealerSort(s => s.col === col ? { col, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { col, dir: 'desc' }) : undefined}
                                style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.7rem', fontWeight: 700, color: isActive ? '#1a6b3c' : '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap', cursor: canSort ? 'pointer' : 'default', userSelect: 'none' }}
                              >
                                {label}{isActive ? (dealerSort.dir === 'asc' ? ' ▲' : ' ▼') : (canSort ? <span style={{ opacity: 0.3, marginLeft: '0.2rem' }}>⇅</span> : '')}
                              </th>
                            );
                          })}
                        </tr>
                      </thead>
                      <tbody>
                        {(() => {
                          const commRanks = [...dealers]
                            .filter(d => (d.commissionEarned || 0) > 0)
                            .sort((a, b) => (b.commissionEarned || 0) - (a.commissionEarned || 0))
                            .map((d, i) => ({ id: d.id, rank: i + 1 }));
                          const rankMap = Object.fromEntries(commRanks.map(r => [r.id, r.rank]));
                          const medalEmoji = { 1: '🥇', 2: '🥈', 3: '🥉' };
                          const sorted = dealerSort.col
                            ? [...dealers].sort((a, b) => {
                                let av, bv;
                                if (dealerSort.col === 'progress') {
                                  av = a.totalTarget > 0 ? a.achieved / a.totalTarget : 0;
                                  bv = b.totalTarget > 0 ? b.achieved / b.totalTarget : 0;
                                } else if (dealerSort.col === 'name') {
                                  av = (a.name || '').toLowerCase();
                                  bv = (b.name || '').toLowerCase();
                                  return dealerSort.dir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
                                } else {
                                  av = a[dealerSort.col] || 0;
                                  bv = b[dealerSort.col] || 0;
                                }
                                return dealerSort.dir === 'asc' ? av - bv : bv - av;
                              })
                            : dealers;
                          return sorted.map(d => {
                          const pct = d.totalTarget > 0 ? Math.min(100, Math.round((d.achieved / d.totalTarget) * 100)) : 0;
                          const isSelected = selected?.id === d.id;
                          const rank = rankMap[d.id];
                          return (
                            <tr key={d.id} style={{ borderBottom: '1px solid #f8fafc', background: isSelected ? '#f0fdf4' : 'transparent', cursor: 'pointer' }}
                              onClick={() => openAssign(d)}
                              onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = '#f8fafc'; }}
                              onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = isSelected ? '#f0fdf4' : 'transparent'; }}>
                              <td style={{ padding: '0.875rem', textAlign: 'center' }}>
                                {rank ? (
                                  rank <= 3
                                    ? <span style={{ fontSize: '1.1rem' }}>{medalEmoji[rank]}</span>
                                    : <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#94a3b8' }}>#{rank}</span>
                                ) : <span style={{ color: '#e5e7eb', fontSize: '0.8rem' }}>—</span>}
                              </td>
                              <td style={{ padding: '0.875rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg, #1a6b3c, #059669)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: '0.8rem', flexShrink: 0 }}>{d.name.charAt(0)}</div>
                                  <div>
                                    <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.85rem' }}>{d.name}</div>
                                    <div style={{ fontSize: '0.7rem', color: '#94a3b8', fontFamily: 'monospace' }}>{d.username}</div>
                                  </div>
                                </div>
                              </td>
                              <td style={{ padding: '0.875rem' }}>
                                {d.packageName ? <span style={{ background: '#eff6ff', color: '#1d4ed8', borderRadius: 6, padding: '0.2rem 0.5rem', fontSize: '0.75rem', fontWeight: 700 }}>{d.packageName}</span> : <span style={{ color: '#e5e7eb', fontSize: '0.8rem' }}>—</span>}
                              </td>
                              <td style={{ padding: '0.875rem' }}>
                                <span style={{ background: d.hasCommissionOverride ? '#fef3c7' : '#f0fdf4', color: d.hasCommissionOverride ? '#92400e' : '#065f46', borderRadius: 6, padding: '0.2rem 0.5rem', fontSize: '0.78rem', fontWeight: 800 }}>
                                  {d.commissionPct}%{d.hasCommissionOverride ? ' ★' : ''}
                                </span>
                              </td>
                              <td style={{ padding: '0.875rem', fontWeight: 700, color: d.hasTarget ? '#0f172a' : '#94a3b8' }}>{d.hasTarget ? d.totalTarget : '—'}</td>
                              <td style={{ padding: '0.875rem', fontWeight: 700, color: '#059669' }}>{d.achieved}</td>
                              <td style={{ padding: '0.875rem', minWidth: 120 }}>
                                {d.hasTarget ? (
                                  <div>
                                    <div style={{ height: 6, background: '#f1f5f9', borderRadius: 9999, marginBottom: 3, overflow: 'hidden' }}>
                                      <div style={{ height: '100%', width: `${pct}%`, background: pct >= 80 ? '#059669' : pct >= 50 ? '#d97706' : '#dc2626', borderRadius: 9999 }} />
                                    </div>
                                    <div style={{ fontSize: '0.7rem', color: '#64748b' }}>{pct}%</div>
                                  </div>
                                ) : <span style={{ color: '#e5e7eb' }}>—</span>}
                              </td>
                              <td style={{ padding: '0.875rem', fontWeight: 700, color: '#059669', fontSize: '0.82rem', whiteSpace: 'nowrap' }}>
                                {d.commissionEarned > 0 ? fmt(d.commissionEarned) : <span style={{ color: '#e5e7eb' }}>—</span>}
                              </td>
                              <td style={{ padding: '0.875rem', fontWeight: 700, color: '#1d4ed8', fontSize: '0.82rem', whiteSpace: 'nowrap' }}>
                                {d.commissionPaid > 0 ? fmt(d.commissionPaid) : <span style={{ color: '#e5e7eb' }}>—</span>}
                              </td>
                              <td style={{ padding: '0.875rem', whiteSpace: 'nowrap' }}>
                                {d.commissionOutstanding > 0 ? (
                                  <span style={{ background: '#fef3c7', color: '#92400e', borderRadius: 9999, padding: '0.2rem 0.6rem', fontSize: '0.72rem', fontWeight: 800 }}>
                                    ⏳ {fmt(d.commissionOutstanding)}
                                  </span>
                                ) : d.commissionEarned > 0 ? (
                                  <span style={{ background: '#d1fae5', color: '#065f46', borderRadius: 9999, padding: '0.2rem 0.6rem', fontSize: '0.72rem', fontWeight: 800 }}>✓ Settled</span>
                                ) : <span style={{ color: '#e5e7eb' }}>—</span>}
                              </td>
                              <td style={{ padding: '0.875rem' }}>
                                <span style={{ background: d.securityDepositPaid ? '#d1fae5' : '#fef3c7', color: d.securityDepositPaid ? '#065f46' : '#92400e', borderRadius: 9999, padding: '0.2rem 0.5rem', fontSize: '0.72rem', fontWeight: 700 }}>
                                  {d.securityDepositPaid ? '✓ Paid' : '⏳ Pending'}
                                </span>
                              </td>
                              <td style={{ padding: '0.875rem' }}>
                                {pct >= 100 && !d.rewardGiven && (
                                  <button className="btn btn-sm" onClick={async e => { e.stopPropagation(); await handleMarkReward(d.id); }}
                                    style={{ background: '#7c3aed', color: '#fff', border: 'none', fontSize: '0.7rem', padding: '0.25rem 0.6rem', borderRadius: 7, cursor: 'pointer' }}>
                                    🎁 Give
                                  </button>
                                )}
                                {d.rewardGiven && <span style={{ fontSize: '0.75rem', color: '#7c3aed', fontWeight: 700 }}>🏆 Given</span>}
                                {pct < 100 && <span style={{ color: '#e5e7eb', fontSize: '0.8rem' }}>—</span>}
                              </td>
                              <td style={{ padding: '0.875rem' }}>
                                <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
                                  <button className="btn btn-outline btn-sm" onClick={e => { e.stopPropagation(); openAssign(d); setAccessDealer(null); }} style={{ fontSize: '0.7rem' }}>
                                    {d.hasTarget ? '✏️ Target' : '+ Target'}
                                  </button>
                                  <button onClick={e => { e.stopPropagation(); openAccessPanel(d); }} style={{ padding: '0.3rem 0.55rem', background: accessDealer?.id === d.id ? '#1e293b' : '#f8fafc', border: `1.5px solid ${accessDealer?.id === d.id ? '#334155' : '#e2e8f0'}`, color: accessDealer?.id === d.id ? '#fff' : '#374151', borderRadius: 7, cursor: 'pointer', fontSize: '0.75rem', fontWeight: 700 }} title="Password & Access Control">
                                    🔐
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        });
                        })()}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {selected && (
                <div style={{ background: '#fff', borderRadius: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.06)', border: '1px solid #e2e8f0', position: 'sticky', top: 80, overflow: 'hidden' }}>
                  <div style={{ background: 'linear-gradient(135deg, #1a6b3c, #145530)', color: '#fff', padding: '1.25rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', opacity: 0.75, marginBottom: '0.2rem' }}>Assign Target</div>
                      <div style={{ fontWeight: 800, fontSize: '1.1rem' }}>{selected.name}</div>
                    </div>
                    <button onClick={() => { setSelected(null); setSaveMsg(''); }} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', borderRadius: 8, width: 30, height: 30, cursor: 'pointer', fontSize: '0.875rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
                  </div>

                  <form onSubmit={handleSaveTarget} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    <div className="form-group">
                      <label>📦 Package</label>
                      <select value={tForm.packageId} onChange={e => handlePackageSelect(e.target.value)} style={{ width: '100%', padding: '0.6rem 0.75rem', border: '1.5px solid #e2e8f0', borderRadius: 9, fontFamily: 'inherit', fontSize: '0.9rem' }}>
                        <option value="">— Custom (manual entry) —</option>
                        {packages.map(p => <option key={p.id} value={p.id}>{p.name} ({p.totalPlots} plots)</option>)}
                      </select>
                      {tForm.packageId && packages.find(p => p.id === parseInt(tForm.packageId)) && (
                        <div style={{ marginTop: '0.5rem', background: '#f5f3ff', border: '1px solid #ddd6fe', borderRadius: 8, padding: '0.625rem 0.875rem', fontSize: '0.78rem', color: '#6d28d9' }}>
                          🎁 Reward: {packages.find(p => p.id === parseInt(tForm.packageId))?.rewardDescription}
                        </div>
                      )}
                    </div>

                    <div>
                      <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#374151', marginBottom: '0.75rem' }}>🎯 Plot Quota per Size {tForm.packageId && <span style={{ fontWeight: 500, color: '#94a3b8', fontSize: '0.72rem' }}>(auto-filled from package)</span>}</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                        {PLOT_SIZES.map(size => (
                          <div key={size} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', background: '#f8fafc', borderRadius: 10, padding: '0.5rem 0.875rem', border: '1px solid #e2e8f0' }}>
                            <div style={{ flex: 1, fontSize: '0.875rem', fontWeight: 600, color: '#374151' }}>{size}</div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                              <button type="button" onClick={() => setTForm(f => ({ ...f, sizes: { ...f.sizes, [size]: Math.max(0, (f.sizes[size] || 0) - 1) } }))} style={{ width: 26, height: 26, borderRadius: 7, border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#374151' }}>−</button>
                              <input type="number" min="0" value={tForm.sizes[size] ?? 0} onChange={e => setTForm(f => ({ ...f, sizes: { ...f.sizes, [size]: parseInt(e.target.value) || 0 } }))} style={{ width: 50, textAlign: 'center', padding: '0.2rem', border: '1.5px solid #e2e8f0', borderRadius: 7, fontWeight: 700, fontSize: '0.95rem', fontFamily: 'inherit', color: '#0f172a' }} />
                              <button type="button" onClick={() => setTForm(f => ({ ...f, sizes: { ...f.sizes, [size]: (f.sizes[size] || 0) + 1 } }))} style={{ width: 26, height: 26, borderRadius: 7, border: 'none', background: '#1a6b3c', cursor: 'pointer', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>+</button>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div style={{ marginTop: '0.625rem', padding: '0.5rem 0.875rem', background: '#f0fdf4', borderRadius: 8, fontSize: '0.78rem', color: '#065f46', fontWeight: 600, border: '1px solid #bbf7d0' }}>
                        Total quota: {PLOT_SIZES.reduce((sum, s) => sum + (parseInt(tForm.sizes[s]) || 0), 0)} plots
                      </div>
                    </div>

                    {/* ── Plot Assignment Picker ── */}
                    {PLOT_SIZES.some(s => (tForm.sizes[s] || 0) > 0) && (
                      <div>
                        <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#374151', marginBottom: '0.625rem' }}>🗂️ Assign Specific Plots from Inventory</div>
                        <p style={{ fontSize: '0.73rem', color: '#94a3b8', marginBottom: '0.75rem', lineHeight: 1.5 }}>
                          Select exact plot numbers for each size — dealer will only see these assigned plots. Max per size = quota above.
                        </p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                          {PLOT_SIZES.filter(size => (tForm.sizes[size] || 0) > 0).map(size => {
                            const quota = parseInt(tForm.sizes[size]) || 0;
                            const availForSize = assignPanelPlots.filter(p => p.size === size && p.status === 'available');
                            const selectedIds = tForm.assignedPlots?.[size] || [];
                            const atQuota = selectedIds.length >= quota;
                            return (
                              <div key={size} style={{ borderRadius: 10, border: `1.5px solid ${selectedIds.length > 0 ? '#bbf7d0' : '#e2e8f0'}`, overflow: 'hidden' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0.75rem', background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                                  <span style={{ fontWeight: 700, fontSize: '0.82rem', color: '#0f172a' }}>{size}</span>
                                  <span style={{ background: atQuota ? '#d1fae5' : '#fef3c7', color: atQuota ? '#065f46' : '#92400e', borderRadius: 9999, padding: '0.15rem 0.5rem', fontSize: '0.7rem', fontWeight: 800 }}>
                                    {selectedIds.length}/{quota} selected
                                  </span>
                                </div>
                                <div style={{ padding: '0.5rem 0.75rem' }}>
                                  {availForSize.length === 0 ? (
                                    <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontStyle: 'italic', padding: '0.25rem 0' }}>
                                      No available plots of this size in inventory
                                    </div>
                                  ) : (
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', maxHeight: 110, overflowY: 'auto', paddingRight: '0.25rem' }}>
                                      {availForSize.map(p => {
                                        const isSel = selectedIds.includes(p.id);
                                        const disabled = !isSel && atQuota;
                                        return (
                                          <button
                                            key={p.id}
                                            type="button"
                                            title={`${p.number}${p.area ? ` · ${p.area}` : ''}${p.description ? ` · ${p.description}` : ''}`}
                                            disabled={disabled}
                                            onClick={() => setTForm(f => {
                                              const cur = f.assignedPlots?.[size] || [];
                                              const updated = isSel ? cur.filter(id => id !== p.id) : (cur.length < quota ? [...cur, p.id] : cur);
                                              return { ...f, assignedPlots: { ...f.assignedPlots, [size]: updated } };
                                            })}
                                            style={{ padding: '0.2rem 0.5rem', borderRadius: 7, border: '1.5px solid', fontSize: '0.72rem', fontWeight: 700, cursor: disabled ? 'not-allowed' : 'pointer', background: isSel ? '#1a6b3c' : disabled ? '#f1f5f9' : '#fff', color: isSel ? '#fff' : disabled ? '#cbd5e1' : '#374151', borderColor: isSel ? '#1a6b3c' : disabled ? '#e2e8f0' : '#cbd5e1', fontFamily: 'monospace', transition: 'all 0.12s' }}
                                          >
                                            {p.number}
                                          </button>
                                        );
                                      })}
                                    </div>
                                  )}
                                </div>
                                {selectedIds.length > 0 && (
                                  <div style={{ padding: '0.3rem 0.75rem 0.5rem', fontSize: '0.7rem', color: '#374151' }}>
                                    <span style={{ fontWeight: 600 }}>Assigned: </span>
                                    {selectedIds.map(id => {
                                      const p = assignPanelPlots.find(x => x.id === id);
                                      return p ? <span key={id} style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 5, padding: '0.1rem 0.35rem', marginRight: '0.2rem', fontFamily: 'monospace', fontWeight: 700, color: '#1a6b3c' }}>{p.number}</span> : null;
                                    })}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                        <div style={{ marginTop: '0.625rem', padding: '0.5rem 0.875rem', background: '#f0fdf4', borderRadius: 8, fontSize: '0.78rem', color: '#065f46', fontWeight: 600, border: '1px solid #bbf7d0', display: 'flex', justifyContent: 'space-between' }}>
                          <span>Total assigned</span>
                          <span>{Object.values(tForm.assignedPlots || {}).reduce((s, ids) => s + ids.length, 0)} / {PLOT_SIZES.reduce((sum, s) => sum + (parseInt(tForm.sizes[s]) || 0), 0)} quota</span>
                        </div>
                      </div>
                    )}

                    <div className="form-group">
                      <label>💰 Payment Target (PKR)</label>
                      <input type="number" value={tForm.paymentTarget} onChange={e => setTForm(f => ({ ...f, paymentTarget: e.target.value }))} placeholder="e.g. 20000000" />
                    </div>

                    <div>
                      <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#374151', marginBottom: '0.625rem' }}>🔐 Security Deposit</div>
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.5rem' }}>
                        <input type="number" value={tForm.depositAmount} onChange={e => setTForm(f => ({ ...f, depositAmount: e.target.value }))} placeholder="Required amount" style={{ flex: 1, padding: '0.5rem 0.75rem', border: '1.5px solid #e2e8f0', borderRadius: 9, fontFamily: 'inherit', fontSize: '0.85rem' }} />
                        <button type="button" onClick={() => setTForm(f => ({ ...f, depositPaid: !f.depositPaid }))} style={{ padding: '0.5rem 0.875rem', borderRadius: 9, border: '1.5px solid', fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer', background: tForm.depositPaid ? '#d1fae5' : '#fef3c7', color: tForm.depositPaid ? '#065f46' : '#92400e', borderColor: tForm.depositPaid ? '#6ee7b7' : '#fcd34d' }}>
                          {tForm.depositPaid ? '✓ Paid' : '○ Pending'}
                        </button>
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#374151', marginBottom: '0.625rem' }}>💵 Commission Payout</div>
                      {selected && (() => {
                        const earned = selected.commissionEarned || 0;
                        const paid = selected.commissionPaid || 0;
                        const outstanding = selected.commissionOutstanding || 0;
                        return (
                          <div style={{ marginBottom: '0.75rem', background: '#f8fafc', borderRadius: 9, padding: '0.5rem 0.75rem', fontSize: '0.78rem', border: '1px solid #e2e8f0', display: 'flex', gap: '1.25rem', flexWrap: 'wrap' }}>
                            <span>Earned: <strong style={{ color: '#059669' }}>{fmt(earned)}</strong></span>
                            <span>Paid: <strong style={{ color: '#0ea5e9' }}>{fmt(paid)}</strong></span>
                            <span>Outstanding: <strong style={{ color: outstanding > 0 ? '#92400e' : '#065f46' }}>{fmt(outstanding)}</strong></span>
                          </div>
                        );
                      })()}
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.4rem' }}>
                        <input
                          type="number"
                          min="1"
                          value={payoutAmt}
                          onChange={e => setPayoutAmt(e.target.value)}
                          placeholder="New payment amount"
                          style={{ flex: 1, padding: '0.5rem 0.75rem', border: '1.5px solid #e2e8f0', borderRadius: 9, fontFamily: 'inherit', fontSize: '0.85rem' }}
                        />
                        <button
                          type="button"
                          onClick={() => setPayoutAmt(String(selected?.commissionOutstanding || 0))}
                          style={{ padding: '0.5rem 0.875rem', borderRadius: 9, border: '1.5px solid #6ee7b7', background: '#d1fae5', color: '#065f46', fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer', whiteSpace: 'nowrap' }}
                          title="Fill outstanding amount"
                        >
                          Fill Outstanding
                        </button>
                      </div>
                      <input
                        type="text"
                        value={payoutNote}
                        onChange={e => setPayoutNote(e.target.value)}
                        placeholder="Notes (optional — e.g. Q2 payout via bank transfer)"
                        style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1.5px solid #e2e8f0', borderRadius: 9, fontFamily: 'inherit', fontSize: '0.82rem', boxSizing: 'border-box', marginBottom: '0.4rem' }}
                      />
                      <button
                        type="button"
                        onClick={handleRecordPayout}
                        disabled={payoutSaving || !payoutAmt}
                        style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: 9, border: 'none', background: payoutSaving || !payoutAmt ? '#e2e8f0' : '#1a6b3c', color: payoutSaving || !payoutAmt ? '#94a3b8' : '#fff', fontWeight: 700, fontSize: '0.82rem', cursor: payoutSaving || !payoutAmt ? 'not-allowed' : 'pointer', fontFamily: 'inherit', transition: 'background 0.15s' }}
                      >
                        {payoutSaving ? 'Recording…' : '+ Record Payout'}
                      </button>
                      {payoutMsg && <div style={{ fontSize: '0.75rem', marginTop: '0.3rem', color: payoutMsg.startsWith('✅') ? '#059669' : '#dc2626', fontWeight: 600 }}>{payoutMsg}</div>}

                      {/* Payout History */}
                      <div style={{ marginTop: '0.75rem' }}>
                        <button
                          type="button"
                          onClick={() => setPayoutHistoryOpen(o => !o)}
                          style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontSize: '0.78rem', fontWeight: 700, color: '#374151' }}
                        >
                          <span style={{ transition: 'transform 0.15s', display: 'inline-block', transform: payoutHistoryOpen ? 'rotate(90deg)' : 'rotate(0deg)' }}>▶</span>
                          Payout History ({payoutHistory.length})
                        </button>
                        {payoutHistoryOpen && (
                          <div style={{ marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.35rem', maxHeight: 220, overflowY: 'auto' }}>
                            {payoutHistory.length === 0 ? (
                              <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontStyle: 'italic', padding: '0.25rem 0.5rem' }}>No payouts recorded yet.</div>
                            ) : payoutHistory.map(entry => (
                              <div key={entry.id} style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '0.45rem 0.7rem', fontSize: '0.75rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: entry.notes ? '0.2rem' : 0 }}>
                                  <strong style={{ color: '#059669', fontSize: '0.82rem' }}>{fmt(entry.amount)}</strong>
                                  <span style={{ color: '#64748b', fontSize: '0.7rem' }}>{new Date(entry.date).toLocaleString('en-PK', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem' }}>
                                  {entry.notes && <span style={{ color: '#374151', fontStyle: 'italic', flex: 1 }}>{entry.notes}</span>}
                                  <span style={{ color: '#94a3b8', whiteSpace: 'nowrap' }}>by {entry.adminName}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="form-group">
                      <label>📝 Notes</label>
                      <input value={tForm.notes} onChange={e => setTForm(f => ({ ...f, notes: e.target.value }))} placeholder="e.g. Q2 2026 Sales Target" />
                    </div>

                    <div className="form-group">
                      <label>💵 Commission % Override</label>
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <input type="number" min="0" max="100" step="0.5" value={tForm.commissionPct} onChange={e => setTForm(f => ({ ...f, commissionPct: e.target.value }))} placeholder={`Pkg default: ${packages.find(p => p.id === parseInt(tForm.packageId))?.commissionPct ?? '—'}%`} style={{ flex: 1 }} />
                        {tForm.commissionPct !== '' && <button type="button" onClick={() => setTForm(f => ({ ...f, commissionPct: '' }))} style={{ padding: '0.5rem 0.75rem', background: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: '0.75rem', fontWeight: 700, whiteSpace: 'nowrap' }}>✕ Use Default</button>}
                      </div>
                      <div style={{ fontSize: '0.73rem', color: '#94a3b8', marginTop: '0.25rem' }}>Leave blank to use the package default. Fill only to set a custom rate for this dealer.</div>
                    </div>

                    {saveMsg && <div className={saveMsg.startsWith('✅') ? 'alert alert-success' : 'alert alert-error'} style={{ fontSize: '0.85rem' }}>{saveMsg}</div>}
                    <button type="submit" className="btn btn-primary" disabled={saving} style={{ width: '100%', justifyContent: 'center', padding: '0.75rem' }}>
                      {saving ? <><div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }}></div> Saving...</> : '✓ Save Target & Deposit'}
                    </button>
                  </form>
                </div>
              )}

              {/* ── Access Control Panel ── */}
              {accessDealer && (
                <div style={{ background: '#fff', borderRadius: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.06)', border: '1px solid #e2e8f0', position: 'sticky', top: 80, overflow: 'hidden' }}>
                  <div style={{ background: 'linear-gradient(135deg, #1e293b, #0f172a)', color: '#fff', padding: '1.25rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', opacity: 0.6, marginBottom: '0.2rem' }}>Password & Access Control</div>
                      <div style={{ fontWeight: 800, fontSize: '1.05rem' }}>{accessDealer.name}</div>
                    </div>
                    <button onClick={() => { setAccessDealer(null); setGenPwd(null); }} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', borderRadius: 8, width: 30, height: 30, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
                  </div>

                  <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

                    {/* ── Password Generator ── */}
                    <div style={{ background: '#f8fafc', borderRadius: 12, padding: '1.1rem', border: '1px solid #e2e8f0' }}>
                      <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#0f172a', marginBottom: '0.625rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        🔑 Password Generator
                      </div>
                      <p style={{ fontSize: '0.78rem', color: '#64748b', marginBottom: '0.75rem', lineHeight: 1.5 }}>
                        Generate a new secure password for <strong>{accessDealer.username}</strong>. The old password will be immediately replaced — share it with the dealer before closing.
                      </p>
                      <button onClick={() => handleGeneratePassword()} disabled={genPwdSaving} style={{ padding: '0.55rem 1.1rem', background: 'linear-gradient(135deg, #1e293b, #0f172a)', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        {genPwdSaving ? <><div className="spinner" style={{ width: 13, height: 13, borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)', borderTopColor: '#fff' }}></div> Setting...</> : '⚡ Generate Random Password'}
                      </button>

                      {/* ── Custom password input ── */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '0.5rem 0' }}>
                        <div style={{ flex: 1, height: 1, background: '#e2e8f0' }} />
                        <span style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 600 }}>or set manually</span>
                        <div style={{ flex: 1, height: 1, background: '#e2e8f0' }} />
                      </div>
                      <div style={{ display: 'flex', gap: '0.4rem' }}>
                        <input
                          type="text"
                          value={customPwdInput}
                          onChange={e => { setCustomPwdInput(e.target.value); setCustomPwdMsg(''); }}
                          onKeyDown={e => e.key === 'Enter' && customPwdInput.trim().length >= 6 && handleGeneratePassword(customPwdInput.trim())}
                          placeholder="Type a custom password (min 6 chars)"
                          style={{ flex: 1, padding: '0.5rem 0.7rem', border: `1.5px solid ${customPwdMsg.startsWith('❌') ? '#fca5a5' : '#e2e8f0'}`, borderRadius: 8, fontFamily: 'monospace', fontSize: '0.85rem', background: '#fff' }}
                        />
                        <button
                          onClick={() => handleGeneratePassword(customPwdInput.trim())}
                          disabled={genPwdSaving || customPwdInput.trim().length < 6}
                          style={{ padding: '0.5rem 0.875rem', background: customPwdInput.trim().length >= 6 ? '#0f172a' : '#e2e8f0', color: customPwdInput.trim().length >= 6 ? '#fff' : '#94a3b8', border: 'none', borderRadius: 8, cursor: customPwdInput.trim().length >= 6 ? 'pointer' : 'not-allowed', fontWeight: 700, fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                          Set Password
                        </button>
                      </div>
                      {customPwdMsg && <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#b91c1c', marginTop: '0.25rem' }}>{customPwdMsg}</div>}

                      {genPwd && (
                        <div style={{ marginTop: '0.875rem', background: '#0f172a', borderRadius: 10, padding: '0.875rem 1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem' }}>
                          <code style={{ color: '#86efac', fontFamily: 'monospace', fontSize: '1rem', fontWeight: 700, letterSpacing: '0.08em', flex: 1 }}>{genPwd}</code>
                          <button onClick={() => { navigator.clipboard.writeText(genPwd); setGenPwdCopied(true); setTimeout(() => setGenPwdCopied(false), 2000); }} style={{ padding: '0.3rem 0.75rem', background: genPwdCopied ? '#059669' : 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 7, cursor: 'pointer', color: '#fff', fontSize: '0.75rem', fontWeight: 700, whiteSpace: 'nowrap', transition: 'background 0.2s' }}>
                            {genPwdCopied ? '✓ Copied!' : '📋 Copy'}
                          </button>
                        </div>
                      )}
                    </div>

                    {/* ── Login History ── */}
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#0f172a', marginBottom: '0.625rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        🌐 Login History
                      </div>
                      {loginHistoryLoading ? (
                        <div style={{ textAlign: 'center', padding: '1rem', color: '#94a3b8', fontSize: '0.8rem' }}><div className="spinner" style={{ width: 16, height: 16, borderWidth: 2, margin: '0 auto 0.4rem' }}></div>Loading…</div>
                      ) : loginHistory.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '1.25rem', color: '#94a3b8', fontSize: '0.8rem', background: '#f8fafc', borderRadius: 10, border: '1px dashed #e2e8f0' }}>No login records yet</div>
                      ) : (
                        <div style={{ maxHeight: 240, overflowY: 'auto', borderRadius: 10, border: '1px solid #f1f5f9' }}>
                          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem' }}>
                            <thead style={{ position: 'sticky', top: 0, background: '#f8fafc', zIndex: 1 }}>
                              <tr>
                                {['Time', 'IP Address', 'ISP / Country', 'Status'].map(h => (
                                  <th key={h} style={{ padding: '0.5rem 0.625rem', textAlign: 'left', fontSize: '0.67rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: '1px solid #e2e8f0', whiteSpace: 'nowrap' }}>{h}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {loginHistory.map((entry, i) => (
                                <tr key={i} style={{ borderBottom: '1px solid #f8fafc' }}>
                                  <td style={{ padding: '0.45rem 0.625rem', color: '#374151', whiteSpace: 'nowrap' }}>{new Date(entry.at).toLocaleString('en-PK', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
                                  <td style={{ padding: '0.45rem 0.625rem', fontFamily: 'monospace', fontWeight: 700, color: '#0f172a' }}>{entry.ip}</td>
                                  <td style={{ padding: '0.45rem 0.625rem', color: '#64748b', maxWidth: 130, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={`${entry.isp || '—'} · ${entry.country || '—'}`}>{entry.isp || '—'} · {entry.country || '—'}</td>
                                  <td style={{ padding: '0.45rem 0.625rem' }}>
                                    {entry.blocked ? (
                                      <span style={{ background: '#fee2e2', color: '#b91c1c', borderRadius: 9999, padding: '0.1rem 0.45rem', fontWeight: 700, fontSize: '0.67rem' }}>
                                        {entry.reason === 'vpn_detected' ? '🚫 VPN' : '🚫 IP Lock'}
                                      </span>
                                    ) : entry.vpnDetected ? (
                                      <span style={{ background: '#fef3c7', color: '#92400e', borderRadius: 9999, padding: '0.1rem 0.45rem', fontWeight: 700, fontSize: '0.67rem' }}>⚠️ VPN</span>
                                    ) : (
                                      <span style={{ background: '#d1fae5', color: '#065f46', borderRadius: 9999, padding: '0.1rem 0.45rem', fontWeight: 700, fontSize: '0.67rem' }}>✓ OK</span>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>

                    {/* ── Security Settings ── */}
                    <div style={{ background: '#f8fafc', borderRadius: 12, padding: '1.1rem', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
                      <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>🛡️ Access Restrictions</div>

                      {/* VPN restriction toggle */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff', borderRadius: 10, padding: '0.75rem 0.875rem', border: '1px solid #e2e8f0' }}>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '0.82rem', color: '#0f172a' }}>Block VPN / Proxy</div>
                          <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '0.1rem' }}>Deny login if VPN or proxy is detected</div>
                        </div>
                        <button type="button" onClick={() => setAccessSec(s => ({ ...s, vpnRestricted: !s.vpnRestricted }))} style={{ width: 42, height: 24, borderRadius: 9999, border: 'none', cursor: 'pointer', background: accessSec.vpnRestricted ? '#dc2626' : '#e2e8f0', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}>
                          <div style={{ width: 18, height: 18, borderRadius: '50%', background: '#fff', position: 'absolute', top: 3, left: accessSec.vpnRestricted ? 21 : 3, transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
                        </button>
                      </div>

                      {/* IP lock toggle */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff', borderRadius: 10, padding: '0.75rem 0.875rem', border: '1px solid #e2e8f0' }}>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '0.82rem', color: '#0f172a' }}>Lock to Trusted IPs</div>
                          <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '0.1rem' }}>Only allow login from whitelisted IPs below</div>
                        </div>
                        <button type="button" onClick={() => setAccessSec(s => ({ ...s, ipLocked: !s.ipLocked }))} style={{ width: 42, height: 24, borderRadius: 9999, border: 'none', cursor: 'pointer', background: accessSec.ipLocked ? '#1a6b3c' : '#e2e8f0', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}>
                          <div style={{ width: 18, height: 18, borderRadius: '50%', background: '#fff', position: 'absolute', top: 3, left: accessSec.ipLocked ? 21 : 3, transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
                        </button>
                      </div>

                      {/* Trusted IPs list */}
                      <div>
                        <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#374151', marginBottom: '0.4rem' }}>Trusted IP Addresses</div>
                        {accessSec.trustedIPs.length === 0 ? (
                          <div style={{ fontSize: '0.75rem', color: '#94a3b8', padding: '0.4rem 0', fontStyle: 'italic' }}>No IPs whitelisted — any IP can log in</div>
                        ) : (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginBottom: '0.5rem' }}>
                            {accessSec.trustedIPs.map(ip => (
                              <span key={ip} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', background: '#e0f2fe', color: '#0369a1', borderRadius: 9999, padding: '0.2rem 0.6rem', fontSize: '0.75rem', fontWeight: 700, fontFamily: 'monospace' }}>
                                {ip}
                                <button onClick={() => removeTrustedIP(ip)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#0369a1', fontSize: '0.8rem', padding: 0, lineHeight: 1 }}>✕</button>
                              </span>
                            ))}
                          </div>
                        )}
                        <div style={{ display: 'flex', gap: '0.4rem' }}>
                          <input value={newTrustedIP} onChange={e => setNewTrustedIP(e.target.value)} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addTrustedIP())} placeholder="e.g. 203.0.113.42" style={{ flex: 1, padding: '0.45rem 0.625rem', border: '1.5px solid #e2e8f0', borderRadius: 8, fontFamily: 'monospace', fontSize: '0.8rem' }} />
                          <button onClick={addTrustedIP} style={{ padding: '0.45rem 0.75rem', background: '#0369a1', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: '0.78rem' }}>+ Add</button>
                        </div>
                      </div>

                      {accessSecMsg && <div className={accessSecMsg.startsWith('✅') ? 'alert alert-success' : 'alert alert-error'} style={{ fontSize: '0.82rem' }}>{accessSecMsg}</div>}
                      <button onClick={handleSaveAccessSec} disabled={accessSecSaving} style={{ padding: '0.65rem', background: 'linear-gradient(135deg, #1e293b, #0f172a)', color: '#fff', border: 'none', borderRadius: 9, cursor: 'pointer', fontWeight: 700, fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}>
                        {accessSecSaving ? <><div className="spinner" style={{ width: 14, height: 14, borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)', borderTopColor: '#fff' }}></div> Saving…</> : '✓ Save Security Settings'}
                      </button>
                    </div>

                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ─── REGISTRATIONS TAB ─── */}
        {tab === 'Registrations' && (
          <div style={{ display: 'grid', gridTemplateColumns: approveTarget ? '1fr 400px' : '1fr', gap: '1.5rem', alignItems: 'start' }}>
            <div style={{ background: '#fff', borderRadius: 16, padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', border: '1px solid #f1f5f9' }}>
              <div style={{ marginBottom: '1.25rem' }}>
                <h3 style={{ fontWeight: 800, color: '#0f172a', marginBottom: '0.25rem' }}>Dealer Registration Requests</h3>
                <p style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Review and approve prospective dealers to create their login accounts</p>
              </div>
              {regsLoading ? <div className="loading"><div className="spinner"></div>Loading...</div> : regs.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
                  <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>📋</div>
                  <div style={{ fontWeight: 600 }}>No registration requests yet</div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {regs.map(r => (
                    <div key={r.id} style={{ border: `1.5px solid ${r.status === 'approved' ? '#bbf7d0' : '#fed7aa'}`, borderRadius: 12, padding: '1.25rem', background: r.status === 'approved' ? '#f0fdf4' : '#fffbeb' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', marginBottom: '0.875rem', flexWrap: 'wrap' }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '0.25rem' }}>
                            <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'linear-gradient(135deg, #7c3aed, #a855f7)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: '0.85rem', flexShrink: 0 }}>{r.name.charAt(0)}</div>
                            <div>
                              <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '1rem' }}>{r.name}</div>
                              <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Ref: <strong>{r.regRef}</strong> · {new Date(r.createdAt).toLocaleDateString('en-PK', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                            </div>
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <span style={{ background: r.status === 'approved' ? '#d1fae5' : '#fef3c7', color: r.status === 'approved' ? '#065f46' : '#92400e', borderRadius: 9999, padding: '0.2rem 0.625rem', fontSize: '0.75rem', fontWeight: 700, textTransform: 'capitalize' }}>{r.status}</span>
                          {r.status === 'pending' && (
                            <button className="btn btn-primary btn-sm" onClick={() => { setApproveTarget(r); setApproveForm({ username: '', password: '' }); setApproveMsg(''); }}>Approve & Create Account</button>
                          )}
                        </div>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.5rem', fontSize: '0.8rem' }}>
                        {[
                          { label: 'Business Name', value: r.businessName || '—' },
                          { label: 'Business Cities', value: r.businessCities || '—' },
                          { label: 'Father Name', value: r.fatherName },
                          { label: 'CNIC', value: r.cnic },
                          { label: 'Mobile', value: r.mobilePhone },
                          { label: 'Alt. Phone', value: r.altPhone || '—' },
                          { label: 'Email', value: r.email || '—' },
                          { label: 'Office Phone', value: r.officePhone || '—' },
                          { label: 'Proprietor', value: r.proprietorName },
                          { label: 'Proprietor Phone', value: r.proprietorPhone || '—' },
                        ].map(f => (
                          <div key={f.label} style={{ background: 'rgba(255,255,255,0.7)', borderRadius: 8, padding: '0.5rem 0.75rem' }}>
                            <div style={{ color: '#64748b', fontSize: '0.7rem', fontWeight: 600, marginBottom: '0.15rem' }}>{f.label}</div>
                            <div style={{ fontWeight: 600, color: '#0f172a' }}>{f.value}</div>
                          </div>
                        ))}
                      </div>
                      <div style={{ marginTop: '0.5rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.8rem' }}>
                        <div style={{ background: 'rgba(255,255,255,0.7)', borderRadius: 8, padding: '0.5rem 0.75rem' }}>
                          <div style={{ color: '#64748b', fontSize: '0.7rem', fontWeight: 600, marginBottom: '0.15rem' }}>Postal Address</div>
                          <div style={{ fontWeight: 600, color: '#0f172a' }}>{r.postalAddress}</div>
                        </div>
                        <div style={{ background: 'rgba(255,255,255,0.7)', borderRadius: 8, padding: '0.5rem 0.75rem' }}>
                          <div style={{ color: '#64748b', fontSize: '0.7rem', fontWeight: 600, marginBottom: '0.15rem' }}>Office Address</div>
                          <div style={{ fontWeight: 600, color: '#0f172a' }}>{r.officeAddress || '—'}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {approveTarget && (
              <div style={{ background: '#fff', borderRadius: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.06)', border: '1px solid #e2e8f0', position: 'sticky', top: 80, overflow: 'hidden' }}>
                <div style={{ background: 'linear-gradient(135deg, #7c3aed, #6d28d9)', color: '#fff', padding: '1.25rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', opacity: 0.75, marginBottom: '0.2rem' }}>Create Account</div>
                    <div style={{ fontWeight: 800, fontSize: '1.05rem' }}>{approveTarget.name}</div>
                  </div>
                  <button onClick={() => setApproveTarget(null)} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', borderRadius: 8, width: 30, height: 30, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
                </div>
                <form onSubmit={handleApprove} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div className="form-group">
                    <label>Username</label>
                    <input required value={approveForm.username} onChange={e => setApproveForm(f => ({ ...f, username: e.target.value }))} placeholder="e.g. kamran.akhtar" />
                  </div>
                  <div className="form-group">
                    <label>Initial Password</label>
                    <input required type="password" value={approveForm.password} onChange={e => setApproveForm(f => ({ ...f, password: e.target.value }))} placeholder="Set a password" />
                  </div>
                  {approveMsg && <div className={approveMsg.startsWith('✅') ? 'alert alert-success' : 'alert alert-error'} style={{ fontSize: '0.85rem' }}>{approveMsg}</div>}
                  <button type="submit" className="btn btn-primary" disabled={approveSaving} style={{ justifyContent: 'center', padding: '0.75rem' }}>
                    {approveSaving ? <><div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }}></div> Creating...</> : '✓ Approve & Create Account'}
                  </button>
                </form>
              </div>
            )}
          </div>
        )}

        {/* ─── BOOKINGS TAB ─── */}
        {tab === 'Bookings' && (
          <div>
            {bkgMsg && <div className={bkgMsg.startsWith('✅') ? 'alert alert-success' : 'alert alert-error'} style={{ marginBottom: '1.25rem' }}>{bkgMsg}</div>}
            <div style={{ display: 'grid', gridTemplateColumns: selectedBkg ? '1fr 400px' : '1fr', gap: '1.5rem', alignItems: 'start' }}>
              <div style={{ background: '#fff', borderRadius: 16, padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', border: '1px solid #f1f5f9' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                  <div>
                    <h3 style={{ fontWeight: 800, color: '#0f172a', marginBottom: '0.25rem' }}>Plot Bookings</h3>
                    <p style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Click a row to view details. Approve, reject or delete bookings.</p>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                    {[['All', ''], ['Pending', 'pending'], ['Confirmed', 'confirmed'], ['Rejected', 'rejected']].map(([label, val]) => (
                      <span key={label} style={{ background: val === 'pending' && pendingBkgCount > 0 ? '#fef3c7' : '#f1f5f9', color: val === 'pending' && pendingBkgCount > 0 ? '#92400e' : '#374151', borderRadius: 8, padding: '0.25rem 0.625rem', fontSize: '0.75rem', fontWeight: 700 }}>
                        {label}: {val ? bkgs.filter(b => b.status === val).length : bkgs.length}
                      </span>
                    ))}
                  </div>
                </div>
                <div style={{ marginBottom: '1rem' }}>
                  <input
                    value={bkgSearch}
                    onChange={e => setBkgSearch(e.target.value)}
                    placeholder="🔍  Search by client name or CNIC..."
                    style={{ width: '100%', padding: '0.6rem 0.875rem', border: '1.5px solid #e2e8f0', borderRadius: 9, fontSize: '0.85rem', outline: 'none', boxSizing: 'border-box', background: '#f8fafc' }}
                    onFocus={e => e.target.style.borderColor = '#1a6b3c'}
                    onBlur={e => e.target.style.borderColor = '#e2e8f0'}
                  />
                </div>
                {bkgsLoading ? <div className="loading"><div className="spinner"></div>Loading...</div> : bkgs.filter(b => !b._placeholder).length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
                    <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>📋</div>
                    <div style={{ fontWeight: 600 }}>No bookings yet</div>
                  </div>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                      <thead>
                        <tr style={{ borderBottom: '2px solid #f1f5f9' }}>
                          {['Ref', 'Buyer', 'Plot', 'Dealer', 'Amount', 'Commission', 'Date', 'Status', 'Actions'].map(h => (
                            <th key={h} style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.7rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {bkgs.filter(b => !b._placeholder && (!bkgSearch.trim() || b.name?.toLowerCase().includes(bkgSearch.toLowerCase()) || b.cnic?.includes(bkgSearch))).map(b => (
                          <tr key={b.id}
                            style={{ borderBottom: '1px solid #f8fafc', background: selectedBkg?.id === b.id ? '#f0fdf4' : 'transparent', cursor: 'pointer' }}
                            onClick={() => setSelectedBkg(selectedBkg?.id === b.id ? null : b)}
                            onMouseEnter={e => { if (selectedBkg?.id !== b.id) e.currentTarget.style.background = '#f8fafc'; }}
                            onMouseLeave={e => { e.currentTarget.style.background = selectedBkg?.id === b.id ? '#f0fdf4' : 'transparent'; }}>
                            <td style={{ padding: '0.875rem', fontFamily: 'monospace', fontWeight: 700, color: '#059669', fontSize: '0.8rem' }}>{b.bookingRef}</td>
                            <td style={{ padding: '0.875rem' }}>
                              <div style={{ fontWeight: 700, color: '#0f172a' }}>{b.name}</div>
                              <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>{b.cnic}</div>
                            </td>
                            <td style={{ padding: '0.875rem', fontWeight: 700, color: '#1a6b3c', fontFamily: 'monospace' }}>{b.plotNumber}</td>
                            <td style={{ padding: '0.875rem', fontSize: '0.8rem', color: '#374151' }}>{b.dealerName || '—'}</td>
                            <td style={{ padding: '0.875rem', fontWeight: 700 }}>{fmt(b.plotPrice)}</td>
                            <td style={{ padding: '0.875rem' }}>
                              {b.dealerId && b.commissionAmount > 0 ? (
                                <div>
                                  <div style={{ fontWeight: 800, color: '#059669', fontSize: '0.82rem' }}>{fmt(b.commissionAmount)}</div>
                                  <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>{b.commissionPct}%</div>
                                </div>
                              ) : <span style={{ color: '#e5e7eb', fontSize: '0.8rem' }}>—</span>}
                            </td>
                            <td style={{ padding: '0.875rem', fontSize: '0.78rem', color: '#64748b' }}>{new Date(b.createdAt).toLocaleDateString('en-PK', { month: 'short', day: 'numeric', year: 'numeric' })}</td>
                            <td style={{ padding: '0.875rem' }}>
                              <span style={{ background: b.status === 'pending' ? '#fef3c7' : b.status === 'confirmed' ? '#d1fae5' : '#fee2e2', color: b.status === 'pending' ? '#92400e' : b.status === 'confirmed' ? '#065f46' : '#dc2626', borderRadius: 9999, padding: '0.2rem 0.5rem', fontSize: '0.72rem', fontWeight: 700, textTransform: 'capitalize' }}>{b.status}</span>
                            </td>
                            <td style={{ padding: '0.875rem' }}>
                              <div style={{ display: 'flex', gap: '0.375rem' }} onClick={e => e.stopPropagation()}>
                                {b.status === 'pending' && (<>
                                  <button onClick={async () => { setBkgMsg(''); const res = await fetch(`/api/admin/bookings/${b.id}/approve`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ approvedBy: 'Admin' }) }); if (res.ok) { const data = await res.json(); setBkgMsg('✅ Booking approved.'); setSelectedBkg(null); loadBookings(); } else setBkgMsg('❌ Failed.'); }} style={{ padding: '0.3rem 0.55rem', background: '#d1fae5', border: 'none', borderRadius: 7, cursor: 'pointer', fontSize: '0.72rem', fontWeight: 700, color: '#065f46' }}>✓</button>
                                  <button onClick={() => { setRejectBkg(b); setRejectReason(''); }} style={{ padding: '0.3rem 0.55rem', background: '#fee2e2', border: 'none', borderRadius: 7, cursor: 'pointer', fontSize: '0.72rem', fontWeight: 700, color: '#dc2626' }}>✕</button>
                                </>)}
                                {b.status === 'confirmed' && (
                                  <button onClick={() => setShowReceipt(b)} style={{ padding: '0.3rem 0.55rem', background: '#eff6ff', border: 'none', borderRadius: 7, cursor: 'pointer', fontSize: '0.72rem', fontWeight: 700, color: '#1d4ed8' }}>🖨️</button>
                                )}
                                <button onClick={() => setDeleteBkg(b)} style={{ padding: '0.3rem 0.55rem', background: '#fef2f2', border: 'none', borderRadius: 7, cursor: 'pointer', fontSize: '0.72rem', fontWeight: 700, color: '#b91c1c' }} title="Delete booking">🗑️</button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {selectedBkg && (
                <div style={{ background: '#fff', borderRadius: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.06)', border: '1px solid #e2e8f0', position: 'sticky', top: 20, overflow: 'hidden', maxHeight: '90vh', overflowY: 'auto' }}>
                  <div style={{ background: 'linear-gradient(135deg, #1a6b3c, #059669)', color: '#fff', padding: '1.25rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', opacity: 0.75, marginBottom: '0.2rem' }}>Booking Details</div>
                      <div style={{ fontWeight: 800, fontSize: '1.05rem' }}>{selectedBkg.bookingRef}</div>
                    </div>
                    <button onClick={() => setSelectedBkg(null)} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', borderRadius: 8, width: 30, height: 30, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
                  </div>
                  <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    {selectedBkg.photo && (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                        <img src={selectedBkg.photo} alt="Buyer" style={{ width: 90, height: 110, objectFit: 'cover', borderRadius: 8, border: '2px solid #e5e7eb' }} />
                        <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>Buyer Photo</div>
                      </div>
                    )}
                    <div style={{ background: '#f0fdf4', borderRadius: 10, padding: '0.875rem 1rem' }}>
                      <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#065f46', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.375rem' }}>Plot</div>
                      <div style={{ fontWeight: 800, fontSize: '1.1rem', color: '#0f172a' }}>{selectedBkg.plotNumber}</div>
                      <div style={{ fontSize: '0.8rem', color: '#374151' }}>{selectedBkg.plotSize} · {selectedBkg.area} · {fmt(selectedBkg.plotPrice)}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.625rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.4rem' }}>Buyer Information</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                        {[
                          ['Name', selectedBkg.name],
                          ['Father Name', selectedBkg.fatherName || '—'],
                          ['CNIC', selectedBkg.cnic],
                          ['Phone', selectedBkg.phone],
                          ['Email', selectedBkg.email || '—'],
                          ['Residential Address', selectedBkg.residentialAddress || selectedBkg.address || '—'],
                          ['Postal Address', selectedBkg.postalAddress || '—'],
                        ].map(([label, value]) => (
                          <div key={label} style={{ display: 'flex', gap: '0.5rem', fontSize: '0.82rem' }}>
                            <span style={{ color: '#64748b', minWidth: 115, flexShrink: 0, fontWeight: 600 }}>{label}:</span>
                            <span style={{ color: '#0f172a', fontWeight: 600 }}>{value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    {selectedBkg.nominee && (
                      <div>
                        <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.625rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.4rem' }}>Nominee Information</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                          {[
                            ['Name', selectedBkg.nominee.name],
                            ['Father Name', selectedBkg.nominee.fatherName],
                            ['CNIC', selectedBkg.nominee.cnic],
                            ['Relation', selectedBkg.nominee.relation],
                            ['Phone', selectedBkg.nominee.phone],
                            ['Address', selectedBkg.nominee.address],
                          ].map(([label, value]) => (
                            <div key={label} style={{ display: 'flex', gap: '0.5rem', fontSize: '0.82rem' }}>
                              <span style={{ color: '#64748b', minWidth: 115, flexShrink: 0, fontWeight: 600 }}>{label}:</span>
                              <span style={{ color: '#0f172a', fontWeight: 600 }}>{value || '—'}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {selectedBkg.status === 'pending' && (
                      <div style={{ display: 'flex', gap: '0.75rem' }}>
                        <button onClick={async () => { setBkgMsg(''); const res = await fetch(`/api/admin/bookings/${selectedBkg.id}/approve`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ approvedBy: 'Admin' }) }); if (res.ok) { const data = await res.json(); setBkgMsg('✅ Booking approved.'); setSelectedBkg(null); loadBookings(); } else setBkgMsg('❌ Failed.'); }} className="btn btn-primary" style={{ flex: 1, justifyContent: 'center', background: '#059669', borderColor: 'transparent' }}>✓ Approve</button>
                        <button onClick={() => { setRejectBkg(selectedBkg); setRejectReason(''); }} className="btn btn-outline" style={{ flex: 1, justifyContent: 'center', color: '#dc2626', borderColor: '#dc2626' }}>✕ Reject</button>
                      </div>
                    )}
                    {selectedBkg.status === 'confirmed' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        <div style={{ background: '#d1fae5', border: '1px solid #6ee7b733', borderRadius: 10, padding: '0.75rem 1rem', textAlign: 'center', fontWeight: 700, color: '#065f46' }}>
                          ✅ Approved
                          {selectedBkg.approvedBy && <div style={{ fontSize: '0.75rem', fontWeight: 400, marginTop: '0.2rem' }}>by {selectedBkg.approvedBy}</div>}
                        </div>
                        <button onClick={() => setShowReceipt(selectedBkg)} style={{ background: 'linear-gradient(135deg, #1d4ed8, #2563eb)', color: '#fff', border: 'none', borderRadius: 10, padding: '0.7rem 1rem', fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>🖨️ Print Receipt</button>
                      </div>
                    )}
                    {selectedBkg.status === 'rejected' && (
                      <div style={{ background: '#fee2e2', border: '1px solid #fca5a533', borderRadius: 10, padding: '0.75rem 1rem', textAlign: 'center', fontWeight: 700, color: '#dc2626' }}>
                        ❌ Rejected
                        {selectedBkg.rejectionReason && <div style={{ fontSize: '0.75rem', fontWeight: 400, marginTop: '0.2rem' }}>Reason: {selectedBkg.rejectionReason}</div>}
                      </div>
                    )}

                    {/* Payment Ledger (confirmed bookings) */}
                    {selectedBkg.status === 'confirmed' && (
                      <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '1rem' }}>
                        <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span>💳 Payment Ledger</span>
                          {adminLedger?.summary && (
                            <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap' }}>
                              {adminLedger.summary.totalOverdue > 0 && <span style={{ background: '#fee2e2', color: '#dc2626', borderRadius: 6, padding: '0.15rem 0.4rem', fontSize: '0.68rem', fontWeight: 700 }}>⚠ Overdue</span>}
                              <span style={{ background: '#d1fae5', color: '#065f46', borderRadius: 6, padding: '0.15rem 0.4rem', fontSize: '0.68rem', fontWeight: 700 }}>✓ PKR {(adminLedger.summary.totalPaid/1000).toFixed(0)}K paid</span>
                            </div>
                          )}
                        </div>
                        {adminLedgerLoading ? (
                          <div style={{ textAlign: 'center', padding: '1rem', color: '#94a3b8', fontSize: '0.82rem' }}>Loading ledger...</div>
                        ) : adminLedger?.ledger?.length > 0 ? (
                          <div style={{ maxHeight: 320, overflowY: 'auto', border: '1px solid #f1f5f9', borderRadius: 10, fontSize: '0.78rem' }}>
                            {adminLedger.ledger.map((item, i) => {
                              const s = STATUS_STYLE_ADMIN[item.status] || STATUS_STYLE_ADMIN.pending;
                              return (
                                <div key={item.id} style={{ padding: '0.6rem 0.875rem', borderBottom: i < adminLedger.ledger.length - 1 ? '1px solid #f8fafc' : 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem', background: item.status === 'overdue' ? '#fef9f9' : i % 2 === 0 ? '#fff' : '#f9fafb' }}>
                                  <div style={{ minWidth: 0 }}>
                                    <div style={{ fontWeight: 600, color: '#374151', whiteSpace: 'nowrap' }}>{TYPE_ICON_ADMIN[item.type]} {item.label}</div>
                                    <div style={{ color: '#94a3b8', fontSize: '0.7rem' }}>Due {fmtDateAdmin(item.dueDate)}{item.paidDate ? ` · Paid ${fmtDateAdmin(item.paidDate)}` : ''}</div>
                                  </div>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
                                    <span style={{ fontWeight: 700, color: '#0f172a' }}>PKR {(item.amount/1000).toFixed(0)}K</span>
                                    <span style={{ background: s.bg, color: s.color, borderRadius: 9999, padding: '0.15rem 0.4rem', fontSize: '0.65rem', fontWeight: 700 }}>{s.label}</span>
                                    {item.status !== 'paid' && (
                                      <button onClick={() => { setAdminPayItem(item); setAdminPayAmount(String(item.amount)); setAdminPayDate(new Date().toISOString().split('T')[0]); setAdminPayNotes(''); setAdminPayError(''); }} style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#059669', borderRadius: 6, padding: '0.2rem 0.4rem', fontSize: '0.65rem', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>Pay</button>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div style={{ textAlign: 'center', padding: '1rem', color: '#94a3b8', fontSize: '0.82rem' }}>No ledger data</div>
                        )}
                      </div>
                    )}

                    <button onClick={() => setDeleteBkg(selectedBkg)} style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', borderRadius: 10, padding: '0.65rem 1rem', fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', width: '100%' }}>🗑️ Delete Booking</button>
                  </div>
                </div>
              )}
            </div>

            {deleteBkg && (
              <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 5100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
                <div style={{ background: '#fff', borderRadius: 16, padding: '2rem', maxWidth: 440, width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                    <div style={{ width: 42, height: 42, borderRadius: 10, background: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem', flexShrink: 0 }}>🗑️</div>
                    <h3 style={{ fontWeight: 800, color: '#0f172a', margin: 0 }}>Delete Booking</h3>
                  </div>
                  <p style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '0.5rem', lineHeight: 1.6 }}>
                    You are about to permanently delete booking <strong style={{ color: '#0f172a' }}>{deleteBkg.bookingRef}</strong> for <strong style={{ color: '#0f172a' }}>{deleteBkg.name}</strong>.
                  </p>
                  <p style={{ fontSize: '0.8rem', color: '#b45309', background: '#fef3c7', borderRadius: 8, padding: '0.6rem 0.875rem', marginBottom: '1.5rem' }}>
                    ⚠️ Plot <strong>{deleteBkg.plotNumber}</strong> will be released back to available.
                  </p>
                  <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <button onClick={() => handleDeleteBkg(deleteBkg)} style={{ flex: 1, background: '#dc2626', color: '#fff', border: 'none', borderRadius: 10, padding: '0.7rem 1rem', fontWeight: 700, cursor: 'pointer', fontSize: '0.875rem' }}>Yes, Delete</button>
                    <button onClick={() => setDeleteBkg(null)} style={{ flex: 1, background: '#f1f5f9', color: '#374151', border: 'none', borderRadius: 10, padding: '0.7rem 1rem', fontWeight: 700, cursor: 'pointer', fontSize: '0.875rem' }}>Cancel</button>
                  </div>
                </div>
              </div>
            )}

            {rejectBkg && (
              <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 5000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
                <div style={{ background: '#fff', borderRadius: 16, padding: '2rem', maxWidth: 480, width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
                  <h3 style={{ marginBottom: '1rem', color: '#dc2626' }}>Reject Booking</h3>
                  <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '1rem' }}>Provide a reason for rejecting <strong>{rejectBkg.bookingRef}</strong>:</p>
                  <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} placeholder="Enter rejection reason..." rows={3} style={{ width: '100%', padding: '0.75rem', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: '0.85rem', resize: 'vertical', boxSizing: 'border-box' }} />
                  <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem' }}>
                    <button onClick={async () => { const res = await fetch(`/api/admin/bookings/${rejectBkg.id}/reject`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reason: rejectReason, rejectedBy: 'Admin' }) }); if (res.ok) { setBkgMsg('✅ Booking rejected.'); setRejectBkg(null); setRejectReason(''); setSelectedBkg(null); loadBookings(); } else setBkgMsg('❌ Failed.'); }} className="btn btn-primary" style={{ flex: 1, justifyContent: 'center', background: '#dc2626', borderColor: 'transparent' }}>Confirm Reject</button>
                    <button onClick={() => setRejectBkg(null)} className="btn btn-outline" style={{ flex: 1, justifyContent: 'center' }}>Cancel</button>
                  </div>
                </div>
              </div>
            )}
            {showReceipt && <BookingReceipt booking={showReceipt} onClose={() => setShowReceipt(null)} />}

            {/* Admin Pay Modal */}
            {adminPayItem && (
              <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 5200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
                <div style={{ background: '#fff', borderRadius: 18, padding: '2rem', maxWidth: 420, width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                    <div>
                      <h3 style={{ fontWeight: 800, color: '#0f172a', margin: 0, fontSize: '1rem' }}>Record Payment</h3>
                      <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '0.2rem' }}>{adminPayItem.label} · Due {adminPayItem.dueDate}</div>
                    </div>
                    <button onClick={() => setAdminPayItem(null)} style={{ background: '#f1f5f9', border: 'none', borderRadius: 8, width: 30, height: 30, cursor: 'pointer' }}>✕</button>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#374151', marginBottom: '0.35rem' }}>Amount (PKR)</label>
                      <input type="number" value={adminPayAmount} onChange={e => setAdminPayAmount(e.target.value)} style={{ width: '100%', padding: '0.65rem 0.875rem', border: '1.5px solid #e2e8f0', borderRadius: 9, fontSize: '0.9rem', fontWeight: 700, boxSizing: 'border-box' }} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#374151', marginBottom: '0.35rem' }}>Payment Date</label>
                      <input type="date" value={adminPayDate} onChange={e => setAdminPayDate(e.target.value)} style={{ width: '100%', padding: '0.65rem 0.875rem', border: '1.5px solid #e2e8f0', borderRadius: 9, fontSize: '0.88rem', boxSizing: 'border-box' }} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#374151', marginBottom: '0.35rem' }}>Notes (optional)</label>
                      <input type="text" value={adminPayNotes} onChange={e => setAdminPayNotes(e.target.value)} placeholder="e.g. Bank transfer..." style={{ width: '100%', padding: '0.65rem 0.875rem', border: '1.5px solid #e2e8f0', borderRadius: 9, fontSize: '0.85rem', boxSizing: 'border-box' }} />
                    </div>
                    {adminPayError && <div style={{ background: '#fef2f2', borderRadius: 8, padding: '0.6rem', color: '#dc2626', fontSize: '0.8rem' }}>{adminPayError}</div>}
                    <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.25rem' }}>
                      <button disabled={adminPaySaving} onClick={async () => {
                        setAdminPaySaving(true); setAdminPayError('');
                        const res = await fetch(`/api/ledger/${selectedBkg.id}/${adminPayItem.id}/pay`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` }, body: JSON.stringify({ paidAmount: Number(adminPayAmount), paidDate: adminPayDate, notes: adminPayNotes, paidBy: 'Admin' }) });
                        setAdminPaySaving(false);
                        if (res.ok) { setAdminPayItem(null); loadAdminLedger(selectedBkg.id); }
                        else { const d = await res.json(); setAdminPayError(d.error || 'Failed'); }
                      }} style={{ flex: 1, background: '#059669', color: '#fff', border: 'none', borderRadius: 9, padding: '0.7rem', fontWeight: 700, cursor: adminPaySaving ? 'not-allowed' : 'pointer', opacity: adminPaySaving ? 0.7 : 1 }}>
                        {adminPaySaving ? 'Saving...' : '✓ Mark as Paid'}
                      </button>
                      <button onClick={() => setAdminPayItem(null)} style={{ flex: 1, background: '#f1f5f9', color: '#374151', border: 'none', borderRadius: 9, padding: '0.7rem', fontWeight: 700, cursor: 'pointer' }}>Cancel</button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ─── PACKAGES TAB ─── */}
        {tab === 'Packages' && (
          <div style={{ display: 'grid', gridTemplateColumns: pkgEdit ? '1fr 420px' : '1fr', gap: '1.5rem', alignItems: 'start' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                <div>
                  <h3 style={{ fontWeight: 800, color: '#0f172a', marginBottom: '0.25rem' }}>Dealer Packages</h3>
                  <p style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Define plot quotas and rewards for each package tier</p>
                </div>
                <button className="btn btn-primary btn-sm" onClick={() => openPkgForm(null)}>+ New Package</button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.25rem' }}>
                {packages.map(pkg => (
                  <div key={pkg.id} style={{ background: '#fff', borderRadius: 16, padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', border: '1px solid #f1f5f9', position: 'relative', overflow: 'hidden' }}>
                    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, background: 'linear-gradient(90deg, #1a6b3c, #059669)' }} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                      <div>
                        <div style={{ fontWeight: 900, fontSize: '1.1rem', color: '#0f172a', marginBottom: '0.25rem' }}>{pkg.name}</div>
                        <div style={{ fontSize: '0.8rem', color: '#64748b' }}><strong style={{ color: '#1a6b3c', fontSize: '1.5rem', fontWeight: 900 }}>{pkg.totalPlots}</strong> total plots</div>
                      </div>
                      <div style={{ display: 'flex', gap: '0.375rem' }}>
                        <button onClick={() => openPkgForm(pkg)} style={{ padding: '0.35rem 0.625rem', background: '#f1f5f9', border: 'none', borderRadius: 7, cursor: 'pointer', fontSize: '0.75rem', fontWeight: 700, color: '#374151' }}>✏️</button>
                        <button onClick={() => handleDeletePkg(pkg.id)} style={{ padding: '0.35rem 0.625rem', background: '#fef2f2', border: 'none', borderRadius: 7, cursor: 'pointer', fontSize: '0.75rem', fontWeight: 700, color: '#dc2626' }}>🗑️</button>
                      </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '1rem' }}>
                      {pkg.sizes.map(s => (
                        <div key={s.size} style={{ background: '#f8fafc', borderRadius: 8, padding: '0.5rem 0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>{s.size}</span>
                          <span style={{ fontWeight: 800, color: '#0f172a' }}>{s.quota}</span>
                        </div>
                      ))}
                    </div>
                    <div style={{ background: '#f5f3ff', border: '1px solid #ddd6fe', borderRadius: 10, padding: '0.75rem 1rem' }}>
                      <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#7c3aed', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.375rem' }}>🎁 Reward</div>
                      <div style={{ fontSize: '0.85rem', color: '#4c1d95', fontWeight: 600, marginBottom: '0.25rem' }}>{pkg.rewardDescription || 'No reward set'}</div>
                      {pkg.rewardAmount > 0 && <div style={{ fontSize: '0.78rem', color: '#7c3aed', fontWeight: 700 }}>+ {fmt(pkg.rewardAmount)} cash bonus</div>}
                    </div>
                  </div>
                ))}
                {packages.length === 0 && <div style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8', gridColumn: '1/-1' }}>No packages yet. Create one to assign to dealers.</div>}
              </div>
            </div>

            {pkgEdit && (
              <div style={{ background: '#fff', borderRadius: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.06)', border: '1px solid #e2e8f0', position: 'sticky', top: 80, overflow: 'hidden' }}>
                <div style={{ background: 'linear-gradient(135deg, #1a6b3c, #145530)', color: '#fff', padding: '1.25rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontWeight: 800, fontSize: '1.05rem' }}>{pkgEdit === 'new' ? 'New Package' : 'Edit Package'}</div>
                  <button onClick={() => { setPkgEdit(null); setPkgMsg(''); }} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', borderRadius: 8, width: 30, height: 30, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
                </div>
                <form onSubmit={handleSavePkg} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.125rem' }}>
                  <div className="form-group">
                    <label>Package Name</label>
                    <input required value={pkgForm.name} onChange={e => setPkgForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Normal Package" />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#374151', marginBottom: '0.625rem' }}>Plot Quotas per Size</div>
                    {PLOT_SIZES.map(size => (
                      <div key={size} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem', background: '#f8fafc', borderRadius: 9, padding: '0.5rem 0.875rem', border: '1px solid #e2e8f0' }}>
                        <div style={{ flex: 1, fontSize: '0.875rem', fontWeight: 600, color: '#374151' }}>{size}</div>
                        <input type="number" min="0" value={pkgForm.sizes[size] ?? 0} onChange={e => setPkgForm(f => ({ ...f, sizes: { ...f.sizes, [size]: parseInt(e.target.value) || 0 } }))} style={{ width: 60, textAlign: 'center', padding: '0.25rem', border: '1.5px solid #e2e8f0', borderRadius: 7, fontWeight: 700, fontFamily: 'inherit', fontSize: '0.95rem' }} />
                      </div>
                    ))}
                    <div style={{ marginTop: '0.375rem', fontSize: '0.78rem', color: '#065f46', fontWeight: 600 }}>Total: {PLOT_SIZES.reduce((s, sz) => s + (parseInt(pkgForm.sizes[sz]) || 0), 0)} plots</div>
                  </div>
                  <div className="form-group">
                    <label>🎁 Reward Description</label>
                    <input value={pkgForm.rewardDescription} onChange={e => setPkgForm(f => ({ ...f, rewardDescription: e.target.value }))} placeholder="e.g. Umrah trip for 2 persons" />
                  </div>
                  <div className="form-group">
                    <label>💰 Reward Amount (PKR, optional)</label>
                    <input type="number" value={pkgForm.rewardAmount} onChange={e => setPkgForm(f => ({ ...f, rewardAmount: e.target.value }))} placeholder="e.g. 50000" />
                  </div>
                  <div className="form-group">
                    <label>💵 Default Commission %</label>
                    <input type="number" min="0" max="100" step="0.5" value={pkgForm.commissionPct} onChange={e => setPkgForm(f => ({ ...f, commissionPct: e.target.value }))} placeholder="e.g. 12" />
                    <div style={{ fontSize: '0.73rem', color: '#94a3b8', marginTop: '0.25rem' }}>% of plot price earned by dealers on each booking (can be overridden per dealer)</div>
                  </div>
                  {pkgMsg && <div className={pkgMsg.startsWith('✅') ? 'alert alert-success' : 'alert alert-error'} style={{ fontSize: '0.85rem' }}>{pkgMsg}</div>}
                  <button type="submit" className="btn btn-primary" disabled={pkgSaving} style={{ justifyContent: 'center', padding: '0.75rem' }}>
                    {pkgSaving ? <><div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }}></div> Saving...</> : '✓ Save Package'}
                  </button>
                </form>
              </div>
            )}
          </div>
        )}

        {/* ─── INVENTORY TAB ─── */}
        {tab === 'Inventory' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

            {/* ── View Toggle ── */}
            <div style={{ display: 'flex', gap: '0.375rem', background: '#fff', borderRadius: 12, padding: '0.3rem', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', border: '1px solid #f1f5f9', width: 'fit-content' }}>
              {[{ key: 'plots', label: '🏘️ Plots', count: plots.length }, { key: 'sectors', label: '🗺️ Sectors', count: sectors.length }].map(v => (
                <button key={v.key} onClick={() => { setInventoryView(v.key); setBulkMode(null); setPlotEdit(null); setSectorEdit(null); }} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 1.1rem', borderRadius: 9, border: 'none', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 700, background: inventoryView === v.key ? 'linear-gradient(135deg, #1a6b3c, #059669)' : 'transparent', color: inventoryView === v.key ? '#fff' : '#64748b', transition: 'all 0.15s' }}>
                  {v.label} <span style={{ background: inventoryView === v.key ? 'rgba(255,255,255,0.25)' : '#f1f5f9', color: inventoryView === v.key ? '#fff' : '#64748b', borderRadius: 9999, fontSize: '0.7rem', fontWeight: 800, padding: '0.05rem 0.45rem', minWidth: 18, textAlign: 'center' }}>{v.count}</span>
                </button>
              ))}
            </div>

            {/* ════ SECTORS VIEW ════ */}
            {inventoryView === 'sectors' && (
              <div style={{ display: 'grid', gridTemplateColumns: sectorEdit ? '1fr 360px' : '1fr', gap: '1.5rem', alignItems: 'start' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                    <div>
                      <h3 style={{ fontWeight: 800, color: '#0f172a', marginBottom: '0.25rem' }}>Sectors / Blocks</h3>
                      <p style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Define named zones — sectors are used as the "Area" when adding plots</p>
                    </div>
                    <button className="btn btn-primary btn-sm" onClick={() => openSectorForm(null)}>+ New Sector</button>
                  </div>

                  {sectors.length === 0 ? (
                    <div style={{ background: '#fff', borderRadius: 16, padding: '3rem', textAlign: 'center', color: '#94a3b8', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
                      <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>🗺️</div>
                      <div style={{ fontWeight: 600 }}>No sectors yet. Create one to organize your plot inventory.</div>
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.1rem' }}>
                      {sectors.map(s => (
                        <div key={s.id} style={{ background: '#fff', borderRadius: 16, padding: '1.25rem', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', border: `1.5px solid ${sectorEdit?.id === s.id ? '#86efac' : '#f1f5f9'}`, position: 'relative', overflow: 'hidden', transition: 'border-color 0.15s' }}>
                          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: s.type === 'commercial' ? 'linear-gradient(90deg, #f59e0b, #d97706)' : 'linear-gradient(90deg, #1a6b3c, #059669)', borderRadius: '16px 16px 0 0' }} />
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.875rem' }}>
                            <div>
                              <div style={{ fontWeight: 900, fontSize: '1.1rem', color: '#0f172a', marginBottom: '0.2rem' }}>{s.name}</div>
                              <span style={{ background: s.type === 'commercial' ? '#fffbeb' : '#f0fdf4', color: s.type === 'commercial' ? '#92400e' : '#065f46', border: `1px solid ${s.type === 'commercial' ? '#fcd34d' : '#bbf7d0'}`, borderRadius: 9999, padding: '0.1rem 0.5rem', fontSize: '0.7rem', fontWeight: 700, textTransform: 'capitalize' }}>{s.type}</span>
                            </div>
                            <div style={{ display: 'flex', gap: '0.35rem' }}>
                              <button onClick={() => openSectorForm(s)} style={{ padding: '0.3rem 0.55rem', background: '#f1f5f9', border: 'none', borderRadius: 7, cursor: 'pointer', fontSize: '0.75rem', fontWeight: 700 }}>✏️</button>
                              <button onClick={() => handleDeleteSector(s)} style={{ padding: '0.3rem 0.55rem', background: '#fef2f2', border: 'none', borderRadius: 7, cursor: 'pointer', fontSize: '0.75rem', fontWeight: 700, color: '#dc2626' }}>🗑️</button>
                            </div>
                          </div>
                          {s.description && <div style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '0.875rem', lineHeight: 1.5 }}>{s.description}</div>}
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.4rem' }}>
                            {[
                              { label: 'Total', value: s.totalPlots, bg: '#f8fafc', color: '#0f172a' },
                              { label: 'Available', value: s.availablePlots, bg: '#f0fdf4', color: '#059669' },
                              { label: 'Sold/Booked', value: (s.bookedPlots || 0) + (s.soldPlots || 0), bg: '#fef9f0', color: '#d97706' },
                            ].map(stat => (
                              <div key={stat.label} style={{ background: stat.bg, borderRadius: 8, padding: '0.4rem 0.5rem', textAlign: 'center' }}>
                                <div style={{ fontSize: '1.1rem', fontWeight: 900, color: stat.color }}>{stat.value}</div>
                                <div style={{ fontSize: '0.65rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{stat.label}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {sectorEdit && (
                  <div style={{ background: '#fff', borderRadius: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.06)', border: '1px solid #e2e8f0', position: 'sticky', top: 80, overflow: 'hidden' }}>
                    <div style={{ background: 'linear-gradient(135deg, #1a6b3c, #145530)', color: '#fff', padding: '1.25rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ fontWeight: 800, fontSize: '1.05rem' }}>{sectorEdit === 'new' ? 'New Sector' : `Edit ${sectorEdit.name}`}</div>
                      <button onClick={() => { setSectorEdit(null); setSectorMsg(''); }} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', borderRadius: 8, width: 30, height: 30, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
                    </div>
                    <form onSubmit={handleSaveSector} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      <div className="form-group">
                        <label>Sector Name *</label>
                        <input required value={sectorForm.name} onChange={e => setSectorForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Block E, Sector F, Commercial Zone" />
                      </div>
                      <div className="form-group">
                        <label>Type</label>
                        <select value={sectorForm.type} onChange={e => setSectorForm(f => ({ ...f, type: e.target.value }))} style={{ width: '100%', padding: '0.6rem 0.75rem', border: '1.5px solid #e2e8f0', borderRadius: 9, fontFamily: 'inherit', fontSize: '0.9rem' }}>
                          <option value="residential">Residential</option>
                          <option value="commercial">Commercial</option>
                          <option value="mixed">Mixed Use</option>
                        </select>
                      </div>
                      <div className="form-group">
                        <label>Description</label>
                        <textarea value={sectorForm.description} onChange={e => setSectorForm(f => ({ ...f, description: e.target.value }))} placeholder="Brief description of this sector..." rows={3} style={{ width: '100%', padding: '0.6rem 0.75rem', border: '1.5px solid #e2e8f0', borderRadius: 9, fontFamily: 'inherit', fontSize: '0.9rem', resize: 'vertical' }} />
                      </div>
                      {sectorEdit !== 'new' && (
                        <div style={{ background: '#fef9f0', border: '1px solid #fcd34d', borderRadius: 9, padding: '0.625rem 0.875rem', fontSize: '0.8rem', color: '#92400e' }}>
                          ⚠️ Renaming a sector will automatically update the area on all its existing plots.
                        </div>
                      )}
                      {sectorMsg && <div className={sectorMsg.startsWith('✅') ? 'alert alert-success' : 'alert alert-error'} style={{ fontSize: '0.85rem' }}>{sectorMsg}</div>}
                      <button type="submit" className="btn btn-primary" disabled={sectorSaving} style={{ justifyContent: 'center', padding: '0.75rem' }}>
                        {sectorSaving ? <><div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }}></div> Saving...</> : '✓ Save Sector'}
                      </button>
                    </form>
                  </div>
                )}
              </div>
            )}

            {/* ════ PLOTS VIEW ════ */}
            {inventoryView === 'plots' && <>

            {/* ── Bulk Manual Add Panel ── */}
            {bulkMode === 'manual' && (
              <div style={{ background: '#fff', borderRadius: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.06)', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                <div style={{ background: 'linear-gradient(135deg, #7c3aed, #6d28d9)', color: '#fff', padding: '1.1rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '1.05rem' }}>Bulk Add Plots</div>
                    <div style={{ fontSize: '0.75rem', opacity: 0.8, marginTop: '0.1rem' }}>Fill in each row — Number, Area and Price are required</div>
                  </div>
                  <button onClick={() => { setBulkMode(null); setBulkMsg(''); setBulkRows([emptyBulkRow()]); }} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', borderRadius: 8, width: 30, height: 30, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem' }}>✕</button>
                </div>
                <div style={{ padding: '1.5rem' }}>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', minWidth: 820 }}>
                      <thead>
                        <tr style={{ borderBottom: '2px solid #f1f5f9' }}>
                          {['#', 'Plot Number *', 'Area / Block *', 'Size', 'Price (PKR) *', 'Category', 'Status', 'Description', ''].map(h => (
                            <th key={h} style={{ padding: '0.5rem 0.6rem', textAlign: 'left', fontSize: '0.68rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {bulkRows.map((row, idx) => (
                          <tr key={idx} style={{ borderBottom: '1px solid #f8fafc' }}>
                            <td style={{ padding: '0.4rem 0.6rem', color: '#94a3b8', fontWeight: 700, fontSize: '0.75rem' }}>{idx + 1}</td>
                            <td style={{ padding: '0.3rem 0.4rem' }}><input value={row.number} onChange={e => updateBulkRow(idx, 'number', e.target.value)} placeholder="e.g. E-501" style={{ width: 90, padding: '0.35rem 0.5rem', border: '1.5px solid #e2e8f0', borderRadius: 7, fontFamily: 'inherit', fontSize: '0.82rem' }} /></td>
                            <td style={{ padding: '0.3rem 0.4rem' }}>
                              {sectors.length > 0 ? (
                                <select value={row.area} onChange={e => updateBulkRow(idx, 'area', e.target.value)} style={{ padding: '0.35rem 0.5rem', border: '1.5px solid #e2e8f0', borderRadius: 7, fontFamily: 'inherit', fontSize: '0.82rem' }}>
                                  <option value="">— Select —</option>
                                  {sectors.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                                </select>
                              ) : (
                                <input value={row.area} onChange={e => updateBulkRow(idx, 'area', e.target.value)} placeholder="Block E" style={{ width: 90, padding: '0.35rem 0.5rem', border: '1.5px solid #e2e8f0', borderRadius: 7, fontFamily: 'inherit', fontSize: '0.82rem' }} />
                              )}
                            </td>
                            <td style={{ padding: '0.3rem 0.4rem' }}>
                              <select value={row.size} onChange={e => updateBulkRow(idx, 'size', e.target.value)} style={{ padding: '0.35rem 0.5rem', border: '1.5px solid #e2e8f0', borderRadius: 7, fontFamily: 'inherit', fontSize: '0.82rem' }}>
                                {ALL_SIZES.map(s => <option key={s} value={s}>{s}</option>)}
                              </select>
                            </td>
                            <td style={{ padding: '0.3rem 0.4rem' }}><input type="number" value={row.price} onChange={e => updateBulkRow(idx, 'price', e.target.value)} placeholder="2500000" style={{ width: 110, padding: '0.35rem 0.5rem', border: '1.5px solid #e2e8f0', borderRadius: 7, fontFamily: 'inherit', fontSize: '0.82rem' }} /></td>
                            <td style={{ padding: '0.3rem 0.4rem' }}>
                              <select value={row.category} onChange={e => updateBulkRow(idx, 'category', e.target.value)} style={{ padding: '0.35rem 0.5rem', border: '1.5px solid #e2e8f0', borderRadius: 7, fontFamily: 'inherit', fontSize: '0.82rem' }}>
                                <option value="residential">Residential</option>
                                <option value="commercial">Commercial</option>
                              </select>
                            </td>
                            <td style={{ padding: '0.3rem 0.4rem' }}>
                              <select value={row.status} onChange={e => updateBulkRow(idx, 'status', e.target.value)} style={{ padding: '0.35rem 0.5rem', border: '1.5px solid #e2e8f0', borderRadius: 7, fontFamily: 'inherit', fontSize: '0.82rem' }}>
                                <option value="available">Available</option>
                                <option value="booked">Booked</option>
                                <option value="sold">Sold</option>
                              </select>
                            </td>
                            <td style={{ padding: '0.3rem 0.4rem' }}><input value={row.description} onChange={e => updateBulkRow(idx, 'description', e.target.value)} placeholder="Optional" style={{ width: 130, padding: '0.35rem 0.5rem', border: '1.5px solid #e2e8f0', borderRadius: 7, fontFamily: 'inherit', fontSize: '0.82rem' }} /></td>
                            <td style={{ padding: '0.3rem 0.4rem' }}>
                              {bulkRows.length > 1 && <button onClick={() => removeBulkRow(idx)} style={{ padding: '0.3rem 0.5rem', background: '#fef2f2', border: 'none', borderRadius: 6, cursor: 'pointer', color: '#dc2626', fontWeight: 700, fontSize: '0.75rem' }}>✕</button>}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '1rem', flexWrap: 'wrap' }}>
                    <button onClick={addBulkRow} style={{ padding: '0.45rem 1rem', background: '#f8fafc', border: '1.5px dashed #cbd5e1', borderRadius: 8, cursor: 'pointer', fontSize: '0.82rem', fontWeight: 700, color: '#475569' }}>+ Add Row</button>
                    <button onClick={handleBulkSubmit} disabled={bulkSaving} className="btn btn-primary btn-sm" style={{ background: 'linear-gradient(135deg, #7c3aed, #6d28d9)' }}>
                      {bulkSaving ? <><div className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }}></div> Saving...</> : `✓ Import ${bulkRows.filter(r => r.number.trim() && r.area.trim() && r.price).length} Plot(s)`}
                    </button>
                    {bulkMsg && <span style={{ fontSize: '0.82rem', fontWeight: 600, color: bulkMsg.startsWith('✅') ? '#065f46' : '#b91c1c' }}>{bulkMsg}</span>}
                  </div>
                </div>
              </div>
            )}

            {/* ── Excel Import Panel ── */}
            {bulkMode === 'import' && (
              <div style={{ background: '#fff', borderRadius: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.06)', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                <div style={{ background: 'linear-gradient(135deg, #0ea5e9, #0369a1)', color: '#fff', padding: '1.1rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '1.05rem' }}>Import from Excel / CSV</div>
                    <div style={{ fontSize: '0.75rem', opacity: 0.8, marginTop: '0.1rem' }}>Upload a .xlsx or .csv file — download the template for the correct format</div>
                  </div>
                  <button onClick={() => { setBulkMode(null); setImportRows([]); setImportMsg(''); }} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', borderRadius: 8, width: 30, height: 30, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem' }}>✕</button>
                </div>
                <div style={{ padding: '1.5rem' }}>
                  <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
                    <button onClick={downloadTemplate} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 1rem', background: '#f0fdf4', border: '1.5px solid #bbf7d0', borderRadius: 9, cursor: 'pointer', fontSize: '0.82rem', fontWeight: 700, color: '#065f46' }}>
                      ⬇️ Download Template
                    </button>
                    <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleFileChange} style={{ display: 'none' }} />
                    <button onClick={() => fileInputRef.current?.click()} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 1rem', background: '#eff6ff', border: '1.5px solid #bfdbfe', borderRadius: 9, cursor: 'pointer', fontSize: '0.82rem', fontWeight: 700, color: '#1d4ed8' }}>
                      📂 Choose File (.xlsx / .csv)
                    </button>
                  </div>

                  {importMsg && (
                    <div style={{ marginBottom: '1rem', padding: '0.6rem 1rem', borderRadius: 9, background: importMsg.startsWith('❌') ? '#fef2f2' : '#f0f9ff', border: `1px solid ${importMsg.startsWith('❌') ? '#fecaca' : '#bae6fd'}`, fontSize: '0.85rem', fontWeight: 600, color: importMsg.startsWith('❌') ? '#b91c1c' : '#0369a1' }}>
                      {importMsg}
                    </div>
                  )}

                  {importRows.length > 0 && (
                    <>
                      <div style={{ overflowX: 'auto', marginBottom: '1rem', maxHeight: 320, overflowY: 'auto', border: '1px solid #f1f5f9', borderRadius: 10 }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', minWidth: 700 }}>
                          <thead style={{ position: 'sticky', top: 0, background: '#f8fafc', zIndex: 1 }}>
                            <tr style={{ borderBottom: '2px solid #e2e8f0' }}>
                              {['Plot Number', 'Area', 'Size', 'Price (PKR)', 'Category', 'Status', 'Description'].map(h => (
                                <th key={h} style={{ padding: '0.5rem 0.75rem', textAlign: 'left', fontSize: '0.68rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {importRows.map((r, i) => (
                              <tr key={i} style={{ borderBottom: '1px solid #f8fafc' }}
                                onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                <td style={{ padding: '0.5rem 0.75rem', fontWeight: 700, color: '#1a6b3c', fontFamily: 'monospace' }}>{r.number || <span style={{ color: '#ef4444' }}>—</span>}</td>
                                <td style={{ padding: '0.5rem 0.75rem', color: '#374151' }}>{r.area || <span style={{ color: '#ef4444' }}>—</span>}</td>
                                <td style={{ padding: '0.5rem 0.75rem', color: '#374151' }}>{r.size}</td>
                                <td style={{ padding: '0.5rem 0.75rem', fontWeight: 700 }}>
                                  {r.price ? (
                                    <div>
                                      <span>{fmt(r.price)}</span>
                                      {r.priceAdjusted && (
                                        <div style={{ display: 'flex', gap: '0.3rem', alignItems: 'center', marginTop: '0.15rem' }}>
                                          <span style={{ fontSize: '0.65rem', color: '#94a3b8', textDecoration: 'line-through' }}>{fmt(r.basePrice)}</span>
                                          <span style={{ background: '#fef3c7', color: '#92400e', borderRadius: 5, padding: '0.1rem 0.35rem', fontSize: '0.65rem', fontWeight: 800 }}>+{Math.round((r.priceMultiplier - 1) * 100)}%</span>
                                        </div>
                                      )}
                                    </div>
                                  ) : <span style={{ color: '#ef4444' }}>—</span>}
                                </td>
                                <td style={{ padding: '0.5rem 0.75rem', color: '#64748b', textTransform: 'capitalize' }}>{r.category}</td>
                                <td style={{ padding: '0.5rem 0.75rem' }}><span style={{ background: r.status === 'available' ? '#d1fae5' : r.status === 'booked' ? '#fef3c7' : '#fee2e2', color: statusColor[r.status] || '#374151', borderRadius: 9999, padding: '0.15rem 0.5rem', fontSize: '0.7rem', fontWeight: 700, textTransform: 'capitalize' }}>{r.status}</span></td>
                                <td style={{ padding: '0.5rem 0.75rem', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {r.priceAdjusted
                                    ? <span style={{ background: '#fef3c7', color: '#92400e', borderRadius: 6, padding: '0.15rem 0.5rem', fontSize: '0.72rem', fontWeight: 700 }}>{r.description}</span>
                                    : <span style={{ color: '#64748b' }}>{r.description || '—'}</span>}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
                        <button onClick={handleImportSubmit} disabled={importSaving} className="btn btn-primary btn-sm" style={{ background: 'linear-gradient(135deg, #0ea5e9, #0369a1)' }}>
                          {importSaving ? <><div className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }}></div> Importing...</> : `✓ Import ${importRows.length} Plot(s)`}
                        </button>
                        <button onClick={() => { setImportRows([]); setImportMsg(''); }} style={{ padding: '0.45rem 0.875rem', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600, color: '#64748b' }}>Clear</button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* ── Plots Table ── */}
            <div style={{ display: 'grid', gridTemplateColumns: plotEdit ? '1fr 380px' : '1fr', gap: '1.5rem', alignItems: 'start' }}>
              <div style={{ background: '#fff', borderRadius: 16, padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', border: '1px solid #f1f5f9' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                  <div>
                    <h3 style={{ fontWeight: 800, color: '#0f172a', marginBottom: '0.25rem' }}>Plot Inventory</h3>
                    <p style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{plots.length} plots total — add, edit, or remove plots</p>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <button onClick={() => { setBulkMode(bulkMode === 'import' ? null : 'import'); setImportRows([]); setImportMsg(''); setPlotEdit(null); }} className="btn btn-sm" style={{ background: bulkMode === 'import' ? '#eff6ff' : '#f8fafc', border: `1.5px solid ${bulkMode === 'import' ? '#bfdbfe' : '#e2e8f0'}`, color: bulkMode === 'import' ? '#1d4ed8' : '#374151', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.35rem', padding: '0.45rem 0.875rem', borderRadius: 9, cursor: 'pointer', fontSize: '0.8rem' }}>
                      📊 Import Excel
                    </button>
                    <button onClick={() => { setBulkMode(bulkMode === 'manual' ? null : 'manual'); setBulkMsg(''); setBulkRows([emptyBulkRow()]); setPlotEdit(null); }} className="btn btn-sm" style={{ background: bulkMode === 'manual' ? '#f5f3ff' : '#f8fafc', border: `1.5px solid ${bulkMode === 'manual' ? '#ddd6fe' : '#e2e8f0'}`, color: bulkMode === 'manual' ? '#7c3aed' : '#374151', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.35rem', padding: '0.45rem 0.875rem', borderRadius: 9, cursor: 'pointer', fontSize: '0.8rem' }}>
                      📋 Bulk Add
                    </button>
                    <button className="btn btn-primary btn-sm" onClick={() => { openPlotForm(null); setBulkMode(null); }}>+ Add Plot</button>
                  </div>
                </div>
                {plotsLoading ? <div className="loading"><div className="spinner"></div>Loading...</div> : (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                      <thead>
                        <tr style={{ borderBottom: '2px solid #f1f5f9' }}>
                          {['Plot', 'Area', 'Size', 'Category', 'Base Price', 'Premium Tags', 'Effective Price', 'Status', ''].map(h => (
                            <th key={h} style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.7rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {plots.map(p => {
                          const ep = p.effectivePrice || effectivePrice(p.price, p.tags);
                          const hasPremium = p.tags && p.tags.length > 0;
                          return (
                          <tr key={p.id} style={{ borderBottom: '1px solid #f8fafc' }}
                            onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                            <td style={{ padding: '0.875rem', fontWeight: 700, color: '#1a6b3c', fontFamily: 'monospace' }}>{p.number}</td>
                            <td style={{ padding: '0.875rem', color: '#374151' }}>{p.area}</td>
                            <td style={{ padding: '0.875rem', color: '#374151' }}>{p.size}</td>
                            <td style={{ padding: '0.875rem', color: '#64748b', textTransform: 'capitalize', fontSize: '0.8rem' }}>{p.category}</td>
                            <td style={{ padding: '0.875rem', color: hasPremium ? '#94a3b8' : '#0f172a', fontWeight: hasPremium ? 500 : 700, textDecoration: hasPremium ? 'line-through' : 'none', fontSize: '0.82rem' }}>{fmt(p.price)}</td>
                            <td style={{ padding: '0.875rem' }}>
                              {hasPremium ? (
                                <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
                                  {p.tags.map(tag => (
                                    <span key={tag} style={{ background: tag === 'Main Boulevard' ? '#fef3c7' : '#e0f2fe', color: tag === 'Main Boulevard' ? '#92400e' : '#075985', borderRadius: 6, padding: '0.15rem 0.45rem', fontSize: '0.65rem', fontWeight: 700, whiteSpace: 'nowrap' }}>
                                      {tag} +{TAG_PREMIUMS[tag]}%
                                    </span>
                                  ))}
                                </div>
                              ) : <span style={{ color: '#cbd5e1', fontSize: '0.75rem' }}>—</span>}
                            </td>
                            <td style={{ padding: '0.875rem', fontWeight: 800, color: hasPremium ? '#b45309' : '#0f172a' }}>
                              {fmt(ep)}
                              {hasPremium && <div style={{ fontSize: '0.65rem', color: '#b45309', fontWeight: 600 }}>+{p.tags.reduce((s, t) => s + (TAG_PREMIUMS[t] || 0), 0)}% premium</div>}
                            </td>
                            <td style={{ padding: '0.875rem' }}>
                              <span style={{ background: p.status === 'available' ? '#d1fae5' : p.status === 'booked' ? '#fef3c7' : '#fee2e2', color: statusColor[p.status], borderRadius: 9999, padding: '0.2rem 0.5rem', fontSize: '0.72rem', fontWeight: 700, textTransform: 'capitalize' }}>{p.status}</span>
                            </td>
                            <td style={{ padding: '0.875rem' }}>
                              <div style={{ display: 'flex', gap: '0.4rem' }}>
                                <button onClick={() => { openPlotForm(p); setBulkMode(null); }} style={{ padding: '0.3rem 0.6rem', background: '#f1f5f9', border: 'none', borderRadius: 7, cursor: 'pointer', fontSize: '0.75rem', fontWeight: 700 }}>✏️</button>
                                <button onClick={() => handleDeletePlot(p)} style={{ padding: '0.3rem 0.6rem', background: '#fef2f2', border: 'none', borderRadius: 7, cursor: 'pointer', fontSize: '0.75rem', fontWeight: 700, color: '#dc2626' }}>🗑️</button>
                              </div>
                            </td>
                          </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {plotEdit && (
                <div style={{ background: '#fff', borderRadius: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.06)', border: '1px solid #e2e8f0', position: 'sticky', top: 80, overflow: 'hidden' }}>
                  <div style={{ background: 'linear-gradient(135deg, #0ea5e9, #0284c7)', color: '#fff', padding: '1.25rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontWeight: 800, fontSize: '1.05rem' }}>{plotEdit === 'new' ? 'Add Plot' : `Edit ${plotEdit.number}`}</div>
                    <button onClick={() => { setPlotEdit(null); setPlotMsg(''); }} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', borderRadius: 8, width: 30, height: 30, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
                  </div>
                  <form onSubmit={handleSavePlot} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div className="form-group"><label>Plot Number</label><input required value={plotForm.number} onChange={e => setPlotForm(f => ({ ...f, number: e.target.value }))} placeholder="e.g. E-501" /></div>
                    <div className="form-group">
                      <label>Sector / Area</label>
                      {sectors.length > 0 ? (
                        <select required value={plotForm.area} onChange={e => setPlotForm(f => ({ ...f, area: e.target.value }))} style={{ width: '100%', padding: '0.6rem 0.75rem', border: '1.5px solid #e2e8f0', borderRadius: 9, fontFamily: 'inherit', fontSize: '0.9rem' }}>
                          <option value="">— Select sector —</option>
                          {sectors.map(s => <option key={s.id} value={s.name}>{s.name} ({s.type})</option>)}
                        </select>
                      ) : (
                        <input required value={plotForm.area} onChange={e => setPlotForm(f => ({ ...f, area: e.target.value }))} placeholder="e.g. Block E (no sectors defined yet)" />
                      )}
                    </div>
                    <div className="form-group">
                      <label>Size</label>
                      <select value={plotForm.size} onChange={e => setPlotForm(f => ({ ...f, size: e.target.value }))} style={{ width: '100%', padding: '0.6rem 0.75rem', border: '1.5px solid #e2e8f0', borderRadius: 9, fontFamily: 'inherit', fontSize: '0.9rem' }}>
                        {ALL_SIZES.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                    <div className="form-group"><label>Price (PKR)</label><input required type="number" value={plotForm.price} onChange={e => setPlotForm(f => ({ ...f, price: e.target.value }))} placeholder="e.g. 2500000" /></div>
                    <div className="form-group">
                      <label>Category</label>
                      <select value={plotForm.category} onChange={e => setPlotForm(f => ({ ...f, category: e.target.value }))} style={{ width: '100%', padding: '0.6rem 0.75rem', border: '1.5px solid #e2e8f0', borderRadius: 9, fontFamily: 'inherit', fontSize: '0.9rem' }}>
                        <option value="residential">Residential</option>
                        <option value="commercial">Commercial</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Status</label>
                      <select value={plotForm.status} onChange={e => setPlotForm(f => ({ ...f, status: e.target.value }))} style={{ width: '100%', padding: '0.6rem 0.75rem', border: '1.5px solid #e2e8f0', borderRadius: 9, fontFamily: 'inherit', fontSize: '0.9rem' }}>
                        <option value="available">Available</option>
                        <option value="booked">Booked</option>
                        <option value="sold">Sold</option>
                      </select>
                    </div>
                    <div className="form-group"><label>Description</label><input value={plotForm.description} onChange={e => setPlotForm(f => ({ ...f, description: e.target.value }))} placeholder="Brief description" /></div>
                    <div className="form-group">
                      <label>Premium Tags (adds to base price)</label>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.25rem' }}>
                        {[
                          { tag: 'Corner Plot', pct: 10 },
                          { tag: 'Park Facing', pct: 10 },
                          { tag: 'Main Road', pct: 10 },
                          { tag: 'Main Boulevard', pct: 15 },
                        ].map(({ tag, pct }) => {
                          const checked = (plotForm.tags || []).includes(tag);
                          return (
                            <label key={tag} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.875rem', fontWeight: checked ? 700 : 400, color: checked ? '#0f172a' : '#374151' }}>
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={e => setPlotForm(f => ({
                                  ...f,
                                  tags: e.target.checked ? [...(f.tags || []), tag] : (f.tags || []).filter(t => t !== tag)
                                }))}
                                style={{ width: 15, height: 15, accentColor: '#1a6b3c' }}
                              />
                              <span>{tag}</span>
                              <span style={{ background: pct === 15 ? '#fef3c7' : '#e0f2fe', color: pct === 15 ? '#92400e' : '#075985', borderRadius: 6, padding: '0.1rem 0.4rem', fontSize: '0.7rem', fontWeight: 700 }}>+{pct}%</span>
                            </label>
                          );
                        })}
                      </div>
                      {plotForm.price && (plotForm.tags || []).length > 0 && (
                        <div style={{ marginTop: '0.625rem', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, padding: '0.625rem 0.875rem', fontSize: '0.82rem' }}>
                          <span style={{ color: '#92400e', fontWeight: 600 }}>Effective price: </span>
                          <span style={{ textDecoration: 'line-through', color: '#94a3b8', marginRight: '0.5rem' }}>PKR {Number(plotForm.price).toLocaleString('en-US')}</span>
                          <span style={{ fontWeight: 800, color: '#b45309' }}>
                            PKR {effectivePrice(Number(plotForm.price), plotForm.tags || []).toLocaleString('en-US')}
                          </span>
                          <span style={{ color: '#b45309', marginLeft: '0.375rem' }}>
                            (+{(plotForm.tags || []).reduce((s, t) => s + (TAG_PREMIUMS[t] || 0), 0)}%)
                          </span>
                        </div>
                      )}
                    </div>
                    {plotMsg && <div className={plotMsg.startsWith('✅') ? 'alert alert-success' : 'alert alert-error'} style={{ fontSize: '0.85rem' }}>{plotMsg}</div>}
                    <button type="submit" className="btn btn-primary" disabled={plotSaving} style={{ justifyContent: 'center', padding: '0.75rem' }}>
                      {plotSaving ? <><div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }}></div> Saving...</> : '✓ Save Plot'}
                    </button>
                  </form>
                </div>
              )}
            </div>
            </>}
          </div>
        )}

        {/* ─── DEALS TAB ─── */}
        {tab === 'Deals' && (
          <div style={{ display: 'grid', gridTemplateColumns: dealEdit ? '1fr 420px' : '1fr', gap: '1.5rem', alignItems: 'start' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                <div>
                  <h3 style={{ fontWeight: 800, color: '#0f172a', marginBottom: '0.25rem' }}>Special Deals & Offers</h3>
                  <p style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Create time-limited deals visible to all dealers</p>
                </div>
                <button className="btn btn-primary btn-sm" onClick={() => openDealForm(null)}>+ Create Deal</button>
              </div>

              {dealsLoading ? <div className="loading"><div className="spinner"></div>Loading...</div> : deals.length === 0 ? (
                <div style={{ background: '#fff', borderRadius: 16, padding: '3rem', textAlign: 'center', color: '#94a3b8', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
                  <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>🏷️</div>
                  <div style={{ fontWeight: 600 }}>No deals yet. Create one to promote to dealers.</div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {deals.map(d => {
                    const isActive = d.validFrom <= today && d.validUntil >= today;
                    return (
                      <div key={d.id} style={{ background: '#fff', borderRadius: 16, padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', border: `1.5px solid ${isActive && d.highlighted ? '#fcd34d' : '#f1f5f9'}`, position: 'relative', overflow: 'hidden' }}>
                        {d.highlighted && <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: 'linear-gradient(90deg, #f59e0b, #fbbf24)' }} />}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                              {d.highlighted && <span style={{ fontSize: '0.7rem' }}>⭐</span>}
                              <div style={{ fontWeight: 800, fontSize: '1rem', color: '#0f172a' }}>{d.name}</div>
                            </div>
                            <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{d.validFrom} to {d.validUntil}</div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                            <span style={{ background: isActive ? '#d1fae5' : '#f1f5f9', color: isActive ? '#065f46' : '#64748b', borderRadius: 9999, padding: '0.2rem 0.625rem', fontSize: '0.72rem', fontWeight: 700 }}>{isActive ? '● Active' : 'Expired'}</span>
                            <button onClick={() => openDealForm(d)} style={{ padding: '0.3rem 0.6rem', background: '#f1f5f9', border: 'none', borderRadius: 7, cursor: 'pointer', fontSize: '0.75rem', fontWeight: 700 }}>✏️</button>
                            <button onClick={() => handleDeleteDeal(d.id)} style={{ padding: '0.3rem 0.6rem', background: '#fef2f2', border: 'none', borderRadius: 7, cursor: 'pointer', fontSize: '0.75rem', fontWeight: 700, color: '#dc2626' }}>🗑️</button>
                          </div>
                        </div>
                        {d.description && <div style={{ fontSize: '0.85rem', color: '#374151', marginBottom: '0.75rem', lineHeight: 1.6 }}>{d.description}</div>}
                        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                          {d.specialPrice && <span style={{ background: '#f0fdf4', color: '#065f46', borderRadius: 8, padding: '0.3rem 0.75rem', fontSize: '0.8rem', fontWeight: 700, border: '1px solid #bbf7d0' }}>Special: {fmt(d.specialPrice)}</span>}
                          {d.plotIds?.length > 0 && <span style={{ background: '#f0f9ff', color: '#0369a1', borderRadius: 8, padding: '0.3rem 0.75rem', fontSize: '0.8rem', fontWeight: 700, border: '1px solid #bae6fd' }}>{d.plotIds.length} plot{d.plotIds.length !== 1 ? 's' : ''}</span>}
                          {d.paymentPlanInfo && <span style={{ background: '#fefce8', color: '#854d0e', borderRadius: 8, padding: '0.3rem 0.75rem', fontSize: '0.8rem', fontWeight: 600, border: '1px solid #fef08a' }}>💳 {d.paymentPlanInfo}</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {dealEdit && (
              <div style={{ background: '#fff', borderRadius: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.06)', border: '1px solid #e2e8f0', position: 'sticky', top: 80, overflow: 'hidden' }}>
                <div style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)', color: '#fff', padding: '1.25rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontWeight: 800, fontSize: '1.05rem' }}>{dealEdit === 'new' ? 'Create Deal' : 'Edit Deal'}</div>
                  <button onClick={() => { setDealEdit(null); setDealMsg(''); }} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', borderRadius: 8, width: 30, height: 30, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
                </div>
                <form onSubmit={handleSaveDeal} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div className="form-group"><label>Deal Name</label><input required value={dealForm.name} onChange={e => setDealForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Spring Sale Offer" /></div>
                  <div className="form-group"><label>Description</label><textarea value={dealForm.description} onChange={e => setDealForm(f => ({ ...f, description: e.target.value }))} placeholder="Describe the offer..." rows={3} style={{ width: '100%', padding: '0.6rem 0.75rem', border: '1.5px solid #e2e8f0', borderRadius: 9, fontFamily: 'inherit', fontSize: '0.9rem', resize: 'vertical' }} /></div>
                  <div className="form-group"><label>Special Price (PKR, optional)</label><input type="number" value={dealForm.specialPrice} onChange={e => setDealForm(f => ({ ...f, specialPrice: e.target.value }))} placeholder="e.g. 2300000" /></div>
                  <div className="form-group"><label>Payment Plan Info</label><input value={dealForm.paymentPlanInfo} onChange={e => setDealForm(f => ({ ...f, paymentPlanInfo: e.target.value }))} placeholder="e.g. 24 installments, 5% discount" /></div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    <div className="form-group"><label>Valid From</label><input required type="date" value={dealForm.validFrom} onChange={e => setDealForm(f => ({ ...f, validFrom: e.target.value }))} /></div>
                    <div className="form-group"><label>Valid Until</label><input required type="date" value={dealForm.validUntil} onChange={e => setDealForm(f => ({ ...f, validUntil: e.target.value }))} /></div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#374151', marginBottom: '0.5rem' }}>Associated Plots (optional)</div>
                    <div style={{ maxHeight: 160, overflowY: 'auto', border: '1.5px solid #e2e8f0', borderRadius: 9, padding: '0.5rem' }}>
                      {plots.filter(p => p.status === 'available').map(p => (
                        <label key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.3rem 0.5rem', cursor: 'pointer', borderRadius: 7 }}>
                          <input type="checkbox" checked={dealForm.plotIds.includes(p.id)} onChange={() => toggleDealPlot(p.id)} />
                          <span style={{ fontSize: '0.8rem', color: '#374151' }}>{p.number} — {p.size} — {p.area}</span>
                        </label>
                      ))}
                      {plots.filter(p => p.status === 'available').length === 0 && <div style={{ fontSize: '0.8rem', color: '#94a3b8', padding: '0.5rem' }}>No available plots</div>}
                    </div>
                    {dealForm.plotIds.length > 0 && <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>{dealForm.plotIds.length} plot(s) selected</div>}
                  </div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', cursor: 'pointer', padding: '0.625rem 0.875rem', background: '#fffbeb', borderRadius: 9, border: '1.5px solid #fcd34d' }}>
                    <input type="checkbox" checked={dealForm.highlighted} onChange={e => setDealForm(f => ({ ...f, highlighted: e.target.checked }))} />
                    <span style={{ fontSize: '0.875rem', fontWeight: 700, color: '#92400e' }}>⭐ Mark as highlighted deal</span>
                  </label>
                  {dealMsg && <div className={dealMsg.startsWith('✅') ? 'alert alert-success' : 'alert alert-error'} style={{ fontSize: '0.85rem' }}>{dealMsg}</div>}
                  <button type="submit" className="btn btn-primary" disabled={dealSaving} style={{ justifyContent: 'center', padding: '0.75rem', background: '#f59e0b', color: '#fff' }}>
                    {dealSaving ? <><div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }}></div> Saving...</> : '✓ Save Deal'}
                  </button>
                </form>
              </div>
            )}
          </div>
        )}

        {/* ─── BACKUPS TAB ─── */}
        {tab === 'Backups' && (
          <div style={{ background: '#fff', borderRadius: 16, padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', border: '1px solid #f1f5f9' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
              <div>
                <h3 style={{ fontWeight: 800, color: '#0f172a', marginBottom: '0.25rem' }}>🗄️ Backup Files</h3>
                <p style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Automatic backups are saved in <code style={{ background: '#f1f5f9', padding: '0.1rem 0.35rem', borderRadius: 4, fontSize: '0.78rem' }}>server/data/</code> each time data changes (up to 5 kept)</p>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  className="btn btn-primary btn-sm"
                  onClick={handleCreateBackup}
                  disabled={creatingBackup || backupsLoading}
                  style={{ background: '#16a34a', border: 'none' }}
                >
                  {creatingBackup ? <><div className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }}></div> Creating...</> : '💾 Create Backup Now'}
                </button>
                <button className="btn btn-primary btn-sm" onClick={loadBackups} disabled={backupsLoading} style={{ background: '#0284c7' }}>
                  {backupsLoading ? <><div className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }}></div> Loading...</> : '↻ Refresh'}
                </button>
              </div>
            </div>
            {backupsMsg && <div className={backupsMsg.startsWith('✅') ? 'alert alert-success' : 'alert alert-error'} style={{ fontSize: '0.85rem', marginBottom: '1rem' }}>{backupsMsg}</div>}
            {backupsLoading ? (
              <div className="loading"><div className="spinner"></div>Loading backups...</div>
            ) : backups.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>🗄️</div>
                <div style={{ fontWeight: 600 }}>No backup files found</div>
                <div style={{ fontSize: '0.85rem', marginTop: '0.25rem' }}>Backups are created automatically when data is modified</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                {backups.map((bk, idx) => {
                  const ts = bk.filename.replace('db.json.bak-', '').replace(/-/g, (m, offset, str) => {
                    const before = str.slice(0, offset);
                    const dashes = (before.match(/-/g) || []).length;
                    return dashes < 2 ? '-' : dashes === 2 ? '-' : dashes < 5 ? ':' : '.';
                  });
                  const date = new Date(bk.createdAt);
                  const isLatest = idx === 0;
                  return (
                    <div key={bk.filename} style={{ border: `1.5px solid ${isLatest ? '#bfdbfe' : '#f1f5f9'}`, borderRadius: 12, padding: '0.875rem 1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', background: isLatest ? '#f0f9ff' : '#fff' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
                        <div style={{ fontSize: '1.5rem' }}>💾</div>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
                            <span style={{ fontWeight: 700, color: '#0f172a', fontFamily: 'monospace', fontSize: '0.85rem' }}>{bk.filename}</span>
                            {isLatest && <span style={{ background: '#dbeafe', color: '#1d4ed8', fontSize: '0.68rem', fontWeight: 800, padding: '0.1rem 0.45rem', borderRadius: 5 }}>LATEST</span>}
                          </div>
                          <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
                            {date.toLocaleDateString('en-PK', { year: 'numeric', month: 'short', day: 'numeric' })}
                            {' '}{date.toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' })}
                            <span style={{ marginLeft: '0.75rem', color: '#94a3b8' }}>{fmtBytes(bk.size)}</span>
                          </div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
                        <button
                          onClick={() => handleDownloadBackup(bk.filename)}
                          style={{ padding: '0.35rem 0.75rem', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 7, cursor: 'pointer', fontSize: '0.75rem', fontWeight: 700, color: '#15803d' }}
                        >
                          ⬇ Download
                        </button>
                        <button
                          onClick={() => { if (window.confirm(`Delete backup "${bk.filename}"? This cannot be undone.`)) handleDeleteBackup(bk.filename); }}
                          disabled={deletingBackup === bk.filename}
                          style={{ padding: '0.35rem 0.625rem', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 7, cursor: 'pointer', fontSize: '0.75rem', fontWeight: 700, color: '#dc2626' }}
                        >
                          {deletingBackup === bk.filename ? '...' : '🗑️ Delete'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ─── STAFF TAB ─── */}
        {tab === 'Staff' && (
          <div style={{ display: 'grid', gridTemplateColumns: staffEdit ? '1fr 400px' : '1fr', gap: '1.5rem', alignItems: 'start' }}>
            <div style={{ background: '#fff', borderRadius: 16, padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', border: '1px solid #f1f5f9' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                <div>
                  <h3 style={{ fontWeight: 800, color: '#0f172a', marginBottom: '0.25rem' }}>Operations Staff</h3>
                  <p style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Manage operations accounts and their access privileges</p>
                </div>
                <button className="btn btn-primary btn-sm" onClick={() => openStaffForm(null)}>+ Add Staff</button>
              </div>
              {staffLoading ? <div className="loading"><div className="spinner"></div>Loading...</div> : staff.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
                  <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>⚙️</div>
                  <div style={{ fontWeight: 600 }}>No operations staff yet</div>
                  <div style={{ fontSize: '0.85rem', marginTop: '0.25rem' }}>Add staff members to grant them access to the portal</div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {staff.map(s => (
                    <div key={s.id} style={{ border: '1.5px solid #f1f5f9', borderRadius: 12, padding: '1rem 1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap' }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.875rem' }}>
                        <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'linear-gradient(135deg, #0ea5e9, #0284c7)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: '1rem', flexShrink: 0 }}>{s.name.charAt(0)}</div>
                        <div>
                          <div style={{ fontWeight: 800, color: '#0f172a', marginBottom: '0.15rem' }}>{s.name}</div>
                          <div style={{ fontSize: '0.78rem', color: '#64748b', fontFamily: 'monospace', marginBottom: '0.5rem' }}>@{s.username}</div>
                          <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap' }}>
                            {PRIV_OPTIONS.map(p => (
                              <span key={p.key} style={{
                                background: s.privileges?.[p.key] ? '#dbeafe' : '#f8fafc',
                                color: s.privileges?.[p.key] ? '#1d4ed8' : '#94a3b8',
                                borderRadius: 6, padding: '0.15rem 0.5rem', fontSize: '0.7rem', fontWeight: 700,
                                border: `1px solid ${s.privileges?.[p.key] ? '#bfdbfe' : '#e2e8f0'}`,
                              }}>
                                {s.privileges?.[p.key] ? '✓' : '✕'} {p.label}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '0.375rem', flexShrink: 0 }}>
                        <button onClick={() => openStaffForm(s)} style={{ padding: '0.35rem 0.625rem', background: '#f1f5f9', border: 'none', borderRadius: 7, cursor: 'pointer', fontSize: '0.75rem', fontWeight: 700, color: '#374151' }}>✏️ Edit</button>
                        <button onClick={() => handleDeleteStaff(s.id)} style={{ padding: '0.35rem 0.625rem', background: '#fef2f2', border: 'none', borderRadius: 7, cursor: 'pointer', fontSize: '0.75rem', fontWeight: 700, color: '#dc2626' }}>🗑️</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {staffEdit && (
              <div style={{ background: '#fff', borderRadius: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.06)', border: '1px solid #e2e8f0', position: 'sticky', top: 80, overflow: 'hidden' }}>
                <div style={{ background: 'linear-gradient(135deg, #0ea5e9, #0284c7)', color: '#fff', padding: '1.25rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontWeight: 800, fontSize: '1.05rem' }}>{staffEdit === 'new' ? 'Add Operations Staff' : `Edit — ${staffEdit.name}`}</div>
                  <button onClick={() => { setStaffEdit(null); setStaffMsg(''); }} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', borderRadius: 8, width: 30, height: 30, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
                </div>
                <form onSubmit={handleSaveStaff} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div className="form-group">
                    <label>Full Name</label>
                    <input required value={staffForm.name} onChange={e => setStaffForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Kamran Operations" />
                  </div>
                  <div className="form-group">
                    <label>Username</label>
                    <input required={staffEdit === 'new'} value={staffForm.username} onChange={e => setStaffForm(f => ({ ...f, username: e.target.value }))} placeholder="e.g. ops2" disabled={staffEdit !== 'new'} style={{ opacity: staffEdit !== 'new' ? 0.6 : 1 }} />
                  </div>
                  <div className="form-group">
                    <label>{staffEdit === 'new' ? 'Password' : 'New Password (leave blank to keep)'}</label>
                    <input type="password" required={staffEdit === 'new'} value={staffForm.password} onChange={e => setStaffForm(f => ({ ...f, password: e.target.value }))} placeholder={staffEdit === 'new' ? 'Set a password' : 'Leave blank to keep current'} />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#374151', marginBottom: '0.625rem' }}>🔑 Access Privileges</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {PRIV_OPTIONS.map(p => (
                        <label key={p.key} style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', cursor: 'pointer', padding: '0.5rem 0.75rem', background: staffForm.privileges[p.key] ? '#dbeafe' : '#f8fafc', borderRadius: 9, border: `1.5px solid ${staffForm.privileges[p.key] ? '#93c5fd' : '#e2e8f0'}`, transition: 'all 0.15s' }}>
                          <input type="checkbox" checked={!!staffForm.privileges[p.key]} onChange={() => togglePriv(p.key)} style={{ width: 16, height: 16 }} />
                          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: staffForm.privileges[p.key] ? '#1d4ed8' : '#374151' }}>{p.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  {staffMsg && <div className={staffMsg.startsWith('✅') ? 'alert alert-success' : 'alert alert-error'} style={{ fontSize: '0.85rem' }}>{staffMsg}</div>}
                  <button type="submit" className="btn btn-primary" disabled={staffSaving} style={{ justifyContent: 'center', padding: '0.75rem', background: '#0284c7' }}>
                    {staffSaving ? <><div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }}></div> Saving...</> : '✓ Save Staff Account'}
                  </button>
                </form>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
