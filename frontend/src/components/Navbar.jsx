import React from 'react';
import { ShieldCheck, LogOut } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

const Navbar = ({ officer, onLogout }) => {
  const navigate = useNavigate();
  
  const handleLogout = () => {
    onLogout();
    navigate('/login');
  };

  return (
    <header style={{ 
      backgroundColor: 'var(--bg-card)', 
      borderBottom: '1px solid var(--border-light)',
      position: 'sticky',
      top: 0,
      zIndex: 10
    }}>
      <div className="container flex items-center justify-between" style={{ height: '64px' }}>
        <Link to="/" className="flex items-center gap-2" style={{ color: 'var(--primary-main)' }}>
          <ShieldCheck size={28} strokeWidth={2.5} />
          <span className="h3" style={{ margin: 0 }}>Praman</span>
        </Link>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2" style={{ 
            padding: '4px 12px', 
            backgroundColor: 'var(--bg-subtle)', 
            borderRadius: '999px',
            fontSize: '0.875rem'
          }}>
            <span style={{ 
              width: '24px', 
              height: '24px', 
              borderRadius: '50%', 
              backgroundColor: 'var(--primary-main)', 
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 600,
              fontSize: '0.75rem'
            }}>
              {officer.name.charAt(0)}
            </span>
            <span className="font-medium text-muted">{officer.name}</span>
          </div>
          
          <button 
            onClick={handleLogout}
            className="btn btn-outline" 
            style={{ padding: '6px 12px', border: 'none', color: 'var(--text-muted)' }}
            title="Log out"
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
