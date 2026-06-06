import React, { useEffect, useState } from 'react';

const tagColor = {
  'New Launch': { bg: '#fef3c7', color: '#92400e' },
  Finance: { bg: '#dbeafe', color: '#1e40af' },
  Possession: { bg: '#d1fae5', color: '#065f46' },
  Development: { bg: '#f3e8ff', color: '#7e22ce' },
  Notice: { bg: '#f1f5f9', color: '#334155' },
};

function Lightbox({ src, onClose }) {
  useEffect(() => {
    const handler = e => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.88)',
        zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '1.5rem',
      }}
    >
      <button
        onClick={onClose}
        style={{
          position: 'absolute', top: '1.25rem', right: '1.25rem',
          background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff',
          width: 40, height: 40, borderRadius: '50%', cursor: 'pointer',
          fontSize: '1.1rem', display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontWeight: 700,
        }}
      >✕</button>
      <img
        src={src}
        alt="Announcement"
        onClick={e => e.stopPropagation()}
        style={{
          maxWidth: '90vw', maxHeight: '88vh',
          borderRadius: 12, boxShadow: '0 8px 40px rgba(0,0,0,0.6)',
          objectFit: 'contain',
        }}
      />
    </div>
  );
}

export default function Announcements({ navigate }) {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lightbox, setLightbox] = useState(null);

  useEffect(() => {
    fetch('/api/announcements')
      .then(r => r.json())
      .then(data => {
        setAnnouncements([...data].sort((a, b) => new Date(b.date) - new Date(a.date)));
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const formatDate = d => new Date(d).toLocaleDateString('en-PK', { year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc' }}>
      {lightbox && <Lightbox src={lightbox} onClose={() => setLightbox(null)} />}

      <div style={{ background: 'linear-gradient(135deg, #1a1a2e 0%, #1a3a2a 60%, #1a6b3c 100%)', color: '#fff', padding: '3rem 1.5rem 2.5rem' }}>
        <div style={{ maxWidth: 860, margin: '0 auto' }}>
          <button
            onClick={() => navigate('home')}
            style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.25)', color: '#fff', borderRadius: 8, padding: '0.4rem 0.875rem', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600, marginBottom: '1.5rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
          >
            ← Back to Home
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '1.75rem' }}>📢</span>
            <h1 style={{ fontSize: 'clamp(1.5rem, 4vw, 2.25rem)', fontWeight: 900, margin: 0 }}>Announcements</h1>
          </div>
          <p style={{ color: '#cbd5e1', fontSize: '0.95rem', margin: 0 }}>
            All news, updates, and notices from University Enclave Housing Society
          </p>
        </div>
      </div>

      <div style={{ maxWidth: 860, margin: '0 auto', padding: '2.5rem 1.5rem' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '4rem', color: '#94a3b8' }}>
            <div className="spinner" style={{ width: 32, height: 32, borderWidth: 3, margin: '0 auto 1rem' }}></div>
            Loading announcements…
          </div>
        ) : announcements.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem', color: '#94a3b8', background: '#fff', borderRadius: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
            <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>📭</div>
            <div style={{ fontWeight: 600, fontSize: '1.05rem' }}>No announcements yet</div>
            <div style={{ fontSize: '0.85rem', marginTop: '0.25rem' }}>Check back soon for updates</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {announcements.map(a => (
              <div
                key={a.id}
                style={{
                  background: '#fff',
                  borderRadius: 16,
                  border: `1px solid ${a.important ? '#fde68a' : '#e5e7eb'}`,
                  borderLeft: `5px solid ${a.important ? '#d4a017' : '#e5e7eb'}`,
                  boxShadow: a.important ? '0 2px 12px rgba(212,160,23,0.10)' : '0 1px 4px rgba(0,0,0,0.06)',
                  overflow: 'hidden',
                }}
              >
                <div style={{ padding: '1.5rem 1.5rem 1.25rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.875rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                      {a.tag && (
                        <span style={{
                          background: tagColor[a.tag]?.bg || '#f3f4f6',
                          color: tagColor[a.tag]?.color || '#374151',
                          fontSize: '0.7rem', fontWeight: 700,
                          padding: '0.2rem 0.625rem', borderRadius: 9999,
                          textTransform: 'uppercase', letterSpacing: '0.05em',
                        }}>{a.tag}</span>
                      )}
                      {a.important && (
                        <span style={{ background: '#fef2f2', color: '#dc2626', fontSize: '0.7rem', fontWeight: 700, padding: '0.2rem 0.625rem', borderRadius: 9999, border: '1px solid #fecaca' }}>
                          🔴 Important
                        </span>
                      )}
                    </div>
                    <span style={{ fontSize: '0.8rem', color: '#9ca3af', whiteSpace: 'nowrap' }}>{formatDate(a.date)}</span>
                  </div>

                  <h2 style={{ fontWeight: 800, fontSize: '1.1rem', color: '#1a1a2e', marginBottom: '0.625rem', lineHeight: 1.4 }}>
                    {a.important && <span style={{ color: '#d4a017', marginRight: '0.3rem' }}>⚡</span>}
                    {a.title}
                  </h2>
                  <p style={{ color: '#4b5563', fontSize: '0.9rem', lineHeight: 1.75, margin: 0 }}>{a.body}</p>
                </div>

                {a.images && a.images.length > 0 && (
                  <div style={{ padding: '0 1.5rem 1.5rem' }}>
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: a.images.length === 1 ? '1fr' : a.images.length === 2 ? '1fr 1fr' : 'repeat(3, 1fr)',
                      gap: '0.625rem',
                    }}>
                      {a.images.map((img, idx) => (
                        <div
                          key={idx}
                          onClick={() => setLightbox(img)}
                          style={{
                            borderRadius: 10, overflow: 'hidden', cursor: 'zoom-in',
                            aspectRatio: '4/3', background: '#f1f5f9',
                            border: '1px solid #e5e7eb',
                          }}
                        >
                          <img
                            src={img}
                            alt={`Image ${idx + 1}`}
                            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', transition: 'transform 0.2s' }}
                            onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.03)'}
                            onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                          />
                        </div>
                      ))}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '0.4rem' }}>
                      {a.images.length} image{a.images.length !== 1 ? 's' : ''} — click to enlarge
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
