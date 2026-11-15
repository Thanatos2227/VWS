
import { SiteRecord } from '../types/database';
import { ServiceReminder, CompletedReminderMetadata } from '../types/reminder';
import { calculateNextReminderDate, determineReminderStatus } from '../utils/reminder';

export const DEFAULT_REMINDER_INTERVAL_DAYS = 30;
export const REMINDER_INTERVAL_STORAGE_KEY = 'vws_reminder_interval_days';
export const COMPLETED_REMINDERS_STORAGE_KEY = 'vws_completed_reminders';

export function getReminderIntervalDays(): number {
  if (typeof window === 'undefined' || !window.localStorage) {
    return DEFAULT_REMINDER_INTERVAL_DAYS;
  }
  try {
    const stored = window.localStorage.getItem(REMINDER_INTERVAL_STORAGE_KEY);
    if (!stored) {
      return DEFAULT_REMINDER_INTERVAL_DAYS;
    }
    const parsed = parseInt(stored, 10);
    return isNaN(parsed) || parsed <= 0 ? DEFAULT_REMINDER_INTERVAL_DAYS : parsed;
  } catch {
    return DEFAULT_REMINDER_INTERVAL_DAYS;
  }
}

export function setReminderIntervalDays(days: number): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  if (days > 0) {
    try {
      window.localStorage.setItem(REMINDER_INTERVAL_STORAGE_KEY, days.toString());
    } catch (err) {
      console.error('[ReminderService] Failed to persist interval setting:', err);
    }
  }
}

export function getCompletedReminders(): Record<string, CompletedReminderMetadata> {
  if (typeof window === 'undefined' || !window.localStorage) {
    return {};
  }
  try {
    const raw = window.localStorage.getItem(COMPLETED_REMINDERS_STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

export function markReminderCompleted(reminderId: string, completedDate?: string): void {
  if (typeof window === 'undefined' || !window.localStorage || !reminderId) return;
  try {
    const current = getCompletedReminders();
    const nowIso = new Date().toISOString();
    const cDate = completedDate || nowIso.slice(0, 10);
    current[reminderId] = {
      completedAt: nowIso,
      completedDate: cDate
    };
    window.localStorage.setItem(COMPLETED_REMINDERS_STORAGE_KEY, JSON.stringify(current));
  } catch (err) {
    console.error('[ReminderService] Failed to mark reminder completed:', err);
  }
}

export function unmarkReminderCompleted(reminderId: string): void {
  if (typeof window === 'undefined' || !window.localStorage || !reminderId) return;
  try {
    const current = getCompletedReminders();
    if (current[reminderId]) {
      delete current[reminderId];
      window.localStorage.setItem(COMPLETED_REMINDERS_STORAGE_KEY, JSON.stringify(current));
    }
  } catch (err) {
    console.error('[ReminderService] Failed to unmark reminder:', err);
  }
}

export function generateRemindersFromSites(
  sites: SiteRecord[],
  intervalDays?: number,
  customCompletedMap?: Record<string, CompletedReminderMetadata>
): ServiceReminder[] {
  const interval = intervalDays && intervalDays > 0 ? intervalDays : getReminderIntervalDays();
  const completedMap = customCompletedMap || getCompletedReminders();

  const validSites = sites.filter(
    (s) => s && !s.isDeleted && s.isLatestValidVersion && s.customerName?.trim() && s.workDate
  );

  const customerMap = new Map<string, SiteRecord[]>();

  for (const site of validSites) {
    const key = site.contactNumber?.trim() 
      ? `${site.customerName.trim().toLowerCase()}_${site.contactNumber.trim()}`
      : site.customerName.trim().toLowerCase();

    const existing = customerMap.get(key) || [];
    existing.push(site);
    customerMap.set(key, existing);
  }

  const reminders: ServiceReminder[] = [];

  for (const [, records] of customerMap.entries()) {
    records.sort((a, b) => {
      const cmpDate = a.workDate.localeCompare(b.workDate);
      if (cmpDate !== 0) return cmpDate;
      return (a.sequenceNumber || 0) - (b.sequenceNumber || 0);
    });

    const latestIndex = records.length - 1;

    for (let i = 0; i < records.length; i++) {
      const site = records[i];
      const isLatestForCustomer = i === latestIndex;
      const nextReminderDate = calculateNextReminderDate(site.workDate, interval);

      let isCompleted = false;
      let completedAt: string | null = null;

      if (completedMap[site.id]) {
        isCompleted = true;
        completedAt = completedMap[site.id].completedAt;
      } else if (!isLatestForCustomer) {
        isCompleted = true;
        const nextService = records[i + 1];
        completedAt = nextService ? nextService.workDate : site.workDate;
      }

      const status = determineReminderStatus(nextReminderDate, isCompleted);

      let reminderType = 'Water Tank Cleaning';
      if (site.totalTanks && site.totalTanks > 0) {
        reminderType = `Tank Cleaning (${site.totalTanks} ${site.totalTanks === 1 ? 'Tank' : 'Tanks'})`;
      }

      reminders.push({
        id: site.id,
        siteId: site.id,
        customerName: site.customerName.trim(),
        contactNumber: site.contactNumber?.trim() || '',
        location: site.location?.trim() || '',
        previousServiceDate: site.workDate,
        nextReminderDate,
        reminderType,
        status,
        completedAt,
        intervalDays: interval,
        totalTanks: site.totalTanks
      });
    }
  }

  return reminders;
}
