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

  const copyData = { booking, settings, prefs, plotLabel, dp, total, remaining };

  return (
    <>
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #ue-print-copies, #ue-print-copies * { visibility: visible !important; }
          #ue-print-copies {
            position: fixed !important;
            inset: 0 !important;
            width: 210mm !important;
            margin: 0 !important;
            padding: 0 !important;
            display: flex !important;
            flex-direction: column !important;
            background: #fff !important;
          }
          .no-print { display: none !important; }
          .ue-cut-line { display: flex !important; }
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        }
        @page { size: A4 portrait; margin: 4mm; }

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

        .ue-cut-line {
          display: none;
          align-items: center;
          gap: 0.5rem;
          padding: 0 4mm;
          font-size: 0.6rem;
          color: #999;
          flex-shrink: 0;
        }
        .ue-cut-line::before,
        .ue-cut-line::after {
          content: '';
          flex: 1;
          border-top: 1px dashed #bbb;
        }
      `}</style>

      {/* ── SCREEN OVERLAY ── */}
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

        {/* ── SCREEN A4 RECEIPT (single copy, full size) ── */}
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
          <ReceiptCopyBody {...copyData} copyLabel={null} />
        </div>
      </div>

      {/* ── PRINT-ONLY: 3 copies on one A4 sheet ── */}
      <div id="ue-print-copies" style={{ display: 'none' }}>
        <ReceiptCopyBody {...copyData} copyLabel="Customer Copy" compact />
        <div className="ue-cut-line">✂</div>
        <ReceiptCopyBody {...copyData} copyLabel="Dealer's Copy" compact />
        <div className="ue-cut-line">✂</div>
        <ReceiptCopyBody {...copyData} copyLabel="Company Record Copy" compact />
      </div>
    </>
  );
}

function ReceiptCopyBody({ booking, settings, prefs, plotLabel, dp, total, remaining, copyLabel, compact }) {
  const F = compact ? {
    base: '0.6rem',
    label: '0.56rem',
    section: '0.64rem',
    heading: '0.65rem',
    plot: '0.72rem',
    info: '0.52rem',
    infoVal: '0.56rem',
    barH: 4,
    logoW: 32,
    photoW: 70,
    pad: '0.18rem 0.5rem',
    innerPad: '0.25rem 0.5rem',
    gap: '0.2rem',
    bodyGap: '0.18rem',
    bodyPad: '0.2rem 0.5rem',
    fieldGap: '0.4rem',
    fieldRowGap: '0.15rem',
    wmarkH: 30,
    sigH: 14,
  } : {
    base: '0.82rem',
    label: '0.78rem',
    section: '0.88rem',
    heading: '0.75rem',
    plot: '0.95rem',
    info: '0.68rem',
    infoVal: '0.72rem',
    barH: 6,
    logoW: 60,
    photoW: 110,
    pad: '0.6rem 0.75rem 0.5rem',
    innerPad: '0.35rem 0.75rem',
    gap: '0.3rem',
    bodyGap: '0.4rem',
    bodyPad: '0.5rem 0.75rem',
    fieldGap: '0.75rem',
    fieldRowGap: '0.35rem',
    wmarkH: 80,
    sigH: 28,
  };

  return (
    <div style={{
      flex: compact ? 1 : undefined,
      display: 'flex', flexDirection: 'column',
      fontFamily: '"Times New Roman", Times, serif',
      background: '#fff',
      fontSize: F.base, color: '#1a1a1a',
      overflow: 'hidden',
      position: 'relative',
      pageBreakInside: 'avoid',
      breakInside: 'avoid',
    }}>
      {/* TOP GOLD BAR */}
      <div style={{ background: `linear-gradient(90deg, ${GOLD}, ${GOLD_LIGHT}, ${GOLD})`, height: F.barH, flexShrink: 0 }} />

      {/* HEADER */}
      <div style={{
        display: 'grid', gridTemplateColumns: compact ? '90px 1fr 80px' : '130px 1fr 130px',
        gap: 0, borderBottom: `1.5px solid ${GOLD}`, padding: F.pad,
        flexShrink: 0,
      }}>
        {/* Left info boxes */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: F.gap }}>
          {[
            { label: 'Booking Form No.', value: booking.bookingRef },
            { label: 'Registration No.', value: booking.plotNumber },
            { label: 'Booking Date', value: fmtDate(booking.approvedAt || booking.createdAt) },
          ].map(({ label, value }) => (
            <div key={label} style={{
              border: `1px solid ${GOLD}`, padding: compact ? '0.12rem 0.3rem' : '0.2rem 0.4rem', borderRadius: 1,
            }}>
              <div style={{ color: GOLD, fontWeight: 700, fontSize: F.info, marginBottom: '0.05rem' }}>{label}</div>
              <div style={{ fontWeight: 700, fontSize: F.infoVal, color: '#1a1a1a' }}>{value || '—'}</div>
            </div>
          ))}
        </div>

        {/* Centre: logo + name + tagline + title */}
        <div style={{ textAlign: 'center', padding: '0 0.5rem', position: 'relative' }}>
          {copyLabel && (
            <div style={{
              position: 'absolute', top: 0, right: 0,
              background: GOLD, color: '#fff',
              fontSize: '0.52rem', fontWeight: 900,
              padding: '0.1rem 0.35rem',
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              borderBottomLeftRadius: 3,
            }}>
              {copyLabel}
            </div>
          )}
          <img src={ueLogo} alt="UECHS Logo" style={{ width: F.logoW, height: F.logoW, objectFit: 'contain', display: 'block', margin: '0 auto 0.1rem' }} />
          <div style={{ fontSize: F.heading, fontWeight: 900, color: GOLD, letterSpacing: '0.06em', lineHeight: 1.2 }}>{settings.societyName}</div>
          <div style={{ fontSize: compact ? '0.5rem' : '0.62rem', fontStyle: 'italic', color: GOLD, letterSpacing: '0.06em', marginBottom: '0.15rem' }}>
            {settings.tagline}
          </div>
          <div style={{
            display: 'inline-block',
            border: `1px solid ${GOLD}`,
            padding: compact ? '0.08rem 0.6rem' : '0.15rem 1.2rem',
            fontSize: compact ? '0.7rem' : '0.95rem', fontWeight: 900, letterSpacing: '0.18em',
            color: GOLD,
          }}>
            ❖ ❖ ❖
          </div>
          <div style={{
            fontSize: compact ? '0.7rem' : '1rem', fontWeight: 900, letterSpacing: '0.2em',
            color: GOLD, textTransform: 'uppercase', marginTop: '0.1rem',
          }}>
            BOOKING FORM
          </div>
        </div>

        {/* Right: photo box */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          {booking.photo ? (
            <img src={booking.photo} alt="Buyer" style={{
              width: F.photoW, height: F.photoW, objectFit: 'cover',
              border: `2px solid ${GOLD}`,
            }} />
          ) : (
            <div style={{
              width: F.photoW, height: F.photoW,
              border: `2px solid ${GOLD}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexDirection: 'column',
            }}>
              <div style={{ fontSize: compact ? '0.5rem' : '0.62rem', color: GOLD, fontWeight: 700, textAlign: 'center', lineHeight: 1.4 }}>
                3 x Photographs
              </div>
            </div>
          )}
        </div>
      </div>

      {/* PLOT TYPE */}
      <div style={{
        textAlign: 'center', padding: F.innerPad,
        borderBottom: `1px solid ${GOLD}`, background: GOLD_BG, flexShrink: 0,
      }}>
        <span style={{ fontSize: F.plot, fontWeight: 900, color: '#1a1a1a', letterSpacing: '0.05em' }}>
          {plotLabel}
        </span>
      </div>

      {/* PREFERENCES */}
      <div style={{
        display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        gap: compact ? '40px' : '80px',
        padding: F.innerPad, borderBottom: `1px solid ${GOLD}`, flexShrink: 0,
      }}>
        <span style={{ fontWeight: 900, color: '#1a1a1a', fontSize: F.base, flexShrink: 0 }}>Preferences:</span>
        {prefs.map(p => (
          <label key={p.label} style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', fontSize: F.base, cursor: 'default' }}>
            <span style={{
              width: compact ? 10 : 14, height: compact ? 10 : 14, border: `1.5px solid #555`,
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              fontSize: compact ? '0.5rem' : '0.7rem', flexShrink: 0, background: p.checked ? '#eee' : '#fff',
            }}>
              {p.checked ? '✓' : ''}
            </span>
            {p.label}.
          </label>
        ))}
      </div>

      {/* BODY */}
      <div style={{ flex: 1, padding: F.bodyPad, display: 'flex', flexDirection: 'column', gap: F.bodyGap }}>

        {/* Client Information */}
        <CSection title="Client Information:" F={F}>
          <CRow F={F}>
            <CField label="Name:" value={booking.name} flex={2} F={F} />
            <CField label="S,D, W/O:" value={booking.fatherName} flex={2} F={F} />
          </CRow>
          <CRow F={F}>
            <CField label="CNIC No:" value={booking.cnic} flex={1.2} F={F} />
            <CField label="Phone No:" value={booking.phone} flex={1} F={F} />
            <CField label="Cell No:" value={booking.cell || booking.phone} flex={1} F={F} />
          </CRow>
          <CRow F={F}>
            <CField label="Postal Address:" value={booking.postalAddress} flex={1} F={F} />
          </CRow>
          <div style={{ borderBottom: '1px solid #ccc', margin: '0.05rem 0' }} />
          <CRow F={F}>
            <CField label="Permanent Address:" value={booking.residentialAddress || booking.address} flex={1} F={F} />
          </CRow>
          <div style={{ borderBottom: '1px solid #ccc', margin: '0.05rem 0' }} />
        </CSection>

        {/* Nominee Information */}
        {settings.showNomineeSection && (
          <CSection title="Nominee Information:" F={F}>
            <CRow F={F}>
              <CField label="Name:" value={booking.nominee?.name} flex={2} F={F} />
              <CField label="S,D, W/O:" value={booking.nominee?.fatherName} flex={2} F={F} />
            </CRow>
            <CRow F={F}>
              <CField label="CNIC No:" value={booking.nominee?.cnic} flex={1.2} F={F} />
              <CField label="Phone No:" value={booking.nominee?.phone} flex={1} F={F} />
              <CField label="Relation.:" value={booking.nominee?.relation} flex={1} F={F} />
            </CRow>
          </CSection>
        )}

        {/* Watermark Strip */}
        <div style={{
          position: 'relative', margin: '0.1rem 0',
          border: `1px solid ${GOLD}`,
          overflow: 'hidden', minHeight: F.wmarkH,
          background: '#fffef8', flexShrink: 0,
        }}>
          <div style={{ position: 'absolute', left: 6, top: '50%', transform: 'translateY(-50%)', opacity: 0.12, zIndex: 1 }}>
            <img src={ueLogo} alt="" style={{ width: compact ? 32 : 50, height: compact ? 32 : 50, objectFit: 'contain' }} />
          </div>
          <div style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', opacity: 0.12, zIndex: 1 }}>
            <img src={ueLogo} alt="" style={{ width: compact ? 32 : 50, height: compact ? 32 : 50, objectFit: 'contain' }} />
          </div>
          <div className="ue-currency-watermark" style={{ padding: compact ? '0.2rem 44px' : '0.4rem 70px' }}>
            {Array(10).fill('University Enclave Housing Society ').join('')}
            {'\n'}
            {Array(10).fill('University Enclave Housing Society ').join('')}
            {compact ? '' : '\n' + Array(10).fill('University Enclave Housing Society ').join('') +
              '\n' + Array(10).fill('University Enclave Housing Society ').join('') +
              '\n' + Array(10).fill('University Enclave Housing Society ').join('')}
          </div>
        </div>

        {/* Payment Information */}
        <CSection title="Payment Information:" F={F}>
          <CRow F={F}>
            <CField label="Plot Value:" value={pkr(total)} flex={2} F={F} />
            <CField label="Payment Amount:" value={pkr(dp)} flex={2} F={F} />
          </CRow>
          <CRow F={F}>
            <CField label="Payment Mode:" value={booking.paymentMode || 'Cash'} flex={1} F={F} />
            <CField label="Paid On:" value={fmtDate(booking.approvedAt || booking.createdAt)} flex={1} F={F} />
            <CField label="Outstanding Amount:" value={pkr(remaining)} flex={1.2} F={F} />
          </CRow>
        </CSection>

        {/* Installment Schedule */}
        {settings.showInstallmentSchedule && (
          <CSection title="Installment Schedule:" F={F}>
            {(() => {
              const ov = booking.paymentPlanOverride;
              const effectiveTotal = ov?.negotiatedPrice || total;
              const effectiveDP = ov?.downPayment || Math.round(effectiveTotal * 0.10);
              const effectiveMonthly = ov?.installmentAmount || Math.round(effectiveTotal * 0.60 / 48);
              const confirmDays = ov?.confirmationDueDays ? `(due in ${ov.confirmationDueDays} days)` : '(due in 30 days)';
              const startMonth = ov?.installmentStartMonths ? `from month ${ov.installmentStartMonths}` : 'from month 1';
              const exAsset = booking.exchangeAsset;
              const scheduleItems = [
                ...(exAsset ? [{ label: `Exchange: ${exAsset.assetType?.charAt(0).toUpperCase()}${exAsset.assetType?.slice(1)}`, value: pkr(exAsset.agreedValue), exchange: true }] : []),
                { label: `Down Payment (10%)`, value: pkr(effectiveDP) },
                { label: `Confirmation (10%) ${confirmDays}`, value: pkr(Math.round(effectiveTotal * 0.10)) },
                { label: `Monthly × 48 ${startMonth}`, value: pkr(effectiveMonthly) + '/mo' },
                { label: 'Possession (20%)', value: pkr(Math.round(effectiveTotal * 0.20)) },
              ];
              return (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.4rem' }}>
                    {scheduleItems.map(({ label, value, exchange }) => (
                      <div key={label} style={{ border: `1px solid ${exchange ? '#0284c7' : GOLD}`, borderRadius: 2, padding: '0.3rem 0.4rem', fontSize: '0.68rem', background: exchange ? '#eff6ff' : 'transparent' }}>
                        <div style={{ color: exchange ? '#0284c7' : GOLD, fontWeight: 700, fontSize: '0.6rem', marginBottom: '0.1rem' }}>{label}</div>
                        <div style={{ fontWeight: 700, color: '#1a1a1a' }}>{value}</div>
                      </div>
                    ))}
                  </div>
                  {exAsset && (
                    <div style={{ marginTop: '0.3rem', fontSize: '0.62rem', color: '#1d4ed8', borderLeft: '2px solid #0284c7', paddingLeft: '0.4rem' }}>
                      Exchange remarks: {exAsset.description}{exAsset.notes ? ` — ${exAsset.notes}` : ''}
                    </div>
                  )}
                  {ov?.notes && (
                    <div style={{ marginTop: '0.3rem', fontSize: '0.62rem', color: '#78350f', fontStyle: 'italic', borderLeft: `2px solid ${GOLD}`, paddingLeft: '0.4rem' }}>
                      Negotiated terms: {ov.notes}
                    </div>
                  )}
                </>
              );
            })()}
          </CSection>
        )}

        <div style={{ flex: 1, minHeight: compact ? '0.2rem' : '1rem' }} />

        {settings.footerNote && (
          <div style={{
            borderTop: `1px dashed ${GOLD}`, paddingTop: '0.4rem', marginTop: '0.2rem',
            fontSize: '0.72rem', color: '#555', fontStyle: 'italic', lineHeight: 1.5,
          }}>
            {settings.footerNote}
          </div>
        )}
      </div>

      {/* CONTACT BAR */}
      <div style={{
        background: GOLD_BG, borderTop: `1px solid ${GOLD}`,
        padding: compact ? '0.15rem 0.5rem' : '0.3rem 0.75rem',
        display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem',
        fontSize: compact ? '0.52rem' : '0.65rem', color: '#555', flexShrink: 0,
      }}>
        <span>✉ {settings.contactEmail}</span>
        <span>📞 {settings.contactPhone}</span>
        <span>📍 {settings.address}</span>
      </div>

      {/* SIGNATURE FOOTER */}
      <div style={{
        borderTop: `2px solid ${GOLD}`,
        display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr',
        background: GOLD_BG, flexShrink: 0,
      }}>
        {[
          'Client Signature and Thumb',
          'Sales Department',
          'Accounts Department',
          'President UECHS',
        ].map((label, i) => (
          <div key={label} style={{
            textAlign: 'center', padding: compact ? '0.25rem 0.15rem' : '0.5rem 0.25rem',
            borderRight: i < 3 ? `1px solid ${GOLD}` : 'none',
          }}>
            <div style={{ height: F.sigH }} />
            <div style={{
              borderTop: `1px solid #555`, paddingTop: '0.15rem',
              fontSize: compact ? '0.52rem' : '0.68rem', fontWeight: 700, color: GOLD,
              margin: compact ? '0 0.2rem' : '0 0.5rem',
            }}>
              {label}
            </div>
          </div>
        ))}
      </div>

      {/* BOTTOM GOLD BAR */}
      <div style={{ background: `linear-gradient(90deg, ${GOLD}, ${GOLD_LIGHT}, ${GOLD})`, height: F.barH, flexShrink: 0 }} />
    </div>
  );
}

function CSection({ title, children, F }) {
  return (
    <div style={{ marginBottom: '0.1rem' }}>
      <div style={{ fontWeight: 900, color: GOLD, fontSize: F.section, marginBottom: F.fieldRowGap }}>
        {title}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: F.fieldRowGap }}>
        {children}
      </div>
    </div>
  );
}

function CRow({ children, F }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: F.fieldGap }}>
      {children}
    </div>
  );
}

function CField({ label, value, flex = 1, F }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.2rem', flex }}>
      <span style={{ fontWeight: 700, fontSize: F.label, whiteSpace: 'nowrap', color: '#1a1a1a', flexShrink: 0, paddingBottom: 0, paddingTop: 1 }}>
        {label}
      </span>
      <span style={{
        flex: 1, borderBottom: '1px solid #999',
        fontSize: F.label, color: '#1a1a1a', paddingBottom: 0,
        minWidth: 0, wordBreak: 'break-word', display: 'block',
      }}>
        {value || ''}
      </span>
    </div>
  );
}
