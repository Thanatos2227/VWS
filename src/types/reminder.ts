
export type ReminderStatus = 'upcoming' | 'overdue' | 'completed';

export interface ServiceReminder {
  id: string;
  siteId: string;
  customerName: string;
  contactNumber: string;
  location: string;
  previousServiceDate: string;
  nextReminderDate: string;
  reminderType: string;
  status: ReminderStatus;
  completedAt?: string | null;
  intervalDays: number;
  totalTanks?: number;
}

export interface CompletedReminderMetadata {
  completedAt: string;
  completedDate: string;
}
