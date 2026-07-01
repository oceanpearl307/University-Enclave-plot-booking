import React, { useEffect, useState, useRef } from 'react';
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';

const fmt = n => n >= 1000000 ? 'PKR ' + (n / 1000000).toFixed(1) + 'M' : n > 0 ? 'PKR ' + (n / 1000).toFixed(0) + 'K' : 'PKR 0';
const fmtFull = n => 'PKR ' + (n || 0).toLocaleString('en-PK');
const fmtDate = d => d ? new Date(d).toLocaleDateString('en-PK', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';
const fmtDateLong = d => d ? new Date(d).toLocaleDateString('en-PK', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }) : '—';

const StatCard = ({ title, value, sub, icon, color, bg }) => (
  <div style={{
    background: '#fff', borderRadius: 16, padding: '1.5rem',
    boxShadow: '0 1px 3px rgba(0,0,0,0.08), 0 4px 12px rgba(0,0,0,0.04)',
    border: '1px solid #f1f5f9', position: 'relative', overflow: 'hidden',
    display: 'flex', flexDirection: 'column', gap: '0.5rem',
  }}>
    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: color, borderRadius: '16px 16px 0 0' }} />
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
      <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{title}</div>
      <div style={{ width: 40, height: 40, borderRadius: 10, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>{icon}</div>
    </div>
    <div style={{ fontSize: '2rem', fontWeight: 900, color: '#0f172a', lineHeight: 1 }}>{value}</div>
    <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{sub}</div>
  </div>
);

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

const RADIAN = Math.PI / 180;
const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
  if (percent < 0.05) return null;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  return (
    <text x={x} y={y} fill="#fff" textAnchor="middle" dominantBaseline="central" fontSize={12} fontWeight={700}>
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

const statusColor = { available: '#059669', booked: '#d97706', sold: '#dc2626', pending: '#d97706', confirmed: '#059669', rejected: '#dc2626' };
const statusLabel = { available: 'Available', booked: 'Booked', sold: 'Sold', pending: 'Pending', confirmed: 'Confirmed', rejected: 'Rejected' };
const statusIcon = { confirmed: '✅', pending: '⏳', rejected: '❌', booked: '📋', sold: '🏆', available: '✅' };

function BookingReceipt({ booking, agentName, onClose }) {
  const receiptRef = useRef(null);

  const handlePrint = () => {
    const content = receiptRef.current.innerHTML;
    const win = window.open('', '_blank', 'width=800,height=900');
    win.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Booking Receipt — ${booking.ref}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: 'Segoe UI', Arial, sans-serif; background: #fff; color: #0f172a; }
            @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
          </style>
        </head>
        <body>${content}</body>
      </html>
    `);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); }, 300);
  };

  const sc = statusColor[booking.status] || '#94a3b8';

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 9999,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem',
    }} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{
        background: '#fff', borderRadius: 20, width: '100%', maxWidth: 640,
        maxHeight: '92vh', overflow: 'auto',
        boxShadow: '0 24px 80px rgba(0,0,0,0.35)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.25rem 1.5rem', borderBottom: '1px solid #f1f5f9' }}>
          <div style={{ fontWeight: 800, fontSize: '1rem', color: '#0f172a' }}>Booking Receipt</div>
          <div style={{ display: 'flex', gap: '0.625rem' }}>
            <button
              onClick={handlePrint}
              style={{ background: '#059669', color: '#fff', border: 'none', borderRadius: 8, padding: '0.5rem 1rem', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.375rem' }}
            >
              🖨️ Print
            </button>
            <button
              onClick={onClose}
              style={{ background: '#f1f5f9', color: '#64748b', border: 'none', borderRadius: 8, padding: '0.5rem 0.875rem', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer' }}
            >
              ✕ Close
            </button>
          </div>
        </div>

        <div ref={receiptRef} style={{ padding: '2rem' }}>
          <div style={{ textAlign: 'center', marginBottom: '1.75rem', paddingBottom: '1.5rem', borderBottom: '2px solid #f1f5f9' }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🏘️</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#0f172a' }}>University Enclave Housing Society</div>
            <div style={{ fontSize: '0.82rem', color: '#64748b', marginTop: '0.25rem' }}>Official Booking Receipt</div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div>
              <div style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>Booking Reference</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#059669', fontFamily: 'monospace' }}>{booking.ref}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>Status</div>
              <span style={{
                background: sc + '18', color: sc, border: `1.5px solid ${sc}40`,
                borderRadius: 9999, padding: '0.25rem 0.875rem', fontSize: '0.82rem', fontWeight: 800,
              }}>
                {statusLabel[booking.status] || booking.status}
              </span>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
            <Section title="Plot Details">
              <Row label="Plot No." value={booking.plot} mono />
              <Row label="Size" value={booking.plotSize} />
              {booking.plotArea && <Row label="Area" value={booking.plotArea} />}
              <Row label="Plot Price" value={fmtFull(booking.amount)} bold />
            </Section>
            <Section title="Customer Details">
              <Row label="Full Name" value={booking.customer} bold />
              {booking.customerPhone && <Row label="Phone" value={booking.customerPhone} />}
              {booking.customerEmail && <Row label="Email" value={booking.customerEmail} />}
              {booking.customerCnic && <Row label="CNIC" value={booking.customerCnic} mono />}
            </Section>
          </div>

          <Section title="Booking Information" style={{ marginBottom: '1.25rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 1.5rem' }}>
              <Row label="Booking Date" value={fmtDateLong(booking.date)} />
              <Row label="Payment Plan" value={booking.paymentPlan || 'Full Payment'} />
              {booking.totalPaid > 0 && <Row label="Amount Paid" value={fmtFull(booking.totalPaid)} />}
              {booking.address && <Row label="Address" value={booking.address} />}
              {booking.notes && <Row label="Notes" value={booking.notes} />}
            </div>
          </Section>

          <div style={{ background: '#f0fdf4', border: '1.5px solid #bbf7d0', borderRadius: 12, padding: '1rem 1.25rem', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#166534' }}>Total Plot Value</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#059669' }}>{fmtFull(booking.amount)}</div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', paddingTop: '1.25rem', borderTop: '1px dashed #e2e8f0', fontSize: '0.75rem', color: '#94a3b8' }}>
            <div>
              <div style={{ fontWeight: 600, color: '#64748b', marginBottom: '0.15rem' }}>Sales Agent</div>
              <div style={{ fontWeight: 700, color: '#0f172a' }}>{agentName}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div>Printed: {new Date().toLocaleDateString('en-PK', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
              <div style={{ marginTop: '0.15rem', fontStyle: 'italic' }}>University Enclave Housing Society</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children, style }) {
  return (
    <div style={{ marginBottom: '0.5rem', ...style }}>
      <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '0.625rem', paddingBottom: '0.375rem', borderBottom: '1px solid #f1f5f9' }}>{title}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>{children}</div>
    </div>
  );
}

function Row({ label, value, mono, bold }) {
  if (!value && value !== 0) return null;
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '0.5rem' }}>
      <span style={{ fontSize: '0.75rem', color: '#94a3b8', flexShrink: 0 }}>{label}</span>
      <span style={{ fontSize: '0.82rem', color: '#0f172a', fontWeight: bold ? 700 : 500, fontFamily: mono ? 'monospace' : undefined, textAlign: 'right' }}>{value}</span>
    </div>
  );
}

export default function SalesAgentDashboard({ dealer: agent, authToken, onLogout, navigate }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [receipt, setReceipt] = useState(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    if (!agent?.id) return;
    fetch(`/api/agent/${agent.id}/stats`, {
      headers: { Authorization: `Bearer ${authToken}` },
    })
      .then(r => r.json())
      .then(d => {
        if (d.error === 'Authentication required' || d.error === 'Access denied') { onLogout(); return; }
        if (d.error) { setError(d.error || 'Failed to load dashboard.'); setLoading(false); return; }
        setData(d);
        setLoading(false);
      })
      .catch(() => { setError('Failed to load dashboard data.'); setLoading(false); });
  }, [agent]);

  if (loading) return (
    <div className="loading" style={{ minHeight: '60vh' }}>
      <div className="spinner" style={{ width: 32, height: 32 }}></div>
      Loading your dashboard...
    </div>
  );

  if (error || !data) return (
    <div className="empty-state"><h3>Failed to load dashboard</h3><p>Please refresh the page.</p></div>
  );

  const { stats, assignedBySizeSorted, allBookings = [] } = data;

  const filteredBookings = allBookings.filter(b => {
    const matchStatus = statusFilter === 'all' || b.status === statusFilter;
    const q = search.toLowerCase();
    const matchSearch = !q ||
      b.ref?.toLowerCase().includes(q) ||
      b.customer?.toLowerCase().includes(q) ||
      b.plot?.toLowerCase().includes(q) ||
      b.plotSize?.toLowerCase().includes(q);
    return matchStatus && matchSearch;
  });

  const pieData = [
    { name: 'Available', value: stats.available, color: '#059669' },
    { name: 'Booked', value: stats.booked, color: '#d97706' },
    { name: 'Sold', value: stats.sold, color: '#dc2626' },
  ].filter(d => d.value > 0);

  const sizeBarData = assignedBySizeSorted.map(s => ({
    size: s.size,
    Available: s.availableCount,
    Booked: s.bookedCount,
    Sold: s.soldCount,
  }));

  return (
    <div style={{ background: '#f8fafc', minHeight: '100vh', padding: '2rem 1.5rem' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 900, color: '#0f172a', marginBottom: '0.25rem' }}>My Sales Dashboard</h1>
            <p style={{ color: '#64748b', fontSize: '0.875rem' }}>
              Welcome, <strong style={{ color: '#059669' }}>{agent?.name}</strong> · {new Date().toLocaleDateString('en-PK', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button className="btn btn-outline btn-sm" onClick={() => navigate('plots')}>🗺️ View Plots</button>
            <button className="btn btn-primary btn-sm" onClick={onLogout}>Logout</button>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#fff', borderRadius: 12, padding: '0.625rem 1rem', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', border: '1px solid #e0e7ff', marginBottom: '1.5rem', width: 'fit-content' }}>
          <span style={{ fontSize: '1rem' }}>💼</span>
          <div>
            <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600 }}>Role</div>
            <div style={{ fontSize: '0.875rem', fontWeight: 800, color: '#059669' }}>Sales Agent</div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
          <StatCard title="Assigned Plots" value={stats.assignedTotal} sub="Total plots assigned to me" icon="🏘️" color="#059669" bg="#f0fdf4" />
          <StatCard title="Available" value={stats.available} sub="Ready to book" icon="✅" color="#0ea5e9" bg="#f0f9ff" />
          <StatCard title="Booked" value={stats.booked} sub="Currently booked" icon="📋" color="#d97706" bg="#fffbeb" />
          <StatCard title="Sold" value={stats.sold} sub="Completed sales" icon="🏆" color="#7c3aed" bg="#f5f3ff" />
        </div>

        {assignedBySizeSorted.length === 0 ? (
          <div style={{ background: '#fff', borderRadius: 16, padding: '3rem 2rem', textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', border: '1px dashed #e2e8f0', marginBottom: '1.5rem' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🏘️</div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.5rem' }}>No Plots Assigned Yet</h3>
            <p style={{ color: '#64748b', maxWidth: 420, margin: '0 auto', lineHeight: 1.7 }}>
              Your plot inventory has not been assigned yet. Please contact your admin to get plots assigned to you.
            </p>
          </div>
        ) : (
          <>
            <div style={{ background: '#fff', borderRadius: 16, padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', border: '1px solid #f1f5f9', marginBottom: '1.5rem' }}>
              <h3 style={{ fontWeight: 800, color: '#0f172a', marginBottom: '0.25rem' }}>My Assigned Plots</h3>
              <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '1.25rem' }}>Inventory assigned to me, grouped by plot size</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1rem' }}>
                {assignedBySizeSorted.map(item => (
                  <div key={item.size} style={{ borderRadius: 12, border: `1.5px solid ${item.availableCount > 0 ? '#bbf7d0' : '#fecaca'}`, overflow: 'hidden' }}>
                    <div style={{ background: item.availableCount > 0 ? 'linear-gradient(135deg, #f0fdf4, #dcfce7)' : '#fef2f2', padding: '0.875rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#0f172a' }}>{item.size}</div>
                      {item.availableCount > 0 ? (
                        <span style={{ background: '#059669', color: '#fff', borderRadius: 9999, padding: '0.2rem 0.625rem', fontSize: '0.72rem', fontWeight: 800 }}>
                          {item.availableCount} Available
                        </span>
                      ) : (
                        <span style={{ background: '#dc2626', color: '#fff', borderRadius: 9999, padding: '0.2rem 0.625rem', fontSize: '0.72rem', fontWeight: 800 }}>
                          None Available
                        </span>
                      )}
                    </div>
                    <div style={{ padding: '0.75rem 1rem' }}>
                      <div style={{ display: 'flex', gap: '1rem', fontSize: '0.75rem', color: '#64748b', marginBottom: '0.625rem' }}>
                        <span>Total: <strong style={{ color: '#0f172a' }}>{item.assignedCount}</strong></span>
                        <span>Booked: <strong style={{ color: '#d97706' }}>{item.bookedCount}</strong></span>
                        <span>Sold: <strong style={{ color: '#dc2626' }}>{item.soldCount}</strong></span>
                      </div>
                      {item.plots.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: 180, overflowY: 'auto' }}>
                          {item.plots.map(p => (
                            <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', borderRadius: 8, padding: '0.5rem 0.75rem' }}>
                              <div>
                                <div style={{ fontWeight: 700, fontSize: '0.82rem', color: '#059669', fontFamily: 'monospace' }}>{p.number}</div>
                                <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>{p.area}{p.description ? ` · ${p.description}` : ''}</div>
                              </div>
                              <div style={{ textAlign: 'right' }}>
                                <div style={{ fontWeight: 800, fontSize: '0.82rem', color: '#0f172a' }}>{fmt(p.price)}</div>
                                {p.tags?.length > 0 && <div style={{ fontSize: '0.65rem', color: '#d97706', fontWeight: 700 }}>★ Premium</div>}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div style={{ textAlign: 'center', padding: '0.75rem 0', color: '#94a3b8', fontSize: '0.82rem' }}>
                          All plots are currently booked or sold.
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.25rem', marginBottom: '1.5rem' }}>
              <div style={{ background: '#fff', borderRadius: 16, padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', border: '1px solid #f1f5f9' }}>
                <h3 style={{ fontWeight: 800, color: '#0f172a', marginBottom: '0.25rem' }}>Plot Status Distribution</h3>
                <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '1rem' }}>Overview of my assigned inventory</p>
                {pieData.length > 0 ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
                    <ResponsiveContainer width={160} height={160}>
                      <PieChart>
                        <Pie data={pieData} cx="50%" cy="50%" innerRadius={40} outerRadius={70} dataKey="value" labelLine={false} label={renderCustomLabel}>
                          {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {pieData.map(d => (
                        <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <div style={{ width: 10, height: 10, borderRadius: '50%', background: d.color, flexShrink: 0 }} />
                          <span style={{ fontSize: '0.82rem', color: '#374151' }}>{d.name}: <strong>{d.value}</strong></span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8', fontSize: '0.875rem' }}>No data yet</div>
                )}
              </div>

              <div style={{ background: '#fff', borderRadius: 16, padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', border: '1px solid #f1f5f9' }}>
                <h3 style={{ fontWeight: 800, color: '#0f172a', marginBottom: '0.25rem' }}>Plots by Size</h3>
                <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '1rem' }}>Status breakdown per plot size</p>
                {sizeBarData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={160}>
                    <BarChart data={sizeBarData} barCategoryGap="30%">
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                      <XAxis dataKey="size" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} />
                      <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc' }} />
                      <Bar dataKey="Available" name="Available" fill="#059669" radius={[3, 3, 0, 0]} stackId="a" />
                      <Bar dataKey="Booked" name="Booked" fill="#d97706" radius={[3, 3, 0, 0]} stackId="a" />
                      <Bar dataKey="Sold" name="Sold" fill="#dc2626" radius={[3, 3, 0, 0]} stackId="a" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8', fontSize: '0.875rem' }}>No data yet</div>
                )}
              </div>
            </div>
          </>
        )}

        <div style={{ background: '#fff', borderRadius: 16, padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', border: '1px solid #f1f5f9' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div>
              <h3 style={{ fontWeight: 800, color: '#0f172a', marginBottom: '0.25rem' }}>My Bookings</h3>
              <p style={{ fontSize: '0.8rem', color: '#94a3b8' }}>All bookings on plots assigned to me · {allBookings.length} total</p>
            </div>
            <div style={{ display: 'flex', gap: '0.625rem', flexWrap: 'wrap' }}>
              <input
                type="text"
                placeholder="Search ref, customer, plot…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{
                  border: '1.5px solid #e2e8f0', borderRadius: 8, padding: '0.45rem 0.75rem',
                  fontSize: '0.82rem', outline: 'none', minWidth: 200, color: '#0f172a',
                  background: '#f8fafc',
                }}
              />
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                style={{
                  border: '1.5px solid #e2e8f0', borderRadius: 8, padding: '0.45rem 0.75rem',
                  fontSize: '0.82rem', outline: 'none', background: '#f8fafc', color: '#0f172a', cursor: 'pointer',
                }}
              >
                <option value="all">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="confirmed">Confirmed</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
          </div>

          {filteredBookings.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2.5rem', color: '#94a3b8' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>📋</div>
              <div style={{ fontWeight: 600 }}>{allBookings.length === 0 ? 'No bookings yet' : 'No bookings match your filters'}</div>
              <div style={{ fontSize: '0.85rem', marginTop: '0.25rem' }}>
                {allBookings.length === 0 ? 'Bookings on your assigned plots will appear here' : 'Try adjusting your search or status filter'}
              </div>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #f1f5f9' }}>
                    {['Ref', 'Customer', 'Plot', 'Size', 'Amount', 'Status', 'Date', 'Actions'].map(h => (
                      <th key={h} style={{ textAlign: 'left', padding: '0.625rem 0.875rem', fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredBookings.map((b, i) => {
                    const sc = statusColor[b.status] || '#94a3b8';
                    return (
                      <tr key={b.ref + i} style={{ borderBottom: '1px solid #f8fafc' }}
                        onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >
                        <td style={{ padding: '0.75rem 0.875rem', fontFamily: 'monospace', fontWeight: 700, color: '#059669', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>{b.ref}</td>
                        <td style={{ padding: '0.75rem 0.875rem', fontWeight: 600, color: '#0f172a', whiteSpace: 'nowrap' }}>{b.customer}</td>
                        <td style={{ padding: '0.75rem 0.875rem', fontFamily: 'monospace', color: '#475569', whiteSpace: 'nowrap' }}>{b.plot}</td>
                        <td style={{ padding: '0.75rem 0.875rem', color: '#64748b', whiteSpace: 'nowrap' }}>{b.plotSize}</td>
                        <td style={{ padding: '0.75rem 0.875rem', fontWeight: 700, color: '#0f172a', whiteSpace: 'nowrap' }}>{fmt(b.amount)}</td>
                        <td style={{ padding: '0.75rem 0.875rem', whiteSpace: 'nowrap' }}>
                          <span style={{ background: sc + '18', color: sc, border: `1px solid ${sc}30`, borderRadius: 9999, padding: '0.2rem 0.6rem', fontSize: '0.72rem', fontWeight: 700 }}>
                            {statusIcon[b.status]} {statusLabel[b.status] || b.status}
                          </span>
                        </td>
                        <td style={{ padding: '0.75rem 0.875rem', color: '#94a3b8', fontSize: '0.78rem', whiteSpace: 'nowrap' }}>{fmtDate(b.date)}</td>
                        <td style={{ padding: '0.75rem 0.875rem', whiteSpace: 'nowrap' }}>
                          <button
                            onClick={() => setReceipt(b)}
                            style={{
                              background: '#f0fdf4', color: '#059669', border: '1.5px solid #bbf7d0',
                              borderRadius: 7, padding: '0.3rem 0.75rem', fontSize: '0.78rem',
                              fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
                            }}
                          >
                            🧾 View & Print
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <div style={{ marginTop: '0.875rem', fontSize: '0.78rem', color: '#94a3b8', textAlign: 'right' }}>
                Showing {filteredBookings.length} of {allBookings.length} booking{allBookings.length !== 1 ? 's' : ''}
              </div>
            </div>
          )}
        </div>

      </div>

      {receipt && (
        <BookingReceipt
          booking={receipt}
          agentName={agent?.name}
          onClose={() => setReceipt(null)}
        />
      )}
    </div>
  );
}
