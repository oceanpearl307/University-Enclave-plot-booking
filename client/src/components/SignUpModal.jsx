import React, { useState } from 'react';

export default function SignUpModal({ onClose, onSuccess }) {
  const [form, setForm] = useState({ name: '', email: '', phone: '', cnic: '', password: '', confirm: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState(1);

  const handleChange = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const handleNext = e => {
    e.preventDefault();
    if (!form.name || !form.email || !form.phone) return;
    setStep(2);
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirm) {
      setError('Passwords do not match');
      return;
    }
    if (form.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/customers/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: form.name, email: form.email, phone: form.phone, cnic: form.cnic, password: form.password }),
      });
      const text = await res.text();
      if (!text) throw new Error('Server is not responding. Please try again.');
      const data = JSON.parse(text);
      if (!res.ok) throw new Error(data.error || 'Registration failed');
      onSuccess(data.customer);
    } catch (err) {
      if (err instanceof SyntaxError) {
        setError('Server is not responding. Please try again in a moment.');
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={overlay} onClick={onClose}>
      <div style={modal} onClick={e => e.stopPropagation()}>
        <div style={modalHeader}>
          <div>
            <div style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>📝</div>
            <h2 style={{ fontSize: '1.375rem', fontWeight: 800, color: '#1a1a2e' }}>Create Account</h2>
            <p style={{ fontSize: '0.85rem', color: '#6b7280', marginTop: '0.25rem' }}>Register as a customer to browse and book plots</p>
          </div>
          <button onClick={onClose} style={closeBtn}>✕</button>
        </div>

        <div style={{ display: 'flex', borderBottom: '1px solid #f3f4f6' }}>
          {[1, 2].map(s => (
            <div key={s} style={{
              flex: 1, padding: '0.75rem', textAlign: 'center', fontSize: '0.8rem', fontWeight: 600,
              background: step === s ? '#f0fdf4' : 'transparent',
              color: step === s ? '#1a6b3c' : step > s ? '#059669' : '#9ca3af',
              borderBottom: step === s ? '2px solid #1a6b3c' : '2px solid transparent',
              transition: 'all 0.2s',
            }}>
              {step > s ? '✓ ' : `${s}. `}{s === 1 ? 'Personal Info' : 'Security'}
            </div>
          ))}
        </div>

        {error && (
          <div className="alert alert-error" style={{ margin: '1rem 1.5rem 0' }}>❌ {error}</div>
        )}

        {step === 1 ? (
          <form onSubmit={handleNext} style={{ padding: '1.25rem 1.5rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="form-group">
              <label>Full Name <span className="required">*</span></label>
              <input name="name" value={form.name} onChange={handleChange} placeholder="Muhammad Ali Khan" required />
            </div>
            <div className="form-group">
              <label>Email Address <span className="required">*</span></label>
              <input name="email" type="email" value={form.email} onChange={handleChange} placeholder="ali@example.com" required />
            </div>
            <div className="form-group">
              <label>Phone Number <span className="required">*</span></label>
              <input name="phone" value={form.phone} onChange={handleChange} placeholder="0300-1234567" required />
            </div>
            <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '0.75rem' }}>
              Continue →
            </button>
          </form>
        ) : (
          <form onSubmit={handleSubmit} style={{ padding: '1.25rem 1.5rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="form-group">
              <label>CNIC Number <span className="required">*</span></label>
              <input name="cnic" value={form.cnic} onChange={handleChange} placeholder="35201-1234567-1" required />
            </div>
            <div className="form-group">
              <label>Password <span className="required">*</span></label>
              <input name="password" type="password" value={form.password} onChange={handleChange} placeholder="Min. 6 characters" required />
            </div>
            <div className="form-group">
              <label>Confirm Password <span className="required">*</span></label>
              <input name="confirm" type="password" value={form.confirm} onChange={handleChange} placeholder="Re-enter password" required />
            </div>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button type="button" className="btn btn-outline" onClick={() => { setStep(1); setError(''); }} style={{ flex: 1, justifyContent: 'center' }}>
                ← Back
              </button>
              <button type="submit" className="btn btn-primary" disabled={loading} style={{ flex: 2, justifyContent: 'center', padding: '0.75rem' }}>
                {loading ? <><div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }}></div> Creating...</> : '✓ Create Account'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

const overlay = {
  position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000,
  display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem',
  backdropFilter: 'blur(4px)',
};
const modal = {
  background: '#fff', borderRadius: 16, width: '100%', maxWidth: 440,
  boxShadow: '0 25px 50px rgba(0,0,0,0.25)',
};
const modalHeader = {
  display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
  padding: '1.5rem 1.5rem 1.25rem', borderBottom: '1px solid #f3f4f6',
};
const closeBtn = {
  background: '#f3f4f6', border: 'none', borderRadius: 8, width: 32, height: 32,
  cursor: 'pointer', fontSize: '0.875rem', color: '#6b7280', display: 'flex',
  alignItems: 'center', justifyContent: 'center',
};
