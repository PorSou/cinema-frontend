"use client";

import { useState } from "react";
import {
  QrCode,
  ScanLine,
  CheckCircle2,
  XCircle,
  Clock,
  Film,
  Building2,
  Tv,
  User,
  Armchair,
  Loader2,
  History,
  Camera,
} from "lucide-react";
import { BookingService } from "@/app/service/booking.service";
import { TicketCheckInResponse } from "@/app/types/api.types";
import QrScannerModal from "@/app/components/QrScannerModal";
import Toast from "@/app/components/Toast";

// Helper function to format 24-hour time string to 12-hour AM/PM format
const formatDateTime = (dateString?: string) => {
  if (!dateString) return "N/A";
  try {
    const cleaned = dateString.replace("T", " ");
    const [datePart, timePart] = cleaned.split(" ");
    if (!timePart) return cleaned;

    const [hourStr, minuteStr] = timePart.split(":");
    let hour = parseInt(hourStr, 10);
    const ampm = hour >= 12 ? "PM" : "AM";
    hour = hour % 12;
    hour = hour ? hour : 12;

    return `${datePart} • ${hour}:${minuteStr} ${ampm}`;
  } catch {
    return dateString;
  }
};

export default function AdminScannerPage() {
  const [bookingCode, setBookingCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [currentPass, setCurrentPass] = useState<TicketCheckInResponse | null>(null);
  const [checkInLog, setCheckInLog] = useState<TicketCheckInResponse[]>([]);

  const [toast, setToast] = useState<{ message: string | null; type: "success" | "error" }>({
    message: null,
    type: "success",
  });

  const handleValidate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanCode = bookingCode.trim().toUpperCase();
    if (!cleanCode) return;

    setLoading(true);
    try {
      const data = await BookingService.checkInTicket(cleanCode);
      handleCheckInSuccess(data);
      setBookingCode("");
    } catch (err: any) {
      setToast({
        message:
          err.response?.data?.status?.message ||
          err.response?.data?.message ||
          "Check-in failed: Pass is invalid, expired, or already used.",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCheckInSuccess = (data: TicketCheckInResponse) => {
    setCurrentPass(data);
    setCheckInLog((prev) => [data, ...prev.filter((item) => item.bookingNumber !== data.bookingNumber)]);
    setToast({
      message: `Checked in successfully: ${data.bookingNumber}`,
      type: "success",
    });
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-8 max-w-7xl mx-auto space-y-6 pb-24">
      <Toast
        message={toast.message}
        type={toast.type}
        onClose={() => setToast({ message: null, type: "success" })}
      />

      <QrScannerModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={handleCheckInSuccess}
      />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <ScanLine className="h-6 w-6 text-red-500 shrink-0" />
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
              Gate Admission & Pass Scanner
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Validate entry tickets, verify seating allocations, and track auditorium attendance in real time
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center justify-center gap-2 rounded-xl bg-red-600 px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-red-600/30 hover:bg-red-500 transition cursor-pointer w-full sm:w-auto"
        >
          <Camera className="h-4 w-4" />
          <span>Launch Camera Scanner</span>
        </button>
      </div>

      {/* Main Validation Console */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Direct Barcode / Ref Input */}
        <div className="lg:col-span-6 space-y-6">
          <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur-md shadow-xl space-y-4">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">
              Manual Reference Check
            </h2>

            <form onSubmit={handleValidate} className="space-y-4">
              <div className="relative">
                <input
                  type="text"
                  value={bookingCode}
                  onChange={(e) => setBookingCode(e.target.value.toUpperCase())}
                  placeholder="Scan barcode or type BK-XXXXXXXX..."
                  className="w-full rounded-2xl border border-slate-700 bg-slate-950 py-3.5 pl-4 pr-24 font-mono text-sm font-bold text-white placeholder-slate-600 outline-none focus:border-red-500 transition uppercase"
                />
                <button
                  type="submit"
                  disabled={loading || !bookingCode.trim()}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-xl bg-red-600 px-4 py-2 text-xs font-bold text-white hover:bg-red-500 disabled:opacity-50 transition cursor-pointer"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Validate"}
                </button>
              </div>
            </form>

            <div className="flex items-center gap-3 pt-2 text-xs text-slate-500 border-t border-slate-800/80">
              <QrCode className="h-4 w-4 text-red-500 shrink-0" />
              <span>Compatible with hardware USB scanners, handheld 2D imagers, and live camera QR scanning.</span>
            </div>
          </div>

          {/* Active Checked-In Pass Result Card */}
          {currentPass && (
            <div className="rounded-3xl border border-emerald-500/30 bg-emerald-950/20 p-6 backdrop-blur-md shadow-xl space-y-4 animate-in zoom-in-95">
              <div className="flex items-center justify-between border-b border-emerald-500/20 pb-3">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-6 w-6 text-emerald-400" />
                  <div>
                    <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block">
                      Admission Approved
                    </span>
                    <span className="font-mono text-base font-black text-white">
                      {currentPass.bookingNumber}
                    </span>
                  </div>
                </div>
                <span className="rounded-lg bg-emerald-500/20 border border-emerald-500/30 px-3 py-1 text-[11px] font-bold text-emerald-400 font-mono">
                  CHECKED_IN
                </span>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex items-center gap-2 text-slate-200">
                  <Film className="h-4 w-4 text-red-500 shrink-0" />
                  <span className="text-sm font-bold text-white">{currentPass.movieTitle}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-400">
                  <Building2 className="h-4 w-4 text-slate-500 shrink-0" />
                  <span>
                    {currentPass.cinemaName} • {currentPass.hallName}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-emerald-400 font-mono">
                  <Clock className="h-4 w-4 shrink-0" />
                  <span>{formatDateTime(currentPass.showtime)}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-300 pt-2 border-t border-emerald-500/20">
                  <User className="h-4 w-4 text-slate-500 shrink-0" />
                  <span>
                    {currentPass.customerName} ({currentPass.customerEmail})
                  </span>
                </div>
              </div>

              {/* Seats */}
              <div className="rounded-2xl bg-slate-950 p-4 border border-emerald-500/20 space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Admitted Seats ({currentPass.seatNumbers?.length || 0})
                </p>
                <div className="flex flex-wrap gap-2">
                  {currentPass.seatNumbers?.map((seat, idx) => (
                    <span
                      key={idx}
                      className="flex items-center gap-1.5 rounded-xl bg-red-600/10 border border-red-500/30 px-3 py-1 font-mono text-xs font-bold text-red-400"
                    >
                      <Armchair className="h-3.5 w-3.5" />
                      {seat}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Live Session Scan Ledger */}
        <div className="lg:col-span-6">
          <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur-md shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <History className="h-4 w-4 text-slate-400" />
                <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                  Session Check-in Feed
                </h2>
              </div>
              <span className="text-[11px] font-mono font-bold text-slate-400">
                {checkInLog.length} Passes Validated
              </span>
            </div>

            {checkInLog.length > 0 ? (
              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                {checkInLog.map((log) => (
                  <div
                    key={log.bookingNumber}
                    className="p-4 rounded-2xl border border-slate-800 bg-slate-950/60 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-red-400">
                          {log.bookingNumber}
                        </span>
                        <span className="text-slate-500">•</span>
                        <span className="font-semibold text-white truncate">
                          {log.customerName}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 truncate">
                        {log.movieTitle} ({log.hallName})
                      </p>
                    </div>

                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
                        <CheckCircle2 className="h-3 w-3" />
                        Valid
                      </span>
                      <span className="font-mono text-[10px] text-slate-500">
                        {log.seatNumbers?.join(", ")}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex min-h-[220px] flex-col items-center justify-center text-center text-slate-500 text-xs">
                <ScanLine className="h-8 w-8 text-slate-700 mb-2" />
                <p>No admission passes scanned in this session yet.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}