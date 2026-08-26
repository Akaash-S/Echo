import React from 'react';
import { Sparkles, BookOpen, ShieldCheck, LogOut, PlusCircle, User, ShieldAlert } from 'lucide-react';
import { AuthUser } from '../types';

interface NavbarProps {
  user: AuthUser;
  activeTab: 'journal' | 'archive' | 'security';
  onSelectTab: (tab: 'journal' | 'archive' | 'security') => void;
  onNewSession: () => void;
  onLogout: () => void;
  onSwitchUser: (newUser: AuthUser) => void;
  hasActiveSession: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  activeTab,
  onSelectTab,
  onNewSession,
  onLogout,
  onSwitchUser,
  hasActiveSession,
}) => {
  const [showUserMenu, setShowUserMenu] = React.useState(false);

  const demoUsers: AuthUser[] = [
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

  return (
    <header className="sticky top-0 z-30 bg-stone-900/95 backdrop-blur-md border-b border-stone-800 text-stone-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-6">
          <button
            id="brand-logo-btn"
            onClick={() => onSelectTab('journal')}
            className="flex items-center gap-2.5 text-left group"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-600 to-amber-400 flex items-center justify-center shadow-lg shadow-amber-500/10 text-stone-950 font-bold text-lg group-hover:scale-105 transition-transform">
              <Sparkles className="w-5 h-5 text-stone-950" />
            </div>
            <div>
              <div className="font-serif font-semibold text-lg tracking-tight text-stone-100 flex items-center gap-1.5">
                Echo
                <span className="text-[10px] font-sans font-medium uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  AI Journal
                </span>
              </div>
              <p className="text-xs text-stone-400 font-sans hidden sm:block">Reflective intelligence with memory</p>
            </div>
          </button>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-1 ml-4 bg-stone-950/60 p-1 rounded-xl border border-stone-800/80">
            <button
              id="nav-journal-tab"
              onClick={() => onSelectTab('journal')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${
                activeTab === 'journal'
                  ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30 shadow-sm'
                  : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800/50'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              Journal
            </button>
            <button
              id="nav-archive-tab"
              onClick={() => onSelectTab('archive')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${
                activeTab === 'archive'
                  ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30 shadow-sm'
                  : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800/50'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              Past Reflections
            </button>
            <button
              id="nav-security-tab"
              onClick={() => onSelectTab('security')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${
                activeTab === 'security'
                  ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30 shadow-sm'
                  : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800/50'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              Security & Rules
            </button>
          </nav>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-3">
          {/* New Session Button */}
          <button
            id="start-new-session-btn"
            onClick={onNewSession}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-medium bg-amber-500 hover:bg-amber-400 text-stone-950 font-semibold shadow-md shadow-amber-500/10 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <PlusCircle className="w-4 h-4" />
            <span className="hidden sm:inline">New Session</span>
          </button>

          {/* User Account / Multi-profile switcher */}
          <div className="relative">
            <button
              id="user-profile-menu-toggle"
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-stone-800/80 hover:bg-stone-800 border border-stone-700/60 text-xs text-stone-200 transition-colors"
            >
              <div className="w-6 h-6 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 flex items-center justify-center font-bold text-xs">
                {user.displayName.charAt(0)}
              </div>
              <span className="max-w-[100px] truncate hidden sm:inline">{user.displayName}</span>
            </button>

            {showUserMenu && (
              <div
                id="user-dropdown-menu"
                className="absolute right-0 mt-2 w-72 rounded-2xl bg-stone-900 border border-stone-800 shadow-2xl p-3 z-50 text-stone-200"
              >
                <div className="pb-3 border-b border-stone-800 mb-2">
                  <p className="text-xs font-semibold text-stone-100">{user.displayName}</p>
                  <p className="text-[11px] text-stone-400 truncate">{user.email}</p>
                  <div className="mt-1.5 flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-950/40 border border-emerald-800/40 px-2 py-0.5 rounded-md">
                    <ShieldCheck className="w-3 h-3" />
                    <span>UID: {user.uid} (Isolated)</span>
                  </div>
                </div>

                <div className="mb-2">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-stone-400 px-1 mb-1">
                    Switch Test Account (Test Data Isolation)
                  </p>
                  {demoUsers.map((u) => (
                    <button
                      key={u.uid}
                      onClick={() => {
                        onSwitchUser(u);
                        setShowUserMenu(false);
                      }}
                      className={`w-full text-left px-2 py-1.5 rounded-lg text-xs flex items-center justify-between transition-colors ${
                        u.uid === user.uid ? 'bg-amber-500/20 text-amber-300' : 'hover:bg-stone-800 text-stone-300'
                      }`}
                    >
                      <span className="truncate">{u.displayName}</span>
                      {u.uid === user.uid && <span className="text-[10px] text-amber-400 font-bold">Active</span>}
                    </button>
                  ))}
                </div>

                <button
                  id="logout-btn"
                  onClick={() => {
                    setShowUserMenu(false);
                    onLogout();
                  }}
                  className="w-full mt-1 pt-2 border-t border-stone-800 text-left px-2 py-1.5 rounded-lg text-xs text-rose-400 hover:bg-rose-950/30 flex items-center gap-1.5 transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
