import React, { useEffect, useState } from 'react';
import { 
  User, 
  ArrowLeft, 
  Sparkles, 
  BookOpen, 
  MapPin, 
  Shield, 
  LogOut, 
  Check, 
  Copy, 
  Calendar, 
  Award,
  ChevronRight,
  Plus,
  MessageSquarePlus
} from 'lucide-react';
import { AuthUser, JournalSession } from '../types';
import { EchoApiClient } from '../lib/api';

interface ProfileViewProps {
  api: EchoApiClient;
  user: AuthUser;
  onBackToJournal: () => void;
  onSelectSession: (session: JournalSession) => void;
  onStartNewSession: (prompt?: string) => void;
  onLogout: () => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({
  api,
  user,
  onBackToJournal,
  onSelectSession,
  onStartNewSession,
  onLogout,
}) => {
  const [sessions, setSessions] = useState<JournalSession[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [copiedUid, setCopiedUid] = useState(false);

  useEffect(() => {
    fetchUserStats();
  }, []);

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

  // Profile Analytics
  const totalSessions = sessions.length;
  const completedSessions = sessions.filter((s) => Boolean(s.endedAt)).length;
  const geotaggedSessions = sessions.filter((s) => Boolean(s.location)).length;
  
  // Extract unique themes and count occurrences
  const themeCounts: Record<string, number> = {};
  sessions.forEach((s) => {
    if (s.extractedTheme && s.extractedTheme.trim()) {
      const t = s.extractedTheme.trim();
      themeCounts[t] = (themeCounts[t] || 0) + 1;
    }
  });

  const uniqueThemes = Object.entries(themeCounts).sort((a, b) => b[1] - a[1]);

  // Earliest session date
  const earliestDate = sessions.length > 0
    ? new Date(Math.min(...sessions.map((s) => new Date(s.startedAt).getTime()))).toLocaleDateString([], {
        month: 'short',
        year: 'numeric',
      })
    : 'Recently';

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto bg-stone-900 text-stone-100">
      {/* Top Header Bar */}
      <div className="h-14 border-b border-stone-800/80 px-6 sm:px-8 flex items-center justify-between shrink-0 bg-stone-900/90 backdrop-blur-md sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button
            onClick={onBackToJournal}
            className="flex items-center gap-1.5 text-xs text-stone-400 hover:text-stone-200 transition-colors p-1.5 -ml-1.5 rounded-lg hover:bg-stone-800 cursor-pointer"
            title="Return to active reflection"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Back to Journal</span>
          </button>
          <span className="text-stone-600 hidden sm:inline">•</span>
          <span className="font-serif text-sm text-stone-200">Journaler Profile</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onStartNewSession()}
            className="px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-medium rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Reflection</span>
          </button>
        </div>
      </div>

      {/* Main Profile Content Container */}
      <div className="max-w-4xl w-full mx-auto px-6 sm:px-8 py-8 space-y-8">
        {/* User Identity Hero Card */}
        <div className="bg-stone-850/80 border border-stone-800 rounded-3xl p-6 sm:p-8 relative overflow-hidden shadow-lg">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
            {/* Avatar */}
            {user.photoURL ? (
              <img
                src={user.photoURL}
                alt={user.displayName}
                className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl border-2 border-amber-500/30 object-cover shadow-md shrink-0"
              />
            ) : (
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-gradient-to-br from-amber-600/30 to-stone-800 border-2 border-amber-500/30 flex items-center justify-center text-amber-300 text-3xl font-serif font-medium shadow-md shrink-0">
                {user.displayName ? user.displayName.charAt(0).toUpperCase() : 'J'}
              </div>
            )}

            {/* Details */}
            <div className="flex-1 min-w-0 space-y-2">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-2xl sm:text-3xl font-serif text-stone-100 font-normal tracking-tight truncate">
                  {user.displayName || 'Echo Journaler'}
                </h1>
                <span className="text-xs bg-amber-500/10 text-amber-300 border border-amber-500/20 px-2.5 py-0.5 rounded-full font-medium">
                  Google Account
                </span>
              </div>

              <p className="text-sm text-stone-400 truncate">{user.email}</p>

              <div className="flex flex-wrap items-center gap-4 pt-1 text-xs text-stone-500 font-mono">
                <div className="flex items-center gap-1.5 bg-stone-900/80 px-2.5 py-1 rounded-lg border border-stone-800">
                  <span>UID: {user.uid.slice(0, 14)}…</span>
                  <button
                    onClick={handleCopyUid}
                    className="text-stone-400 hover:text-stone-200 p-0.5 transition-colors cursor-pointer"
                    title="Copy full UID"
                  >
                    {copiedUid ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>

                <div className="flex items-center gap-1.5 text-stone-400 font-sans">
                  <Calendar className="w-3.5 h-3.5 text-stone-500" />
                  <span>Journaling since {earliestDate}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Reflection Insights & Analytics */}
        <div>
          <h2 className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-3 px-1">
            Reflection Activity & Metrics
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-stone-850/60 border border-stone-800 rounded-2xl p-5 space-y-2">
              <div className="flex items-center justify-between text-stone-400 text-xs">
                <span className="font-medium">Total Reflections</span>
                <BookOpen className="w-4 h-4 text-amber-400" />
              </div>
              <div className="text-3xl font-serif font-semibold text-stone-100">
                {isLoading ? '…' : totalSessions}
              </div>
              <p className="text-[11px] text-stone-500">
                Total dialogue sessions initiated
              </p>
            </div>

            <div className="bg-stone-850/60 border border-stone-800 rounded-2xl p-5 space-y-2">
              <div className="flex items-center justify-between text-stone-400 text-xs">
                <span className="font-medium">Synthesized Sessions</span>
                <Award className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-3xl font-serif font-semibold text-emerald-300">
                {isLoading ? '…' : completedSessions}
              </div>
              <p className="text-[11px] text-stone-500">
                Sessions synthesized into themes & summaries
              </p>
            </div>

            <div className="bg-stone-850/60 border border-stone-800 rounded-2xl p-5 space-y-2">
              <div className="flex items-center justify-between text-stone-400 text-xs">
                <span className="font-medium">Geotagged Locations</span>
                <MapPin className="w-4 h-4 text-sky-400" />
              </div>
              <div className="text-3xl font-serif font-semibold text-sky-300">
                {isLoading ? '…' : geotaggedSessions}
              </div>
              <p className="text-[11px] text-stone-500">
                Reflections anchored with place context
              </p>
            </div>
          </div>
        </div>

        {/* Continuous Themes Explored */}
        <div>
          <div className="flex items-center justify-between mb-3 px-1">
            <h2 className="text-xs font-semibold text-stone-400 uppercase tracking-wider">
              Continuous Themes Explored
            </h2>
            <span className="text-xs text-amber-400 font-medium">
              {uniqueThemes.length} continuous memories
            </span>
          </div>

          {uniqueThemes.length === 0 ? (
            <div className="bg-stone-850/40 border border-stone-800 rounded-2xl p-8 text-center text-xs text-stone-500 italic space-y-2">
              <Sparkles className="w-6 h-6 text-stone-600 mx-auto" />
              <p>No themes extracted yet. As you conclude reflections, Echo will synthesize continuous topics here.</p>
            </div>
          ) : (
            <div className="bg-stone-850/50 border border-stone-800 rounded-2xl p-5">
              <div className="flex flex-wrap gap-2.5">
                {uniqueThemes.map(([theme, count], idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      onStartNewSession(`Continuing our reflection on "${theme}": `);
                      onBackToJournal();
                    }}
                    className="bg-amber-500/10 hover:bg-amber-500/20 text-amber-200 border border-amber-500/25 hover:border-amber-500/50 px-3.5 py-2 rounded-xl text-xs flex items-center gap-2 shadow-2xs transition-all cursor-pointer group"
                    title={`Start new reflection conversation on "${theme}"`}
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0 group-hover:rotate-12 transition-transform" />
                    <span className="font-medium">{theme}</span>
                    {count > 1 && (
                      <span className="text-[10px] bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded-md font-mono">
                        ×{count}
                      </span>
                    )}
                    <span className="text-[10px] text-amber-400 opacity-70 group-hover:opacity-100 transition-opacity ml-1">
                      • Reflect →
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Recent Reflections Timeline */}
        <div>
          <h2 className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-3 px-1">
            Recent Reflection History
          </h2>
          <div className="bg-stone-850/50 border border-stone-800 rounded-2xl divide-y divide-stone-800 overflow-hidden">
            {sessions.length === 0 ? (
              <div className="p-8 text-center text-xs text-stone-500 italic">
                No past sessions recorded yet.
              </div>
            ) : (
              sessions.slice(0, 5).map((sess) => {
                const dateStr = new Date(sess.startedAt).toLocaleDateString([], {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                });

                return (
                  <div
                    key={sess.sessionId}
                    onClick={() => {
                      onSelectSession(sess);
                      onBackToJournal();
                    }}
                    className="p-4 sm:p-5 hover:bg-stone-800/60 transition-colors cursor-pointer flex items-center justify-between gap-4 group"
                  >
                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-stone-300 font-medium">
                          {dateStr}
                        </span>
                        {sess.extractedTheme && (
                          <span className="text-[10px] bg-amber-500/10 text-amber-300 border border-amber-500/20 px-2 py-0.5 rounded-full font-medium">
                            {sess.extractedTheme}
                          </span>
                        )}
                        {sess.location && (
                          <span className="text-[10px] text-stone-400 flex items-center gap-0.5">
                            <MapPin className="w-3 h-3 text-sky-400" />
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-stone-400 line-clamp-1 group-hover:text-stone-300">
                        {sess.summary || (sess.endedAt ? 'Reflection completed' : 'Reflection in progress…')}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onStartNewSession(
                            sess.extractedTheme
                              ? `Continuing my reflection on "${sess.extractedTheme}": `
                              : undefined
                          );
                          onBackToJournal();
                        }}
                        className="px-2.5 py-1.5 rounded-lg bg-stone-800 hover:bg-amber-500/20 text-stone-400 hover:text-amber-300 border border-stone-700 hover:border-amber-500/40 transition-colors text-xs flex items-center gap-1.5 cursor-pointer"
                        title="Start a new conversation on this reflection"
                      >
                        <MessageSquarePlus className="w-3.5 h-3.5 text-amber-400" />
                        <span className="text-[11px] hidden sm:inline">Start in new chat</span>
                      </button>
                      <ChevronRight className="w-4 h-4 text-stone-500 group-hover:text-stone-300 shrink-0 transition-transform group-hover:translate-x-0.5" />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Security & Privacy Architecture */}
        <div className="bg-stone-850/40 border border-stone-800 rounded-2xl p-6 space-y-3">
          <div className="flex items-center gap-2.5 text-stone-200">
            <Shield className="w-5 h-5 text-amber-400" />
            <h3 className="font-serif text-base font-normal">Security Constitution & Privacy Isolation</h3>
          </div>
          <p className="text-xs text-stone-400 leading-relaxed">
            Echo is architected with strict tenant isolation. All of your journal entries, AI turns, summaries, and extracted themes reside exclusively under your private path <code className="text-stone-300 bg-stone-900 px-1.5 py-0.5 rounded font-mono">/users/{user.uid}</code> in Google Cloud Firestore.
          </p>
          <div className="flex flex-wrap items-center gap-4 pt-2 text-[11px] text-stone-400">
            <div className="flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span>Zero cross-user data leakage</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span>Admin endpoints have 0 access to reflection text</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span>Cryptographic Firebase token validation</span>
            </div>
          </div>
        </div>

        {/* Account Actions */}
        <div className="pt-4 border-t border-stone-800 flex items-center justify-between">
          <button
            onClick={onLogout}
            className="px-4 py-2.5 text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 border border-rose-900/40 rounded-xl text-xs font-medium transition-colors flex items-center gap-2 cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out of Echo</span>
          </button>

          <button
            onClick={onBackToJournal}
            className="px-5 py-2.5 bg-stone-800 hover:bg-stone-750 text-stone-200 text-xs font-medium rounded-xl transition-colors cursor-pointer"
          >
            Return to Reflection
          </button>
        </div>
      </div>
    </div>
  );
};
