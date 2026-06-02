import React, { useEffect, useState, useCallback } from 'react';
import * as XLSX from 'xlsx';

const fmt = n => 'PKR ' + Number(n).toLocaleString('en-US');
const fmtShort = n => n >= 1000000 ? 'PKR ' + (n / 1000000).toFixed(1) + 'M' : n > 0 ? 'PKR ' + (n / 1000).toFixed(0) + 'K' : 'PKR 0';
const fmtDate = d => d ? new Date(d + 'T00:00:00').toLocaleDateString('en-PK', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

const STATUS_STYLE = {
  paid:    { bg: '#d1fae5', color: '#065f46', label: 'Paid' },
  pending: { bg: '#fef3c7', color: '#92400e', label: 'Pending' },
  overdue: { bg: '#fee2e2', color: '#dc2626', label: 'Overdue' },
};

const TYPE_ICON = {
  'down-payment': '⬇',
  'confirmation': '✓',
  'monthly':      '📅',
  'semi-annual':  '📆',
  'possession':   '🔑',
};

function StatusBadge({ status }) {
  const s = STATUS_STYLE[status] || STATUS_STYLE.pending;
  return (
    <span style={{ background: s.bg, color: s.color, borderRadius: 9999, padding: '0.2rem 0.625rem', fontSize: '0.72rem', fontWeight: 700, whiteSpace: 'nowrap' }}>
      {s.label}
    </span>
  );
}

function RecordPaymentModal({ installment, bookingId, onClose, onSaved }) {
  const [amount, setAmount] = useState(String(installment.amount));
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSave() {
    setSaving(true);
    setError('');
    try {
      const res = await fetch(`/api/ledger/${bookingId}/${installment.id}/pay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paidAmount: Number(amount), paidDate: date, notes, paidBy: 'Dealer' }),
      });
      if (!res.ok) { const d = await res.json(); setError(d.error || 'Failed'); setSaving(false); return; }
      onSaved();
    } catch { setError('Network error'); setSaving(false); }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 9000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div style={{ background: '#fff', borderRadius: 18, padding: '2rem', maxWidth: 420, width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div>
            <h3 style={{ fontWeight: 800, color: '#0f172a', margin: 0, fontSize: '1.1rem' }}>Record Payment</h3>
            <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.25rem' }}>
              {TYPE_ICON[installment.type]} {installment.label} · Due {fmtDate(installment.dueDate)}
            </div>
          </div>
          <button onClick={onClose} style={{ background: '#f1f5f9', border: 'none', borderRadius: 8, width: 30, height: 30, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem' }}>✕</button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#374151', marginBottom: '0.4rem' }}>Amount (PKR)</label>
            <input
              type="number"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              style={{ width: '100%', padding: '0.7rem 0.875rem', border: '1.5px solid #e2e8f0', borderRadius: 10, fontSize: '0.95rem', fontWeight: 700, boxSizing: 'border-box' }}
            />
            <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '0.25rem' }}>Scheduled: {fmt(installment.amount)}</div>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#374151', marginBottom: '0.4rem' }}>Payment Date</label>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              style={{ width: '100%', padding: '0.7rem 0.875rem', border: '1.5px solid #e2e8f0', borderRadius: 10, fontSize: '0.9rem', boxSizing: 'border-box' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#374151', marginBottom: '0.4rem' }}>Notes (optional)</label>
            <input
              type="text"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="e.g. Bank transfer, cheque #..."
              style={{ width: '100%', padding: '0.7rem 0.875rem', border: '1.5px solid #e2e8f0', borderRadius: 10, fontSize: '0.88rem', boxSizing: 'border-box' }}
            />
          </div>
          {error && <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '0.6rem 0.875rem', color: '#dc2626', fontSize: '0.82rem' }}>{error}</div>}
          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.25rem' }}>
            <button onClick={handleSave} disabled={saving} style={{ flex: 1, background: 'linear-gradient(135deg, #1a6b3c, #059669)', color: '#fff', border: 'none', borderRadius: 10, padding: '0.75rem 1rem', fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}>
              {saving ? 'Saving...' : '✓ Mark as Paid'}
            </button>
            <button onClick={onClose} style={{ flex: 1, background: '#f1f5f9', color: '#374151', border: 'none', borderRadius: 10, padding: '0.75rem 1rem', fontWeight: 700, cursor: 'pointer' }}>Cancel</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function LedgerPanel({ customer, onClose, isAdmin }) {
  const [ledgerData, setLedgerData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [payItem, setPayItem] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    fetch(`/api/ledger/${customer.bookingId}`)
      .then(r => r.json())
      .then(d => { setLedgerData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [customer.bookingId]);

  useEffect(() => { load(); }, [load]);

  function exportCustomerExcel() {
    if (!ledgerData) return;
    const rows = ledgerData.ledger.map((item, i) => ({
      '#': i + 1,
      'Type': item.label,
      'Due Date': item.dueDate,
      'Amount (PKR)': item.amount,
      'Status': STATUS_STYLE[item.status]?.label || item.status,
      'Paid Date': item.paidDate || '',
      'Paid Amount (PKR)': item.paidAmount || '',
      'Paid By': item.paidBy || '',
      'Notes': item.notes || '',
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = [{ wch: 4 }, { wch: 18 }, { wch: 14 }, { wch: 16 }, { wch: 10 }, { wch: 14 }, { wch: 16 }, { wch: 14 }, { wch: 30 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Ledger');
    XLSX.writeFile(wb, `Ledger_${ledgerData.bookingRef}_${customer.customerName.replace(/\s+/g, '_')}.xlsx`);
  }

  const summary = ledgerData?.summary;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 8000, display: 'flex', alignItems: 'flex-end', justifyContent: 'flex-end', padding: '0' }}>
      <div style={{ background: '#f8fafc', width: '100%', maxWidth: 820, height: '100vh', display: 'flex', flexDirection: 'column', boxShadow: '-20px 0 60px rgba(0,0,0,0.2)', overflowY: 'auto' }}>
        {/* Header */}
        <div style={{ background: 'linear-gradient(135deg, #1a6b3c, #059669)', color: '#fff', padding: '1.5rem 2rem', flexShrink: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
            <div>
              <div style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', opacity: 0.75, marginBottom: '0.2rem' }}>Payment Ledger</div>
              <div style={{ fontWeight: 900, fontSize: '1.25rem' }}>{customer.customerName}</div>
              <div style={{ opacity: 0.85, fontSize: '0.875rem', marginTop: '0.2rem' }}>
                Plot {customer.plotNumber} · {customer.plotSize} · Ref: {customer.bookingRef}
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
              <button onClick={exportCustomerExcel} style={{ background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.4)', color: '#fff', borderRadius: 10, padding: '0.5rem 0.875rem', fontWeight: 700, cursor: 'pointer', fontSize: '0.82rem' }}>
                📥 Export Excel
              </button>
              <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', borderRadius: 8, width: 32, height: 32, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem' }}>✕</button>
            </div>
          </div>

          {/* Summary chips */}
          {summary && (
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              {[
                { label: 'Total', val: fmtShort(summary.totalAmount), bg: 'rgba(255,255,255,0.15)' },
                { label: 'Paid', val: fmtShort(summary.totalPaid), bg: 'rgba(34,197,94,0.3)' },
                { label: 'Pending', val: fmtShort(summary.totalPending), bg: 'rgba(251,191,36,0.3)' },
                { label: 'Overdue', val: fmtShort(summary.totalOverdue), bg: summary.totalOverdue > 0 ? 'rgba(239,68,68,0.35)' : 'rgba(255,255,255,0.12)' },
              ].map(c => (
                <div key={c.label} style={{ background: c.bg, borderRadius: 10, padding: '0.5rem 0.875rem', backdropFilter: 'blur(4px)' }}>
                  <div style={{ fontSize: '0.65rem', fontWeight: 700, opacity: 0.8, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{c.label}</div>
                  <div style={{ fontWeight: 900, fontSize: '0.95rem' }}>{c.val}</div>
                </div>
              ))}
              {summary.nextDueDate && (
                <div style={{ background: 'rgba(255,255,255,0.15)', borderRadius: 10, padding: '0.5rem 0.875rem' }}>
                  <div style={{ fontSize: '0.65rem', fontWeight: 700, opacity: 0.8, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Next Due</div>
                  <div style={{ fontWeight: 900, fontSize: '0.95rem' }}>{fmtDate(summary.nextDueDate)}</div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Ledger table */}
        <div style={{ flex: 1, padding: '1.5rem 2rem', overflowY: 'auto' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>Loading ledger...</div>
          ) : ledgerData?.ledger?.length > 0 ? (
            <div style={{ background: '#fff', borderRadius: 14, boxShadow: '0 1px 3px rgba(0,0,0,0.06)', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '2px solid #f1f5f9' }}>
                      {['#', 'Type', 'Due Date', 'Amount', 'Status', 'Paid Date', 'Paid Amount', 'Notes', ''].map(h => (
                        <th key={h} style={{ padding: '0.75rem 0.875rem', textAlign: 'left', fontSize: '0.68rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {ledgerData.ledger.map((item, i) => (
                      <tr key={item.id} style={{ borderBottom: '1px solid #f8fafc', background: item.status === 'overdue' ? '#fef9f9' : item.status === 'paid' ? '#f9fdfb' : '#fff' }}
                        onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                        onMouseLeave={e => e.currentTarget.style.background = item.status === 'overdue' ? '#fef9f9' : item.status === 'paid' ? '#f9fdfb' : '#fff'}>
                        <td style={{ padding: '0.75rem 0.875rem', color: '#94a3b8', fontSize: '0.75rem', fontWeight: 600 }}>{i + 1}</td>
                        <td style={{ padding: '0.75rem 0.875rem', fontWeight: 600, color: '#374151', whiteSpace: 'nowrap' }}>
                          <span style={{ marginRight: '0.375rem' }}>{TYPE_ICON[item.type]}</span>{item.label}
                        </td>
                        <td style={{ padding: '0.75rem 0.875rem', color: '#64748b', whiteSpace: 'nowrap' }}>{fmtDate(item.dueDate)}</td>
                        <td style={{ padding: '0.75rem 0.875rem', fontWeight: 700, color: '#0f172a', whiteSpace: 'nowrap' }}>{fmt(item.amount)}</td>
                        <td style={{ padding: '0.75rem 0.875rem' }}><StatusBadge status={item.status} /></td>
                        <td style={{ padding: '0.75rem 0.875rem', color: '#059669', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>{fmtDate(item.paidDate)}</td>
                        <td style={{ padding: '0.75rem 0.875rem', fontWeight: item.paidAmount ? 700 : 400, color: item.paidAmount ? '#059669' : '#94a3b8', whiteSpace: 'nowrap' }}>{item.paidAmount ? fmt(item.paidAmount) : '—'}</td>
                        <td style={{ padding: '0.75rem 0.875rem', color: '#64748b', fontSize: '0.78rem', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.notes || '—'}</td>
                        <td style={{ padding: '0.75rem 0.875rem' }}>
                          {item.status !== 'paid' && (
                            <button onClick={() => setPayItem(item)} style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#059669', borderRadius: 7, padding: '0.3rem 0.6rem', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                              Mark Paid
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>📋</div>
              <div style={{ fontWeight: 600 }}>No ledger available for this booking</div>
            </div>
          )}
        </div>
      </div>

      {payItem && (
        <RecordPaymentModal
          installment={payItem}
          bookingId={customer.bookingId}
          onClose={() => setPayItem(null)}
          onSaved={() => { setPayItem(null); load(); }}
        />
      )}
    </div>
  );
}

function CalendarView({ dealerId }) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [payItem, setPayItem] = useState(null);

  const monthStr = `${year}-${String(month).padStart(2, '0')}`;

  useEffect(() => {
    setLoading(true);
    fetch(`/api/dealer/${dealerId}/calendar?month=${monthStr}`)
      .then(r => r.json())
      .then(d => { setEvents(Array.isArray(d) ? d : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [dealerId, monthStr]);

  function prevMonth() {
    if (month === 1) { setYear(y => y - 1); setMonth(12); } else setMonth(m => m - 1);
  }
  function nextMonth() {
    if (month === 12) { setYear(y => y + 1); setMonth(1); } else setMonth(m => m + 1);
  }

  const daysInMonth = new Date(year, month, 0).getDate();
  const firstDayOfWeek = new Date(year, month - 1, 1).getDay();
  const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  const byDay = {};
  events.forEach(ev => {
    const day = parseInt(ev.dueDate.split('-')[2]);
    if (!byDay[day]) byDay[day] = [];
    byDay[day].push(ev);
  });

  const todayStr = new Date().toISOString().split('T')[0];

  return (
    <div>
      {/* Month nav */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <button onClick={prevMonth} style={{ background: '#f1f5f9', border: 'none', borderRadius: 8, padding: '0.5rem 0.875rem', cursor: 'pointer', fontWeight: 700, color: '#374151' }}>← Prev</button>
        <div style={{ fontWeight: 800, fontSize: '1.05rem', color: '#0f172a' }}>{MONTHS[month - 1]} {year}</div>
        <button onClick={nextMonth} style={{ background: '#f1f5f9', border: 'none', borderRadius: 8, padding: '0.5rem 0.875rem', cursor: 'pointer', fontWeight: 700, color: '#374151' }}>Next →</button>
      </div>

      {/* Grid */}
      <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0', overflow: 'hidden', marginBottom: '1.5rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: '1px solid #f1f5f9' }}>
          {DAYS.map(d => (
            <div key={d} style={{ padding: '0.5rem 0.25rem', textAlign: 'center', fontSize: '0.72rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>{d}</div>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
          {Array.from({ length: firstDayOfWeek }).map((_, i) => (
            <div key={`empty-${i}`} style={{ minHeight: 72, borderRight: '1px solid #f8fafc', borderBottom: '1px solid #f8fafc', background: '#fafafa' }} />
          ))}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const dayStr = `${monthStr}-${String(day).padStart(2, '0')}`;
            const dayEvents = byDay[day] || [];
            const isToday = dayStr === todayStr;
            const hasOverdue = dayEvents.some(e => e.status === 'overdue');
            const hasPending = dayEvents.some(e => e.status === 'pending');
            const allPaid = dayEvents.length > 0 && dayEvents.every(e => e.status === 'paid');
            return (
              <div key={day} style={{ minHeight: 72, borderRight: '1px solid #f8fafc', borderBottom: '1px solid #f8fafc', padding: '0.375rem', background: isToday ? '#f0fdf4' : '#fff', position: 'relative' }}>
                <div style={{ fontSize: '0.82rem', fontWeight: isToday ? 900 : 600, color: isToday ? '#1a6b3c' : '#374151', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                  {isToday ? <span style={{ background: '#1a6b3c', color: '#fff', borderRadius: '50%', width: 20, height: 20, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.72rem', fontWeight: 800 }}>{day}</span> : day}
                </div>
                {dayEvents.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.2rem' }}>
                    {hasOverdue && <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#dc2626', display: 'inline-block' }} title="Overdue" />}
                    {hasPending && !hasOverdue && <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#f59e0b', display: 'inline-block' }} title="Pending" />}
                    {allPaid && <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#059669', display: 'inline-block' }} title="Paid" />}
                    {dayEvents.length > 1 && <span style={{ fontSize: '0.65rem', color: '#94a3b8', fontWeight: 700 }}>×{dayEvents.length}</span>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
        {[{ color: '#dc2626', label: 'Overdue' }, { color: '#f59e0b', label: 'Pending' }, { color: '#059669', label: 'Paid' }].map(l => (
          <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.78rem', color: '#64748b' }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: l.color, display: 'inline-block' }} />{l.label}
          </div>
        ))}
      </div>

      {/* This month's installments list */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>Loading...</div>
      ) : events.length === 0 ? (
        <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0', padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>
          <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📅</div>
          <div style={{ fontWeight: 600 }}>No installments due this month</div>
        </div>
      ) : (
        <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
          <div style={{ padding: '0.875rem 1.25rem', borderBottom: '1px solid #f1f5f9', fontWeight: 800, fontSize: '0.9rem', color: '#0f172a' }}>
            {MONTHS[month - 1]} Installments ({events.length})
          </div>
          {events.map(ev => (
            <div key={ev.id} style={{ padding: '0.875rem 1.25rem', borderBottom: '1px solid #f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', background: ev.status === 'overdue' ? '#fef9f9' : '#fff' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.875rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                  <span>{TYPE_ICON[ev.type]}</span> {ev.label}
                  <span style={{ fontSize: '0.72rem', fontWeight: 600, color: '#94a3b8', marginLeft: '0.25rem' }}>· {ev.customerName}</span>
                </div>
                <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '0.15rem' }}>
                  Plot {ev.plotNumber} · {ev.bookingRef} · Due {fmtDate(ev.dueDate)}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.9rem' }}>{fmt(ev.amount)}</div>
                <StatusBadge status={ev.status} />
                {ev.status !== 'paid' && (
                  <button onClick={() => setPayItem(ev)} style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#059669', borderRadius: 7, padding: '0.3rem 0.625rem', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer' }}>
                    Mark Paid
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {payItem && (
        <RecordPaymentModal
          installment={payItem}
          bookingId={payItem.bookingId}
          onClose={() => setPayItem(null)}
          onSaved={() => {
            setPayItem(null);
            setLoading(true);
            fetch(`/api/dealer/${dealerId}/calendar?month=${monthStr}`)
              .then(r => r.json())
              .then(d => { setEvents(Array.isArray(d) ? d : []); setLoading(false); });
          }}
        />
      )}
    </div>
  );
}

export default function CustomerLedger({ dealer }) {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [view, setView] = useState('list');

  const loadCustomers = useCallback(() => {
    setLoading(true);
    fetch(`/api/dealer/${dealer.id}/ledger-summary`)
      .then(r => r.json())
      .then(d => { setCustomers(Array.isArray(d) ? d : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [dealer.id]);

  useEffect(() => { loadCustomers(); }, [loadCustomers]);

  function exportFullLedger() {
    const rows = [];
    customers.forEach(c => {
      rows.push({
        'Customer Name': c.customerName,
        'Plot': c.plotNumber,
        'Size': c.plotSize,
        'Booking Ref': c.bookingRef,
        'Total (PKR)': c.totalAmount,
        'Paid (PKR)': c.totalPaid,
        'Pending (PKR)': c.totalPending,
        'Overdue (PKR)': c.totalOverdue,
        'Next Due Date': c.nextDueDate || '',
        'Next Due (PKR)': c.nextDueAmount || '',
      });
    });
    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = [{ wch: 20 }, { wch: 12 }, { wch: 10 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 14 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'All Customers');
    XLSX.writeFile(wb, `Dealer_Full_Ledger_${new Date().toISOString().split('T')[0]}.xlsx`);
  }

  const totalOverdueCount = customers.filter(c => c.totalOverdue > 0).length;

  return (
    <div style={{ background: '#fff', borderRadius: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.06)', border: '1px solid #f1f5f9', marginBottom: '1.5rem', overflow: 'hidden' }}>
      {/* Section header */}
      <div style={{ background: 'linear-gradient(135deg, #0d2d1a 0%, #1a4a28 60%, #1a6b3c 100%)', padding: '1.25rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h3 style={{ fontWeight: 800, color: '#fff', margin: 0, fontSize: '1.05rem' }}>📋 My Customers & Ledger</h3>
          <p style={{ fontSize: '0.8rem', color: '#86efac', margin: '0.2rem 0 0' }}>Track installments, record payments, view payment calendar</p>
        </div>
        <div style={{ display: 'flex', gap: '0.625rem', flexWrap: 'wrap' }}>
          <button
            onClick={() => setView(view === 'list' ? 'calendar' : 'list')}
            style={{ background: view === 'calendar' ? '#fff' : 'rgba(255,255,255,0.15)', color: view === 'calendar' ? '#1a6b3c' : '#fff', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 9, padding: '0.45rem 0.875rem', fontWeight: 700, cursor: 'pointer', fontSize: '0.82rem' }}
          >
            {view === 'calendar' ? '📋 List View' : '📅 Calendar View'}
          </button>
          <button onClick={exportFullLedger} style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 9, padding: '0.45rem 0.875rem', fontWeight: 700, cursor: 'pointer', fontSize: '0.82rem' }}>
            📥 Export All
          </button>
        </div>
      </div>

      <div style={{ padding: '1.5rem' }}>
        {totalOverdueCount > 0 && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: '0.75rem 1rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.625rem', fontSize: '0.875rem', color: '#dc2626', fontWeight: 600 }}>
            ⚠️ {totalOverdueCount} customer{totalOverdueCount > 1 ? 's have' : ' has'} overdue installments
          </div>
        )}

        {view === 'calendar' ? (
          <CalendarView dealerId={dealer.id} />
        ) : loading ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>⏳</div>
            <div>Loading customers...</div>
          </div>
        ) : customers.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>👥</div>
            <div style={{ fontWeight: 600 }}>No confirmed customers yet</div>
            <div style={{ fontSize: '0.85rem', marginTop: '0.25rem' }}>Your confirmed bookings will appear here with their payment ledgers.</div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #f1f5f9' }}>
                  {['Customer', 'Plot', 'Total', 'Paid', 'Pending', 'Overdue', 'Next Due', ''].map(h => (
                    <th key={h} style={{ padding: '0.75rem 0.875rem', textAlign: 'left', fontSize: '0.68rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {customers.map(c => (
                  <tr key={c.bookingId}
                    style={{ borderBottom: '1px solid #f8fafc', cursor: 'pointer', background: c.totalOverdue > 0 ? '#fef9f9' : '#fff' }}
                    onClick={() => setSelectedCustomer(c)}
                    onMouseEnter={e => e.currentTarget.style.background = '#f0fdf4'}
                    onMouseLeave={e => e.currentTarget.style.background = c.totalOverdue > 0 ? '#fef9f9' : '#fff'}>
                    <td style={{ padding: '0.875rem' }}>
                      <div style={{ fontWeight: 700, color: '#0f172a' }}>{c.customerName}</div>
                      <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '0.1rem' }}>{c.bookingRef} · {c.customerPhone}</div>
                    </td>
                    <td style={{ padding: '0.875rem' }}>
                      <div style={{ fontWeight: 700, color: '#1a6b3c', fontFamily: 'monospace' }}>{c.plotNumber}</div>
                      <div style={{ fontSize: '0.72rem', color: '#64748b' }}>{c.plotSize}</div>
                    </td>
                    <td style={{ padding: '0.875rem', fontWeight: 700, color: '#0f172a', whiteSpace: 'nowrap' }}>{fmtShort(c.totalAmount)}</td>
                    <td style={{ padding: '0.875rem', fontWeight: 700, color: '#059669', whiteSpace: 'nowrap' }}>{fmtShort(c.totalPaid)}</td>
                    <td style={{ padding: '0.875rem', fontWeight: 700, color: '#d97706', whiteSpace: 'nowrap' }}>{fmtShort(c.totalPending)}</td>
                    <td style={{ padding: '0.875rem' }}>
                      {c.totalOverdue > 0 ? (
                        <span style={{ background: '#fee2e2', color: '#dc2626', borderRadius: 9999, padding: '0.2rem 0.5rem', fontSize: '0.72rem', fontWeight: 700, whiteSpace: 'nowrap' }}>{fmtShort(c.totalOverdue)}</span>
                      ) : (
                        <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>—</span>
                      )}
                    </td>
                    <td style={{ padding: '0.875rem', whiteSpace: 'nowrap' }}>
                      {c.nextDueDate ? (
                        <div>
                          <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#374151' }}>{new Date(c.nextDueDate + 'T00:00:00').toLocaleDateString('en-PK', { month: 'short', day: 'numeric' })}</div>
                          <div style={{ fontSize: '0.68rem', color: '#94a3b8' }}>{fmtShort(c.nextDueAmount)}</div>
                        </div>
                      ) : <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>—</span>}
                    </td>
                    <td style={{ padding: '0.875rem' }}>
                      <button style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#1a6b3c', borderRadius: 8, padding: '0.35rem 0.75rem', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}
                        onClick={e => { e.stopPropagation(); setSelectedCustomer(c); }}>
                        View Ledger →
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selectedCustomer && (
        <LedgerPanel
          customer={selectedCustomer}
          onClose={() => { setSelectedCustomer(null); loadCustomers(); }}
          isAdmin={false}
        />
      )}
    </div>
  );
}
