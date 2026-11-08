/**
 * src/types/database.ts
 * 
 * Authoritative TypeScript Domain Interfaces for Vetri Water Solutions (VWS)
 * Derived strictly from VWS_DATABASE_SCHEMA.md (DOC-005)
 */

import { Timestamp } from 'firebase/firestore';

export type PredefinedTankType = 'OHT' | 'UG';
export type TankType = PredefinedTankType | (string & {});

export type PaymentMode = 'Cash' | 'Online';
export type RecordStatus = 'ACTIVE' | 'SUPERSEDED';

export type ExpenseCategory = 
  | 'DIESEL'
  | 'PETROL'
  | 'SALARY'
  | 'DAILY_LABOUR'
  | 'MAINTENANCE_AND_SPARES';

export interface TankSpec {
  tankId?: string;                     // e.g. "tank_1"
  tankIndex?: number;                  // 1-based index
  tankType: TankType;                  // Strictly 'OHT' | 'UG' in initial UI (DEC-25)
  length: number;                      // Length in Feet (ft)
  breadth: number;                     // Breadth in Feet (ft)
  height: number;                      // Height in Feet (ft)
  capacityLitres: number;              // Volume in Litres (L) = L * B * H * 28.317
  capacity?: number;                   // Alias for capacityLitres
  measurementUnit?: 'Feet';            // 'Feet'
  capacityUnit?: 'Litres';             // 'Litres'
  notes?: string;
}

// Backward-compatible alias
export type TankCleaningDetail = TankSpec;

export interface GoogleLocationData {
  mapsUrl?: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  } | null;
  captureMethod?: 'MANUAL_URL' | 'GPS' | 'BOTH' | 'NONE';
}

export interface SiteRecord {
  id: string;                          // Document ID (UUIDv4)
  sequenceNumber: number;              // Monotonic sequence (system_counters/sites_seq)
  siteNumber?: number;                 // Display alias for sequenceNumber
  year: number;                        // Calendar Year (e.g. 2026)
  calendarYear?: number;               // Alias for year
  workDate: string;                    // "YYYY-MM-DD"
  customerName: string;
  location: string;
  contactNumber: string;
  googleLocation?: string | GoogleLocationData | null;
  
  // Single Combined Billing Fields
  billNumber: string;                  // Manually entered from physical bill book (DEC-10)
  paymentMode: PaymentMode;            // 'Cash' | 'Online' (Mandatory explicit choice; DEC-11)
  totalTanks: number;                  // Number of tanks
  tanks: TankSpec[];                   // Tank specifications array
  
  billValuePaise: number;              // Gross billing in integer paise (REC-04)
  discountPaise: number;               // Discount in paise
  finalValuePaise: number;             // Net bill in paise = billValuePaise - discountPaise
  
  // Non-Destructive Versioning (v1 -> v2 -> v3)
  version: number;                     // 1, 2, 3...
  originalRecordId: string;            // Root document ID (v1)
  previousRecordId?: string | null;    // Predecessor version ID (null for v1)
  status: RecordStatus;                // 'ACTIVE' | 'SUPERSEDED'
  isLatestValidVersion: boolean;       // true for active version
  correctedAt?: Timestamp | Date | null;
  correctionReason?: string | null;    // Optional reason for correction (DEC-01)
  
  // Soft-Deletion & 30-Day Recycle Bin
  isDeleted: boolean;
  deletedAt?: Timestamp | Date | null;
  deletedBy?: string | null;
  expiresForPurgeAt?: Timestamp | Date | null; // 30-day purge threshold
  
  createdAt: Timestamp | Date;
  updatedAt: Timestamp | Date;
  createdBy?: string;
}

export interface SalaryEntry {
  type: 'INDIVIDUAL' | 'COMBINED_LUMP_SUM';
  staffName?: string;
  amountPaise: number;
  salaryMonth?: string;                // e.g. "2026-03" (POQ-01 dual attribution)
  notes?: string;
}

// Backward-compatible alias
export type ExpenseItem = SalaryEntry;

export interface OfficialExpenseData {
  refreshmentPaise: number;
  transportPaise: number;
  sparesHOPaise: number;
  staffAttendanceCount: number;        // Worker headcount present (DEC-13)
  staffAttendanceExpensePaise: number; // Combined Wages + Tea + Bata (DEC-13)
  salaryEntries?: SalaryEntry[];
  staffSalaryPaise: number;
  notes?: string;
  totalOfficialPaise: number;
}

export interface PersonalExpenseData {
  transportPaise: number;
  refreshmentPaise: number;
  groceriesVegMilkPaise: number;
  lunchDinnerPaise: number;
  otherPaise: number;
  notes?: string;
  totalPersonalPaise: number;
}

export interface DailyAccountsRecord {
  id?: string;
  entryDate: string;                   // "YYYY-MM-DD"
  date?: string;                       // Alias for entryDate
  year?: number;
  calendarYear?: number;
  
  official: OfficialExpenseData;
  personal: PersonalExpenseData;
  
  dailyGrandTotalPaise: number;
  revisionsCount: number;
  
  isDeleted?: boolean;
  deletedAt?: Timestamp | Date | null;
  deletedBy?: string | null;
  expiresForPurgeAt?: Timestamp | Date | null;
  
  createdAt?: Timestamp | Date;
  updatedAt?: Timestamp | Date;
  createdBy?: string;
}

export type DailyAccountRecord = DailyAccountsRecord;

export interface AuditLogEntry {
  revisionId: string;
  entryDate?: string;
  timestamp: Timestamp | Date;
  modifiedBy: string;
  previousTotals?: {
    officialPaise: number;
    personalPaise: number;
    grandTotalPaise: number;
  };
  newTotals?: {
    officialPaise: number;
    personalPaise: number;
    grandTotalPaise: number;
  };
  reason?: string;
}

export type CanonicalTaskType = 
  | 'SCHEDULED_DAILY_BACKUP'
  | 'CLIENT_MANUAL_EXPORT'
  | 'DATABASE_JSON_DUMP'
  | 'DRIVE_RESUMABLE_UPLOAD'
  | 'METADATA_AUDIT';

export type CanonicalTaskStatus = 
  | 'PENDING'
  | 'CLAIMED'
  | 'RUNNING'
  | 'SUCCEEDED'
  | 'RETRY_WAIT'
  | 'FAILED_PERMANENT'
  | 'WAITING_REAUTH';

export interface SystemTaskRecord {
  taskId: string;
  taskType: CanonicalTaskType;
  status: CanonicalTaskStatus;
  idempotencyKey: string;
  payload: Record<string, unknown>;
  initiatingSource: 'CLOUD_SCHEDULER' | 'CLIENT_WEB' | 'CLIENT_ANDROID' | 'WORKER_INTERNAL';
  initiatorInstanceId: string;
  leaseOwner?: string | null;
  leaseExpiry?: Timestamp | Date | null;
  heartbeatAt?: Timestamp | Date | null;
  createdAt: Timestamp | Date;
  scheduledFor: Timestamp | Date;
  attempts: number;
  maxAttempts: number;
  nextRetryAt?: Timestamp | Date | null;
  exportVersion?: number | null;
  payloadChecksum?: string | null;
  stagedPayloadUri?: string | null;
  payloadSizeBytes?: number | null;
  driveFileId?: string | null;
  errorClassification?: string | null;
  terminalFailureReason?: string | null;
  lastError?: string | null;
  updatedAt: Timestamp | Date;
  completedAt?: Timestamp | Date | null;
}

export interface CommittedOperationRecord {
  idempotencyKey: string;
  operationId: string;
  status: 'IN_PROGRESS' | 'COMMITTED' | 'ABORTED_TERMINAL';
  fenceToken: number;
  leaseExpiresAt: Timestamp | Date;
  workerId: string;
  targetCollection: 'sites' | 'accounts_daily';
  committedServerDocId?: string | null;
  committedVersion?: number | null;
  serverCommittedAt?: Timestamp | Date | null;
  terminalReason?: string | null;
  abortedAt?: Timestamp | Date | null;
  clientDeviceId: string;
  createdAt: Timestamp | Date;
  updatedAt: Timestamp | Date;
}

export interface MasterWorkbookPointerRecord {
  currentDriveFileId: string;
  currentFileName: string;
  currentExportVersion: number;
  publicationStatus: 'PUBLISHED_TO_ROOT' | 'ROOT_COPY_FAILED';
  checksumSha256: string;
  updatedAt: Timestamp | Date;
}
