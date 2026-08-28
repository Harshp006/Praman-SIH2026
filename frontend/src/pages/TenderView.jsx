import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Search, FileText } from 'lucide-react';
import api from '../api';
import Badge from '../components/Badge';

const TenderView = () => {
  const { tenderId } = useParams();
  const navigate = useNavigate();
  const [tender, setTender] = useState(null);
  const [bidders, setBidders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const fetchTenderAndBidders = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set('status', statusFilter);
      
      const res = await api.get(`/tenders/${encodeURIComponent(tenderId)}/bidders?${params.toString()}`);
      setTender(res.data.tender);
      
      let fetchedBidders = res.data.bidders || [];
      if (search) {
        const q = search.toLowerCase();
        fetchedBidders = fetchedBidders.filter(b => 
          b.name.toLowerCase().includes(q) || b.gstin.toLowerCase().includes(q) || (b.pan && b.pan.toLowerCase().includes(q))
        );
      }
      setBidders(fetchedBidders);
    } catch (err) {
      console.error('Failed to fetch tender details:', err);
    } finally {
      setLoading(false);
    }
  }, [tenderId, statusFilter, search]);

  useEffect(() => { fetchTenderAndBidders(); }, [fetchTenderAndBidders]);

  return (
    <div>
      <div className="mb-4">
        <Link to="/" className="btn btn-outline text-xs mb-3 inline-flex items-center gap-1">
          <ChevronLeft size={14} /> BACK TO TENDERS
        </Link>
        <div className="flex items-center gap-3">
          <FileText size={24} style={{ color: 'var(--navy-dark)' }} />
          <h1 className="h2 m-0 uppercase">{tender ? tender.name : 'Loading Tender...'}</h1>
        </div>
        <p className="text-muted text-sm mt-1 font-semibold uppercase">
          Tender ID: {tenderId} {tender?.description ? `— ${tender.description}` : ''}
        </p>
        <hr className="page-header-rule" />
      </div>

      <div>
        <div className="section-bar flex justify-between items-center" style={{ flexWrap: 'wrap', gap: '0.5rem' }}>
          <span>BIDDERS FOR TENDER — {bidders.length} RECORDS</span>
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
                placeholder="SEARCH BIDDERS..."
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
                <th>Company Name</th>
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
      </div>
    </div>
  );
};

export default TenderView;
