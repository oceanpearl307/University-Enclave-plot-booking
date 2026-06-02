import React, { useState } from 'react';

export default function DealerLoginModal({ onClose, onSuccess }) {
  const [form, setForm] = useState({ username: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async e => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/dealer/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const text = await res.text();
      if (!text) throw new Error('Server is not responding. Please try again.');
      const data = JSON.parse(text);
      if (!res.ok) throw new Error(data.error || 'Invalid credentials');
      onSuccess(data.dealer, data.token);
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
            <div style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>🔑</div>
            <h2 style={{ fontSize: '1.375rem', fontWeight: 800, color: '#1a1a2e' }}>Dealer Login</h2>
            <p style={{ fontSize: '0.85rem', color: '#6b7280', marginTop: '0.25rem' }}>Access the dealer management portal</p>
          </div>
          <button onClick={onClose} style={closeBtn}>✕</button>
        </div>

        {error && (
          <div className="alert alert-error" style={{ margin: '0 1.5rem 1rem' }}>❌ {error}</div>
        )}

        <form onSubmit={handleSubmit} style={{ padding: '0 1.5rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="form-group">
            <label>Username</label>
            <input
              value={form.username}
              onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
              placeholder="Enter your username"
              required
              autoFocus
            />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              value={form.password}
              onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
              placeholder="Enter your password"
              required
            />
          </div>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
            style={{ width: '100%', justifyContent: 'center', padding: '0.75rem', fontSize: '0.95rem' }}
          >
            {loading ? <><div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }}></div> Logging in...</> : '→ Login to Dashboard'}
          </button>
        </form>
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
  background: '#fff', borderRadius: 16, width: '100%', maxWidth: 420,
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
