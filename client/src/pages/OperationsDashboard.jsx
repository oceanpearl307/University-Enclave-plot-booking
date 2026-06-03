import React, { useState, useEffect } from 'react';
import BookingReceipt from '../components/BookingReceipt.jsx';

const fmt = n => n >= 1000000 ? 'PKR ' + (n / 1000000).toFixed(1) + 'M' : n > 0 ? 'PKR ' + (n / 1000).toFixed(0) + 'K' : 'PKR 0';
const statusColor = { pending: '#d97706', confirmed: '#059669', rejected: '#dc2626' };
const statusBg = { pending: '#fef3c7', confirmed: '#d1fae5', rejected: '#fee2e2' };

const PRIV_TABS = [
  { key: 'approveBookings',     label: 'Bookings',      icon: '📋' },
  { key: 'viewPlots',           label: 'Plots',         icon: '🏘️' },
  { key: 'manageInventory',     label: 'Inventory',     icon: '🏗️' },
  { key: 'viewDealers',         label: 'Dealers',       icon: '👥' },
  { key: 'viewDeals',           label: 'Deals',         icon: '🏷️' },
  { key: 'viewRegistrations',   label: 'Registrations', icon: '📝' },
  { key: 'viewReports',         label: 'Reports',       icon: '📊' },
  { key: 'manageAnnouncements', label: 'Announcements', icon: '📢' },
  { key: 'viewCustomers',       label: 'Customers',     icon: '🙍' },
  { key: 'exportData',          label: 'Export',        icon: '📤' },
];

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

export default function OperationsDashboard({ staff, onLogout }) {
  const privileges = staff.privileges || {};
  const availableTabs = PRIV_TABS.filter(t => privileges[t.key]);
  const [tab, setTab] = useState(availableTabs[0]?.key || null);
  const [actionMsg, setActionMsg] = useState('');

  const [bookings, setBookings] = useState([]);
  const [bookingsLoading, setBookingsLoading] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [rejectModal, setRejectModal] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [showReceipt, setShowReceipt] = useState(null);

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
    fetch('/api/admin/bookings').then(r => r.json()).then(d => { setBookings(Array.isArray(d) ? d : []); setBookingsLoading(false); }).catch(() => setBookingsLoading(false));
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
    fetch('/api/admin/customers').then(r => r.json()).then(d => { setCustomers(Array.isArray(d) ? d : []); setCustomersLoading(false); }).catch(() => setCustomersLoading(false));
  };

  useEffect(() => {
    if (!tab) return;
    setActionMsg('');
    if (tab === 'approveBookings' || tab === 'viewReports') reloadBookings();
    if (tab === 'viewPlots' || tab === 'manageInventory') reloadPlots();
    if (tab === 'viewDealers') { setDealersLoading(true); fetch('/api/admin/dealers').then(r => r.json()).then(d => { setDealers(Array.isArray(d) ? d : []); setDealersLoading(false); }).catch(() => setDealersLoading(false)); }
    if (tab === 'viewDeals') { setDealsLoading(true); fetch('/api/admin/deals').then(r => r.json()).then(d => { setDeals(Array.isArray(d) ? d : []); setDealsLoading(false); }).catch(() => setDealsLoading(false)); }
    if (tab === 'viewRegistrations') { setRegsLoading(true); fetch('/api/admin/registrations').then(r => r.json()).then(d => { setRegs(Array.isArray(d) ? d : []); setRegsLoading(false); }).catch(() => setRegsLoading(false)); }
    if (tab === 'manageAnnouncements') reloadAnns();
    if (tab === 'viewCustomers') reloadCustomers();
    if (tab === 'exportData') { reloadBookings(); reloadPlots(); reloadCustomers(); }
  }, [tab]);

  const handleApprove = async (bookingId) => {
    setActionMsg('');
    const res = await fetch(`/api/admin/bookings/${bookingId}/approve`, {
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
    const res = await fetch(`/api/admin/bookings/${rejectModal.id}/reject`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason: rejectReason, rejectedBy: staff.name }),
    });
    if (res.ok) { setActionMsg('✅ Booking rejected — plot is now available again.'); setRejectModal(null); setRejectReason(''); setSelectedBooking(null); reloadBookings(); }
    else setActionMsg('❌ Failed to reject booking.');
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
          <button className="btn btn-primary btn-sm" onClick={onLogout} style={{ background: 'rgba(220,38,38,0.9)', borderColor: 'transparent' }}>Logout</button>
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
              {t.key === 'approveBookings' && pendingCount > 0 && (
                <span style={{ background: '#dc2626', color: '#fff', borderRadius: 9999, fontSize: '0.65rem', fontWeight: 800, padding: '0.1rem 0.4rem', minWidth: 18, textAlign: 'center' }}>{pendingCount}</span>
              )}
            </button>
          ))}
        </div>

        {actionMsg && (
          <div className={actionMsg.startsWith('✅') ? 'alert alert-success' : 'alert alert-error'} style={{ marginBottom: '1.25rem' }}>{actionMsg}</div>
        )}

        {/* ─── BOOKINGS TAB ─── */}
        {tab === 'approveBookings' && (
          <div style={{ display: 'grid', gridTemplateColumns: selectedBooking ? '1fr 400px' : '1fr', gap: '1.5rem', alignItems: 'start' }}>
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
                          style={{ borderBottom: '1px solid #f8fafc', background: selectedBooking?.id === b.id ? '#f0f9ff' : 'transparent', cursor: 'pointer' }}
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
                            {b.status === 'pending' && (
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
                  {selectedBooking.status === 'pending' && (
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
          <div style={{ display: 'grid', gridTemplateColumns: invEdit ? '1fr 370px' : '1fr', gap: '1.5rem', alignItems: 'start' }}>
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
          <div style={{ display: 'grid', gridTemplateColumns: annEdit ? '1fr 370px' : '1fr', gap: '1.5rem', alignItems: 'start' }}>
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
