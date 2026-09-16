"use client";

import { useState, useEffect } from "react";
import {
  X,
  Camera,
  ScanLine,
  Loader2,
  CheckCircle2,
  XCircle,
  Film,
  Building2,
  Tv,
  Clock,
  User,
  Armchair,
} from "lucide-react";
import { BookingService } from "@/app/service/booking.service";
import { TicketCheckInResponse } from "@/app/types/api.types";
import { useSettings } from "@/app/context/SettingsContext"; // <--- 1. Import useSettings

interface QrScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (data: TicketCheckInResponse) => void;
}

export default function QrScannerModal({
  isOpen,
  onClose,
  onSuccess,
}: QrScannerModalProps) {
  const { theme } = useSettings(); // <--- 2. Get theme context
  const isLight = theme === "light";

  const [bookingCode, setBookingCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TicketCheckInResponse | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setBookingCode("");
      setResult(null);
      setErrorMsg(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleValidate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanCode = bookingCode.trim().toUpperCase();
    if (!cleanCode) return;

    setLoading(true);
    setErrorMsg(null);
    setResult(null);

    try {
      const data = await BookingService.checkInTicket(cleanCode);
      setResult(data);
      if (onSuccess) onSuccess(data);
    } catch (err: any) {
      setErrorMsg(
        err.response?.data?.status?.message ||
          err.response?.data?.message ||
          "Invalid ticket or not eligible for admission.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setBookingCode("");
    setResult(null);
    setErrorMsg(null);
  };

  /**
   * =========================================================
   * DYNAMIC THEME CLASSES
   * =========================================================
   */
  const modalBgClass = isLight
    ? "border-slate-200 bg-white shadow-2xl shadow-slate-300/50 text-slate-900"
    : "border-slate-800 bg-slate-900 shadow-2xl text-slate-100";

  const borderCol = isLight ? "border-slate-200" : "border-slate-800";
  const textPrimary = isLight ? "text-slate-900" : "text-white";
  const textSecondary = isLight ? "text-slate-500" : "text-slate-400";
  const textMuted = isLight ? "text-slate-400" : "text-slate-600";

  const inputClass = isLight
    ? "border-slate-300 bg-slate-50 text-slate-900 placeholder-slate-400 focus:border-red-500"
    : "border-slate-700 bg-slate-950 text-white placeholder-slate-600 focus:border-red-500";

  const closeButtonClass = isLight
    ? "border-slate-200 bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900"
    : "border-slate-800 bg-slate-950 text-slate-400 hover:text-white";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-md">
      <div
        className={`relative w-full max-w-lg rounded-3xl border p-6 sm:p-8 space-y-5 animate-in zoom-in-95 transition-colors duration-300 ${modalBgClass}`}
      >
        {/* Header */}
        <div
          className={`flex items-center justify-between border-b ${borderCol} pb-4`}
        >
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-600/10 border border-red-500/20 text-red-500">
              <ScanLine className="h-5 w-5" />
            </div>
            <div>
              <h2 className={`text-base font-black ${textPrimary}`}>
                Live Ticket Validation
              </h2>
              <p className={`text-[11px] ${textSecondary}`}>
                Door admission & check-in terminal
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className={`rounded-xl border p-1.5 transition cursor-pointer ${closeButtonClass}`}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Input Form */}
        {!result && (
          <form onSubmit={handleValidate} className="space-y-4">
            <div>
              <label
                className={`block text-[11px] font-bold uppercase tracking-wider ${textSecondary} mb-1.5`}
              >
                Scan or Type Booking Reference
              </label>
              <div className="relative">
                <input
                  type="text"
                  autoFocus
                  value={bookingCode}
                  onChange={(e) => setBookingCode(e.target.value.toUpperCase())}
                  placeholder="e.g. BK-20260815-A1B2C3"
                  className={`w-full rounded-2xl border py-3.5 pl-4 pr-12 font-mono text-sm font-bold uppercase outline-none transition ${inputClass}`}
                />
                <button
                  type="submit"
                  disabled={loading || !bookingCode.trim()}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-xl bg-red-600 px-3 py-2 text-xs font-bold text-white hover:bg-red-500 disabled:opacity-50 transition cursor-pointer"
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Verify"
                  )}
                </button>
              </div>
            </div>

            {errorMsg && (
              <div className="flex items-center gap-2 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-500">
                <XCircle className="h-4 w-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}
          </form>
        )}

        {/* Verification Success View */}
        {result && (
          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-950/20 p-5 space-y-4 animate-in fade-in">
            <div className="flex items-center justify-between border-b border-emerald-500/20 pb-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                <span className={`text-xs font-mono font-bold ${textPrimary}`}>
                  {result.bookingNumber}
                </span>
              </div>
              <span className="rounded-md bg-emerald-500/20 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
                CHECKED_IN
              </span>
            </div>

            <div className="space-y-2 text-xs">
              <div
                className={`flex items-center gap-2 ${isLight ? "text-slate-800" : "text-slate-300"}`}
              >
                <Film className="h-3.5 w-3.5 text-red-500" />
                <span className={`font-bold ${textPrimary}`}>
                  {result.movieTitle}
                </span>
              </div>
              <div className={`flex items-center gap-2 ${textSecondary}`}>
                <Building2 className="h-3.5 w-3.5 text-slate-500" />
                <span>{result.cinemaName}</span>
                <span>•</span>
                <Tv className="h-3.5 w-3.5 text-slate-500" />
                <span>{result.hallName}</span>
              </div>
              <div className="flex items-center gap-2 text-emerald-500 font-mono">
                <Clock className="h-3.5 w-3.5" />
                <span>{result.showtime}</span>
              </div>
              <div
                className={`flex items-center gap-2 ${isLight ? "text-slate-700" : "text-slate-300"} pt-1 border-t ${borderCol}`}
              >
                <User className="h-3.5 w-3.5 text-slate-500" />
                <span>
                  {result.customerName} ({result.customerEmail})
                </span>
              </div>
            </div>

            {/* Reserved Seats List */}
            <div
              className={`rounded-xl ${isLight ? "bg-slate-50 border border-slate-200" : "bg-slate-950 border border-slate-800"} p-3`}
            >
              <p
                className={`text-[10px] font-bold ${textSecondary} uppercase tracking-wider mb-2`}
              >
                Assigned Seats ({result.seatNumbers?.length || 0})
              </p>
              <div className="flex flex-wrap gap-1.5">
                {result.seatNumbers?.map((seat, i) => (
                  <span
                    key={i}
                    className="flex items-center gap-1 rounded-lg bg-red-600/10 border border-red-500/20 px-2.5 py-1 font-mono text-xs font-bold text-red-500"
                  >
                    <Armchair className="h-3 w-3" />
                    {seat}
                  </span>
                ))}
              </div>
            </div>

            <button
              onClick={handleReset}
              className={`w-full rounded-xl border py-2.5 text-xs font-bold transition cursor-pointer ${
                isLight
                  ? "border-slate-300 bg-slate-100 text-slate-800 hover:bg-slate-200"
                  : "border-slate-700 bg-slate-800 text-white hover:bg-slate-700"
              }`}
            >
              Scan Next Ticket
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
