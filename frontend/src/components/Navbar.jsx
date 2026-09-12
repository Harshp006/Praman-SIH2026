import React from 'react';
import { ShieldCheck, LogOut, Bell, User, LayoutDashboard, PlusCircle, Shield, FileText, Code } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

const Navbar = ({ officer, onLogout }) => {
  const navigate = useNavigate();
  const location = useLocation();
  
  const handleLogout = () => {
    onLogout();
    navigate('/login');
  };

  const now = new Date();
  const formattedDateTime = now.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    + ' | ' + now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }).toLowerCase();

  const navLinks = [
    { path: '/',            label: 'Dashboard',  icon: LayoutDashboard },
    { path: '/add-bidder',  label: 'Add Bidder', icon: PlusCircle },
    { path: '/audit-trail', label: 'Audit Trail', icon: Shield },
    { path: '/api-docs', label: 'API Docs', icon: Code },
  ];

  return (
    <div style={{ position: 'sticky', top: 0, zIndex: 50, boxShadow: '0 2px 12px rgba(37,99,235,0.12)' }}>
      {/* Top Header Bar */}
      <header style={{
        background: 'linear-gradient(135deg, #1E3A5F 0%, #2563EB 100%)',
        color: 'white'
      }}>
        <div className="container flex items-center justify-between" style={{ height: '60px' }}>
          {/* Left: Logo */}
          <div className="flex items-center gap-3">
            <div style={{
              background: 'rgba(255,255,255,0.15)',
              borderRadius: '8px',
              padding: '6px',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <ShieldCheck size={22} strokeWidth={2.5} />
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: '1.1rem', letterSpacing: '-0.02em', lineHeight: 1 }}>
                Praman
              </div>
              <div style={{ fontSize: '9px', fontWeight: 600, color: 'rgba(255,255,255,0.65)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                GeM Bid Compliance Platform
              </div>
            </div>
            <span style={{
              background: '#F59E0B',
              color: '#1E3A5F',
              padding: '2px 7px',
              fontSize: '9px',
              fontWeight: 800,
              borderRadius: '4px',
              letterSpacing: '0.05em'
            }}>SIH 2026</span>
          </div>

          {/* Right */}
          <div className="flex items-center gap-4 text-sm">
            <span style={{ color: 'rgba(255,255,255,0.65)', fontSize: '0.75rem' }}>{formattedDateTime}</span>
            
            <div className="flex items-center gap-2" style={{ 
              background: 'rgba(255,255,255,0.12)', 
              borderRadius: '6px',
              padding: '4px 10px'
            }}>
              <div style={{ 
                width: 28, height: 28, borderRadius: '50%', 
                background: 'rgba(255,255,255,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <User size={14} />
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.8rem', lineHeight: 1 }}>{officer.name}</div>
                <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.65)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Procurement Officer</div>
              </div>
            </div>
            
            <button 
              onClick={handleLogout}
              className="btn btn-outline-white"
              style={{ padding: '5px 12px', fontSize: '0.72rem' }}
            >
              <LogOut size={13} /> Logout
            </button>
          </div>
        </div>
      </header>

      {/* Accent Strip */}
      <div style={{ height: '3px', background: 'linear-gradient(90deg, #F59E0B 0%, #FCD34D 100%)' }}></div>

      {/* Nav Tabs */}
      <div style={{ backgroundColor: '#1D4ED8', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
        <div className="container flex items-center gap-1">
          {navLinks.map(link => {
            const isActive = location.pathname === link.path || (link.path !== '/' && location.pathname.startsWith(link.path));
            const Icon = link.icon;
            return (
              <Link 
                key={link.path}
                to={link.path} 
                className="flex items-center gap-2"
                style={{
                  padding: '10px 16px',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  color: isActive ? 'white' : 'rgba(255,255,255,0.6)',
                  borderBottom: isActive ? '3px solid #F59E0B' : '3px solid transparent',
                  borderRadius: '0',
                  transition: 'color 0.2s',
                  textDecoration: 'none',
                  background: isActive ? 'rgba(255,255,255,0.08)' : 'transparent',
                }}
              >
                <Icon size={14} /> {link.label}
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Navbar;
