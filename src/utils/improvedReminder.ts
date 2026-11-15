
import { ImprovedReminderStatus } from '../types/improvedReminder';

export function formatDateToYMD(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function parseYMDToDate(ymd: string): Date {
  const parts = ymd.split('-').map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) {
    return new Date();
  }
  return new Date(parts[0], parts[1] - 1, parts[2], 0, 0, 0, 0);
}

export function calculateNextReminderDate(serviceDateStr: string, intervalDays: number): string {
  if (!serviceDateStr || intervalDays <= 0) return serviceDateStr;
  const baseDate = parseYMDToDate(serviceDateStr);
  const nextDate = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate() + intervalDays);
  return formatDateToYMD(nextDate);
}

export function getDaysDifference(targetDateStr: string, baseDateStr?: string): number {
  const target = parseYMDToDate(targetDateStr).getTime();
  const base = baseDateStr ? parseYMDToDate(baseDateStr).getTime() : parseYMDToDate(formatDateToYMD(new Date())).getTime();
  const diffMs = target - base;
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

export function determineImprovedReminderStatus(
  nextReminderDateStr: string,
  isCompleted: boolean,
  todayStr?: string
): ImprovedReminderStatus {
  if (isCompleted) return 'completed';
  const today = todayStr || formatDateToYMD(new Date());
  if (nextReminderDateStr === today) {
    return 'due_today';
  }
  if (nextReminderDateStr < today) {
    return 'overdue';
  }
  return 'upcoming';
}

export function formatDisplayDate(ymd: string): string {
  if (!ymd) return '';
  const d = parseYMDToDate(ymd);
  if (isNaN(d.getTime())) return ymd;
  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
}
