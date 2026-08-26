import React, { useEffect, useState } from 'react';
import { Plus, PanelLeftClose, PanelLeft, LogOut, Loader2 } from 'lucide-react';
import { JournalSession } from '../types';
import { EchoApiClient } from '../lib/api';

interface SidebarProps {
  api: EchoApiClient;
  currentSessionId: string | null;
  isOpen: boolean;
  onToggle: () => void;
  onSelectSession: (session: JournalSession) => void;
  onNewSession: () => void;
  onLogout: () => void;
  userEmail: string;
}

export const Sidebar: React.FC<SidebarProps> = ({
  api,
  currentSessionId,
  isOpen,
  onToggle,
  onSelectSession,
  onNewSession,
  onLogout,
  userEmail,
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
            <div className="text-xs text-stone-400 px-2 py-4 italic">
              No previous reflections recorded.
            </div>
          ) : (
            sessions.map((sess) => {
              const isSelected = sess.sessionId === currentSessionId;
              const dateStr = new Date(sess.startedAt).toLocaleDateString([], {
                month: 'short',
                day: 'numeric',
              });

              return (
                <button
                  key={sess.sessionId}
                  onClick={() => onSelectSession(sess)}
                  className={`w-full text-left p-2.5 rounded-xl text-xs transition-colors cursor-pointer flex flex-col gap-0.5 ${
                    isSelected
                      ? 'bg-stone-850 text-stone-100 font-medium'
                      : 'text-stone-400 hover:text-stone-200 hover:bg-stone-900'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="text-stone-300 font-mono text-[11px]">{dateStr}</span>
                    {sess.endedAt && (
                      <span className="text-[10px] text-stone-400 font-sans">ended</span>
                    )}
                  </div>
                  <div className="truncate text-stone-400 group-hover:text-stone-300 text-[11px]">
                    {sess.extractedTheme ||
                      sess.messages?.find((m) => m.role === 'user')?.text ||
                      'Reflection session'}
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* User Account & Logout */}
        <div className="p-3 border-t border-stone-800/80 shrink-0 flex items-center justify-between text-xs text-stone-400">
          <div className="truncate max-w-[170px]" title={userEmail}>
            {userEmail}
          </div>
          <button
            onClick={onLogout}
            className="text-stone-400 hover:text-stone-200 p-1.5 rounded-lg hover:bg-stone-900 transition-colors"
            title="Sign out"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </aside>
    </>
  );
};
