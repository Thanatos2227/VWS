/**
 * src/context/AuthContext.tsx
 * 
 * Authentication context enforcing Single-Owner Security Architecture.
 * Complies with DOC-006 (Security Architecture §2) and DEC-02 (Single-Owner Application).
 * Only vetriwatersolutions@gmail.com is authorized to enter the application.
 */

import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { 
  User, 
  signInWithPopup, 
  signOut as firebaseSignOut, 
  onAuthStateChanged 
} from 'firebase/auth';
import { auth, googleAuthProvider } from '../config/firebase';
import { AUTHORIZED_OWNER_EMAIL } from '../constants/app';

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
    setLoading(true);
    setUnauthorizedAttemptEmail(null);
    try {
      const result = await signInWithPopup(auth, googleAuthProvider);
      const email = (result.user.email || '').trim().toLowerCase();
      if (email !== AUTHORIZED_OWNER_EMAIL.toLowerCase()) {
        setUnauthorizedAttemptEmail(result.user.email || 'unknown');
        await firebaseSignOut(auth);
      }
    } catch (error) {
      console.error('[VWS Auth] Sign-in error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    setLoading(true);
    try {
      await firebaseSignOut(auth);
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
