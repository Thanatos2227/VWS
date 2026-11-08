/**
 * src/types/database.ts
 * 
 * Authoritative TypeScript Domain Interfaces for Vetri Water Solutions (VWS)
 * Derived strictly from VWS_DATABASE_SCHEMA.md (DOC-005)
 */

export type TankType = 'OHT' | 'UG';

export interface TankCleaningDetail {
  tankType: TankType;
  dimensions: {
    length: number;    // feet
    breadth: number;   // feet
    height: number;    // feet
  };
  capacityLitres: number; // Formula: L * B * H * 28.317
}

export type PaymentMode = 'CASH' | 'ONLINE';

export interface SiteRecord {
  id: string;                          // Document ID (UUIDv4)
  sequenceNumber: number;              // Monotonic sequence allocated server-side from system_counters/sites_seq
  siteName: string;                    // Customer / Site Name
  contactNumber: string;               // 10-digit Indian mobile number
  locationUrl?: string | null;         // Google Maps URL (pasted or GPS-derived)
  gpsCoordinates?: {
    latitude: number;
    longitude: number;
    accuracy?: number;
  } | null;
  cleaningDate: string;                // ISO date: "YYYY-MM-DD"
  calendarYear: number;                // e.g. 2026
  physicalBillNumber: string;          // Manually entered from paper bill book (DEC-09)
  
  // Tanks cleaned at this site visit (DEC-06)
  tanks: TankCleaningDetail[];
  totalTanksCount: number;

  // Single-Bill Financials (DEC-06, DEC-07)
  billValue: number;                   // Gross bill amount
  discount: number;                    // Discount deducted
  finalValue: number;                  // Net collected = billValue - discount
  paymentMode: PaymentMode;            // CASH or ONLINE (mandatory choice, no default)

  // Non-Destructive Versioning (DEC-20 through DEC-24)
  version: number;                     // 1, 2, 3...
  isLatestValidVersion: boolean;       // true for the active row; false for superseded predecessors
  originalRecordId: string;            // Root document ID (v1)
  previousRecordId?: string | null;    // Immediate predecessor ID (null for v1)
  correctionReason?: string | null;    // Optional reason for correction (DEC-20)
  
  // Soft-Deletion & 30-Day Recycle Bin (DEC-12)
  isDeleted: boolean;                  // Soft-delete flag
  deletedAt?: Date | null;             // Timestamp when moved to Recycle Bin

  // System & Audit
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;                   // "vetriwatersolutions@gmail.com"
}

export type ExpenseCategory = 
  | 'DIESEL'
  | 'PETROL'
  | 'SALARY'
  | 'DAILY_LABOUR'
  | 'MAINTENANCE_AND_SPARES';

export interface ExpenseItem {
  id: string;                          // UUIDv4
  category: ExpenseCategory;
  amount: number;
  description: string;
  isPersonal: boolean;                 // true = personal ledger; false = official business ledger
  
  // Staff Specific Metadata (DEC-13, DEC-14, POQ-01)
  workerHeadcount?: number;            // For DAILY_LABOUR: count of staff on site
  staffName?: string;                  // For SALARY: staff member name
  salaryMonth?: string;                // For SALARY: e.g. "2026-02" (POQ-01 dual attribution)
}

export interface DailyAccountsRecord {
  id: string;                          // Document ID: "YYYY-MM-DD"
  date: string;                        // "YYYY-MM-DD"
  calendarYear: number;                // e.g. 2026
  
  expenses: ExpenseItem[];
  
  // Calculated Aggregates
  totalOfficialExpenses: number;
  totalPersonalExpenses: number;
  totalExpenses: number;
  totalCollections: number;            // Daily collections from site visits
  netDailyBalance: number;             // totalCollections - totalExpenses

  // Revision & Audit Log
  revisionsCount: number;              // Monotonic revision counter
  updatedAt: Date;
}

export interface AuditLogEntry {
  revisionId: string;                  // UUIDv4
  dateId: string;                      // "YYYY-MM-DD"
  revisionNumber: number;
  timestamp: Date;
  modifiedBy: string;
  fieldDiff: Record<string, { oldValue: unknown; newValue: unknown }>;
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
  taskId: string;                      // TASK_{type}_{scope}
  taskType: CanonicalTaskType;
  status: CanonicalTaskStatus;
  idempotencyKey: string;              // IDEMP_{type}_{scope}
  payload: Record<string, unknown>;
  
  initiatingSource: 'CLOUD_SCHEDULER' | 'CLIENT_WEB' | 'CLIENT_ANDROID' | 'WORKER_INTERNAL';
  initiatorInstanceId: string;
  leaseOwner?: string | null;
  leaseExpiry?: Date | null;
  heartbeatAt?: Date | null;
  
  createdAt: Date;
  scheduledFor: Date;
  attempts: number;
  maxAttempts: number;
  nextRetryAt?: Date | null;
  
  exportVersion?: number | null;
  payloadChecksum?: string | null;
  stagedPayloadUri?: string | null;
  payloadSizeBytes?: number | null;
  driveFileId?: string | null;
  
  errorClassification?: string | null;
  terminalFailureReason?: string | null;
  lastError?: string | null;
  
  updatedAt: Date;
  completedAt?: Date | null;
}

export type OperationStatus = 'IN_PROGRESS' | 'COMMITTED' | 'NOT_COMMITTED' | 'ABORTED' | 'UNKNOWN';

export interface CommittedOperationRecord {
  idempotencyKey: string;              // OP_IDEMP_{deviceId}_{targetDocId}_{baseRev}_{revNum}_{hash}
  operationId: string;                 // UUIDv4
  operationType: 'SITE_JOB_COMMIT' | 'SITE_CORRECTION_COMMIT' | 'DAILY_ACCOUNTS_COMMIT';
  status: OperationStatus;
  targetDocId: string;
  targetCollection: string;
  
  workerId?: string | null;
  fenceToken?: number | null;
  leaseExpiresAt?: Date | null;
  
  committedAt?: Date | null;
  serverTimestamp?: Date | null;
  firstDispatchedAt?: Date | null;
  executionResult?: Record<string, unknown> | null;
  
  terminalReason?: string | null;
  abortedAt?: Date | null;
}

export interface MasterWorkbookPointerRecord {
  id: 'master_workbook_pointer';
  currentDriveFileId: string;
  currentExportVersion: number;
  checksumSha256: string;
  publicationStatus: 'POINTER_COMMITTED' | 'PUBLISHED_TO_ROOT' | 'ROOT_COPY_FAILED';
  updatedAt: Date;
}
