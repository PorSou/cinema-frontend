"use client";

import { useEffect, useState, useMemo, FormEvent } from "react";
import {
  Calendar as CalendarIcon,
  Plus,
  Edit3,
  Trash2,
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
  Building,
  Tv,
  DollarSign,
  AlertTriangle,
  Info,
  Zap,
  Check,
} from "lucide-react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

import MovieService from "@/app/service/movie.service";
import HallService from "@/app/service/hall.service";
import CinemaService from "@/app/service/cinema.service";
import { MovieResponse, HallResponse, CinemaResponse, ShowtimeResponse, ShowtimeRequest } from "@/app/types/api.types";
import Toast from "@/app/components/Toast";
import ConfirmDialog from "@/app/components/ConfirmDialog";
import ShowtimeService from "@/app/service/showtime.service";

const extractArray = <T,>(res: any): T[] => {
  if (Array.isArray(res)) return res;
  if (Array.isArray(res?.content)) return res.content;
  if (Array.isArray(res?.data)) return res.data;
  if (Array.isArray(res?.body?.data)) return res.body.data;
  if (Array.isArray(res?.data?.content)) return res.data.content;
  return [];
};

const BUFFER_MINUTES = 15;
const CONFLICT_FETCH_SIZE = 500;
const MAX_LOOKAHEAD_DAYS = 30;

const formatHM = (raw?: string): string => {
  if (!raw) return "--:--";
  const iso = raw.includes("T") ? raw : raw.replace(" ", "T");
  const d = new Date(iso);
  if (isNaN(d.getTime())) return raw;
  return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit", hour12: true });
};

const sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

const addDays = (d: Date, n: number) => {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + n);
  return copy;
};

const startOfDay = (d: Date) => {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy;
};

const endOfDay = (d: Date) => {
  const copy = new Date(d);
  copy.setHours(23, 59, 59, 999);
  return copy;
};

const parseBackendDate = (raw: string) =>
  new Date(raw.includes("T") ? raw : raw.replace(" ", "T"));

export default function AdminShowtimesPage() {
  const [showtimes, setShowtimes] = useState<ShowtimeResponse[]>([]);
  const [moviesList, setMoviesList] = useState<MovieResponse[]>([]);
  const [cinemasList, setCinemasList] = useState<CinemaResponse[]>([]);
  const [hallsList, setHallsList] = useState<(HallResponse & { cinemaName?: string; cinemaCity?: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewTrash, setViewTrash] = useState(false);

  const [allShowtimesFull, setAllShowtimesFull] = useState<ShowtimeResponse[]>([]);

  // Pagination state
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);
  const pageSize = 10;

  // Multi-select state
  const [selectedShowtimeIds, setSelectedShowtimeIds] = useState<number[]>([]);

  // Modal & Form State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingShowtime, setEditingShowtime] = useState<ShowtimeResponse | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [selectedCinemaFilter, setSelectedCinemaFilter] = useState<number | 0>(0);

  const [showtimeForm, setShowtimeForm] = useState<{
    movieId: number;
    hallId: number;
    startTime: Date;
    basePrice: number;
  }>({
    movieId: 0,
    hallId: 0,
    startTime: new Date(),
    basePrice: 4.50,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pendingTimes, setPendingTimes] = useState<Date[]>([]);

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

  useEffect(() => {
    async function loadDropdownData() {
      try {
        const moviesRes = await MovieService.getAllMovies({ size: 100 });
        setMoviesList(extractArray<MovieResponse>(moviesRes));

        const cinemasRes = await CinemaService.getAllCinemas();
        const cinemas = extractArray<CinemaResponse>(cinemasRes);
        setCinemasList(cinemas);

        let allHalls: any[] = [];
        for (const cinema of cinemas) {
          try {
            const hallsRes = await HallService.getHallsByCinema(cinema.id);
            const mappedHalls = extractArray<HallResponse>(hallsRes).map((h) => ({
              ...h,
              cinemaName: cinema.name,
              cinemaCity: cinema.city,
            }));
            allHalls = [...allHalls, ...mappedHalls];
          } catch {
            // Skip branch
          }
        }
        setHallsList(allHalls);
      } catch {
        // Fallback quiet
      }
    }
    loadDropdownData();
  }, []);

  const fetchShowtimes = async () => {
    setLoading(true);
    try {
      const res = viewTrash
        ? await ShowtimeService.getTrashShowtimes(page, pageSize)
        : await ShowtimeService.getAllShowtimes(page, pageSize, "id", "desc");

      const list = extractArray<ShowtimeResponse>(res).sort((a, b) => b.id - a.id);
      setShowtimes(list);
      setTotalPages(res?.totalPages || 1);
      setTotalElements(res?.totalElements || list.length);
      setSelectedShowtimeIds([]);
    } catch {
      showToast("Failed to load showtimes list from server.", "error");
    } finally {
      setLoading(false);
    }
  };

  const fetchAllShowtimesForConflictPreview = async () => {
    try {
      const res = await ShowtimeService.getAllShowtimes(0, CONFLICT_FETCH_SIZE);
      setAllShowtimesFull(extractArray<ShowtimeResponse>(res));
    } catch {
      // Preview optional
    }
  };

  useEffect(() => {
    fetchShowtimes();
  }, [page, viewTrash]);

  useEffect(() => {
    fetchAllShowtimesForConflictPreview();
  }, []);

  const handleToggleSelectOne = (id: number) => {
    setSelectedShowtimeIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAllCurrentPage = () => {
    if (showtimes.every((st) => selectedShowtimeIds.includes(st.id))) {
      setSelectedShowtimeIds([]);
    } else {
      setSelectedShowtimeIds(showtimes.map((st) => st.id));
    }
  };

  const handleBulkDelete = () => {
    if (selectedShowtimeIds.length === 0) return;
    setConfirmDialog({
      isOpen: true,
      type: "HARD_DELETE",
      targetName: `${selectedShowtimeIds.length} selected showtimes`,
      action: async () => {
        for (const id of selectedShowtimeIds) {
          if (viewTrash) {
            await ShowtimeService.hardDeleteShowtime(id);
          } else {
            await ShowtimeService.softDeleteShowtime(id);
          }
        }
        setSelectedShowtimeIds([]);
        fetchShowtimes();
        fetchAllShowtimesForConflictPreview();
        showToast(`Successfully processed ${selectedShowtimeIds.length} showtimes.`, "success");
      },
    });
  };

  const openModal = (showtime?: ShowtimeResponse) => {
    setErrors({});
    setSelectedCinemaFilter(0);
    setPendingTimes([]);
    if (showtime) {
      setEditingShowtime(showtime);
      setShowtimeForm({
        movieId: showtime.movieId,
        hallId: showtime.hallId,
        startTime: new Date(showtime.startTime),
        basePrice: showtime.basePrice,
      });
      setSelectedCinemaFilter(showtime.cinemaId || 0);
    } else {
      setEditingShowtime(null);
      setShowtimeForm({
        movieId: moviesList[0]?.id || 0,
        hallId: hallsList[0]?.id || 0,
        startTime: new Date(),
        basePrice: 4.50,
      });
    }
    setIsModalOpen(true);
  };

  const selectedMovieDuration = useMemo(
    () => moviesList.find((m) => m.id === showtimeForm.movieId)?.durationMinutes || 0,
    [moviesList, showtimeForm.movieId]
  );

  const previewEndTime = useMemo(() => {
    if (!selectedMovieDuration) return null;
    return new Date(showtimeForm.startTime.getTime() + (selectedMovieDuration + BUFFER_MINUTES) * 60000);
  }, [showtimeForm.startTime, selectedMovieDuration]);

  const getCombinedDaySlots = (
    day: Date,
    pendingOverride?: Date[]
  ): { key: string; start: Date; end: Date; label: string; pending: boolean }[] => {
    if (!showtimeForm.hallId || !showtimeForm.movieId) return [];
    const pending = pendingOverride ?? pendingTimes;
    const requiredMs = (selectedMovieDuration + BUFFER_MINUTES) * 60000;
    const selectedMovieTitle = moviesList.find((m) => m.id === showtimeForm.movieId)?.title || "This movie";

    const real = allShowtimesFull
      .filter((s) => s.hallId === showtimeForm.hallId)
      .filter((s) => s.movieId === showtimeForm.movieId)
      .filter((s) => !editingShowtime || s.id !== editingShowtime.id)
      .filter((s) => sameDay(parseBackendDate(s.startTime), day))
      .map((s) => ({
        key: `real-${s.id}`,
        start: parseBackendDate(s.startTime),
        end: parseBackendDate(s.endTime || s.startTime),
        label: s.movieTitle,
        pending: false,
      }));

    const staged = pending
      .filter((t) => sameDay(t, day))
      .map((t, i) => ({
        key: `pending-${i}-${t.getTime()}`,
        start: t,
        end: new Date(t.getTime() + requiredMs),
        label: selectedMovieTitle,
        pending: true,
      }));

    return [...real, ...staged].sort((a, b) => a.start.getTime() - b.start.getTime());
  };

  const hallDaySlots = useMemo(
    () => getCombinedDaySlots(showtimeForm.startTime),
    [allShowtimesFull, showtimeForm.hallId, showtimeForm.startTime, showtimeForm.movieId, editingShowtime, pendingTimes, selectedMovieDuration, moviesList]
  );

  const overlapWarning = useMemo(() => {
    if (!previewEndTime || hallDaySlots.length === 0) return null;
    const newStart = showtimeForm.startTime.getTime();
    const newEnd = previewEndTime.getTime();

    for (const s of hallDaySlots) {
      if (newStart < s.end.getTime() && newEnd > s.start.getTime()) {
        const startLabel = formatHM(s.start.toISOString());
        const endLabel = formatHM(s.end.toISOString());
        return `This movie overlaps with its own showing "${s.label}"${s.pending ? " (staged above)" : ""} (${startLabel} – ${endLabel}). Pick a time at or after ${endLabel}.`;
      }
    }
    return null;
  }, [hallDaySlots, previewEndTime, showtimeForm.startTime]);

  const findNextAvailableSlotFrom = (fromDate: Date, maxDays: number, pendingOverride?: Date[]): Date | null => {
    const requiredMs = (selectedMovieDuration + BUFFER_MINUTES) * 60000;
    if (!selectedMovieDuration || !showtimeForm.hallId) return null;

    for (let dayOffset = 0; dayOffset <= maxDays; dayOffset++) {
      const day = dayOffset === 0 ? fromDate : startOfDay(addDays(fromDate, dayOffset));
      const dayEnd = endOfDay(day);
      const daySlots = getCombinedDaySlots(day, pendingOverride);

      let candidate = day;
      for (const s of daySlots) {
        if (s.start.getTime() - candidate.getTime() >= requiredMs) {
          return candidate;
        }
        if (s.end.getTime() > candidate.getTime()) {
          candidate = s.end;
        }
      }

      if (dayEnd.getTime() - candidate.getTime() >= requiredMs) {
        return candidate;
      }
    }
    return null;
  };

  const findNextAvailableSlot = (): Date | null =>
    findNextAvailableSlotFrom(showtimeForm.startTime, MAX_LOOKAHEAD_DAYS);

  const handleFindNextAvailable = () => {
    if (!showtimeForm.movieId) {
      showToast("Pick a movie first so the runtime is known.", "info");
      return;
    }
    if (!showtimeForm.hallId) {
      showToast("Pick a hall first.", "info");
      return;
    }
    const slot = findNextAvailableSlot();
    if (slot) {
      setShowtimeForm((prev) => ({ ...prev, startTime: slot }));
      showToast("Jumped to the next available slot for this movie in this hall.", "success");
    } else {
      showToast(`No free slot found for this movie in this hall within the next ${MAX_LOOKAHEAD_DAYS} days.`, "error");
    }
  };

  const handleAddTime = () => {
    if (!showtimeForm.movieId) {
      showToast("Pick a movie first.", "info");
      return;
    }
    if (!showtimeForm.hallId) {
      showToast("Pick a hall first.", "info");
      return;
    }
    if (overlapWarning) {
      showToast("Fix the time conflict before adding this slot.", "error");
      return;
    }

    const updatedPending = [...pendingTimes, showtimeForm.startTime];
    setPendingTimes(updatedPending);

    const next = findNextAvailableSlotFrom(showtimeForm.startTime, 0, updatedPending);
    if (next) {
      setShowtimeForm((prev) => ({ ...prev, startTime: next }));
      showToast("Time added to batch queue!", "success");
    } else {
      showToast("Time added. No more room left today in this hall.", "info");
    }
  };

  const handleRemovePendingTime = (index: number) => {
    setPendingTimes((prev) => prev.filter((_, i) => i !== index));
  };

  const formatDateTimeForApi = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    const hours = String(d.getHours()).padStart(2, "0");
    const minutes = String(d.getMinutes()).padStart(2, "0");
    return `${year}-${month}-${day} ${hours}:${minutes}:00`;
  };

  const validate = () => {
    const err: Record<string, string> = {};
    if (!showtimeForm.movieId) err.movieId = "Please select a movie";
    if (!showtimeForm.hallId) err.hallId = "Please select a screening hall";
    if (!showtimeForm.basePrice || showtimeForm.basePrice <= 0) {
      err.basePrice = "Base price must be greater than 0";
    }
    return Object.keys(err).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (editingShowtime) {
      if (!validate()) return;
      if (overlapWarning) {
        setErrors({ startTime: overlapWarning });
        return;
      }
      setSubmitting(true);
      try {
        const payload = {
          movieId: Number(showtimeForm.movieId),
          hallId: Number(showtimeForm.hallId),
          startTime: formatDateTimeForApi(showtimeForm.startTime),
          basePrice: Number(showtimeForm.basePrice),
        };
        await ShowtimeService.updateShowtime(editingShowtime.id, payload);
        showToast("Showtime updated successfully!", "success");
        setIsModalOpen(false);
        fetchShowtimes();
        fetchAllShowtimesForConflictPreview();
      } catch (err: any) {
        const status = err?.response?.status;
        showToast(
          status === 409
            ? "This movie already has a showtime in that hall during this timeframe (including the 15-minute buffer)."
            : err.response?.data?.status?.message || err.response?.data?.message || "Failed to save showtime.",
          "error"
        );
      } finally {
        setSubmitting(false);
      }
      return;
    }

    if (!validate()) return;

    let timesToCreate = [...pendingTimes];
    if (timesToCreate.length === 0) {
      if (overlapWarning) {
        setErrors({ startTime: overlapWarning });
        return;
      }
      timesToCreate = [showtimeForm.startTime];
    }

    const payloadList: ShowtimeRequest[] = timesToCreate.map((t) => ({
      movieId: Number(showtimeForm.movieId),
      hallId: Number(showtimeForm.hallId),
      startTime: formatDateTimeForApi(t),
      basePrice: Number(showtimeForm.basePrice),
    }));

    setSubmitting(true);
    try {
      const created = await ShowtimeService.createBatchShowtimes(payloadList);
      const createdCount = Array.isArray(created) ? created.length : payloadList.length;
      showToast(
        `${createdCount} showtime${createdCount > 1 ? "s" : ""} scheduled successfully for customers!`,
        "success"
      );
      setIsModalOpen(false);
      setPendingTimes([]);
      fetchShowtimes();
      fetchAllShowtimesForConflictPreview();
    } catch (err: any) {
      const status = err?.response?.status;
      showToast(
        status === 409
          ? "One of the staged times conflicts with an existing showtime. Review the batch queue, remove the conflicting slot, and try again."
          : err.response?.data?.status?.message || err.response?.data?.message || "Failed to schedule showtimes.",
        "error"
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleSoftDelete = (st: ShowtimeResponse) => {
    setConfirmDialog({
      isOpen: true,
      type: "SOFT_DELETE",
      targetName: `${st.movieTitle} at ${st.hallName}`,
      action: async () => {
        try {
          await ShowtimeService.softDeleteShowtime(st.id);
          fetchShowtimes();
          fetchAllShowtimesForConflictPreview();
          showToast("Showtime moved to trash.", "success");
        } catch (err: any) {
          const errorMsg =
            err.response?.data?.status?.message ||
            err.response?.data?.message ||
            "Failed to move showtime to trash.";
          showToast(errorMsg, "error");
        }
      },
    });
  };

  const handleRestore = (st: ShowtimeResponse) => {
    setConfirmDialog({
      isOpen: true,
      type: "RESTORE",
      targetName: `${st.movieTitle} at ${st.hallName}`,
      action: async () => {
        try {
          await ShowtimeService.restoreShowtime(st.id);
          fetchShowtimes();
          fetchAllShowtimesForConflictPreview();
          showToast("Showtime restored successfully.", "success");
        } catch (err: any) {
          const errorMsg =
            err.response?.data?.status?.message ||
            err.response?.data?.message ||
            "Failed to restore showtime.";
          showToast(errorMsg, "error");
        }
      },
    });
  };

  const handleHardDelete = (st: ShowtimeResponse) => {
    setConfirmDialog({
      isOpen: true,
      type: "HARD_DELETE",
      targetName: `${st.movieTitle} at ${st.hallName}`,
      action: async () => {
        try {
          await ShowtimeService.hardDeleteShowtime(st.id);
          fetchShowtimes();
          fetchAllShowtimesForConflictPreview();
          showToast("Showtime permanently deleted.", "success");
        } catch (err: any) {
          const errorMsg =
            err.response?.data?.status?.message ||
            err.response?.data?.message ||
            "Cannot permanently delete this showtime because active customer bookings are attached to it.";
          showToast(errorMsg, "error");
        }
      },
    });
  };

  const filteredHalls = selectedCinemaFilter
    ? hallsList.filter((h: any) => h.cinemaId === Number(selectedCinemaFilter))
    : hallsList;

  const allCurrentPageSelected = showtimes.length > 0 && showtimes.every((st) => selectedShowtimeIds.includes(st.id));

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
        .react-datepicker__day-name,
        .react-datepicker-time__header {
          color: #f1f5f9;
        }
        .react-datepicker__day {
          color: #cbd5e1;
        }
        .react-datepicker__day--hover,
        .react-datepicker__time-list-item:hover {
          background-color: #334155 !important;
        }
        .react-datepicker__day--selected,
        .react-datepicker__day--keyboard-selected,
        .react-datepicker__time-list-item--selected {
          background-color: #dc2626 !important;
          color: white !important;
        }
        .react-datepicker__day--disabled {
          color: #475569;
        }
        .react-datepicker__time-container,
        .react-datepicker__time-box {
          background-color: #0f172a;
          border-left: 1px solid #1e293b;
        }
        .react-datepicker__time-list-item {
          color: #cbd5e1;
        }
        .react-datepicker__navigation-icon::before {
          border-color: #cbd5e1;
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
              <CalendarIcon className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2">
                Showtimes Schedule
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
                  {totalElements} Total
                </span>
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                Schedule multiple movie screenings in batch, manage hall allocations, and buffer rules
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
              <span>Schedule Showtime</span>
            </button>
          )}
        </div>
      </div>

      {/* Table Layout */}
      {loading ? (
        <div className="flex min-h-[36vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-red-600" />
        </div>
      ) : showtimes.length > 0 ? (
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
                  <th className="py-3.5 px-4">Cinema & Hall</th>
                  <th className="py-3.5 px-4">Timing (Start ~ End)</th>
                  <th className="py-3.5 px-4">Base Price</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-xs text-slate-300">
                {showtimes.map((st) => {
                  const isChecked = selectedShowtimeIds.includes(st.id);
                  return (
                    <tr
                      key={st.id}
                      className={`transition group ${isChecked ? "bg-red-950/20" : "hover:bg-slate-800/40"}`}
                    >
                      <td className="py-3 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleSelectOne(st.id)}
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
                        <div>
                          <p className="font-bold text-white group-hover:text-red-400 text-sm transition">
                            {st.movieTitle}
                          </p>
                          <span className="text-[11px] text-slate-400 font-mono">
                            Duration: {st.movieDurationMinutes} mins
                          </span>
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 font-bold text-slate-200">
                            <Building className="h-3.5 w-3.5 text-red-400" />
                            <span>{st.cinemaName} ({st.cinemaCity})</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                            <Tv className="h-3 w-3 text-slate-500" />
                            <span>{st.hallName}</span>
                            <span className="px-1.5 py-0.2 rounded bg-slate-800 text-[9px] font-mono border border-slate-700">
                              {st.hallType}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4 font-mono">
                        <div className="space-y-0.5">
                          <p className="text-emerald-400 font-bold">
                            Start: {formatHM(st.startTime)}
                          </p>
                          <p className="text-slate-400 text-[11px]">
                            End (+15m buffer): {formatHM(st.endTime)}
                          </p>
                        </div>
                      </td>

                      <td className="py-3 px-4 font-mono font-bold text-amber-400">
                        ${Number(st.basePrice).toFixed(2)}
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {!viewTrash ? (
                            <>
                              <button
                                onClick={() => openModal(st)}
                                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer border border-transparent hover:border-slate-700"
                                title="Edit Showtime"
                              >
                                <Edit3 className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleSoftDelete(st)}
                                className="p-2 rounded-xl text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition cursor-pointer border border-transparent hover:border-rose-500/20"
                                title="Move to Trash"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => handleRestore(st)}
                                className="p-2 rounded-xl text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 transition cursor-pointer border border-transparent hover:border-emerald-500/20"
                                title="Restore Showtime"
                              >
                                <RotateCcw className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleHardDelete(st)}
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
          <CalendarIcon className="h-10 w-10 text-slate-600 mb-1" />
          <p className="font-semibold text-slate-300">
            {viewTrash ? "Trash bin is empty." : "No scheduled showtimes found."}
          </p>
        </div>
      )}

      {/* Floating Bulk Action Bar */}
      {selectedShowtimeIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-4 rounded-2xl border border-rose-500/40 bg-slate-950/90 px-5 py-3 shadow-2xl backdrop-blur-md animate-in slide-in-from-bottom-5">
          <span className="text-xs font-bold text-white">
            {selectedShowtimeIds.length} showtime{selectedShowtimeIds.length > 1 ? "s" : ""} selected
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

      {/* Create / Edit Showtime Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-lg rounded-3xl border border-slate-800 bg-slate-900 p-6 sm:p-8 shadow-2xl space-y-5 my-8">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute right-5 top-5 text-slate-400 hover:text-white cursor-pointer p-1 rounded-lg hover:bg-slate-800 transition"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="border-b border-slate-800 pb-3">
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-red-500" />
                {editingShowtime ? "Edit Showtime" : "Schedule Multiple Showtimes"}
              </h2>
            </div>

            <form onSubmit={handleSubmit} noValidate className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 mb-1 font-bold">Select Movie *</label>
                <select
                  value={showtimeForm.movieId}
                  onChange={(e) =>
                    setShowtimeForm({ ...showtimeForm, movieId: Number(e.target.value) })
                  }
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 p-3 text-white outline-none focus:border-red-500 cursor-pointer"
                >
                  <option value={0}>-- Choose Movie --</option>
                  {moviesList.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.title} ({m.durationMinutes}m)
                    </option>
                  ))}
                </select>
                {errors.movieId && <p className="mt-1 text-[11px] text-rose-400">{errors.movieId}</p>}
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-bold">Filter by Cinema Branch</label>
                <select
                  value={selectedCinemaFilter}
                  onChange={(e) => {
                    const cinId = Number(e.target.value);
                    setSelectedCinemaFilter(cinId);
                    setShowtimeForm((prev) => ({ ...prev, hallId: 0 }));
                  }}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 p-3 text-white outline-none focus:border-red-500 cursor-pointer"
                >
                  <option value={0}>All Cinema Branches</option>
                  {cinemasList.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.city})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-bold">Select Screening Hall *</label>
                <select
                  value={showtimeForm.hallId}
                  onChange={(e) =>
                    setShowtimeForm({ ...showtimeForm, hallId: Number(e.target.value) })
                  }
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 p-3 text-white outline-none focus:border-red-500 cursor-pointer"
                >
                  <option value={0}>-- Choose Hall --</option>
                  {filteredHalls.map((h: any) => (
                    <option key={h.id} value={h.id}>
                      {h.cinemaName} — {h.name} ({h.hallType})
                    </option>
                  ))}
                </select>
                {errors.hallId && <p className="mt-1 text-[11px] text-rose-400">{errors.hallId}</p>}
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-slate-300 font-bold flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-red-500" />
                    Screening Start Date & Time *
                  </label>
                  {!editingShowtime && (
                    <button
                      type="button"
                      onClick={handleFindNextAvailable}
                      className="flex items-center gap-1 rounded-lg border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-[10px] font-bold text-amber-400 hover:bg-amber-500/20 transition cursor-pointer"
                    >
                      <Zap className="h-3 w-3" />
                      Find Next Available
                    </button>
                  )}
                </div>
                <DatePicker
                  selected={showtimeForm.startTime}
                  onChange={(date: Date | null) =>
                    setShowtimeForm({ ...showtimeForm, startTime: date || new Date() })
                  }
                  showTimeSelect
                  timeFormat="h:mm aa"
                  timeIntervals={15}
                  dateFormat="yyyy-MM-dd h:mm aa"
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 p-3 text-white outline-none focus:border-red-500 font-mono cursor-pointer"
                  wrapperClassName="w-full"
                  withPortal
                  portalId="showtime-datepicker-portal"
                />

                {previewEndTime && (
                  <p className="mt-1.5 flex items-center gap-1.5 text-[11px] text-slate-400">
                    <Info className="h-3 w-3 text-slate-500 shrink-0" />
                    Blocks hall until{" "}
                    <span className="font-mono font-bold text-slate-300">
                      {previewEndTime.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit", hour12: true })}
                    </span>{" "}
                    ({selectedMovieDuration}m + {BUFFER_MINUTES}m buffer)
                  </p>
                )}

                {overlapWarning && (
                  <div className="mt-2 flex items-start gap-2 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2">
                    <AlertTriangle className="h-3.5 w-3.5 text-rose-400 shrink-0 mt-0.5" />
                    <p className="text-[11px] text-rose-300">{overlapWarning}</p>
                  </div>
                )}

                {!editingShowtime && (
                  <div className="mt-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                        Staged Batch Queue ({pendingTimes.length})
                      </span>
                      <button
                        type="button"
                        onClick={handleAddTime}
                        disabled={!!overlapWarning || !showtimeForm.movieId || !showtimeForm.hallId}
                        className="flex items-center gap-1 rounded-xl bg-red-600 hover:bg-red-500 px-3 py-1.5 text-[11px] font-bold text-white transition disabled:opacity-40 cursor-pointer"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        <span>+ Add Time Slot</span>
                      </button>
                    </div>

                    {pendingTimes.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto p-2 rounded-xl border border-slate-800 bg-slate-950">
                        {pendingTimes.map((t, idx) => (
                          <div
                            key={idx}
                            className="flex items-center gap-2 rounded-lg bg-slate-900 border border-slate-700 px-2.5 py-1 text-[11px] font-mono text-white"
                          >
                            <span>
                              {t.toLocaleDateString()} {t.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit", hour12: true })}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleRemovePendingTime(idx)}
                              className="text-slate-400 hover:text-rose-400 cursor-pointer"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-bold flex items-center gap-1.5">
                  <DollarSign className="h-3.5 w-3.5 text-amber-400" />
                  Base Price ($) *
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="0.5"
                  value={showtimeForm.basePrice}
                  onChange={(e) =>
                    setShowtimeForm({ ...showtimeForm, basePrice: Number(e.target.value) })
                  }
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 p-3 text-white outline-none focus:border-red-500 font-mono"
                />
                {errors.basePrice && <p className="mt-1 text-[11px] text-rose-400">{errors.basePrice}</p>}
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
                  <span>
                    {editingShowtime
                      ? "Save Changes"
                      : pendingTimes.length > 0
                      ? `Schedule All (${pendingTimes.length})`
                      : "Schedule Showtime"}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}