"use client";

import { useEffect, useState } from "react";
import { Star, MessageSquare, Loader2, Send } from "lucide-react";
import { useSettings } from "@/app/context/SettingsContext";
import Toast from "@/app/components/Toast";
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

export default function MovieReviewsSection({ movieId }: { movieId: number }) {
  const { theme } = useSettings();
  const isLight = theme === "light";

  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

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
    setToast({ message, type });
  };

  const fetchReviews = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/reviews/movie/${movieId}?page=0&size=20`);
      const rawObj = res.data?.body?.data || res.data?.data || res.data;
      setReviews(extractArray<any>(rawObj));
    } catch {
      showToast("Failed to load movie reviews.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (movieId) {
      fetchReviews();
    }
  }, [movieId]);

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = AuthService.getAccessToken();
    if (!token) {
      showToast("Please sign in to submit a review.", "info");
      return;
    }

    if (!comment.trim()) {
      showToast("Please write a short comment.", "error");
      return;
    }

    setSubmitting(true);
    try {
      await api.post("/reviews", {
        movieId,
        rating,
        comment: comment.trim(),
      });

      showToast("Review submitted successfully!", "success");
      setComment("");
      fetchReviews();
    } catch (err: any) {
      showToast(
        err.response?.data?.message || "Failed to submit review.",
        "error",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const cardBg = isLight
    ? "bg-white border-slate-200"
    : "bg-slate-900/60 border-slate-800";
  const textPrimary = isLight
    ? "text-slate-900 font-black"
    : "text-white font-black";
  const textSecondary = isLight ? "text-slate-600" : "text-slate-400";
  const inputBg = isLight
    ? "bg-slate-50 border-slate-300 text-slate-900"
    : "bg-slate-950 border-slate-800 text-white";

  return (
    <div className="space-y-6 pt-6 border-t border-slate-800">
      <Toast
        message={toast.message}
        type={toast.type}
        duration={3500}
        onClose={() => setToast((prev) => ({ ...prev, message: null }))}
      />

      <div className="flex items-center gap-2">
        <MessageSquare className="h-5 w-5 text-amber-500" />
        <h2 className={`text-lg font-bold tracking-tight ${textPrimary}`}>
          Audience Reviews & Ratings
        </h2>
      </div>

      {/* Review Submission Form */}
      <form
        onSubmit={handleSubmitReview}
        className={`rounded-2xl border p-4 sm:p-6 space-y-4 shadow-lg ${cardBg}`}
      >
        <h3 className={`text-sm font-bold ${textPrimary}`}>
          Leave Your Rating
        </h3>

        <div className="flex items-center gap-2">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => setRating(star)}
              className="cursor-pointer transition hover:scale-110"
            >
              <Star
                className={`h-6 w-6 ${
                  star <= rating
                    ? "fill-amber-500 text-amber-500"
                    : "text-slate-600"
                }`}
              />
            </button>
          ))}
          <span className="ml-2 text-xs font-mono font-bold text-amber-500">
            {rating} / 5 Stars
          </span>
        </div>

        <div>
          <textarea
            rows={3}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="What did you think of the movie?"
            className={`w-full rounded-xl border p-3 text-xs outline-none focus:border-amber-500 resize-none ${inputBg}`}
          />
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-5 py-2.5 text-xs font-black text-slate-950 transition hover:bg-amber-400 disabled:opacity-50 cursor-pointer shadow-md shadow-amber-500/20"
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-3.5 w-3.5" />
            )}
            <span>Submit Review</span>
          </button>
        </div>
      </form>

      {/* Public Reviews List */}
      <div className="space-y-3">
        {loading ? (
          <div className="py-10 text-center">
            <Loader2 className="mx-auto h-6 w-6 animate-spin text-amber-500" />
          </div>
        ) : reviews.length > 0 ? (
          reviews.map((rev) => (
            <div
              key={rev.id}
              className={`rounded-2xl border p-4 space-y-2 ${cardBg}`}
            >
              <div className="flex items-center justify-between">
                <span className={`text-xs font-bold ${textPrimary}`}>
                  {rev.userName || "Movie Fan"}
                </span>
                <div className="flex items-center gap-1">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`h-3 w-3 ${
                        i < rev.rating
                          ? "fill-amber-500 text-amber-500"
                          : "text-slate-700"
                      }`}
                    />
                  ))}
                </div>
              </div>
              <p className={`text-xs ${textSecondary}`}>{rev.comment}</p>
            </div>
          ))
        ) : (
          <p className={`text-xs text-center py-6 ${textSecondary}`}>
            No reviews yet. Be the first to review this movie!
          </p>
        )}
      </div>
    </div>
  );
}
