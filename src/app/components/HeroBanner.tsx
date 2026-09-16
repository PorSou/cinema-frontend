"use client";

import { useEffect, useRef, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  Film,
  Play,
  Star,
  Ticket,
} from "lucide-react";
import { MovieResponse } from "@/app/types/api.types";
import { useSettings } from "@/app/context/SettingsContext";

/**
 * ---- Field accessors -----------------------------------------------------
 * Your MovieResponse type may name these fields differently than I guessed
 * below. Each getter tries a few likely names and falls back gracefully —
 * open this block and point it at your real fields (or delete the ones you
 * don't need) once you see it doesn't match.
 * --------------------------------------------------------------------------
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

const getRottenTomatoes = (m: any): string | null => {
  const v = m?.rottenTomatoes ?? m?.rtRating ?? m?.rt;
  if (v == null) return null;
  return String(v).includes("%") ? String(v) : `${v}%`;
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

// Deterministic fallback gradient so posters without an image still look
// distinct from each other instead of all sharing one flat color.
const fallbackAccent = (title: string): string => {
  let hash = 0;
  for (let i = 0; i < title.length; i++)
    hash = title.charCodeAt(i) + ((hash << 5) - hash);
  const hue = Math.abs(hash) % 360;
  return `linear-gradient(160deg, hsl(${hue}, 45%, 18%) 0%, #0d0d12 60%)`;
};

interface HeroBannerProps {
  movies: MovieResponse[];
  loading: boolean;
  movieError: boolean;
}

export default function HeroBanner({
  movies,
  loading,
  movieError,
}: HeroBannerProps) {
  const { theme } = useSettings();
  const isDark = theme === "dark";

  const featured = movies.slice(0, 5);
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (paused || featured.length < 2) return;
    timerRef.current = setInterval(() => {
      setActive((i) => (i + 1) % featured.length);
    }, 6000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [paused, featured.length]);

  useEffect(() => {
    if (active >= featured.length) setActive(0);
  }, [featured.length, active]);

  const goPrev = () =>
    setActive((i) => (i - 1 + featured.length) % featured.length);
  const goNext = () => setActive((i) => (i + 1) % featured.length);

  // ---- Loading skeleton ----------------------------------------------------
  if (loading) {
    return (
      <div
        className="w-full min-h-[640px] flex items-center px-6 md:px-16 animate-pulse"
        style={{ background: isDark ? "#07070B" : "#EDEBE4" }}
      >
        <div className="max-w-6xl w-full mx-auto flex flex-col md:flex-row gap-12 items-center">
          <div
            className="w-56 h-80 md:w-64 md:h-96 rounded-lg"
            style={{ background: isDark ? "#1a1a22" : "#dcd9d0" }}
          />
          <div className="flex-1 space-y-4 w-full">
            <div
              className="h-4 w-32 rounded"
              style={{ background: isDark ? "#1a1a22" : "#dcd9d0" }}
            />
            <div
              className="h-12 w-2/3 rounded"
              style={{ background: isDark ? "#1a1a22" : "#dcd9d0" }}
            />
            <div
              className="h-4 w-full max-w-md rounded"
              style={{ background: isDark ? "#1a1a22" : "#dcd9d0" }}
            />
            <div
              className="h-4 w-full max-w-sm rounded"
              style={{ background: isDark ? "#1a1a22" : "#dcd9d0" }}
            />
          </div>
        </div>
      </div>
    );
  }

  // ---- Empty / error state --------------------------------------------------
  if (movieError || featured.length === 0) {
    return (
      <div
        className="w-full min-h-[400px] flex flex-col items-center justify-center gap-3 px-6"
        style={{
          background: isDark ? "#07070B" : "#EDEBE4",
          color: isDark ? "#A8A5B4" : "#5b5a63",
        }}
      >
        <Film size={28} />
        <p className="text-sm">
          {movieError
            ? "Couldn't load what's showing. Try refreshing."
            : "Nothing showing right now — check back soon."}
        </p>
      </div>
    );
  }

  const movie = featured[active];
  const poster = getPosterUrl(movie);
  const accent = fallbackAccent(getTitle(movie));
  const imdb = getImdb(movie);
  const rt = getRottenTomatoes(movie);
  const runtime = getRuntime(movie);
  const genres = getGenres(movie);
  const synopsis = getSynopsis(movie);

  return (
    <div
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      style={{
        background: isDark
          ? "radial-gradient(ellipse 900px 500px at 20% 20%, rgba(91,75,138,0.35), transparent 60%), radial-gradient(ellipse 700px 500px at 85% 80%, rgba(242,169,59,0.12), transparent 60%), #07070B"
          : "radial-gradient(ellipse 900px 500px at 20% 20%, rgba(91,75,138,0.10), transparent 60%), #EDEBE4",
        fontFamily: "Manrope, sans-serif",
      }}
      className="w-full min-h-[640px] flex flex-col justify-center px-6 md:px-16 py-14 relative overflow-hidden"
    >
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Oswald:wght@500;600;700&family=Manrope:wght@400;500;600;800&display=swap');`}</style>

      {featured.length > 1 && (
        <>
          <button
            onClick={goPrev}
            aria-label="Previous movie"
            className="hidden md:flex items-center justify-center absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full z-10 transition-colors"
            style={{
              background: isDark
                ? "rgba(255,255,255,0.06)"
                : "rgba(0,0,0,0.06)",
              color: isDark ? "#F5F1E8" : "#1a1a22",
              border: isDark
                ? "1px solid rgba(255,255,255,0.1)"
                : "1px solid rgba(0,0,0,0.1)",
            }}
          >
            <ChevronLeft size={18} />
          </button>
          <button
            onClick={goNext}
            aria-label="Next movie"
            className="hidden md:flex items-center justify-center absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full z-10 transition-colors"
            style={{
              background: isDark
                ? "rgba(255,255,255,0.06)"
                : "rgba(0,0,0,0.06)",
              color: isDark ? "#F5F1E8" : "#1a1a22",
              border: isDark
                ? "1px solid rgba(255,255,255,0.1)"
                : "1px solid rgba(0,0,0,0.1)",
            }}
          >
            <ChevronRight size={18} />
          </button>
        </>
      )}

      <div className="max-w-6xl w-full mx-auto flex flex-col md:flex-row gap-12 items-center">
        {/* Poster */}
        <div className="relative shrink-0">
          <div
            className="w-56 h-80 md:w-64 md:h-96 rounded-lg flex items-end p-4 relative overflow-hidden"
            style={{
              background: poster ? undefined : accent,
              transform: "rotate(-4deg)",
              boxShadow:
                "0 30px 60px -15px rgba(0,0,0,0.5), 0 0 80px -10px rgba(242,169,59,0.15)",
              border: isDark
                ? "1px solid rgba(255,255,255,0.08)"
                : "1px solid rgba(0,0,0,0.06)",
            }}
          >
            {poster ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={poster}
                alt={getTitle(movie)}
                className="absolute inset-0 w-full h-full object-cover"
              />
            ) : (
              <Film size={28} color="rgba(255,255,255,0.25)" />
            )}
          </div>
          {imdb && (
            <div
              className="absolute -bottom-4 -right-4 rounded-full flex flex-col items-center justify-center w-16 h-16"
              style={{
                background: "#F2A93B",
                transform: "rotate(-4deg)",
                boxShadow: "0 10px 25px rgba(242,169,59,0.35)",
              }}
            >
              <span
                style={{ fontFamily: "Oswald, sans-serif" }}
                className="text-lg font-bold text-black leading-none"
              >
                {imdb}
              </span>
              <span className="text-[10px] font-semibold text-black/70">
                IMDb
              </span>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full mb-4"
            style={{
              background: "rgba(242,169,59,0.12)",
              border: "1px solid rgba(242,169,59,0.3)",
            }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: "#F2A93B" }}
            />
            <span
              className="text-xs font-semibold"
              style={{ color: "#F2A93B" }}
            >
              Now showing
            </span>
          </div>

          <h1
            style={{
              fontFamily: "Oswald, sans-serif",
              color: isDark ? "#F5F1E8" : "#17171d",
              letterSpacing: "0.01em",
            }}
            className="text-4xl md:text-6xl font-bold leading-[0.95] mb-4"
          >
            {getTitle(movie)}
          </h1>

          {(genres.length > 0 || runtime) && (
            <div className="flex flex-wrap items-center gap-3 mb-4">
              {genres.map((g) => (
                <span
                  key={g}
                  className="text-xs font-semibold px-2.5 py-1 rounded"
                  style={{
                    background: isDark
                      ? "rgba(255,255,255,0.06)"
                      : "rgba(0,0,0,0.05)",
                    color: isDark ? "#C9C6D4" : "#4a4952",
                  }}
                >
                  {g}
                </span>
              ))}
              {runtime && (
                <span
                  className="flex items-center gap-1 text-xs"
                  style={{ color: isDark ? "#8B8894" : "#726f7a" }}
                >
                  <Clock size={13} /> {runtime}
                </span>
              )}
            </div>
          )}

          {synopsis && (
            <p
              className="max-w-md mb-7 text-sm leading-relaxed"
              style={{ color: isDark ? "#A8A5B4" : "#5b5a63" }}
            >
              {synopsis}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-3 mb-6">
            <button
              className="flex items-center gap-2 px-5 py-3 rounded-md text-sm font-semibold transition-transform hover:scale-[1.03]"
              style={{ background: "#D64550", color: "#F5F1E8" }}
            >
              <Ticket size={16} /> Get tickets
            </button>
            <button
              className="flex items-center gap-2 px-5 py-3 rounded-md text-sm font-semibold border transition-colors"
              style={{
                borderColor: isDark
                  ? "rgba(255,255,255,0.2)"
                  : "rgba(0,0,0,0.15)",
                color: isDark ? "#F5F1E8" : "#17171d",
              }}
            >
              <Play size={16} /> Watch trailer
            </button>
          </div>

          {(imdb || rt) && (
            <div
              className="flex items-center gap-4 text-xs"
              style={{ color: isDark ? "#8B8894" : "#726f7a" }}
            >
              {imdb && (
                <span className="flex items-center gap-1">
                  <Star size={13} color="#F2A93B" fill="#F2A93B" /> {imdb} IMDb
                </span>
              )}
              {rt && <span>{rt} on Rotten Tomatoes</span>}
            </div>
          )}
        </div>
      </div>

      {/* Filmstrip selector */}
      {featured.length > 1 && (
        <div className="max-w-6xl w-full mx-auto mt-12">
          <div className="flex gap-3 overflow-x-auto pb-2 hide-scrollbar">
            {featured.map((m, i) => {
              const thumb = getPosterUrl(m);
              return (
                <button
                  key={getId(m, i)}
                  onClick={() => setActive(i)}
                  aria-label={`Show ${getTitle(m)}`}
                  className="shrink-0 rounded-md overflow-hidden relative transition-all"
                  style={{
                    width: 92,
                    height: 56,
                    background: thumb ? undefined : fallbackAccent(getTitle(m)),
                    border:
                      i === active
                        ? "2px solid #F2A93B"
                        : `2px solid ${isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"}`,
                    opacity: i === active ? 1 : 0.55,
                  }}
                >
                  {thumb && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={thumb}
                      alt={getTitle(m)}
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                  )}
                  <span
                    className="absolute bottom-1 left-1.5 text-[10px] font-semibold truncate max-w-[80px]"
                    style={{
                      fontFamily: "Manrope, sans-serif",
                      color: "#F5F1E8",
                      textShadow: "0 1px 3px rgba(0,0,0,0.8)",
                    }}
                  >
                    {getTitle(m)}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
