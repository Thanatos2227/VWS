
import { TankType, PaymentMode, ExpenseCategory } from '../types/database';

export const AUTHORIZED_OWNER_EMAIL = 'vetriwatersolution@gmail.com';

export const TANK_TYPES: readonly TankType[] = ['OHT', 'UG'] as const;

export const TANK_TYPE_LABELS: Record<TankType, string> = {
  OHT: 'Overhead Tank (OHT)',
  UG: 'Underground Sump (UG)',
};

export const PAYMENT_MODES: readonly PaymentMode[] = ['Cash', 'Online'] as const;

export const PAYMENT_MODE_LABELS: Record<PaymentMode, string> = {
  Cash: 'Cash Payment',
  Online: 'Online / UPI / Bank Transfer',
};

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

export const RECYCLE_BIN_RETENTION_DAYS = 30;

export const GOOGLE_DRIVE_ROOT_FOLDER = 'Vetri Water Solutions';
export const GOOGLE_DRIVE_BACKUPS_FOLDER = 'Backups';
export const GOOGLE_DRIVE_DATABASE_BACKUPS_FOLDER = 'Database_Backups';
