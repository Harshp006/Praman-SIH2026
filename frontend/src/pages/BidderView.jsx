import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft, RefreshCw, FileText, Check, X, Flag,
  Building2, Brain, Edit, Trash2, Download, Eye, Upload, Plus,
  Wifi, WifiOff, AlertCircle, Clock, CheckCircle2,
  Shield, ShieldCheck, ShieldAlert
} from 'lucide-react';
import api from '../api';
import Badge from '../components/Badge';

// ─── Ollama live status ───────────────────────────────────────────────────────

const OllamaStatus = () => {
  const [status, setStatus] = useState(null);
  const [model, setModel] = useState('');

  useEffect(() => {
    api.get('/health')
      .then(r => { setStatus(r.data.ollamaOk); setModel(r.data.ollamaModel || ''); })
      .catch(() => setStatus(false));
  }, []);

  if (status === null) return null;

  return (
    <div className="flex items-center gap-2 text-xs font-bold uppercase"
      style={{
        color: status ? 'var(--status-approved)' : 'var(--status-rejected)',
        border: `1px solid ${status ? 'var(--status-approved)' : 'var(--status-rejected)'}`,
        padding: '3px 10px', borderRadius: '2px'
      }}>
      {status ? <Wifi size={12} /> : <WifiOff size={12} />}
      {status ? `Ollama Live — ${model}` : 'Ollama Offline (Rule Fallback)'}
    </div>
  );
};

// ─── Check state icon ─────────────────────────────────────────────────────────

const CheckIcon = ({ state }) => {
  const map = {
    pass: { bg: 'var(--status-approved)', icon: <Check size={13} /> },
    fail: { bg: 'var(--status-rejected)', icon: <X size={13} /> },
    warn: { bg: 'var(--status-pending)', icon: <Flag size={11} /> },
    missing: { bg: '#9CA3AF', icon: <span style={{ fontSize: '10px', fontWeight: 700 }}>?</span> },
    na: { bg: '#CBD5E1', icon: <span style={{ fontSize: '10px', fontWeight: 700 }}>N/A</span> },
  };
  const m = map[state] || map.missing;
  return (
    <div style={{
      width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center',
      backgroundColor: m.bg, color: 'white', borderRadius: '2px', flexShrink: 0,
    }}>
      {m.icon}
    </div>
  );
};

// ─── Scoring formula box ──────────────────────────────────────────────────────

const ScoringFormula = () => (
  <div className="callout mb-4" style={{ borderLeftColor: 'var(--gold)', backgroundColor: '#FDFCF6', fontSize: '0.75rem' }}>
    <div className="font-bold uppercase mb-2" style={{ color: 'var(--navy-dark)' }}>Scoring Methodology</div>
    <div className="font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
      Score = Σ(check_weight × points) / Σ(applied weights) × 100
    </div>
    <div className="text-muted leading-relaxed">
      <strong>PASS</strong> = full weight &nbsp;|&nbsp; <strong>WARN</strong> = 50% weight &nbsp;|&nbsp; <strong>FAIL / MISSING</strong> = 0 points<br />
      <strong>Weights:</strong> Blacklisting 20 | GST 15 | PAN 15 | Tender 15 | Udyam 10 | Make-in-India 10 | EPFO 10 | DigiLocker 10 | MCA 10 | NSIC 5<br />
      <strong>Risk Tiers:</strong> ≥80 = Low Risk &nbsp;|&nbsp; 50–79 = Medium Risk &nbsp;|&nbsp; &lt;50 = High Risk
    </div>
  </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────

const BidderView = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [bidder, setBidder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [recommending, setRecommending] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [decisionNote, setDecisionNote] = useState('');
  const [actionError, setActionError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Blockchain States
  const [bcRegistering, setBcRegistering] = useState(false);
  const [bcVerifying,   setBcVerifying]   = useState(false);
  const [bcTampering,   setBcTampering]   = useState(false);
  const [bcResult,      setBcResult]      = useState(null);

  const fetchBidder = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.get(`/bidders/${id}`);
      setBidder(r.data);
    } catch (err) {
      setActionError(err.response?.data?.error || 'Failed to load bidder.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchBidder(); }, [fetchBidder]);

  const flash = (msg) => { setSuccessMsg(msg); setTimeout(() => setSuccessMsg(''), 4000); };

  // Run Verification (now includes AI recommendation generation automatically)
  const handleVerify = async () => {
    setActionError('');
    setVerifying(true);
    try {
      const r = await api.post(`/bidders/${id}/verify`);
      setBidder(r.data);
      flash('Verification and AI recommendation completed successfully.');
    } catch (err) {
      setActionError(err.response?.data?.error || 'Verification failed.');
    } finally {
      setVerifying(false);
    }
  };

  // Generate Recommendation
  const handleRecommend = async () => {
    setActionError('');
    setRecommending(true);
    try {
      const r = await api.post(`/bidders/${id}/recommend`);
      setBidder(prev => ({ ...prev, recommendation: r.data.recommendation }));
      flash('AI recommendation generated successfully.');
    } catch (err) {
      setActionError(err.response?.data?.error || 'Recommendation generation failed.');
    } finally {
      setRecommending(false);
    }
  };

  // Approve / Reject / Flag / Overturn
  const submitDecision = async (action) => {
    if (action !== 'overturn' && !decisionNote.trim()) {
      setActionError('A decision note / justification is required.');
      return;
    }
    setActionError('');
    setSubmitting(true);
    try {
      const r = await api.post(`/bidders/${id}/decision`, { action, note: decisionNote });
      setBidder(prev => ({ ...prev, status: r.data.status }));
      setDecisionNote('');
      // Refresh audit logs
      await fetchBidder();

      let actionLabel = action;
      if (action === 'approve') actionLabel = 'approved';
      if (action === 'reject') actionLabel = 'rejected';
      if (action === 'flag_review') actionLabel = 'flagged for review';
      if (action === 'overturn') actionLabel = 'overturned';

      flash(`Bidder decision '${actionLabel}' submitted successfully.`);
    } catch (err) {
      setActionError(err.response?.data?.error || 'Decision submission failed. Please log out and log back in.');
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Blockchain Functions ─────────────────────────────────────────────────────

  const handleRegisterBlockchain = async () => {
    setActionError('');
    setBcRegistering(true);
    try {
      await api.post(`/blockchain/record/${id}`);
      flash('Verification record successfully registered on the blockchain.');
      await fetchBidder();
    } catch (err) {
      setActionError(err.response?.data?.error || 'Blockchain registration failed.');
    } finally {
      setBcRegistering(false);
    }
  };

  const handleVerifyIntegrity = async () => {
    setActionError('');
    setBcResult(null);
    setBcVerifying(true);
    try {
      const r = await api.get(`/blockchain/verify/${id}`);
      setBcResult(r.data);
      if (r.data.verified) {
        flash('Blockchain integrity verified: Record is untampered.');
      }
    } catch (err) {
      setActionError(err.response?.data?.error || 'Blockchain verification failed.');
    } finally {
      setBcVerifying(false);
    }
  };

  const handleTamperDemo = async () => {
    if (!window.confirm("This will maliciously alter the database score to simulate tampering. Proceed?")) return;
    setActionError('');
    setBcTampering(true);
    try {
      await api.post(`/blockchain/tamper/${id}`);
      flash('Demo: Record tampered. Now click "Verify Integrity" to detect it.');
      setBcResult(null);
      await fetchBidder();
    } catch (err) {
      setActionError(err.response?.data?.error || 'Tamper demo failed.');
    } finally {
      setBcTampering(false);
    }
  };

  // Delete
  const handleDelete = async () => {
    setDeleting(true);
    try {
      await api.delete(`/bidders/${id}`);
      navigate('/');
    } catch (err) {
      setActionError(err.response?.data?.error || 'Delete failed.');
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  // Download PDF
  const downloadPDF = async () => {
    setActionError('');
    try {
      const res = await api.get(`/bidders/${id}/report`, { responseType: 'blob' });
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const blobUrl = URL.createObjectURL(blob);
      const safeName = (bidder?.name || id).replace(/[^a-zA-Z0-9]/g, '_');
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `Praman_Report_${safeName}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.error('PDF generation error:', err);
      setActionError(err.response?.data?.error || err.message || 'PDF generation failed. Please try again.');
    }
  };

  // View Single Document PDF in new browser tab
  const handleViewDoc = (docId) => {
    const token = localStorage.getItem('praman_token');
    const url = `${api.defaults.baseURL}/bidders/${id}/documents/${docId}/view`;
    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then(res => {
        if (!res.ok) throw new Error('Document view failed');
        return res.blob();
      })
      .then(blob => {
        const blobUrl = URL.createObjectURL(blob);
        window.open(blobUrl, '_blank');
      })
      .catch(() => {
        setActionError('Failed to view document PDF.');
      });
  };

  // Download Single Document PDF file
  const handleDownloadDoc = (docId, fileName) => {
    const token = localStorage.getItem('praman_token');
    const url = `${api.defaults.baseURL}/bidders/${id}/documents/${docId}/download`;
    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then(res => {
        if (!res.ok) throw new Error('Document download failed');
        return res.blob();
      })
      .then(blob => {
        const blobUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = fileName || 'Document.pdf';
        a.click();
        URL.revokeObjectURL(blobUrl);
      })
      .catch(() => {
        setActionError('Failed to download document PDF.');
      });
  };

  // Upload Additional Document
  const uploadDocInputRef = React.useRef(null);
  const [uploadingDoc, setUploadingDoc] = useState(false);

  const handleUploadNewDoc = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingDoc(true);
    setActionError('');
    setSuccessMsg('');

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', file.name.split('.')[0].replace(/[^a-zA-Z0-9]/g, ' '));

      await api.post(`/bidders/${id}/documents`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setSuccessMsg(`Document '${file.name}' uploaded successfully.`);
      await fetchBidder();
    } catch (err) {
      setActionError(err.response?.data?.error || 'Document upload failed.');
    } finally {
      setUploadingDoc(false);
      if (uploadDocInputRef.current) uploadDocInputRef.current.value = '';
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', flexDirection: 'column', gap: '1rem' }}>
        <div className="spinner" style={{ width: 40, height: 40, borderWidth: 4 }}></div>
        <div className="font-bold uppercase text-muted text-sm">Loading Bidder Profile…</div>
      </div>
    );
  }

  if (!bidder) {
    return (
      <div className="callout" style={{ borderLeftColor: 'var(--status-rejected)', backgroundColor: '#FDF2F2', margin: '2rem 0' }}>
        <AlertCircle size={18} style={{ color: 'var(--status-rejected)' }} />
        <span className="font-bold text-sm">Bidder not found.</span>
      </div>
    );
  }

  const isVerified = bidder.checks && bidder.checks.length > 0;
  const hasRec = !!bidder.recommendation;

  return (
    <div>
      {/* Page Header */}
      <div className="mb-4">
        <div className="flex items-center gap-3" style={{ flexWrap: 'wrap' }}>
          <Link to="/" className="btn btn-outline" style={{ padding: '0.3rem 0.6rem' }}>
            <ArrowLeft size={15} /> BACK
          </Link>
          <Building2 size={22} style={{ color: 'var(--navy-dark)' }} />
          <h1 className="h2 m-0 uppercase" style={{ flex: 1 }}>{bidder.name}</h1>
          <OllamaStatus />
          <Link to={`/bidders/${id}/edit`} className="btn btn-outline" style={{ gap: '0.4rem' }}>
            <Edit size={13} /> EDIT
          </Link>
          <button onClick={downloadPDF} className="btn btn-outline" style={{ gap: '0.4rem' }}>
            <Download size={13} /> PDF REPORT
          </button>
          <button
            className="btn btn-outline"
            style={{ color: 'var(--status-rejected)', borderColor: 'var(--status-rejected)' }}
            onClick={() => setConfirmDelete(true)}
          >
            <Trash2 size={13} /> DELETE
          </button>
        </div>
        <p className="text-muted text-sm mt-2 font-bold tracking-wide" style={{ fontFamily: 'monospace' }}>
          GSTIN: {bidder.gstin} &nbsp;|&nbsp; PAN: {bidder.pan} &nbsp;|&nbsp; UDYAM: {bidder.udyam}
        </p>
        <hr className="page-header-rule" />
      </div>

      {/* Alerts */}
      {successMsg && (
        <div className="callout mb-4 flex items-center gap-3" style={{ borderLeftColor: 'var(--status-approved)', backgroundColor: '#F0FFF4' }}>
          <CheckCircle2 size={16} style={{ color: 'var(--status-approved)' }} />
          <span className="font-bold text-sm" style={{ color: 'var(--status-approved)' }}>{successMsg}</span>
        </div>
      )}
      {actionError && (
        <div className="callout mb-4 flex items-center gap-3" style={{ borderLeftColor: 'var(--status-rejected)', backgroundColor: '#FDF2F2' }}>
          <AlertCircle size={16} style={{ color: 'var(--status-rejected)' }} />
          <span className="font-bold text-sm" style={{ color: 'var(--status-rejected)' }}>{actionError}</span>
        </div>
      )}

      {/* Delete Confirm */}
      {confirmDelete && (
        <div className="callout mb-4 flex items-center gap-4" style={{ borderLeftColor: 'var(--status-rejected)', backgroundColor: '#FDF2F2' }}>
          <span className="flex-1 text-sm font-bold" style={{ color: 'var(--status-rejected)' }}>
            ⚠ Permanently delete <strong>{bidder.name}</strong>? This cannot be undone.
          </span>
          <button className="btn btn-outline text-xs" onClick={() => setConfirmDelete(false)}>CANCEL</button>
          <button className="btn text-xs" style={{ backgroundColor: 'var(--status-rejected)', color: 'white' }}
            onClick={handleDelete} disabled={deleting}>
            {deleting ? 'DELETING…' : 'YES, DELETE'}
          </button>
        </div>
      )}

      <div className="grid gap-6" style={{ gridTemplateColumns: '2fr 1fr' }}>

        {/* ── LEFT COLUMN ────────────────────────────────────── */}
        <div className="flex flex-col gap-6">

          {/* Verification Section */}
          <div>
            <div className="section-bar flex justify-between items-center">
              <span>COMPLIANCE VERIFICATION — {bidder.checks?.length || 0} CHECKS</span>
              <button
                onClick={handleVerify}
                disabled={verifying}
                className="btn btn-outline-white text-xs"
                style={{ padding: '0.25rem 0.6rem', gap: '0.4rem' }}
              >
                {verifying
                  ? <><span className="spinner" style={{ width: 12, height: 12, borderWidth: 2 }}></span> RUNNING VERIFICATION…</>
                  : <><RefreshCw size={12} /> RUN VERIFICATION</>
                }
              </button>
            </div>

            {!isVerified && !verifying && (
              <div className="p-6 text-center" style={{ border: '1px solid var(--border)', borderTop: 'none', backgroundColor: 'var(--surface)' }}>
                <Clock size={32} style={{ color: 'var(--text-muted)', margin: '0 auto 0.75rem' }} />
                <div className="font-bold uppercase text-sm text-muted mb-1">Verification Not Run Yet</div>
                <div className="text-xs text-muted">Click "RUN VERIFICATION" above to perform all 10 compliance checks via live and simulated portal connectors.</div>
              </div>
            )}

            {verifying && (
              <div className="p-6 text-center" style={{ border: '1px solid var(--border)', borderTop: 'none', backgroundColor: 'var(--surface)' }}>
                <div className="spinner" style={{ width: 40, height: 40, borderWidth: 4, margin: '0 auto 1rem', borderColor: '#8B5CF6', borderTopColor: 'transparent' }}></div>
                <div className="font-bold uppercase text-sm" style={{ color: '#8B5CF6' }}>Running Verification Pipeline & AI Analysis…</div>
                <div className="text-xs text-muted mt-1">OCR extraction → Portal connectors → Score calculation → Ollama Recommendation. Please wait.</div>
              </div>
            )}

            {isVerified && !verifying && (
              <div style={{ border: '1px solid var(--border)', borderTop: 'none', backgroundColor: 'var(--surface)', borderRadius: '0 0 var(--radius) var(--radius)' }}>
                {bidder.checks.map((check, idx) => {
                  // Map each check label to its source portal
                  const portalMap = {
                    'GST registration & return filing': 'GSTN Portal',
                    'PAN & Income Tax compliance': 'IT / PAN Portal',
                    'Udyam / MSME registration': 'Udyam Portal',
                    'Blacklisting / debarment': 'CVC Portal',
                    'Tender-specific eligibility clause': 'GeM Portal',
                    'MCA21 company status': 'MCA21 Portal',
                    'EPFO / ESIC compliance': 'EPFO / ESIC',
                    'Make in India / local content': 'DPIIT / MII',
                    'Startup India / NSIC / OEM authorization': 'Startup India',
                    'DigiLocker document verification': 'DigiLocker',
                    'BIS / DPIIT certification': 'BIS / DPIIT',
                  };
                  const portal = portalMap[check.label] || 'Portal';
                  const rowBg = check.state === 'fail' ? '#FFF5F5' : check.state === 'warn' ? '#FFFBEB' : 'transparent';

                  return (
                    <div key={check.id} className="flex gap-3"
                      style={{
                        padding: '0.875rem 1rem',
                        borderBottom: idx !== bidder.checks.length - 1 ? '1px solid var(--border)' : 'none',
                        backgroundColor: rowBg,
                        borderLeft: `3px solid ${
                          check.state === 'pass' ? 'var(--status-approved)' :
                          check.state === 'fail' ? 'var(--status-rejected)' :
                          check.state === 'warn' ? 'var(--status-pending)' : '#CBD5E1'
                        }`,
                      }}>
                      <CheckIcon state={check.state} />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1" style={{ flexWrap: 'wrap' }}>
                          <span className="font-bold text-sm uppercase" style={{ color: 'var(--navy-deep)' }}>{check.label}</span>
                          <span className="badge-portal">{portal}</span>
                          <span style={{
                            fontSize: '9px', fontWeight: 700, padding: '1px 6px', borderRadius: '999px',
                            background: check.live ? '#DCFCE7' : '#F1F5F9',
                            color: check.live ? '#16A34A' : '#64748B',
                            border: `1px solid ${check.live ? '#86EFAC' : '#CBD5E1'}`
                          }}>
                            {check.live ? '● LIVE API' : '○ SIMULATED'}
                          </span>
                          <span className="text-xs text-muted font-bold">Wt: {check.weight}pts</span>
                        </div>
                        <p className="text-sm text-muted m-0 leading-relaxed">{check.note}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Documents Section */}
          <div style={{
            border: '1px solid var(--border)',
            borderRadius: '2px',
            backgroundColor: 'var(--surface)',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            overflow: 'hidden'
          }}>
            {/* Header */}
            <div style={{
              backgroundColor: 'var(--navy-dark)',
              color: 'white',
              padding: '1.25rem 1.5rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '1rem'
            }}>
              <div>
                <div style={{
                  fontSize: '1rem',
                  fontWeight: 700,
                  letterSpacing: '0.5px',
                  textTransform: 'uppercase'
                }}>
                  UPLOADED DOCUMENTS — {bidder.documents?.length || 0} FILES
                </div>
                <div style={{
                  fontSize: '0.8rem',
                  color: '#C7D0DA',
                  marginTop: '2px',
                  fontWeight: 500
                }}>
                  Supporting documents submitted by the bidder for this tender.
                </div>
              </div>

              <input
                type="file"
                ref={uploadDocInputRef}
                onChange={handleUploadNewDoc}
                accept=".pdf,.jpg,.jpeg,.png"
                style={{ display: 'none' }}
              />

              <button
                onClick={() => uploadDocInputRef.current?.click()}
                disabled={uploadingDoc}
                className="btn"
                style={{
                  backgroundColor: 'var(--gold)',
                  color: 'var(--navy-dark)',
                  fontWeight: 700,
                  fontSize: '0.75rem',
                  padding: '0.4rem 0.85rem',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  border: 'none',
                  borderRadius: '2px'
                }}
              >
                {uploadingDoc ? (
                  <span className="spinner" style={{ width: 12, height: 12, borderWidth: 2, borderColor: 'var(--navy-dark)', borderTopColor: 'transparent' }}></span>
                ) : (
                  <Upload size={14} />
                )}
                {uploadingDoc ? 'UPLOADING...' : 'UPLOAD DOCUMENT'}
              </button>
            </div>

            {/* Document Repository Table */}
            <div style={{ overflowX: 'auto' }}>
              {!bidder.documents?.length ? (
                <div className="text-center text-muted font-bold uppercase text-sm p-8">
                  No documents uploaded for this bidder.
                </div>
              ) : (
                <table className="data-table" style={{ margin: 0, width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ backgroundColor: 'var(--surface-muted)', borderBottom: '1px solid var(--border)' }}>
                      <th style={{ width: '40px', padding: '0.75rem 1rem', textAlign: 'center', fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)' }}>#</th>
                      <th style={{ padding: '0.75rem 1rem', fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Document Name</th>
                      <th style={{ padding: '0.75rem 1rem', fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', width: '120px' }}>File Details</th>
                      <th style={{ padding: '0.75rem 1rem', fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', width: '110px' }}>Uploaded Date</th>
                      <th style={{ padding: '0.75rem 1rem', fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', width: '120px' }}>Status</th>
                      <th style={{ padding: '0.75rem 1rem', fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', textAlign: 'right', width: '170px' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bidder.documents.map((doc, idx) => {
                      const formattedTitle = doc.type.toLowerCase().includes('certificate') ||
                        doc.type.toLowerCase().includes('undertaking') ||
                        doc.type.toLowerCase().includes('declaration') ||
                        doc.type.toLowerCase().includes('card') ||
                        doc.type.toLowerCase().includes('letter')
                        ? doc.type
                        : `${doc.type} Certificate`;

                      const uploadDateStr = doc.uploadedAt
                        ? new Date(doc.uploadedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                        : 'Recent';

                      return (
                        <tr key={doc.id} style={{ borderBottom: idx !== bidder.documents.length - 1 ? '1px solid var(--border)' : 'none', backgroundColor: idx % 2 === 0 ? 'var(--surface)' : '#FAFCFE' }}>
                          {/* Index */}
                          <td style={{ padding: '0.85rem 1rem', textAlign: 'center', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                            {idx + 1}
                          </td>

                          {/* Document Name & Filename */}
                          <td style={{ padding: '0.85rem 1rem' }}>
                            <div className="flex items-start gap-3">
                              <div style={{
                                padding: '6px',
                                backgroundColor: '#EEF2F6',
                                borderRadius: '4px',
                                color: 'var(--navy-dark)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0,
                                marginTop: '2px'
                              }}>
                                <FileText size={18} />
                              </div>
                              <div style={{ minWidth: 0, flex: 1 }}>
                                <div className="font-bold text-sm uppercase truncate" style={{ color: 'var(--navy-dark)', letterSpacing: '0.3px' }}>
                                  {formattedTitle}
                                </div>
                                <div className="text-xs text-muted truncate" style={{ fontFamily: 'monospace', fontSize: '0.75rem', marginTop: '2px', maxWidth: '320px' }} title={doc.fileName}>
                                  {doc.fileName}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* File Details */}
                          <td style={{ padding: '0.85rem 1rem', verticalAlign: 'middle' }}>
                            <span style={{
                              fontSize: '10px',
                              fontWeight: 700,
                              padding: '2px 8px',
                              backgroundColor: '#F1F5F9',
                              color: '#475569',
                              borderRadius: '3px',
                              letterSpacing: '0.5px',
                              display: 'inline-block'
                            }}>
                              PDF • 420 KB
                            </span>
                          </td>

                          {/* Uploaded Date */}
                          <td style={{ padding: '0.85rem 1rem', verticalAlign: 'middle', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                            {uploadDateStr}
                          </td>

                          {/* Status */}
                          <td style={{ padding: '0.85rem 1rem', verticalAlign: 'middle' }}>
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              fontSize: '10px',
                              fontWeight: 700,
                              padding: '3px 8px',
                              backgroundColor: '#E6F4EA',
                              color: '#1E7A34',
                              border: '1px solid #A7F3D0',
                              borderRadius: '3px',
                              textTransform: 'uppercase'
                            }}>
                              <CheckCircle2 size={11} /> UPLOADED
                            </span>
                          </td>

                          {/* Actions */}
                          <td style={{ padding: '0.85rem 1rem', textAlign: 'right', verticalAlign: 'middle' }}>
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => handleViewDoc(doc.id)}
                                className="btn btn-outline text-xs"
                                style={{ padding: '0.25rem 0.55rem', gap: '0.3rem', fontSize: '0.7rem', fontWeight: 700 }}
                                title="View PDF Document in new tab"
                              >
                                <Eye size={12} /> VIEW
                              </button>

                              <button
                                onClick={() => handleDownloadDoc(doc.id, doc.fileName)}
                                className="btn btn-outline text-xs"
                                style={{ padding: '0.25rem 0.55rem', gap: '0.3rem', fontSize: '0.7rem', fontWeight: 700 }}
                                title="Download PDF File"
                              >
                                <Download size={12} /> DOWNLOAD
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Audit Log */}
          <div>
            <div className="section-bar">AUDIT TRAIL — {bidder.auditLogs?.length || 0} ENTRIES</div>
            <div style={{ border: '1px solid var(--border)', borderTop: 'none', backgroundColor: 'var(--surface)', maxHeight: '400px', overflowY: 'auto' }}>
              {!bidder.auditLogs?.length ? (
                <div className="text-center text-muted font-bold uppercase text-sm p-6">No audit entries.</div>
              ) : bidder.auditLogs.map((log, idx) => {
                const isDecision = log.action?.toLowerCase().includes('approved') || log.action?.toLowerCase().includes('rejected');
                const isVerify = log.action?.toLowerCase().includes('verification run');
                const isAI = log.action?.toLowerCase().includes('ollama') || log.action?.toLowerCase().includes('recommendation');

                return (
                  <div key={log.id} className="p-4"
                    style={{
                      borderBottom: idx !== bidder.auditLogs.length - 1 ? '1px solid var(--border)' : 'none',
                      borderLeft: `3px solid ${isDecision ? 'var(--gold)' : isVerify ? 'var(--navy-dark)' : isAI ? '#8B5CF6' : 'transparent'}`,
                    }}>
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-bold text-xs uppercase" style={{ color: 'var(--navy-dark)' }}>
                        {isDecision ? '🏛 ' : isVerify ? '🔍 ' : isAI ? '🤖 ' : '📋 '}
                        {log.actor}
                      </span>
                      <span className="text-xs text-muted font-bold">
                        {new Date(log.timestamp).toLocaleString('en-IN', {
                          day: '2-digit', month: 'short', year: 'numeric',
                          hour: '2-digit', minute: '2-digit'
                        })}
                      </span>
                    </div>
                    <p className="text-sm m-0" style={{ color: isDecision ? 'var(--navy-dark)' : 'var(--text-muted)' }}>
                      {log.action}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

        </div>

        {/* ── RIGHT COLUMN ───────────────────────────────────── */}
        <div className="flex flex-col gap-5">

          {/* Score Box */}
          <div style={{ border: '2px solid var(--navy-dark)', backgroundColor: 'var(--surface)', textAlign: 'center', padding: '1.5rem', borderRadius: '2px' }}>
            <div className="text-xs text-muted font-bold uppercase tracking-wide mb-1">Compliance Score</div>
            {!isVerified ? (
              <div>
                <div style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--text-muted)', lineHeight: 1, marginBottom: '0.5rem' }}>—</div>
                <div className="text-xs text-muted font-bold uppercase">Run verification to get score</div>
              </div>
            ) : (
              <div>
                <div style={{
                  fontSize: '3rem', fontWeight: 800, lineHeight: 1, marginBottom: '0.5rem',
                  color: bidder.score >= 80 ? 'var(--status-approved)' : bidder.score >= 50 ? 'var(--status-pending)' : 'var(--status-rejected)',
                }}>
                  {bidder.score}<span style={{ fontSize: '1.2rem' }}>/100</span>
                </div>
                <Badge variant={bidder.risk}>{bidder.risk ? `${bidder.risk.toUpperCase()} RISK` : 'UNSCORED'}</Badge>
              </div>
            )}
          </div>

          {/* Scoring Formula */}
          <ScoringFormula />

          {/* AI Recommendation */}
          <div className="card">
            <div className="card-header flex justify-between items-center" style={{ backgroundColor: 'var(--surface-muted)' }}>
              <div className="flex items-center gap-2 font-bold uppercase text-sm" style={{ color: 'var(--navy-dark)' }}>
                <Brain size={16} /> AI RECOMMENDATION
              </div>
            </div>
            <div className="card-body">
              {!isVerified && (
                <div className="callout text-xs font-bold text-muted" style={{ borderLeftColor: 'var(--status-pending)' }}>
                  Run verification to automatically generate the AI recommendation.
                </div>
              )}

              {isVerified && !hasRec && (
                <div className="text-center text-muted font-bold uppercase text-xs p-4">
                  Recommendation not available.
                </div>
              )}

              {isVerified && hasRec && (
                <div className="callout font-medium text-sm mb-4"
                  style={{ whiteSpace: 'pre-line', borderLeftColor: 'var(--gold)', backgroundColor: '#FDFCF6', lineHeight: 1.6 }}>
                  {bidder.recommendation}
                </div>
              )}
            </div>
          </div>

            {/* Officer Decision */}
            <div className="card">
              <div className="card-header" style={{ backgroundColor: 'var(--navy-dark)' }}>
                <div className="font-bold uppercase text-sm" style={{ color: 'white' }}>⚖ OFFICER DECISION</div>
              </div>
              <div className="card-body">
                <div className="flex justify-between items-center mb-4">
                  <span className="font-bold uppercase text-xs text-muted">Current Status</span>
                  <Badge variant={bidder.status}>{bidder.status.replace(/_/g, ' ')}</Badge>
                </div>

                <div className="callout mb-4 text-xs font-bold uppercase"
                  style={{ borderLeftColor: 'var(--status-pending)', backgroundColor: '#FFFBEB', color: 'var(--navy-dark)' }}>
                  The final decision to approve or reject this bidder rests solely with the officer. The AI recommendation is advisory only.
                </div>

                <div className="mb-3">
                  <label className="text-xs font-bold mb-1 block uppercase text-muted">
                    Officer Justification Note <span style={{ color: 'var(--status-rejected)' }}>*</span>
                  </label>
                  <textarea
                    className="input" rows="3"
                    placeholder={
                      bidder.status === 'approved' || bidder.status === 'rejected'
                        ? "Decision finalized. Click Overturn Decision to select another option."
                        : "Enter your justification for this decision. This will be permanently recorded in the audit log..."
                    }
                    value={decisionNote}
                    onChange={e => setDecisionNote(e.target.value)}
                    disabled={submitting || bidder.status === 'approved' || bidder.status === 'rejected'}
                    style={{ resize: 'vertical' }}
                  />
                </div>

                <div className="flex flex-col gap-2">
                  {/* Initial State / Overturned State: pending_review */}
                  {bidder.status === 'pending_review' && (
                    <>
                      <button
                        onClick={() => submitDecision('approve')}
                        disabled={submitting}
                        className="btn w-full"
                        style={{ backgroundColor: 'var(--status-approved)', color: 'white', border: 'none', gap: '0.5rem' }}>
                        {submitting ? <span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }}></span> : <Check size={15} />}
                        APPROVE BIDDER
                      </button>
                      <button
                        onClick={() => submitDecision('reject')}
                        disabled={submitting}
                        className="btn btn-outline w-full"
                        style={{ color: 'var(--status-rejected)', borderColor: 'var(--status-rejected)', gap: '0.5rem' }}>
                        {submitting ? <span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }}></span> : <X size={15} />}
                        REJECT BIDDER
                      </button>
                      <button
                        onClick={() => submitDecision('flag_review')}
                        disabled={submitting}
                        className="btn btn-outline w-full"
                        style={{ color: 'var(--status-pending)', borderColor: 'var(--status-pending)', gap: '0.5rem' }}>
                        {submitting ? <span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }}></span> : <Flag size={15} />}
                        FLAG FOR REVIEW
                      </button>
                    </>
                  )}

                  {/* Flagged State: flagged_for_review */}
                  {bidder.status === 'flagged_for_review' && (
                    <>
                      <button
                        onClick={() => submitDecision('approve')}
                        disabled={submitting}
                        className="btn w-full"
                        style={{ backgroundColor: 'var(--status-approved)', color: 'white', border: 'none', gap: '0.5rem' }}>
                        {submitting ? <span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }}></span> : <Check size={15} />}
                        APPROVE BIDDER
                      </button>
                      <button
                        onClick={() => submitDecision('reject')}
                        disabled={submitting}
                        className="btn btn-outline w-full"
                        style={{ color: 'var(--status-rejected)', borderColor: 'var(--status-rejected)', gap: '0.5rem' }}>
                        {submitting ? <span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }}></span> : <X size={15} />}
                        REJECT BIDDER
                      </button>
                    </>
                  )}

                  {/* Decided States: approved or rejected */}
                  {(bidder.status === 'approved' || bidder.status === 'rejected') && (
                    <button
                      onClick={() => submitDecision('overturn')}
                      disabled={submitting}
                      className="btn btn-outline w-full"
                      style={{ color: 'var(--navy-dark)', borderColor: 'var(--navy-dark)', gap: '0.5rem' }}>
                      {submitting ? <span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }}></span> : <RefreshCw size={15} />}
                      OVERTURN DECISION
                    </button>
                  )}
                </div>
              </div>
            </div>

          </div>
          {/* Blockchain Audit */}
          {isVerified && (
            <div className="card">
              <div className="card-header flex justify-between items-center" style={{ backgroundColor: '#1A1F27' }}>
                <div className="flex items-center gap-2 font-bold uppercase text-sm" style={{ color: 'white' }}>
                  <Shield size={16} /> BLOCKCHAIN AUDIT
                </div>
              </div>
              <div className="card-body">
                {!bidder.blockchainTxId ? (
                  <div className="text-center">
                    <div className="text-xs text-muted mb-3 font-bold uppercase">Not registered on blockchain</div>
                    <button
                      onClick={handleRegisterBlockchain}
                      disabled={bcRegistering}
                      className="btn w-full"
                      style={{ backgroundColor: 'var(--navy-dark)', color: 'white', gap: '0.4rem' }}>
                      {bcRegistering ? <span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }}></span> : <ShieldCheck size={14} />}
                      REGISTER ON BLOCKCHAIN
                    </button>
                    <div className="text-xs text-muted mt-2">Creates a tamper-evident hash of this verification on Fabric.</div>
                  </div>
                ) : (
                  <div>
                    <div className="mb-3">
                      <div className="text-xs font-bold uppercase text-muted">Transaction ID</div>
                      <div className="text-xs" style={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>{bidder.blockchainTxId}</div>
                    </div>
                    
                    <div className="flex gap-2">
                      <button
                        onClick={handleVerifyIntegrity}
                        disabled={bcVerifying}
                        className="btn flex-1"
                        style={{ backgroundColor: 'var(--navy-dark)', color: 'white', gap: '0.4rem', padding: '0.5rem' }}>
                        {bcVerifying ? <span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }}></span> : <ShieldCheck size={14} />}
                        VERIFY INTEGRITY
                      </button>
                      <button
                        onClick={handleTamperDemo}
                        disabled={bcTampering}
                        className="btn btn-outline"
                        style={{ borderColor: 'var(--status-rejected)', color: 'var(--status-rejected)', padding: '0.5rem' }}
                        title="Simulate Tampering (Demo)">
                        TAMPER TEST
                      </button>
                    </div>

                    {bcResult && (
                      <div className="callout mt-4 mb-0 flex items-start gap-2"
                        style={{
                          backgroundColor: bcResult.verified ? '#F0FFF4' : '#FDF2F2',
                          borderLeftColor: bcResult.verified ? 'var(--status-approved)' : 'var(--status-rejected)',
                        }}>
                        {bcResult.verified ? (
                          <ShieldCheck size={18} style={{ color: 'var(--status-approved)', marginTop: '2px' }} />
                        ) : (
                          <ShieldAlert size={18} style={{ color: 'var(--status-rejected)', marginTop: '2px' }} />
                        )}
                        <div>
                          <div className="font-bold text-sm uppercase" style={{ color: bcResult.verified ? 'var(--status-approved)' : 'var(--status-rejected)' }}>
                            {bcResult.verified ? 'Integrity Verified' : 'Tampering Detected'}
                          </div>
                          <div className="text-xs text-muted mt-1 leading-relaxed">
                            {bcResult.message}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
  );
};

export default BidderView;
