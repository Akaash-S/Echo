import React from 'react';
import { Settings, X, Shield, MapPin, Sparkles, Moon, Cpu, Command } from 'lucide-react';
import { AuthUser } from '../types';

interface SettingsModalProps {
  user: AuthUser;
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  user,
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-stone-900 border border-stone-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-stone-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-stone-800 border border-stone-700 flex items-center justify-center text-stone-300">
              <Settings className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-serif text-base text-stone-100 font-normal">Settings</h3>
              <p className="text-xs text-stone-400">Application preferences & reflection configuration</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-stone-400 hover:text-stone-200 p-1.5 rounded-lg hover:bg-stone-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Settings Options List */}
        <div className="space-y-4 py-1">
          {/* Appearance */}
          <div className="bg-stone-850/60 border border-stone-800 rounded-xl p-3.5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Moon className="w-4 h-4 text-amber-400" />
              <div>
                <div className="text-xs font-medium text-stone-200">Theme</div>
                <div className="text-[11px] text-stone-400">Warm Obsidian Dark Mode</div>
              </div>
            </div>
            <span className="text-[10px] bg-stone-800 text-amber-300/90 border border-stone-700 px-2 py-0.5 rounded font-mono">
              Active
            </span>
          </div>

          {/* AI Engine */}
          <div className="bg-stone-850/60 border border-stone-800 rounded-xl p-3.5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Cpu className="w-4 h-4 text-emerald-400" />
              <div>
                <div className="text-xs font-medium text-stone-200">AI Reflection Engine</div>
                <div className="text-[11px] text-stone-400">Gemini 2.5 Flash on Vertex AI / Google GenAI</div>
              </div>
            </div>
            <span className="text-[10px] bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 px-2 py-0.5 rounded font-mono">
              Connected
            </span>
          </div>

          {/* Geolocation */}
          <div className="bg-stone-850/60 border border-stone-800 rounded-xl p-3.5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <MapPin className="w-4 h-4 text-sky-400" />
              <div>
                <div className="text-xs font-medium text-stone-200">Location Anchoring</div>
                <div className="text-[11px] text-stone-400">Place retrospectives across repeat reflection visits</div>
              </div>
            </div>
            <span className="text-[10px] bg-sky-500/10 text-sky-300 border border-sky-500/20 px-2 py-0.5 rounded font-mono">
              Enforced
            </span>
          </div>

          {/* Security & Tenant Isolation */}
          <div className="bg-stone-850/60 border border-stone-800 rounded-xl p-3.5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Shield className="w-4 h-4 text-amber-400" />
              <div>
                <div className="text-xs font-medium text-stone-200">Security Constitution</div>
                <div className="text-[11px] text-stone-400 font-mono">/users/{user.uid.slice(0, 8)}…</div>
              </div>
            </div>
            <span className="text-[10px] bg-amber-500/10 text-amber-300 border border-amber-500/20 px-2 py-0.5 rounded font-mono">
              Isolated
            </span>
          </div>

          {/* Keyboard Shortcuts */}
          <div className="bg-stone-850/40 border border-stone-800 rounded-xl p-3.5 space-y-2">
            <div className="flex items-center gap-2 text-xs text-stone-300 font-medium">
              <Command className="w-3.5 h-3.5 text-stone-400" />
              <span>Keyboard Shortcuts</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[11px] text-stone-400 font-mono">
              <div className="flex items-center justify-between bg-stone-900/80 p-2 rounded border border-stone-800">
                <span>Send message</span>
                <kbd className="bg-stone-800 text-stone-300 px-1.5 py-0.5 rounded text-[10px]">Enter</kbd>
              </div>
              <div className="flex items-center justify-between bg-stone-900/80 p-2 rounded border border-stone-800">
                <span>New line in chat</span>
                <kbd className="bg-stone-800 text-stone-300 px-1.5 py-0.5 rounded text-[10px]">Shift + Enter</kbd>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-stone-800 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-stone-800 hover:bg-stone-750 text-stone-200 text-xs font-medium rounded-xl transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
