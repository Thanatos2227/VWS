
export type ImprovedReminderStatus = 'due_today' | 'overdue' | 'upcoming' | 'completed';

export interface StoredReminderCycle {
  reminderId: string;
  siteId: string;
  customerKey: string;
  serviceDate: string;
  intervalDays: number;
  reminderDate: string;
  generatedAt: string;
}

export interface ImprovedServiceReminder {
  id: string;
  siteId: string;
  customerName: string;
  contactNumber: string;
  location: string;
  previousServiceDate: string;
  nextReminderDate: string;
  reminderType: string;
  status: ImprovedReminderStatus;
  completedAt?: string | null;
  intervalDays: number;
  totalTanks?: number;
  isDueToday: boolean;
  isOverdue: boolean;
  daysRemainingOrOverdue: number;
}

export interface NotificationCounts {
  dueToday: number;
  overdue: number;
  totalActionable: number;
}
