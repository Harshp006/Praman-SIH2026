import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { LayoutDashboard, Search, FileText, ArrowRight, Activity, CheckCircle, Clock, AlertTriangle } from 'lucide-react';
import api from '../api';

const StatCard = ({ title, value, sub, color }) => (
  <div className="card flex flex-col gap-2" style={{ padding: '1.25rem' }}>
    <div className="text-xs font-bold uppercase text-muted">{title}</div>
    <div style={{ fontSize: '2rem', fontWeight: 800, color: color || 'var(--navy-dark)', lineHeight: 1 }}>{value}</div>
    {sub && <div className="text-xs font-bold uppercase text-muted">{sub}</div>}
  </div>
);

const TenderCard = ({ tender, onClick }) => (
  <div 
    className="card tender-card" 
    onClick={onClick}
    style={{ 
      padding: '1.5rem', 
      cursor: 'pointer', 
      transition: 'transform 0.2s, box-shadow 0.2s',
      display: 'flex',
      flexDirection: 'column',
      height: '100%'
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.transform = 'translateY(-4px)';
      e.currentTarget.style.boxShadow = '0 12px 24px -10px rgba(23, 58, 92, 0.15)';
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.transform = 'translateY(0)';
      e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
    }}
  >
    <div className="flex items-start justify-between mb-3">
      <div className="flex items-center gap-2" style={{ color: 'var(--navy-dark)' }}>
        <FileText size={20} />
        <span className="text-sm font-bold font-mono tracking-wider">{tender.tenderId}</span>
      </div>
      <div className="flex items-center justify-center bg-gray-100 rounded-full h-8 w-8 text-gray-500">
        <ArrowRight size={16} />
      </div>
    </div>
    
    <h3 className="font-bold text-lg mb-2" style={{ color: 'var(--navy-dark)', lineHeight: 1.3 }}>
      {tender.name}
    </h3>
    <p className="text-xs text-muted mb-6 flex-1 line-clamp-2">
      {tender.description || 'No description available for this tender.'}
    </p>

    <div className="grid grid-cols-4 gap-2 pt-4 border-t border-gray-100 mt-auto">
      <div className="flex flex-col items-center">
        <div className="flex items-center gap-1 text-gray-500 mb-1">
          <Activity size={12} />
          <span className="text-[10px] font-bold uppercase">Total</span>
        </div>
        <span className="font-bold text-sm">{tender.totalBidders}</span>
      </div>
      
      <div className="flex flex-col items-center">
        <div className="flex items-center gap-1 text-yellow-600 mb-1">
          <Clock size={12} />
          <span className="text-[10px] font-bold uppercase">Pending</span>
        </div>
        <span className="font-bold text-sm text-yellow-700">{tender.pending_review}</span>
      </div>
      
      <div className="flex flex-col items-center">
        <div className="flex items-center gap-1 text-green-600 mb-1">
          <CheckCircle size={12} />
          <span className="text-[10px] font-bold uppercase">Aprv</span>
        </div>
        <span className="font-bold text-sm text-green-700">{tender.approved}</span>
      </div>
      
      <div className="flex flex-col items-center">
        <div className="flex items-center gap-1 text-red-600 mb-1">
          <AlertTriangle size={12} />
          <span className="text-[10px] font-bold uppercase">Rej</span>
        </div>
        <span className="font-bold text-sm text-red-700">{tender.rejected}</span>
      </div>
    </div>
  </div>
);

const Dashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [tenders, setTenders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  const fetchStats = async () => {
    try {
      const r = await api.get('/dashboard/stats');
      setStats(r.data);
    } catch { /* ignore */ }
  };

  const fetchTenders = useCallback(async (q) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (q) params.set('q', q);
      const r = await api.get(`/tenders?${params.toString()}`);
      setTenders(r.data || []);
    } catch (err) {
      console.error('Failed to fetch tenders:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchStats(); }, []);
  useEffect(() => { fetchTenders(debouncedSearch); }, [debouncedSearch, fetchTenders]);

  return (
    <div>
      {/* Page Header */}
      <div className="mb-4">
        <div className="flex items-center gap-3">
          <LayoutDashboard size={24} style={{ color: 'var(--navy-dark)' }} />
          <h1 className="h2 m-0 uppercase">Tenders Overview</h1>
        </div>
        <p className="text-muted text-sm mt-1 font-semibold uppercase">Categorized view of active tenders and their bidders.</p>
        <hr className="page-header-rule" />
      </div>

      {/* Stats Row */}
      {stats && (
        <div className="grid gap-4 mb-6" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
          <StatCard title="Total Bidders" value={stats.total} />
          <StatCard title="Approved" value={stats.byStatus.approved} color="var(--status-approved)" />
          <StatCard title="Pending Review" value={stats.byStatus.pending_review} color="var(--status-pending)" />
          <StatCard title="Rejected" value={stats.byStatus.rejected} color="var(--status-rejected)" />
          <StatCard title="Avg Score" value={stats.avgScore !== 'NaN' ? `${stats.avgScore}/100` : '—'} sub={`Low: ${stats.byRisk.low} | Med: ${stats.byRisk.medium} | High: ${stats.byRisk.high}`} />
        </div>
      )}

      {/* Tenders Section */}
      <div>
        <div className="section-bar flex justify-between items-center mb-4" style={{ flexWrap: 'wrap', gap: '0.5rem', background: 'transparent', padding: 0, border: 'none' }}>
          <span className="font-bold uppercase" style={{ color: 'var(--navy-dark)' }}>ACTIVE TENDERS ({tenders.length})</span>
          <div className="flex items-center gap-3">
            {/* Search */}
            <div style={{ position: 'relative' }}>
              <Search size={13} style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                className="input"
                placeholder="Search Tenders..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ paddingLeft: '1.75rem', fontSize: '0.75rem', borderRadius: '4px', border: '1px solid var(--border)', width: '220px', padding: '0.4rem 0.5rem 0.4rem 1.75rem' }}
              />
            </div>
          </div>
        </div>

        {loading ? (
          <div className="py-12 text-center text-muted font-bold">Loading Tenders...</div>
        ) : tenders.length === 0 ? (
          <div className="py-12 text-center text-muted font-bold bg-white rounded-lg border border-gray-200">NO TENDERS FOUND.</div>
        ) : (
          <div className="grid gap-6" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))' }}>
            {tenders.map(t => (
              <TenderCard 
                key={t.id} 
                tender={t} 
                onClick={() => navigate(`/tenders/${encodeURIComponent(t.tenderId)}`)} 
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
