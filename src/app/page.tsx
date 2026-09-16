"use client";

import { useEffect, useState } from "react";
import MovieService from "@/app/service/movie.service";
import GenreService from "@/app/service/genre.service";
import { MovieResponse } from "@/app/types/api.types";
import Toast from "@/app/components/Toast";
import { useSettings } from "@/app/context/SettingsContext";

import Footer from "@/app/components/Footer";
import MovieSection from "./customer/movies/page";

const extractArray = <T,>(res: any): T[] => {
  if (Array.isArray(res)) return res;
  if (Array.isArray(res?.content)) return res.content;
  if (Array.isArray(res?.data)) return res.data;
  if (Array.isArray(res?.body?.data)) return res.body.data;
  if (Array.isArray(res?.data?.content)) return res.data.content;
  if (Array.isArray(res?.body?.content)) return res.body.content;
  return [];
};

export default function CustomerMoviesPage() {
  const { theme } = useSettings();
  const isDark = theme === "dark";

  const [movies, setMovies] = useState<MovieResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [movieError, setMovieError] = useState(false);
  const [allGenres, setAllGenres] = useState<string[]>(["All"]);

  const [toast, setToast] = useState<{
    message: string | null;
    type: "success" | "error" | "info";
  }>({
    message: null,
    type: "success",
  });

  // Load Movies
  useEffect(() => {
    let mounted = true;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    async function loadMovies() {
      setLoading(true);
      setMovieError(false);

      try {
        const timeoutPromise = new Promise<never>((_, reject) => {
          timeoutId = setTimeout(() => {
            reject(new Error("Movie request timeout"));
          }, 15000);
        });

        const requestPromise = MovieService.getAllMovies({
          page: 0,
          size: 50,
          sortBy: "createdAt",
          direction: "desc",
        });

        const res = await Promise.race([requestPromise, timeoutPromise]);
        if (!mounted) return;

        const movieList = extractArray<MovieResponse>(res);
        setMovies(movieList);
      } catch (error) {
        console.error("Failed to load movies:", error);
        if (!mounted) return;

        setMovieError(true);
        setMovies([]);
        setToast({
          message: "Unable to load movies. Please try again.",
          type: "error",
        });
      } finally {
        if (timeoutId) clearTimeout(timeoutId);
        if (mounted) setLoading(false);
      }
    }

    loadMovies();

    return () => {
      mounted = false;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, []);

  // Load Genres
  useEffect(() => {
    let mounted = true;

    async function loadGenres() {
      try {
        const res = await GenreService.getAllGenres(0, 100, "name", "asc");
        if (!mounted) return;

        const list = extractArray<any>(res);
        const names = list
          .map((genre: any) =>
            typeof genre === "string" ? genre : genre?.name,
          )
          .filter(
            (name): name is string =>
              typeof name === "string" && name.trim().length > 0,
          );

        setAllGenres(["All", ...Array.from(new Set(names))]);
      } catch (error) {
        console.warn("Could not load genres:", error);
      }
    }

    loadGenres();

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div
      data-aos="fade"
      data-aos-duration="800"
      className={`min-h-screen flex flex-col justify-between transition-colors duration-300 ${
        isDark
          ? "bg-[#0b0c10] text-slate-100 selection:bg-red-600 selection:text-white"
          : "bg-slate-50 text-slate-900 selection:bg-red-600 selection:text-white"
      }`}
    >
      <Toast
        message={toast.message}
        type={toast.type}
        duration={3500}
        onClose={() => setToast({ message: null, type: "success" })}
      />

      <style jsx global>{`
        ::-webkit-scrollbar {
          display: none;
        }
        html,
        body {
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

      {/* Movie Catalog & Hero Section */}
      <div data-aos="fade-up" data-aos-delay="100">
        <MovieSection
          movies={movies}
          loading={loading}
          movieError={movieError}
          allGenres={allGenres}
        />
      </div>

      {/* Standalone Footer with AOS animation */}
      <div data-aos="fade-up" data-aos-delay="200">
        <Footer />
      </div>
    </div>
  );
}
