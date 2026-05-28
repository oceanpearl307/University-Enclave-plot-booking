import React, { useEffect, useRef, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import * as XLSX from 'xlsx';

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

const TABS = ['Dealers', 'Registrations', 'Packages', 'Inventory', 'Deals', 'Staff'];
const tabIcons = { Dealers: '👥', Registrations: '📋', Packages: '📦', Inventory: '🏘️', Deals: '🏷️', Staff: '⚙️' };
const PRIV_OPTIONS = [
  { key: 'approveBookings', label: 'View & Approve Bookings' },
  { key: 'viewPlots', label: 'View Plot Inventory' },
  { key: 'viewDealers', label: 'View Dealers & Targets' },
  { key: 'viewDeals', label: 'View Deals' },
  { key: 'viewRegistrations', label: 'View Dealer Registrations' },
];

export default function AdminDashboard({ dealer: admin, onLogout, navigate }) {
  const [tab, setTab] = useState('Dealers');

  // ── Dealers tab ──
  const [dealers, setDealers] = useState([]);
  const [dealersLoading, setDealersLoading] = useState(true);
  const [packages, setPackages] = useState([]);
  const [selected, setSelected] = useState(null);
  const [tForm, setTForm] = useState({ packageId: '', sizes: {}, paymentTarget: '', notes: '', depositAmount: '', depositPaid: false });
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
  const [pkgForm, setPkgForm] = useState({ name: '', sizes: {}, rewardDescription: '', rewardAmount: '' });
  const [pkgSaving, setPkgSaving] = useState(false);
  const [pkgMsg, setPkgMsg] = useState('');

  // ── Inventory tab ──
  const [plots, setPlots] = useState([]);
  const [plotsLoading, setPlotsLoading] = useState(false);
  const [plotEdit, setPlotEdit] = useState(null);
  const [plotForm, setPlotForm] = useState({ number: '', size: '5 Marla', price: '', status: 'available', category: 'residential', description: '', area: '' });
  const [plotSaving, setPlotSaving] = useState(false);
  const [plotMsg, setPlotMsg] = useState('');

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

  // ── Deals tab ──
  const [deals, setDeals] = useState([]);
  const [dealsLoading, setDealsLoading] = useState(false);
  const [dealEdit, setDealEdit] = useState(null);
  const [dealForm, setDealForm] = useState({ name: '', description: '', plotIds: [], specialPrice: '', paymentPlanInfo: '', validFrom: '', validUntil: '', highlighted: false });
  const [dealSaving, setDealSaving] = useState(false);
  const [dealMsg, setDealMsg] = useState('');

  // ── Staff tab ──
  const [staff, setStaff] = useState([]);
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
  const loadDeals = () => { setDealsLoading(true); fetch('/api/admin/deals').then(r => r.json()).then(d => { setDeals(d); setDealsLoading(false); }).catch(() => setDealsLoading(false)); };
  const loadStaff = () => { setStaffLoading(true); fetch('/api/admin/staff').then(r => r.json()).then(d => { setStaff(d); setStaffLoading(false); }).catch(() => setStaffLoading(false)); };

  useEffect(() => { loadDealers(); loadPackages(); }, []);
  useEffect(() => {
    if (tab === 'Registrations') loadRegs();
    if (tab === 'Inventory') loadPlots();
    if (tab === 'Deals') { loadDeals(); loadPlots(); }
    if (tab === 'Staff') loadStaff();
  }, [tab]);

  // ── Dealer assign target ──
  const openAssign = async (d) => {
    setSelected(d); setSaveMsg('');
    const [res, depRes] = await Promise.all([
      fetch(`/api/admin/targets/${d.id}`).then(r => r.json()).catch(() => null),
      Promise.resolve(d),
    ]);
    const initSizes = {};
    PLOT_SIZES.forEach(s => { initSizes[s] = 0; });
    if (res && res.sizes) res.sizes.forEach(s => { initSizes[s.size] = s.target; });
    setTForm({
      packageId: res?.packageId ? String(res.packageId) : '',
      sizes: initSizes,
      paymentTarget: res?.paymentTarget || '',
      notes: res?.notes || '',
      depositAmount: d.securityDepositRequired || 200000,
      depositPaid: d.securityDepositPaid || false,
    });
  };

  const handlePackageSelect = (pkgId) => {
    setTForm(f => {
      if (!pkgId) return { ...f, packageId: '' };
      const pkg = packages.find(p => p.id === parseInt(pkgId));
      if (!pkg) return { ...f, packageId: pkgId };
      const newSizes = {};
      pkg.sizes.forEach(s => { newSizes[s.size] = s.quota; });
      return { ...f, packageId: pkgId, sizes: newSizes };
    });
  };

  const handleSaveTarget = async e => {
    e.preventDefault(); setSaving(true); setSaveMsg('');
    try {
      const sizes = PLOT_SIZES.map(s => ({ size: s, target: parseInt(tForm.sizes[s]) || 0 }));
      const body = { sizes, paymentTarget: parseInt(tForm.paymentTarget) || 0, notes: tForm.notes };
      if (tForm.packageId) body.packageId = parseInt(tForm.packageId);
      await fetch(`/api/admin/targets/${selected.id}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      await fetch(`/api/admin/dealers/${selected.id}/deposit`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ paid: tForm.depositPaid, amount: parseInt(tForm.depositAmount) || 0 }) });
      setSaveMsg('✅ Saved successfully!');
      loadDealers();
    } catch { setSaveMsg('❌ Save failed'); } finally { setSaving(false); }
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
      setPkgForm({ name: pkg.name, sizes, rewardDescription: pkg.rewardDescription, rewardAmount: pkg.rewardAmount });
    } else {
      setPkgEdit('new');
      const sizes = {};
      PLOT_SIZES.forEach(s => { sizes[s] = 0; });
      setPkgForm({ name: '', sizes, rewardDescription: '', rewardAmount: '' });
    }
    setPkgMsg('');
  };

  const handleSavePkg = async e => {
    e.preventDefault(); setPkgSaving(true); setPkgMsg('');
    try {
      const sizes = PLOT_SIZES.map(s => ({ size: s, quota: parseInt(pkgForm.sizes[s]) || 0 }));
      const body = { name: pkgForm.name, sizes, rewardDescription: pkgForm.rewardDescription, rewardAmount: parseInt(pkgForm.rewardAmount) || 0 };
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
  const openPlotForm = (plot) => {
    if (plot) {
      setPlotEdit(plot);
      setPlotForm({ number: plot.number, size: plot.size, price: plot.price, status: plot.status, category: plot.category, description: plot.description, area: plot.area });
    } else {
      setPlotEdit('new');
      setPlotForm({ number: '', size: '5 Marla', price: '', status: 'available', category: 'residential', description: '', area: '' });
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
  const downloadTemplate = () => {
    const ws = XLSX.utils.aoa_to_sheet([
      ['Plot Number', 'Area', 'Size', 'Price (PKR)', 'Category', 'Status', 'Description'],
      ['E-501', 'Block E', '5 Marla', 2500000, 'residential', 'available', 'Corner plot'],
      ['E-502', 'Block E', '10 Marla', 5000000, 'residential', 'available', 'Park facing'],
    ]);
    ws['!cols'] = [14, 12, 10, 14, 14, 12, 30].map(w => ({ wch: w }));
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
        const mapped = raw.map(row => ({
          number: String(row['Plot Number'] || row['number'] || '').trim(),
          area: String(row['Area'] || row['area'] || '').trim(),
          size: String(row['Size'] || row['size'] || '5 Marla').trim(),
          price: parseInt(row['Price (PKR)'] || row['price'] || 0) || 0,
          category: String(row['Category'] || row['category'] || 'residential').toLowerCase().trim(),
          status: String(row['Status'] || row['status'] || 'available').toLowerCase().trim(),
          description: String(row['Description'] || row['description'] || '').trim(),
        })).filter(r => r.number || r.area);
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
            </button>
          ))}
        </div>

        {/* ─── DEALERS TAB ─── */}
        {tab === 'Dealers' && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1.25rem', marginBottom: '1.75rem' }}>
              {[
                { label: 'Total Dealers', value: dealers.length, icon: '👥', color: '#6366f1' },
                { label: 'With Targets', value: dealers.filter(d => d.hasTarget).length, icon: '🎯', color: '#d97706' },
                { label: 'Total Achieved', value: dealers.reduce((s, d) => s + d.achieved, 0), icon: '✅', color: '#059669' },
                { label: 'Deposit Paid', value: dealers.filter(d => d.securityDepositPaid).length, icon: '💳', color: '#0ea5e9' },
              ].map(c => (
                <div key={c.label} style={{ background: '#fff', borderRadius: 16, padding: '1.25rem', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', border: '1px solid #f1f5f9', position: 'relative', overflow: 'hidden' }}>
                  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: c.color, borderRadius: '16px 16px 0 0' }} />
                  <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>{c.label}</div>
                  <div style={{ fontSize: '2rem', fontWeight: 900, color: '#0f172a' }}>{c.value}</div>
                </div>
              ))}
            </div>

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

            <div style={{ display: 'grid', gridTemplateColumns: selected ? '1fr 440px' : '1fr', gap: '1.5rem', alignItems: 'start' }}>
              <div style={{ background: '#fff', borderRadius: 16, padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', border: '1px solid #f1f5f9' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                  <div>
                    <h3 style={{ fontWeight: 800, color: '#0f172a', marginBottom: '0.25rem' }}>All Dealers</h3>
                    <p style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Click a dealer to assign or edit their target & deposit</p>
                  </div>
                </div>
                {dealersLoading ? <div className="loading"><div className="spinner"></div>Loading...</div> : (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                      <thead>
                        <tr style={{ borderBottom: '2px solid #f1f5f9' }}>
                          {['Dealer', 'Package', 'Target', 'Achieved', 'Progress', 'Deposit', 'Reward', ''].map(h => (
                            <th key={h} style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.7rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {dealers.map(d => {
                          const pct = d.totalTarget > 0 ? Math.min(100, Math.round((d.achieved / d.totalTarget) * 100)) : 0;
                          const isSelected = selected?.id === d.id;
                          return (
                            <tr key={d.id} style={{ borderBottom: '1px solid #f8fafc', background: isSelected ? '#f0fdf4' : 'transparent', cursor: 'pointer' }}
                              onClick={() => openAssign(d)}
                              onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = '#f8fafc'; }}
                              onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = isSelected ? '#f0fdf4' : 'transparent'; }}>
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
                                <button className="btn btn-outline btn-sm" onClick={e => { e.stopPropagation(); openAssign(d); }} style={{ fontSize: '0.7rem' }}>
                                  {d.hasTarget ? '✏️ Edit' : '+ Assign'}
                                </button>
                              </td>
                            </tr>
                          );
                        })}
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
                      <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#374151', marginBottom: '0.75rem' }}>🎯 Plot Size Targets</div>
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
                        Total: {PLOT_SIZES.reduce((sum, s) => sum + (parseInt(tForm.sizes[s]) || 0), 0)} plots
                      </div>
                    </div>

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

                    <div className="form-group">
                      <label>📝 Notes</label>
                      <input value={tForm.notes} onChange={e => setTForm(f => ({ ...f, notes: e.target.value }))} placeholder="e.g. Q2 2026 Sales Target" />
                    </div>

                    {saveMsg && <div className={saveMsg.startsWith('✅') ? 'alert alert-success' : 'alert alert-error'} style={{ fontSize: '0.85rem' }}>{saveMsg}</div>}
                    <button type="submit" className="btn btn-primary" disabled={saving} style={{ width: '100%', justifyContent: 'center', padding: '0.75rem' }}>
                      {saving ? <><div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }}></div> Saving...</> : '✓ Save Target & Deposit'}
                    </button>
                  </form>
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
                            <td style={{ padding: '0.3rem 0.4rem' }}><input value={row.area} onChange={e => updateBulkRow(idx, 'area', e.target.value)} placeholder="Block E" style={{ width: 90, padding: '0.35rem 0.5rem', border: '1.5px solid #e2e8f0', borderRadius: 7, fontFamily: 'inherit', fontSize: '0.82rem' }} /></td>
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
                                <td style={{ padding: '0.5rem 0.75rem', fontWeight: 700 }}>{r.price ? fmt(r.price) : <span style={{ color: '#ef4444' }}>—</span>}</td>
                                <td style={{ padding: '0.5rem 0.75rem', color: '#64748b', textTransform: 'capitalize' }}>{r.category}</td>
                                <td style={{ padding: '0.5rem 0.75rem' }}><span style={{ background: r.status === 'available' ? '#d1fae5' : r.status === 'booked' ? '#fef3c7' : '#fee2e2', color: statusColor[r.status] || '#374151', borderRadius: 9999, padding: '0.15rem 0.5rem', fontSize: '0.7rem', fontWeight: 700, textTransform: 'capitalize' }}>{r.status}</span></td>
                                <td style={{ padding: '0.5rem 0.75rem', color: '#64748b', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.description}</td>
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
                          {['Plot', 'Area', 'Size', 'Category', 'Price', 'Status', ''].map(h => (
                            <th key={h} style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.7rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {plots.map(p => (
                          <tr key={p.id} style={{ borderBottom: '1px solid #f8fafc' }}
                            onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                            <td style={{ padding: '0.875rem', fontWeight: 700, color: '#1a6b3c', fontFamily: 'monospace' }}>{p.number}</td>
                            <td style={{ padding: '0.875rem', color: '#374151' }}>{p.area}</td>
                            <td style={{ padding: '0.875rem', color: '#374151' }}>{p.size}</td>
                            <td style={{ padding: '0.875rem', color: '#64748b', textTransform: 'capitalize', fontSize: '0.8rem' }}>{p.category}</td>
                            <td style={{ padding: '0.875rem', fontWeight: 700 }}>{fmt(p.price)}</td>
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
                        ))}
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
                    <div className="form-group"><label>Block / Area</label><input required value={plotForm.area} onChange={e => setPlotForm(f => ({ ...f, area: e.target.value }))} placeholder="e.g. Block E" /></div>
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
                    {plotMsg && <div className={plotMsg.startsWith('✅') ? 'alert alert-success' : 'alert alert-error'} style={{ fontSize: '0.85rem' }}>{plotMsg}</div>}
                    <button type="submit" className="btn btn-primary" disabled={plotSaving} style={{ justifyContent: 'center', padding: '0.75rem' }}>
                      {plotSaving ? <><div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }}></div> Saving...</> : '✓ Save Plot'}
                    </button>
                  </form>
                </div>
              )}
            </div>
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
