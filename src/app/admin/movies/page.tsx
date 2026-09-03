"use client";

import { useEffect, useState, useRef, FormEvent } from "react";
import {
  Clapperboard,
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
  ChevronsLeft,
  ChevronsRight,
  Clock,
  UploadCloud,
  Film,
  Languages,
  Calendar as CalendarIcon,
  Link as LinkIcon,
  Check,
} from "lucide-react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

import MovieService from "@/app/service/movie.service";
import GenreService from "@/app/service/genre.service";
import {
  MovieResponse,
  MovieStatus,
  MovieLanguage,
  GenreResponse,
} from "@/app/types/api.types";
import Toast from "@/app/components/Toast";
import ConfirmDialog from "@/app/components/ConfirmDialog";

const STATUS_BADGES: Record<MovieStatus, { label: string; color: string }> = {
  NOW_SHOWING: {
    label: "Now Showing",
    color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
  },
  COMING_SOON: {
    label: "Coming Soon",
    color: "bg-sky-500/10 text-sky-400 border-sky-500/30",
  },
  ENDED: {
    label: "Ended",
    color: "bg-slate-800 text-slate-400 border-slate-700",
  },
};

const LANGUAGE_LABELS: Record<MovieLanguage, string> = {
  KHMER: "🇰🇭 Khmer",
  ENGLISH: "🇺🇸 English",
  CHINESE: "🇨🇳 Chinese",
};

const extractArray = <T,>(res: any): T[] => {
  if (Array.isArray(res)) return res;
  if (Array.isArray(res?.content)) return res.content;
  if (Array.isArray(res?.data)) return res.data;
  if (Array.isArray(res?.body?.data)) return res.body.data;
  if (Array.isArray(res?.data?.content)) return res.data.content;
  return [];
};

export default function AdminMoviesPage() {
  const [movies, setMovies] = useState<MovieResponse[]>([]);
  const [genresList, setGenresList] = useState<GenreResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewTrash, setViewTrash] = useState(false);

  // Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<MovieStatus | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState<MovieLanguage | null>(null);
  const [selectedGenreId, setSelectedGenreId] = useState<number | null>(null);

  // Pagination state
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);
  const pageSize = 10;

  // Multi-select state
  const [selectedMovieIds, setSelectedMovieIds] = useState<number[]>([]);

  // Modal & Form State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMovie, setEditingMovie] = useState<MovieResponse | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [movieForm, setMovieForm] = useState<{
    title: string;
    description: string;
    durationMinutes: number;
    status: MovieStatus;
    language: MovieLanguage;
    ageRating: string;
    trailerUrl: string;
    releaseDate: Date | null;
    genreIds: number[];
  }>({
    title: "",
    description: "",
    durationMinutes: 120,
    status: "NOW_SHOWING",
    language: "KHMER",
    ageRating: "G",
    trailerUrl: "",
    releaseDate: new Date(),
    genreIds: [],
  });

  const [posterFile, setPosterFile] = useState<File | null>(null);
  const [posterPreview, setPosterPreview] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Confirm & Toast State
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    type: "SOFT_DELETE" | "HARD_DELETE" | "RESTORE";
    targetName: string;
    action: () => Promise<void>;
  }>({
    isOpen: false,
    type: "SOFT_DELETE",
    targetName: "",
    action: async () => {},
  });

  const [toast, setToast] = useState<{
    message: string | null;
    type: "success" | "error" | "info";
  }>({
    message: null,
    type: "success",
  });

  const showToast = (message: string, type: "success" | "error" | "info" = "success") => {
    setToast({ message, type });
  };

  // Load genres list
  useEffect(() => {
    async function loadGenres() {
      try {
        const list = await GenreService.getActiveGenresList();
        setGenresList(extractArray<GenreResponse>(list));
      } catch {
        // Quiet fallback
      }
    }
    loadGenres();
  }, []);

  // Fetch movies list
  const fetchMovies = async () => {
    setLoading(true);
    try {
      const res = viewTrash
        ? await MovieService.getTrashMovies(searchQuery, page, pageSize, "updatedAt", "desc")
        : await MovieService.getAllMovies({
            status: selectedStatus,
            language: selectedLanguage,
            genreId: selectedGenreId,
            search: searchQuery,
            page,
            size: pageSize,
            sortBy: "createdAt",
            direction: "desc",
          });

      const list = extractArray<MovieResponse>(res);
      setMovies(list);
      setTotalPages(res?.totalPages || 1);
      setTotalElements(res?.totalElements || list.length);
      setSelectedMovieIds([]); // Reset selections on page change
    } catch {
      showToast("Failed to load movies list from server.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMovies();
  }, [page, viewTrash, selectedStatus, selectedLanguage, selectedGenreId, searchQuery]);

  // Selection handlers
  const handleToggleSelectOne = (id: number) => {
    setSelectedMovieIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAllCurrentPage = () => {
    if (movies.every((m) => selectedMovieIds.includes(m.id))) {
      setSelectedMovieIds([]);
    } else {
      setSelectedMovieIds(movies.map((m) => m.id));
    }
  };

  const handleBulkDelete = () => {
    if (selectedMovieIds.length === 0) return;
    setConfirmDialog({
      isOpen: true,
      type: "HARD_DELETE",
      targetName: `${selectedMovieIds.length} selected movies`,
      action: async () => {
        try {
          for (const id of selectedMovieIds) {
            if (viewTrash) {
              await MovieService.hardDeleteMovie(id);
            } else {
              await MovieService.softDeleteMovie(id);
            }
          }
          setSelectedMovieIds([]);
          fetchMovies();
          showToast(`Successfully processed ${selectedMovieIds.length} movies.`, "success");
        } catch (err: any) {
          const errorMsg =
            err.response?.data?.status?.message ||
            err.response?.data?.message ||
            "Failed to process bulk operation.";
          showToast(errorMsg, "error");
        }
      },
    });
  };

  // Modal actions
  const openModal = (movie?: MovieResponse) => {
    setErrors({});
    setPosterFile(null);
    if (movie) {
      setEditingMovie(movie);
      setPosterPreview(movie.posterUrl || null);
      setMovieForm({
        title: movie.title,
        description: movie.description || "",
        durationMinutes: movie.durationMinutes,
        status: movie.status,
        language: movie.language || "KHMER",
        ageRating: movie.ageRating || "G",
        trailerUrl: movie.trailerUrl || "",
        releaseDate: movie.releaseDate ? new Date(movie.releaseDate) : new Date(),
        genreIds: movie.genres?.map((g) => g.id) || [],
      });
    } else {
      setEditingMovie(null);
      setPosterPreview(null);
      setMovieForm({
        title: "",
        description: "",
        durationMinutes: 120,
        status: "NOW_SHOWING",
        language: "KHMER",
        ageRating: "G",
        trailerUrl: "",
        releaseDate: new Date(),
        genreIds: [],
      });
    }
    setIsModalOpen(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setPosterFile(file);
      setPosterPreview(URL.createObjectURL(file));
    }
  };

  const validate = () => {
    const err: Record<string, string> = {};
    if (!movieForm.title.trim()) err.title = "Movie title is required";
    if (!movieForm.durationMinutes || movieForm.durationMinutes <= 0) {
      err.durationMinutes = "Duration must be at least 1 minute";
    }
    setErrors(err);
    return Object.keys(err).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("title", movieForm.title.trim());
      formData.append("description", movieForm.description.trim());
      formData.append("durationMinutes", String(movieForm.durationMinutes));
      formData.append("status", movieForm.status);
      formData.append("language", movieForm.language);
      formData.append("ageRating", movieForm.ageRating);
      formData.append("trailerUrl", movieForm.trailerUrl.trim());
      
      if (movieForm.releaseDate) {
        const formattedDate = movieForm.releaseDate.toISOString().split("T")[0];
        formData.append("releaseDate", formattedDate);
      }

      movieForm.genreIds.forEach((id) => {
        formData.append("genreIds", String(id));
      });

      if (posterFile) {
        formData.append("posterFile", posterFile);
      }

      if (editingMovie) {
        await MovieService.updateMovie(editingMovie.id, formData);
        showToast(`Movie "${movieForm.title}" updated successfully!`, "success");
      } else {
        await MovieService.createMovie(formData);
        showToast(`Movie "${movieForm.title}" created successfully!`, "success");
      }

      setIsModalOpen(false);
      fetchMovies();
    } catch (err: any) {
      showToast(
        err.response?.data?.status?.message ||
          err.response?.data?.message ||
          "Failed to save movie.",
        "error"
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleSoftDelete = (movie: MovieResponse) => {
    setConfirmDialog({
      isOpen: true,
      type: "SOFT_DELETE",
      targetName: movie.title,
      action: async () => {
        try {
          await MovieService.softDeleteMovie(movie.id);
          fetchMovies();
          showToast(`"${movie.title}" moved to trash.`, "success");
        } catch (err: any) {
          showToast(err.response?.data?.status?.message || "Failed to move movie to trash.", "error");
        }
      },
    });
  };

  const handleRestore = (movie: MovieResponse) => {
    setConfirmDialog({
      isOpen: true,
      type: "RESTORE",
      targetName: movie.title,
      action: async () => {
        try {
          await MovieService.restoreMovie(movie.id);
          fetchMovies();
          showToast(`"${movie.title}" restored successfully.`, "success");
        } catch (err: any) {
          showToast(err.response?.data?.status?.message || "Failed to restore movie.", "error");
        }
      },
    });
  };

  const handleHardDelete = (movie: MovieResponse) => {
    setConfirmDialog({
      isOpen: true,
      type: "HARD_DELETE",
      targetName: movie.title,
      action: async () => {
        try {
          await MovieService.hardDeleteMovie(movie.id);
          fetchMovies();
          showToast(`"${movie.title}" permanently deleted.`, "success");
        } catch (err: any) {
          const errorMsg =
            err.response?.data?.status?.message ||
            err.response?.data?.message ||
            "Cannot permanently delete this movie because active showtimes or bookings are attached to it.";
          showToast(errorMsg, "error");
        }
      },
    });
  };

  const allCurrentPageSelected = movies.length > 0 && movies.every((m) => selectedMovieIds.includes(m.id));

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 px-3 sm:px-6 py-4 pb-20">
      <style jsx global>{`
        .react-datepicker__portal {
          z-index: 60;
          background-color: rgba(0, 0, 0, 0.85);
        }
        .react-datepicker {
          background-color: #0f172a;
          border: 1px solid #1e293b;
          font-family: inherit;
        }
        .react-datepicker__header {
          background-color: #1e293b;
          border-bottom: 1px solid #334155;
        }
        .react-datepicker__current-month,
        .react-datepicker__day-name {
          color: #f1f5f9;
        }
        .react-datepicker__day {
          color: #cbd5e1;
        }
        .react-datepicker__day:hover {
          background-color: #334155 !important;
        }
        .react-datepicker__day--selected {
          background-color: #dc2626 !important;
          color: white !important;
        }
        .react-datepicker__triangle {
          display: none;
        }
      `}</style>

      <Toast
        message={toast.message}
        type={toast.type}
        duration={3500}
        onClose={() => setToast((prev) => ({ ...prev, message: null }))}
      />

      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        type={confirmDialog.type}
        targetName={confirmDialog.targetName}
        onConfirm={async () => {
          try {
            await confirmDialog.action();
            setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
          } catch (err: any) {
            const errorMsg =
              err.response?.data?.status?.message ||
              err.response?.data?.message ||
              "Failed to process confirmation action.";
            showToast(errorMsg, "error");
            setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
          }
        }}
        onCancel={() => setConfirmDialog((prev) => ({ ...prev, isOpen: false }))}
      />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500 shrink-0">
              <Clapperboard className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2">
                Movie Releases
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
                  {totalElements} Total
                </span>
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                Manage movie titles, audio languages, posters, schedules, and taxonomy
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
                ? "bg-amber-500/10 border-amber-500/30 text-amber-400"
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
              <span>Add New Movie</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
        <div className="sm:col-span-5 relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(0);
            }}
            placeholder="Search movie title in database..."
            className="w-full rounded-2xl border border-slate-800 bg-slate-900/90 py-3 pl-10 pr-4 text-xs font-medium text-white placeholder-slate-500 outline-none focus:border-red-500 shadow-lg transition"
          />
        </div>

        {!viewTrash && (
          <>
            <div className="sm:col-span-2">
              <select
                value={selectedStatus || ""}
                onChange={(e) => {
                  setSelectedStatus((e.target.value as MovieStatus) || null);
                  setPage(0);
                }}
                className="w-full rounded-2xl border border-slate-800 bg-slate-900/90 py-3 px-3 text-xs font-bold text-slate-300 outline-none focus:border-red-500 cursor-pointer shadow-lg"
              >
                <option value="">All Statuses</option>
                <option value="NOW_SHOWING">Now Showing</option>
                <option value="COMING_SOON">Coming Soon</option>
                <option value="ENDED">Ended</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <select
                value={selectedLanguage || ""}
                onChange={(e) => {
                  setSelectedLanguage((e.target.value as MovieLanguage) || null);
                  setPage(0);
                }}
                className="w-full rounded-2xl border border-slate-800 bg-slate-900/90 py-3 px-3 text-xs font-bold text-slate-300 outline-none focus:border-red-500 cursor-pointer shadow-lg"
              >
                <option value="">All Languages</option>
                <option value="KHMER">🇰🇭 Khmer</option>
                <option value="ENGLISH">🇺🇸 English</option>
                <option value="CHINESE">🇨🇳 Chinese</option>
              </select>
            </div>

            <div className="sm:col-span-3">
              <select
                value={selectedGenreId || ""}
                onChange={(e) => {
                  setSelectedGenreId(e.target.value ? Number(e.target.value) : null);
                  setPage(0);
                }}
                className="w-full rounded-2xl border border-slate-800 bg-slate-900/90 py-3 px-3 text-xs font-bold text-slate-300 outline-none focus:border-red-500 cursor-pointer shadow-lg"
              >
                <option value="">All Genres</option>
                {genresList.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
            </div>
          </>
        )}
      </div>

      {/* Movies Row Table */}
      {loading ? (
        <div className="flex min-h-[36vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-red-600" />
        </div>
      ) : movies.length > 0 ? (
        <div className="rounded-3xl border border-slate-800/80 bg-slate-900/50 overflow-hidden shadow-xl backdrop-blur-md relative">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/60 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="py-3.5 px-4 w-12 text-center">
                    <button
                      type="button"
                      onClick={handleSelectAllCurrentPage}
                      className={`h-5 w-5 mx-auto rounded-lg border flex items-center justify-center transition cursor-pointer ${
                        allCurrentPageSelected
                          ? "bg-red-600 border-red-500 text-white shadow-md shadow-red-600/30"
                          : "border-slate-700 bg-slate-900 text-transparent hover:border-slate-500"
                      }`}
                      title={allCurrentPageSelected ? "Deselect All" : "Select All"}
                    >
                      <Check className="h-3.5 w-3.5 stroke-[3]" />
                    </button>
                  </th>
                  <th className="py-3.5 px-4">Movie</th>
                  <th className="py-3.5 px-4">Genres</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Language</th>
                  <th className="py-3.5 px-4">Duration</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-xs text-slate-300">
                {movies.map((movie) => {
                  const statusStyle =
                    STATUS_BADGES[movie.status] || STATUS_BADGES.NOW_SHOWING;
                  const isChecked = selectedMovieIds.includes(movie.id);

                  return (
                    <tr
                      key={movie.id}
                      className={`transition group ${isChecked ? "bg-red-950/20" : "hover:bg-slate-800/40"}`}
                    >
                      <td className="py-3 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleSelectOne(movie.id)}
                          className={`h-5 w-5 mx-auto rounded-lg border flex items-center justify-center transition cursor-pointer ${
                            isChecked
                              ? "bg-red-600 border-red-500 text-white shadow-md shadow-red-600/30"
                              : "border-slate-700 bg-slate-900 text-transparent hover:border-slate-500"
                          }`}
                        >
                          <Check className="h-3.5 w-3.5 stroke-[3]" />
                        </button>
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="relative h-12 w-9 shrink-0 rounded-xl bg-slate-950 overflow-hidden border border-slate-800">
                            {movie.posterUrl ? (
                              <img
                                src={movie.posterUrl}
                                alt={movie.title}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-slate-600">
                                <Film className="h-4 w-4" />
                              </div>
                            )}
                          </div>
                          <div>
                            <p className="font-bold text-white group-hover:text-red-400 transition">
                              {movie.title}
                            </p>
                            {movie.ageRating && (
                              <span className="inline-block mt-0.5 text-[9px] font-bold px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 border border-slate-700">
                                {movie.ageRating}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {movie.genres?.map((g) => (
                            <span
                              key={g.id}
                              className="text-[10px] font-medium px-2 py-0.5 rounded-lg bg-slate-800/80 text-slate-300 border border-slate-700/60"
                            >
                              {g.name}
                            </span>
                          ))}
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <span
                          className={`inline-block text-[10px] font-bold px-2.5 py-1 rounded-lg border ${statusStyle.color}`}
                        >
                          {statusStyle.label}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-300">
                          <Languages className="h-3 w-3 text-red-400" />
                          {LANGUAGE_LABELS[movie.language] || movie.language}
                        </span>
                      </td>

                      <td className="py-3 px-4 font-mono text-slate-400">
                        <div className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5 text-slate-500" />
                          <span>{movie.durationMinutes} mins</span>
                        </div>
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {!viewTrash ? (
                            <>
                              <button
                                onClick={() => openModal(movie)}
                                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer border border-transparent hover:border-slate-700"
                                title="Edit Movie"
                              >
                                <Edit3 className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleSoftDelete(movie)}
                                className="p-2 rounded-xl text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition cursor-pointer border border-transparent hover:border-rose-500/20"
                                title="Move to Trash"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => handleRestore(movie)}
                                className="p-2 rounded-xl text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 transition cursor-pointer border border-transparent hover:border-emerald-500/20"
                                title="Restore Movie"
                              >
                                <RotateCcw className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleHardDelete(movie)}
                                className="p-2 rounded-xl text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition cursor-pointer border border-transparent hover:border-rose-500/20"
                                title="Permanently Delete"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </>
                          )}
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
        <div className="flex min-h-[30vh] flex-col items-center justify-center rounded-3xl border border-slate-800 bg-slate-900/30 p-8 text-center text-slate-400 text-sm space-y-2">
          <Clapperboard className="h-10 w-10 text-slate-600 mb-1" />
          <p className="font-semibold text-slate-300">
            {viewTrash
              ? "Trash bin is empty."
              : "No movies found matching current filter."}
          </p>
        </div>
      )}

      {/* Floating Bulk Action Bar */}
      {selectedMovieIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-4 rounded-2xl border border-rose-500/40 bg-slate-950/90 px-5 py-3 shadow-2xl backdrop-blur-md animate-in slide-in-from-bottom-5">
          <span className="text-xs font-bold text-white">
            {selectedMovieIds.length} movie{selectedMovieIds.length > 1 ? "s" : ""} selected
          </span>
          <button
            onClick={handleBulkDelete}
            className="flex items-center gap-2 rounded-xl bg-rose-600 hover:bg-rose-500 px-4 py-2 text-xs font-bold text-white transition shadow-lg shadow-rose-600/30 cursor-pointer"
          >
            <Trash2 className="h-4 w-4" />
            <span>{viewTrash ? "Delete Permanently" : "Move to Trash"}</span>
          </button>
        </div>
      )}

      {/* Cool Advanced Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between border-t border-slate-800/80 pt-4 text-xs gap-3">
          <span className="text-slate-400 font-medium">
            Page <span className="font-bold text-white">{page + 1}</span> of{" "}
            <span className="font-bold text-white">{totalPages}</span> ({totalElements} items)
          </span>

          <div className="flex items-center gap-1.5 flex-wrap justify-center">
            <button
              onClick={() => setPage(0)}
              disabled={page === 0}
              className="p-2 rounded-xl border border-slate-800 bg-slate-900 text-slate-400 hover:text-white disabled:opacity-30 transition cursor-pointer"
              title="First Page"
            >
              <ChevronsLeft className="h-4 w-4" />
            </button>

            <button
              onClick={() => setPage((prev) => Math.max(prev - 1, 0))}
              disabled={page === 0}
              className="flex items-center gap-1 px-3 py-2 rounded-xl border border-slate-800 bg-slate-900 text-slate-300 hover:text-white disabled:opacity-30 transition cursor-pointer font-bold"
            >
              <ChevronLeft className="h-4 w-4" />
              <span>Prev</span>
            </button>

            {Array.from({ length: totalPages }, (_, i) => i)
              .filter((pNum) => pNum === 0 || pNum === totalPages - 1 || Math.abs(pNum - page) <= 1)
              .map((pNum, idx, arr) => {
                const showEllipsisBefore = idx > 0 && pNum - arr[idx - 1] > 1;
                return (
                  <div key={pNum} className="flex items-center gap-1.5">
                    {showEllipsisBefore && <span className="text-slate-600 px-1">...</span>}
                    <button
                      onClick={() => setPage(pNum)}
                      className={`h-9 w-9 rounded-xl border text-xs font-bold transition cursor-pointer flex items-center justify-center font-mono ${
                        page === pNum
                          ? "bg-red-600 border-red-500 text-white shadow-lg shadow-red-600/30"
                          : "border-slate-800 bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800"
                      }`}
                    >
                      {pNum + 1}
                    </button>
                  </div>
                );
              })}

            <button
              onClick={() => setPage((prev) => Math.min(prev + 1, totalPages - 1))}
              disabled={page >= totalPages - 1}
              className="flex items-center gap-1 px-3 py-2 rounded-xl border border-slate-800 bg-slate-900 text-slate-300 hover:text-white disabled:opacity-30 transition cursor-pointer font-bold"
            >
              <span>Next</span>
              <ChevronRight className="h-4 w-4" />
            </button>

            <button
              onClick={() => setPage(totalPages - 1)}
              disabled={page >= totalPages - 1}
              className="p-2 rounded-xl border border-slate-800 bg-slate-900 text-slate-400 hover:text-white disabled:opacity-30 transition cursor-pointer"
              title="Last Page"
            >
              <ChevronsRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Add / Edit Movie Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl border border-slate-800 bg-slate-900 p-6 sm:p-8 shadow-2xl space-y-5 scrollbar-thin scrollbar-thumb-slate-800">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute right-5 top-5 text-slate-400 hover:text-white cursor-pointer p-1 rounded-lg hover:bg-slate-800 transition"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="border-b border-slate-800 pb-3">
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-red-500" />
                {editingMovie ? "Edit Movie Details" : "Create New Movie"}
              </h2>
            </div>

            <form onSubmit={handleSubmit} noValidate className="space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                <div className="md:col-span-4 space-y-2">
                  <label className="block text-slate-300 font-bold">Movie Poster</label>
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="relative aspect-[2/3] w-full rounded-2xl border-2 border-dashed border-slate-700 bg-slate-950 flex flex-col items-center justify-center cursor-pointer overflow-hidden hover:border-red-500/70 transition"
                  >
                    {posterPreview ? (
                      <img
                        src={posterPreview}
                        alt="Preview"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="flex flex-col items-center gap-2 text-slate-500 p-4 text-center">
                        <UploadCloud className="h-8 w-8 text-slate-400" />
                        <span className="text-[10px] font-semibold">Click to upload poster image</span>
                      </div>
                    )}
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </div>

                <div className="md:col-span-8 space-y-3">
                  <div>
                    <label className="block text-slate-300 mb-1 font-bold">Movie Title *</label>
                    <input
                      type="text"
                      value={movieForm.title}
                      onChange={(e) => {
                        setMovieForm({ ...movieForm, title: e.target.value });
                        if (errors.title) setErrors((p) => ({ ...p, title: "" }));
                      }}
                      placeholder="e.g. Avatar: The Way of Water"
                      className={`w-full rounded-xl border bg-slate-950 px-3.5 py-2.5 text-white outline-none ${
                        errors.title ? "border-rose-500" : "border-slate-800 focus:border-red-500"
                      }`}
                    />
                    {errors.title && <p className="mt-1 text-[11px] text-rose-400">{errors.title}</p>}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-300 mb-1 font-bold">Duration (Minutes) *</label>
                      <input
                        type="number"
                        min="1"
                        value={movieForm.durationMinutes}
                        onChange={(e) =>
                          setMovieForm({ ...movieForm, durationMinutes: Number(e.target.value) })
                        }
                        className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-white outline-none focus:border-red-500 font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-300 mb-1 font-bold">Status *</label>
                      <select
                        value={movieForm.status}
                        onChange={(e) =>
                          setMovieForm({ ...movieForm, status: e.target.value as MovieStatus })
                        }
                        className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-white outline-none focus:border-red-500 cursor-pointer"
                      >
                        <option value="NOW_SHOWING">Now Showing</option>
                        <option value="COMING_SOON">Coming Soon</option>
                        <option value="ENDED">Ended</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-300 mb-1 font-bold">Language *</label>
                      <select
                        value={movieForm.language}
                        onChange={(e) =>
                          setMovieForm({ ...movieForm, language: e.target.value as MovieLanguage })
                        }
                        className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-white outline-none focus:border-red-500 cursor-pointer"
                      >
                        <option value="KHMER">🇰🇭 Khmer</option>
                        <option value="ENGLISH">🇺🇸 English</option>
                        <option value="CHINESE">🇨🇳 Chinese</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-slate-300 mb-1 font-bold">Age Rating</label>
                      <input
                        type="text"
                        value={movieForm.ageRating}
                        onChange={(e) => setMovieForm({ ...movieForm, ageRating: e.target.value })}
                        placeholder="e.g. G, PG-13, R18+"
                        className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-white outline-none focus:border-red-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-300 mb-1 font-bold flex items-center gap-1.5">
                      <CalendarIcon className="h-3.5 w-3.5 text-red-500" />
                      Release Date
                    </label>
                    <DatePicker
                      selected={movieForm.releaseDate}
                      onChange={(date: Date | null) =>
                        setMovieForm({ ...movieForm, releaseDate: date || new Date() })
                      }
                      dateFormat="yyyy-MM-dd"
                      className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-white outline-none focus:border-red-500 font-mono cursor-pointer"
                      wrapperClassName="w-full"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 mb-1 font-bold flex items-center gap-1.5">
                      <LinkIcon className="h-3.5 w-3.5 text-red-500" />
                      Trailer URL
                    </label>
                    <input
                      type="text"
                      value={movieForm.trailerUrl}
                      onChange={(e) => setMovieForm({ ...movieForm, trailerUrl: e.target.value })}
                      placeholder="https://www.youtube.com/watch?v=..."
                      className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-white outline-none focus:border-red-500"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 mb-1.5 font-bold">
                  Genres (Select matching categories)
                </label>
                <div className="flex flex-wrap gap-1.5 p-3 rounded-2xl border border-slate-800 bg-slate-950">
                  {genresList.map((g) => {
                    const isSelected = movieForm.genreIds.includes(g.id);
                    return (
                      <button
                        key={g.id}
                        type="button"
                        onClick={() => {
                          setMovieForm((prev) => ({
                            ...prev,
                            genreIds: isSelected
                              ? prev.genreIds.filter((id) => id !== g.id)
                              : [...prev.genreIds, g.id],
                          }));
                        }}
                        className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition cursor-pointer border ${
                          isSelected
                            ? "bg-red-500/20 border-red-500 text-red-300"
                            : "bg-slate-900 border-slate-800 text-slate-400 hover:text-white"
                        }`}
                      >
                        {g.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-bold">Synopsis / Description</label>
                <textarea
                  rows={3}
                  value={movieForm.description}
                  onChange={(e) => setMovieForm({ ...movieForm, description: e.target.value })}
                  placeholder="Short movie plot and summary..."
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-white outline-none resize-none focus:border-red-500"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-xl border border-slate-800 bg-slate-950 px-4 py-2.5 text-xs font-semibold text-slate-400 hover:text-white cursor-pointer transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-red-600/30 hover:from-red-500 hover:to-rose-500 disabled:opacity-50 cursor-pointer transition"
                >
                  {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  <span>{editingMovie ? "Save Changes" : "Create Movie"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}