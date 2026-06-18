import React from 'react';

export default function About({ navigate }) {
  return (
    <div>
      <section style={{
        background: 'linear-gradient(135deg, #1a1a2e 0%, #1a6b3c 100%)',
        color: '#fff',
        padding: '4rem 1.5rem',
        textAlign: 'center',
      }}>
        <div style={{ maxWidth: 700, margin: '0 auto' }}>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: '1rem' }}>About University Enclave</h1>
          <p style={{ fontSize: '1.1rem', color: '#d1d5db', lineHeight: 1.7 }}>
            A premier housing society designed for those who value quality, security, and community living.
          </p>
        </div>
      </section>

      <section style={{ padding: '4rem 1.5rem' }}>
        <div className="container">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3rem', alignItems: 'center', marginBottom: '4rem' }}>
            <div>
              <h2 style={{ fontSize: '1.875rem', fontWeight: 800, marginBottom: '1rem' }}>Our Vision</h2>
              <p style={{ color: '#6b7280', lineHeight: 1.8, marginBottom: '1rem' }}>
                University Enclave Housing Society was founded with a vision to create an affordable, modern, and secure
                living community close to the city's major universities and educational institutions.
              </p>
              <p style={{ color: '#6b7280', lineHeight: 1.8 }}>
                We believe every family deserves a safe, beautiful place to call home. Our society offers
                premium residential and commercial plots with all modern amenities at transparent, competitive prices.
              </p>
            </div>
            <div style={{ background: 'linear-gradient(135deg, #e8f5ee, #d1fae5)', borderRadius: 16, padding: '2.5rem', textAlign: 'center' }}>
              <div style={{ fontSize: '5rem', marginBottom: '1rem' }}>🏘️</div>
              <div style={{ fontWeight: 800, fontSize: '1.25rem', color: '#1a6b3c', marginBottom: '0.5rem' }}>Established 2020</div>
              <div style={{ color: '#059669' }}>Serving families across the city</div>
            </div>
          </div>

          <div style={{ marginBottom: '4rem' }}>
            <h2 style={{ fontSize: '1.875rem', fontWeight: 800, textAlign: 'center', marginBottom: '0.75rem' }}>Society Amenities</h2>
            <p style={{ textAlign: 'center', color: '#6b7280', marginBottom: '2.5rem' }}>Everything you need for a comfortable, modern lifestyle</p>
            <div className="grid-3">
              {[
                { icon: '🏥', title: 'Medical Centre', desc: 'On-site clinic with 24/7 emergency services' },
                { icon: '🛒', title: 'Commercial Zone', desc: 'Dedicated shopping area with supermarkets and stores' },
                { icon: '🕌', title: 'Mosque', desc: 'Central mosque and multiple neighborhood prayer areas' },
                { icon: '🏫', title: 'School', desc: 'Affiliated school within walking distance of all plots' },
                { icon: '⚽', title: 'Sports Complex', desc: 'Multi-sport facilities including cricket ground and gym' },
                { icon: '🌳', title: 'Parks & Gardens', desc: 'Multiple green spaces and children\'s play areas' },
              ].map(a => (
                <div key={a.title} className="card" style={{ padding: '1.5rem' }}>
                  <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>{a.icon}</div>
                  <h3 style={{ fontWeight: 700, marginBottom: '0.5rem' }}>{a.title}</h3>
                  <p style={{ color: '#6b7280', fontSize: '0.875rem', lineHeight: 1.6 }}>{a.desc}</p>
                </div>
              ))}
            </div>
          </div>

          <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 16, padding: '2.5rem' }}>
            <h2 style={{ fontSize: '1.875rem', fontWeight: 800, marginBottom: '2rem', textAlign: 'center' }}>Contact Us</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem' }}>
              {[
                { icon: '📞', title: 'Phone', value: '03100001235' },
                { icon: '✉️', title: 'Email', value: 'info@universityenclave.pk\nsales@universityenclave.pk' },
                { icon: '📍', title: 'Office Address', value: 'Nathiyaglai Bypass, Havelian\nAbbottabad, Pakistan' },
                { icon: '🕒', title: 'Office Hours', value: 'Mon – Sat: 9:00 AM – 6:00 PM\nSunday: Closed' },
              ].map(c => (
                <div key={c.title} style={{ textAlign: 'center', padding: '1.25rem', background: '#fff', borderRadius: 10, border: '1px solid #e5e7eb' }}>
                  <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>{c.icon}</div>
                  <div style={{ fontWeight: 700, marginBottom: '0.5rem' }}>{c.title}</div>
                  <div style={{ color: '#6b7280', fontSize: '0.875rem', whiteSpace: 'pre-line', lineHeight: 1.7 }}>{c.value}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section style={{ background: 'linear-gradient(135deg, #1a6b3c, #145530)', color: '#fff', padding: '3rem 1.5rem', textAlign: 'center' }}>
        <h2 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '1rem' }}>Ready to Join Our Community?</h2>
        <p style={{ color: '#d1fae5', marginBottom: '2rem' }}>Browse our available plots and book your preferred location today.</p>
        <button className="btn btn-accent" onClick={() => navigate('plots')} style={{ fontSize: '1rem', padding: '0.875rem 2.5rem' }}>
          View Available Plots →
        </button>
      </section>
    </div>
  );
}
