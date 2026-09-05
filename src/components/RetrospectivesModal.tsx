import React, { useEffect, useState } from 'react';
import { MapPin, X, Sparkles, Loader2, Calendar } from 'lucide-react';
import { PlaceRetrospective } from '../types';
import { EchoApiClient } from '../lib/api';

interface RetrospectivesModalProps {
  api: EchoApiClient;
  isOpen: boolean;
  onClose: () => void;
}

export const RetrospectivesModal: React.FC<RetrospectivesModalProps> = ({
  api,
  isOpen,
  onClose,
}) => {
  const [retrospectives, setRetrospectives] = useState<PlaceRetrospective[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchRetrospectives();
    }
  }, [isOpen]);

  const fetchRetrospectives = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.getRetrospectives();
      setRetrospectives(res.retrospectives || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load place retrospectives.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/70 backdrop-blur-xs">
      <div className="bg-stone-900 border border-stone-800 rounded-2xl max-w-xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-stone-800 flex items-center justify-between shrink-0 bg-stone-900/90">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <MapPin className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-serif font-medium text-stone-100">
                Place Retrospectives
              </h3>
              <p className="text-[11px] text-stone-400">
                Recurring locations where you reflected
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
        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          {isLoading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-3 text-stone-400">
              <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
              <span className="text-xs">Discovering location clusters...</span>
            </div>
          ) : error ? (
            <div className="p-4 bg-rose-950/40 border border-rose-900/60 rounded-xl text-xs text-rose-300">
              {error}
            </div>
          ) : retrospectives.length === 0 ? (
            <div className="py-10 text-center text-stone-400 space-y-2">
              <MapPin className="w-8 h-8 text-stone-600 mx-auto stroke-1" />
              <div className="text-xs text-stone-300 font-medium">No place retrospectives yet</div>
              <p className="text-[11px] text-stone-500 max-w-sm mx-auto leading-relaxed">
                Add location to 2 or more journal sessions from the same place (within ~5km) to unlock an AI synthesized reflection on your return visits.
              </p>
            </div>
          ) : (
            retrospectives.map((retro, index) => (
              <div
                key={index}
                className="bg-stone-850/80 border border-stone-750 rounded-2xl p-5 space-y-3 shadow-xs"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-xs text-amber-300/90 font-medium">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span>Returned Location ({retro.sessionCount} entries)</span>
                  </div>
                  <span className="text-[10px] font-mono text-stone-500">
                    {retro.location.lat.toFixed(2)}°, {retro.location.lng.toFixed(2)}°
                  </span>
                </div>

                <p className="text-xs text-stone-200 font-serif italic leading-relaxed pl-3 border-l-2 border-amber-500/50">
                  "{retro.retrospective}"
                </p>

                <div className="pt-2 border-t border-stone-800/60 flex flex-wrap items-center gap-2 text-[11px] text-stone-400">
                  <span className="flex items-center gap-1 font-mono text-[10px] text-stone-400">
                    <Calendar className="w-3 h-3" />
                    {retro.dates.join(', ')}
                  </span>
                  {retro.themes && retro.themes.length > 0 && (
                    <div className="flex flex-wrap gap-1 ml-auto">
                      {retro.themes.map((t, idx) => (
                        <span
                          key={idx}
                          className="bg-amber-500/10 text-amber-300/80 border border-amber-500/20 px-2 py-0.5 rounded-full text-[10px]"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
