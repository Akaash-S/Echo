import React, { useEffect, useState } from 'react';
import { Plus, PanelLeftClose, PanelLeft, LogOut, Loader2, MapPin, Shield, User } from 'lucide-react';
import { JournalSession } from '../types';
import { EchoApiClient } from '../lib/api';

interface SidebarProps {
  api: EchoApiClient;
  currentSessionId: string | null;
  isOpen: boolean;
  activeView?: 'journal' | 'profile';
  onToggle: () => void;
  onSelectSession: (session: JournalSession) => void;
  onNewSession: () => void;
  onLogout: () => void;
  onOpenRetrospectives: () => void;
  onOpenAdmin: () => void;
  onOpenProfile: () => void;
  userEmail: string;
  displayName?: string;
  photoURL?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({
  api,
  currentSessionId,
  isOpen,
  activeView = 'journal',
  onToggle,
  onSelectSession,
  onNewSession,
  onLogout,
  onOpenRetrospectives,
  onOpenAdmin,
  onOpenProfile,
  userEmail,
  displayName,
  photoURL,
}) => {
  const [sessions, setSessions] = useState<JournalSession[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchSessions = async () => {
    setIsLoading(true);
    try {
      const res = await api.listSessions();
      setSessions(res.sessions || []);
    } catch (err) {
      console.error('Failed to load past sessions', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, [currentSessionId]);

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          onClick={onToggle}
          className="fixed inset-0 bg-stone-950/60 z-30 lg:hidden backdrop-blur-xs"
        />
      )}

      <aside
        className={`fixed lg:static inset-y-0 left-0 z-40 w-72 bg-stone-950 border-r border-stone-800/80 flex flex-col transition-transform duration-200 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Sidebar Header */}
        <div className="h-14 border-b border-stone-800/80 px-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <span className="font-serif text-lg text-stone-100 font-normal">Echo</span>
          </div>

          <button
            onClick={onToggle}
            className="text-stone-400 hover:text-stone-200 p-1.5 rounded-lg lg:hidden"
            title="Close sidebar"
          >
            <PanelLeftClose className="w-4 h-4" />
          </button>
        </div>

        {/* New Session Action */}
        <div className="p-3">
          <button
            id="new-session-sidebar-btn"
            onClick={onNewSession}
            className="w-full py-2 px-3 bg-stone-900 hover:bg-stone-850 active:bg-stone-800 border border-stone-800 hover:border-stone-700 text-stone-200 text-xs font-medium rounded-xl flex items-center justify-between transition-colors cursor-pointer"
          >
            <span>New session</span>
            <Plus className="w-4 h-4 text-stone-400" />
          </button>
        </div>

        {/* Past Sessions List */}
        <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
          <div className="text-[11px] font-medium text-stone-400 px-2 py-1 tracking-wider uppercase">
            Recent Reflections
          </div>

          {isLoading && sessions.length === 0 ? (
            <div className="flex items-center justify-center py-8 text-stone-400">
              <Loader2 className="w-4 h-4 animate-spin" />
            </div>
          ) : sessions.length === 0 ? (
            <div className="text-xs text-stone-500 px-3 py-6 italic text-center">
              No previous reflections recorded.
            </div>
          ) : (
            sessions.map((sess) => {
              const isSelected = sess.sessionId === currentSessionId;
              const dateStr = new Date(sess.startedAt).toLocaleDateString([], {
                month: 'short',
                day: 'numeric',
              });
              const summaryExcerpt = sess.summary
                ? sess.summary.length > 80
                  ? `${sess.summary.slice(0, 80).trim()}…`
                  : sess.summary
                : null;

              return (
                <button
                  key={sess.sessionId}
                  onClick={() => onSelectSession(sess)}
                  className={`w-full text-left p-3 rounded-xl text-xs transition-all cursor-pointer flex flex-col gap-1.5 border group ${
                    isSelected
                      ? 'bg-stone-850 border-stone-700 text-stone-100 shadow-xs'
                      : 'bg-transparent border-transparent text-stone-400 hover:text-stone-200 hover:bg-stone-900 hover:border-stone-800/80'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1 w-full">
                    <span className="text-stone-300 font-mono text-[11px] font-medium shrink-0">
                      {dateStr}
                    </span>
                    {sess.extractedTheme ? (
                      <span className="text-[10px] bg-amber-500/10 text-amber-300/90 border border-amber-500/20 px-2 py-0.5 rounded-full font-sans max-w-[130px] truncate font-medium">
                        {sess.extractedTheme}
                      </span>
                    ) : !sess.endedAt ? (
                      <span className="text-[10px] text-stone-500 font-sans italic flex items-center gap-1 shrink-0">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400/70 animate-pulse" />
                        In progress
                      </span>
                    ) : null}
                  </div>

                  <div className="text-stone-400 group-hover:text-stone-300 text-[11px] leading-relaxed line-clamp-2">
                    {summaryExcerpt || (sess.endedAt ? 'Reflection completed' : 'In progress')}
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Feature Actions */}
        <div className="p-3 border-t border-stone-800/80 space-y-1">
          <button
            onClick={onOpenRetrospectives}
            className="w-full py-1.5 px-2.5 rounded-lg text-xs text-stone-400 hover:text-stone-200 hover:bg-stone-900 transition-colors flex items-center gap-2 cursor-pointer"
          >
            <MapPin className="w-3.5 h-3.5 text-amber-400/80" />
            <span>Place Retrospectives</span>
          </button>

          <button
            onClick={onOpenAdmin}
            className="w-full py-1.5 px-2.5 rounded-lg text-xs text-stone-400 hover:text-stone-200 hover:bg-stone-900 transition-colors flex items-center gap-2 cursor-pointer"
          >
            <Shield className="w-3.5 h-3.5 text-stone-400" />
            <span>Admin Metrics</span>
          </button>
        </div>

        {/* User Account & Profile Trigger */}
        <div className="p-3 border-t border-stone-800/80 shrink-0 flex items-center justify-between text-xs text-stone-400 gap-2">
          <button
            onClick={onOpenProfile}
            className={`flex-1 flex items-center gap-2.5 min-w-0 p-2 -ml-1 rounded-xl transition-all text-left cursor-pointer group border ${
              activeView === 'profile'
                ? 'bg-stone-850 border-stone-700 shadow-xs'
                : 'bg-transparent border-transparent hover:bg-stone-900 hover:border-stone-800/80'
            }`}
            title="View Profile Page & Personal Insights"
          >
            {photoURL ? (
              <img
                src={photoURL}
                alt={displayName || 'User'}
                className={`w-7 h-7 rounded-full border object-cover shrink-0 ${
                  activeView === 'profile' ? 'border-amber-400' : 'border-stone-700 group-hover:border-amber-500/50'
                }`}
              />
            ) : (
              <div className={`w-7 h-7 rounded-full bg-stone-800 border flex items-center justify-center text-amber-300 font-serif text-xs shrink-0 ${
                activeView === 'profile' ? 'border-amber-400' : 'border-stone-700 group-hover:border-amber-500/50'
              }`}>
                {displayName ? displayName.charAt(0).toUpperCase() : <User className="w-3.5 h-3.5" />}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className={`font-medium truncate text-xs ${
                activeView === 'profile' ? 'text-amber-200' : 'text-stone-200 group-hover:text-amber-200'
              }`}>
                {displayName || 'Journaler'}
              </div>
              <div className="truncate text-stone-500 text-[11px]" title={userEmail}>
                {userEmail}
              </div>
            </div>
          </button>

          <button
            onClick={onLogout}
            className="text-stone-400 hover:text-stone-200 p-2 rounded-lg hover:bg-stone-900 transition-colors shrink-0 cursor-pointer"
            title="Sign out"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </aside>
    </>
  );
};
