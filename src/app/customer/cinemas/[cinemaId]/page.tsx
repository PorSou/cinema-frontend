"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  MapPin,
  Phone,
  Building2,
  Loader2,
  ChevronLeft,
  Film,
  Calendar,
  Tv,
} from "lucide-react";

import CinemaService from "@/app/service/cinema.service";
import ShowtimeService from "@/app/service/showtime.service";
import MovieService from "@/app/service/movie.service";

import {
  CinemaResponse,
  ShowtimeResponse,
  MovieResponse,
} from "@/app/types/api.types";

import Toast from "@/app/components/Toast";
import { useSettings, Language } from "@/app/context/SettingsContext";

const SHOWTIME_FETCH_SIZE = 500;

const PAGE_TEXT: Record<
  Language,
  {
    allCinemas: string;
    cinemaNotFound: string;
    cinemasLocations: string;
    failedLoad: string;
    allDates: string;
    noShowtimes: string;
    noShowtimesDate: string;
    checkBack: string;
    differentDate: string;
    seats: string;
    halls: string;
    minutes: string;
    viewMovie: string;
  }
> = {
  en: {
    allCinemas: "All Cinemas",
    cinemaNotFound: "Cinema branch not found.",
    cinemasLocations: "All Cinemas",
    failedLoad: "Failed to load showtimes for this branch.",
    allDates: "All Dates",
    noShowtimes: "No showtimes scheduled at this branch",
    noShowtimesDate: "No showtimes scheduled at this branch for this date",
    checkBack: "Check back soon or try a different date.",
    differentDate: "Check back soon or try a different date.",
    seats: "Seats",
    halls: "Halls",
    minutes: "m",
    viewMovie: "View Movie",
  },

  km: {
    allCinemas: "រោងកុនទាំងអស់",
    cinemaNotFound: "រកមិនឃើញសាខារោងកុនទេ។",
    cinemasLocations: "រោងកុនទាំងអស់",
    failedLoad: "មិនអាចផ្ទុកម៉ោងបញ្ចាំងសម្រាប់សាខានេះបានទេ។",
    allDates: "គ្រប់កាលបរិច្ឆេទ",
    noShowtimes: "មិនមានម៉ោងបញ្ចាំងនៅសាខានេះទេ",
    noShowtimesDate: "មិនមានម៉ោងបញ្ចាំងនៅសាខានេះសម្រាប់កាលបរិច្ឆេទនេះទេ",
    checkBack: "សូមពិនិត្យម្តងទៀតនៅពេលក្រោយ ឬសាកល្បងកាលបរិច្ឆេទផ្សេង។",
    differentDate: "សូមសាកល្បងកាលបរិច្ឆេទផ្សេង។",
    seats: "កៅអី",
    halls: "សាលា",
    minutes: "នាទី",
    viewMovie: "មើលភាពយន្ត",
  },

  zh: {
    allCinemas: "所有影院",
    cinemaNotFound: "找不到该影院分店。",
    cinemasLocations: "所有影院",
    failedLoad: "无法加载该影院分店的放映时间。",
    allDates: "所有日期",
    noShowtimes: "该影院分店暂无放映时间",
    noShowtimesDate: "该影院分店在此日期暂无放映时间",
    checkBack: "请稍后再试，或选择其他日期。",
    differentDate: "请尝试其他日期。",
    seats: "座位",
    halls: "影厅",
    minutes: "分钟",
    viewMovie: "查看电影",
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

const formatShowDateTime = (
  raw?: string,
  language: Language = "en"
): { time: string; date: string } => {
  if (!raw) {
    return {
      time: "--:--",
      date: "",
    };
  }

  const iso = raw.includes("T") ? raw : raw.replace(" ", "T");

  const d = new Date(iso);

  if (isNaN(d.getTime())) {
    return {
      time: raw,
      date: "",
    };
  }

  const localeMap: Record<Language, string> = {
    en: "en-US",
    km: "km-KH",
    zh: "zh-CN",
  };

  const locale = localeMap[language];

  const time = d.toLocaleTimeString(locale, {
    hour: "numeric",
    minute: "2-digit",
    hour12: language === "en",
  });

  const date = d.toLocaleDateString(locale, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

  return {
    time,
    date,
  };
};

export default function CustomerCinemaDetailPage() {
  const params = useParams();
  const router = useRouter();

  const cinemaId = params?.cinemaId as string;

  const { theme, language } = useSettings();

  const isDark = theme === "dark";
  const text = PAGE_TEXT[language] ?? PAGE_TEXT.en;

  const [cinema, setCinema] = useState<CinemaResponse | null>(null);
  const [showtimes, setShowtimes] = useState<ShowtimeResponse[]>([]);

  const [loading, setLoading] = useState(true);

  const [selectedDate, setSelectedDate] = useState<string>("");

  const [posterMap, setPosterMap] = useState<Map<number, string>>(
    new Map()
  );

  const [brokenPosterIds, setBrokenPosterIds] = useState<Set<number>>(
    new Set()
  );

  const [toast, setToast] = useState<{
    message: string | null;
    type: "success" | "error" | "info";
  }>({
    message: null,
    type: "success",
  });

  useEffect(() => {
    if (!cinemaId) return;

    async function loadCinemaAndShowtimes() {
      setLoading(true);

      try {
        const [cinemaRes, showtimeRes] = await Promise.all([
          CinemaService.getAllCinemas(),
          ShowtimeService.getAllShowtimes(
            0,
            SHOWTIME_FETCH_SIZE
          ),
        ]);

        const allCinemas =
          extractArray<CinemaResponse>(cinemaRes);

        const match = allCinemas.find(
          (c) => String(c.id) === String(cinemaId)
        );

        setCinema(match || null);

        const allShowtimes =
          extractArray<ShowtimeResponse>(showtimeRes);

        const branchShowtimes = allShowtimes.filter(
          (s) =>
            String(s.cinemaId) === String(cinemaId)
        );

        setShowtimes(branchShowtimes);

        let allMovies: MovieResponse[] = [];

        let page = 0;
        let totalPages = 1;

        do {
          const moviesRes =
            await MovieService.getAllMovies({
              page,
              size: 50,
            });

          allMovies = [
            ...allMovies,
            ...extractArray<MovieResponse>(moviesRes),
          ];

          totalPages =
            (moviesRes as any)?.totalPages || 1;

          page++;
        } while (page < totalPages);

        const map = new Map<number, string>();

        allMovies.forEach((movie) => {
          if (movie.posterUrl) {
            map.set(movie.id, movie.posterUrl);
          }
        });

        setPosterMap(map);
      } catch (error) {
        console.error(error);

        setToast({
          message: text.failedLoad,
          type: "error",
        });
      } finally {
        setLoading(false);
      }
    }

    loadCinemaAndShowtimes();
  }, [cinemaId, text.failedLoad]);

  const availableDates = useMemo(() => {
    const dates = new Set(
      showtimes
        .filter((s) => s.startTime)
        .map((s) =>
          s.startTime!
            .replace("T", " ")
            .split(" ")[0]
        )
    );

    return Array.from(dates).sort();
  }, [showtimes]);

  const filteredShowtimes = useMemo(() => {
    if (!selectedDate) {
      return showtimes;
    }

    return showtimes.filter(
      (s) =>
        s.startTime
          ?.replace("T", " ")
          .split(" ")[0] === selectedDate
    );
  }, [showtimes, selectedDate]);

  const groupedByMovie = useMemo(() => {
    const map = new Map<
      string,
      {
        movieId: number;
        movieTitle: string;
        movieDurationMinutes?: number;
        slots: ShowtimeResponse[];
      }
    >();

    filteredShowtimes.forEach((s) => {
      const key = String(s.movieId);

      if (!map.has(key)) {
        map.set(key, {
          movieId: s.movieId,
          movieTitle: s.movieTitle,
          movieDurationMinutes:
            s.movieDurationMinutes,
          slots: [],
        });
      }

      map.get(key)!.slots.push(s);
    });

    return Array.from(map.values());
  }, [filteredShowtimes]);

  if (loading) {
    return (
      <div
        className={`flex min-h-screen items-center justify-center ${
          isDark
            ? "bg-[#0B0C10]"
            : "bg-slate-50"
        }`}
      >
        <Loader2
          className="h-8 w-8 animate-spin text-red-600"
        />
      </div>
    );
  }

  if (!cinema) {
    return (
      <div
        className={`flex min-h-screen flex-col items-center justify-center px-4 text-center ${
          isDark
            ? "bg-[#0B0C10] text-slate-100"
            : "bg-slate-50 text-slate-900"
        }`}
      >
        <Building2
          className={`h-10 w-10 ${
            isDark
              ? "text-slate-600"
              : "text-slate-400"
          }`}
        />

        <p
          className={`mt-3 text-sm font-bold ${
            isDark
              ? "text-white"
              : "text-slate-900"
          }`}
        >
          {text.cinemaNotFound}
        </p>

        <Link
          href="/customer/cinemas"
          className="mt-3 text-xs font-bold text-red-500 transition hover:text-red-400"
        >
          ← {text.allCinemas}
        </Link>
      </div>
    );
  }

  return (
    <div
      className={`min-h-screen transition-colors duration-300 ${
        isDark
          ? "bg-[#0B0C10] text-slate-100"
          : "bg-slate-50 text-slate-900"
      }`}
    >
      {/* Hide Scrollbar Style */}
      <style jsx global>{`
        ::-webkit-scrollbar {
          display: none;
        }
        html, body {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>

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

      <div className="mx-auto max-w-7xl space-y-8 px-4 py-10 sm:px-8">

        {/* Back */}
        <button
          type="button"
          onClick={() =>
            router.push("/customer/cinemas")
          }
          className={`flex cursor-pointer items-center gap-1.5 text-xs font-bold transition ${
            isDark
              ? "text-slate-400 hover:text-white"
              : "text-slate-500 hover:text-slate-950"
          }`}
        >
          <ChevronLeft className="h-4 w-4" />

          {text.allCinemas}
        </button>

        {/* Cinema Header */}
        <div
          className={`space-y-4 rounded-3xl border p-6 shadow-xl transition sm:p-8 ${
            isDark
              ? "border-slate-800 bg-slate-900/60"
              : "border-slate-200 bg-white"
          }`}
        >
          <div className="flex items-start gap-4">
            <div
              className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border text-red-400 ${
                isDark
                  ? "border-red-500/20 bg-gradient-to-br from-red-500/20 to-rose-500/5"
                  : "border-red-100 bg-red-50"
              }`}
            >
              <Building2 className="h-7 w-7" />
            </div>

            <div className="space-y-1.5">
              <h1
                className={`text-2xl font-black sm:text-3xl ${
                  isDark
                    ? "text-white"
                    : "text-slate-950"
                }`}
              >
                {cinema.name}
              </h1>

              <span
                className={`inline-block rounded-md border px-2 py-0.5 text-[10px] font-semibold ${
                  isDark
                    ? "border-slate-700/80 bg-slate-800/80 text-slate-300"
                    : "border-slate-200 bg-slate-100 text-slate-600"
                }`}
              >
                {cinema.city}
              </span>
            </div>
          </div>

          <div
            className={`flex flex-col gap-3 border-t pt-4 text-xs sm:flex-row sm:items-center sm:gap-8 ${
              isDark
                ? "border-slate-800 text-slate-400"
                : "border-slate-200 text-slate-500"
            }`}
          >
            <div className="flex items-start gap-2">
              <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-500" />

              <span>{cinema.address}</span>
            </div>

            <div className="flex items-center gap-2">
              <Phone className="h-3.5 w-3.5 shrink-0 text-red-500" />

              <span
                className={`font-mono ${
                  isDark
                    ? "text-slate-300"
                    : "text-slate-700"
                }`}
              >
                {cinema.phone}
              </span>
            </div>
          </div>
        </div>

        {/* Date Filters */}
        {availableDates.length > 0 && (
          <div className="flex items-center gap-2 overflow-x-auto pb-2">
            <button
              type="button"
              onClick={() => setSelectedDate("")}
              className={`flex shrink-0 cursor-pointer items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold transition ${
                selectedDate === ""
                  ? "bg-red-600 text-white shadow-lg shadow-red-600/30"
                  : isDark
                    ? "border border-slate-800 bg-slate-900 text-slate-400 hover:text-white"
                    : "border border-slate-200 bg-white text-slate-500 hover:text-slate-950"
              }`}
            >
              <Calendar className="h-3.5 w-3.5" />

              {text.allDates}
            </button>

            {availableDates.map((date) => (
              <button
                key={date}
                type="button"
                onClick={() =>
                  setSelectedDate(date)
                }
                className={`shrink-0 cursor-pointer rounded-xl px-4 py-2 font-mono text-xs font-bold transition ${
                  selectedDate === date
                    ? "bg-red-600 text-white shadow-lg shadow-red-600/30"
                    : isDark
                      ? "border border-slate-800 bg-slate-900 text-slate-400 hover:text-white"
                      : "border border-slate-200 bg-white text-slate-500 hover:text-slate-950"
                }`}
              >
                {date}
              </button>
            ))}
          </div>
        )}

        {/* Movies */}
        {groupedByMovie.length > 0 ? (
          <div className="space-y-10">
            {groupedByMovie.map((group) => {
              const posterFailed =
                brokenPosterIds.has(
                  group.movieId
                );

              const realPoster =
                posterMap.get(group.movieId);

              const showPoster =
                realPoster && !posterFailed;

              return (
                <div
                  key={group.movieId}
                  className="space-y-4"
                >
                  {/* Movie Header */}
                  <Link
                    href={`/customer/movies/${group.movieId}`}
                    className={`group flex items-center gap-4 border-b pb-4 transition ${
                      isDark
                        ? "border-slate-800"
                        : "border-slate-200"
                    }`}
                  >
                    <div
                      className={`relative h-20 w-14 shrink-0 overflow-hidden rounded-xl border shadow-lg ${
                        isDark
                          ? "border-slate-800 bg-slate-900"
                          : "border-slate-200 bg-white"
                      }`}
                    >
                      {showPoster ? (
                        <img
                          src={realPoster}
                          alt={group.movieTitle}
                          className="h-full w-full object-cover"
                          onError={() =>
                            setBrokenPosterIds(
                              (prev) => {
                                const next =
                                  new Set(prev);

                                next.add(
                                  group.movieId
                                );

                                return next;
                              }
                            )
                          }
                        />
                      ) : (
                        <div
                          className={`flex h-full w-full items-center justify-center ${
                            isDark
                              ? "text-slate-700"
                              : "text-slate-300"
                          }`}
                        >
                          <Film className="h-5 w-5" />
                        </div>
                      )}
                    </div>

                    <div>
                      <h3
                        className={`text-lg font-black transition ${
                          isDark
                            ? "text-white group-hover:text-red-400"
                            : "text-slate-950 group-hover:text-red-500"
                        }`}
                      >
                        {group.movieTitle}
                      </h3>

                      {group.movieDurationMinutes && (
                        <span
                          className={`font-mono text-[11px] ${
                            isDark
                              ? "text-slate-500"
                              : "text-slate-400"
                          }`}
                        >
                          {group.movieDurationMinutes}
                          {text.minutes}
                        </span>
                      )}
                    </div>
                  </Link>

                  {/* Showtime Cards */}
                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
                    {group.slots.map((s) => {
                      const { time, date } =
                        formatShowDateTime(
                          s.startTime,
                          language
                        );

                      return (
                        <div
                          key={s.id}
                          className="group relative flex overflow-hidden rounded-2xl shadow-xl"
                        >
                          {/* Main Ticket */}
                          <div
                            className={`flex-1 space-y-3 rounded-l-2xl border p-5 transition ${
                              isDark
                                ? "border-slate-800 bg-gradient-to-br from-slate-900 to-slate-900/70 group-hover:border-red-500/50"
                                : "border-slate-200 bg-white group-hover:border-red-300"
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span
                                className={`flex items-center gap-1.5 text-xs font-bold ${
                                  isDark
                                    ? "text-white"
                                    : "text-slate-900"
                                }`}
                              >
                                <Tv
                                  className={`h-3.5 w-3.5 ${
                                    isDark
                                      ? "text-slate-400"
                                      : "text-slate-500"
                                  }`}
                                />

                                {s.hallName}
                              </span>

                              <span
                                className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${
                                  isDark
                                    ? "border-red-500/20 bg-red-600/10 text-red-400"
                                    : "border-red-200 bg-red-50 text-red-500"
                                }`}
                              >
                                {s.hallType?.replace(
                                  "_",
                                  " "
                                )}
                              </span>
                            </div>

                            <div>
                              <div
                                className={`font-mono text-3xl font-black leading-none transition ${
                                  isDark
                                    ? "text-white group-hover:text-red-400"
                                    : "text-slate-950 group-hover:text-red-500"
                                }`}
                              >
                                {time}
                              </div>

                              <div
                                className={`mt-1 text-[11px] font-semibold uppercase tracking-wide ${
                                  isDark
                                    ? "text-slate-500"
                                    : "text-slate-400"
                                }`}
                              >
                                {date}
                              </div>
                            </div>
                          </div>

                          {/* Tear Line */}
                          <div className="relative w-0">
                            <div
                              className={`absolute -left-2.5 -top-2.5 h-5 w-5 rounded-full ${
                                isDark
                                  ? "bg-[#0B0C10]"
                                  : "bg-slate-50"
                              }`}
                            />

                            <div
                              className={`absolute -bottom-2.5 -left-2.5 h-5 w-5 rounded-full ${
                                isDark
                                  ? "bg-[#0B0C10]"
                                  : "bg-slate-50"
                              }`}
                            />

                            <div
                              className={`absolute bottom-1 left-0 top-1 border-l-2 border-dashed ${
                                isDark
                                  ? "border-slate-700"
                                  : "border-slate-300"
                              }`}
                            />
                          </div>

                          {/* Ticket CTA */}
                          <div
                            className={`flex w-[104px] shrink-0 flex-col items-center justify-center gap-2.5 rounded-r-2xl border border-l-0 p-3 transition ${
                              isDark
                                ? "border-slate-800 bg-slate-950 group-hover:border-red-500/50"
                                : "border-slate-200 bg-slate-100 group-hover:border-red-300"
                            }`}
                          >
                            <button
                              type="button"
                              onClick={() =>
                                router.push(
                                  `/customer/booking/${s.id}`
                                )
                              }
                              className="w-full cursor-pointer rounded-lg bg-gradient-to-r from-red-600 to-rose-600 py-2 text-[10px] font-bold text-white shadow-md shadow-red-600/30 transition hover:from-red-500 hover:to-rose-500"
                            >
                              {text.seats}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Empty State */
          <div
            className={`flex min-h-[30vh] flex-col items-center justify-center space-y-2 rounded-3xl border p-8 text-center text-sm ${
              isDark
                ? "border-slate-800 bg-slate-900/30 text-slate-400"
                : "border-slate-200 bg-white text-slate-500"
            }`}
          >
            <Film
              className={`mb-1 h-10 w-10 ${
                isDark
                  ? "text-slate-600"
                  : "text-slate-300"
              }`}
            />

            <p
              className={`font-semibold ${
                isDark
                  ? "text-slate-300"
                  : "text-slate-700"
              }`}
            >
              {selectedDate
                ? text.noShowtimesDate
                : text.noShowtimes}
            </p>

            <p
              className={`text-xs ${
                isDark
                  ? "text-slate-500"
                  : "text-slate-400"
              }`}
            >
              {text.checkBack}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}