"use client";

import { useState, useMemo, useEffect, useRef, CSSProperties } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Film,
  Clock,
  ArrowRight,
  Loader2,
  Search,
  Play,
  Plus,
  Ticket,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Armchair,
  Compass,
  Star,
} from "lucide-react";
import { MovieResponse } from "@/app/types/api.types";
import { useSettings } from "@/app/context/SettingsContext";
import {
  useScrollProgress,
  useReveal,
  useTilt,
  hueFromProgress,
} from "@/app/hooks/useScrollAnimation";

const FEATURES = [
  {
    icon: Ticket,
    titleKey: "instantETickets",
    descKey: "instantETicketsDescription",
  },
  { icon: Sparkles, titleKey: "dolbyAtmos", descKey: "dolbyAtmosDescription" },
  { icon: Armchair, titleKey: "bestSeat", descKey: "bestSeatDescription" },
] as const;

/**
 * ---- Field accessors (unchanged logic) -----------------------------------
 */
const getTitle = (m: any): string => m?.title ?? m?.name ?? "Untitled";

const getGenres = (m: any): string[] => {
  const g = m?.genres ?? m?.genreNames ?? m?.genre;
  if (Array.isArray(g))
    return g
      .map((x: any) => (typeof x === "string" ? x : x?.name))
      .filter(Boolean);
  if (typeof g === "string") return [g];
  return [];
};

const getPosterUrl = (m: any): string | null =>
  m?.posterUrl ??
  m?.poster ??
  m?.imageUrl ??
  m?.backdropUrl ??
  m?.thumbnail ??
  null;

const getSynopsis = (m: any): string =>
  m?.description ?? m?.synopsis ?? m?.overview ?? "";

const getImdb = (m: any): string | null => {
  const v = m?.imdbRating ?? m?.imdb ?? m?.rating;
  return v != null ? String(v) : null;
};

const getRuntime = (m: any): string | null => {
  const v = m?.runtime ?? m?.duration ?? m?.durationMinutes;
  if (v == null) return null;
  if (typeof v === "number") {
    const h = Math.floor(v / 60);
    const min = v % 60;
    return h > 0 ? `${h}h ${min}m` : `${min}m`;
  }
  return String(v);
};

const getId = (m: any, i: number): string | number => m?.id ?? m?.movieId ?? i;

// Deterministic accent so posters without an image still look distinct.
const fallbackAccent = (title: string): string => {
  let hash = 0;
  for (let i = 0; i < title.length; i++)
    hash = title.charCodeAt(i) + ((hash << 5) - hash);
  const hue = Math.abs(hash) % 360;
  return `linear-gradient(155deg, hsl(${hue}, 40%, 20%) 0%, #0c0a10 65%)`;
};

interface MovieSectionProps {
  movies: MovieResponse[];
  loading: boolean;
  movieError: boolean;
  allGenres: string[];
}

export default function MovieSection({
  movies = [],
  loading,
  movieError,
  allGenres = [],
}: MovieSectionProps) {
  const router = useRouter();
  const { theme, t, translateGenre } = useSettings();
  const isDark = theme === "dark";

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTab, setSelectedTab] = useState<"NOW_SHOWING" | "COMING_SOON">(
    "NOW_SHOWING",
  );
  const [selectedGenre, setSelectedGenre] = useState<string>("All");
  const [newsletterEmail, setNewsletterEmail] = useState("");
  const [newsletterSubmitted, setNewsletterSubmitted] = useState(false);

  // ---- ambient scroll-driven color -----------------------------------
  const scrollProgress = useScrollProgress();
  const sceneHue = hueFromProgress(scrollProgress); // indigo → gold sweep

  // ---- UI-only hide list — excludes movies from the hero BANNER ONLY,
  // without touching the database or hiding them from the grid/search.
  const HIDDEN_FROM_HERO_TITLES = useMemo(() => new Set(["titanic"]), []);
  const heroEligibleMovies = useMemo(
    () =>
      (movies || []).filter(
        (movie) =>
          !HIDDEN_FROM_HERO_TITLES.has(
            (movie.title || "").trim().toLowerCase(),
          ),
      ),
    [movies, HIDDEN_FROM_HERO_TITLES],
  );

  // ---- hero rotation (7 movies, 6s interval — smoother than a rapid 2s) ---
  const featured = heroEligibleMovies.slice(0, 7);
  const [activeHeroIndex, setActiveHeroIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (paused || featured.length < 2) return;
    timerRef.current = setInterval(() => {
      setActiveHeroIndex((i) => (i + 1) % featured.length);
    }, 6000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [paused, featured.length]);

  useEffect(() => {
    if (activeHeroIndex >= featured.length) setActiveHeroIndex(0);
  }, [featured.length, activeHeroIndex]);

  const goPrevHero = () =>
    setActiveHeroIndex((i) => (i - 1 + featured.length) % featured.length);
  const goNextHero = () => setActiveHeroIndex((i) => (i + 1) % featured.length);

  const filteredMovies = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return (movies || []).filter((movie) => {
      const title = movie.title?.toLowerCase() || "";
      const matchesSearch = !query || title.includes(query);

      const matchesTab =
        selectedTab === "COMING_SOON"
          ? movie.status === "COMING_SOON"
          : movie.status !== "COMING_SOON";

      const matchesGenre =
        selectedGenre === "All" ||
        (Array.isArray(movie.genres) &&
          movie.genres.some((genre: any) => {
            const genreName = typeof genre === "string" ? genre : genre?.name;
            return genreName === selectedGenre;
          }));

      return matchesSearch && matchesTab && matchesGenre;
    });
  }, [movies, searchQuery, selectedTab, selectedGenre]);

  const handleNewsletterSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!newsletterEmail.trim()) return;
    setNewsletterSubmitted(true);
  };

  const currentHeroMovie = featured[activeHeroIndex];
  const heroPoster = currentHeroMovie ? getPosterUrl(currentHeroMovie) : null;
  const heroAccent = currentHeroMovie
    ? fallbackAccent(getTitle(currentHeroMovie))
    : "";
  const heroImdb = currentHeroMovie ? getImdb(currentHeroMovie) : null;
  const heroRuntime = currentHeroMovie ? getRuntime(currentHeroMovie) : null;
  const heroGenres = currentHeroMovie ? getGenres(currentHeroMovie) : [];
  const heroSynopsis = currentHeroMovie ? getSynopsis(currentHeroMovie) : "";
  // 5-star rating derived from a /10 score; defaults to a full row when no score exists.
  const heroStarCount = heroImdb
    ? Math.max(0, Math.min(5, Math.round(parseFloat(heroImdb) / 2)))
    : 5;

  // ---- scroll reveals (one per section, not per card) ------------------
  const heroReveal = useReveal<HTMLDivElement>({ threshold: 0.2 });
  const gridHeaderReveal = useReveal<HTMLDivElement>();
  const gridReveal = useReveal<HTMLDivElement>({ threshold: 0.05 });
  const featuresReveal = useReveal<HTMLDivElement>();
  const newsletterReveal = useReveal<HTMLDivElement>();

  // ---- subtle tilt on the hero copy — answers the user's own cursor -----
  const posterTilt = useTilt<HTMLDivElement>(4);

  return (
    <div style={{ ["--scene-hue" as any]: sceneHue }} className="relative">
      <style jsx global>{`
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
        .reveal-up {
          opacity: 0;
          transform: translateY(22px);
          transition:
            opacity 0.7s cubic-bezier(0.22, 1, 0.36, 1),
            transform 0.7s cubic-bezier(0.22, 1, 0.36, 1);
        }
        .reveal-up.is-visible {
          opacity: 1;
          transform: translateY(0);
        }
        .reveal-card {
          opacity: 0;
          transform: translateY(16px) scale(0.985);
          transition:
            opacity 0.55s cubic-bezier(0.22, 1, 0.36, 1),
            transform 0.55s cubic-bezier(0.22, 1, 0.36, 1);
        }
        .reveal-card.is-visible {
          opacity: 1;
          transform: translateY(0) scale(1);
        }
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .film-grain {
          background-image: radial-gradient(
            rgba(255, 255, 255, 0.045) 1px,
            transparent 1px
          );
          background-size: 3px 3px;
          animation: grain-shift 1.2s steps(4) infinite;
        }
        .tab-underline {
          transition:
            transform 0.4s cubic-bezier(0.22, 1, 0.36, 1),
            width 0.4s cubic-bezier(0.22, 1, 0.36, 1);
        }
        @keyframes hero-glow-drift {
          0%,
          100% {
            transform: translate(-50%, -50%) scale(1);
          }
          50% {
            transform: translate(-50%, -50%) scale(1.12);
          }
        }
        .hero-glow {
          animation: hero-glow-drift 12s ease-in-out infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .hero-glow,
          .film-grain {
            animation: none;
          }
        }
      `}</style>

      {/* ambient film-grain overlay, fixed, purely atmospheric */}
      <div
        aria-hidden
        className="film-grain pointer-events-none fixed inset-0 z-[1] opacity-[0.35] mix-blend-overlay"
      />

      {/* ============================
          HERO — Concept B: centered marquee, no side poster.
          Copy sits centered over a soft ambient glow; the movie's own
          poster is only used as a heavily blurred, dimmed backdrop layer
          (purely atmospheric). The thumbnail strip below uses the real
          poster images at object-cover with no blur/scale duplication, so
          they stay sharp instead of looking soft.
      ============================ */}
      {selectedTab === "NOW_SHOWING" &&
        !searchQuery &&
        !loading &&
        !movieError &&
        featured.length > 0 && (
          <div
            className="relative px-3 sm:px-6 md:px-10 pt-4 sm:pt-6 pb-10 md:pb-14"
            style={{ background: "#050505" }}
          >
            <div
              onMouseEnter={() => setPaused(true)}
              onMouseLeave={() => setPaused(false)}
              data-aos="fade-up"
              data-aos-duration="1000"
              data-aos-delay="100"
              data-aos-once="true"
              style={{
                background: "#0A0908",
                fontFamily: "'Work Sans', sans-serif",
              }}
              className="relative max-w-[1100px] mx-auto w-full overflow-hidden rounded-[20px] sm:rounded-[28px] shadow-[0_30px_80px_-20px_rgba(0,0,0,0.85)] px-5 sm:px-12 py-14 sm:py-20 text-center"
            >
              <style>{`@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Work+Sans:wght@400;500;600;700;800&display=swap');`}</style>

              {/* atmospheric backdrop — intentionally blurred, never the
                  image the viewer is meant to look at closely */}
              {heroPoster ? (
                <div className="absolute inset-0 overflow-hidden" aria-hidden>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    key={currentHeroMovie?.id ?? activeHeroIndex}
                    src={heroPoster}
                    alt=""
                    className="w-full h-full object-cover scale-125 blur-2xl opacity-25"
                  />
                  <div
                    className="absolute inset-0"
                    style={{
                      background:
                        "radial-gradient(120% 100% at 50% 0%, rgba(10,9,8,0.4) 0%, #0A0908 75%)",
                    }}
                  />
                </div>
              ) : (
                <div
                  className="absolute inset-0"
                  style={{ background: heroAccent }}
                  aria-hidden
                />
              )}

              {/* soft ambient glow, hue tied to scroll position */}
              <div
                aria-hidden
                className="hero-glow pointer-events-none absolute left-1/2 top-1/2 w-[130%] h-[130%] rounded-full blur-3xl opacity-25"
                style={{
                  background:
                    "radial-gradient(circle, hsla(var(--scene-hue), 65%, 50%, 0.55), transparent 65%)",
                }}
              />

              <div
                ref={heroReveal.ref}
                className={`reveal-up ${heroReveal.visible ? "is-visible" : ""} relative z-10`}
              >
                <div
                  ref={posterTilt.ref}
                  onMouseMove={posterTilt.onMouseMove}
                  onMouseLeave={posterTilt.onMouseLeave}
                  style={posterTilt.style}
                  className="max-w-xl mx-auto"
                >
                  <div className="flex items-center justify-center gap-1 mb-5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        size={16}
                        color="#D9A441"
                        fill={i < heroStarCount ? "#D9A441" : "none"}
                      />
                    ))}
                  </div>

                  <div
                    className="inline-flex items-center gap-2 px-3 py-1 rounded-full mb-5"
                    style={{
                      background: "rgba(217,164,65,0.12)",
                      border: "1px solid rgba(217,164,65,0.3)",
                    }}
                  >
                    <span
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ background: "#D9A441" }}
                    />
                    <span
                      className="text-xs font-semibold"
                      style={{ color: "#D9A441" }}
                    >
                      {t("nowShowing")}
                    </span>
                  </div>

                  <h1
                    style={{ color: "#F5F1E8" }}
                    className="text-4xl sm:text-6xl md:text-7xl font-bold leading-[1.05] mb-4 break-words"
                  >
                    {getTitle(currentHeroMovie)}
                  </h1>

                  {(heroGenres.length > 0 || heroRuntime) && (
                    <div
                      className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-xs font-semibold mb-5"
                      style={{ color: "#9C97A3" }}
                    >
                      {heroGenres.map((g, i) => (
                        <span key={g} className="flex items-center gap-2">
                          {i > 0 && <span style={{ color: "#54505C" }}>•</span>}
                          {translateGenre(g)}
                        </span>
                      ))}
                      {heroRuntime && (
                        <>
                          {heroGenres.length > 0 && (
                            <span style={{ color: "#54505C" }}>•</span>
                          )}
                          <span className="flex items-center gap-1">
                            <Clock size={12} />
                            {heroRuntime}
                          </span>
                        </>
                      )}
                    </div>
                  )}

                  {heroSynopsis && (
                    <p
                      className="text-sm leading-relaxed line-clamp-3 mb-8"
                      style={{ color: "#ACA8B4" }}
                    >
                      {heroSynopsis}
                    </p>
                  )}

                  <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4">
                    <button
                      type="button"
                      onClick={() =>
                        router.push(`/customer/movies/${currentHeroMovie.id}`)
                      }
                      className="flex items-center gap-2 px-6 sm:px-7 py-3 rounded-full text-sm font-bold transition-transform hover:scale-[1.03] cursor-pointer"
                      style={{ background: "#C0392B", color: "#F5F1E8" }}
                    >
                      <Play size={16} fill="#F5F1E8" />
                      {t("buyTicket")}
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        router.push(`/customer/movies/${currentHeroMovie.id}`)
                      }
                      className="flex items-center gap-2 px-6 sm:px-7 py-3 rounded-full border text-sm font-bold transition-colors cursor-pointer hover:bg-white/5"
                      style={{
                        borderColor: "rgba(255,255,255,0.25)",
                        color: "#F5F1E8",
                      }}
                    >
                      <Plus size={16} />
                      {t("watchTrailer")}
                    </button>
                  </div>
                </div>

                {/* thumbnail strip — sharp, real poster images, plain
                    object-cover, no blur/scale duplication */}
                {featured.length > 1 && (
                  <div className="flex items-center justify-center gap-2 sm:gap-3 mt-10 sm:mt-14">
                    <button
                      onClick={goPrevHero}
                      aria-label="Previous movie"
                      className="hidden sm:flex items-center justify-center w-9 h-9 rounded-full border shrink-0 transition-colors cursor-pointer hover:bg-white/5"
                      style={{
                        borderColor: "rgba(255,255,255,0.2)",
                        color: "#9C97A3",
                      }}
                    >
                      <ChevronLeft size={16} />
                    </button>

                    <div className="flex items-center gap-2.5 sm:gap-3 overflow-x-auto hide-scrollbar py-2 px-1 max-w-full">
                      {featured.map((m, i) => {
                        const thumb = getPosterUrl(m);
                        const isActive = i === activeHeroIndex;
                        return (
                          <button
                            key={getId(m, i)}
                            onClick={() => setActiveHeroIndex(i)}
                            aria-label={`Show ${getTitle(m)}`}
                            className="shrink-0 rounded-lg overflow-hidden relative cursor-pointer transition-all duration-300"
                            style={{
                              width: 60,
                              height: 90,
                              border: isActive
                                ? "2px solid #D9A441"
                                : "2px solid rgba(255,255,255,0.1)",
                              opacity: isActive ? 1 : 0.55,
                              transform: isActive ? "translateY(-4px)" : "none",
                            }}
                          >
                            {thumb ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={thumb}
                                alt={getTitle(m)}
                                loading="lazy"
                                className="absolute inset-0 w-full h-full object-cover"
                              />
                            ) : (
                              <div
                                className="w-full h-full flex items-center justify-center"
                                style={{
                                  background: fallbackAccent(getTitle(m)),
                                }}
                              >
                                <Film size={16} color="rgba(255,255,255,0.3)" />
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>

                    <button
                      onClick={goNextHero}
                      aria-label="Next movie"
                      className="hidden sm:flex items-center justify-center w-9 h-9 rounded-full shrink-0 cursor-pointer transition-transform hover:scale-105"
                      style={{ background: "#C0392B", color: "#F5F1E8" }}
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

      {/* ============================
          MAIN CONTENT
      ============================ */}
      <div
        className="max-w-7xl mx-auto px-4 sm:px-8 pt-14 space-y-10 relative"
        style={{
          background: isDark
            ? `radial-gradient(ellipse 700px 400px at 90% 0%, hsla(var(--scene-hue), 60%, 30%, 0.08), transparent 70%)`
            : undefined,
        }}
      >
        <div
          ref={gridHeaderReveal.ref}
          className={`reveal-up ${gridHeaderReveal.visible ? "is-visible" : ""} flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-6 ${
            isDark ? "border-slate-800" : "border-slate-200"
          }`}
        >
          <div>
            <h2
              className={`text-3xl font-black tracking-tight flex items-center gap-2.5 ${
                isDark ? "text-white" : "text-slate-900"
              }`}
              style={{
                fontFamily: "'Bebas Neue', sans-serif",
                letterSpacing: "0.02em",
              }}
            >
              <Film className="h-7 w-7" style={{ color: "#D9A441" }} />
              {t("cinematicReleases")}
            </h2>
            <p
              className={`text-xs mt-1 font-medium ${
                isDark ? "text-slate-400" : "text-slate-500"
              }`}
            >
              {t("exploreReleases")}
            </p>
          </div>

          <div className="relative w-full md:w-72">
            <Search
              className={`absolute left-3.5 top-3 h-4 w-4 ${
                isDark ? "text-slate-500" : "text-slate-400"
              }`}
            />
            <input
              type="text"
              placeholder={t("searchMovies")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full rounded-full border px-4 py-2.5 pl-10 text-xs font-bold focus:outline-none transition ${
                isDark
                  ? "border-white/10 bg-white/[0.04] text-white placeholder-slate-500 focus:border-amber-500"
                  : "border-slate-200 bg-white text-slate-900 placeholder-slate-400 focus:border-amber-500 shadow-sm"
              }`}
            />
          </div>
        </div>

        {/* TABS — sliding underline instead of two separate pills */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="relative inline-flex items-center gap-8 border-b border-white/10">
              {(["NOW_SHOWING", "COMING_SOON"] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setSelectedTab(tab)}
                  className={`relative pb-3 text-sm font-bold tracking-wide transition-colors cursor-pointer ${
                    selectedTab === tab
                      ? isDark
                        ? "text-white"
                        : "text-slate-900"
                      : isDark
                        ? "text-slate-500 hover:text-slate-300"
                        : "text-slate-400 hover:text-slate-600"
                  }`}
                >
                  {tab === "NOW_SHOWING" ? t("nowShowing") : t("comingSoon")}
                  {selectedTab === tab && (
                    <span
                      className="tab-underline absolute left-0 -bottom-[1px] h-[3px] w-full rounded-full"
                      style={{ background: "#D9A441" }}
                    />
                  )}
                </button>
              ))}
            </div>
          </div>

          {allGenres.length > 1 && (
            <div
              className={`hidden sm:flex relative items-center border rounded-2xl p-3 backdrop-blur-md ${
                isDark
                  ? "bg-slate-900/40 border-white/10"
                  : "bg-white border-slate-200 shadow-sm"
              }`}
            >
              <div
                className={`flex items-center gap-2 shrink-0 pr-3 border-r text-xs font-black uppercase tracking-wider mr-1 ${
                  isDark
                    ? "border-white/10 text-slate-300"
                    : "border-slate-200 text-slate-700"
                }`}
              >
                <div className="p-1.5 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20">
                  <Compass className="h-4 w-4" />
                </div>
                <span>{t("genres")}</span>
              </div>
              <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar py-1 w-full pl-2">
                {allGenres.map((genre) => {
                  const isSelected = selectedGenre === genre;
                  return (
                    <button
                      key={genre}
                      type="button"
                      onClick={() => setSelectedGenre(genre)}
                      className={`px-4 py-2 rounded-xl text-xs font-black tracking-wide transition-all duration-300 cursor-pointer shrink-0 border ${
                        isSelected
                          ? "text-slate-950 border-amber-500 shadow-lg scale-105"
                          : isDark
                            ? "bg-white/[0.02] border-white/10 text-slate-400 hover:text-white hover:bg-white/[0.06]"
                            : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-950 shadow-sm"
                      }`}
                      style={isSelected ? { background: "#D9A441" } : undefined}
                    >
                      {genre === "All" ? t("all") : translateGenre(genre)}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* LOADING / ERROR / GRID */}
        {loading ? (
          // Skeleton cards removed. A compact spinner keeps the page height
          // steady so the footer does not jump while movies load.
          <div className="flex min-h-[320px] items-center justify-center gap-2 text-xs text-slate-500 font-bold">
            <Loader2
              className="h-4 w-4 animate-spin"
              style={{ color: "#D9A441" }}
            />
            <span>{t("loadingMovies")}</span>
          </div>
        ) : movieError ? (
          <div
            className={`p-12 rounded-3xl border text-center space-y-3 ${
              isDark
                ? "border-amber-900/50 bg-amber-950/10"
                : "border-amber-200 bg-amber-50 shadow-sm"
            }`}
          >
            <Film className="h-10 w-10 mx-auto" style={{ color: "#D9A441" }} />
            <p
              className={`text-sm font-bold ${isDark ? "text-white" : "text-slate-900"}`}
            >
              {t("couldNotLoadMovies")}
            </p>
            <p className="text-xs text-slate-500 font-medium">
              {t("movieServiceError")}
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="inline-flex items-center rounded-full px-5 py-2.5 text-xs font-black text-slate-950 transition cursor-pointer shadow-lg"
              style={{ background: "#D9A441" }}
            >
              {t("tryAgain")}
            </button>
          </div>
        ) : filteredMovies.length > 0 ? (
          /* Mobile: 2 compact cards per row (matches the reference app).
             sm: 2, md: 3, lg: 4 — unchanged desktop layout, just a tighter
             gap on small screens so two cards fit comfortably. */
          <div
            ref={gridReveal.ref}
            className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6 pt-2"
          >
            {filteredMovies.map((movie, index) => (
              <Link
                key={movie.id}
                href={`/customer/movies/${movie.id}`}
                data-aos="fade-up"
                data-aos-delay={index * 100}
                data-aos-duration="700"
                className={`group flex flex-col justify-between rounded-xl sm:rounded-2xl border overflow-hidden shadow-lg sm:shadow-xl hover:-translate-y-1.5 transition-all duration-300 ease-out cursor-pointer ${
                  isDark
                    ? "border-white/10 bg-slate-900/60 hover:border-amber-500/40"
                    : "border-slate-200 bg-white hover:border-amber-500/40"
                }`}
              >
                <div
                  className={`relative aspect-[2/3] w-full overflow-hidden ${isDark ? "bg-slate-950" : "bg-slate-100"}`}
                >
                  {movie.posterUrl ? (
                    <img
                      src={movie.posterUrl}
                      alt={movie.title || "Movie poster"}
                      className="h-full w-full object-cover group-hover:scale-105 transition duration-500 ease-out"
                    />
                  ) : (
                    <div
                      className={`flex h-full w-full items-center justify-center ${isDark ? "text-slate-600" : "text-slate-400"}`}
                    >
                      <Film className="h-8 w-8 sm:h-10 sm:w-10" />
                    </div>
                  )}
                  <div
                    className="absolute inset-x-0 bottom-0 h-16 opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{
                      background:
                        "linear-gradient(to top, rgba(0,0,0,0.6), transparent)",
                    }}
                  />
                  {movie.ageRating && (
                    <span
                      className="absolute top-1.5 right-1.5 sm:top-3 sm:right-3 px-1.5 sm:px-2.5 py-0.5 sm:py-1 rounded-md sm:rounded-lg bg-black/70 backdrop-blur-md text-[8px] sm:text-[10px] font-black border border-amber-400/30"
                      style={{ color: "#D9A441" }}
                    >
                      {movie.ageRating}
                    </span>
                  )}
                </div>

                {/* perforated ticket-stub divider */}
                <div className="relative">
                  <div
                    className={`h-0 border-t border-dashed ${isDark ? "border-white/15" : "border-slate-300"}`}
                  />
                  <span
                    className={`absolute -left-2.5 -top-1.5 w-3 h-3 rounded-full ${isDark ? "bg-[#0b0c10]" : "bg-slate-50"}`}
                  />
                  <span
                    className={`absolute -right-2.5 -top-1.5 w-3 h-3 rounded-full ${isDark ? "bg-[#0b0c10]" : "bg-slate-50"}`}
                  />
                </div>

                <div className="p-2 sm:p-5 space-y-1.5 sm:space-y-3 flex-1 flex flex-col justify-between">
                  <div className="space-y-1 sm:space-y-1.5">
                    <div className="flex flex-wrap gap-1">
                      {movie.genres
                        ?.slice(0, 2)
                        .map((genre: any, genIndex: number) => {
                          const genreName =
                            typeof genre === "string" ? genre : genre?.name;
                          return (
                            <span
                              key={
                                genre?.id ||
                                `${genreName || "genre"}-${genIndex}`
                              }
                              className="text-[8px] sm:text-[10px] font-black px-1.5 sm:px-2 py-0.5 rounded border border-dashed"
                              style={{
                                borderColor: "rgba(217,164,65,0.35)",
                                color: "#D9A441",
                              }}
                            >
                              {genreName ? translateGenre(genreName) : ""}
                            </span>
                          );
                        })}
                    </div>
                    <h3
                      className={`text-[11px] sm:text-base font-black transition line-clamp-1 ${isDark ? "text-white" : "text-slate-900"}`}
                    >
                      {movie.title}
                    </h3>
                  </div>

                  <div
                    className={`flex items-center justify-between pt-1.5 sm:pt-3 border-t text-[10px] sm:text-xs ${
                      isDark
                        ? "border-white/5 text-slate-400"
                        : "border-slate-200/60 text-slate-500"
                    }`}
                  >
                    <span className="flex items-center gap-1 font-mono font-bold">
                      <Clock
                        className={`h-3 w-3 sm:h-3.5 sm:w-3.5 ${isDark ? "text-slate-500" : "text-slate-400"}`}
                      />
                      {movie.durationMinutes}m
                    </span>
                    <span
                      className="flex items-center gap-1 font-black group-hover:translate-x-1 transition"
                      style={{ color: "#D9A441" }}
                    >
                      <span>
                        {movie.status === "COMING_SOON"
                          ? t("details")
                          : t("bookNow")}
                      </span>
                      <ArrowRight className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div
            className={`p-12 rounded-3xl border text-center text-xs space-y-2 ${
              isDark
                ? "border-white/10 bg-white/[0.02] text-slate-400"
                : "border-slate-200 bg-white text-slate-500 shadow-sm"
            }`}
          >
            <Film
              className={`h-10 w-10 mx-auto mb-1 ${isDark ? "text-slate-600" : "text-slate-400"}`}
            />
            <p
              className={`text-sm font-black ${isDark ? "text-white" : "text-slate-900"}`}
            >
              {t("noMoviesFound")}
            </p>
            <p className="font-medium">{t("noMoviesDescription")}</p>
          </div>
        )}

        {/* FEATURES */}
        <div
          ref={featuresReveal.ref}
          className={`reveal-up ${featuresReveal.visible ? "is-visible" : ""} py-16 border-t ${
            isDark ? "border-white/10" : "border-slate-200"
          }`}
        >
          <div className="text-center max-w-xl mx-auto mb-10 space-y-2">
            <h2
              className={`text-3xl ${isDark ? "text-white" : "text-slate-900"}`}
              style={{
                fontFamily: "'Bebas Neue', sans-serif",
                letterSpacing: "0.02em",
              }}
            >
              {t("whyBook")}
            </h2>
            <p
              className={`text-xs font-medium ${isDark ? "text-slate-400" : "text-slate-500"}`}
            >
              {t("whyBookDescription")}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {FEATURES.map((feature) => {
              const Icon = feature.icon;
              return (
                <div
                  key={feature.titleKey}
                  className={`rounded-2xl border p-6 text-center space-y-3 transition-all duration-300 hover:-translate-y-1 ${
                    isDark
                      ? "border-white/10 bg-slate-900/50"
                      : "border-slate-200 bg-white shadow-sm"
                  }`}
                >
                  <div
                    className="mx-auto flex h-11 w-11 items-center justify-center rounded-full border"
                    style={{
                      background: "rgba(217,164,65,0.1)",
                      borderColor: "rgba(217,164,65,0.25)",
                      color: "#D9A441",
                    }}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3
                    className={`text-sm font-black ${isDark ? "text-white" : "text-slate-900"}`}
                  >
                    {t(feature.titleKey)}
                  </h3>
                  <p
                    className={`text-xs leading-relaxed font-medium ${isDark ? "text-slate-400" : "text-slate-500"}`}
                  >
                    {t(feature.descKey)}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* NEWSLETTER */}
        <div
          ref={newsletterReveal.ref}
          className={`reveal-up ${newsletterReveal.visible ? "is-visible" : ""} rounded-3xl border p-8 sm:p-12 text-center space-y-4 mb-8 relative overflow-hidden ${
            isDark ? "border-white/10" : "border-slate-200 shadow-sm"
          }`}
          style={{
            background: isDark
              ? `linear-gradient(120deg, hsla(var(--scene-hue), 55%, 22%, 0.35), hsla(calc(var(--scene-hue) + 120), 55%, 24%, 0.2))`
              : `linear-gradient(120deg, hsla(var(--scene-hue), 55%, 88%, 0.6), hsla(calc(var(--scene-hue) + 120), 55%, 90%, 0.4))`,
          }}
        >
          <h2
            className={`text-2xl sm:text-3xl ${isDark ? "text-white" : "text-slate-900"}`}
            style={{
              fontFamily: "'Bebas Neue', sans-serif",
              letterSpacing: "0.02em",
            }}
          >
            {t("whyBook")}
          </h2>
          <p
            className={`text-xs max-w-md mx-auto font-medium ${isDark ? "text-slate-400" : "text-slate-500"}`}
          >
            {t("neverMissDescription")}
          </p>

          {newsletterSubmitted ? (
            <p className="text-xs font-bold text-emerald-500 pt-2">
              🎉 {t("subscribed")}
            </p>
          ) : (
            <form
              onSubmit={handleNewsletterSubmit}
              className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto pt-2"
            >
              <input
                type="email"
                required
                value={newsletterEmail}
                onChange={(e) => setNewsletterEmail(e.target.value)}
                placeholder="you@email.com"
                className={`flex-1 rounded-full border px-4 py-2.5 text-xs font-bold focus:outline-none ${
                  isDark
                    ? "border-white/10 bg-slate-950 text-white placeholder-slate-500 focus:border-amber-500"
                    : "border-slate-200 bg-white text-slate-900 placeholder-slate-400 focus:border-amber-500 shadow-sm"
                }`}
              />
              <button
                type="submit"
                className="rounded-full px-6 py-2.5 text-xs font-black text-slate-950 transition cursor-pointer shadow-lg"
                style={{ background: "#D9A441" }}
              >
                {t("subscribe")}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
