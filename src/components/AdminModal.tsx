import React, { useEffect, useState } from 'react';
import { Shield, X, Users, BookOpen, Clock, Activity, Loader2, AlertTriangle } from 'lucide-react';
import { AdminMetrics } from '../types';
import { EchoApiClient } from '../lib/api';

interface AdminModalProps {
  api: EchoApiClient;
  isOpen: boolean;
  onClose: () => void;
}

export const AdminModal: React.FC<AdminModalProps> = ({
  api,
  isOpen,
  onClose,
}) => {
  const [metrics, setMetrics] = useState<AdminMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchMetrics();
    }
  }, [isOpen]);

  const fetchMetrics = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.getAdminMetrics();
      setMetrics(res);
    } catch (err: any) {
      setError(err.message || 'Access denied or failed to load admin metrics.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/70 backdrop-blur-xs">
      <div className="bg-stone-900 border border-stone-800 rounded-2xl max-w-xl w-full flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-stone-800 flex items-center justify-between shrink-0 bg-stone-900/90">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-serif font-medium text-stone-100 flex items-center gap-2">
                <span>System Health & Usage</span>
                <span className="text-[10px] bg-stone-800 text-stone-400 border border-stone-700 px-2 py-0.5 rounded-full font-mono">
                  RBAC Protected
                </span>
              </h3>
              <p className="text-[11px] text-stone-400">
                Aggregate metrics only • Zero private content access
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-stone-400 hover:text-stone-200 p-1.5 rounded-lg hover:bg-stone-800 transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {isLoading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-3 text-stone-400">
              <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
              <span className="text-xs">Computing aggregate platform metrics...</span>
            </div>
          ) : error ? (
            <div className="p-5 bg-rose-950/40 border border-rose-900/60 rounded-2xl text-center space-y-2">
              <AlertTriangle className="w-6 h-6 text-rose-400 mx-auto" />
              <div className="text-xs text-rose-200 font-medium">403 Forbidden</div>
              <p className="text-[11px] text-rose-300 leading-relaxed max-w-sm mx-auto">
                {error}
              </p>
            </div>
          ) : metrics ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {/* Total Users */}
                <div className="bg-stone-850/80 border border-stone-800 rounded-2xl p-4 space-y-1">
                  <div className="flex items-center gap-1.5 text-stone-400 text-xs">
                    <Users className="w-3.5 h-3.5 text-amber-400" />
                    <span>Total Journalers</span>
                  </div>
                  <div className="text-2xl font-mono font-medium text-stone-100">
                    {metrics.totalUsers}
                  </div>
                </div>

                {/* Total Sessions */}
                <div className="bg-stone-850/80 border border-stone-800 rounded-2xl p-4 space-y-1">
                  <div className="flex items-center gap-1.5 text-stone-400 text-xs">
                    <BookOpen className="w-3.5 h-3.5 text-amber-400" />
                    <span>Total Sessions</span>
                  </div>
                  <div className="text-2xl font-mono font-medium text-stone-100">
                    {metrics.totalSessions}
                  </div>
                </div>

                {/* Last 7 Days */}
                <div className="bg-stone-850/80 border border-stone-800 rounded-2xl p-4 space-y-1">
                  <div className="flex items-center gap-1.5 text-stone-400 text-xs">
                    <Clock className="w-3.5 h-3.5 text-amber-400" />
                    <span>Active (Last 7 Days)</span>
                  </div>
                  <div className="text-2xl font-mono font-medium text-stone-100">
                    {metrics.sessionsLast7Days}
                  </div>
                </div>

                {/* Avg Sessions / User */}
                <div className="bg-stone-850/80 border border-stone-800 rounded-2xl p-4 space-y-1">
                  <div className="flex items-center gap-1.5 text-stone-400 text-xs">
                    <Activity className="w-3.5 h-3.5 text-amber-400" />
                    <span>Avg Reflections/User</span>
                  </div>
                  <div className="text-2xl font-mono font-medium text-stone-100">
                    {metrics.avgSessionsPerUser}
                  </div>
                </div>
              </div>

              <div className="p-3 bg-stone-900 border border-stone-800 rounded-xl text-[11px] text-stone-400 leading-relaxed">
                🔒 <strong className="text-stone-300">Security Constitution Enforced:</strong> Admin metrics compute counts using Firestore aggregate queries. No journal messages, summaries, or extracted themes are ever read by admin code paths.
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};
