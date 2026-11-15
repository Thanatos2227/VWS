
import React, { useState, useEffect, useMemo } from 'react';
import { SiteRecord } from '../../types/database';
import { 
  ImprovedReminderStatus, 
  ImprovedServiceReminder 
} from '../../types/improvedReminder';
import { 
  getReminderIntervalDays, 
  setReminderIntervalDays, 
  getCompletedReminders, 
  markReminderCompleted, 
  unmarkReminderCompleted,
  generateImprovedRemindersFromSites,
  computeNotificationCounts,
  DEFAULT_REMINDER_INTERVAL_DAYS
} from '../../services/improvedReminderService';
import { formatDisplayDate } from '../../utils/improvedReminder';
import { 
  Bell, 
  X, 
  Search, 
  Calendar, 
  Phone, 
  MapPin, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  Settings, 
  SlidersHorizontal,
  ArrowUpDown,
  RotateCcw,
  User,
  ShieldCheck,
  ChevronRight
} from 'lucide-react';

interface ImprovedReminderModalProps {
  isOpen: boolean;
  onClose: () => void;
  sites: SiteRecord[];
  initialFilter?: 'all' | 'due_today' | 'overdue' | 'upcoming' | 'completed';
}

export const ImprovedReminderModal: React.FC<ImprovedReminderModalProps> = ({
  isOpen,
  onClose,
  sites,
  initialFilter = 'all'
}) => {
  const [defaultInterval, setDefaultInterval] = useState<number>(DEFAULT_REMINDER_INTERVAL_DAYS);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [tempIntervalInput, setTempIntervalInput] = useState<string>('30');
  const [settingsSuccessMsg, setSettingsSuccessMsg] = useState<string>('');

  const [completedMap, setCompletedMap] = useState<Record<string, { completedAt: string; completedDate: string }>>({});
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | ImprovedReminderStatus>(initialFilter);
  const [sortAscending, setSortAscending] = useState<boolean>(true);
  const [selectedCustomerReminder, setSelectedCustomerReminder] = useState<ImprovedServiceReminder | null>(null);

  useEffect(() => {
    if (isOpen) {
      const current = getReminderIntervalDays();
      setDefaultInterval(current);
      setTempIntervalInput(current.toString());
      setCompletedMap(getCompletedReminders());
      setSettingsSuccessMsg('');
      setSelectedCustomerReminder(null);
      if (initialFilter) setStatusFilter(initialFilter);
    }
  }, [isOpen, initialFilter]);

  const allReminders: ImprovedServiceReminder[] = useMemo(() => {
    return generateImprovedRemindersFromSites(sites, {
      currentIntervalDays: defaultInterval,
      customCompletedMap: completedMap
    });
  }, [sites, defaultInterval, completedMap]);

  const notificationCounts = useMemo(() => {
    return computeNotificationCounts(allReminders);
  }, [allReminders]);

  const categoryCounts = useMemo(() => {
    let dueToday = 0;
    let overdue = 0;
    let upcoming = 0;
    let completed = 0;

    for (const r of allReminders) {
      if (r.status === 'due_today') dueToday++;
      else if (r.status === 'overdue') overdue++;
      else if (r.status === 'upcoming') upcoming++;
      else if (r.status === 'completed') completed++;
    }

    return {
      total: allReminders.length,
      dueToday,
      overdue,
      upcoming,
      completed
    };
  }, [allReminders]);

  const filteredReminders = useMemo(() => {
    let result = [...allReminders];

    if (statusFilter !== 'all') {
      result = result.filter((r) => r.status === statusFilter);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter((r) => 
        r.customerName.toLowerCase().includes(q) ||
        r.contactNumber.includes(q) ||
        r.location.toLowerCase().includes(q) ||
        r.previousServiceDate.includes(q) ||
        r.nextReminderDate.includes(q)
      );
    }

    result.sort((a, b) => {
      const cmp = a.nextReminderDate.localeCompare(b.nextReminderDate);
      return sortAscending ? cmp : -cmp;
    });

    return result;
  }, [allReminders, statusFilter, searchQuery, sortAscending]);

  const handleSaveInterval = (daysToSave: number) => {
    if (daysToSave <= 0 || isNaN(daysToSave)) return;
    setReminderIntervalDays(daysToSave);
    setDefaultInterval(daysToSave);
    setTempIntervalInput(daysToSave.toString());
    setSettingsSuccessMsg(
      `Default interval updated to ${daysToSave} days. Note: Previously generated reminder dates are safely preserved.`
    );
    setTimeout(() => setSettingsSuccessMsg(''), 5000);
  };

  const handleMarkCompleted = (reminderId: string) => {
    markReminderCompleted(reminderId);
    setCompletedMap(getCompletedReminders());
  };

  const handleUnmarkCompleted = (reminderId: string) => {
    unmarkReminderCompleted(reminderId);
    setCompletedMap(getCompletedReminders());
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div 
        className="bg-white rounded-3xl w-full max-w-4xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-gradient-to-r from-sky-700 via-sky-600 to-cyan-600 p-4 sm:p-6 text-white flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/15 backdrop-blur flex items-center justify-center shadow-inner relative">
              <Bell className="w-5 h-5 text-white" />
              {notificationCounts.totalActionable > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 rounded-full text-[9px] font-black flex items-center justify-center shadow-xs">
                  {notificationCounts.totalActionable > 99 ? '99+' : notificationCounts.totalActionable}
                </span>
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-black tracking-tight leading-tight">
                  Service Reminders & Follow-ups
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/20 text-white backdrop-blur">
                  Default ({defaultInterval}d)
                </span>
              </div>
              <p className="text-xs text-sky-100 mt-0.5">
                Periodic customer reminders automatically scheduled from actual service dates.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsSettingsOpen(!isSettingsOpen)}
              className={`p-2 rounded-xl transition-colors border ${
                isSettingsOpen 
                  ? 'bg-white text-sky-800 border-white font-bold' 
                  : 'bg-white/10 hover:bg-white/20 text-white border-white/20'
              }`}
              title="Reminder Settings"
            >
              <Settings className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 bg-white/10 hover:bg-white/20 active:bg-white/30 text-white rounded-xl transition-colors border border-white/20"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {isSettingsOpen && (
          <div className="bg-sky-50/80 border-b border-sky-100 p-4 sm:p-5 transition-all animate-in slide-in-from-top-2 duration-150">
            <div className="max-w-xl">
              <div className="flex items-center gap-2 text-sky-900 font-bold text-sm mb-1">
                <SlidersHorizontal className="w-4 h-4 text-sky-600" />
                <span>Default Reminder Interval Settings</span>
              </div>
              <p className="text-xs text-slate-600 mb-3">
                Change default service interval for future jobs. Previously generated reminder dates are securely locked and preserved to prevent unexpected changes.
              </p>

              <div className="flex flex-wrap items-center gap-2 mb-3">
                <div className="flex items-center gap-1.5 bg-white border border-slate-300 rounded-xl px-3 py-1.5 shadow-2xs">
                  <span className="text-xs font-semibold text-slate-500">Days:</span>
                  <input
                    type="number"
                    min="1"
                    max="365"
                    value={tempIntervalInput}
                    onChange={(e) => setTempIntervalInput(e.target.value)}
                    className="w-16 text-sm font-bold text-slate-900 outline-none text-center"
                  />
                </div>

                <button
                  onClick={() => handleSaveInterval(Number(tempIntervalInput))}
                  className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors"
                >
                  Save Interval
                </button>

                <div className="flex items-center gap-1 text-xs text-slate-500 pl-2 border-l border-slate-300">
                  <span className="text-[11px] font-medium">Presets:</span>
                  {[15, 30, 45, 60, 90].map((preset) => (
                    <button
                      key={preset}
                      onClick={() => handleSaveInterval(preset)}
                      className={`px-2 py-1 rounded-lg text-xs font-semibold border transition-colors ${
                        defaultInterval === preset
                          ? 'bg-sky-600 text-white border-sky-600'
                          : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
                      }`}
                    >
                      {preset}d{preset === 30 ? ' (Default)' : ''}
                    </button>
                  ))}
                </div>
              </div>

              {settingsSuccessMsg && (
                <div className="flex items-center gap-1.5 text-xs text-emerald-700 font-semibold bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-1.5">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>{settingsSuccessMsg}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {selectedCustomerReminder && (
          <div className="bg-sky-100/70 border-b border-sky-200 p-4 sm:p-5 flex items-start justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-sky-700" />
                <h3 className="font-black text-slate-900 text-base">
                  {selectedCustomerReminder.customerName}
                </h3>
                <span className="text-xs px-2 py-0.5 rounded-full bg-white font-bold text-sky-800 border border-sky-300">
                  {selectedCustomerReminder.status === 'due_today'
                    ? 'Due Today'
                    : selectedCustomerReminder.status === 'overdue'
                    ? 'Overdue'
                    : selectedCustomerReminder.status === 'completed'
                    ? 'Completed'
                    : 'Upcoming'}
                </span>
              </div>

              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-700">
                {selectedCustomerReminder.contactNumber && (
                  <a
                    href={`tel:${selectedCustomerReminder.contactNumber}`}
                    className="flex items-center gap-1 text-sky-700 hover:underline font-semibold"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    <span>{selectedCustomerReminder.contactNumber}</span>
                  </a>
                )}
                {selectedCustomerReminder.location && (
                  <div className="flex items-center gap-1 text-slate-600">
                    <MapPin className="w-3.5 h-3.5" />
                    <span>{selectedCustomerReminder.location}</span>
                  </div>
                )}
                <div className="text-slate-500">
                  Type: <span className="font-medium text-slate-700">{selectedCustomerReminder.reminderType}</span>
                </div>
                <div className="text-slate-500">
                  Interval Used: <span className="font-semibold text-slate-700">{selectedCustomerReminder.intervalDays} days</span>
                </div>
              </div>

              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600 pt-1">
                <div>
                  Actual Service Date: <span className="font-bold text-slate-800">{formatDisplayDate(selectedCustomerReminder.previousServiceDate)}</span>
                </div>
                <div>
                  Calculated Reminder Date: <span className="font-bold text-sky-700">{formatDisplayDate(selectedCustomerReminder.nextReminderDate)}</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => setSelectedCustomerReminder(null)}
              className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-white/60 rounded-xl transition-colors"
              title="Close Details"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        <div className="p-3 sm:p-5 border-b border-slate-100 bg-slate-50/50 space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 sm:gap-2.5">
            <button
              onClick={() => setStatusFilter('all')}
              className={`p-2.5 rounded-2xl text-left border transition-all ${
                statusFilter === 'all'
                  ? 'bg-white border-sky-600 shadow-xs ring-2 ring-sky-600/10'
                  : 'bg-white hover:bg-slate-50 border-slate-200'
              }`}
            >
              <div className="text-[10px] sm:text-[11px] font-semibold text-slate-500">All Reminders</div>
              <div className="text-lg sm:text-xl font-black text-slate-900 mt-0.5">{categoryCounts.total}</div>
            </button>

            <button
              onClick={() => setStatusFilter('due_today')}
              className={`p-2.5 rounded-2xl text-left border transition-all ${
                statusFilter === 'due_today'
                  ? 'bg-amber-50/70 border-amber-600 shadow-xs ring-2 ring-amber-600/15'
                  : 'bg-white hover:bg-slate-50 border-slate-200'
              }`}
            >
              <div className="flex items-center justify-between text-[10px] sm:text-[11px] font-bold text-amber-700">
                <span>Due Today</span>
                <Clock className="w-3.5 h-3.5" />
              </div>
              <div className="text-lg sm:text-xl font-black text-amber-800 mt-0.5">{categoryCounts.dueToday}</div>
            </button>

            <button
              onClick={() => setStatusFilter('overdue')}
              className={`p-2.5 rounded-2xl text-left border transition-all ${
                statusFilter === 'overdue'
                  ? 'bg-rose-50/70 border-rose-600 shadow-xs ring-2 ring-rose-600/15'
                  : 'bg-white hover:bg-slate-50 border-slate-200'
              }`}
            >
              <div className="flex items-center justify-between text-[10px] sm:text-[11px] font-bold text-rose-700">
                <span>Overdue</span>
                <AlertCircle className="w-3.5 h-3.5" />
              </div>
              <div className="text-lg sm:text-xl font-black text-rose-800 mt-0.5">{categoryCounts.overdue}</div>
            </button>

            <button
              onClick={() => setStatusFilter('upcoming')}
              className={`p-2.5 rounded-2xl text-left border transition-all ${
                statusFilter === 'upcoming'
                  ? 'bg-sky-50/70 border-sky-600 shadow-xs ring-2 ring-sky-600/15'
                  : 'bg-white hover:bg-slate-50 border-slate-200'
              }`}
            >
              <div className="flex items-center justify-between text-[10px] sm:text-[11px] font-bold text-sky-700">
                <span>Upcoming</span>
                <Calendar className="w-3.5 h-3.5" />
              </div>
              <div className="text-lg sm:text-xl font-black text-sky-800 mt-0.5">{categoryCounts.upcoming}</div>
            </button>

            <button
              onClick={() => setStatusFilter('completed')}
              className={`p-2.5 rounded-2xl text-left border transition-all col-span-2 sm:col-span-1 ${
                statusFilter === 'completed'
                  ? 'bg-emerald-50/70 border-emerald-600 shadow-xs ring-2 ring-emerald-600/15'
                  : 'bg-white hover:bg-slate-50 border-slate-200'
              }`}
            >
              <div className="flex items-center justify-between text-[10px] sm:text-[11px] font-bold text-emerald-700">
                <span>Completed</span>
                <CheckCircle2 className="w-3.5 h-3.5" />
              </div>
              <div className="text-lg sm:text-xl font-black text-emerald-800 mt-0.5">{categoryCounts.completed}</div>
            </button>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 pt-1">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by customer name, mobile number, location..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <button
              onClick={() => setSortAscending(!sortAscending)}
              className="px-3 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
              title="Toggle Sort Order"
            >
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-500" />
              <span>{sortAscending ? 'Date: Soonest First' : 'Date: Latest First'}</span>
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3 sm:p-5 space-y-2.5">
          {filteredReminders.length === 0 ? (
            <div className="text-center py-12 px-4">
              <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
                <Bell className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-700">No service reminders found</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                {searchQuery || statusFilter !== 'all'
                  ? 'No reminder records match your current filter or search query.'
                  : 'Customer reminders are automatically generated when completed site visits are recorded.'}
              </p>
            </div>
          ) : (
            filteredReminders.map((reminder) => {
              const isDueToday = reminder.status === 'due_today';
              const isOverdue = reminder.status === 'overdue';
              const isCompleted = reminder.status === 'completed';

              return (
                <div
                  key={reminder.id}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                    isCompleted
                      ? 'bg-slate-50/60 border-slate-200 opacity-90'
                      : isDueToday
                      ? 'bg-amber-50/40 border-amber-300 shadow-2xs hover:border-amber-400'
                      : isOverdue
                      ? 'bg-rose-50/40 border-rose-300 shadow-2xs hover:border-rose-400'
                      : 'bg-white border-slate-200 hover:border-sky-300 shadow-2xs'
                  }`}
                  onClick={() => setSelectedCustomerReminder(reminder)}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                    
                    <div className="space-y-1.5 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-slate-900 text-sm sm:text-base">
                          {reminder.customerName}
                        </span>

                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border flex items-center gap-1 ${
                            isCompleted
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : isDueToday
                              ? 'bg-amber-100 text-amber-800 border-amber-300'
                              : isOverdue
                              ? 'bg-rose-100 text-rose-800 border-rose-300'
                              : 'bg-sky-50 text-sky-700 border-sky-200'
                          }`}
                        >
                          {isCompleted ? (
                            <>
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Completed</span>
                            </>
                          ) : isDueToday ? (
                            <>
                              <Clock className="w-3 h-3" />
                              <span>Due Today</span>
                            </>
                          ) : isOverdue ? (
                            <>
                              <AlertCircle className="w-3 h-3" />
                              <span>Overdue ({Math.abs(reminder.daysRemainingOrOverdue)}d)</span>
                            </>
                          ) : (
                            <>
                              <Calendar className="w-3 h-3" />
                              <span>Due in {reminder.daysRemainingOrOverdue}d</span>
                            </>
                          )}
                        </span>

                        <span className="text-[11px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                          {reminder.reminderType}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600">
                        {reminder.contactNumber && (
                          <a
                            href={`tel:${reminder.contactNumber}`}
                            onClick={(e) => e.stopPropagation()}
                            className="flex items-center gap-1 text-sky-700 hover:underline font-medium"
                          >
                            <Phone className="w-3.5 h-3.5" />
                            <span>{reminder.contactNumber}</span>
                          </a>
                        )}

                        {reminder.location && (
                          <div className="flex items-center gap-1 text-slate-500">
                            <MapPin className="w-3.5 h-3.5" />
                            <span>{reminder.location}</span>
                          </div>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-500 pt-1">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span className="text-slate-400">Actual Service Date:</span>
                          <span className="font-semibold text-slate-700">
                            {formatDisplayDate(reminder.previousServiceDate)}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-slate-400">Next Reminder:</span>
                          <span className={`font-bold ${isDueToday ? 'text-amber-700' : isOverdue ? 'text-rose-600' : isCompleted ? 'text-slate-600' : 'text-sky-700'}`}>
                            {formatDisplayDate(reminder.nextReminderDate)}
                          </span>
                          <span className="text-slate-400 text-[10px]">
                            (+{reminder.intervalDays}d)
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 justify-end" onClick={(e) => e.stopPropagation()}>
                      {isCompleted ? (
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] text-emerald-700 font-semibold bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-200">
                            Service Completed
                          </span>
                          <button
                            onClick={() => handleUnmarkCompleted(reminder.id)}
                            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                            title="Reopen reminder"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleMarkCompleted(reminder.id)}
                          className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Mark Completed</span>
                        </button>
                      )}

                      <button
                        onClick={() => setSelectedCustomerReminder(reminder)}
                        className="p-1.5 text-slate-400 hover:text-sky-700 hover:bg-sky-50 rounded-lg transition-colors"
                        title="View details"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>

                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="p-3 sm:p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <div>
            Showing <span className="font-bold text-slate-800">{filteredReminders.length}</span> of{' '}
            <span className="font-bold text-slate-800">{allReminders.length}</span> total customer reminder records
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-xl transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
