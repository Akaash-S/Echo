import React, { useEffect, useState } from 'react';
import { User, X, Sparkles, BookOpen, MapPin, Shield, LogOut, Check, Copy, Calendar, Award } from 'lucide-react';
import { AuthUser, JournalSession } from '../types';
import { EchoApiClient } from '../lib/api';

interface ProfileModalProps {
  api: EchoApiClient;
  user: AuthUser;
  isOpen: boolean;
  onClose: () => void;
  onLogout: () => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({
  api,
  user,
  isOpen,
  onClose,
  onLogout,
}) => {
  const [sessions, setSessions] = useState<JournalSession[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [copiedUid, setCopiedUid] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchUserStats();
    }
  }, [isOpen]);

  const fetchUserStats = async () => {
    setIsLoading(true);
    try {
      const res = await api.listSessions();
      setSessions(res.sessions || []);
    } catch (err) {
      console.warn('Failed to load profile session stats:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyUid = () => {
    navigator.clipboard.writeText(user.uid);
    setCopiedUid(true);
    setTimeout(() => setCopiedUid(false), 2000);
  };

  if (!isOpen) return null;

  // Compute profile statistics
  const totalSessions = sessions.length;
  const completedSessions = sessions.filter((s) => Boolean(s.endedAt)).length;
  const geotaggedSessions = sessions.filter((s) => Boolean(s.location)).length;
  
  // Extract unique themes
  const uniqueThemes = Array.from(
    new Set(
      sessions
        .map((s) => s.extractedTheme)
        .filter((t): t is string => Boolean(t && t.trim()))
    )
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-stone-900 border border-stone-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-stone-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <User className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-serif text-lg text-stone-100 font-normal">Journaler Profile</h3>
              <p className="text-xs text-stone-400">Account overview & reflection metrics</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-stone-400 hover:text-stone-200 p-1.5 rounded-lg hover:bg-stone-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="overflow-y-auto py-5 space-y-6 flex-1 pr-1">
          {/* User Identity Card */}
          <div className="flex items-center gap-4 bg-stone-850/70 border border-stone-800/90 rounded-2xl p-4">
            {user.photoURL ? (
              <img
                src={user.photoURL}
                alt={user.displayName}
                className="w-14 h-14 rounded-full border border-amber-500/30 object-cover shadow-sm"
              />
            ) : (
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-amber-600/30 to-stone-800 border border-amber-500/30 flex items-center justify-center text-amber-300 text-xl font-serif font-medium">
                {user.displayName ? user.displayName.charAt(0).toUpperCase() : 'J'}
              </div>
            )}

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h4 className="text-base font-medium text-stone-100 truncate">
                  {user.displayName || 'Anonymous Journaler'}
                </h4>
                <span className="text-[10px] bg-stone-800 text-stone-300 border border-stone-700 px-2 py-0.5 rounded-full">
                  Google Auth
                </span>
              </div>
              <p className="text-xs text-stone-400 truncate mt-0.5">{user.email}</p>
              
              <div className="flex items-center gap-2 mt-2">
                <span className="text-[11px] font-mono text-stone-500 truncate max-w-[170px]">
                  UID: {user.uid.slice(0, 12)}…
                </span>
                <button
                  onClick={handleCopyUid}
                  className="text-stone-400 hover:text-stone-200 p-1 rounded hover:bg-stone-800 transition-colors cursor-pointer"
                  title="Copy full UID"
                >
                  {copiedUid ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                </button>
              </div>
            </div>
          </div>

          {/* Journaling Stats Grid */}
          <div>
            <div className="text-[11px] font-medium text-stone-400 uppercase tracking-wider mb-2.5 px-1">
              Reflection Activity
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-stone-850/60 border border-stone-800 rounded-xl p-3.5 text-center">
                <div className="text-xl font-serif font-semibold text-amber-300">
                  {isLoading ? '…' : totalSessions}
                </div>
                <div className="text-[11px] text-stone-400 mt-1 flex items-center justify-center gap-1">
                  <BookOpen className="w-3 h-3 text-amber-400/80" />
                  <span>Total</span>
                </div>
              </div>

              <div className="bg-stone-850/60 border border-stone-800 rounded-xl p-3.5 text-center">
                <div className="text-xl font-serif font-semibold text-emerald-300">
                  {isLoading ? '…' : completedSessions}
                </div>
                <div className="text-[11px] text-stone-400 mt-1 flex items-center justify-center gap-1">
                  <Award className="w-3 h-3 text-emerald-400/80" />
                  <span>Synthesized</span>
                </div>
              </div>

              <div className="bg-stone-850/60 border border-stone-800 rounded-xl p-3.5 text-center">
                <div className="text-xl font-serif font-semibold text-sky-300">
                  {isLoading ? '…' : geotaggedSessions}
                </div>
                <div className="text-[11px] text-stone-400 mt-1 flex items-center justify-center gap-1">
                  <MapPin className="w-3 h-3 text-sky-400/80" />
                  <span>Geotagged</span>
                </div>
              </div>
            </div>
          </div>

          {/* Themes Explored */}
          <div>
            <div className="text-[11px] font-medium text-stone-400 uppercase tracking-wider mb-2.5 px-1 flex items-center justify-between">
              <span>Themes Explored</span>
              <span className="text-[10px] text-amber-400 font-normal">
                {uniqueThemes.length} continuous memories
              </span>
            </div>

            {uniqueThemes.length === 0 ? (
              <div className="bg-stone-850/40 border border-stone-800/80 rounded-xl p-4 text-center text-xs text-stone-500 italic">
                No themes extracted yet. Conclude a session to generate cross-session themes.
              </div>
            ) : (
              <div className="flex flex-wrap gap-2 bg-stone-850/40 border border-stone-800/80 rounded-xl p-3.5">
                {uniqueThemes.map((theme, i) => (
                  <span
                    key={i}
                    className="text-xs bg-amber-500/10 text-amber-300/90 border border-amber-500/20 px-2.5 py-1 rounded-full flex items-center gap-1.5"
                  >
                    <Sparkles className="w-3 h-3 text-amber-400 shrink-0" />
                    <span>{theme}</span>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Privacy & Cloud Architecture Guarantee */}
          <div className="bg-stone-850/60 border border-stone-800/90 rounded-xl p-4 space-y-2">
            <div className="flex items-center gap-2 text-xs font-medium text-stone-200">
              <Shield className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Security Constitution Guarantee</span>
            </div>
            <p className="text-[11px] text-stone-400 leading-relaxed">
              Your journal thoughts are strictly isolated under Firestore path <code className="text-stone-300 bg-stone-900 px-1 py-0.5 rounded font-mono">/users/{user.uid}</code>. Admin dashboards have zero access to your messages, summaries, or extracted themes.
            </p>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="pt-4 border-t border-stone-800 flex items-center justify-between">
          <button
            onClick={() => {
              onClose();
              onLogout();
            }}
            className="px-3.5 py-2 text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 border border-rose-900/40 rounded-xl text-xs font-medium transition-colors flex items-center gap-2 cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>

          <button
            onClick={onClose}
            className="px-4 py-2 bg-stone-800 hover:bg-stone-750 text-stone-200 text-xs font-medium rounded-xl transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
