"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Ticket,
  DollarSign,
  Film,
  Calendar,
  Loader2,
  Tv,
  Sparkles,
  ArrowUpRight,
  Users,
} from "lucide-react";

import { BookingService } from "@/app/service/booking.service";
import MovieService from "@/app/service/movie.service";
import {
  BookingResponse,
  MovieResponse,
} from "@/app/types/api.types";
import Toast from "@/app/components/Toast";

const extractArray = <T,>(res: any): T[] => {
  if (Array.isArray(res)) return res;
  if (Array.isArray(res?.content)) return res.content;
  if (Array.isArray(res?.data)) return res.data;
  if (Array.isArray(res?.body?.data)) return res.body.data;
  if (Array.isArray(res?.data?.content)) return res.data.content;

  return [];
};

type DashboardPeriod = "7D" | "30D" | "90D";

export default function AdminDashboardPage() {
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
        booking.status === "CONFIRMED" ||
        booking.status === "CHECKED_IN"
    );
  }, [bookings]);

  /* -----------------------------------------------------------
     BASIC STATISTICS
  ----------------------------------------------------------- */

  const totalRevenue = useMemo(() => {
    return confirmedBookings.reduce(
      (sum, booking) =>
        sum + Number(booking.totalAmount || 0),
      0
    );
  }, [confirmedBookings]);

  const totalTickets = useMemo(() => {
    return confirmedBookings.reduce(
      (sum, booking) =>
        sum + (booking.tickets?.length || 0),
      0
    );
  }, [confirmedBookings]);

  const totalBookings = confirmedBookings.length;

  const averageOrderValue =
    totalBookings > 0
      ? totalRevenue / totalBookings
      : 0;

  /* -----------------------------------------------------------
     DATE HELPERS
  ----------------------------------------------------------- */

  const getDateKey = (date: Date) => {
    return `${date.getFullYear()}-${String(
      date.getMonth() + 1
    ).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  };

  /* -----------------------------------------------------------
     REVENUE TREND
  ----------------------------------------------------------- */

  const revenueTrend = useMemo(() => {
    const now = new Date();

    const days =
      period === "7D"
        ? 7
        : period === "30D"
        ? 30
        : 90;

    const revenueMap: Record<string, number> = {};

    confirmedBookings.forEach((booking: any) => {
      const rawDate =
        booking.createdAt ||
        booking.updatedAt ||
        booking.startTime;

      if (!rawDate) return;

      const date = new Date(rawDate);

      if (Number.isNaN(date.getTime())) return;

      const key = getDateKey(date);

      revenueMap[key] =
        (revenueMap[key] || 0) +
        Number(booking.totalAmount || 0);
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
        label:
          days > 30
            ? date.toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              })
            : date.toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              }),
        amount: revenueMap[key] || 0,
      });
    }

    return result;
  }, [confirmedBookings, period]);

  const maxRevenue = Math.max(
    ...revenueTrend.map((item) => item.amount),
    1
  );

  /* -----------------------------------------------------------
     SIMPLE SVG LINE CHART
  ----------------------------------------------------------- */

  const chartPoints = useMemo(() => {
    const width = 1000;
    const height = 300;

    if (revenueTrend.length === 0) {
      return "";
    }

    return revenueTrend
      .map((item, index) => {
        const x =
          revenueTrend.length === 1
            ? width / 2
            : (index / (revenueTrend.length - 1)) *
              width;

        const y =
          height -
          (item.amount / maxRevenue) *
            (height - 30) -
          10;

        return `${x},${y}`;
      })
      .join(" ");
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
      const title =
        booking.movieTitle || "Unknown Movie";

      if (!movieMap[title]) {
        movieMap[title] = {
          title,
          tickets: 0,
          revenue: 0,
        };
      }

      movieMap[title].tickets +=
        booking.tickets?.length || 1;

      movieMap[title].revenue += Number(
        booking.totalAmount || 0
      );
    });

    return Object.values(movieMap)
      .sort((a, b) => b.tickets - a.tickets)
      .slice(0, 5);
  }, [confirmedBookings]);

  const maxMovieTickets =
    popularMovies[0]?.tickets || 1;

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
      const hall =
        booking.hallName || "Main Auditorium";

      const cinema =
        booking.cinemaName || "Cinema Branch";

      const key = `${cinema}-${hall}`;

      if (!map[key]) {
        map[key] = {
          hall,
          cinema,
          tickets: 0,
          revenue: 0,
        };
      }

      map[key].tickets +=
        booking.tickets?.length || 1;

      map[key].revenue += Number(
        booking.totalAmount || 0
      );
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
      const cinema =
        booking.cinemaName || "Main Cinema";

      map[cinema] =
        (map[cinema] || 0) +
        (booking.tickets?.length || 1);
    });

    const colors = [
      "#ef4444",
      "#f97316",
      "#10b981",
      "#3b82f6",
      "#8b5cf6",
    ];

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
    0
  );

  /* -----------------------------------------------------------
     LOADING
  ----------------------------------------------------------- */

  if (loading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center bg-slate-950">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-red-500" />

          <p className="text-xs text-slate-500">
            Loading dashboard...
          </p>
        </div>
      </div>
    );
  }

  /* -----------------------------------------------------------
     UI
  ----------------------------------------------------------- */

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
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

      <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">

        {/* HEADER */}

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-500/10">
                <BarChart3 className="h-5 w-5 text-red-500" />
              </div>

              <h1 className="text-2xl font-black tracking-tight text-white">
                Cinema Dashboard
              </h1>
            </div>

            <p className="mt-1 text-sm text-slate-500">
              Overview of your cinema performance and ticket sales.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-slate-400">
              Updated just now
            </div>
          </div>
        </div>

        {/* KPI CARDS */}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">

          {/* Revenue */}

          <div className="group relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 p-5 transition hover:border-emerald-500/30">
            <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-emerald-500/5 blur-2xl" />

            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Total Revenue
                </p>

                <p className="mt-3 text-2xl font-black text-white">
                  ${totalRevenue.toFixed(2)}
                </p>
              </div>

              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400">
                <DollarSign className="h-5 w-5" />
              </div>
            </div>

            <div className="mt-4 flex items-center gap-1.5 text-xs font-semibold text-emerald-400">
              <TrendingUp className="h-3.5 w-3.5" />
              <span>Box office revenue</span>
            </div>
          </div>

          {/* Tickets */}

          <div className="group relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 p-5 transition hover:border-red-500/30">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Tickets Sold
                </p>

                <p className="mt-3 text-2xl font-black text-white">
                  {totalTickets}
                </p>
              </div>

              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/10 text-red-400">
                <Ticket className="h-5 w-5" />
              </div>
            </div>

            <div className="mt-4 flex items-center gap-1.5 text-xs font-semibold text-slate-500">
              <Users className="h-3.5 w-3.5" />
              <span>{totalBookings} confirmed bookings</span>
            </div>
          </div>

          {/* Movies */}

          <div className="group relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 p-5 transition hover:border-purple-500/30">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Movie Catalog
                </p>

                <p className="mt-3 text-2xl font-black text-white">
                  {movies.length}
                </p>
              </div>

              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/10 text-purple-400">
                <Film className="h-5 w-5" />
              </div>
            </div>

            <div className="mt-4 flex items-center gap-1.5 text-xs font-semibold text-slate-500">
              <Calendar className="h-3.5 w-3.5" />
              <span>Available movies</span>
            </div>
          </div>

          {/* Average */}

          <div className="group relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 p-5 transition hover:border-blue-500/30">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Avg. Booking Value
                </p>

                <p className="mt-3 text-2xl font-black text-white">
                  ${averageOrderValue.toFixed(2)}
                </p>
              </div>

              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400">
                <Sparkles className="h-5 w-5" />
              </div>
            </div>

            <div className="mt-4 flex items-center gap-1.5 text-xs font-semibold text-slate-500">
              <ArrowUpRight className="h-3.5 w-3.5" />
              <span>Per confirmed booking</span>
            </div>
          </div>
        </div>

        {/* MAIN CHART */}

        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 sm:p-6">

          <div className="flex flex-col gap-4 border-b border-slate-800 pb-5 sm:flex-row sm:items-center sm:justify-between">

            <div>
              <h2 className="text-base font-black text-white">
                Revenue Overview
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                Box office revenue over the selected period.
              </p>
            </div>

            <div className="flex rounded-xl border border-slate-800 bg-slate-950 p-1">
              {(
                ["7D", "30D", "90D"] as DashboardPeriod[]
              ).map((item) => (
                <button
                  key={item}
                  onClick={() => setPeriod(item)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                    period === item
                      ? "bg-red-600 text-white"
                      : "text-slate-500 hover:text-white"
                  }`}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>

          {/* SVG CHART */}

          <div className="mt-6">

            <div className="relative h-[300px] w-full">

              {/* GRID */}

              <div className="pointer-events-none absolute inset-0 flex flex-col justify-between">
                {[0, 1, 2, 3, 4].map((line) => (
                  <div
                    key={line}
                    className="border-t border-slate-800/70"
                  />
                ))}
              </div>

              {/* Y LABELS */}

              <div className="pointer-events-none absolute left-0 top-0 flex h-full flex-col justify-between text-[10px] text-slate-600">
                <span>${Math.round(maxRevenue)}</span>
                <span>${Math.round(maxRevenue * 0.75)}</span>
                <span>${Math.round(maxRevenue * 0.5)}</span>
                <span>${Math.round(maxRevenue * 0.25)}</span>
                <span>$0</span>
              </div>

              <svg
                viewBox="0 0 1000 300"
                preserveAspectRatio="none"
                className="absolute inset-0 h-full w-full pl-10"
              >
                <defs>
                  <linearGradient
                    id="dashboardAreaGradient"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset="0%"
                      stopColor="#ef4444"
                      stopOpacity="0.28"
                    />

                    <stop
                      offset="100%"
                      stopColor="#ef4444"
                      stopOpacity="0"
                    />
                  </linearGradient>
                </defs>

                {/* AREA */}

                <polygon
                  points={`0,300 ${chartPoints} 1000,300`}
                  fill="url(#dashboardAreaGradient)"
                />

                {/* LINE */}

                <polyline
                  points={chartPoints}
                  fill="none"
                  stroke="#ef4444"
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                {/* POINTS */}

                {revenueTrend.map((item, index) => {
                  const x =
                    revenueTrend.length === 1
                      ? 500
                      : (index /
                          (revenueTrend.length - 1)) *
                        1000;

                  const y =
                    300 -
                    (item.amount / maxRevenue) *
                      270 -
                    10;

                  return (
                    <circle
                      key={item.date}
                      cx={x}
                      cy={y}
                      r="5"
                      fill="#0f172a"
                      stroke="#ef4444"
                      strokeWidth="3"
                    />
                  );
                })}
              </svg>
            </div>

            {/* X LABELS */}

            <div className="ml-10 mt-2 flex justify-between overflow-hidden">
              {revenueTrend
                .filter(
                  (_, index) =>
                    index === 0 ||
                    index ===
                      revenueTrend.length - 1 ||
                    index %
                      Math.max(
                        1,
                        Math.floor(
                          revenueTrend.length / 6
                        )
                      ) ===
                      0
                )
                .map((item) => (
                  <span
                    key={item.date}
                    className="text-[10px] text-slate-600"
                  >
                    {item.label}
                  </span>
                ))}
            </div>
          </div>
        </div>

        {/* LOWER DASHBOARD */}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">

          {/* CINEMA DISTRIBUTION */}

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <div className="border-b border-slate-800 pb-4">
              <h2 className="text-sm font-black text-white">
                Ticket Distribution
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                Ticket volume by cinema branch.
              </p>
            </div>

            <div className="mt-6 flex justify-center">
              <div
                className="relative h-40 w-40 rounded-full"
                style={{
                  background:
                    distribution.length > 0
                      ? `conic-gradient(${distribution
                          .map((item, index) => {
                            const previous =
                              distribution
                                .slice(0, index)
                                .reduce(
                                  (sum, x) =>
                                    sum + x.tickets,
                                  0
                                );

                            const start =
                              totalDistributionTickets
                                ? (previous /
                                    totalDistributionTickets) *
                                  100
                                : 0;

                            const end =
                              totalDistributionTickets
                                ? ((previous +
                                    item.tickets) /
                                    totalDistributionTickets) *
                                  100
                                : 0;

                            return `${item.color} ${start}% ${end}%`;
                          })
                          .join(", ")}`
                      : "#1e293b",
                }}
              >
                <div className="absolute inset-7 flex flex-col items-center justify-center rounded-full bg-slate-900">
                  <span className="text-2xl font-black text-white">
                    {totalTickets}
                  </span>

                  <span className="text-[10px] text-slate-500">
                    Tickets
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-6 space-y-3">
              {distribution.map((item) => {
                const percentage =
                  totalDistributionTickets > 0
                    ? Math.round(
                        (item.tickets /
                          totalDistributionTickets) *
                          100
                      )
                    : 0;

                return (
                  <div
                    key={item.name}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{
                          backgroundColor: item.color,
                        }}
                      />

                      <span className="max-w-[130px] truncate text-xs text-slate-400">
                        {item.name}
                      </span>
                    </div>

                    <span className="text-xs font-bold text-white">
                      {percentage}%
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* POPULAR MOVIES */}

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 lg:col-span-2">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h2 className="text-sm font-black text-white">
                  Most Popular Movies
                </h2>

                <p className="mt-1 text-xs text-slate-500">
                  Movies generating the highest ticket demand.
                </p>
              </div>

              <Film className="h-5 w-5 text-slate-600" />
            </div>

            <div className="mt-5 space-y-4">
              {popularMovies.length > 0 ? (
                popularMovies.map((movie, index) => {
                  const percentage = Math.round(
                    (movie.tickets /
                      maxMovieTickets) *
                      100
                  );

                  return (
                    <div
                      key={movie.title}
                      className="group"
                    >
                      <div className="mb-1.5 flex items-center justify-between">
                        <div className="flex min-w-0 items-center gap-3">
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-slate-800 text-[10px] font-black text-slate-400">
                            {index + 1}
                          </span>

                          <span className="truncate text-xs font-bold text-white">
                            {movie.title}
                          </span>
                        </div>

                        <div className="ml-3 flex shrink-0 items-center gap-4">
                          <span className="text-[10px] text-slate-500">
                            {movie.tickets} tickets
                          </span>

                          <span className="font-mono text-xs font-bold text-emerald-400">
                            ${movie.revenue.toFixed(2)}
                          </span>
                        </div>
                      </div>

                      <div className="h-2 overflow-hidden rounded-full bg-slate-800">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-red-600 to-orange-400 transition-all duration-500"
                          style={{
                            width: `${Math.max(
                              percentage,
                              4
                            )}%`,
                          }}
                        />
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="flex h-48 items-center justify-center text-xs text-slate-600">
                  No movie sales data available.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* HALL SUMMARY */}

        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">

          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div>
              <h2 className="text-sm font-black text-white">
                Top Performing Halls
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                Highest ticket volume across your auditoriums.
              </p>
            </div>

            <Tv className="h-5 w-5 text-slate-600" />
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
            {hallData.map((hall, index) => (
              <div
                key={`${hall.cinema}-${hall.hall}`}
                className="rounded-xl border border-slate-800 bg-slate-950/60 p-4"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black text-red-500">
                    #{index + 1}
                  </span>

                  <Tv className="h-4 w-4 text-slate-600" />
                </div>

                <p className="mt-3 truncate text-xs font-bold text-white">
                  {hall.hall}
                </p>

                <p className="mt-1 truncate text-[10px] text-slate-600">
                  {hall.cinema}
                </p>

                <div className="mt-4 flex items-end justify-between">
                  <div>
                    <p className="text-lg font-black text-white">
                      {hall.tickets}
                    </p>

                    <p className="text-[9px] uppercase text-slate-600">
                      Tickets
                    </p>
                  </div>

                  <p className="text-xs font-bold text-emerald-400">
                    ${hall.revenue.toFixed(0)}
                  </p>
                </div>
              </div>
            ))}

            {hallData.length === 0 && (
              <div className="col-span-full py-10 text-center text-xs text-slate-600">
                No hall data available.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}