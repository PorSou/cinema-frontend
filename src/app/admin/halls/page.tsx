"use client";

import { useEffect, useState, useMemo, useRef, FormEvent } from "react";
import {
  Film,
  Plus,
  Edit3,
  Trash2,
  Search,
  Loader2,
  Archive,
  RotateCcw,
  Building2,
  X,
  ChevronDown,
  Check,
  MapPin,
  Layers,
  Sparkles,
} from "lucide-react";
import CinemaService from "@/app/service/cinema.service";
import HallService from "@/app/service/hall.service";
import {
  CinemaResponse,
  HallResponse,
  HallRequest,
  HallType,
} from "@/app/types/api.types";
import Toast from "@/app/components/Toast";
import ConfirmDialog from "@/app/components/ConfirmDialog";

const HALL_TYPE_STYLES: Record<HallType, { bg: string; text: string; border: string }> = {
  STANDARD_2D: { bg: "bg-slate-800/80", text: "text-slate-300", border: "border-slate-700/80" },
  STANDARD_3D: { bg: "bg-cyan-500/10", text: "text-cyan-400", border: "border-cyan-500/30" },
  IMAX: { bg: "bg-purple-500/10", text: "text-purple-400", border: "border-purple-500/30" },
  VIP: { bg: "bg-pink-500/10", text: "text-pink-400", border: "border-pink-500/30" },
  KIDS_HALL: { bg: "bg-amber-500/10", text: "text-amber-400", border: "border-amber-500/30" },
};

const extractArray = <T,>(res: any): T[] => {
  if (Array.isArray(res)) return res;
  if (Array.isArray(res?.data)) return res.data;
  if (Array.isArray(res?.body?.data)) return res.body.data;
  if (Array.isArray(res?.data?.body?.data)) return res.data.body.data;
  return [];
};

export default function AdminHallsPage() {
  const [cinemas, setCinemas] = useState<CinemaResponse[]>([]);
  // selectedCinemaId: null means "All Cinema Branches"
  const [selectedCinemaId, setSelectedCinemaId] = useState<number | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [halls, setHalls] = useState<HallResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewTrash, setViewTrash] = useState(false);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingHall, setEditingHall] = useState<HallResponse | null>(null);
  const [hallForm, setHallForm] = useState<{
    name: string;
    hallType: HallType;
    cinemaId: number;
  }>({
    name: "",
    hallType: "STANDARD_2D",
    cinemaId: 0,
  });
  const [errors, setErrors] = useState<{ name?: string; cinemaId?: string }>({});

  const [submitting, setSubmitting] = useState(false);
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

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Load Cinemas on Mount
  useEffect(() => {
    const initCinemas = async () => {
      try {
        const res = await CinemaService.getAllCinemas();
        const list = extractArray<CinemaResponse>(res);
        setCinemas(list);
      } catch {
        showToast("Failed to load cinema branches list.", "error");
      }
    };
    initCinemas();
  }, []);

  // Load Halls (All branches vs. Single branch)
  const loadHalls = async () => {
    setLoading(true);
    try {
      if (selectedCinemaId === null) {
        // Fetch all halls across all cinema branches concurrently
        const branchPromises = cinemas.map((c) =>
          viewTrash
            ? HallService.getTrashHallsByCinema(c.id)
            : HallService.getHallsByCinema(c.id)
        );
        const results = await Promise.all(branchPromises);
        const allHalls = results.flatMap((r) => extractArray<HallResponse>(r));
        setHalls(allHalls);
      } else {
        const res = viewTrash
          ? await HallService.getTrashHallsByCinema(selectedCinemaId)
          : await HallService.getHallsByCinema(selectedCinemaId);
        setHalls(extractArray<HallResponse>(res));
      }
    } catch {
      showToast("Failed to load screening halls.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHalls();
  }, [selectedCinemaId, viewTrash, cinemas]);

  const selectedCinema = useMemo(() => {
    return cinemas.find((c) => c.id === selectedCinemaId) || null;
  }, [cinemas, selectedCinemaId]);

  const validate = () => {
    const newErrors: { name?: string; cinemaId?: string } = {};
    if (!hallForm.name.trim()) newErrors.name = "Hall name or number is required.";
    if (!hallForm.cinemaId) newErrors.cinemaId = "Please select a cinema branch.";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const openModal = (hall?: HallResponse) => {
    setErrors({});
    if (hall) {
      setEditingHall(hall);
      setHallForm({
        name: hall.name,
        hallType: hall.hallType,
        cinemaId: hall.cinemaId,
      });
    } else {
      setEditingHall(null);
      setHallForm({
        name: "",
        hallType: "STANDARD_2D",
        cinemaId: selectedCinemaId || (cinemas[0]?.id ?? 0),
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    try {
      const payload: HallRequest = {
        name: hallForm.name.trim(),
        hallType: hallForm.hallType,
        cinemaId: hallForm.cinemaId,
      };

      if (editingHall) {
        const updated = await HallService.updateHall(editingHall.id, payload);
        setHalls((prev) => prev.map((h) => (h.id === editingHall.id ? updated : h)));
        showToast("Hall details updated successfully!", "success");
      } else {
        const created = await HallService.createHall(payload);
        if (selectedCinemaId === null || created.cinemaId === selectedCinemaId) {
          setHalls((prev) => [created, ...prev]);
        }
        showToast("New screening hall created successfully!", "success");
      }
      setIsModalOpen(false);
    } catch (err: any) {
      showToast(
        err.response?.data?.status?.message || err.response?.data?.message || "Operation failed.",
        "error"
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleSoftDelete = (hall: HallResponse) => {
    setConfirmDialog({
      isOpen: true,
      type: "SOFT_DELETE",
      targetName: `${hall.name} (${hall.cinemaName || "Cinema"})`,
      action: async () => {
        await HallService.softDeleteHall(hall.id);
        setHalls((prev) => prev.filter((h) => h.id !== hall.id));
        showToast(`"${hall.name}" moved to trash.`, "success");
      },
    });
  };

  const handleRestore = (hall: HallResponse) => {
    setConfirmDialog({
      isOpen: true,
      type: "RESTORE",
      targetName: `${hall.name} (${hall.cinemaName || "Cinema"})`,
      action: async () => {
        await HallService.restoreHall(hall.id);
        setHalls((prev) => prev.filter((h) => h.id !== hall.id));
        showToast(`"${hall.name}" restored successfully.`, "success");
      },
    });
  };

  const handleHardDelete = (hall: HallResponse) => {
    setConfirmDialog({
      isOpen: true,
      type: "HARD_DELETE",
      targetName: `${hall.name} (${hall.cinemaName || "Cinema"})`,
      action: async () => {
        await HallService.hardDeleteHall(hall.id);
        setHalls((prev) => prev.filter((h) => h.id !== hall.id));
        showToast(`"${hall.name}" permanently removed.`, "success");
      },
    });
  };

  const filteredHalls = halls.filter((h) => {
    const query = searchQuery.toLowerCase();
    return (
      h.name?.toLowerCase().includes(query) ||
      h.hallType?.toLowerCase().includes(query) ||
      h.cinemaName?.toLowerCase().includes(query)
    );
  });

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 px-3 sm:px-6 py-4 pb-12">
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
          await confirmDialog.action();
          setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        }}
        onCancel={() => setConfirmDialog((prev) => ({ ...prev, isOpen: false }))}
      />

      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500 shrink-0">
              <Film className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2">
                Halls & Auditoriums
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
                  {filteredHalls.length} Total
                </span>
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                Configure screening auditoriums, formats (IMAX, 3D, VIP), and seating setups
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setViewTrash(!viewTrash)}
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
              <span>Add New Hall</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter Toolbar: Dropdown & Search */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
        {/* Branch Selector Dropdown */}
        <div className="sm:col-span-5 relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setIsDropdownOpen((prev) => !prev)}
            className="w-full flex items-center justify-between gap-2.5 rounded-2xl border border-slate-800 bg-slate-900/90 px-4 py-3 text-xs font-bold text-white shadow-lg backdrop-blur-md hover:border-slate-700 transition cursor-pointer text-left"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-red-500/10 border border-red-500/20 text-red-400">
                {selectedCinemaId === null ? <Layers className="h-3.5 w-3.5" /> : <Building2 className="h-3.5 w-3.5" />}
              </div>
              <div className="truncate">
                <p className="text-[10px] uppercase tracking-wider text-slate-500 font-extrabold leading-none mb-0.5">
                  Cinema Branch
                </p>
                <p className="text-xs font-bold text-slate-200 truncate">
                  {selectedCinemaId === null
                    ? "✨ All Cinema Branches"
                    : `${selectedCinema?.name} (${selectedCinema?.city})`}
                </p>
              </div>
            </div>
            <ChevronDown
              className={`h-4 w-4 text-slate-400 shrink-0 transition-transform duration-200 ${
                isDropdownOpen ? "rotate-180 text-red-500" : ""
              }`}
            />
          </button>

          {/* Floating Dropdown Menu */}
          {isDropdownOpen && (
            <div className="absolute top-full left-0 mt-2 w-full z-40 overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/95 p-1.5 shadow-2xl backdrop-blur-xl animate-in fade-in slide-in-from-top-2">
              <div className="max-h-60 overflow-y-auto space-y-1 scrollbar-thin scrollbar-thumb-slate-800">
                {/* Option: All Branches */}
                <button
                  onClick={() => {
                    setSelectedCinemaId(null);
                    setIsDropdownOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                    selectedCinemaId === null
                      ? "bg-red-500/15 text-red-400 border border-red-500/20"
                      : "text-slate-300 hover:bg-slate-800/80 hover:text-white"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Layers className="h-4 w-4 text-amber-400" />
                    <span>All Branches (View All)</span>
                  </div>
                  {selectedCinemaId === null && <Check className="h-4 w-4 text-red-400" />}
                </button>

                <div className="h-[1px] bg-slate-800/80 my-1" />

                {/* Single Branch Options */}
                {cinemas.map((c) => {
                  const isSelected = selectedCinemaId === c.id;
                  return (
                    <button
                      key={c.id}
                      onClick={() => {
                        setSelectedCinemaId(c.id);
                        setIsDropdownOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                        isSelected
                          ? "bg-red-500/15 text-red-400 border border-red-500/20"
                          : "text-slate-300 hover:bg-slate-800/80 hover:text-white"
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <Building2 className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                        <span className="truncate">{c.name}</span>
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-slate-800 text-slate-400 border border-slate-700 shrink-0">
                          {c.city}
                        </span>
                      </div>
                      {isSelected && <Check className="h-4 w-4 text-red-400 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Search Bar */}
        <div className="sm:col-span-7 relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by hall name, sound format (IMAX, VIP), or branch..."
            className="w-full rounded-2xl border border-slate-800 bg-slate-900/90 py-3 pl-10 pr-4 text-xs font-medium text-white placeholder-slate-500 outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 shadow-lg transition"
          />
        </div>
      </div>

      {/* Screening Halls Grid */}
      {loading ? (
        <div className="flex min-h-[36vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-red-600" />
        </div>
      ) : filteredHalls.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {filteredHalls.map((hall) => {
            const style = HALL_TYPE_STYLES[hall.hallType] || HALL_TYPE_STYLES.STANDARD_2D;
            return (
              <div
                key={hall.id}
                className="group relative rounded-3xl border border-slate-800/80 bg-slate-900/60 p-5 backdrop-blur-md shadow-xl hover:border-slate-700 transition flex flex-col justify-between space-y-4"
              >
                <div className="space-y-3.5">
                  {/* Top Bar: Icon + Hall Name + Action Controls */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-red-500/20 to-rose-500/5 border border-red-500/20 text-red-400 font-black text-sm shadow-inner">
                        {hall.name.substring(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-sm font-bold text-white truncate group-hover:text-red-400 transition">
                          {hall.name}
                        </h3>
                        <div className="flex items-center gap-1.5 mt-1">
                          <span
                            className={`inline-block rounded-md border px-2 py-0.5 text-[9px] font-extrabold tracking-wider ${style.bg} ${style.text} ${style.border}`}
                          >
                            {hall.hallType}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-1">
                      {!viewTrash ? (
                        <>
                          <button
                            onClick={() => openModal(hall)}
                            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
                            title="Edit Hall"
                          >
                            <Edit3 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleSoftDelete(hall)}
                            className="p-1.5 rounded-xl text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition cursor-pointer"
                            title="Move to Trash"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => handleRestore(hall)}
                            className="p-1.5 rounded-xl text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 transition cursor-pointer"
                            title="Restore Hall"
                          >
                            <RotateCcw className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleHardDelete(hall)}
                            className="p-1.5 rounded-xl text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition cursor-pointer"
                            title="Permanently Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Cinema Branch Tag */}
                  <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium bg-slate-950/40 border border-slate-800/60 rounded-xl px-3 py-2">
                    <MapPin className="h-3.5 w-3.5 text-red-500 shrink-0" />
                    <span className="truncate">{hall.cinemaName || "Cinema Branch"}</span>
                  </div>
                </div>

                {/* Bottom Bar: Total Capacity */}
                <div className="border-t border-slate-800/80 pt-3 flex items-center justify-between text-xs">
                  <span className="text-slate-500 font-medium">Capacity</span>
                  <span
                    className={`font-mono font-bold px-2 py-0.5 rounded-md border ${
                      hall.totalSeats > 0
                        ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
                        : "text-amber-400 bg-amber-500/10 border-amber-500/20"
                    }`}
                  >
                    {hall.totalSeats > 0 ? `${hall.totalSeats} Seats` : "0 (Unset)"}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex min-h-[30vh] flex-col items-center justify-center rounded-3xl border border-slate-800 bg-slate-900/30 p-8 text-center text-slate-400 text-xs sm:text-sm space-y-2">
          <Film className="h-10 w-10 text-slate-600 mb-1" />
          <p className="font-semibold text-slate-300">
            {viewTrash
              ? "Trash bin is empty."
              : selectedCinemaId === null
              ? "No screening halls found in the entire network."
              : `No screening halls found for ${selectedCinema?.name}.`}
          </p>
          <p className="text-[11px] text-slate-500">
            {viewTrash
              ? "Deleted halls will appear here for restoration."
              : "Click 'Add New Hall' to create your first auditorium."}
          </p>
        </div>
      )}

      {/* Add / Edit Hall Modal Dialog */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900 p-6 sm:p-8 shadow-2xl space-y-4">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute right-5 top-5 text-slate-400 hover:text-white cursor-pointer p-1 rounded-lg hover:bg-slate-800 transition"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="border-b border-slate-800 pb-3">
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-red-500" />
                {editingHall ? "Edit Screening Hall" : "Create New Hall"}
              </h2>
            </div>

            <form onSubmit={handleSubmit} noValidate className="space-y-4 text-xs">
              {/* Cinema Branch Selection */}
              <div>
                <label className="block text-slate-300 mb-1.5 font-bold">Cinema Branch *</label>
                <div className="relative">
                  <select
                    value={hallForm.cinemaId}
                    onChange={(e) => {
                      setHallForm({ ...hallForm, cinemaId: Number(e.target.value) });
                      if (errors.cinemaId) setErrors((p) => ({ ...p, cinemaId: undefined }));
                    }}
                    className={`w-full appearance-none rounded-xl border bg-slate-950 px-3.5 py-2.5 text-white outline-none cursor-pointer pr-10 ${
                      errors.cinemaId ? "border-rose-500" : "border-slate-800 focus:border-red-500"
                    }`}
                  >
                    {cinemas.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} — ({c.city})
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="h-4 w-4 text-slate-500 pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2" />
                </div>
                {errors.cinemaId && <p className="mt-1 text-[11px] text-rose-400">{errors.cinemaId}</p>}
              </div>

              {/* Hall Name / Number */}
              <div>
                <label className="block text-slate-300 mb-1.5 font-bold">Hall Name / Number *</label>
                <input
                  type="text"
                  value={hallForm.name}
                  onChange={(e) => {
                    setHallForm({ ...hallForm, name: e.target.value });
                    if (errors.name) setErrors((p) => ({ ...p, name: undefined }));
                  }}
                  placeholder="e.g. Hall 1, IMAX MegaScreen, Screen A"
                  className={`w-full rounded-xl border bg-slate-950 px-3.5 py-2.5 text-white outline-none ${
                    errors.name ? "border-rose-500" : "border-slate-800 focus:border-red-500"
                  }`}
                />
                {errors.name && <p className="mt-1 text-[11px] text-rose-400">{errors.name}</p>}
              </div>

              {/* Hall Format Type */}
              <div>
                <label className="block text-slate-300 mb-1.5 font-bold">Auditorium Format *</label>
                <div className="relative">
                  <select
                    value={hallForm.hallType}
                    onChange={(e) =>
                      setHallForm({ ...hallForm, hallType: e.target.value as HallType })
                    }
                    className="w-full appearance-none rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-white outline-none focus:border-red-500 cursor-pointer pr-10"
                  >
                    <option value="STANDARD_2D">Standard 2D Auditorium</option>
                    <option value="STANDARD_3D">Standard 3D Hall</option>
                    <option value="IMAX">IMAX Experience</option>
                    <option value="VIP">VIP Lounge Recliner</option>
                    <option value="KIDS_HALL">Kids Family Hall</option>
                  </select>
                  <ChevronDown className="h-4 w-4 text-slate-500 pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2" />
                </div>
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
                  <span>{editingHall ? "Save Changes" : "Create Hall"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}