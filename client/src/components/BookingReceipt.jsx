import React from 'react';

const pkr = n => 'PKR ' + Number(n || 0).toLocaleString('en-US');
const fmtDate = iso => {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('en-PK', { day: '2-digit', month: 'long', year: 'numeric' });
};

export default function BookingReceipt({ booking, onClose }) {
  if (!booking) return null;
  const dp = booking.downPayment || 0;
  const total = booking.plotPrice || 0;
  const remaining = total - dp;

  const handlePrint = () => window.print();

  return (
    <>
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #ue-receipt, #ue-receipt * { visibility: visible !important; }
          #ue-receipt {
            position: fixed !important;
            inset: 0 !important;
            width: 210mm !important;
            min-height: 297mm !important;
            margin: 0 auto !important;
            box-shadow: none !important;
            border-radius: 0 !important;
          }
          .no-print { display: none !important; }
        }
        @page { size: A4; margin: 10mm; }
      `}</style>

      {/* Overlay */}
      <div style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', zIndex: 9000,
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        padding: '1.5rem', overflowY: 'auto',
      }}>
        {/* Action bar */}
        <div className="no-print" style={{
          position: 'fixed', top: '1rem', right: '1.5rem', display: 'flex', gap: '0.75rem', zIndex: 9100,
        }}>
          <button onClick={handlePrint} style={{
            background: 'linear-gradient(135deg, #1a6b3c, #059669)', color: '#fff',
            border: 'none', borderRadius: 10, padding: '0.65rem 1.5rem',
            fontWeight: 800, fontSize: '0.9rem', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: '0.5rem', boxShadow: '0 4px 16px rgba(26,107,60,0.3)',
          }}>🖨️ Print Receipt</button>
          <button onClick={onClose} style={{
            background: '#fff', color: '#374151', border: 'none', borderRadius: 10,
            padding: '0.65rem 1.25rem', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer',
          }}>✕ Close</button>
        </div>

        {/* A4 Receipt */}
        <div id="ue-receipt" style={{
          width: '210mm', minHeight: '297mm', background: '#fff',
          borderRadius: 4, boxShadow: '0 8px 40px rgba(0,0,0,0.25)',
          display: 'flex', flexDirection: 'column', fontFamily: '"Segoe UI", Arial, sans-serif',
          overflow: 'hidden', marginTop: '3.5rem',
        }}>

          {/* ── HEADER ── */}
          <div style={{
            background: 'linear-gradient(135deg, #0d2d1a 0%, #1a4a28 50%, #1a6b3c 100%)',
            color: '#fff', padding: '0',
          }}>
            {/* Top gold bar */}
            <div style={{ background: 'linear-gradient(90deg, #c9a227, #f0c040, #c9a227)', height: 5 }} />

            <div style={{ padding: '1.5rem 2rem', display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
              {/* Crest */}
              <div style={{
                width: 70, height: 70, borderRadius: '50%',
                border: '3px solid rgba(212,160,23,0.7)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'rgba(0,0,0,0.2)', flexShrink: 0,
                fontSize: '2rem',
              }}>🏡</div>

              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.25em', color: '#f0c040', textTransform: 'uppercase', marginBottom: '0.2rem' }}>
                  Official Document
                </div>
                <div style={{ fontSize: '1.55rem', fontWeight: 900, color: '#fff', letterSpacing: '0.02em', lineHeight: 1.1 }}>
                  University Enclave Housing Society
                </div>
                <div style={{ fontSize: '0.75rem', color: '#a3e4b8', marginTop: '0.25rem', lineHeight: 1.6 }}>
                  Housing Complex, University Road, Lahore, Punjab, Pakistan &nbsp;|&nbsp; Tel:111-002 001 &nbsp;|&nbsp; info@universityenclave.pk
                </div>
              </div>

              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontSize: '0.6rem', fontWeight: 700, color: '#86efac', textTransform: 'uppercase', letterSpacing: '0.15em' }}>Receipt No.</div>
                <div style={{ fontWeight: 900, fontSize: '1rem', color: '#f0c040', fontFamily: 'monospace' }}>
                  {booking.receiptNumber || `UE-RCPT-${booking.id}`}
                </div>
              </div>
            </div>

            {/* Title bar */}
            <div style={{
              background: 'rgba(0,0,0,0.25)', padding: '0.65rem 2rem',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <div style={{ fontWeight: 900, fontSize: '1.05rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#fff' }}>
                Booking Confirmation Receipt
              </div>
              <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.75rem', color: '#a3e4b8' }}>
                <span><strong style={{ color: '#fff' }}>Booking Ref:</strong> {booking.bookingRef}</span>
                <span><strong style={{ color: '#fff' }}>Date:</strong> {fmtDate(booking.approvedAt || booking.createdAt)}</span>
                <span style={{ background: '#22c55e', color: '#fff', borderRadius: 4, padding: '0.1rem 0.6rem', fontWeight: 800, fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Confirmed</span>
              </div>
            </div>

            {/* Bottom gold bar */}
            <div style={{ background: 'linear-gradient(90deg, #c9a227, #f0c040, #c9a227)', height: 3 }} />
          </div>

          {/* ── BODY ── */}
          <div style={{ flex: 1, padding: '1.5rem 2rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

            {/* Plot Details */}
            <Section title="Plot Details" icon="🏘️" color="#1a6b3c">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.875rem' }}>
                <Field label="Plot Number" value={booking.plotNumber} bold green />
                <Field label="Plot Size" value={booking.plotSize} />
                <Field label="Block / Area" value={booking.area} />
                <Field label="Category" value={booking.category || 'Residential'} capitalize />
                <Field label="Total Price" value={pkr(booking.plotPrice)} bold />
                <Field label="Down Payment Paid" value={pkr(dp)} />
              </div>
            </Section>

            {/* Buyer Information + Photo */}
            <Section title="Buyer Information" icon="👤" color="#1d4ed8">
              <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.625rem' }}>
                    <Field label="Full Name" value={booking.name} bold />
                    <Field label="Father's Name" value={booking.fatherName || '—'} />
                    <Field label="CNIC Number" value={booking.cnic} mono />
                    <Field label="Phone Number" value={booking.phone} mono />
                    <Field label="Email Address" value={booking.email || '—'} />
                    <Field label="Dealer / Agent" value={booking.dealerName || 'Walk-in'} />
                  </div>
                  <div style={{ marginTop: '0.625rem', display: 'grid', gridTemplateColumns: '1fr', gap: '0.5rem' }}>
                    <Field label="Residential Address" value={booking.residentialAddress || booking.address || '—'} fullWidth />
                    <Field label="Postal Address" value={booking.postalAddress || '—'} fullWidth />
                  </div>
                </div>
                {booking.photo && (
                  <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem' }}>
                    <img src={booking.photo} alt="Buyer" style={{ width: 72, height: 88, objectFit: 'cover', border: '2px solid #e2e8f0', borderRadius: 4 }} />
                    <div style={{ fontSize: '0.6rem', color: '#64748b', fontWeight: 600 }}>BUYER PHOTO</div>
                  </div>
                )}
              </div>
            </Section>

            {/* Nominee Information */}
            {booking.nominee && (
              <Section title="Nominee Information" icon="👥" color="#7c3aed">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.625rem' }}>
                  <Field label="Nominee Name" value={booking.nominee.name || '—'} bold />
                  <Field label="Father's Name" value={booking.nominee.fatherName || '—'} />
                  <Field label="Relation to Buyer" value={booking.nominee.relation || '—'} />
                  <Field label="CNIC Number" value={booking.nominee.cnic || '—'} mono />
                  <Field label="Phone Number" value={booking.nominee.phone || '—'} mono />
                  <Field label="Nominee Address" value={booking.nominee.address || '—'} />
                </div>
              </Section>
            )}

            {/* Payment Summary */}
            <Section title="Payment Summary" icon="💰" color="#b45309">
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                <tbody>
                  {[
                    ['Total Plot Price', pkr(total), '#0f172a', false],
                    ['Down Payment Collected', pkr(dp), '#059669', false],
                    ['Remaining Balance', pkr(remaining), '#b45309', true],
                  ].map(([label, value, color, bold]) => (
                    <tr key={label} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '0.55rem 0.5rem', color: '#64748b', fontWeight: 600 }}>{label}</td>
                      <td style={{ padding: '0.55rem 0.5rem', textAlign: 'right', fontWeight: bold ? 800 : 700, color, fontSize: bold ? '0.95rem' : '0.82rem' }}>{value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div style={{ marginTop: '0.625rem', fontSize: '0.72rem', color: '#64748b', fontStyle: 'italic', lineHeight: 1.5 }}>
                * Remaining balance is payable as per the 4-year installment plan. Monthly, semi-annual, and possession payments as per agreed schedule.
              </div>
            </Section>

            {/* Signatures */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1.5rem', marginTop: '0.5rem' }}>
              {[
                { role: 'Buyer / Purchaser', name: booking.name },
                { role: 'Dealer / Agent', name: booking.dealerName || 'Walk-in' },
                { role: 'Authorized by Management', name: booking.approvedBy || 'Management' },
              ].map(sig => (
                <div key={sig.role} style={{ textAlign: 'center' }}>
                  <div style={{ borderTop: '1.5px solid #1a6b3c', paddingTop: '0.5rem', marginTop: '2rem' }}>
                    <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#374151' }}>{sig.name}</div>
                    <div style={{ fontSize: '0.65rem', color: '#64748b' }}>{sig.role}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Terms */}
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 6, padding: '0.75rem 1rem', marginTop: '0.25rem' }}>
              <div style={{ fontSize: '0.65rem', fontWeight: 800, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.35rem' }}>Terms & Conditions</div>
              <div style={{ fontSize: '0.65rem', color: '#64748b', lineHeight: 1.7 }}>
                1. This receipt confirms the booking of the above mentioned plot. Plot ownership is subject to full payment of the agreed amount.
                &nbsp; 2. Down payment collected is non-refundable in case of cancellation by the buyer.
                &nbsp; 3. The remaining balance is payable as per the installment schedule agreed upon at the time of booking.
                &nbsp; 4. Any dispute shall be subject to the jurisdiction of courts in , Pakistan.
              </div>
            </div>
          </div>

          {/* ── FOOTER ── */}
          <div style={{ background: 'linear-gradient(135deg, #0d2d1a, #1a4a28)', color: '#a3e4b8', padding: '0.875rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.68rem' }}>
            <div>
              <div style={{ color: '#f0c040', fontWeight: 800, marginBottom: '0.1rem' }}>University Enclave Housing Society</div>
              <div>Housing Complex, University Road, Lahore, Punjab, Pakistan</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ color: '#fff', fontWeight: 700 }}>Booking Ref: {booking.bookingRef}</div>
              <div>Confirmed on {fmtDate(booking.approvedAt)}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div>Tel:111-002 001</div>
              <div>info@universityenclave.pk</div>
            </div>
          </div>
          <div style={{ background: 'linear-gradient(90deg, #c9a227, #f0c040, #c9a227)', height: 4 }} />
        </div>
      </div>
    </>
  );
}

function Section({ title, icon, color, children }) {
  return (
    <div style={{ border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden' }}>
      <div style={{ background: color + '12', borderBottom: `2px solid ${color}30`, padding: '0.5rem 0.875rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
        <span style={{ fontSize: '0.85rem' }}>{icon}</span>
        <span style={{ fontWeight: 800, fontSize: '0.75rem', color, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{title}</span>
      </div>
      <div style={{ padding: '0.875rem' }}>{children}</div>
    </div>
  );
}

function Field({ label, value, bold, green, mono, capitalize, fullWidth }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.1rem', ...(fullWidth ? { gridColumn: '1 / -1' } : {}) }}>
      <div style={{ fontSize: '0.6rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</div>
      <div style={{
        fontSize: '0.8rem',
        fontWeight: bold ? 800 : 600,
        color: green ? '#065f46' : '#0f172a',
        fontFamily: mono ? 'monospace' : 'inherit',
        textTransform: capitalize ? 'capitalize' : 'none',
        wordBreak: 'break-word',
      }}>{value || '—'}</div>
    </div>
  );
}
