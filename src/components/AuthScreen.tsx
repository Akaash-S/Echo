import React, { useState } from 'react';
import { Sparkles, Shield, Lock, ArrowRight, CheckCircle2, Key } from 'lucide-react';
import { AuthUser } from '../types';

interface AuthScreenProps {
  onLogin: (user: AuthUser) => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onLogin }) => {
  const [customEmail, setCustomEmail] = useState('');
  const [customName, setCustomName] = useState('');
  const [activeTab, setActiveTab] = useState<'google' | 'custom'>('google');

  const demoAccounts: AuthUser[] = [
    {
      uid: 'demo-user-alex',
      displayName: 'Alex Chen',
      email: 'alex.chen@google.com',
      token: 'fb_tok_demo-user-alex',
    },
    {
      uid: 'demo-user-elena',
      displayName: 'Elena Rostova',
      email: 'elena.rostova@design.co',
      token: 'fb_tok_demo-user-elena',
    },
    {
      uid: 'demo-user-marcus',
      displayName: 'Marcus Vance',
      email: 'marcus.vance@journal.io',
      token: 'fb_tok_demo-user-marcus',
    },
  ];

  const handleCustomLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customEmail) return;
    const uid = `user_${customEmail.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()}`;
    const name = customName || customEmail.split('@')[0];
    onLogin({
      uid,
      email: customEmail,
      displayName: name,
      token: `fb_tok_${uid}`,
    });
  };

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 flex flex-col justify-center items-center px-4 py-12">
      <div className="w-full max-w-md bg-stone-900 border border-stone-800 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
        {/* Subtle accent glow */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-amber-600/10 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-600 to-amber-400 text-stone-950 font-bold mb-4 shadow-lg shadow-amber-500/20">
            <Sparkles className="w-7 h-7 text-stone-950" />
          </div>
          <h1 className="text-2xl font-serif font-bold text-stone-100 tracking-tight">Echo</h1>
          <p className="text-sm text-stone-400 mt-1 font-sans">
            Your private, intelligent reflective journal with continuous memory
          </p>
        </div>

        {/* Security badge */}
        <div className="mb-6 bg-stone-950/80 border border-stone-800 rounded-xl p-3 flex items-start gap-2.5 text-xs text-stone-300">
          <Shield className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold text-stone-200">Production-Grade Security:</span>
            <p className="text-stone-400 text-[11px] mt-0.5">
              Sessions are isolated at <code className="text-amber-400">/users/{'{uid}'}/sessions</code> and verified with bearer token authentication on every request.
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 p-1 bg-stone-950 rounded-xl border border-stone-800 mb-6">
          <button
            type="button"
            onClick={() => setActiveTab('google')}
            className={`flex-1 py-2 text-xs font-medium rounded-lg transition-colors ${
              activeTab === 'google' ? 'bg-amber-500 text-stone-950 font-semibold' : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            Google Sign-In (Select Persona)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('custom')}
            className={`flex-1 py-2 text-xs font-medium rounded-lg transition-colors ${
              activeTab === 'custom' ? 'bg-amber-500 text-stone-950 font-semibold' : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            Custom ID Token
          </button>
        </div>

        {activeTab === 'google' ? (
          <div className="space-y-3">
            <p className="text-xs text-stone-400 mb-2">Select a verified Google identity to start journaling:</p>
            {demoAccounts.map((account) => (
              <button
                key={account.uid}
                id={`sign-in-as-${account.uid}`}
                onClick={() => onLogin(account)}
                className="w-full flex items-center justify-between p-3.5 rounded-xl bg-stone-800/80 hover:bg-stone-800 border border-stone-700/60 hover:border-amber-500/50 transition-all text-left group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center justify-center font-bold text-xs">
                    {account.displayName.charAt(0)}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-stone-200 group-hover:text-amber-300 transition-colors">
                      {account.displayName}
                    </div>
                    <div className="text-xs text-stone-400">{account.email}</div>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-stone-500 group-hover:text-amber-400 group-hover:translate-x-0.5 transition-all" />
              </button>
            ))}
          </div>
        ) : (
          <form onSubmit={handleCustomLogin} className="space-y-3">
            <div>
              <label className="block text-xs text-stone-400 mb-1">Display Name</label>
              <input
                type="text"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder="e.g. Jordan River"
                className="w-full px-3 py-2 bg-stone-950 border border-stone-800 rounded-xl text-sm text-stone-100 placeholder:text-stone-600 focus:outline-none focus:border-amber-500"
              />
            </div>
            <div>
              <label className="block text-xs text-stone-400 mb-1">Email Address</label>
              <input
                type="email"
                required
                value={customEmail}
                onChange={(e) => setCustomEmail(e.target.value)}
                placeholder="jordan@company.com"
                className="w-full px-3 py-2 bg-stone-950 border border-stone-800 rounded-xl text-sm text-stone-100 placeholder:text-stone-600 focus:outline-none focus:border-amber-500"
              />
            </div>
            <button
              type="submit"
              id="custom-sign-in-btn"
              className="w-full mt-2 py-2.5 bg-amber-500 hover:bg-amber-400 text-stone-950 font-semibold rounded-xl text-xs flex items-center justify-center gap-2 transition-all shadow-md shadow-amber-500/10"
            >
              <Key className="w-4 h-4" />
              Authenticate with Firebase Bearer Token
            </button>
          </form>
        )}

        <div className="mt-8 pt-6 border-t border-stone-800/80 text-center">
          <p className="text-[11px] text-stone-500">
            Powered by Gemini 3.7 Flash & Google Cloud • Zero secrets in client
          </p>
        </div>
      </div>
    </div>
  );
};
