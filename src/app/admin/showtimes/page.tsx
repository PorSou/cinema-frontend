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
  Repeat,
} from "lucide-react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

import MovieService from "@/app/service/movie.service";
import HallService from "@/app/service/hall.service";
import CinemaService from "@/app/service/cinema.service";
import {
  MovieResponse,
  HallResponse,
  CinemaResponse,
  ShowtimeResponse,
  ShowtimeRequest,
} from "@/app/types/api.types";
import Toast from "@/app/components/Toast";
import ConfirmDialog from "@/app/components/ConfirmDialog";
import ShowtimeService from "@/app/service/showtime.service";
import { useSettings } from "@/app/context/SettingsContext";

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
  return d.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
};

const sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

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

// Helper function to evaluate Expired vs Upcoming status badges
const getShowtimeStatus = (startTimeStr: string) => {
  const showDate = parseBackendDate(startTimeStr);
  const now = new Date();

  if (showDate.getTime() < now.getTime()) {
    return {
      label: "Expired",
      color:
        "bg-slate-500/15 text-slate-700 dark:text-slate-400 border-slate-500/30 font-bold",
    };
  }
  return {
    label: "Upcoming",
    color:
      "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 font-bold",
  };
};

export default function AdminShowtimesPage() {
  const { theme } = useSettings();
  const isLight = theme === "light";

  const [showtimes, setShowtimes] = useState<ShowtimeResponse[]>([]);
  const [moviesList, setMoviesList] = useState<MovieResponse[]>([]);
  const [cinemasList, setCinemasList] = useState<CinemaResponse[]>([]);
  const [hallsList, setHallsList] = useState<
    (HallResponse & { cinemaName?: string; cinemaCity?: string })[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [viewTrash, setViewTrash] = useState(false);

  const [allShowtimesFull, setAllShowtimesFull] = useState<ShowtimeResponse[]>(
    [],
  );

  // Pagination state
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);
  const pageSize = 10;

  // Multi-select state
  const [selectedShowtimeIds, setSelectedShowtimeIds] = useState<number[]>([]);

  // Modal & Form State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingShowtime, setEditingShowtime] =
    useState<ShowtimeResponse | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [selectedCinemaFilter, setSelectedCinemaFilter] = useState<number | 0>(
    0,
  );

  const [showtimeForm, setShowtimeForm] = useState<{
    movieId: number;
    hallId: number;
    selectedHallIds: number[];
    startTime: Date;
    basePrice: number;
    repeatDays: number;
  }>({
    movieId: 0,
    hallId: 0,
    selectedHallIds: [],
    startTime: new Date(),
    basePrice: 4.5,
    repeatDays: 1,
  });

  // 🔥 Hall-specific time queues: Record<hallId, Date[]>
  const [hallSchedules, setHallSchedules] = useState<Record<number, Date[]>>(
    {},
  );
  const [activeConfigHallId, setActiveConfigHallId] = useState<number | null>(
    null,
  );

  const [errors, setErrors] = useState<Record<string, string>>({});

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

  const showToast = (
    message: string,
    type: "success" | "error" | "info" = "success",
  ) => {
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
            const mappedHalls = extractArray<HallResponse>(hallsRes).map(
              (h) => ({
                ...h,
                cinemaName: cinema.name,
                cinemaCity: cinema.city,
              }),
            );
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

      const list = extractArray<ShowtimeResponse>(res).sort(
        (a, b) => b.id - a.id,
      );
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
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
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
        showToast(
          `Successfully processed ${selectedShowtimeIds.length} showtimes.`,
          "success",
        );
      },
    });
  };

  const openModal = (showtime?: ShowtimeResponse) => {
    setErrors({});
    setSelectedCinemaFilter(0);
    setHallSchedules({});
    setActiveConfigHallId(null);
    if (showtime) {
      setEditingShowtime(showtime);
      setShowtimeForm({
        movieId: showtime.movieId,
        hallId: showtime.hallId,
        selectedHallIds: [showtime.hallId],
        startTime: new Date(showtime.startTime),
        basePrice: showtime.basePrice,
        repeatDays: 1,
      });
      setSelectedCinemaFilter(showtime.cinemaId || 0);
    } else {
      setEditingShowtime(null);
      const defaultHallId = hallsList[0]?.id || 0;
      setShowtimeForm({
        movieId: moviesList[0]?.id || 0,
        hallId: defaultHallId,
        selectedHallIds: defaultHallId ? [defaultHallId] : [],
        startTime: new Date(),
        basePrice: 4.5,
        repeatDays: 1,
      });
      if (defaultHallId) setActiveConfigHallId(defaultHallId);
    }
    setIsModalOpen(true);
  };

  const selectedMovieDuration = useMemo(
    () =>
      moviesList.find((m) => m.id === showtimeForm.movieId)?.durationMinutes ||
      0,
    [moviesList, showtimeForm.movieId],
  );

  const previewEndTime = useMemo(() => {
    if (!selectedMovieDuration) return null;
    return new Date(
      showtimeForm.startTime.getTime() +
        (selectedMovieDuration + BUFFER_MINUTES) * 60000,
    );
  }, [showtimeForm.startTime, selectedMovieDuration]);

  // Filtered halls based on selected cinema branch
  const filteredHalls = useMemo(() => {
    return selectedCinemaFilter
      ? hallsList.filter(
          (h: any) => h.cinemaId === Number(selectedCinemaFilter),
        )
      : hallsList;
  }, [hallsList, selectedCinemaFilter]);

  const handleToggleHallSelection = (hallId: number) => {
    setShowtimeForm((prev) => {
      const exists = prev.selectedHallIds.includes(hallId);
      const updatedIds = exists
        ? prev.selectedHallIds.filter((id) => id !== hallId)
        : [...prev.selectedHallIds, hallId];

      return {
        ...prev,
        selectedHallIds: updatedIds,
      };
    });

    if (errors.hallId) {
      setErrors((prev) => {
        const copy = { ...prev };
        delete copy.hallId;
        return copy;
      });
    }
  };

  const handleSelectAllFilteredHalls = () => {
    const allIds = filteredHalls.map((h) => h.id);
    const allSelected = allIds.every((id) =>
      showtimeForm.selectedHallIds.includes(id),
    );
    const newSelected = allSelected ? [] : allIds;

    setShowtimeForm((prev) => ({
      ...prev,
      selectedHallIds: newSelected,
    }));
    setActiveConfigHallId(newSelected[0] || null);
    if (errors.hallId) {
      setErrors((prev) => {
        const copy = { ...prev };
        delete copy.hallId;
        return copy;
      });
    }
  };

  const handleSelectHallToConfigure = (
    hallId: number,
    e?: React.MouseEvent,
  ) => {
    if (e) e.stopPropagation();
    setShowtimeForm((prev) => {
      if (!prev.selectedHallIds.includes(hallId)) {
        return {
          ...prev,
          selectedHallIds: [...prev.selectedHallIds, hallId],
        };
      }
      return prev;
    });
    setActiveConfigHallId(hallId);
    if (errors.hallId) {
      setErrors((prev) => {
        const copy = { ...prev };
        delete copy.hallId;
        return copy;
      });
    }
  };

  const activeHallQueue = activeConfigHallId
    ? hallSchedules[activeConfigHallId] || []
    : [];

  const getCombinedDaySlots = (
    day: Date,
    targetHallId: number,
    pendingOverride?: Date[],
  ): {
    key: string;
    start: Date;
    end: Date;
    label: string;
    pending: boolean;
  }[] => {
    if (!targetHallId || !showtimeForm.movieId) return [];
    const pending = (pendingOverride ?? hallSchedules[targetHallId]) || [];
    const requiredMs = (selectedMovieDuration + BUFFER_MINUTES) * 60000;
    const selectedMovieTitle =
      moviesList.find((m) => m.id === showtimeForm.movieId)?.title ||
      "This movie";

    const real = allShowtimesFull
      .filter((s) => s.hallId === targetHallId)
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

    return [...real, ...staged].sort(
      (a, b) => a.start.getTime() - b.start.getTime(),
    );
  };

  const primaryOverlapWarning = useMemo(() => {
    const checkHallId = editingShowtime
      ? showtimeForm.hallId
      : activeConfigHallId;
    if (!previewEndTime || !checkHallId) return null;

    const daySlots = getCombinedDaySlots(showtimeForm.startTime, checkHallId);
    if (daySlots.length === 0) return null;

    const newStart = showtimeForm.startTime.getTime();
    const newEnd = previewEndTime.getTime();

    for (const s of daySlots) {
      if (newStart < s.end.getTime() && newEnd > s.start.getTime()) {
        const startLabel = formatHM(s.start.toISOString());
        const endLabel = formatHM(s.end.toISOString());
        return `Overlap detected in this hall for "${s.label}" (${startLabel} – ${endLabel}). Pick a time at or after ${endLabel}.`;
      }
    }
    return null;
  }, [
    allShowtimesFull,
    showtimeForm.hallId,
    activeConfigHallId,
    showtimeForm.startTime,
    showtimeForm.movieId,
    editingShowtime,
    hallSchedules,
    selectedMovieDuration,
    moviesList,
    previewEndTime,
  ]);

  const findNextAvailableSlotFrom = (
    fromDate: Date,
    maxDays: number,
    targetHallId: number,
    pendingOverride?: Date[],
  ): Date | null => {
    const requiredMs = (selectedMovieDuration + BUFFER_MINUTES) * 60000;
    if (!selectedMovieDuration || !targetHallId) return null;

    for (let dayOffset = 0; dayOffset <= maxDays; dayOffset++) {
      const day =
        dayOffset === 0 ? fromDate : startOfDay(addDays(fromDate, dayOffset));
      const dayEnd = endOfDay(day);
      const daySlots = getCombinedDaySlots(day, targetHallId, pendingOverride);

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

  const handleFindNextAvailable = () => {
    if (!showtimeForm.movieId) {
      showToast("Pick a movie first so the runtime is known.", "info");
      return;
    }
    const checkHallId = editingShowtime
      ? showtimeForm.hallId
      : activeConfigHallId;
    if (!checkHallId) {
      showToast("Select or configure a specific hall first.", "info");
      return;
    }
    const slot = findNextAvailableSlotFrom(
      showtimeForm.startTime,
      MAX_LOOKAHEAD_DAYS,
      checkHallId,
    );
    if (slot) {
      setShowtimeForm((prev) => ({ ...prev, startTime: slot }));
      showToast("Jumped to the next available slot for this hall.", "success");
    } else {
      showToast(
        `No free slot found within the next ${MAX_LOOKAHEAD_DAYS} days.`,
        "error",
      );
    }
  };

  const handleAddTimeToActiveHall = () => {
    if (!showtimeForm.movieId) {
      showToast("Pick a movie first.", "info");
      return;
    }
    if (!activeConfigHallId) {
      showToast("Select a hall from your list to configure times.", "info");
      return;
    }
    if (primaryOverlapWarning) {
      showToast("Fix the time conflict before adding this slot.", "error");
      return;
    }

    const currentQueue = hallSchedules[activeConfigHallId] || [];
    const updatedQueue = [...currentQueue, showtimeForm.startTime];

    setHallSchedules((prev) => ({
      ...prev,
      [activeConfigHallId]: updatedQueue,
    }));

    setShowtimeForm((prev) => {
      if (!prev.selectedHallIds.includes(activeConfigHallId)) {
        return {
          ...prev,
          selectedHallIds: [...prev.selectedHallIds, activeConfigHallId],
        };
      }
      return prev;
    });

    const next = findNextAvailableSlotFrom(
      showtimeForm.startTime,
      0,
      activeConfigHallId,
      updatedQueue,
    );
    if (next) {
      setShowtimeForm((prev) => ({ ...prev, startTime: next }));
      showToast("Time added to this hall's schedule queue!", "success");
    } else {
      showToast(
        "Time added. No more room left today in this specific hall.",
        "info",
      );
    }
  };

  const handleRemoveHallTime = (hallId: number, index: number) => {
    setHallSchedules((prev) => {
      const current = prev[hallId] || [];
      const updated = current.filter((_, i) => i !== index);
      return {
        ...prev,
        [hallId]: updated,
      };
    });
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
    if (!editingShowtime && Object.keys(hallSchedules).length === 0) {
      err.hallId =
        "Please configure time slots for at least one screening hall";
    }
    if (editingShowtime && !showtimeForm.hallId) {
      err.hallId = "Please select a screening hall";
    }
    if (!showtimeForm.basePrice || showtimeForm.basePrice <= 0) {
      err.basePrice = "Base price must be greater than 0";
    }
    setErrors(err);
    return Object.keys(err).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    if (editingShowtime) {
      if (primaryOverlapWarning) {
        setErrors({ startTime: primaryOverlapWarning });
        return;
      }
      setSubmitting(true);
      try {
        const payload = {
          movieId: Number(showtimeForm.movieId),
          hallId: Number(showtimeForm.hallId),
          startTime: formatDateTimeForApi(showtimeForm.startTime),
          basePrice: Number(showtimeForm.basePrice),
          repeatDays: Number(showtimeForm.repeatDays),
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
            ? "This movie already has a showtime in that hall during this timeframe."
            : err.response?.data?.status?.message ||
                err.response?.data?.message ||
                "Failed to save showtime.",
          "error",
        );
      } finally {
        setSubmitting(false);
      }
      return;
    }

    let payloadList: any[] = [];
    const entries = Object.entries(hallSchedules);

    if (entries.length === 0) {
      showToast("Please add time slots to at least one hall.", "error");
      return;
    }

    for (const [hIdStr, times] of entries) {
      const hId = Number(hIdStr);
      if (!times || times.length === 0) continue;

      for (const t of times) {
        payloadList.push({
          movieId: Number(showtimeForm.movieId),
          hallId: hId,
          hallIds: [hId],
          startTime: formatDateTimeForApi(t),
          basePrice: Number(showtimeForm.basePrice),
          repeatDays: Number(showtimeForm.repeatDays || 1),
        });
      }
    }

    if (payloadList.length === 0) {
      showToast("No showtime slots found in any hall queues.", "error");
      return;
    }

    setSubmitting(true);
    try {
      const created = await ShowtimeService.createBatchShowtimes(payloadList);
      const createdCount = Array.isArray(created)
        ? created.length
        : payloadList.length;
      showToast(
        `${createdCount} showtimes scheduled successfully across your configured halls!`,
        "success",
      );
      setIsModalOpen(false);
      setHallSchedules({});
      fetchShowtimes();
      fetchAllShowtimesForConflictPreview();
    } catch (err: any) {
      const status = err?.response?.status;
      showToast(
        status === 409
          ? "One or more staged slots conflict with existing showtimes in the selected halls."
          : err.response?.data?.status?.message ||
              err.response?.data?.message ||
              "Failed to schedule showtimes.",
        "error",
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

  const allCurrentPageSelected =
    showtimes.length > 0 &&
    showtimes.every((st) => selectedShowtimeIds.includes(st.id));

  const pageClass = isLight
    ? "bg-slate-50 text-slate-900"
    : "bg-slate-950 text-slate-100";

  const cardClass = isLight
    ? "border-slate-300 bg-white shadow-xl shadow-slate-200 ring-1 ring-slate-200"
    : "border-slate-800 bg-slate-900/60 shadow-2xl backdrop-blur-md";

  const inputClass = isLight
    ? "border-slate-300 bg-white text-slate-900 placeholder-slate-400 focus:border-red-500 shadow-sm font-bold"
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
        ::-webkit-scrollbar {
          display: none;
        }
        * {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .react-datepicker__portal {
          z-index: 60;
          background-color: rgba(0, 0, 0, 0.85);
        }
        .react-datepicker {
          background-color: ${isLight ? "#ffffff" : "#0f172a"};
          border: 1px solid ${isLight ? "#cbd5e1" : "#1e293b"};
          color: ${isLight ? "#0f172a" : "#f1f5f9"};
          font-family: inherit;
        }
        .react-datepicker__header {
          background-color: ${isLight ? "#f1f5f9" : "#1e293b"};
          border-bottom: 1px solid ${isLight ? "#cbd5e1" : "#334155"};
        }
        .react-datepicker__current-month,
        .react-datepicker__day-name,
        .react-datepicker-time__header {
          color: ${isLight ? "#0f172a" : "#f1f5f9"};
        }
        .react-datepicker__day {
          color: ${isLight ? "#334155" : "#cbd5e1"};
        }
        .react-datepicker__day--hover,
        .react-datepicker__time-list-item:hover {
          background-color: ${isLight ? "#e2e8f0" : "#334155"} !important;
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
          background-color: ${isLight ? "#ffffff" : "#0f172a"};
          border-left: 1px solid ${isLight ? "#cbd5e1" : "#1e293b"};
          color: ${isLight ? "#0f172a" : "#f1f5f9"};
        }
        .react-datepicker__time-list-item {
          color: ${isLight ? "#334155" : "#cbd5e1"};
        }
        .react-datepicker__navigation-icon::before {
          border-color: ${isLight ? "#334155" : "#cbd5e1"};
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
        onCancel={() =>
          setConfirmDialog((prev) => ({ ...prev, isOpen: false }))
        }
      />

      {/* Header */}
      <div
        className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b ${borderCol} pb-5`}
      >
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-600 shrink-0">
              <CalendarIcon className="h-5 w-5" />
            </div>
            <div>
              <h1
                className={`text-xl sm:text-2xl font-black tracking-tight ${textPrimary} flex items-center gap-2`}
              >
                Showtimes Schedule
                <span
                  className={`text-[10px] font-black px-2 py-0.5 rounded-full ${isLight ? "bg-white text-slate-800 border-slate-300 shadow-sm" : "bg-slate-800 text-slate-400 border-slate-700"} border`}
                >
                  {totalElements} Total
                </span>
              </h1>
              <p className={`text-xs ${textSecondary} mt-0.5`}>
                Schedule custom time slots independently per screen/hall format
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
        <div
          className={`rounded-3xl border ${cardClass} overflow-hidden shadow-xl backdrop-blur-md relative`}
        >
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr
                  className={`border-b ${borderCol} ${isLight ? "bg-slate-100 text-slate-700" : "bg-slate-950/60 text-slate-400"} text-[11px] font-black uppercase tracking-wider`}
                >
                  <th className="py-3.5 px-4 w-12 text-center">
                    <button
                      type="button"
                      onClick={handleSelectAllCurrentPage}
                      className={`h-5 w-5 mx-auto rounded-lg border flex items-center justify-center transition cursor-pointer ${
                        allCurrentPageSelected
                          ? "bg-red-600 border-red-500 text-white shadow-md shadow-red-600/30"
                          : `${isLight ? "border-slate-300 bg-white text-transparent" : "border-slate-700 bg-slate-900 text-transparent"} hover:border-slate-500`
                      }`}
                      title={
                        allCurrentPageSelected ? "Deselect All" : "Select All"
                      }
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
              <tbody
                className={`divide-y ${isLight ? "divide-slate-200 text-slate-900 font-medium" : "divide-slate-800/60 text-slate-300"} text-xs`}
              >
                {showtimes.map((st) => {
                  const isChecked = selectedShowtimeIds.includes(st.id);
                  const showtimeStatus = getShowtimeStatus(st.startTime);

                  return (
                    <tr
                      key={st.id}
                      className={`transition group ${isChecked ? (isLight ? "bg-red-50" : "bg-red-950/20") : isLight ? "hover:bg-slate-100/70" : "hover:bg-slate-800/40"}`}
                    >
                      <td className="py-3 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleSelectOne(st.id)}
                          className={`h-5 w-5 mx-auto rounded-lg border flex items-center justify-center transition cursor-pointer ${
                            isChecked
                              ? "bg-red-600 border-red-500 text-white shadow-md shadow-red-600/30"
                              : `${isLight ? "border-slate-300 bg-white text-transparent" : "border-slate-700 bg-slate-900 text-transparent"} hover:border-slate-500`
                          }`}
                        >
                          <Check className="h-3.5 w-3.5 stroke-[3]" />
                        </button>
                      </td>

                      <td className="py-3 px-4">
                        <div>
                          <p
                            className={`font-black ${textPrimary} group-hover:text-red-600 text-sm transition`}
                          >
                            {st.movieTitle}
                          </p>
                          <span
                            className={`text-[11px] ${textSecondary} font-mono font-bold`}
                          >
                            Duration: {st.movieDurationMinutes} mins
                          </span>
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <div className="space-y-1">
                          <div
                            className={`flex items-center gap-1.5 font-bold ${textPrimary}`}
                          >
                            <Building className="h-3.5 w-3.5 text-red-600" />
                            <span>
                              {st.cinemaName} ({st.cinemaCity})
                            </span>
                          </div>
                          <div
                            className={`flex items-center gap-1.5 text-[11px] ${textSecondary}`}
                          >
                            <Tv className="h-3 w-3 text-slate-400" />
                            <span>{st.hallName}</span>
                            <span
                              className={`px-1.5 py-0.2 rounded ${isLight ? "bg-slate-200 text-slate-800 border-slate-300 shadow-sm" : "bg-slate-800 text-slate-300 border-slate-700"} text-[9px] font-black border`}
                            >
                              {st.hallType}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4 font-mono">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <p className="text-emerald-600 dark:text-emerald-400 font-bold">
                              Start: {formatHM(st.startTime)}
                            </p>
                            <span
                              className={`text-[10px] font-black px-2 py-0.5 rounded-md border ${showtimeStatus.color}`}
                            >
                              {showtimeStatus.label}
                            </span>
                          </div>
                          <p className={`${textSecondary} text-[11px]`}>
                            End (+15m buffer): {formatHM(st.endTime)}
                          </p>
                        </div>
                      </td>

                      <td className="py-3 px-4 font-mono font-black text-amber-600 dark:text-amber-400">
                        ${Number(st.basePrice).toFixed(2)}
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {!viewTrash ? (
                            <>
                              <button
                                onClick={() => openModal(st)}
                                className={`p-2 rounded-xl ${isLight ? "text-slate-700 hover:text-slate-900 hover:bg-slate-200 border-slate-300" : "text-slate-400 hover:text-white hover:bg-slate-800 border-slate-700"} transition cursor-pointer border shadow-sm`}
                                title="Edit Showtime"
                              >
                                <Edit3 className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleSoftDelete(st)}
                                className="p-2 rounded-xl text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 transition cursor-pointer border border-transparent hover:border-rose-500/20"
                                title="Move to Trash"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => handleRestore(st)}
                                className="p-2 rounded-xl text-emerald-500 hover:text-emerald-600 hover:bg-emerald-500/10 transition cursor-pointer border border-transparent hover:border-emerald-500/20"
                                title="Restore Showtime"
                              >
                                <RotateCcw className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleHardDelete(st)}
                                className="p-2 rounded-xl text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 transition cursor-pointer border border-transparent hover:border-rose-500/20"
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
        <div
          className={`flex min-h-[30vh] flex-col items-center justify-center rounded-3xl border ${cardClass} p-8 text-center ${textSecondary} text-sm space-y-2`}
        >
          <CalendarIcon className={`h-10 w-10 ${textMuted} mb-1`} />
          <p className={`font-black ${textPrimary}`}>
            {viewTrash
              ? "Trash bin is empty."
              : "No scheduled showtimes found."}
          </p>
        </div>
      )}

      {/* Floating Bulk Action Bar */}
      {selectedShowtimeIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-4 rounded-2xl border border-rose-500/40 bg-slate-950/90 px-5 py-3 shadow-2xl backdrop-blur-md animate-in slide-in-from-bottom-5">
          <span className="text-xs font-bold text-white">
            {selectedShowtimeIds.length} showtime
            {selectedShowtimeIds.length > 1 ? "s" : ""} selected
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

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div
          className={`flex flex-col sm:flex-row items-center justify-between border-t ${borderCol} pt-4 text-xs gap-3`}
        >
          <span className={textSecondary}>
            Page <span className={`font-black ${textPrimary}`}>{page + 1}</span>{" "}
            of <span className={`font-black ${textPrimary}`}>{totalPages}</span>{" "}
            ({totalElements} items)
          </span>

          <div className="flex items-center gap-1.5 flex-wrap justify-center">
            <button
              onClick={() => setPage(0)}
              disabled={page === 0}
              className={`p-2 rounded-xl border ${borderCol} ${isLight ? "bg-white text-slate-800 hover:bg-slate-100 shadow-sm font-bold" : "bg-slate-900 text-slate-400 hover:text-white"} disabled:opacity-30 transition cursor-pointer`}
              title="First Page"
            >
              <ChevronsLeft className="h-4 w-4" />
            </button>

            <button
              onClick={() => setPage((prev) => Math.max(prev - 1, 0))}
              disabled={page === 0}
              className={`flex items-center gap-1 px-3 py-2 rounded-xl border ${borderCol} ${isLight ? "bg-white text-slate-800 hover:bg-slate-100 shadow-sm font-bold" : "bg-slate-900 text-slate-300 hover:text-white"} disabled:opacity-30 transition cursor-pointer`}
            >
              <ChevronLeft className="h-4 w-4" />
              <span>Prev</span>
            </button>

            {Array.from({ length: totalPages }, (_, i) => i)
              .filter(
                (pNum) =>
                  pNum === 0 ||
                  pNum === totalPages - 1 ||
                  Math.abs(pNum - page) <= 1,
              )
              .map((pNum, idx, arr) => {
                const showEllipsisBefore = idx > 0 && pNum - arr[idx - 1] > 1;
                return (
                  <div key={pNum} className="flex items-center gap-1.5">
                    {showEllipsisBefore && (
                      <span className="text-slate-500 px-1">...</span>
                    )}
                    <button
                      onClick={() => setPage(pNum)}
                      className={`h-9 w-9 rounded-xl border text-xs font-bold transition cursor-pointer flex items-center justify-center font-mono ${
                        page === pNum
                          ? "bg-red-600 border-red-500 text-white shadow-lg shadow-red-600/30"
                          : `${borderCol} ${isLight ? "bg-white text-slate-800 hover:bg-slate-100 shadow-sm font-bold" : "bg-slate-900 text-slate-400 hover:text-white"}`
                      }`}
                    >
                      {pNum + 1}
                    </button>
                  </div>
                );
              })}

            <button
              onClick={() =>
                setPage((prev) => Math.min(prev + 1, totalPages - 1))
              }
              disabled={page >= totalPages - 1}
              className={`flex items-center gap-1 px-3 py-2 rounded-xl border ${borderCol} ${isLight ? "bg-white text-slate-800 hover:bg-slate-100 shadow-sm font-bold" : "bg-slate-900 text-slate-300 hover:text-white"} disabled:opacity-30 transition cursor-pointer`}
            >
              <span>Next</span>
              <ChevronRight className="h-4 w-4" />
            </button>

            <button
              onClick={() => setPage(totalPages - 1)}
              disabled={page >= totalPages - 1}
              className={`p-2 rounded-xl border ${borderCol} ${isLight ? "bg-white text-slate-800 hover:bg-slate-100 shadow-sm font-bold" : "bg-slate-900 text-slate-400 hover:text-white"} disabled:opacity-30 transition cursor-pointer`}
              title="Last Page"
            >
              <ChevronsRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Create / Edit Showtime Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm overflow-y-auto">
          <div
            className={`relative w-full max-w-xl rounded-3xl border p-6 sm:p-8 shadow-2xl space-y-5 my-8 overflow-y-auto ${modalBgClass}`}
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
                {editingShowtime
                  ? "Edit Showtime"
                  : "Schedule Custom Hall Showtimes"}
              </h2>
            </div>

            <form
              onSubmit={handleSubmit}
              noValidate
              className="space-y-4 text-xs"
            >
              <div>
                <label
                  className={`block ${isLight ? "text-slate-800" : "text-slate-300"} mb-1 font-bold`}
                >
                  Select Movie *
                </label>
                <select
                  value={showtimeForm.movieId}
                  onChange={(e) =>
                    setShowtimeForm({
                      ...showtimeForm,
                      movieId: Number(e.target.value),
                    })
                  }
                  className={`w-full rounded-xl border ${inputClass} p-3 outline-none focus:border-red-500 cursor-pointer`}
                >
                  <option value={0}>-- Choose Movie --</option>
                  {moviesList.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.title} ({m.durationMinutes}m)
                    </option>
                  ))}
                </select>
                {errors.movieId && (
                  <p className="mt-1 text-[11px] text-rose-500">
                    {errors.movieId}
                  </p>
                )}
              </div>

              <div>
                <label
                  className={`block ${isLight ? "text-slate-800" : "text-slate-300"} mb-1 font-bold`}
                >
                  Filter by Cinema Branch
                </label>
                <select
                  value={selectedCinemaFilter}
                  onChange={(e) => {
                    const cinId = Number(e.target.value);
                    setSelectedCinemaFilter(cinId);
                  }}
                  className={`w-full rounded-xl border ${inputClass} p-3 outline-none focus:border-red-500 cursor-pointer`}
                >
                  <option value={0}>All Cinema Branches</option>
                  {cinemasList.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.city})
                    </option>
                  ))}
                </select>
              </div>

              {/* 🔥 Multi-Hall Selection & Individual Configuration Switcher */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label
                    className={`font-bold ${isLight ? "text-slate-800" : "text-slate-300"}`}
                  >
                    {editingShowtime
                      ? "Select Screening Hall *"
                      : "1. Select Halls & Configure Times *"}
                  </label>
                  {!editingShowtime && filteredHalls.length > 0 && (
                    <button
                      type="button"
                      onClick={handleSelectAllFilteredHalls}
                      className="text-[11px] font-bold text-red-600 dark:text-red-400 hover:underline cursor-pointer"
                    >
                      {filteredHalls.every((h) =>
                        showtimeForm.selectedHallIds.includes(h.id),
                      )
                        ? "Deselect All"
                        : "Select All Halls"}
                    </button>
                  )}
                </div>

                {editingShowtime ? (
                  <select
                    value={showtimeForm.hallId}
                    onChange={(e) =>
                      setShowtimeForm({
                        ...showtimeForm,
                        hallId: Number(e.target.value),
                      })
                    }
                    className={`w-full rounded-xl border ${inputClass} p-3 outline-none focus:border-red-500 cursor-pointer`}
                  >
                    <option value={0}>-- Choose Hall --</option>
                    {filteredHalls.map((h: any) => (
                      <option key={h.id} value={h.id}>
                        {h.cinemaName} — {h.name} ({h.hallType})
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="space-y-2">
                    {/* Checkbox Pills */}
                    <div
                      className={`max-h-40 overflow-y-auto space-y-1.5 p-2.5 rounded-2xl border ${borderCol} ${isLight ? "bg-slate-100" : "bg-slate-950"}`}
                    >
                      {filteredHalls.length > 0 ? (
                        filteredHalls.map((h: any) => {
                          const isSelected =
                            showtimeForm.selectedHallIds.includes(h.id);
                          const isConfiguring = activeConfigHallId === h.id;
                          const queueCount = (hallSchedules[h.id] || []).length;

                          return (
                            <div
                              key={h.id}
                              onClick={() => handleSelectHallToConfigure(h.id)}
                              className={`flex items-center justify-between p-2 rounded-xl border transition cursor-pointer ${
                                isSelected
                                  ? isConfiguring
                                    ? "bg-red-600 border-red-500 text-white font-black shadow-md"
                                    : "bg-red-500/20 border-red-500/60 text-red-700 dark:text-red-300 font-bold"
                                  : `${isLight ? "bg-white border-slate-300 text-slate-800" : "bg-slate-900 border-slate-800 text-slate-400"}`
                              }`}
                            >
                              <div className="flex items-center gap-2 flex-1">
                                <div
                                  className={`h-4 w-4 rounded border flex items-center justify-center ${isSelected ? "bg-white text-red-600 border-white" : "border-slate-400"}`}
                                >
                                  {isSelected && (
                                    <Check className="h-3 w-3 stroke-[3]" />
                                  )}
                                </div>
                                <span className="text-xs">
                                  {h.cinemaName} — {h.name} ({h.hallType})
                                </span>
                              </div>

                              <button
                                type="button"
                                onClick={(e) =>
                                  handleSelectHallToConfigure(h.id, e)
                                }
                                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold cursor-pointer transition ${
                                  isConfiguring
                                    ? "bg-white text-red-700 shadow"
                                    : "bg-black/30 text-white hover:bg-black/50"
                                }`}
                              >
                                {queueCount > 0
                                  ? `Configure Time (${queueCount})`
                                  : "Configure Time"}
                              </button>
                            </div>
                          );
                        })
                      ) : (
                        <p className="text-center text-slate-500 py-3 text-xs">
                          No screening halls available.
                        </p>
                      )}
                    </div>
                  </div>
                )}
                {errors.hallId && (
                  <p className="mt-1 text-[11px] text-rose-500">
                    {errors.hallId}
                  </p>
                )}
              </div>

              {/* 🔥 ACTIVE HALL TIMING CONFIGURATOR */}
              {!editingShowtime && activeConfigHallId && (
                <div
                  className={`p-4 rounded-2xl border border-red-500/30 ${isLight ? "bg-red-50/50" : "bg-red-950/10"} space-y-3`}
                >
                  <div className="flex items-center justify-between border-b border-red-500/20 pb-2">
                    <span className="font-black text-red-600 dark:text-red-400 flex items-center gap-1.5">
                      <Clock className="h-4 w-4" />
                      Configuring Times for:{" "}
                      {
                        (
                          hallsList.find(
                            (h) => h.id === activeConfigHallId,
                          ) as any
                        )?.name
                      }
                    </span>
                    <span className="text-[10px] font-bold text-slate-500">
                      ({activeHallQueue.length} slots staged)
                    </span>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className={`font-bold ${textSecondary}`}>
                        Pick Start Time for this Hall *
                      </label>
                      <button
                        type="button"
                        onClick={handleFindNextAvailable}
                        className="flex items-center gap-1 rounded-lg border border-amber-500/30 bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 transition cursor-pointer"
                      >
                        <Zap className="h-3 w-3" />
                        Find Next Available
                      </button>
                    </div>
                    <DatePicker
                      selected={showtimeForm.startTime}
                      onChange={(date: Date | null) =>
                        setShowtimeForm({
                          ...showtimeForm,
                          startTime: date || new Date(),
                        })
                      }
                      showTimeSelect
                      timeFormat="h:mm aa"
                      timeIntervals={15}
                      dateFormat="yyyy-MM-dd h:mm aa"
                      className={`w-full rounded-xl border ${inputClass} p-3 outline-none focus:border-red-500 font-mono cursor-pointer`}
                      wrapperClassName="w-full"
                      withPortal
                      portalId="showtime-datepicker-portal"
                    />

                    {previewEndTime && (
                      <p
                        className={`mt-1.5 flex items-center gap-1.5 text-[11px] ${textSecondary}`}
                      >
                        <Info className="h-3 w-3 text-slate-400 shrink-0" />
                        Blocks hall until{" "}
                        <span className={`font-mono font-black ${textPrimary}`}>
                          {previewEndTime.toLocaleTimeString(undefined, {
                            hour: "numeric",
                            minute: "2-digit",
                            hour12: true,
                          })}
                        </span>{" "}
                        ({selectedMovieDuration}m + {BUFFER_MINUTES}m buffer)
                      </p>
                    )}

                    {primaryOverlapWarning && (
                      <div className="mt-2 flex items-start gap-2 rounded-lg border border-rose-500/30 bg-rose-500/15 px-3 py-2">
                        <AlertTriangle className="h-3.5 w-3.5 text-rose-500 shrink-0 mt-0.5" />
                        <p className="text-[11px] text-rose-500 font-bold">
                          {primaryOverlapWarning}
                        </p>
                      </div>
                    )}

                    <div className="mt-3 flex items-center justify-between">
                      <button
                        type="button"
                        onClick={handleAddTimeToActiveHall}
                        disabled={
                          !!primaryOverlapWarning || !showtimeForm.movieId
                        }
                        className="flex items-center gap-1.5 rounded-xl bg-red-600 hover:bg-red-500 px-4 py-2 text-xs font-bold text-white transition disabled:opacity-40 cursor-pointer shadow-sm w-full justify-center"
                      >
                        <Plus className="h-4 w-4" />
                        <span>Add Time Slot to This Hall</span>
                      </button>
                    </div>
                  </div>

                  {/* Display Staged Times for Active Hall */}
                  {activeHallQueue.length > 0 && (
                    <div className="space-y-1.5 pt-2">
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                        Staged Slots for this Hall:
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {activeHallQueue.map((t, idx) => (
                          <div
                            key={idx}
                            className={`flex items-center gap-2 rounded-lg border ${borderCol} ${isLight ? "bg-white text-slate-900 shadow-sm font-bold" : "bg-slate-900 text-white"} px-2.5 py-1 text-[11px] font-mono`}
                          >
                            <span>
                              {t.toLocaleDateString()}{" "}
                              {t.toLocaleTimeString(undefined, {
                                hour: "numeric",
                                minute: "2-digit",
                                hour12: true,
                              })}
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                handleRemoveHallTime(activeConfigHallId, idx)
                              }
                              className="text-slate-400 hover:text-rose-500 cursor-pointer"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {editingShowtime && (
                <div>
                  <label
                    className={`block ${isLight ? "text-slate-800" : "text-slate-300"} mb-1 font-bold flex items-center gap-1.5`}
                  >
                    <Clock className="h-3.5 w-3.5 text-red-600" />
                    Screening Start Date & Time *
                  </label>
                  <DatePicker
                    selected={showtimeForm.startTime}
                    onChange={(date: Date | null) =>
                      setShowtimeForm({
                        ...showtimeForm,
                        startTime: date || new Date(),
                      })
                    }
                    showTimeSelect
                    timeFormat="h:mm aa"
                    timeIntervals={15}
                    dateFormat="yyyy-MM-dd h:mm aa"
                    className={`w-full rounded-xl border ${inputClass} p-3 outline-none focus:border-red-500 font-mono cursor-pointer`}
                    wrapperClassName="w-full"
                    withPortal
                    portalId="showtime-datepicker-portal"
                  />
                  {primaryOverlapWarning && (
                    <div className="mt-2 flex items-start gap-2 rounded-lg border border-rose-500/30 bg-rose-500/15 px-3 py-2">
                      <AlertTriangle className="h-3.5 w-3.5 text-rose-500 shrink-0 mt-0.5" />
                      <p className="text-[11px] text-rose-500 font-bold">
                        {primaryOverlapWarning}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* REPEAT FOR X DAYS FIELD */}
              {!editingShowtime && (
                <div>
                  <label
                    className={`block ${isLight ? "text-slate-800" : "text-slate-300"} mb-1 font-bold flex items-center gap-1.5`}
                  >
                    <Repeat className="h-3.5 w-3.5 text-red-600" />
                    Repeat for Next X Days (e.g. 5 or 7 days)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="30"
                    value={showtimeForm.repeatDays}
                    onChange={(e) =>
                      setShowtimeForm({
                        ...showtimeForm,
                        repeatDays: Math.max(1, Number(e.target.value)),
                      })
                    }
                    className={`w-full rounded-xl border ${inputClass} p-3 outline-none focus:border-red-500 font-mono`}
                  />
                  <p className={`mt-1 text-[10px] ${textSecondary}`}>
                    Automatically copies all hall schedules forward for the
                    specified number of consecutive days.
                  </p>
                </div>
              )}

              <div>
                <label
                  className={`block ${isLight ? "text-slate-800" : "text-slate-300"} mb-1 font-bold flex items-center gap-1.5`}
                >
                  <DollarSign className="h-3.5 w-3.5 text-amber-500" />
                  Base Price ($) *
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="0.5"
                  value={showtimeForm.basePrice}
                  onChange={(e) =>
                    setShowtimeForm({
                      ...showtimeForm,
                      basePrice: Number(e.target.value),
                    })
                  }
                  className={`w-full rounded-xl border ${inputClass} p-3 outline-none focus:border-red-500 font-mono`}
                />
                {errors.basePrice && (
                  <p className="mt-1 text-[11px] text-rose-500">
                    {errors.basePrice}
                  </p>
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
                  <span>
                    {editingShowtime
                      ? "Save Changes"
                      : `Schedule All Configured Halls (${showtimeForm.repeatDays} day${showtimeForm.repeatDays > 1 ? "s" : ""})`}
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
