import React, { useState } from 'react';
import { MapPin, Loader2, AlertTriangle, ShieldCheck } from 'lucide-react';
import { LocationCoords } from '../types';

interface LocationGateModalProps {
  isOpen: boolean;
  onLocationAcquired: (coords: LocationCoords) => void;
}

export const LocationGateModal: React.FC<LocationGateModalProps> = ({
  isOpen,
  onLocationAcquired,
}) => {
  const [isRequesting, setIsRequesting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleRequestLocation = () => {
    if (!navigator.geolocation) {
      setErrorMsg('Geolocation is not supported by your current browser.');
      return;
    }

    setIsRequesting(true);
    setErrorMsg(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsRequesting(false);
        const coords: LocationCoords = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        };
        onLocationAcquired(coords);
      },
      (err) => {
        setIsRequesting(false);
        console.warn('Location permission error:', err);
        if (err.code === err.PERMISSION_DENIED) {
          setErrorMsg(
            'Location access was blocked. Please enable location permissions for this site in your browser address bar and try again.'
          );
        } else if (err.code === err.TIMEOUT) {
          setErrorMsg('Location request timed out. Please check your GPS/connection and try again.');
        } else {
          setErrorMsg('Unable to retrieve location. Please check browser settings and try again.');
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      }
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-stone-900 border border-stone-800 rounded-2xl max-w-md w-full p-6 shadow-2xl relative text-center space-y-5">
        <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mx-auto shadow-sm">
          <MapPin className="w-7 h-7" />
        </div>

        <div className="space-y-2">
          <h3 className="font-serif text-xl text-stone-100 font-normal">
            Location Access Required
          </h3>
          <p className="text-xs text-stone-400 leading-relaxed max-w-sm mx-auto">
            Echo anchors your continuous reflections to your environment to build multi-session place retrospectives. Location access is mandatory to continue journaling.
          </p>
        </div>

        {errorMsg && (
          <div className="p-3.5 bg-rose-950/50 border border-rose-900/60 rounded-xl text-xs text-rose-300 flex items-start gap-2.5 text-left">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <span className="leading-relaxed">{errorMsg}</span>
          </div>
        )}

        <div className="bg-stone-850/60 border border-stone-800 rounded-xl p-3 text-[11px] text-stone-400 flex items-center justify-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>Coordinates are encrypted & isolated to your account</span>
        </div>

        <button
          onClick={handleRequestLocation}
          disabled={isRequesting}
          className="w-full py-3 px-4 bg-amber-500 hover:bg-amber-400 text-stone-950 font-medium text-xs rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-md disabled:opacity-50"
        >
          {isRequesting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Acquiring Location...</span>
            </>
          ) : (
            <span>Allow Location & Continue</span>
          )}
        </button>
      </div>
    </div>
  );
};
