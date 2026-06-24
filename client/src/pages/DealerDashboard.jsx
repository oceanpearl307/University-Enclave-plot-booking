import React, { useEffect, useState } from 'react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import PaymentPlanTable from '../components/PaymentPlanTable.jsx';
import CustomerLedger from './CustomerLedger.jsx';

const fmt = n => n >= 1000000 ? 'PKR ' + (n / 1000000).toFixed(1) + 'M' : n > 0 ? 'PKR ' + (n / 1000).toFixed(0) + 'K' : 'PKR 0';

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
        <div key={i} style={{ color: p.color, fontSize: '0.85rem', fontWeight: 700 }}>
          {p.name}: {typeof p.value === 'number' && p.value > 1000 ? fmt(p.value) : p.value}
        </div>
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

const pctColor = pct => pct >= 80 ? '#059669' : pct >= 50 ? '#d97706' : '#dc2626';
const pctGrad = pct => pct >= 80 ? 'linear-gradient(90deg,#059669,#34d399)' : pct >= 50 ? 'linear-gradient(90deg,#d97706,#fbbf24)' : 'linear-gradient(90deg,#dc2626,#f87171)';

export default function DealerDashboard({ dealer, authToken, onLogout, navigate }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!dealer?.id) return;
    fetch(`/api/dealer/dashboard/${dealer.id}`, {
      headers: { Authorization: `Bearer ${authToken}` },
    })
      .then(r => r.json())
      .then(d => {
        if (d.error === 'Authentication required' || d.error === 'Access denied') {
          onLogout();
          return;
        }
        if (d.error || !d.stats) { setError(d.error || 'Failed to load dashboard data.'); setLoading(false); return; }
        setData(d);
        setLoading(false);
      })
      .catch(() => { setError('Failed to load dashboard data.'); setLoading(false); });
  }, [dealer]);

  if (loading) return (
    <div className="loading" style={{ minHeight: '60vh' }}>
      <div className="spinner" style={{ width: 32, height: 32 }}></div>
      Loading your dashboard...
    </div>
  );

  if (error || !data) return (
    <div className="empty-state"><h3>Failed to load dashboard</h3><p>Please refresh the page.</p></div>
  );

  const { target, sizeBreakdown, stats, monthlySales, plotDistribution, recentBookings, activeDeals, inventory, package: pkg, targetPct: rawPct, commission, commissions, packageStats } = data;
  const dealerInfo = data.dealer;

  const totalTarget = stats.totalTarget || 0;
  const achieved = stats.achieved || 0;
  const targetPct = rawPct ?? (totalTarget > 0 ? Math.min(100, Math.round((achieved / totalTarget) * 100)) : 0);
  const paymentPct = stats.paymentTarget > 0 ? Math.min(100, Math.round((stats.paymentsCollected / stats.paymentTarget) * 100)) : 0;
  const targetComplete = totalTarget > 0 && achieved >= totalTarget;

  return (
    <div style={{ background: '#f8fafc', minHeight: '100vh', padding: '2rem 1.5rem' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 900, color: '#0f172a', marginBottom: '0.25rem' }}>My Dashboard</h1>
            <p style={{ color: '#64748b', fontSize: '0.875rem' }}>
              Welcome, <strong style={{ color: '#1a6b3c' }}>{dealer?.name}</strong> · {new Date().toLocaleDateString('en-PK', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button className="btn btn-outline btn-sm" onClick={() => navigate('plots')}>🗺️ View Plots</button>
            <button className="btn btn-primary btn-sm" onClick={onLogout}>Logout</button>
          </div>
        </div>

        {/* Package & Deposit Status Bar */}
        <div style={{ display: 'flex', gap: '0.875rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
          {pkg && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#fff', borderRadius: 12, padding: '0.625rem 1rem', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', border: '1px solid #e0e7ff' }}>
              <span style={{ fontSize: '1rem' }}>📦</span>
              <div>
                <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600 }}>Package</div>
                <div style={{ fontSize: '0.875rem', fontWeight: 800, color: '#1d4ed8' }}>{pkg.name}</div>
              </div>
            </div>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#fff', borderRadius: 12, padding: '0.625rem 1rem', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', border: `1px solid ${dealerInfo.securityDepositPaid ? '#bbf7d0' : '#fde68a'}` }}>
            <span style={{ fontSize: '1rem' }}>{dealerInfo.securityDepositPaid ? '✅' : '⏳'}</span>
            <div>
              <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600 }}>Security Deposit</div>
              <div style={{ fontSize: '0.875rem', fontWeight: 800, color: dealerInfo.securityDepositPaid ? '#065f46' : '#92400e' }}>
                {dealerInfo.securityDepositPaid ? 'Paid' : `Pending — ${fmt(dealerInfo.securityDepositRequired)}`}
              </div>
            </div>
          </div>
          {targetComplete && dealerInfo.rewardGiven && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#f5f3ff', borderRadius: 12, padding: '0.625rem 1rem', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', border: '1px solid #ddd6fe' }}>
              <span style={{ fontSize: '1rem' }}>🏆</span>
              <div>
                <div style={{ fontSize: '0.7rem', color: '#7c3aed', fontWeight: 600 }}>Reward</div>
                <div style={{ fontSize: '0.875rem', fontWeight: 800, color: '#6d28d9' }}>Received</div>
              </div>
            </div>
          )}
        </div>

        {/* Reward Banner */}
        {targetComplete && !dealerInfo.rewardGiven && pkg && (
          <div style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 50%, #1a6b3c 100%)', borderRadius: 16, padding: '1.75rem 2rem', marginBottom: '1.75rem', color: '#fff', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: -20, right: -20, fontSize: '8rem', opacity: 0.1 }}>🎉</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
              <div style={{ fontSize: '3rem' }}>🎁</div>
              <div>
                <div style={{ fontSize: '1.4rem', fontWeight: 900, marginBottom: '0.375rem' }}>Congratulations! Target Achieved!</div>
                <div style={{ opacity: 0.9, fontSize: '0.95rem', marginBottom: '0.5rem' }}>You have completed your {pkg.name} target. Your reward is ready!</div>
                <div style={{ background: 'rgba(255,255,255,0.2)', borderRadius: 10, padding: '0.625rem 1rem', display: 'inline-block' }}>
                  <div style={{ fontWeight: 800, fontSize: '1rem' }}>{pkg.rewardDescription}</div>
                  {pkg.rewardAmount > 0 && <div style={{ fontSize: '0.85rem', opacity: 0.9, marginTop: '0.2rem' }}>+ {fmt(pkg.rewardAmount)} cash bonus</div>}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Stat Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
          <StatCard title="My Bookings" value={achieved} sub="Plots I have booked/sold" icon="🏠" color="#1a6b3c" bg="#f0fdf4" />
          <StatCard title="Total Target" value={totalTarget > 0 ? totalTarget : '—'} sub={totalTarget > 0 ? `${targetPct}% achieved` : 'No target assigned yet'} icon="🎯" color="#d97706" bg="#fffbeb" />
          <StatCard title="Payments Collected" value={fmt(stats.paymentsCollected)} sub={stats.paymentTarget > 0 ? `of ${fmt(stats.paymentTarget)} target` : 'No payment target set'} icon="💰" color="#0ea5e9" bg="#f0f9ff" />
          <StatCard title="Remaining" value={totalTarget > 0 ? Math.max(0, totalTarget - achieved) : '—'} sub={totalTarget > 0 ? 'plots left to reach target' : 'Contact admin for target'} icon="📋" color="#6366f1" bg="#eef2ff" />
        </div>

        {!target ? (
          <div style={{ background: '#fff', borderRadius: 16, padding: '3rem 2rem', textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', border: '1px dashed #e2e8f0', marginBottom: '1.5rem' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎯</div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.5rem' }}>No Target Assigned Yet</h3>
            <p style={{ color: '#64748b', maxWidth: 420, margin: '0 auto', lineHeight: 1.7 }}>
              Your sales target has not been assigned yet. Please contact the admin to set your targets for each plot size category (5 Marla, 7 Marla, 10 Marla, 1 Kanal).
            </p>
          </div>
        ) : (
          <div style={{ background: '#fff', borderRadius: 16, padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', border: '1px solid #f1f5f9', marginBottom: '1.5rem' }}>
            <div style={{ marginBottom: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div>
                <h3 style={{ fontWeight: 800, color: '#0f172a', marginBottom: '0.25rem' }}>My Target Breakdown</h3>
                <p style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                  {target.notes ? `${target.notes} · ` : ''}Progress per plot size
                  {pkg && <span style={{ marginLeft: '0.5rem', background: '#eff6ff', color: '#1d4ed8', borderRadius: 6, padding: '0.15rem 0.4rem', fontSize: '0.72rem', fontWeight: 700 }}>{pkg.name}</span>}
                </p>
              </div>
              <div style={{ background: targetPct >= 80 ? '#f0fdf4' : targetPct >= 50 ? '#fffbeb' : '#fef2f2', border: `1px solid ${pctColor(targetPct)}40`, borderRadius: 10, padding: '0.375rem 0.875rem', fontSize: '0.9rem', fontWeight: 800, color: pctColor(targetPct) }}>
                Overall: {targetPct}%
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
              {sizeBreakdown.filter(s => s.target > 0).map(s => {
                const pct = s.target > 0 ? Math.min(100, Math.round((s.achieved / s.target) * 100)) : 0;
                return (
                  <div key={s.size} style={{ background: '#f8fafc', borderRadius: 12, padding: '1rem', border: '1px solid #f1f5f9' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.625rem' }}>
                      <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#0f172a' }}>{s.size}</div>
                      <div style={{ fontSize: '0.72rem', fontWeight: 700, color: pctColor(pct), background: `${pctColor(pct)}15`, borderRadius: 9999, padding: '0.15rem 0.5rem' }}>{pct}%</div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: '#64748b', marginBottom: '0.5rem' }}>
                      <span>Achieved: <strong style={{ color: '#059669' }}>{s.achieved}</strong></span>
                      <span>Target: <strong style={{ color: '#0f172a' }}>{s.target}</strong></span>
                    </div>
                    <div style={{ height: 8, background: '#e2e8f0', borderRadius: 9999, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: pctGrad(pct), borderRadius: 9999, transition: 'width 0.8s ease' }} />
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '0.375rem' }}>{Math.max(0, s.target - s.achieved)} remaining</div>
                  </div>
                );
              })}
              {sizeBreakdown.every(s => s.target === 0) && (
                <div style={{ gridColumn: '1/-1', textAlign: 'center', color: '#94a3b8', padding: '1rem', fontSize: '0.875rem' }}>All size targets are set to 0. Contact admin to update.</div>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#374151' }}>🎯 Overall Plot Target</div>
                  <div style={{ fontSize: '1rem', fontWeight: 900, color: pctColor(targetPct) }}>{targetPct}%</div>
                </div>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.5rem' }}>{achieved} of {totalTarget} plots</div>
                <div style={{ height: 10, background: '#f1f5f9', borderRadius: 9999, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${targetPct}%`, background: pctGrad(targetPct), borderRadius: 9999, transition: 'width 1s ease' }} />
                </div>
              </div>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#374151' }}>💰 Payment Target</div>
                  {stats.paymentTarget > 0 && <div style={{ fontSize: '1rem', fontWeight: 900, color: pctColor(paymentPct) }}>{paymentPct}%</div>}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.5rem' }}>
                  {stats.paymentTarget > 0 ? `${fmt(stats.paymentsCollected)} of ${fmt(stats.paymentTarget)}` : 'No payment target set'}
                </div>
                {stats.paymentTarget > 0 && (
                  <div style={{ height: 10, background: '#f1f5f9', borderRadius: 9999, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${paymentPct}%`, background: 'linear-gradient(90deg,#0ea5e9,#38bdf8)', borderRadius: 9999, transition: 'width 1s ease' }} />
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Inventory */}
        {inventory && (
          <div style={{ background: '#fff', borderRadius: 16, padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', border: '1px solid #f1f5f9', marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div>
                <h3 style={{ fontWeight: 800, color: '#0f172a', marginBottom: '0.25rem' }}>My Inventory</h3>
                <p style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Available plots from the society inventory for your assigned package sizes</p>
              </div>
              {pkg && <span style={{ background: '#eff6ff', color: '#1d4ed8', borderRadius: 8, padding: '0.25rem 0.75rem', fontSize: '0.75rem', fontWeight: 700 }}>📦 {pkg.name}</span>}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1rem' }}>
              {inventory.map(item => (
                <div key={item.size} style={{ borderRadius: 12, border: `1.5px solid ${item.availableCount > 0 ? '#bbf7d0' : '#fecaca'}`, overflow: 'hidden' }}>
                  <div style={{ background: item.availableCount > 0 ? 'linear-gradient(135deg, #f0fdf4, #dcfce7)' : item.assignedCount > 0 ? '#fef2f2' : '#fffbeb', padding: '0.875rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#0f172a' }}>{item.size}</div>
                    {item.availableCount > 0 ? (
                      <span style={{ background: '#059669', color: '#fff', borderRadius: 9999, padding: '0.2rem 0.625rem', fontSize: '0.72rem', fontWeight: 800 }}>
                        {item.availableCount} Available
                      </span>
                    ) : item.assignedCount > 0 ? (
                      <span style={{ background: '#dc2626', color: '#fff', borderRadius: 9999, padding: '0.2rem 0.625rem', fontSize: '0.72rem', fontWeight: 800 }}>
                        Not Available
                      </span>
                    ) : (
                      <span style={{ background: '#d97706', color: '#fff', borderRadius: 9999, padding: '0.2rem 0.625rem', fontSize: '0.72rem', fontWeight: 800 }}>
                        Not Assigned
                      </span>
                    )}
                  </div>
                  <div style={{ padding: '0.75rem 1rem' }}>
                    {item.availableCount > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: 180, overflowY: 'auto' }}>
                        {item.plots.map(p => (
                          <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', borderRadius: 8, padding: '0.5rem 0.75rem' }}>
                            <div>
                              <div style={{ fontWeight: 700, fontSize: '0.82rem', color: '#1a6b3c', fontFamily: 'monospace' }}>{p.number}</div>
                              <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>{p.area}{p.description ? ` · ${p.description}` : ''}</div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                              <div style={{ fontWeight: 800, fontSize: '0.82rem', color: '#0f172a' }}>{fmt(p.price)}</div>
                              {p.tags?.includes('corner') || p.tags?.includes('park-facing') ? (
                                <div style={{ fontSize: '0.65rem', color: '#d97706', fontWeight: 700 }}>★ Premium</div>
                              ) : null}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : item.assignedCount > 0 ? (
                      <div style={{ textAlign: 'center', padding: '0.75rem 0', color: '#94a3b8', fontSize: '0.82rem' }}>
                        All assigned plots are currently booked or sold.
                      </div>
                    ) : (
                      <div style={{ textAlign: 'center', padding: '0.75rem 0', color: '#92400e', fontSize: '0.82rem' }}>
                        No plots of this size assigned yet.<br />
                        <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Contact admin to assign plots.</span>
                      </div>
                    )}
                  </div>
                  {item.quota > 0 && (
                    <div style={{ padding: '0.5rem 1rem', borderTop: '1px solid #f1f5f9', fontSize: '0.72rem', color: '#94a3b8' }}>
                      Your target quota: <strong style={{ color: '#374151' }}>{item.quota} plots</strong>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}


        {/* Charts */}
        <div className="dash-charts-grid">
          <div style={{ background: '#fff', borderRadius: 16, padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', border: '1px solid #f1f5f9' }}>
            <h3 style={{ fontWeight: 800, color: '#0f172a', marginBottom: '0.25rem' }}>My Monthly Bookings</h3>
            <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '1.25rem' }}>Bookings made per month</p>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={monthlySales} barCategoryGap="35%">
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc' }} />
                <Bar dataKey="bookings" name="Bookings" fill="#1a6b3c" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div style={{ background: '#fff', borderRadius: 16, padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', border: '1px solid #f1f5f9' }}>
            <h3 style={{ fontWeight: 800, color: '#0f172a', marginBottom: '0.25rem' }}>Payment Collection Trend</h3>
            <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '1.25rem' }}>Monthly payments from my bookings</p>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={monthlySales}>
                <defs>
                  <linearGradient id="payGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#1a6b3c" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#1a6b3c" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={v => v > 0 ? fmt(v) : '0'} tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={65} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="payments" name="Collected" stroke="#1a6b3c" strokeWidth={2.5} fill="url(#payGrad)" dot={{ fill: '#1a6b3c', strokeWidth: 0, r: 4 }} activeDot={{ r: 6 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div style={{ background: '#fff', borderRadius: 16, padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', border: '1px solid #f1f5f9', marginBottom: '1.5rem' }}>
          <h3 style={{ fontWeight: 800, color: '#0f172a', marginBottom: '0.25rem' }}>My Package Plot Status</h3>
          <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '1.25rem' }}>{pkg ? `${pkg.name} package — assigned plots breakdown` : 'Plot distribution across your assigned inventory'}</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '2rem', flexWrap: 'wrap' }}>
            <ResponsiveContainer width={180} height={180}>
              <PieChart>
                <Pie data={plotDistribution} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" labelLine={false} label={renderCustomLabel}>
                  {plotDistribution.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
              {plotDistribution.map(d => (
                <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span style={{ width: 10, height: 10, borderRadius: '50%', background: d.color, display: 'inline-block', flexShrink: 0 }} />
                  <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#374151', minWidth: 70 }}>{d.name}</span>
                  <span style={{ fontSize: '1.25rem', fontWeight: 900, color: d.color }}>{d.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Active Deals */}
        {activeDeals && activeDeals.length > 0 && (
          <div style={{ background: '#fff', borderRadius: 16, padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', border: '1px solid #f1f5f9', marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div>
                <h3 style={{ fontWeight: 800, color: '#0f172a', marginBottom: '0.25rem' }}>Current Deals & Offers</h3>
                <p style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Active promotional offers from the society</p>
              </div>
              <span style={{ background: '#fef3c7', color: '#92400e', borderRadius: 9999, padding: '0.25rem 0.75rem', fontSize: '0.75rem', fontWeight: 800 }}>🏷️ {activeDeals.length} Active</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
              {activeDeals.map(deal => (
                <div key={deal.id} style={{ borderRadius: 14, border: `2px solid ${deal.highlighted ? '#fcd34d' : '#e2e8f0'}`, padding: '1.25rem', background: deal.highlighted ? '#fffbeb' : '#f8fafc', position: 'relative', overflow: 'hidden' }}>
                  {deal.highlighted && <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: 'linear-gradient(90deg, #f59e0b, #fbbf24)' }} />}
                  <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#0f172a', marginBottom: '0.375rem', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                    {deal.highlighted && '⭐'} {deal.name}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '0.75rem', lineHeight: 1.5 }}>{deal.description}</div>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.875rem' }}>
                    {deal.specialPrice && <span style={{ background: '#d1fae5', color: '#065f46', borderRadius: 7, padding: '0.25rem 0.6rem', fontSize: '0.78rem', fontWeight: 700 }}>Special: {fmt(deal.specialPrice)}</span>}
                    <span style={{ background: '#f1f5f9', color: '#374151', borderRadius: 7, padding: '0.25rem 0.6rem', fontSize: '0.78rem', fontWeight: 600 }}>Until {deal.validUntil}</span>
                    {deal.plots?.length > 0 && <span style={{ background: '#eff6ff', color: '#1d4ed8', borderRadius: 7, padding: '0.25rem 0.6rem', fontSize: '0.78rem', fontWeight: 600 }}>{deal.plots.length} plots</span>}
                  </div>
                  {deal.paymentPlanInfo && <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.75rem' }}>💳 {deal.paymentPlanInfo}</div>}
                  {deal.plots?.length > 0 && (
                    <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap' }}>
                      {deal.plots.map(p => (
                        <button key={p.id} onClick={() => navigate('booking', p)} style={{ background: '#1a6b3c', color: '#fff', border: 'none', borderRadius: 8, padding: '0.375rem 0.75rem', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer' }}>
                          Book {p.number}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Customer Ledger */}
        <CustomerLedger dealer={dealer} authToken={authToken} />

        {/* Payment Plan */}
        <div style={{ background: '#fff', borderRadius: 16, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', border: '1px solid #f1f5f9', marginBottom: '1.5rem' }}>
          <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div>
              <h3 style={{ fontWeight: 800, color: '#0f172a', marginBottom: '0.25rem' }}>Society Payment Plan</h3>
              <p style={{ fontSize: '0.8rem', color: '#94a3b8' }}>4-year installment schedule for all plot sizes</p>
            </div>
            <button className="btn btn-outline btn-sm" onClick={() => navigate('booking')}>📋 Book a Plot</button>
          </div>
          <PaymentPlanTable />
        </div>

        {/* Recent Bookings */}
        <div style={{ background: '#fff', borderRadius: 16, padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', border: '1px solid #f1f5f9' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <div>
              <h3 style={{ fontWeight: 800, color: '#0f172a', marginBottom: '0.25rem' }}>My Recent Bookings</h3>
              <p style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Bookings you have personally made</p>
            </div>
          </div>

          {recentBookings.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>📋</div>
              <div style={{ fontWeight: 600 }}>No bookings yet</div>
              <div style={{ fontSize: '0.85rem', marginTop: '0.25rem' }}>Your bookings will appear here once you start making reservations.</div>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #f1f5f9' }}>
                    {['Ref #', 'Plot', 'Size', 'Customer', 'Amount', 'Status', 'Date'].map(h => (
                      <th key={h} style={{ padding: '0.75rem 0.875rem', textAlign: 'left', fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {recentBookings.map((b, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #f8fafc' }}
                      onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                      <td style={{ padding: '0.875rem', fontWeight: 700, color: '#1a6b3c', fontFamily: 'monospace' }}>{b.ref}</td>
                      <td style={{ padding: '0.875rem', fontWeight: 600 }}>{b.plot}</td>
                      <td style={{ padding: '0.875rem', color: '#64748b', fontSize: '0.8rem' }}>{b.size}</td>
                      <td style={{ padding: '0.875rem', color: '#374151' }}>{b.customer}</td>
                      <td style={{ padding: '0.875rem', fontWeight: 700, color: '#0f172a' }}>{fmt(b.amount)}</td>
                      <td style={{ padding: '0.875rem' }}>
                        <span style={{
                          background: b.status === 'pending' ? '#fef3c7' : b.status === 'confirmed' ? '#d1fae5' : '#f3f4f6',
                          color: b.status === 'pending' ? '#92400e' : b.status === 'confirmed' ? '#065f46' : '#374151',
                          padding: '0.2rem 0.625rem', borderRadius: 9999, fontSize: '0.72rem', fontWeight: 700, textTransform: 'capitalize',
                        }}>{b.status}</span>
                      </td>
                      <td style={{ padding: '0.875rem', color: '#94a3b8', fontSize: '0.8rem' }}>
                        {new Date(b.date).toLocaleDateString('en-PK', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
