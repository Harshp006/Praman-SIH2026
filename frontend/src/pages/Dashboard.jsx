import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, CheckCircle, AlertTriangle, XCircle, Search, ChevronRight } from 'lucide-react';
import api from '../api';
import StatCard from '../components/StatCard';
import Badge from '../components/Badge';
import Loader from '../components/Loader';

const Dashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [bidders, setBidders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchData = async () => {
    try {
      setLoading(true);
      const [statsRes, biddersRes] = await Promise.all([
        api.get('/dashboard/stats'),
        api.get('/bidders?pageSize=50')
      ]);
      setStats(statsRes.data);
      setBidders(biddersRes.data.bidders);
    } catch (err) {
      console.error("Failed to fetch dashboard data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filteredBidders = bidders.filter(b => 
    b.name.toLowerCase().includes(search.toLowerCase()) || 
    b.gstin.toLowerCase().includes(search.toLowerCase())
  );

  if (loading && !stats) {
    return <Loader center text="Loading dashboard..." />;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="h2 mb-1">Overview</h1>
          <p className="text-muted">Procurement compliance dashboard.</p>
        </div>
      </div>

      {stats && (
        <div className="grid gap-4 mb-8" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))' }}>
          <StatCard 
            title="Total Bidders" 
            value={stats.total} 
            icon={Users} 
            colorClass="bg-[var(--primary-light)] text-[var(--primary-main)]"
          />
          <StatCard 
            title="Approved" 
            value={stats.byStatus.approved} 
            icon={CheckCircle} 
            colorClass="bg-[var(--success-light)] text-[var(--success-text)]" 
          />
          <StatCard 
            title="Under Review" 
            value={stats.byStatus.under_review} 
            icon={AlertTriangle} 
            colorClass="bg-[var(--warning-light)] text-[var(--warning-text)]" 
          />
          <StatCard 
            title="Rejected" 
            value={stats.byStatus.rejected} 
            icon={XCircle} 
            colorClass="bg-[var(--danger-light)] text-[var(--danger-text)]" 
            subtitle={`${stats.hardGated} Hard Gated`}
          />
        </div>
      )}

      <div className="card">
        <div className="card-header flex justify-between items-center">
          <h2 className="h3 m-0">Recent Bidders</h2>
          <div style={{ position: 'relative', width: '250px' }}>
            <Search size={16} className="text-muted" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
            <input 
              type="text" 
              className="input" 
              placeholder="Search by Name or GSTIN..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ paddingLeft: '2rem' }}
            />
          </div>
        </div>
        
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-light)', backgroundColor: 'var(--bg-subtle)' }}>
                <th style={{ padding: '1rem', fontWeight: 600, color: 'var(--text-muted)', fontSize: '0.875rem' }}>Company</th>
                <th style={{ padding: '1rem', fontWeight: 600, color: 'var(--text-muted)', fontSize: '0.875rem' }}>GSTIN</th>
                <th style={{ padding: '1rem', fontWeight: 600, color: 'var(--text-muted)', fontSize: '0.875rem' }}>Score</th>
                <th style={{ padding: '1rem', fontWeight: 600, color: 'var(--text-muted)', fontSize: '0.875rem' }}>Risk</th>
                <th style={{ padding: '1rem', fontWeight: 600, color: 'var(--text-muted)', fontSize: '0.875rem' }}>Status</th>
                <th style={{ padding: '1rem' }}></th>
              </tr>
            </thead>
            <tbody>
              {filteredBidders.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                    No bidders found.
                  </td>
                </tr>
              ) : (
                filteredBidders.map((bidder) => (
                  <tr 
                    key={bidder.id} 
                    style={{ borderBottom: '1px solid var(--border-light)', cursor: 'pointer', transition: 'background-color 0.15s ease' }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-subtle)'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    onClick={() => navigate(`/bidders/${bidder.id}`)}
                  >
                    <td style={{ padding: '1rem' }}>
                      <div className="font-medium text-sm">{bidder.name}</div>
                      <div className="text-xs text-muted mt-1 truncate" style={{ maxWidth: '250px' }} title={bidder.tenderName}>{bidder.tenderName}</div>
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <span className="text-sm font-medium" style={{ fontFamily: 'monospace' }}>{bidder.gstin}</span>
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <div className="font-semibold" style={{ color: bidder.score >= 75 ? 'var(--success-solid)' : bidder.score >= 50 ? 'var(--warning-solid)' : 'var(--danger-solid)' }}>
                        {bidder.score}/100
                      </div>
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <Badge variant={bidder.risk}>{bidder.risk}</Badge>
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <Badge variant={bidder.status}>{bidder.status.replace('_', ' ')}</Badge>
                    </td>
                    <td style={{ padding: '1rem', textAlign: 'right' }}>
                      <ChevronRight size={18} className="text-muted" />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
