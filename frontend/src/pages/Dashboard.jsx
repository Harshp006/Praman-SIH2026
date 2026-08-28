import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, CheckCircle, AlertTriangle, XCircle, Search, LayoutDashboard, ChevronLeft, ChevronRight, BarChart2 } from 'lucide-react';
import api from '../api';
import Badge from '../components/Badge';
import Loader from '../components/Loader';

const StatCard = ({ title, value, sub, color }) => (
  <div className="card flex flex-col gap-2" style={{ padding: '1.25rem' }}>
    <div className="text-xs font-bold uppercase text-muted">{title}</div>
    <div style={{ fontSize: '2rem', fontWeight: 800, color: color || 'var(--navy-dark)', lineHeight: 1 }}>{value}</div>
    {sub && <div className="text-xs font-bold uppercase text-muted">{sub}</div>}
  </div>
);

const Dashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [bidders, setBidders] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const PAGE_SIZE = 50;

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  // Reset page when filters change
  useEffect(() => { setPage(1); }, [debouncedSearch, statusFilter]);

  const fetchStats = async () => {
    try {
      const r = await api.get('/dashboard/stats');
      setStats(r.data);
    } catch { /* ignore */ }
  };

  const fetchBidders = useCallback(async (p, q, s) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: p, pageSize: PAGE_SIZE });
      if (q) params.set('q', q);
      if (s) params.set('status', s);
      const r = await api.get(`/bidders?${params.toString()}`);
      setBidders(r.data.bidders || []);
      setTotal(r.data.total || 0);
      setTotalPages(r.data.totalPages || 1);
    } catch (err) {
      console.error('Failed to fetch bidders:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchStats(); }, []);
  useEffect(() => { fetchBidders(page, debouncedSearch, statusFilter); }, [page, debouncedSearch, statusFilter, fetchBidders]);

  return (
    <div>
      {/* Page Header */}
      <div className="mb-4">
        <div className="flex items-center gap-3">
          <LayoutDashboard size={24} style={{ color: 'var(--navy-dark)' }} />
          <h1 className="h2 m-0 uppercase">Bidder Compliance Dashboard</h1>
        </div>
        <p className="text-muted text-sm mt-1 font-semibold uppercase">Overview of all registered bidders and compliance statuses.</p>
        <hr className="page-header-rule" />
      </div>

      {/* Stats Row */}
      {stats && (
        <div className="grid gap-4 mb-6" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
          <StatCard title="Total Bidders" value={stats.total} />
          <StatCard title="Approved" value={stats.byStatus.approved} color="var(--status-approved)" />
          <StatCard title="Pending Review" value={stats.byStatus.pending_review} color="var(--status-pending)" />
          <StatCard title="Rejected" value={stats.byStatus.rejected} color="var(--status-rejected)" />
          <StatCard title="Avg Score" value={`${stats.avgScore}/100`} sub={`Low: ${stats.byRisk.low} | Med: ${stats.byRisk.medium} | High: ${stats.byRisk.high}`} />
        </div>
      )}

      {/* Table Section */}
      <div>
        <div className="section-bar flex justify-between items-center" style={{ flexWrap: 'wrap', gap: '0.5rem' }}>
          <span>BIDDERS — {total} RECORDS</span>
          <div className="flex items-center gap-3">
            {/* Status filter */}
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="input"
              style={{ width: 'auto', padding: '0.2rem 0.5rem', fontSize: '0.75rem', borderRadius: '2px', border: 'none', minWidth: '120px' }}
            >
              <option value="">ALL STATUS</option>
              <option value="approved">APPROVED</option>
              <option value="pending_review">PENDING</option>
              <option value="rejected">REJECTED</option>
            </select>
            {/* Search */}
            <div style={{ position: 'relative' }}>
              <Search size={13} style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                className="input"
                placeholder="SEARCH..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ paddingLeft: '1.75rem', fontSize: '0.75rem', borderRadius: '2px', border: 'none', width: '200px', padding: '0.25rem 0.5rem 0.25rem 1.75rem' }}
              />
            </div>
          </div>
        </div>

        <div style={{ overflowX: 'auto', border: '1px solid var(--border)', borderTop: 'none', backgroundColor: 'var(--surface)' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Company / Tender</th>
                <th>GSTIN</th>
                <th>Score</th>
                <th>Risk</th>
                <th>Status</th>
                <th>Checks</th>
                <th>Added</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="7" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontWeight: 600 }}>Loading...</td></tr>
              ) : bidders.length === 0 ? (
                <tr><td colSpan="7" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontWeight: 600 }}>NO BIDDERS FOUND.</td></tr>
              ) : bidders.map(b => (
                <tr key={b.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/bidders/${b.id}`)}>
                  <td>
                    <div className="font-bold text-sm" style={{ color: 'var(--navy-dark)' }}>{b.name}</div>
                    <div className="text-xs text-muted uppercase truncate" style={{ maxWidth: '280px' }}>{b.tenderName}</div>
                  </td>
                  <td>
                    <span className="text-sm font-bold" style={{ letterSpacing: '0.5px', fontFamily: 'monospace' }}>{b.gstin}</span>
                  </td>
                  <td>
                    <span className="font-bold text-sm" style={{ color: b.score >= 80 ? 'var(--status-approved)' : b.score >= 50 ? 'var(--status-pending)' : 'var(--status-rejected)' }}>
                      {b.score ?? '—'}/100
                    </span>
                  </td>
                  <td><Badge variant={b.risk}>{b.risk || '—'}</Badge></td>
                  <td><Badge variant={b.status}>{b.status.replace('_', ' ')}</Badge></td>
                  <td><span className="text-xs font-bold text-muted">{b._count?.checks ?? 0} checks</span></td>
                  <td><span className="text-xs text-muted font-bold">{new Date(b.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4">
            <button className="btn btn-outline text-xs" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1 || loading}>
              <ChevronLeft size={14} /> PREVIOUS
            </button>
            <span className="text-xs font-bold uppercase text-muted">
              Page {page} of {totalPages} — {total} records total
            </span>
            <button className="btn btn-outline text-xs" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages || loading}>
              NEXT <ChevronRight size={14} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
