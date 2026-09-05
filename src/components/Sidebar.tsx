import React, { useEffect, useState, useRef } from 'react';
import { Plus, PanelLeftClose, PanelLeft, LogOut, Loader2, Trash2, User, MapPin, Shield, Settings, ChevronUp } from 'lucide-react';
import { JournalSession } from '../types';
import { EchoApiClient } from '../lib/api';

interface SidebarProps {
  api: EchoApiClient;
  currentSessionId: string | null;
  isOpen: boolean;
  onToggle: () => void;
  onSelectSession: (session: JournalSession) => void;
  onNewSession: () => void;
  onDeleteSession: (sessionId: string) => Promise<void>;
  onLogout: () => void;
  onOpenProfile: () => void;
  onOpenRetrospectives: () => void;
  onOpenAdmin: () => void;
  onOpenSettings: () => void;
  userEmail: string;
  displayName?: string;
  photoURL?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({
  api,
  currentSessionId,
  isOpen,
  onToggle,
  onSelectSession,
  onNewSession,
  onDeleteSession,
  onLogout,
  onOpenProfile,
  onOpenRetrospectives,
  onOpenAdmin,
  onOpenSettings,
  userEmail,
  displayName,
  photoURL,
}) => {
  const [sessions, setSessions] = useState<JournalSession[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

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

  // Click outside listener for the popover menu
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMenuOpen]);

  const handleDelete = async (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation();
    if (window.confirm('Delete this reflection permanently?')) {
      setDeletingId(sessionId);
      try {
        await onDeleteSession(sessionId);
        setSessions((prev) => prev.filter((s) => s.sessionId !== sessionId));
      } catch (err) {
        console.error('Failed to delete session:', err);
      } finally {
        setDeletingId(null);
      }
    }
  };

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
                ? sess.summary.length > 70
                  ? `${sess.summary.slice(0, 70).trim()}…`
                  : sess.summary
                : null;

              return (
                <div
                  key={sess.sessionId}
                  onClick={() => onSelectSession(sess)}
                  className={`w-full text-left p-3 rounded-xl text-xs transition-all cursor-pointer flex flex-col gap-1.5 border group relative ${
                    isSelected
                      ? 'bg-stone-850 border-stone-700 text-stone-100 shadow-xs'
                      : 'bg-transparent border-transparent text-stone-400 hover:text-stone-200 hover:bg-stone-900 hover:border-stone-800/80'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1 w-full">
                    <span className="text-stone-300 font-mono text-[11px] font-medium shrink-0">
                      {dateStr}
                    </span>
                    <div className="flex items-center gap-1.5">
                      {sess.extractedTheme ? (
                        <span className="text-[10px] bg-amber-500/10 text-amber-300/90 border border-amber-500/20 px-2 py-0.5 rounded-full font-sans max-w-[100px] truncate font-medium">
                          {sess.extractedTheme}
                        </span>
                      ) : !sess.endedAt ? (
                        <span className="text-[10px] text-stone-500 font-sans italic flex items-center gap-1 shrink-0">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400/70 animate-pulse" />
                          In progress
                        </span>
                      ) : null}

                      {/* Hover Delete Action Button */}
                      <button
                        onClick={(e) => handleDelete(e, sess.sessionId)}
                        disabled={deletingId === sess.sessionId}
                        className="opacity-0 group-hover:opacity-100 p-1 text-stone-500 hover:text-rose-400 hover:bg-stone-800 rounded transition-all cursor-pointer shrink-0"
                        title="Delete reflection"
                      >
                        {deletingId === sess.sessionId ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-rose-400" />
                        ) : (
                          <Trash2 className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="text-stone-400 group-hover:text-stone-300 text-[11px] leading-relaxed line-clamp-2 pr-2">
                    {summaryExcerpt || (sess.endedAt ? 'Reflection completed' : 'In progress')}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* User Footer with Floating Popover Mini-Menu */}
        <div ref={menuRef} className="p-3 border-t border-stone-800/80 shrink-0 relative">
          {/* Popover Mini-Menu over the sidebar */}
          {isMenuOpen && (
            <div className="absolute bottom-16 left-3 right-3 bg-stone-900 border border-stone-750 rounded-2xl p-1.5 shadow-2xl z-50 animate-in fade-in slide-in-from-bottom-2 duration-150 divide-y divide-stone-800">
              {/* Profile Header */}
              <div className="px-3 py-2 text-xs">
                <p className="font-medium text-stone-200 truncate">{displayName || 'Journaler'}</p>
                <p className="text-stone-500 text-[11px] truncate">{userEmail}</p>
              </div>

              {/* Navigation Options */}
              <div className="py-1 space-y-0.5">
                <button
                  onClick={() => {
                    setIsMenuOpen(false);
                    onOpenProfile();
                  }}
                  className="w-full px-2.5 py-1.5 rounded-lg text-xs text-stone-300 hover:text-stone-100 hover:bg-stone-800 flex items-center gap-2.5 transition-colors cursor-pointer text-left"
                >
                  <User className="w-3.5 h-3.5 text-amber-400" />
                  <span>Profile Page</span>
                </button>

                <button
                  onClick={() => {
                    setIsMenuOpen(false);
                    onOpenRetrospectives();
                  }}
                  className="w-full px-2.5 py-1.5 rounded-lg text-xs text-stone-300 hover:text-stone-100 hover:bg-stone-800 flex items-center gap-2.5 transition-colors cursor-pointer text-left"
                >
                  <MapPin className="w-3.5 h-3.5 text-sky-400" />
                  <span>Place Retrospectives</span>
                </button>

                <button
                  onClick={() => {
                    setIsMenuOpen(false);
                    onOpenAdmin();
                  }}
                  className="w-full px-2.5 py-1.5 rounded-lg text-xs text-stone-300 hover:text-stone-100 hover:bg-stone-800 flex items-center gap-2.5 transition-colors cursor-pointer text-left"
                >
                  <Shield className="w-3.5 h-3.5 text-stone-400" />
                  <span>Admin Metrics</span>
                </button>

                <button
                  onClick={() => {
                    setIsMenuOpen(false);
                    onOpenSettings();
                  }}
                  className="w-full px-2.5 py-1.5 rounded-lg text-xs text-stone-300 hover:text-stone-100 hover:bg-stone-800 flex items-center gap-2.5 transition-colors cursor-pointer text-left"
                >
                  <Settings className="w-3.5 h-3.5 text-stone-400" />
                  <span>Settings</span>
                </button>
              </div>

              {/* Sign Out */}
              <div className="pt-1">
                <button
                  onClick={() => {
                    setIsMenuOpen(false);
                    onLogout();
                  }}
                  className="w-full px-2.5 py-1.5 rounded-lg text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 flex items-center gap-2.5 transition-colors cursor-pointer text-left"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          )}

          {/* User Account Button in Sidebar Footer */}
          <div className="flex items-center justify-between text-xs text-stone-400 gap-2">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="flex-1 flex items-center gap-2.5 min-w-0 p-2 -ml-1 rounded-xl transition-all text-left cursor-pointer group hover:bg-stone-900 border border-transparent hover:border-stone-800"
              title="Account menu"
            >
              {photoURL ? (
                <img
                  src={photoURL}
                  alt={displayName || 'User'}
                  className="w-7 h-7 rounded-full border border-stone-700 object-cover shrink-0 group-hover:border-amber-500/50"
                />
              ) : (
                <div className="w-7 h-7 rounded-full bg-stone-800 border border-stone-700 flex items-center justify-center text-amber-300 font-serif text-xs shrink-0 group-hover:border-amber-500/50">
                  {displayName ? displayName.charAt(0).toUpperCase() : <User className="w-3.5 h-3.5" />}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate text-xs text-stone-200 group-hover:text-amber-200">
                  {displayName || 'Journaler'}
                </div>
                <div className="truncate text-stone-500 text-[11px]" title={userEmail}>
                  {userEmail}
                </div>
              </div>
              <ChevronUp className={`w-3.5 h-3.5 text-stone-500 transition-transform ${isMenuOpen ? 'rotate-180' : ''}`} />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};


