import React, { useState, useRef } from 'react';

export default function BookingForm({ plot, navigate, dealer }) {
  const [form, setForm] = useState({
    name: '', fatherName: '', cnic: '', phone: '', email: '',
    residentialAddress: '', postalAddress: '',
    nomineeName: '', nomineeFatherName: '', nomineeCnic: '',
    nomineeRelation: '', nomineePhone: '', nomineeAddress: '',
  });
  const [photo, setPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [photoError, setPhotoError] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const fileRef = useRef();

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
    return (
      <div style={{ padding: '4rem 1.5rem', textAlign: 'center', maxWidth: 600, margin: '0 auto' }}>
        <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🎉</div>
        <h2 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.75rem', color: '#1a6b3c' }}>Booking Successful!</h2>
        <p style={{ color: '#6b7280', marginBottom: '2rem' }}>Your plot booking request has been submitted successfully.</p>
        <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 12, padding: '1.5rem', textAlign: 'left', marginBottom: '2rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            {[
              ['Booking Reference', result.bookingRef],
              ['Plot Number', result.plotNumber],
              ['Plot Size', result.plotSize],
              ['Area', result.area],
              ['Status', 'Pending Review'],
              ['Price', 'PKR ' + (result.plotPrice / 1000000).toFixed(1) + 'M'],
            ].map(([label, value]) => (
              <div key={label}>
                <div style={{ fontSize: '0.75rem', color: '#6b7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.2rem' }}>{label}</div>
                <div style={{ fontWeight: 700, color: '#1a1a2e' }}>{value}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="alert alert-info" style={{ marginBottom: '1.5rem', textAlign: 'left' }}>
          📧 Please save your booking reference <strong>{result.bookingRef}</strong>. Our team will contact you within 24-48 hours.
        </div>
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
          <button className="btn btn-primary" onClick={() => navigate('status')}>Check Status</button>
          <button className="btn btn-outline" onClick={() => navigate('plots')}>Browse More Plots</button>
        </div>
      </div>
    );
  }

  const handleChange = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

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

  const handleSubmit = async e => {
    e.preventDefault();
    setError('');
    if (!photo) {
      setPhotoError('Buyer photo is required.');
      fileRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, photo, plotId: plot.id, dealerId: dealer?.id || null }),
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
                      <input name="cnic" value={form.cnic} onChange={handleChange} placeholder="35201-1234567-1" required />
                    </div>
                    <div className="form-group">
                      <label>Phone Number <span className="required">*</span></label>
                      <input name="phone" value={form.phone} onChange={handleChange} placeholder="0300-1234567" required />
                    </div>
                  </div>
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
                      <input name="nomineeCnic" value={form.nomineeCnic} onChange={handleChange} placeholder="35201-7654321-1" required />
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

              <button type="submit" className="btn btn-primary" disabled={loading} style={{ fontSize: '1rem', padding: '0.875rem', width: '100%', justifyContent: 'center' }}>
                {loading ? <><div className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }}></div> Submitting...</> : '📋 Confirm Booking Request'}
              </button>
            </div>
          </form>
        </div>

        {/* ── Plot Summary ── */}
        <div>
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
                ['💰 Price', 'PKR ' + (plot.price / 1000000).toFixed(1) + 'M'],
              ].map(([label, value]) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #e5e7eb', paddingBottom: '0.75rem' }}>
                  <span style={{ color: '#6b7280', fontSize: '0.85rem' }}>{label}</span>
                  <span style={{ fontWeight: 700, fontSize: '0.85rem', textTransform: 'capitalize' }}>{value}</span>
                </div>
              ))}
              <p style={{ color: '#6b7280', fontSize: '0.8rem', lineHeight: 1.5 }}>{plot.description}</p>
              <div className="alert alert-success" style={{ fontSize: '0.8rem' }}>✅ This plot is available for booking</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
