import React from 'react';
import { ShieldCheck, LogOut, Bell, User, LayoutDashboard, PlusCircle, Shield } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

const Navbar = ({ officer, onLogout }) => {
  const navigate = useNavigate();
  const location = useLocation();
  
  const handleLogout = () => {
    onLogout();
    navigate('/login');
  };

  const now = new Date();
  const dateOptions = { day: '2-digit', month: 'short', year: 'numeric' };
  const timeOptions = { hour: '2-digit', minute: '2-digit', hour12: true };
  const formattedDateTime = `${now.toLocaleDateString('en-GB', dateOptions)} | ${now.toLocaleTimeString('en-US', timeOptions).toLowerCase()}`;

  const navLinks = [
    { path: '/', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/add-bidder', label: 'Add Bidder', icon: PlusCircle },
    { path: '/audit-trail', label: 'Audit Trail', icon: Shield },
  ];

  return (
    <div style={{ position: 'sticky', top: 0, zIndex: 50 }}>
      {/* Top Header Bar */}
      <header style={{ backgroundColor: 'var(--navy-dark)', color: 'white' }}>
        <div className="container flex items-center justify-between" style={{ height: '64px' }}>
          {/* Left */}
          <div className="flex items-center gap-3">
            <ShieldCheck size={28} strokeWidth={2.5} />
            <span className="font-bold text-lg tracking-wide uppercase">Praman</span>
            <span style={{ 
              backgroundColor: 'var(--gold)', 
              color: 'var(--navy-darker)',
              padding: '2px 6px',
              fontSize: '10px',
              fontWeight: 800,
              borderRadius: '2px'
            }}>V1</span>
          </div>
          
          {/* Right */}
          <div className="flex items-center gap-6 text-sm">
            <span style={{ color: '#C7D0DA' }}>{formattedDateTime}</span>
            
            <div className="flex items-center gap-1 cursor-not-allowed text-muted" title="No unread notifications">
              <Bell size={18} />
            </div>

            <div className="flex items-center gap-2">
              <User size={18} />
              <span className="font-semibold">{officer.name}</span>
              <span style={{
                backgroundColor: 'rgba(255,255,255,0.15)',
                padding: '2px 6px',
                fontSize: '10px',
                fontWeight: 700,
                borderRadius: '2px',
                marginLeft: '4px'
              }}>OFFICER</span>
            </div>
            
            <button 
              onClick={handleLogout}
              className="btn btn-outline-white text-xs" 
              style={{ padding: '4px 10px' }}
            >
              <LogOut size={14} /> LOGOUT
            </button>
          </div>
        </div>
      </header>

      {/* Gold Strip */}
      <div style={{ height: '4px', backgroundColor: 'var(--gold)', width: '100%' }}></div>

      {/* Nav Tabs */}
      <div style={{ backgroundColor: 'var(--navy-darker)', borderBottom: '1px solid var(--border)' }}>
        <div className="container flex items-center gap-6">
          {navLinks.map(link => {
            const isActive = location.pathname === link.path || (link.path !== '/' && location.pathname.startsWith(link.path));
            const Icon = link.icon;
            return (
              <Link 
                key={link.path}
                to={link.path} 
                className="flex items-center gap-2 font-semibold uppercase text-sm"
                style={{
                  padding: '12px 0',
                  color: isActive ? 'var(--gold)' : '#A0AAB5',
                  borderBottom: isActive ? '3px solid var(--gold)' : '3px solid transparent',
                  transition: 'color 0.2s',
                  textDecoration: 'none'
                }}
              >
                <Icon size={16} /> {link.label}
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Navbar;
