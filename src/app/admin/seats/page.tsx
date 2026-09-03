"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import {
  Armchair,
  Building2,
  Tv,
  Sparkles,
  RefreshCw,
  Loader2,
  Save,
  Eraser,
  Wand2,
  Layers,
  ChevronDown,
  ZoomIn,
  ZoomOut,
  Maximize2,
} from "lucide-react";
import Toast from "@/app/components/Toast";
import ConfirmDialog from "@/app/components/ConfirmDialog";
import { CinemaService } from "@/app/service/cinema.service";
import { HallService } from "@/app/service/hall.service";
import { SeatService } from "@/app/service/seat.service";
import {
  CinemaResponse,
  HallResponse,
  SeatResponse,
  SeatType,
  CustomSeatLayoutItem,
  SeatRequest,
} from "@/app/types/api.types";

const extractArray = <T,>(res: any): T[] => {
  if (Array.isArray(res)) return res;
  if (Array.isArray(res?.data)) return res.data;
  if (Array.isArray(res?.body?.data)) return res.body.data;
  if (Array.isArray(res?.data?.body?.data)) return res.data.body.data;
  return [];
};

const LEGEND_CINEMA_PRESETS = [
  {
    id: "STANDARD_2D",
    formatKey: "STANDARD_2D",
    name: "Standard 2D Auditorium",
    subtitle: "10-Row Full Block + 4 Back Twins",
    tag: "2D",
    tagColor: "border-sky-500/40 text-sky-400 bg-sky-500/10",
    desc: "Rows B-H standard full layout with 4 paired twin couple loungers on Row A.",
    generator: (): CustomSeatLayoutItem[] => {
      const items: CustomSeatLayoutItem[] = [];
      const rows = ["H", "G", "F", "E", "D", "C", "B"];
      rows.forEach((row, rIdx) => {
        for (let col = 1; col <= 10; col++) {
          items.push({ seatRow: row, seatNumber: col, seatType: "REGULAR", gridX: col, gridY: rIdx });
        }
      });
      const pairs = [[1, 2], [3, 4], [7, 8], [9, 10]];
      let num = 1;
      pairs.forEach((p) => {
        items.push({ seatRow: "A", seatNumber: num++, seatType: "COUPLE", gridX: p[0], gridY: 8 });
        items.push({ seatRow: "A", seatNumber: num++, seatType: "COUPLE", gridX: p[1], gridY: 8 });
      });
      return items;
    },
  },
  {
    id: "STANDARD_3D",
    formatKey: "STANDARD_3D",
    name: "Standard 3D Hall",
    subtitle: "Split Wings + Central Stairway",
    tag: "3D",
    tagColor: "border-cyan-500/40 text-cyan-400 bg-cyan-500/10",
    desc: "Rows B-G with 4 seats Left + 1 Center Walkway + 4 seats Right & Back Twins.",
    generator: (): CustomSeatLayoutItem[] => {
      const items: CustomSeatLayoutItem[] = [];
      const rows = ["G", "F", "E", "D", "C", "B"];
      rows.forEach((row, rIdx) => {
        let num = 1;
        for (let col = 1; col <= 4; col++) {
          items.push({ seatRow: row, seatNumber: num++, seatType: "REGULAR", gridX: col, gridY: rIdx });
        }
        for (let col = 6; col <= 9; col++) {
          items.push({ seatRow: row, seatNumber: num++, seatType: "REGULAR", gridX: col, gridY: rIdx });
        }
      });
      items.push({ seatRow: "A", seatNumber: 1, seatType: "COUPLE", gridX: 2, gridY: 7 });
      items.push({ seatRow: "A", seatNumber: 2, seatType: "COUPLE", gridX: 3, gridY: 7 });
      items.push({ seatRow: "A", seatNumber: 3, seatType: "COUPLE", gridX: 7, gridY: 7 });
      items.push({ seatRow: "A", seatNumber: 4, seatType: "COUPLE", gridX: 8, gridY: 7 });
      return items;
    },
  },
  {
    id: "IMAX",
    formatKey: "IMAX",
    name: "IMAX Grand MegaScreen",
    subtitle: "12 Wide Rows + Dual Aisles + VIP",
    tag: "IMAX",
    tagColor: "border-purple-500/40 text-purple-400 bg-purple-500/10",
    desc: "11 rows wide screen with 2 walkway aisles, VIP mid-tier block and 5 rear couples.",
    generator: (): CustomSeatLayoutItem[] => {
      const items: CustomSeatLayoutItem[] = [];
      const rows = ["L", "K", "J", "I", "H", "G", "F", "E", "D", "C", "B"];
      rows.forEach((row, rIdx) => {
        let num = 1;
        const type: SeatType = ["F", "E", "D"].includes(row) ? "VIP" : "REGULAR";
        for (let col = 1; col <= 3; col++) {
          items.push({ seatRow: row, seatNumber: num++, seatType: type, gridX: col, gridY: rIdx });
        }
        for (let col = 5; col <= 10; col++) {
          items.push({ seatRow: row, seatNumber: num++, seatType: type, gridX: col, gridY: rIdx });
        }
        for (let col = 12; col <= 14; col++) {
          items.push({ seatRow: row, seatNumber: num++, seatType: type, gridX: col, gridY: rIdx });
        }
      });
      const couplePairs = [[2, 3], [5, 6], [7, 8], [9, 10], [12, 13]];
      let cNum = 1;
      couplePairs.forEach((pair) => {
        items.push({ seatRow: "A", seatNumber: cNum++, seatType: "COUPLE", gridX: pair[0], gridY: 12 });
        items.push({ seatRow: "A", seatNumber: cNum++, seatType: "COUPLE", gridX: pair[1], gridY: 12 });
      });
      return items;
    },
  },
  {
    id: "VIP",
    formatKey: "VIP",
    name: "Legend VIP Lounge",
    subtitle: "Exchange Square L-Shape Geometry",
    tag: "VIP",
    tagColor: "border-pink-500/40 text-pink-400 bg-pink-500/10",
    desc: "All Premium VIP Recliners with 1 central aisle and extended left wing on Row A.",
    generator: (): CustomSeatLayoutItem[] => {
      const items: CustomSeatLayoutItem[] = [];
      const upperRows = ["G", "F", "E", "D", "C", "B"];
      upperRows.forEach((row, rIdx) => {
        let seatNum = 1;
        for (let col = 5; col <= 7; col++) {
          items.push({ seatRow: row, seatNumber: seatNum++, seatType: "VIP", gridX: col, gridY: rIdx });
        }
        for (let col = 9; col <= 13; col++) {
          items.push({ seatRow: row, seatNumber: seatNum++, seatType: "VIP", gridX: col, gridY: rIdx });
        }
      });
      let aNum = 1;
      for (let col = 1; col <= 4; col++) {
        items.push({ seatRow: "A", seatNumber: aNum++, seatType: "VIP", gridX: col, gridY: 6 });
      }
      for (let col = 5; col <= 6; col++) {
        items.push({ seatRow: "A", seatNumber: aNum++, seatType: "VIP", gridX: col, gridY: 6 });
      }
      for (let col = 9; col <= 14; col++) {
        items.push({ seatRow: "A", seatNumber: aNum++, seatType: "VIP", gridX: col, gridY: 6 });
      }
      return items;
    },
  },
  {
    id: "KIDS_HALL",
    formatKey: "KIDS_HALL",
    name: "Legend Kids Family Hall",
    subtitle: "Sen Sok / Olympia Split Corridor",
    tag: "KIDS",
    tagColor: "border-amber-500/40 text-amber-400 bg-amber-500/10",
    desc: "Front block (H-E), center corridor walkway, middle block (D-B) & 3 Back Couple beds.",
    generator: (): CustomSeatLayoutItem[] => {
      const items: CustomSeatLayoutItem[] = [];
      const topRows = ["H", "G", "F", "E"];
      topRows.forEach((row, rIdx) => {
        for (let col = 1; col <= 10; col++) {
          items.push({ seatRow: row, seatNumber: col, seatType: "REGULAR", gridX: col, gridY: rIdx });
        }
      });
      const midRows = ["D", "C", "B"];
      midRows.forEach((row, rIdx) => {
        const count = row === "D" ? 11 : 10;
        for (let col = 1; col <= count; col++) {
          items.push({ seatRow: row, seatNumber: col, seatType: "REGULAR", gridX: col, gridY: 5 + rIdx });
        }
      });
      const coupleCols = [
        { c1: 2, c2: 3, num1: 1, num2: 2 },
        { c1: 5, c2: 6, num1: 3, num2: 4 },
        { c1: 8, c2: 9, num1: 5, num2: 6 },
      ];
      coupleCols.forEach((pair) => {
        items.push({ seatRow: "A", seatNumber: pair.num1, seatType: "COUPLE", gridX: pair.c1, gridY: 9 });
        items.push({ seatRow: "A", seatNumber: pair.num2, seatType: "COUPLE", gridX: pair.c2, gridY: 9 });
      });
      return items;
    },
  },
];

const MIN_ZOOM = 0.55; // Prevent seats from becoming too small
const MAX_ZOOM = 1.35; // Maximum zoom in boundary
const ZOOM_STEP = 0.15;

export default function DynamicAuditoriumSeatsPage() {
  const [cinemas, setCinemas] = useState<CinemaResponse[]>([]);
  const [halls, setHalls] = useState<HallResponse[]>([]);
  const [selectedCinemaId, setSelectedCinemaId] = useState<number | null>(null);
  const [selectedHallId, setSelectedHallId] = useState<number | null>(null);
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null);

  const [activeLayout, setActiveLayout] = useState<CustomSeatLayoutItem[]>([]);
  const [selectedTool, setSelectedTool] = useState<SeatType | "AISLE">("REGULAR");

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Zoom and Pan states
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const initialPinchDistRef = useRef<number | null>(null);
  const initialZoomRef = useRef<number>(1);

  // Confirm Modal Dialog State
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  // Toast Notification State
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

  // Adjust default zoom on smaller screens
  useEffect(() => {
    if (typeof window !== "undefined" && window.innerWidth < 640) {
      setZoomLevel(0.75);
    }
  }, []);

  const handleZoomIn = () => {
    setZoomLevel((prev) => Math.min(MAX_ZOOM, parseFloat((prev + ZOOM_STEP).toFixed(2))));
  };

  const handleZoomOut = () => {
    setZoomLevel((prev) => Math.max(MIN_ZOOM, parseFloat((prev - ZOOM_STEP).toFixed(2))));
  };

  const handleResetZoom = () => {
    if (typeof window !== "undefined" && window.innerWidth < 640) {
      setZoomLevel(0.75);
    } else {
      setZoomLevel(1);
    }
  };

  // Touch handlers for Mobile Pinch-to-Zoom
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      initialPinchDistRef.current = dist;
      initialZoomRef.current = zoomLevel;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && initialPinchDistRef.current !== null) {
      const currentDist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const ratio = currentDist / initialPinchDistRef.current;
      const targetZoom = Math.min(
        MAX_ZOOM,
        Math.max(MIN_ZOOM, parseFloat((initialZoomRef.current * ratio).toFixed(2)))
      );
      setZoomLevel(targetZoom);
    }
  };

  const handleTouchEnd = () => {
    initialPinchDistRef.current = null;
  };

  useEffect(() => {
    async function loadCinemas() {
      try {
        const res = await CinemaService.getAllCinemas();
        const list = extractArray<CinemaResponse>(res);
        setCinemas(list);
        if (list.length > 0) setSelectedCinemaId(list[0].id);
      } catch (err) {
        showToast("Failed to load cinema branches", "error");
      }
    }
    loadCinemas();
  }, []);

  useEffect(() => {
    if (!selectedCinemaId) return;
    async function loadHalls() {
      try {
        const res = await HallService.getHallsByCinema(selectedCinemaId!);
        const list = extractArray<HallResponse>(res);
        setHalls(list);
        if (list.length > 0) {
          setSelectedHallId(list[0].id);
        } else {
          setSelectedHallId(null);
          setActiveLayout([]);
        }
      } catch (err) {
        showToast("Failed to load halls", "error");
      }
    }
    loadHalls();
  }, [selectedCinemaId]);

  const currentHall = useMemo(() => {
    return halls.find((h) => h.id === selectedHallId);
  }, [halls, selectedHallId]);

  const fetchSeats = async () => {
    if (!selectedHallId) return;
    setLoading(true);
    try {
      const res = await SeatService.getSeatsByHall(selectedHallId);
      const seats = extractArray<SeatResponse>(res);

      if (seats.length > 0) {
        const converted: CustomSeatLayoutItem[] = seats.map((s, idx) => ({
          seatRow: s.seatRow,
          seatNumber: s.seatNumber,
          seatType: s.seatType || "REGULAR",
          gridX: s.gridX !== undefined && s.gridX !== null ? s.gridX : s.seatNumber,
          gridY: s.gridY !== undefined && s.gridY !== null ? s.gridY : idx,
        }));
        setActiveLayout(converted);
      } else {
        setActiveLayout([]);
        setSelectedPresetId(null);
      }
    } catch (err) {
      showToast("Failed to load seats for this hall", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSeats();
  }, [selectedHallId]);

  const handleApplyPreset = (presetId: string) => {
    const found = LEGEND_CINEMA_PRESETS.find((p) => p.id === presetId);
    if (found) {
      setSelectedPresetId(presetId);
      setActiveLayout(found.generator());
      showToast(`Loaded ${found.name} layout template! Click 'Save to Hall' to deploy.`, "info");
    }
  };

  const handleQuickGenerateForCurrentHall = () => {
    if (!currentHall) return;
    const format = currentHall.hallType?.toUpperCase() || "";

    let matchedPresetId = "STANDARD_2D";
    if (format.includes("3D")) matchedPresetId = "STANDARD_3D";
    else if (format.includes("IMAX")) matchedPresetId = "IMAX";
    else if (format.includes("VIP")) matchedPresetId = "VIP";
    else if (format.includes("KID")) matchedPresetId = "KIDS_HALL";

    handleApplyPreset(matchedPresetId);
  };

  const reindexRowSeats = (items: CustomSeatLayoutItem[]): CustomSeatLayoutItem[] => {
    const rowGroups: Record<string, CustomSeatLayoutItem[]> = {};
    items.forEach((item) => {
      if (!rowGroups[item.seatRow]) rowGroups[item.seatRow] = [];
      rowGroups[item.seatRow].push(item);
    });

    const result: CustomSeatLayoutItem[] = [];
    Object.keys(rowGroups).forEach((rowKey) => {
      rowGroups[rowKey].sort((a, b) => a.gridX - b.gridX);
      rowGroups[rowKey].forEach((seat, index) => {
        result.push({
          ...seat,
          seatNumber: index + 1,
        });
      });
    });

    return result;
  };

  const handleCellClick = (gridX: number, gridY: number, rowLabel: string) => {
    const existingIndex = activeLayout.findIndex((s) => s.gridX === gridX && s.gridY === gridY);

    if (selectedTool === "AISLE") {
      if (existingIndex !== -1) {
        const next = activeLayout.filter((_, idx) => idx !== existingIndex);
        setActiveLayout(reindexRowSeats(next));
      }
    } else {
      if (existingIndex !== -1) {
        const next = [...activeLayout];
        next[existingIndex] = { ...next[existingIndex], seatType: selectedTool };
        setActiveLayout(next);
      } else {
        const newSeat: CustomSeatLayoutItem = {
          seatRow: rowLabel,
          seatNumber: 1,
          seatType: selectedTool,
          gridX,
          gridY,
        };
        const next = [...activeLayout, newSeat];
        setActiveLayout(reindexRowSeats(next));
      }
    }
  };

  const handleSaveLayout = async () => {
    if (!selectedHallId || activeLayout.length === 0) return;
    setSaving(true);
    try {
      const finalizedSeats = reindexRowSeats(activeLayout);

      const seatsPayload: SeatRequest[] = finalizedSeats.map((s) => ({
        hallId: selectedHallId,
        seatRow: s.seatRow,
        seatNumber: s.seatNumber,
        seatType: s.seatType,
        gridX: s.gridX,
        gridY: s.gridY,
      }));

      await SeatService.saveBatchSeats({
        hallId: selectedHallId,
        seats: seatsPayload,
      });

      showToast(`Successfully saved ${finalizedSeats.length} seats to ${currentHall?.name || "the hall"}!`, "success");

      setHalls((prev) =>
        prev.map((h) => (h.id === selectedHallId ? { ...h, totalSeats: finalizedSeats.length } : h))
      );
      fetchSeats();
    } catch (err: any) {
      showToast(err.response?.data?.status?.message || err.response?.data?.message || "Failed to save seats layout.", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmClearAll = async () => {
    if (!selectedHallId) return;
    setSaving(true);
    try {
      await SeatService.clearAllSeatsByHall(selectedHallId);

      setActiveLayout([]);
      setSelectedPresetId(null);
      setIsConfirmOpen(false);

      showToast(`All seats in ${currentHall?.name || "this hall"} have been reset to 0 seats.`, "success");

      setHalls((prev) =>
        prev.map((h) => (h.id === selectedHallId ? { ...h, totalSeats: 0 } : h))
      );
    } catch (err: any) {
      showToast(err.response?.data?.status?.message || err.response?.data?.message || "Failed to clear seats.", "error");
    } finally {
      setSaving(false);
    }
  };

  const gridRows = useMemo(() => {
    if (activeLayout.length === 0) return [];
    const minY = Math.min(...activeLayout.map((s) => s.gridY));
    const maxY = Math.max(...activeLayout.map((s) => s.gridY));

    const rows = [];
    for (let y = minY; y <= maxY; y++) {
      const seatsInRow = activeLayout.filter((s) => s.gridY === y);
      const rowLetter = seatsInRow[0]?.seatRow || "";
      rows.push({ gridY: y, rowLetter, isWalkwayRow: seatsInRow.length === 0 });
    }
    return rows;
  }, [activeLayout]);

  const maxCols = useMemo(() => {
    return Math.max(14, ...activeLayout.map((s) => s.gridX));
  }, [activeLayout]);

  const selectedCinema = cinemas.find((c) => c.id === selectedCinemaId);

  return (
    <div className="w-full max-w-7xl mx-auto space-y-4 sm:space-y-6 px-3 sm:px-6 pb-12">
      {/* Toast Alert Notification */}
      <Toast
        message={toast.message}
        type={toast.type}
        duration={3500}
        onClose={() => setToast((prev) => ({ ...prev, message: null }))}
      />

      {/* Confirm Action Dialog */}
      <ConfirmDialog
        isOpen={isConfirmOpen}
        type="HARD_DELETE"
        title="Reset & Wipe All Seats"
        targetName={`${currentHall?.name || "Selected Hall"} (All ${activeLayout.length} seats)`}
        loading={saving}
        onConfirm={handleConfirmClearAll}
        onCancel={() => setIsConfirmOpen(false)}
      />

      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-lg sm:text-2xl font-black text-white tracking-tight flex items-center gap-2.5 truncate">
            <div className="p-1.5 sm:p-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 shrink-0">
              <Armchair className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
            <span className="truncate">Legend Cinema Seat Builder</span>
          </h1>
          <p className="text-[11px] sm:text-xs text-slate-400 mt-1 line-clamp-1">
            Design theater auditoriums with custom aisles, split blocks, and twin lounges.
          </p>
        </div>

        {/* Action Buttons Toolbar */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <button
            onClick={() => {
              fetchSeats();
              showToast("Reloaded seat layout from database", "info");
            }}
            disabled={loading || !selectedHallId}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 sm:px-3.5 sm:py-2.5 text-xs font-bold text-slate-300 hover:text-white hover:bg-slate-800 transition disabled:opacity-50 cursor-pointer shadow-sm"
            title="Discard unsaved changes and reload from database"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin text-red-500" : ""}`} />
            <span>Reload</span>
          </button>

          {activeLayout.length > 0 && (
            <button
              onClick={() => setIsConfirmOpen(true)}
              disabled={saving || !selectedHallId}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 sm:px-3.5 sm:py-2.5 text-xs font-bold text-rose-400 hover:bg-rose-500 hover:text-white transition disabled:opacity-50 cursor-pointer shadow-sm"
              title="Delete all seats and reset this hall to 0 seats"
            >
              <Eraser className="h-3.5 w-3.5" />
              <span>Clear</span>
            </button>
          )}

          <button
            onClick={handleSaveLayout}
            disabled={saving || !selectedHallId || activeLayout.length === 0}
            className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-emerald-600/25 hover:from-emerald-500 hover:to-teal-500 transition disabled:opacity-50 cursor-pointer"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            <span>Save to Hall ({activeLayout.length})</span>
          </button>
        </div>
      </div>

      {/* Selectors Bar */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
        {/* Cinema Branch Card */}
        <div className="relative group p-3 sm:p-4 rounded-2xl border border-slate-800/80 bg-slate-900/60 backdrop-blur-md shadow-xl space-y-1.5 sm:space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 flex items-center gap-1.5">
              <Building2 className="h-3.5 w-3.5 text-red-500" />
              Cinema Branch
            </span>
            {selectedCinema && (
              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20">
                {selectedCinema.city}
              </span>
            )}
          </div>

          <div className="relative">
            <select
              value={selectedCinemaId || ""}
              onChange={(e) => setSelectedCinemaId(Number(e.target.value))}
              className="w-full appearance-none rounded-xl border border-slate-800 bg-slate-950/90 px-3 sm:px-4 py-2.5 sm:py-3 text-xs font-bold text-white outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition cursor-pointer pr-10 truncate"
            >
              {cinemas.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} — ({c.city})
                </option>
              ))}
            </select>
            <ChevronDown className="h-4 w-4 text-slate-500 pointer-events-none absolute right-3 top-1/2 -translate-y-1/2" />
          </div>
        </div>

        {/* Screening Hall Card */}
        <div className="relative group p-3 sm:p-4 rounded-2xl border border-slate-800/80 bg-slate-900/60 backdrop-blur-md shadow-xl space-y-1.5 sm:space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 flex items-center gap-1.5">
              <Tv className="h-3.5 w-3.5 text-cyan-400" />
              Screening Hall
            </span>
            {currentHall && (
              <span
                className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${
                  currentHall.totalSeats > 0
                    ? "border-emerald-500/30 text-emerald-400 bg-emerald-500/10"
                    : "border-amber-500/30 text-amber-400 bg-amber-500/10"
                }`}
              >
                {currentHall.totalSeats > 0 ? `${currentHall.totalSeats} seats` : "Empty (0)"}
              </span>
            )}
          </div>

          <div className="relative">
            <select
              value={selectedHallId || ""}
              onChange={(e) => setSelectedHallId(Number(e.target.value))}
              disabled={halls.length === 0}
              className="w-full appearance-none rounded-xl border border-slate-800 bg-slate-950/90 px-3 sm:px-4 py-2.5 sm:py-3 text-xs font-bold text-white outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition cursor-pointer disabled:opacity-50 pr-10 truncate"
            >
              {halls.length === 0 ? (
                <option value="">No halls available in this cinema</option>
              ) : (
                halls.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.name} • {h.hallType} ({h.totalSeats} seats)
                  </option>
                ))
              )}
            </select>
            <ChevronDown className="h-4 w-4 text-slate-500 pointer-events-none absolute right-3 top-1/2 -translate-y-1/2" />
          </div>
        </div>
      </div>

      {/* Presets Grid */}
      <div className="p-3.5 sm:p-5 rounded-2xl border border-slate-800/80 bg-slate-900/40 backdrop-blur-md space-y-3 shadow-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-amber-400 animate-pulse" />
            <span className="text-xs font-black uppercase tracking-wider text-slate-300">
              Layout Presets
            </span>
          </div>
          <span className="text-[10px] text-slate-500 font-medium hidden sm:inline-block">
            1-Click instant layout deployment
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-2.5 sm:gap-3">
          {LEGEND_CINEMA_PRESETS.map((p) => {
            const isSelected = selectedPresetId === p.id;
            return (
              <button
                key={p.id}
                onClick={() => handleApplyPreset(p.id)}
                className={`p-3 text-left rounded-xl border transition-all duration-200 cursor-pointer flex flex-col justify-between space-y-2 relative group ${
                  isSelected
                    ? "bg-slate-900 border-red-500/80 ring-2 ring-red-500/20 shadow-lg shadow-red-500/10"
                    : "bg-slate-950/70 border-slate-800 hover:border-slate-700 hover:bg-slate-900/80"
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded-md border ${p.tagColor}`}>
                    {p.tag}
                  </span>
                  <Layers
                    className={`h-3.5 w-3.5 transition ${
                      isSelected ? "text-red-400" : "text-slate-600 group-hover:text-slate-400"
                    }`}
                  />
                </div>

                <div>
                  <h4
                    className={`text-xs font-bold leading-snug transition ${
                      isSelected ? "text-white" : "text-slate-200 group-hover:text-white"
                    }`}
                  >
                    {p.name}
                  </h4>
                  <p className="text-[10px] text-slate-500 mt-1 line-clamp-2 leading-relaxed">{p.desc}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Painter Tool Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 sm:p-3.5 rounded-2xl border border-slate-800 bg-slate-900/60 shadow-lg">
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          <span className="text-xs font-bold text-slate-400 mr-1 shrink-0">Paint Tool:</span>

          <button
            onClick={() => setSelectedTool("REGULAR")}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 sm:px-3 sm:py-1.5 rounded-xl border text-[11px] sm:text-xs font-bold transition cursor-pointer ${
              selectedTool === "REGULAR"
                ? "bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-md shadow-cyan-500/20"
                : "border-slate-800 bg-slate-950 text-slate-400 hover:text-white"
            }`}
          >
            <div className="h-3 w-3 sm:h-3.5 sm:w-3.5 rounded bg-[#38bdf8]" />
            <span>Standard ($4.50)</span>
          </button>

          <button
            onClick={() => setSelectedTool("COUPLE")}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 sm:px-3 sm:py-1.5 rounded-xl border text-[11px] sm:text-xs font-bold transition cursor-pointer ${
              selectedTool === "COUPLE"
                ? "bg-purple-500/20 border-purple-400 text-purple-300 shadow-md shadow-purple-500/20"
                : "border-slate-800 bg-slate-950 text-slate-400 hover:text-white"
            }`}
          >
            <div className="flex items-center">
              <div className="h-3 w-1.5 sm:h-3.5 sm:w-2 rounded-l-md bg-[#c084fc]" />
              <div className="h-3 w-1.5 sm:h-3.5 sm:w-2 rounded-r-md bg-[#c084fc]" />
            </div>
            <span>Couple ($10)</span>
          </button>

          <button
            onClick={() => setSelectedTool("VIP")}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 sm:px-3 sm:py-1.5 rounded-xl border text-[11px] sm:text-xs font-bold transition cursor-pointer ${
              selectedTool === "VIP"
                ? "bg-pink-500/20 border-pink-400 text-pink-300 shadow-md shadow-pink-500/20"
                : "border-slate-800 bg-slate-950 text-slate-400 hover:text-white"
            }`}
          >
            <div className="h-3 w-3 sm:h-3.5 sm:w-3.5 rounded bg-[#f472b6]" />
            <span>VIP ($10.00)</span>
          </button>

          <button
            onClick={() => setSelectedTool("AISLE")}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 sm:px-3 sm:py-1.5 rounded-xl border text-[11px] sm:text-xs font-bold transition cursor-pointer ${
              selectedTool === "AISLE"
                ? "bg-rose-500/20 border-rose-400 text-rose-300 shadow-md shadow-rose-500/20"
                : "border-slate-800 bg-slate-950 text-slate-400 hover:text-white"
            }`}
          >
            <Eraser className="h-3.5 w-3.5" />
            <span>Eraser</span>
          </button>
        </div>

        <span className="text-[10px] text-slate-500 italic hidden lg:inline-block">
          * Click any cell on the grid below to paint or clear it
        </span>
      </div>

      {/* Main Canvas Presentation Viewport */}
      <div
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className="relative rounded-2xl sm:rounded-3xl border border-slate-800/80 bg-gradient-to-b from-[#18191c] via-[#131417] to-[#0f1012] p-4 sm:p-8 md:p-12 shadow-2xl space-y-6 sm:space-y-8 overflow-hidden select-none"
      >
        {/* Floating Zoom & Pan Controls Widget */}
        <div className="absolute top-4 right-4 z-30 flex items-center gap-1 bg-slate-900/90 border border-slate-700/70 backdrop-blur-md rounded-xl p-1 shadow-2xl">
          <button
            onClick={handleZoomOut}
            disabled={zoomLevel <= MIN_ZOOM}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition disabled:opacity-30 cursor-pointer"
            title="Zoom Out (Limit: 55%)"
          >
            <ZoomOut className="h-4 w-4" />
          </button>

          <span className="text-[10px] font-mono font-bold text-slate-300 px-1.5 min-w-[42px] text-center">
            {Math.round(zoomLevel * 100)}%
          </span>

          <button
            onClick={handleZoomIn}
            disabled={zoomLevel >= MAX_ZOOM}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition disabled:opacity-30 cursor-pointer"
            title="Zoom In (Limit: 135%)"
          >
            <ZoomIn className="h-4 w-4" />
          </button>

          <div className="w-[1px] h-3.5 bg-slate-700 mx-0.5" />

          <button
            onClick={handleResetZoom}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition cursor-pointer"
            title="Fit to screen"
          >
            <Maximize2 className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Ambient Projector Cone Radial Glow */}
        <div
          className="absolute inset-0 pointer-events-none opacity-20"
          style={{
            background:
              "radial-gradient(ellipse at 50% 0%, rgba(192, 132, 252, 0.25) 0%, rgba(56, 189, 248, 0.1) 45%, transparent 70%)",
          }}
        />

        <div
          className="absolute top-8 sm:top-12 left-1/2 -translate-x-1/2 w-[95%] sm:w-[92%] max-w-4xl h-[360px] sm:h-[520px] pointer-events-none opacity-15"
          style={{
            clipPath: "polygon(18% 0%, 82% 0%, 100% 100%, 0% 100%)",
            background: "linear-gradient(to bottom, rgba(255,255,255,0.45), transparent)",
          }}
        />

        {/* Curved Screen Arc */}
        <div className="relative mx-auto max-w-lg text-center space-y-2 z-10 px-4">
          <div className="relative h-10 sm:h-14 w-full flex items-center justify-center">
            <svg viewBox="0 0 400 45" className="w-full h-full overflow-visible max-w-md">
              <defs>
                <linearGradient id="legendScreenGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#38bdf8" />
                  <stop offset="50%" stopColor="#c084fc" />
                  <stop offset="100%" stopColor="#fb923c" />
                </linearGradient>
                <filter id="glow">
                  <feGaussianBlur stdDeviation="3.5" result="coloredBlur" />
                  <feMerge>
                    <feMergeNode in="coloredBlur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>
              <path
                d="M 15,38 Q 200,0 385,38"
                fill="none"
                stroke="url(#legendScreenGrad)"
                strokeWidth="3.5"
                strokeLinecap="round"
                filter="url(#glow)"
              />
            </svg>
            <span className="absolute top-4 sm:top-6 text-[9px] sm:text-[11px] font-black uppercase tracking-widest text-slate-400 drop-shadow-md">
              SCREEN
            </span>
          </div>
        </div>

        {/* Loading / Empty / Interactive Zoomable Seating Grid */}
        {loading ? (
          <div className="flex min-h-[260px] sm:min-h-[320px] items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-red-600" />
          </div>
        ) : activeLayout.length === 0 ? (
          <div className="flex flex-col items-center justify-center min-h-[240px] sm:min-h-[320px] space-y-4 text-center z-10 relative px-4">
            <div className="h-14 w-14 sm:h-16 sm:w-16 rounded-2xl bg-slate-900/90 border border-slate-800 flex items-center justify-center text-slate-600 shadow-inner">
              <Armchair className="h-7 w-7 sm:h-8 sm:w-8" />
            </div>
            <div className="space-y-1 max-w-md">
              <p className="text-xs sm:text-sm font-bold text-white">
                {currentHall?.name || "This Hall"} has no seating layout (0 seats)
              </p>
              <p className="text-[11px] sm:text-xs text-slate-400">
                Click below to auto-generate the matching layout for {currentHall?.hallType || "this hall"} or choose a preset above.
              </p>
            </div>

            <button
              onClick={handleQuickGenerateForCurrentHall}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 px-4 py-2.5 sm:px-5 sm:py-3 text-xs font-black text-white shadow-xl shadow-red-600/30 hover:from-red-500 hover:to-rose-500 transition cursor-pointer hover:scale-105 active:scale-95"
            >
              <Wand2 className="h-4 w-4" />
              <span>Generate {currentHall?.hallType || "Auditorium"} Layout</span>
            </button>
          </div>
        ) : (
          /* Scalable Responsive Canvas Container */
          <div className="w-full flex justify-center items-center overflow-auto py-2 z-10 relative">
            <div
              style={{
                transform: `scale(${zoomLevel})`,
                transformOrigin: "top center",
                transition: "transform 0.15s ease-out",
              }}
              className="min-w-max flex flex-col items-center space-y-2 px-4 py-2"
            >
              {gridRows.map(({ gridY, rowLetter, isWalkwayRow }) => {
                if (isWalkwayRow) {
                  return (
                    <div key={gridY} className="h-6 flex items-center justify-center w-full">
                      <div className="w-full border-t border-dashed border-slate-800/40" />
                    </div>
                  );
                }

                return (
                  <div key={gridY} className="flex items-center gap-3">
                    <span className="w-5 text-center font-mono text-xs font-black text-slate-500 select-none">
                      {rowLetter}
                    </span>

                    <div className="flex items-center">
                      {Array.from({ length: maxCols }, (_, idx) => idx + 1).map((colX) => {
                        const seat = activeLayout.find((s) => s.gridX === colX && s.gridY === gridY);
                        const prevSeat = activeLayout.find((s) => s.gridX === colX - 1 && s.gridY === gridY);
                        const nextSeat = activeLayout.find((s) => s.gridX === colX + 1 && s.gridY === gridY);

                        const isCouple = seat?.seatType === "COUPLE";
                        const isLeftOfCouple =
                          isCouple &&
                          nextSeat?.seatType === "COUPLE" &&
                          (seat.seatNumber % 2 !== 0 || !prevSeat || prevSeat.seatType !== "COUPLE");
                        const isRightOfCouple =
                          isCouple && prevSeat?.seatType === "COUPLE" && prevSeat.seatNumber === seat.seatNumber - 1;

                        const marginClass = isLeftOfCouple ? "mr-0" : "mr-1.5";

                        if (!seat) {
                          return (
                            <div key={colX} className={`inline-block ${marginClass}`}>
                              <button
                                onClick={() => handleCellClick(colX, gridY, rowLetter)}
                                className="h-8 w-8 rounded-lg border border-transparent hover:border-slate-800 bg-transparent transition cursor-pointer flex items-center justify-center text-[10px] text-slate-800 hover:text-slate-500"
                                title={`Empty Walkway (${rowLetter}, Col ${colX})`}
                              >
                                ·
                              </button>
                            </div>
                          );
                        }

                        if (seat.seatType === "REGULAR") {
                          return (
                            <div key={colX} className={`inline-block ${marginClass}`}>
                              <button
                                onClick={() => handleCellClick(colX, gridY, rowLetter)}
                                className="h-8 w-8 rounded-t-md rounded-b-lg bg-[#38bdf8] text-slate-950 font-black text-[10px] font-mono shadow-md shadow-sky-500/20 hover:scale-105 active:scale-95 transition cursor-pointer flex flex-col items-center justify-center"
                                title={`Seat ${seat.seatRow}${seat.seatNumber} (Standard)`}
                              >
                                <div className="w-5 h-1 bg-white/40 rounded-full mb-0.5" />
                                <span>{seat.seatNumber}</span>
                              </button>
                            </div>
                          );
                        }

                        if (isCouple) {
                          return (
                            <div key={colX} className={`inline-block ${marginClass}`}>
                              <button
                                onClick={() => handleCellClick(colX, gridY, rowLetter)}
                                className={`h-8 w-9 bg-[#c084fc] text-slate-950 font-black text-[10px] font-mono shadow-md shadow-purple-500/20 hover:brightness-110 active:scale-95 transition cursor-pointer flex flex-col items-center justify-center relative ${
                                  isLeftOfCouple
                                    ? "rounded-l-xl rounded-r-none border-r border-purple-400/40"
                                    : isRightOfCouple
                                    ? "rounded-r-xl rounded-l-none"
                                    : "rounded-xl"
                                }`}
                                title={`Seat ${seat.seatRow}${seat.seatNumber} (Couple)`}
                              >
                                <div
                                  className={`h-1 bg-white/50 mb-0.5 ${
                                    isLeftOfCouple
                                      ? "w-6 ml-auto rounded-l-full"
                                      : isRightOfCouple
                                      ? "w-6 mr-auto rounded-r-full"
                                      : "w-5 rounded-full"
                                  }`}
                                />
                                <span>{seat.seatNumber}</span>
                              </button>
                            </div>
                          );
                        }

                        return (
                          <div key={colX} className={`inline-block ${marginClass}`}>
                            <button
                              onClick={() => handleCellClick(colX, gridY, rowLetter)}
                              className="h-8 w-8 rounded-t-md rounded-b-lg bg-[#f472b6] text-slate-950 font-black text-[10px] font-mono shadow-md shadow-pink-500/20 hover:scale-105 active:scale-95 transition cursor-pointer flex flex-col items-center justify-center"
                              title={`Seat ${seat.seatRow}${seat.seatNumber} (VIP)`}
                            >
                              <div className="w-5 h-1 bg-white/40 rounded-full mb-0.5" />
                              <span>{seat.seatNumber}</span>
                            </button>
                          </div>
                        );
                      })}
                    </div>

                    <span className="w-5 text-center font-mono text-xs font-black text-slate-500 select-none">
                      {rowLetter}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Legend Status Bar */}
        <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 pt-4 sm:pt-6 border-t border-slate-800/80 text-[11px] sm:text-xs z-10 relative">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <div className="h-3.5 w-3.5 sm:h-4 sm:w-4 rounded bg-[#38bdf8]" />
            <span className="text-slate-300 font-semibold">$4.50 Standard</span>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            <div className="flex items-center">
              <div className="h-3.5 w-2.5 sm:h-4 sm:w-3 rounded-l-md bg-[#c084fc] border-r border-purple-400/40" />
              <div className="h-3.5 w-2.5 sm:h-4 sm:w-3 rounded-r-md bg-[#c084fc]" />
            </div>
            <span className="text-slate-300 font-semibold">$10.00 Couple</span>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            <div className="h-3.5 w-3.5 sm:h-4 sm:w-4 rounded bg-[#f472b6]" />
            <span className="text-slate-300 font-semibold">$10.00 VIP</span>
          </div>
        </div>
      </div>
    </div>
  );
}