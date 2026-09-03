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
          "Invalid ticket or not eligible for admission."
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
      <div className="relative w-full max-w-lg rounded-3xl border border-slate-800 bg-slate-900 p-6 sm:p-8 shadow-2xl space-y-5 animate-in zoom-in-95">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-600/10 border border-red-500/20 text-red-500">
              <ScanLine className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-white">Live Ticket Validation</h2>
              <p className="text-[11px] text-slate-400">Door admission & check-in terminal</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded-xl border border-slate-800 bg-slate-950 p-1.5 text-slate-400 hover:text-white transition cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Input Form */}
        {!result && (
          <form onSubmit={handleValidate} className="space-y-4">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Scan or Type Booking Reference
              </label>
              <div className="relative">
                <input
                  type="text"
                  autoFocus
                  value={bookingCode}
                  onChange={(e) => setBookingCode(e.target.value.toUpperCase())}
                  placeholder="e.g. BK-20260815-A1B2C3"
                  className="w-full rounded-2xl border border-slate-700 bg-slate-950 py-3.5 pl-4 pr-12 font-mono text-sm font-bold text-white uppercase placeholder-slate-600 outline-none focus:border-red-500 transition"
                />
                <button
                  type="submit"
                  disabled={loading || !bookingCode.trim()}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-xl bg-red-600 px-3 py-2 text-xs font-bold text-white hover:bg-red-500 disabled:opacity-50 transition cursor-pointer"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Verify"}
                </button>
              </div>
            </div>

            {errorMsg && (
              <div className="flex items-center gap-2 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-400">
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
                <span className="text-xs font-mono font-bold text-white">
                  {result.bookingNumber}
                </span>
              </div>
              <span className="rounded-md bg-emerald-500/20 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
                CHECKED_IN
              </span>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex items-center gap-2 text-slate-300">
                <Film className="h-3.5 w-3.5 text-red-500" />
                <span className="font-bold text-white">{result.movieTitle}</span>
              </div>
              <div className="flex items-center gap-2 text-slate-400">
                <Building2 className="h-3.5 w-3.5 text-slate-500" />
                <span>{result.cinemaName}</span>
                <span>•</span>
                <Tv className="h-3.5 w-3.5 text-slate-500" />
                <span>{result.hallName}</span>
              </div>
              <div className="flex items-center gap-2 text-emerald-400 font-mono">
                <Clock className="h-3.5 w-3.5" />
                <span>{result.showtime}</span>
              </div>
              <div className="flex items-center gap-2 text-slate-300 pt-1 border-t border-slate-800">
                <User className="h-3.5 w-3.5 text-slate-500" />
                <span>
                  {result.customerName} ({result.customerEmail})
                </span>
              </div>
            </div>

            {/* Reserved Seats List */}
            <div className="rounded-xl bg-slate-950 p-3 border border-slate-800">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                Assigned Seats ({result.seatNumbers?.length || 0})
              </p>
              <div className="flex flex-wrap gap-1.5">
                {result.seatNumbers?.map((seat, i) => (
                  <span
                    key={i}
                    className="flex items-center gap-1 rounded-lg bg-red-600/10 border border-red-500/20 px-2.5 py-1 font-mono text-xs font-bold text-red-400"
                  >
                    <Armchair className="h-3 w-3" />
                    {seat}
                  </span>
                ))}
              </div>
            </div>

            <button
              onClick={handleReset}
              className="w-full rounded-xl bg-slate-800 border border-slate-700 py-2.5 text-xs font-bold text-white hover:bg-slate-700 transition cursor-pointer"
            >
              Scan Next Ticket
            </button>
          </div>
        )}
      </div>
    </div>
  );
}