
import React from 'react';
import { Bell } from 'lucide-react';
import { NotificationCounts } from '../../types/improvedReminder';

interface NotificationIndicatorProps {
  counts: NotificationCounts;
  onClick: () => void;
  className?: string;
}

export const NotificationIndicator: React.FC<NotificationIndicatorProps> = ({
  counts,
  onClick,
  className = ''
}) => {
  const { dueToday, overdue, totalActionable } = counts;

  return (
    <button
      onClick={onClick}
      className={`relative p-2.5 rounded-xl transition-all flex items-center justify-center border ${
        totalActionable > 0
          ? 'bg-white/15 hover:bg-white/25 active:bg-white/30 text-white border-white/25'
          : 'bg-white/10 hover:bg-white/20 active:bg-white/25 text-white border-white/20'
      } ${className}`}
      title={
        totalActionable > 0
          ? `Service Reminders: ${dueToday} due today, ${overdue} overdue`
          : 'Service Reminders'
      }
      aria-label={totalActionable > 0 ? `Service Reminders: ${totalActionable} actionable` : 'Service Reminders'}
    >
      <Bell className="w-4 h-4 text-white" />

      {totalActionable > 0 && (
        <span
          className={`absolute -top-1.5 -right-1.5 min-w-4 h-4 px-1 rounded-full text-[10px] font-black flex items-center justify-center shadow-xs text-white ${
            overdue > 0 ? 'bg-rose-500 ring-2 ring-white/20' : 'bg-amber-500 ring-2 ring-white/20'
          }`}
        >
          {totalActionable > 99 ? '99+' : totalActionable}
        </span>
      )}
    </button>
  );
};
