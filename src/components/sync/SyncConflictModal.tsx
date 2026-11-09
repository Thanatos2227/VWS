/**
 * src/components/sync/SyncConflictModal.tsx
 * 
 * Offline Concurrency Conflict Review Modal (SCR-11).
 * Displays side-by-side comparison between local offline drafts and server records
 * when an optimistic concurrency version collision is detected upon reconnection.
 * Complies with DOC-002 (§3, SCR-11) and REC-10.
 */

import React from 'react';
import { SiteRecord } from '../../types/database';
import { toRupees, formatIndianRupees } from '../../utils/money';
import { 
  AlertTriangle, 
  X, 
  Cloud, 
  HardDrive, 
  Check, 
  Trash2, 
  Edit3 
} from 'lucide-react';

export interface ConflictReviewProps {
  isOpen: boolean;
  onClose: () => void;
  serverRecord: SiteRecord;
  localDraft: SiteRecord;
  onApplyLocal: () => Promise<void>;
  onDiscardDraft: () => void;
  onEditDraft: () => void;
}

export const SyncConflictModal: React.FC<ConflictReviewProps> = ({
  isOpen,
  onClose,
  serverRecord,
  localDraft,
  onApplyLocal,
  onDiscardDraft,
  onEditDraft
}) => {
  if (!isOpen) return null;

  const serverBill = toRupees(serverRecord.billValuePaise);
  const serverDiscount = toRupees(serverRecord.discountPaise);
  const serverFinal = toRupees(serverRecord.finalValuePaise);

  const localBill = toRupees(localDraft.billValuePaise);
  const localDiscount = toRupees(localDraft.discountPaise);
  const localFinal = toRupees(localDraft.finalValuePaise);

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl w-full max-w-3xl max-h-[92vh] flex flex-col shadow-2xl border border-slate-200">
        
        {/* Header */}
        <div className="px-6 py-4 bg-amber-50/60 border-b border-amber-100 flex items-center justify-between rounded-t-3xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Sync Conflict Detected (SCR-11)
              </h2>
              <p className="text-xs text-amber-800">
                A newer version of this customer record was committed to the cloud while you were working offline.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-white rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Side-by-Side Comparison Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Left: Server Version */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Cloud className="w-4 h-4 text-sky-600" />
                  <span>Cloud Server Record</span>
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-100 text-sky-800">
                  Version {serverRecord.version}
                </span>
              </div>

              <div className="space-y-2 text-xs">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">Customer</span>
                  <span className="font-bold text-slate-900">{serverRecord.customerName}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">Location</span>
                  <span className="text-slate-700">{serverRecord.location}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">Contact</span>
                  <span className="text-slate-700">{serverRecord.contactNumber}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">Bill No. & Mode</span>
                  <span className="font-mono text-slate-700">{serverRecord.billNumber} • {serverRecord.paymentMode}</span>
                </div>
                <div className="pt-2 border-t border-slate-200">
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">Financials</span>
                  <div className="font-bold text-slate-900">
                    Gross: {formatIndianRupees(serverBill)} | Disc: {formatIndianRupees(serverDiscount)}
                  </div>
                  <div className="text-sm font-black text-sky-700 mt-0.5">
                    Payable: {formatIndianRupees(serverFinal)}
                  </div>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">Tanks</span>
                  <span className="text-slate-700">
                    {serverRecord.totalTanks} tanks ({serverRecord.tanks.map((t) => `${t.tankType} ${t.length}x${t.breadth}x${t.height}ft`).join(', ')})
                  </span>
                </div>
              </div>
            </div>

            {/* Right: Local Offline Draft */}
            <div className="p-4 bg-amber-50/40 border border-amber-200 rounded-2xl space-y-3">
              <div className="flex items-center justify-between border-b border-amber-200 pb-2">
                <span className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                  <HardDrive className="w-4 h-4 text-amber-600" />
                  <span>Your Offline Draft</span>
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                  Version {localDraft.version} (Local)
                </span>
              </div>

              <div className="space-y-2 text-xs">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">Customer</span>
                  <span className={`font-bold ${localDraft.customerName !== serverRecord.customerName ? 'text-amber-800 font-black' : 'text-slate-900'}`}>
                    {localDraft.customerName}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">Location</span>
                  <span className={localDraft.location !== serverRecord.location ? 'text-amber-800 font-bold' : 'text-slate-700'}>
                    {localDraft.location}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">Contact</span>
                  <span className={localDraft.contactNumber !== serverRecord.contactNumber ? 'text-amber-800 font-bold' : 'text-slate-700'}>
                    {localDraft.contactNumber}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">Bill No. & Mode</span>
                  <span className="font-mono text-slate-700">
                    {localDraft.billNumber} • {localDraft.paymentMode}
                  </span>
                </div>
                <div className="pt-2 border-t border-amber-200">
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">Financials</span>
                  <div className="font-bold text-slate-900">
                    Gross: {formatIndianRupees(localBill)} | Disc: {formatIndianRupees(localDiscount)}
                  </div>
                  <div className="text-sm font-black text-amber-700 mt-0.5">
                    Payable: {formatIndianRupees(localFinal)}
                  </div>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">Tanks</span>
                  <span className="text-slate-700">
                    {localDraft.totalTanks} tanks ({localDraft.tanks.map((t) => `${t.tankType} ${t.length}x${t.breadth}x${t.height}ft`).join(', ')})
                  </span>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* Action Buttons */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 rounded-b-3xl flex flex-wrap items-center justify-between gap-2">
          <button
            onClick={onDiscardDraft}
            className="px-4 py-2 text-xs font-bold text-red-600 hover:bg-red-50 rounded-xl transition-colors flex items-center gap-1.5"
          >
            <Trash2 className="w-4 h-4" />
            <span>Discard Local Draft (Keep Cloud)</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={onEditDraft}
              className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Edit Local Values</span>
            </button>
            <button
              onClick={onApplyLocal}
              className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold rounded-xl shadow-md shadow-sky-600/20 transition-all flex items-center gap-1.5"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Commit as New Correction (v{serverRecord.version + 1})</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
