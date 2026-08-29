import React, { useState } from 'react';
import { signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from '../firebaseConfig';
import { AuthUser } from '../types';
import { Loader2 } from 'lucide-react';

interface AuthScreenProps {
  onLogin: (user: AuthUser) => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onLogin }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const userCredential = await signInWithPopup(auth, googleProvider);
      const user = userCredential.user;
      const token = await user.getIdToken();

      onLogin({
        uid: user.uid,
        displayName: user.displayName || 'Journaler',
        email: user.email || '',
        photoURL: user.photoURL || undefined,
        token,
      });
    } catch (err: any) {
      console.error('Firebase Auth error during Google Sign In:', err);
      let errorMsg = 'Failed to sign in with Google. Please check your network and Firebase configuration.';
      if (err.code === 'auth/popup-closed-by-user') {
        errorMsg = 'Sign-in popup was closed before completing.';
      } else if (err.code === 'auth/cancelled-popup-request') {
        errorMsg = 'Sign-in was cancelled.';
      } else if (err.code === 'auth/unauthorized-domain') {
        errorMsg = 'This domain is not authorized in Firebase Console -> Authentication -> Settings -> Authorized domains.';
      } else if (err.message) {
        errorMsg = err.message;
      }
      setError(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-stone-900 text-stone-100 flex flex-col items-center justify-center px-4 selection:bg-amber-500/20 selection:text-amber-200">
      <div className="w-full max-w-sm text-center">
        {/* App Title in plain typography — zero logo clutter */}
        <h1 className="text-3xl font-serif tracking-tight text-stone-100 mb-2 font-normal">
          Echo
        </h1>
        <p className="text-sm text-stone-400 font-sans mb-8 leading-relaxed">
          A calm, private space to reflect, untangle thoughts, and explore what’s on your mind.
        </p>

        {error && (
          <div className="mb-6 p-3 bg-stone-850 border border-rose-900/60 rounded-xl text-xs text-rose-300 text-left leading-relaxed">
            {error}
          </div>
        )}

        {/* Clear Google Sign In Button */}
        <div className="space-y-4">
          <button
            id="google-signin-btn"
            onClick={handleGoogleSignIn}
            disabled={isLoading}
            className="w-full py-3 px-4 bg-stone-800 hover:bg-stone-750 active:bg-stone-700 text-stone-200 hover:text-white border border-stone-700/80 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-3 shadow-sm disabled:opacity-50 cursor-pointer"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin text-stone-400" />
            ) : (
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#EA4335"
                  d="M12 5c1.54 0 2.9.55 3.96 1.45l2.96-2.96C17.1 1.8 14.7 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.6 2.8C6.4 7.1 8.9 5 12 5z"
                />
                <path
                  fill="#4285F4"
                  d="M23.5 12.3c0-.8-.07-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.5 14.7c-.2-.7-.4-1.5-.4-2.7s.2-2 .4-2.7L1.9 6.5C.7 8.9 0 10.4 0 12s.7 3.1 1.9 5.5l3.6-2.8z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3.1 0-5.6-2.1-6.5-5.1L1.9 16c1.8 3.7 5.6 7 10.1 7z"
                />
              </svg>
            )}
            <span>{isLoading ? 'Signing in...' : 'Sign in with Google'}</span>
          </button>
        </div>

        {/* Minimal supporting footer */}
        <div className="mt-12 text-[12px] text-stone-400">
          Encrypted per-user data isolation with Firebase Authentication.
        </div>
      </div>
    </div>
  );
};
