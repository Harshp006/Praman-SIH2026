import React, { useState } from 'react';
import { ShieldCheck, LogIn, CheckCircle } from 'lucide-react';
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
      backgroundColor: 'var(--bg-page)',
      fontFamily: 'var(--font-sans)'
    }}>
      {/* Left Panel - Branding (Hidden on very small screens) */}
      <div style={{
        flex: 1,
        background: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)',
        color: 'white',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '4rem',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Subtle decorative circles */}
        <div style={{ position: 'absolute', top: '-10%', right: '-10%', width: '400px', height: '400px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', filter: 'blur(40px)' }}></div>
        <div style={{ position: 'absolute', bottom: '-10%', left: '-10%', width: '300px', height: '300px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)', filter: 'blur(30px)' }}></div>
        
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div className="flex items-center gap-3 mb-8">
            <div style={{ background: 'white', padding: '12px', borderRadius: '16px', display: 'inline-flex' }}>
              <ShieldCheck size={40} color="#1e3a8a" strokeWidth={2} />
            </div>
            <h1 style={{ fontSize: '2.5rem', fontWeight: 700, margin: 0, letterSpacing: '-1px' }}>Praman</h1>
          </div>
          <h2 style={{ fontSize: '3.5rem', fontWeight: 300, lineHeight: 1.1, marginBottom: '2rem', maxWidth: '600px' }}>
            Next-Generation <br/><span style={{ fontWeight: 600 }}>Compliance Verification.</span>
          </h2>
          <p style={{ fontSize: '1.25rem', opacity: 0.8, maxWidth: '500px', lineHeight: 1.6 }}>
            Automate due diligence for public procurement with multi-portal integrations and AI-assisted risk scoring.
          </p>
        </div>

        <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="flex items-center gap-3"><CheckCircle size={24} color="#86efac" /> <span style={{ fontSize: '1.125rem' }}>Real-time GST & PAN verification</span></div>
          <div className="flex items-center gap-3"><CheckCircle size={24} color="#86efac" /> <span style={{ fontSize: '1.125rem' }}>CVC & MCA21 blacklisting checks</span></div>
          <div className="flex items-center gap-3"><CheckCircle size={24} color="#86efac" /> <span style={{ fontSize: '1.125rem' }}>Ollama AI-powered risk insights</span></div>
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem',
        backgroundColor: '#ffffff',
        boxShadow: '-10px 0 30px rgba(0,0,0,0.05)',
        zIndex: 10
      }}>
        <div style={{ width: '100%', maxWidth: '440px' }}>
          <div style={{ marginBottom: '2.5rem' }}>
            <h2 style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.5rem', letterSpacing: '-0.5px' }}>Welcome back</h2>
            <p style={{ fontSize: '1.125rem', color: 'var(--text-muted)' }}>Sign in to the officer portal to continue.</p>
          </div>
          
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            {error && (
              <div style={{ 
                padding: '1rem', 
                backgroundColor: 'var(--danger-light)', 
                color: 'var(--danger-text)',
                border: '1px solid var(--danger-border)',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.9375rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                <div style={{ fontWeight: 500 }}>{error}</div>
              </div>
            )}
            
            <div>
              <label style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.5rem', display: 'block' }}>Email Address</label>
              <input 
                type="email" 
                className="input" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                style={{ padding: '0.875rem 1rem', fontSize: '1rem', backgroundColor: 'var(--bg-page)' }}
              />
            </div>
            
            <div>
              <label style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.5rem', display: 'block' }}>Password</label>
              <input 
                type="password" 
                className="input" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                style={{ padding: '0.875rem 1rem', fontSize: '1rem', backgroundColor: 'var(--bg-page)' }}
              />
            </div>
            
            <button 
              type="submit" 
              className="btn btn-primary mt-4" 
              disabled={loading}
              style={{ width: '100%', padding: '1rem', fontSize: '1rem', fontWeight: 600, marginTop: '1rem' }}
            >
              {loading ? <span className="spinner" style={{ width: '1.25rem', height: '1.25rem', borderWidth: '2px' }}></span> : <LogIn size={20} />}
              {loading ? 'Authenticating...' : 'Sign In'}
            </button>
            
            <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '1.5rem' }}>
              Secure portal for authorized government personnel only.
            </p>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;
