/**
 * functions/src/config.ts
 * 
 * Central Firebase Admin SDK Initialization & Security Configuration.
 * Conforms to DOC-006 (§2, §4, §5) and DEC-02.
 */

import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { HttpsError } from 'firebase-functions/v2/https';

if (getApps().length === 0) {
  initializeApp();
}

export const adminDb = getFirestore();
export const adminAuth = getAuth();

export const AUTHORIZED_OWNER_EMAIL = 'vetriwatersolution@gmail.com';

/**
 * Validates that an incoming callable request originates from the authenticated owner.
 */
export function assertAuthorizedOwner(authContext: { token?: { email?: string } } | undefined): string {
  if (!authContext || !authContext.token || !authContext.token.email) {
    throw new HttpsError(
      'unauthenticated',
      'Authentication is required to invoke this function.'
    );
  }

  const callerEmail = authContext.token.email.trim().toLowerCase();
  if (callerEmail !== AUTHORIZED_OWNER_EMAIL.toLowerCase()) {
    throw new HttpsError(
      'permission-denied',
      `Access restricted to authorized owner (${AUTHORIZED_OWNER_EMAIL}).`
    );
  }

  return callerEmail;
}

