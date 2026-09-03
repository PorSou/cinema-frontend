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

type RevenueView = "DAILY" | "MONTHLY" | "YEARLY";

export default function AdminAnalyticsPage() {
  const [loading, setLoading] = useState(true);

  const [bookings, setBookings] = useState<BookingResponse[]>([]);
  const [movies, setMovies] = useState<MovieResponse[]>([]);

  const [revenueView, setRevenueView] =
    useState<RevenueView>("MONTHLY");

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
        const [bookingsRes, moviesRes] =
          await Promise.all([
            BookingService.getAllBookings(),
            MovieService.getAllMovies({
              size: 100,
            }),
          ]);

        setBookings(
          extractArray<BookingResponse>(bookingsRes)
        );

        setMovies(
          extractArray<MovieResponse>(moviesRes)
        );
      } catch (error) {
        setToast({
          message:
            "Failed to load analytics metrics.",
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
        booking.status === "CONFIRMED" ||
        booking.status === "CHECKED_IN"
    );
  }, [bookings]);

  /* -----------------------------------------------------------
     OVERVIEW
  ----------------------------------------------------------- */

  const totalRevenue = useMemo(() => {
    return confirmedBookings.reduce(
      (sum, booking) =>
        sum + Number(booking.totalAmount || 0),
      0
    );
  }, [confirmedBookings]);

  const totalTicketsSold = useMemo(() => {
    return confirmedBookings.reduce(
      (sum, booking) =>
        sum + (booking.tickets?.length || 0),
      0
    );
  }, [confirmedBookings]);

  const totalBookings = confirmedBookings.length;

  const averageRevenue =
    totalBookings > 0
      ? totalRevenue / totalBookings
      : 0;

  /* -----------------------------------------------------------
     REVENUE REPORT
  ----------------------------------------------------------- */

  const revenueBreakdown = useMemo(() => {
    const map: Record<string, number> = {};

    confirmedBookings.forEach((booking: any) => {
      const rawDate =
        booking.createdAt ||
        booking.updatedAt ||
        booking.startTime;

      if (!rawDate) return;

      const date = new Date(rawDate);

      if (Number.isNaN(date.getTime())) return;

      let key = "";

      if (revenueView === "DAILY") {
        key = date.toISOString().split("T")[0];
      }

      if (revenueView === "MONTHLY") {
        key = `${date.getFullYear()}-${String(
          date.getMonth() + 1
        ).padStart(2, "0")}`;
      }

      if (revenueView === "YEARLY") {
        key = `${date.getFullYear()}`;
      }

      map[key] =
        (map[key] || 0) +
        Number(booking.totalAmount || 0);
    });

    return Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, amount]) => {
        let label = key;

        const date = new Date(
          `${key}${revenueView === "YEARLY" ? "-01-01" : revenueView === "MONTHLY" ? "-01" : ""}`
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
    ...revenueBreakdown.map(
      (item) => item.amount
    ),
    1
  );

  /* -----------------------------------------------------------
     REVENUE CHART POINTS
  ----------------------------------------------------------- */

  const revenueChartPoints = useMemo(() => {
    if (revenueBreakdown.length === 0) {
      return "";
    }

    const width = 1000;
    const height = 300;

    return revenueBreakdown
      .map((item, index) => {
        const x =
          revenueBreakdown.length === 1
            ? width / 2
            : (index /
                (revenueBreakdown.length - 1)) *
              width;

        const y =
          height -
          (item.amount / maxRevenue) *
            (height - 30) -
          10;

        return `${x},${y}`;
      })
      .join(" ");
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
      const title =
        booking.movieTitle || "Unknown Movie";

      if (!movieMap[title]) {
        movieMap[title] = {
          title,
          count: 0,
          revenue: 0,
        };
      }

      movieMap[title].count +=
        booking.tickets?.length || 1;

      movieMap[title].revenue += Number(
        booking.totalAmount || 0
      );
    });

    return Object.values(movieMap).sort(
      (a, b) => b.count - a.count
    );
  }, [confirmedBookings]);

  const maxTicketCount =
    popularMoviesList[0]?.count || 1;

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
      const hall =
        booking.hallName || "Main Auditorium";

      const cinema =
        booking.cinemaName || "Cinema Branch";

      const key = `${cinema}-${hall}`;

      if (!hallMap[key]) {
        hallMap[key] = {
          hallName: hall,
          cinemaName: cinema,
          count: 0,
          revenue: 0,
        };
      }

      hallMap[key].count +=
        booking.tickets?.length || 1;

      hallMap[key].revenue += Number(
        booking.totalAmount || 0
      );
    });

    return Object.values(hallMap).sort(
      (a, b) => b.count - a.count
    );
  }, [confirmedBookings]);

  const maxHallTickets =
    hallPopularityMap[0]?.count || 1;

  /* -----------------------------------------------------------
     PEAK HOURS
  ----------------------------------------------------------- */

  const peakHoursMap = useMemo(() => {
    const hours: Record<string, number> = {
      "Morning": 0,
      "Afternoon": 0,
      "Prime Evening": 0,
      "Night": 0,
    };

    confirmedBookings.forEach((booking) => {
      if (!booking.startTime) return;

      const date = new Date(
        booking.startTime
      );

      if (Number.isNaN(date.getTime())) return;

      const hour = date.getHours();

      const tickets =
        booking.tickets?.length || 1;

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
      {
        slot: "Morning",
        time: "10 AM - 1 PM",
        count: hours["Morning"],
      },
      {
        slot: "Afternoon",
        time: "1 PM - 5 PM",
        count: hours["Afternoon"],
      },
      {
        slot: "Prime Evening",
        time: "5 PM - 9 PM",
        count: hours["Prime Evening"],
      },
      {
        slot: "Night",
        time: "9 PM - 12 AM",
        count: hours["Night"],
      },
    ];
  }, [confirmedBookings]);

  const maxPeakCount = Math.max(
    ...peakHoursMap.map((item) => item.count),
    1
  );

  const busiestPeriod = [...peakHoursMap].sort(
    (a, b) => b.count - a.count
  )[0];

  /* -----------------------------------------------------------
     LOADING
  ----------------------------------------------------------- */

  if (loading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center bg-slate-950">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-red-500" />

          <p className="text-xs text-slate-500">
            Loading analytics...
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

        <div className="border-b border-slate-800 pb-5">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-500/10">
              <Activity className="h-5 w-5 text-red-500" />
            </div>

            <h1 className="text-2xl font-black text-white">
              Analytics & Reports
            </h1>
          </div>

          <p className="mt-1 text-sm text-slate-500">
            Detailed revenue, ticket sales, cinema utilization,
            peak hours and movie performance.
          </p>
        </div>

        {/* STATISTICS */}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Revenue
              </span>

              <DollarSign className="h-5 w-5 text-emerald-400" />
            </div>

            <p className="mt-3 text-2xl font-black text-emerald-400">
              ${totalRevenue.toFixed(2)}
            </p>

            <p className="mt-2 text-[10px] text-slate-600">
              Confirmed + checked-in bookings
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Tickets
              </span>

              <Ticket className="h-5 w-5 text-red-400" />
            </div>

            <p className="mt-3 text-2xl font-black text-white">
              {totalTicketsSold}
            </p>

            <p className="mt-2 text-[10px] text-slate-600">
              Total tickets sold
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Avg. Booking
              </span>

              <TrendingUp className="h-5 w-5 text-blue-400" />
            </div>

            <p className="mt-3 text-2xl font-black text-white">
              ${averageRevenue.toFixed(2)}
            </p>

            <p className="mt-2 text-[10px] text-slate-600">
              Revenue per booking
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Peak Period
              </span>

              <Clock className="h-5 w-5 text-amber-400" />
            </div>

            <p className="mt-3 text-xl font-black text-white">
              {busiestPeriod?.slot || "N/A"}
            </p>

            <p className="mt-2 text-[10px] text-slate-600">
              {busiestPeriod?.count || 0} tickets
            </p>
          </div>
        </div>

        {/* REVENUE REPORT */}

        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 sm:p-6">

          <div className="flex flex-col gap-4 border-b border-slate-800 pb-5 sm:flex-row sm:items-center sm:justify-between">

            <div>
              <h2 className="text-base font-black text-white">
                Revenue Reports
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                Compare your box office revenue over different periods.
              </p>
            </div>

            <div className="flex rounded-xl border border-slate-800 bg-slate-950 p-1">
              {(
                ["DAILY", "MONTHLY", "YEARLY"] as RevenueView[]
              ).map((view) => (
                <button
                  key={view}
                  onClick={() =>
                    setRevenueView(view)
                  }
                  className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                    revenueView === view
                      ? "bg-red-600 text-white"
                      : "text-slate-500 hover:text-white"
                  }`}
                >
                  {view}
                </button>
              ))}
            </div>
          </div>

          {revenueBreakdown.length > 0 ? (
            <>
              <div className="mt-6 h-[300px]">

                <svg
                  viewBox="0 0 1000 300"
                  preserveAspectRatio="none"
                  className="h-full w-full"
                >
                  <defs>
                    <linearGradient
                      id="analyticsRevenueGradient"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="0%"
                        stopColor="#10b981"
                        stopOpacity="0.30"
                      />

                      <stop
                        offset="100%"
                        stopColor="#10b981"
                        stopOpacity="0"
                      />
                    </linearGradient>
                  </defs>

                  {/* GRID */}

                  {[0, 1, 2, 3, 4].map(
                    (line) => {
                      const y =
                        10 +
                        line * 70;

                      return (
                        <line
                          key={line}
                          x1="0"
                          y1={y}
                          x2="1000"
                          y2={y}
                          stroke="#1e293b"
                          strokeWidth="1"
                        />
                      );
                    }
                  )}

                  {/* AREA */}

                  <polygon
                    points={`0,300 ${revenueChartPoints} 1000,300`}
                    fill="url(#analyticsRevenueGradient)"
                  />

                  {/* LINE */}

                  <polyline
                    points={revenueChartPoints}
                    fill="none"
                    stroke="#10b981"
                    strokeWidth="4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />

                  {/* POINTS */}

                  {revenueBreakdown.map(
                    (item, index) => {
                      const x =
                        revenueBreakdown.length === 1
                          ? 500
                          : (index /
                              (revenueBreakdown.length -
                                1)) *
                            1000;

                      const y =
                        300 -
                        (item.amount /
                          maxRevenue) *
                          270 -
                        10;

                      return (
                        <circle
                          key={item.key}
                          cx={x}
                          cy={y}
                          r="5"
                          fill="#0f172a"
                          stroke="#10b981"
                          strokeWidth="3"
                        />
                      );
                    }
                  )}
                </svg>
              </div>

              <div className="mt-3 flex justify-between text-[10px] text-slate-600">
                {revenueBreakdown
                  .filter(
                    (_, index) =>
                      index === 0 ||
                      index ===
                        revenueBreakdown.length - 1 ||
                      index %
                        Math.max(
                          1,
                          Math.floor(
                            revenueBreakdown.length /
                              6
                          )
                        ) ===
                        0
                  )
                  .map((item) => (
                    <span key={item.key}>
                      {item.label}
                    </span>
                  ))}
              </div>
            </>
          ) : (
            <div className="flex h-[300px] items-center justify-center text-xs text-slate-600">
              No revenue data available.
            </div>
          )}
        </div>

        {/* PEAK HOURS + HALLS */}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">

          {/* PEAK HOURS */}

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 sm:p-6">

            <div className="border-b border-slate-800 pb-4">
              <h2 className="text-base font-black text-white">
                Peak Hours
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                When customers are booking the most tickets.
              </p>
            </div>

            <div className="mt-5 space-y-4">
              {peakHoursMap.map((peak) => {
                const percentage = Math.round(
                  (peak.count /
                    maxPeakCount) *
                    100
                );

                const isPeak =
                  peak.slot ===
                  busiestPeriod?.slot;

                return (
                  <div key={peak.slot}>
                    <div className="mb-2 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Clock
                          className={`h-4 w-4 ${
                            isPeak
                              ? "text-amber-400"
                              : "text-slate-600"
                          }`}
                        />

                        <div>
                          <p className="text-xs font-bold text-white">
                            {peak.slot}
                          </p>

                          <p className="text-[10px] text-slate-600">
                            {peak.time}
                          </p>
                        </div>
                      </div>

                      <span className="text-xs font-bold text-white">
                        {peak.count}
                      </span>
                    </div>

                    <div className="h-2 overflow-hidden rounded-full bg-slate-800">
                      <div
                        className={`h-full rounded-full transition-all ${
                          isPeak
                            ? "bg-amber-400"
                            : "bg-slate-600"
                        }`}
                        style={{
                          width: `${Math.max(
                            percentage,
                            peak.count > 0
                              ? 5
                              : 0
                          )}%`,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* HALL UTILIZATION */}

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 sm:p-6">

            <div className="border-b border-slate-800 pb-4">
              <h2 className="text-base font-black text-white">
                Hall Utilization
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                Ticket volume by cinema auditorium.
              </p>
            </div>

            <div className="mt-5 space-y-4">
              {hallPopularityMap
                .slice(0, 6)
                .map((hall) => {
                  const percentage = Math.round(
                    (hall.count /
                      maxHallTickets) *
                      100
                  );

                  return (
                    <div
                      key={`${hall.cinemaName}-${hall.hallName}`}
                    >
                      <div className="mb-2 flex items-center justify-between">
                        <div className="flex min-w-0 items-center gap-2">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-500/10">
                            <Tv className="h-4 w-4 text-blue-400" />
                          </div>

                          <div className="min-w-0">
                            <p className="truncate text-xs font-bold text-white">
                              {hall.hallName}
                            </p>

                            <p className="truncate text-[10px] text-slate-600">
                              {hall.cinemaName}
                            </p>
                          </div>
                        </div>

                        <div className="ml-3 text-right">
                          <p className="text-xs font-bold text-white">
                            {hall.count}
                          </p>

                          <p className="text-[10px] text-emerald-400">
                            ${hall.revenue.toFixed(0)}
                          </p>
                        </div>
                      </div>

                      <div className="h-1.5 overflow-hidden rounded-full bg-slate-800">
                        <div
                          className="h-full rounded-full bg-blue-500 transition-all"
                          style={{
                            width: `${Math.max(
                              percentage,
                              5
                            )}%`,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}

              {hallPopularityMap.length === 0 && (
                <div className="py-10 text-center text-xs text-slate-600">
                  No hall utilization data.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* MOVIE RANKING */}

        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 sm:p-6">

          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div>
              <h2 className="text-base font-black text-white">
                Movie Performance
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                Complete movie ticket sales ranking.
              </p>
            </div>

            <Film className="h-5 w-5 text-slate-600" />
          </div>

          <div className="mt-5 overflow-x-auto">
            <div className="min-w-[650px]">

              <div className="grid grid-cols-[50px_1fr_120px_140px] gap-4 border-b border-slate-800 px-3 pb-3 text-[10px] font-bold uppercase tracking-wider text-slate-600">
                <span>#</span>
                <span>Movie</span>
                <span>Tickets</span>
                <span>Revenue</span>
              </div>

              <div className="divide-y divide-slate-800/70">
                {popularMoviesList.map(
                  (movie, index) => {
                    const percentage =
                      Math.round(
                        (movie.count /
                          maxTicketCount) *
                          100
                      );

                    return (
                      <div
                        key={movie.title}
                        className="grid grid-cols-[50px_1fr_120px_140px] items-center gap-4 px-3 py-4"
                      >
                        <span className="text-xs font-black text-slate-600">
                          #{index + 1}
                        </span>

                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold text-white">
                            {movie.title}
                          </p>

                          <div className="mt-2 h-1.5 max-w-[300px] overflow-hidden rounded-full bg-slate-800">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-red-600 to-orange-400"
                              style={{
                                width: `${Math.max(
                                  percentage,
                                  5
                                )}%`,
                              }}
                            />
                          </div>
                        </div>

                        <span className="text-xs font-bold text-slate-300">
                          {movie.count}
                        </span>

                        <span className="text-xs font-bold text-emerald-400">
                          ${movie.revenue.toFixed(2)}
                        </span>
                      </div>
                    );
                  }
                )}
              </div>

              {popularMoviesList.length === 0 && (
                <div className="py-12 text-center text-xs text-slate-600">
                  No movie sales data available.
                </div>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}