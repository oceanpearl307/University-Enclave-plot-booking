import React, { useEffect, useState } from 'react';
import DealerLoginModal from '../components/DealerLoginModal.jsx';
import SignUpModal from '../components/SignUpModal.jsx';
import DealerRegisterModal from '../components/DealerRegisterModal.jsx';
import PaymentPlanTable from '../components/PaymentPlanTable.jsx';

export default function Home({ navigate, dealer, customer, onDealerLogin, onCustomerLogin, onLogout }) {
  const [stats, setStats] = useState(null);
  const [announcements, setAnnouncements] = useState([]);
  const [activeDeals, setActiveDeals] = useState([]);
  const [modal, setModal] = useState(null);
  const [signupSuccess, setSignupSuccess] = useState(null);

  useEffect(() => {
    fetch('/api/stats').then(r => r.json()).then(setStats).catch(() => {});
    fetch('/api/announcements').then(r => r.json()).then(setAnnouncements).catch(() => {});
    fetch('/api/deals').then(r => r.json()).then(setActiveDeals).catch(() => {});
  }, []);

  const tagColor = {
    'New Launch': { bg: '#fef3c7', color: '#92400e' },
    Finance: { bg: '#dbeafe', color: '#1e40af' },
    Possession: { bg: '#d1fae5', color: '#065f46' },
    Development: { bg: '#f3e8ff', color: '#7e22ce' },
  };

  const formatDate = d => new Date(d).toLocaleDateString('en-PK', { year: 'numeric', month: 'short', day: 'numeric' });

  return (
    <div>
      {modal === 'dealer' && (
        <DealerLoginModal
          onClose={() => setModal(null)}
          onSuccess={d => { onDealerLogin(d); setModal(null); }}
        />
      )}
      {modal === 'signup' && (
        <SignUpModal
          onClose={() => setModal(null)}
          onSuccess={c => { onCustomerLogin(c); setSignupSuccess(c); setModal(null); }}
        />
      )}
      {modal === 'dealer-register' && (
        <DealerRegisterModal
          onClose={() => setModal(null)}
          onSuccess={() => setModal(null)}
        />
      )}

      {signupSuccess && (
        <div style={{ background: '#1a6b3c', color: '#fff', padding: '0.75rem 1.5rem', textAlign: 'center', fontSize: '0.9rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem' }}>
          <span>🎉 Welcome, <strong>{signupSuccess.name}</strong>! Your account (<strong>{signupSuccess.customerId}</strong>) has been created successfully.</span>
          <button onClick={() => setSignupSuccess(null)} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff', borderRadius: 6, padding: '0.2rem 0.6rem', cursor: 'pointer', fontSize: '0.85rem' }}>✕</button>
        </div>
      )}

      <section style={{
        background: 'linear-gradient(135deg, #0f172a 0%, #1a3a2a 50%, #1a6b3c 100%)',
        color: '#fff',
        padding: '5rem 1.5rem 4rem',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(circle at 20% 50%, rgba(26,107,60,0.3) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(212,160,23,0.15) 0%, transparent 50%)' }} />
        <div style={{ maxWidth: 900, margin: '0 auto', position: 'relative', textAlign: 'center' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(212,160,23,0.15)', border: '1px solid rgba(212,160,23,0.4)', borderRadius: 9999, padding: '0.4rem 1rem', marginBottom: '1.5rem', fontSize: '0.8rem', color: '#fcd34d', fontWeight: 600, letterSpacing: '0.05em' }}>
            🏘️ UNIVERSITY ENCLAVE HOUSING SOCIETY
          </div>
          <h1 style={{ fontSize: 'clamp(2rem, 5.5vw, 3.5rem)', fontWeight: 900, lineHeight: 1.15, marginBottom: '1.25rem' }}>
            Your Dream Home,<br />
            <span style={{ color: '#d4a017' }}>Your Future Investment</span>
          </h1>
          <p style={{ fontSize: '1.1rem', color: '#cbd5e1', maxWidth: 580, margin: '0 auto 2.5rem', lineHeight: 1.75 }}>
            Secure, well-planned residential and commercial plots in the heart of the city —
            near universities, parks, and all modern amenities.
          </p>

          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '3rem' }}>
            {dealer ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 12, padding: '0.75rem 1.25rem' }}>
                <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#1a6b3c', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem' }}>👤</div>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{dealer.name}</div>
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'capitalize' }}>{dealer.role} Portal</div>
                </div>
                <button onClick={onLogout} style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', borderRadius: 8, padding: '0.4rem 0.875rem', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}>
                  Logout
                </button>
              </div>
            ) : customer ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 12, padding: '0.75rem 1.25rem' }}>
                <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#d4a017', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem' }}>👤</div>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{customer.name}</div>
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{customer.customerId}</div>
                </div>
                <button onClick={onLogout} style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', borderRadius: 8, padding: '0.4rem 0.875rem', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}>
                  Logout
                </button>
              </div>
            ) : (
              <>
                <button
                  className="btn btn-accent"
                  onClick={() => setModal('dealer')}
                  style={{ fontSize: '0.95rem', padding: '0.875rem 2rem', gap: '0.5rem' }}
                >
                  🔑 Dealer Login
                </button>
                <button
                  onClick={() => setModal('signup')}
                  style={{
                    background: 'rgba(255,255,255,0.1)',
                    border: '2px solid rgba(255,255,255,0.4)',
                    color: '#fff',
                    borderRadius: 10,
                    padding: '0.875rem 2rem',
                    fontSize: '0.95rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                >
                  📝 Sign Up
                </button>
                <button
                  onClick={() => setModal('dealer-register')}
                  style={{
                    background: 'rgba(212,160,23,0.15)',
                    border: '2px solid rgba(212,160,23,0.5)',
                    color: '#fcd34d',
                    borderRadius: 10,
                    padding: '0.875rem 2rem',
                    fontSize: '0.95rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(212,160,23,0.25)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'rgba(212,160,23,0.15)'}
                >
                  🤝 Become a Dealer
                </button>
              </>
            )}
            {(dealer || customer) && (
              <button
                className="btn"
                onClick={() => navigate('plots')}
                style={{ fontSize: '0.95rem', padding: '0.875rem 2rem', background: '#fff', color: '#1a1a2e', fontWeight: 700 }}
              >
                🗺️ Browse Plots
              </button>
            )}
          </div>

          {(dealer || customer) && activeDeals.length > 0 && (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(245,158,11,0.2)', border: '1px solid rgba(245,158,11,0.5)', borderRadius: 9999, padding: '0.5rem 1.25rem', marginBottom: '1rem', fontSize: '0.85rem', color: '#fcd34d', fontWeight: 700, cursor: 'pointer' }}
              onClick={() => navigate('plots')}>
              🏷️ {activeDeals.length} Special Offer{activeDeals.length !== 1 ? 's' : ''} Available — View Plots
            </div>
          )}

          {stats && (
            <div style={{ display: 'flex', gap: '1.5rem', justifyContent: 'center', flexWrap: 'wrap' }}>
              {[
                { label: 'Total Plots', value: stats.total, icon: '📍', color: '#94a3b8' },
                { label: 'Available', value: stats.available, icon: '✅', color: '#4ade80' },
                { label: 'Booked', value: stats.booked, icon: '📋', color: '#fbbf24' },
                { label: 'Sold', value: stats.sold, icon: '🏠', color: '#f87171' },
              ].map(s => (
                <div key={s.label} style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '1.75rem', fontWeight: 900, color: s.color }}>{s.value}</div>
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 500 }}>{s.icon} {s.label}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <section style={{ background: '#fffbeb', borderBottom: '1px solid #fde68a', padding: '2.5rem 1.5rem' }}>
        <div className="container">
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '0.25rem' }}>
                <span style={{ fontSize: '1.25rem' }}>📢</span>
                <h2 style={{ fontSize: '1.375rem', fontWeight: 800, color: '#1a1a2e' }}>Latest Announcements</h2>
                {announcements.filter(a => a.important).length > 0 && (
                  <span style={{ background: '#dc2626', color: '#fff', fontSize: '0.65rem', fontWeight: 700, padding: '0.15rem 0.5rem', borderRadius: 9999, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {announcements.filter(a => a.important).length} Important
                  </span>
                )}
              </div>
              <p style={{ color: '#78716c', fontSize: '0.875rem' }}>Stay updated with the latest news from University Enclave</p>
            </div>
          </div>

          {announcements.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: '#9ca3af' }}>No announcements yet.</div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
              {announcements.map(a => (
                <div key={a.id} style={{
                  background: '#fff',
                  borderRadius: 12,
                  padding: '1.25rem',
                  border: `1px solid ${a.important ? '#fde68a' : '#e5e7eb'}`,
                  borderLeft: `4px solid ${a.important ? '#d4a017' : '#e5e7eb'}`,
                  boxShadow: a.important ? '0 2px 8px rgba(212,160,23,0.1)' : '0 1px 3px rgba(0,0,0,0.06)',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <span style={{
                      background: tagColor[a.tag]?.bg || '#f3f4f6',
                      color: tagColor[a.tag]?.color || '#374151',
                      fontSize: '0.7rem', fontWeight: 700,
                      padding: '0.2rem 0.625rem', borderRadius: 9999,
                      textTransform: 'uppercase', letterSpacing: '0.05em',
                    }}>{a.tag}</span>
                    <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>{formatDate(a.date)}</span>
                  </div>
                  <h3 style={{ fontWeight: 700, fontSize: '0.95rem', color: '#1a1a2e', marginBottom: '0.5rem', lineHeight: 1.4 }}>
                    {a.important && <span style={{ color: '#d4a017', marginRight: '0.25rem' }}>⚡</span>}
                    {a.title}
                  </h3>
                  <p style={{ color: '#6b7280', fontSize: '0.85rem', lineHeight: 1.65 }}>{a.body}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <PaymentPlanTable />

      <section style={{ padding: '3.5rem 1.5rem' }}>
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
            <h2 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.5rem' }}>Society Plot Availability</h2>
            <p style={{ color: '#6b7280' }}>Current availability of plots across all blocks in University Enclave</p>
          </div>

          {stats && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
              {[
                { label: 'Total Plots', value: stats.total, icon: '📍', bg: 'linear-gradient(135deg, #1a1a2e, #2d3748)', pct: 100 },
                { label: 'Available Plots', value: stats.available, icon: '✅', bg: 'linear-gradient(135deg, #059669, #047857)', pct: Math.round((stats.available / stats.total) * 100) },
                { label: 'Booked Plots', value: stats.booked, icon: '📋', bg: 'linear-gradient(135deg, #d97706, #b45309)', pct: Math.round((stats.booked / stats.total) * 100) },
                { label: 'Sold Plots', value: stats.sold, icon: '🏠', bg: 'linear-gradient(135deg, #dc2626, #b91c1c)', pct: Math.round((stats.sold / stats.total) * 100) },
              ].map(s => (
                <div key={s.label} style={{
                  background: s.bg, color: '#fff', borderRadius: 14,
                  padding: '1.5rem', position: 'relative', overflow: 'hidden',
                }}>
                  <div style={{ position: 'absolute', top: -10, right: -10, fontSize: '5rem', opacity: 0.08 }}>{s.icon}</div>
                  <div style={{ fontSize: '2.5rem', fontWeight: 900, lineHeight: 1 }}>{s.value}</div>
                  <div style={{ fontSize: '0.85rem', opacity: 0.85, marginTop: '0.4rem', marginBottom: '1rem' }}>{s.label}</div>
                  <div style={{ background: 'rgba(255,255,255,0.15)', borderRadius: 4, height: 5 }}>
                    <div style={{ background: '#fff', width: `${s.pct}%`, height: '100%', borderRadius: 4, transition: 'width 1s ease' }} />
                  </div>
                  <div style={{ fontSize: '0.75rem', opacity: 0.7, marginTop: '0.4rem' }}>{s.pct}% of total</div>
                </div>
              ))}
            </div>
          )}

          {(dealer || customer) && (
            <div style={{ textAlign: 'center' }}>
              <button className="btn btn-primary" onClick={() => navigate('plots')} style={{ fontSize: '1rem', padding: '0.875rem 2.5rem' }}>
                View All Plots →
              </button>
            </div>
          )}
        </div>
      </section>

      <section style={{ background: 'linear-gradient(135deg, #1a6b3c, #145530)', color: '#fff', padding: '3.5rem 1.5rem', textAlign: 'center' }}>
        <h2 style={{ fontSize: '1.875rem', fontWeight: 800, marginBottom: '1rem' }}>Ready to Invest?</h2>
        <p style={{ color: '#d1fae5', marginBottom: '2rem', maxWidth: 500, margin: '0 auto 2rem', lineHeight: 1.7 }}>
          Don't miss limited available plots. Register today and secure your dream investment.
        </p>
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          {!customer && !dealer && (
            <button className="btn btn-accent" onClick={() => setModal('signup')} style={{ fontSize: '0.95rem', padding: '0.875rem 2rem' }}>
              📝 Create Free Account
            </button>
          )}
          {(dealer || customer) && (
            <button className="btn" onClick={() => navigate('plots')} style={{ fontSize: '0.95rem', padding: '0.875rem 2rem', background: '#fff', color: '#1a6b3c', fontWeight: 700 }}>
              Browse Plots →
            </button>
          )}
        </div>
      </section>
    </div>
  );
}
