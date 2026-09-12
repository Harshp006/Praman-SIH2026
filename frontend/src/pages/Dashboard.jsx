import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Search, FileText, ArrowRight, Activity,
  CheckCircle, Clock, AlertTriangle, TrendingUp, Shield, Download,
  Users, Link as LinkIcon
} from 'lucide-react';
import api from '../api';

// ─── Mini stat card ──────────────────────────────────────────────────────────

const StatCard = ({ title, value, sub, color, icon: Icon }) => (
  <div className="stat-card flex flex-col gap-2">
    <div className="flex items-center justify-between">
      <div className="text-xs font-bold uppercase text-muted">{title}</div>
      {Icon && <Icon size={16} style={{ color: color || 'var(--navy-dark)', opacity: 0.6 }} />}
    </div>
    <div style={{ fontSize: '2rem', fontWeight: 800, color: color || 'var(--navy-dark)', lineHeight: 1 }}>{value}</div>
    {sub && <div className="text-xs font-bold uppercase text-muted">{sub}</div>}
  </div>
);

// ─── Horizontal bar chart ─────────────────────────────────────────────────────

const BarChart = ({ data, title }) => {
  const max = Math.max(...Object.values(data), 1);
  const colors = {
    'pass':    '#16A34A', 'warn': '#D97706', 'fail': '#DC2626',
    'missing': '#94A3B8', 'na':   '#CBD5E1',
    '0–24':    '#DC2626', '25–49': '#D97706', '50–79': '#3B82F6', '80–100': '#16A34A',
  };
  return (
    <div>
      {title && <div className="text-xs font-bold uppercase text-muted mb-3">{title}</div>}
      <div className="flex flex-col gap-2">
        {Object.entries(data).map(([label, val]) => (
          <div key={label} className="flex items-center gap-3">
            <div style={{ width: 70, fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textAlign: 'right', flexShrink: 0 }}>
              {label.toUpperCase()}
            </div>
            <div style={{ flex: 1, height: 10, backgroundColor: 'var(--blue-light)', borderRadius: 5, overflow: 'hidden' }}>
              <div style={{
                width: `${(val / max) * 100}%`, height: '100%',
                backgroundColor: colors[label] || 'var(--navy-dark)',
                borderRadius: 5, transition: 'width 0.6s ease'
              }} />
            </div>
            <div style={{ width: 28, fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-primary)', flexShrink: 0 }}>
              {val}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── Risk doughnut (CSS-only) ─────────────────────────────────────────────────

const RiskPie = ({ low = 0, medium = 0, high = 0 }) => {
  const total = low + medium + high || 1;
  const pct = (v) => Math.round((v / total) * 100);
  return (
    <div>
      <div className="text-xs font-bold uppercase text-muted mb-3">Risk Distribution</div>
      <div className="flex flex-col gap-2">
        {[
          { label: 'Low Risk',    val: low,    color: '#16A34A', bg: '#DCFCE7' },
          { label: 'Medium Risk', val: medium, color: '#D97706', bg: '#FEF3C7' },
          { label: 'High Risk',   val: high,   color: '#DC2626', bg: '#FEE2E2' },
        ].map(({ label, val, color, bg }) => (
          <div key={label} className="flex items-center gap-3">
            <div style={{ 
              flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              background: bg, borderRadius: 6, padding: '6px 10px'
            }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color }}>{label}</span>
              <span style={{ fontSize: '0.85rem', fontWeight: 800, color }}>{val} ({pct(val)}%)</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── Tender card ─────────────────────────────────────────────────────────────

const TenderCard = ({ tender, onClick }) => {
  const pct = tender.totalBidders > 0
    ? Math.round((tender.approved / tender.totalBidders) * 100)
    : 0;

  return (
    <div
      className="card"
      onClick={onClick}
      style={{ padding: '1.25rem', cursor: 'pointer', transition: 'transform 0.18s, box-shadow 0.18s', display: 'flex', flexDirection: 'column', height: '100%' }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(37,99,235,0.15)'; }}
      onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = ''; }}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2" style={{ color: 'var(--navy-dark)' }}>
          <FileText size={18} />
          <span style={{ fontSize: '0.75rem', fontWeight: 800, fontFamily: 'monospace', color: 'var(--navy-dark)' }}>{tender.tenderId}</span>
        </div>
        <div style={{ background: 'var(--blue-pale)', borderRadius: 20, width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <ArrowRight size={14} style={{ color: 'var(--navy-dark)' }} />
        </div>
      </div>

      <h3 style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--navy-deep)', lineHeight: 1.35, marginBottom: '0.5rem' }}>
        {tender.name}
      </h3>
      <p className="text-xs text-muted mb-4 flex-1 line-clamp-2">
        {tender.description || 'No description available.'}
      </p>

      {/* Progress bar */}
      <div className="mb-3">
        <div className="flex justify-between text-xs text-muted font-bold mb-1">
          <span>Approval Progress</span>
          <span>{pct}%</span>
        </div>
        <div style={{ height: 6, backgroundColor: 'var(--blue-light)', borderRadius: 3 }}>
          <div style={{ width: `${pct}%`, height: '100%', background: 'var(--navy-dark)', borderRadius: 3, transition: 'width 0.5s' }} />
        </div>
      </div>

      <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(4, 1fr)', borderTop: '1px solid var(--border)', paddingTop: '0.75rem' }}>
        {[
          { label: 'Total', val: tender.totalBidders, color: 'var(--text-primary)' },
          { label: 'Pending', val: tender.pending_review, color: 'var(--status-pending)' },
          { label: 'Approved', val: tender.approved, color: 'var(--status-approved)' },
          { label: 'Rejected', val: tender.rejected, color: 'var(--status-rejected)' },
        ].map(({ label, val, color }) => (
          <div key={label} className="text-center">
            <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 2 }}>{label}</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 800, color }}>{val}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── Main Dashboard ──────────────────────────────────────────────────────────

const Dashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [tenders, setTenders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  const fetchStats = async () => {
    try { const r = await api.get('/dashboard/stats'); setStats(r.data); } catch { /* ignore */ }
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
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchStats(); }, []);
  useEffect(() => { fetchTenders(debouncedSearch); }, [debouncedSearch, fetchTenders]);

  const exportChecks = () => {
    const token = localStorage.getItem('praman_token');
    const baseUrl = api.defaults.baseURL || 'http://localhost:4000/api';
    fetch(`${baseUrl}/dashboard/checks/export`, {
      headers: { Authorization: `Bearer ${token}` }
    }).then(r => r.blob()).then(blob => {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'Praman_Compliance_Checks.csv';
      a.click();
    });
  };

  return (
    <div>
      {/* Page Header */}
      <div className="mb-5">
        <div className="flex items-center justify-between" style={{ flexWrap: 'wrap', gap: '0.5rem' }}>
          <div className="flex items-center gap-3">
            <LayoutDashboard size={22} style={{ color: 'var(--navy-dark)' }} />
            <h1 className="h2 m-0 uppercase">Compliance Dashboard</h1>
          </div>
          <button onClick={exportChecks} className="btn btn-outline" style={{ gap: '0.4rem' }}>
            <Download size={13} /> Export Checks CSV
          </button>
        </div>
        <p className="text-muted text-xs mt-1 font-bold uppercase" style={{ letterSpacing: '0.04em' }}>
          GeM Bid Compliance Verification — All Tenders Overview
        </p>
        <hr className="page-header-rule" />
      </div>

      {/* Stats Grid */}
      {stats && (
        <>
          <div className="grid gap-3 mb-5" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))' }}>
            <StatCard title="Total Bidders" value={stats.total} icon={Users} />
            <StatCard title="Approved" value={stats.byStatus.approved} color="var(--status-approved)" icon={CheckCircle} />
            <StatCard title="Pending Review" value={stats.byStatus.pending_review} color="var(--status-pending)" icon={Clock} />
            <StatCard title="Rejected" value={stats.byStatus.rejected} color="var(--status-rejected)" icon={AlertTriangle} />
            <StatCard
              title="Avg Score"
              value={stats.avgScore ? `${stats.avgScore}` : '—'}
              sub="/100 points"
              icon={TrendingUp}
            />
            <StatCard title="On Blockchain" value={stats.blockchainRegistered ?? 0} color="#8B5CF6" icon={Shield} />
          </div>

          {/* Analytics Row */}
          <div className="grid gap-4 mb-6" style={{ gridTemplateColumns: '1fr 1fr' }}>
            <div className="card card-body">
              <BarChart data={stats.scoreDistribution} title="Score Distribution" />
            </div>
            <div className="card card-body">
              <RiskPie low={stats.byRisk.low} medium={stats.byRisk.medium} high={stats.byRisk.high} />
            </div>
          </div>

          {/* Check State Distribution */}
          <div className="card card-body mb-5">
            <BarChart data={stats.checkStateDistribution} title="Compliance Check Results (All Checks)" />
          </div>
        </>
      )}

      {/* Tenders Section */}
      <div>
        <div className="flex items-center justify-between mb-4" style={{ flexWrap: 'wrap', gap: '0.5rem' }}>
          <span className="font-bold uppercase" style={{ color: 'var(--navy-deep)', fontSize: '0.9rem' }}>
            Active Tenders ({tenders.length})
          </span>
          <div style={{ position: 'relative' }}>
            <Search size={13} style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              className="input"
              placeholder="Search Tenders..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ paddingLeft: '1.75rem', fontSize: '0.75rem', width: '220px', padding: '0.4rem 0.5rem 0.4rem 1.75rem' }}
            />
          </div>
        </div>

        {loading ? (
          <div className="py-12 text-center text-muted font-bold flex flex-col items-center gap-3">
            <div className="spinner" style={{ width: 36, height: 36, borderWidth: 3 }}></div>
            Loading Tenders…
          </div>
        ) : tenders.length === 0 ? (
          <div className="py-12 text-center text-muted font-bold" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}>
            NO TENDERS FOUND
          </div>
        ) : (
          <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(310px, 1fr))' }}>
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
