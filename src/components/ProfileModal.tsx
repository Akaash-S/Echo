import React, { useEffect, useState } from 'react';
import { 
  User, 
  X, 
  Sparkles, 
  BookOpen, 
  MapPin, 
  Shield, 
  LogOut, 
  Check, 
  Copy, 
  ChevronRight,
  Award
} from 'lucide-react';
import { AuthUser, JournalSession } from '../types';
import { EchoApiClient } from '../lib/api';

interface ProfileModalProps {
  api: EchoApiClient;
  user: AuthUser;
  isOpen: boolean;
  onClose: () => void;
  onOpenRetrospectives: () => void;
  onOpenAdmin: () => void;
  onLogout: () => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({
  api,
  user,
  isOpen,
  onClose,
  onOpenRetrospectives,
  onOpenAdmin,
  onLogout,
}) => {
  const [sessions, setSessions] = useState<JournalSession[]>([]);
  const [copiedUid, setCopiedUid] = useState(false);

  useEffect(() => {
    if (isOpen) {
      api.listSessions()
        .then((res) => setSessions(res.sessions || []))
        .catch((err) => console.warn('Failed to load profile stats:', err));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCopyUid = () => {
    navigator.clipboard.writeText(user.uid);
    setCopiedUid(true);
    setTimeout(() => setCopiedUid(false), 2000);
  };

  const totalSessions = sessions.length;
  const completedSessions = sessions.filter((s) => Boolean(s.endedAt)).length;
  const geotaggedSessions = sessions.filter((s) => Boolean(s.location)).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-stone-900 border border-stone-800 rounded-2xl max-w-md w-full p-6 shadow-2xl relative overflow-hidden space-y-5">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-stone-800">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-amber-400" />
            <h3 className="font-serif text-base text-stone-100 font-normal">Journaler Profile</h3>
          </div>
          <button
            onClick={onClose}
            className="text-stone-400 hover:text-stone-200 p-1.5 rounded-lg hover:bg-stone-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* User Card */}
        <div className="flex items-center gap-3.5 bg-stone-850/80 border border-stone-800 rounded-xl p-3.5">
          {user.photoURL ? (
            <img
              src={user.photoURL}
              alt={user.displayName}
              className="w-12 h-12 rounded-full border border-amber-500/30 object-cover shrink-0"
            />
          ) : (
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-600/30 to-stone-800 border border-amber-500/30 flex items-center justify-center text-amber-300 text-lg font-serif font-medium shrink-0">
              {user.displayName ? user.displayName.charAt(0).toUpperCase() : 'J'}
            </div>
          )}

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-medium text-stone-100 truncate">
                {user.displayName || 'Journaler'}
              </h4>
              <span className="text-[10px] bg-stone-800 text-stone-300 border border-stone-700 px-1.5 py-0.2 rounded">
                Google
              </span>
            </div>
            <p className="text-xs text-stone-400 truncate mt-0.5">{user.email}</p>
            <div className="flex items-center gap-1.5 mt-1.5 text-[10px] text-stone-500 font-mono">
              <span>UID: {user.uid.slice(0, 12)}…</span>
              <button
                onClick={handleCopyUid}
                className="text-stone-400 hover:text-stone-200 p-0.5"
                title="Copy UID"
              >
                {copiedUid ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              </button>
            </div>
          </div>
        </div>

        {/* Activity Quick Stats */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-stone-850/50 border border-stone-800 rounded-lg p-2.5">
            <div className="text-base font-serif font-semibold text-amber-300">{totalSessions}</div>
            <div className="text-[10px] text-stone-400 flex items-center justify-center gap-1 mt-0.5">
              <BookOpen className="w-3 h-3" />
              <span>Reflections</span>
            </div>
          </div>
          <div className="bg-stone-850/50 border border-stone-800 rounded-lg p-2.5">
            <div className="text-base font-serif font-semibold text-emerald-300">{completedSessions}</div>
            <div className="text-[10px] text-stone-400 flex items-center justify-center gap-1 mt-0.5">
              <Award className="w-3 h-3" />
              <span>Synthesized</span>
            </div>
          </div>
          <div className="bg-stone-850/50 border border-stone-800 rounded-lg p-2.5">
            <div className="text-base font-serif font-semibold text-sky-300">{geotaggedSessions}</div>
            <div className="text-[10px] text-stone-400 flex items-center justify-center gap-1 mt-0.5">
              <MapPin className="w-3 h-3" />
              <span>Geotagged</span>
            </div>
          </div>
        </div>

        {/* Modal Navigation Buttons: Place Retrospectives & Admin Metrics */}
        <div className="space-y-2 pt-1">
          <button
            onClick={() => {
              onClose();
              onOpenRetrospectives();
            }}
            className="w-full p-3 bg-stone-850 hover:bg-stone-800 border border-stone-750 hover:border-amber-500/40 rounded-xl text-xs text-stone-200 flex items-center justify-between transition-colors cursor-pointer group"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                <MapPin className="w-3.5 h-3.5" />
              </div>
              <div className="text-left">
                <div className="font-medium text-stone-200 group-hover:text-amber-200">Place Retrospectives</div>
                <div className="text-[10px] text-stone-400">Multi-session memories clustered by location</div>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-stone-500 group-hover:text-stone-300 group-hover:translate-x-0.5 transition-transform" />
          </button>

          <button
            onClick={() => {
              onClose();
              onOpenAdmin();
            }}
            className="w-full p-3 bg-stone-850 hover:bg-stone-800 border border-stone-750 hover:border-stone-600 rounded-xl text-xs text-stone-200 flex items-center justify-between transition-colors cursor-pointer group"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-stone-800 border border-stone-700 flex items-center justify-center text-stone-400 group-hover:text-stone-300">
                <Shield className="w-3.5 h-3.5" />
              </div>
              <div className="text-left">
                <div className="font-medium text-stone-200">Admin Metrics</div>
                <div className="text-[10px] text-stone-400">System health & aggregate statistics</div>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-stone-500 group-hover:text-stone-300 group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>

        {/* Modal Footer */}
        <div className="pt-3 border-t border-stone-800 flex items-center justify-between">
          <button
            onClick={() => {
              onClose();
              onLogout();
            }}
            className="px-3 py-1.5 text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 border border-rose-900/40 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>

          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-stone-800 hover:bg-stone-750 text-stone-200 text-xs font-medium rounded-lg transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
