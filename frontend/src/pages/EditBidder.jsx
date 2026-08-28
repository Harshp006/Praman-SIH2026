import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Edit, AlertCircle } from 'lucide-react';
import api from '../api';
import Loader from '../components/Loader';

const EditBidder = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [bidder, setBidder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ name: '', tenderId: '' });
  const [tenders, setTenders] = useState([]);
  const [tendersLoading, setTendersLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get(`/bidders/${id}`),
      api.get('/tenders')
    ])
      .then(([bidderRes, tendersRes]) => {
        setBidder(bidderRes.data);
        setForm({ name: bidderRes.data.name, tenderId: bidderRes.data.tenderId });
        setTenders(tendersRes.data || []);
      })
      .catch(() => setError('Failed to load data.'))
      .finally(() => {
        setLoading(false);
        setTendersLoading(false);
      });
  }, [id]);

  const set = (k) => (e) => setForm(prev => ({ ...prev, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!form.tenderId) {
      setError('Please select a Tender.');
      return;
    }

    setSaving(true);
    try {
      await api.put(`/bidders/${id}`, form);
      navigate(`/bidders/${id}`);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save changes.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Loader center text="Loading bidder..." />;

  return (
    <div style={{ maxWidth: '700px', margin: '0 auto' }}>
      <div className="mb-4">
        <div className="flex items-center gap-3">
          <Edit size={24} style={{ color: 'var(--navy-dark)' }} />
          <h1 className="h2 m-0 uppercase">Edit Bidder</h1>
        </div>
        <p className="text-muted text-sm mt-1 font-semibold uppercase">
          Update the company name and tender information for this bidder.
        </p>
        <hr className="page-header-rule" />
      </div>

      {error && (
        <div className="callout mb-4 flex gap-3 items-start" style={{ borderLeftColor: 'var(--status-rejected)', backgroundColor: '#FDF2F2' }}>
          <AlertCircle size={18} style={{ color: 'var(--status-rejected)', flexShrink: 0 }} />
          <p className="m-0 text-sm font-bold" style={{ color: 'var(--status-rejected)' }}>{error}</p>
        </div>
      )}

      <div className="card">
        <div className="section-bar">EDITABLE FIELDS</div>
        <div className="card-body">
          <div className="callout mb-4 text-xs font-bold uppercase" style={{ borderLeftColor: 'var(--status-pending)' }}>
            Note: GSTIN, PAN, and Udyam numbers cannot be edited once submitted. Only company name and tender info can be changed.
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="text-xs font-bold mb-1 block uppercase text-muted">
                Company Name <span style={{ color: 'var(--status-rejected)' }}>*</span>
              </label>
              <input type="text" className="input" value={form.name} onChange={set('name')} required />
            </div>

            <div>
              <label className="text-xs font-bold mb-1 block uppercase text-muted">
                Select Tender <span style={{ color: 'var(--status-rejected)' }}>*</span>
              </label>
              <select 
                className="input" 
                value={form.tenderId} 
                onChange={set('tenderId')} 
                required
                disabled={tendersLoading}
              >
                <option value="">-- SELECT TENDER --</option>
                {tenders.map(t => (
                  <option key={t.id} value={t.tenderId}>
                    {t.name} ({t.tenderId})
                  </option>
                ))}
              </select>
            </div>

            <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
              <p className="text-xs font-bold uppercase text-muted mb-0">Read-only fields (from original submission)</p>
            </div>

            <div className="grid gap-4" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
              {[['PAN', bidder?.pan], ['GSTIN', bidder?.gstin], ['Udyam', bidder?.udyam]].map(([label, val]) => (
                <div key={label}>
                  <label className="text-xs font-bold mb-1 block uppercase text-muted">{label}</label>
                  <input type="text" className="input" value={val || ''} readOnly
                    style={{ backgroundColor: 'var(--surface-muted)', color: 'var(--text-muted)', cursor: 'not-allowed' }} />
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-3 mt-4">
              <button type="button" className="btn btn-outline" onClick={() => navigate(`/bidders/${id}`)} disabled={saving}>CANCEL</button>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? <span className="spinner" style={{ width: '14px', height: '14px', borderWidth: '2px' }}></span> : null}
                {saving ? 'SAVING...' : 'SAVE CHANGES'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default EditBidder;
