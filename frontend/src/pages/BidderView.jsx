import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, RefreshCw, FileText, Bot, Check, X, Flag, AlertOctagon } from 'lucide-react';
import api from '../api';
import Badge from '../components/Badge';
import Loader from '../components/Loader';

const BidderView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [bidder, setBidder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [recommending, setRecommending] = useState(false);
  const [decisionNote, setDecisionNote] = useState('');
  const [submittingDecision, setSubmittingDecision] = useState(false);

  const fetchBidder = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/bidders/${id}`);
      setBidder(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBidder();
  }, [id]);

  const handleVerify = async () => {
    try {
      setVerifying(true);
      const res = await api.post(`/bidders/${id}/verify`);
      setBidder(prev => ({ ...prev, ...res.data, checks: res.data.checks }));
    } catch (err) {
      console.error(err);
    } finally {
      setVerifying(false);
    }
  };

  const handleRecommend = async () => {
    try {
      setRecommending(true);
      const res = await api.post(`/bidders/${id}/recommend`);
      setBidder(prev => ({ ...prev, recommendation: res.data.recommendation }));
    } catch (err) {
      console.error(err);
    } finally {
      setRecommending(false);
    }
  };

  const submitDecision = async (action) => {
    try {
      setSubmittingDecision(true);
      const res = await api.patch(`/bidders/${id}/decision`, { action, note: decisionNote });
      setBidder(prev => ({ ...prev, status: res.data.status }));
      setDecisionNote('');
    } catch (err) {
      console.error(err);
    } finally {
      setSubmittingDecision(false);
    }
  };

  if (loading || !bidder) {
    return <Loader center text="Loading bidder profile..." />;
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/" className="btn btn-outline" style={{ padding: '0.5rem' }}>
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="h2 m-0 flex items-center gap-3">
              {bidder.name}
              {bidder.hardGated && <Badge variant="danger" size="md"><AlertOctagon size={14} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'text-bottom' }} /> HARD GATED</Badge>}
            </h1>
            <p className="text-muted text-sm mt-1 font-medium" style={{ fontFamily: 'monospace' }}>
              GSTIN: {bidder.gstin} | PAN: {bidder.pan} | Udyam: {bidder.udyam}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-xs text-muted mb-1 uppercase font-semibold tracking-wide">Overall Score</div>
            <div className="flex items-center gap-3">
              <span className="h2 m-0" style={{ color: bidder.score >= 75 ? 'var(--success-solid)' : bidder.score >= 50 ? 'var(--warning-solid)' : 'var(--danger-solid)' }}>
                {bidder.score}/100
              </span>
              <Badge variant={bidder.risk}>{bidder.risk} Risk</Badge>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6" style={{ gridTemplateColumns: '2fr 1fr' }}>
        
        {/* Left Column: Checks & Details */}
        <div className="flex flex-col gap-6">
          <div className="card">
            <div className="card-header flex justify-between items-center">
              <h2 className="h3 m-0 flex items-center gap-2">
                <FileText size={20} className="text-muted" />
                Compliance Checks
              </h2>
              <button 
                onClick={handleVerify} 
                disabled={verifying}
                className="btn btn-outline text-sm"
              >
                {verifying ? <span className="spinner" style={{ width: '16px', height: '16px', borderWidth: '2px' }}></span> : <RefreshCw size={16} />}
                {verifying ? 'Verifying...' : 'Run Verification'}
              </button>
            </div>
            <div className="card-body" style={{ padding: 0 }}>
              {bidder.checks.map((check, idx) => (
                <div key={check.id} className="flex gap-4 p-4" style={{ 
                  borderBottom: idx !== bidder.checks.length - 1 ? '1px solid var(--border-light)' : 'none',
                  backgroundColor: check.state === 'fail' ? 'var(--danger-light)' : 'transparent'
                }}>
                  <div style={{ marginTop: '0.25rem' }}>
                    <Badge variant={check.state} size="sm">{check.state}</Badge>
                  </div>
                  <div>
                    <h4 className="font-medium text-sm m-0 mb-1">{check.label}</h4>
                    <p className="text-sm text-muted m-0 leading-relaxed">{check.note || 'No notes available.'}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: AI & Decisions */}
        <div className="flex flex-col gap-6">
          
          <div className="card">
            <div className="card-header flex justify-between items-center bg-[var(--primary-light)] border-b-[var(--primary-main)]/20">
              <h2 className="h3 m-0 flex items-center gap-2" style={{ color: 'var(--primary-main)' }}>
                <Bot size={20} />
                AI Recommendation
              </h2>
            </div>
            <div className="card-body bg-[var(--bg-page)]">
              {bidder.recommendation ? (
                <div className="text-sm leading-relaxed" style={{ whiteSpace: 'pre-line' }}>
                  {bidder.recommendation}
                </div>
              ) : (
                <div className="text-center py-8 text-muted">
                  <Bot size={32} className="mx-auto mb-3 opacity-50" />
                  <p className="text-sm mb-4">No AI recommendation generated yet.</p>
                </div>
              )}
              
              <button 
                onClick={handleRecommend}
                disabled={recommending}
                className="btn btn-primary w-full mt-4 justify-center"
              >
                {recommending ? <span className="spinner" style={{ width: '16px', height: '16px', borderWidth: '2px' }}></span> : <Bot size={16} />}
                {recommending ? 'Generating...' : bidder.recommendation ? 'Regenerate Recommendation' : 'Generate Recommendation'}
              </button>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h2 className="h3 m-0">Officer Decision</h2>
            </div>
            <div className="card-body">
              <div className="mb-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium">Current Status:</span>
                  <Badge variant={bidder.status}>{bidder.status.replace('_', ' ')}</Badge>
                </div>
              </div>
              
              <div className="mb-4">
                <label className="text-sm font-medium mb-1 block">Decision Note (Optional)</label>
                <textarea 
                  className="input" 
                  rows="3" 
                  placeholder="Add justification or conditions..."
                  value={decisionNote}
                  onChange={(e) => setDecisionNote(e.target.value)}
                  disabled={submittingDecision}
                ></textarea>
              </div>
              
              <div className="grid grid-cols-2 gap-2" style={{ gridTemplateColumns: '1fr 1fr' }}>
                <button 
                  onClick={() => submitDecision('approve')}
                  disabled={submittingDecision || bidder.hardGated}
                  className="btn btn-success flex-1"
                >
                  <Check size={16} /> Approve
                </button>
                <button 
                  onClick={() => submitDecision('reject')}
                  disabled={submittingDecision}
                  className="btn btn-danger flex-1"
                >
                  <X size={16} /> Reject
                </button>
                <button 
                  onClick={() => submitDecision('flag')}
                  disabled={submittingDecision}
                  className="btn btn-warning"
                  style={{ gridColumn: '1 / -1' }}
                >
                  <Flag size={16} /> Flag for Review
                </button>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default BidderView;
