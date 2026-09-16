"use client";

import { useEffect, useState, use, useMemo } from "react";
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
  MessageSquare,
  Send,
  Heart,
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
import api from "@/app/lib/api";
import { AuthService } from "@/app/service/auth.service";

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

  if (url.includes("/embed/")) {
    const embedId = url.split("/embed/")[1]?.split("?")[0];

    if (embedId && embedId.length >= 11) {
      return url;
    }
  }

  const shortsMatch = url.match(/youtube\.com\/shorts\/([\w-]{11})/);

  if (shortsMatch?.[1]) {
    return `https://www.youtube.com/embed/${shortsMatch[1]}`;
  }

  const match = url.match(
    /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/,
  );

  if (match?.[1]) {
    return `https://www.youtube.com/embed/${match[1]}`;
  }

  return null;
};

const extractArray = <T,>(res: any): T[] => {
  if (Array.isArray(res)) return res;

  if (Array.isArray(res?.content)) {
    return res.content;
  }

  if (Array.isArray(res?.data)) {
    return res.data;
  }

  if (Array.isArray(res?.body?.data)) {
    return res.body.data;
  }

  if (Array.isArray(res?.data?.content)) {
    return res.data.content;
  }

  return [];
};

const parseBackendDate = (raw: string) =>
  new Date(raw.includes("T") ? raw : raw.replace(" ", "T"));

const sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

const addDays = (date: Date, amount: number) => {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + amount);
  return copy;
};

const formatShowDateTime = (
  raw?: string,
): {
  time: string;
  date: string;
} => {
  if (!raw) {
    return {
      time: "--:--",
      date: "",
    };
  }

  const date = parseBackendDate(raw);

  if (Number.isNaN(date.getTime())) {
    return {
      time: raw,
      date: "",
    };
  }

  return {
    time: date.toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }),
    date: date.toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
    }),
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

  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  // Reviews
  const [reviews, setReviews] = useState<any[]>([]);

  const [loadingReviews, setLoadingReviews] = useState(false);

  const [newRating, setNewRating] = useState(5);

  const [newComment, setNewComment] = useState("");

  const [submittingReview, setSubmittingReview] = useState(false);

  // Watchlist
  const [isFavorited, setIsFavorited] = useState(false);

  const [toast, setToast] = useState<{
    message: string | null;
    type: "success" | "error" | "info";
  }>({
    message: null,
    type: "success",
  });

  /* =====================================================
     TRANSLATION
  ===================================================== */

  const t = (en: string, km: string, zh: string) => {
    const currentLanguage = String(language || "en").toLowerCase();

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

  /* =====================================================
     TOAST
  ===================================================== */

  const showToast = (
    message: string,
    type: "success" | "error" | "info" = "success",
  ) => {
    setToast({
      message,
      type,
    });
  };

  /* =====================================================
     REVIEWS
  ===================================================== */

  const fetchReviews = async () => {
    if (!movieId) return;

    try {
      setLoadingReviews(true);

      const res = await api.get(`/reviews/movie/${movieId}?page=0&size=20`);

      const rawObj = res.data?.body?.data || res.data?.data || res.data;

      setReviews(extractArray<any>(rawObj));
    } catch {
      // Keep existing page working
    } finally {
      setLoadingReviews(false);
    }
  };

  /* =====================================================
     LOAD MOVIE
  ===================================================== */

  useEffect(() => {
    async function fetchMovieDetails() {
      if (!movieId) {
        setLoading(false);
        return;
      }

      try {
        const [movieRes, showtimeRes, favoriteCheckRes] = await Promise.all([
          MovieService.getMovieById(movieId),

          ShowtimeService.getShowtimesByMovie(movieId).catch(() => []),

          api.get(`/favorites/check/${movieId}`).catch(() => null),
        ]);

        setMovie(movieRes);

        const activeShowtimes = extractArray<ShowtimeResponse>(showtimeRes);

        setShowtimes(activeShowtimes);

        if (favoriteCheckRes) {
          const favoriteStatus =
            favoriteCheckRes.data?.body?.data ??
            favoriteCheckRes.data?.data ??
            favoriteCheckRes.data;

          setIsFavorited(Boolean(favoriteStatus));
        }

        if (movieRes?.status !== "COMING_SOON") {
          fetchReviews();
        }
      } catch {
        setToast({
          message: t(
            "Failed to load movie details or showtimes.",
            "មិនអាចផ្ទុកព័ត៌មានភាពយន្ត ឬម៉ោងបញ្ចាំងបានទេ។",
            "无法加载电影详情或放映时间。",
          ),
          type: "error",
        });
      } finally {
        setLoading(false);
      }
    }

    fetchMovieDetails();
  }, [movieId]);

  /* =====================================================
     WATCHLIST
  ===================================================== */

  const handleToggleFavorite = async () => {
    const token = AuthService.getAccessToken();

    if (!token) {
      showToast("Please sign in to manage your watchlist.", "info");

      router.push("/login");

      return;
    }

    try {
      const res = await api.post(`/favorites/toggle/${movieId}`);

      const newState = res.data?.body?.data ?? res.data?.data ?? res.data;

      setIsFavorited(Boolean(newState));

      showToast(
        newState ? "Added to your watchlist!" : "Removed from your watchlist!",
        "success",
      );
    } catch {
      showToast("Failed to update watchlist status.", "error");
    }
  };

  /* =====================================================
     SUBMIT REVIEW
  ===================================================== */

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();

    const token = AuthService.getAccessToken();

    if (!token) {
      showToast("Please sign in to submit a review.", "info");

      router.push("/login");

      return;
    }

    if (!newComment.trim()) {
      showToast("Please enter a review comment.", "error");

      return;
    }

    setSubmittingReview(true);

    try {
      await api.post("/reviews", {
        movieId,
        rating: newRating,
        comment: newComment.trim(),
      });

      showToast("Review submitted successfully!", "success");

      setNewComment("");

      fetchReviews();
    } catch (err: any) {
      showToast(
        err.response?.data?.message || "Failed to submit review.",
        "error",
      );
    } finally {
      setSubmittingReview(false);
    }
  };

  /* =====================================================
     DATE TABS
  ===================================================== */

  const dateTabs = useMemo(() => {
    const days: Date[] = [];

    const today = new Date();

    for (let i = 0; i < 5; i++) {
      days.push(addDays(today, i));
    }

    return days;
  }, []);

  /* =====================================================
     LOADING
  ===================================================== */

  if (loading) {
    return (
      <div
        className={`flex min-h-screen items-center justify-center ${
          isDark ? "bg-[#08090D]" : "bg-slate-50"
        }`}
      >
        <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
      </div>
    );
  }

  /* =====================================================
     NOT FOUND
  ===================================================== */

  if (!movie) {
    return (
      <div
        className={`flex min-h-screen flex-col items-center justify-center ${
          isDark ? "bg-[#08090D] text-white" : "bg-slate-50 text-slate-900"
        }`}
      >
        <Film className="mb-4 h-12 w-12 text-slate-500" />

        <h2 className="text-xl font-black">
          {t("Movie Not Found", "រកមិនឃើញភាពយន្ត", "未找到电影")}
        </h2>

        <Link
          href="/"
          className="mt-5 flex items-center gap-2 bg-amber-500 px-5 py-3 text-xs font-black text-slate-950"
        >
          <ArrowLeft className="h-4 w-4" />

          {t("Back to Movies", "ត្រឡប់ទៅភាពយន្ត", "返回电影")}
        </Link>
      </div>
    );
  }

  /* =====================================================
     MOVIE DATA
  ===================================================== */

  const rawTrailerUrl =
    movie.trailerUrl ||
    (movie as any).trailer ||
    (movie as any).youtubeUrl ||
    (movie as any).videoUrl;

  const embedTrailerUrl = getYouTubeEmbedUrl(rawTrailerUrl);

  const isComingSoon = movie.status === "COMING_SOON";

  /* =====================================================
     CINEMA BRANCHES
  ===================================================== */

  const cinemaBranches = Array.from(
    new Map(
      showtimes.map((st) => [
        st.cinemaId,
        {
          id: st.cinemaId,
          name: st.cinemaName,
          city: st.cinemaCity,
        },
      ]),
    ).values(),
  );

  /* =====================================================
     FILTER SHOWTIMES BY DATE
  ===================================================== */

  const filteredShowtimes = showtimes.filter((st) => {
    const stDate = parseBackendDate(st.startTime);

    const matchesDate = sameDay(stDate, selectedDate);

    const now = new Date();

    const isToday = sameDay(selectedDate, now);

    const isFutureTime = isToday ? stDate.getTime() > now.getTime() : true;

    return matchesDate && isFutureTime;
  });

  /* =====================================================
     PAGE
  ===================================================== */

  return (
    <div
      className={`min-h-screen overflow-hidden relative ${
        isDark ? "bg-[#08070C] text-white" : "bg-slate-50 text-slate-900"
      }`}
    >
      {/* ===================================================
          GLOBAL STYLES & ATMOSPHERIC GRAIN
      =================================================== */}

      <style jsx global>{`
        @import url("https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Work+Sans:wght@400;500;600;700;800&display=swap");

        @keyframes bulb-chase {
          0%,
          100% {
            opacity: 0.25;
          }
          50% {
            opacity: 1;
          }
        }

        @keyframes spotlight-drift {
          0% {
            transform: rotate(0deg) translate(-50%, -50%);
          }
          100% {
            transform: rotate(360deg) translate(-50%, -50%);
          }
        }

        @keyframes grain-shift {
          0%,
          100% {
            transform: translate(0, 0);
          }
          25% {
            transform: translate(-2%, 2%);
          }
          50% {
            transform: translate(2%, -1%);
          }
          75% {
            transform: translate(-1%, -2%);
          }
        }

        @keyframes twinkle {
          0%,
          100% {
            opacity: 0.2;
            transform: scale(0.8);
          }
          50% {
            opacity: 1;
            transform: scale(1.2);
          }
        }

        .animate-twinkle {
          animation: twinkle 2.5s ease-in-out infinite;
        }

        .film-grain {
          background-image: radial-gradient(
            rgba(255, 255, 255, 0.045) 1px,
            transparent 1px
          );
          background-size: 3px 3px;
          animation: grain-shift 1.2s steps(4) infinite;
        }

        .playbill-card {
          background: ${isDark ? "#12131C" : "#FFFFFF"};
          color: ${isDark ? "#F8F5EF" : "#0F172A"};
        }

        .ticket-notch {
          clip-path: polygon(
            0 10px,
            6px 10px,
            6px 0,
            calc(100% - 6px) 0,
            calc(100% - 6px) 10px,
            100% 10px,
            100% calc(100% - 10px),
            calc(100% - 6px) calc(100% - 10px),
            calc(100% - 6px) 100%,
            6px 100%,
            6px calc(100% - 10px),
            0 calc(100% - 10px)
          );
        }

        ::-webkit-scrollbar {
          display: none;
        }

        html,
        body {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>

      {/* Atmospheric Film Grain Overlay */}
      <div
        aria-hidden
        className="film-grain pointer-events-none fixed inset-0 z-[1] opacity-[0.35] mix-blend-overlay"
      />

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

      {/* ===================================================
          MOVIE HERO / BANNER (Midnight Marquee Style)
      =================================================== */}

      <section
        className="relative min-h-[680px] overflow-hidden border-b border-black/20"
        style={{
          background: isDark
            ? `radial-gradient(ellipse 1100px 650px at 15% 10%, rgba(91,75,138,0.28), transparent 60%),
               radial-gradient(ellipse 900px 700px at 95% 90%, rgba(242,169,59,0.14), transparent 60%),
               #08070C`
            : `radial-gradient(ellipse 1100px 650px at 15% 10%, rgba(91,75,138,0.18), transparent 60%), #F1ECDF`,
          fontFamily: "'Work Sans', sans-serif",
        }}
      >
        {/* Spotlight drift */}
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-1/2 w-[900px] h-[900px] opacity-40"
          style={{
            background: `conic-gradient(from 0deg, transparent 0deg, rgba(217,164,65,0.16) 25deg, transparent 60deg, transparent 300deg, rgba(217,164,65,0.1) 335deg, transparent 360deg)`,
            animation: "spotlight-drift 28s linear infinite",
          }}
        />

        {/* Marquee bulb strip along the top edge */}
        <div className="absolute top-0 left-0 right-0 flex justify-center gap-4 pt-3 z-20">
          {Array.from({ length: 24 }).map((_, i) => (
            <span
              key={i}
              className="w-1.5 h-1.5 rounded-full"
              style={{
                background: "#D9A441",
                boxShadow: "0 0 6px #D9A441",
                animation: "bulb-chase 1.8s ease-in-out infinite",
                animationDelay: `${(i % 8) * 0.15}s`,
              }}
            />
          ))}
        </div>

        {movie.posterUrl && (
          <div
            className="absolute inset-0 scale-110 bg-cover bg-center opacity-[0.16] blur-[3px]"
            style={{
              backgroundImage: `url(${movie.posterUrl})`,
            }}
          />
        )}

        {/* Top Dots decoration */}
        <div className="absolute left-1/2 top-6 flex -translate-x-1/2 items-center gap-3 z-20">
          {Array.from({
            length: 18,
          }).map((_, index) => (
            <span
              key={index}
              className={`h-1.5 w-1.5 rounded-full ${
                index % 4 === 0
                  ? "bg-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.8)]"
                  : "bg-amber-500/30"
              }`}
              style={{
                animation: "twinkle 2.5s ease-in-out infinite",
                animationDelay: `${index * 0.12}s`,
              }}
            />
          ))}
        </div>

        <div className="relative mx-auto max-w-7xl px-6 pb-16 pt-20 lg:px-8 lg:pt-24 z-10">
          <Link
            href="/"
            className={`mb-10 inline-flex items-center gap-2 text-xs font-black uppercase tracking-wider transition ${
              isDark
                ? "text-slate-400 hover:text-amber-400"
                : "text-slate-500 hover:text-amber-600"
            }`}
          >
            <ArrowLeft className="h-4 w-4" />

            {t("Back to Movies", "ត្រឡប់ទៅភាពយន្ត", "返回电影")}
          </Link>

          <div className="grid grid-cols-1 items-center gap-10 xl:grid-cols-[280px_minmax(0,1fr)_430px] xl:gap-12">
            {/* =================================================
                POSTER
            ================================================= */}

            <div className="relative mx-auto w-full max-w-[280px] xl:mx-0">
              <div className="absolute -inset-6 rounded-3xl bg-amber-500/[0.10] blur-3xl" />

              <div className="relative overflow-hidden rounded-sm border border-white/10 bg-black shadow-[0_30px_80px_rgba(0,0,0,0.7)]">
                {movie.posterUrl ? (
                  <img
                    src={movie.posterUrl}
                    alt={movie.title}
                    className="aspect-[2/3] w-full object-cover"
                  />
                ) : (
                  <div className="flex aspect-[2/3] items-center justify-center bg-slate-950">
                    <Film className="h-16 w-16 text-slate-600" />
                  </div>
                )}
              </div>
            </div>

            {/* =================================================
                MOVIE INFORMATION (Midnight Marquee Typography)
            ================================================= */}

            <div className="min-w-0 max-w-3xl">
              <div className="mb-4 flex items-center gap-3">
                <span className="h-2 w-2 rounded-full bg-amber-400 shadow-[0_0_8px_#F2A93B]" />

                <span className="text-xs font-black tracking-[0.1em] text-amber-400">
                  {isComingSoon
                    ? t("Coming Soon", "នឹងដាក់បញ្ចាំង", "即将上映")
                    : "Now Showing"}
                </span>

                <span className="h-px w-12 bg-amber-500/40" />
              </div>

              <h1
                style={{ fontFamily: "'Bebas Neue', sans-serif" }}
                className={`max-w-3xl text-6xl sm:text-7xl lg:text-8xl font-normal uppercase tracking-wider leading-[0.9] ${
                  isDark ? "text-white" : "text-slate-950"
                }`}
              >
                {movie.title}
              </h1>

              <div className="mt-5 flex flex-wrap items-center gap-3">
                {movie.genres?.map((genre) => (
                  <span
                    key={genre.id}
                    className={`rounded-lg border px-3 py-1 text-xs font-bold ${
                      isDark
                        ? "border-white/15 bg-white/[0.04] text-slate-300"
                        : "border-slate-300 bg-white/70 text-slate-800"
                    }`}
                  >
                    {genre.name}
                  </span>
                ))}

                <span
                  className={`flex items-center gap-1.5 text-xs font-bold ${
                    isDark ? "text-slate-300" : "text-slate-600"
                  }`}
                >
                  <Clock className="h-3.5 w-3.5 text-amber-400" />
                  {movie.durationMinutes}m
                </span>
              </div>

              <p
                className={`mt-5 max-w-xl text-sm leading-relaxed ${
                  isDark ? "text-slate-300/80" : "text-slate-600"
                }`}
              >
                {movie.description ||
                  t(
                    "No synopsis available for this film.",
                    "មិនមានសេចក្តីសង្ខេបសម្រាប់ភាពយន្តនេះទេ។",
                    "暂无该电影的简介。",
                  )}
              </p>

              {/* BUTTONS */}

              <div className="mt-8 flex flex-wrap items-center gap-4">
                {!isComingSoon && filteredShowtimes.length > 0 && (
                  <button
                    onClick={() => {
                      const firstShowtime = filteredShowtimes[0];

                      if (firstShowtime) {
                        router.push(`/customer/booking/${firstShowtime.id}`);
                      }
                    }}
                    className="group relative flex cursor-pointer items-center gap-2.5 rounded-2xl bg-[#A8283A] hover:bg-[#b93245] px-7 py-4 text-xs font-black uppercase tracking-wider text-white shadow-xl shadow-red-950/40 transition hover:scale-[1.02]"
                  >
                    <Ticket className="h-4 w-4" />
                    <span>BUY TICKET</span>
                  </button>
                )}

                {embedTrailerUrl && (
                  <a
                    href="#trailer"
                    className={`flex cursor-pointer items-center gap-2.5 rounded-2xl border px-7 py-4 text-xs font-black uppercase tracking-wider transition hover:scale-[1.02] ${
                      isDark
                        ? "border-white/20 bg-transparent text-white hover:bg-white/5"
                        : "border-slate-300 bg-transparent text-slate-900 hover:bg-slate-100"
                    }`}
                  >
                    <Play className="h-4 w-4 fill-current" />
                    <span>WATCH TRAILER</span>
                  </a>
                )}
              </div>

              {/* WATCHLIST + SHARE */}

              <div className="mt-8 flex flex-wrap items-center gap-5">
                <button
                  onClick={handleToggleFavorite}
                  className={`flex cursor-pointer items-center gap-2 text-xs font-bold transition ${
                    isFavorited
                      ? "text-rose-500"
                      : isDark
                        ? "text-slate-400 hover:text-white"
                        : "text-slate-500 hover:text-slate-900"
                  }`}
                >
                  <Heart
                    className={`h-4 w-4 ${isFavorited ? "fill-current" : ""}`}
                  />

                  {isFavorited
                    ? t("Saved in Watchlist", "បានរក្សាទុក", "已收藏")
                    : t("Add to Watchlist", "បន្ថែមចូលបញ្ជី", "加入收藏")}
                </button>

                <button
                  onClick={() => {
                    if (navigator.share) {
                      navigator
                        .share({
                          title: movie.title,
                          url: window.location.href,
                        })
                        .catch(() => {});
                    } else {
                      navigator.clipboard.writeText(window.location.href);

                      showToast(
                        t("Link copied!", "បានចម្លងតំណភ្ជាប់!", "链接已复制！"),
                        "success",
                      );
                    }
                  }}
                  className={`flex cursor-pointer items-center gap-2 text-xs font-bold transition ${
                    isDark
                      ? "text-slate-400 hover:text-white"
                      : "text-slate-500 hover:text-slate-900"
                  }`}
                >
                  <Share2 className="h-4 w-4" />

                  {t("Share", "ចែករំលែក", "分享")}
                </button>
              </div>
            </div>

            {/* =================================================
                TRAILER (Fixed height to match the poster on the left)
            ================================================= */}

            {embedTrailerUrl && (
              <div id="trailer" className="relative mt-2 w-full xl:mt-0">
                <div className="absolute -inset-5 rounded-3xl bg-amber-500/[0.08] blur-3xl" />

                <div className="relative">
                  <div className="mb-4 flex items-center gap-3">
                    <span className="h-2 w-2 rounded-full bg-amber-500" />

                    <span className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-500">
                      {t("Official Trailer", "ឈុតខ្លីផ្លូវការ", "官方预告片")}
                    </span>

                    <span className="h-px flex-1 bg-amber-500/30" />
                  </div>

                  <div
                    className={`relative h-[420px] w-full overflow-hidden rounded-2xl border ${
                      isDark
                        ? "border-white/10 bg-black"
                        : "border-slate-300 bg-black"
                    } shadow-[0_25px_70px_rgba(0,0,0,0.55)]`}
                  >
                    <iframe
                      src={embedTrailerUrl}
                      title={`${movie.title} Trailer`}
                      className="h-full w-full border-0 object-cover"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="mt-14 flex items-center gap-3 opacity-60">
            {Array.from({
              length: 18,
            }).map((_, index) => (
              <span
                key={index}
                className={`h-1 w-1 rounded-full ${
                  index % 5 === 0 ? "bg-amber-500" : "bg-slate-600"
                }`}
              />
            ))}
          </div>
        </div>
      </section>

      {/* =====================================================
          SHOWTIMES
      ===================================================== */}

      <section className="mx-auto mt-16 max-w-7xl px-6 lg:px-8">
        <div
          className={`mb-8 flex items-center gap-4 border-b pb-5 ${
            isDark ? "border-white/10" : "border-slate-200"
          }`}
        >
          <Film className="h-5 w-5 text-amber-500" />

          <div>
            <h2
              className={`text-xl font-black uppercase ${
                isDark ? "text-white" : "text-slate-900"
              }`}
            >
              {isComingSoon
                ? t("Screening Status", "ស្ថានភាពបញ្ចាំង", "上映状态")
                : t("Showtimes", "ម៉ោងបញ្ចាំង", "放映时间")}
            </h2>

            <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
              {isComingSoon
                ? t(
                    "This movie is coming soon",
                    "ភាពយន្តនេះនឹងដាក់បញ្ចាំងឆាប់ៗនេះ",
                    "这部电影即将上映",
                  )
                : t(
                    "Choose your cinema and showtime",
                    "ជ្រើសរើសរោងកុន និងម៉ោងបញ្ចាំង",
                    "选择影院和放映时间",
                  )}
            </p>
          </div>
        </div>

        {isComingSoon ? (
          <div
            className={`py-16 text-center ${
              isDark ? "text-slate-400" : "text-slate-500"
            }`}
          >
            <Calendar className="mx-auto h-10 w-10 text-amber-500" />

            <p className="mt-4 text-sm font-bold">
              {t(
                "This movie is coming soon. No seats available yet.",
                "ភាពយន្តនេះនឹងដាក់បញ្ចាំងឆាប់ៗនេះ មិនទាន់មានកៅអីទេ។",
                "这部电影即将上映，目前暂无座位。",
              )}
            </p>
          </div>
        ) : (
          <div className="space-y-10">
            {/* DATE */}

            <div className="flex gap-3 overflow-x-auto pb-2">
              {dateTabs.map((date, index) => {
                const isSelected = sameDay(date, selectedDate);

                const isToday = sameDay(date, new Date());

                const label = isToday
                  ? t("Today", "ថ្ងៃនេះ", "今天")
                  : date.toLocaleDateString(undefined, {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                    });

                return (
                  <button
                    key={index}
                    onClick={() => setSelectedDate(date)}
                    className={`shrink-0 cursor-pointer px-5 py-3 text-xs font-black uppercase transition ${
                      isSelected
                        ? "bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20"
                        : isDark
                          ? "border border-white/10 text-slate-400 hover:border-amber-500/40 hover:text-white"
                          : "border border-slate-200 bg-white text-slate-600 hover:border-amber-500/40 shadow-sm"
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>

            {/* CINEMA BRANCHES */}

            {cinemaBranches.length > 0 ? (
              <div className="space-y-12">
                {cinemaBranches.map((branch) => {
                  const branchShowtimes = filteredShowtimes.filter(
                    (st) => st.cinemaId === branch.id,
                  );

                  return (
                    <div key={branch.id}>
                      {/* CINEMA HEADER */}

                      <div
                        className={`mb-5 flex items-center gap-4 border-b pb-4 ${
                          isDark ? "border-white/10" : "border-slate-200"
                        }`}
                      >
                        <Building className="h-5 w-5 text-amber-500" />

                        <div>
                          <h3
                            className={`text-sm font-black uppercase ${
                              isDark ? "text-white" : "text-slate-900"
                            }`}
                          >
                            {branch.name}
                          </h3>

                          <p className="text-[10px] text-slate-500">
                            {branch.city}
                          </p>
                        </div>
                      </div>

                      {branchShowtimes.length > 0 ? (
                        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                          {branchShowtimes.map((st) => {
                            const { time, date } = formatShowDateTime(
                              st.startTime,
                            );

                            return (
                              <div
                                key={st.id}
                                className="playbill-card group relative flex overflow-hidden rounded-2xl border shadow-xl transition-all duration-300 hover:-translate-y-1"
                                style={{
                                  borderColor: isDark
                                    ? "rgba(255,255,255,0.1)"
                                    : "rgba(0,0,0,0.08)",
                                }}
                              >
                                {/* Left Time/Hall Box */}
                                <div className="flex-1 space-y-3 p-5">
                                  <div className="flex items-center justify-between">
                                    <span
                                      className={`flex items-center gap-1.5 text-xs font-bold ${isDark ? "text-slate-300" : "text-slate-700"}`}
                                    >
                                      <Tv className="h-3.5 w-3.5 text-amber-500" />
                                      {st.hallName}
                                    </span>
                                    <span className="rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-black text-amber-400">
                                      {st.hallType?.replace("_", " ")}
                                    </span>
                                  </div>

                                  <div>
                                    <div className="font-mono text-3xl font-black tracking-tight text-amber-500 transition group-hover:opacity-90">
                                      {time}
                                    </div>
                                    <div className="mt-0.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                                      {date}
                                    </div>
                                  </div>
                                </div>

                                {/* Ticket Notch Dividers */}
                                <div className="relative flex w-0 items-center justify-center">
                                  <div
                                    className={`absolute -left-2.5 -top-3 h-5 w-5 rounded-full border-r ${isDark ? "border-white/10 bg-[#08070C]" : "border-slate-200 bg-slate-50"}`}
                                  />
                                  <div
                                    className={`absolute -bottom-3 -left-2.5 h-5 w-5 rounded-full border-r ${isDark ? "border-white/10 bg-[#08070C]" : "border-slate-200 bg-slate-50"}`}
                                  />
                                  <div className="absolute bottom-2 top-2 border-l-2 border-dashed border-amber-500/30" />
                                </div>

                                {/* Right Action Button Box */}
                                <div className="flex w-[110px] shrink-0 flex-col items-center justify-center border-l border-slate-800/10 dark:border-white/10 p-4">
                                  <button
                                    onClick={() =>
                                      router.push(`/customer/booking/${st.id}`)
                                    }
                                    className="w-full cursor-pointer rounded-xl bg-amber-500 py-3 text-center text-xs font-black uppercase text-slate-950 shadow-lg shadow-amber-500/25 transition hover:bg-amber-400"
                                  >
                                    {t("Seats", "កៅអី", "座位")}
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="py-5 text-xs font-bold text-slate-500">
                          {t(
                            "No showtimes available for this branch.",
                            "មិនមានម៉ោងបញ្ចាំងសម្រាប់សាខានេះទេ។",
                            "该影院暂无放映时间。",
                          )}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-12 text-center">
                <Calendar className="mx-auto h-10 w-10 text-slate-500" />

                <p className="mt-4 text-sm font-bold text-slate-500">
                  {t(
                    "No Showtimes Scheduled",
                    "មិនទាន់មានកាលវិភាគបញ្ចាំង",
                    "暂无放映安排",
                  )}
                </p>
              </div>
            )}

            {filteredShowtimes.length === 0 && cinemaBranches.length > 0 && (
              <div className="py-10 text-center">
                <Calendar className="mx-auto h-8 w-8 text-slate-600" />

                <p className="mt-3 text-xs font-bold text-slate-500">
                  {t(
                    "No showtimes available for this date.",
                    "មិនមានម៉ោងបញ្ចាំងសម្រាប់ថ្ងៃនេះទេ។",
                    "此日期暂无放映时间。",
                  )}
                </p>
              </div>
            )}
          </div>
        )}
      </section>

      {/* =====================================================
          REVIEWS
      ===================================================== */}

      {!isComingSoon && (
        <section className="mx-auto mt-20 max-w-7xl px-6 lg:px-8">
          <div
            className={`mb-8 flex items-center gap-4 border-b pb-5 ${
              isDark ? "border-white/10" : "border-slate-200"
            }`}
          >
            <MessageSquare className="h-5 w-5 text-amber-500" />

            <div>
              <h2
                className={`text-xl font-black uppercase ${
                  isDark ? "text-white" : "text-slate-900"
                }`}
              >
                {t("Audience Reviews", "ការវាយតម្លៃពីទស្សនិកជន", "观众评价")}
              </h2>

              <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                {t("What audiences think", "មតិរបស់ទស្សនិកជន", "观众的评价")}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-10 lg:grid-cols-[380px_1fr]">
            {/* REVIEW FORM */}

            <div
              className={`border p-6 rounded-2xl shadow-xl ${
                isDark
                  ? "border-white/10 bg-white/[0.025]"
                  : "border-slate-200 bg-white"
              }`}
            >
              <h3
                className={`text-sm font-black uppercase ${
                  isDark ? "text-white" : "text-slate-900"
                }`}
              >
                {t(
                  "Leave Your Rating",
                  "ទុកការវាយតម្លៃរបស់អ្នក",
                  "留下您的评分",
                )}
              </h3>

              <div className="mt-5 flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setNewRating(star)}
                    className="cursor-pointer transition hover:scale-110"
                  >
                    <Star
                      className={`h-6 w-6 ${
                        star <= newRating
                          ? "fill-amber-500 text-amber-500"
                          : "text-slate-600"
                      }`}
                    />
                  </button>
                ))}
              </div>

              <textarea
                rows={5}
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder={t(
                  "What did you think of the movie?",
                  "តើអ្នកយល់យ៉ាងណាចំពោះភាពយន្តនេះ?",
                  "您对这部电影有什么看法？",
                )}
                className={`mt-5 w-full resize-none border p-4 text-xs outline-none rounded-xl focus:border-amber-500 ${
                  isDark
                    ? "border-white/10 bg-black/30 text-white placeholder-slate-600"
                    : "border-slate-200 bg-slate-50 text-slate-900 placeholder-slate-400"
                }`}
              />

              <button
                onClick={handleSubmitReview}
                disabled={submittingReview}
                className="mt-4 flex cursor-pointer items-center gap-2 bg-amber-500 px-5 py-3 text-xs font-black uppercase text-slate-950 transition rounded-xl hover:bg-amber-400 disabled:opacity-50 shadow-lg shadow-amber-500/20"
              >
                {submittingReview ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}

                {t("Submit Review", "ដាក់ស្នើការវាយតម្លៃ", "提交评价")}
              </button>
            </div>

            {/* REVIEW LIST */}

            <div className="space-y-4">
              {loadingReviews ? (
                <div className="py-10 text-center">
                  <Loader2 className="mx-auto h-6 w-6 animate-spin text-amber-500" />
                </div>
              ) : reviews.length > 0 ? (
                reviews.map((review) => (
                  <div
                    key={review.id}
                    className={`border p-5 rounded-2xl shadow-sm ${
                      isDark
                        ? "border-white/10 bg-white/[0.025]"
                        : "border-slate-200 bg-white"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-xs font-black ${
                          isDark ? "text-white" : "text-slate-900"
                        }`}
                      >
                        {review.userName || "Movie Fan"}
                      </span>

                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={`h-3.5 w-3.5 ${
                              star <= review.rating
                                ? "fill-amber-500 text-amber-500"
                                : "text-slate-700"
                            }`}
                          />
                        ))}
                      </div>
                    </div>

                    <p
                      className={`mt-3 text-xs leading-6 ${
                        isDark ? "text-slate-300" : "text-slate-600"
                      }`}
                    >
                      {review.comment}
                    </p>
                  </div>
                ))
              ) : (
                <div className="py-12 text-center">
                  <MessageSquare className="mx-auto h-8 w-8 text-slate-600" />

                  <p className="mt-3 text-xs font-bold text-slate-500">
                    {t(
                      "No reviews yet.",
                      "មិនទាន់មានការវាយតម្លៃទេ។",
                      "暂无评价。",
                    )}
                  </p>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Bottom spacing */}

      <div className="h-20" />
    </div>
  );
}
