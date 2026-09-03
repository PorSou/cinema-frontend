"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Film,
  Calendar,
  Clock,
  Languages,
  ArrowLeft,
  Loader2,
  Building,
  Tv,
  Play,
  Ticket,
  Star,
  Share2,
} from "lucide-react";
import MovieService from "@/app/service/movie.service";
import ShowtimeService from "@/app/service/showtime.service";
import {
  MovieResponse,
  MovieLanguage,
  ShowtimeResponse,
} from "@/app/types/api.types";
import Toast from "@/app/components/Toast";
import { useSettings } from "@/app/context/SettingsContext";

const LANGUAGE_LABELS: Record<MovieLanguage, string> = {
  KHMER: "🇰🇭 Khmer",
  ENGLISH: "🇺🇸 English",
  CHINESE: "🇨🇳 Chinese",
};

const getYouTubeEmbedUrl = (url?: string): string | null => {
  if (!url) return null;

  if (
    url === "https://www.youtube.com/" ||
    url === "https://youtube.com" ||
    url.endsWith("youtube.com/")
  ) {
    return null;
  }

  if (url.includes("/embed/") && url.split("/embed/")[1]?.length >= 11) {
    return url;
  }

  const shortsMatch = url.match(
    /youtube\.com\/shorts\/([\w-]{11})/
  );

  if (shortsMatch && shortsMatch[1]) {
    return `https://www.youtube.com/embed/${shortsMatch[1]}`;
  }

  const match = url.match(
    /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/
  );

  if (match && match[1]) {
    return `https://www.youtube.com/embed/${match[1]}`;
  }

  return null;
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
  raw?: string
): { time: string; date: string } => {
  if (!raw) {
    return {
      time: "--:--",
      date: "",
    };
  }

  const iso = raw.includes("T")
    ? raw
    : raw.replace(" ", "T");

  const d = new Date(iso);

  if (isNaN(d.getTime())) {
    return {
      time: raw,
      date: "",
    };
  }

  const time = d.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  const date = d.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

  return {
    time,
    date,
  };
};

export default function CustomerMovieDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const movieId = Number(id);
  const router = useRouter();

  const { theme, language } = useSettings();

  const isDark = theme === "dark";

  const [movie, setMovie] = useState<MovieResponse | null>(null);
  const [showtimes, setShowtimes] = useState<ShowtimeResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCinemaId, setSelectedCinemaId] =
    useState<number | null>(null);

  const [toast, setToast] = useState<{
    message: string | null;
    type: "success" | "error" | "info";
  }>({
    message: null,
    type: "success",
  });

  /*
   * ============================================================
   * LANGUAGE HELPER
   * ============================================================
   */

  const t = (
    en: string,
    km: string,
    zh: string
  ) => {
    const currentLanguage = String(
      language || "en"
    ).toLowerCase();

    if (
      currentLanguage === "km" ||
      currentLanguage === "kh" ||
      currentLanguage === "khmer"
    ) {
      return km;
    }

    if (
      currentLanguage === "zh" ||
      currentLanguage === "cn" ||
      currentLanguage === "chinese"
    ) {
      return zh;
    }

    return en;
  };

  /*
   * ============================================================
   * FETCH MOVIE DETAILS
   * ============================================================
   */

  useEffect(() => {
    async function fetchMovieDetails() {
      if (!movieId) return;

      try {
        const [movieRes, showtimeRes] = await Promise.all([
          MovieService.getMovieById(movieId),
          ShowtimeService.getShowtimesByMovie(movieId).catch(
            () => []
          ),
        ]);

        setMovie(movieRes);

        const activeShowtimes =
          extractArray<ShowtimeResponse>(
            showtimeRes
          );

        setShowtimes(activeShowtimes);

        if (activeShowtimes.length > 0) {
          setSelectedCinemaId(
            activeShowtimes[0].cinemaId
          );
        }
      } catch {
        setToast({
          message: t(
            "Failed to load movie details or showtimes.",
            "មិនអាចផ្ទុកព័ត៌មានភាពយន្ត ឬម៉ោងបញ្ចាំងបានទេ។",
            "无法加载电影详情或放映时间。"
          ),
          type: "error",
        });
      } finally {
        setLoading(false);
      }
    }

    fetchMovieDetails();
  }, [movieId]);

  /*
   * ============================================================
   * LOADING
   * ============================================================
   */

  if (loading) {
    return (
      <div
        className={`flex min-h-screen items-center justify-center ${
          isDark
            ? "bg-slate-950"
            : "bg-slate-50"
        }`}
      >
        <Loader2 className="h-8 w-8 animate-spin text-red-600" />
      </div>
    );
  }

  /*
   * ============================================================
   * MOVIE NOT FOUND
   * ============================================================
   */

  if (!movie) {
    return (
      <div
        className={`flex min-h-screen flex-col items-center justify-center p-6 text-center ${
          isDark
            ? "bg-slate-950 text-slate-400"
            : "bg-slate-50 text-slate-500"
        }`}
      >
        <Film className="mb-3 h-12 w-12 text-slate-500" />

        <h2
          className={`text-xl font-bold ${
            isDark
              ? "text-white"
              : "text-slate-900"
          }`}
        >
          {t(
            "Movie Not Found",
            "រកមិនឃើញភាពយន្ត",
            "未找到电影"
          )}
        </h2>

        <p className="mt-1 text-xs text-slate-500">
          {t(
            "The requested film listing does not exist.",
            "ព័ត៌មានភាពយន្តដែលអ្នកស្នើសុំមិនមានទេ។",
            "您请求的电影不存在。"
          )}
        </p>

        <Link
          href="/"
          className="mt-4 flex cursor-pointer items-center gap-2 rounded-xl bg-red-600 px-5 py-2.5 text-xs font-bold text-white transition hover:bg-red-500"
        >
          <ArrowLeft className="h-4 w-4" />

          <span>
            {t(
              "Back to Catalog",
              "ត្រឡប់ទៅបញ្ជីភាពយន្ត",
              "返回电影目录"
            )}
          </span>
        </Link>
      </div>
    );
  }

  /*
   * ============================================================
   * TRAILER
   * ============================================================
   */

  const rawTrailerUrl =
    movie.trailerUrl ||
    (movie as any).trailer ||
    (movie as any).youtubeUrl ||
    (movie as any).videoUrl;

  const embedTrailerUrl =
    getYouTubeEmbedUrl(rawTrailerUrl);

  /*
   * ============================================================
   * CINEMAS & COMING SOON CHECK
   * ============================================================
   */

  const isComingSoon = movie.status === "COMING_SOON";

  const cinemaBranches = Array.from(
    new Map(
      showtimes.map((st) => [
        st.cinemaId,
        {
          id: st.cinemaId,
          name: st.cinemaName,
          city: st.cinemaCity,
        },
      ])
    ).values()
  );

  const filteredShowtimes =
    showtimes.filter(
      (st) =>
        st.cinemaId === selectedCinemaId
    );

  return (
    <div
      className={`min-h-screen pb-24 transition-colors duration-300 ${
        isDark
          ? "bg-[#0B0C10] text-slate-100"
          : "bg-slate-50 text-slate-900"
      }`}
    >
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

      {/* =========================================================
          HERO
      ========================================================= */}

      <div
        className={`relative w-full overflow-hidden border-b ${
          isDark
            ? "border-slate-800/60"
            : "border-slate-200"
        }`}
      >
        <div className="absolute inset-0">
          <div
            className="absolute inset-0 scale-110 bg-cover bg-center opacity-25 blur-2xl"
            style={{
              backgroundImage: `url(${movie.posterUrl || ""})`,
            }}
          />

          <div
            className={`absolute inset-0 ${
              isDark
                ? "bg-gradient-to-b from-[#0B0C10]/40 via-[#0B0C10]/85 to-[#0B0C10]"
                : "bg-gradient-to-b from-white/50 via-slate-50/85 to-slate-50"
            }`}
          />
        </div>

        <div className="relative z-10 mx-auto max-w-7xl px-4 pb-10 pt-8 sm:px-8">
          {/* BACK BUTTON */}

          <Link
            href="/"
            className={`mb-8 inline-flex cursor-pointer items-center gap-2 rounded-xl border px-4 py-2 text-xs font-bold backdrop-blur-md transition ${
              isDark
                ? "border-white/10 bg-black/30 text-slate-200 hover:border-white/20 hover:text-white"
                : "border-slate-200 bg-white/70 text-slate-600 hover:border-slate-300 hover:text-slate-900"
            }`}
          >
            <ArrowLeft className="h-4 w-4" />

            <span>
              {t(
                "All Movies",
                "ភាពយន្តទាំងអស់",
                "全部电影"
              )}
            </span>
          </Link>

          {/* =====================================================
              HERO CONTENT
          ===================================================== */}

          <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-12">
            {/* ===================================================
                POSTER
            =================================================== */}

            <div className="lg:col-span-3">
              <div className="relative mx-auto aspect-[2/3] w-full max-w-[220px] lg:mx-0">
                <div className="absolute -inset-3 rounded-[1.75rem] bg-gradient-to-br from-red-600/40 via-transparent to-amber-400/10 blur-2xl" />

                <div
                  className={`relative h-full w-full overflow-hidden rounded-2xl border-2 shadow-2xl ${
                    isDark
                      ? "border-white/10 bg-slate-950"
                      : "border-slate-200 bg-white"
                  }`}
                >
                  {movie.posterUrl ? (
                    <img
                      src={movie.posterUrl}
                      alt={movie.title}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-slate-500">
                      <Film className="h-12 w-12" />
                    </div>
                  )}
                </div>

                <div className="absolute -left-2.5 -top-2.5 flex rotate-[-4deg] items-center gap-1 rounded-lg bg-gradient-to-r from-red-600 to-rose-600 px-3 py-1.5 text-[10px] font-black text-white shadow-lg shadow-red-600/40">
                  <Star className="h-3 w-3 fill-white" />

                  {movie.status?.replace(
                    "_",
                    " "
                  )}
                </div>
              </div>
            </div>

            {/* ===================================================
                MOVIE INFO & ACTION SPACE
            =================================================== */}

            <div className="space-y-4 pt-1 lg:col-span-4 flex flex-col justify-between h-full">
              <div className="space-y-4">
                <div className="flex items-center gap-2.5">
                  <div className="h-px max-w-[32px] flex-1 bg-gradient-to-r from-transparent to-amber-400/60" />

                  <span className="text-[10px] font-black uppercase tracking-[0.3em] text-amber-400">
                    {isComingSoon
                      ? t("Coming Soon", "នឹងដាក់បញ្ចាំងsoon", "即将上映")
                      : t("Now Screening", "កំពុងបញ្ចាំង", "正在上映")}
                  </span>
                </div>

                <h1
                  className={`text-3xl font-black uppercase leading-[0.95] tracking-tight sm:text-5xl ${
                    isDark
                      ? "text-white"
                      : "text-slate-900"
                  }`}
                >
                  {movie.title}
                </h1>

                <div className="flex flex-wrap items-center gap-2">
                  {movie.ageRating && (
                    <span className="rounded-md border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 font-mono text-[11px] font-bold text-amber-400">
                      {movie.ageRating}
                    </span>
                  )}

                  <span
                    className={`flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs ${
                      isDark
                        ? "border-white/10 bg-white/5 text-slate-300"
                        : "border-slate-200 bg-white text-slate-600"
                    }`}
                  >
                    <Clock className="h-3.5 w-3.5 text-red-400" />

                    {movie.durationMinutes}m
                  </span>

                  <span
                    className={`flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs ${
                      isDark
                        ? "border-white/10 bg-white/5 text-slate-300"
                        : "border-slate-200 bg-white text-slate-600"
                    }`}
                  >
                    <Languages className="h-3.5 w-3.5 text-red-400" />

                    {LANGUAGE_LABELS[
                      movie.language
                    ] || movie.language}
                  </span>

                  {movie.genres?.map((g) => (
                    <span
                      key={g.id}
                      className={`rounded-md border px-2.5 py-1 text-xs font-semibold ${
                        isDark
                          ? "border-white/10 bg-white/5 text-slate-300"
                          : "border-slate-200 bg-white text-slate-600"
                      }`}
                    >
                      {g.name}
                    </span>
                  ))}
                </div>

                <p
                  className={`pt-1 text-sm leading-relaxed ${
                    isDark
                      ? "text-slate-300/90"
                      : "text-slate-600"
                  }`}
                >
                  {movie.description ||
                    t(
                      "No synopsis available for this film.",
                      "មិនមានសេចក្តីសង្ខេបសម្រាប់ភាពយន្តនេះទេ។",
                      "暂无该电影的简介。"
                    )}
                </p>
              </div>

              {/* Share & Status Bar */}
              <div className={`pt-6 mt-4 flex items-center gap-3 border-t ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
                <button
                  onClick={() => {
                    if (navigator.share) {
                      navigator.share({
                        title: movie.title,
                        url: window.location.href,
                      }).catch(() => {});
                    } else {
                      navigator.clipboard.writeText(window.location.href);
                      setToast({
                        message: t("Link copied to clipboard!", "បានចម្លងតំណភ្ជាប់!", "链接已复制！"),
                        type: "success",
                      });
                    }
                  }}
                  className={`flex cursor-pointer items-center gap-2 rounded-xl border px-4 py-2.5 text-xs font-bold transition ${
                    isDark
                      ? "border-slate-800 bg-slate-900/60 text-slate-300 hover:border-slate-700 hover:text-white"
                      : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:text-slate-900 shadow-sm"
                  }`}
                >
                  <Share2 className="h-4 w-4 text-red-500" />
                  <span>{t("Share Movie", "ចែករំលែក", "分享电影")}</span>
                </button>

                <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-400">
                  <span className={`inline-block h-2 w-2 rounded-full ${isComingSoon ? "bg-amber-500" : "bg-emerald-500"} animate-pulse`} />
                  <span>
                    {isComingSoon
                      ? t("Coming Soon", "នឹងដាក់បញ្ចាំងsoon", "即将上映")
                      : t("Booking Open", "បើកកក់កៅអី", "正在预订")}
                  </span>
                </div>
              </div>
            </div>

            {/* ===================================================
                TRAILER
            =================================================== */}

            <div className="relative -mt-2 lg:col-span-5 lg:-mt-5">
              <div className="mb-2.5 flex items-center gap-1.5">
                <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-1.5 text-red-500">
                  <Play className="h-3 w-3 fill-red-500" />
                </div>

                <h2
                  className={`text-[11px] font-black uppercase tracking-wider ${
                    isDark
                      ? "text-white"
                      : "text-slate-900"
                  }`}
                >
                  {t(
                    "Trailer",
                    "ឈុតខ្លី",
                    "预告片"
                  )}
                </h2>
              </div>

              {embedTrailerUrl ? (
                <div className="relative">
                  <div className="absolute -inset-3 rounded-2xl bg-gradient-to-br from-red-600/30 to-amber-400/10 blur-xl" />

                  <div className="relative aspect-[16/10] w-full min-w-0 overflow-hidden rounded-xl border border-white/10 bg-black shadow-2xl ring-1 ring-white/5">
                    <iframe
                      src={embedTrailerUrl}
                      title={`${movie.title} Trailer`}
                      className="h-full w-full border-0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                </div>
              ) : (
                <div className="flex aspect-[16/10] w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-slate-700 bg-slate-950/50 text-[11px] text-slate-500">
                  <Film className="h-6 w-6 text-slate-700" />

                  {t(
                    "No Trailer Linked",
                    "មិនមានឈុតខ្លី",
                    "暂无预告片"
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================
          SHOWTIMES (Hidden for Coming Soon)
      ========================================================= */}

      <div className="mx-auto mt-8 max-w-7xl space-y-6 px-4 sm:px-8">
        <div
          className={`flex items-center gap-2.5 border-b pb-4 ${
            isDark
              ? "border-slate-800"
              : "border-slate-200"
          }`}
        >
          <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-1.5 text-red-500">
            <Ticket className="h-4 w-4" />
          </div>

          <h2
            className={`text-lg font-black ${
              isDark
                ? "text-white"
                : "text-slate-900"
            }`}
          >
            {isComingSoon
              ? t("Screening Status", "ស្ថានភាពបញ្ចាំង", "上映状态")
              : t("Select Screening & Showtime", "ជ្រើសរើសការបញ្ចាំង និងម៉ោង", "选择放映场次和时间")}
          </h2>
        </div>

        {isComingSoon ? (
          /* COMING SOON NOTICE (No seats or showtimes shown) */
          <div
            className={`rounded-3xl border p-12 text-center space-y-3 ${
              isDark
                ? "border-slate-800 bg-slate-900/30 text-slate-400"
                : "border-slate-200 bg-white text-slate-500"
            }`}
          >
            <Calendar className="mx-auto h-12 w-12 text-amber-500" />
            <h3 className={`text-base font-bold ${isDark ? "text-white" : "text-slate-900"}`}>
              {t(
                "This movie is coming soon. No seats available yet.",
                "ភាពយន្តនេះនឹងដាក់បញ្ចាំងជូនដំណឹងនៅពេលក្រោយ មិនទាន់មានកៅអីសម្រាប់កក់ទេ។",
                "这部电影即将上映，暂无可预订座位。"
              )}
            </h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              {t(
                "Showtimes and seat bookings will become available once the film hits theaters.",
                "កាលវិភាគបញ្ចាំង និងការកក់កៅអីនឹងបើកដំណើរការនៅពេលភាពយន្តដាក់តាំងបង្ហាញ។",
                "电影上映后即可查看放映时间和预订座位。"
              )}
            </p>
          </div>
        ) : cinemaBranches.length > 0 ? (
          <div className="space-y-7">
            {/* CINEMA FILTER */}

            <div className="flex items-center gap-2 overflow-x-auto pb-2">
              {cinemaBranches.map(
                (branch) => (
                  <button
                    key={branch.id}
                    onClick={() =>
                      setSelectedCinemaId(
                        branch.id
                      )
                    }
                    className={`flex shrink-0 cursor-pointer items-center gap-2 rounded-2xl px-4 py-2.5 text-xs font-bold transition ${
                      selectedCinemaId ===
                      branch.id
                        ? "bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-lg shadow-red-600/30"
                        : isDark
                          ? "border border-slate-800 bg-slate-900 text-slate-400 hover:border-slate-700 hover:text-white"
                          : "border border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:text-slate-900"
                    }`}
                  >
                    <Building className="h-3.5 w-3.5" />

                    <span>
                      {branch.name} (
                      {branch.city})
                    </span>
                  </button>
                )
              )}
            </div>

            {/* SHOWTIME CARDS */}

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
              {filteredShowtimes.map(
                (st) => {
                  const {
                    time,
                    date,
                  } =
                    formatShowDateTime(
                      st.startTime
                    );

                  return (
                    <div
                      key={st.id}
                      className="group relative flex overflow-hidden rounded-2xl shadow-xl"
                    >
                      {/* MAIN SHOWTIME */}

                      <div
                        className={`flex-1 space-y-3 rounded-l-2xl border p-5 transition group-hover:border-red-500/50 ${
                          isDark
                            ? "border-slate-800 bg-gradient-to-br from-slate-900 to-slate-900/70"
                            : "border-slate-200 bg-white"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span
                            className={`flex items-center gap-1.5 text-xs font-bold ${
                              isDark
                                ? "text-white"
                                : "text-slate-900"
                            }`}
                          >
                            <Tv className="h-3.5 w-3.5 text-slate-400" />

                            {st.hallName}
                          </span>

                          <span className="rounded-full border border-red-500/20 bg-red-600/10 px-2.5 py-0.5 text-[10px] font-bold text-red-400">
                            {st.hallType?.replace(
                              "_",
                              " "
                            )}
                          </span>
                        </div>

                        <div>
                          <div className="font-mono text-3xl font-black leading-none text-red-500 transition group-hover:text-red-400">
                            {time}
                          </div>

                          <div className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                            {date}
                          </div>
                        </div>
                      </div>

                      {/* TICKET DIVIDER */}

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

                        <div className="absolute bottom-1 left-0 top-1 border-l-2 border-dashed border-slate-700" />
                      </div>

                      {/* SEATS */}

                      <div
                        className={`flex w-[104px] shrink-0 flex-col items-center justify-center gap-2.5 rounded-r-2xl border border-l-0 p-3 transition group-hover:border-red-500/50 ${
                          isDark
                            ? "border-slate-800 bg-slate-950"
                            : "border-slate-200 bg-white"
                        }`}
                      >
                        <button
                          onClick={() =>
                            router.push(
                              `/customer/booking/${st.id}`
                            )
                          }
                          className="w-full cursor-pointer rounded-lg bg-gradient-to-r from-red-600 to-rose-600 py-2 text-[10px] font-bold text-white shadow-md shadow-red-600/30 transition hover:from-red-500 hover:to-rose-500"
                        >
                          {t(
                            "Seats",
                            "កៅអី",
                            "座位"
                          )}
                        </button>
                      </div>
                    </div>
                  );
                }
              )}
            </div>
          </div>
        ) : (
          /* NO SHOWTIMES */

          <div
            className={`rounded-3xl border p-10 text-center text-xs ${
              isDark
                ? "border-slate-800 bg-slate-900/30 text-slate-400"
                : "border-slate-200 bg-white text-slate-500"
            }`}
          >
            <Calendar className="mx-auto mb-3 h-10 w-10 text-slate-500" />

            <p
              className={`text-sm font-semibold ${
                isDark
                  ? "text-white"
                  : "text-slate-900"
              }`}
            >
              {t(
                "No Showtimes Scheduled",
                "មិនទាន់មានកាលវិភាគបញ្ចាំង",
                "暂无放映安排"
              )}
            </p>

            <p className="mt-1 text-slate-500">
              {t(
                "Check back soon for new screening dates for this movie.",
                "សូមពិនិត្យម្តងទៀតនៅពេលក្រោយសម្រាប់កាលបរិច្ឆេទបញ្ចាំងថ្មី។",
                "请稍后再查看该电影的新放映日期。"
              )}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}