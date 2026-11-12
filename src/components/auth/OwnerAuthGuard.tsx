
import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { AUTHORIZED_OWNER_EMAIL } from '../../constants/app';
import { ShieldAlert, Droplets, LogIn, Loader2, CheckCircle2 } from 'lucide-react';

interface OwnerAuthGuardProps {
  children: React.ReactNode;
}

export const OwnerAuthGuard: React.FC<OwnerAuthGuardProps> = ({ children }) => {
  const { currentUser, isOwner, loading, unauthorizedAttemptEmail, signInWithGoogle, clearUnauthorizedState } = useAuth();
  const [signingIn, setSigningIn] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSignIn = async () => {
    setSigningIn(true);
    setErrorMessage(null);
    try {
      await signInWithGoogle();
    } catch (err: unknown) {
      let msg = err instanceof Error ? err.message : 'Authentication failed. Please check network and try again.';
      if (msg.includes('auth/api-key-not-valid')) {
        msg = 'Firebase Configuration Error (auth/api-key-not-valid): The application was compiled with an unverified or placeholder Google Cloud API key. Please configure a valid VITE_FIREBASE_API_KEY in .env and reassemble the application.';
      }
      setErrorMessage(msg);
    } finally {
      setSigningIn(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 p-4">
        <div className="w-14 h-14 bg-sky-600 rounded-2xl flex items-center justify-center shadow-lg shadow-sky-200 animate-pulse mb-4">
          <Droplets className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-xl font-bold text-slate-800">Vetri Water Solutions</h1>
        <p className="text-xs text-slate-500 mt-1">Verifying owner credentials...</p>
        <Loader2 className="w-5 h-5 text-sky-600 animate-spin mt-4" />
      </div>
    );
  }

  if (unauthorizedAttemptEmail) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 p-4">
        <div className="w-full max-w-md bg-white border border-red-200 rounded-2xl p-6 shadow-xl text-center">
          <div className="w-14 h-14 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4 text-red-600">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Unauthorized Access</h2>
          <p className="text-sm text-slate-600 mb-4 leading-relaxed">
            This application is restricted exclusively to the authorized business owner. 
            Your Google account (<span className="font-semibold text-slate-800">{unauthorizedAttemptEmail}</span>) has not been granted access.
          </p>
          <div className="bg-red-50 text-red-800 text-xs p-3 rounded-lg border border-red-100 mb-6 text-left">
            <p className="font-semibold mb-1">Single-Owner Security Policy:</p>
            <p>Access requires sign-in with <span className="font-mono font-medium">{AUTHORIZED_OWNER_EMAIL}</span>.</p>
          </div>
          <button
            onClick={clearUnauthorizedState}
            className="w-full py-3 px-4 bg-slate-900 hover:bg-slate-800 text-white font-medium rounded-xl text-sm transition-colors shadow-sm"
          >
            Return to Sign-In
          </button>
        </div>
      </div>
    );
  }

  if (!currentUser || !isOwner) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-sky-50 via-slate-50 to-slate-100 p-4">
        <div className="w-full max-w-sm bg-white border border-slate-200/80 rounded-3xl p-8 shadow-xl text-center">
          <div className="w-16 h-16 bg-gradient-to-tr from-sky-600 to-cyan-500 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-lg shadow-sky-500/25">
            <Droplets className="w-9 h-9 text-white" />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 mb-1">
            Vetri Water Solutions
          </h1>
          <p className="text-xs uppercase tracking-wider font-semibold text-sky-700 mb-6">
            Internal Operations Portal
          </p>

          <div className="space-y-3 mb-8 text-left bg-slate-50 p-4 rounded-xl border border-slate-100 text-xs text-slate-600">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-sky-600 shrink-0" />
              <span>Customer Site Ledger & Tank Dimensions</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-sky-600 shrink-0" />
              <span>Daily Official & Personal Accounts</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-sky-600 shrink-0" />
              <span>Automated Google Drive Cloud Sync</span>
            </div>
          </div>

          {errorMessage && (
            <div className="mb-4 p-3 bg-red-50 text-red-700 text-xs rounded-xl border border-red-200 text-left">
              {errorMessage}
            </div>
          )}

          <button
            onClick={handleSignIn}
            disabled={signingIn}
            className="w-full py-3.5 px-4 bg-sky-600 hover:bg-sky-700 active:bg-sky-800 disabled:opacity-60 text-white font-semibold rounded-xl text-sm transition-all shadow-md shadow-sky-600/20 flex items-center justify-center gap-2"
          >
            {signingIn ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Authorizing...</span>
              </>
            ) : (
              <>
                <LogIn className="w-4 h-4" />
                <span>Sign in with Google</span>
              </>
            )}
          </button>

          <p className="text-[11px] text-slate-400 mt-6">
            Restricted to <span className="font-medium text-slate-500">{AUTHORIZED_OWNER_EMAIL}</span>
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

