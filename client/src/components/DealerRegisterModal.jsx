import React, { useState } from 'react';
import { formatCnic, isValidCnic } from '../utils/cnic.js';

const STEPS = ['Business Info', 'Contact Details'];
const req = <span style={{ color: '#dc2626' }}>*</span>;

export default function DealerRegisterModal({ onClose, onSuccess }) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    name: '', fatherName: '', cnic: '', postalAddress: '', officeAddress: '',
    businessName: '', businessCities: '',
    mobilePhone: '', altPhone: '', email: '', officePhone: '',
    proprietorName: '', proprietorPhone: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(null);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleNext = e => {
    e.preventDefault();
    if (!form.name || !form.fatherName || !form.cnic || !form.postalAddress || !form.businessName || !form.businessCities) {
      setError('Please fill in all required fields.'); return;
    }
    if (!isValidCnic(form.cnic)) {
      setError('Please enter a valid CNIC in the format: XXXXX-XXXXXXX-X (e.g. 35201-1234567-9)'); return;
    }
    setError('');
    setStep(1);
  };

  const handleSubmit = async e => {
    e.preventDefault();
    if (!form.mobilePhone || !form.altPhone || !form.email || !form.proprietorName) {
      setError('Please fill in all required fields.'); return;
    }
    setLoading(true); setError('');
    try {
      const res = await fetch('/api/dealer/register', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Submission failed');
      setSubmitted(data.regRef);
    } catch (err) {
      setError(err.message || 'Submission failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 20, width: '100%', maxWidth: 540, maxHeight: '92vh', display: 'flex', flexDirection: 'column', boxShadow: '0 25px 60px rgba(0,0,0,0.3)', overflow: 'hidden' }}>

        <div style={{ background: 'linear-gradient(135deg, #1a6b3c, #145530)', color: '#fff', padding: '1.5rem 2rem', flexShrink: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '1.3rem', fontWeight: 900, marginBottom: '0.25rem' }}>Become a Dealer</div>
              <div style={{ opacity: 0.8, fontSize: '0.85rem' }}>University Enclave Housing Society</div>
            </div>
            <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', borderRadius: 9, width: 32, height: 32, cursor: 'pointer', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
          </div>

          {!submitted && (
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1.25rem' }}>
              {STEPS.map((s, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', flex: i === 0 ? 1 : 'none' }}>
                  <div style={{ width: 24, height: 24, borderRadius: '50%', background: i <= step ? '#fff' : 'rgba(255,255,255,0.3)', color: i <= step ? '#1a6b3c' : 'rgba(255,255,255,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.75rem', flexShrink: 0 }}>
                    {i < step ? '✓' : i + 1}
                  </div>
                  <div style={{ fontSize: '0.78rem', fontWeight: 600, color: i <= step ? '#fff' : 'rgba(255,255,255,0.6)' }}>{s}</div>
                  {i < STEPS.length - 1 && <div style={{ flex: 1, height: 1.5, background: 'rgba(255,255,255,0.25)', borderRadius: 9999, margin: '0 0.25rem' }} />}
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ padding: '1.75rem 2rem', overflowY: 'auto', flex: 1 }}>
          {submitted ? (
            <div style={{ textAlign: 'center', padding: '1rem 0' }}>
              <div style={{ fontSize: '3.5rem', marginBottom: '1rem' }}>🎉</div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 900, color: '#0f172a', marginBottom: '0.5rem' }}>Request Submitted!</h3>
              <p style={{ color: '#64748b', lineHeight: 1.7, marginBottom: '1rem' }}>
                Your dealer registration request has been received. Our team will review your application and create your account shortly.
              </p>
              <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 12, padding: '1rem', marginBottom: '1.5rem' }}>
                <div style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '0.25rem' }}>Reference Number</div>
                <div style={{ fontWeight: 900, fontSize: '1.3rem', color: '#065f46', fontFamily: 'monospace' }}>{submitted}</div>
              </div>
              <button className="btn btn-primary" onClick={onClose} style={{ width: '100%', justifyContent: 'center', padding: '0.75rem' }}>Done</button>
            </div>
          ) : step === 0 ? (
            <form onSubmit={handleNext} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '0.25rem' }}>Step 1 of 2 — Business & Personal Information</div>

              <div className="form-group">
                <label>Business Name {req}</label>
                <input required value={form.businessName} onChange={e => set('businessName', e.target.value)} placeholder="e.g. Al-Noor Properties" />
              </div>
              <div className="form-group">
                <label>Business City / Cities {req}</label>
                <input required value={form.businessCities} onChange={e => set('businessCities', e.target.value)} placeholder="e.g. Lahore, Faisalabad" />
              </div>

              <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '0.75rem', fontSize: '0.78rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Personal Details</div>

              <div className="form-group">
                <label>Full Name {req}</label>
                <input required value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Kamran Akhtar" />
              </div>
              <div className="form-group">
                <label>Father's Name {req}</label>
                <input required value={form.fatherName} onChange={e => set('fatherName', e.target.value)} placeholder="e.g. Muhammad Akhtar" />
              </div>
              <div className="form-group">
                <label>CNIC {req}</label>
                <input required value={form.cnic} onChange={e => set('cnic', formatCnic(e.target.value))} placeholder="35201-1234567-9" maxLength={15} style={{ fontFamily: 'monospace', letterSpacing: '0.04em' }} />
                {form.cnic && !isValidCnic(form.cnic) && <div style={{ color: '#dc2626', fontSize: '0.75rem', marginTop: '0.3rem' }}>⚠️ Format must be: XXXXX-XXXXXXX-X</div>}
                {form.cnic && isValidCnic(form.cnic) && <div style={{ color: '#059669', fontSize: '0.75rem', marginTop: '0.3rem' }}>✅ Valid CNIC format</div>}
              </div>
              <div className="form-group">
                <label>Postal / Home Address {req}</label>
                <input required value={form.postalAddress} onChange={e => set('postalAddress', e.target.value)} placeholder="House #, Street, City" />
              </div>
              <div className="form-group">
                <label>Office Address</label>
                <input value={form.officeAddress} onChange={e => set('officeAddress', e.target.value)} placeholder="Office address (if different)" />
              </div>

              {error && <div className="alert alert-error" style={{ fontSize: '0.85rem' }}>{error}</div>}
              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.25rem' }}>
                <button type="button" className="btn btn-outline" onClick={onClose} style={{ flex: 1, justifyContent: 'center' }}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ flex: 2, justifyContent: 'center', padding: '0.75rem' }}>Next →</button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '0.25rem' }}>Step 2 of 2 — Contact Details</div>

              <div className="form-group">
                <label>Mobile Phone {req}</label>
                <input required value={form.mobilePhone} onChange={e => set('mobilePhone', e.target.value)} placeholder="e.g. 0321-1234567" />
              </div>
              <div className="form-group">
                <label>Alternative Phone {req}</label>
                <input required value={form.altPhone} onChange={e => set('altPhone', e.target.value)} placeholder="e.g. 0300-9876543" />
              </div>
              <div className="form-group">
                <label>Email Address {req}</label>
                <input required type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="e.g. dealer@example.com" />
              </div>
              <div className="form-group">
                <label>Office Phone</label>
                <input value={form.officePhone} onChange={e => set('officePhone', e.target.value)} placeholder="e.g. 042-35123456" />
              </div>

              <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '0.75rem', fontSize: '0.78rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Proprietor Details</div>

              <div className="form-group">
                <label>Proprietor / Owner Name {req}</label>
                <input required value={form.proprietorName} onChange={e => set('proprietorName', e.target.value)} placeholder="Name of the proprietor" />
              </div>
              <div className="form-group">
                <label>Proprietor Phone</label>
                <input value={form.proprietorPhone} onChange={e => set('proprietorPhone', e.target.value)} placeholder="e.g. 0321-9876543" />
              </div>

              {error && <div className="alert alert-error" style={{ fontSize: '0.85rem' }}>{error}</div>}
              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.25rem' }}>
                <button type="button" className="btn btn-outline" onClick={() => { setStep(0); setError(''); }} style={{ flex: 1, justifyContent: 'center' }}>← Back</button>
                <button type="submit" className="btn btn-primary" disabled={loading} style={{ flex: 2, justifyContent: 'center', padding: '0.75rem' }}>
                  {loading ? <><div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }}></div> Submitting...</> : 'Submit Application'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
