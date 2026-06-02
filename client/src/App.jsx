import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar.jsx';
import Home from './pages/Home.jsx';
import Plots from './pages/Plots.jsx';
import BookingForm from './pages/BookingForm.jsx';
import BookingStatus from './pages/BookingStatus.jsx';
import About from './pages/About.jsx';
import DealerDashboard from './pages/DealerDashboard.jsx';
import AdminDashboard from './pages/AdminDashboard.jsx';
import OperationsDashboard from './pages/OperationsDashboard.jsx';

function loadSession() {
  try {
    const d = localStorage.getItem('ue_dealer');
    const c = localStorage.getItem('ue_customer');
    const p = localStorage.getItem('ue_page');
    const t = localStorage.getItem('ue_token');
    return {
      dealer: d ? JSON.parse(d) : null,
      customer: c ? JSON.parse(c) : null,
      page: p || 'home',
      token: t || null,
    };
  } catch {
    return { dealer: null, customer: null, page: 'home', token: null };
  }
}

export default function App() {
  const session = loadSession();
  const [page, setPage] = useState(session.page);
  const [selectedPlot, setSelectedPlot] = useState(null);
  const [dealer, setDealer] = useState(session.dealer);
  const [customer, setCustomer] = useState(session.customer);
  const [authToken, setAuthToken] = useState(session.token);

  useEffect(() => {
    try {
      if (dealer) localStorage.setItem('ue_dealer', JSON.stringify(dealer));
      else localStorage.removeItem('ue_dealer');
    } catch {}
  }, [dealer]);

  useEffect(() => {
    try {
      if (authToken) localStorage.setItem('ue_token', authToken);
      else localStorage.removeItem('ue_token');
    } catch {}
  }, [authToken]);

  useEffect(() => {
    try {
      if (customer) localStorage.setItem('ue_customer', JSON.stringify(customer));
      else localStorage.removeItem('ue_customer');
    } catch {}
  }, [customer]);

  useEffect(() => {
    const safePage = ['home', 'plots', 'status', 'about'].includes(page) ? page :
      (page === 'dashboard' && dealer && dealer.role === 'dealer') ? 'dashboard' :
      (page === 'admin-dashboard' && dealer && dealer.role === 'admin') ? 'admin-dashboard' :
      (page === 'ops-dashboard' && dealer && dealer.role === 'operations') ? 'ops-dashboard' : 'home';
    try { localStorage.setItem('ue_page', safePage); } catch {}
  }, [page, dealer]);

  const navigate = (p, data = null) => {
    setPage(p);
    if (data) setSelectedPlot(data);
    window.scrollTo(0, 0);
  };

  const handleDealerLogin = (d, token) => {
    setDealer(d);
    if (token) setAuthToken(token);
    if (d.role === 'admin') {
      navigate('admin-dashboard');
    } else if (d.role === 'operations') {
      navigate('ops-dashboard');
    } else {
      navigate('dashboard');
    }
  };

  const handleLogout = () => {
    setDealer(null);
    setCustomer(null);
    setAuthToken(null);
    try { localStorage.removeItem('ue_dealer'); localStorage.removeItem('ue_customer'); localStorage.removeItem('ue_page'); localStorage.removeItem('ue_token'); } catch {}
    navigate('home');
  };

  const authProps = {
    dealer,
    customer,
    onDealerLogin: handleDealerLogin,
    onCustomerLogin: setCustomer,
    onLogout: handleLogout,
  };

  const isFullscreenPage = page === 'dashboard' || page === 'admin-dashboard' || page === 'ops-dashboard';

  return (
    <div>
      {!isFullscreenPage && (
        <Navbar currentPage={page} navigate={navigate} dealer={dealer} customer={customer} onLogout={handleLogout} />
      )}
      <main>
        {page === 'home' && <Home navigate={navigate} {...authProps} />}
        {page === 'plots' && (dealer || customer ? <Plots navigate={navigate} dealer={dealer} /> : <Home navigate={navigate} {...authProps} />)}
        {page === 'booking' && (dealer || customer ? <BookingForm plot={selectedPlot} navigate={navigate} dealer={dealer} /> : <Home navigate={navigate} {...authProps} />)}
        {page === 'status' && (dealer || customer ? <BookingStatus navigate={navigate} /> : <Home navigate={navigate} {...authProps} />)}
        {page === 'about' && <About navigate={navigate} />}
        {page === 'dashboard' && dealer && dealer.role === 'dealer' && (
          <DealerDashboard dealer={dealer} authToken={authToken} onLogout={handleLogout} navigate={navigate} />
        )}
        {page === 'admin-dashboard' && dealer && dealer.role === 'admin' && (
          <AdminDashboard dealer={dealer} authToken={authToken} onLogout={handleLogout} navigate={navigate} />
        )}
        {page === 'ops-dashboard' && dealer && dealer.role === 'operations' && (
          <OperationsDashboard staff={dealer} onLogout={handleLogout} navigate={navigate} />
        )}
      </main>
      {!isFullscreenPage && (
        <footer style={{
          background: '#1a1a2e',
          color: '#9ca3af',
          textAlign: 'center',
          padding: '2rem',
          marginTop: '4rem',
          fontSize: '0.875rem',
        }}>
          <div style={{ marginBottom: '0.5rem', color: '#fff', fontWeight: 700, fontSize: '1rem' }}>University Enclave Housing Society</div>
          <div>© {new Date().getFullYear()} All rights reserved. Plot Booking Portal</div>
        </footer>
      )}
    </div>
  );
}
