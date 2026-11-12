
import React, { useState } from 'react';
import { SiteRecord } from '../../types/database';
import { toRupees, formatIndianRupees } from '../../utils/money';
import { 
  Trash2, 
  RotateCcw, 
  Clock, 
  AlertTriangle, 
  Loader2, 
  CheckCircle2 
} from 'lucide-react';

function toMillis(val: unknown): number {
  if (!val) return 0;
  if (val instanceof Date) return val.getTime();
  if (typeof val === 'object' && val !== null && 'toMillis' in val && typeof (val as { toMillis: () => number }).toMillis === 'function') {
    return (val as { toMillis: () => number }).toMillis();
  }
  return 0;
}

interface RecycleBinScreenProps {
  deletedSites: SiteRecord[];
  onRestoreSite: (siteId: string) => Promise<void>;
}

export const RecycleBinScreen: React.FC<RecycleBinScreenProps> = ({
  deletedSites,
  onRestoreSite
}) => {
  const [restoringId, setRestoringId] = useState<string | null>(null);

  const handleRestore = async (site: SiteRecord) => {
    if (confirm(`Restore customer entry for "${site.customerName}" (Bill #${site.billNumber}) back to the active ledger?`)) {
      setRestoringId(site.id);
      try {
        await onRestoreSite(site.id);
      } finally {
        setRestoringId(null);
      }
    }
  };

  return (
    <div className="space-y-5">
      
      <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-red-100 text-red-700 flex items-center justify-center font-bold">
              <Trash2 className="w-4 h-4" />
            </div>
            <h1 className="text-xl font-black text-slate-900">
              30-Day Recycle Bin
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Soft-deleted customer site records are held securely here for 30 days before permanent purging.
          </p>
        </div>

        <div className="px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-xl text-xs font-bold text-amber-800 flex items-center gap-1.5">
          <Clock className="w-4 h-4 text-amber-600 shrink-0" />
          <span>{deletedSites.length} Items Pending Purge</span>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        {deletedSites.length === 0 ? (
          <div className="py-16 text-center text-slate-400 text-xs sm:text-sm">
            <CheckCircle2 className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <span>The Recycle Bin is currently empty. No soft-deleted records.</span>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {deletedSites.map((site) => {
              const finalRupees = toRupees(site.finalValuePaise);
              
              let daysRemaining = 30;
              if (site.expiresForPurgeAt) {
                const expMillis = toMillis(site.expiresForPurgeAt);
                if (expMillis > 0) {
                  const remainingMs = expMillis - Date.now();
                  daysRemaining = Math.max(0, Math.ceil(remainingMs / (1000 * 60 * 60 * 24)));
                }
              }

              const delMillis = toMillis(site.deletedAt);
              const deletedDateStr = delMillis > 0
                ? new Date(delMillis).toLocaleDateString('en-IN')
                : 'Recently';

              return (
                <div 
                  key={site.id} 
                  className="p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:bg-slate-50/60 transition-colors"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 text-sm sm:text-base">
                        {site.customerName}
                      </span>
                      <span className="font-mono text-xs text-slate-500 font-semibold">
                        (Bill #{site.billNumber})
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">
                        v{site.version}
                      </span>
                    </div>

                    <div className="text-xs text-slate-500 flex flex-wrap items-center gap-x-3 gap-y-1">
                      <span>Work Date: <strong className="text-slate-700">{site.workDate}</strong></span>
                      <span>Location: <strong className="text-slate-700">{site.location}</strong></span>
                      <span>Tanks: <strong className="text-slate-700">{site.totalTanks}</strong></span>
                      <span>Amount: <strong className="text-emerald-700">{formatIndianRupees(finalRupees)}</strong></span>
                    </div>

                    <div className="text-[11px] text-amber-700 flex items-center gap-1.5 pt-1">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>Deleted on {deletedDateStr} by {site.deletedBy || 'Owner'} • <strong>{daysRemaining} days remaining</strong> before purge</span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleRestore(site)}
                    disabled={restoringId === site.id}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-all shadow-sm flex items-center gap-1.5 shrink-0"
                  >
                    {restoringId === site.id ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Restoring...</span>
                      </>
                    ) : (
                      <>
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Restore to Active Ledger</span>
                      </>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
};
