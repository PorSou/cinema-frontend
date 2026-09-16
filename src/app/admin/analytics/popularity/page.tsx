"use client";

import { useEffect, useState } from "react";
import {
  Heart,
  Film,
  Loader2,
  ChevronsLeft,
  ChevronLeft,
  ChevronRight,
  ChevronsRight,
  TrendingUp,
} from "lucide-react";
import Toast from "@/app/components/Toast";
import { useSettings } from "@/app/context/SettingsContext";
import api from "@/app/lib/api";

const extractArray = <T,>(res: any): T[] => {
  if (Array.isArray(res)) return res;
  if (Array.isArray(res?.content)) return res.content;
  if (Array.isArray(res?.data)) return res.data;
  if (Array.isArray(res?.body?.data)) return res.body.data;
  if (Array.isArray(res?.data?.content)) return res.data.content;
  return [];
};

export default function AdminPopularityDemandPage() {
  const { theme } = useSettings();
  const isLight = theme === "light";

  const [popularityList, setPopularityList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Pagination states
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);
  const pageSize = 10;

  // Toast
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

  const fetchPopularityMetrics = async () => {
    setLoading(true);
    try {
      const res = await api.get(
        `/admin/analytics/popularity?page=${page}&size=${pageSize}`,
      );
      const rawObj = res.data?.body?.data || res.data?.data || res.data;
      const list = extractArray<any>(rawObj);

      setPopularityList(list);
      setTotalPages(rawObj?.totalPages || 1);
      setTotalElements(rawObj?.totalElements || list.length);
    } catch {
      showToast("Failed to load movie popularity analytics.", "error");
      setPopularityList([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPopularityMetrics();
  }, [page]);

  // Theme matching tokens
  const pageClass = isLight
    ? "bg-slate-50 text-slate-900"
    : "bg-slate-950 text-slate-100";
  const cardClass = isLight
    ? "border-slate-300 bg-white shadow-xl shadow-slate-200 ring-1 ring-slate-200"
    : "border-slate-800 bg-slate-900/60 shadow-2xl backdrop-blur-md";
  const textPrimary = isLight
    ? "text-slate-900 font-black"
    : "text-white font-black";
  const textSecondary = isLight
    ? "text-slate-700 font-bold"
    : "text-slate-400 font-medium";
  const borderCol = isLight ? "border-slate-300" : "border-slate-800";

  return (
    <div
      className={`min-h-screen py-6 px-4 sm:px-8 lg:px-10 w-full space-y-6 transition-colors duration-300 pb-24 ${pageClass}`}
    >
      <Toast
        message={toast.message}
        type={toast.type}
        duration={3500}
        onClose={() => setToast((prev) => ({ ...prev, message: null }))}
      />

      {/* Header */}
      <div
        className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b ${borderCol} pb-5`}
      >
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-500 shrink-0">
            <TrendingUp className="h-5 w-5" />
          </div>
          <div>
            <h1
              className={`text-xl sm:text-2xl font-black tracking-tight ${textPrimary} flex items-center gap-2`}
            >
              Movie Popularity Demand
              <span
                className={`text-[10px] font-black px-2 py-0.5 rounded-full ${isLight ? "bg-white text-slate-800 border-slate-300 shadow-sm" : "bg-slate-800 text-slate-400 border-slate-700"} border`}
              >
                {totalElements} Movies Ranked
              </span>
            </h1>
            <p className={`text-xs ${textSecondary} mt-0.5`}>
              Analyze customer demand and tracking metrics based on total user
              watchlists and favorites
            </p>
          </div>
        </div>
      </div>

      {/* Table Section */}
      {loading ? (
        <div className="flex min-h-[36vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
        </div>
      ) : popularityList.length > 0 ? (
        <div
          className={`rounded-3xl border ${cardClass} overflow-hidden shadow-xl backdrop-blur-md relative`}
        >
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr
                  className={`border-b ${borderCol} ${isLight ? "bg-slate-100 text-slate-700" : "bg-slate-950/60 text-slate-400"} text-[11px] font-black uppercase tracking-wider`}
                >
                  <th className="py-3.5 px-4 w-16 text-center">Rank</th>
                  <th className="py-3.5 px-4">Poster</th>
                  <th className="py-3.5 px-4">Movie Title</th>
                  <th className="py-3.5 px-4 text-right">Watchlist Saves</th>
                </tr>
              </thead>
              <tbody
                className={`divide-y ${isLight ? "divide-slate-200 text-slate-900 font-medium" : "divide-slate-800/60 text-slate-300"} text-xs`}
              >
                {popularityList.map((item, index) => {
                  const rank = page * pageSize + index + 1;
                  return (
                    <tr
                      key={item.movieId}
                      className={`transition ${isLight ? "hover:bg-slate-100/70" : "hover:bg-slate-800/40"}`}
                    >
                      <td className="py-3.5 px-4 text-center font-mono font-bold">
                        {rank === 1 ? (
                          <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-amber-500 text-slate-950 font-black text-[11px]">
                            1
                          </span>
                        ) : rank === 2 ? (
                          <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-slate-300 text-slate-950 font-black text-[11px]">
                            2
                          </span>
                        ) : rank === 3 ? (
                          <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-amber-700/60 text-white font-black text-[11px]">
                            3
                          </span>
                        ) : (
                          `#${rank}`
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="h-10 w-10 rounded-xl bg-slate-800/50 border border-slate-700 flex items-center justify-center shrink-0 overflow-hidden">
                          {item.moviePosterUrl ? (
                            <img
                              src={item.moviePosterUrl}
                              alt={item.movieTitle}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <Film className="h-5 w-5 text-slate-500" />
                          )}
                        </div>
                      </td>
                      <td
                        className={`py-3.5 px-4 font-black text-sm ${textPrimary}`}
                      >
                        {item.movieTitle}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-500">
                          <Heart className="h-3.5 w-3.5 fill-rose-500 text-rose-500" />
                          <span>{item.watchlistCount} saves</span>
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div
          className={`flex min-h-[30vh] flex-col items-center justify-center rounded-3xl border ${cardClass} p-8 text-center text-xs space-y-2`}
        >
          <Film className="h-10 w-10 text-slate-500 mb-1" />
          <p className={`font-black ${textPrimary}`}>
            No popularity analytics recorded yet.
          </p>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div
          className={`flex flex-col sm:flex-row items-center justify-between border-t ${borderCol} pt-4 text-xs gap-3`}
        >
          <span className={textSecondary}>
            Page <span className={`font-black ${textPrimary}`}>{page + 1}</span>{" "}
            of <span className={`font-black ${textPrimary}`}>{totalPages}</span>{" "}
            ({totalElements} ranked movies)
          </span>

          <div className="flex items-center gap-1.5 flex-wrap justify-center">
            <button
              onClick={() => setPage(0)}
              disabled={page === 0}
              className={`p-2 rounded-xl border ${borderCol} ${isLight ? "bg-white text-slate-800" : "bg-slate-900 text-slate-400"} disabled:opacity-30 transition cursor-pointer`}
            >
              <ChevronsLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => setPage((p) => Math.max(p - 1, 0))}
              disabled={page === 0}
              className={`flex items-center gap-1 px-3 py-2 rounded-xl border ${borderCol} ${isLight ? "bg-white text-slate-800" : "bg-slate-900 text-slate-300"} disabled:opacity-30 transition cursor-pointer`}
            >
              <ChevronLeft className="h-4 w-4" />
              <span>Prev</span>
            </button>
            <button
              onClick={() => setPage((p) => Math.min(p + 1, totalPages - 1))}
              disabled={page >= totalPages - 1}
              className={`flex items-center gap-1 px-3 py-2 rounded-xl border ${borderCol} ${isLight ? "bg-white text-slate-800" : "bg-slate-900 text-slate-300"} disabled:opacity-30 transition cursor-pointer`}
            >
              <span>Next</span>
              <ChevronRight className="h-4 w-4" />
            </button>
            <button
              onClick={() => setPage(totalPages - 1)}
              disabled={page >= totalPages - 1}
              className={`p-2 rounded-xl border ${borderCol} ${isLight ? "bg-white text-slate-800" : "bg-slate-900 text-slate-400"} disabled:opacity-30 transition cursor-pointer`}
            >
              <ChevronsRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
