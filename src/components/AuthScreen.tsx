import React, { useState } from 'react';
import { AuthUser } from '../types';

interface AuthScreenProps {
  onLogin: (user: AuthUser) => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onLogin }) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleGoogleSignIn = () => {
    setIsLoading(true);
    // Simulating Firebase Auth Google provider token acquisition
    // In production, this calls signInWithPopup(auth, googleProvider) and retrieves user.getIdToken()
    setTimeout(() => {
      onLogin({
        uid: 'user_alex_chen_demo',
        displayName: 'Alex Chen',
        email: 'alex.chen@example.com',
        token: 'fb_tok_user_alex_chen_demo',
      });
      setIsLoading(false);
    }, 400);
  };

  return (
    <div className="min-h-screen bg-stone-900 text-stone-100 flex flex-col items-center justify-center px-4 selection:bg-amber-500/20 selection:text-amber-200">
      <div className="w-full max-w-sm text-center">
        {/* App Title in plain, elegant typography — no logo mark */}
        <h1 className="text-3xl font-serif tracking-tight text-stone-100 mb-2 font-normal">
          Echo
        </h1>
        <p className="text-sm text-stone-400 font-sans mb-8 leading-relaxed">
          A calm, private space to reflect, untangle thoughts, and explore what’s on your mind.
        </p>

        {/* Clear, simple Google Sign In Button */}
        <div className="space-y-4">
          <button
            id="google-signin-btn"
            onClick={handleGoogleSignIn}
            disabled={isLoading}
            className="w-full py-3 px-4 bg-stone-800 hover:bg-stone-750 active:bg-stone-700 text-stone-200 hover:text-white border border-stone-700/80 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-3 shadow-sm disabled:opacity-50 cursor-pointer"
          >
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
