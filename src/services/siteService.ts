/**
 * src/services/siteService.ts
 * 
 * Customer Site Details Management Service.
 * Implements non-destructive correction chains (v1 -> v2 -> v3), 
 * soft-deletion with 30-day recycle bin, reactive totals, and Firestore integration.
 * Complies with DOC-002 (§2.3), DOC-005 (§3.1), and DEC-01 through DEC-25.
 */

import { 
  collection, 
  doc, 
  setDoc, 
  updateDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  Timestamp,
  runTransaction
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { SiteRecord, TankCleaningDetail } from '../types/database';
import { calculateTankCapacityLitres } from '../utils/tank';
import { calculateFinalValue, toPaise } from '../utils/money';

const SITES_COLLECTION = 'sites';

export interface SiteFormData {
  workDate: string; // YYYY-MM-DD
  customerName: string;
  location: string;
  contactNumber: string;
  googleLocation?: string;
  billNumber: string; // Physical bill book number (DEC-10)
  paymentMode: 'Cash' | 'Online'; // Mandatory selection (DEC-11)
  billValue: number; // In Rupees (DEC-07)
  discount: number; // In Rupees (DEC-07)
  tanks: Array<{
    tankType: 'OHT' | 'UG';
    length: number;
    breadth: number;
    height: number;
  }>;
  correctionReason?: string;
}

/**
 * Creates a brand-new customer site entry (Version 1).
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
  if (data.tanks.length === 0) throw new Error('At least one tank entry is required.');

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

  const siteId = `site_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  const now = Timestamp.now();

  const newRecord: SiteRecord = {
    id: siteId,
    sequenceNumber: 0,
    siteNumber: 0, // Server sequence is assigned during cloud commit; client-side default 0
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
    originalRecordId: siteId,
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

  const docRef = doc(db, SITES_COLLECTION, siteId);
  await setDoc(docRef, newRecord);
  return newRecord;
}

/**
 * Creates an immutable correction record (v2, v3, etc.) for an existing site.
 * Preserves the previous version with status='SUPERSEDED' and isLatestValidVersion=false.
 */
export async function createSiteCorrection(
  previousRecord: SiteRecord,
  updatedData: SiteFormData,
  editorEmail: string
): Promise<SiteRecord> {
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

  const correctionId = `site_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  const now = Timestamp.now();
  const nextVersion = previousRecord.version + 1;
  const originalRecordId = previousRecord.originalRecordId || previousRecord.id;

  const newCorrectionRecord: SiteRecord = {
    id: correctionId,
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

  // Run atomic transaction to supersede previous version and insert new correction
  await runTransaction(db, async (transaction) => {
    const prevDocRef = doc(db, SITES_COLLECTION, previousRecord.id);
    const newDocRef = doc(db, SITES_COLLECTION, correctionId);

    transaction.update(prevDocRef, {
      isLatestValidVersion: false,
      status: 'SUPERSEDED',
      updatedAt: now
    });

    transaction.set(newDocRef, newCorrectionRecord);
  });

  return newCorrectionRecord;
}

/**
 * Soft-deletes a site record, sending it to the 30-day Recycle Bin.
 */
export async function softDeleteSite(siteId: string, userEmail: string): Promise<void> {
  const docRef = doc(db, SITES_COLLECTION, siteId);
  const now = Timestamp.now();
  // 30 days retention = 30 * 24 * 60 * 60 seconds = 2,592,000 seconds
  const purgeSeconds = now.seconds + 30 * 24 * 60 * 60;
  const expiresForPurgeAt = new Timestamp(purgeSeconds, now.nanoseconds);

  await updateDoc(docRef, {
    isDeleted: true,
    deletedAt: now,
    deletedBy: userEmail,
    expiresForPurgeAt,
    updatedAt: now
  });
}

/**
 * Restores a soft-deleted site record back to active status.
 */
export async function restoreSite(siteId: string): Promise<void> {
  const docRef = doc(db, SITES_COLLECTION, siteId);
  const now = Timestamp.now();

  await updateDoc(docRef, {
    isDeleted: false,
    deletedAt: null,
    deletedBy: null,
    expiresForPurgeAt: null,
    updatedAt: now
  });
}

/**
 * Subscribes in real-time to active sites for a given calendar year.
 * Only returns latest valid versions (excluding superseded versions and soft-deleted records).
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
 * Subscribes to the 30-day Recycle Bin.
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
