"use client";

import { useEffect, useState } from "react";
import {
  MessageSquare,
  Star,
  Eye,
  EyeOff,
  Trash2,
  Loader2,
  ChevronsLeft,
  ChevronLeft,
  ChevronRight,
  ChevronsRight,
  ShieldAlert,
} from "lucide-react";
import Toast from "@/app/components/Toast";
import ConfirmDialog from "@/app/components/ConfirmDialog";
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

export default function AdminReviewsPage() {
  const { theme } = useSettings();
  const isLight = theme === "light";

  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Pagination states
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);
  const pageSize = 10;

  // Toast & Confirm
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

  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    targetName: string;
    action: () => Promise<void>;
  }>({
    isOpen: false,
    targetName: "",
    action: async () => {},
  });

  const fetchReviews = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/admin/reviews?page=${page}&size=${pageSize}`);
      const rawObj = res.data?.body?.data || res.data?.data || res.data;
      const list = extractArray<any>(rawObj);

      setReviews(list);
      setTotalPages(rawObj?.totalPages || 1);
      setTotalElements(rawObj?.totalElements || list.length);
    } catch {
      showToast("Failed to load user reviews.", "error");
      setReviews([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, [page]);

  const handleToggleHide = async (id: number) => {
    try {
      await api.patch(`/admin/reviews/${id}/toggle-hide`);
      showToast("Review visibility updated successfully.", "success");
      fetchReviews();
    } catch {
      showToast("Failed to update review visibility.", "error");
    }
  };

  const handleDeletePrompt = (id: number, userName: string) => {
    setConfirmDialog({
      isOpen: true,
      targetName: `review by ${userName}`,
      action: async () => {
        await api.delete(`/admin/reviews/${id}`);
        fetchReviews();
        showToast("Review deleted successfully.", "success");
      },
    });
  };

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

      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        type="HARD_DELETE"
        targetName={confirmDialog.targetName}
        onConfirm={async () => {
          try {
            await confirmDialog.action();
            setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
          } catch (err: any) {
            showToast(err.response?.data?.message || "Action failed.", "error");
            setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
          }
        }}
        onCancel={() =>
          setConfirmDialog((prev) => ({ ...prev, isOpen: false }))
        }
      />

      {/* Header */}
      <div
        className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b ${borderCol} pb-5`}
      >
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-500 shrink-0">
            <MessageSquare className="h-5 w-5" />
          </div>
          <div>
            <h1
              className={`text-xl sm:text-2xl font-black tracking-tight ${textPrimary} flex items-center gap-2`}
            >
              Movie Reviews Moderation
              <span
                className={`text-[10px] font-black px-2 py-0.5 rounded-full ${isLight ? "bg-white text-slate-800 border-slate-300 shadow-sm" : "bg-slate-800 text-slate-400 border-slate-700"} border`}
              >
                {totalElements} Total
              </span>
            </h1>
            <p className={`text-xs ${textSecondary} mt-0.5`}>
              Inspect user ratings, moderate inappropriate feedback, and toggle
              comment visibility
            </p>
          </div>
        </div>
      </div>

      {/* Table Section */}
      {loading ? (
        <div className="flex min-h-[36vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
        </div>
      ) : reviews.length > 0 ? (
        <div
          className={`rounded-3xl border ${cardClass} overflow-hidden shadow-xl backdrop-blur-md relative`}
        >
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr
                  className={`border-b ${borderCol} ${isLight ? "bg-slate-100 text-slate-700" : "bg-slate-950/60 text-slate-400"} text-[11px] font-black uppercase tracking-wider`}
                >
                  <th className="py-3.5 px-4">User</th>
                  <th className="py-3.5 px-4">Movie</th>
                  <th className="py-3.5 px-4">Rating</th>
                  <th className="py-3.5 px-4">Comment</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody
                className={`divide-y ${isLight ? "divide-slate-200 text-slate-900 font-medium" : "divide-slate-800/60 text-slate-300"} text-xs`}
              >
                {reviews.map((r) => {
                  const isHidden = Boolean(r.hidden || r.isHidden);
                  return (
                    <tr
                      key={r.id}
                      className={`transition ${isLight ? "hover:bg-slate-100/70" : "hover:bg-slate-800/40"}`}
                    >
                      <td className="py-3.5 px-4 font-bold">
                        {r.userName || r.userEmail || `User #${r.userId}`}
                      </td>
                      <td className="py-3.5 px-4 font-semibold">
                        {r.movieTitle || `Movie #${r.movieId}`}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1 font-mono font-bold text-amber-500">
                          <Star className="h-3.5 w-3.5 fill-amber-500 text-amber-500" />
                          <span>{r.rating} / 5</span>
                        </div>
                      </td>
                      <td
                        className={`py-3.5 px-4 max-w-xs truncate ${textSecondary}`}
                      >
                        {r.comment || "No comment provided"}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-black border ${!isHidden ? "bg-emerald-500/15 text-emerald-500 border-emerald-500/30" : "bg-rose-500/15 text-rose-500 border-rose-500/30"}`}
                        >
                          {!isHidden ? "Public" : "Hidden"}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleToggleHide(r.id)}
                            className={`p-2 rounded-xl border transition cursor-pointer ${
                              !isHidden
                                ? "border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
                                : "border-amber-500/30 text-amber-400 hover:bg-amber-500/10"
                            }`}
                            title={!isHidden ? "Hide Review" : "Unhide Review"}
                          >
                            {!isHidden ? (
                              <Eye className="h-4 w-4 text-emerald-400" />
                            ) : (
                              <EyeOff className="h-4 w-4 text-amber-400" />
                            )}
                          </button>
                          <button
                            onClick={() =>
                              handleDeletePrompt(r.id, r.userName || "User")
                            }
                            className="p-2 rounded-xl text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 transition cursor-pointer border border-transparent hover:border-rose-500/20"
                            title="Delete Review"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
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
          <ShieldAlert className="h-10 w-10 text-slate-500 mb-1" />
          <p className={`font-black ${textPrimary}`}>
            No reviews found for moderation.
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
            ({totalElements} reviews)
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
