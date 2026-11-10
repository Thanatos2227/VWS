/**
 * src/context/AuthContext.tsx
 * 
 * Authentication context enforcing Single-Owner Security Architecture.
 * Complies with DOC-006 (Security Architecture §2) and DEC-02 (Single-Owner Application).
 * Only vetriwatersolution@gmail.com is authorized to enter the application.
 */

import React, { createContext, useContext, useEffect, useState, useMemo, useRef } from 'react';
import { 
  User, 
  signInWithPopup, 
  signInWithCredential,
  GoogleAuthProvider,
  signOut as firebaseSignOut, 
  onAuthStateChanged 
} from 'firebase/auth';
import { Capacitor } from '@capacitor/core';
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';
import { auth, googleAuthProvider } from '../config/firebase';
import { AUTHORIZED_OWNER_EMAIL } from '../constants/app';

const GOOGLE_SERVER_CLIENT_ID = '820277889521-3cojmn8vtjuo53ocp581mtpgssej2cq5.apps.googleusercontent.com';

export interface AuthContextType {
  currentUser: User | null;
  isOwner: boolean;
  loading: boolean;
  unauthorizedAttemptEmail: string | null;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  clearUnauthorizedState: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isOwner, setIsOwner] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [unauthorizedAttemptEmail, setUnauthorizedAttemptEmail] = useState<string | null>(null);
  const isSigningInRef = useRef<boolean>(false);

  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      try {
        GoogleAuth.initialize({
          clientId: GOOGLE_SERVER_CLIENT_ID,
          scopes: ['profile', 'email'],
          grantOfflineAccess: false,
        });
      } catch (err) {
        console.warn('[VWS Auth] Native GoogleAuth initialize warning:', err);
      }
    }
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const userEmail = (user.email || '').trim().toLowerCase();
        if (userEmail === AUTHORIZED_OWNER_EMAIL.toLowerCase()) {
          setCurrentUser(user);
          setIsOwner(true);
          setUnauthorizedAttemptEmail(null);
        } else {
          // Strictly reject unauthorized user, capture email for alert, and terminate session immediately
          const rejectedEmail = user.email || 'unknown';
          setCurrentUser(null);
          setIsOwner(false);
          setUnauthorizedAttemptEmail(rejectedEmail);
          try {
            await firebaseSignOut(auth);
            if (Capacitor.isNativePlatform()) {
              await GoogleAuth.signOut().catch(() => {});
            }
          } catch (err) {
            console.error('[VWS Auth] Error signing out unauthorized user:', err);
          }
        }
      } else {
        setCurrentUser(null);
        setIsOwner(false);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    if (isSigningInRef.current) {
      console.warn('[VWS Auth] Sign-in operation already in progress, ignoring duplicate call');
      return;
    }

    isSigningInRef.current = true;
    setLoading(true);
    setUnauthorizedAttemptEmail(null);

    try {
      let signedInEmail: string | null = null;

      if (Capacitor.isNativePlatform()) {
        // Native Android Google Play Services Authentication
        const googleUser = await GoogleAuth.signIn();
        const idToken = googleUser?.authentication?.idToken;

        if (!idToken) {
          throw new Error('Google Sign-In failed: No ID token returned from Google Play Services.');
        }

        const credential = GoogleAuthProvider.credential(idToken);
        const userCredential = await signInWithCredential(auth, credential);
        signedInEmail = userCredential.user.email;
      } else {
        // Standard Web Browser Popup Authentication
        const result = await signInWithPopup(auth, googleAuthProvider);
        signedInEmail = result.user.email;
      }

      const email = (signedInEmail || '').trim().toLowerCase();
      if (email !== AUTHORIZED_OWNER_EMAIL.toLowerCase()) {
        setUnauthorizedAttemptEmail(signedInEmail || 'unknown');
        await firebaseSignOut(auth);
        if (Capacitor.isNativePlatform()) {
          try {
            await GoogleAuth.signOut();
          } catch {
            // Best effort cleanup
          }
        }
      }
    } catch (error: any) {
      console.error('[VWS Auth] Sign-in error:', error);
      // Cancellation check: code 12501 (Google Play Services SIGN_IN_CANCELLED) or message containing cancel
      const errorMessage = (error?.message || '').toLowerCase();
      const isCancelled = error?.code === '12501' || 
        error?.code === 'SIGN_IN_CANCELLED' || 
        errorMessage.includes('cancel') || 
        errorMessage.includes('user cancelled') || 
        errorMessage.includes('popup-closed-by-user');

      if (!isCancelled) {
        throw error;
      }
    } finally {
      isSigningInRef.current = false;
      setLoading(false);
    }
  };

  const signOut = async () => {
    setLoading(true);
    try {
      await firebaseSignOut(auth);
      if (Capacitor.isNativePlatform()) {
        try {
          await GoogleAuth.signOut();
        } catch {
          // Best effort cleanup
        }
      }
      setCurrentUser(null);
      setIsOwner(false);
      setUnauthorizedAttemptEmail(null);
    } catch (error) {
      console.error('[VWS Auth] Sign-out error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const clearUnauthorizedState = () => {
    setUnauthorizedAttemptEmail(null);
  };

  const value = useMemo<AuthContextType>(() => ({
    currentUser,
    isOwner,
    loading,
    unauthorizedAttemptEmail,
    signInWithGoogle,
    signOut,
    clearUnauthorizedState
  }), [currentUser, isOwner, loading, unauthorizedAttemptEmail]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

