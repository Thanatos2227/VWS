
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
  tankId?: string;
  tankIndex?: number;
  tankType: TankType;
  length: number;
  breadth: number;
  height: number;
  capacityLitres: number;
  capacity?: number;
  measurementUnit?: 'Feet';
  capacityUnit?: 'Litres';
  notes?: string;
}

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
  id: string;
  sequenceNumber: number;
  siteNumber?: number;
  year: number;
  calendarYear?: number;
  workDate: string;
  customerName: string;
  location: string;
  contactNumber: string;
  googleLocation?: string | GoogleLocationData | null;
  
  billNumber: string;
  paymentMode: PaymentMode;
  totalTanks: number;
  tanks: TankSpec[];
  
  billValuePaise: number;
  discountPaise: number;
  finalValuePaise: number;
  
  version: number;
  originalRecordId: string;
  previousRecordId?: string | null;
  status: RecordStatus;
  isLatestValidVersion: boolean;
  correctedAt?: Timestamp | Date | null;
  correctionReason?: string | null;
  
  isDeleted: boolean;
  deletedAt?: Timestamp | Date | null;
  deletedBy?: string | null;
  expiresForPurgeAt?: Timestamp | Date | null;
  
  createdAt: Timestamp | Date;
  updatedAt: Timestamp | Date;
  createdBy?: string;
}

export interface SalaryEntry {
  type: 'INDIVIDUAL' | 'COMBINED_LUMP_SUM';
  staffName?: string;
  amountPaise: number;
  salaryMonth?: string;
  notes?: string;
}

export type ExpenseItem = SalaryEntry;

export interface OfficialExpenseData {
  refreshmentPaise: number;
  transportPaise: number;
  sparesHOPaise: number;
  staffAttendanceCount: number;
  staffAttendanceExpensePaise: number;
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
  entryDate: string;
  date?: string;
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
