
import React, { useState, useEffect } from 'react';
import { SiteRecord } from '../../types/database';
import { SiteFormData } from '../../services/siteService';
import { calculateTankCapacityLitres } from '../../utils/tank';
import { calculateFinalValue, toPaise, toRupees, checkFinancialWarningCeilings, formatIndianRupees } from '../../utils/money';
import { 
  X, 
  Plus, 
  Trash2, 
  MapPin, 
  Navigation, 
  AlertTriangle, 
  CheckCircle2, 
  Loader2,
  Droplets
} from 'lucide-react';

interface SiteEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (formData: SiteFormData) => Promise<void>;
  existingRecord?: SiteRecord | null;
}

export const SiteEntryModal: React.FC<SiteEntryModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  existingRecord
}) => {
  const isCorrection = Boolean(existingRecord);

  const [workDate, setWorkDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [customerName, setCustomerName] = useState<string>('');
  const [location, setLocation] = useState<string>('');
  const [contactNumber, setContactNumber] = useState<string>('');
  const [googleLocation, setGoogleLocation] = useState<string>('');
  const [billNumber, setBillNumber] = useState<string>('');
  const [paymentMode, setPaymentMode] = useState<'Cash' | 'Online' | ''>('');
  const [billValue, setBillValue] = useState<number | ''>('');
  const [discount, setDiscount] = useState<number | ''>('');
  const [correctionReason, setCorrectionReason] = useState<string>('');

  const [tanks, setTanks] = useState<Array<{
    tankType: 'OHT' | 'UG';
    length: number | '';
    breadth: number | '';
    height: number | '';
  }>>([
    { tankType: 'OHT', length: '', breadth: '', height: '' }
  ]);

  const [saving, setSaving] = useState<boolean>(false);
  const [capturingGps, setCapturingGps] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [warningMessage, setWarningMessage] = useState<string | null>(null);

  useEffect(() => {
    if (existingRecord) {
      setWorkDate(existingRecord.workDate);
      setCustomerName(existingRecord.customerName);
      setLocation(existingRecord.location);
      setContactNumber(existingRecord.contactNumber);
      const gLoc = existingRecord.googleLocation;
      setGoogleLocation(typeof gLoc === 'string' ? gLoc : (gLoc?.mapsUrl || ''));
      setBillNumber(existingRecord.billNumber);
      setPaymentMode(existingRecord.paymentMode);
      setBillValue(toRupees(existingRecord.billValuePaise));
      setDiscount(toRupees(existingRecord.discountPaise));
      setCorrectionReason('');
      setTanks(
        existingRecord.tanks.map((t) => ({
          tankType: (t.tankType === 'UG' ? 'UG' : 'OHT') as 'OHT' | 'UG',
          length: t.length,
          breadth: t.breadth,
          height: t.height
        }))
      );
    } else {
      setWorkDate(new Date().toISOString().slice(0, 10));
      setCustomerName('');
      setLocation('');
      setContactNumber('');
      setGoogleLocation('');
      setBillNumber('');
      setPaymentMode('');
      setBillValue('');
      setDiscount('');
      setCorrectionReason('');
      setTanks([{ tankType: 'OHT', length: '', breadth: '', height: '' }]);
    }
    setErrorMessage(null);
    setWarningMessage(null);
  }, [existingRecord, isOpen]);

  if (!isOpen) return null;

  const numericBill = Number(billValue) || 0;
  const numericDiscount = Number(discount) || 0;
  const billPaise = toPaise(numericBill);
  const discountPaise = toPaise(numericDiscount);
  const finalPaise = calculateFinalValue(billPaise, discountPaise).finalValue;
  const finalRupees = toRupees(finalPaise);

  const handleAddTank = () => {
    setTanks([...tanks, { tankType: 'OHT', length: '', breadth: '', height: '' }]);
  };

  const handleRemoveTank = (index: number) => {
    if (tanks.length <= 1) return;
    setTanks(tanks.filter((_, i) => i !== index));
  };

  const handleTankChange = (
    index: number,
    field: 'tankType' | 'length' | 'breadth' | 'height',
    val: string | number
  ) => {
    const updated = [...tanks];
    if (field === 'tankType') {
      updated[index].tankType = val as 'OHT' | 'UG';
    } else {
      updated[index][field] = val === '' ? '' : Number(val);
    }
    setTanks(updated);
  };

  const handleCaptureGps = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }
    setCapturingGps(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const mapsUrl = `https://www.google.com/maps?q=${latitude},${longitude}`;
        setGoogleLocation(mapsUrl);
        setCapturingGps(false);
      },
      (error) => {
        console.warn('Geolocation capture failed or denied:', error.message);
        setCapturingGps(false);
        alert('Could not capture GPS coordinates. You can paste a Google Maps link manually.');
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setWarningMessage(null);

    if (!workDate) {
      setErrorMessage('Work date is required.');
      return;
    }
    if (!customerName.trim() || customerName.trim().length < 2) {
      setErrorMessage('Customer name must be at least 2 characters.');
      return;
    }
    if (!location.trim() || location.trim().length < 2) {
      setErrorMessage('Location must be at least 2 characters.');
      return;
    }
    if (!contactNumber.trim() || contactNumber.trim().length < 6) {
      setErrorMessage('Please enter a valid contact phone number.');
      return;
    }
    if (!billNumber.trim()) {
      setErrorMessage('Physical bill number is required from the bill book.');
      return;
    }
    if (!paymentMode) {
      setErrorMessage('Payment mode selection is mandatory (Select Cash or Online).');
      return;
    }
    if (numericBill <= 0) {
      setErrorMessage('Bill value must be greater than ₹0.');
      return;
    }
    if (numericDiscount > numericBill) {
      setErrorMessage('Discount cannot exceed the gross bill value.');
      return;
    }

    for (let i = 0; i < tanks.length; i++) {
      const t = tanks[i];
      if (Number(t.length) <= 0 || Number(t.breadth) <= 0 || Number(t.height) <= 0) {
        setErrorMessage(`Tank #${i + 1} dimensions (Length, Breadth, Height) must all be greater than 0.`);
        return;
      }
    }

    const warnings = checkFinancialWarningCeilings({ billValue: numericBill });
    if (warnings.length > 0 && !warningMessage) {
      setWarningMessage(warnings.join(' '));
      return;
    }

    setSaving(true);
    try {
      const formData: SiteFormData = {
        workDate,
        customerName,
        location,
        contactNumber,
        googleLocation: googleLocation.trim() || undefined,
        billNumber,
        paymentMode: paymentMode as 'Cash' | 'Online',
        billValue: numericBill,
        discount: numericDiscount,
        correctionReason: isCorrection ? correctionReason : undefined,
        tanks: tanks.map((t) => ({
          tankType: t.tankType,
          length: Number(t.length),
          breadth: Number(t.breadth),
          height: Number(t.height)
        }))
      };

      await onSubmit(formData);
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save site entry.';
      setErrorMessage(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl border border-slate-200">
        
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center">
                <Droplets className="w-4 h-4" />
              </div>
              <h2 className="text-lg font-bold text-slate-900">
                {isCorrection 
                  ? `Correct Site Record (v${existingRecord!.version + 1})` 
                  : 'New Customer Site Entry'}
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {isCorrection 
                ? 'Creates a linked, non-destructive correction version in the immutable ledger.' 
                : 'Enter customer water tank cleaning and billing information.'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {errorMessage && (
            <div className="p-3 bg-red-50 text-red-700 text-xs rounded-xl border border-red-200 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-red-600" />
              <span>{errorMessage}</span>
            </div>
          )}

          {warningMessage && (
            <div className="p-3 bg-amber-50 text-amber-800 text-xs rounded-xl border border-amber-200 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600" />
                <span>{warningMessage} Please confirm if this high amount is intentional.</span>
              </div>
              <button
                type="button"
                onClick={() => setWarningMessage(null)}
                className="px-2 py-1 bg-amber-200 hover:bg-amber-300 font-bold rounded text-[11px] text-amber-900 shrink-0"
              >
                Confirm
              </button>
            </div>
          )}

          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
              1. Customer & Location Details
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Work Date *
                </label>
                <input
                  type="date"
                  value={workDate}
                  onChange={(e) => setWorkDate(e.target.value)}
                  required
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:bg-white focus:border-sky-500 focus:ring-1 focus:ring-sky-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Customer Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Ramesh Kumar"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  required
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:bg-white focus:border-sky-500 focus:ring-1 focus:ring-sky-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Location / Address *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Anna Nagar, Madurai"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  required
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:bg-white focus:border-sky-500 focus:ring-1 focus:ring-sky-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Contact Number *
                </label>
                <input
                  type="tel"
                  placeholder="e.g. 9842100000"
                  value={contactNumber}
                  onChange={(e) => setContactNumber(e.target.value)}
                  required
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:bg-white focus:border-sky-500 focus:ring-1 focus:ring-sky-500 outline-none"
                />
              </div>

              <div className="sm:col-span-2">
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-700">
                    Google Maps Link or GPS (Optional)
                  </label>
                  <button
                    type="button"
                    onClick={handleCaptureGps}
                    disabled={capturingGps}
                    className="text-[11px] font-bold text-sky-700 hover:text-sky-800 flex items-center gap-1"
                  >
                    {capturingGps ? (
                      <>
                        <Loader2 className="w-3 h-3 animate-spin" />
                        <span>Detecting GPS...</span>
                      </>
                    ) : (
                      <>
                        <Navigation className="w-3 h-3" />
                        <span>Capture Current GPS</span>
                      </>
                    )}
                  </button>
                </div>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    placeholder="Paste Google Maps URL or tap 'Capture Current GPS'"
                    value={googleLocation}
                    onChange={(e) => setGoogleLocation(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:bg-white focus:border-sky-500 focus:ring-1 focus:ring-sky-500 outline-none"
                  />
                </div>
              </div>

            </div>
          </div>

          <div className="border-t border-slate-100 pt-5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  2. Tank Measurements (Feet & Litres)
                </h3>
                <p className="text-[11px] text-slate-500">
                  Strict OHT (Overhead) or UG (Underground) selection. Capacity auto-calculated.
                </p>
              </div>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-100">
                {tanks.length} {tanks.length === 1 ? 'Tank' : 'Tanks'}
              </span>
            </div>

            <div className="space-y-3">
              {tanks.map((tank, idx) => {
                const len = Number(tank.length) || 0;
                const brd = Number(tank.breadth) || 0;
                const ht = Number(tank.height) || 0;
                const capacity = (len > 0 && brd > 0 && ht > 0)
                  ? calculateTankCapacityLitres({ length: len, breadth: brd, height: ht })
                  : 0;

                return (
                  <div 
                    key={idx} 
                    className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-700">
                        Tank #{idx + 1}
                      </span>
                      
                      <div className="flex items-center bg-white border border-slate-200 rounded-lg p-0.5 shadow-2xs">
                        <button
                          type="button"
                          onClick={() => handleTankChange(idx, 'tankType', 'OHT')}
                          className={`px-3 py-1 rounded text-xs font-bold transition-colors ${
                            tank.tankType === 'OHT' 
                              ? 'bg-sky-600 text-white shadow-2xs' 
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          OHT (Overhead)
                        </button>
                        <button
                          type="button"
                          onClick={() => handleTankChange(idx, 'tankType', 'UG')}
                          className={`px-3 py-1 rounded text-xs font-bold transition-colors ${
                            tank.tankType === 'UG' 
                              ? 'bg-sky-600 text-white shadow-2xs' 
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          UG (Underground)
                        </button>
                      </div>

                      {tanks.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveTank(idx)}
                          className="p-1 text-slate-400 hover:text-red-600 rounded transition-colors"
                          title="Remove Tank"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-4 gap-2 text-center">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">
                          L (ft) *
                        </label>
                        <input
                          type="number"
                          step="0.1"
                          min="0.1"
                          placeholder="e.g. 10"
                          value={tank.length}
                          onChange={(e) => handleTankChange(idx, 'length', e.target.value)}
                          required
                          className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800 text-center outline-none focus:border-sky-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">
                          B (ft) *
                        </label>
                        <input
                          type="number"
                          step="0.1"
                          min="0.1"
                          placeholder="e.g. 8"
                          value={tank.breadth}
                          onChange={(e) => handleTankChange(idx, 'breadth', e.target.value)}
                          required
                          className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800 text-center outline-none focus:border-sky-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">
                          H (ft) *
                        </label>
                        <input
                          type="number"
                          step="0.1"
                          min="0.1"
                          placeholder="e.g. 6"
                          value={tank.height}
                          onChange={(e) => handleTankChange(idx, 'height', e.target.value)}
                          required
                          className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800 text-center outline-none focus:border-sky-500"
                        />
                      </div>
                      <div className="bg-sky-50/80 rounded-lg p-2 border border-sky-100 flex flex-col justify-center">
                        <span className="text-[10px] font-bold text-sky-700 uppercase">
                          Capacity
                        </span>
                        <span className="text-xs font-black text-sky-900 truncate">
                          {capacity.toLocaleString('en-IN')} L
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}

              <button
                type="button"
                onClick={handleAddTank}
                className="w-full py-2.5 bg-slate-100 hover:bg-slate-200/80 text-slate-700 rounded-xl text-xs font-bold border border-dashed border-slate-300 transition-colors flex items-center justify-center gap-1.5"
              >
                <Plus className="w-4 h-4 text-slate-500" />
                <span>+ Add Another Tank</span>
              </button>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
              3. Billing, Physical Bill Book & Payment Mode
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
              
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Gross Bill Value (₹) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="1"
                  placeholder="e.g. 3500"
                  value={billValue}
                  onChange={(e) => setBillValue(e.target.value === '' ? '' : Number(e.target.value))}
                  required
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:bg-white focus:border-sky-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Discount Given (₹)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={discount}
                  onChange={(e) => setDiscount(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:bg-white focus:border-sky-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Final Payable (₹)
                </label>
                <div className="w-full px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-xl text-sm font-black text-emerald-800">
                  {formatIndianRupees(finalRupees)}
                </div>
              </div>

            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Physical Bill Book No. *
                </label>
                <input
                  type="text"
                  placeholder="e.g. 1042 or VWS-502"
                  value={billNumber}
                  onChange={(e) => setBillNumber(e.target.value)}
                  required
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono font-bold text-slate-800 focus:bg-white focus:border-sky-500 outline-none"
                />
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Enter number from owner's physical bill book (never auto-generated).
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Payment Mode * (Explicit Selection)
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentMode('Cash')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all ${
                      paymentMode === 'Cash'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    Cash
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMode('Online')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all ${
                      paymentMode === 'Online'
                        ? 'bg-sky-600 text-white border-sky-600 shadow-sm'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    Online (UPI/Bank)
                  </button>
                </div>
                {!paymentMode && (
                  <p className="text-[10px] text-amber-600 font-medium mt-0.5">
                    Please explicitly choose Cash or Online.
                  </p>
                )}
              </div>

            </div>
          </div>

          {isCorrection && (
            <div className="border-t border-slate-100 pt-5">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Correction Reason (Optional — DEC-01)
              </label>
              <input
                type="text"
                placeholder="e.g. Corrected tank height measurement or customer phone number"
                value={correctionReason}
                onChange={(e) => setCorrectionReason(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:border-sky-500 outline-none"
              />
              <p className="text-[10px] text-slate-400 mt-0.5">
                Leaving this reason blank will never block saving your correction.
              </p>
            </div>
          )}

        </form>

        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 rounded-b-3xl flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-200/80 rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={saving}
            className="px-5 py-2.5 bg-sky-600 hover:bg-sky-700 active:bg-sky-800 disabled:opacity-60 text-white text-xs font-bold rounded-xl shadow-md shadow-sky-600/20 transition-all flex items-center gap-1.5"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Saving Ledger Record...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>{isCorrection ? 'Commit Correction' : 'Save Site Entry'}</span>
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
};
