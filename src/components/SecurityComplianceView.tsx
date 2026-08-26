import React, { useState, useEffect } from 'react';
import { ShieldCheck, Lock, Key, Server, Database, CheckCircle2, AlertTriangle, Terminal, Copy, Check, FileCode } from 'lucide-react';
import { EchoApiClient } from '../lib/api';

interface SecurityComplianceViewProps {
  api: EchoApiClient;
  currentUserUid: string;
}

export const SecurityComplianceView: React.FC<SecurityComplianceViewProps> = ({ api, currentUserUid }) => {
  const [auditData, setAuditData] = useState<any>(null);
  const [copiedSection, setCopiedSection] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ status: 'idle' | 'running' | 'success' | 'error'; message?: string }>({
    status: 'idle',
  });

  useEffect(() => {
    api.getSecurityAudit()
      .then((data) => setAuditData(data))
      .catch((err) => console.error('Failed to load audit info', err));
  }, [currentUserUid]);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(id);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  const testUnauthorizedRejection = async () => {
    setTestResult({ status: 'running' });
    try {
      const res = await fetch('/api/session/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer INVALID_EXPIRED_TOKEN_XYZ',
        },
      });

      if (res.status === 401) {
        const body = await res.json();
        setTestResult({
          status: 'success',
          message: `Verification Passed: Backend rejected forged token with HTTP 401 Unauthorized (${body.error || body.code})`,
        });
      } else {
        setTestResult({
          status: 'error',
          message: `Unexpected response status ${res.status}. Expected 401 Unauthorized.`,
        });
      }
    } catch (err: any) {
      setTestResult({
        status: 'error',
        message: `Network error during security test: ${err.message}`,
      });
    }
  };

  const nonNegotiables = [
    {
      id: 'rule-1',
      title: '1. Zero Hardcoded Secrets in Code',
      satisfiedBy: 'Gemini API key is read strictly server-side from Google Cloud Secret Manager / process.env. No client bundle or repo contains credentials.',
      status: 'Enforced',
      layer: 'Cloud Run / Secret Manager',
    },
    {
      id: 'rule-2',
      title: '2. Server-Side Bearer Token Verification',
      satisfiedBy: 'Every single API route (/api/session/*) intercepts the Authorization: Bearer <token> header and verifies claims before executing any business logic.',
      status: 'Enforced',
      layer: 'Backend Middleware',
    },
    {
      id: 'rule-3',
      title: '3. Strict User Data Isolation (/users/{uid}/sessions)',
      satisfiedBy: `Queries and mutations only access /users/${currentUserUid}/sessions. The backend extracts UID directly from the verified token claim, never request bodies.`,
      status: 'Enforced',
      layer: 'Firestore + Auth Context',
    },
    {
      id: 'rule-4',
      title: '4. Untrusted Input Sanitization',
      satisfiedBy: 'All message content and session identifiers are validated, sanitized, and type-checked before prompt formation or storage.',
      status: 'Enforced',
      layer: 'Express Validation Schema',
    },
    {
      id: 'rule-5',
      title: '5. Least-Privilege IAM Roles',
      satisfiedBy: 'Cloud Run service account is restricted to secretmanager.secretAccessor and datastore.user — avoiding broad owner or editor roles.',
      status: 'Configured',
      layer: 'Google Cloud IAM',
    },
    {
      id: 'rule-6',
      title: '6. Double-Layer Firestore Security Rules',
      satisfiedBy: 'Independent security rules enforce request.auth.uid == uid as an autonomous guardrail at the database layer.',
      status: 'Validated',
      layer: 'Cloud Firestore Rules',
    },
  ];

  const firestoreRulesCode = `rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{uid}/sessions/{sessionId} {
      allow read, write: if request.auth != null && request.auth.uid == uid;
    }
  }
}`;

  const gcpCliDeploymentSnippet = `# 1. Create Secret in Secret Manager
gcloud secrets create GEMINI_API_KEY --replication-policy="automatic"
echo -n "YOUR_GEMINI_API_KEY" | gcloud secrets versions add GEMINI_API_KEY --data-file=-

# 2. Grant Least-Privilege IAM Access to Cloud Run Service Account
gcloud secrets add-iam-policy-binding GEMINI_API_KEY \\
  --member="serviceAccount:echo-runner@PROJECT_ID.iam.gserviceaccount.com" \\
  --role="roles/secretmanager.secretAccessor"

# 3. Deploy Cloud Run Service
gcloud run deploy echo-journal \\
  --image gcr.io/PROJECT_ID/echo-journal:latest \\
  --set-secrets="GEMINI_API_KEY=GEMINI_API_KEY:latest" \\
  --region us-central1 \\
  --allow-unauthenticated`;

  return (
    <div className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-6 overflow-y-auto space-y-8">
      {/* Header */}
      <div className="bg-stone-900 border border-stone-800 rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-bold">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-serif font-bold text-xl sm:text-2xl text-stone-100">
              Security Constitution & Architecture Audit
            </h1>
            <p className="text-xs text-stone-400">
              Verifying production-grade isolation, token verification, and non-negotiables (§7)
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-6 pt-6 border-t border-stone-800">
          <div className="bg-stone-950/60 border border-stone-800/80 p-3.5 rounded-2xl">
            <span className="text-[10px] text-stone-400 uppercase tracking-wider block font-semibold">
              Isolated Storage Path
            </span>
            <p className="text-xs font-mono text-amber-300 mt-1 truncate">/users/{currentUserUid}/sessions</p>
          </div>
          <div className="bg-stone-950/60 border border-stone-800/80 p-3.5 rounded-2xl">
            <span className="text-[10px] text-stone-400 uppercase tracking-wider block font-semibold">
              Auth Token Enforcement
            </span>
            <p className="text-xs font-mono text-emerald-400 mt-1 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Bearer Token on all Routes
            </p>
          </div>
          <div className="bg-stone-950/60 border border-stone-800/80 p-3.5 rounded-2xl">
            <span className="text-[10px] text-stone-400 uppercase tracking-wider block font-semibold">
              Secrets Exposure
            </span>
            <p className="text-xs font-mono text-emerald-400 mt-1 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              0 Secrets in Client Bundle
            </p>
          </div>
        </div>
      </div>

      {/* Live Security Interactive Test */}
      <div className="bg-stone-900 border border-stone-800 rounded-3xl p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-serif font-bold text-base text-stone-100 flex items-center gap-2">
              <Lock className="w-4 h-4 text-amber-400" />
              Live Security Probe: Token Verification Test
            </h2>
            <p className="text-xs text-stone-400 mt-0.5">
              Simulate an unauthorized attack attempt with a forged bearer token to prove server-side 401 rejection.
            </p>
          </div>
          <button
            id="run-security-probe-btn"
            onClick={testUnauthorizedRejection}
            disabled={testResult.status === 'running'}
            className="px-4 py-2 bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <Terminal className="w-3.5 h-3.5 text-amber-400" />
            {testResult.status === 'running' ? 'Probing...' : 'Run Auth Test'}
          </button>
        </div>

        {testResult.status !== 'idle' && (
          <div
            className={`p-3.5 rounded-2xl text-xs border ${
              testResult.status === 'success'
                ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300'
                : testResult.status === 'error'
                ? 'bg-rose-950/40 border-rose-800/60 text-rose-300'
                : 'bg-stone-950 border-stone-800 text-stone-400'
            }`}
          >
            {testResult.message || 'Executing test...'}
          </div>
        )}
      </div>

      {/* 7 Non-Negotiables Checklist */}
      <div className="bg-stone-900 border border-stone-800 rounded-3xl p-6 shadow-xl space-y-4">
        <h2 className="font-serif font-bold text-base text-stone-100">
          Section 7 Constitution & Non-Negotiables Breakdown
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {nonNegotiables.map((rule) => (
            <div
              key={rule.id}
              className="bg-stone-950/60 border border-stone-800/80 rounded-2xl p-4 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <h3 className="text-xs font-bold text-stone-200">{rule.title}</h3>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    {rule.status}
                  </span>
                </div>
                <p className="text-xs text-stone-400 leading-relaxed font-sans">{rule.satisfiedBy}</p>
              </div>
              <div className="mt-3 pt-2 border-t border-stone-800/60 text-[10px] text-stone-500 flex items-center justify-between">
                <span>Layer: {rule.layer}</span>
                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Firestore Security Rules Preview */}
      <div className="bg-stone-900 border border-stone-800 rounded-3xl p-6 shadow-xl">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <FileCode className="w-4 h-4 text-amber-400" />
            <h2 className="font-serif font-bold text-base text-stone-100">
              Cloud Firestore Security Rules (Section 6)
            </h2>
          </div>
          <button
            onClick={() => copyToClipboard(firestoreRulesCode, 'rules')}
            className="flex items-center gap-1 text-xs text-stone-400 hover:text-stone-200 p-1.5 rounded-lg hover:bg-stone-800"
          >
            {copiedSection === 'rules' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedSection === 'rules' ? 'Copied' : 'Copy Rules'}</span>
          </button>
        </div>
        <p className="text-xs text-stone-400 mb-3">
          These rules ensure that client-side access is strictly locked down to the matching authenticated UID.
        </p>
        <pre className="bg-stone-950 p-4 rounded-2xl border border-stone-800 text-xs font-mono text-emerald-300 overflow-x-auto">
          {firestoreRulesCode}
        </pre>
      </div>

      {/* Manual Developer Configuration Checklist */}
      <div className="bg-stone-900 border border-stone-800 rounded-3xl p-6 shadow-xl">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Server className="w-4 h-4 text-amber-400" />
            <h2 className="font-serif font-bold text-base text-stone-100">
              Manual GCP & Cloud Run Deployment Guide
            </h2>
          </div>
          <button
            onClick={() => copyToClipboard(gcpCliDeploymentSnippet, 'gcp')}
            className="flex items-center gap-1 text-xs text-stone-400 hover:text-stone-200 p-1.5 rounded-lg hover:bg-stone-800"
          >
            {copiedSection === 'gcp' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedSection === 'gcp' ? 'Copied' : 'Copy Commands'}</span>
          </button>
        </div>
        <p className="text-xs text-stone-400 mb-3">
          Step-by-step commands to configure Secret Manager least-privilege IAM bindings and deploy to Cloud Run:
        </p>
        <pre className="bg-stone-950 p-4 rounded-2xl border border-stone-800 text-xs font-mono text-amber-300/90 overflow-x-auto leading-relaxed">
          {gcpCliDeploymentSnippet}
        </pre>
      </div>
    </div>
  );
};
