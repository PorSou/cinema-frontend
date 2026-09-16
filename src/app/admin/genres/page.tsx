"use client";

import { useEffect, useState, useMemo, FormEvent } from "react";
import {
  Tags,
  Plus,
  Edit3,
  Trash2,
  Search,
  Loader2,
  Archive,
  RotateCcw,
  Sparkles,
  X,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import GenreService from "@/app/service/genre.service";
import { GenreResponse, GenreRequest } from "@/app/types/api.types";
import Toast from "@/app/components/Toast";
import ConfirmDialog from "@/app/components/ConfirmDialog";
import { useSettings } from "@/app/context/SettingsContext"; // <--- 1. Import useSettings

const extractArray = <T,>(res: any): T[] => {
  if (Array.isArray(res)) return res;
  if (Array.isArray(res?.content)) return res.content;
  if (Array.isArray(res?.data)) return res.data;
  if (Array.isArray(res?.body?.data)) return res.body.data;
  if (Array.isArray(res?.data?.content)) return res.data.content;
  return [];
};

export default function AdminGenresPage() {
  const { theme } = useSettings(); // <--- 2. Get theme context
  const isLight = theme === "light";

  const [genres, setGenres] = useState<GenreResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewTrash, setViewTrash] = useState(false);

  // Pagination
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);
  const pageSize = 12;

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGenre, setEditingGenre] = useState<GenreResponse | null>(null);
  const [genreName, setGenreName] = useState("");
  const [nameError, setNameError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Confirm Dialog State
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    type: "SOFT_DELETE" | "HARD_DELETE" | "RESTORE";
    targetName: string;
    title?: string;
    action: () => Promise<void>;
  }>({
    isOpen: false,
    type: "SOFT_DELETE",
    targetName: "",
    action: async () => {},
  });

  // Toast State
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

  // Fetch Genres
  const fetchGenres = async () => {
    setLoading(true);
    try {
      const res = viewTrash
        ? await GenreService.getTrashGenres(page, pageSize, "updatedAt", "desc")
        : await GenreService.getAllGenres(page, pageSize, "createdAt", "desc");

      const list = extractArray<GenreResponse>(res);
      setGenres(list);
      setTotalPages(res?.totalPages || 1);
      setTotalElements(res?.totalElements || list.length);
    } catch {
      showToast("Failed to load movie genres.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGenres();
  }, [page, viewTrash]);

  // Modal Open
  const openModal = (genre?: GenreResponse) => {
    setNameError(null);
    if (genre) {
      setEditingGenre(genre);
      setGenreName(genre.name);
    } else {
      setEditingGenre(null);
      setGenreName("");
    }
    setIsModalOpen(true);
  };

  // Submit Handler
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const trimmed = genreName.trim();
    if (!trimmed) {
      setNameError("Genre name is required");
      return;
    }
    if (trimmed.length < 2 || trimmed.length > 50) {
      setNameError("Genre name must be between 2 and 50 characters");
      return;
    }

    setSubmitting(true);
    try {
      const payload: GenreRequest = { name: trimmed };
      if (editingGenre) {
        const updated = await GenreService.updateGenre(
          editingGenre.id,
          payload,
        );
        setGenres((prev) =>
          prev.map((g) => (g.id === editingGenre.id ? updated : g)),
        );
        showToast(`Genre "${trimmed}" updated successfully!`, "success");
      } else {
        const created = await GenreService.createGenre(payload);
        setGenres((prev) => [created, ...prev]);
        setTotalElements((prev) => prev + 1);
        showToast(`Genre "${trimmed}" created successfully!`, "success");
      }
      setIsModalOpen(false);
    } catch (err: any) {
      showToast(
        err.response?.data?.status?.message ||
          err.response?.data?.message ||
          "Operation failed.",
        "error",
      );
    } finally {
      setSubmitting(false);
    }
  };

  // Soft Delete
  const handleSoftDelete = (genre: GenreResponse) => {
    setConfirmDialog({
      isOpen: true,
      type: "SOFT_DELETE",
      title: "Move Genre to Trash",
      targetName: genre.name,
      action: async () => {
        await GenreService.softDeleteGenre(genre.id);
        setGenres((prev) => prev.filter((g) => g.id !== genre.id));
        setTotalElements((prev) => Math.max(prev - 1, 0));
        showToast(`"${genre.name}" moved to trash.`, "success");
      },
    });
  };

  // Restore
  const handleRestore = (genre: GenreResponse) => {
    setConfirmDialog({
      isOpen: true,
      type: "RESTORE",
      title: "Restore Genre",
      targetName: genre.name,
      action: async () => {
        await GenreService.restoreGenre(genre.id);
        setGenres((prev) => prev.filter((g) => g.id !== genre.id));
        setTotalElements((prev) => Math.max(prev - 1, 0));
        showToast(`"${genre.name}" restored successfully.`, "success");
      },
    });
  };

  // Hard Delete
  const handleHardDelete = (genre: GenreResponse) => {
    setConfirmDialog({
      isOpen: true,
      type: "HARD_DELETE",
      title: "Permanently Delete Genre",
      targetName: genre.name,
      action: async () => {
        await GenreService.hardDeleteGenre(genre.id);
        setGenres((prev) => prev.filter((g) => g.id !== genre.id));
        setTotalElements((prev) => Math.max(prev - 1, 0));
        showToast(`"${genre.name}" permanently deleted.`, "success");
      },
    });
  };

  const filteredGenres = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return genres;
    return genres.filter((g) => g.name.toLowerCase().includes(query));
  }, [genres, searchQuery]);

  /**
   * =========================================================
   * DYNAMIC THEME CLASSES (PERMANENT HIGH-CONTRAST LIGHT & DARK)
   * =========================================================
   */
  const pageClass = isLight
    ? "bg-slate-50 text-slate-900"
    : "bg-slate-950 text-slate-100";

  const cardClass = isLight
    ? "border-slate-300 bg-white shadow-xl shadow-slate-200 ring-1 ring-slate-200"
    : "border-slate-800 bg-slate-900/60 shadow-2xl backdrop-blur-md";

  const inputClass = isLight
    ? "border-slate-300 bg-slate-50 text-slate-900 placeholder-slate-400 focus:border-red-500"
    : "border-slate-800 bg-slate-900/90 text-white placeholder-slate-500 focus:border-red-500";

  const modalBgClass = isLight
    ? "border-slate-300 bg-white shadow-2xl shadow-slate-300/60 text-slate-900 ring-1 ring-slate-200"
    : "border-slate-800 bg-slate-900 shadow-2xl text-slate-100";

  const textPrimary = isLight
    ? "text-slate-900 font-black"
    : "text-white font-black";
  const textSecondary = isLight
    ? "text-slate-700 font-bold"
    : "text-slate-400 font-medium";
  const textMuted = isLight
    ? "text-slate-600 font-bold"
    : "text-slate-600 font-medium";
  const borderCol = isLight ? "border-slate-300" : "border-slate-800";

  return (
    <div
      className={`min-h-screen py-6 px-4 sm:px-8 lg:px-10 w-full space-y-6 transition-colors duration-300 pb-24 ${pageClass}`}
    >
      <style jsx global>{`
        /* Completely hide scrollbars for Chrome, Safari, Edge, and Firefox */
        ::-webkit-scrollbar {
          display: none;
        }
        * {
          -ms-overflow-style: none; /* IE and Edge */
          scrollbar-width: none; /* Firefox */
        }
      `}</style>

      {/* Toast Alert */}
      <Toast
        message={toast.message}
        type={toast.type}
        duration={3500}
        onClose={() => setToast((prev) => ({ ...prev, message: null }))}
      />

      {/* Confirm Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        type={confirmDialog.type}
        title={confirmDialog.title}
        targetName={confirmDialog.targetName}
        onConfirm={async () => {
          await confirmDialog.action();
          setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        }}
        onCancel={() =>
          setConfirmDialog((prev) => ({ ...prev, isOpen: false }))
        }
      />

      {/* Top Header */}
      <div
        className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b ${borderCol} pb-5`}
      >
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-600 shrink-0">
              <Tags className="h-5 w-5" />
            </div>
            <div>
              <h1
                className={`text-xl sm:text-2xl font-black tracking-tight ${textPrimary} flex items-center gap-2`}
              >
                Movie Genres
                <span
                  className={`text-[10px] font-black px-2 py-0.5 rounded-full ${isLight ? "bg-white text-slate-800 border-slate-300 shadow-sm" : "bg-slate-800 text-slate-400 border-slate-700"} border`}
                >
                  {totalElements} Total
                </span>
              </h1>
              <p className={`text-xs ${textSecondary} mt-0.5`}>
                Manage movie categories, tags, and classification taxonomy
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => {
              setViewTrash(!viewTrash);
              setPage(0);
            }}
            className={`flex items-center gap-2 rounded-xl px-3.5 py-2.5 text-xs font-bold transition cursor-pointer border shadow-sm ${
              viewTrash
                ? "bg-amber-500/10 border-amber-500/30 text-amber-500"
                : isLight
                  ? "bg-white border-slate-300 text-slate-700 hover:text-slate-900 hover:bg-slate-50 shadow-sm"
                  : "bg-slate-900 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800"
            }`}
          >
            <Archive className="h-4 w-4" />
            <span>{viewTrash ? "Back to Active" : "Trash Bin"}</span>
          </button>

          {!viewTrash && (
            <button
              onClick={() => openModal()}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-red-600/25 hover:from-red-500 hover:to-rose-500 transition cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>Add Genre</span>
            </button>
          )}
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative max-w-md">
        <Search
          className={`absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 ${textSecondary}`}
        />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search genre by name (e.g. Action, Sci-Fi)..."
          className={`w-full rounded-2xl border py-3 pl-10 pr-4 text-xs font-bold outline-none focus:ring-1 focus:ring-red-500 shadow-lg transition ${inputClass}`}
        />
      </div>

      {/* Genre Grid */}
      {loading ? (
        <div className="flex min-h-[36vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-red-600" />
        </div>
      ) : filteredGenres.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredGenres.map((genre) => (
            <div
              key={genre.id}
              className={`group rounded-2xl border ${cardClass} p-4 backdrop-blur-md shadow-xl flex items-center justify-between hover:border-slate-400 dark:hover:border-slate-700 transition`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-red-500/20 to-rose-500/5 border border-red-500/30 text-red-600 font-black text-xs shadow-inner">
                  {genre.name.substring(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <h3
                    className={`text-sm font-black ${textPrimary} truncate group-hover:text-red-600 transition`}
                  >
                    {genre.name}
                  </h3>
                  <span
                    className={`text-[10px] ${textSecondary} font-mono font-bold`}
                  >
                    ID: #{genre.id}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                {!viewTrash ? (
                  <>
                    <button
                      onClick={() => openModal(genre)}
                      className={`p-1.5 rounded-xl ${isLight ? "text-slate-600 hover:text-slate-900 hover:bg-slate-200" : "text-slate-400 hover:text-white hover:bg-slate-800"} transition cursor-pointer`}
                      title="Edit Genre"
                    >
                      <Edit3 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleSoftDelete(genre)}
                      className="p-1.5 rounded-xl text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 transition cursor-pointer"
                      title="Move to Trash"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => handleRestore(genre)}
                      className="p-1.5 rounded-xl text-emerald-500 hover:text-emerald-600 hover:bg-emerald-500/10 transition cursor-pointer"
                      title="Restore Genre"
                    >
                      <RotateCcw className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleHardDelete(genre)}
                      className="p-1.5 rounded-xl text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 transition cursor-pointer"
                      title="Delete Permanently"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div
          className={`flex min-h-[30vh] flex-col items-center justify-center rounded-3xl border ${cardClass} p-8 text-center ${textSecondary} text-sm space-y-2`}
        >
          <Tags className={`h-10 w-10 ${textMuted} mb-1`} />
          <p className={`font-black ${textPrimary}`}>
            {viewTrash ? "Trash bin is empty." : "No movie genres found."}
          </p>
          <p className={`text-xs ${textSecondary}`}>
            {viewTrash
              ? "Deleted genres will appear here for restoration."
              : "Click 'Add Genre' to create your first movie category."}
          </p>
        </div>
      )}

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div
          className={`flex items-center justify-between border-t ${borderCol} pt-4 text-xs`}
        >
          <span className={textSecondary}>
            Page <span className={`font-black ${textPrimary}`}>{page + 1}</span>{" "}
            of <span className={`font-black ${textPrimary}`}>{totalPages}</span>
          </span>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setPage((prev) => Math.max(prev - 1, 0))}
              disabled={page === 0}
              className={`p-2 rounded-xl border ${borderCol} ${isLight ? "bg-white text-slate-800 hover:bg-slate-100 shadow-sm font-bold" : "bg-slate-900 text-slate-400 hover:text-white"} disabled:opacity-40 transition cursor-pointer`}
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() =>
                setPage((prev) => Math.min(prev + 1, totalPages - 1))
              }
              disabled={page >= totalPages - 1}
              className={`p-2 rounded-xl border ${borderCol} ${isLight ? "bg-white text-slate-800 hover:bg-slate-100 shadow-sm font-bold" : "bg-slate-900 text-slate-400 hover:text-white"} disabled:opacity-40 transition cursor-pointer`}
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Add / Edit Genre Modal Dialog */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div
            className={`relative w-full max-w-sm rounded-3xl border p-6 shadow-2xl space-y-4 ${modalBgClass}`}
          >
            <button
              onClick={() => setIsModalOpen(false)}
              className={`absolute right-5 top-5 ${textSecondary} hover:${textPrimary} cursor-pointer p-1 rounded-lg ${isLight ? "hover:bg-slate-100" : "hover:bg-slate-800"} transition`}
            >
              <X className="h-5 w-5" />
            </button>

            <div className={`border-b ${borderCol} pb-3`}>
              <h2
                className={`text-base sm:text-lg font-black ${textPrimary} flex items-center gap-2`}
              >
                <Sparkles className="h-4 w-4 text-red-600" />
                {editingGenre ? "Edit Genre" : "Add New Genre"}
              </h2>
            </div>

            <form
              onSubmit={handleSubmit}
              noValidate
              className="space-y-4 text-xs"
            >
              <div>
                <label
                  className={`block ${isLight ? "text-slate-800" : "text-slate-300"} mb-1.5 font-bold`}
                >
                  Genre Name *
                </label>
                <input
                  type="text"
                  autoFocus
                  value={genreName}
                  onChange={(e) => {
                    setGenreName(e.target.value);
                    if (nameError) setNameError(null);
                  }}
                  placeholder="e.g. Action, Horror, Animation, Sci-Fi"
                  className={`w-full rounded-xl border ${isLight ? "bg-white text-slate-900 border-slate-300 shadow-sm font-bold" : "bg-slate-950 text-white border-slate-800"} px-3.5 py-2.5 outline-none transition ${
                    nameError
                      ? "border-rose-500 focus:border-rose-500"
                      : "focus:border-red-500"
                  }`}
                />
                {nameError && (
                  <p className="mt-1 text-[11px] text-rose-500">{nameError}</p>
                )}
              </div>

              <div
                className={`flex justify-end gap-2.5 pt-3 border-t ${borderCol}`}
              >
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className={`rounded-xl border ${isLight ? "border-slate-300 bg-white text-slate-800 hover:bg-slate-100 shadow-sm font-bold" : "border-slate-800 bg-slate-950 text-slate-400 hover:text-white"} px-4 py-2.5 text-xs cursor-pointer transition`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-red-600/30 hover:from-red-500 hover:to-rose-500 disabled:opacity-50 cursor-pointer transition"
                >
                  {submitting && (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  )}
                  <span>{editingGenre ? "Save Changes" : "Create Genre"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
