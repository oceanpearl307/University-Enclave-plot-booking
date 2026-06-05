import React, { useState, useRef, useEffect } from 'react';
import { PAYMENT_PLANS, PaymentPlanCard, generatePaymentSchedule, pkr } from '../components/PaymentPlanTable.jsx';
import { formatCnic, isValidCnic } from '../utils/cnic.js';

export default function BookingForm({ plot, navigate, dealer }) {
  const plotPrice = plot ? (plot.effectivePrice || plot.price) : 0;
  const minDownPayment = plot ? Math.round(plotPrice * 0.10) : 0;
  const [form, setForm] = useState({
    name: '', fatherName: '', cnic: '', phone: '', email: '',
    residentialAddress: '', postalAddress: '',
    nomineeName: '', nomineeFatherName: '', nomineeCnic: '',
    nomineeRelation: '', nomineePhone: '', nomineeAddress: '',
  });
  const [downPayment, setDownPayment] = useState(minDownPayment);
  const [photo, setPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [photoError, setPhotoError] = useState('');
  const [cnicImage, setCnicImage] = useState(null);
  const [cnicImagePreview, setCnicImagePreview] = useState(null);
  const [cnicImageError, setCnicImageError] = useState('');
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scannerError, setScannerError] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const fileRef = useRef();
  const cnicFileRef = useRef();
  const qrInstanceRef = useRef(null);

  if (!plot) {
    return (
      <div style={{ padding: '4rem 1.5rem', textAlign: 'center' }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⚠️</div>
        <h2 style={{ marginBottom: '1rem' }}>No Plot Selected</h2>
        <p style={{ color: '#6b7280', marginBottom: '2rem' }}>Please select a plot first to make a booking.</p>
        <button className="btn btn-primary" onClick={() => navigate('plots')}>Browse Plots</button>
      </div>
    );
  }

  if (result) {
    const schedule = generatePaymentSchedule(result.plotSize, result.downPayment || 0, result.plotPrice);
    return (
      <div style={{ padding: '3rem 1.5rem', maxWidth: 720, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🎉</div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.75rem', color: '#1a6b3c' }}>Booking Successful!</h2>
          <p style={{ color: '#6b7280', marginBottom: '0.5rem' }}>Your plot booking request has been submitted successfully.</p>
        </div>

        <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 14, padding: '1.5rem', marginBottom: '1.5rem' }}>
          <div style={{ fontWeight: 700, color: '#1a6b3c', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '1rem' }}>Booking Details</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem' }}>
            {[
              ['Booking Reference', result.bookingRef],
              ['Plot Number', result.plotNumber],
              ['Plot Size', result.plotSize],
              ['Area', result.area],
              ['Status', 'Pending Review'],
              ['Total Price', 'PKR ' + (result.plotPrice / 1000000).toFixed(1) + 'M'],
            ].map(([label, value]) => (
              <div key={label}>
                <div style={{ fontSize: '0.72rem', color: '#6b7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>{label}</div>
                <div style={{ fontWeight: 700, color: '#1a1a2e' }}>{value}</div>
              </div>
            ))}
          </div>
        </div>

        {schedule && (
          <div style={{ marginBottom: '1.5rem' }}>
            <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '1rem', marginBottom: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              💳 Your Auto-Generated Payment Schedule
            </div>
            <div style={{ borderRadius: 14, overflow: 'hidden', border: '1.5px solid rgba(212,160,23,0.3)', boxShadow: '0 2px 12px rgba(26,107,60,0.08)' }}>
              <div style={{ background: 'linear-gradient(135deg, #0d2d1a, #1a6b3c)', padding: '1rem 1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ color: '#86efac', fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase' }}>4 Year Payment Plan — {schedule.plotSize}</div>
                  <div style={{ color: '#fff', fontWeight: 800, fontSize: '0.95rem', marginTop: '0.2rem' }}>Total: PKR {schedule.total.toLocaleString('en-US')}</div>
                </div>
                <div style={{ background: '#22c55e', color: '#fff', borderRadius: 8, padding: '0.35rem 0.75rem', fontSize: '0.75rem', fontWeight: 800 }}>CONFIRMED</div>
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', background: '#fff' }}>
                <thead>
                  <tr style={{ background: '#f8faf9', borderBottom: '1px solid #e2e8f0' }}>
                    {['Payment Type', 'Amount (PKR)', 'Timeline', 'Status'].map(h => (
                      <th key={h} style={{ padding: '0.625rem 1rem', textAlign: 'left', fontSize: '0.7rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[
                    { type: '⬇ Down Payment', amount: schedule.downPaymentPaid, timeline: 'At Booking', status: 'Paid', statusColor: '#059669', statusBg: '#d1fae5' },
                    { type: '✓ Confirmation', amount: schedule.confirmation, timeline: 'Within 30 Days', status: 'Due', statusColor: '#d97706', statusBg: '#fef3c7' },
                    { type: `📅 Monthly × ${schedule.monthlyCount}`, amount: schedule.monthlyInstallment, timeline: `${schedule.monthlyCount} months (4 yrs)`, status: `Total: ${pkr(schedule.monthlyTotal)}`, statusColor: '#0ea5e9', statusBg: '#e0f2fe' },
                    { type: `📆 Semi-Annual × ${schedule.semiAnnualCount}`, amount: schedule.semiAnnualInstallment, timeline: 'Every 6 months', status: `Total: ${pkr(schedule.semiAnnualTotal)}`, statusColor: '#7c3aed', statusBg: '#f5f3ff' },
                    { type: '🔑 Possession', amount: schedule.possession, timeline: 'On Completion', status: 'At Handover', statusColor: '#374151', statusBg: '#f3f4f6' },
                  ].map((row, i) => (
                    <tr key={i} style={{ borderBottom: i < 4 ? '1px solid #f0f4f2' : 'none', background: i % 2 === 0 ? '#fff' : '#f9fdfb' }}>
                      <td style={{ padding: '0.75rem 1rem', fontWeight: 600, color: '#1a3020', fontSize: '0.85rem' }}>{row.type}</td>
                      <td style={{ padding: '0.75rem 1rem', fontWeight: 800, color: '#0f172a' }}>{row.amount.toLocaleString('en-US')}</td>
                      <td style={{ padding: '0.75rem 1rem', color: '#64748b', fontSize: '0.82rem' }}>{row.timeline}</td>
                      <td style={{ padding: '0.75rem 1rem' }}>
                        <span style={{ background: row.statusBg, color: row.statusColor, borderRadius: 6, padding: '0.2rem 0.5rem', fontSize: '0.72rem', fontWeight: 700 }}>{row.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ background: 'linear-gradient(135deg, #f0fdf4, #ecfdf5)', borderTop: '2px solid #bbf7d0' }}>
                    <td style={{ padding: '0.875rem 1rem', fontWeight: 800, color: '#065f46', fontSize: '0.88rem' }}>TOTAL</td>
                    <td colSpan={3} style={{ padding: '0.875rem 1rem', fontWeight: 900, color: '#1a6b3c', fontSize: '1rem' }}>PKR {schedule.total.toLocaleString('en-US')}</td>
                  </tr>
                  {schedule.extraCredit > 0 && (
                    <tr style={{ background: '#f0fdf4', borderTop: '1px solid #bbf7d0' }}>
                      <td style={{ padding: '0.625rem 1rem', fontWeight: 600, color: '#065f46', fontSize: '0.8rem' }}>✅ Extra Credit Applied</td>
                      <td colSpan={3} style={{ padding: '0.625rem 1rem', fontWeight: 800, color: '#059669', fontSize: '0.9rem' }}>- PKR {schedule.extraCredit.toLocaleString('en-US')}</td>
                    </tr>
                  )}
                  <tr style={{ background: '#fffbeb', borderTop: '1px solid #fde68a' }}>
                    <td style={{ padding: '0.625rem 1rem', fontWeight: 600, color: '#92400e', fontSize: '0.8rem' }}>Remaining After Down Payment</td>
                    <td colSpan={3} style={{ padding: '0.625rem 1rem', fontWeight: 800, color: '#b45309', fontSize: '0.9rem' }}>PKR {schedule.remaining.toLocaleString('en-US')}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

        <div className="alert alert-info" style={{ marginBottom: '1.5rem', textAlign: 'left' }}>
          📧 Save your booking reference <strong>{result.bookingRef}</strong>. Our team will contact you within 24-48 hours to confirm the payment schedule.
        </div>
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <button className="btn btn-primary" onClick={() => navigate('status')}>Check Status</button>
          <button className="btn btn-outline" onClick={() => navigate('plots')}>Browse More Plots</button>
        </div>
      </div>
    );
  }

  useEffect(() => {
    if (!scannerOpen) return;
    let decodeTimeoutId = null;
    const timerId = setTimeout(async () => {
      try {
        const { Html5Qrcode } = await import('html5-qrcode');
        const qr = new Html5Qrcode('cnic-qr-reader');
        qrInstanceRef.current = qr;
        const cameras = await Html5Qrcode.getCameras();
        if (!cameras || cameras.length === 0) {
          setScannerError('No camera found on this device.');
          return;
        }
        const camId = cameras[cameras.length - 1].id;
        await qr.start(
          camId,
          { fps: 10, qrbox: { width: 260, height: 160 } },
          (decodedText) => {
            clearTimeout(decodeTimeoutId);
            const digits = decodedText.replace(/\D/g, '').slice(0, 13);
            const formatted = formatCnic(digits);
            setForm(f => ({ ...f, cnic: formatted }));
            stopScanner();
          },
          () => {}
        );
        decodeTimeoutId = setTimeout(() => {
          setScannerError('No barcode detected. Please type the CNIC number manually or try again.');
        }, 7000);
      } catch (err) {
        setScannerError('Could not start camera: ' + (err?.message || err));
      }
    }, 100);
    return () => {
      clearTimeout(timerId);
      clearTimeout(decodeTimeoutId);
    };
  }, [scannerOpen]);

  const stopScanner = () => {
    if (qrInstanceRef.current) {
      qrInstanceRef.current.stop().catch(() => {}).finally(() => {
        qrInstanceRef.current = null;
        setScannerOpen(false);
        setScannerError('');
      });
    } else {
      setScannerOpen(false);
      setScannerError('');
    }
  };

  const handleChange = e => {
    const { name, value } = e.target;
    if (name === 'cnic' || name === 'nomineeCnic') {
      setForm(f => ({ ...f, [name]: formatCnic(value) }));
    } else {
      setForm(f => ({ ...f, [name]: value }));
    }
  };

  const handlePhoto = e => {
    const file = e.target.files[0];
    setPhotoError('');
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setPhotoError('Please upload an image file (JPG, PNG, etc.).');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setPhotoError('Photo must be smaller than 5MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = ev => {
      setPhoto(ev.target.result);
      setPhotoPreview(ev.target.result);
    };
    reader.readAsDataURL(file);
  };

  const handleCnicImage = e => {
    const file = e.target.files[0];
    setCnicImageError('');
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setCnicImageError('Please upload an image file (JPG, PNG, etc.).');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setCnicImageError('File must be smaller than 5MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = ev => {
      setCnicImage(ev.target.result);
      setCnicImagePreview(ev.target.result);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setError('');
    if (!photo) {
      setPhotoError('Buyer photo is required.');
      fileRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    if (dealer && !cnicImage) {
      setCnicImageError('Customer CNIC photo is required for dealer bookings.');
      cnicFileRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    if (Number(downPayment) < minDownPayment) {
      setError(`Down payment must be at least PKR ${minDownPayment.toLocaleString('en-US')} (10% of the total price).`);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, photo, cnicImage: cnicImage || null, plotId: plot.id, dealerId: dealer?.id || null, downPayment: Number(downPayment) || 0 }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Booking failed');
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const sectionStyle = {
    background: '#f8fafc',
    border: '1px solid #e5e7eb',
    borderRadius: 10,
    padding: '1.5rem',
    marginBottom: '0.5rem',
  };
  const sectionHeader = {
    fontSize: '1rem',
    fontWeight: 700,
    color: '#1a6b3c',
    marginBottom: '1.25rem',
    paddingBottom: '0.5rem',
    borderBottom: '2px solid #d1fae5',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  };

  return (
    <div style={{ padding: '2rem 1.5rem', maxWidth: 1000, margin: '0 auto' }}>
      <button onClick={() => navigate('plots')} style={{ background: 'none', border: 'none', color: '#1a6b3c', fontWeight: 600, cursor: 'pointer', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
        ← Back to Plots
      </button>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem', alignItems: 'start' }} className="booking-grid">
        <div>
          <h1 style={{ fontSize: '1.875rem', fontWeight: 800, marginBottom: '0.5rem' }}>Book Your Plot</h1>
          <p style={{ color: '#6b7280', marginBottom: '2rem' }}>Fill in your details to reserve plot {plot.number}</p>

          {error && <div className="alert alert-error" style={{ marginBottom: '1.5rem' }}>❌ {error}</div>}

          <form onSubmit={handleSubmit}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

              {/* ── Buyer Information ── */}
              <div style={sectionStyle}>
                <div style={sectionHeader}>👤 Buyer Information</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  <div className="grid-2">
                    <div className="form-group">
                      <label>Full Name (as per CNIC) <span className="required">*</span></label>
                      <input name="name" value={form.name} onChange={handleChange} placeholder="Muhammad Ali Khan" required />
                    </div>
                    <div className="form-group">
                      <label>Father Name (as per CNIC) <span className="required">*</span></label>
                      <input name="fatherName" value={form.fatherName} onChange={handleChange} placeholder="Haji Abdul Khan" required />
                    </div>
                  </div>
                  <div className="grid-2">
                    <div className="form-group">
                      <label>CNIC Number <span className="required">*</span></label>
                      <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                        <input name="cnic" value={form.cnic} onChange={handleChange} placeholder="35201-1234567-1" maxLength={15} required style={{ fontFamily: 'monospace', letterSpacing: '0.04em', flex: 1 }} />
                        <button type="button" onClick={() => { setScannerError(''); setScannerOpen(true); }}
                          title="Scan CNIC barcode / QR code"
                          style={{ background: '#1a6b3c', color: '#fff', border: 'none', borderRadius: 7, padding: '0.5rem 0.6rem', cursor: 'pointer', fontSize: '1rem', flexShrink: 0, lineHeight: 1 }}>
                          📷
                        </button>
                      </div>
                      {form.cnic && !isValidCnic(form.cnic) && <div style={{ color: '#dc2626', fontSize: '0.75rem', marginTop: '0.3rem' }}>⚠️ Format must be: XXXXX-XXXXXXX-X</div>}
                      {form.cnic && isValidCnic(form.cnic) && <div style={{ color: '#059669', fontSize: '0.75rem', marginTop: '0.3rem' }}>✅ Valid CNIC format</div>}
                    </div>
                    <div className="form-group">
                      <label>Phone Number <span className="required">*</span></label>
                      <input name="phone" value={form.phone} onChange={handleChange} placeholder="0300-1234567" required />
                    </div>
                  </div>

                  {/* CNIC / Passport Image Upload — shown to dealer / admin only */}
                  {dealer && (
                    <div ref={cnicFileRef} style={{ background: '#fffbeb', border: `1.5px dashed ${cnicImageError ? '#ef4444' : cnicImage ? '#1a6b3c' : '#d97706'}`, borderRadius: 10, padding: '1rem 1.25rem' }}>
                      <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#92400e', marginBottom: '0.75rem' }}>
                        🪪 Customer CNIC / Passport Photo <span style={{ color: '#ef4444' }}>*</span>
                      </div>
                      <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                        <div
                          onClick={() => document.getElementById('cnicImageInput').click()}
                          style={{
                            width: 140, height: 90, border: `2px dashed ${cnicImageError ? '#ef4444' : cnicImage ? '#1a6b3c' : '#d1d5db'}`,
                            borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
                            cursor: 'pointer', overflow: 'hidden', background: cnicImage ? '#f0fdf4' : '#fafafa', flexShrink: 0,
                          }}
                        >
                          {cnicImagePreview
                            ? <img src={cnicImagePreview} alt="CNIC" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            : <div style={{ textAlign: 'center', padding: '0.5rem' }}>
                                <div style={{ fontSize: '1.5rem', marginBottom: '0.2rem' }}>🪪</div>
                                <div style={{ fontSize: '0.65rem', color: '#6b7280' }}>Click to upload</div>
                              </div>
                          }
                        </div>
                        <div style={{ flex: 1, minWidth: 160 }}>
                          <input id="cnicImageInput" type="file" accept="image/*" onChange={handleCnicImage} style={{ display: 'none' }} />
                          <ul style={{ fontSize: '0.75rem', color: '#6b7280', paddingLeft: '1rem', margin: '0 0 0.6rem', lineHeight: 1.7 }}>
                            <li>Front side of CNIC or passport photo page</li>
                            <li>Accepted formats: JPG, PNG</li>
                            <li>Maximum file size: 5MB</li>
                          </ul>
                          <button type="button" onClick={() => document.getElementById('cnicImageInput').click()}
                            style={{ background: '#92400e', color: '#fff', border: 'none', borderRadius: 6, padding: '0.35rem 0.8rem', fontSize: '0.78rem', cursor: 'pointer' }}>
                            {cnicImage ? 'Change Image' : 'Upload CNIC Photo'}
                          </button>
                          {cnicImageError && <div style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '0.4rem' }}>{cnicImageError}</div>}
                          {cnicImage && !cnicImageError && <div style={{ color: '#1a6b3c', fontSize: '0.75rem', marginTop: '0.4rem' }}>✅ CNIC photo uploaded</div>}
                        </div>
                      </div>
                    </div>
                  )}
                  <div className="form-group">
                    <label>Email Address</label>
                    <input name="email" type="email" value={form.email} onChange={handleChange} placeholder="ali@example.com" />
                  </div>
                  <div className="form-group">
                    <label>Residential Address <span className="required">*</span></label>
                    <input name="residentialAddress" value={form.residentialAddress} onChange={handleChange} placeholder="House #, Street, Area, City" required />
                  </div>
                  <div className="form-group">
                    <label>Postal Address <span className="required">*</span></label>
                    <input name="postalAddress" value={form.postalAddress} onChange={handleChange} placeholder="P.O. Box or full postal address" required />
                  </div>
                </div>
              </div>

              {/* ── Buyer Photo ── */}
              <div style={sectionStyle} ref={fileRef}>
                <div style={sectionHeader}>📷 Buyer Photo</div>
                <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                  <div
                    onClick={() => document.getElementById('buyerPhoto').click()}
                    style={{
                      width: 120, height: 140, border: `2px dashed ${photoError ? '#ef4444' : photo ? '#1a6b3c' : '#d1d5db'}`,
                      borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      cursor: 'pointer', overflow: 'hidden', background: photo ? '#f0fdf4' : '#f9fafb', flexShrink: 0,
                    }}
                  >
                    {photoPreview
                      ? <img src={photoPreview} alt="Buyer" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : <div style={{ textAlign: 'center', padding: '0.5rem' }}>
                          <div style={{ fontSize: '2rem', marginBottom: '0.25rem' }}>📷</div>
                          <div style={{ fontSize: '0.7rem', color: '#6b7280' }}>Click to upload</div>
                        </div>
                    }
                  </div>
                  <div style={{ flex: 1, minWidth: 180 }}>
                    <input id="buyerPhoto" type="file" accept="image/*" onChange={handlePhoto} style={{ display: 'none' }} />
                    <div style={{ fontSize: '0.85rem', color: '#374151', marginBottom: '0.5rem' }}>
                      <strong>Buyer passport-size photo is required</strong>
                    </div>
                    <ul style={{ fontSize: '0.78rem', color: '#6b7280', paddingLeft: '1rem', margin: 0, lineHeight: 1.7 }}>
                      <li>Clear, recent passport-size photo</li>
                      <li>Accepted formats: JPG, PNG</li>
                      <li>Maximum file size: 5MB</li>
                    </ul>
                    <button type="button" onClick={() => document.getElementById('buyerPhoto').click()}
                      style={{ marginTop: '0.75rem', background: '#1a6b3c', color: '#fff', border: 'none', borderRadius: 6, padding: '0.4rem 0.875rem', fontSize: '0.82rem', cursor: 'pointer' }}>
                      {photo ? 'Change Photo' : 'Choose Photo'}
                    </button>
                    {photoError && <div style={{ color: '#ef4444', fontSize: '0.78rem', marginTop: '0.4rem' }}>{photoError}</div>}
                    {photo && !photoError && <div style={{ color: '#1a6b3c', fontSize: '0.78rem', marginTop: '0.4rem' }}>✅ Photo uploaded successfully</div>}
                  </div>
                </div>
              </div>

              {/* ── Nominee Information ── */}
              <div style={sectionStyle}>
                <div style={sectionHeader}>👥 Nominee Information</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  <div className="grid-2">
                    <div className="form-group">
                      <label>Nominee Full Name <span className="required">*</span></label>
                      <input name="nomineeName" value={form.nomineeName} onChange={handleChange} placeholder="Nominee name" required />
                    </div>
                    <div className="form-group">
                      <label>Nominee Father Name <span className="required">*</span></label>
                      <input name="nomineeFatherName" value={form.nomineeFatherName} onChange={handleChange} placeholder="Nominee father name" required />
                    </div>
                  </div>
                  <div className="grid-2">
                    <div className="form-group">
                      <label>Nominee CNIC Number <span className="required">*</span></label>
                      <input name="nomineeCnic" value={form.nomineeCnic} onChange={handleChange} placeholder="35201-7654321-1" maxLength={15} required style={{ fontFamily: 'monospace', letterSpacing: '0.04em' }} />
                      {form.nomineeCnic && !isValidCnic(form.nomineeCnic) && <div style={{ color: '#dc2626', fontSize: '0.75rem', marginTop: '0.3rem' }}>⚠️ Format must be: XXXXX-XXXXXXX-X</div>}
                      {form.nomineeCnic && isValidCnic(form.nomineeCnic) && <div style={{ color: '#059669', fontSize: '0.75rem', marginTop: '0.3rem' }}>✅ Valid CNIC format</div>}
                    </div>
                    <div className="form-group">
                      <label>Relation to Buyer <span className="required">*</span></label>
                      <select name="nomineeRelation" value={form.nomineeRelation} onChange={handleChange} required
                        style={{ width: '100%', padding: '0.625rem 0.875rem', border: '1px solid #d1d5db', borderRadius: 8, fontSize: '0.9rem', background: '#fff', color: form.nomineeRelation ? '#1a1a2e' : '#9ca3af' }}>
                        <option value="">Select relation</option>
                        <option>Spouse</option>
                        <option>Son</option>
                        <option>Daughter</option>
                        <option>Father</option>
                        <option>Mother</option>
                        <option>Brother</option>
                        <option>Sister</option>
                        <option>Other</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid-2">
                    <div className="form-group">
                      <label>Nominee Phone Number <span className="required">*</span></label>
                      <input name="nomineePhone" value={form.nomineePhone} onChange={handleChange} placeholder="0300-7654321" required />
                    </div>
                    <div className="form-group">
                      <label>Nominee Address <span className="required">*</span></label>
                      <input name="nomineeAddress" value={form.nomineeAddress} onChange={handleChange} placeholder="Nominee residential address" required />
                    </div>
                  </div>
                </div>
              </div>

              {/* ── Down Payment ── */}
              <div style={sectionStyle}>
                <div style={sectionHeader}>💳 Down Payment</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
                  <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 9, padding: '0.75rem 1rem', fontSize: '0.85rem', color: '#1e40af', lineHeight: 1.6 }}>
                    ℹ️ Minimum down payment is <strong>10% of the total price</strong> — PKR {minDownPayment.toLocaleString('en-US')}.
                    You may pay more; any extra amount will be credited towards your remaining balance.
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label>Down Payment Amount (PKR) <span className="required">*</span></label>
                    <input
                      type="number"
                      min={minDownPayment}
                      value={downPayment}
                      onChange={e => setDownPayment(e.target.value)}
                      placeholder={minDownPayment}
                      required
                      style={{ fontWeight: 700, fontSize: '1rem', borderColor: Number(downPayment) > 0 && Number(downPayment) < minDownPayment ? '#ef4444' : undefined }}
                    />
                    {Number(downPayment) > 0 && Number(downPayment) < minDownPayment && (
                      <div style={{ color: '#ef4444', fontSize: '0.78rem', marginTop: '0.35rem', fontWeight: 600 }}>
                        ❌ Minimum down payment is PKR {minDownPayment.toLocaleString('en-US')} (10% of {pkr(plotPrice)})
                      </div>
                    )}
                  </div>
                  {Number(downPayment) >= minDownPayment && Number(downPayment) > 0 && (() => {
                    const dp = Number(downPayment);
                    const extra = dp - minDownPayment;
                    const remaining = plotPrice - dp;
                    return (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {extra > 0 && (
                          <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 9, padding: '0.7rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                            <div style={{ fontSize: '0.82rem', color: '#065f46', fontWeight: 600 }}>
                              ✅ Extra credit (above minimum):
                            </div>
                            <div style={{ fontWeight: 800, color: '#1a6b3c', fontSize: '0.9rem' }}>
                              + PKR {extra.toLocaleString('en-US')}
                            </div>
                          </div>
                        )}
                        <div style={{ background: remaining < 0 ? '#fef2f2' : '#fffbeb', border: `1px solid ${remaining < 0 ? '#fecaca' : '#fde68a'}`, borderRadius: 9, padding: '0.7rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                          <div style={{ fontSize: '0.82rem', color: remaining < 0 ? '#dc2626' : '#92400e', fontWeight: 600 }}>
                            {remaining < 0 ? '⚠️ Down payment exceeds total price' : '💰 Remaining balance after booking:'}
                          </div>
                          <div style={{ fontWeight: 800, color: remaining < 0 ? '#dc2626' : '#b45309', fontSize: '0.95rem' }}>
                            PKR {Math.abs(remaining).toLocaleString('en-US')}
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>

              <button type="submit" className="btn btn-primary" disabled={loading} style={{ fontSize: '1rem', padding: '0.875rem', width: '100%', justifyContent: 'center' }}>
                {loading ? <><div className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }}></div> Submitting...</> : '📋 Confirm Booking Request'}
              </button>
            </div>
          </form>
        </div>

        {/* ── CNIC Scanner Modal ── */}
        {scannerOpen && (
          <div style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.78)', zIndex: 9000,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            padding: '1.5rem',
          }}>
            <div style={{ background: '#fff', borderRadius: 16, overflow: 'hidden', width: '100%', maxWidth: 420, boxShadow: '0 12px 48px rgba(0,0,0,0.4)' }}>
              <div style={{ background: 'linear-gradient(135deg, #1a6b3c, #145530)', color: '#fff', padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontWeight: 800, fontSize: '1rem' }}>📷 Scan CNIC / Passport</div>
                  <div style={{ fontSize: '0.72rem', color: '#a3e4b8', marginTop: '0.2rem' }}>Point camera at the barcode or QR code on the card</div>
                </div>
                <button type="button" onClick={stopScanner} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', borderRadius: 8, padding: '0.4rem 0.75rem', cursor: 'pointer', fontWeight: 700, fontSize: '0.85rem' }}>✕ Close</button>
              </div>
              <div style={{ padding: '1rem' }}>
                <div id="cnic-qr-reader" style={{ width: '100%', borderRadius: 10, overflow: 'hidden', background: '#000', minHeight: 240 }} />
                {scannerError && (
                  <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '0.75rem 1rem', marginTop: '0.75rem', fontSize: '0.82rem', color: '#dc2626' }}>
                    ⚠️ {scannerError}
                    <div style={{ marginTop: '0.4rem', color: '#6b7280', fontSize: '0.75rem' }}>
                      Please type the CNIC number manually instead.
                    </div>
                  </div>
                )}
                {!scannerError && (
                  <div style={{ textAlign: 'center', marginTop: '0.75rem', fontSize: '0.75rem', color: '#6b7280' }}>
                    Hold the card steady — the CNIC number will be filled automatically when detected.
                  </div>
                )}
                <button type="button" onClick={stopScanner} style={{ marginTop: '0.75rem', width: '100%', background: '#f3f4f6', border: 'none', borderRadius: 8, padding: '0.6rem', fontSize: '0.85rem', cursor: 'pointer', fontWeight: 600, color: '#374151' }}>
                  Enter CNIC manually instead
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Plot Summary + Payment Plan ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div className="card" style={{ background: '#f9fafb', position: 'sticky', top: 80 }}>
            <div style={{ background: 'linear-gradient(135deg, #1a6b3c, #145530)', color: '#fff', padding: '1rem 1.25rem', borderRadius: '10px 10px 0 0' }}>
              <div style={{ fontWeight: 700, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.1em', opacity: 0.85, marginBottom: '0.25rem' }}>Selected Plot</div>
              <div style={{ fontWeight: 800, fontSize: '1.5rem' }}>{plot.number}</div>
            </div>
            <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
              {[
                ['📍 Area', plot.area],
                ['📐 Size', plot.size],
                ['🏷️ Category', plot.category],
              ].map(([label, value]) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #e5e7eb', paddingBottom: '0.75rem' }}>
                  <span style={{ color: '#6b7280', fontSize: '0.85rem' }}>{label}</span>
                  <span style={{ fontWeight: 700, fontSize: '0.85rem', textTransform: 'capitalize' }}>{value}</span>
                </div>
              ))}
              {plot.tags && plot.tags.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', borderBottom: '1px solid #e5e7eb', paddingBottom: '0.75rem' }}>
                  <span style={{ color: '#6b7280', fontSize: '0.85rem' }}>✨ Premium Tags</span>
                  <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                    {plot.tags.map(tag => (
                      <span key={tag} style={{ background: tag === 'Main Boulevard' ? '#fef3c7' : '#e0f2fe', color: tag === 'Main Boulevard' ? '#92400e' : '#075985', borderRadius: 6, padding: '0.2rem 0.5rem', fontSize: '0.7rem', fontWeight: 700 }}>★ {tag}</span>
                    ))}
                  </div>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #e5e7eb', paddingBottom: '0.75rem' }}>
                <span style={{ color: '#6b7280', fontSize: '0.85rem' }}>💰 Base Price</span>
                <span style={{ fontWeight: 600, fontSize: '0.85rem', color: plot.effectivePrice !== plot.price ? '#94a3b8' : '#0f172a', textDecoration: plot.effectivePrice !== plot.price ? 'line-through' : 'none' }}>
                  PKR {(plot.price / 1000000).toFixed(2)}M
                </span>
              </div>
              {plot.effectivePrice && plot.effectivePrice !== plot.price && (
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #e5e7eb', paddingBottom: '0.75rem', background: '#fffbeb', margin: '0 -1.25rem', padding: '0.625rem 1.25rem' }}>
                  <span style={{ color: '#92400e', fontSize: '0.85rem', fontWeight: 700 }}>💸 Effective Price</span>
                  <span style={{ fontWeight: 800, fontSize: '0.95rem', color: '#b45309' }}>PKR {(plot.effectivePrice / 1000000).toFixed(2)}M</span>
                </div>
              )}
              <p style={{ color: '#6b7280', fontSize: '0.8rem', lineHeight: 1.5 }}>{plot.description}</p>
              <div className="alert alert-success" style={{ fontSize: '0.8rem' }}>✅ This plot is available for booking</div>
            </div>
          </div>
          {PAYMENT_PLANS[plot.size] && (
            <PaymentPlanCard plotSize={plot.size} downPaymentPaid={Number(downPayment) || 0} />
          )}
        </div>
      </div>
    </div>
  );
}
