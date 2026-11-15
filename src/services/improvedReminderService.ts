
import { SiteRecord } from '../types/database';
import { 
  ImprovedServiceReminder, 
  StoredReminderCycle, 
  NotificationCounts 
} from '../types/improvedReminder';
import { 
  calculateNextReminderDate, 
  determineImprovedReminderStatus,
  getDaysDifference 
} from '../utils/improvedReminder';

export const DEFAULT_REMINDER_INTERVAL_DAYS = 30;
export const REMINDER_INTERVAL_STORAGE_KEY = 'vws_reminder_interval_days';
export const COMPLETED_REMINDERS_STORAGE_KEY = 'vws_completed_reminders';
export const REMINDER_REGISTRY_STORAGE_KEY = 'vws_reminder_registry';

export function getReminderIntervalDays(): number {
  if (typeof window === 'undefined' || !window.localStorage) {
    return DEFAULT_REMINDER_INTERVAL_DAYS;
  }
  try {
    const stored = window.localStorage.getItem(REMINDER_INTERVAL_STORAGE_KEY);
    if (!stored) return DEFAULT_REMINDER_INTERVAL_DAYS;
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
      console.error('[ImprovedReminderService] Failed to persist interval setting:', err);
    }
  }
}

export function getReminderRegistry(): Record<string, StoredReminderCycle> {
  if (typeof window === 'undefined' || !window.localStorage) {
    return {};
  }
  try {
    const raw = window.localStorage.getItem(REMINDER_REGISTRY_STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

export function saveReminderRegistry(registry: Record<string, StoredReminderCycle>): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    window.localStorage.setItem(REMINDER_REGISTRY_STORAGE_KEY, JSON.stringify(registry));
  } catch (err) {
    console.error('[ImprovedReminderService] Failed to save reminder registry:', err);
  }
}

export function getCompletedReminders(): Record<string, { completedAt: string; completedDate: string }> {
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
    console.error('[ImprovedReminderService] Failed to mark reminder completed:', err);
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
    console.error('[ImprovedReminderService] Failed to unmark reminder:', err);
  }
}

export function generateImprovedRemindersFromSites(
  sites: SiteRecord[],
  options?: {
    currentIntervalDays?: number;
    customCompletedMap?: Record<string, { completedAt: string; completedDate: string }>;
    customRegistry?: Record<string, StoredReminderCycle>;
    todayStr?: string;
  }
): ImprovedServiceReminder[] {
  const currentInterval = options?.currentIntervalDays && options.currentIntervalDays > 0
    ? options.currentIntervalDays
    : getReminderIntervalDays();

  const completedMap = options?.customCompletedMap || getCompletedReminders();
  const registry = options?.customRegistry || getReminderRegistry();
  const today = options?.todayStr;

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

  const reminders: ImprovedServiceReminder[] = [];
  let registryChanged = false;

  for (const [customerKey, records] of customerMap.entries()) {
    records.sort((a, b) => {
      const cmpDate = a.workDate.localeCompare(b.workDate);
      if (cmpDate !== 0) return cmpDate;
      return (a.sequenceNumber || 0) - (b.sequenceNumber || 0);
    });

    const latestIndex = records.length - 1;

    for (let i = 0; i < records.length; i++) {
      const site = records[i];
      const isLatestForCustomer = i === latestIndex;

      let intervalForThisReminder: number;
      let nextReminderDate: string;

      if (registry[site.id]) {
        intervalForThisReminder = registry[site.id].intervalDays;
        nextReminderDate = registry[site.id].reminderDate;
      } else {
        intervalForThisReminder = currentInterval;
        nextReminderDate = calculateNextReminderDate(site.workDate, intervalForThisReminder);
        registry[site.id] = {
          reminderId: site.id,
          siteId: site.id,
          customerKey,
          serviceDate: site.workDate,
          intervalDays: intervalForThisReminder,
          reminderDate: nextReminderDate,
          generatedAt: new Date().toISOString()
        };
        registryChanged = true;
      }

      let isCompleted = false;
      let completedAt: string | null = null;

      if (completedMap[site.id]) {
        isCompleted = true;
        completedAt = completedMap[site.id].completedAt;
      } else if (!isLatestForCustomer) {
        isCompleted = true;
        const subsequentService = records[i + 1];
        completedAt = subsequentService ? subsequentService.workDate : site.workDate;
      }

      const status = determineImprovedReminderStatus(nextReminderDate, isCompleted, today);

      let reminderType = 'Water Tank Cleaning';
      if (site.totalTanks && site.totalTanks > 0) {
        reminderType = `Tank Cleaning (${site.totalTanks} ${site.totalTanks === 1 ? 'Tank' : 'Tanks'})`;
      }

      const diffDays = getDaysDifference(nextReminderDate, today);

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
        intervalDays: intervalForThisReminder,
        totalTanks: site.totalTanks,
        isDueToday: status === 'due_today',
        isOverdue: status === 'overdue',
        daysRemainingOrOverdue: diffDays
      });
    }
  }

  if (registryChanged && !options?.customRegistry) {
    saveReminderRegistry(registry);
  }

  return reminders;
}

export function computeNotificationCounts(reminders: ImprovedServiceReminder[]): NotificationCounts {
  let dueToday = 0;
  let overdue = 0;

  for (const r of reminders) {
    if (r.status === 'due_today') {
      dueToday++;
    } else if (r.status === 'overdue') {
      overdue++;
    }
  }

  return {
    dueToday,
    overdue,
    totalActionable: dueToday + overdue
  };
}
