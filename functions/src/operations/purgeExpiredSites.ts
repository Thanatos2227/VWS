/**
 * functions/src/operations/purgeExpiredSites.ts
 * 
 * Authenticated Callable Function: purgeExpiredSites.
 * Permanently purges site records that have resided in the 30-day Recycle Bin
 * past their expiresForPurgeAt timestamp.
 * Conforms to DOC-005 (§3.1), DOC-006 (§2), and DEC-02.
 */

import { onCall } from 'firebase-functions/v2/https';
import { Timestamp } from 'firebase-admin/firestore';
import { adminDb, assertAuthorizedOwner } from '../config.js';

export interface PurgeExpiredSitesResponse {
  purgedCount: number;
  purgedSiteIds: string[];
  executedAt: string;
}

export const purgeExpiredSites = onCall({ region: 'asia-south1' }, async (request): Promise<PurgeExpiredSitesResponse> => {
  assertAuthorizedOwner(request.auth);

  const backendNow = Timestamp.now();
  const sitesRef = adminDb.collection('sites');

  // Query soft-deleted sites where retention window has expired
  const expiredQuery = sitesRef
    .where('isDeleted', '==', true)
    .where('expiresForPurgeAt', '<=', backendNow);

  const snapshot = await expiredQuery.get();

  if (snapshot.empty) {
    return {
      purgedCount: 0,
      purgedSiteIds: [],
      executedAt: backendNow.toDate().toISOString()
    };
  }

  const purgedSiteIds: string[] = [];
  const batch = adminDb.batch();

  snapshot.docs.forEach((docSnap) => {
    purgedSiteIds.push(docSnap.id);
    batch.delete(docSnap.ref);
  });

  await batch.commit();

  return {
    purgedCount: purgedSiteIds.length,
    purgedSiteIds,
    executedAt: backendNow.toDate().toISOString()
  };
});
