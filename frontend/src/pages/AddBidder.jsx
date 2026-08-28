import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { PlusCircle, Info, Upload, CheckCircle, AlertCircle } from 'lucide-react';
import api from '../api';

const FileBox = ({ label, name, fileRef, fileName, onChange }) => (
  <div>
    <div className="file-upload-box" onClick={() => fileRef.current.click()} style={{ cursor: 'pointer' }}>
      <Upload size={16} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
      <div className="flex-1 text-xs font-bold uppercase truncate" style={{ color: fileName ? 'var(--navy-dark)' : 'var(--text-muted)' }}>
        {fileName || `Click to browse — PDF, JPG or PNG (max 5 MB)`}
      </div>
      <span className="file-upload-btn">BROWSE</span>
    </div>
    <input 
      ref={fileRef} 
      type="file" 
      name={name} 
      accept=".pdf,.jpg,.jpeg,.png" 
      style={{ display: 'none' }} 
      onChange={onChange}
    />
  </div>
);

const AddBidder = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ name: '', gstin: '', pan: '', udyam: '', tenderId: '', tenderName: '' });
  const [fileNames, setFileNames] = useState({ pan_file: '', gst_file: '', udyam_file: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const panRef   = useRef();
  const gstRef   = useRef();
  const udyamRef = useRef();

  const handleFileChange = (e) => {
    const { name, files } = e.target;
    if (files && files[0]) {
      setFileNames(prev => ({ ...prev, [name]: files[0].name }));
    }
  };

  const set = (k) => (e) => setFormData(prev => ({ ...prev, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const fd = new FormData();
      Object.entries(formData).forEach(([k, v]) => fd.append(k, v));
      if (panRef.current?.files[0])   fd.append('pan_file',   panRef.current.files[0]);
      if (gstRef.current?.files[0])   fd.append('gst_file',   gstRef.current.files[0]);
      if (udyamRef.current?.files[0]) fd.append('udyam_file', udyamRef.current.files[0]);

      const res = await api.post('/bidders', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 180000, // 3 min — allows for OCR + Ollama
      });

      navigate(`/bidders/${res.data.id}`);
    } catch (err) {
      setError(err.response?.data?.error || 'Submission failed. Please check all fields and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '860px', margin: '0 auto' }}>
      <div className="mb-4">
        <div className="flex items-center gap-3">
          <PlusCircle size={24} style={{ color: 'var(--navy-dark)' }} />
          <h1 className="h2 m-0 uppercase">Add New Bidder</h1>
        </div>
        <p className="text-muted text-sm mt-1 font-semibold uppercase">
          Register a bidder and upload compliance documents for automated verification.
        </p>
        <hr className="page-header-rule" />
      </div>

      <div className="callout mb-6 flex gap-3 items-start">
        <Info size={20} style={{ color: 'var(--navy-dark)', flexShrink: 0 }} />
        <div>
          <p className="font-bold uppercase text-sm mb-1" style={{ color: 'var(--navy-dark)' }}>Instructions — Before You Submit</p>
          <p className="m-0 text-sm leading-relaxed">
            Please ensure you have the bidder's official <strong>PAN certificate</strong>, <strong>GST registration certificate</strong>, and <strong>Udyam/MSME registration</strong> ready in PDF or image format (max 5 MB each). The system will automatically run OCR extraction, portal checks, scoring, and generate an AI recommendation. This process may take up to 60 seconds.
          </p>
        </div>
      </div>

      {error && (
        <div className="callout mb-4 flex gap-3 items-start" style={{ borderLeftColor: 'var(--status-rejected)', backgroundColor: '#FDF2F2' }}>
          <AlertCircle size={18} style={{ color: 'var(--status-rejected)', flexShrink: 0 }} />
          <p className="m-0 text-sm font-bold" style={{ color: 'var(--status-rejected)' }}>{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="card mb-4">
          <div className="section-bar">COMPANY & TENDER DETAILS</div>
          <div className="card-body">
            <div className="grid gap-4" style={{ gridTemplateColumns: '1fr 1fr' }}>
              <div>
                <label className="text-xs font-bold mb-1 block uppercase text-muted">
                  Company Name <span style={{ color: 'var(--status-rejected)' }}>*</span>
                </label>
                <input type="text" className="input" value={formData.name} onChange={set('name')} required placeholder="e.g. Tata Consultancy Services Ltd" />
                <div className="text-xs text-muted mt-1 font-bold uppercase">As registered on MCA / GSTIN portal</div>
              </div>
              <div>
                <label className="text-xs font-bold mb-1 block uppercase text-muted">
                  Tender Name <span style={{ color: 'var(--status-rejected)' }}>*</span>
                </label>
                <input type="text" className="input" value={formData.tenderName} onChange={set('tenderName')} required placeholder="e.g. Supply of IT Equipment" />
                <div className="text-xs text-muted mt-1 font-bold uppercase">Full title of the GeM bid</div>
              </div>
              <div>
                <label className="text-xs font-bold mb-1 block uppercase text-muted">
                  Tender ID <span style={{ color: 'var(--status-rejected)' }}>*</span>
                </label>
                <input type="text" className="input" value={formData.tenderId} onChange={set('tenderId')} required placeholder="e.g. GEM/2026/B/1234567" />
                <div className="text-xs text-muted mt-1 font-bold uppercase">GeM bid reference number</div>
              </div>
            </div>
          </div>
        </div>

        <div className="card mb-6">
          <div className="section-bar">REGISTRATION NUMBERS & DOCUMENT UPLOADS</div>
          <div className="card-body">
            <div className="grid gap-6" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
              <div>
                <label className="text-xs font-bold mb-1 block uppercase text-muted">
                  PAN Number <span style={{ color: 'var(--status-rejected)' }}>*</span>
                </label>
                <input type="text" className="input mb-2" value={formData.pan} onChange={set('pan')} required placeholder="AAAPL1234C" style={{ textTransform: 'uppercase' }} maxLength={10} />
                <div className="text-xs text-muted mb-2 font-bold uppercase">Upload PAN Certificate</div>
                <FileBox name="pan_file" fileRef={panRef} fileName={fileNames.pan_file} onChange={handleFileChange} />
              </div>
              <div>
                <label className="text-xs font-bold mb-1 block uppercase text-muted">
                  GSTIN <span style={{ color: 'var(--status-rejected)' }}>*</span>
                </label>
                <input type="text" className="input mb-2" value={formData.gstin} onChange={set('gstin')} required placeholder="07AAAPL1234C1Z5" style={{ textTransform: 'uppercase' }} maxLength={15} />
                <div className="text-xs text-muted mb-2 font-bold uppercase">Upload GST Certificate</div>
                <FileBox name="gst_file" fileRef={gstRef} fileName={fileNames.gst_file} onChange={handleFileChange} />
              </div>
              <div>
                <label className="text-xs font-bold mb-1 block uppercase text-muted">
                  Udyam Number <span style={{ color: 'var(--status-rejected)' }}>*</span>
                </label>
                <input type="text" className="input mb-2" value={formData.udyam} onChange={set('udyam')} required placeholder="UDYAM-DL-01-0000001" style={{ textTransform: 'uppercase' }} />
                <div className="text-xs text-muted mb-2 font-bold uppercase">Upload MSME Certificate</div>
                <FileBox name="udyam_file" fileRef={udyamRef} fileName={fileNames.udyam_file} onChange={handleFileChange} />
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <button type="button" className="btn btn-outline" onClick={() => navigate('/')} disabled={loading}>CANCEL</button>
          <button type="submit" className="btn btn-primary" disabled={loading} style={{ minWidth: '200px' }}>
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="spinner" style={{ width: '14px', height: '14px', borderWidth: '2px' }}></span>
                RUNNING VERIFICATION...
              </span>
            ) : 'SUBMIT FOR VERIFICATION'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AddBidder;
