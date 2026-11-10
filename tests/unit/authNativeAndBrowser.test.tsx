/**
 * tests/unit/authNativeAndBrowser.test.tsx
 * 
 * Comprehensive Unit and Integration Test Suite for Native Android and Browser Authentication.
 * Tests:
 * 1. Native Android Google Sign-In with Google Play Services and signInWithCredential.
 * 2. Invalid or missing native ID token handling.
 * 3. User cancellation graceful handling.
 * 4. Firebase credential exchange failures.
 * 5. Unauthorized Google account rejection (including deprecated plural email and third-party accounts).
 * 6. Browser authentication regression (signInWithPopup).
 * 7. Duplicate sign-in operation prevention.
 * 8. Cleanup and sign-out logic on both native and browser platforms.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { AuthProvider, useAuth } from '../../src/context/AuthContext';
import { AUTHORIZED_OWNER_EMAIL } from '../../src/constants/app';
import { Capacitor } from '@capacitor/core';
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';
import * as firebaseAuth from 'firebase/auth';

let authStateCallback: ((user: any) => void) | null = null;
const mockSignOut = vi.fn().mockResolvedValue(undefined);
const mockSignInWithPopup = vi.fn();
const mockSignInWithCredential = vi.fn();
const mockCredential = vi.fn().mockReturnValue({ providerId: 'google.com', signInMethod: 'google.com' });

// Mock dependencies
vi.mock('@capacitor/core', () => ({
  Capacitor: {
    isNativePlatform: vi.fn(),
  },
}));

vi.mock('@codetrix-studio/capacitor-google-auth', () => ({
  GoogleAuth: {
    initialize: vi.fn().mockResolvedValue(undefined),
    signIn: vi.fn(),
    signOut: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('../../src/config/firebase', () => ({
  auth: { currentUser: null },
  googleAuthProvider: { setCustomParameters: vi.fn() },
}));

vi.mock('firebase/auth', () => ({
  onAuthStateChanged: vi.fn((_auth, callback: any) => {
    authStateCallback = callback;
    callback(null);
    return () => {};
  }),
  signOut: vi.fn((...args: any[]) => mockSignOut(...args)),
  signInWithPopup: vi.fn((...args: any[]) => mockSignInWithPopup(...args)),
  signInWithCredential: vi.fn((...args: any[]) => mockSignInWithCredential(...args)),
  GoogleAuthProvider: {
    credential: vi.fn((...args: any[]) => mockCredential(...args)),
  },
}));

describe('AuthContext Native and Browser Authentication Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSignOut.mockResolvedValue(undefined);
    mockSignInWithPopup.mockReset();
    mockSignInWithCredential.mockReset();
    mockCredential.mockReturnValue({ providerId: 'google.com', signInMethod: 'google.com' });
    vi.mocked(GoogleAuth.signOut).mockResolvedValue(undefined as any);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <AuthProvider>{children}</AuthProvider>
  );

  describe('1. Native Android Google Sign-In Flow', () => {
    it('successfully authenticates owner via Google Play Services and signInWithCredential on Android', async () => {
      vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
      vi.mocked(GoogleAuth.signIn).mockResolvedValue({
        id: '12345',
        email: AUTHORIZED_OWNER_EMAIL,
        name: 'Vetri Owner',
        familyName: 'Owner',
        givenName: 'Vetri',
        imageUrl: '',
        serverAuthCode: '',
        authentication: {
          idToken: 'mock-google-id-token-valid',
          accessToken: 'mock-access-token',
        },
      });

      mockSignInWithCredential.mockResolvedValue({
        user: { email: AUTHORIZED_OWNER_EMAIL, uid: 'owner-uid-123' },
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        await result.current.signInWithGoogle();
      });

      expect(Capacitor.isNativePlatform).toHaveBeenCalled();
      expect(GoogleAuth.signIn).toHaveBeenCalledTimes(1);
      expect(firebaseAuth.GoogleAuthProvider.credential).toHaveBeenCalledWith('mock-google-id-token-valid');
      expect(mockSignInWithCredential).toHaveBeenCalledTimes(1);
      expect(mockSignInWithPopup).not.toHaveBeenCalled();

      // Simulate onAuthStateChanged emitting the authenticated owner
      act(() => {
        if (authStateCallback) {
          authStateCallback({ email: AUTHORIZED_OWNER_EMAIL, uid: 'owner-uid-123' });
        }
      });

      expect(result.current.isOwner).toBe(true);
      expect(result.current.currentUser?.email).toBe(AUTHORIZED_OWNER_EMAIL);
      expect(result.current.unauthorizedAttemptEmail).toBeNull();
    });

    it('throws descriptive error if native Google Play Services returns empty ID token', async () => {
      vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
      vi.mocked(GoogleAuth.signIn).mockResolvedValue({
        id: '12345',
        email: AUTHORIZED_OWNER_EMAIL,
        name: 'Vetri Owner',
        familyName: 'Owner',
        givenName: 'Vetri',
        imageUrl: '',
        serverAuthCode: '',
        authentication: {
          idToken: '', // Missing
          accessToken: 'mock-access-token',
        },
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await expect(
        act(async () => {
          await result.current.signInWithGoogle();
        })
      ).rejects.toThrow('No ID token returned from Google Play Services');

      expect(mockSignInWithCredential).not.toHaveBeenCalled();
      expect(result.current.isOwner).toBe(false);
    });

    it('gracefully absorbs user cancellation (error code 12501) without crashing', async () => {
      vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
      const cancelError: any = new Error('12501: User cancelled Google Play Services picker');
      cancelError.code = '12501';
      vi.mocked(GoogleAuth.signIn).mockRejectedValue(cancelError);

      const { result } = renderHook(() => useAuth(), { wrapper });

      // Should not throw
      await act(async () => {
        await result.current.signInWithGoogle();
      });

      expect(result.current.loading).toBe(false);
      expect(result.current.isOwner).toBe(false);
      expect(result.current.unauthorizedAttemptEmail).toBeNull();
    });

    it('surfaces Firebase credential exchange network and auth errors', async () => {
      vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
      vi.mocked(GoogleAuth.signIn).mockResolvedValue({
        id: '12345',
        email: AUTHORIZED_OWNER_EMAIL,
        name: 'Vetri Owner',
        familyName: 'Owner',
        givenName: 'Vetri',
        imageUrl: '',
        serverAuthCode: '',
        authentication: {
          idToken: 'valid-id-token',
          accessToken: 'mock-token',
        },
      });

      mockSignInWithCredential.mockRejectedValue(new Error('auth/network-request-failed: connection refused'));

      const { result } = renderHook(() => useAuth(), { wrapper });

      await expect(
        act(async () => {
          await result.current.signInWithGoogle();
        })
      ).rejects.toThrow('auth/network-request-failed');

      expect(result.current.isOwner).toBe(false);
    });
  });

  describe('2. Unauthorized User Rejection and Owner Enforcement', () => {
    it('strictly rejects third-party Google account and signs out from both Firebase and GoogleAuth', async () => {
      vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
      const attackerEmail = 'intruder@gmail.com';

      vi.mocked(GoogleAuth.signIn).mockResolvedValue({
        id: '99999',
        email: attackerEmail,
        name: 'Intruder',
        familyName: 'User',
        givenName: 'Intruder',
        imageUrl: '',
        serverAuthCode: '',
        authentication: {
          idToken: 'attacker-id-token',
          accessToken: 'mock-token',
        },
      });

      mockSignInWithCredential.mockResolvedValue({
        user: { email: attackerEmail, uid: 'attacker-uid' },
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        await result.current.signInWithGoogle();
      });

      // Firebase signOut and native GoogleAuth signOut should both be called
      expect(mockSignOut).toHaveBeenCalled();
      expect(GoogleAuth.signOut).toHaveBeenCalled();
      expect(result.current.isOwner).toBe(false);
      expect(result.current.unauthorizedAttemptEmail).toBe(attackerEmail);
    });

    it('strictly rejects deprecated plural owner email vetriwatersolutions@gmail.com', async () => {
      vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
      const oldPluralEmail = 'vetriwatersolutions@gmail.com';

      vi.mocked(GoogleAuth.signIn).mockResolvedValue({
        id: '88888',
        email: oldPluralEmail,
        name: 'Old Owner',
        familyName: 'Owner',
        givenName: 'Old',
        imageUrl: '',
        serverAuthCode: '',
        authentication: {
          idToken: 'old-email-id-token',
          accessToken: 'mock-token',
        },
      });

      mockSignInWithCredential.mockResolvedValue({
        user: { email: oldPluralEmail, uid: 'old-uid' },
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        await result.current.signInWithGoogle();
      });

      expect(mockSignOut).toHaveBeenCalled();
      expect(GoogleAuth.signOut).toHaveBeenCalled();
      expect(result.current.isOwner).toBe(false);
      expect(result.current.unauthorizedAttemptEmail).toBe(oldPluralEmail);
    });

    it('enforces case-insensitive match for authorized owner VETRIWATERSOLUTION@GMAIL.COM', async () => {
      vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
      const uppercaseEmail = 'VETRIWATERSOLUTION@GMAIL.COM';

      vi.mocked(GoogleAuth.signIn).mockResolvedValue({
        id: '12345',
        email: uppercaseEmail,
        name: 'VWS Owner',
        familyName: 'Owner',
        givenName: 'Vetri',
        imageUrl: '',
        serverAuthCode: '',
        authentication: {
          idToken: 'case-insensitive-token',
          accessToken: 'mock-token',
        },
      });

      mockSignInWithCredential.mockResolvedValue({
        user: { email: uppercaseEmail, uid: 'owner-case-uid' },
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        await result.current.signInWithGoogle();
      });

      expect(mockSignOut).not.toHaveBeenCalled();

      act(() => {
        if (authStateCallback) {
          authStateCallback({ email: uppercaseEmail, uid: 'owner-case-uid' });
        }
      });

      expect(result.current.isOwner).toBe(true);
      expect(result.current.unauthorizedAttemptEmail).toBeNull();
    });
  });

  describe('3. Browser Authentication Regression Protection', () => {
    it('executes signInWithPopup on non-native web browsers and does not call GoogleAuth.signIn', async () => {
      vi.mocked(Capacitor.isNativePlatform).mockReturnValue(false);

      mockSignInWithPopup.mockResolvedValue({
        user: { email: AUTHORIZED_OWNER_EMAIL, uid: 'browser-owner-uid' },
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        await result.current.signInWithGoogle();
      });

      expect(GoogleAuth.signIn).not.toHaveBeenCalled();
      expect(mockSignInWithPopup).toHaveBeenCalledTimes(1);

      act(() => {
        if (authStateCallback) {
          authStateCallback({ email: AUTHORIZED_OWNER_EMAIL, uid: 'browser-owner-uid' });
        }
      });

      expect(result.current.isOwner).toBe(true);
      expect(result.current.unauthorizedAttemptEmail).toBeNull();
    });
  });

  describe('4. Duplicate Sign-In Operation Prevention & Sign-Out', () => {
    it('ignores concurrent duplicate sign-in calls while operation is already in flight', async () => {
      vi.mocked(Capacitor.isNativePlatform).mockReturnValue(false);

      let resolveSignIn: any;
      mockSignInWithPopup.mockReturnValue(
        new Promise((res) => {
          resolveSignIn = res;
        })
      );

      const { result } = renderHook(() => useAuth(), { wrapper });

      // First call (starts in flight)
      let firstPromise: Promise<void>;
      act(() => {
        firstPromise = result.current.signInWithGoogle();
      });

      // Second immediate concurrent call
      await act(async () => {
        await result.current.signInWithGoogle();
      });

      // Only one popup invocation should have occurred
      expect(mockSignInWithPopup).toHaveBeenCalledTimes(1);

      // Resolve the first call
      await act(async () => {
        resolveSignIn({ user: { email: AUTHORIZED_OWNER_EMAIL } });
        await firstPromise;
      });

      expect(mockSignInWithPopup).toHaveBeenCalledTimes(1);
    });

    it('signs out from both Firebase and native GoogleAuth on signOut', async () => {
      vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);

      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        await result.current.signOut();
      });

      expect(mockSignOut).toHaveBeenCalledTimes(1);
      expect(GoogleAuth.signOut).toHaveBeenCalledTimes(1);
      expect(result.current.currentUser).toBeNull();
      expect(result.current.isOwner).toBe(false);
      expect(result.current.unauthorizedAttemptEmail).toBeNull();
    });
  });
});
