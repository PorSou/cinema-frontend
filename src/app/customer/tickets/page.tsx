"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Ticket,
  Loader2,
  Clock,
  Building,
  CheckCircle2,
  Ban,
  ArrowLeft,
  QrCode,
  Film,
  Tv,
} from "lucide-react";
import Toast from "@/app/components/Toast";

import BookingService from "@/app/service/booking.service";
import { BookingResponse } from "@/app/types/api.types";
import { useSettings } from "@/app/context/SettingsContext";

const STATUS_BADGES: Record<string, { label: string; color: string }> = {
  CONFIRMED: {
    label: "Confirmed",
    color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
  },
  CHECKED_IN: {
    label: "Checked In",
    color: "bg-blue-500/10 text-blue-400 border-blue-500/30",
  },
  PENDING: {
    label: "Pending Payment",
    color: "bg-amber-500/10 text-amber-400 border-amber-500/30",
  },
  CANCELLED: {
    label: "Cancelled",
    color: "bg-rose-500/10 text-rose-400 border-rose-500/30",
  },
};

const extractArray = <T,>(res: any): T[] => {
  if (Array.isArray(res)) return res;
  if (Array.isArray(res?.content)) return res.content;
  if (Array.isArray(res?.data)) return res.data;
  if (Array.isArray(res?.body?.data)) return res.body.data;
  if (Array.isArray(res?.data?.content)) return res.data.content;
  return [];
};

// Helper function to format 24-hour time to 12-hour AM/PM
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

// Helper function to format poster URL safely
const getPosterUrl = (posterUrl?: string) => {
  if (!posterUrl) return null;
  if (posterUrl.startsWith("http")) return posterUrl;
  const cleanPath = posterUrl.startsWith("/") ? posterUrl.substring(1) : posterUrl;
  if (cleanPath.startsWith("uploads/")) {
    return `http://localhost:8080/${cleanPath}`;
  }
  return `http://localhost:8080/uploads/${cleanPath}`;
};

export default function CustomerTicketsPage() {
  const { theme } = useSettings();
  const isLight = theme === "light";

  const [bookings, setBookings] = useState<BookingResponse[]>([]);
  const [loading, setLoading] = useState(true);

  const [toast, setToast] = useState<{ message: string | null; type: "success" | "error" | "info" }>({
    message: null,
    type: "success",
  });

  const fetchMyBookings = async () => {
    setLoading(true);
    try {
      const res = await BookingService.getMyBookings(0, 20);
      setBookings(extractArray<BookingResponse>(res));
    } catch {
      setToast({ message: "Failed to load your ticket reservations.", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyBookings();
  }, []);

  const handleCancel = async (id: number) => {
    try {
      await BookingService.cancelBooking(id);
      setToast({ message: "Booking successfully cancelled and slots released.", type: "success" });
      fetchMyBookings();
    } catch (err: any) {
      const msg = err.response?.data?.status?.message || err.response?.data?.message || "Failed to cancel booking.";
      setToast({ message: msg, type: "error" });
    }
  };

  // Theme variable definitions
  const pageBg = isLight ? "bg-white text-slate-900" : "bg-slate-950 text-slate-100";
  const borderCol = isLight ? "border-slate-200" : "border-slate-800/80";
  const cardBg = isLight ? "bg-white border-slate-200 shadow-lg" : "bg-slate-900/60 border-slate-800/80 shadow-xl";
  const textMuted = isLight ? "text-slate-500" : "text-slate-400";
  const titleColor = isLight ? "text-slate-900" : "text-white";
  const subCardBg = isLight ? "bg-slate-100 border-slate-200 text-slate-700" : "bg-slate-800 border-slate-700 text-white";

  return (
    <div className={`min-h-screen transition-colors duration-300 ${pageBg}`}>
      {/* Hide scrollbar styles */}
      <style jsx global>{`
        ::-webkit-scrollbar {
          display: none;
        }
        html, body {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>

      <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
        <Toast message={toast.message} type={toast.type} duration={3500} onClose={() => setToast({ message: null, type: "success" })} />

        <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-5 ${borderCol}`}>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500">
              <Ticket className="h-6 w-6" />
            </div>
            <div>
              <h1 className={`text-2xl font-black tracking-tight ${titleColor}`}>My Booked Tickets</h1>
              <p className={`text-xs mt-0.5 ${textMuted}`}>View your reservation history, assigned seats, and gate admission references</p>
            </div>
          </div>

          <Link
            href="/"
            className={`inline-flex items-center gap-1.5 text-xs font-bold transition ${isLight ? "text-slate-600 hover:text-slate-950" : "text-slate-400 hover:text-white"}`}
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Browse More Movies</span>
          </Link>
        </div>

        {loading ? (
          <div className="flex min-h-[40vh] items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-red-600" />
          </div>
        ) : bookings.length > 0 ? (
          <div className="space-y-4">
            {bookings.map((booking) => {
              const statusStyle = STATUS_BADGES[booking.status] || STATUS_BADGES.PENDING;
              const poster = getPosterUrl(booking.moviePosterUrl);

              return (
                <div
                  key={booking.id}
                  className={`rounded-3xl border p-6 backdrop-blur-md flex flex-col md:flex-row md:items-center justify-between gap-6 transition-colors ${cardBg}`}
                >
                  <div className="flex items-start gap-4">
                    {/* Movie Poster Thumbnail */}
                    <div className={`relative h-24 w-16 sm:h-28 sm:w-20 rounded-2xl overflow-hidden shrink-0 border shadow-md flex items-center justify-center ${isLight ? "bg-slate-100 border-slate-200" : "bg-slate-950 border-slate-700/80"}`}>
                      {poster ? (
                        <img
                          src={poster}
                          alt={booking.movieTitle}
                          className="absolute inset-0 w-full h-full object-cover"
                        />
                      ) : (
                        <Film className={`h-6 w-6 ${isLight ? "text-slate-400" : "text-slate-600"}`} />
                      )}
                    </div>

                    <div className="space-y-2.5">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <span className={`font-mono font-bold px-2.5 py-1 rounded-lg text-xs border flex items-center gap-1.5 shadow-sm ${subCardBg}`}>
                          <QrCode className="h-3.5 w-3.5 text-red-400" />
                          #{booking.bookingNumber}
                        </span>
                        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border ${statusStyle.color}`}>
                          {statusStyle.label}
                        </span>
                      </div>

                      <div>
                        <h3 className={`text-base sm:text-lg font-black ${titleColor}`}>{booking.movieTitle || "Movie Screening"}</h3>
                        <div className={`flex items-center gap-2 text-xs mt-1 flex-wrap ${textMuted}`}>
                          <span className="flex items-center gap-1">
                            <Building className="h-3.5 w-3.5 text-red-500" />
                            {booking.cinemaName || "CineMax"}
                          </span>
                          <span>•</span>
                          <span className={`flex items-center gap-1 font-semibold ${isLight ? "text-slate-800" : "text-slate-300"}`}>
                            <Tv className="h-3.5 w-3.5 text-red-400" />
                            {booking.hallName || "Standard Hall"}
                          </span>
                        </div>
                      </div>

                      {/* Formatted Date & Time with AM/PM */}
                      <div className="flex items-center gap-1.5 text-xs font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-lg w-fit">
                        <Clock className="h-3.5 w-3.5" />
                        <span>{formatDateTime(booking.startTime)}</span>
                      </div>

                      <div className="flex items-center gap-1.5 pt-0.5 flex-wrap">
                        <span className={`text-xs font-bold ${textMuted}`}>Seats:</span>
                        {booking.tickets?.map((t, idx) => (
                          <span
                            key={idx}
                            className={`px-2.5 py-0.5 rounded-lg font-mono text-[11px] text-red-400 border font-bold shadow-sm ${subCardBg}`}
                          >
                            {t.seatCode} ({t.seatType})
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className={`flex md:flex-col items-center md:items-end justify-between md:justify-center gap-4 border-t md:border-t-0 md:border-l pt-4 md:pt-0 md:pl-6 ${borderCol}`}>
                    <div className="text-left md:text-right">
                      <p className={`text-xs ${textMuted}`}>Total Amount</p>
                      <p className="font-mono font-black text-amber-400 text-lg sm:text-xl">${Number(booking.totalAmount).toFixed(2)}</p>
                    </div>

                    <div className="flex items-center gap-2">
                      {booking.status === "PENDING" && (
                        <Link
                          href={`/customer/payment/${booking.id}`}
                          className="rounded-xl bg-red-600 px-4 py-2 text-xs font-bold text-white shadow-md shadow-red-600/30 hover:bg-red-500 transition"
                        >
                          Complete Payment
                        </Link>
                      )}

                      {booking.status === "CONFIRMED" && (
                        <button
                          onClick={() => handleCancel(booking.id)}
                          className="flex items-center gap-1.5 rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-2 text-xs font-bold text-rose-400 hover:bg-rose-500/20 transition cursor-pointer"
                        >
                          <Ban className="h-3.5 w-3.5" />
                          <span>Cancel Ticket</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className={`flex min-h-[35vh] flex-col items-center justify-center rounded-3xl border p-8 text-center space-y-3 ${cardBg}`}>
            <Ticket className={`h-10 w-10 mb-1 ${isLight ? "text-slate-400" : "text-slate-600"}`} />
            <p className={`font-bold text-sm ${titleColor}`}>No ticket reservations found.</p>
            <p className={`text-xs max-w-sm ${textMuted}`}>
              You haven't booked any movie screenings yet. Browse our current releases to get started!
            </p>
            <Link
              href="/"
              className="mt-2 rounded-xl bg-red-600 px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-red-600/30 hover:bg-red-500 transition"
            >
              Browse Movies
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}