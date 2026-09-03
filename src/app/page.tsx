"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  Film,
  Clock,
  ArrowRight,
  Loader2,
  Search,
  Play,
  Ticket,
  ChevronLeft,
  ChevronRight,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  Sparkles,
  Armchair,
  Compass,
} from "lucide-react";

import MovieService from "@/app/service/movie.service";
import GenreService from "@/app/service/genre.service";
import { MovieResponse } from "@/app/types/api.types";
import Toast from "@/app/components/Toast";
import { useSettings } from "@/app/context/SettingsContext";

const extractArray = <T,>(res: any): T[] => {
  if (Array.isArray(res)) return res;
  if (Array.isArray(res?.content)) return res.content;
  if (Array.isArray(res?.data)) return res.data;
  if (Array.isArray(res?.body?.data)) return res.body.data;
  if (Array.isArray(res?.data?.content)) return res.data.content;
  if (Array.isArray(res?.body?.content)) return res.body.content;

  return [];
};

const FEATURES = [
  {
    icon: Ticket,
    titleKey: "instantETickets",
    descKey: "instantETicketsDescription",
  },
  {
    icon: Sparkles,
    titleKey: "dolbyAtmos",
    descKey: "dolbyAtmosDescription",
  },
  {
    icon: Armchair,
    titleKey: "bestSeat",
    descKey: "bestSeatDescription",
  },
] as const;

const TARGET_HERO_TITLES = [
  "The Silent Monastery",
  "Iron Tide",
  "Crimson Orchard",
  "Harvest",
];

export default function CustomerCatalogPage() {
  const router = useRouter();

  const {
    theme,
    language,
    t,
    translateGenre,
  } = useSettings();

  const isDark = theme === "dark";

  const [movies, setMovies] = useState<MovieResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [movieError, setMovieError] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");

  const [selectedTab, setSelectedTab] = useState<
    "NOW_SHOWING" | "COMING_SOON"
  >("NOW_SHOWING");

  const [selectedGenre, setSelectedGenre] =
    useState<string>("All");

  const [allGenres, setAllGenres] =
    useState<string[]>(["All"]);

  const [newsletterEmail, setNewsletterEmail] =
    useState("");

  const [newsletterSubmitted, setNewsletterSubmitted] =
    useState(false);

  const [heroIndex, setHeroIndex] = useState(0);

  const [toast, setToast] = useState<{
    message: string | null;
    type: "success" | "error" | "info";
  }>({
    message: null,
    type: "success",
  });

  /*
   * ============================
   * LOAD MOVIES
   * ============================
   */
  useEffect(() => {
    let mounted = true;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    async function loadMovies() {
      setLoading(true);
      setMovieError(false);

      try {
        const timeoutPromise = new Promise<never>(
          (_, reject) => {
            timeoutId = setTimeout(() => {
              reject(
                new Error("Movie request timeout")
              );
            }, 15000);
          }
        );

        const requestPromise =
          MovieService.getAllMovies({
            page: 0,
            size: 50,
            sortBy: "createdAt",
            direction: "desc",
          });

        const res = await Promise.race([
          requestPromise,
          timeoutPromise,
        ]);

        if (!mounted) return;

        const movieList =
          extractArray<MovieResponse>(res);

        setMovies(movieList);
      } catch (error) {
        console.error(
          "Failed to load movies:",
          error
        );

        if (!mounted) return;

        setMovieError(true);
        setMovies([]);

        setToast({
          message:
            "Unable to load movies. Please try again.",
          type: "error",
        });
      } finally {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }

        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadMovies();

    return () => {
      mounted = false;

      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, []);

  /*
   * ============================
   * LOAD GENRES
   * ============================
   */
  useEffect(() => {
    let mounted = true;

    async function loadGenres() {
      try {
        const res =
          await GenreService.getAllGenres(
            0,
            100,
            "name",
            "asc"
          );

        if (!mounted) return;

        const list = extractArray<any>(res);

        const names = list
          .map((genre: any) => {
            if (typeof genre === "string") {
              return genre;
            }

            return genre?.name;
          })
          .filter(
            (name): name is string =>
              typeof name === "string" &&
              name.trim().length > 0
          );

        setAllGenres([
          "All",
          ...Array.from(new Set(names)),
        ]);
      } catch (error) {
        console.warn(
          "Could not load genres:",
          error
        );
      }
    }

    loadGenres();

    return () => {
      mounted = false;
    };
  }, []);

  /*
   * ============================
   * HERO MOVIES
   * ============================
   */
  const heroMovies = useMemo(() => {
    const matched = movies.filter((movie) =>
      TARGET_HERO_TITLES.some((title) =>
        movie.title
          ?.toLowerCase()
          .includes(title.toLowerCase())
      )
    );

    if (matched.length > 0) {
      return matched.slice(0, 4);
    }

    return movies
      .filter(
        (movie) =>
          movie.status !== "COMING_SOON"
      )
      .slice(0, 4);
  }, [movies]);

  /*
   * ============================
   * HERO AUTO SLIDER
   * ============================
   */
  useEffect(() => {
    if (heroMovies.length <= 1) {
      return;
    }

    const timer = window.setInterval(() => {
      setHeroIndex((prev) => {
        return (
          (prev + 1) % heroMovies.length
        );
      });
    }, 6000);

    return () => {
      window.clearInterval(timer);
    };
  }, [heroMovies]);

  /*
   * ============================
   * RESET HERO INDEX
   * ============================
   */
  useEffect(() => {
    if (heroMovies.length === 0) {
      setHeroIndex(0);
      return;
    }

    if (heroIndex >= heroMovies.length) {
      setHeroIndex(0);
    }
  }, [
    heroMovies.length,
    heroIndex,
  ]);

  /*
   * ============================
   * FILTER MOVIES
   * ============================
   */
  const filteredMovies = useMemo(() => {
    const query =
      searchQuery.trim().toLowerCase();

    return movies.filter((movie) => {
      const title =
        movie.title?.toLowerCase() || "";

      const matchesSearch =
        !query ||
        title.includes(query);

      const matchesTab =
        selectedTab === "COMING_SOON"
          ? movie.status === "COMING_SOON"
          : movie.status !==
            "COMING_SOON";

      const matchesGenre =
        selectedGenre === "All" ||
        (Array.isArray(movie.genres) &&
          movie.genres.some(
            (genre: any) => {
              const genreName =
                typeof genre === "string"
                  ? genre
                  : genre?.name;

              return (
                genreName ===
                selectedGenre
              );
            }
          ));

      return (
        matchesSearch &&
        matchesTab &&
        matchesGenre
      );
    });
  }, [
    movies,
    searchQuery,
    selectedTab,
    selectedGenre,
  ]);

  const currentHero =
    heroMovies[heroIndex] ||
    heroMovies[0];

  /*
   * ============================
   * NEWSLETTER
   * ============================
   */
  const handleNewsletterSubmit = (
    e: React.FormEvent<HTMLFormElement>
  ) => {
    e.preventDefault();

    if (!newsletterEmail.trim()) {
      return;
    }

    setNewsletterSubmitted(true);

    setToast({
      message:
        "Thanks! You're subscribed to CineMax updates.",
      type: "success",
    });
  };

  /*
   * ============================
   * RESET SELECTED GENRE
   * ============================
   */
  useEffect(() => {
    if (
      selectedGenre !== "All" &&
      !allGenres.includes(selectedGenre)
    ) {
      setSelectedGenre("All");
    }
  }, [
    allGenres,
    selectedGenre,
  ]);

  /*
   * ============================
   * RENDER
   * ============================
   */
  return (
    <div
      className={`min-h-screen flex flex-col justify-between transition-colors duration-300 ${
        isDark
          ? "bg-slate-950 text-slate-100 selection:bg-red-600 selection:text-white"
          : "bg-slate-50 text-slate-900 selection:bg-red-600 selection:text-white"
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

      <style jsx global>{`
        ::-webkit-scrollbar {
          display: none;
        }
        html, body {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }

        @keyframes heroZoom {
          from {
            transform: scale(1);
          }

          to {
            transform: scale(1.09);
          }
        }

        .hero-zoom-img {
          animation: heroZoom 7s ease-out forwards;
        }

        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }

        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>

      <div>
        {/* ============================
            HERO
        ============================ */}
        {currentHero &&
          selectedTab ===
            "NOW_SHOWING" &&
          !searchQuery && (
            <div className="relative h-[calc(100vh-4rem)] min-h-[600px] w-full overflow-hidden border-b border-slate-800/80 bg-slate-950">
              <div className="absolute inset-0 overflow-hidden flex items-center justify-center bg-slate-950">
                {currentHero.posterUrl ? (
                  <img
                    key={currentHero.id}
                    src={
                      currentHero.posterUrl
                    }
                    alt={
                      currentHero.title ||
                      "Movie"
                    }
                    className="hero-zoom-img w-full h-full object-cover object-top"
                  />
                ) : (
                  <div className="flex items-center justify-center w-full h-full bg-slate-950">
                    <Film className="h-20 w-20 text-slate-800" />
                  </div>
                )}

                <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/40 to-transparent" />

                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-slate-950/10" />
              </div>

              {/* HERO ARROWS */}
              {heroMovies.length > 1 && (
                <>
                  <button
                    type="button"
                    aria-label="Previous movie"
                    onClick={() =>
                      setHeroIndex(
                        (prev) =>
                          prev === 0
                            ? heroMovies.length -
                              1
                            : prev - 1
                      )
                    }
                    className="absolute left-6 top-1/2 -translate-y-1/2 p-3 rounded-full bg-slate-900/80 border border-slate-700/60 text-white hover:bg-red-600 transition backdrop-blur-md cursor-pointer z-20 shadow-2xl"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>

                  <button
                    type="button"
                    aria-label="Next movie"
                    onClick={() =>
                      setHeroIndex(
                        (prev) =>
                          (prev + 1) %
                          heroMovies.length
                      )
                    }
                    className="absolute right-6 top-1/2 -translate-y-1/2 p-3 rounded-full bg-slate-900/80 border border-slate-700/60 text-white hover:bg-red-600 transition backdrop-blur-md cursor-pointer z-20 shadow-2xl"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </>
              )}

              <div className="relative z-10 max-w-7xl mx-auto h-full flex flex-col justify-end p-6 sm:p-12 pb-12 space-y-4">
                {/* HERO GENRES */}
                <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-300">
                  {currentHero.genres?.map(
                    (
                      genre: any,
                      index: number
                    ) => {
                      const genreName =
                        typeof genre ===
                        "string"
                          ? genre
                          : genre?.name;

                      return (
                        <span
                          key={
                            genre?.id ||
                            `${genreName || "genre"}-${index}`
                          }
                          className="flex items-center"
                        >
                          {index > 0 && (
                            <span className="mx-2 text-slate-500">
                              |
                            </span>
                          )}

                          <span className="text-amber-400 font-bold uppercase tracking-wider">
                            {genreName
                              ? translateGenre(
                                  genreName
                                )
                              : ""}
                          </span>
                        </span>
                      );
                    }
                  )}
                </div>

                {/* HERO TITLE */}
                <h1 className="text-4xl sm:text-6xl font-black text-white tracking-tight max-w-3xl drop-shadow-2xl">
                  {currentHero.title}
                </h1>

                {/* HERO BUTTONS */}
                <div className="flex flex-wrap items-center gap-5 pt-2">
                  <button
                    type="button"
                    onClick={() =>
                      router.push(
                        `/customer/movies/${currentHero.id}`
                      )
                    }
                    className="flex items-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 px-6 py-3.5 text-xs font-black transition shadow-xl cursor-pointer"
                  >
                    <Play className="h-4 w-4 fill-slate-950" />
                    <span>
                      {t("watchTrailer")}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      router.push(
                        `/customer/movies/${currentHero.id}`
                      )
                    }
                    className="flex items-center gap-2 rounded-xl bg-red-600 hover:bg-red-500 text-white px-6 py-3.5 text-xs font-black transition shadow-xl shadow-red-600/30 cursor-pointer"
                  >
                    <Ticket className="h-4 w-4" />
                    <span>
                      {t("buyTicket")}
                    </span>
                  </button>
                </div>

                {/* HERO RATINGS */}
                <div className="flex items-center justify-between pt-6 border-t border-slate-800/60 max-w-xl">
                  <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2">
                      <div className="h-10 w-10 rounded-full border-2 border-amber-500 flex items-center justify-center font-mono font-bold text-xs text-amber-400 bg-slate-950/60">
                        7.8
                      </div>

                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                        {t("imdbRating")}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="h-10 w-10 rounded-full border-2 border-cyan-400 flex items-center justify-center font-mono font-bold text-xs text-cyan-400 bg-slate-950/60">
                        85%
                      </div>

                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                        {t("rottenRating")}
                      </span>
                    </div>
                  </div>

                  {/* HERO DOTS */}
                  <div className="flex items-center gap-1.5">
                    {heroMovies.map(
                      (movie, index) => (
                        <button
                          key={
                            movie.id ||
                            index
                          }
                          type="button"
                          aria-label={`Go to movie ${
                            index + 1
                          }`}
                          onClick={() =>
                            setHeroIndex(
                              index
                            )
                          }
                          className={`h-2 rounded-full transition-all cursor-pointer ${
                            heroIndex ===
                            index
                              ? "w-6 bg-amber-500"
                              : "w-2 bg-slate-700"
                          }`}
                        />
                      )
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

        {/* ============================
            MAIN CONTENT
        ============================ */}
        <div className="max-w-7xl mx-auto px-4 sm:px-8 pt-12 space-y-8">
          {/* HEADER */}
          <div
            className={`flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-6 ${
              isDark
                ? "border-slate-800"
                : "border-slate-200"
            }`}
          >
            <div>
              <h2
                className={`text-3xl font-black tracking-tight flex items-center gap-2 ${
                  isDark
                    ? "text-white"
                    : "text-slate-900"
                }`}
              >
                <Film className="h-7 w-7 text-red-500" />

                {t("cinematicReleases")}
              </h2>

              <p
                className={`text-xs mt-1 ${
                  isDark
                    ? "text-slate-400"
                    : "text-slate-500"
                }`}
              >
                {t("exploreReleases")}
              </p>
            </div>

            {/* SEARCH */}
            <div className="relative w-full md:w-72">
              <Search
                className={`absolute left-3.5 top-3 h-4 w-4 ${
                  isDark
                    ? "text-slate-500"
                    : "text-slate-400"
                }`}
              />

              <input
                type="text"
                placeholder={t(
                  "searchMovies"
                )}
                value={searchQuery}
                onChange={(e) =>
                  setSearchQuery(
                    e.target.value
                  )
                }
                className={`w-full rounded-2xl border px-4 py-2.5 pl-10 text-xs focus:outline-none transition ${
                  isDark
                    ? "border-slate-800 bg-slate-900 text-white placeholder-slate-500 focus:border-red-500"
                    : "border-slate-200 bg-white text-slate-900 placeholder-slate-400 focus:border-red-500"
                }`}
              />
            </div>
          </div>

          {/* ============================
              TABS + GENRES
          ============================ */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() =>
                    setSelectedTab(
                      "NOW_SHOWING"
                    )
                  }
                  className={`px-6 py-2.5 rounded-2xl text-xs font-bold transition cursor-pointer ${
                    selectedTab ===
                    "NOW_SHOWING"
                      ? "bg-red-600 text-white shadow-lg shadow-red-600/30"
                      : isDark
                        ? "bg-slate-900 border border-slate-800 text-slate-400 hover:text-white"
                        : "bg-white border border-slate-200 text-slate-500 hover:text-slate-900"
                  }`}
                >
                  {t("nowShowing")}
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setSelectedTab(
                      "COMING_SOON"
                    )
                  }
                  className={`px-6 py-2.5 rounded-2xl text-xs font-bold transition cursor-pointer ${
                    selectedTab ===
                    "COMING_SOON"
                      ? "bg-red-600 text-white shadow-lg shadow-red-600/30"
                      : isDark
                        ? "bg-slate-900 border border-slate-800 text-slate-400 hover:text-white"
                        : "bg-white border border-slate-200 text-slate-500 hover:text-slate-900"
                  }`}
                >
                  {t("comingSoon")}
                </button>
              </div>
            </div>

            {/* ============================
                GENRES
            ============================ */}
            {allGenres.length > 1 && (
              <>
                {/* MOBILE GENRES */}
                <div className="block sm:hidden relative w-full">
                  <div className="absolute inset-y-0 left-3.5 flex items-center pointer-events-none text-red-500">
                    <Compass className="h-4 w-4" />
                  </div>

                  <select
                    value={selectedGenre}
                    onChange={(e) =>
                      setSelectedGenre(
                        e.target.value
                      )
                    }
                    className={`w-full appearance-none rounded-2xl border px-4 py-3 pl-10 pr-10 text-xs font-bold focus:border-red-500 focus:outline-none transition cursor-pointer shadow-md ${
                      isDark
                        ? "border-slate-800 bg-slate-900 text-white"
                        : "border-slate-200 bg-white text-slate-900"
                    }`}
                  >
                    {allGenres.map(
                      (genre) => (
                        <option
                          key={genre}
                          value={genre}
                          className={
                            isDark
                              ? "bg-slate-900 text-white"
                              : "bg-white text-slate-900"
                          }
                        >
                          {t("category")}{" "}
                          {genre === "All"
                            ? t("all")
                            : translateGenre(
                                genre
                              )}
                        </option>
                      )
                    )}
                  </select>

                  <div
                    className={`absolute inset-y-0 right-3.5 flex items-center pointer-events-none text-xs ${
                      isDark
                        ? "text-slate-400"
                        : "text-slate-400"
                    }`}
                  >
                    ▼
                  </div>
                </div>

                {/* DESKTOP GENRES */}
                <div
                  className={`hidden sm:flex relative items-center border rounded-2xl p-3 backdrop-blur-md ${
                    isDark
                      ? "bg-slate-900/40 border-slate-800/80"
                      : "bg-white border-slate-200"
                  }`}
                >
                  <div
                    className={`flex items-center gap-2 shrink-0 pr-3 border-r text-xs font-bold uppercase tracking-wider mr-1 ${
                      isDark
                        ? "border-slate-800 text-slate-300"
                        : "border-slate-200 text-slate-600"
                    }`}
                  >
                    <div className="p-1.5 rounded-xl bg-red-600/10 text-red-500 border border-red-500/20">
                      <Compass className="h-4 w-4" />
                    </div>

                    <span>
                      {t("genres")}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar py-1 w-full pl-2">
                    {allGenres.map(
                      (genre) => {
                        const isSelected =
                          selectedGenre ===
                          genre;

                        return (
                          <button
                            key={genre}
                            type="button"
                            onClick={() =>
                              setSelectedGenre(
                                genre
                              )
                            }
                            className={`group relative px-4 py-2 rounded-xl text-xs font-bold tracking-wide transition-all duration-300 cursor-pointer shrink-0 border ${
                              isSelected
                                ? "bg-gradient-to-r from-red-600 to-rose-600 text-white border-red-500 shadow-lg shadow-red-600/40 scale-105"
                                : isDark
                                  ? "bg-slate-950/80 border-slate-800 text-slate-400 hover:bg-slate-800 hover:border-slate-700 hover:text-white"
                                  : "bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100 hover:border-slate-300 hover:text-slate-900"
                            }`}
                          >
                            {genre ===
                            "All"
                              ? t("all")
                              : translateGenre(
                                  genre
                                )}
                          </button>
                        );
                      }
                    )}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* ============================
              LOADING
          ============================ */}
          {loading ? (
            <div className="space-y-5 pt-2">
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <Loader2 className="h-4 w-4 animate-spin text-red-500" />

                <span>
                  {t("loadingMovies")}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {Array.from({
                  length: 8,
                }).map((_, index) => (
                  <div
                    key={index}
                    className={`rounded-3xl border overflow-hidden ${
                      isDark
                        ? "border-slate-800 bg-slate-900/60"
                        : "border-slate-200 bg-white"
                    }`}
                  >
                    <div
                      className={`aspect-[2/3] w-full animate-pulse ${
                        isDark
                          ? "bg-slate-900"
                          : "bg-slate-100"
                      }`}
                    />

                    <div className="p-5 space-y-3">
                      <div
                        className={`h-3 w-20 rounded animate-pulse ${
                          isDark
                            ? "bg-slate-800"
                            : "bg-slate-200"
                        }`}
                      />

                      <div
                        className={`h-4 w-3/4 rounded animate-pulse ${
                          isDark
                            ? "bg-slate-800"
                            : "bg-slate-200"
                        }`}
                      />

                      <div
                        className={`h-3 w-full rounded animate-pulse ${
                          isDark
                            ? "bg-slate-800"
                            : "bg-slate-200"
                        }`}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : movieError ? (
            /* ============================
                ERROR
            ============================ */
            <div
              className={`p-12 rounded-3xl border text-center space-y-3 ${
                isDark
                  ? "border-red-900/50 bg-red-950/10"
                  : "border-red-200 bg-red-50"
              }`}
            >
              <Film className="h-10 w-10 text-red-500 mx-auto" />

              <p
                className={`text-sm font-semibold ${
                  isDark
                    ? "text-white"
                    : "text-slate-900"
                }`}
              >
                {t(
                  "couldNotLoadMovies"
                )}
              </p>

              <p className="text-xs text-slate-500">
                {t(
                  "movieServiceError"
                )}
              </p>

              <button
                type="button"
                onClick={() =>
                  window.location.reload()
                }
                className="inline-flex items-center rounded-xl bg-red-600 hover:bg-red-500 px-5 py-2.5 text-xs font-bold text-white transition cursor-pointer"
              >
                {t("tryAgain")}
              </button>
            </div>
          ) : filteredMovies.length >
            0 ? (
            /* ============================
                MOVIE GRID
            ============================ */
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 pt-2">
              {filteredMovies.map(
                (movie) => (
                  <Link
                    key={movie.id}
                    href={`/customer/movies/${movie.id}`}
                    className={`group flex flex-col justify-between rounded-3xl border overflow-hidden shadow-xl hover:border-red-500/50 hover:shadow-red-600/10 transition cursor-pointer ${
                      isDark
                        ? "border-slate-800 bg-slate-900/60"
                        : "border-slate-200 bg-white"
                    }`}
                  >
                    {/* POSTER */}
                    <div
                      className={`relative aspect-[2/3] w-full overflow-hidden ${
                        isDark
                          ? "bg-slate-950"
                          : "bg-slate-100"
                      }`}
                    >
                      {movie.posterUrl ? (
                        <img
                          src={
                            movie.posterUrl
                          }
                          alt={
                            movie.title ||
                            "Movie poster"
                          }
                          className="h-full w-full object-cover group-hover:scale-105 transition duration-300"
                        />
                      ) : (
                        <div
                          className={`flex h-full w-full items-center justify-center ${
                            isDark
                              ? "text-slate-600"
                              : "text-slate-400"
                          }`}
                        >
                          <Film className="h-10 w-10" />
                        </div>
                      )}

                      {movie.ageRating && (
                        <span className="absolute top-3 right-3 px-2.5 py-1 rounded-xl bg-black/70 backdrop-blur-md text-[10px] font-bold text-white border border-white/10">
                          {
                            movie.ageRating
                          }
                        </span>
                      )}
                    </div>

                    {/* MOVIE INFO */}
                    <div className="p-5 space-y-3 flex-1 flex flex-col justify-between">
                      <div className="space-y-1.5">
                        <div className="flex flex-wrap gap-1">
                          {movie.genres?.map(
                            (
                              genre: any,
                              index: number
                            ) => {
                              const genreName =
                                typeof genre ===
                                "string"
                                  ? genre
                                  : genre?.name;

                              return (
                                <span
                                  key={
                                    genre?.id ||
                                    `${genreName || "genre"}-${index}`
                                  }
                                  className="text-[10px] font-bold px-2 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/20"
                                >
                                  {genreName
                                    ? translateGenre(
                                        genreName
                                      )
                                    : ""}
                                </span>
                              );
                            }
                          )}
                        </div>

                        <h3
                          className={`text-base font-black group-hover:text-red-400 transition line-clamp-1 ${
                            isDark
                              ? "text-white"
                              : "text-slate-900"
                          }`}
                        >
                          {movie.title}
                        </h3>
                      </div>

                      {/* CARD FOOTER */}
                      <div
                        className={`flex items-center justify-between pt-3 border-t text-xs ${
                          isDark
                            ? "border-slate-800 text-slate-400"
                            : "border-slate-200 text-slate-500"
                        }`}
                      >
                        <span className="flex items-center gap-1 font-mono">
                          <Clock
                            className={`h-3.5 w-3.5 ${
                              isDark
                                ? "text-slate-500"
                                : "text-slate-400"
                            }`}
                          />

                          {
                            movie.durationMinutes
                          }
                          m
                        </span>

                        <span className="flex items-center gap-1 font-bold text-red-500 group-hover:translate-x-1 transition">
                          <span>
                            {movie.status ===
                            "COMING_SOON"
                              ? t(
                                  "details"
                                )
                              : t(
                                  "bookNow"
                                )}
                          </span>

                          <ArrowRight className="h-3.5 w-3.5" />
                        </span>
                      </div>
                    </div>
                  </Link>
                )
              )}
            </div>
          ) : (
            /* ============================
                NO MOVIES
            ============================ */
            <div
              className={`p-12 rounded-3xl border text-center text-xs space-y-2 ${
                isDark
                  ? "border-slate-800 bg-slate-900/30 text-slate-500"
                  : "border-slate-200 bg-slate-50 text-slate-500"
              }`}
            >
              <Film
                className={`h-10 w-10 mx-auto mb-1 ${
                  isDark
                    ? "text-slate-600"
                    : "text-slate-400"
                }`}
              />

              <p
                className={`text-sm font-semibold ${
                  isDark
                    ? "text-white"
                    : "text-slate-900"
                }`}
              >
                {t("noMoviesFound")}
              </p>

              <p>
                {t(
                  "noMoviesDescription"
                )}
              </p>
            </div>
          )}

          {/* ============================
              FEATURES
          ============================ */}
          <div
            className={`py-16 border-t ${
              isDark
                ? "border-slate-800/60"
                : "border-slate-200"
            }`}
          >
            <div className="text-center max-w-xl mx-auto mb-10 space-y-2">
              <h2
                className={`text-2xl sm:text-3xl font-black ${
                  isDark
                    ? "text-white"
                    : "text-slate-900"
                }`}
              >
                {t("whyBook")}
              </h2>

              <p
                className={`text-xs ${
                  isDark
                    ? "text-slate-400"
                    : "text-slate-500"
                }`}
              >
                {t(
                  "whyBookDescription"
                )}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {FEATURES.map(
                (feature) => {
                  const Icon =
                    feature.icon;

                  return (
                    <div
                      key={
                        feature.titleKey
                      }
                      className={`rounded-3xl border p-6 text-center space-y-3 hover:border-red-500/40 transition ${
                        isDark
                          ? "border-slate-800 bg-slate-900/50"
                          : "border-slate-200 bg-white"
                      }`}
                    >
                      <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400">
                        <Icon className="h-5 w-5" />
                      </div>

                      <h3
                        className={`text-sm font-black ${
                          isDark
                            ? "text-white"
                            : "text-slate-900"
                        }`}
                      >
                        {t(
                          feature.titleKey
                        )}
                      </h3>

                      <p
                        className={`text-xs leading-relaxed ${
                          isDark
                            ? "text-slate-400"
                            : "text-slate-500"
                        }`}
                      >
                        {t(
                          feature.descKey
                        )}
                      </p>
                    </div>
                  );
                }
              )}
            </div>
          </div>

          {/* ============================
              NEWSLETTER
          ============================ */}
          <div
            className={`rounded-3xl border bg-gradient-to-r from-red-600/10 to-rose-600/10 p-8 sm:p-12 text-center space-y-4 mb-8 ${
              isDark
                ? "border-slate-800"
                : "border-slate-200"
            }`}
          >
            <h2
              className={`text-xl sm:text-2xl font-black ${
                isDark
                  ? "text-white"
                  : "text-slate-900"
              }`}
            >
              {t("neverMiss")}
            </h2>

            <p
              className={`text-xs max-w-md mx-auto ${
                isDark
                  ? "text-slate-400"
                  : "text-slate-500"
              }`}
            >
              {t(
                "neverMissDescription"
              )}
            </p>

            {newsletterSubmitted ? (
              <p className="text-xs font-bold text-emerald-500 pt-2">
                🎉 {t("subscribed")}
              </p>
            ) : (
              <form
                onSubmit={
                  handleNewsletterSubmit
                }
                className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto pt-2"
              >
                <input
                  type="email"
                  required
                  value={
                    newsletterEmail
                  }
                  onChange={(e) =>
                    setNewsletterEmail(
                      e.target.value
                    )
                  }
                  placeholder="you@email.com"
                  className={`flex-1 rounded-xl border px-4 py-2.5 text-xs focus:outline-none ${
                    isDark
                      ? "border-slate-800 bg-slate-950 text-white placeholder-slate-500 focus:border-red-500"
                      : "border-slate-200 bg-white text-slate-900 placeholder-slate-400 focus:border-red-500"
                  }`}
                />

                <button
                  type="submit"
                  className="rounded-xl bg-red-600 hover:bg-red-500 px-6 py-2.5 text-xs font-bold text-white transition cursor-pointer"
                >
                  {t("subscribe")}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>

      {/* ============================
          FOOTER
      ============================ */}
      <footer
        className={`mt-8 border-t backdrop-blur-md pt-16 pb-12 ${
          isDark
            ? "border-slate-800/80 bg-slate-900/40"
            : "border-slate-200 bg-white"
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-8 grid grid-cols-1 md:grid-cols-4 gap-10">
          {/* BRAND */}
          <div className="space-y-4">
            <div
              className={`flex items-center gap-2 font-black tracking-wider text-base ${
                isDark
                  ? "text-white"
                  : "text-slate-900"
              }`}
            >
              <span className="text-red-500">
                <Image
                  src="/logo2.png"
                  alt="CineMax"
                  width={120}
                  height={36}
                  priority
                  className="h-9 w-auto object-contain"
                />
              </span>

              <span>
                CINEMAX STUDIOS
              </span>
            </div>

            <p
              className={`text-xs leading-relaxed ${
                isDark
                  ? "text-slate-400"
                  : "text-slate-500"
              }`}
            >
              {t(
                "yourUltimateDestination"
              )}
            </p>
          </div>

          {/* QUICK NAVIGATION */}
          <div className="space-y-3">
            <h4
              className={`text-xs font-black uppercase tracking-wider ${
                isDark
                  ? "text-white"
                  : "text-slate-900"
              }`}
            >
              {t(
                "quickNavigation"
              )}
            </h4>

            <ul
              className={`space-y-2 text-xs ${
                isDark
                  ? "text-slate-400"
                  : "text-slate-500"
              }`}
            >
              <li>
                <Link
                  href="/"
                  className="hover:text-red-500 transition"
                >
                  {t(
                    "nowShowingFooter"
                  )}
                </Link>
              </li>

              <li>
                <Link
                  href="/"
                  className="hover:text-red-500 transition"
                >
                  {t(
                    "comingSoonFooter"
                  )}
                </Link>
              </li>

              <li>
                <Link
                  href="/customer/cinemas"
                  className="hover:text-red-500 transition"
                >
                  {t(
                    "cinemasAndLocations"
                  )}
                </Link>
              </li>

              <li>
                <Link
                  href="/"
                  className="hover:text-red-500 transition"
                >
                  {t("vipSuites")}
                </Link>
              </li>
            </ul>
          </div>

          {/* SUPPORT */}
          <div className="space-y-3">
            <h4
              className={`text-xs font-black uppercase tracking-wider ${
                isDark
                  ? "text-white"
                  : "text-slate-900"
              }`}
            >
              {t(
                "customerSupport"
              )}
            </h4>

            <ul
              className={`space-y-2.5 text-xs ${
                isDark
                  ? "text-slate-400"
                  : "text-slate-500"
              }`}
            >
              <li className="flex items-center gap-2">
                <Phone className="h-3.5 w-3.5 text-red-500" />
                +855 12 345 678
              </li>

              <li className="flex items-center gap-2">
                <Mail className="h-3.5 w-3.5 text-red-500" />
                support@cinemax.com
              </li>

              <li className="flex items-center gap-2">
                <MapPin className="h-3.5 w-3.5 text-red-500" />
                {t(
                  "phnomPenhCambodia"
                )}
              </li>
            </ul>
          </div>

          {/* SECURITY */}
          <div className="space-y-3">
            <h4
              className={`text-xs font-black uppercase tracking-wider ${
                isDark
                  ? "text-white"
                  : "text-slate-900"
              }`}
            >
              {t(
                "secureTicketing"
              )}
            </h4>

            <div
              className={`p-4 rounded-2xl border space-y-2 ${
                isDark
                  ? "border-slate-800 bg-slate-950"
                  : "border-slate-200 bg-slate-50"
              }`}
            >
              <div className="flex items-center gap-2 text-emerald-500 text-xs font-bold">
                <ShieldCheck className="h-4 w-4" />

                <span>
                  {t(
                    "secureCheckout"
                  )}
                </span>
              </div>

              <p className="text-[11px] leading-relaxed text-slate-500">
                {t(
                  "secureCheckoutDescription"
                )}
              </p>
            </div>
          </div>
        </div>

        {/* FOOTER BOTTOM */}
        <div
          className={`max-w-7xl mx-auto px-4 sm:px-8 mt-12 pt-6 border-t flex flex-col sm:flex-row items-center justify-between gap-4 text-xs ${
            isDark
              ? "border-slate-800/60 text-slate-500"
              : "border-slate-200 text-slate-500"
          }`}
        >
          <p>
            {t(
              "allRightsReserved"
            )}
          </p>

          <div className="flex items-center gap-6">
            <span
              className={`transition cursor-pointer ${
                isDark
                  ? "hover:text-white"
                  : "hover:text-slate-900"
              }`}
            >
              {t("privacyPolicy")}
            </span>

            <span
              className={`transition cursor-pointer ${
                isDark
                  ? "hover:text-white"
                  : "hover:text-slate-900"
              }`}
            >
              {t(
                "termsOfService"
              )}
            </span>

            <span
              className={`transition cursor-pointer ${
                isDark
                  ? "hover:text-white"
                  : "hover:text-slate-900"
              }`}
            >
              {t(
                "cookieSettings"
              )}
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}