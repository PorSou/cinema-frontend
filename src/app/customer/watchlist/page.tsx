"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import AOS from "aos"; // 🌟 Import AOS
import {
  Heart,
  Film,
  Loader2,
  Clock,
  Trash2,
  ArrowRight,
  ShieldAlert,
  Sparkles,
} from "lucide-react";

import Toast from "@/app/components/Toast";
import { useSettings } from "@/app/context/SettingsContext";
import api from "@/app/lib/api";
import { AuthService } from "@/app/service/auth.service";

const extractArray = <T,>(res: any): T[] => {
  if (Array.isArray(res)) return res;
  if (Array.isArray(res?.content)) return res.content;
  if (Array.isArray(res?.data)) return res.data;
  if (Array.isArray(res?.body?.data)) return res.body.data;
  if (Array.isArray(res?.data?.content)) return res.data.content;

  return [];
};

export default function CustomerWatchlistPage() {
  const router = useRouter();
  const { theme } = useSettings();

  const isDark = theme === "dark";

  const [watchlist, setWatchlist] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [toast, setToast] = useState<{
    message: string | null;
    type: "success" | "error" | "info";
  }>({
    message: null,
    type: "success",
  });

  const showToast = (
    message: string,
    type: "success" | "error" | "info" = "success",
  ) => {
    setToast({
      message,
      type,
    });
  };

  // Refresh AOS whenever watchlist items or loading state updates
  useEffect(() => {
    const timer = setTimeout(() => {
      AOS.refresh();
    }, 100);
    return () => clearTimeout(timer);
  }, [watchlist, loading]);

  /*
   * ============================================================
   * FETCH WATCHLIST
   * ============================================================
   */

  const fetchWatchlist = async () => {
    const token = AuthService.getAccessToken();

    if (!token) {
      router.push("/login");
      return;
    }

    setLoading(true);

    try {
      const res = await api.get("/favorites?page=0&size=20");

      const rawObj = res.data?.body?.data || res.data?.data || res.data;

      setWatchlist(extractArray<any>(rawObj));
    } catch {
      showToast("Failed to load your watchlist.", "error");
      setWatchlist([]);
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
    fetchWatchlist();
  }, []);

  /*
   * ============================================================
   * REMOVE FAVORITE
   * ============================================================
   */

  const handleRemoveFavorite = async (movieId: number) => {
    try {
      await api.post(`/favorites/toggle/${movieId}`);

      showToast("Movie removed from watchlist.", "success");

      fetchWatchlist();
    } catch {
      showToast("Failed to update watchlist.", "error");
    }
  };

  /*
   * ============================================================
   * RENDER
   * ============================================================
   */

  return (
    <div
      className={`min-h-screen w-full transition-colors duration-300 ${
        isDark ? "bg-[#0B0C10] text-slate-100" : "bg-slate-50 text-slate-900"
      }`}
    >
      <Toast
        message={toast.message}
        type={toast.type}
        duration={3500}
        onClose={() =>
          setToast((prev) => ({
            ...prev,
            message: null,
          }))
        }
      />

      {/* ========================================================
          MAIN CONTENT
          WIDER LIKE F&B PAGE
      ======================================================== */}

      <div className="mx-auto w-full max-w-7xl flex-1 space-y-8 px-4 py-10 sm:px-8">
        {/* ======================================================
            WATCHLIST BANNER
            SAME STYLE AS FAVORITE PAGE
        ====================================================== */}

        <div
          data-aos="fade-up"
          data-aos-duration="800"
          className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-amber-600 via-red-600 to-rose-700 p-8 text-white shadow-2xl sm:p-12"
        >
          <div className="relative z-10 max-w-2xl space-y-3">
            {/* BADGE */}

            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/30 bg-black/35 px-3 py-1 text-xs font-bold text-amber-300 backdrop-blur-md">
              <Sparkles className="h-3.5 w-3.5" />
              My Favorite Movies
            </span>

            {/* TITLE */}

            <h1 className="flex flex-wrap items-center gap-3 text-3xl font-black tracking-tight sm:text-4xl">
              My Watchlist
              <span className="rounded-full border border-white/20 bg-black/25 px-3 py-1 text-xs font-black text-white backdrop-blur-md">
                {watchlist.length} Saved
              </span>
            </h1>

            {/* DESCRIPTION */}

            <p className="text-xs font-medium leading-relaxed text-slate-100 sm:text-sm">
              Quick access to your favorite films and saved movie releases.
            </p>
          </div>

          {/* BACKGROUND HEART */}

          <Heart
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
          className="flex items-center justify-between gap-4"
        >
          <div className="flex items-center gap-2">
            <Heart className="h-5 w-5 text-rose-500" />

            <h2 className="text-sm font-black uppercase tracking-wider">
              Saved Movies ({watchlist.length})
            </h2>
          </div>
        </div>

        {/* ======================================================
            LOADING
        ====================================================== */}

        {loading ? (
          <div className="flex min-h-[40vh] items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-rose-500" />
          </div>
        ) : watchlist.length > 0 ? (
          /* ====================================================
              WATCHLIST GRID
          ==================================================== */

          <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-4">
            {watchlist.map((item, index) => (
              <div
                key={item.id}
                data-aos="fade-up"
                data-aos-delay={(index % 4) * 80} // Staggered card animation effect
                className={`group flex min-w-0 flex-col overflow-hidden rounded-3xl border shadow-lg transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl ${
                  isDark
                    ? "border-white/10 bg-slate-900/60 hover:border-rose-500/30"
                    : "border-slate-200 bg-white hover:border-rose-300"
                }`}
              >
                {/* =================================================
                    POSTER
                ================================================= */}

                <div className="relative aspect-[2/3] w-full overflow-hidden bg-slate-950">
                  {item.moviePosterUrl ? (
                    <img
                      src={item.moviePosterUrl}
                      alt={item.movieTitle}
                      className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-slate-600">
                      <Film className="h-10 w-10" />
                    </div>
                  )}

                  {/* REMOVE BUTTON */}

                  <button
                    type="button"
                    onClick={() => handleRemoveFavorite(item.movieId)}
                    className="absolute right-3 top-3 cursor-pointer rounded-xl border border-rose-500/30 bg-black/70 p-2 text-rose-500 backdrop-blur-md transition hover:bg-rose-500 hover:text-white"
                    title="Remove from watchlist"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                {/* =================================================
                    CARD CONTENT
                ================================================= */}

                <div className="flex flex-1 flex-col justify-between space-y-3 p-5">
                  {/* MOVIE INFORMATION */}

                  <div className="space-y-1.5">
                    <h3
                      className={`line-clamp-1 text-sm font-black ${
                        isDark ? "text-white" : "text-slate-900"
                      }`}
                    >
                      {item.movieTitle}
                    </h3>

                    {item.movieDurationMinutes && (
                      <span className="flex items-center gap-1 font-mono text-[11px] text-slate-400">
                        <Clock className="h-3 w-3" />
                        {item.movieDurationMinutes}m
                      </span>
                    )}
                  </div>

                  {/* VIEW DETAILS */}

                  <Link
                    href={`/customer/movies/${item.movieId}`}
                    className="flex items-center justify-between border-t border-slate-800/60 pt-3 text-[11px] font-black text-amber-500 transition group-hover:translate-x-1"
                  >
                    <span>View Details</span>

                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* ======================================================
              EMPTY WATCHLIST
          ====================================================== */

          <div
            data-aos="fade-up"
            className={`flex min-h-[35vh] flex-col items-center justify-center space-y-3 rounded-3xl border p-8 text-center ${
              isDark
                ? "border-white/10 bg-slate-900/40"
                : "border-slate-200 bg-white"
            }`}
          >
            <ShieldAlert
              className={`h-10 w-10 ${
                isDark ? "text-slate-500" : "text-slate-400"
              }`}
            />

            <p
              className={`text-sm font-black ${
                isDark ? "text-white" : "text-slate-900"
              }`}
            >
              Your watchlist is empty.
            </p>

            <p
              className={`text-xs ${
                isDark ? "text-slate-400" : "text-slate-500"
              }`}
            >
              Explore movies and click the favorite heart icon to save them
              here!
            </p>

            <Link
              href="/customer/movies"
              className="mt-2 rounded-xl bg-amber-500 px-5 py-2.5 text-xs font-black text-slate-950 shadow-lg transition hover:bg-amber-400"
            >
              Browse Movies
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
