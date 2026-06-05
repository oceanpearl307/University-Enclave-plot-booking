import React, { useState } from 'react';

export const PAYMENT_PLANS = {
  '5 Marla': {
    total: 4000000,
    downPayment: 400000,
    confirmation: 400000,
    monthlyInstallment: 20000,
    monthlyCount: 40,
    semiAnnualInstallment: 130000,
    semiAnnualCount: 8,
    possession: 1360000,
  },
  '7 Marla': {
    total: 5460000,
    downPayment: 546000,
    confirmation: 546000,
    monthlyInstallment: 25000,
    monthlyCount: 40,
    semiAnnualInstallment: 150000,
    semiAnnualCount: 8,
    possession: 2168000,
  },
  '10 Marla': {
    total: 7600000,
    downPayment: 760000,
    confirmation: 760000,
    monthlyInstallment: 38000,
    monthlyCount: 40,
    semiAnnualInstallment: 200000,
    semiAnnualCount: 8,
    possession: 2960000,
  },
  '1 Kanal': {
    total: 14400000,
    downPayment: 1440000,
    confirmation: 1440000,
    monthlyInstallment: 70000,
    monthlyCount: 40,
    semiAnnualInstallment: 300000,
    semiAnnualCount: 8,
    possession: 6320000,
  },
};

export const PLAN_SIZES = ['5 Marla', '7 Marla', '10 Marla', '1 Kanal'];

export const pkr = n => 'PKR ' + Number(n).toLocaleString('en-US');

export function generatePaymentSchedule(plotSize, downPaymentPaid, totalPrice) {
  const plan = PAYMENT_PLANS[plotSize];
  if (!plan) return null;
  const total = totalPrice > 0 ? totalPrice : plan.total;
  const minDownPayment = Math.round(total * 0.10);
  const dp = downPaymentPaid > 0 ? downPaymentPaid : minDownPayment;
  const extra = Math.max(0, dp - minDownPayment);
  const scale = total / plan.total;
  return {
    plotSize,
    downPaymentPaid: dp,
    minDownPayment,
    extraCredit: extra,
    standardDownPayment: minDownPayment,
    confirmation: Math.round(plan.confirmation * scale),
    monthlyInstallment: Math.round(plan.monthlyInstallment * scale),
    monthlyCount: plan.monthlyCount,
    monthlyTotal: Math.round(plan.monthlyInstallment * plan.monthlyCount * scale),
    semiAnnualInstallment: Math.round(plan.semiAnnualInstallment * scale),
    semiAnnualCount: plan.semiAnnualCount,
    semiAnnualTotal: Math.round(plan.semiAnnualInstallment * plan.semiAnnualCount * scale),
    possession: Math.round(plan.possession * scale),
    total,
    remaining: total - dp,
  };
}

const ROWS = [
  { key: 'downPayment', icon: '⬇', label: 'Down Payment', count: null },
  { key: 'confirmation', icon: '✓', label: 'Confirmation within 30 Days', count: null },
  { key: 'monthlyInstallment', icon: '📅', label: 'Monthly Installment', countKey: 'monthlyCount' },
  { key: 'semiAnnualInstallment', icon: '📆', label: 'Semi Annual Installment', countKey: 'semiAnnualCount' },
  { key: 'possession', icon: '🔑', label: 'Possession', count: null },
];

export default function PaymentPlanTable() {
  const [activeTab, setActiveTab] = useState(null);

  return (
    <section style={{ padding: '3.5rem 1.5rem', background: 'linear-gradient(180deg, #f8fafc 0%, #fff 100%)' }}>
      <div className="container">
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
            <div style={{ flex: 1, height: 1, width: 40, background: 'linear-gradient(90deg, transparent, #d4a017)' }} />
            <span style={{ fontSize: '0.75rem', fontWeight: 800, letterSpacing: '0.18em', color: '#d4a017', textTransform: 'uppercase' }}>University Enclave</span>
            <div style={{ flex: 1, height: 1, width: 40, background: 'linear-gradient(90deg, #d4a017, transparent)' }} />
          </div>
          <h2 style={{ fontSize: 'clamp(1.5rem, 3.5vw, 2.25rem)', fontWeight: 900, color: '#0f172a', marginBottom: '0.5rem', letterSpacing: '-0.01em' }}>
            4 Years Payment Plan
          </h2>
          <p style={{ color: '#64748b', fontSize: '0.95rem', maxWidth: 480, margin: '0 auto' }}>
            Flexible installment options across all plot sizes — own your plot with easy monthly payments over 4 years.
          </p>
        </div>

        {/* Mobile tab selector */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', overflowX: 'auto', paddingBottom: '0.25rem' }} className="payment-tabs">
          {[{ label: 'All Sizes', value: null }, ...PLAN_SIZES.map(s => ({ label: s, value: s }))].map(t => (
            <button
              key={t.label}
              onClick={() => setActiveTab(t.value)}
              style={{
                padding: '0.5rem 1rem',
                borderRadius: 9999,
                border: `1.5px solid ${activeTab === t.value ? '#1a6b3c' : '#e2e8f0'}`,
                background: activeTab === t.value ? '#1a6b3c' : '#fff',
                color: activeTab === t.value ? '#fff' : '#374151',
                fontWeight: 700,
                fontSize: '0.78rem',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Table */}
        <div style={{ overflowX: 'auto', borderRadius: 18, boxShadow: '0 4px 24px rgba(0,0,0,0.10)', border: '1px solid rgba(212,160,23,0.2)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: activeTab ? 280 : 480 }}>
            <thead>
              <tr style={{ background: 'linear-gradient(135deg, #0d2d1a 0%, #1a4a28 60%, #1a6b3c 100%)' }}>
                <th style={{ padding: '1rem 1rem', textAlign: 'left', color: '#a3e4b8', fontSize: '0.78rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', borderRight: '1px solid rgba(255,255,255,0.08)', minWidth: 140 }}>
                  Payment Schedule
                </th>
                {(activeTab ? [activeTab] : PLAN_SIZES).map((size, i) => (
                  <th key={size} style={{
                    padding: '1.25rem 1rem',
                    textAlign: 'center',
                    borderRight: i < (activeTab ? 0 : PLAN_SIZES.length - 1) ? '1px solid rgba(255,255,255,0.08)' : 'none',
                  }}>
                    <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem' }}>
                      <div style={{ width: 28, height: 28, borderRadius: '50%', border: '1.5px solid rgba(212,160,23,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem', marginBottom: '0.25rem' }}>🏡</div>
                      <span style={{ color: '#fcd34d', fontWeight: 800, fontSize: '1rem', letterSpacing: '0.03em' }}>{size}</span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ROWS.map((row, ri) => {
                const isLast = ri === ROWS.length - 1;
                return (
                  <tr key={row.key} style={{ background: ri % 2 === 0 ? '#fff' : '#f8faf9', borderBottom: isLast ? 'none' : '1px solid #f0f4f2' }}>
                    <td style={{ padding: '1rem 1.5rem', borderRight: '1px solid #e8f0eb', display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                      <span style={{ fontSize: '1rem', flexShrink: 0 }}>{row.icon}</span>
                      <div>
                        <div style={{ fontWeight: 600, color: '#1a2e1a', fontSize: '0.875rem' }}>{row.label}</div>
                        {row.countKey && (
                          <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '0.1rem' }}>
                            × {PAYMENT_PLANS['5 Marla'][row.countKey]} installments
                          </div>
                        )}
                      </div>
                    </td>
                    {(activeTab ? [activeTab] : PLAN_SIZES).map((size, si) => {
                      const plan = PAYMENT_PLANS[size];
                      const val = plan[row.key];
                      return (
                        <td key={size} style={{ padding: '1rem', textAlign: 'center', borderRight: si < (activeTab ? 0 : PLAN_SIZES.length - 1) ? '1px solid #e8f0eb' : 'none' }}>
                          <div style={{ fontWeight: 700, color: '#1a3020', fontSize: '0.92rem' }}>
                            {val.toLocaleString('en-US')}
                          </div>
                          {row.countKey && (
                            <div style={{ fontSize: '0.68rem', color: '#94a3b8', marginTop: '0.1rem' }}>per installment</div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
              <tr style={{ background: 'linear-gradient(135deg, #1a4a28, #1a6b3c)', borderTop: '2px solid rgba(212,160,23,0.3)' }}>
                <td style={{ padding: '1.125rem 1.5rem', borderRight: '1px solid rgba(255,255,255,0.1)' }}>
                  <span style={{ fontWeight: 800, color: '#fcd34d', fontSize: '0.9rem', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Total</span>
                </td>
                {(activeTab ? [activeTab] : PLAN_SIZES).map((size, si) => (
                  <td key={size} style={{ padding: '1.125rem 1rem', textAlign: 'center', borderRight: si < (activeTab ? 0 : PLAN_SIZES.length - 1) ? '1px solid rgba(255,255,255,0.1)' : 'none' }}>
                    <div style={{ fontWeight: 900, color: '#fcd34d', fontSize: '1rem' }}>
                      {PAYMENT_PLANS[size].total.toLocaleString('en-US')}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: '#86efac', marginTop: '0.1rem' }}>PKR</div>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>

        <div style={{ display: 'flex', gap: '1.5rem', justifyContent: 'center', flexWrap: 'wrap', marginTop: '1.75rem' }}>
          {[
            { icon: '⬇', text: 'Easy Down Payment', color: '#059669' },
            { icon: '📅', text: '40 Monthly Installments', color: '#d97706' },
            { icon: '📆', text: '8 Semi-Annual Payments', color: '#7c3aed' },
            { icon: '🔑', text: 'Possession on Completion', color: '#0ea5e9' },
          ].map(f => (
            <div key={f.text} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.82rem', color: '#374151', fontWeight: 600 }}>
              <span style={{ width: 30, height: 30, borderRadius: '50%', background: f.color + '15', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem', border: `1px solid ${f.color}30` }}>{f.icon}</span>
              {f.text}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function PaymentPlanCard({ plotSize, downPaymentPaid }) {
  const plan = PAYMENT_PLANS[plotSize];
  if (!plan) return null;
  const schedule = generatePaymentSchedule(plotSize, downPaymentPaid);

  return (
    <div style={{ borderRadius: 14, overflow: 'hidden', border: '1.5px solid rgba(212,160,23,0.25)', boxShadow: '0 2px 12px rgba(26,107,60,0.08)' }}>
      <div style={{ background: 'linear-gradient(135deg, #0d2d1a, #1a6b3c)', padding: '0.875rem 1.125rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ color: '#86efac', fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase' }}>Payment Plan</div>
          <div style={{ color: '#fcd34d', fontWeight: 800, fontSize: '1rem' }}>{plotSize}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ color: '#a3e4b8', fontSize: '0.68rem', fontWeight: 600 }}>4 Year Plan</div>
          <div style={{ color: '#fff', fontWeight: 800 }}>PKR {plan.total.toLocaleString('en-US')}</div>
        </div>
      </div>
      <div style={{ background: '#fff' }}>
        {[
          { label: 'Down Payment', value: downPaymentPaid > 0 ? downPaymentPaid : plan.downPayment, paid: downPaymentPaid > 0, icon: '⬇' },
          { label: 'Confirmation (30 days)', value: plan.confirmation, icon: '✓' },
          { label: `Monthly × ${plan.monthlyCount}`, value: plan.monthlyInstallment, sub: `Total: PKR ${(plan.monthlyInstallment * plan.monthlyCount).toLocaleString('en-US')}`, icon: '📅' },
          { label: `Semi-Annual × ${plan.semiAnnualCount}`, value: plan.semiAnnualInstallment, sub: `Total: PKR ${(plan.semiAnnualInstallment * plan.semiAnnualCount).toLocaleString('en-US')}`, icon: '📆' },
          { label: 'Possession', value: plan.possession, icon: '🔑' },
        ].map((row, i) => (
          <div key={row.label} style={{ padding: '0.7rem 1.125rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: i < 4 ? '1px solid #f0f4f2' : 'none', background: i % 2 === 0 ? '#fff' : '#f9fdfb' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.9rem' }}>{row.icon}</span>
              <div>
                <div style={{ fontSize: '0.8rem', color: '#374151', fontWeight: 600 }}>{row.label}</div>
                {row.sub && <div style={{ fontSize: '0.68rem', color: '#94a3b8' }}>{row.sub}</div>}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontWeight: 800, color: '#1a3020', fontSize: '0.88rem' }}>
                {row.value.toLocaleString('en-US')}
              </div>
              {row.paid && <div style={{ fontSize: '0.65rem', color: '#059669', fontWeight: 700 }}>✓ Paid</div>}
            </div>
          </div>
        ))}
        <div style={{ padding: '0.875rem 1.125rem', background: 'linear-gradient(135deg, #f0fdf4, #ecfdf5)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '2px solid #bbf7d0' }}>
          <span style={{ fontWeight: 800, color: '#065f46', fontSize: '0.88rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total</span>
          <span style={{ fontWeight: 900, color: '#1a6b3c', fontSize: '1rem' }}>PKR {plan.total.toLocaleString('en-US')}</span>
        </div>
        {downPaymentPaid > 0 && (
          <div style={{ padding: '0.625rem 1.125rem', background: '#fffbeb', borderTop: '1px solid #fde68a', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.78rem', color: '#92400e', fontWeight: 600 }}>Remaining Balance</span>
            <span style={{ fontWeight: 800, color: '#b45309', fontSize: '0.9rem' }}>PKR {(plan.total - downPaymentPaid).toLocaleString('en-US')}</span>
          </div>
        )}
      </div>
    </div>
  );
}
