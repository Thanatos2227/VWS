/**
 * src/constants/app.ts
 * 
 * Application-wide constants for Vetri Water Solutions.
 * Governed strictly by confirmed owner decisions DEC-01 through DEC-25.
 */

import { TankType, PaymentMode, ExpenseCategory } from '../types/database';

/**
 * Authoritative business owner email (DEC-02).
 * Application is private single-owner; all client routing and database access is restricted to this email.
 */
export const AUTHORIZED_OWNER_EMAIL = 'vetriwatersolution@gmail.com';

/**
 * Allowed Tank Cleaning Types (DEC-08 & DEC-25).
 * Initial release form presents strictly OHT and UG with zero custom text inputs.
 */
export const TANK_TYPES: readonly TankType[] = ['OHT', 'UG'] as const;

export const TANK_TYPE_LABELS: Record<TankType, string> = {
  OHT: 'Overhead Tank (OHT)',
  UG: 'Underground Sump (UG)',
};

/**
 * Payment Modes (DEC-07).
 * Mandatory explicit choice on field form; no silent default to Cash.
 */
export const PAYMENT_MODES: readonly PaymentMode[] = ['Cash', 'Online'] as const;

export const PAYMENT_MODE_LABELS: Record<PaymentMode, string> = {
  Cash: 'Cash Payment',
  Online: 'Online / UPI / Bank Transfer',
};

/**
 * Expense Categories (DEC-11).
 * Maintained as one combined business/personal ledger with 5 confirmed categories.
 */
export const EXPENSE_CATEGORIES: readonly ExpenseCategory[] = [
  'DIESEL',
  'PETROL',
  'SALARY',
  'DAILY_LABOUR',
  'MAINTENANCE_AND_SPARES',
] as const;

export const EXPENSE_CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  DIESEL: 'Diesel (Vehicle / Generator)',
  PETROL: 'Petrol (Two-Wheeler / Machine)',
  SALARY: 'Staff Monthly Salary',
  DAILY_LABOUR: 'Daily Labour & Bata',
  MAINTENANCE_AND_SPARES: 'Machine Spares & Maintenance',
};

/**
 * Recycle Bin Retention Period (DEC-12).
 * Soft-deleted records are retained for 30 days before permanent deletion eligibility.
 */
export const RECYCLE_BIN_RETENTION_DAYS = 30;

/**
 * Target Google Drive Root Folder Name (DEC-15).
 */
export const GOOGLE_DRIVE_ROOT_FOLDER = 'Vetri Water Solutions';
export const GOOGLE_DRIVE_BACKUPS_FOLDER = 'Backups';
export const GOOGLE_DRIVE_DATABASE_BACKUPS_FOLDER = 'Database_Backups';
