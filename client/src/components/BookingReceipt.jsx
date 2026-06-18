import React, { useState, useEffect, useRef } from 'react';
import ueLogo from '../assets/ue-logo.png';

const pkr = n => 'PKR ' + Number(n || 0).toLocaleString('en-US');
const fmtDate = iso => {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('en-PK', { day: '2-digit', month: 'long', year: 'numeric' });
};

const GOLD = '#b8860b';
const GOLD_LIGHT = '#d4a017';
const GOLD_BG = '#fdf8ee';

const DEFAULT_SETTINGS = {
  societyName: 'UNIVERSITY ENCLAVE HOUSING SOCIETY',
  tagline: 'WHERE COMFORT MEETS ELEGANCE',
  contactEmail: 'info@universityenclave.pk',
  contactPhone: '03100001235',
  address: 'Nathiyaglai Bypass, Havelian, Abbottabad',
  showNomineeSection: true,
  showInstallmentSchedule: true,
  footerNote: '',
};

export default function BookingReceipt({ booking, onClose }) {
  if (!booking) return null;
  const dp = booking.downPayment || 0;
  const total = booking.plotPrice || 0;
  const remaining = total - dp;

  const [shareOpen, setShareOpen] = useState(false);
  const shareRef = useRef(null);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);

  useEffect(() => {
    fetch('/api/receipt-settings')
      .then(r => r.json())
      .then(d => setSettings(s => ({ ...s, ...d })))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!shareOpen) return;
    const handler = (e) => {
      if (shareRef.current && !shareRef.current.contains(e.target)) setShareOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [shareOpen]);

  const handlePrint = () => window.print();

  const handleEmail = () => {
    const subject = encodeURIComponent(`Booking Receipt – ${booking.bookingRef}`);
    const body = encodeURIComponent(
      `Dear ${booking.name},\n\n` +
      `Please find your booking confirmation details below:\n\n` +
      `Booking Reference: ${booking.bookingRef}\n` +
      `Plot Number:       ${booking.plotNumber}\n` +
      `Plot Size:         ${booking.plotSize}\n` +
      `Block / Area:      ${booking.area}\n` +
      `Total Price:       ${pkr(total)}\n` +
      `Down Payment:      ${pkr(dp)}\n` +
      `Remaining Balance: ${pkr(remaining)}\n` +
      `Booking Date:      ${fmtDate(booking.approvedAt || booking.createdAt)}\n\n` +
      `For queries, contact us at ${settings.contactEmail} or call ${settings.contactPhone}.\n\n` +
      `${settings.societyName}\n` +
      `${settings.address}` +
      (settings.footerNote ? `\n\n${settings.footerNote}` : '')
    );
    const recipient = booking.email ? encodeURIComponent(booking.email) : '';
    window.open(`mailto:${recipient}?subject=${subject}&body=${body}`, '_blank');
    setShareOpen(false);
  };

  const handleWhatsApp = () => {
    const text = encodeURIComponent(
      `*${settings.societyName}*\n` +
      `*Booking Confirmation*\n\n` +
      `Dear ${booking.name},\n` +
      `Your plot booking has been confirmed. Details below:\n\n` +
      `📋 *Booking Ref:* ${booking.bookingRef}\n` +
      `🏘️ *Plot No:* ${booking.plotNumber} | ${booking.plotSize} | ${booking.area}\n` +
      `💰 *Total Price:* ${pkr(total)}\n` +
      `✅ *Down Payment:* ${pkr(dp)}\n` +
      `⏳ *Remaining:* ${pkr(remaining)}\n` +
      `📅 *Date:* ${fmtDate(booking.approvedAt || booking.createdAt)}\n\n` +
      `For queries: ${settings.contactPhone} | ${settings.contactEmail}` +
      (settings.footerNote ? `\n\n${settings.footerNote}` : '')
    );
    const phone = booking.phone ? booking.phone.replace(/[^0-9]/g, '') : '';
    const waPhone = phone.startsWith('92') ? phone : phone.startsWith('0') ? '92' + phone.slice(1) : phone ? '92' + phone : '';
    window.open(`https://wa.me/${waPhone}?text=${text}`, '_blank');
    setShareOpen(false);
  };

  const tags = booking.plotTags || booking.tags || [];
  const prefs = [
    { label: 'Normal', checked: tags.length === 0 || tags.includes('Normal') },
    { label: 'Corner', checked: tags.includes('Corner Plot') || tags.includes('Corner') },
    { label: 'Facing Park', checked: tags.includes('Park Facing') || tags.includes('Facing Park') },
    { label: 'Wide Road', checked: tags.includes('Wide Road') },
  ];

  const plotLabel = `${booking.plotSize || ''} ${booking.category ? (booking.category.charAt(0).toUpperCase() + booking.category.slice(1)) : 'Residential'}`.trim();

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
            margin: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
            border-radius: 0 !important;
            overflow: visible !important;
          }
          .no-print { display: none !important; }
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        }
        @page { size: A4 portrait; margin: 6mm; }

        .ue-underline-field {
          border: none;
          border-bottom: 1px solid #999;
          flex: 1;
          min-width: 0;
          font-size: 0.82rem;
          color: #1a1a1a;
          padding: 0 2px 1px 2px;
          background: transparent;
          font-family: inherit;
        }

        .ue-currency-watermark {
          font-size: 0.55rem;
          color: rgba(180,134,11,0.18);
          letter-spacing: 0.04em;
          user-select: none;
          line-height: 1.55;
          word-break: break-all;
          white-space: pre-wrap;
          font-weight: 700;
          text-transform: uppercase;
          text-align: center;
        }
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
            display: 'flex', alignItems: 'center', gap: '0.5rem',
          }}>🖨️ Print / Save PDF</button>

          <div ref={shareRef} style={{ position: 'relative' }}>
            <button onClick={() => setShareOpen(o => !o)} style={{
              background: 'linear-gradient(135deg, #1d4ed8, #2563eb)', color: '#fff',
              border: 'none', borderRadius: 10, padding: '0.65rem 1.5rem',
              fontWeight: 800, fontSize: '0.9rem', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: '0.5rem',
            }}>📤 Share</button>
            {shareOpen && (
              <div style={{
                position: 'absolute', top: 'calc(100% + 0.5rem)', right: 0,
                background: '#fff', borderRadius: 12, boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
                border: '1px solid #e2e8f0', minWidth: 220, overflow: 'hidden', zIndex: 9200,
              }}>
                <div style={{ padding: '0.6rem 1rem 0.4rem', borderBottom: '1px solid #f1f5f9' }}>
                  <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    Send Receipt To Customer
                  </div>
                </div>
                <button onClick={handleEmail} style={{
                  width: '100%', background: 'none', border: 'none', padding: '0.75rem 1rem',
                  display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer',
                  fontSize: '0.88rem', fontWeight: 700, color: '#1e293b', textAlign: 'left',
                  borderBottom: '1px solid #f1f5f9',
                }}
                  onMouseEnter={e => e.currentTarget.style.background = '#f0f9ff'}
                  onMouseLeave={e => e.currentTarget.style.background = 'none'}
                >
                  <span style={{ fontSize: '1.1rem' }}>✉️</span>
                  <div>
                    <div>Email Receipt</div>
                    <div style={{ fontSize: '0.72rem', fontWeight: 500, color: '#64748b' }}>{booking.email || 'Opens email client'}</div>
                  </div>
                </button>
                <button onClick={handleWhatsApp} style={{
                  width: '100%', background: 'none', border: 'none', padding: '0.75rem 1rem',
                  display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer',
                  fontSize: '0.88rem', fontWeight: 700, color: '#1e293b', textAlign: 'left',
                }}
                  onMouseEnter={e => e.currentTarget.style.background = '#f0fdf4'}
                  onMouseLeave={e => e.currentTarget.style.background = 'none'}
                >
                  <span style={{ fontSize: '1.1rem' }}>💬</span>
                  <div>
                    <div>WhatsApp</div>
                    <div style={{ fontSize: '0.72rem', fontWeight: 500, color: '#64748b' }}>{booking.phone || 'Opens WhatsApp'}</div>
                  </div>
                </button>
              </div>
            )}
          </div>

          <button onClick={onClose} style={{
            background: '#fff', color: '#374151', border: 'none', borderRadius: 10,
            padding: '0.65rem 1.25rem', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer',
          }}>✕ Close</button>
        </div>

        {/* ── A4 FORM ── */}
        <div id="ue-receipt" style={{
          width: '210mm', minHeight: '297mm', background: '#fff',
          border: `3px solid ${GOLD}`,
          borderRadius: 2,
          boxShadow: '0 8px 40px rgba(0,0,0,0.25)',
          display: 'flex', flexDirection: 'column',
          fontFamily: '"Times New Roman", Times, serif',
          overflow: 'hidden', marginTop: '3.5rem',
          fontSize: '0.82rem', color: '#1a1a1a',
        }}>

          {/* ── TOP GOLD BAR ── */}
          <div style={{ background: `linear-gradient(90deg, ${GOLD}, ${GOLD_LIGHT}, ${GOLD})`, height: 6 }} />

          {/* ── HEADER: three-column ── */}
          <div style={{
            display: 'grid', gridTemplateColumns: '130px 1fr 130px',
            gap: 0, borderBottom: `1.5px solid ${GOLD}`, padding: '0.6rem 0.75rem 0.5rem',
          }}>
            {/* Left: Info boxes */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
              {[
                { label: 'Booking Form No.', value: booking.bookingRef },
                { label: 'Registration No.', value: booking.plotNumber },
                { label: 'Booking Date', value: fmtDate(booking.approvedAt || booking.createdAt) },
              ].map(({ label, value }) => (
                <div key={label} style={{
                  border: `1px solid ${GOLD}`, padding: '0.2rem 0.4rem', borderRadius: 1,
                  fontSize: '0.68rem',
                }}>
                  <div style={{ color: GOLD, fontWeight: 700, fontSize: '0.6rem', marginBottom: '0.1rem' }}>{label}</div>
                  <div style={{ fontWeight: 700, fontSize: '0.72rem', color: '#1a1a1a' }}>{value || '—'}</div>
                </div>
              ))}
            </div>

            {/* Centre: Logo + name + tagline + title */}
            <div style={{ textAlign: 'center', padding: '0 0.5rem' }}>
              <img src={ueLogo} alt="UECHS Logo" style={{ width: 60, height: 60, objectFit: 'contain', display: 'block', margin: '0 auto 0.2rem' }} />
              <div style={{ fontSize: '0.75rem', fontWeight: 900, color: GOLD, letterSpacing: '0.06em', lineHeight: 1.2 }}>{settings.societyName}</div>
              <div style={{ fontSize: '0.62rem', fontStyle: 'italic', color: GOLD, letterSpacing: '0.06em', marginBottom: '0.3rem' }}>
                {settings.tagline}
              </div>
              <div style={{
                display: 'inline-block',
                border: `1.5px solid ${GOLD}`,
                padding: '0.15rem 1.2rem',
                fontSize: '0.95rem', fontWeight: 900, letterSpacing: '0.18em',
                color: GOLD, textTransform: 'uppercase',
              }}>
                ❖ ❖ ❖
              </div>
              <div style={{
                fontSize: '1rem', fontWeight: 900, letterSpacing: '0.2em',
                color: GOLD, textTransform: 'uppercase', marginTop: '0.15rem',
              }}>
                BOOKING FORM
              </div>
            </div>

            {/* Right: Photo box */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              {booking.photo ? (
                <img src={booking.photo} alt="Buyer" style={{
                  width: 110, height: 110, objectFit: 'cover',
                  border: `2px solid ${GOLD}`,
                }} />
              ) : (
                <div style={{
                  width: 110, height: 110,
                  border: `2px solid ${GOLD}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexDirection: 'column', gap: 4,
                }}>
                  <div style={{ fontSize: '0.62rem', color: GOLD, fontWeight: 700, textAlign: 'center', lineHeight: 1.4 }}>
                    3 x Photographs
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ── PLOT TYPE ── */}
          <div style={{
            textAlign: 'center', padding: '0.35rem 0.75rem',
            borderBottom: `1px solid ${GOLD}`, background: GOLD_BG,
          }}>
            <span style={{ fontSize: '0.95rem', fontWeight: 900, color: '#1a1a1a', letterSpacing: '0.05em' }}>
              {plotLabel}
            </span>
          </div>

          {/* ── PREFERENCES ── */}
          <div style={{
            display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: '80px',
            padding: '0.35rem 0.75rem', borderBottom: `1px solid ${GOLD}`,
          }}>
            <span style={{ fontWeight: 900, color: '#1a1a1a', fontSize: '0.82rem', flexShrink: 0 }}>Preferences:</span>
            {prefs.map(p => (
              <label key={p.label} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.82rem', cursor: 'default' }}>
                <span style={{
                  width: 14, height: 14, border: `1.5px solid #555`,
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '0.7rem', flexShrink: 0, background: p.checked ? '#eee' : '#fff',
                }}>
                  {p.checked ? '✓' : ''}
                </span>
                {p.label}.
              </label>
            ))}
          </div>

          {/* ── BODY ── */}
          <div style={{ flex: 1, padding: '0.5rem 0.75rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>

            {/* Client Information */}
            <GoldSection title="Client Information:">
              <FieldRow>
                <LabelField label="Name:" value={booking.name} flex={2} />
                <LabelField label="S,D, W/O:" value={booking.fatherName} flex={2} />
              </FieldRow>
              <FieldRow>
                <LabelField label="CNIC No:" value={booking.cnic} flex={1.2} />
                <LabelField label="Phone No:" value={booking.phone} flex={1} />
                <LabelField label="Cell No:" value={booking.phone} flex={1} />
              </FieldRow>
              <FieldRow>
                <LabelField label="Postal Address:" value={booking.postalAddress} flex={1} fullWidth />
              </FieldRow>
              <div style={{ borderBottom: '1px solid #bbb', margin: '0.1rem 0' }} />
              <FieldRow>
                <LabelField label="Permanent Address:" value={booking.residentialAddress || booking.address} flex={1} fullWidth />
              </FieldRow>
              <div style={{ borderBottom: '1px solid #bbb', margin: '0.1rem 0' }} />
            </GoldSection>

            {/* Nominee Information — toggleable */}
            {settings.showNomineeSection && (
              <GoldSection title="Nominee Information:">
                <FieldRow>
                  <LabelField label="Name:" value={booking.nominee?.name} flex={2} />
                  <LabelField label="S,D, W/O:" value={booking.nominee?.fatherName} flex={2} />
                </FieldRow>
                <FieldRow>
                  <LabelField label="CNIC No:" value={booking.nominee?.cnic} flex={1.2} />
                  <LabelField label="Phone No:" value={booking.nominee?.phone} flex={1} />
                  <LabelField label="Relation.:" value={booking.nominee?.relation} flex={1} />
                </FieldRow>
              </GoldSection>
            )}

            {/* Currency Note Watermark Strip */}
            <div style={{
              position: 'relative', margin: '0.25rem 0',
              border: `1px solid ${GOLD}`,
              overflow: 'hidden', minHeight: 80,
              background: '#fffef8',
            }}>
              {/* Left logo watermark */}
              <div style={{
                position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)',
                opacity: 0.12, zIndex: 1,
              }}>
                <img src={ueLogo} alt="" style={{ width: 50, height: 50, objectFit: 'contain' }} />
              </div>
              {/* Right logo watermark */}
              <div style={{
                position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
                opacity: 0.12, zIndex: 1,
              }}>
                <img src={ueLogo} alt="" style={{ width: 50, height: 50, objectFit: 'contain' }} />
              </div>
              {/* Repeating text */}
              <div className="ue-currency-watermark" style={{ padding: '0.4rem 70px' }}>
                {Array(10).fill('University Enclave Housing Society ').join('')}
                {'\n'}
                {Array(10).fill('University Enclave Housing Society ').join('')}
                {'\n'}
                {Array(10).fill('University Enclave Housing Society ').join('')}
                {'\n'}
                {Array(10).fill('University Enclave Housing Society ').join('')}
                {'\n'}
                {Array(10).fill('University Enclave Housing Society ').join('')}
              </div>
            </div>

            {/* Payment Information */}
            <GoldSection title="Payment Information:">
              <FieldRow>
                <LabelField label="Plot Value:" value={pkr(total)} flex={2} />
                <LabelField label="Payment Amount:" value={pkr(dp)} flex={2} />
              </FieldRow>
              <FieldRow>
                <LabelField label="Payment Mode:" value={booking.paymentMode || 'Cash'} flex={1} />
                <LabelField label="Paid On:" value={fmtDate(booking.approvedAt || booking.createdAt)} flex={1} />
                <LabelField label="Outstanding Amount:" value={pkr(remaining)} flex={1.2} />
              </FieldRow>
            </GoldSection>

            {/* Installment Schedule — toggleable */}
            {settings.showInstallmentSchedule && (
              <GoldSection title="Installment Schedule:">
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.4rem' }}>
                  {[
                    { label: 'Down Payment (10%)', value: pkr(Math.round(total * 0.10)) },
                    { label: 'Confirmation (10%)', value: pkr(Math.round(total * 0.10)) },
                    { label: 'Monthly (48 installments)', value: pkr(Math.round(total * 0.60 / 48)) + '/mo' },
                    { label: 'Possession (20%)', value: pkr(Math.round(total * 0.20)) },
                  ].map(({ label, value }) => (
                    <div key={label} style={{ border: `1px solid ${GOLD}`, borderRadius: 2, padding: '0.3rem 0.4rem', fontSize: '0.68rem' }}>
                      <div style={{ color: GOLD, fontWeight: 700, fontSize: '0.6rem', marginBottom: '0.1rem' }}>{label}</div>
                      <div style={{ fontWeight: 700, color: '#1a1a1a' }}>{value}</div>
                    </div>
                  ))}
                </div>
              </GoldSection>
            )}

            {/* Blank space for signatures */}
            <div style={{ flex: 1, minHeight: '1rem' }} />

            {/* Footer note */}
            {settings.footerNote && (
              <div style={{
                borderTop: `1px dashed ${GOLD}`, paddingTop: '0.4rem', marginTop: '0.2rem',
                fontSize: '0.72rem', color: '#555', fontStyle: 'italic', lineHeight: 1.5,
              }}>
                {settings.footerNote}
              </div>
            )}

          </div>

          {/* ── CONTACT BAR ── */}
          <div style={{
            background: GOLD_BG, borderTop: `1px solid ${GOLD}`,
            padding: '0.3rem 0.75rem',
            display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1.5rem',
            fontSize: '0.65rem', color: '#555',
          }}>
            <span>✉ {settings.contactEmail}</span>
            <span>📞 {settings.contactPhone}</span>
            <span>📍 {settings.address}</span>
          </div>

          {/* ── SIGNATURE FOOTER ── */}
          <div style={{
            borderTop: `2px solid ${GOLD}`,
            display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr',
            background: GOLD_BG,
          }}>
            {[
              'Client Signature and Thumb',
              'Sales Department',
              'Accounts Department',
              'President UECHS',
            ].map((label, i) => (
              <div key={label} style={{
                textAlign: 'center', padding: '0.5rem 0.25rem',
                borderRight: i < 3 ? `1px solid ${GOLD}` : 'none',
              }}>
                <div style={{ height: 28 }} />
                <div style={{
                  borderTop: `1px solid #555`, paddingTop: '0.2rem',
                  fontSize: '0.68rem', fontWeight: 700, color: GOLD,
                  margin: '0 0.5rem',
                }}>
                  {label}
                </div>
              </div>
            ))}
          </div>

          {/* ── BOTTOM GOLD BAR ── */}
          <div style={{ background: `linear-gradient(90deg, ${GOLD}, ${GOLD_LIGHT}, ${GOLD})`, height: 6 }} />
        </div>
      </div>
    </>
  );
}

function GoldSection({ title, children }) {
  return (
    <div style={{ marginBottom: '0.25rem' }}>
      <div style={{ fontWeight: 900, color: GOLD, fontSize: '0.88rem', marginBottom: '0.3rem' }}>
        {title}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
        {children}
      </div>
    </div>
  );
}

function FieldRow({ children }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.75rem' }}>
      {children}
    </div>
  );
}

function LabelField({ label, value, flex = 1, fullWidth = false }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.25rem', flex }}>
      <span style={{ fontWeight: 700, fontSize: '0.78rem', whiteSpace: 'nowrap', color: '#1a1a1a', flexShrink: 0, paddingBottom: 0, paddingTop: 1 }}>
        {label}
      </span>
      <span style={{
        flex: 1, borderBottom: '1px solid #999',
        fontSize: '0.78rem', color: '#1a1a1a', paddingBottom: 0,
        minWidth: 0, wordBreak: 'break-word',
        display: 'block',
      }}>
        {value || ''}
      </span>
    </div>
  );
}
