import React, { useState } from 'react';
import {
  Code, Copy, Check, ShieldCheck, Server, Key, Send, AlertTriangle,
  FileCode, Play, ExternalLink, ArrowRight, CheckCircle2, Lock
} from 'lucide-react';
import api from '../api';

const ApiDocs = () => {
  const [copiedIndex, setCopiedIndex] = useState(null);
  
  // Interactive Tester state
  const [testPayload, setTestPayload] = useState(JSON.stringify({
    bidder_id: "EXT-GEM-9942",
    company_name: "Bharat Heavy Electricals Ltd (BHEL)",
    gstin: "07AAACB2000F1Z0",
    pan: "AAACB2000F",
    udyam: "UDYAM-DL-00-1000001",
    tender_id: "GEM/2026/B/1000001"
  }, null, 2));

  const [apiKey, setApiKey] = useState('praman_demo_secure_key_2026');
  const [testLoading, setTestLoading] = useState(false);
  const [testResponse, setTestResponse] = useState(null);
  const [testStatusCode, setTestStatusCode] = useState(null);

  const copyToClipboard = (text, index) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleRunTest = async () => {
    setTestLoading(true);
    setTestResponse(null);
    setTestStatusCode(null);

    try {
      let parsedPayload;
      try {
        parsedPayload = JSON.parse(testPayload);
      } catch (e) {
        setTestStatusCode(400);
        setTestResponse({ success: false, error: "Bad Request", message: "Invalid JSON format in payload body." });
        setTestLoading(false);
        return;
      }

      // Directly fetch to test API key endpoint
      const response = await fetch('http://localhost:8081/api/v1/verify-bidder', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify(parsedPayload),
      });

      const data = await response.json();
      setTestStatusCode(response.status);
      setTestResponse(data);
    } catch (err) {
      setTestStatusCode(500);
      setTestResponse({ success: false, error: "Network Error", message: err.message || "Failed to reach PRAMAN API server." });
    } finally {
      setTestLoading(false);
    }
  };

  const curlExample = `curl -X POST http://localhost:8081/api/v1/verify-bidder \\
  -H "Authorization: Bearer praman_demo_secure_key_2026" \\
  -H "Content-Type: application/json" \\
  -d '{
    "bidder_id": "EXT-GEM-9942",
    "company_name": "Bharat Heavy Electricals Ltd (BHEL)",
    "gstin": "07AAACB2000F1Z0",
    "pan": "AAACB2000F",
    "udyam": "UDYAM-DL-00-1000001",
    "tender_id": "GEM/2026/B/1000001"
  }'`;

  const nodeExample = `const fetch = require('node-fetch');

async function verifyBidderWithPraman() {
  const response = await fetch('http://localhost:8081/api/v1/verify-bidder', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer praman_demo_secure_key_2026',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      company_name: 'Tata Consultancy Services Ltd',
      gstin: '27AAACT2727Q1ZW',
      pan: 'AAACT2727Q',
      udyam: 'UDYAM-MH-01-0000001',
      tender_id: 'GEM/2026/B/1000001'
    })
  });

  const result = await response.json();
  console.log('Compliance Score:', result.result.compliance_score);
  console.log('Risk Level:', result.result.risk_level);
  console.log('Recommendation:', result.result.recommendation);
}

verifyBidderWithPraman();`;

  const pythonExample = `import requests

url = "http://localhost:8081/api/v1/verify-bidder"
headers = {
    "Authorization": "Bearer praman_demo_secure_key_2026",
    "Content-Type": "application/json"
}

payload = {
    "company_name": "Reliance Industries Ltd",
    "gstin": "24AAACR5000C1Z5",
    "pan": "AAACR5000C",
    "udyam": "UDYAM-GJ-00-1234567",
    "tender_id": "GEM/2026/B/1000001"
}

response = requests.post(url, headers=headers, json=payload)
data = response.json()

print(f"Status: {data['status']}")
print(f"Score: {data['result']['compliance_score']}/100")
print(f"Risk: {data['result']['risk_level']}")`;

  const sampleSuccessResponse = `{
  "success": true,
  "verification_id": "VRF-3A7B9C1D",
  "status": "COMPLETED",
  "timestamp": "2026-08-29T14:30:00.000Z",
  "result": {
    "bidder_id": "cmtdu...789",
    "external_bidder_id": "EXT-GEM-9942",
    "company_name": "Bharat Heavy Electricals Ltd (BHEL)",
    "gstin": "07AAACB2000F1Z0",
    "pan": "AAACB2000F",
    "udyam": "UDYAM-DL-00-1000001",
    "tender_id": "GEM/2026/B/1000001",
    "compliance_score": 92,
    "risk_level": "LOW",
    "checks_passed": 9,
    "checks_failed": 0,
    "checks_warning": 1,
    "recommendation": "Score: 92/100 (low risk). Meets mandatory compliance thresholds. Recommend APPROVE.",
    "observations": [
      "[PASS] GST registration & return filing: GSTIN active. 3B/1-3 filing up to date.",
      "[PASS] PAN & Income Tax compliance: Active PAN card.",
      "[PASS] Udyam / MSME registration: Valid MSME certificate verified.",
      "[PASS] Blacklisting / debarment: No records found in CVC, GeM, or MCA blacklisting databases."
    ]
  }
}`;

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3">
          <Code size={26} style={{ color: 'var(--navy-dark)' }} />
          <h1 className="h2 m-0 uppercase">PRAMAN Integration API</h1>
          <span style={{
            backgroundColor: 'var(--navy-dark)', color: 'var(--gold)',
            fontSize: '11px', fontWeight: 800, padding: '2px 8px', borderRadius: '2px'
          }}>v1.0 REST</span>
        </div>
        <p className="text-muted text-sm mt-1 font-semibold uppercase">
          External Procurement & e-Governance Platform Integration Specification
        </p>
        <hr className="page-header-rule" />
      </div>

      {/* Intro Banner */}
      <div className="callout mb-6" style={{ borderLeftColor: 'var(--gold)', backgroundColor: '#FDFCF6', padding: '1.25rem' }}>
        <div className="flex items-center gap-2 font-bold uppercase text-sm mb-2" style={{ color: 'var(--navy-dark)' }}>
          <ShieldCheck size={18} /> Platform Integration Overview
        </div>
        <p className="m-0 text-sm leading-relaxed text-muted" style={{ fontSize: '0.875rem' }}>
          PRAMAN provides a secure REST API that allows existing procurement and e-governance platforms (such as <strong>GeM</strong>) to integrate automated bidder verification. External systems send bidder information to PRAMAN using an authorized API key and receive consolidated compliance scores, risk assessments, verification results, and observations in a standardized JSON response.
        </p>
      </div>

      {/* Integration Flow Diagram */}
      <div className="card mb-6">
        <div className="section-bar">INTEGRATION ARCHITECTURE & DATA FLOW</div>
        <div className="card-body">
          <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', alignItems: 'center' }}>
            <div className="p-3 text-center rounded border" style={{ backgroundColor: 'var(--surface-muted)', borderColor: 'var(--border)' }}>
              <Server size={20} className="mx-auto mb-1 text-muted" />
              <div className="font-bold text-xs uppercase" style={{ color: 'var(--navy-dark)' }}>External System (GeM)</div>
              <div className="text-[11px] text-muted font-bold mt-1">Sends POST + API Key</div>
            </div>

            <div className="text-center font-bold text-xs text-muted flex flex-col items-center">
              <span>Bearer Token</span>
              <ArrowRight size={18} style={{ color: 'var(--gold)' }} />
            </div>

            <div className="p-3 text-center rounded border" style={{ backgroundColor: 'var(--navy-dark)', color: 'white', borderColor: 'var(--navy-dark)' }}>
              <Lock size={20} className="mx-auto mb-1" style={{ color: 'var(--gold)' }} />
              <div className="font-bold text-xs uppercase text-gold">PRAMAN API Gateway</div>
              <div className="text-[11px] text-gray-300 font-medium mt-1">Auth & Validation</div>
            </div>

            <div className="text-center font-bold text-xs text-muted flex flex-col items-center">
              <span>Connectors & AI</span>
              <ArrowRight size={18} style={{ color: 'var(--gold)' }} />
            </div>

            <div className="p-3 text-center rounded border" style={{ backgroundColor: 'var(--surface-muted)', borderColor: 'var(--border)' }}>
              <CheckCircle2 size={20} className="mx-auto mb-1 text-green-600" />
              <div className="font-bold text-xs uppercase" style={{ color: 'var(--navy-dark)' }}>Standardized JSON Result</div>
              <div className="text-[11px] text-muted font-bold mt-1">Score + Risk + Checks</div>
            </div>
          </div>
        </div>
      </div>

      {/* API Endpoint Specs */}
      <div className="card mb-6">
        <div className="section-bar">ENDPOINT SPECIFICATION</div>
        <div className="card-body">
          <div className="flex items-center gap-3 mb-4 p-3 rounded" style={{ backgroundColor: 'var(--surface-muted)', border: '1px solid var(--border)' }}>
            <span style={{ backgroundColor: '#1E7A34', color: 'white', fontWeight: 800, padding: '3px 8px', borderRadius: '3px', fontSize: '11px' }}>POST</span>
            <code className="font-bold text-sm" style={{ color: 'var(--navy-dark)' }}>http://localhost:8081/api/v1/verify-bidder</code>
          </div>

          <h4 className="font-bold uppercase text-xs text-muted mb-2">Request Headers</h4>
          <div style={{ overflowX: 'auto', marginBottom: '1.5rem' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Header</th>
                  <th>Value</th>
                  <th>Description</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><code className="font-bold">Authorization</code></td>
                  <td><code>Bearer &lt;PRAMAN_API_KEY&gt;</code></td>
                  <td>PRAMAN API Key (Configured server-side: <code>praman_demo_secure_key_2026</code>)</td>
                </tr>
                <tr>
                  <td><code className="font-bold">Content-Type</code></td>
                  <td><code>application/json</code></td>
                  <td>JSON payload header</td>
                </tr>
              </tbody>
            </table>
          </div>

          <h4 className="font-bold uppercase text-xs text-muted mb-2">JSON Request Body Fields</h4>
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Field</th>
                  <th>Type</th>
                  <th>Required</th>
                  <th>Description</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><code className="font-bold text-navy">company_name</code></td>
                  <td>String</td>
                  <td><span className="text-red-600 font-bold">YES</span></td>
                  <td>Official name of the bidder company (or <code>name</code>)</td>
                </tr>
                <tr>
                  <td><code className="font-bold text-navy">gstin</code></td>
                  <td>String</td>
                  <td><span className="text-red-600 font-bold">YES</span></td>
                  <td>15-character GSTIN registration number</td>
                </tr>
                <tr>
                  <td><code className="font-bold text-navy">pan</code></td>
                  <td>String</td>
                  <td><span className="text-red-600 font-bold">YES</span></td>
                  <td>10-character PAN number</td>
                </tr>
                <tr>
                  <td><code className="font-bold text-navy">udyam</code></td>
                  <td>String</td>
                  <td><span className="text-red-600 font-bold">YES</span></td>
                  <td>Udyam / MSME registration number</td>
                </tr>
                <tr>
                  <td><code className="font-bold text-navy">tender_id</code></td>
                  <td>String</td>
                  <td>Optional</td>
                  <td>Target GeM tender reference (defaults to active tender if omitted)</td>
                </tr>
                <tr>
                  <td><code className="font-bold text-navy">bidder_id</code></td>
                  <td>String</td>
                  <td>Optional</td>
                  <td>External system's unique bidder identifier for cross-referencing</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Live Interactive API Tester */}
      <div className="card mb-6" style={{ border: '2px solid var(--navy-dark)' }}>
        <div className="card-header flex justify-between items-center" style={{ backgroundColor: 'var(--navy-dark)', color: 'white' }}>
          <div className="flex items-center gap-2 font-bold uppercase text-sm">
            <Play size={16} style={{ color: 'var(--gold)' }} /> INTERACTIVE API TESTER (DEMO MODE)
          </div>
          <span className="text-xs font-mono text-gray-300">Live Endpoint Probe</span>
        </div>
        <div className="card-body">
          <div className="grid gap-4" style={{ gridTemplateColumns: '1fr 1fr' }}>
            {/* Request Column */}
            <div>
              <label className="text-xs font-bold mb-1 block uppercase text-muted">
                Authorization API Key Header
              </label>
              <input
                type="text"
                className="input mb-3 font-mono text-xs"
                value={apiKey}
                onChange={e => setApiKey(e.target.value)}
                placeholder="praman_demo_secure_key_2026"
              />

              <label className="text-xs font-bold mb-1 block uppercase text-muted">
                JSON Request Body Payload
              </label>
              <textarea
                className="input font-mono text-xs mb-3"
                rows="10"
                value={testPayload}
                onChange={e => setTestPayload(e.target.value)}
                style={{ resize: 'vertical', lineHeight: 1.4 }}
              />

              <button
                onClick={handleRunTest}
                disabled={testLoading}
                className="btn btn-primary w-full flex items-center justify-center gap-2"
              >
                {testLoading ? (
                  <>
                    <span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }}></span>
                    EXECUTING VERIFICATION ENGINE…
                  </>
                ) : (
                  <>
                    <Send size={14} /> SEND API REQUEST
                  </>
                )}
              </button>
            </div>

            {/* Response Column */}
            <div className="flex flex-col">
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs font-bold uppercase text-muted m-0">API JSON Response</label>
                {testStatusCode && (
                  <span style={{
                    fontSize: '10px', fontWeight: 800, padding: '2px 8px', borderRadius: '2px',
                    backgroundColor: testStatusCode === 200 ? 'var(--status-approved)' : 'var(--status-rejected)',
                    color: 'white'
                  }}>
                    HTTP STATUS {testStatusCode}
                  </span>
                )}
              </div>

              <div
                className="flex-1 font-mono text-xs p-3 rounded overflow-auto"
                style={{
                  backgroundColor: '#1E293B', color: '#E2E8F0',
                  minHeight: '260px', maxHeight: '340px', lineHeight: 1.4,
                  border: '1px solid var(--border)'
                }}
              >
                {!testResponse && !testLoading && (
                  <span className="text-gray-400 font-sans italic text-xs">
                    Click "SEND API REQUEST" to execute live verification and inspect JSON output...
                  </span>
                )}
                {testLoading && (
                  <span className="text-yellow-400 font-sans font-bold text-xs flex items-center gap-2">
                    <span className="spinner" style={{ width: 12, height: 12, borderWidth: 2 }}></span>
                    Executing API pipeline (OCR + Portal Connectors + Score + Ollama)...
                  </span>
                )}
                {testResponse && JSON.stringify(testResponse, null, 2)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Integration Code Snippets & cURL */}
      <div className="card mb-6">
        <div className="section-bar">INTEGRATION CODE EXAMPLES</div>
        <div className="card-body">
          {/* cURL */}
          <div className="mb-4">
            <div className="flex justify-between items-center mb-2">
              <span className="font-bold text-xs uppercase" style={{ color: 'var(--navy-dark)' }}>cURL Command</span>
              <button
                onClick={() => copyToClipboard(curlExample, 1)}
                className="btn btn-outline text-xs"
                style={{ padding: '2px 8px', gap: '4px' }}
              >
                {copiedIndex === 1 ? <Check size={12} style={{ color: 'var(--status-approved)' }} /> : <Copy size={12} />}
                {copiedIndex === 1 ? 'COPIED' : 'COPY cURL'}
              </button>
            </div>
            <pre className="font-mono text-xs p-3 rounded" style={{ backgroundColor: '#0F172A', color: '#38BDF8', overflowX: 'auto', margin: 0 }}>
              {curlExample}
            </pre>
          </div>

          {/* Node.js */}
          <div className="mb-4">
            <div className="flex justify-between items-center mb-2">
              <span className="font-bold text-xs uppercase" style={{ color: 'var(--navy-dark)' }}>Node.js / JavaScript</span>
              <button
                onClick={() => copyToClipboard(nodeExample, 2)}
                className="btn btn-outline text-xs"
                style={{ padding: '2px 8px', gap: '4px' }}
              >
                {copiedIndex === 2 ? <Check size={12} style={{ color: 'var(--status-approved)' }} /> : <Copy size={12} />}
                {copiedIndex === 2 ? 'COPIED' : 'COPY CODE'}
              </button>
            </div>
            <pre className="font-mono text-xs p-3 rounded" style={{ backgroundColor: '#0F172A', color: '#A7F3D0', overflowX: 'auto', margin: 0 }}>
              {nodeExample}
            </pre>
          </div>

          {/* Python */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="font-bold text-xs uppercase" style={{ color: 'var(--navy-dark)' }}>Python (requests)</span>
              <button
                onClick={() => copyToClipboard(pythonExample, 3)}
                className="btn btn-outline text-xs"
                style={{ padding: '2px 8px', gap: '4px' }}
              >
                {copiedIndex === 3 ? <Check size={12} style={{ color: 'var(--status-approved)' }} /> : <Copy size={12} />}
                {copiedIndex === 3 ? 'COPIED' : 'COPY CODE'}
              </button>
            </div>
            <pre className="font-mono text-xs p-3 rounded" style={{ backgroundColor: '#0F172A', color: '#FDE68A', overflowX: 'auto', margin: 0 }}>
              {pythonExample}
            </pre>
          </div>
        </div>
      </div>

      {/* Error Codes Reference */}
      <div className="card mb-6">
        <div className="section-bar">HTTP ERROR STATUS CODES</div>
        <div className="card-body">
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Status</th>
                  <th>Error Type</th>
                  <th>Trigger Condition</th>
                  <th>JSON Error Payload</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><span className="font-bold text-red-600">401</span></td>
                  <td>Unauthorized</td>
                  <td>API key missing or invalid</td>
                  <td><code>&#123;"success": false, "error": "Unauthorized", "message": "Invalid or missing API key"&#125;</code></td>
                </tr>
                <tr>
                  <td><span className="font-bold text-yellow-600">400</span></td>
                  <td>Bad Request</td>
                  <td>Missing required fields (company_name, gstin, pan, udyam)</td>
                  <td><code>&#123;"success": false, "error": "Bad Request", "message": "Missing required fields..."&#125;</code></td>
                </tr>
                <tr>
                  <td><span className="font-bold text-red-700">500</span></td>
                  <td>Server Error</td>
                  <td>Unexpected engine or database error</td>
                  <td><code>&#123;"success": false, "error": "Internal Server Error", "message": "..."&#125;</code></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ApiDocs;
