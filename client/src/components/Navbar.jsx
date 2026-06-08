import React from 'react';

export default function Navbar({ currentPage, navigate, dealer, customer, onLogout }) {
  const dashboardPage = dealer?.role === 'admin' ? 'admin-dashboard' : dealer?.role === 'operations' ? 'ops-dashboard' : 'dashboard';
  const isLoggedIn = !!(dealer || customer);
  const links = dealer
    ? dealer.role === 'operations'
      ? [
          { id: 'ops-dashboard', label: '⚙️ Operations' },
          { id: 'home', label: 'Home' },
        ]
      : [
        { id: dashboardPage, label: dealer.role === 'admin' ? '👑 Admin Dashboard' : '📊 My Dashboard' },
        ...(dealer.role !== 'dealer' ? [{ id: 'plots', label: 'Browse Plots' }] : []),
        { id: 'status', label: 'Booking Status' },
        { id: 'home', label: 'Home' },
      ]
    : customer
    ? [
        { id: 'home', label: 'Home' },
        { id: 'plots', label: 'Browse Plots' },
        { id: 'status', label: 'Booking Status' },
        { id: 'about', label: 'About Us' },
      ]
    : [
        { id: 'home', label: 'Home' },
        { id: 'about', label: 'About Us' },
      ];

  const user = dealer || customer;

  return (
    <nav style={{
      background: '#0f172a',
      color: '#fff',
      padding: '0 1.5rem',
      position: 'sticky',
      top: 0,
      zIndex: 100,
      boxShadow: '0 2px 12px rgba(0,0,0,0.4)',
      borderBottom: '1px solid rgba(255,255,255,0.06)',
    }}>
      <div style={{
        maxWidth: 1200,
        margin: '0 auto',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: 64,
        gap: '1rem',
      }}>
        <button
          onClick={() => navigate('home')}
          style={{ background: 'none', border: 'none', color: '#fff', display: 'flex', alignItems: 'center', gap: '0.625rem', cursor: 'pointer', flexShrink: 0 }}
        >
          <div style={{ width: 38, height: 38, background: 'linear-gradient(135deg, #1a6b3c, #0f4a28)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, boxShadow: '0 2px 8px rgba(26,107,60,0.5)' }}>🏘️</div>
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontWeight: 800, fontSize: '0.9rem', lineHeight: 1.2, letterSpacing: '-0.01em' }}>University Enclave</div>
            <div style={{ fontSize: '0.65rem', color: '#64748b', lineHeight: 1.2, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Plot Booking Portal</div>
          </div>
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.125rem', flex: 1, justifyContent: 'center' }}>
          {links.map(link => (
            <button
              key={link.id}
              onClick={() => navigate(link.id)}
              style={{
                background: currentPage === link.id ? 'rgba(26,107,60,0.7)' : 'none',
                border: 'none',
                color: currentPage === link.id ? '#fff' : '#94a3b8',
                padding: '0.5rem 0.875rem',
                borderRadius: 8,
                cursor: 'pointer',
                fontWeight: currentPage === link.id ? 700 : 500,
                fontSize: '0.85rem',
                transition: 'all 0.15s',
                whiteSpace: 'nowrap',
              }}
              onMouseEnter={e => { if (currentPage !== link.id) e.currentTarget.style.color = '#fff'; }}
              onMouseLeave={e => { if (currentPage !== link.id) e.currentTarget.style.color = '#94a3b8'; }}
            >
              {link.label}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', flexShrink: 0 }}>
          {user ? (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 9, padding: '0.35rem 0.75rem' }}>
                <div style={{ width: 26, height: 26, borderRadius: '50%', background: dealer ? '#d4a017' : '#1a6b3c', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem' }}>
                  {dealer ? '🔑' : '👤'}
                </div>
                <div>
                  <div style={{ fontSize: '0.78rem', fontWeight: 700, lineHeight: 1.2, color: '#f1f5f9' }}>{user.name}</div>
                  <div style={{ fontSize: '0.65rem', color: '#64748b', lineHeight: 1.2, textTransform: 'capitalize' }}>{dealer ? dealer.role : 'Customer'}</div>
                </div>
              </div>
              <button
                onClick={onLogout}
                style={{ background: 'rgba(220,38,38,0.15)', border: '1px solid rgba(220,38,38,0.3)', color: '#fca5a5', borderRadius: 8, padding: '0.4rem 0.875rem', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(220,38,38,0.25)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(220,38,38,0.15)'; }}
              >
                Logout
              </button>
            </>
          ) : null}
        </div>
      </div>
    </nav>
  );
}
