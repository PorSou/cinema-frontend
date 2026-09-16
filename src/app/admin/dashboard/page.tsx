"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  BarChart3,
  TrendingUp,
  Ticket,
  DollarSign,
  Film,
  Calendar,
  Loader2,
  Tv,
  Sparkles,
  ArrowUpRight,
  Users,
  QrCode,
  ChevronRight,
  CreditCard,
  Trophy,
  Medal,
  Award,
  Zap,
} from "lucide-react";

import { BookingService } from "@/app/service/booking.service";
import MovieService from "@/app/service/movie.service";
import { BookingResponse, MovieResponse } from "@/app/types/api.types";
import Toast from "@/app/components/Toast";
import { useSettings } from "@/app/context/SettingsContext";

const extractArray = <T,>(res: any): T[] => {
  if (Array.isArray(res)) return res;
  if (Array.isArray(res?.content)) return res.content;
  if (Array.isArray(res?.data)) return res.data;
  if (Array.isArray(res?.body?.data)) return res.body.data;
  if (Array.isArray(res?.data?.content)) return res.data.content;

  return [];
};

type DashboardPeriod = "7D" | "30D" | "90D";

/* 🌟 Cool Relative Time Formatter */
const formatRelativeTime = (dateString?: string) => {
  if (!dateString) return "Recently";
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "Recently";

  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return "Just now";
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}h ago`;

  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays === 1) {
    return `Yesterday at ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
  }
  if (diffInDays < 7) return `${diffInDays} days ago`;

  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

// 🌟 Rank badge styling for the Top Box Office Films list — gold/silver/bronze
// for the top 3, plain for the rest.
const RANK_STYLES = [
  {
    icon: Trophy,
    badge:
      "bg-gradient-to-br from-amber-400 to-yellow-600 text-slate-950 shadow-lg shadow-amber-500/30",
    bar: "from-amber-400 via-yellow-500 to-orange-500 shadow-amber-500/40",
  },
  {
    icon: Medal,
    badge:
      "bg-gradient-to-br from-slate-300 to-slate-500 text-slate-950 shadow-lg shadow-slate-400/30",
    bar: "from-slate-300 via-slate-400 to-slate-500 shadow-slate-400/30",
  },
  {
    icon: Award,
    badge:
      "bg-gradient-to-br from-orange-400 to-amber-700 text-slate-950 shadow-lg shadow-orange-500/30",
    bar: "from-orange-400 via-amber-600 to-amber-700 shadow-orange-500/30",
  },
];
const DEFAULT_BAR =
  "from-cyan-500 via-blue-500 to-indigo-500 shadow-cyan-500/20";

export default function AdminDashboardPage() {
  const { theme } = useSettings();
  const isLight = theme === "light";

  const [loading, setLoading] = useState(true);

  const [bookings, setBookings] = useState<BookingResponse[]>([]);
  const [movies, setMovies] = useState<MovieResponse[]>([]);

  const [period, setPeriod] = useState<DashboardPeriod>("30D");

  const [toast, setToast] = useState<{
    message: string | null;
    type: "success" | "error";
  }>({
    message: null,
    type: "success",
  });

  /* -----------------------------------------------------------
     FETCH DATA
  ----------------------------------------------------------- */

  useEffect(() => {
    async function fetchDashboardData() {
      setLoading(true);

      try {
        const [bookingsRes, moviesRes] = await Promise.all([
          BookingService.getAllBookings(),
          MovieService.getAllMovies({
            size: 100,
          }),
        ]);

        setBookings(extractArray<BookingResponse>(bookingsRes));
        setMovies(extractArray<MovieResponse>(moviesRes));
      } catch (error) {
        setToast({
          message: "Failed to load dashboard data.",
          type: "error",
        });
      } finally {
        setLoading(false);
      }
    }

    fetchDashboardData();
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
     RECENT TRANSACTIONS FEED
  ----------------------------------------------------------- */

  const recentTransactions = useMemo(() => {
    return [...bookings]
      .sort(
        (a: any, b: any) =>
          new Date(b.createdAt || b.updatedAt || 0).getTime() -
          new Date(a.createdAt || a.updatedAt || 0).getTime(),
      )
      .slice(0, 5);
  }, [bookings]);

  /* -----------------------------------------------------------
     BASIC STATISTICS
  ----------------------------------------------------------- */

  const totalRevenue = useMemo(() => {
    return confirmedBookings.reduce(
      (sum, booking) => sum + Number(booking.totalAmount || 0),
      0,
    );
  }, [confirmedBookings]);

  const totalTickets = useMemo(() => {
    return confirmedBookings.reduce(
      (sum, booking) => sum + (booking.tickets?.length || 0),
      0,
    );
  }, [confirmedBookings]);

  const totalBookings = confirmedBookings.length;

  const averageOrderValue =
    totalBookings > 0 ? totalRevenue / totalBookings : 0;

  /* -----------------------------------------------------------
     DATE HELPERS
  ----------------------------------------------------------- */

  const getDateKey = (date: Date) => {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
      2,
      "0",
    )}-${String(date.getDate()).padStart(2, "0")}`;
  };

  /* -----------------------------------------------------------
     REVENUE TREND
  ----------------------------------------------------------- */

  const revenueTrend = useMemo(() => {
    const now = new Date();
    const days = period === "7D" ? 7 : period === "30D" ? 30 : 90;
    const revenueMap: Record<string, number> = {};

    confirmedBookings.forEach((booking: any) => {
      const rawDate =
        booking.createdAt || booking.updatedAt || booking.startTime;
      if (!rawDate) return;

      const date = new Date(rawDate);
      if (Number.isNaN(date.getTime())) return;

      const key = getDateKey(date);
      revenueMap[key] =
        (revenueMap[key] || 0) + Number(booking.totalAmount || 0);
    });

    const result: {
      label: string;
      date: string;
      amount: number;
    }[] = [];

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now);
      date.setHours(0, 0, 0, 0);
      date.setDate(now.getDate() - i);

      const key = getDateKey(date);

      result.push({
        date: key,
        label: date.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        }),
        amount: revenueMap[key] || 0,
      });
    }

    return result;
  }, [confirmedBookings, period]);

  const maxRevenue = Math.max(...revenueTrend.map((item) => item.amount), 1);

  // Helper to calculate smooth SVG cubic bezier path coordinates
  const svgPathData = useMemo(() => {
    if (revenueTrend.length === 0) return { path: "", area: "" };
    const width = 800;
    const height = 220;
    const padding = 20;

    const points = revenueTrend.map((item, index) => {
      const x =
        padding +
        (index / (revenueTrend.length - 1 || 1)) * (width - padding * 2);
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

    const area = `${path} L ${width - padding} ${height} L ${padding} ${height} Z`;
    return { path, area };
  }, [revenueTrend, maxRevenue]);

  /* -----------------------------------------------------------
     TOP MOVIES
  ----------------------------------------------------------- */

  const popularMovies = useMemo(() => {
    const movieMap: Record<
      string,
      {
        title: string;
        tickets: number;
        revenue: number;
      }
    > = {};

    confirmedBookings.forEach((booking) => {
      const title = booking.movieTitle || "Unknown Movie";

      if (!movieMap[title]) {
        movieMap[title] = {
          title,
          tickets: 0,
          revenue: 0,
        };
      }

      movieMap[title].tickets += booking.tickets?.length || 1;
      movieMap[title].revenue += Number(booking.totalAmount || 0);
    });

    return Object.values(movieMap)
      .sort((a, b) => b.tickets - a.tickets)
      .slice(0, 5);
  }, [confirmedBookings]);

  const maxMovieTickets = popularMovies[0]?.tickets || 1;

  /* -----------------------------------------------------------
     HALL DATA
  ----------------------------------------------------------- */

  const hallData = useMemo(() => {
    const map: Record<
      string,
      {
        hall: string;
        cinema: string;
        tickets: number;
        revenue: number;
      }
    > = {};

    confirmedBookings.forEach((booking) => {
      const hall = booking.hallName || "Main Auditorium";
      const cinema = booking.cinemaName || "Cinema Branch";
      const key = `${cinema}-${hall}`;

      if (!map[key]) {
        map[key] = {
          hall,
          cinema,
          tickets: 0,
          revenue: 0,
        };
      }

      map[key].tickets += booking.tickets?.length || 1;
      map[key].revenue += Number(booking.totalAmount || 0);
    });

    return Object.values(map)
      .sort((a, b) => b.tickets - a.tickets)
      .slice(0, 5);
  }, [confirmedBookings]);

  /* -----------------------------------------------------------
     CINEMA / HALL DISTRIBUTION
  ----------------------------------------------------------- */

  const distribution = useMemo(() => {
    const map: Record<string, number> = {};

    confirmedBookings.forEach((booking) => {
      const cinema = booking.cinemaName || "Main Cinema";
      map[cinema] = (map[cinema] || 0) + (booking.tickets?.length || 1);
    });

    const colors = ["#ef4444", "#f97316", "#10b981", "#3b82f6", "#8b5cf6"];

    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, tickets], index) => ({
        name,
        tickets,
        color: colors[index % colors.length],
      }));
  }, [confirmedBookings]);

  const totalDistributionTickets = distribution.reduce(
    (sum, item) => sum + item.tickets,
    0,
  );

  /**
   * =========================================================
   * PERMANENT HIGH-CONTRAST LIGHT & DARK CLASSES
   * =========================================================
   */
  const pageClass = isLight
    ? "bg-slate-50 text-slate-900"
    : "bg-slate-950 text-slate-100";

  const cardClass = isLight
    ? "border-slate-300 bg-white shadow-xl shadow-slate-200 ring-1 ring-slate-200"
    : "border-slate-800 bg-slate-900/60 shadow-2xl backdrop-blur-md";

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
    : "text-slate-500 font-medium";
  const borderCol = isLight ? "border-slate-300" : "border-slate-800";

  if (loading) {
    return (
      <div
        className={`flex min-h-[70vh] items-center justify-center ${pageClass}`}
      >
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-red-600" />
          <p className={`text-xs ${textSecondary}`}>Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`min-h-screen py-6 px-4 sm:px-8 lg:px-10 w-full space-y-6 transition-colors duration-300 pb-24 ${pageClass}`}
    >
      {/* Completely hide scrollbars globally */}
      <style jsx global>{`
        ::-webkit-scrollbar {
          display: none;
        }
        * {
          -ms-overflow-style: none; /* IE and Edge */
          scrollbar-width: none; /* Firefox */
        }
        @keyframes drawLine {
          from {
            stroke-dashoffset: 1000;
          }
          to {
            stroke-dashoffset: 0;
          }
        }
        @keyframes fadeInArea {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes shimmerBar {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(200%);
          }
        }
        @keyframes pulseDot {
          0%,
          100% {
            box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.5);
          }
          50% {
            box-shadow: 0 0 0 6px rgba(16, 185, 129, 0);
          }
        }
        .animate-curve-draw {
          stroke-dasharray: 1000;
          animation: drawLine 1.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .animate-area-fade {
          animation: fadeInArea 1.2s ease-out forwards;
        }
        .shimmer-sweep::after {
          content: "";
          position: absolute;
          inset: 0;
          background: linear-gradient(
            100deg,
            transparent 20%,
            rgba(255, 255, 255, 0.35) 50%,
            transparent 80%
          );
          animation: shimmerBar 2.4s ease-in-out infinite;
        }
        .pulse-dot {
          animation: pulseDot 2s infinite;
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
          className={`flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b ${borderCol} pb-5`}
        >
          <div>
            <div className="flex items-center gap-2.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-red-600/10 border border-red-500/30 text-red-600">
                <BarChart3 className="h-5 w-5" />
              </div>
              <h1
                className={`text-2xl font-black tracking-tight ${textPrimary}`}
              >
                Cinema Dashboard
              </h1>
            </div>
            <p className={`mt-1 text-xs ${textSecondary}`}>
              Real-time overview of your cinema performance, box office, and
              ticket sales.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/admin/scanner"
              className="flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-xs font-black text-white shadow-lg shadow-red-600/30 transition hover:bg-red-500"
            >
              <QrCode className="h-4 w-4" />
              <span>Launch Admission Scanner</span>
            </Link>

            <div
              className={`flex items-center gap-1.5 rounded-xl border ${borderCol} ${isLight ? "bg-white text-slate-900 font-bold shadow-sm" : "bg-slate-900 text-slate-400"} px-3.5 py-2 text-xs`}
            >
              <span className="relative flex h-2 w-2">
                <span className="pulse-dot absolute inline-flex h-full w-full rounded-full bg-emerald-500" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>
              Live Synchronized
            </div>
          </div>
        </div>

        {/* KPI CARDS */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div
            className={`group relative overflow-hidden rounded-3xl border ${cardClass} p-5 transition-all duration-300 hover:scale-[1.01] hover:border-emerald-500/50 shadow-xl`}
          >
            <div className="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-emerald-500/10 blur-3xl" />
            <div className="flex items-start justify-between">
              <div>
                <p
                  className={`text-[11px] font-black uppercase tracking-wider ${textSecondary}`}
                >
                  Total Revenue
                </p>
                <p
                  className={`mt-2 text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400`}
                >
                  ${totalRevenue.toFixed(2)}
                </p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400">
                <DollarSign className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-4 flex items-center gap-1.5 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
              <TrendingUp className="h-3.5 w-3.5" />
              <span>Verified box office earnings</span>
            </div>
          </div>

          <div
            className={`group relative overflow-hidden rounded-3xl border ${cardClass} p-5 transition-all duration-300 hover:scale-[1.01] hover:border-red-500/50 shadow-xl`}
          >
            <div className="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-red-500/10 blur-3xl" />
            <div className="flex items-start justify-between">
              <div>
                <p
                  className={`text-[11px] font-black uppercase tracking-wider ${textSecondary}`}
                >
                  Tickets Sold
                </p>
                <p
                  className={`mt-2 text-2xl font-black font-mono ${textPrimary}`}
                >
                  {totalTickets}
                </p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-red-500/15 border border-red-500/30 text-red-600">
                <Ticket className="h-5 w-5" />
              </div>
            </div>
            <div
              className={`mt-4 flex items-center gap-1.5 text-[11px] font-bold ${textSecondary}`}
            >
              <Users className="h-3.5 w-3.5 text-red-600" />
              <span>{totalBookings} confirmed reservation orders</span>
            </div>
          </div>

          <div
            className={`group relative overflow-hidden rounded-3xl border ${cardClass} p-5 transition-all duration-300 hover:scale-[1.01] hover:border-purple-500/50 shadow-xl`}
          >
            <div className="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-purple-500/10 blur-3xl" />
            <div className="flex items-start justify-between">
              <div>
                <p
                  className={`text-[11px] font-black uppercase tracking-wider ${textSecondary}`}
                >
                  Movie Catalog
                </p>
                <p
                  className={`mt-2 text-2xl font-black font-mono ${textPrimary}`}
                >
                  {movies.length}
                </p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-purple-500/15 border border-purple-500/30 text-purple-600 dark:text-purple-400">
                <Film className="h-5 w-5" />
              </div>
            </div>
            <div
              className={`mt-4 flex items-center gap-1.5 text-[11px] font-bold ${textSecondary}`}
            >
              <Calendar className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />
              <span>Active film lineup</span>
            </div>
          </div>

          <div
            className={`group relative overflow-hidden rounded-3xl border ${cardClass} p-5 transition-all duration-300 hover:scale-[1.01] hover:border-blue-500/50 shadow-xl`}
          >
            <div className="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-blue-500/10 blur-3xl" />
            <div className="flex items-start justify-between">
              <div>
                <p
                  className={`text-[11px] font-black uppercase tracking-wider ${textSecondary}`}
                >
                  Avg. Booking Value
                </p>
                <p
                  className={`mt-2 text-2xl font-black font-mono ${textPrimary}`}
                >
                  ${averageOrderValue.toFixed(2)}
                </p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-500/15 border border-blue-500/30 text-blue-600 dark:text-blue-400">
                <Sparkles className="h-5 w-5" />
              </div>
            </div>
            <div
              className={`mt-4 flex items-center gap-1.5 text-[11px] font-bold ${textSecondary}`}
            >
              <ArrowUpRight className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
              <span>Per ticket basket</span>
            </div>
          </div>
        </div>

        {/* ANIMATED SMOOTH CURVED AREA REVENUE CHART */}
        <div className={`rounded-3xl border ${cardClass} p-6 shadow-2xl`}>
          <div
            className={`flex flex-col gap-4 border-b ${borderCol} pb-5 sm:flex-row sm:items-center sm:justify-between`}
          >
            <div>
              <h2 className={`text-base font-black ${textPrimary}`}>
                Revenue Forecast & Performance
              </h2>
              <p className={`mt-1 text-xs ${textSecondary}`}>
                Animated earnings curve breakdown across the selected period.
              </p>
            </div>

            <div
              className={`flex rounded-xl border ${borderCol} ${isLight ? "bg-slate-200" : "bg-slate-950"} p-1 shadow-inner`}
            >
              {(["7D", "30D", "90D"] as DashboardPeriod[]).map((item) => (
                <button
                  key={item}
                  onClick={() => setPeriod(item)}
                  className={`rounded-lg px-3.5 py-1.5 text-xs font-black transition-all duration-200 cursor-pointer ${
                    period === item
                      ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/30"
                      : `${textSecondary} hover:${textPrimary}`
                  }`}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-8 relative w-full h-[240px]">
            <svg
              key={period} // Forces re-animation trigger on period change
              viewBox="0 0 800 220"
              preserveAspectRatio="none"
              className="w-full h-full overflow-visible"
            >
              <defs>
                <linearGradient
                  id="animatedCurveGradient"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.45" />
                  <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Background grid lines */}
              <line
                x1="0"
                y1="55"
                x2="800"
                y2="55"
                stroke={isLight ? "#cbd5e1" : "#1e293b"}
                strokeDasharray="4 4"
                strokeWidth="1.5"
              />
              <line
                x1="0"
                y1="110"
                x2="800"
                y2="110"
                stroke={isLight ? "#cbd5e1" : "#1e293b"}
                strokeDasharray="4 4"
                strokeWidth="1.5"
              />
              <line
                x1="0"
                y1="165"
                x2="800"
                y2="165"
                stroke={isLight ? "#cbd5e1" : "#1e293b"}
                strokeDasharray="4 4"
                strokeWidth="1.5"
              />

              {/* Area fill with fade-in animation */}
              {svgPathData.area && (
                <path
                  d={svgPathData.area}
                  fill="url(#animatedCurveGradient)"
                  className="animate-area-fade"
                />
              )}

              {/* Smooth Spline Curve with draw animation */}
              {svgPathData.path && (
                <path
                  d={svgPathData.path}
                  fill="none"
                  stroke="#0891b2"
                  strokeWidth="4"
                  strokeLinecap="round"
                  className="animate-curve-draw"
                />
              )}
            </svg>

            <div
              className={`mt-4 flex justify-between border-t ${borderCol} px-1 pt-3 font-mono text-[11px] font-bold ${textMuted}`}
            >
              <span>{revenueTrend[0]?.label}</span>
              <span>
                {revenueTrend[Math.floor(revenueTrend.length / 2)]?.label}
              </span>
              <span>{revenueTrend[revenueTrend.length - 1]?.label}</span>
            </div>
          </div>
        </div>

        {/* ============================================================
            LOWER SECTION — REDESIGNED
            Same data (distribution, popularMovies) — new visual treatment:
            gradient donut with glow, ranked legend bars, and a podium-style
            Top Films list with gold/silver/bronze badges + shimmering bars.
        ============================================================ */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* TICKET DISTRIBUTION */}
          <div className={`rounded-3xl border ${cardClass} p-6 shadow-xl`}>
            <div
              className={`flex items-center justify-between border-b ${borderCol} pb-4`}
            >
              <div>
                <h2 className={`text-sm font-black ${textPrimary}`}>
                  Ticket Share by Branch
                </h2>
                <p className={`mt-1 text-xs ${textSecondary}`}>
                  Proportional audit of admissions.
                </p>
              </div>
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-violet-500/15 border border-violet-500/30 text-violet-500">
                <Zap className="h-4 w-4" />
              </div>
            </div>

            <div className="mt-6 flex justify-center">
              <div
                className="relative h-48 w-48 rounded-full p-1.5 shadow-[0_0_40px_-8px_rgba(139,92,246,0.35)] transition-transform duration-500 hover:scale-105"
                style={{
                  background:
                    distribution.length > 0
                      ? `conic-gradient(${distribution
                          .map((item, index) => {
                            const previous = distribution
                              .slice(0, index)
                              .reduce((sum, x) => sum + x.tickets, 0);

                            const start = totalDistributionTickets
                              ? (previous / totalDistributionTickets) * 100
                              : 0;

                            const end = totalDistributionTickets
                              ? ((previous + item.tickets) /
                                  totalDistributionTickets) *
                                100
                              : 0;

                            return `${item.color} ${start}% ${end}%`;
                          })
                          .join(", ")})`
                      : isLight
                        ? "#cbd5e1"
                        : "#1e293b",
                }}
              >
                <div
                  className={`flex h-full w-full flex-col items-center justify-center rounded-full ${isLight ? "bg-white shadow-lg ring-1 ring-slate-200" : "bg-slate-900 shadow-inner"}`}
                >
                  <span className={`text-3xl font-black ${textPrimary}`}>
                    {totalTickets}
                  </span>
                  <span
                    className={`mt-0.5 text-[10px] font-black uppercase tracking-wider ${textSecondary}`}
                  >
                    Total Sold
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-7 space-y-3.5">
              {distribution.map((item, index) => {
                const percentage =
                  totalDistributionTickets > 0
                    ? Math.round(
                        (item.tickets / totalDistributionTickets) * 100,
                      )
                    : 0;

                return (
                  <div key={item.name} className="group">
                    <div className="mb-1.5 flex items-center justify-between text-xs">
                      <div className="flex min-w-0 items-center gap-2">
                        <span
                          className="h-2.5 w-2.5 shrink-0 rounded-full ring-2 ring-offset-2 transition-transform group-hover:scale-125"
                          style={{
                            backgroundColor: item.color,
                            boxShadow: `0 0 8px ${item.color}80`,
                          }}
                        />
                        <span className={`truncate font-bold ${textSecondary}`}>
                          {item.name}
                        </span>
                      </div>
                      <span
                        className={`shrink-0 font-mono font-black ${textPrimary}`}
                      >
                        {percentage}%
                      </span>
                    </div>
                    <div
                      className={`h-1.5 overflow-hidden rounded-full ${isLight ? "bg-slate-200" : "bg-slate-800/80"}`}
                    >
                      <div
                        className="h-full rounded-full transition-all duration-700 ease-out"
                        style={{
                          width: `${percentage}%`,
                          backgroundColor: item.color,
                          boxShadow: `0 0 6px ${item.color}90`,
                        }}
                      />
                    </div>
                  </div>
                );
              })}

              {distribution.length === 0 && (
                <div className={`py-6 text-center text-xs ${textMuted}`}>
                  No distribution data available.
                </div>
              )}
            </div>
          </div>

          {/* POPULAR MOVIES — podium styled top 3 */}
          <div
            className={`rounded-3xl border ${cardClass} p-6 lg:col-span-2 shadow-xl`}
          >
            <div
              className={`flex items-center justify-between border-b ${borderCol} pb-4`}
            >
              <div>
                <h2 className={`text-sm font-black ${textPrimary}`}>
                  Top Box Office Films
                </h2>
                <p className={`mt-1 text-xs ${textSecondary}`}>
                  Ranked by ticket reservations and revenue generation.
                </p>
              </div>
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-500">
                <Film className="h-4 w-4" />
              </div>
            </div>

            <div className="mt-6 space-y-5">
              {popularMovies.length > 0 ? (
                popularMovies.map((movie, index) => {
                  const percentage = Math.round(
                    (movie.tickets / maxMovieTickets) * 100,
                  );
                  const rankStyle = RANK_STYLES[index];
                  const RankIcon = rankStyle?.icon;
                  const barGradient = rankStyle?.bar || DEFAULT_BAR;

                  return (
                    <div key={movie.title} className="group">
                      <div className="mb-2 flex items-center justify-between text-xs">
                        <div className="flex min-w-0 items-center gap-3">
                          <span
                            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-xl text-[11px] transition-transform group-hover:scale-110 ${
                              rankStyle
                                ? rankStyle.badge
                                : isLight
                                  ? "bg-white text-slate-900 border border-slate-300 font-black shadow-sm"
                                  : "bg-slate-800 text-slate-300"
                            }`}
                          >
                            {RankIcon ? (
                              <RankIcon className="h-3.5 w-3.5" />
                            ) : (
                              index + 1
                            )}
                          </span>
                          <span className={`truncate font-bold ${textPrimary}`}>
                            {movie.title}
                          </span>
                        </div>

                        <div className="ml-3 flex shrink-0 items-center gap-4">
                          <span
                            className={`text-[11px] font-bold ${textSecondary}`}
                          >
                            {movie.tickets} tickets
                          </span>
                          <span className="font-mono font-black text-emerald-600 dark:text-emerald-400">
                            ${movie.revenue.toFixed(2)}
                          </span>
                        </div>
                      </div>

                      <div
                        className={`relative h-3 overflow-hidden rounded-full ${isLight ? "bg-slate-200 border border-slate-300" : "bg-slate-800"}`}
                      >
                        <div
                          className={`shimmer-sweep relative h-full overflow-hidden rounded-full bg-gradient-to-r shadow-sm transition-all duration-700 ease-out ${barGradient}`}
                          style={{
                            width: `${Math.max(percentage, 6)}%`,
                          }}
                        />
                      </div>
                    </div>
                  );
                })
              ) : (
                <div
                  className={`flex h-48 items-center justify-center text-xs ${textMuted}`}
                >
                  No movie sales data available.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ============================================================
            HALL SUMMARY & IMMEDIATE RECENT TRANSACTIONS FEED — REDESIGNED
            Same data — hall cards now carry a color-coded top accent bar per
            rank, and the transactions feed is a proper connected timeline.
        ============================================================ */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div
            className={`rounded-3xl border ${cardClass} p-6 shadow-xl lg:col-span-2`}
          >
            <div
              className={`flex items-center justify-between border-b ${borderCol} pb-4`}
            >
              <div>
                <h2 className={`text-sm font-black ${textPrimary}`}>
                  Auditorium Performance Ranking
                </h2>
                <p className={`mt-1 text-xs ${textSecondary}`}>
                  Top performing halls based on attendance volume.
                </p>
              </div>
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-500">
                <Tv className="h-4 w-4" />
              </div>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
              {hallData.map((hall, index) => {
                const accent =
                  index === 0
                    ? "from-amber-400 to-yellow-500"
                    : index === 1
                      ? "from-slate-300 to-slate-500"
                      : index === 2
                        ? "from-orange-400 to-amber-700"
                        : "from-cyan-500 to-blue-600";

                return (
                  <div
                    key={`${hall.cinema}-${hall.hall}`}
                    className={`group relative overflow-hidden rounded-2xl border ${subCardClass} p-4 pt-5 transition-all duration-300 hover:-translate-y-1 hover:border-cyan-500/50 shadow-sm`}
                  >
                    <div
                      className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${accent}`}
                    />

                    <div className="flex items-center justify-between">
                      <span
                        className={`flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-md bg-gradient-to-r ${accent} text-slate-950 shadow-sm`}
                      >
                        Rank #{index + 1}
                      </span>
                      <Tv
                        className={`h-4 w-4 transition-transform group-hover:rotate-6 ${textMuted}`}
                      />
                    </div>

                    <p
                      className={`mt-3 truncate text-xs font-bold ${textPrimary}`}
                    >
                      {hall.hall}
                    </p>
                    <p
                      className={`mt-0.5 truncate text-[10px] font-semibold ${textMuted}`}
                    >
                      {hall.cinema}
                    </p>

                    <div className="mt-5 flex items-end justify-between border-t border-slate-300 dark:border-slate-800 pt-3">
                      <div>
                        <p className={`text-base font-black ${textPrimary}`}>
                          {hall.tickets}
                        </p>
                        <p
                          className={`text-[9px] font-bold uppercase tracking-wider ${textMuted}`}
                        >
                          Admissions
                        </p>
                      </div>
                      <p className="font-mono text-xs font-black text-emerald-600 dark:text-emerald-400">
                        ${hall.revenue.toFixed(0)}
                      </p>
                    </div>
                  </div>
                );
              })}

              {hallData.length === 0 && (
                <div
                  className={`col-span-full py-10 text-center text-xs ${textMuted}`}
                >
                  No hall performance data available.
                </div>
              )}
            </div>
          </div>

          {/* IMMEDIATE TRANSACTIONS — connected timeline feed */}
          <div
            className={`rounded-3xl border ${cardClass} p-6 shadow-xl flex flex-col justify-between`}
          >
            <div>
              <div
                className={`flex items-center justify-between border-b ${borderCol} pb-4 mb-5`}
              >
                <div>
                  <h2 className={`text-sm font-black ${textPrimary}`}>
                    Immediate Transactions
                  </h2>
                  <p className={`mt-1 text-xs ${textSecondary}`}>
                    Real-time booking order stream.
                  </p>
                </div>
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-500">
                  <CreditCard className="h-4 w-4" />
                </div>
              </div>

              <div className="relative space-y-4 pl-1">
                {recentTransactions.length > 0 ? (
                  <>
                    {/* connecting timeline line */}
                    <div
                      className={`absolute left-[7px] top-2 bottom-2 w-px ${isLight ? "bg-slate-300" : "bg-slate-800"}`}
                    />

                    {recentTransactions.map((tx: any, idx: number) => (
                      <div key={tx.id} className="relative flex gap-3 pl-5">
                        <span
                          className={`absolute left-0 top-1 h-3.5 w-3.5 rounded-full border-2 ${
                            idx === 0
                              ? "border-emerald-500 bg-emerald-500/30 pulse-dot"
                              : isLight
                                ? "border-slate-400 bg-white"
                                : "border-slate-700 bg-slate-900"
                          }`}
                        />

                        <div
                          className={`flex-1 min-w-0 flex items-center justify-between gap-3 rounded-xl border ${borderCol} p-2.5 text-xs transition hover:border-emerald-500/40 ${
                            isLight ? "bg-white/60" : "bg-slate-950/40"
                          }`}
                        >
                          <div className="min-w-0 space-y-0.5">
                            <p className={`font-black truncate ${textPrimary}`}>
                              {tx.movieTitle || "Screening Order"}
                            </p>
                            <p className={`text-[10px] font-mono ${textMuted}`}>
                              {formatRelativeTime(tx.createdAt || tx.updatedAt)}{" "}
                              • Ref #{tx.bookingNumber || tx.id}
                            </p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="font-mono font-black text-emerald-600 dark:text-emerald-400">
                              +${Number(tx.totalAmount || 0).toFixed(2)}
                            </p>
                            <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                              {tx.status}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </>
                ) : (
                  <div className={`py-12 text-center text-xs ${textMuted}`}>
                    No transactions recorded yet.
                  </div>
                )}
              </div>
            </div>

            <div className="pt-4 mt-4 border-t border-slate-300 dark:border-slate-800">
              <Link
                href="/admin/ledger"
                className="flex items-center justify-between text-xs font-bold text-cyan-600 dark:text-cyan-400 hover:underline transition"
              >
                <span>View Bookings Audit Ledger</span>
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
