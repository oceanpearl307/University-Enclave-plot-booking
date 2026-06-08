import React, { useEffect, useState } from 'react';

export default function Plots({ navigate, dealer }) {
  const [plots, setPlots] = useState([]);
  const [allAreas, setAllAreas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ status: '', category: '', area: '' });

  const isDealer = dealer?.role === 'dealer';

  useEffect(() => {
    const params = new URLSearchParams();
    if (isDealer) params.set('dealerId', dealer.id);
    fetch('/api/plots?' + params)
      .then(r => r.json())
      .then(data => {
        const areas = [...new Set(data.map(p => p.area).filter(Boolean))].sort();
        setAllAreas(areas);
      })
      .catch(() => {});
  }, []);

  const loadPlots = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filters.status) params.set('status', filters.status);
    if (filters.category) params.set('category', filters.category);
    if (filters.area) params.set('area', filters.area);
    if (isDealer) params.set('dealerId', dealer.id);
    fetch('/api/plots?' + params)
      .then(r => r.json())
      .then(data => { setPlots(data); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => { loadPlots(); }, [filters]);

  const formatPrice = p => 'PKR ' + (p >= 1000000 ? (p / 1000000).toFixed(1) + 'M' : (p / 1000).toFixed(0) + 'K');

  const statusColor = { available: '#059669', booked: '#d97706', sold: '#dc2626' };
  const statusBg = { available: '#d1fae5', booked: '#fef3c7', sold: '#fee2e2' };

  const TAG_STYLE = {
    'Corner Plot':    { bg: '#e0f2fe', color: '#075985' },
    'Park Facing':    { bg: '#d1fae5', color: '#065f46' },
    'Main Road':      { bg: '#f3e8ff', color: '#6b21a8' },
    'Main Boulevard': { bg: '#fef3c7', color: '#92400e' },
  };

  return (
    <div style={{ padding: '2rem 1.5rem', maxWidth: 1200, margin: '0 auto' }}>
      <h1 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '0.5rem' }}>Available Plots</h1>
      <p style={{ color: '#6b7280', marginBottom: isDealer ? '1rem' : '2rem' }}>Browse and book your preferred plot in University Enclave</p>
      {isDealer && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', background: '#eff6ff', border: '1.5px solid #bfdbfe', borderRadius: 10, padding: '0.625rem 1rem', marginBottom: '2rem', fontSize: '0.82rem', color: '#1d4ed8', fontWeight: 600 }}>
          <span style={{ fontSize: '1rem' }}>🔒</span>
          Showing only plots assigned to your package — contact admin to update your allocation.
        </div>
      )}

      <div style={{
        background: '#fff',
        border: '1px solid #e5e7eb',
        borderRadius: 12,
        padding: '1.25rem',
        marginBottom: '2rem',
        display: 'flex',
        flexWrap: 'wrap',
        gap: '1rem',
        alignItems: 'flex-end',
      }}>
        <div className="form-group" style={{ flex: 1, minWidth: 150 }}>
          <label>Status</label>
          <select value={filters.status} onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}>
            <option value="">All Status</option>
            <option value="available">Available</option>
            <option value="booked">Booked</option>
            <option value="sold">Sold</option>
          </select>
        </div>
        <div className="form-group" style={{ flex: 1, minWidth: 150 }}>
          <label>Category</label>
          <select value={filters.category} onChange={e => setFilters(f => ({ ...f, category: e.target.value }))}>
            <option value="">All Categories</option>
            <option value="residential">Residential</option>
            <option value="commercial">Commercial</option>
          </select>
        </div>
        <div className="form-group" style={{ flex: 1, minWidth: 150 }}>
          <label>Block</label>
          <select value={filters.area} onChange={e => setFilters(f => ({ ...f, area: e.target.value }))}>
            <option value="">All Blocks</option>
            {allAreas.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
        <button className="btn btn-outline" onClick={() => setFilters({ status: '', category: '', area: '' })}>
          Clear Filters
        </button>
      </div>

      {loading ? (
        <div className="loading"><div className="spinner"></div>Loading plots...</div>
      ) : plots.length === 0 ? (
        <div className="empty-state">
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>{isDealer ? '📋' : '🔍'}</div>
          <h3>{isDealer ? 'No plots assigned to you yet' : 'No plots found'}</h3>
          <p>{isDealer ? 'Your admin needs to assign a target and plots to your account before you can book.' : 'Try adjusting your filters to see more results.'}</p>
        </div>
      ) : (
        <>
          <p style={{ color: '#6b7280', marginBottom: '1rem', fontSize: '0.875rem' }}>{plots.length} plot{plots.length !== 1 ? 's' : ''} found</p>
          <div className="grid-3">
            {plots.map(plot => (
              <div key={plot.id} className="card">
                <div style={{
                  background: plot.status === 'available' ? 'linear-gradient(135deg, #1a6b3c, #145530)' : plot.status === 'booked' ? 'linear-gradient(135deg, #92400e, #78350f)' : 'linear-gradient(135deg, #7f1d1d, #991b1b)',
                  color: '#fff',
                  padding: '1.25rem',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ fontSize: '1.25rem', fontWeight: 800 }}>{plot.number}</div>
                      <div style={{ fontSize: '0.8rem', opacity: 0.85, marginTop: 2 }}>{plot.area}</div>
                    </div>
                    <span style={{
                      background: 'rgba(255,255,255,0.2)',
                      padding: '0.25rem 0.75rem',
                      borderRadius: 9999,
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                    }}>{plot.status}</span>
                  </div>
                </div>
                <div style={{ padding: '1.25rem' }}>
                  {plot.tags && plot.tags.length > 0 && (
                    <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
                      {plot.tags.map(tag => (
                        <span key={tag} style={{ background: TAG_STYLE[tag]?.bg || '#f3f4f6', color: TAG_STYLE[tag]?.color || '#374151', borderRadius: 6, padding: '0.2rem 0.5rem', fontSize: '0.68rem', fontWeight: 700 }}>
                          ★ {tag}
                        </span>
                      ))}
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                    <div>
                      <div style={{ fontSize: '0.75rem', color: '#6b7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Size</div>
                      <div style={{ fontWeight: 700, fontSize: '1rem' }}>{plot.size}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '0.75rem', color: '#6b7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Price</div>
                      {plot.effectivePrice && plot.effectivePrice !== plot.price ? (
                        <>
                          <div style={{ fontWeight: 500, fontSize: '0.78rem', color: '#94a3b8', textDecoration: 'line-through' }}>{formatPrice(plot.price)}</div>
                          <div style={{ fontWeight: 800, fontSize: '1.1rem', color: '#b45309' }}>{formatPrice(plot.effectivePrice)}</div>
                          <div style={{ fontSize: '0.65rem', color: '#b45309', fontWeight: 600 }}>incl. premium</div>
                        </>
                      ) : (
                        <div style={{ fontWeight: 800, fontSize: '1.1rem', color: '#1a6b3c' }}>{formatPrice(plot.price)}</div>
                      )}
                    </div>
                  </div>
                  <p style={{ color: '#6b7280', fontSize: '0.85rem', lineHeight: 1.5, marginBottom: '1rem' }}>{plot.description}</p>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{
                      background: '#f3f4f6',
                      color: '#374151',
                      padding: '0.2rem 0.625rem',
                      borderRadius: 6,
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      textTransform: 'capitalize',
                    }}>{plot.category}</span>
                    {plot.status === 'available' ? (
                      <button className="btn btn-primary btn-sm" onClick={() => navigate('booking', plot)}>
                        Book Now →
                      </button>
                    ) : (
                      <span style={{ fontSize: '0.8rem', color: '#6b7280', fontStyle: 'italic' }}>
                        {plot.status === 'booked' ? 'Under Process' : 'Already Sold'}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
