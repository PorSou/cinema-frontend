"use client";

import { useEffect, useState, useMemo, FormEvent } from "react";
import {
  Building2,
  Plus,
  Edit3,
  Trash2,
  Search,
  Loader2,
  MapPin,
  Phone,
  Film,
  X,
  Eye,
  Tv,
  Archive,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import CinemaService from "@/app/service/cinema.service";
import HallService from "@/app/service/hall.service";
import {
  CinemaResponse,
  CinemaRequest,
  HallResponse,
  HallRequest,
  HallType,
} from "@/app/types/api.types";
import Toast from "@/app/components/Toast";
import ConfirmDialog from "@/app/components/ConfirmDialog";

const HALL_TYPE_COLORS: Record<HallType, string> = {
  STANDARD_2D: "bg-slate-800 text-slate-300 border-slate-700",
  STANDARD_3D: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  IMAX: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  VIP: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  KIDS_HALL: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
};

const extractArray = <T,>(res: any): T[] => {
  if (Array.isArray(res)) return res;
  if (Array.isArray(res?.data)) return res.data;
  if (Array.isArray(res?.body?.data)) return res.body.data;
  if (Array.isArray(res?.data?.body?.data)) return res.data.body.data;
  return [];
};

export default function AdminCinemasPage() {
  const [cinemas, setCinemas] = useState<CinemaResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewTrash, setViewTrash] = useState(false);

  // Cinema Form State & Validation
  const [isCinemaModalOpen, setIsCinemaModalOpen] = useState(false);
  const [editingCinema, setEditingCinema] = useState<CinemaResponse | null>(null);
  const [cinemaForm, setCinemaForm] = useState<CinemaRequest>({
    name: "",
    city: "Phnom Penh",
    address: "",
    phone: "",
  });
  const [cinemaErrors, setCinemaErrors] = useState<Partial<CinemaRequest>>({});

  // Halls Quick Viewer / Creator State
  const [selectedCinemaForHalls, setSelectedCinemaForHalls] = useState<CinemaResponse | null>(null);
  const [halls, setHalls] = useState<HallResponse[]>([]);
  const [hallsLoading, setHallsLoading] = useState(false);
  const [isHallModalOpen, setIsHallModalOpen] = useState(false);
  const [hallForm, setHallForm] = useState<{ name: string; hallType: HallType }>({
    name: "",
    hallType: "STANDARD_2D",
  });
  const [hallError, setHallError] = useState<string | null>(null);

  // Global Actions State
  const [submitting, setSubmitting] = useState(false);
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

  // Standardized Toast State
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

  const loadCinemas = async (trashMode = viewTrash) => {
    setLoading(true);
    try {
      const res = trashMode
        ? await CinemaService.getTrashCinemas()
        : await CinemaService.getAllCinemas();
      setCinemas(extractArray<CinemaResponse>(res));
    } catch {
      showToast("Failed to load cinema branches list.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCinemas(viewTrash);
  }, [viewTrash]);

  // Validation
  const validateCinemaForm = () => {
    const errors: Partial<CinemaRequest> = {};
    if (!cinemaForm.name.trim()) errors.name = "Branch name is required";
    if (!cinemaForm.city.trim()) errors.city = "City is required";
    if (!cinemaForm.address.trim()) errors.address = "Address is required";
    if (!cinemaForm.phone.trim()) errors.phone = "Phone number is required";
    setCinemaErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const openCinemaModal = (cinema?: CinemaResponse) => {
    setCinemaErrors({});
    if (cinema) {
      setEditingCinema(cinema);
      setCinemaForm({
        name: cinema.name,
        city: cinema.city,
        address: cinema.address,
        phone: cinema.phone,
      });
    } else {
      setEditingCinema(null);
      setCinemaForm({ name: "", city: "Phnom Penh", address: "", phone: "" });
    }
    setIsCinemaModalOpen(true);
  };

  // Cinema Create & Update
  const handleCinemaSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validateCinemaForm()) return;

    setSubmitting(true);
    try {
      if (editingCinema) {
        const updated = await CinemaService.updateCinema(editingCinema.id, cinemaForm);
        setCinemas((prev) => prev.map((c) => (c.id === editingCinema.id ? updated : c)));
        showToast(`Branch "${cinemaForm.name}" updated successfully!`, "success");
      } else {
        const created = await CinemaService.createCinema(cinemaForm);
        setCinemas((prev) => [created, ...prev]);
        showToast(`Branch "${cinemaForm.name}" created successfully!`, "success");
      }
      setIsCinemaModalOpen(false);
    } catch (err: any) {
      showToast(
        err.response?.data?.status?.message || err.response?.data?.message || "Operation failed.",
        "error"
      );
    } finally {
      setSubmitting(false);
    }
  };

  // Cinema Delete, Restore, and Wipe Actions
  const handleSoftDeleteCinema = (cinema: CinemaResponse) => {
    setConfirmDialog({
      isOpen: true,
      type: "SOFT_DELETE",
      title: "Move Branch to Trash",
      targetName: cinema.name,
      action: async () => {
        await CinemaService.softDeleteCinema(cinema.id);
        setCinemas((prev) => prev.filter((c) => c.id !== cinema.id));
        showToast(`Branch "${cinema.name}" moved to trash.`, "success");
      },
    });
  };

  const handleRestoreCinema = (cinema: CinemaResponse) => {
    setConfirmDialog({
      isOpen: true,
      type: "RESTORE",
      title: "Restore Cinema Branch",
      targetName: cinema.name,
      action: async () => {
        await CinemaService.restoreCinema(cinema.id);
        setCinemas((prev) => prev.filter((c) => c.id !== cinema.id));
        showToast(`Branch "${cinema.name}" restored successfully.`, "success");
      },
    });
  };

  const handleHardDeleteCinema = (cinema: CinemaResponse) => {
    setConfirmDialog({
      isOpen: true,
      type: "HARD_DELETE",
      title: "Permanently Delete Branch",
      targetName: cinema.name,
      action: async () => {
        await CinemaService.hardDeleteCinema(cinema.id);
        setCinemas((prev) => prev.filter((c) => c.id !== cinema.id));
        showToast(`Branch "${cinema.name}" permanently deleted.`, "success");
      },
    });
  };

  // Hall Viewer within Cinema Page
  const openHallsModal = async (cinema: CinemaResponse) => {
    setSelectedCinemaForHalls(cinema);
    setHallsLoading(true);
    try {
      const res = await HallService.getHallsByCinema(cinema.id);
      setHalls(extractArray<HallResponse>(res));
    } catch {
      showToast("Failed to load halls for this branch.", "error");
    } finally {
      setHallsLoading(false);
    }
  };

  // Hall Create in Quick Viewer
  const handleAddHallSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedCinemaForHalls) return;
    if (!hallForm.name.trim()) {
      setHallError("Hall name is required");
      return;
    }

    setSubmitting(true);
    try {
      const payload: HallRequest = {
        name: hallForm.name.trim(),
        hallType: hallForm.hallType,
        cinemaId: selectedCinemaForHalls.id,
      };
      const created = await HallService.createHall(payload);
      setHalls((prev) => [...prev, created]);
      setCinemas((prev) =>
        prev.map((c) =>
          c.id === selectedCinemaForHalls.id
            ? { ...c, totalHalls: (c.totalHalls || 0) + 1 }
            : c
        )
      );
      setHallForm({ name: "", hallType: "STANDARD_2D" });
      setIsHallModalOpen(false);
      showToast(`Hall "${created.name}" created successfully!`, "success");
    } catch (err: any) {
      showToast(
        err.response?.data?.status?.message || "Failed to create hall.",
        "error"
      );
    } finally {
      setSubmitting(false);
    }
  };

  // Hall Delete in Quick Viewer
  const handleDeleteHall = (hall: HallResponse) => {
    setConfirmDialog({
      isOpen: true,
      type: "HARD_DELETE",
      title: "Permanently Delete Hall",
      targetName: `${hall.name} (${selectedCinemaForHalls?.name || "Cinema"})`,
      action: async () => {
        await HallService.hardDeleteHall(hall.id);
        setHalls((prev) => prev.filter((h) => h.id !== hall.id));
        if (selectedCinemaForHalls) {
          setCinemas((prev) =>
            prev.map((c) =>
              c.id === selectedCinemaForHalls.id
                ? { ...c, totalHalls: Math.max((c.totalHalls || 1) - 1, 0) }
                : c
            )
          );
        }
        showToast(`Hall "${hall.name}" permanently deleted.`, "success");
      },
    });
  };

  const filteredCinemas = useMemo(() => {
    const query = searchQuery.toLowerCase();
    return cinemas.filter(
      (c) =>
        c.name?.toLowerCase().includes(query) ||
        c.city?.toLowerCase().includes(query) ||
        c.address?.toLowerCase().includes(query)
    );
  }, [cinemas, searchQuery]);

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-6">
      {/* Toast Alert Notification */}
      <Toast
        message={toast.message}
        type={toast.type}
        duration={3500}
        onClose={() => setToast((prev) => ({ ...prev, message: null }))}
      />

      {/* Confirm Action Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        type={confirmDialog.type}
        title={confirmDialog.title}
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
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2">
                Cinemas & Branches
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
                  {filteredCinemas.length} Total
                </span>
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                Manage theater complexes, addresses, contact lines, and screening halls
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
              onClick={() => openCinemaModal()}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-red-600/25 hover:from-red-500 hover:to-rose-500 transition cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>Add Cinema Branch</span>
            </button>
          )}
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative max-w-md">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by branch name, city (e.g. Siem Reap), or address..."
          className="w-full rounded-2xl border border-slate-800 bg-slate-900/90 py-3 pl-10 pr-4 text-xs font-medium text-white placeholder-slate-500 outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 shadow-lg transition"
        />
      </div>

      {/* Cinema Cards Grid */}
      {loading ? (
        <div className="flex min-h-[40vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-red-600" />
        </div>
      ) : filteredCinemas.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredCinemas.map((cinema) => (
            <div
              key={cinema.id}
              className="group rounded-3xl border border-slate-800/80 bg-slate-900/60 p-5 backdrop-blur-md shadow-xl flex flex-col justify-between hover:border-slate-700 transition"
            >
              <div className="space-y-3.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-red-500/20 to-rose-500/5 border border-red-500/20 text-red-400 font-bold shadow-inner">
                      <Building2 className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-sm font-bold text-white truncate group-hover:text-red-400 transition">
                        {cinema.name}
                      </h3>
                      <span className="inline-block rounded-md bg-slate-800/80 border border-slate-700/80 px-2 py-0.5 text-[10px] font-semibold text-slate-300 mt-1">
                        {cinema.city}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {!viewTrash ? (
                      <>
                        <button
                          onClick={() => openCinemaModal(cinema)}
                          className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
                          title="Edit Branch"
                        >
                          <Edit3 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleSoftDeleteCinema(cinema)}
                          className="p-1.5 rounded-xl text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition cursor-pointer"
                          title="Move to Trash"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => handleRestoreCinema(cinema)}
                          className="p-1.5 rounded-xl text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 transition cursor-pointer"
                          title="Restore Branch"
                        >
                          <RotateCcw className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleHardDeleteCinema(cinema)}
                          className="p-1.5 rounded-xl text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition cursor-pointer"
                          title="Delete Permanently"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                <div className="space-y-2 text-xs text-slate-400 border-t border-slate-800/80 pt-3 font-medium">
                  <div className="flex items-start gap-2">
                    <MapPin className="h-3.5 w-3.5 text-red-500 shrink-0 mt-0.5" />
                    <span className="line-clamp-2">{cinema.address}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                    <span className="font-mono text-slate-300">{cinema.phone}</span>
                  </div>
                </div>
              </div>

              {!viewTrash && (
                <div className="mt-5 pt-3 border-t border-slate-800/80 flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-300">
                    <Tv className="h-3.5 w-3.5 text-red-400" />
                    <span>{cinema.totalHalls || 0} Halls</span>
                  </div>

                  <button
                    onClick={() => openHallsModal(cinema)}
                    className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800/80 px-3 py-1.5 text-xs font-bold text-white hover:bg-slate-700 transition cursor-pointer shadow-sm"
                  >
                    <Eye className="h-3.5 w-3.5 text-slate-400" />
                    <span>View Halls</span>
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="flex min-h-[30vh] flex-col items-center justify-center rounded-3xl border border-slate-800 bg-slate-900/30 p-8 text-center text-slate-400 text-sm space-y-2">
          <Building2 className="h-10 w-10 text-slate-600 mb-1" />
          <p className="font-semibold text-slate-300">{viewTrash ? "Trash bin is empty." : "No cinema branches found."}</p>
          <p className="text-xs text-slate-500">{viewTrash ? "Deleted branches will appear here." : "Click 'Add Cinema Branch' to register your first branch."}</p>
        </div>
      )}

      {/* Quick Halls Modal */}
      {selectedCinemaForHalls && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-2xl rounded-3xl border border-slate-800 bg-slate-900 p-6 sm:p-8 shadow-2xl space-y-5">
            <button
              onClick={() => setSelectedCinemaForHalls(null)}
              className="absolute right-5 top-5 text-slate-400 hover:text-white cursor-pointer p-1 rounded-lg hover:bg-slate-800 transition"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex items-center justify-between border-b border-slate-800 pb-4 pr-8">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                  <Film className="h-5 w-5 text-red-500" />
                  Halls in {selectedCinemaForHalls.name}
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">{selectedCinemaForHalls.address}</p>
              </div>

              <button
                onClick={() => setIsHallModalOpen(true)}
                className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 px-3.5 py-1.5 text-xs font-bold text-white hover:from-red-500 hover:to-rose-500 transition cursor-pointer shrink-0 shadow-md shadow-red-600/20"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>New Hall</span>
              </button>
            </div>

            {hallsLoading ? (
              <div className="flex min-h-[20vh] items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-red-600" />
              </div>
            ) : halls.length > 0 ? (
              <div className="max-h-[50vh] overflow-y-auto space-y-2.5 pr-1 scrollbar-thin scrollbar-thumb-slate-800">
                {halls.map((hall) => {
                  const badgeClass = HALL_TYPE_COLORS[hall.hallType] || HALL_TYPE_COLORS.STANDARD_2D;
                  return (
                    <div
                      key={hall.id}
                      className="flex items-center justify-between p-3.5 rounded-2xl border border-slate-800 bg-slate-950/60"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-800 font-bold text-white text-xs border border-slate-700/60">
                          {hall.name.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-white text-xs">{hall.name}</p>
                          <span
                            className={`inline-block mt-0.5 rounded-md border px-2 py-0.5 text-[9px] font-bold ${badgeClass}`}
                          >
                            {hall.hallType}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="text-xs text-slate-400 font-mono">
                          {hall.totalSeats || 0} Seats
                        </span>
                        <button
                          onClick={() => handleDeleteHall(hall)}
                          className="p-1.5 rounded-lg text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition cursor-pointer"
                          title="Delete Hall"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-8 text-center text-xs text-slate-500">
                No halls registered for this cinema branch yet. Click &quot;New Hall&quot; to add one.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add / Edit Cinema Modal */}
      {isCinemaModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900 p-6 sm:p-8 shadow-2xl space-y-4">
            <button
              onClick={() => setIsCinemaModalOpen(false)}
              className="absolute right-5 top-5 text-slate-400 hover:text-white cursor-pointer p-1 rounded-lg hover:bg-slate-800 transition"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="border-b border-slate-800 pb-3">
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-red-500" />
                {editingCinema ? "Edit Cinema Branch" : "Add Cinema Branch"}
              </h2>
            </div>

            <form onSubmit={handleCinemaSubmit} noValidate className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-300 mb-1 font-semibold">Cinema Name *</label>
                <input
                  type="text"
                  value={cinemaForm.name}
                  onChange={(e) => {
                    setCinemaForm({ ...cinemaForm, name: e.target.value });
                    if (cinemaErrors.name) setCinemaErrors((p) => ({ ...p, name: undefined }));
                  }}
                  placeholder="e.g. CinemaX Siem Reap Heritage"
                  className={`w-full rounded-xl border bg-slate-950 p-2.5 text-white outline-none transition ${
                    cinemaErrors.name ? "border-rose-500 focus:border-rose-500" : "border-slate-800 focus:border-red-500"
                  }`}
                />
                {cinemaErrors.name && <p className="mt-1 text-[11px] text-rose-400">{cinemaErrors.name}</p>}
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-semibold">City / Location *</label>
                <input
                  type="text"
                  value={cinemaForm.city}
                  onChange={(e) => {
                    setCinemaForm({ ...cinemaForm, city: e.target.value });
                    if (cinemaErrors.city) setCinemaErrors((p) => ({ ...p, city: undefined }));
                  }}
                  placeholder="e.g. Phnom Penh, Siem Reap, Battambang"
                  className={`w-full rounded-xl border bg-slate-950 p-2.5 text-white outline-none transition ${
                    cinemaErrors.city ? "border-rose-500 focus:border-rose-500" : "border-slate-800 focus:border-red-500"
                  }`}
                />
                {cinemaErrors.city && <p className="mt-1 text-[11px] text-rose-400">{cinemaErrors.city}</p>}
                
                {/* Quick select pills */}
                <div className="flex items-center gap-1.5 mt-1.5">
                  <span className="text-[10px] text-slate-500">Quick set:</span>
                  {["Phnom Penh", "Siem Reap", "Battambang", "Sihanoukville"].map((city) => (
                    <button
                      key={city}
                      type="button"
                      onClick={() => setCinemaForm({ ...cinemaForm, city })}
                      className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer"
                    >
                      {city}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-semibold">Full Address *</label>
                <textarea
                  rows={2}
                  value={cinemaForm.address}
                  onChange={(e) => {
                    setCinemaForm({ ...cinemaForm, address: e.target.value });
                    if (cinemaErrors.address) setCinemaErrors((p) => ({ ...p, address: undefined }));
                  }}
                  placeholder="Street address, District, City"
                  className={`w-full rounded-xl border bg-slate-950 p-2.5 text-white outline-none resize-none transition ${
                    cinemaErrors.address ? "border-rose-500 focus:border-rose-500" : "border-slate-800 focus:border-red-500"
                  }`}
                />
                {cinemaErrors.address && <p className="mt-1 text-[11px] text-rose-400">{cinemaErrors.address}</p>}
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-semibold">Contact Phone *</label>
                <input
                  type="tel"
                  value={cinemaForm.phone}
                  onChange={(e) => {
                    setCinemaForm({ ...cinemaForm, phone: e.target.value });
                    if (cinemaErrors.phone) setCinemaErrors((p) => ({ ...p, phone: undefined }));
                  }}
                  placeholder="023 999 888"
                  className={`w-full rounded-xl border bg-slate-950 p-2.5 text-white outline-none transition ${
                    cinemaErrors.phone ? "border-rose-500 focus:border-rose-500" : "border-slate-800 focus:border-red-500"
                  }`}
                />
                {cinemaErrors.phone && <p className="mt-1 text-[11px] text-rose-400">{cinemaErrors.phone}</p>}
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCinemaModalOpen(false)}
                  className="rounded-xl border border-slate-800 bg-slate-950 px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white cursor-pointer transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 px-5 py-2 text-xs font-bold text-white shadow-lg shadow-red-600/30 hover:from-red-500 hover:to-rose-500 disabled:opacity-50 cursor-pointer transition"
                >
                  {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  <span>{editingCinema ? "Save Changes" : "Create Branch"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add New Hall Modal */}
      {isHallModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-sm rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-2xl space-y-4">
            <button
              onClick={() => setIsHallModalOpen(false)}
              className="absolute right-5 top-5 text-slate-400 hover:text-white cursor-pointer p-1 rounded-lg hover:bg-slate-800 transition"
            >
              <X className="h-5 w-5" />
            </button>

            <h2 className="text-base font-bold text-white border-b border-slate-800 pb-3">
              Add Hall to {selectedCinemaForHalls?.name}
            </h2>

            <form onSubmit={handleAddHallSubmit} noValidate className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 mb-1 font-semibold">Hall Name / Number *</label>
                <input
                  type="text"
                  value={hallForm.name}
                  onChange={(e) => {
                    setHallForm({ ...hallForm, name: e.target.value });
                    if (hallError) setHallError(null);
                  }}
                  placeholder="e.g. Hall 1, Screen IMAX"
                  className={`w-full rounded-xl border bg-slate-950 p-2.5 text-white outline-none transition ${
                    hallError ? "border-rose-500 focus:border-rose-500" : "border-slate-800 focus:border-red-500"
                  }`}
                />
                {hallError && <p className="mt-1 text-[11px] text-rose-400">{hallError}</p>}
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-semibold">Hall Format *</label>
                <select
                  value={hallForm.hallType}
                  onChange={(e) =>
                    setHallForm({ ...hallForm, hallType: e.target.value as HallType })
                  }
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 p-2.5 text-white outline-none focus:border-red-500 cursor-pointer"
                >
                  <option value="STANDARD_2D">Standard 2D</option>
                  <option value="STANDARD_3D">Standard 3D</option>
                  <option value="IMAX">IMAX Experience</option>
                  <option value="VIP">VIP Lounge</option>
                  <option value="KIDS_HALL">Kids Family Hall</option>
                </select>
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsHallModalOpen(false)}
                  className="rounded-xl border border-slate-800 bg-slate-950 px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white cursor-pointer transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 px-5 py-2 text-xs font-bold text-white shadow-lg shadow-red-600/30 hover:from-red-500 hover:to-rose-500 disabled:opacity-50 cursor-pointer transition"
                >
                  {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  <span>Add Hall</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}