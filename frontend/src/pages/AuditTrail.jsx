import React, { useState, useEffect, useCallback } from 'react';
import { Shield, ChevronLeft, ChevronRight, Download } from 'lucide-react';
import api from '../api';

const AuditTrail = () => {
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const PAGE_SIZE = 50;

  const fetchLogs = useCallback(async (p) => {
    setLoading(true);
    try {
      const res = await api.get(`/audit?page=${p}&pageSize=${PAGE_SIZE}`);
      setLogs(res.data.logs || []);
      setTotal(res.data.total || 0);
      setTotalPages(res.data.totalPages || 1);
    } catch (err) {
      console.error('Failed to load audit trail:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchLogs(page); }, [page, fetchLogs]);

  const actionColor = (action) => {
    if (!action) return 'var(--text-muted)';
    const a = action.toLowerCase();
    if (a.includes('approved') || a.includes('approve')) return 'var(--status-approved)';
    if (a.includes('rejected') || a.includes('reject')) return 'var(--status-rejected)';
    if (a.includes('created')) return 'var(--navy-dark)';
    return 'var(--text-muted)';
  };

  const handleExport = () => {
    const token = localStorage.getItem('praman_token');
    const url = `http://localhost:8081/api/audit/export`;
    const a = document.createElement('a');
    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.blob())
      .then(blob => {
        const blobUrl = URL.createObjectURL(blob);
        a.href = blobUrl;
        a.download = `Praman_Audit_Logs.csv`;
        a.click();
        URL.revokeObjectURL(blobUrl);
      })
      .catch(err => console.error('Export failed:', err));
  };

  return (
    <div>
      <div className="mb-4">
        <div className="flex items-center gap-3">
          <Shield size={24} style={{ color: 'var(--navy-dark)' }} />
          <h1 className="h2 m-0 uppercase" style={{ flex: 1 }}>System Audit Trail</h1>
          <button onClick={handleExport} className="btn btn-outline" style={{ gap: '0.4rem', padding: '0.4rem 0.8rem' }}>
            <Download size={14} /> EXPORT CSV
          </button>
        </div>
        <p className="text-muted text-sm mt-1 font-semibold uppercase">
          Immutable log of all compliance verifications and officer decisions.
        </p>
        <hr className="page-header-rule" />
      </div>

      <div>
        <div className="section-bar flex justify-between items-center">
          <span>AUDIT LOGS — {total} TOTAL ENTRIES</span>
          <span className="text-xs" style={{ color: '#A0AAB5' }}>
            Page {page} of {totalPages}
          </span>
        </div>

        <div style={{ overflowX: 'auto', border: '1px solid var(--border)', borderTop: 'none', backgroundColor: 'var(--surface)' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: '160px' }}>Timestamp</th>
                <th style={{ width: '100px' }}>Actor</th>
                <th>Bidder</th>
                <th>Action / Detail</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="4" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)', fontWeight: 600 }}>Loading...</td></tr>
              ) : logs.length === 0 ? (
                <tr><td colSpan="4" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)', fontWeight: 600 }}>NO AUDIT LOGS FOUND.</td></tr>
              ) : logs.map((log) => (
                <tr key={log.id}>
                  <td style={{ fontSize: '0.75rem', fontWeight: 600 }}>
                    {new Date(log.timestamp).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td>
                    <span className="font-bold text-xs uppercase" style={{ color: 'var(--navy-dark)' }}>
                      {log.actor || '—'}
                    </span>
                  </td>
                  <td>
                    {log.bidder ? (
                      <div>
                        <div className="font-bold text-sm" style={{ color: 'var(--navy-dark)' }}>{log.bidder.name}</div>
                        <div className="text-xs text-muted font-bold uppercase">{log.bidder.gstin}</div>
                      </div>
                    ) : <span className="text-muted text-xs">—</span>}
                  </td>
                  <td>
                    <span className="text-sm font-semibold" style={{ color: actionColor(log.action) }}>
                      {log.action}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4" style={{ padding: '0 0.5rem' }}>
            <button
              className="btn btn-outline text-xs"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1 || loading}
            >
              <ChevronLeft size={14} /> PREVIOUS
            </button>
            <span className="text-xs font-bold uppercase text-muted">
              Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total}
            </span>
            <button
              className="btn btn-outline text-xs"
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages || loading}
            >
              NEXT <ChevronRight size={14} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AuditTrail;
