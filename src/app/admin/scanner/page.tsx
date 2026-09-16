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
import { useSettings } from "@/app/context/SettingsContext";

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
  const { theme } = useSettings();
  const isLight = theme === "light";

  const [bookingCode, setBookingCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [currentPass, setCurrentPass] = useState<TicketCheckInResponse | null>(
    null,
  );
  const [checkInLog, setCheckInLog] = useState<TicketCheckInResponse[]>([]);

  const [toast, setToast] = useState<{
    message: string | null;
    type: "success" | "error";
  }>({
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
      const serverMessage =
        err.response?.data?.status?.message ||
        err.response?.data?.message ||
        "Check-in failed: Pass is invalid, expired, or already used.";

      setToast({
        message: serverMessage,
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCheckInSuccess = (data: TicketCheckInResponse) => {
    setCurrentPass(data);
    setCheckInLog((prev) => [
      data,
      ...prev.filter((item) => item.bookingNumber !== data.bookingNumber),
    ]);
    setToast({
      message: `Checked in successfully: ${data.bookingNumber}`,
      type: "success",
    });
  };

  /**
   * =========================================================
   * DYNAMIC THEME CLASSES
   * =========================================================
   */
  const pageClass = isLight
    ? "bg-slate-50 text-slate-900"
    : "bg-slate-950 text-slate-100";

  const cardClass = isLight
    ? "border-slate-300 bg-white shadow-xl shadow-slate-200 ring-1 ring-slate-200"
    : "border-slate-800 bg-slate-900/60 shadow-2xl backdrop-blur-md";

  const inputClass = isLight
    ? "border-slate-300 bg-slate-50 text-slate-900 placeholder-slate-400 focus:border-red-500"
    : "border-slate-700 bg-slate-950 text-white placeholder-slate-600 focus:border-red-500";

  const subCardClass = isLight
    ? "border-slate-300 bg-slate-100/70 text-slate-800 shadow-sm"
    : "border-slate-800 bg-slate-950/60 text-slate-200";

  const textPrimary = isLight
    ? "text-slate-900 font-black"
    : "text-white font-black";
  const textSecondary = isLight
    ? "text-slate-700 font-bold"
    : "text-slate-400 font-medium";
  const textMuted = isLight
    ? "text-slate-600 font-bold"
    : "text-slate-600 font-medium";
  const borderCol = isLight ? "border-slate-300" : "border-slate-800";

  return (
    <div
      className={`min-h-screen p-4 sm:p-8 w-full space-y-6 pb-24 transition-colors duration-300 ${pageClass}`}
    >
      <style jsx global>{`
        /* Completely hide scrollbars for Chrome, Safari, Edge, and Firefox */
        ::-webkit-scrollbar {
          display: none;
        }
        * {
          -ms-overflow-style: none; /* IE and Edge */
          scrollbar-width: none; /* Firefox */
        }
      `}</style>

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
      <div
        className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b ${borderCol} pb-5`}
      >
        <div>
          <div className="flex items-center gap-2">
            <ScanLine className="h-6 w-6 text-red-600 shrink-0" />
            <h1
              className={`text-xl sm:text-2xl font-black tracking-tight ${textPrimary}`}
            >
              Gate Admission & Pass Scanner
            </h1>
          </div>
          <p className={`text-xs ${textSecondary} mt-1`}>
            Validate entry tickets, verify seating allocations, and track
            auditorium attendance in real time
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
          <div
            className={`rounded-3xl border ${cardClass} p-6 backdrop-blur-md shadow-xl space-y-4`}
          >
            <h2
              className={`text-sm font-black uppercase tracking-wider ${textPrimary}`}
            >
              Manual Reference Check
            </h2>

            <form onSubmit={handleValidate} className="space-y-4">
              <div className="relative">
                <input
                  type="text"
                  value={bookingCode}
                  onChange={(e) => setBookingCode(e.target.value.toUpperCase())}
                  placeholder="Scan barcode or type BK-XXXXXXXX..."
                  className={`w-full rounded-2xl border py-3.5 pl-4 pr-24 font-mono text-sm font-bold outline-none transition uppercase ${inputClass}`}
                />
                <button
                  type="submit"
                  disabled={loading || !bookingCode.trim()}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-xl bg-red-600 px-4 py-2 text-xs font-bold text-white hover:bg-red-500 disabled:opacity-50 transition cursor-pointer"
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Validate"
                  )}
                </button>
              </div>
            </form>

            <div
              className={`flex items-center gap-3 pt-2 text-xs ${textSecondary} border-t ${borderCol}`}
            >
              <QrCode className="h-4 w-4 text-red-600 shrink-0" />
              <span>
                Compatible with hardware USB scanners, handheld 2D imagers, and
                live camera QR scanning.
              </span>
            </div>
          </div>

          {/* Active Checked-In Pass Result Card */}
          {currentPass && (
            <div
              className={`rounded-3xl border ${isLight ? "border-emerald-500/50 bg-emerald-50/70" : "border-emerald-500/30 bg-emerald-950/20"} p-6 backdrop-blur-md shadow-xl space-y-4 animate-in zoom-in-95`}
            >
              <div
                className={`flex items-center justify-between border-b ${isLight ? "border-emerald-500/30" : "border-emerald-500/20"} pb-3`}
              >
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                  <div>
                    <span className="text-[10px] font-black text-emerald-700 dark:text-emerald-400 uppercase tracking-wider block">
                      Admission Approved
                    </span>
                    <span
                      className={`font-mono text-base font-black ${textPrimary}`}
                    >
                      {currentPass.bookingNumber}
                    </span>
                  </div>
                </div>
                <span className="rounded-lg bg-emerald-500/20 border border-emerald-500/30 px-3 py-1 text-[11px] font-black text-emerald-700 dark:text-emerald-400 font-mono">
                  CHECKED_IN
                </span>
              </div>

              <div className="space-y-2 text-xs">
                <div className={`flex items-center gap-2 ${textSecondary}`}>
                  <Film className="h-4 w-4 text-red-600 shrink-0" />
                  <span className={`text-sm font-black ${textPrimary}`}>
                    {currentPass.movieTitle}
                  </span>
                </div>
                <div className={`flex items-center gap-2 ${textSecondary}`}>
                  <Building2 className="h-4 w-4 text-slate-500 shrink-0" />
                  <span>
                    {currentPass.cinemaName} • {currentPass.hallName}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-mono font-bold">
                  <Clock className="h-4 w-4 shrink-0" />
                  <span>{formatDateTime(currentPass.showtime)}</span>
                </div>
                <div
                  className={`flex items-center gap-2 ${textSecondary} pt-2 border-t ${isLight ? "border-emerald-500/30" : "border-emerald-500/20"}`}
                >
                  <User className="h-4 w-4 text-slate-500 shrink-0" />
                  <span>
                    {currentPass.customerName} ({currentPass.customerEmail})
                  </span>
                </div>
              </div>

              {/* Seats */}
              <div
                className={`rounded-2xl ${isLight ? "bg-white border border-emerald-500/40 shadow-sm" : "bg-slate-950 border border-emerald-500/20"} p-4 space-y-2`}
              >
                <p className="text-[10px] font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                  Admitted Seats ({currentPass.seatNumbers?.length || 0})
                </p>
                <div className="flex flex-wrap gap-2">
                  {currentPass.seatNumbers?.map((seat, idx) => (
                    <span
                      key={idx}
                      className="flex items-center gap-1.5 rounded-xl bg-red-600/15 border border-red-500/30 px-3 py-1 font-mono text-xs font-black text-red-600 dark:text-red-400"
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
          <div
            className={`rounded-3xl border ${cardClass} p-6 backdrop-blur-md shadow-xl space-y-4`}
          >
            <div
              className={`flex items-center justify-between border-b ${borderCol} pb-3`}
            >
              <div className="flex items-center gap-2">
                <History className={`h-4 w-4 ${textSecondary}`} />
                <h2
                  className={`text-sm font-black uppercase tracking-wider ${textPrimary}`}
                >
                  Session Check-in Feed
                </h2>
              </div>
              <span
                className={`text-[11px] font-mono font-bold ${textSecondary}`}
              >
                {checkInLog.length} Passes Validated
              </span>
            </div>

            {checkInLog.length > 0 ? (
              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                {checkInLog.map((log) => (
                  <div
                    key={log.bookingNumber}
                    className={`p-4 rounded-2xl border ${subCardClass} flex items-center justify-between gap-3 text-xs`}
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-black text-red-600">
                          {log.bookingNumber}
                        </span>
                        <span className={textMuted}>•</span>
                        <span className={`font-black ${textPrimary} truncate`}>
                          {log.customerName}
                        </span>
                      </div>
                      <p className={`text-[11px] ${textSecondary} truncate`}>
                        {log.movieTitle} ({log.hallName})
                      </p>
                    </div>

                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-black text-emerald-700 dark:text-emerald-400">
                        <CheckCircle2 className="h-3 w-3" />
                        Valid
                      </span>
                      <span
                        className={`font-mono text-[10px] font-bold ${textSecondary}`}
                      >
                        {log.seatNumbers?.join(", ")}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div
                className={`flex min-h-[220px] flex-col items-center justify-center text-center ${textSecondary} text-xs`}
              >
                <ScanLine className={`h-8 w-8 ${textMuted} mb-2`} />
                <p>No admission passes scanned in this session yet.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
