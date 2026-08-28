import React, { useState } from 'react';
import { ShieldCheck, LogIn } from 'lucide-react';
import api from '../api';
import { useAuth } from '../App';

const Login = () => {
  const { login } = useAuth();
  const [email, setEmail] = useState('officer@praman.local');
  const [password, setPassword] = useState('praman123');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await api.post('/auth/login', { email, password });
      login(response.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'var(--surface-muted)',
      padding: '2rem'
    }}>
      <div style={{
        width: '100%',
        maxWidth: '520px',
        backgroundColor: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: '2px',
        boxShadow: 'none'
      }}>
        {/* Card Header */}
        <div style={{ 
          backgroundColor: 'var(--navy-dark)', 
          color: 'white', 
          padding: '1.5rem',
          borderTopLeftRadius: '2px',
          borderTopRightRadius: '2px'
        }}>
          <div className="flex items-center gap-3 mb-2">
            <ShieldCheck size={28} />
            <h1 className="m-0 uppercase" style={{ fontSize: '1.25rem', fontWeight: 700, letterSpacing: '0.5px' }}>
              Praman — Secure Portal
            </h1>
          </div>
          <p style={{ margin: 0, color: '#C7D0DA', fontSize: '0.875rem' }}>
            Sign in to access your account
          </p>
        </div>
        
        {/* Gold Rule */}
        <div style={{ height: '3px', backgroundColor: 'var(--gold)', width: '100%' }}></div>

        {/* Tab Toggle (Single active tab) */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border)' }}>
          <div style={{
            padding: '1rem 2rem',
            fontWeight: 700,
            textTransform: 'uppercase',
            fontSize: '0.875rem',
            color: 'var(--navy-dark)',
            borderBottom: '3px solid var(--navy-dark)'
          }}>
            Sign In
          </div>
        </div>

        {/* Form Body */}
        <div style={{ padding: '2rem' }}>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {error && (
              <div style={{ 
                padding: '0.75rem', 
                backgroundColor: '#FDF2F2', 
                color: 'var(--status-rejected)',
                border: '1px solid var(--status-rejected)',
                borderRadius: '2px',
                fontSize: '0.875rem',
                fontWeight: 600
              }}>
                {error}
              </div>
            )}
            
            <div>
              <label style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.25rem', display: 'block', textTransform: 'uppercase' }}>
                Email Address <span style={{ color: 'var(--status-rejected)' }}>*</span>
              </label>
              <input 
                type="email" 
                className="input" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            
            <div>
              <label style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.25rem', display: 'block', textTransform: 'uppercase' }}>
                Password <span style={{ color: 'var(--status-rejected)' }}>*</span>
              </label>
              <input 
                type="password" 
                className="input" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            
            <button 
              type="submit" 
              className="btn btn-primary w-full mt-4" 
              disabled={loading}
              style={{ padding: '0.75rem' }}
            >
              {loading ? <span className="spinner" style={{ width: '1rem', height: '1rem', borderWidth: '2px' }}></span> : <LogIn size={18} />}
              {loading ? 'AUTHENTICATING...' : 'SIGN IN'}
            </button>
          </form>

          <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '2rem 0 1rem' }} />

          <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.75rem', margin: 0, fontWeight: 500 }}>
            This is a secured portal. Unauthorized access is prohibited.<br />
            All activity is logged for audit purposes.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
