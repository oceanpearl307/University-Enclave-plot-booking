import React, { useState, useEffect } from 'react';
import BookingReceipt from '../components/BookingReceipt.jsx';

const fmt = n => n >= 1000000 ? 'PKR ' + (n / 1000000).toFixed(1) + 'M' : n > 0 ? 'PKR ' + (n / 1000).toFixed(0) + 'K' : 'PKR 0';
const statusColor = { pending: '#d97706', confirmed: '#059669', rejected: '#dc2626' };
const statusBg = { pending: '#fef3c7', confirmed: '#d1fae5', rejected: '#fee2e2' };

const PRIV_TABS = [
  { key: 'approveBookings',     label: 'Bookings',      icon: '📋', anyOf: ['approveBookings', 'editBookings', 'viewLedger'] },
  { key: 'viewPlots',           label: 'Plots',         icon: '🏘️' },
  { key: 'manageInventory',     label: 'Inventory',     icon: '🏗️' },
  { key: 'viewDealers',         label: 'Dealers',       icon: '👥' },
  { key: 'viewDeals',           label: 'Deals',         icon: '🏷️' },
  { key: 'viewRegistrations',   label: 'Registrations', icon: '📝' },
  { key: 'viewCustomers',       label: 'Customers',     icon: '🙍' },
  { key: 'manageStaff',         label: 'Staff',         icon: '🛡️' },
  { key: 'viewReports',         label: 'Reports',       icon: '📊' },
  { key: 'manageAnnouncements', label: 'Announcements', icon: '📢' },
  { key: 'exportData',          label: 'Export',        icon: '📤' },
];
const OPS_STAFF_ROLE_OPTIONS = ['Sales Staff', 'Operations Staff'];
const OPS_ROLE_PRESETS = {
  'Sales Staff':      { viewPlots: true, viewDealers: true, viewCustomers: true },
  'Operations Staff': { approveBookings: true, editBookings: true },
};

const PLOT_SIZES = ['5 Marla', '7 Marla', '10 Marla', '1 Kanal', '2 Kanal', '4 Marla', 'Other'];
const PLOT_CATS = ['residential', 'commercial'];
const PLOT_STATUSES = ['available', 'booked', 'sold'];
const ROLE_COLOR = {
  'Operations Manager': { color: '#7c3aed', bg: '#f5f3ff' },
  'Sales Staff':        { color: '#059669', bg: '#d1fae5' },
  'Finance Staff':      { color: '#d97706', bg: '#fef3c7' },
  'Marketing Staff':    { color: '#dc2626', bg: '#fee2e2' },
  'Operations Staff':   { color: '#0284c7', bg: '#e0f2fe' },
};
const defaultInvForm = () => ({ number: '', area: '', size: '5 Marla', category: 'residential', price: '', status: 'available' });
const defaultAnnForm = () => ({ title: '', body: '', date: new Date().toISOString().slice(0, 10), tag: '', important: false });

export default function OperationsDashboard({ staff, authToken, onLogout }) {
  const privileges = staff.privileges || {};
  const aFetch = (url, opts = {}) => fetch(url, { ...opts, headers: { Authorization: `Bearer ${authToken}`, ...(opts.headers || {}) } });
  const availableTabs = PRIV_TABS.filter(t => t.anyOf ? t.anyOf.some(k => privileges[k]) : privileges[t.key]);
  const [tab, setTab] = useState(availableTabs[0]?.key || null);
  const [actionMsg, setActionMsg] = useState('');

  const [bookings, setBookings] = useState([]);
  const [bookingsLoading, setBookingsLoading] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [rejectModal, setRejectModal] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [showReceipt, setShowReceipt] = useState(null);
  const [ppEditMode, setPpEditMode] = useState(false);
  const [ppEditForm, setPpEditForm] = useState({});
  const [ppEditSaving, setPpEditSaving] = useState(false);
  const [exEditMode, setExEditMode] = useState(false);
  const [exEditForm, setExEditForm] = useState({});
  const [exEditSaving, setExEditSaving] = useState(false);
  const [exEditMsg, setExEditMsg] = useState('');
  const [ppEditMsg, setPpEditMsg] = useState('');
  const [editBkgMode, setEditBkgMode] = useState(false);
  const [editBkgForm, setEditBkgForm] = useState({});
  const [editBkgSaving, setEditBkgSaving] = useState(false);
  const [editBkgMsg, setEditBkgMsg] = useState('');
  const [ledger, setLedger] = useState(null);
  const [ledgerLoading, setLedgerLoading] = useState(false);
  const [notifList, setNotifList] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [checkingSaving, setCheckingSaving] = useState(false);
  const [notifDrawerOpen, setNotifDrawerOpen] = useState(false);
  const [bellAnimating, setBellAnimating] = useState(false);
  const [liveToast, setLiveToast] = useState(null);

  const [opsStaffList, setOpsStaffList] = useState([]);
  const [opsStaffLoading, setOpsStaffLoading] = useState(false);
  const [opsStaffEdit, setOpsStaffEdit] = useState(null);
  const [opsStaffForm, setOpsStaffForm] = useState({ name: '', username: '', password: '', staffRole: 'Sales Staff' });
  const [opsStaffSaving, setOpsStaffSaving] = useState(false);
  const [opsStaffMsg, setOpsStaffMsg] = useState('');

  const [plots, setPlots] = useState([]);
  const [plotsLoading, setPlotsLoading] = useState(false);
  const [invEdit, setInvEdit] = useState(null);
  const [invForm, setInvForm] = useState(defaultInvForm());
  const [invSaving, setInvSaving] = useState(false);
  const [invMsg, setInvMsg] = useState('');

  const [dealers, setDealers] = useState([]);
  const [dealersLoading, setDealersLoading] = useState(false);

  const [deals, setDeals] = useState([]);
  const [dealsLoading, setDealsLoading] = useState(false);

  const [regs, setRegs] = useState([]);
  const [regsLoading, setRegsLoading] = useState(false);

  const [anns, setAnns] = useState([]);
  const [annsLoading, setAnnsLoading] = useState(false);
  const [annEdit, setAnnEdit] = useState(null);
  const [annForm, setAnnForm] = useState(defaultAnnForm());
  const [annSaving, setAnnSaving] = useState(false);
  const [annMsg, setAnnMsg] = useState('');

  const [customers, setCustomers] = useState([]);
  const [customersLoading, setCustomersLoading] = useState(false);

  const reloadBookings = () => {
    setBookingsLoading(true);
    aFetch('/api/admin/bookings').then(r => r.json()).then(d => { setBookings(Array.isArray(d) ? d : []); setBookingsLoading(false); }).catch(() => setBookingsLoading(false));
  };
  const fetchNotifs = () => {
    aFetch('/api/admin/notifications').then(r => r.json()).then(d => {
      setNotifList(Array.isArray(d.notifications) ? d.notifications : []);
      setUnreadCount(typeof d.unreadCount === 'number' ? d.unreadCount : 0);
    }).catch(() => {});
  };
  const markAllNotifsRead = () => {
    aFetch('/api/admin/notifications/read-all', { method: 'POST' }).then(() => {
      setUnreadCount(0);
      setNotifList(prev => prev.map(n => ({ ...n, _read: true })));
    }).catch(() => {});
  };
  const handleMarkChecked = async (bkg) => {
    setCheckingSaving(true);
    const res = await aFetch(`/api/admin/bookings/${bkg.id}/check`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) });
    if (res.ok) {
      const data = await res.json();
      const updated = { ...bkg, ...data.booking };
      setSelectedBooking(updated);
      setBookings(prev => prev.map(b => b.id === updated.id ? { ...b, ...data.booking } : b));
    }
    setCheckingSaving(false);
  };
  const reloadPlots = () => {
    setPlotsLoading(true);
    fetch('/api/plots').then(r => r.json()).then(d => { setPlots(Array.isArray(d) ? d : []); setPlotsLoading(false); }).catch(() => setPlotsLoading(false));
  };
  const reloadAnns = () => {
    setAnnsLoading(true);
    fetch('/api/announcements').then(r => r.json()).then(d => { setAnns(Array.isArray(d) ? d : []); setAnnsLoading(false); }).catch(() => setAnnsLoading(false));
  };
  const reloadCustomers = () => {
    setCustomersLoading(true);
    aFetch('/api/admin/customers').then(r => r.json()).then(d => { setCustomers(Array.isArray(d) ? d : []); setCustomersLoading(false); }).catch(() => setCustomersLoading(false));
  };
  const loadOpsStaff = () => {
    setOpsStaffLoading(true);
    aFetch('/api/admin/staff').then(r => r.json()).then(d => { setOpsStaffList(Array.isArray(d) ? d : []); setOpsStaffLoading(false); }).catch(() => setOpsStaffLoading(false));
  };

  useEffect(() => {
    fetchNotifs();
    const iv = setInterval(fetchNotifs, 60000);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    if (!privileges.approveBookings) return;
    const es = new EventSource(`/api/admin/notifications/stream?token=${encodeURIComponent(authToken)}`);
    es.onmessage = (e) => {
      try {
        const notif = JSON.parse(e.data);
        setNotifList(prev => [notif, ...prev]);
        setUnreadCount(c => c + 1);
        setBellAnimating(true);
        setTimeout(() => setBellAnimating(false), 1200);
        setLiveToast(notif);
        setTimeout(() => setLiveToast(null), 5000);
      } catch (_) {}
    };
    return () => es.close();
  }, [authToken, privileges.approveBookings]);

  useEffect(() => {
    if (!tab) return;
    setActionMsg('');
    if (tab === 'approveBookings' || tab === 'viewReports') { reloadBookings(); markAllNotifsRead(); }
    if (tab === 'viewPlots' || tab === 'manageInventory') reloadPlots();
    if (tab === 'viewDealers') { setDealersLoading(true); aFetch('/api/admin/dealers').then(r => r.json()).then(d => { setDealers(Array.isArray(d) ? d : []); setDealersLoading(false); }).catch(() => setDealersLoading(false)); }
    if (tab === 'viewDeals') { setDealsLoading(true); aFetch('/api/admin/deals').then(r => r.json()).then(d => { setDeals(Array.isArray(d) ? d : []); setDealsLoading(false); }).catch(() => setDealsLoading(false)); }
    if (tab === 'viewRegistrations') { setRegsLoading(true); aFetch('/api/admin/registrations').then(r => r.json()).then(d => { setRegs(Array.isArray(d) ? d : []); setRegsLoading(false); }).catch(() => setRegsLoading(false)); }
    if (tab === 'manageAnnouncements') reloadAnns();
    if (tab === 'viewCustomers') reloadCustomers();
    if (tab === 'manageStaff') loadOpsStaff();
    if (tab === 'exportData') { reloadBookings(); reloadPlots(); reloadCustomers(); }
  }, [tab]);

  useEffect(() => {
    setEditBkgMode(false); setEditBkgMsg(''); setLedger(null);
    if (selectedBooking && privileges.viewLedger) {
      setLedgerLoading(true);
      aFetch(`/api/ledger/${selectedBooking.id}`).then(r => r.json()).then(d => { setLedger(d); setLedgerLoading(false); }).catch(() => setLedgerLoading(false));
    }
  }, [selectedBooking?.id]);

  const handleApprove = async (bookingId) => {
    setActionMsg('');
    const res = await aFetch(`/api/admin/bookings/${bookingId}/approve`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ approvedBy: staff.name }),
    });
    if (res.ok) {
      const data = await res.json();
      setActionMsg('✅ Booking approved — plot marked as sold.');
      setSelectedBooking(null);
      reloadBookings();
      setShowReceipt(data.booking);
    } else setActionMsg('❌ Failed to approve booking.');
  };

  const handleReject = async () => {
    if (!rejectModal) return;
    setActionMsg('');
    const res = await aFetch(`/api/admin/bookings/${rejectModal.id}/reject`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason: rejectReason, rejectedBy: staff.name }),
    });
    if (res.ok) { setActionMsg('✅ Booking rejected — plot is now available again.'); setRejectModal(null); setRejectReason(''); setSelectedBooking(null); reloadBookings(); }
    else setActionMsg('❌ Failed to reject booking.');
  };

  const openEditBkg = (bkg) => {
    setEditBkgForm({
      name: bkg.name || '', fatherName: bkg.fatherName || '', cnic: bkg.cnic || '',
      phone: bkg.phone || '', email: bkg.email || '',
      residentialAddress: bkg.residentialAddress || bkg.address || '', postalAddress: bkg.postalAddress || '',
    });
    setEditBkgMsg(''); setEditBkgMode(true);
  };
  const handleSaveBooking = async (bkg) => {
    if (!editBkgForm.name?.trim() || !editBkgForm.cnic?.trim() || !editBkgForm.phone?.trim()) { setEditBkgMsg('❌ Name, CNIC and phone are required'); return; }
    setEditBkgSaving(true); setEditBkgMsg('');
    const res = await aFetch(`/api/admin/bookings/${bkg.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editBkgForm),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      setEditBkgMsg('✅ Booking data corrected');
      setEditBkgMode(false);
      const updated = { ...bkg, ...data.booking };
      setSelectedBooking(updated);
      setBookings(prev => prev.map(b => b.id === updated.id ? updated : b));
    } else setEditBkgMsg('❌ ' + (data.error || 'Save failed'));
    setEditBkgSaving(false);
  };

  const openOpsStaffForm = (s) => {
    setOpsStaffMsg('');
    if (s) { setOpsStaffEdit(s); setOpsStaffForm({ name: s.name || '', username: s.username || '', password: '', staffRole: s.staffRole || 'Sales Staff' }); }
    else { setOpsStaffEdit('new'); setOpsStaffForm({ name: '', username: '', password: '', staffRole: 'Sales Staff' }); }
  };
  const handleSaveOpsStaff = async (e) => {
    e.preventDefault();
    if (!opsStaffForm.name.trim() || !opsStaffForm.username.trim()) { setOpsStaffMsg('❌ Name and username are required'); return; }
    if (opsStaffEdit === 'new' && !opsStaffForm.password) { setOpsStaffMsg('❌ Password is required for new staff'); return; }
    setOpsStaffSaving(true); setOpsStaffMsg('');
    const isNew = opsStaffEdit === 'new';
    const body = {
      name: opsStaffForm.name.trim(), username: opsStaffForm.username.trim(),
      staffRole: opsStaffForm.staffRole, privileges: { ...OPS_ROLE_PRESETS[opsStaffForm.staffRole] },
    };
    if (opsStaffForm.password) body.password = opsStaffForm.password;
    const res = await aFetch(isNew ? '/api/admin/staff' : `/api/admin/staff/${opsStaffEdit.id}`, {
      method: isNew ? 'POST' : 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) { setOpsStaffMsg('✅ Staff saved'); loadOpsStaff(); setTimeout(() => { setOpsStaffEdit(null); setOpsStaffMsg(''); }, 1000); }
    else setOpsStaffMsg('❌ ' + (data.error || 'Save failed'));
    setOpsStaffSaving(false);
  };
  const handleDeleteOpsStaff = async (id) => {
    if (!confirm('Remove this staff account? This cannot be undone.')) return;
    const res = await aFetch(`/api/admin/staff/${id}`, { method: 'DELETE' });
    if (res.ok) loadOpsStaff();
    else { const d = await res.json().catch(() => ({})); alert(d.error || 'Delete failed'); }
  };

  const openPpEdit = (bkg) => {
    const ov = bkg.paymentPlanOverride || {};
    setPpEditForm({
      negotiatedPrice: String(ov.negotiatedPrice || bkg.plotPrice || ''),
      installmentAmount: String(ov.installmentAmount || ''),
      confirmationDueDays: String(ov.confirmationDueDays || 30),
      installmentStartMonths: String(ov.installmentStartMonths || 1),
      notes: '',
    });
    setPpEditMsg('');
    setPpEditMode(true);
  };

  const handleSaveExchangeAsset = async (bkg) => {
    if (!exEditForm.description || exEditForm.description.trim().length < 5) { setExEditMsg('❌ Asset description required (min 5 characters)'); return; }
    if (!exEditForm.agreedValue || Number(exEditForm.agreedValue) <= 0) { setExEditMsg('❌ Agreed value must be greater than 0'); return; }
    setExEditSaving(true); setExEditMsg('');
    const res = await fetch(`/api/ops/bookings/${bkg.id}/exchange-asset`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` },
      body: JSON.stringify(exEditForm),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      setExEditMsg('✅ Exchange asset recorded');
      setExEditMode(false);
      const updated = { ...bkg, ...data.booking };
      setSelectedBooking(updated);
      setBookings(prev => prev.map(b => b.id === updated.id ? { ...b, ...data.booking } : b));
    } else {
      setExEditMsg('❌ ' + (data.error || 'Save failed'));
    }
    setExEditSaving(false);
  };

  const handleSavePaymentPlan = async (bkg) => {
    if (!ppEditForm.notes || ppEditForm.notes.trim().length < 5) {
      setPpEditMsg('❌ Negotiation notes are required (min 5 characters)');
      return;
    }
    setPpEditSaving(true); setPpEditMsg('');
    const res = await fetch(`/api/admin/bookings/${bkg.id}/payment-plan`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` },
      body: JSON.stringify(ppEditForm),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      setPpEditMsg('✅ Payment plan updated');
      setPpEditMode(false);
      const updated = { ...bkg, ...data.booking };
      setSelectedBooking(updated);
      setBookings(prev => prev.map(b => b.id === updated.id ? { ...b, ...data.booking } : b));
    } else {
      setPpEditMsg('❌ ' + (data.error || 'Save failed'));
    }
    setPpEditSaving(false);
  };

  const openInvForm = (p) => {
    setInvMsg('');
    if (p) { setInvEdit(p); setInvForm({ number: p.number, area: p.area || '', size: p.size || '5 Marla', category: p.category || 'residential', price: p.price || '', status: p.status || 'available' }); }
    else { setInvEdit('new'); setInvForm(defaultInvForm()); }
  };
  const handleSaveInv = async (e) => {
    e.preventDefault(); setInvSaving(true); setInvMsg('');
    try {
      const isNew = invEdit === 'new';
      const res = await fetch(isNew ? '/api/admin/plots' : `/api/admin/plots/${invEdit.id}`, {
        method: isNew ? 'POST' : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...invForm, price: parseInt(invForm.price) || 0 }),
      });
      if (res.ok) { setInvMsg('✅ Plot saved'); reloadPlots(); setTimeout(() => { setInvEdit(null); setInvMsg(''); }, 1000); }
      else { const d = await res.json().catch(() => ({})); setInvMsg('❌ ' + (d.error || 'Save failed')); }
    } catch { setInvMsg('❌ Save failed'); } finally { setInvSaving(false); }
  };
  const handleDeleteInv = async (id) => {
    if (!confirm('Delete this plot? This cannot be undone.')) return;
    const res = await fetch(`/api/admin/plots/${id}`, { method: 'DELETE' });
    if (res.ok) reloadPlots();
  };

  const handleNotifClick = async (notif) => {
    setNotifDrawerOpen(false);
    const userId = String(staff.id || staff.username || '');
    const isRead = notif.readBy?.includes(userId) || notif._read;
    if (!isRead) {
      aFetch(`/api/admin/notifications/${notif.id}/read`, { method: 'POST' }).then(() => {
        setNotifList(prev => prev.map(x => x.id === notif.id ? { ...x, _read: true } : x));
        setUnreadCount(c => Math.max(0, c - 1));
      }).catch(() => {});
    }
    setTab('approveBookings');
    setSelectedBooking(null);
    if (bookings.length === 0) {
      setBookingsLoading(true);
      const data = await aFetch('/api/admin/bookings').then(r => r.json()).catch(() => []);
      const list = Array.isArray(data) ? data : [];
      setBookings(list);
      setBookingsLoading(false);
      const found = list.find(b => b.id === notif.bookingId);
      if (found) setSelectedBooking(found);
    } else {
      const found = bookings.find(b => b.id === notif.bookingId);
      if (found) setSelectedBooking(found);
    }
  };

  const openAnnForm = (a) => {
    setAnnMsg('');
    if (a) { setAnnEdit(a); setAnnForm({ title: a.title, body: a.body, date: a.date, tag: a.tag || '', important: !!a.important }); }
    else { setAnnEdit('new'); setAnnForm(defaultAnnForm()); }
  };
  const handleSaveAnn = async (e) => {
    e.preventDefault(); setAnnSaving(true); setAnnMsg('');
    try {
      const isNew = annEdit === 'new';
      const res = await fetch(isNew ? '/api/admin/announcements' : `/api/admin/announcements/${annEdit.id}`, {
        method: isNew ? 'POST' : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(annForm),
      });
      if (res.ok) { setAnnMsg('✅ Announcement saved'); reloadAnns(); setTimeout(() => { setAnnEdit(null); setAnnMsg(''); }, 1000); }
      else { const d = await res.json().catch(() => ({})); setAnnMsg('❌ ' + (d.error || 'Save failed')); }
    } catch { setAnnMsg('❌ Save failed'); } finally { setAnnSaving(false); }
  };
  const handleDeleteAnn = async (id) => {
    if (!confirm('Delete this announcement?')) return;
    const res = await fetch(`/api/admin/announcements/${id}`, { method: 'DELETE' });
    if (res.ok) reloadAnns();
  };

  const downloadCSV = (rows, filename) => {
    if (!rows.length) return;
    const keys = Object.keys(rows[0]);
    const csv = [keys.join(','), ...rows.map(r => keys.map(k => `"${(r[k] ?? '').toString().replace(/"/g, '""')}"`).join(','))].join('\n');
    const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(new Blob([csv], { type: 'text/csv' })), download: filename });
    a.click();
  };

  const today = new Date().toISOString().slice(0, 10);
  const pendingCount = bookings.filter(b => b.status === 'pending').length;
  const confirmedCount = bookings.filter(b => b.status === 'confirmed').length;
  const rejectedCount = bookings.filter(b => b.status === 'rejected').length;
  const totalRevenue = bookings.filter(b => b.status === 'confirmed').reduce((s, b) => s + (b.plotPrice || 0), 0);

  const monthlyStats = (() => {
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(); d.setMonth(d.getMonth() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleString('en-PK', { month: 'short', year: 'numeric' });
      const mb = bookings.filter(b => b.createdAt?.slice(0, 7) === key);
      months.push({ label, total: mb.length, confirmed: mb.filter(b => b.status === 'confirmed').length, revenue: mb.filter(b => b.status === 'confirmed').reduce((s, b) => s + (b.plotPrice || 0), 0) });
    }
    return months;
  })();

  const roleStyle = ROLE_COLOR[staff.staffRole] || ROLE_COLOR['Operations Staff'];

  if (availableTabs.length === 0) {
    return (
      <div style={{ background: '#f8fafc', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔒</div>
          <h2 style={{ marginBottom: '0.5rem' }}>No Access Assigned</h2>
          <p style={{ color: '#6b7280', marginBottom: '1.5rem' }}>Your account has no privileges assigned yet. Contact your admin.</p>
          <button className="btn btn-primary" onClick={onLogout}>Logout</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: '#f8fafc', minHeight: '100vh' }}>
      <style>{`
        @keyframes bellShake {
          0%   { transform: rotate(0deg); }
          15%  { transform: rotate(-20deg); }
          30%  { transform: rotate(20deg); }
          45%  { transform: rotate(-15deg); }
          60%  { transform: rotate(15deg); }
          75%  { transform: rotate(-8deg); }
          90%  { transform: rotate(8deg); }
          100% { transform: rotate(0deg); }
        }
        @keyframes toastSlideIn {
          from { transform: translateX(110%); opacity: 0; }
          to   { transform: translateX(0);   opacity: 1; }
        }
        @keyframes toastSlideOut {
          from { transform: translateX(0);   opacity: 1; }
          to   { transform: translateX(110%); opacity: 0; }
        }
        .bell-shake { animation: bellShake 0.6s ease-in-out; }
      `}</style>
      {liveToast && (
        <div style={{ position: 'fixed', bottom: '1.5rem', right: '1.5rem', zIndex: 9999, animation: 'toastSlideIn 0.35s ease-out', maxWidth: 340, background: '#fff', border: '1px solid #bfdbfe', borderLeft: '4px solid #0284c7', borderRadius: 12, boxShadow: '0 8px 30px rgba(0,0,0,0.14)', padding: '0.875rem 1rem', display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
          <span style={{ fontSize: '1.3rem', flexShrink: 0, marginTop: 1 }}>🔔</span>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 800, fontSize: '0.82rem', color: '#0284c7', marginBottom: '0.2rem' }}>New booking just arrived</div>
            <div style={{ fontSize: '0.78rem', color: '#374151', fontWeight: 600 }}>{liveToast.plotNumber} &nbsp;·&nbsp; {liveToast.bookingRef}</div>
            <div style={{ fontSize: '0.73rem', color: '#64748b', marginTop: '0.15rem' }}>Buyer: {liveToast.buyerName}</div>
          </div>
          <button onClick={() => setLiveToast(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: '1rem', padding: '0 0.25rem', flexShrink: 0, lineHeight: 1 }}>✕</button>
        </div>
      )}
      <div style={{ maxWidth: 1300, margin: '0 auto', padding: '2rem 1.5rem' }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.75rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
              <div style={{ width: 36, height: 36, background: 'linear-gradient(135deg, #0ea5e9, #0284c7)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem' }}>⚙️</div>
              <h1 style={{ fontSize: '1.75rem', fontWeight: 900, color: '#0f172a' }}>Staff Portal</h1>
            </div>
            <div style={{ paddingLeft: '3rem', display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <p style={{ color: '#64748b', fontSize: '0.875rem' }}>Welcome, <strong style={{ color: '#0284c7' }}>{staff?.name}</strong></p>
              {staff.staffRole && (
                <span style={{ background: roleStyle.bg, color: roleStyle.color, borderRadius: 9999, padding: '0.15rem 0.625rem', fontSize: '0.72rem', fontWeight: 700, border: `1px solid ${roleStyle.color}33` }}>
                  {staff.staffRole}
                </span>
              )}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', position: 'relative' }}>
            {privileges.approveBookings && (
              <>
                <button
                  onClick={() => setNotifDrawerOpen(o => !o)}
                  title="Notifications"
                  style={{ position: 'relative', background: notifDrawerOpen ? '#e0f2fe' : '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: 10, width: 38, height: 38, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '1.1rem', transition: 'background 0.15s' }}
                >
                  <span className={bellAnimating ? 'bell-shake' : ''} style={{ display: 'inline-block' }}>🔔</span>
                  {unreadCount > 0 && (
                    <span style={{ position: 'absolute', top: -5, right: -5, background: '#dc2626', color: '#fff', borderRadius: 9999, fontSize: '0.6rem', fontWeight: 800, padding: '0.1rem 0.35rem', minWidth: 17, textAlign: 'center', lineHeight: 1.4 }}>{unreadCount}</span>
                  )}
                </button>

                {notifDrawerOpen && (
                  <>
                    <div onClick={() => setNotifDrawerOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 999 }} />
                    <div style={{ position: 'absolute', top: '110%', right: 0, zIndex: 1000, width: 360, background: '#fff', borderRadius: 14, boxShadow: '0 8px 30px rgba(0,0,0,0.13)', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 1rem', borderBottom: '1px solid #f1f5f9', background: '#f8fafc' }}>
                        <span style={{ fontWeight: 800, fontSize: '0.875rem', color: '#0f172a' }}>
                          🔔 Notifications
                          {unreadCount > 0 && <span style={{ background: '#dc2626', color: '#fff', borderRadius: 9999, fontSize: '0.62rem', fontWeight: 800, padding: '0.1rem 0.4rem', marginLeft: '0.4rem' }}>{unreadCount} new</span>}
                        </span>
                        {unreadCount > 0 && (
                          <button onClick={() => { markAllNotifsRead(); }} style={{ background: 'none', border: '1px solid #e2e8f0', borderRadius: 7, padding: '0.2rem 0.6rem', fontSize: '0.7rem', fontWeight: 700, color: '#64748b', cursor: 'pointer' }}>Mark all read</button>
                        )}
                      </div>
                      <div style={{ maxHeight: 380, overflowY: 'auto' }}>
                        {notifList.length === 0 ? (
                          <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem' }}>
                            <div style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>🔕</div>
                            No notifications yet
                          </div>
                        ) : notifList.map(n => {
                          const userId = String(staff.id || staff.username || '');
                          const isRead = n.readBy?.includes(userId) || n._read;
                          return (
                            <div
                              key={n.id}
                              onClick={() => handleNotifClick(n)}
                              style={{ padding: '0.75rem 1rem', borderBottom: '1px solid #f8fafc', background: isRead ? '#fff' : '#f0f9ff', cursor: 'pointer', display: 'flex', gap: '0.625rem', alignItems: 'flex-start', transition: 'background 0.12s' }}
                              onMouseEnter={e => e.currentTarget.style.background = isRead ? '#f8fafc' : '#e0f2fe'}
                              onMouseLeave={e => e.currentTarget.style.background = isRead ? '#fff' : '#f0f9ff'}
                            >
                              <div style={{ marginTop: 3, flexShrink: 0 }}>
                                {isRead
                                  ? <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: '#cbd5e1' }} />
                                  : <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: '#0284c7' }} />
                                }
                              </div>
                              <div style={{ minWidth: 0, flex: 1 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '0.5rem', marginBottom: '0.2rem' }}>
                                  <span style={{ fontWeight: isRead ? 500 : 700, fontSize: '0.8rem', color: '#0f172a' }}>Ref: {n.bookingRef}</span>
                                  <span style={{ fontSize: '0.68rem', color: '#94a3b8', flexShrink: 0 }}>{new Date(n.createdAt).toLocaleString('en-PK', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                                </div>
                                <div style={{ fontSize: '0.75rem', color: '#374151', marginBottom: '0.15rem' }}>
                                  <strong>Plot:</strong> {n.plotNumber} &nbsp;·&nbsp; <strong>Buyer:</strong> {n.buyerName}
                                </div>
                                <div style={{ fontSize: '0.7rem', color: '#64748b' }}>
                                  {n.dealerName && n.dealerName !== 'Walk-in' ? `Dealer: ${n.dealerName}` : 'Walk-in customer'} &nbsp;·&nbsp; <span style={{ color: '#0284c7' }}>View booking →</span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </>
                )}
              </>
            )}
            <button className="btn btn-primary btn-sm" onClick={onLogout} style={{ background: 'rgba(220,38,38,0.9)', borderColor: 'transparent' }}>Logout</button>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.25rem', marginBottom: '1.75rem', background: '#fff', borderRadius: 14, padding: '0.375rem', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', border: '1px solid #f1f5f9', overflowX: 'auto' }}>
          {availableTabs.map(t => (
            <button key={t.key} onClick={() => { setTab(t.key); setSelectedBooking(null); setInvEdit(null); setAnnEdit(null); }} style={{
              flex: '0 0 auto', display: 'flex', alignItems: 'center', gap: '0.4rem',
              padding: '0.6rem 1.1rem', borderRadius: 10, border: 'none', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 700,
              background: tab === t.key ? 'linear-gradient(135deg, #0ea5e9, #0284c7)' : 'transparent',
              color: tab === t.key ? '#fff' : '#64748b', transition: 'all 0.15s',
            }}>
              {t.icon} {t.label}
              {t.key === 'approveBookings' && unreadCount > 0 && (
                <span style={{ background: '#dc2626', color: '#fff', borderRadius: 9999, fontSize: '0.65rem', fontWeight: 800, padding: '0.1rem 0.4rem', minWidth: 18, textAlign: 'center' }}>{unreadCount}</span>
              )}
            </button>
          ))}
        </div>

        {actionMsg && (
          <div className={actionMsg.startsWith('✅') ? 'alert alert-success' : 'alert alert-error'} style={{ marginBottom: '1.25rem' }}>{actionMsg}</div>
        )}

        {/* ─── BOOKINGS TAB ─── */}
        {tab === 'approveBookings' && (
          <div className="side-panel-layout" style={{ gridTemplateColumns: selectedBooking ? '1fr 400px' : '1fr' }}>
            <div style={{ background: '#fff', borderRadius: 16, padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', border: '1px solid #f1f5f9' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                <div>
                  <h3 style={{ fontWeight: 800, color: '#0f172a', marginBottom: '0.25rem' }}>Plot Bookings</h3>
                  <p style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Click a row to view full details. Approve or reject pending bookings.</p>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {[['All', ''], ['Pending', 'pending'], ['Confirmed', 'confirmed'], ['Rejected', 'rejected']].map(([label, val]) => (
                    <span key={label} style={{ background: val === 'pending' && pendingCount > 0 ? '#fef3c7' : '#f1f5f9', color: val === 'pending' && pendingCount > 0 ? '#92400e' : '#374151', borderRadius: 8, padding: '0.25rem 0.625rem', fontSize: '0.75rem', fontWeight: 700 }}>
                      {label}: {val ? bookings.filter(b => b.status === val).length : bookings.length}
                    </span>
                  ))}
                </div>
              </div>
              {/* ── Notification inbox ── */}
              {notifList.length > 0 && (
                <div style={{ marginBottom: '1rem', border: '1px solid #fde68a', borderRadius: 12, overflow: 'hidden' }}>
                  <div style={{ background: '#fef9c3', padding: '0.5rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#78350f' }}>🔔 Recent Notifications {unreadCount > 0 && <span style={{ background: '#dc2626', color: '#fff', borderRadius: 9999, fontSize: '0.65rem', fontWeight: 800, padding: '0.1rem 0.4rem', marginLeft: '0.3rem' }}>{unreadCount} new</span>}</span>
                    {unreadCount > 0 && <button onClick={markAllNotifsRead} style={{ background: 'none', border: '1px solid #fde68a', borderRadius: 7, padding: '0.2rem 0.6rem', fontSize: '0.7rem', fontWeight: 700, color: '#78350f', cursor: 'pointer' }}>Mark all read</button>}
                  </div>
                  <div style={{ maxHeight: 180, overflowY: 'auto' }}>
                    {notifList.slice(0, 10).map(n => {
                      const userId = String(staff.id || staff.username || '');
                      const isRead = n.readBy?.includes(userId);
                      return (
                        <div key={n.id} style={{ padding: '0.5rem 1rem', borderBottom: '1px solid #fef3c7', background: isRead ? '#fff' : '#fffbeb', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem' }}>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontSize: '0.78rem', fontWeight: isRead ? 500 : 700, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {!isRead && <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: '#dc2626', marginRight: '0.35rem', verticalAlign: 'middle' }} />}
                              {n.message}
                            </div>
                            <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '0.1rem' }}>{n.dealerName !== 'Walk-in' ? `Dealer: ${n.dealerName}` : 'Walk-in'} · {new Date(n.createdAt).toLocaleString('en-PK', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
                          </div>
                          {!isRead && <button onClick={() => aFetch(`/api/admin/notifications/${n.id}/read`, { method: 'POST' }).then(() => { setNotifList(prev => prev.map(x => x.id === n.id ? { ...x, _read: true } : x)); setUnreadCount(c => Math.max(0, c - 1)); })} style={{ background: 'none', border: '1px solid #e2e8f0', borderRadius: 6, padding: '0.15rem 0.45rem', fontSize: '0.65rem', fontWeight: 700, color: '#64748b', cursor: 'pointer', flexShrink: 0 }}>✓ Read</button>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {bookingsLoading ? <div className="loading"><div className="spinner"></div>Loading...</div> : bookings.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
                  <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>📋</div>
                  <div style={{ fontWeight: 600 }}>No bookings yet</div>
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid #f1f5f9' }}>
                        {['Ref', 'Buyer', 'Plot', 'Dealer', 'Amount', 'Date', 'Status', 'Actions'].map(h => (
                          <th key={h} style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.7rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {bookings.map(b => (
                        <tr key={b.id}
                          style={{ borderBottom: '1px solid #f8fafc', background: selectedBooking?.id === b.id ? '#f0f9ff' : b.status === 'pending' ? '#fffbeb' : 'transparent', cursor: 'pointer', borderLeft: b.status === 'pending' ? '3px solid #f59e0b' : '3px solid transparent' }}
                          onClick={() => setSelectedBooking(selectedBooking?.id === b.id ? null : b)}
                          onMouseEnter={e => { if (selectedBooking?.id !== b.id) e.currentTarget.style.background = '#f8fafc'; }}
                          onMouseLeave={e => { e.currentTarget.style.background = selectedBooking?.id === b.id ? '#f0f9ff' : 'transparent'; }}>
                          <td style={{ padding: '0.875rem', fontFamily: 'monospace', fontWeight: 700, color: '#0284c7', fontSize: '0.8rem' }}>{b.bookingRef}</td>
                          <td style={{ padding: '0.875rem' }}>
                            <div style={{ fontWeight: 700, color: '#0f172a' }}>{b.name}</div>
                            <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>{b.cnic}</div>
                          </td>
                          <td style={{ padding: '0.875rem', fontWeight: 700, color: '#1a6b3c', fontFamily: 'monospace' }}>{b.plotNumber}</td>
                          <td style={{ padding: '0.875rem', fontSize: '0.8rem', color: '#374151' }}>{b.dealerName || '—'}</td>
                          <td style={{ padding: '0.875rem', fontWeight: 700 }}>{fmt(b.plotPrice)}</td>
                          <td style={{ padding: '0.875rem', fontSize: '0.78rem', color: '#64748b' }}>{new Date(b.createdAt).toLocaleDateString('en-PK', { month: 'short', day: 'numeric', year: 'numeric' })}</td>
                          <td style={{ padding: '0.875rem' }}>
                            <span style={{ background: statusBg[b.status] || '#f1f5f9', color: statusColor[b.status] || '#374151', borderRadius: 9999, padding: '0.2rem 0.5rem', fontSize: '0.72rem', fontWeight: 700, textTransform: 'capitalize' }}>{b.status}</span>
                          </td>
                          <td style={{ padding: '0.875rem' }}>
                            {b.status === 'pending' && privileges.approveBookings && (
                              <div style={{ display: 'flex', gap: '0.375rem' }} onClick={e => e.stopPropagation()}>
                                <button onClick={() => handleApprove(b.id)} style={{ padding: '0.3rem 0.55rem', background: '#d1fae5', border: 'none', borderRadius: 7, cursor: 'pointer', fontSize: '0.72rem', fontWeight: 700, color: '#065f46' }}>✓</button>
                                <button onClick={() => { setRejectModal(b); setRejectReason(''); }} style={{ padding: '0.3rem 0.55rem', background: '#fee2e2', border: 'none', borderRadius: 7, cursor: 'pointer', fontSize: '0.72rem', fontWeight: 700, color: '#dc2626' }}>✕</button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {selectedBooking && (
              <div style={{ background: '#fff', borderRadius: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.06)', border: '1px solid #e2e8f0', position: 'sticky', top: 20, overflow: 'hidden', maxHeight: '90vh', overflowY: 'auto' }}>
                <div style={{ background: 'linear-gradient(135deg, #0ea5e9, #0284c7)', color: '#fff', padding: '1.25rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', opacity: 0.75, marginBottom: '0.2rem' }}>Booking Details</div>
                    <div style={{ fontWeight: 800, fontSize: '1.05rem' }}>{selectedBooking.bookingRef}</div>
                  </div>
                  <button onClick={() => setSelectedBooking(null)} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', borderRadius: 8, width: 30, height: 30, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
                </div>
                <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  {selectedBooking.photo && (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                      <img src={selectedBooking.photo} alt="Buyer" style={{ width: 90, height: 110, objectFit: 'cover', borderRadius: 8, border: '2px solid #e5e7eb' }} />
                      <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>Buyer Photo</div>
                    </div>
                  )}
                  <div style={{ background: '#f0fdf4', borderRadius: 10, padding: '0.875rem 1rem' }}>
                    <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#065f46', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.375rem' }}>Plot</div>
                    <div style={{ fontWeight: 800, fontSize: '1.1rem', color: '#0f172a' }}>{selectedBooking.plotNumber}</div>
                    <div style={{ fontSize: '0.8rem', color: '#374151' }}>{selectedBooking.plotSize} · {selectedBooking.area} · {fmt(selectedBooking.plotPrice)}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.625rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.4rem' }}>Buyer Information</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                      {[
                        ['Name', selectedBooking.name],
                        ['Father Name', selectedBooking.fatherName],
                        ['CNIC', selectedBooking.cnic],
                        ['Phone', selectedBooking.phone],
                        ['Email', selectedBooking.email || '—'],
                        ['Residential Address', selectedBooking.residentialAddress || selectedBooking.address || '—'],
                        ['Postal Address', selectedBooking.postalAddress || '—'],
                      ].map(([label, value]) => (
                        <div key={label} style={{ display: 'flex', gap: '0.5rem', fontSize: '0.82rem' }}>
                          <span style={{ color: '#64748b', minWidth: 110, flexShrink: 0, fontWeight: 600 }}>{label}:</span>
                          <span style={{ color: '#0f172a', fontWeight: 600 }}>{value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  {selectedBooking.nominee && (
                    <div>
                      <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.625rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.4rem' }}>Nominee Information</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                        {[
                          ['Name', selectedBooking.nominee.name],
                          ['Father Name', selectedBooking.nominee.fatherName],
                          ['CNIC', selectedBooking.nominee.cnic],
                          ['Relation', selectedBooking.nominee.relation],
                          ['Phone', selectedBooking.nominee.phone],
                          ['Address', selectedBooking.nominee.address],
                        ].map(([label, value]) => (
                          <div key={label} style={{ display: 'flex', gap: '0.5rem', fontSize: '0.82rem' }}>
                            <span style={{ color: '#64748b', minWidth: 110, flexShrink: 0, fontWeight: 600 }}>{label}:</span>
                            <span style={{ color: '#0f172a', fontWeight: 600 }}>{value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {selectedBooking.status === 'pending' && privileges.approveBookings && (
                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                      <button onClick={() => handleApprove(selectedBooking.id)} className="btn btn-primary" style={{ flex: 1, justifyContent: 'center', background: '#059669', borderColor: 'transparent' }}>✓ Approve</button>
                      <button onClick={() => { setRejectModal(selectedBooking); setRejectReason(''); }} className="btn btn-outline" style={{ flex: 1, justifyContent: 'center', color: '#dc2626', borderColor: '#dc2626' }}>✕ Reject</button>
                    </div>
                  )}
                  {selectedBooking.status !== 'pending' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      <div style={{ background: statusBg[selectedBooking.status], border: `1px solid ${statusColor[selectedBooking.status]}33`, borderRadius: 10, padding: '0.75rem 1rem', textAlign: 'center', fontWeight: 700, color: statusColor[selectedBooking.status] }}>
                        {selectedBooking.status === 'confirmed' ? '✅ Approved' : '❌ Rejected'}
                        {selectedBooking.approvedBy && <div style={{ fontSize: '0.75rem', fontWeight: 400, marginTop: '0.2rem' }}>by {selectedBooking.approvedBy}</div>}
                        {selectedBooking.rejectionReason && <div style={{ fontSize: '0.75rem', fontWeight: 400, marginTop: '0.2rem' }}>Reason: {selectedBooking.rejectionReason}</div>}
                      </div>
                      {selectedBooking.status === 'confirmed' && (
                        <button onClick={() => setShowReceipt(selectedBooking)} style={{ background: 'linear-gradient(135deg, #1d4ed8, #2563eb)', color: '#fff', border: 'none', borderRadius: 10, padding: '0.7rem 1rem', fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>🖨️ Print Receipt</button>
                      )}
                    </div>
                  )}

                  {/* ── Correct Booking Data (editBookings) ── */}
                  {privileges.editBookings && (
                    <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '1rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.625rem' }}>
                        <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.06em' }}>✏️ Correct Booking Data</div>
                        {!editBkgMode ? (
                          <button onClick={() => openEditBkg(selectedBooking)} style={{ background: '#e0f2fe', border: '1px solid #bae6fd', color: '#0369a1', borderRadius: 7, padding: '0.25rem 0.6rem', fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer' }}>✏️ Edit Form Data</button>
                        ) : (
                          <button onClick={() => { setEditBkgMode(false); setEditBkgMsg(''); }} style={{ background: '#f1f5f9', border: 'none', color: '#64748b', borderRadius: 7, padding: '0.25rem 0.6rem', fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer' }}>Cancel</button>
                        )}
                      </div>
                      {!editBkgMode ? (
                        <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>Fix typos or correct the buyer's submitted details. Use "Edit Form Data" to update name, CNIC, contact and address fields.</div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
                          {[
                            ['name', 'Name *'], ['fatherName', 'Father Name'], ['cnic', 'CNIC *'], ['phone', 'Phone *'],
                            ['email', 'Email'], ['residentialAddress', 'Residential Address'], ['postalAddress', 'Postal Address'],
                          ].map(([k, label]) => (
                            <div key={k}>
                              <div style={{ fontSize: '0.72rem', fontWeight: 600, color: '#64748b', marginBottom: '0.2rem' }}>{label}</div>
                              <input type="text" value={editBkgForm[k] || ''} onChange={e => setEditBkgForm(f => ({ ...f, [k]: e.target.value }))} style={{ width: '100%', padding: '0.45rem 0.625rem', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: '0.82rem', outline: 'none', boxSizing: 'border-box' }} onFocus={e => e.target.style.borderColor = '#0284c7'} onBlur={e => e.target.style.borderColor = '#e2e8f0'} />
                            </div>
                          ))}
                          {editBkgMsg && <div style={{ fontSize: '0.82rem', fontWeight: 600, color: editBkgMsg.startsWith('✅') ? '#059669' : '#dc2626' }}>{editBkgMsg}</div>}
                          <button onClick={() => handleSaveBooking(selectedBooking)} disabled={editBkgSaving} style={{ background: editBkgSaving ? '#94a3b8' : '#0284c7', color: '#fff', border: 'none', borderRadius: 10, padding: '0.65rem 1rem', fontWeight: 700, cursor: editBkgSaving ? 'not-allowed' : 'pointer', fontSize: '0.875rem' }}>
                            {editBkgSaving ? 'Saving...' : '💾 Save Corrections'}
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* ── Installment Ledger (viewLedger) ── */}
                  {privileges.viewLedger && (
                    <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '1rem' }}>
                      <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.625rem' }}>📒 Installment Ledger</div>
                      {ledgerLoading ? (
                        <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Loading ledger...</div>
                      ) : !ledger || !ledger.ledger || ledger.ledger.length === 0 ? (
                        <div style={{ fontSize: '0.78rem', color: '#94a3b8', fontStyle: 'italic' }}>No installment schedule yet. A ledger is generated once the booking is confirmed.</div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                          {ledger.summary && (
                            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                              {[
                                ['Paid', ledger.summary.paidCount ?? ledger.summary.paid, '#059669', '#d1fae5'],
                                ['Due', ledger.summary.dueCount ?? ledger.summary.pending, '#d97706', '#fef3c7'],
                                ['Overdue', ledger.summary.overdueCount ?? ledger.summary.overdue, '#dc2626', '#fee2e2'],
                              ].map(([label, val, c, bg]) => (
                                <span key={label} style={{ background: bg, color: c, borderRadius: 8, padding: '0.2rem 0.55rem', fontSize: '0.72rem', fontWeight: 700 }}>{label}: {val ?? 0}</span>
                              ))}
                            </div>
                          )}
                          <div style={{ maxHeight: 220, overflowY: 'auto', border: '1px solid #f1f5f9', borderRadius: 8 }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem' }}>
                              <thead>
                                <tr style={{ borderBottom: '1px solid #f1f5f9', background: '#f8fafc' }}>
                                  {['#', 'Due Date', 'Amount', 'Status'].map(h => <th key={h} style={{ padding: '0.4rem 0.5rem', textAlign: 'left', fontWeight: 700, color: '#64748b' }}>{h}</th>)}
                                </tr>
                              </thead>
                              <tbody>
                                {ledger.ledger.map((it, i) => (
                                  <tr key={it.id ?? i} style={{ borderBottom: '1px solid #f8fafc' }}>
                                    <td style={{ padding: '0.4rem 0.5rem', color: '#94a3b8' }}>{it.installmentNo ?? it.no ?? (i + 1)}</td>
                                    <td style={{ padding: '0.4rem 0.5rem', color: '#374151' }}>{it.dueDate || '—'}</td>
                                    <td style={{ padding: '0.4rem 0.5rem', fontWeight: 700 }}>PKR {Number(it.amount || 0).toLocaleString('en-US')}</td>
                                    <td style={{ padding: '0.4rem 0.5rem' }}>
                                      <span style={{ background: statusBg[it.status === 'paid' ? 'confirmed' : it.status === 'overdue' ? 'rejected' : 'pending'], color: statusColor[it.status === 'paid' ? 'confirmed' : it.status === 'overdue' ? 'rejected' : 'pending'], borderRadius: 6, padding: '0.1rem 0.4rem', fontWeight: 700, textTransform: 'capitalize' }}>{it.status}</span>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* ── Payment Plan Section ── */}
                  {privileges.approveBookings && (
                  <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.625rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.06em' }}>💰 Payment Plan</div>
                        {selectedBooking.paymentPlanHistory?.length > 0 && (
                          <span style={{ background: '#fef3c7', border: '1px solid #fde68a', color: '#92400e', borderRadius: 9999, fontSize: '0.62rem', fontWeight: 800, padding: '0.1rem 0.45rem' }}>✏️ Modified</span>
                        )}
                      </div>
                      {privileges.approveBookings && (!ppEditMode ? (
                        <button onClick={() => openPpEdit(selectedBooking)} style={{ background: '#fef3c7', border: '1px solid #fde68a', color: '#92400e', borderRadius: 7, padding: '0.25rem 0.6rem', fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer' }}>✏️ Negotiate Terms</button>
                      ) : (
                        <button onClick={() => { setPpEditMode(false); setPpEditMsg(''); }} style={{ background: '#f1f5f9', border: 'none', color: '#64748b', borderRadius: 7, padding: '0.25rem 0.6rem', fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer' }}>Cancel</button>
                      ))}
                    </div>
                    {!ppEditMode ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                        {selectedBooking.paymentPlanOverride ? (
                          <>
                            {[
                              ['Negotiated Price', `PKR ${Number(selectedBooking.paymentPlanOverride.negotiatedPrice).toLocaleString('en-US')}`],
                              ['Down Payment (10%)', `PKR ${Number(selectedBooking.paymentPlanOverride.downPayment).toLocaleString('en-US')}`],
                              ['Monthly Installment', `PKR ${Number(selectedBooking.paymentPlanOverride.installmentAmount).toLocaleString('en-US')}`],
                              ['Confirmation Due', `${selectedBooking.paymentPlanOverride.confirmationDueDays} days after booking`],
                              ['Installments Start', `Month ${selectedBooking.paymentPlanOverride.installmentStartMonths}`],
                            ].map(([label, value]) => (
                              <div key={label} style={{ display: 'flex', gap: '0.5rem', fontSize: '0.8rem' }}>
                                <span style={{ color: '#64748b', minWidth: 130, flexShrink: 0, fontWeight: 600 }}>{label}:</span>
                                <span style={{ color: '#0f172a', fontWeight: 700 }}>{value}</span>
                              </div>
                            ))}
                            <div style={{ background: '#fef9c3', border: '1px solid #fde68a', borderRadius: 7, padding: '0.4rem 0.625rem', fontSize: '0.78rem', color: '#78350f', marginTop: '0.25rem' }}>
                              📝 {selectedBooking.paymentPlanOverride.notes}
                            </div>
                            <div style={{ fontSize: '0.68rem', color: '#94a3b8' }}>
                              Last modified by {selectedBooking.paymentPlanOverride.changedBy} · {new Date(selectedBooking.paymentPlanOverride.changedAt).toLocaleDateString('en-PK', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </div>
                          </>
                        ) : (
                          <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Standard plan for {selectedBooking.plotSize}. Click "Negotiate Terms" to record a custom negotiated price and installment terms.</div>
                        )}
                        {selectedBooking.paymentPlanHistory?.length > 1 && (
                          <details style={{ marginTop: '0.4rem' }}>
                            <summary style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', cursor: 'pointer', userSelect: 'none' }}>
                              📋 View change history ({selectedBooking.paymentPlanHistory.length} entries)
                            </summary>
                            <div style={{ marginTop: '0.4rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                              {[...selectedBooking.paymentPlanHistory].reverse().map((h, idx) => (
                                <div key={idx} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '0.5rem 0.75rem', fontSize: '0.75rem' }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
                                    <span style={{ fontWeight: 700, color: '#374151' }}>PKR {Number(h.updated?.negotiatedPrice ?? h.negotiatedPrice).toLocaleString('en-US')}</span>
                                    <span style={{ color: '#94a3b8' }}>{new Date(h.changedAt).toLocaleDateString('en-PK', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                                  </div>
                                  <div style={{ color: '#64748b' }}>Monthly: PKR {Number(h.updated?.installmentAmount ?? h.installmentAmount).toLocaleString('en-US')} · Start month {h.updated?.installmentStartMonths ?? h.installmentStartMonths}</div>
                                  <div style={{ color: '#78350f', fontStyle: 'italic', marginTop: '0.15rem' }}>{h.notes}</div>
                                  <div style={{ color: '#94a3b8', fontSize: '0.68rem', marginTop: '0.1rem' }}>by {h.changedBy}</div>
                                </div>
                              ))}
                            </div>
                          </details>
                        )}
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                        <div>
                          <div style={{ fontSize: '0.72rem', fontWeight: 600, color: '#64748b', marginBottom: '0.2rem' }}>Negotiated Total Price (PKR) <span style={{ color: '#dc2626' }}>*</span> <span style={{ fontWeight: 400, color: '#94a3b8' }}>(max: PKR {(selectedBooking.originalPlotPrice || selectedBooking.plotPrice).toLocaleString('en-US')} — downward only)</span></div>
                          <input type="number" value={ppEditForm.negotiatedPrice || ''} onChange={e => setPpEditForm(f => ({ ...f, negotiatedPrice: e.target.value }))} placeholder="e.g. 3800000" style={{ width: '100%', padding: '0.45rem 0.625rem', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: '0.82rem', outline: 'none', boxSizing: 'border-box' }} onFocus={e => e.target.style.borderColor = '#d97706'} onBlur={e => e.target.style.borderColor = '#e2e8f0'} />
                          {ppEditForm.negotiatedPrice && Number(ppEditForm.negotiatedPrice) > 0 && (
                            <div style={{ fontSize: '0.72rem', color: '#059669', fontWeight: 600, marginTop: '0.25rem' }}>
                              → Down Payment (10%): PKR {Math.round(Number(ppEditForm.negotiatedPrice) * 0.10).toLocaleString('en-US')} &nbsp;·&nbsp; Monthly installment: PKR {(Math.round(Number(ppEditForm.negotiatedPrice) * 0.60 / 48 * 100) / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                            </div>
                          )}
                        </div>
                        {(() => {
                          const customAmt = ppEditForm.installmentAmount && Number(ppEditForm.installmentAmount) > 0;
                          const price = Number(ppEditForm.negotiatedPrice) || 0;
                          const defaultAmt = price > 0 ? Math.round(price * 0.60 / 48 * 100) / 100 : 0;
                          const instErr = customAmt && price > 0 && Math.abs(Number(ppEditForm.installmentAmount) * 48 - price * 0.60) > 1;
                          return (
                            <div>
                              <div style={{ fontSize: '0.72rem', fontWeight: 600, color: '#64748b', marginBottom: '0.2rem' }}>Monthly Installment (PKR) — leave blank for auto</div>
                              <input type="number" value={ppEditForm.installmentAmount || ''} onChange={e => setPpEditForm(f => ({ ...f, installmentAmount: e.target.value }))} placeholder={price > 0 ? `Auto: PKR ${defaultAmt.toLocaleString('en-US')}` : 'Auto-calculated from 60% / 48 months'} style={{ width: '100%', padding: '0.45rem 0.625rem', border: `1.5px solid ${instErr ? '#dc2626' : '#e2e8f0'}`, borderRadius: 8, fontSize: '0.82rem', outline: 'none', boxSizing: 'border-box' }} onFocus={e => e.target.style.borderColor = instErr ? '#dc2626' : '#d97706'} onBlur={e => e.target.style.borderColor = instErr ? '#dc2626' : '#e2e8f0'} />
                              {instErr && <div style={{ fontSize: '0.7rem', color: '#dc2626', marginTop: '0.2rem', fontWeight: 600 }}>⚠️ Amount × 48 must equal 60% of negotiated price within ±1 PKR. Use PKR {defaultAmt.toLocaleString('en-US')}/month</div>}
                            </div>
                          );
                        })()}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>
                          <div>
                            <div style={{ fontSize: '0.72rem', fontWeight: 600, color: '#64748b', marginBottom: '0.2rem' }}>Confirmation Due (days)</div>
                            <input type="number" value={ppEditForm.confirmationDueDays || ''} onChange={e => setPpEditForm(f => ({ ...f, confirmationDueDays: e.target.value }))} placeholder="30" style={{ width: '100%', padding: '0.45rem 0.625rem', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: '0.82rem', outline: 'none', boxSizing: 'border-box' }} onFocus={e => e.target.style.borderColor = '#d97706'} onBlur={e => e.target.style.borderColor = '#e2e8f0'} />
                          </div>
                          <div>
                            <div style={{ fontSize: '0.72rem', fontWeight: 600, color: '#64748b', marginBottom: '0.2rem' }}>Installments Start (month)</div>
                            <input type="number" value={ppEditForm.installmentStartMonths || ''} onChange={e => setPpEditForm(f => ({ ...f, installmentStartMonths: e.target.value }))} placeholder="1" style={{ width: '100%', padding: '0.45rem 0.625rem', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: '0.82rem', outline: 'none', boxSizing: 'border-box' }} onFocus={e => e.target.style.borderColor = '#d97706'} onBlur={e => e.target.style.borderColor = '#e2e8f0'} />
                          </div>
                        </div>
                        <div>
                          <div style={{ fontSize: '0.72rem', fontWeight: 600, color: '#64748b', marginBottom: '0.2rem' }}>Negotiation Notes <span style={{ color: '#dc2626' }}>*</span> <span style={{ fontWeight: 400 }}>(required — describe what was agreed)</span></div>
                          <textarea value={ppEditForm.notes || ''} onChange={e => setPpEditForm(f => ({ ...f, notes: e.target.value }))} placeholder="e.g. Client requested reduced monthly installments in exchange for higher down payment. Manager approved on 2026-06-21." rows={3} style={{ width: '100%', padding: '0.45rem 0.625rem', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: '0.82rem', outline: 'none', boxSizing: 'border-box', resize: 'vertical', fontFamily: 'inherit' }} onFocus={e => e.target.style.borderColor = '#d97706'} onBlur={e => e.target.style.borderColor = '#e2e8f0'} />
                        </div>
                        {selectedBooking.status === 'confirmed' && (
                          <div style={{ background: '#fef3c7', border: '1px solid #fde68a', borderRadius: 8, padding: '0.5rem 0.75rem', fontSize: '0.75rem', color: '#92400e' }}>
                            ⚠️ Booking is confirmed. Saving regenerates the payment ledger — already paid installments are preserved.
                          </div>
                        )}
                        {ppEditMsg && <div style={{ fontSize: '0.82rem', fontWeight: 600, color: ppEditMsg.startsWith('✅') ? '#059669' : '#dc2626' }}>{ppEditMsg}</div>}
                        {(() => {
                          const customAmt = ppEditForm.installmentAmount && Number(ppEditForm.installmentAmount) > 0;
                          const price = Number(ppEditForm.negotiatedPrice) || 0;
                          const instOk = !customAmt || !price || Math.abs(Number(ppEditForm.installmentAmount) * 48 - price * 0.60) <= 1;
                          const saveDisabled = ppEditSaving || !instOk;
                          return (
                            <button onClick={() => handleSavePaymentPlan(selectedBooking)} disabled={saveDisabled} style={{ background: saveDisabled ? '#94a3b8' : '#d97706', color: '#fff', border: 'none', borderRadius: 10, padding: '0.65rem 1rem', fontWeight: 700, cursor: saveDisabled ? 'not-allowed' : 'pointer', fontSize: '0.875rem' }}>
                              {ppEditSaving ? 'Saving...' : '💾 Save Negotiated Terms'}
                            </button>
                          );
                        })()}
                      </div>
                    )}
                  </div>
                  )}

                  {/* Exchange Asset */}
                  {privileges.approveBookings && (
                  <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
                      <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                        🔄 Exchange / Commodity
                        {selectedBooking.exchangeAsset && <span style={{ fontWeight: 600, fontSize: '0.68rem', color: '#059669', textTransform: 'none', background: '#d1fae5', borderRadius: 6, padding: '0.1rem 0.4rem', marginLeft: '0.4rem' }}>✓ Recorded</span>}
                      </div>
                      {privileges.approveBookings && (
                      <button onClick={() => { setExEditMode(m => !m); setExEditForm(selectedBooking.exchangeAsset ? { ...selectedBooking.exchangeAsset } : { assetType: 'property', description: '', agreedValue: '', notes: '' }); setExEditMsg(''); }} style={{ background: 'none', border: '1px solid #e2e8f0', borderRadius: 8, padding: '0.25rem 0.6rem', fontSize: '0.72rem', cursor: 'pointer', color: '#64748b', fontWeight: 600 }}>
                        {exEditMode ? '✕ Cancel' : selectedBooking.exchangeAsset ? '✏️ Edit' : '+ Record'}
                      </button>
                      )}
                    </div>
                    {!exEditMode && selectedBooking.exchangeAsset ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', fontSize: '0.82rem' }}>
                        {[
                          ['Type', selectedBooking.exchangeAsset.assetType?.charAt(0).toUpperCase() + selectedBooking.exchangeAsset.assetType?.slice(1)],
                          ['Description', selectedBooking.exchangeAsset.description],
                          ['Agreed Value', 'PKR ' + Number(selectedBooking.exchangeAsset.agreedValue).toLocaleString('en-US')],
                          ['Remarks', selectedBooking.exchangeAsset.notes || '—'],
                          ['Recorded by', selectedBooking.exchangeAsset.recordedBy + ' · ' + new Date(selectedBooking.exchangeAsset.recordedAt).toLocaleDateString('en-PK', { month: 'short', day: 'numeric', year: 'numeric' })],
                        ].map(([k, v]) => (
                          <div key={k} style={{ display: 'flex', gap: '0.5rem' }}>
                            <span style={{ color: '#64748b', minWidth: 90, flexShrink: 0, fontWeight: 600 }}>{k}:</span>
                            <span style={{ color: '#0f172a', fontWeight: 600 }}>{v}</span>
                          </div>
                        ))}
                        <div style={{ marginTop: '0.3rem', background: '#eff6ff', borderRadius: 8, padding: '0.4rem 0.65rem', fontSize: '0.75rem', color: '#1d4ed8' }}>
                          Remaining to settle in installments: PKR {Math.max(0, (selectedBooking.originalPlotPrice || selectedBooking.plotPrice) - selectedBooking.exchangeAsset.agreedValue).toLocaleString('en-US')}
                        </div>
                      </div>
                    ) : !exEditMode ? (
                      <div style={{ fontSize: '0.78rem', color: '#94a3b8', fontStyle: 'italic' }}>No exchange asset recorded. Use "+ Record" to enter a commodity/property exchange agreement.</div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                        <div>
                          <div style={{ fontSize: '0.72rem', fontWeight: 600, color: '#64748b', marginBottom: '0.2rem' }}>Asset Type</div>
                          <select value={exEditForm.assetType || 'other'} onChange={e => setExEditForm(f => ({ ...f, assetType: e.target.value }))} style={{ width: '100%', padding: '0.45rem 0.625rem', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: '0.82rem', outline: 'none', background: '#fff' }}>
                            {[['property', 'Property / Land'], ['vehicle', 'Vehicle'], ['jewelry', 'Jewelry / Ornaments'], ['gold', 'Gold / Precious Metal'], ['other', 'Other Asset']].map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                          </select>
                        </div>
                        <div>
                          <div style={{ fontSize: '0.72rem', fontWeight: 600, color: '#64748b', marginBottom: '0.2rem' }}>Asset Description <span style={{ color: '#dc2626' }}>*</span></div>
                          <input type="text" value={exEditForm.description || ''} onChange={e => setExEditForm(f => ({ ...f, description: e.target.value }))} placeholder="e.g. 5 Marla residential plot in Block C, City Housing" style={{ width: '100%', padding: '0.45rem 0.625rem', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: '0.82rem', outline: 'none', boxSizing: 'border-box' }} />
                        </div>
                        <div>
                          <div style={{ fontSize: '0.72rem', fontWeight: 600, color: '#64748b', marginBottom: '0.2rem' }}>Agreed / Appraised Value (PKR) <span style={{ color: '#dc2626' }}>*</span></div>
                          <input type="number" value={exEditForm.agreedValue || ''} onChange={e => setExEditForm(f => ({ ...f, agreedValue: e.target.value }))} placeholder="e.g. 2500000" style={{ width: '100%', padding: '0.45rem 0.625rem', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: '0.82rem', outline: 'none', boxSizing: 'border-box' }} />
                          {exEditForm.agreedValue && Number(exEditForm.agreedValue) > 0 && (
                            <div style={{ fontSize: '0.72rem', color: '#059669', fontWeight: 600, marginTop: '0.25rem' }}>
                              → Remaining after exchange: PKR {Math.max(0, (selectedBooking.originalPlotPrice || selectedBooking.plotPrice) - Number(exEditForm.agreedValue)).toLocaleString('en-US')} to settle in installments
                            </div>
                          )}
                        </div>
                        <div>
                          <div style={{ fontSize: '0.72rem', fontWeight: 600, color: '#64748b', marginBottom: '0.2rem' }}>Remarks / Appraisal Notes</div>
                          <textarea value={exEditForm.notes || ''} onChange={e => setExEditForm(f => ({ ...f, notes: e.target.value }))} placeholder="e.g. Market value assessed by independent assessor. Transfer deed to be submitted within 30 days." rows={3} style={{ width: '100%', padding: '0.45rem 0.625rem', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: '0.82rem', outline: 'none', boxSizing: 'border-box', resize: 'vertical', fontFamily: 'inherit' }} />
                        </div>
                        {exEditMsg && <div style={{ fontSize: '0.82rem', fontWeight: 600, color: exEditMsg.startsWith('✅') ? '#059669' : '#dc2626' }}>{exEditMsg}</div>}
                        <button onClick={() => handleSaveExchangeAsset(selectedBooking)} disabled={exEditSaving} style={{ background: exEditSaving ? '#94a3b8' : '#0284c7', color: '#fff', border: 'none', borderRadius: 10, padding: '0.65rem 1rem', fontWeight: 700, cursor: exEditSaving ? 'not-allowed' : 'pointer', fontSize: '0.875rem' }}>
                          {exEditSaving ? 'Saving...' : '💾 Save Exchange Record'}
                        </button>
                      </div>
                    )}
                  </div>
                  )}

                  {/* ── Audit Trail ── */}
                  <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '1rem' }}>
                    <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.625rem' }}>🔍 Audit Trail</div>

                    {/* Mark as Checked button — editBookings priv, pending, not yet checked */}
                    {privileges.editBookings && selectedBooking.status === 'pending' && !selectedBooking.checkedBy && (
                      <button onClick={() => handleMarkChecked(selectedBooking)} disabled={checkingSaving} style={{ marginBottom: '0.75rem', width: '100%', background: checkingSaving ? '#94a3b8' : '#fef9c3', border: '1px solid #fde68a', color: '#92400e', borderRadius: 10, padding: '0.6rem 1rem', fontWeight: 700, cursor: checkingSaving ? 'not-allowed' : 'pointer', fontSize: '0.82rem' }}>
                        {checkingSaving ? 'Saving...' : '✅ Mark as Checked — I have reviewed this booking'}
                      </button>
                    )}
                    {selectedBooking.checkedBy && (
                      <div style={{ marginBottom: '0.625rem', background: '#fef9c3', border: '1px solid #fde68a', borderRadius: 8, padding: '0.4rem 0.75rem', fontSize: '0.78rem', color: '#78350f', fontWeight: 600 }}>
                        ✅ Checked by <strong>{selectedBooking.checkedBy}</strong> · {new Date(selectedBooking.checkedAt).toLocaleDateString('en-PK', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </div>
                    )}

                    {(selectedBooking.auditLog?.length > 0) ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
                        {(selectedBooking.auditLog || []).map((entry, i) => {
                          const colors = { submitted: { bg: '#eff6ff', dot: '#3b82f6', label: 'Submitted' }, checked: { bg: '#fef9c3', dot: '#d97706', label: 'Checked' }, approved: { bg: '#f0fdf4', dot: '#059669', label: 'Approved' }, rejected: { bg: '#fef2f2', dot: '#dc2626', label: 'Rejected' } };
                          const c = colors[entry.action] || { bg: '#f8fafc', dot: '#94a3b8', label: entry.action };
                          return (
                            <div key={i} style={{ display: 'flex', gap: '0.625rem', alignItems: 'flex-start', paddingBottom: '0.625rem' }}>
                              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                                <div style={{ width: 10, height: 10, borderRadius: '50%', background: c.dot, marginTop: 3 }} />
                                {i < (selectedBooking.auditLog || []).length - 1 && <div style={{ width: 2, flex: 1, minHeight: 16, background: '#e2e8f0', marginTop: 2 }} />}
                              </div>
                              <div style={{ background: c.bg, borderRadius: 8, padding: '0.35rem 0.625rem', flex: 1, minWidth: 0 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
                                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: c.dot }}>{c.label}</span>
                                  <span style={{ fontSize: '0.68rem', color: '#94a3b8', flexShrink: 0 }}>{new Date(entry.at).toLocaleDateString('en-PK', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                                </div>
                                <div style={{ fontSize: '0.72rem', color: '#374151', marginTop: '0.1rem' }}>by <strong>{entry.by}</strong>{entry.byRole && entry.byRole !== entry.by && <span style={{ color: '#94a3b8', fontWeight: 400 }}> · {entry.byRole}</span>}</div>
                                {entry.note && <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '0.1rem', fontStyle: 'italic' }}>{entry.note}</div>}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div style={{ fontSize: '0.78rem', color: '#94a3b8', fontStyle: 'italic' }}>No audit log entries yet (older bookings). New bookings will show the full trail.</div>
                    )}
                  </div>

                </div>
              </div>
            )}
          </div>
        )}

        {/* ─── PLOTS TAB ─── */}
        {tab === 'viewPlots' && (
          <div style={{ background: '#fff', borderRadius: 16, padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', border: '1px solid #f1f5f9' }}>
            <div style={{ marginBottom: '1.25rem' }}>
              <h3 style={{ fontWeight: 800, color: '#0f172a', marginBottom: '0.25rem' }}>Plot Inventory</h3>
              <p style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{plots.length} plots total — read-only view</p>
            </div>
            {plotsLoading ? <div className="loading"><div className="spinner"></div>Loading...</div> : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #f1f5f9' }}>
                      {['Plot', 'Area', 'Size', 'Category', 'Price', 'Status'].map(h => (
                        <th key={h} style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.7rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
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
                          <span style={{ background: p.status === 'available' ? '#d1fae5' : p.status === 'booked' ? '#fef3c7' : '#fee2e2', color: p.status === 'available' ? '#065f46' : p.status === 'booked' ? '#92400e' : '#dc2626', borderRadius: 9999, padding: '0.2rem 0.5rem', fontSize: '0.72rem', fontWeight: 700, textTransform: 'capitalize' }}>{p.status}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ─── MANAGE INVENTORY TAB ─── */}
        {tab === 'manageInventory' && (
          <div className="side-panel-layout" style={{ gridTemplateColumns: invEdit ? '1fr 370px' : '1fr' }}>
            <div style={{ background: '#fff', borderRadius: 16, padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', border: '1px solid #f1f5f9' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                <div>
                  <h3 style={{ fontWeight: 800, color: '#0f172a', marginBottom: '0.25rem' }}>Plot Inventory Management</h3>
                  <p style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{plots.length} plots — add, edit, or remove plots</p>
                </div>
                <button className="btn btn-primary btn-sm" onClick={() => openInvForm(null)}>+ Add Plot</button>
              </div>
              {plotsLoading ? <div className="loading"><div className="spinner"></div>Loading...</div> : plots.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
                  <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>🏘️</div>
                  <div style={{ fontWeight: 600 }}>No plots yet</div>
                </div>
              ) : (
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
                        <tr key={p.id} style={{ borderBottom: '1px solid #f8fafc', background: invEdit?.id === p.id ? '#f0f9ff' : 'transparent' }}
                          onMouseEnter={e => { if (invEdit?.id !== p.id) e.currentTarget.style.background = '#f8fafc'; }}
                          onMouseLeave={e => { e.currentTarget.style.background = invEdit?.id === p.id ? '#f0f9ff' : 'transparent'; }}>
                          <td style={{ padding: '0.875rem', fontWeight: 700, color: '#1a6b3c', fontFamily: 'monospace' }}>{p.number}</td>
                          <td style={{ padding: '0.875rem', color: '#374151' }}>{p.area}</td>
                          <td style={{ padding: '0.875rem', color: '#374151' }}>{p.size}</td>
                          <td style={{ padding: '0.875rem', color: '#64748b', textTransform: 'capitalize', fontSize: '0.8rem' }}>{p.category}</td>
                          <td style={{ padding: '0.875rem', fontWeight: 700 }}>{fmt(p.price)}</td>
                          <td style={{ padding: '0.875rem' }}>
                            <span style={{ background: p.status === 'available' ? '#d1fae5' : p.status === 'booked' ? '#fef3c7' : '#fee2e2', color: p.status === 'available' ? '#065f46' : p.status === 'booked' ? '#92400e' : '#dc2626', borderRadius: 9999, padding: '0.2rem 0.5rem', fontSize: '0.72rem', fontWeight: 700, textTransform: 'capitalize' }}>{p.status}</span>
                          </td>
                          <td style={{ padding: '0.875rem' }}>
                            <div style={{ display: 'flex', gap: '0.375rem' }}>
                              <button onClick={() => openInvForm(p)} style={{ padding: '0.3rem 0.55rem', background: '#f1f5f9', border: 'none', borderRadius: 7, cursor: 'pointer', fontSize: '0.72rem', fontWeight: 700, color: '#374151' }}>✏️</button>
                              {p.status === 'available' && <button onClick={() => handleDeleteInv(p.id)} style={{ padding: '0.3rem 0.55rem', background: '#fef2f2', border: 'none', borderRadius: 7, cursor: 'pointer', fontSize: '0.72rem', fontWeight: 700, color: '#dc2626' }}>🗑️</button>}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            {invEdit && (
              <div style={{ background: '#fff', borderRadius: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.06)', border: '1px solid #e2e8f0', position: 'sticky', top: 80, overflow: 'hidden' }}>
                <div style={{ background: 'linear-gradient(135deg, #059669, #047857)', color: '#fff', padding: '1.25rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontWeight: 800, fontSize: '1.05rem' }}>{invEdit === 'new' ? 'Add New Plot' : `Edit — ${invEdit.number}`}</div>
                  <button onClick={() => { setInvEdit(null); setInvMsg(''); }} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', borderRadius: 8, width: 30, height: 30, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
                </div>
                <form onSubmit={handleSaveInv} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div className="form-group"><label>Plot Number</label><input required value={invForm.number} onChange={e => setInvForm(f => ({ ...f, number: e.target.value }))} placeholder="e.g. A-101" /></div>
                  <div className="form-group"><label>Area / Block</label><input required value={invForm.area} onChange={e => setInvForm(f => ({ ...f, area: e.target.value }))} placeholder="e.g. Block A" /></div>
                  <div className="form-group"><label>Size</label>
                    <select value={invForm.size} onChange={e => setInvForm(f => ({ ...f, size: e.target.value }))}>
                      {PLOT_SIZES.map(s => <option key={s}>{s}</option>)}
                    </select>
                  </div>
                  <div className="form-group"><label>Category</label>
                    <select value={invForm.category} onChange={e => setInvForm(f => ({ ...f, category: e.target.value }))}>
                      {PLOT_CATS.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
                    </select>
                  </div>
                  <div className="form-group"><label>Price (PKR)</label><input required type="number" value={invForm.price} onChange={e => setInvForm(f => ({ ...f, price: e.target.value }))} placeholder="e.g. 5000000" /></div>
                  <div className="form-group"><label>Status</label>
                    <select value={invForm.status} onChange={e => setInvForm(f => ({ ...f, status: e.target.value }))}>
                      {PLOT_STATUSES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                    </select>
                  </div>
                  {invMsg && <div className={invMsg.startsWith('✅') ? 'alert alert-success' : 'alert alert-error'} style={{ fontSize: '0.85rem' }}>{invMsg}</div>}
                  <button type="submit" className="btn btn-primary" disabled={invSaving} style={{ justifyContent: 'center', padding: '0.75rem', background: '#059669' }}>
                    {invSaving ? <><div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }}></div> Saving...</> : '✓ Save Plot'}
                  </button>
                </form>
              </div>
            )}
          </div>
        )}

        {/* ─── DEALERS TAB ─── */}
        {tab === 'viewDealers' && (
          <div style={{ background: '#fff', borderRadius: 16, padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', border: '1px solid #f1f5f9' }}>
            <div style={{ marginBottom: '1.25rem' }}>
              <h3 style={{ fontWeight: 800, color: '#0f172a', marginBottom: '0.25rem' }}>Dealers & Targets</h3>
              <p style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{dealers.length} dealers — read-only view</p>
            </div>
            {dealersLoading ? <div className="loading"><div className="spinner"></div>Loading...</div> : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #f1f5f9' }}>
                      {['Dealer', 'Package', 'Target', 'Achieved', 'Progress', 'Deposit'].map(h => (
                        <th key={h} style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.7rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {dealers.map(d => {
                      const pct = d.totalTarget > 0 ? Math.min(100, Math.round((d.achieved / d.totalTarget) * 100)) : 0;
                      return (
                        <tr key={d.id} style={{ borderBottom: '1px solid #f8fafc' }}
                          onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
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
                            {d.packageName ? <span style={{ background: '#eff6ff', color: '#1d4ed8', borderRadius: 6, padding: '0.2rem 0.5rem', fontSize: '0.75rem', fontWeight: 700 }}>{d.packageName}</span> : <span style={{ color: '#e5e7eb' }}>—</span>}
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
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ─── DEALS TAB ─── */}
        {tab === 'viewDeals' && (
          <div>
            <div style={{ marginBottom: '1.25rem' }}>
              <h3 style={{ fontWeight: 800, color: '#0f172a', marginBottom: '0.25rem' }}>Special Deals & Offers</h3>
              <p style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Read-only view of all deals</p>
            </div>
            {dealsLoading ? <div className="loading"><div className="spinner"></div>Loading...</div> : deals.length === 0 ? (
              <div style={{ background: '#fff', borderRadius: 16, padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>No deals available</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {deals.map(d => {
                  const isActive = d.validFrom <= today && d.validUntil >= today;
                  return (
                    <div key={d.id} style={{ background: '#fff', borderRadius: 16, padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', border: `1.5px solid ${isActive && d.highlighted ? '#fcd34d' : '#f1f5f9'}` }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
                        <div>
                          <div style={{ fontWeight: 800, fontSize: '1rem', color: '#0f172a', marginBottom: '0.25rem' }}>{d.highlighted && '⭐ '}{d.name}</div>
                          <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{d.validFrom} → {d.validUntil}</div>
                        </div>
                        <span style={{ background: isActive ? '#d1fae5' : '#f1f5f9', color: isActive ? '#065f46' : '#64748b', borderRadius: 9999, padding: '0.2rem 0.625rem', fontSize: '0.72rem', fontWeight: 700 }}>{isActive ? '● Active' : 'Expired'}</span>
                      </div>
                      {d.description && <div style={{ fontSize: '0.85rem', color: '#374151', marginBottom: '0.75rem', lineHeight: 1.6 }}>{d.description}</div>}
                      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                        {d.specialPrice && <span style={{ background: '#f0fdf4', color: '#065f46', borderRadius: 8, padding: '0.3rem 0.75rem', fontSize: '0.8rem', fontWeight: 700, border: '1px solid #bbf7d0' }}>Special: {fmt(d.specialPrice)}</span>}
                        {d.plotIds?.length > 0 && <span style={{ background: '#f0f9ff', color: '#0369a1', borderRadius: 8, padding: '0.3rem 0.75rem', fontSize: '0.8rem', fontWeight: 700, border: '1px solid #bae6fd' }}>{d.plotIds.length} plot(s)</span>}
                        {d.paymentPlanInfo && <span style={{ background: '#fefce8', color: '#854d0e', borderRadius: 8, padding: '0.3rem 0.75rem', fontSize: '0.8rem', fontWeight: 600, border: '1px solid #fef08a' }}>💳 {d.paymentPlanInfo}</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ─── REGISTRATIONS TAB ─── */}
        {tab === 'viewRegistrations' && (
          <div style={{ background: '#fff', borderRadius: 16, padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', border: '1px solid #f1f5f9' }}>
            <div style={{ marginBottom: '1.25rem' }}>
              <h3 style={{ fontWeight: 800, color: '#0f172a', marginBottom: '0.25rem' }}>Dealer Registration Requests</h3>
              <p style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Read-only view of submitted applications</p>
            </div>
            {regsLoading ? <div className="loading"><div className="spinner"></div>Loading...</div> : regs.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>No registration requests yet</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {regs.map(r => (
                  <div key={r.id} style={{ border: `1.5px solid ${r.status === 'approved' ? '#bbf7d0' : '#fed7aa'}`, borderRadius: 12, padding: '1.25rem', background: r.status === 'approved' ? '#f0fdf4' : '#fffbeb' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', marginBottom: '0.875rem', flexWrap: 'wrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                        <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'linear-gradient(135deg, #7c3aed, #a855f7)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: '0.85rem' }}>{r.name.charAt(0)}</div>
                        <div>
                          <div style={{ fontWeight: 800, color: '#0f172a' }}>{r.name}</div>
                          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Ref: <strong>{r.regRef}</strong> · {new Date(r.createdAt).toLocaleDateString('en-PK', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                        </div>
                      </div>
                      <span style={{ background: r.status === 'approved' ? '#d1fae5' : '#fef3c7', color: r.status === 'approved' ? '#065f46' : '#92400e', borderRadius: 9999, padding: '0.2rem 0.625rem', fontSize: '0.75rem', fontWeight: 700, textTransform: 'capitalize' }}>{r.status}</span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.5rem', fontSize: '0.8rem' }}>
                      {[['Business', r.businessName || '—'], ['Cities', r.businessCities || '—'], ['CNIC', r.cnic], ['Mobile', r.mobilePhone], ['Email', r.email || '—']].map(([label, value]) => (
                        <div key={label} style={{ background: 'rgba(255,255,255,0.7)', borderRadius: 8, padding: '0.5rem 0.75rem' }}>
                          <div style={{ color: '#64748b', fontSize: '0.7rem', fontWeight: 600, marginBottom: '0.15rem' }}>{label}</div>
                          <div style={{ fontWeight: 600, color: '#0f172a' }}>{value}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ─── REPORTS TAB ─── */}
        {tab === 'viewReports' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '1rem' }}>
              {[
                { label: 'Total Bookings', value: bookings.length,  icon: '📋', color: '#0284c7', bg: '#e0f2fe' },
                { label: 'Confirmed',       value: confirmedCount,   icon: '✅', color: '#059669', bg: '#d1fae5' },
                { label: 'Pending',         value: pendingCount,     icon: '⏳', color: '#d97706', bg: '#fef3c7' },
                { label: 'Rejected',        value: rejectedCount,    icon: '❌', color: '#dc2626', bg: '#fee2e2' },
                { label: 'Total Revenue',   value: fmt(totalRevenue),icon: '💰', color: '#7c3aed', bg: '#f5f3ff' },
              ].map(({ label, value, icon, color, bg }) => (
                <div key={label} style={{ background: '#fff', borderRadius: 14, padding: '1.25rem', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', border: '1px solid #f1f5f9' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '0.5rem' }}>
                    <div style={{ width: 34, height: 34, background: bg, borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.95rem' }}>{icon}</div>
                    <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
                  </div>
                  <div style={{ fontSize: '1.6rem', fontWeight: 900, color }}>{value}</div>
                </div>
              ))}
            </div>
            <div style={{ background: '#fff', borderRadius: 16, padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', border: '1px solid #f1f5f9' }}>
              <h3 style={{ fontWeight: 800, color: '#0f172a', marginBottom: '1rem' }}>Monthly Breakdown (Last 6 Months)</h3>
              {bookingsLoading ? <div className="loading"><div className="spinner"></div>Loading...</div> : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid #f1f5f9' }}>
                        {['Month', 'Total Bookings', 'Confirmed', 'Revenue'].map(h => (
                          <th key={h} style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.7rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {monthlyStats.map((m, i) => (
                        <tr key={i} style={{ borderBottom: '1px solid #f8fafc' }}
                          onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                          <td style={{ padding: '0.875rem', fontWeight: 700, color: '#0f172a' }}>{m.label}</td>
                          <td style={{ padding: '0.875rem', color: '#374151' }}>{m.total}</td>
                          <td style={{ padding: '0.875rem', color: '#059669', fontWeight: 700 }}>{m.confirmed}</td>
                          <td style={{ padding: '0.875rem', fontWeight: 700, color: '#7c3aed' }}>{fmt(m.revenue)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ─── ANNOUNCEMENTS TAB ─── */}
        {tab === 'manageAnnouncements' && (
          <div className="side-panel-layout" style={{ gridTemplateColumns: annEdit ? '1fr 370px' : '1fr' }}>
            <div style={{ background: '#fff', borderRadius: 16, padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', border: '1px solid #f1f5f9' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                <div>
                  <h3 style={{ fontWeight: 800, color: '#0f172a', marginBottom: '0.25rem' }}>Announcements</h3>
                  <p style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Create and manage public announcements shown to visitors</p>
                </div>
                <button className="btn btn-primary btn-sm" onClick={() => openAnnForm(null)}>+ New</button>
              </div>
              {annsLoading ? <div className="loading"><div className="spinner"></div>Loading...</div> : anns.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
                  <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>📢</div>
                  <div style={{ fontWeight: 600 }}>No announcements yet</div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {anns.map(a => (
                    <div key={a.id} style={{ border: `1.5px solid ${annEdit?.id === a.id ? '#93c5fd' : a.important ? '#fcd34d' : '#f1f5f9'}`, borderRadius: 12, padding: '1rem 1.25rem', background: annEdit?.id === a.id ? '#f0f9ff' : a.important ? '#fffbeb' : '#fff' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.3rem', flexWrap: 'wrap' }}>
                            {a.important && <span style={{ fontSize: '0.68rem', fontWeight: 700, background: '#fef3c7', color: '#92400e', borderRadius: 5, padding: '0.1rem 0.4rem' }}>⚠️ Important</span>}
                            {a.tag && <span style={{ fontSize: '0.68rem', fontWeight: 700, background: '#eff6ff', color: '#1d4ed8', borderRadius: 5, padding: '0.1rem 0.4rem' }}>{a.tag}</span>}
                            <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>{a.date}</span>
                          </div>
                          <div style={{ fontWeight: 800, color: '#0f172a', marginBottom: '0.25rem' }}>{a.title}</div>
                          <div style={{ fontSize: '0.8rem', color: '#64748b', lineHeight: 1.5 }}>{a.body.length > 100 ? a.body.slice(0, 100) + '…' : a.body}</div>
                        </div>
                        <div style={{ display: 'flex', gap: '0.375rem', flexShrink: 0 }}>
                          <button onClick={() => openAnnForm(a)} style={{ padding: '0.3rem 0.55rem', background: '#f1f5f9', border: 'none', borderRadius: 7, cursor: 'pointer', fontSize: '0.72rem', fontWeight: 700, color: '#374151' }}>✏️</button>
                          <button onClick={() => handleDeleteAnn(a.id)} style={{ padding: '0.3rem 0.55rem', background: '#fef2f2', border: 'none', borderRadius: 7, cursor: 'pointer', fontSize: '0.72rem', fontWeight: 700, color: '#dc2626' }}>🗑️</button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {annEdit && (
              <div style={{ background: '#fff', borderRadius: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.06)', border: '1px solid #e2e8f0', position: 'sticky', top: 80, overflow: 'hidden' }}>
                <div style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)', color: '#fff', padding: '1.25rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontWeight: 800, fontSize: '1.05rem' }}>{annEdit === 'new' ? 'New Announcement' : 'Edit Announcement'}</div>
                  <button onClick={() => { setAnnEdit(null); setAnnMsg(''); }} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', borderRadius: 8, width: 30, height: 30, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
                </div>
                <form onSubmit={handleSaveAnn} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div className="form-group"><label>Title</label><input required value={annForm.title} onChange={e => setAnnForm(f => ({ ...f, title: e.target.value }))} placeholder="Announcement title" /></div>
                  <div className="form-group">
                    <label>Body</label>
                    <textarea required value={annForm.body} onChange={e => setAnnForm(f => ({ ...f, body: e.target.value }))} rows={4} placeholder="Announcement details..." style={{ width: '100%', padding: '0.6rem 0.75rem', border: '1.5px solid #e2e8f0', borderRadius: 9, fontFamily: 'inherit', fontSize: '0.9rem', resize: 'vertical', boxSizing: 'border-box' }} />
                  </div>
                  <div className="form-group"><label>Date</label><input type="date" required value={annForm.date} onChange={e => setAnnForm(f => ({ ...f, date: e.target.value }))} /></div>
                  <div className="form-group"><label>Tag (optional)</label><input value={annForm.tag} onChange={e => setAnnForm(f => ({ ...f, tag: e.target.value }))} placeholder="e.g. New Launch, Finance..." /></div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', cursor: 'pointer', padding: '0.5rem 0.75rem', background: annForm.important ? '#fef3c7' : '#f8fafc', borderRadius: 9, border: `1.5px solid ${annForm.important ? '#fcd34d' : '#e2e8f0'}` }}>
                    <input type="checkbox" checked={annForm.important} onChange={e => setAnnForm(f => ({ ...f, important: e.target.checked }))} style={{ width: 16, height: 16 }} />
                    <span style={{ fontSize: '0.85rem', fontWeight: 600, color: annForm.important ? '#92400e' : '#374151' }}>⚠️ Mark as Important</span>
                  </label>
                  {annMsg && <div className={annMsg.startsWith('✅') ? 'alert alert-success' : 'alert alert-error'} style={{ fontSize: '0.85rem' }}>{annMsg}</div>}
                  <button type="submit" className="btn btn-primary" disabled={annSaving} style={{ justifyContent: 'center', padding: '0.75rem', background: '#d97706' }}>
                    {annSaving ? <><div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }}></div> Saving...</> : '✓ Save Announcement'}
                  </button>
                </form>
              </div>
            )}
          </div>
        )}

        {/* ─── CUSTOMERS TAB ─── */}
        {tab === 'viewCustomers' && (
          <div style={{ background: '#fff', borderRadius: 16, padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', border: '1px solid #f1f5f9' }}>
            <div style={{ marginBottom: '1.25rem' }}>
              <h3 style={{ fontWeight: 800, color: '#0f172a', marginBottom: '0.25rem' }}>Customer Accounts</h3>
              <p style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{customers.length} registered customers — read-only view</p>
            </div>
            {customersLoading ? <div className="loading"><div className="spinner"></div>Loading...</div> : customers.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>🙍</div>
                <div style={{ fontWeight: 600 }}>No registered customers yet</div>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #f1f5f9' }}>
                      {['Name', 'Email', 'CNIC', 'Phone', 'Joined'].map(h => (
                        <th key={h} style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.7rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {customers.map(c => (
                      <tr key={c.id} style={{ borderBottom: '1px solid #f8fafc' }}
                        onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                        <td style={{ padding: '0.875rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                            <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg, #0ea5e9, #0284c7)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: '0.8rem', flexShrink: 0 }}>{(c.name || c.email || '?').charAt(0).toUpperCase()}</div>
                            <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.85rem' }}>{c.name || '—'}</div>
                          </div>
                        </td>
                        <td style={{ padding: '0.875rem', color: '#374151' }}>{c.email || '—'}</td>
                        <td style={{ padding: '0.875rem', fontFamily: 'monospace', fontSize: '0.8rem', color: '#64748b' }}>{c.cnic || '—'}</td>
                        <td style={{ padding: '0.875rem', color: '#374151' }}>{c.phone || '—'}</td>
                        <td style={{ padding: '0.875rem', fontSize: '0.78rem', color: '#64748b' }}>
                          {c.createdAt ? new Date(c.createdAt).toLocaleDateString('en-PK', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ─── STAFF TAB (manageStaff) ─── */}
        {tab === 'manageStaff' && (
          <div className="side-panel-layout" style={{ gridTemplateColumns: opsStaffEdit ? '1fr 380px' : '1fr' }}>
            <div style={{ background: '#fff', borderRadius: 16, padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', border: '1px solid #f1f5f9' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                <div>
                  <h3 style={{ fontWeight: 800, color: '#0f172a', marginBottom: '0.25rem' }}>Staff Accounts</h3>
                  <p style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Assign Sales Staff and Operations Staff roles. Privileges are set automatically by role.</p>
                </div>
                <button onClick={() => openOpsStaffForm(null)} className="btn btn-primary" style={{ background: '#0284c7', borderColor: 'transparent' }}>+ Add Staff</button>
              </div>
              {opsStaffLoading ? <div className="loading"><div className="spinner"></div>Loading...</div> : opsStaffList.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
                  <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>🛡️</div>
                  <div style={{ fontWeight: 600 }}>No staff accounts yet</div>
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid #f1f5f9' }}>
                        {['Name', 'Username', 'Role', 'Actions'].map(h => (
                          <th key={h} style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.7rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {opsStaffList.map(s => {
                        const rc = ROLE_COLOR[s.staffRole] || { color: '#374151', bg: '#f1f5f9' };
                        const isManager = s.staffRole === 'Operations Manager';
                        return (
                          <tr key={s.id} style={{ borderBottom: '1px solid #f8fafc' }}>
                            <td style={{ padding: '0.875rem', fontWeight: 700, color: '#0f172a' }}>{s.name}</td>
                            <td style={{ padding: '0.875rem', fontFamily: 'monospace', fontSize: '0.8rem', color: '#64748b' }}>{s.username}</td>
                            <td style={{ padding: '0.875rem' }}>
                              <span style={{ background: rc.bg, color: rc.color, borderRadius: 9999, padding: '0.2rem 0.6rem', fontSize: '0.72rem', fontWeight: 700 }}>{s.staffRole}</span>
                            </td>
                            <td style={{ padding: '0.875rem' }}>
                              {isManager ? (
                                <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontStyle: 'italic' }}>Managed by Admin</span>
                              ) : (
                                <div style={{ display: 'flex', gap: '0.375rem' }}>
                                  <button onClick={() => openOpsStaffForm(s)} style={{ padding: '0.3rem 0.55rem', background: '#e0f2fe', border: 'none', borderRadius: 7, cursor: 'pointer', fontSize: '0.72rem', fontWeight: 700, color: '#0369a1' }}>Edit</button>
                                  <button onClick={() => handleDeleteOpsStaff(s.id)} style={{ padding: '0.3rem 0.55rem', background: '#fee2e2', border: 'none', borderRadius: 7, cursor: 'pointer', fontSize: '0.72rem', fontWeight: 700, color: '#dc2626' }}>Delete</button>
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {opsStaffEdit && (
              <div style={{ background: '#fff', borderRadius: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.06)', border: '1px solid #e2e8f0', position: 'sticky', top: 20, overflow: 'hidden', alignSelf: 'start' }}>
                <div style={{ background: 'linear-gradient(135deg, #0ea5e9, #0284c7)', color: '#fff', padding: '1.1rem 1.4rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontWeight: 800, fontSize: '1rem' }}>{opsStaffEdit === 'new' ? 'Add Staff' : 'Edit Staff'}</div>
                  <button onClick={() => setOpsStaffEdit(null)} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', borderRadius: 8, width: 30, height: 30, cursor: 'pointer' }}>✕</button>
                </div>
                <form onSubmit={handleSaveOpsStaff} style={{ padding: '1.4rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <div>
                    <div style={{ fontSize: '0.72rem', fontWeight: 600, color: '#64748b', marginBottom: '0.2rem' }}>Full Name *</div>
                    <input type="text" value={opsStaffForm.name} onChange={e => setOpsStaffForm(f => ({ ...f, name: e.target.value }))} style={{ width: '100%', padding: '0.5rem 0.7rem', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: '0.85rem', outline: 'none', boxSizing: 'border-box' }} />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.72rem', fontWeight: 600, color: '#64748b', marginBottom: '0.2rem' }}>Username *</div>
                    <input type="text" value={opsStaffForm.username} onChange={e => setOpsStaffForm(f => ({ ...f, username: e.target.value }))} disabled={opsStaffEdit !== 'new'} style={{ width: '100%', padding: '0.5rem 0.7rem', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: '0.85rem', outline: 'none', boxSizing: 'border-box', background: opsStaffEdit !== 'new' ? '#f8fafc' : '#fff' }} />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.72rem', fontWeight: 600, color: '#64748b', marginBottom: '0.2rem' }}>{opsStaffEdit === 'new' ? 'Password *' : 'New Password (leave blank to keep)'}</div>
                    <input type="text" value={opsStaffForm.password} onChange={e => setOpsStaffForm(f => ({ ...f, password: e.target.value }))} style={{ width: '100%', padding: '0.5rem 0.7rem', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: '0.85rem', outline: 'none', boxSizing: 'border-box' }} />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.72rem', fontWeight: 600, color: '#64748b', marginBottom: '0.2rem' }}>Role *</div>
                    <select value={opsStaffForm.staffRole} onChange={e => setOpsStaffForm(f => ({ ...f, staffRole: e.target.value }))} style={{ width: '100%', padding: '0.5rem 0.7rem', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: '0.85rem', outline: 'none', background: '#fff' }}>
                      {OPS_STAFF_ROLE_OPTIONS.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>
                  <div style={{ background: '#f8fafc', border: '1px solid #f1f5f9', borderRadius: 8, padding: '0.6rem 0.75rem', fontSize: '0.72rem', color: '#64748b' }}>
                    {opsStaffForm.staffRole === 'Sales Staff'
                      ? 'Can view plot inventory, dealers & targets, and customer records (read-only).'
                      : 'Can confirm bookings and correct booking form data.'}
                  </div>
                  {opsStaffMsg && <div style={{ fontSize: '0.82rem', fontWeight: 600, color: opsStaffMsg.startsWith('✅') ? '#059669' : '#dc2626' }}>{opsStaffMsg}</div>}
                  <button type="submit" disabled={opsStaffSaving} className="btn btn-primary" style={{ justifyContent: 'center', background: opsStaffSaving ? '#94a3b8' : '#0284c7', borderColor: 'transparent' }}>
                    {opsStaffSaving ? 'Saving...' : '💾 Save Staff'}
                  </button>
                </form>
              </div>
            )}
          </div>
        )}

        {/* ─── EXPORT TAB ─── */}
        {tab === 'exportData' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ background: '#fff', borderRadius: 16, padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', border: '1px solid #f1f5f9' }}>
              <h3 style={{ fontWeight: 800, color: '#0f172a', marginBottom: '0.25rem' }}>Export Data</h3>
              <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '1.5rem' }}>Download reports as CSV files — open them in Excel or Google Sheets</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '1rem' }}>
                {[
                  {
                    label: 'Bookings Report', desc: `${bookings.length} records`, icon: '📋', color: '#0284c7', bg: '#e0f2fe',
                    onClick: () => downloadCSV(bookings.map(b => ({ Ref: b.bookingRef, Buyer: b.name, CNIC: b.cnic, Phone: b.phone, Plot: b.plotNumber, Size: b.plotSize, Area: b.area, Price: b.plotPrice, Status: b.status, Dealer: b.dealerName || '', Date: b.createdAt?.slice(0, 10) || '' })), 'bookings.csv'),
                  },
                  {
                    label: 'Plot Inventory', desc: `${plots.length} plots`, icon: '🏘️', color: '#059669', bg: '#d1fae5',
                    onClick: () => downloadCSV(plots.map(p => ({ Number: p.number, Area: p.area, Size: p.size, Category: p.category, Price: p.price, Status: p.status })), 'plots.csv'),
                  },
                  {
                    label: 'Customer List', desc: `${customers.length} accounts`, icon: '🙍', color: '#7c3aed', bg: '#f5f3ff',
                    onClick: () => downloadCSV(customers.map(c => ({ Name: c.name || '', Email: c.email || '', CNIC: c.cnic || '', Phone: c.phone || '', Joined: c.createdAt?.slice(0, 10) || '' })), 'customers.csv'),
                  },
                ].map(({ label, desc, icon, color, bg, onClick }) => (
                  <button key={label} onClick={onClick}
                    style={{ background: '#fff', border: `1.5px solid #f1f5f9`, borderRadius: 14, padding: '1.25rem', cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s' }}
                    onMouseEnter={e => { e.currentTarget.style.background = bg; e.currentTarget.style.borderColor = color + '55'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.borderColor = '#f1f5f9'; }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.625rem' }}>
                      <div style={{ width: 40, height: 40, background: bg, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem' }}>{icon}</div>
                      <div>
                        <div style={{ fontWeight: 800, color, fontSize: '0.9rem' }}>📥 {label}</div>
                        <div style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 600 }}>{desc}</div>
                      </div>
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#64748b' }}>Download as CSV file</div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

      </div>

      {showReceipt && <BookingReceipt booking={showReceipt} onClose={() => setShowReceipt(null)} />}

      {rejectModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: '2rem', maxWidth: 440, width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
            <h3 style={{ fontWeight: 800, marginBottom: '0.5rem', color: '#0f172a' }}>Reject Booking</h3>
            <p style={{ color: '#64748b', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
              Booking <strong>{rejectModal.bookingRef}</strong> by <strong>{rejectModal.name}</strong> will be rejected and the plot will be released back to available.
            </p>
            <div className="form-group" style={{ marginBottom: '1.25rem' }}>
              <label>Reason for rejection (optional)</label>
              <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} rows={3}
                placeholder="e.g. Incomplete documentation, CNIC mismatch..." style={{ width: '100%', padding: '0.6rem 0.75rem', border: '1.5px solid #e2e8f0', borderRadius: 9, fontFamily: 'inherit', fontSize: '0.9rem', resize: 'vertical' }} />
            </div>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button onClick={handleReject} className="btn btn-primary" style={{ flex: 1, justifyContent: 'center', background: '#dc2626', borderColor: 'transparent' }}>✕ Confirm Rejection</button>
              <button onClick={() => { setRejectModal(null); setRejectReason(''); }} className="btn btn-outline" style={{ flex: 1, justifyContent: 'center' }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
