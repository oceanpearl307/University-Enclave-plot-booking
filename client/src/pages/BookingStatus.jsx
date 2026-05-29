import React, { useState } from 'react';

export default function BookingStatus({ navigate }) {
  const [ref, setRef] = useState('');
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSearch = async e => {
    e.preventDefault();
    if (!ref.trim()) return;
    setError('');
    setLoading(true);
    setBooking(null);
    try {
      const res = await fetch('/api/bookings/' + encodeURIComponent(ref.trim()));
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Not found');
      setBooking(data);
    } catch (err) {
      setError('No booking found with this reference. Please check and try again.');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = d => new Date(d).toLocaleDateString('en-PK', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });

  return (
    <div style={{ padding: '3rem 1.5rem', maxWidth: 700, margin: '0 auto' }}>
      <h1 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '0.5rem' }}>Booking Status</h1>
      <p style={{ color: '#6b7280', marginBottom: '2.5rem' }}>Enter your booking reference number to check the status of your booking.</p>

      <form onSubmit={handleSearch} style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
        <input
          value={ref}
          onChange={e => setRef(e.target.value)}
          placeholder="e.g. UE-1001"
          style={{
            flex: 1,
            minWidth: 200,
            padding: '0.75rem 1rem',
            border: '1.5px solid #e5e7eb',
            borderRadius: 10,
            fontSize: '1rem',
            fontFamily: 'inherit',
          }}
        />
        <button type="submit" className="btn btn-primary" disabled={loading} style={{ fontSize: '1rem', padding: '0.75rem 1.5rem' }}>
          {loading ? <><div className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }}></div> Searching</> : '🔍 Search'}
        </button>
      </form>

      {error && <div className="alert alert-error" style={{ marginBottom: '1.5rem' }}>❌ {error}</div>}

      {booking && (
        <div className="card">
          <div style={{ background: 'linear-gradient(135deg, #1a6b3c, #145530)', color: '#fff', padding: '1.5rem' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', opacity: 0.8, marginBottom: '0.25rem' }}>Booking Reference</div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800 }}>{booking.bookingRef}</div>
            <div style={{ marginTop: '0.5rem' }}>
              <span style={{
                background: booking.status === 'pending' ? '#d97706' : '#059669',
                color: '#fff',
                padding: '0.25rem 0.875rem',
                borderRadius: 9999,
                fontSize: '0.8rem',
                fontWeight: 700,
                textTransform: 'uppercase',
              }}>{booking.status}</span>
            </div>
          </div>
          <div style={{ padding: '1.5rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', marginBottom: '1.5rem' }}>
              {[
                ['Plot Number', booking.plotNumber],
                ['Plot Size', booking.plotSize],
                ['Block', booking.area],
                ['Price', 'PKR ' + (booking.plotPrice / 1000000).toFixed(1) + 'M'],
                ['Applicant Name', booking.name],
                ['Phone', booking.phone],
                ['Email', booking.email],
                ['CNIC', booking.cnic],
              ].map(([label, value]) => (
                <div key={label}>
                  <div style={{ fontSize: '0.75rem', color: '#6b7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.2rem' }}>{label}</div>
                  <div style={{ fontWeight: 600, color: '#1a1a2e', wordBreak: 'break-all' }}>{value}</div>
                </div>
              ))}
            </div>
            {booking.address && (
              <div style={{ marginBottom: '1rem' }}>
                <div style={{ fontSize: '0.75rem', color: '#6b7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.2rem' }}>Address</div>
                <div style={{ fontWeight: 600 }}>{booking.address}</div>
              </div>
            )}
            <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '1rem', fontSize: '0.8rem', color: '#6b7280' }}>
              Submitted on {formatDate(booking.createdAt)}
            </div>
          </div>
        </div>
      )}

      <div style={{ marginTop: '3rem', background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 12, padding: '1.5rem' }}>
        <h3 style={{ fontWeight: 700, marginBottom: '1rem' }}>💡 Need Help?</h3>
        <p style={{ color: '#6b7280', fontSize: '0.875rem', lineHeight: 1.6, marginBottom: '1rem' }}>
          If you can't find your booking or have any questions, please contact our office:
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.875rem' }}>
          <div>📞 <strong>111-002 001</strong></div>
          <div>✉️ <strong>info@universityenclave.pk</strong></div>
          <div>🕒 Office Hours: Mon-Sat, 9 AM - 6 PM</div>
        </div>
      </div>
    </div>
  );
}
