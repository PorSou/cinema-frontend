"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  TrendingUp,
  Ticket,
  DollarSign,
  Film,
  Calendar,
  Loader2,
  Clock,
  Tv,
  Sparkles,
  Users,
  Activity,
  Heart,
  PieChart,
  Zap,
} from "lucide-react";

import { BookingService } from "@/app/service/booking.service";
import MovieService from "@/app/service/movie.service";
import { BookingResponse, MovieResponse } from "@/app/types/api.types";
import Toast from "@/app/components/Toast";
import { useSettings } from "@/app/context/SettingsContext";
import api from "@/app/lib/api";

const extractArray = <T,>(res: any): T[] => {
  if (Array.isArray(res)) return res;
  if (Array.isArray(res?.content)) return res.content;
  if (Array.isArray(res?.data)) return res.data;
  if (Array.isArray(res?.body?.data)) return res.body.data;
  if (Array.isArray(res?.data?.content)) return res.data.content;

  return [];
};

type RevenueView = "DAILY" | "MONTHLY" | "YEARLY";

export default function AdminAnalyticsPage() {
  const { theme } = useSettings();
  const isLight = theme === "light";

  const [loading, setLoading] = useState(true);

  const [bookings, setBookings] = useState<BookingResponse[]>([]);
  const [movies, setMovies] = useState<MovieResponse[]>([]);
  const [popularityAnalytics, setPopularityAnalytics] = useState<any[]>([]);

  const [revenueView, setRevenueView] = useState<RevenueView>("MONTHLY");

  const [toast, setToast] = useState<{
    message: string | null;
    type: "success" | "error";
  }>({
    message: null,
    type: "success",
  });

  /* -----------------------------------------------------------
     FETCH
  ----------------------------------------------------------- */

  useEffect(() => {
    async function fetchAnalyticsData() {
      setLoading(true);

      try {
        const [bookingsRes, moviesRes, popularityRes] = await Promise.all([
          BookingService.getAllBookings(),
          MovieService.getAllMovies({
            size: 100,
          }),
          api
            .get("/admin/analytics/popularity?page=0&size=10")
            .catch(() => null),
        ]);

        setBookings(extractArray<BookingResponse>(bookingsRes));
        setMovies(extractArray<MovieResponse>(moviesRes));

        const rawPopularity =
          popularityRes?.data?.body?.data ||
          popularityRes?.data?.data ||
          popularityRes?.data;
        setPopularityAnalytics(extractArray<any>(rawPopularity));
      } catch (error) {
        setToast({
          message: "Failed to load analytics metrics.",
          type: "error",
        });
      } finally {
        setLoading(false);
      }
    }

    fetchAnalyticsData();
  }, []);

  /* -----------------------------------------------------------
     CONFIRMED BOOKINGS
  ----------------------------------------------------------- */

  const confirmedBookings = useMemo(() => {
    return bookings.filter(
      (booking) =>
        booking.status === "CONFIRMED" || booking.status === "CHECKED_IN",
    );
  }, [bookings]);

  /* -----------------------------------------------------------
     OVERVIEW
  ----------------------------------------------------------- */

  const totalRevenue = useMemo(() => {
    return confirmedBookings.reduce(
      (sum, booking) => sum + Number(booking.totalAmount || 0),
      0,
    );
  }, [confirmedBookings]);

  const totalTicketsSold = useMemo(() => {
    return confirmedBookings.reduce(
      (sum, booking) => sum + (booking.tickets?.length || 0),
      0,
    );
  }, [confirmedBookings]);

  const totalBookings = confirmedBookings.length;

  const averageRevenue = totalBookings > 0 ? totalRevenue / totalBookings : 0;

  /* -----------------------------------------------------------
     REVENUE REPORT
  ----------------------------------------------------------- */

  const revenueBreakdown = useMemo(() => {
    const map: Record<string, number> = {};

    confirmedBookings.forEach((booking: any) => {
      const rawDate =
        booking.createdAt || booking.updatedAt || booking.startTime;
      if (!rawDate) return;

      const date = new Date(rawDate);
      if (Number.isNaN(date.getTime())) return;

      let key = "";
      if (revenueView === "DAILY") {
        key = date.toISOString().split("T")[0];
      }
      if (revenueView === "MONTHLY") {
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
          2,
          "0",
        )}`;
      }
      if (revenueView === "YEARLY") {
        key = `${date.getFullYear()}`;
      }

      map[key] = (map[key] || 0) + Number(booking.totalAmount || 0);
    });

    return Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, amount]) => {
        let label = key;
        const date = new Date(
          `${key}${revenueView === "YEARLY" ? "-01-01" : revenueView === "MONTHLY" ? "-01" : ""}`,
        );

        if (!Number.isNaN(date.getTime())) {
          if (revenueView === "DAILY") {
            label = date.toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            });
          }
          if (revenueView === "MONTHLY") {
            label = date.toLocaleDateString("en-US", {
              month: "short",
              year: "numeric",
            });
          }
          if (revenueView === "YEARLY") {
            label = key;
          }
        }

        return {
          key,
          label,
          amount,
        };
      });
  }, [confirmedBookings, revenueView]);

  const maxRevenue = Math.max(
    ...revenueBreakdown.map((item) => item.amount),
    1,
  );

  /* -----------------------------------------------------------
     SMOOTH CURVED SVG PATH GENERATOR
  ----------------------------------------------------------- */

  const svgPathData = useMemo(() => {
    if (revenueBreakdown.length === 0)
      return { path: "", area: "", points: [] as { x: number; y: number }[] };
    const width = 1000;
    const height = 300;
    const padding = 20;

    const points = revenueBreakdown.map((item, index) => {
      const x =
        revenueBreakdown.length === 1
          ? width / 2
          : padding +
            (index / (revenueBreakdown.length - 1)) * (width - padding * 2);
      const y =
        height - padding - (item.amount / maxRevenue) * (height - padding * 2);
      return { x, y };
    });

    let path = `M ${points[0].x} ${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i];
      const p1 = points[i + 1];
      const cpX = (p0.x + p1.x) / 2;
      path += ` C ${cpX} ${p0.y}, ${cpX} ${p1.y}, ${p1.x} ${p1.y}`;
    }

    const area = `${path} L ${width - padding} ${height - 10} L ${padding} ${height - 10} Z`;
    return { path, area, points };
  }, [revenueBreakdown, maxRevenue]);

  /* -----------------------------------------------------------
     MOVIE POPULARITY
  ----------------------------------------------------------- */

  const popularMoviesList = useMemo(() => {
    const movieMap: Record<
      string,
      {
        title: string;
        count: number;
        revenue: number;
      }
    > = {};

    confirmedBookings.forEach((booking) => {
      const title = booking.movieTitle || "Unknown Movie";
      if (!movieMap[title]) {
        movieMap[title] = {
          title,
          count: 0,
          revenue: 0,
        };
      }
      movieMap[title].count += booking.tickets?.length || 1;
      movieMap[title].revenue += Number(booking.totalAmount || 0);
    });

    return Object.values(movieMap).sort((a, b) => b.count - a.count);
  }, [confirmedBookings]);

  const maxTicketCount = popularMoviesList[0]?.count || 1;

  /* -----------------------------------------------------------
     HALL UTILIZATION
  ----------------------------------------------------------- */

  const hallPopularityMap = useMemo(() => {
    const hallMap: Record<
      string,
      {
        hallName: string;
        cinemaName: string;
        count: number;
        revenue: number;
      }
    > = {};

    confirmedBookings.forEach((booking) => {
      const hall = booking.hallName || "Main Auditorium";
      const cinema = booking.cinemaName || "Cinema Branch";
      const key = `${cinema}-${hall}`;

      if (!hallMap[key]) {
        hallMap[key] = {
          hallName: hall,
          cinemaName: cinema,
          count: 0,
          revenue: 0,
        };
      }
      hallMap[key].count += booking.tickets?.length || 1;
      hallMap[key].revenue += Number(booking.totalAmount || 0);
    });

    return Object.values(hallMap).sort((a, b) => b.count - a.count);
  }, [confirmedBookings]);

  const maxHallTickets = hallPopularityMap[0]?.count || 1;
  const totalHallTickets = hallPopularityMap.reduce(
    (sum, h) => sum + h.count,
    0,
  );

  /* -----------------------------------------------------------
     PEAK HOURS
  ----------------------------------------------------------- */

  const peakHoursMap = useMemo(() => {
    const hours: Record<string, number> = {
      Morning: 0,
      Afternoon: 0,
      "Prime Evening": 0,
      Night: 0,
    };

    confirmedBookings.forEach((booking) => {
      if (!booking.startTime) return;
      const date = new Date(booking.startTime);
      if (Number.isNaN(date.getTime())) return;

      const hour = date.getHours();
      const tickets = booking.tickets?.length || 1;

      if (hour >= 10 && hour < 13) {
        hours["Morning"] += tickets;
      } else if (hour >= 13 && hour < 17) {
        hours["Afternoon"] += tickets;
      } else if (hour >= 17 && hour < 21) {
        hours["Prime Evening"] += tickets;
      } else {
        hours["Night"] += tickets;
      }
    });

    return [
      { slot: "Morning", time: "10 AM - 1 PM", count: hours["Morning"] },
      { slot: "Afternoon", time: "1 PM - 5 PM", count: hours["Afternoon"] },
      {
        slot: "Prime Evening",
        time: "5 PM - 9 PM",
        count: hours["Prime Evening"],
      },
      { slot: "Night", time: "9 PM - 12 AM", count: hours["Night"] },
    ];
  }, [confirmedBookings]);

  const maxPeakCount = Math.max(...peakHoursMap.map((item) => item.count), 1);
  const busiestPeriod = [...peakHoursMap].sort((a, b) => b.count - a.count)[0];

  const pageClass = isLight
    ? "bg-slate-50 text-slate-900"
    : "bg-slate-950 text-slate-100";

  const cardClass = isLight
    ? "border-slate-300 bg-white shadow-xl shadow-slate-200 ring-1 ring-slate-200"
    : "border-slate-800 bg-slate-900/60 shadow-2xl backdrop-blur-md";

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
  const gridBorderCol = isLight ? "border-slate-200" : "border-slate-800/80";

  if (loading) {
    return (
      <div
        className={`flex min-h-[70vh] items-center justify-center ${pageClass}`}
      >
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-red-600" />
          <p className={`text-xs ${textSecondary}`}>Loading analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`min-h-screen py-6 px-4 sm:px-8 lg:px-10 w-full space-y-6 transition-colors duration-300 pb-24 ${pageClass}`}
    >
      <style jsx global>{`
        ::-webkit-scrollbar {
          display: none;
        }
        * {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        @keyframes drawSmoothLine {
          from {
            stroke-dashoffset: 1200;
          }
          to {
            stroke-dashoffset: 0;
          }
        }
        @keyframes fadeInPolygon {
          from {
            opacity: 0;
            transform: translateY(15px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-smooth-draw {
          stroke-dasharray: 1200;
          animation: drawSmoothLine 1.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .animate-polygon-fade {
          animation: fadeInPolygon 1.2s ease-out forwards;
        }
      `}</style>

      <Toast
        message={toast.message}
        type={toast.type}
        onClose={() =>
          setToast({
            message: null,
            type: "success",
          })
        }
      />

      <div className="w-full space-y-6">
        {/* HEADER */}
        <div
          className={`border-b ${borderCol} pb-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between`}
        >
          <div>
            <div className="flex items-center gap-2.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-red-600/10 border border-red-500/30 text-red-600">
                <Activity className="h-5 w-5" />
              </div>
              <h1
                className={`text-2xl font-black tracking-tight ${textPrimary}`}
              >
                Analytics & Reports
              </h1>
            </div>
            <p className={`mt-1 text-xs ${textSecondary}`}>
              Detailed revenue, ticket sales, cinema utilization, peak hours and
              movie performance.
            </p>
          </div>
          <div
            className={`rounded-xl border ${borderCol} ${isLight ? "bg-white text-slate-800 font-bold shadow-sm" : "bg-slate-900 text-slate-400"} px-3.5 py-2 text-xs`}
          >
            Live Metrics Synced
          </div>
        </div>

        {/* STATISTICS */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div
            className={`rounded-3xl border ${cardClass} p-5 transition-all duration-300 hover:scale-[1.01] shadow-xl`}
          >
            <div className="flex items-center justify-between">
              <span
                className={`text-[11px] font-black uppercase tracking-wider ${textSecondary}`}
              >
                Revenue
              </span>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400">
                <DollarSign className="h-4 w-4" />
              </div>
            </div>
            <p className="mt-3 text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400">
              ${totalRevenue.toFixed(2)}
            </p>
            <p className={`mt-2 text-[11px] ${textSecondary}`}>
              Confirmed + checked-in bookings
            </p>
          </div>

          <div
            className={`rounded-3xl border ${cardClass} p-5 transition-all duration-300 hover:scale-[1.01] shadow-xl`}
          >
            <div className="flex items-center justify-between">
              <span
                className={`text-[11px] font-black uppercase tracking-wider ${textSecondary}`}
              >
                Tickets
              </span>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-500/15 border border-red-500/30 text-red-600">
                <Ticket className="h-4 w-4" />
              </div>
            </div>
            <p className={`mt-3 text-2xl font-black font-mono ${textPrimary}`}>
              {totalTicketsSold}
            </p>
            <p className={`mt-2 text-[11px] ${textSecondary}`}>
              Total tickets sold
            </p>
          </div>

          <div
            className={`rounded-3xl border ${cardClass} p-5 transition-all duration-300 hover:scale-[1.01] shadow-xl`}
          >
            <div className="flex items-center justify-between">
              <span
                className={`text-[11px] font-black uppercase tracking-wider ${textSecondary}`}
              >
                Avg. Booking
              </span>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/15 border border-blue-500/30 text-blue-600">
                <TrendingUp className="h-4 w-4" />
              </div>
            </div>
            <p className={`mt-3 text-2xl font-black font-mono ${textPrimary}`}>
              ${averageRevenue.toFixed(2)}
            </p>
            <p className={`mt-2 text-[11px] ${textSecondary}`}>
              Revenue per booking
            </p>
          </div>

          <div
            className={`rounded-3xl border ${cardClass} p-5 transition-all duration-300 hover:scale-[1.01] shadow-xl`}
          >
            <div className="flex items-center justify-between">
              <span
                className={`text-[11px] font-black uppercase tracking-wider ${textSecondary}`}
              >
                Peak Period
              </span>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-600 dark:text-amber-400">
                <Clock className="h-4 w-4" />
              </div>
            </div>
            <p className={`mt-3 text-xl font-black ${textPrimary}`}>
              {busiestPeriod?.slot || "N/A"}
            </p>
            <p className={`mt-2 text-[11px] ${textSecondary}`}>
              {busiestPeriod?.count || 0} tickets
            </p>
          </div>
        </div>

        {/* REVENUE REPORT */}
        <div className={`rounded-3xl border ${cardClass} p-6 shadow-2xl`}>
          <div
            className={`flex flex-col gap-4 border-b ${borderCol} pb-5 sm:flex-row sm:items-center sm:justify-between`}
          >
            <div>
              <h2 className={`text-base font-black ${textPrimary}`}>
                Revenue Reports & Forecast
              </h2>
              <p className={`mt-1 text-xs ${textSecondary}`}>
                Interactive smooth curved earnings breakdown over different
                periods.
              </p>
            </div>

            <div
              className={`flex rounded-xl border ${borderCol} ${isLight ? "bg-slate-200" : "bg-slate-950"} p-1 shadow-inner`}
            >
              {(["DAILY", "MONTHLY", "YEARLY"] as RevenueView[]).map((view) => (
                <button
                  key={view}
                  onClick={() => setRevenueView(view)}
                  className={`rounded-lg px-3.5 py-1.5 text-xs font-black transition-all duration-200 cursor-pointer ${
                    revenueView === view
                      ? "bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/30"
                      : `${textSecondary} hover:${textPrimary}`
                  }`}
                >
                  {view}
                </button>
              ))}
            </div>
          </div>

          {revenueBreakdown.length > 0 ? (
            <div className="mt-8">
              <div className="h-[280px] relative w-full">
                <div className="pointer-events-none absolute inset-0 flex flex-col justify-between">
                  {[0, 1, 2, 3, 4].map((line) => (
                    <div key={line} className={`border-t ${gridBorderCol}`} />
                  ))}
                </div>

                <svg
                  key={revenueView}
                  viewBox="0 0 1000 300"
                  preserveAspectRatio="none"
                  className="absolute inset-0 h-full w-full overflow-visible"
                >
                  <defs>
                    <linearGradient
                      id="smoothAnalyticsGradient"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="0%"
                        stopColor="#10b981"
                        stopOpacity="0.45"
                      />
                      <stop
                        offset="100%"
                        stopColor="#10b981"
                        stopOpacity="0.0"
                      />
                    </linearGradient>
                  </defs>

                  {svgPathData.area && (
                    <path
                      d={svgPathData.area}
                      fill="url(#smoothAnalyticsGradient)"
                      className="animate-polygon-fade"
                    />
                  )}

                  {svgPathData.path && (
                    <path
                      d={svgPathData.path}
                      fill="none"
                      stroke="#059669"
                      strokeWidth="4"
                      strokeLinecap="round"
                      className="animate-smooth-draw"
                    />
                  )}

                  {svgPathData.points?.map((pt, index) => (
                    <circle
                      key={index}
                      cx={pt.x}
                      cy={pt.y}
                      r="4.5"
                      fill={isLight ? "#ffffff" : "#0f172a"}
                      stroke="#059669"
                      strokeWidth="3"
                      className="transition-transform duration-300 hover:scale-150 cursor-pointer"
                    />
                  ))}
                </svg>
              </div>

              <div
                className={`mt-4 flex justify-between border-t ${borderCol} px-1 pt-3 font-mono text-[11px] font-bold ${textMuted}`}
              >
                {revenueBreakdown
                  .filter(
                    (_, index) =>
                      index === 0 ||
                      index === revenueBreakdown.length - 1 ||
                      index %
                        Math.max(1, Math.floor(revenueBreakdown.length / 6)) ===
                        0,
                  )
                  .map((item) => (
                    <span key={item.key}>{item.label}</span>
                  ))}
              </div>
            </div>
          ) : (
            <div
              className={`flex h-[280px] items-center justify-center text-xs ${textMuted}`}
            >
              No revenue data available.
            </div>
          )}
        </div>

        {/* 🌟 NEW ANALYTIC ADDITION: HALL AUDITORIUM SHARE AUDIT */}
        <div className={`rounded-3xl border ${cardClass} p-6 shadow-2xl`}>
          <div
            className={`flex items-center justify-between border-b ${borderCol} pb-4`}
          >
            <div>
              <h2 className={`text-base font-black ${textPrimary}`}>
                Auditorium Share & Capacity Utilization
              </h2>
              <p className={`mt-1 text-xs ${textSecondary}`}>
                Proportional contribution of ticket sales per theater hall.
              </p>
            </div>
            <PieChart className="h-5 w-5 text-indigo-500" />
          </div>

          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {hallPopularityMap.map((hall, idx) => {
              const share =
                totalHallTickets > 0
                  ? Math.round((hall.count / totalHallTickets) * 100)
                  : 0;
              return (
                <div
                  key={idx}
                  className={`p-4 rounded-2xl border ${borderCol} ${isLight ? "bg-slate-50" : "bg-slate-950/50"} space-y-2`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-wider text-indigo-500">
                      {hall.cinemaName}
                    </span>
                    <Tv className="h-4 w-4 text-slate-400" />
                  </div>
                  <h3 className={`text-sm font-black truncate ${textPrimary}`}>
                    {hall.hallName}
                  </h3>
                  <div className="flex items-end justify-between pt-2 border-t border-slate-700/20">
                    <div>
                      <p
                        className={`text-xs font-mono font-bold ${textSecondary}`}
                      >
                        {hall.count} tickets
                      </p>
                      <p className="text-xs font-mono font-black text-emerald-600 dark:text-emerald-400">
                        ${hall.revenue.toFixed(0)}
                      </p>
                    </div>
                    <span className="text-xs font-mono font-black text-indigo-500">
                      {share}% share
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* PEAK HOURS + QUICK INSIGHT SUMMARY */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* PEAK HOURS */}
          <div className={`rounded-3xl border ${cardClass} p-6 shadow-xl`}>
            <div className={`border-b ${borderCol} pb-4`}>
              <h2 className={`text-base font-black ${textPrimary}`}>
                Peak Hours Analysis
              </h2>
              <p className={`mt-1 text-xs ${textSecondary}`}>
                When customers are booking the most tickets.
              </p>
            </div>

            <div className="mt-6 space-y-4">
              {peakHoursMap.map((peak) => {
                const percentage = Math.round(
                  (peak.count / maxPeakCount) * 100,
                );
                const isPeak = peak.slot === busiestPeriod?.slot;

                return (
                  <div key={peak.slot} className="group">
                    <div className="mb-2 flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`flex h-8 w-8 items-center justify-center rounded-xl ${isPeak ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30" : "bg-slate-500/15 text-slate-500"}`}
                        >
                          <Clock className="h-4 w-4" />
                        </div>
                        <div>
                          <p className={`text-xs font-black ${textPrimary}`}>
                            {peak.slot}
                          </p>
                          <p
                            className={`text-[10px] ${textSecondary} font-semibold`}
                          >
                            {peak.time}
                          </p>
                        </div>
                      </div>

                      <span
                        className={`text-xs font-mono font-black ${textPrimary}`}
                      >
                        {peak.count} tickets
                      </span>
                    </div>

                    <div
                      className={`h-3 overflow-hidden rounded-full ${isLight ? "bg-slate-200 border border-slate-300" : "bg-slate-800"}`}
                    >
                      <div
                        className={`h-full rounded-full transition-all duration-700 ease-out shadow-sm ${
                          isPeak
                            ? "bg-amber-500 shadow-sm shadow-amber-500/30"
                            : "bg-slate-500"
                        }`}
                        style={{
                          width: `${Math.max(percentage, peak.count > 0 ? 6 : 0)}%`,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* HALL UTILIZATION */}
          <div className={`rounded-3xl border ${cardClass} p-6 shadow-xl`}>
            <div className={`border-b ${borderCol} pb-4`}>
              <h2 className={`text-base font-black ${textPrimary}`}>
                Hall Utilization Ranking
              </h2>
              <p className={`mt-1 text-xs ${textSecondary}`}>
                Ticket volume by cinema auditorium.
              </p>
            </div>

            <div className="mt-6 space-y-4">
              {hallPopularityMap.slice(0, 4).map((hall) => {
                const percentage = Math.round(
                  (hall.count / maxHallTickets) * 100,
                );

                return (
                  <div key={`${hall.cinemaName}-${hall.hallName}`}>
                    <div className="mb-2 flex items-center justify-between">
                      <div className="flex min-w-0 items-center gap-2.5">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-blue-500/15 border border-blue-500/30 text-blue-600 dark:text-blue-400">
                          <Tv className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <p
                            className={`truncate text-xs font-black ${textPrimary}`}
                          >
                            {hall.hallName}
                          </p>
                          <p
                            className={`truncate text-[10px] ${textSecondary} font-semibold`}
                          >
                            {hall.cinemaName}
                          </p>
                        </div>
                      </div>

                      <div className="ml-3 text-right">
                        <p
                          className={`text-xs font-mono font-black ${textPrimary}`}
                        >
                          {hall.count} tickets
                        </p>
                        <p className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-black">
                          ${hall.revenue.toFixed(0)}
                        </p>
                      </div>
                    </div>

                    <div
                      className={`h-3 overflow-hidden rounded-full ${isLight ? "bg-slate-200 border border-slate-300" : "bg-slate-800"}`}
                    >
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-700 ease-out shadow-sm"
                        style={{
                          width: `${Math.max(percentage, 6)}%`,
                        }}
                      />
                    </div>
                  </div>
                );
              })}

              {hallPopularityMap.length === 0 && (
                <div className={`py-10 text-center text-xs ${textMuted}`}>
                  No hall utilization data available.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* WATCHLIST & MOVIE DEMAND ANALYTICS (POPULARITY RANKING) */}
        <div className={`rounded-3xl border ${cardClass} p-6 shadow-2xl`}>
          <div
            className={`flex items-center justify-between border-b ${borderCol} pb-4`}
          >
            <div>
              <h2 className={`text-base font-black ${textPrimary}`}>
                Movie Demand & Watchlist Analytics (Popularity Ranking)
              </h2>
              <p className={`mt-1 text-xs ${textSecondary}`}>
                User interest ranking based on total watchlists and favorite
                saves.
              </p>
            </div>
            <Heart className="h-5 w-5 text-rose-500 fill-rose-500" />
          </div>

          <div className="mt-5 overflow-x-auto">
            <div className="min-w-[650px]">
              <div
                className={`grid grid-cols-[50px_1fr_140px] gap-4 border-b ${borderCol} px-3 pb-3 text-[10px] font-black uppercase tracking-wider ${textSecondary}`}
              >
                <span>Rank</span>
                <span>Movie Title</span>
                <span className="text-right">Watchlist Saves</span>
              </div>

              <div
                className={`divide-y ${isLight ? "divide-slate-200" : "divide-slate-800/70"}`}
              >
                {popularityAnalytics.map((item, index) => (
                  <div
                    key={item.movieId || index}
                    className="grid grid-cols-[50px_1fr_140px] items-center gap-4 px-3 py-4 transition-colors hover:bg-slate-500/5 rounded-2xl"
                  >
                    <span className={`text-xs font-black ${textSecondary}`}>
                      #{index + 1}
                    </span>

                    <div className="min-w-0 flex items-center gap-3">
                      {item.moviePosterUrl && (
                        <img
                          src={item.moviePosterUrl}
                          alt={item.movieTitle}
                          className="h-10 w-7 rounded-lg object-cover border border-white/10"
                        />
                      )}
                      <p
                        className={`truncate text-sm font-black ${textPrimary}`}
                      >
                        {item.movieTitle}
                      </p>
                    </div>

                    <div className="text-right">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-500 font-mono text-xs font-bold">
                        <Heart className="h-3.5 w-3.5 fill-rose-500 text-rose-500" />
                        <span>{item.watchlistCount} saves</span>
                      </span>
                    </div>
                  </div>
                ))}

                {popularityAnalytics.length === 0 && (
                  <div className={`py-12 text-center text-xs ${textMuted}`}>
                    No popularity analytics data available.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* MOVIE PERFORMANCE TABLE */}
        <div className={`rounded-3xl border ${cardClass} p-6 shadow-2xl`}>
          <div
            className={`flex items-center justify-between border-b ${borderCol} pb-4`}
          >
            <div>
              <h2 className={`text-base font-black ${textPrimary}`}>
                Complete Movie Performance Ranking
              </h2>
              <p className={`mt-1 text-xs ${textSecondary}`}>
                Comprehensive ticket sales and revenue breakdown by film.
              </p>
            </div>
            <Film className={`h-5 w-5 ${textMuted}`} />
          </div>

          <div className="mt-5 overflow-x-auto">
            <div className="min-w-[650px]">
              <div
                className={`grid grid-cols-[50px_1fr_120px_140px] gap-4 border-b ${borderCol} px-3 pb-3 text-[10px] font-black uppercase tracking-wider ${textSecondary}`}
              >
                <span>Rank</span>
                <span>Movie Title</span>
                <span>Tickets Sold</span>
                <span>Revenue Generated</span>
              </div>

              <div
                className={`divide-y ${isLight ? "divide-slate-200" : "divide-slate-800/70"}`}
              >
                {popularMoviesList.map((movie, index) => {
                  const percentage = Math.round(
                    (movie.count / maxTicketCount) * 100,
                  );

                  return (
                    <div
                      key={movie.title}
                      className="grid grid-cols-[50px_1fr_120px_140px] items-center gap-4 px-3 py-4 transition-colors hover:bg-slate-500/5 rounded-2xl"
                    >
                      <span className={`text-xs font-black ${textSecondary}`}>
                        #{index + 1}
                      </span>

                      <div className="min-w-0">
                        <p
                          className={`truncate text-sm font-black ${textPrimary}`}
                        >
                          {movie.title}
                        </p>
                        <div
                          className={`mt-2 h-3 max-w-[320px] overflow-hidden rounded-full ${isLight ? "bg-slate-200 border border-slate-300" : "bg-slate-800"}`}
                        >
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-red-600 to-orange-400 transition-all duration-700 ease-out shadow-sm"
                            style={{
                              width: `${Math.max(percentage, 6)}%`,
                            }}
                          />
                        </div>
                      </div>

                      <span
                        className={`text-xs font-mono font-black ${textSecondary}`}
                      >
                        {movie.count} tickets
                      </span>

                      <span className="font-mono text-xs font-black text-emerald-600 dark:text-emerald-400">
                        ${movie.revenue.toFixed(2)}
                      </span>
                    </div>
                  );
                })}

                {popularMoviesList.length === 0 && (
                  <div className={`py-12 text-center text-xs ${textMuted}`}>
                    No movie sales data available.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
