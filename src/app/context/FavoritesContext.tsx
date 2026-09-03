"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useCallback,
} from "react";

export interface Favorite {
  movieId: string;
  movieTitle: string;
  posterUrl?: string;
  addedAt: number;
}

interface FavoritesContextType {
  favorites: Favorite[];
  addFavorite: (movie: Omit<Favorite, "addedAt">) => void;
  removeFavorite: (movieId: string) => void;
  isFavorited: (movieId: string) => boolean;
  clearFavorites: () => void;
  getFavorites: () => Favorite[];
}

const FavoritesContext = createContext<FavoritesContextType | undefined>(
  undefined
);

const STORAGE_KEY = "cinemax_favorites";

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [mounted, setMounted] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as Favorite[];
        setFavorites(parsed);
      }
    } catch (error) {
      console.error("Failed to load favorites:", error);
    }
    setMounted(true);
  }, []);

  // Save to localStorage whenever favorites change
  useEffect(() => {
    if (!mounted) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(favorites));
    } catch (error) {
      console.error("Failed to save favorites:", error);
    }
  }, [favorites, mounted]);

  const addFavorite = useCallback((movie: Omit<Favorite, "addedAt">) => {
    setFavorites((prev) => {
      // Check if already favorited
      if (prev.some((fav) => fav.movieId === movie.movieId)) {
        return prev;
      }
      return [
        ...prev,
        {
          ...movie,
          addedAt: Date.now(),
        },
      ];
    });
  }, []);

  const removeFavorite = useCallback((movieId: string) => {
    setFavorites((prev) =>
      prev.filter((fav) => fav.movieId !== movieId)
    );
  }, []);

  const isFavorited = useCallback(
    (movieId: string) => {
      return favorites.some((fav) => fav.movieId === movieId);
    },
    [favorites]
  );

  const clearFavorites = useCallback(() => {
    setFavorites([]);
  }, []);

  const getFavorites = useCallback(() => {
    return [...favorites].sort((a, b) => b.addedAt - a.addedAt);
  }, [favorites]);

  return (
    <FavoritesContext.Provider
      value={{
        favorites,
        addFavorite,
        removeFavorite,
        isFavorited,
        clearFavorites,
        getFavorites,
      }}
    >
      {children}
    </FavoritesContext.Provider>
  );
}

export function useFavorites() {
  const context = useContext(FavoritesContext);
  if (!context) {
    throw new Error("useFavorites must be used inside FavoritesProvider");
  }
  return context;
}
