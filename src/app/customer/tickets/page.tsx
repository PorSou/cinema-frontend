"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AOS from "aos"; // 🌟 Import AOS
import {
  Ticket,
  Loader2,
  Clock,
  Building,
  QrCode,
  Film,
  Tv,
  Coffee,
  Sparkles,
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

/*
 * ============================================================
 * FORMAT DATE & TIME
 * ============================================================
 */

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

/*
 * ============================================================
 * FORMAT POSTER URL
 * ============================================================
 */

const getPosterUrl = (posterUrl?: string) => {
  if (!posterUrl) return null;

  if (posterUrl.startsWith("http")) {
    return posterUrl;
  }

  const cleanPath = posterUrl.startsWith("/")
    ? posterUrl.substring(1)
    : posterUrl;

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

  const [toast, setToast] = useState<{
    message: string | null;
    type: "success" | "error" | "info";
  }>({
    message: null,
    type: "success",
  });

  // Refresh AOS whenever bookings load or update
  useEffect(() => {
    const timer = setTimeout(() => {
      AOS.refresh();
    }, 100);
    return () => clearTimeout(timer);
  }, [bookings, loading]);

  /*
   * ============================================================
   * FETCH BOOKINGS
   * ============================================================
   */

  const fetchMyBookings = async () => {
    setLoading(true);

    try {
      const res = await BookingService.getMyBookings(0, 20);

      setBookings(extractArray<BookingResponse>(res));
    } catch {
      setToast({
        message: "Failed to load your ticket reservations.",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  /*
   * ============================================================
   * INITIAL LOAD
   * ============================================================
   */

  useEffect(() => {
    fetchMyBookings();
  }, []);

  /*
   * ============================================================
   * THEME VARIABLES
   * ============================================================
   */

  const pageBg = isLight
    ? "bg-white text-slate-900"
    : "bg-[#0b0c10] text-slate-100";

  const borderCol = isLight ? "border-slate-200" : "border-white/10";

  const cardBg = isLight
    ? "bg-white border-slate-200 shadow-lg"
    : "bg-slate-900/60 border-white/10 shadow-xl";

  const textMuted = isLight ? "text-slate-500" : "text-slate-400";

  const titleColor = isLight ? "text-slate-900" : "text-white";

  const subCardBg = isLight
    ? "bg-slate-100 border-slate-200 text-slate-700"
    : "bg-slate-800 border-slate-700 text-white";

  /*
   * ============================================================
   * RENDER
   * ============================================================
   */

  return (
    <div className={`min-h-screen transition-colors duration-300 ${pageBg}`}>
      {/* ========================================================
          HIDE SCROLLBAR
      ======================================================== */}

      <style jsx global>{`
        ::-webkit-scrollbar {
          display: none;
        }

        html,
        body {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>

      {/* ========================================================
          MAIN CONTENT
      ======================================================== */}

      <div className="mx-auto w-full max-w-6xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
        <Toast
          message={toast.message}
          type={toast.type}
          duration={3500}
          onClose={() =>
            setToast({
              message: null,
              type: "success",
            })
          }
        />

        {/* ======================================================
            TICKET BANNER
        ====================================================== */}

        <div
          data-aos="fade-up"
          data-aos-duration="800"
          className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-amber-600 via-red-600 to-rose-700 p-8 text-white shadow-2xl sm:p-10"
        >
          <div className="relative z-10 max-w-2xl space-y-3">
            {/* BADGE */}

            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/30 bg-black/35 px-3 py-1 text-xs font-bold text-amber-300 backdrop-blur-md">
              <Sparkles className="h-3.5 w-3.5" />
              My Movie Tickets
            </span>

            {/* TITLE */}

            <h1 className="flex flex-wrap items-center gap-3 text-3xl font-black tracking-tight sm:text-4xl">
              My Booked Tickets
              <span className="rounded-full border border-white/20 bg-black/25 px-3 py-1 text-xs font-black text-white backdrop-blur-md">
                {bookings.length} Booked
              </span>
            </h1>

            {/* DESCRIPTION */}

            <p className="text-xs font-medium leading-relaxed text-slate-100 sm:text-sm">
              View your reservation history, assigned seats, and gate admission
              references.
            </p>
          </div>

          {/* BACKGROUND TICKET */}

          <Ticket
            className="absolute -bottom-10 -right-8 h-44 w-44 text-white/10"
            fill="currentColor"
          />
        </div>

        {/* ======================================================
            SECTION HEADER
        ====================================================== */}

        <div
          data-aos="fade-up"
          data-aos-delay="100"
          className="flex items-center gap-2"
        >
          <Ticket className="h-5 w-5 text-amber-500" />

          <h2 className="text-sm font-black uppercase tracking-wider">
            Ticket Reservations ({bookings.length})
          </h2>
        </div>

        {/* ======================================================
            LOADING
        ====================================================== */}

        {loading ? (
          <div className="flex min-h-[40vh] items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
          </div>
        ) : bookings.length > 0 ? (
          /* ====================================================
              BOOKINGS
          ==================================================== */

          <div className="space-y-5">
            {bookings.map((booking: any, index: number) => {
              const statusStyle =
                STATUS_BADGES[booking.status] || STATUS_BADGES.PENDING;

              const poster = getPosterUrl(booking.moviePosterUrl);

              const concessionsList = Array.isArray(booking?.concessions)
                ? booking.concessions
                : Array.isArray(booking?.bookingConcessions)
                  ? booking.bookingConcessions
                  : [];

              const totalPaid = Number(booking.totalAmount || 0);

              const discount = Number(
                booking.discountAmount || booking.discount || 0,
              );

              const subtotal = totalPaid + discount;

              return (
                <div
                  key={booking.id}
                  data-aos="fade-up"
                  data-aos-delay={(index % 3) * 80}
                  className={`flex flex-col justify-between gap-7 rounded-3xl border p-7 backdrop-blur-md transition-all duration-300 hover:shadow-2xl md:flex-row md:items-center ${cardBg}`}
                >
                  {/* ==================================================
                      LEFT SIDE
                  ================================================== */}

                  <div className="flex min-w-0 items-start gap-5">
                    {/* MOVIE POSTER */}

                    <div
                      className={`relative flex h-28 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl border shadow-md sm:h-32 sm:w-[5.5rem] ${
                        isLight
                          ? "border-slate-200 bg-slate-100"
                          : "border-white/10 bg-slate-950"
                      }`}
                    >
                      {poster ? (
                        <img
                          src={poster}
                          alt={booking.movieTitle}
                          className="absolute inset-0 h-full w-full object-cover"
                        />
                      ) : (
                        <Film
                          className={`h-6 w-6 ${
                            isLight ? "text-slate-400" : "text-slate-600"
                          }`}
                        />
                      )}
                    </div>

                    {/* ==================================================
                          BOOKING INFORMATION
                      ================================================== */}

                    <div className="min-w-0 space-y-2.5">
                      {/* BOOKING NUMBER + STATUS */}

                      <div className="flex flex-wrap items-center gap-2.5">
                        <Link
                          href={`/customer/tickets/${
                            booking.bookingNumber || booking.id
                          }`}
                          className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1 font-mono text-xs font-bold shadow-sm transition hover:border-amber-500 ${subCardBg}`}
                        >
                          <QrCode className="h-3.5 w-3.5 text-amber-500" />#
                          {booking.bookingNumber}
                        </Link>

                        <span
                          className={`rounded-lg border px-2.5 py-1 text-[10px] font-bold ${statusStyle.color}`}
                        >
                          {statusStyle.label}
                        </span>
                      </div>

                      {/* MOVIE */}

                      <div>
                        <h3
                          className={`text-base font-black sm:text-lg ${titleColor}`}
                        >
                          {booking.movieTitle || "Movie Screening"}
                        </h3>

                        <div
                          className={`mt-1 flex flex-wrap items-center gap-2 text-xs ${textMuted}`}
                        >
                          <span className="flex items-center gap-1 font-medium">
                            <Building className="h-3.5 w-3.5 text-amber-500" />

                            {booking.cinemaName || "CineMax"}
                          </span>

                          <span>•</span>

                          <span
                            className={`flex items-center gap-1 font-bold ${
                              isLight ? "text-slate-800" : "text-slate-300"
                            }`}
                          >
                            <Tv className="h-3.5 w-3.5 text-amber-400" />

                            {booking.hallName || "Standard Hall"}
                          </span>
                        </div>
                      </div>

                      {/* DATE & TIME */}

                      <div className="flex w-fit items-center gap-1.5 rounded-lg border border-amber-500/20 bg-amber-500/10 px-2.5 py-1 font-mono text-xs font-bold text-amber-400">
                        <Clock className="h-3.5 w-3.5" />

                        <span>{formatDateTime(booking.startTime)}</span>
                      </div>

                      {/* SEATS */}

                      <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                        <span className={`text-xs font-bold ${textMuted}`}>
                          Seats:
                        </span>

                        {booking.tickets?.map((t: any, idx: number) => (
                          <span
                            key={idx}
                            className={`rounded-lg border px-2.5 py-0.5 font-mono text-[11px] font-bold text-amber-400 shadow-sm ${subCardBg}`}
                          >
                            Seat {t.seatCode} ({t.seatType})
                          </span>
                        ))}
                      </div>

                      {/* CONCESSIONS */}

                      {concessionsList.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                          <span
                            className={`flex items-center gap-1 text-xs font-bold ${textMuted}`}
                          >
                            <Coffee className="h-3.5 w-3.5 text-amber-500" />
                            Snacks:
                          </span>

                          {concessionsList.map((item: any, idx: number) => (
                            <span
                              key={idx}
                              className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-2.5 py-0.5 font-mono text-[11px] font-bold text-amber-400 shadow-sm"
                            >
                              {item.quantity || 1}x {item.itemName || item.name}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* ==================================================
                      RIGHT SIDE PRICE / DETAILS
                  ================================================== */}

                  <div
                    className={`flex shrink-0 items-center justify-between gap-5 border-t pt-5 md:w-52 md:flex-col md:items-end md:justify-center md:border-l md:border-t-0 md:pl-7 md:pt-0 ${borderCol}`}
                  >
                    {/* PRICE */}

                    <div className="space-y-0.5 text-left md:text-right">
                      <p className={`text-xs ${textMuted}`}>Total Paid</p>

                      {discount > 0 && (
                        <p className="font-mono text-[11px] text-slate-400 line-through">
                          ${subtotal.toFixed(2)}
                        </p>
                      )}

                      <p className="font-mono text-lg font-black text-amber-400 sm:text-xl">
                        ${totalPaid.toFixed(2)}
                      </p>
                    </div>

                    {/* VIEW TICKET */}

                    <div className="flex items-center gap-2">
                      <Link
                        href={`/customer/tickets/${
                          booking.bookingNumber || booking.id
                        }`}
                        className="rounded-xl bg-amber-500 px-4 py-2 text-xs font-black text-slate-950 shadow-md shadow-amber-500/20 transition hover:bg-amber-400"
                      >
                        View Ticket & Receipt
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* ======================================================
              EMPTY STATE
          ====================================================== */

          <div
            data-aos="fade-up"
            className={`flex min-h-[35vh] flex-col items-center justify-center space-y-3 rounded-3xl border p-8 text-center ${cardBg}`}
          >
            <Ticket
              className={`mb-1 h-10 w-10 ${
                isLight ? "text-slate-400" : "text-slate-600"
              }`}
            />

            <p className={`text-sm font-bold ${titleColor}`}>
              No ticket reservations found.
            </p>

            <p className={`max-w-sm text-xs ${textMuted}`}>
              You haven&apos;t booked any movie screenings yet. Browse our
              current releases to get started!
            </p>

            <Link
              href="/"
              className="mt-2 rounded-xl bg-amber-500 px-5 py-2.5 text-xs font-black text-slate-950 shadow-lg shadow-amber-500/20 transition hover:bg-amber-400"
            >
              Browse Movies
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
