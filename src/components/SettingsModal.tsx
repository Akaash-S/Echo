import React, { useState, useEffect } from 'react';
import {
  Settings,
  X,
  Shield,
  MapPin,
  Sparkles,
  Moon,
  Cpu,
  Command,
  Compass,
  RefreshCw,
  Download,
  Check,
  Copy,
  Bell,
  Trash2,
  Sliders,
  CheckCircle2,
  Loader2,
} from 'lucide-react';
import { AuthUser, LocationCoords } from '../types';
import { EchoApiClient } from '../lib/api';

interface SettingsModalProps {
  api: EchoApiClient;
  user: AuthUser;
  userLocation?: LocationCoords | null;
  isOpen: boolean;
  onClose: () => void;
  onLocationUpdated?: (coords: LocationCoords) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  api,
  user,
  userLocation,
  isOpen,
  onClose,
  onLocationUpdated,
}) => {
  // 1. Theme state
  const [activeTheme, setActiveTheme] = useState<'obsidian' | 'midnight' | 'forest'>(() => {
    return (localStorage.getItem('echo_theme_preset') as any) || 'obsidian';
  });

  // 2. Reflection style state
  const [reflectionStyle, setReflectionStyle] = useState<'balanced' | 'socratic' | 'empathetic' | 'action'>(() => {
    return (localStorage.getItem('echo_reflection_style') as any) || 'balanced';
  });

  // 3. Reminders toggle
  const [enableReminders, setEnableReminders] = useState<boolean>(() => {
    const saved = localStorage.getItem('echo_reminders_enabled');
    return saved !== null ? saved === 'true' : true;
  });

  // 4. Geolocation refresh state
  const [isRefreshingLocation, setIsRefreshingLocation] = useState(false);
  const [locationSuccessMsg, setLocationSuccessMsg] = useState<string | null>(null);
  const [locationErrorMsg, setLocationErrorMsg] = useState<string | null>(null);

  // 5. Export state
  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);

  // 6. Copy UID state
  const [copiedUid, setCopiedUid] = useState(false);

  // 7. Clear cache state
  const [clearedCache, setClearedCache] = useState(false);

  // Active subtab
  const [activeTab, setActiveTab] = useState<'general' | 'ai' | 'location' | 'privacy'>('general');

  useEffect(() => {
    localStorage.setItem('echo_theme_preset', activeTheme);
  }, [activeTheme]);

  useEffect(() => {
    localStorage.setItem('echo_reflection_style', reflectionStyle);
  }, [reflectionStyle]);

  useEffect(() => {
    localStorage.setItem('echo_reminders_enabled', String(enableReminders));
  }, [enableReminders]);

  if (!isOpen) return null;

  const handleCopyUid = () => {
    navigator.clipboard.writeText(user.uid);
    setCopiedUid(true);
    setTimeout(() => setCopiedUid(false), 2000);
  };

  const handleRefreshLocation = () => {
    if (!navigator.geolocation) {
      setLocationErrorMsg('Geolocation is not supported by your browser.');
      return;
    }
    setIsRefreshingLocation(true);
    setLocationSuccessMsg(null);
    setLocationErrorMsg(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsRefreshingLocation(false);
        const coords: LocationCoords = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        };
        setLocationSuccessMsg('GPS coordinates updated successfully.');
        if (onLocationUpdated) {
          onLocationUpdated(coords);
        }
        setTimeout(() => setLocationSuccessMsg(null), 3000);
      },
      (err) => {
        setIsRefreshingLocation(false);
        setLocationErrorMsg(err.message || 'Unable to retrieve location.');
        setTimeout(() => setLocationErrorMsg(null), 4000);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleExportData = async () => {
    setIsExporting(true);
    setExportSuccess(false);
    try {
      const res = await api.getSessions();
      const exportPayload = {
        exportedAt: new Date().toISOString(),
        user: {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
        },
        sessionCount: res.sessions.length,
        sessions: res.sessions,
      };

      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(exportPayload, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', dataStr);
      downloadAnchor.setAttribute('download', `echo-journal-export-${new Date().toISOString().slice(0, 10)}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();

      setExportSuccess(true);
      setTimeout(() => setExportSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to export sessions:', err);
    } finally {
      setIsExporting(false);
    }
  };

  const handleClearCache = () => {
    localStorage.removeItem('echo_last_active');
    setClearedCache(true);
    setTimeout(() => setClearedCache(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-stone-900 border border-stone-800 rounded-3xl max-w-xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-6 pb-4 border-b border-stone-800/90 flex items-center justify-between shrink-0 bg-stone-900/95">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Settings className="w-4.5 h-4.5" />
            </div>
            <div>
              <h3 className="font-serif text-base text-stone-100 font-medium">Settings & Preferences</h3>
              <p className="text-xs text-stone-400">Configure reflection style, themes, and data security</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-stone-400 hover:text-stone-200 p-1.5 rounded-lg hover:bg-stone-800 transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="px-6 border-b border-stone-800/60 bg-stone-900/60 flex gap-2 shrink-0">
          {[
            { id: 'general', label: 'General & Theme', icon: Moon },
            { id: 'ai', label: 'AI Reflection', icon: Cpu },
            { id: 'location', label: 'Geolocation', icon: MapPin },
            { id: 'privacy', label: 'Data & Privacy', icon: Shield },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-3 px-3 text-xs font-medium border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
                  isActive
                    ? 'border-amber-400 text-amber-300'
                    : 'border-transparent text-stone-400 hover:text-stone-200'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Scrollable Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* TAB 1: General & Theme */}
          {activeTab === 'general' && (
            <div className="space-y-5 animate-in fade-in duration-150">
              {/* Theme Presets */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-stone-300 uppercase tracking-wider">
                    Interface Theme Preset
                  </span>
                  <span className="text-[11px] text-amber-400 font-mono">Dark Obsidian</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    {
                      id: 'obsidian',
                      name: 'Warm Obsidian',
                      desc: 'Classic amber & dark slate',
                      accent: 'bg-amber-500',
                      border: 'border-amber-500/40',
                    },
                    {
                      id: 'midnight',
                      name: 'Midnight Onyx',
                      desc: 'Deep black & violet',
                      accent: 'bg-indigo-500',
                      border: 'border-indigo-500/40',
                    },
                    {
                      id: 'forest',
                      name: 'Forest Sage',
                      desc: 'Charcoal & emerald',
                      accent: 'bg-emerald-500',
                      border: 'border-emerald-500/40',
                    },
                  ].map((theme) => {
                    const isSelected = activeTheme === theme.id;
                    return (
                      <button
                        key={theme.id}
                        onClick={() => setActiveTheme(theme.id as any)}
                        className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between h-24 ${
                          isSelected
                            ? `bg-stone-850 ${theme.border} ring-1 ring-amber-500/30 shadow-sm`
                            : 'bg-stone-850/40 border-stone-800 hover:border-stone-700 hover:bg-stone-850/70'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className={`w-3.5 h-3.5 rounded-full ${theme.accent}`} />
                          {isSelected && <Check className="w-3.5 h-3.5 text-amber-400" />}
                        </div>
                        <div>
                          <div className="text-xs font-semibold text-stone-200">{theme.name}</div>
                          <div className="text-[10px] text-stone-500 mt-0.5">{theme.desc}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* In-App Habit Reminders */}
              <div className="bg-stone-850/60 border border-stone-800 rounded-2xl p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Bell className="w-4 h-4 text-amber-400 shrink-0" />
                  <div>
                    <div className="text-xs font-medium text-stone-200">Inactivity Nudge Banner</div>
                    <div className="text-[11px] text-stone-400">
                      Show gentle welcome-back reminder banner when 3+ days pass between reflections
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setEnableReminders(!enableReminders)}
                  className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer shrink-0 ml-3 ${
                    enableReminders ? 'bg-amber-500' : 'bg-stone-700'
                  }`}
                >
                  <div
                    className={`w-4.5 h-4.5 rounded-full bg-stone-950 transition-transform absolute top-0.75 ${
                      enableReminders ? 'left-5.5' : 'left-1'
                    }`}
                  />
                </button>
              </div>

              {/* Keyboard Shortcuts */}
              <div className="bg-stone-850/40 border border-stone-800 rounded-2xl p-4 space-y-3">
                <div className="flex items-center gap-2 text-xs text-stone-300 font-medium">
                  <Command className="w-3.5 h-3.5 text-stone-400" />
                  <span>Keyboard Shortcuts</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px] text-stone-400 font-mono">
                  <div className="flex items-center justify-between bg-stone-900/90 p-2.5 rounded-xl border border-stone-800">
                    <span>Send message</span>
                    <kbd className="bg-stone-800 text-stone-300 px-2 py-0.5 rounded text-[10px]">Enter</kbd>
                  </div>
                  <div className="flex items-center justify-between bg-stone-900/90 p-2.5 rounded-xl border border-stone-800">
                    <span>New line in chat</span>
                    <kbd className="bg-stone-800 text-stone-300 px-2 py-0.5 rounded text-[10px]">Shift + Enter</kbd>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: AI Reflection Engine */}
          {activeTab === 'ai' && (
            <div className="space-y-5 animate-in fade-in duration-150">
              {/* Model Info */}
              <div className="bg-stone-850/60 border border-stone-800 rounded-2xl p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Cpu className="w-4 h-4 text-emerald-400 shrink-0" />
                  <div>
                    <div className="text-xs font-medium text-stone-200">Active Reflection Model</div>
                    <div className="text-[11px] text-stone-400">Gemini 2.5 Flash on Google GenAI / Vertex AI</div>
                  </div>
                </div>
                <span className="text-[10px] bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 px-2.5 py-1 rounded-md font-mono">
                  Connected
                </span>
              </div>

              {/* Reflection Personality Style */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-stone-300 uppercase tracking-wider">
                    Conversational Reflection Style
                  </span>
                  <span className="text-[11px] text-stone-500">Guides AI tone & inquiry depth</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    {
                      id: 'balanced',
                      name: 'Balanced & Thoughtful',
                      desc: 'Natural mirror that blends active listening with gentle inquiries.',
                      badge: 'Default',
                    },
                    {
                      id: 'socratic',
                      name: 'Socratic & Probing',
                      desc: 'Challenges assumptions and asks deep questions to unpack underlying beliefs.',
                      badge: 'In-depth',
                    },
                    {
                      id: 'empathetic',
                      name: 'Empathetic & Supportive',
                      desc: 'Prioritizes psychological safety, emotional validation, and grounding.',
                      badge: 'Gentle',
                    },
                    {
                      id: 'action',
                      name: 'Clarity & Priorities',
                      desc: 'Concise untangling focused on reducing overwhelm and action steps.',
                      badge: 'Focused',
                    },
                  ].map((style) => {
                    const isSelected = reflectionStyle === style.id;
                    return (
                      <button
                        key={style.id}
                        onClick={() => setReflectionStyle(style.id as any)}
                        className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                          isSelected
                            ? 'bg-stone-850 border-amber-500/40 ring-1 ring-amber-500/30 shadow-sm'
                            : 'bg-stone-850/40 border-stone-800 hover:border-stone-700 hover:bg-stone-850/70'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-semibold text-stone-200">{style.name}</span>
                          <span className="text-[10px] bg-stone-800 text-stone-400 border border-stone-700 px-1.5 py-0.5 rounded font-mono">
                            {style.badge}
                          </span>
                        </div>
                        <p className="text-[11px] text-stone-400 leading-relaxed">{style.desc}</p>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: Geolocation */}
          {activeTab === 'location' && (
            <div className="space-y-5 animate-in fade-in duration-150">
              {/* Location Card */}
              <div className="bg-stone-850/60 border border-stone-800 rounded-2xl p-5 space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
                      <MapPin className="w-4.5 h-4.5" />
                    </div>
                    <div>
                      <div className="text-xs font-medium text-stone-200">Current Geolocation Anchor</div>
                      <div className="text-[11px] text-stone-400">
                        Anchors reflections to discover place retrospectives on return visits
                      </div>
                    </div>
                  </div>

                  <span className="text-[10px] bg-sky-500/10 text-sky-300 border border-sky-500/20 px-2.5 py-1 rounded-md font-mono shrink-0">
                    {userLocation ? 'Geotagged' : 'Pending'}
                  </span>
                </div>

                {userLocation ? (
                  <div className="p-3.5 bg-stone-900/90 border border-stone-800 rounded-xl space-y-2">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-stone-400">Latitude & Longitude</span>
                      <span className="font-mono text-sky-300 font-medium">
                        {Math.abs(userLocation.lat).toFixed(4)}°{userLocation.lat >= 0 ? 'N' : 'S'},{' '}
                        {Math.abs(userLocation.lng).toFixed(4)}°{userLocation.lng >= 0 ? 'E' : 'W'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-stone-400">Raw Precision</span>
                      <span className="font-mono text-stone-500 text-[10px]">
                        {userLocation.lat.toFixed(6)}, {userLocation.lng.toFixed(6)}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-stone-900/60 border border-stone-800 rounded-xl text-xs text-stone-400 italic">
                    Location permission not yet detected or pending.
                  </div>
                )}

                {locationSuccessMsg && (
                  <div className="p-3 bg-emerald-950/40 border border-emerald-900/60 rounded-xl text-xs text-emerald-300 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>{locationSuccessMsg}</span>
                  </div>
                )}

                {locationErrorMsg && (
                  <div className="p-3 bg-rose-950/40 border border-rose-900/60 rounded-xl text-xs text-rose-300">
                    {locationErrorMsg}
                  </div>
                )}

                <div className="pt-2 flex justify-end">
                  <button
                    onClick={handleRefreshLocation}
                    disabled={isRefreshingLocation}
                    className="px-4 py-2 bg-stone-800 hover:bg-stone-750 text-stone-200 border border-stone-700 rounded-xl text-xs font-medium transition-colors flex items-center gap-2 cursor-pointer shadow-sm"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isRefreshingLocation ? 'animate-spin text-amber-400' : ''}`} />
                    <span>{isRefreshingLocation ? 'Acquiring GPS...' : 'Refresh GPS Location'}</span>
                  </button>
                </div>
              </div>

              {/* Clustering Rule Info */}
              <div className="bg-stone-850/40 border border-stone-800 rounded-2xl p-4 text-xs text-stone-400 space-y-1.5">
                <div className="text-stone-300 font-medium flex items-center gap-1.5">
                  <Compass className="w-3.5 h-3.5 text-amber-400" />
                  <span>How Place Retrospectives Work</span>
                </div>
                <p className="text-[11px] leading-relaxed text-stone-500">
                  When you conduct two or more reflections within ~5km of each other, Echo clusters those entries and
                  synthesizes a unique "Place Retrospective" reflecting on what was on your mind during each visit.
                </p>
              </div>
            </div>
          )}

          {/* TAB 4: Data & Privacy */}
          {activeTab === 'privacy' && (
            <div className="space-y-5 animate-in fade-in duration-150">
              {/* Security Constitution */}
              <div className="bg-stone-850/60 border border-stone-800 rounded-2xl p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Shield className="w-4.5 h-4.5 text-amber-400" />
                    <span className="text-xs font-semibold text-stone-200 uppercase tracking-wider">
                      Tenant Isolation & Ownership
                    </span>
                  </div>
                  <span className="text-[10px] bg-amber-500/10 text-amber-300 border border-amber-500/20 px-2 py-0.5 rounded font-mono">
                    Strictly Isolated
                  </span>
                </div>

                <p className="text-xs text-stone-400 leading-relaxed">
                  All your dialogues, synthesized themes, and memory chains reside exclusively under your private path in
                  Cloud Firestore.
                </p>

                <div className="flex items-center justify-between p-3 bg-stone-900/90 border border-stone-800 rounded-xl">
                  <div className="font-mono text-xs text-stone-300 truncate mr-2">
                    /users/{user.uid}
                  </div>
                  <button
                    onClick={handleCopyUid}
                    className="px-2.5 py-1 bg-stone-800 hover:bg-stone-750 text-stone-300 hover:text-white rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer shrink-0 border border-stone-700"
                    title="Copy full UID"
                  >
                    {copiedUid ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedUid ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
              </div>

              {/* Data Export & Backup */}
              <div className="bg-stone-850/60 border border-stone-800 rounded-2xl p-5 space-y-3">
                <div className="text-xs font-semibold text-stone-200 uppercase tracking-wider flex items-center gap-2">
                  <Download className="w-4 h-4 text-emerald-400" />
                  <span>Export Journal Archive</span>
                </div>
                <p className="text-xs text-stone-400 leading-relaxed">
                  Download a complete backup of all your historical reflections, message turns, extracted themes, and
                  synthesis questions in standard JSON format.
                </p>

                <div className="flex items-center justify-between pt-1">
                  <button
                    onClick={handleExportData}
                    disabled={isExporting}
                    className="px-4 py-2 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 rounded-xl text-xs font-medium transition-colors flex items-center gap-2 cursor-pointer shadow-xs"
                  >
                    {isExporting ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : exportSuccess ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Download className="w-3.5 h-3.5" />
                    )}
                    <span>{isExporting ? 'Exporting Archive...' : exportSuccess ? 'Archive Downloaded!' : 'Download JSON Archive'}</span>
                  </button>

                  <button
                    onClick={handleClearCache}
                    className="px-3 py-2 bg-stone-800 hover:bg-rose-950/40 text-stone-400 hover:text-rose-300 border border-stone-700 hover:border-rose-900/50 rounded-xl text-xs transition-colors cursor-pointer"
                  >
                    {clearedCache ? 'Cache Cleared' : 'Clear Local Cache'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-stone-800/90 bg-stone-900/95 flex items-center justify-between shrink-0">
          <div className="text-[11px] text-stone-500 font-mono">
            Echo v1.0 • Gemini 2.5 Reflection Engine
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-semibold rounded-xl transition-all cursor-pointer shadow-sm"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
