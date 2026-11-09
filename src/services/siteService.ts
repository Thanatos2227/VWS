/**
 * src/services/siteService.ts
 * 
 * Customer Site Details Management Service.
 * Implements non-destructive correction chains (v1 -> v2 -> v3), 
 * soft-deletion with 30-day recycle bin, reactive totals, and Firestore integration.
 * Complies with DOC-002 (§2.3), DOC-005 (§3.1), DOC-006 (§4), and DEC-01 through DEC-25.
 * 
 * ARCHITECTURE INTEGRITY:
 * Protected mutations route exclusively through authenticated Cloud Functions callables
 * (commitSiteJob, commitSiteCorrection, commitSiteStatusChange). Direct client writes
 * are strictly prohibited to comply with canonical firestore.rules.
 */

import { 
  collection, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  Timestamp
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { SiteRecord, TankCleaningDetail } from '../types/database';
import { calculateTankCapacityLitres } from '../utils/tank';
import { calculateFinalValue, toPaise } from '../utils/money';
import { 
  callCommitSiteJob, 
  callCommitSiteCorrection, 
  callCommitSiteStatusChange, 
  callPurgeExpiredSites,
  generateOperationIdempotencyKey, 
  getClientDeviceId 
} from './api/callableClient';
import { 
  adaptSiteFormToJobPayload, 
  adaptSiteFormToCorrectionPayload,
  SiteFormInput 
} from './adapters/financialAdapter';

const SITES_COLLECTION = 'sites';

export type SiteFormData = SiteFormInput;

/**
 * Creates a brand-new customer site entry (Version 1).
 * Routes mutation through authenticated commitSiteJob Cloud Function.
 */
export async function createSiteEntry(
  data: SiteFormData, 
  creatorEmail: string
): Promise<SiteRecord> {
  // Validate mandatory fields
  if (!data.workDate) throw new Error('Work date is required.');
  if (!data.customerName?.trim()) throw new Error('Customer name is required.');
  if (!data.location?.trim()) throw new Error('Location is required.');
  if (!data.contactNumber?.trim()) throw new Error('Contact number is required.');
  if (!data.billNumber?.trim()) throw new Error('Physical bill number is required.');
  if (!data.paymentMode) throw new Error('Payment mode (Cash or Online) is mandatory.');
  if (!data.tanks || data.tanks.length === 0) throw new Error('At least one tank entry is required.');

  const clientDeviceId = getClientDeviceId();
  const idempotencyKey = generateOperationIdempotencyKey('SITE_CREATE', data.billNumber);

  // Adapt form data to typed callable payload
  const payload = adaptSiteFormToJobPayload(data, idempotencyKey, clientDeviceId);

  // Invoke authenticated 2nd Gen Cloud Function
  const commitResult = await callCommitSiteJob(payload);

  const calendarYear = parseInt(data.workDate.slice(0, 4), 10) || new Date().getFullYear();
  const billValuePaise = toPaise(data.billValue);
  const discountPaise = toPaise(data.discount || 0);
  const finalValuePaise = calculateFinalValue(billValuePaise, discountPaise).finalValue;

  const processedTanks: TankCleaningDetail[] = data.tanks.map((t, idx) => ({
    tankIndex: idx + 1,
    tankType: t.tankType,
    length: t.length,
    breadth: t.breadth,
    height: t.height,
    capacityLitres: calculateTankCapacityLitres({ length: t.length, breadth: t.breadth, height: t.height })
  }));

  const now = Timestamp.now();
  const allocatedSeq = commitResult.sequenceNumber || 1;

  const committedRecord: SiteRecord = {
    id: commitResult.siteId,
    sequenceNumber: allocatedSeq,
    siteNumber: allocatedSeq,
    year: calendarYear,
    calendarYear,
    workDate: data.workDate,
    customerName: data.customerName.trim(),
    location: data.location.trim(),
    contactNumber: data.contactNumber.trim(),
    googleLocation: data.googleLocation?.trim() || undefined,
    billNumber: data.billNumber.trim(),
    paymentMode: data.paymentMode,
    totalTanks: processedTanks.length,
    tanks: processedTanks,
    billValuePaise,
    discountPaise,
    finalValuePaise,
    version: 1,
    originalRecordId: commitResult.siteId,
    previousRecordId: null,
    isLatestValidVersion: true,
    status: 'ACTIVE',
    correctedAt: null,
    correctionReason: null,
    isDeleted: false,
    deletedAt: null,
    deletedBy: null,
    expiresForPurgeAt: null,
    createdAt: now,
    updatedAt: now,
    createdBy: creatorEmail
  };

  return committedRecord;
}

/**
 * Creates an immutable correction record (v2, v3, etc.) for an existing site.
 * Routes mutation through authenticated commitSiteCorrection Cloud Function.
 */
export async function createSiteCorrection(
  previousRecord: SiteRecord,
  updatedData: SiteFormData,
  editorEmail: string
): Promise<SiteRecord> {
  const clientDeviceId = getClientDeviceId();
  const idempotencyKey = generateOperationIdempotencyKey(
    'SITE_CORRECT', 
    `${previousRecord.id}_v${previousRecord.version + 1}`
  );

  const payload = adaptSiteFormToCorrectionPayload(
    previousRecord.id,
    previousRecord.version,
    updatedData,
    idempotencyKey,
    clientDeviceId
  );

  const commitResult = await callCommitSiteCorrection(payload);

  const calendarYear = parseInt(updatedData.workDate.slice(0, 4), 10) || previousRecord.year || new Date().getFullYear();
  const billValuePaise = toPaise(updatedData.billValue);
  const discountPaise = toPaise(updatedData.discount || 0);
  const finalValuePaise = calculateFinalValue(billValuePaise, discountPaise).finalValue;

  const processedTanks: TankCleaningDetail[] = updatedData.tanks.map((t, idx) => ({
    tankIndex: idx + 1,
    tankType: t.tankType,
    length: t.length,
    breadth: t.breadth,
    height: t.height,
    capacityLitres: calculateTankCapacityLitres({ length: t.length, breadth: t.breadth, height: t.height })
  }));

  const now = Timestamp.now();
  const nextVersion = commitResult.version;
  const originalRecordId = previousRecord.originalRecordId || previousRecord.id;

  const newCorrectionRecord: SiteRecord = {
    id: commitResult.siteId,
    sequenceNumber: previousRecord.sequenceNumber || 0,
    siteNumber: previousRecord.sequenceNumber || previousRecord.siteNumber || 0,
    year: calendarYear,
    calendarYear,
    workDate: updatedData.workDate,
    customerName: updatedData.customerName.trim(),
    location: updatedData.location.trim(),
    contactNumber: updatedData.contactNumber.trim(),
    googleLocation: updatedData.googleLocation?.trim() || undefined,
    billNumber: updatedData.billNumber.trim(),
    paymentMode: updatedData.paymentMode,
    totalTanks: processedTanks.length,
    tanks: processedTanks,
    billValuePaise,
    discountPaise,
    finalValuePaise,
    version: nextVersion,
    originalRecordId,
    previousRecordId: previousRecord.id,
    isLatestValidVersion: true,
    status: 'ACTIVE',
    correctedAt: now,
    correctionReason: updatedData.correctionReason?.trim() || null,
    isDeleted: false,
    deletedAt: null,
    deletedBy: null,
    expiresForPurgeAt: null,
    createdAt: previousRecord.createdAt,
    updatedAt: now,
    createdBy: editorEmail || previousRecord.createdBy
  };

  return newCorrectionRecord;
}

/**
 * Soft-deletes a site record, moving it to the 30-day Recycle Bin.
 * Routes mutation through authenticated commitSiteStatusChange Cloud Function.
 */
export async function softDeleteSite(siteId: string, _userEmail: string): Promise<void> {
  const clientDeviceId = getClientDeviceId();
  const idempotencyKey = generateOperationIdempotencyKey('SITE_SOFTDEL', siteId);

  await callCommitSiteStatusChange({
    idempotencyKey,
    clientDeviceId,
    siteId,
    action: 'SOFT_DELETE'
  });
}

/**
 * Restores a soft-deleted site record back to active status.
 * Routes mutation through authenticated commitSiteStatusChange Cloud Function.
 */
export async function restoreSite(siteId: string): Promise<void> {
  const clientDeviceId = getClientDeviceId();
  const idempotencyKey = generateOperationIdempotencyKey('SITE_RESTORE', siteId);

  await callCommitSiteStatusChange({
    idempotencyKey,
    clientDeviceId,
    siteId,
    action: 'RESTORE'
  });
}

/**
 * Permanently purges site records that have resided in the 30-day Recycle Bin past expiresForPurgeAt.
 * Routes through authenticated purgeExpiredSites Cloud Function.
 */
export async function purgeExpiredSitesList(): Promise<{ purgedCount: number; purgedSiteIds: string[] }> {
  const result = await callPurgeExpiredSites();
  return {
    purgedCount: result.purgedCount,
    purgedSiteIds: result.purgedSiteIds
  };
}

/**
 * Subscribes in real-time to active sites for a given calendar year.
 * Only returns latest valid versions (excluding superseded versions and soft-deleted records).
 * Authorized under firestore.rules (allow read: if isOwner();).
 */
export function subscribeActiveSites(
  calendarYear: number, 
  callback: (sites: SiteRecord[]) => void,
  onError?: (err: Error) => void
): () => void {
  const q = query(
    collection(db, SITES_COLLECTION),
    where('calendarYear', '==', calendarYear),
    where('isDeleted', '==', false),
    where('isLatestValidVersion', '==', true),
    orderBy('workDate', 'desc')
  );

  return onSnapshot(
    q, 
    (snapshot) => {
      const records = snapshot.docs.map((d) => d.data() as SiteRecord);
      callback(records);
    },
    (err) => {
      console.error('[SiteService] Subscription error:', err);
      if (onError) onError(err);
    }
  );
}

/**
 * Subscribes in real-time to the 30-day Recycle Bin.
 * Authorized under firestore.rules (allow read: if isOwner();).
 */
export function subscribeRecycleBin(
  callback: (sites: SiteRecord[]) => void,
  onError?: (err: Error) => void
): () => void {
  const q = query(
    collection(db, SITES_COLLECTION),
    where('isDeleted', '==', true),
    orderBy('deletedAt', 'desc')
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const records = snapshot.docs.map((d) => d.data() as SiteRecord);
      callback(records);
    },
    (err) => {
      console.error('[SiteService] Recycle Bin subscription error:', err);
      if (onError) onError(err);
    }
  );
}

/**
 * Fetches the complete version history chain for a site (v1 -> v2 -> v3).
 * Authorized under firestore.rules (allow read: if isOwner();).
 */
export async function getSiteVersionHistory(originalRecordId: string): Promise<SiteRecord[]> {
  const q = query(
    collection(db, SITES_COLLECTION),
    where('originalRecordId', '==', originalRecordId),
    orderBy('version', 'asc')
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => d.data() as SiteRecord);
}
