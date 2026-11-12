
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

export async function createSiteEntry(
  data: SiteFormData, 
  creatorEmail: string
): Promise<SiteRecord> {
  if (!data.workDate) throw new Error('Work date is required.');
  if (!data.customerName?.trim()) throw new Error('Customer name is required.');
  if (!data.location?.trim()) throw new Error('Location is required.');
  if (!data.contactNumber?.trim()) throw new Error('Contact number is required.');
  if (!data.billNumber?.trim()) throw new Error('Physical bill number is required.');
  if (!data.paymentMode) throw new Error('Payment mode (Cash or Online) is mandatory.');
  if (!data.tanks || data.tanks.length === 0) throw new Error('At least one tank entry is required.');

  const clientDeviceId = getClientDeviceId();
  const idempotencyKey = generateOperationIdempotencyKey('SITE_CREATE', data.billNumber);

  const payload = adaptSiteFormToJobPayload(data, idempotencyKey, clientDeviceId);

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

export async function purgeExpiredSitesList(): Promise<{ purgedCount: number; purgedSiteIds: string[] }> {
  const result = await callPurgeExpiredSites();
  return {
    purgedCount: result.purgedCount,
    purgedSiteIds: result.purgedSiteIds
  };
}

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

export async function getSiteVersionHistory(originalRecordId: string): Promise<SiteRecord[]> {
  const q = query(
    collection(db, SITES_COLLECTION),
    where('originalRecordId', '==', originalRecordId),
    orderBy('version', 'asc')
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => d.data() as SiteRecord);
}
