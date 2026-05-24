import React, { useState, useEffect } from 'react';

const fmt = n => n >= 1000000 ? 'PKR ' + (n / 1000000).toFixed(1) + 'M' : n > 0 ? 'PKR ' + (n / 1000).toFixed(0) + 'K' : 'PKR 0';
const statusColor = { pending: '#d97706', confirmed: '#059669', rejected: '#dc2626' };
const statusBg = { pending: '#fef3c7', confirmed: '#d1fae5', rejected: '#fee2e2' };

const PRIV_TABS = [
  { key: 'approveBookings', label: 'Bookings', icon: '📋' },
  { key: 'viewPlots', label: 'Plots', icon: '🏘️' },
  { key: 'viewDealers', label: 'Dealers', icon: '👥' },
  { key: 'viewDeals', label: 'Deals', icon: '🏷️' },
  { key: 'viewRegistrations', label: 'Registrations', icon: '📝' },
];

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

  const [plots, setPlots] = useState([]);
  const [plotsLoading, setPlotsLoading] = useState(false);

  const [dealers, setDealers] = useState([]);
  const [dealersLoading, setDealersLoading] = useState(false);

  const [deals, setDeals] = useState([]);
  const [dealsLoading, setDealsLoading] = useState(false);

  const [regs, setRegs] = useState([]);
  const [regsLoading, setRegsLoading] = useState(false);

  const reloadBookings = () => {
    setBookingsLoading(true);
    fetch('/api/admin/bookings').then(r => r.json()).then(d => { setBookings(d); setBookingsLoading(false); }).catch(() => setBookingsLoading(false));
  };

  useEffect(() => {
    if (!tab) return;
    setActionMsg('');
    if (tab === 'approveBookings') reloadBookings();
    if (tab === 'viewPlots') { setPlotsLoading(true); fetch('/api/plots').then(r => r.json()).then(d => { setPlots(d); setPlotsLoading(false); }).catch(() => setPlotsLoading(false)); }
    if (tab === 'viewDealers') { setDealersLoading(true); fetch('/api/admin/dealers').then(r => r.json()).then(d => { setDealers(d); setDealersLoading(false); }).catch(() => setDealersLoading(false)); }
    if (tab === 'viewDeals') { setDealsLoading(true); fetch('/api/admin/deals').then(r => r.json()).then(d => { setDeals(d); setDealsLoading(false); }).catch(() => setDealsLoading(false)); }
    if (tab === 'viewRegistrations') { setRegsLoading(true); fetch('/api/admin/registrations').then(r => r.json()).then(d => { setRegs(d); setRegsLoading(false); }).catch(() => setRegsLoading(false)); }
  }, [tab]);

  const handleApprove = async (bookingId) => {
    setActionMsg('');
    const res = await fetch(`/api/admin/bookings/${bookingId}/approve`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ approvedBy: staff.name }),
    });
    if (res.ok) { setActionMsg('✅ Booking approved — plot marked as sold.'); setSelectedBooking(null); reloadBookings(); }
    else setActionMsg('❌ Failed to approve booking.');
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

  const today = new Date().toISOString().slice(0, 10);
  const pendingCount = bookings.filter(b => b.status === 'pending').length;

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
              <h1 style={{ fontSize: '1.75rem', fontWeight: 900, color: '#0f172a' }}>Operations Dashboard</h1>
            </div>
            <p style={{ color: '#64748b', fontSize: '0.875rem', paddingLeft: '3rem' }}>Welcome, <strong style={{ color: '#0284c7' }}>{staff?.name}</strong></p>
          </div>
          <button className="btn btn-primary btn-sm" onClick={onLogout} style={{ background: 'rgba(220,38,38,0.9)', borderColor: 'transparent' }}>Logout</button>
        </div>

        <div style={{ display: 'flex', gap: '0.25rem', marginBottom: '1.75rem', background: '#fff', borderRadius: 14, padding: '0.375rem', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', border: '1px solid #f1f5f9', overflowX: 'auto' }}>
          {availableTabs.map(t => (
            <button key={t.key} onClick={() => { setTab(t.key); setSelectedBooking(null); }} style={{
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
                    <div style={{ background: statusBg[selectedBooking.status], border: `1px solid ${statusColor[selectedBooking.status]}33`, borderRadius: 10, padding: '0.75rem 1rem', textAlign: 'center', fontWeight: 700, color: statusColor[selectedBooking.status] }}>
                      {selectedBooking.status === 'confirmed' ? '✅ Approved' : '❌ Rejected'}
                      {selectedBooking.approvedBy && <div style={{ fontSize: '0.75rem', fontWeight: 400, marginTop: '0.2rem' }}>by {selectedBooking.approvedBy}</div>}
                      {selectedBooking.rejectionReason && <div style={{ fontSize: '0.75rem', fontWeight: 400, marginTop: '0.2rem' }}>Reason: {selectedBooking.rejectionReason}</div>}
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

      </div>

      {/* Reject Modal */}
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
