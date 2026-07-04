import React, { useEffect, useState } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';

const fmt = n => n >= 1000000 ? 'PKR ' + (n / 1000000).toFixed(1) + 'M' : n > 0 ? 'PKR ' + (n / 1000).toFixed(0) + 'K' : 'PKR 0';
const fmtFull = n => 'PKR ' + Number(n || 0).toLocaleString('en-US');
const fmtDate = d => d ? new Date((d.length === 10 ? d + 'T00:00:00' : d)).toLocaleDateString('en-PK', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';
const fmtMonth = m => m ? new Date(m + '-01T00:00:00').toLocaleDateString('en-PK', { month: 'short', year: 'numeric' }) : '—';

const STATUS_STYLE = {
  paid:    { bg: '#d1fae5', color: '#065f46', label: 'Paid' },
  pending: { bg: '#fef3c7', color: '#92400e', label: 'Pending' },
  overdue: { bg: '#fee2e2', color: '#dc2626', label: 'Overdue' },
};
const TYPE_ICON = { 'down-payment': '⬇', 'confirmation': '✓', 'monthly': '📅', 'semi-annual': '📆', 'possession': '🔑', 'exchange': '🔁' };

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
    <div style={{ fontSize: '1.7rem', fontWeight: 900, color: '#0f172a', lineHeight: 1.1 }}>{value}</div>
    <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{sub}</div>
  </div>
);

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: '#1e293b', borderRadius: 10, padding: '0.75rem 1rem', boxShadow: '0 8px 24px rgba(0,0,0,0.3)' }}>
      <div style={{ color: '#94a3b8', fontSize: '0.75rem', marginBottom: '0.4rem', fontWeight: 600 }}>{fmtMonth(label)}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color, fontSize: '0.85rem', fontWeight: 700 }}>{p.name}: {fmtFull(p.value)}</div>
      ))}
    </div>
  );
};

const SECTIONS = [
  { key: 'overview',     label: 'Overview',      icon: '📊' },
  { key: 'dealers',      label: 'Dealer Sales',  icon: '👥' },
  { key: 'ledgers',      label: 'Client Ledgers', icon: '📒' },
  { key: 'installments', label: 'Installments',  icon: '🗓️' },
  { key: 'history',      label: 'Payment History', icon: '🧾' },
];

export default function AccountsDashboard({ dealer: staff, authToken, onLogout, navigate, embedded = false }) {
  const aFetch = (url, opts = {}) => fetch(url, { ...opts, headers: { Authorization: `Bearer ${authToken}`, ...(opts.headers || {}) } });
  const canManage = !!(staff?.privileges?.manageLedger);

  const [section, setSection] = useState('overview');
  const [msg, setMsg] = useState('');

  const [overview, setOverview] = useState(null);
  const [dealerRows, setDealerRows] = useState([]);
  const [ledgers, setLedgers] = useState([]);
  const [installments, setInstallments] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  // Client ledger drill-down
  const [ledgerSearch, setLedgerSearch] = useState('');
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [generating, setGenerating] = useState(false);

  // Record payment
  const [payItem, setPayItem] = useState(null);
  const [payAmount, setPayAmount] = useState('');
  const [payDate, setPayDate] = useState('');
  const [payNotes, setPayNotes] = useState('');
  const [paySaving, setPaySaving] = useState(false);
  const [payError, setPayError] = useState('');

  // Installments filter
  const [instFilter, setInstFilter] = useState('all');
  const [instSearch, setInstSearch] = useState('');

  const flash = (m) => { setMsg(m); setTimeout(() => setMsg(''), 4000); };

  const downloadCSV = (rows, filename) => {
    if (!rows.length) { flash('Nothing to export.'); return; }
    const keys = Object.keys(rows[0]);
    const csv = [keys.join(','), ...rows.map(r => keys.map(k => `"${(r[k] ?? '').toString().replace(/"/g, '""')}"`).join(','))].join('\n');
    const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(new Blob([csv], { type: 'text/csv' })), download: filename });
    a.click();
  };
  const csvDate = () => new Date().toISOString().slice(0, 10);
  const statusLabel = s => STATUS_STYLE[s]?.label || s || '';

  const exportDealers = () => downloadCSV(dealerRows.map(d => ({
    Dealer: d.name, Username: d.username, Sales: d.salesCount, 'Sales Value': d.salesValue,
    Collected: d.collected, 'Commission Earned': d.commissionEarned, 'Commission Paid': d.commissionPaid,
    'Commission Outstanding': d.commissionOutstanding,
  })), `dealer_sales_${csvDate()}.csv`);

  const exportLedgers = () => downloadCSV(filteredLedgers.map(l => ({
    Client: l.customerName || '', 'Booking Ref': l.bookingRef, Plot: l.plotNumber, Size: l.plotSize,
    'Plot Price': l.plotPrice, Phone: l.customerPhone || '', CNIC: l.customerCnic || '', Dealer: l.dealerName || '',
    Paid: l.totalPaid, Pending: l.totalPending, Overdue: l.totalOverdue,
  })), `client_ledgers_${csvDate()}.csv`);

  const exportInstallments = () => downloadCSV(filteredInst.map(i => ({
    Client: i.customerName || '', 'Booking Ref': i.bookingRef, Plot: i.plotNumber, Size: i.plotSize,
    Installment: i.label, Amount: i.status === 'paid' ? (i.paidAmount || i.amount) : i.amount,
    'Due Date': i.dueDate || '', Status: statusLabel(i.status), 'Days Overdue': i.daysOverdue || 0,
  })), `installments_${csvDate()}.csv`);

  const exportHistory = () => downloadCSV(history.map(h => ({
    'Paid Date': h.paidDate || '', Client: h.customerName || '', 'Booking Ref': h.bookingRef,
    Plot: h.plotNumber, Installment: h.label, Amount: h.amount, 'Recorded By': h.paidBy || '',
  })), `payment_history_${csvDate()}.csv`);

  const loadAll = () => {
    setLoading(true);
    Promise.all([
      aFetch('/api/finance/overview').then(r => r.json()).catch(() => null),
      aFetch('/api/finance/dealers').then(r => r.json()).catch(() => []),
      aFetch('/api/finance/ledgers').then(r => r.json()).catch(() => []),
      aFetch('/api/finance/installments').then(r => r.json()).catch(() => []),
      aFetch('/api/finance/history').then(r => r.json()).catch(() => []),
    ]).then(([ov, dl, lg, inst, hist]) => {
      if (ov && ov.error === 'Authentication required') { onLogout?.(); return; }
      setOverview(ov);
      setDealerRows(Array.isArray(dl) ? dl : []);
      setLedgers(Array.isArray(lg) ? lg : []);
      setInstallments(Array.isArray(inst) ? inst : []);
      setHistory(Array.isArray(hist) ? hist : []);
      setLoading(false);
    });
  };

  useEffect(() => { loadAll(); }, []);

  const openBooking = (bookingId) => {
    setSelectedBooking(bookingId);
    setDetail(null);
    setDetailLoading(true);
    aFetch(`/api/ledger/${bookingId}`).then(r => r.json()).then(d => {
      setDetail(d);
      setDetailLoading(false);
    }).catch(() => setDetailLoading(false));
  };

  const refreshDetail = (bookingId) => {
    aFetch(`/api/ledger/${bookingId}`).then(r => r.json()).then(d => setDetail(d)).catch(() => {});
  };

  const startPay = (item) => {
    setPayItem(item);
    setPayAmount(String(item.amount || ''));
    setPayDate(new Date().toISOString().split('T')[0]);
    setPayNotes('');
    setPayError('');
  };

  const submitPay = async () => {
    if (!payItem || !selectedBooking) return;
    setPaySaving(true);
    setPayError('');
    try {
      const res = await aFetch(`/api/ledger/${selectedBooking}/${payItem.id}/pay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paidAmount: Number(payAmount), paidDate: payDate, notes: payNotes.trim() || undefined, paidBy: 'Accounts' }),
      });
      const d = await res.json();
      if (res.ok) {
        setPayItem(null);
        refreshDetail(selectedBooking);
        loadAll();
        flash('✅ Payment recorded.');
      } else {
        setPayError(d.error || 'Failed to record payment');
      }
    } catch { setPayError('Failed to record payment'); }
    setPaySaving(false);
  };

  const generateLedger = async (bookingId) => {
    setGenerating(true);
    try {
      const res = await aFetch(`/api/finance/ledger/${bookingId}/generate`, { method: 'POST' });
      const d = await res.json();
      if (res.ok) { refreshDetail(bookingId); loadAll(); flash('✅ Ledger regenerated.'); }
      else { flash(`❌ ${d.error || 'Failed to generate ledger'}`); }
    } catch { flash('❌ Failed to generate ledger'); }
    setGenerating(false);
  };

  const filteredLedgers = ledgers.filter(l => {
    const q = ledgerSearch.trim().toLowerCase();
    if (!q) return true;
    return [l.customerName, l.bookingRef, l.plotNumber, l.customerPhone, l.customerCnic, l.dealerName]
      .filter(Boolean).some(v => String(v).toLowerCase().includes(q));
  });

  const agingItems = installments.filter(i => i.aging);
  const agingCount = agingItems.length;
  const agingAmount = agingItems.reduce((s, i) => s + (i.amount || 0), 0);
  const maxDaysOverdue = agingItems.reduce((m, i) => Math.max(m, i.daysOverdue || 0), 0);

  const filteredInst = installments.filter(i => {
    if (instFilter === 'aging') { if (!i.aging) return false; }
    else if (instFilter !== 'all' && i.status !== instFilter) return false;
    const q = instSearch.trim().toLowerCase();
    if (!q) return true;
    return [i.customerName, i.bookingRef, i.plotNumber, i.label].filter(Boolean).some(v => String(v).toLowerCase().includes(q));
  });

  const NavBtn = ({ s }) => (
    <button
      onClick={() => setSection(s.key)}
      style={{
        display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.65rem 1.1rem',
        borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '0.85rem',
        background: section === s.key ? '#d97706' : '#fff',
        color: section === s.key ? '#fff' : '#475569',
        boxShadow: section === s.key ? '0 4px 12px rgba(217,119,6,0.3)' : '0 1px 2px rgba(0,0,0,0.05)',
        transition: 'all 0.15s',
      }}
    >
      <span>{s.icon}</span>{s.label}
    </button>
  );

  const Th = ({ children, align = 'left' }) => (
    <th style={{ textAlign: align, padding: '0.6rem 0.75rem', fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: '2px solid #f1f5f9', whiteSpace: 'nowrap' }}>{children}</th>
  );
  const Td = ({ children, align = 'left', mono }) => (
    <td style={{ textAlign: align, padding: '0.6rem 0.75rem', fontSize: '0.85rem', color: '#0f172a', borderBottom: '1px solid #f8fafc', fontFamily: mono ? 'monospace' : 'inherit', whiteSpace: 'nowrap' }}>{children}</td>
  );

  const StatusBadge = ({ status }) => {
    const s = STATUS_STYLE[status] || STATUS_STYLE.pending;
    return <span style={{ background: s.bg, color: s.color, borderRadius: 9999, padding: '0.15rem 0.6rem', fontSize: '0.72rem', fontWeight: 800 }}>{s.label}</span>;
  };

  return (
    <div style={{ background: embedded ? 'transparent' : '#f8fafc', minHeight: embedded ? 'auto' : '100vh', padding: embedded ? 0 : '1.5rem 1.5rem 3rem' }}>
      <div style={{ maxWidth: embedded ? 'none' : 1280, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 style={{ fontSize: '1.6rem', fontWeight: 900, color: '#0f172a', marginBottom: '0.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span>💰</span> Accounts — Financial Control Center
            </h1>
            <p style={{ color: '#64748b', fontSize: '0.85rem' }}>
              Welcome, <strong style={{ color: '#d97706' }}>{staff?.name}</strong> · {new Date().toLocaleDateString('en-PK', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.6rem' }}>
            <button className="btn btn-outline btn-sm" onClick={loadAll}>🔄 Refresh</button>
            {!embedded && <button className="btn btn-primary btn-sm" onClick={onLogout}>Logout</button>}
          </div>
        </div>

        {msg && (
          <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: '0.65rem 1rem', marginBottom: '1rem', fontSize: '0.85rem', fontWeight: 600, color: '#0f172a' }}>{msg}</div>
        )}

        {/* Section nav */}
        <div style={{ display: 'flex', gap: '0.6rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
          {SECTIONS.map(s => <NavBtn key={s.key} s={s} />)}
        </div>

        {loading ? (
          <div className="loading" style={{ minHeight: '40vh' }}>
            <div className="spinner" style={{ width: 32, height: 32 }}></div>
            Loading financial data...
          </div>
        ) : (
          <>
            {/* ── OVERVIEW ── */}
            {section === 'overview' && overview && (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '1.25rem', marginBottom: '1.5rem' }}>
                  <StatCard title="Total Sales" value={fmt(overview.totalSales)} sub={`${overview.confirmedCount} confirmed booking${overview.confirmedCount === 1 ? '' : 's'}`} icon="🏠" color="#1a6b3c" bg="#f0fdf4" />
                  <StatCard title="Payments Collected" value={fmt(overview.collected)} sub="Total received to date" icon="💰" color="#0ea5e9" bg="#f0f9ff" />
                  <StatCard title="Pending" value={fmt(overview.pending)} sub="Not yet due / outstanding" icon="⏳" color="#d97706" bg="#fffbeb" />
                  <StatCard title="Overdue" value={fmt(overview.overdue)} sub="Past due date" icon="⚠️" color="#dc2626" bg="#fef2f2" />
                </div>

                <div style={{ background: '#fff', borderRadius: 16, padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', border: '1px solid #f1f5f9' }}>
                  <h3 style={{ fontWeight: 800, color: '#0f172a', marginBottom: '0.25rem' }}>Revenue Collected Over Time</h3>
                  <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '1.25rem' }}>Payments received per month across all bookings</p>
                  {overview.revenueOverTime.length === 0 ? (
                    <div style={{ textAlign: 'center', color: '#94a3b8', padding: '2rem', fontSize: '0.9rem' }}>No payments recorded yet.</div>
                  ) : (
                    <ResponsiveContainer width="100%" height={260}>
                      <AreaChart data={overview.revenueOverTime}>
                        <defs>
                          <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#d97706" stopOpacity={0.25} />
                            <stop offset="95%" stopColor="#d97706" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                        <XAxis dataKey="month" tickFormatter={fmtMonth} tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                        <YAxis tickFormatter={v => v > 0 ? fmt(v) : '0'} tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={65} />
                        <Tooltip content={<CustomTooltip />} />
                        <Area type="monotone" dataKey="collected" name="Collected" stroke="#d97706" strokeWidth={2.5} fill="url(#revGrad)" dot={{ fill: '#d97706', strokeWidth: 0, r: 3 }} activeDot={{ r: 6 }} />
                      </AreaChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </>
            )}

            {/* ── DEALER SALES ── */}
            {section === 'dealers' && (
              <div style={{ background: '#fff', borderRadius: 16, padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', border: '1px solid #f1f5f9', overflowX: 'auto' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem' }}>
                  <div>
                    <h3 style={{ fontWeight: 800, color: '#0f172a', marginBottom: '0.25rem' }}>Dealer Sales & Commission</h3>
                    <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '1.25rem' }}>Sales achieved, payments collected and commission status per dealer</p>
                  </div>
                  <button className="btn btn-outline btn-sm" onClick={exportDealers} disabled={dealerRows.length === 0}>⬇ Export CSV</button>
                </div>
                {dealerRows.length === 0 ? (
                  <div style={{ textAlign: 'center', color: '#94a3b8', padding: '2rem', fontSize: '0.9rem' }}>No dealers found.</div>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr>
                        <Th>Dealer</Th>
                        <Th align="right">Sales</Th>
                        <Th align="right">Sales Value</Th>
                        <Th align="right">Collected</Th>
                        <Th align="right">Comm. Earned</Th>
                        <Th align="right">Comm. Paid</Th>
                        <Th align="right">Outstanding</Th>
                      </tr>
                    </thead>
                    <tbody>
                      {dealerRows.map(d => (
                        <tr key={d.id}>
                          <Td>
                            <div style={{ fontWeight: 700 }}>{d.name}</div>
                            <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>@{d.username}</div>
                          </Td>
                          <Td align="right">{d.salesCount}</Td>
                          <Td align="right">{fmtFull(d.salesValue)}</Td>
                          <Td align="right"><span style={{ color: '#0ea5e9', fontWeight: 700 }}>{fmtFull(d.collected)}</span></Td>
                          <Td align="right">{fmtFull(d.commissionEarned)}</Td>
                          <Td align="right"><span style={{ color: '#059669' }}>{fmtFull(d.commissionPaid)}</span></Td>
                          <Td align="right"><span style={{ color: d.commissionOutstanding > 0 ? '#dc2626' : '#94a3b8', fontWeight: 700 }}>{fmtFull(d.commissionOutstanding)}</span></Td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {/* ── CLIENT LEDGERS ── */}
            {section === 'ledgers' && (
              <div style={{ display: 'grid', gridTemplateColumns: selectedBooking ? 'minmax(0, 1fr) minmax(0, 1.3fr)' : '1fr', gap: '1.25rem', alignItems: 'start' }}>
                <div style={{ background: '#fff', borderRadius: 16, padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', border: '1px solid #f1f5f9' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem' }}>
                    <div>
                      <h3 style={{ fontWeight: 800, color: '#0f172a', marginBottom: '0.25rem' }}>Client Ledgers</h3>
                      <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '1rem' }}>Select a client to view their full installment ledger</p>
                    </div>
                    <button className="btn btn-outline btn-sm" onClick={exportLedgers} disabled={filteredLedgers.length === 0}>⬇ Export CSV</button>
                  </div>
                  <input
                    value={ledgerSearch}
                    onChange={e => setLedgerSearch(e.target.value)}
                    placeholder="Search by name, ref, plot, phone, CNIC…"
                    style={{ width: '100%', padding: '0.6rem 0.85rem', borderRadius: 10, border: '1px solid #e2e8f0', fontSize: '0.85rem', marginBottom: '1rem' }}
                  />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', maxHeight: 620, overflowY: 'auto' }}>
                    {filteredLedgers.length === 0 ? (
                      <div style={{ textAlign: 'center', color: '#94a3b8', padding: '2rem', fontSize: '0.9rem' }}>No matching clients.</div>
                    ) : filteredLedgers.map(l => {
                      const active = selectedBooking === l.bookingId;
                      return (
                        <button
                          key={l.bookingId}
                          onClick={() => openBooking(l.bookingId)}
                          style={{
                            textAlign: 'left', border: `1.5px solid ${active ? '#d97706' : '#f1f5f9'}`,
                            background: active ? '#fffbeb' : '#fff', borderRadius: 12, padding: '0.85rem 1rem', cursor: 'pointer',
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
                            <div style={{ fontWeight: 800, color: '#0f172a' }}>{l.customerName || '—'}</div>
                            <span style={{ fontSize: '0.72rem', fontFamily: 'monospace', color: '#94a3b8' }}>{l.bookingRef}</span>
                          </div>
                          <div style={{ fontSize: '0.75rem', color: '#64748b', margin: '0.35rem 0' }}>
                            {l.plotNumber} · {l.plotSize} · {fmtFull(l.plotPrice)}
                          </div>
                          <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.72rem', flexWrap: 'wrap' }}>
                            <span style={{ color: '#059669', fontWeight: 700 }}>Paid {fmt(l.totalPaid)}</span>
                            <span style={{ color: '#d97706', fontWeight: 700 }}>Pending {fmt(l.totalPending)}</span>
                            {l.totalOverdue > 0 && <span style={{ color: '#dc2626', fontWeight: 700 }}>Overdue {fmt(l.totalOverdue)}</span>}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {selectedBooking && (
                  <div style={{ background: '#fff', borderRadius: 16, padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', border: '1px solid #f1f5f9' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem', gap: '0.5rem' }}>
                      <div>
                        <h3 style={{ fontWeight: 800, color: '#0f172a', marginBottom: '0.2rem' }}>{detail?.customerName || 'Ledger'}</h3>
                        <p style={{ fontSize: '0.78rem', color: '#94a3b8' }}>{detail?.bookingRef} · {detail?.plotNumber} · {detail?.plotSize}</p>
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        {canManage && (
                          <button className="btn btn-outline btn-sm" disabled={generating} onClick={() => generateLedger(selectedBooking)}>
                            {generating ? 'Working…' : '🔁 Regenerate'}
                          </button>
                        )}
                        <button className="btn btn-outline btn-sm" onClick={() => { setSelectedBooking(null); setDetail(null); }}>✕ Close</button>
                      </div>
                    </div>

                    {detailLoading ? (
                      <div style={{ textAlign: 'center', color: '#94a3b8', padding: '2rem' }}>Loading ledger…</div>
                    ) : !detail || !detail.ledger || detail.ledger.length === 0 ? (
                      <div style={{ textAlign: 'center', color: '#94a3b8', padding: '2rem', fontSize: '0.9rem' }}>
                        No ledger entries yet.
                        {canManage && <div style={{ marginTop: '1rem' }}><button className="btn btn-primary btn-sm" onClick={() => generateLedger(selectedBooking)}>Generate Ledger</button></div>}
                      </div>
                    ) : (
                      <>
                        {detail.summary && (
                          <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
                            <div style={{ background: '#f0fdf4', borderRadius: 10, padding: '0.5rem 0.85rem', fontSize: '0.78rem' }}>Paid <strong style={{ color: '#059669' }}>{fmtFull(detail.summary.totalPaid)}</strong></div>
                            <div style={{ background: '#fffbeb', borderRadius: 10, padding: '0.5rem 0.85rem', fontSize: '0.78rem' }}>Pending <strong style={{ color: '#d97706' }}>{fmtFull(detail.summary.totalPending)}</strong></div>
                            <div style={{ background: '#fef2f2', borderRadius: 10, padding: '0.5rem 0.85rem', fontSize: '0.78rem' }}>Overdue <strong style={{ color: '#dc2626' }}>{fmtFull(detail.summary.totalOverdue)}</strong></div>
                          </div>
                        )}
                        <div style={{ maxHeight: 520, overflowY: 'auto' }}>
                          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                              <tr>
                                <Th>Installment</Th>
                                <Th align="right">Amount</Th>
                                <Th>Due</Th>
                                <Th>Status</Th>
                                {canManage && <Th></Th>}
                              </tr>
                            </thead>
                            <tbody>
                              {detail.ledger.map(item => (
                                <tr key={item.id}>
                                  <Td>{TYPE_ICON[item.type] || '•'} {item.label}</Td>
                                  <Td align="right">{fmtFull(item.status === 'paid' ? (item.paidAmount || item.amount) : item.amount)}</Td>
                                  <Td>{fmtDate(item.dueDate)}</Td>
                                  <Td><StatusBadge status={item.status} /></Td>
                                  {canManage && (
                                    <Td>
                                      {item.status !== 'paid' && (
                                        <button className="btn btn-primary btn-sm" style={{ padding: '0.3rem 0.7rem', fontSize: '0.72rem' }} onClick={() => startPay(item)}>Record</button>
                                      )}
                                      {item.status === 'paid' && item.paidDate && <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>{fmtDate(item.paidDate)}</span>}
                                    </Td>
                                  )}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ── INSTALLMENTS ── */}
            {section === 'installments' && (
              <div style={{ background: '#fff', borderRadius: 16, padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', border: '1px solid #f1f5f9', overflowX: 'auto' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1rem' }}>
                  <div>
                    <h3 style={{ fontWeight: 800, color: '#0f172a', marginBottom: '0.25rem' }}>All Installments</h3>
                    <p style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Consolidated view across every confirmed booking</p>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                    {['all', 'paid', 'pending', 'overdue', 'aging'].map(f => (
                      <button key={f} onClick={() => setInstFilter(f)} style={{
                        padding: '0.4rem 0.85rem', borderRadius: 8,
                        border: f === 'aging' ? '1px solid #fecaca' : '1px solid #e2e8f0', cursor: 'pointer',
                        fontSize: '0.78rem', fontWeight: 700, textTransform: 'capitalize',
                        background: instFilter === f ? (f === 'aging' ? '#b91c1c' : '#d97706') : '#fff',
                        color: instFilter === f ? '#fff' : (f === 'aging' ? '#b91c1c' : '#475569'),
                      }}>{f === 'aging' ? `Aging${agingCount ? ` (${agingCount})` : ''}` : f}</button>
                    ))}
                    <button className="btn btn-outline btn-sm" onClick={exportInstallments} disabled={filteredInst.length === 0}>⬇ Export CSV</button>
                  </div>
                </div>

                {agingCount > 0 && (
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap',
                    background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 12,
                    padding: '0.85rem 1.1rem', marginBottom: '1rem',
                  }}>
                    <span style={{ fontSize: '1.3rem' }}>🚨</span>
                    <div style={{ flex: 1, minWidth: 220 }}>
                      <div style={{ fontWeight: 800, color: '#b91c1c', fontSize: '0.9rem' }}>
                        {agingCount} installment{agingCount === 1 ? '' : 's'} overdue more than 30 days
                      </div>
                      <div style={{ fontSize: '0.8rem', color: '#7f1d1d' }}>
                        {fmtFull(agingAmount)} at risk · oldest is {maxDaysOverdue} days past due. Follow up before it becomes bad debt.
                      </div>
                    </div>
                    {instFilter !== 'aging' && (
                      <button onClick={() => setInstFilter('aging')} style={{
                        padding: '0.4rem 0.9rem', borderRadius: 8, border: 'none', cursor: 'pointer',
                        fontSize: '0.78rem', fontWeight: 700, background: '#b91c1c', color: '#fff',
                      }}>Review now</button>
                    )}
                  </div>
                )}
                <input
                  value={instSearch}
                  onChange={e => setInstSearch(e.target.value)}
                  placeholder="Search by client, ref, plot, installment…"
                  style={{ width: '100%', maxWidth: 360, padding: '0.55rem 0.85rem', borderRadius: 10, border: '1px solid #e2e8f0', fontSize: '0.85rem', marginBottom: '1rem' }}
                />
                {filteredInst.length === 0 ? (
                  <div style={{ textAlign: 'center', color: '#94a3b8', padding: '2rem', fontSize: '0.9rem' }}>No installments match.</div>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr>
                        <Th>Client</Th>
                        <Th>Plot</Th>
                        <Th>Installment</Th>
                        <Th align="right">Amount</Th>
                        <Th>Due</Th>
                        <Th align="right">Days Overdue</Th>
                        <Th>Status</Th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredInst.map((i, idx) => (
                        <tr key={`${i.bookingId}-${i.id}-${idx}`} style={i.aging ? { background: '#fef2f2' } : undefined}>
                          <Td>
                            <div style={{ fontWeight: 700 }}>{i.customerName || '—'}</div>
                            <div style={{ fontSize: '0.72rem', color: '#94a3b8', fontFamily: 'monospace' }}>{i.bookingRef}</div>
                          </Td>
                          <Td>{i.plotNumber} · {i.plotSize}</Td>
                          <Td>{TYPE_ICON[i.type] || '•'} {i.label}</Td>
                          <Td align="right">{fmtFull(i.status === 'paid' ? (i.paidAmount || i.amount) : i.amount)}</Td>
                          <Td>{fmtDate(i.dueDate)}</Td>
                          <Td align="right">
                            {i.status === 'overdue' ? (
                              <span style={{ fontWeight: 700, color: i.aging ? '#b91c1c' : '#64748b' }}>
                                {i.daysOverdue}{i.aging ? ' 🚩' : ''}
                              </span>
                            ) : '—'}
                          </Td>
                          <Td><StatusBadge status={i.status} /></Td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {/* ── HISTORY ── */}
            {section === 'history' && (
              <div style={{ background: '#fff', borderRadius: 16, padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', border: '1px solid #f1f5f9', overflowX: 'auto' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem' }}>
                  <div>
                    <h3 style={{ fontWeight: 800, color: '#0f172a', marginBottom: '0.25rem' }}>Payment History</h3>
                    <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '1.25rem' }}>Every recorded payment, newest first</p>
                  </div>
                  <button className="btn btn-outline btn-sm" onClick={exportHistory} disabled={history.length === 0}>⬇ Export CSV</button>
                </div>
                {history.length === 0 ? (
                  <div style={{ textAlign: 'center', color: '#94a3b8', padding: '2rem', fontSize: '0.9rem' }}>No payments recorded yet.</div>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr>
                        <Th>Date</Th>
                        <Th>Client</Th>
                        <Th>Plot</Th>
                        <Th>Installment</Th>
                        <Th align="right">Amount</Th>
                        <Th>Recorded By</Th>
                      </tr>
                    </thead>
                    <tbody>
                      {history.map((h, idx) => (
                        <tr key={`${h.bookingId}-${h.id}-${idx}`}>
                          <Td>{fmtDate(h.paidDate)}</Td>
                          <Td>
                            <div style={{ fontWeight: 700 }}>{h.customerName || '—'}</div>
                            <div style={{ fontSize: '0.72rem', color: '#94a3b8', fontFamily: 'monospace' }}>{h.bookingRef}</div>
                          </Td>
                          <Td>{h.plotNumber}</Td>
                          <Td>{TYPE_ICON[h.type] || '•'} {h.label}</Td>
                          <Td align="right"><span style={{ color: '#059669', fontWeight: 700 }}>{fmtFull(h.amount)}</span></Td>
                          <Td>{h.paidBy || '—'}</Td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Record Payment Modal */}
      {payItem && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }} onClick={() => !paySaving && setPayItem(null)}>
          <div style={{ background: '#fff', borderRadius: 16, padding: '1.75rem', width: '100%', maxWidth: 420 }} onClick={e => e.stopPropagation()}>
            <h3 style={{ fontWeight: 800, color: '#0f172a', marginBottom: '0.25rem' }}>Record Payment</h3>
            <p style={{ fontSize: '0.82rem', color: '#64748b', marginBottom: '1.25rem' }}>{TYPE_ICON[payItem.type] || '•'} {payItem.label} · due {fmtDate(payItem.dueDate)}</p>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#374151', marginBottom: '0.3rem' }}>Amount Paid (PKR)</label>
            <input type="number" value={payAmount} onChange={e => setPayAmount(e.target.value)} style={{ width: '100%', padding: '0.6rem 0.85rem', borderRadius: 10, border: '1px solid #e2e8f0', fontSize: '0.9rem', marginBottom: '1rem' }} />
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#374151', marginBottom: '0.3rem' }}>Payment Date</label>
            <input type="date" value={payDate} onChange={e => setPayDate(e.target.value)} style={{ width: '100%', padding: '0.6rem 0.85rem', borderRadius: 10, border: '1px solid #e2e8f0', fontSize: '0.9rem', marginBottom: '1rem' }} />
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#374151', marginBottom: '0.3rem' }}>Notes (optional)</label>
            <textarea value={payNotes} onChange={e => setPayNotes(e.target.value)} rows={2} style={{ width: '100%', padding: '0.6rem 0.85rem', borderRadius: 10, border: '1px solid #e2e8f0', fontSize: '0.9rem', marginBottom: '1rem', resize: 'vertical' }} />
            {payError && <div style={{ color: '#dc2626', fontSize: '0.8rem', marginBottom: '1rem', fontWeight: 600 }}>{payError}</div>}
            <div style={{ display: 'flex', gap: '0.6rem', justifyContent: 'flex-end' }}>
              <button className="btn btn-outline btn-sm" disabled={paySaving} onClick={() => setPayItem(null)}>Cancel</button>
              <button className="btn btn-primary btn-sm" disabled={paySaving} onClick={submitPay}>{paySaving ? 'Saving…' : 'Record Payment'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
