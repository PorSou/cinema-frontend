"use client";

import { Heart } from "lucide-react";
import { useFavorites } from "@/app/context/FavoritesContext";
import { useState } from "react";

interface FavoriteButtonProps {
  movieId: string;
  movieTitle: string;
  posterUrl?: string;
  className?: string;
}

export default function FavoriteButton({
  movieId,
  movieTitle,
  posterUrl,
  className = "",
}: FavoriteButtonProps) {
  const { isFavorited, addFavorite, removeFavorite } = useFavorites();
  const [isAnimating, setIsAnimating] = useState(false);

  const favorited = isFavorited(movieId);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    setIsAnimating(true);
    setTimeout(() => setIsAnimating(false), 600);

    if (favorited) {
      removeFavorite(movieId);
    } else {
      addFavorite({
        movieId,
        movieTitle,
        posterUrl,
      });
    }
  };

  return (
    <button
      onClick={handleClick}
      className={`
        relative
        inline-flex
        items-center
        justify-center
        p-2
        rounded-full
        transition-all
        duration-300
        ${
          favorited
            ? "text-red-500 hover:text-red-600"
            : "text-slate-400 hover:text-red-500"
        }
        ${isAnimating ? "scale-125" : "scale-100"}
        ${className}
      `}
      title={favorited ? "Remove from favorites" : "Add to favorites"}
      aria-label={favorited ? "Remove from favorites" : "Add to favorites"}
    >
      <Heart
        className={`h-6 w-6 transition-all duration-300 ${
          favorited ? "fill-current" : ""
        }`}
      />
    </button>
  );
}
