/**
 * src/components/sites/SiteHistoryModal.tsx
 * 
 * Version History Timeline Modal (SCR-06).
 * Displays full non-destructive audit progression (v1 -> v2 -> v3) for a customer site.
 * Complies with DOC-002 (§2.3.4) and Authoritative Decisions PD-01 through PD-04.
 */

import React, { useState, useEffect } from 'react';
import { SiteRecord } from '../../types/database';
import { getSiteVersionHistory } from '../../services/siteService';
import { toRupees, formatIndianRupees } from '../../utils/money';
import { 
  X, 
  History, 
  CheckCircle2, 
  Clock, 
  Loader2, 
  FileText
} from 'lucide-react';

function toMillis(val: unknown): number {
  if (!val) return 0;
  if (val instanceof Date) return val.getTime();
  if (typeof val === 'object' && val !== null && 'toMillis' in val && typeof (val as { toMillis: () => number }).toMillis === 'function') {
    return (val as { toMillis: () => number }).toMillis();
  }
  return 0;
}

interface SiteHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  site: SiteRecord | null;
}

export const SiteHistoryModal: React.FC<SiteHistoryModalProps> = ({
  isOpen,
  onClose,
  site
}) => {
  const [history, setHistory] = useState<SiteRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !site) return;

    let mounted = true;
    setLoading(true);
    setError(null);

    const rootId = site.originalRecordId || site.id;
    getSiteVersionHistory(rootId)
      .then((records) => {
        if (mounted) {
          // If no linked records found (e.g. single version), display current
          if (records.length === 0) {
            setHistory([site]);
          } else {
            setHistory(records);
          }
        }
      })
      .catch((err) => {
        if (mounted) {
          console.error('[SiteHistory] Error loading versions:', err);
          setError('Failed to load version history.');
        }
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [isOpen, site]);

  if (!isOpen || !site) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl border border-slate-200">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center">
              <History className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Version History — {site.customerName}
              </h2>
              <p className="text-xs text-slate-500">
                Physical Bill #{site.billNumber} • {site.location}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Timeline */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center text-slate-400 text-xs">
              <Loader2 className="w-6 h-6 text-sky-600 animate-spin mb-2" />
              <span>Loading immutable version chain...</span>
            </div>
          ) : error ? (
            <div className="p-4 bg-red-50 text-red-700 text-xs rounded-xl border border-red-200">
              {error}
            </div>
          ) : history.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              No version history records found.
            </div>
          ) : (
            <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-200">
              {history.map((rec) => {
                const isLatest = rec.isLatestValidVersion;
                const corrMs = toMillis(rec.correctedAt);
                const creatMs = toMillis(rec.createdAt);
                const formattedDate = corrMs > 0
                  ? new Date(corrMs).toLocaleString('en-IN')
                  : creatMs > 0
                    ? new Date(creatMs).toLocaleString('en-IN')
                    : 'Initial Record';

                return (
                  <div key={rec.id} className="relative group">
                    {/* Node Dot */}
                    <div className={`absolute -left-6 top-1.5 w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      isLatest 
                        ? 'bg-sky-600 border-white ring-2 ring-sky-300' 
                        : 'bg-slate-300 border-white'
                    }`}>
                      {isLatest && <div className="w-2 h-2 rounded-full bg-white" />}
                    </div>

                    {/* Version Card */}
                    <div className={`p-4 rounded-2xl border transition-all ${
                      isLatest 
                        ? 'bg-sky-50/50 border-sky-200 shadow-xs' 
                        : 'bg-slate-50 border-slate-200 text-slate-600'
                    }`}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                            isLatest 
                              ? 'bg-sky-600 text-white' 
                              : 'bg-slate-200 text-slate-700'
                          }`}>
                            Version {rec.version} {rec.version === 1 ? '(Original)' : '(Correction)'}
                          </span>
                          {isLatest ? (
                            <span className="text-[11px] font-bold text-emerald-700 flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              Active Live Version
                            </span>
                          ) : (
                            <span className="text-[11px] font-semibold text-slate-400">
                              Superseded
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>{formattedDate}</span>
                        </div>
                      </div>

                      {/* Correction Reason */}
                      {rec.correctionReason && (
                        <div className="mb-3 p-2.5 bg-white border border-slate-200/80 rounded-xl text-xs flex items-start gap-2">
                          <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-bold text-slate-700">Reason: </span>
                            <span className="text-slate-600">{rec.correctionReason}</span>
                          </div>
                        </div>
                      )}

                      {/* Snapshot Values */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                        <div className="bg-white p-2 rounded-lg border border-slate-200/60">
                          <span className="text-[10px] text-slate-400 block font-semibold">Tanks</span>
                          <span className="font-bold text-slate-800">
                            {rec.totalTanks} ({rec.tanks.map((t) => t.tankType).join(', ')})
                          </span>
                        </div>
                        <div className="bg-white p-2 rounded-lg border border-slate-200/60">
                          <span className="text-[10px] text-slate-400 block font-semibold">Bill Value</span>
                          <span className="font-bold text-slate-800">
                            {formatIndianRupees(toRupees(rec.billValuePaise))}
                          </span>
                        </div>
                        <div className="bg-white p-2 rounded-lg border border-slate-200/60">
                          <span className="text-[10px] text-slate-400 block font-semibold">Discount</span>
                          <span className="font-bold text-amber-700">
                            {formatIndianRupees(toRupees(rec.discountPaise))}
                          </span>
                        </div>
                        <div className="bg-white p-2 rounded-lg border border-slate-200/60">
                          <span className="text-[10px] text-slate-400 block font-semibold">Final Payable</span>
                          <span className="font-black text-emerald-700">
                            {formatIndianRupees(toRupees(rec.finalValuePaise))}
                          </span>
                        </div>
                      </div>

                      {/* Tanks Dimensions List */}
                      <div className="mt-3 text-[11px] space-y-1 text-slate-600 border-t border-slate-200/60 pt-2">
                        {rec.tanks.map((t, tIdx) => (
                          <div key={tIdx} className="flex items-center justify-between">
                            <span>
                              Tank #{t.tankIndex} ({t.tankType}): {t.length}x{t.breadth}x{t.height} ft
                            </span>
                            <span className="font-semibold text-slate-700">
                              {t.capacityLitres.toLocaleString('en-IN')} L
                            </span>
                          </div>
                        ))}
                      </div>

                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 rounded-b-3xl flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-colors"
          >
            Close History
          </button>
        </div>

      </div>
    </div>
  );
};
