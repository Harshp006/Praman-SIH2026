import React, { createContext, useContext, useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import BidderView from './pages/BidderView';
import AddBidder from './pages/AddBidder';
import AuditTrail from './pages/AuditTrail';
import EditBidder from './pages/EditBidder';
import Navbar from './components/Navbar';
import api from './api';
import './index.css';

// Simple Auth Context
const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

// Protected Layout with Navbar and Footer
const ProtectedLayout = () => {
  const { officer, logout } = useAuth();
  
  if (!officer) {
    return <Navigate to="/login" replace />;
  }
  
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Navbar officer={officer} onLogout={logout} />
      <main className="container pt-6 pb-8" style={{ flex: 1, width: '100%' }}>
        <Outlet />
      </main>
      
      {/* Global Footer */}
      <footer style={{ 
        backgroundColor: '#E2E8F0', 
        borderTop: '1px solid var(--border)',
        padding: '1rem 0'
      }}>
        <div className="container flex justify-between items-center text-xs font-bold uppercase text-muted">
          <span>Praman — Bid Compliance Verification System | v1.0</span>
          <span>Best viewed in Chrome / Firefox | Internal use only — CPCL Procurement Division</span>
        </div>
      </footer>
    </div>
  );
};

function App() {
  const [officer, setOfficer] = useState(null);
  const [loading, setLoading] = useState(true);

  // Re-hydrate session on load
  useEffect(() => {
    const token = localStorage.getItem('praman_token');
    const storedOfficer = localStorage.getItem('praman_officer');
    
    if (token && storedOfficer) {
      setOfficer(JSON.parse(storedOfficer));
    }
    setLoading(false);
  }, []);

  const login = (data) => {
    localStorage.setItem('praman_token', data.token);
    localStorage.setItem('praman_officer', JSON.stringify(data.officer));
    setOfficer(data.officer);
  };

  const logout = () => {
    localStorage.removeItem('praman_token');
    localStorage.removeItem('praman_officer');
    setOfficer(null);
  };

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}><div className="spinner"></div></div>;
  }

  return (
    <AuthContext.Provider value={{ officer, login, logout }}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={officer ? <Navigate to="/" replace /> : <Login />} />
          
          <Route element={<ProtectedLayout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/add-bidder" element={<AddBidder />} />
            <Route path="/audit-trail" element={<AuditTrail />} />
            <Route path="/bidders/:id" element={<BidderView />} />
            <Route path="/bidders/:id/edit" element={<EditBidder />} />
          </Route>
          
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthContext.Provider>
  );
}

export default App;
