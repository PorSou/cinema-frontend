"use client";

import { useEffect, useState, useMemo } from "react";
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
import { useSettings } from "@/app/context/SettingsContext";

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
    tagColor: "border-sky-500/40 text-sky-500 dark:text-sky-400 bg-sky-500/10",
    desc: "Rows B-H standard full layout with 4 paired twin couple loungers on Row A.",
    generator: (): CustomSeatLayoutItem[] => {
      const items: CustomSeatLayoutItem[] = [];
      const rows = ["H", "G", "F", "E", "D", "C", "B"];
      rows.forEach((row, rIdx) => {
        for (let col = 1; col <= 10; col++) {
          items.push({
            seatRow: row,
            seatNumber: col,
            seatType: "REGULAR",
            gridX: col,
            gridY: rIdx,
          });
        }
      });
      const pairs = [
        [1, 2],
        [3, 4],
        [7, 8],
        [9, 10],
      ];
      let num = 1;
      pairs.forEach((p) => {
        items.push({
          seatRow: "A",
          seatNumber: num++,
          seatType: "COUPLE",
          gridX: p[0],
          gridY: 8,
        });
        items.push({
          seatRow: "A",
          seatNumber: num++,
          seatType: "COUPLE",
          gridX: p[1],
          gridY: 8,
        });
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
    tagColor:
      "border-cyan-500/40 text-cyan-500 dark:text-cyan-400 bg-cyan-500/10",
    desc: "Rows B-G with 4 seats Left + 1 Center Walkway + 4 seats Right & Back Twins.",
    generator: (): CustomSeatLayoutItem[] => {
      const items: CustomSeatLayoutItem[] = [];
      const rows = ["G", "F", "E", "D", "C", "B"];
      rows.forEach((row, rIdx) => {
        let num = 1;
        for (let col = 1; col <= 4; col++) {
          items.push({
            seatRow: row,
            seatNumber: num++,
            seatType: "REGULAR",
            gridX: col,
            gridY: rIdx,
          });
        }
        for (let col = 6; col <= 9; col++) {
          items.push({
            seatRow: row,
            seatNumber: num++,
            seatType: "REGULAR",
            gridX: col,
            gridY: rIdx,
          });
        }
      });
      items.push({
        seatRow: "A",
        seatNumber: 1,
        seatType: "COUPLE",
        gridX: 2,
        gridY: 7,
      });
      items.push({
        seatRow: "A",
        seatNumber: 2,
        seatType: "COUPLE",
        gridX: 3,
        gridY: 7,
      });
      items.push({
        seatRow: "A",
        seatNumber: 3,
        seatType: "COUPLE",
        gridX: 7,
        gridY: 7,
      });
      items.push({
        seatRow: "A",
        seatNumber: 4,
        seatType: "COUPLE",
        gridX: 8,
        gridY: 7,
      });
      return items;
    },
  },
  {
    id: "IMAX",
    formatKey: "IMAX",
    name: "IMAX Grand MegaScreen",
    subtitle: "12 Wide Rows + Dual Aisles + VIP",
    tag: "IMAX",
    tagColor:
      "border-purple-500/40 text-purple-500 dark:text-purple-400 bg-purple-500/10",
    desc: "11 rows wide screen with 2 walkway aisles, VIP mid-tier block and 5 rear couples.",
    generator: (): CustomSeatLayoutItem[] => {
      const items: CustomSeatLayoutItem[] = [];
      const rows = ["L", "K", "J", "I", "H", "G", "F", "E", "D", "C", "B"];
      rows.forEach((row, rIdx) => {
        let num = 1;
        const type: SeatType = ["F", "E", "D"].includes(row)
          ? "VIP"
          : "REGULAR";
        for (let col = 1; col <= 3; col++) {
          items.push({
            seatRow: row,
            seatNumber: num++,
            seatType: type,
            gridX: col,
            gridY: rIdx,
          });
        }
        for (let col = 5; col <= 10; col++) {
          items.push({
            seatRow: row,
            seatNumber: num++,
            seatType: type,
            gridX: col,
            gridY: rIdx,
          });
        }
        for (let col = 12; col <= 14; col++) {
          items.push({
            seatRow: row,
            seatNumber: num++,
            seatType: type,
            gridX: col,
            gridY: rIdx,
          });
        }
      });
      const couplePairs = [
        [2, 3],
        [5, 6],
        [7, 8],
        [9, 10],
        [12, 13],
      ];
      let cNum = 1;
      couplePairs.forEach((pair) => {
        items.push({
          seatRow: "A",
          seatNumber: cNum++,
          seatType: "COUPLE",
          gridX: pair[0],
          gridY: 12,
        });
        items.push({
          seatRow: "A",
          seatNumber: cNum++,
          seatType: "COUPLE",
          gridX: pair[1],
          gridY: 12,
        });
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
    tagColor:
      "border-pink-500/40 text-pink-500 dark:text-pink-400 bg-pink-500/10",
    desc: "All Premium VIP Recliners with 1 central aisle and extended left wing on Row A.",
    generator: (): CustomSeatLayoutItem[] => {
      const items: CustomSeatLayoutItem[] = [];
      const upperRows = ["G", "F", "E", "D", "C", "B"];
      upperRows.forEach((row, rIdx) => {
        let seatNum = 1;
        for (let col = 5; col <= 7; col++) {
          items.push({
            seatRow: row,
            seatNumber: seatNum++,
            seatType: "VIP",
            gridX: col,
            gridY: rIdx,
          });
        }
        for (let col = 9; col <= 13; col++) {
          items.push({
            seatRow: row,
            seatNumber: seatNum++,
            seatType: "VIP",
            gridX: col,
            gridY: rIdx,
          });
        }
      });
      let aNum = 1;
      for (let col = 1; col <= 4; col++) {
        items.push({
          seatRow: "A",
          seatNumber: aNum++,
          seatType: "VIP",
          gridX: col,
          gridY: 6,
        });
      }
      for (let col = 5; col <= 6; col++) {
        items.push({
          seatRow: "A",
          seatNumber: aNum++,
          seatType: "VIP",
          gridX: col,
          gridY: 6,
        });
      }
      for (let col = 9; col <= 14; col++) {
        items.push({
          seatRow: "A",
          seatNumber: aNum++,
          seatType: "VIP",
          gridX: col,
          gridY: 6,
        });
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
    tagColor:
      "border-amber-500/40 text-amber-500 dark:text-amber-400 bg-amber-500/10",
    desc: "Front block (H-E), center corridor walkway, middle block (D-B) & 3 Back Couple beds.",
    generator: (): CustomSeatLayoutItem[] => {
      const items: CustomSeatLayoutItem[] = [];
      const topRows = ["H", "G", "F", "E"];
      topRows.forEach((row, rIdx) => {
        for (let col = 1; col <= 10; col++) {
          items.push({
            seatRow: row,
            seatNumber: col,
            seatType: "REGULAR",
            gridX: col,
            gridY: rIdx,
          });
        }
      });
      const midRows = ["D", "C", "B"];
      midRows.forEach((row, rIdx) => {
        const count = row === "D" ? 11 : 10;
        for (let col = 1; col <= count; col++) {
          items.push({
            seatRow: row,
            seatNumber: col,
            seatType: "REGULAR",
            gridX: col,
            gridY: 5 + rIdx,
          });
        }
      });
      const coupleCols = [
        { c1: 2, c2: 3, num1: 1, num2: 2 },
        { c1: 5, c2: 6, num1: 3, num2: 4 },
        { c1: 8, c2: 9, num1: 5, num2: 6 },
      ];
      coupleCols.forEach((pair) => {
        items.push({
          seatRow: "A",
          seatNumber: pair.num1,
          seatType: "COUPLE",
          gridX: pair.c1,
          gridY: 9,
        });
        items.push({
          seatRow: "A",
          seatNumber: pair.num2,
          seatType: "COUPLE",
          gridX: pair.c2,
          gridY: 9,
        });
      });
      return items;
    },
  },
];

export default function DynamicAuditoriumSeatsPage() {
  const { theme } = useSettings();
  const isLight = theme === "light";

  const [cinemas, setCinemas] = useState<CinemaResponse[]>([]);
  const [halls, setHalls] = useState<HallResponse[]>([]);
  const [selectedCinemaId, setSelectedCinemaId] = useState<number | null>(null);
  const [selectedHallId, setSelectedHallId] = useState<number | null>(null);
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null);

  const [activeLayout, setActiveLayout] = useState<CustomSeatLayoutItem[]>([]);
  const [selectedTool, setSelectedTool] = useState<SeatType | "AISLE">(
    "REGULAR",
  );

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
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
          gridX:
            s.gridX !== undefined && s.gridX !== null ? s.gridX : s.seatNumber,
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
      showToast(
        `Loaded ${found.name} layout template! Click 'Save to Hall' to deploy.`,
        "info",
      );
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

  const reindexRowSeats = (
    items: CustomSeatLayoutItem[],
  ): CustomSeatLayoutItem[] => {
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
    const existingIndex = activeLayout.findIndex(
      (s) => s.gridX === gridX && s.gridY === gridY,
    );

    if (selectedTool === "AISLE") {
      if (existingIndex !== -1) {
        const next = activeLayout.filter((_, idx) => idx !== existingIndex);
        setActiveLayout(reindexRowSeats(next));
      }
    } else {
      if (existingIndex !== -1) {
        const next = [...activeLayout];
        next[existingIndex] = {
          ...next[existingIndex],
          seatType: selectedTool,
        };
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

      showToast(
        `Successfully saved ${finalizedSeats.length} seats to ${currentHall?.name || "the hall"}!`,
        "success",
      );

      setHalls((prev) =>
        prev.map((h) =>
          h.id === selectedHallId
            ? { ...h, totalSeats: finalizedSeats.length }
            : h,
        ),
      );
      fetchSeats();
    } catch (err: any) {
      showToast(
        err.response?.data?.status?.message ||
          err.response?.data?.message ||
          "Failed to save seats layout.",
        "error",
      );
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

      showToast(
        `All seats in ${currentHall?.name || "this hall"} have been reset to 0 seats.`,
        "success",
      );

      setHalls((prev) =>
        prev.map((h) =>
          h.id === selectedHallId ? { ...h, totalSeats: 0 } : h,
        ),
      );
    } catch (err: any) {
      showToast(
        err.response?.data?.status?.message ||
          err.response?.data?.message ||
          "Failed to clear seats.",
        "error",
      );
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
    return Math.max(12, ...activeLayout.map((s) => s.gridX));
  }, [activeLayout]);

  const selectedCinema = cinemas.find((c) => c.id === selectedCinemaId);

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
      <div
        className={`flex flex-col md:flex-row md:items-center justify-between gap-4 border-b ${borderCol} pb-5`}
      >
        <div className="min-w-0">
          <h1
            className={`text-lg sm:text-2xl font-black ${textPrimary} tracking-tight flex items-center gap-2.5 truncate`}
          >
            <div className="p-1.5 sm:p-2 rounded-xl bg-red-500/10 border border-red-500/30 text-red-600 shrink-0">
              <Armchair className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
            <span className="truncate">Legend Cinema Seat Builder</span>
          </h1>
          <p
            className={`text-[11px] sm:text-xs ${textSecondary} mt-1 line-clamp-1`}
          >
            Design theater auditoriums with custom aisles, split blocks, and
            twin lounges.
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
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 rounded-xl border ${isLight ? "border-slate-300 bg-white text-slate-800 hover:bg-slate-100 shadow-sm font-bold" : "border-slate-800 bg-slate-900 text-slate-300 hover:text-white hover:bg-slate-800"} px-3 py-2 sm:px-3.5 sm:py-2.5 text-xs transition disabled:opacity-50 cursor-pointer`}
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${loading ? "animate-spin text-red-600" : ""}`}
            />
            <span>Reload</span>
          </button>

          {activeLayout.length > 0 && (
            <button
              onClick={() => setIsConfirmOpen(true)}
              disabled={saving || !selectedHallId}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 sm:px-3.5 sm:py-2.5 text-xs font-bold text-rose-500 hover:bg-rose-500 hover:text-white transition disabled:opacity-50 cursor-pointer shadow-sm"
            >
              <Eraser className="h-3.5 w-3.5" />
              <span>Clear</span>
            </button>
          )}

          <button
            onClick={handleSaveLayout}
            disabled={saving || !selectedHallId || activeLayout.length === 0}
            className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-red-600/25 hover:from-red-500 hover:to-rose-500 transition disabled:opacity-50 cursor-pointer"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            <span>Save to Hall ({activeLayout.length})</span>
          </button>
        </div>
      </div>

      {/* Selectors Bar */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
        {/* Cinema Branch Card */}
        <div
          className={`relative group p-3 sm:p-4 rounded-2xl border ${cardClass} backdrop-blur-md shadow-xl space-y-1.5 sm:space-y-2`}
        >
          <div className="flex items-center justify-between">
            <span
              className={`text-xs font-bold ${textSecondary} flex items-center gap-1.5`}
            >
              <Building2 className="h-3.5 w-3.5 text-red-600" />
              Cinema Branch
            </span>
            {selectedCinema && (
              <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-red-500/15 text-red-700 dark:text-red-400 border border-red-500/30">
                {selectedCinema.city}
              </span>
            )}
          </div>

          <div className="relative">
            <select
              value={selectedCinemaId || ""}
              onChange={(e) => setSelectedCinemaId(Number(e.target.value))}
              className={`w-full appearance-none rounded-xl border ${inputClass} px-3 sm:px-4 py-2.5 sm:py-3 text-xs font-bold outline-none focus:ring-1 focus:ring-red-500 transition cursor-pointer pr-10 truncate`}
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
        <div
          className={`relative group p-3 sm:p-4 rounded-2xl border ${cardClass} backdrop-blur-md shadow-xl space-y-1.5 sm:space-y-2`}
        >
          <div className="flex items-center justify-between">
            <span
              className={`text-xs font-bold ${textSecondary} flex items-center gap-1.5`}
            >
              <Tv className="h-3.5 w-3.5 text-cyan-600 dark:text-cyan-400" />
              Screening Hall
            </span>
            {currentHall && (
              <span
                className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${
                  currentHall.totalSeats > 0
                    ? "border-emerald-500/30 text-emerald-700 dark:text-emerald-400 bg-emerald-500/15"
                    : "border-amber-500/30 text-amber-700 dark:text-amber-400 bg-amber-500/15"
                }`}
              >
                {currentHall.totalSeats > 0
                  ? `${currentHall.totalSeats} seats`
                  : "Empty (0)"}
              </span>
            )}
          </div>

          <div className="relative">
            <select
              value={selectedHallId || ""}
              onChange={(e) => setSelectedHallId(Number(e.target.value))}
              disabled={halls.length === 0}
              className={`w-full appearance-none rounded-xl border ${inputClass} px-3 sm:px-4 py-2.5 sm:py-3 text-xs font-bold outline-none focus:ring-1 focus:ring-cyan-500 transition cursor-pointer disabled:opacity-50 pr-10 truncate`}
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
      <div
        className={`p-3.5 sm:p-5 rounded-2xl border ${cardClass} backdrop-blur-md space-y-3 shadow-xl`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-amber-500 animate-pulse" />
            <span
              className={`text-xs font-black uppercase tracking-wider ${textPrimary}`}
            >
              Layout Presets
            </span>
          </div>
          <span
            className={`text-[10px] ${textSecondary} font-semibold hidden sm:inline-block`}
          >
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
                    ? `${isLight ? "bg-white border-red-600 ring-2 ring-red-600/20 shadow-md" : "bg-slate-900 border-red-500/80 ring-2 ring-red-500/20 shadow-lg shadow-red-500/10"}`
                    : `${isLight ? "bg-white border-slate-300 hover:border-slate-400 hover:bg-slate-50 shadow-sm" : "bg-slate-950/70 border-slate-800 hover:border-slate-700 hover:bg-slate-900/80"}`
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span
                    className={`text-[10px] font-black px-2 py-0.5 rounded-md border ${p.tagColor}`}
                  >
                    {p.tag}
                  </span>
                  <Layers
                    className={`h-3.5 w-3.5 transition ${
                      isSelected
                        ? "text-red-600"
                        : `${textMuted} group-hover:${textSecondary}`
                    }`}
                  />
                </div>

                <div>
                  <h4
                    className={`text-xs font-black leading-snug transition ${
                      isSelected
                        ? textPrimary
                        : `${textSecondary} group-hover:${textPrimary}`
                    }`}
                  >
                    {p.name}
                  </h4>
                  <p
                    className={`text-[10px] ${textSecondary} mt-1 line-clamp-2 leading-relaxed`}
                  >
                    {p.desc}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Painter Tool Selector */}
      <div
        className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 sm:p-3.5 rounded-2xl border ${cardClass} shadow-lg`}
      >
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          <span className={`text-xs font-black ${textSecondary} mr-1 shrink-0`}>
            Paint Tool:
          </span>

          <button
            onClick={() => setSelectedTool("REGULAR")}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 sm:px-3 sm:py-1.5 rounded-xl border text-[11px] sm:text-xs font-black transition cursor-pointer ${
              selectedTool === "REGULAR"
                ? "bg-sky-500/20 border-sky-500 text-sky-600 dark:text-sky-400 shadow-md shadow-sky-500/20"
                : `${isLight ? "border-slate-300 bg-white text-slate-800 hover:bg-slate-100 shadow-sm" : "border-slate-800 bg-slate-950 text-slate-400 hover:text-white"}`
            }`}
          >
            <div className="h-3 w-3 sm:h-3.5 sm:w-3.5 rounded bg-[#38bdf8]" />
            <span>Standard ($4.50)</span>
          </button>

          <button
            onClick={() => setSelectedTool("COUPLE")}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 sm:px-3 sm:py-1.5 rounded-xl border text-[11px] sm:text-xs font-black transition cursor-pointer ${
              selectedTool === "COUPLE"
                ? "bg-purple-500/20 border-purple-500 text-purple-600 dark:text-purple-400 shadow-md shadow-purple-500/20"
                : `${isLight ? "border-slate-300 bg-white text-slate-800 hover:bg-slate-100 shadow-sm" : "border-slate-800 bg-slate-950 text-slate-400 hover:text-white"}`
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
            className={`flex items-center gap-1.5 px-2.5 py-1.5 sm:px-3 sm:py-1.5 rounded-xl border text-[11px] sm:text-xs font-black transition cursor-pointer ${
              selectedTool === "VIP"
                ? "bg-pink-500/20 border-pink-500 text-pink-600 dark:text-pink-400 shadow-md shadow-pink-500/20"
                : `${isLight ? "border-slate-300 bg-white text-slate-800 hover:bg-slate-100 shadow-sm" : "border-slate-800 bg-slate-950 text-slate-400 hover:text-white"}`
            }`}
          >
            <div className="h-3 w-3 sm:h-3.5 sm:w-3.5 rounded bg-[#f472b6]" />
            <span>VIP ($10.00)</span>
          </button>

          <button
            onClick={() => setSelectedTool("AISLE")}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 sm:px-3 sm:py-1.5 rounded-xl border text-[11px] sm:text-xs font-black transition cursor-pointer ${
              selectedTool === "AISLE"
                ? "bg-rose-500/20 border-rose-500 text-rose-600 dark:text-rose-400 shadow-md shadow-rose-500/20"
                : `${isLight ? "border-slate-300 bg-white text-slate-800 hover:bg-slate-100 shadow-sm" : "border-slate-800 bg-slate-950 text-slate-400 hover:text-white"}`
            }`}
          >
            <Eraser className="h-3.5 w-3.5" />
            <span>Eraser</span>
          </button>
        </div>

        <span
          className={`text-[10px] ${textSecondary} italic hidden lg:inline-block`}
        >
          * Click any cell on the grid below to paint or clear it
        </span>
      </div>

      {/* Main Canvas Presentation Viewport */}
      <div
        className={`relative rounded-2xl sm:rounded-3xl border ${borderCol} ${isLight ? "bg-white shadow-xl ring-1 ring-slate-200" : "bg-gradient-to-b from-[#18191c] via-[#131417] to-[#0f1012] shadow-2xl"} p-3 sm:p-8 md:p-12 space-y-6 sm:space-y-8 overflow-hidden select-none`}
      >
        {/* Ambient Projector Cone Radial Glow */}
        <div
          className="absolute inset-0 pointer-events-none opacity-20"
          style={{
            background: isLight
              ? "radial-gradient(ellipse at 50% 0%, rgba(192, 132, 252, 0.1) 0%, rgba(56, 189, 248, 0.03) 45%, transparent 70%)"
              : "radial-gradient(ellipse at 50% 0%, rgba(192, 132, 252, 0.25) 0%, rgba(56, 189, 248, 0.1) 45%, transparent 70%)",
          }}
        />

        {/* Curved Screen Arc */}
        <div className="relative mx-auto max-w-lg text-center space-y-2 z-10 px-4">
          <div className="relative h-10 sm:h-14 w-full flex items-center justify-center">
            <svg
              viewBox="0 0 400 45"
              className="w-full h-full overflow-visible max-w-md"
            >
              <defs>
                <linearGradient
                  id="legendScreenGrad"
                  x1="0%"
                  y1="0%"
                  x2="100%"
                  y2="0%"
                >
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
            <span
              className={`absolute top-4 sm:top-6 text-[9px] sm:text-[11px] font-black uppercase tracking-widest ${textSecondary} drop-shadow-md`}
            >
              SCREEN
            </span>
          </div>
        </div>

        {/* Loading / Empty / Responsive CSS Grid Container */}
        {loading ? (
          <div className="flex min-h-[260px] sm:min-h-[320px] items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-red-600" />
          </div>
        ) : activeLayout.length === 0 ? (
          <div className="flex flex-col items-center justify-center min-h-[240px] sm:min-h-[320px] space-y-4 text-center z-10 relative px-4">
            <div
              className={`h-14 w-14 sm:h-16 sm:w-16 rounded-2xl ${isLight ? "bg-slate-100 border-slate-300 text-slate-400 shadow-sm" : "bg-slate-900/90 border-slate-800 text-slate-600 shadow-inner"} border flex items-center justify-center`}
            >
              <Armchair className="h-7 w-7 sm:h-8 sm:w-8" />
            </div>
            <div className="space-y-1 max-w-md">
              <p className={`text-xs sm:text-sm font-black ${textPrimary}`}>
                {currentHall?.name || "This Hall"} has no seating layout (0
                seats)
              </p>
              <p className={`text-[11px] sm:text-xs ${textSecondary}`}>
                Click below to auto-generate the matching layout for{" "}
                {currentHall?.hallType || "this hall"} or choose a preset above.
              </p>
            </div>

            <button
              onClick={handleQuickGenerateForCurrentHall}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 px-4 py-2.5 sm:px-5 sm:py-3 text-xs font-black text-white shadow-xl shadow-red-600/30 hover:from-red-500 hover:to-rose-500 transition cursor-pointer hover:scale-105 active:scale-95"
            >
              <Wand2 className="h-4 w-4" />
              <span>
                Generate {currentHall?.hallType || "Auditorium"} Layout
              </span>
            </button>
          </div>
        ) : (
          <div className="w-full overflow-x-auto z-10 relative py-2">
            <div className="w-full min-w-[320px] max-w-2xl mx-auto flex flex-col space-y-1.5 sm:space-y-2 px-1">
              {gridRows.map(({ gridY, rowLetter, isWalkwayRow }) => {
                if (isWalkwayRow) {
                  return (
                    <div
                      key={gridY}
                      className="h-4 sm:h-6 flex items-center justify-center w-full"
                    >
                      <div
                        className={`w-full border-t border-dashed ${isLight ? "border-slate-300" : "border-slate-800/40"}`}
                      />
                    </div>
                  );
                }

                return (
                  <div
                    key={gridY}
                    className="flex items-center gap-1 sm:gap-2 w-full"
                  >
                    {/* Left Row Label */}
                    <span className="w-4 sm:w-6 text-center font-mono text-[10px] sm:text-xs font-black text-slate-500 select-none shrink-0">
                      {rowLetter}
                    </span>

                    {/* Fluid Grid Track */}
                    <div
                      className="flex-1 grid gap-1 items-center"
                      style={{
                        gridTemplateColumns: `repeat(${maxCols}, minmax(0, 1fr))`,
                      }}
                    >
                      {Array.from({ length: maxCols }, (_, idx) => idx + 1).map(
                        (colX) => {
                          const seat = activeLayout.find(
                            (s) => s.gridX === colX && s.gridY === gridY,
                          );
                          const prevSeat = activeLayout.find(
                            (s) => s.gridX === colX - 1 && s.gridY === gridY,
                          );
                          const nextSeat = activeLayout.find(
                            (s) => s.gridX === colX + 1 && s.gridY === gridY,
                          );

                          const isCouple = seat?.seatType === "COUPLE";
                          const isLeftOfCouple =
                            isCouple &&
                            nextSeat?.seatType === "COUPLE" &&
                            (seat.seatNumber % 2 !== 0 ||
                              !prevSeat ||
                              prevSeat.seatType !== "COUPLE");
                          const isRightOfCouple =
                            isCouple &&
                            prevSeat?.seatType === "COUPLE" &&
                            prevSeat.seatNumber === seat.seatNumber - 1;

                          if (!seat) {
                            return (
                              <button
                                key={colX}
                                onClick={() =>
                                  handleCellClick(colX, gridY, rowLetter)
                                }
                                className={`aspect-square w-full rounded border border-transparent ${isLight ? "hover:border-slate-300 text-slate-400 hover:text-slate-600 font-bold" : "hover:border-slate-800 text-slate-800 hover:text-slate-500"} bg-transparent transition cursor-pointer flex items-center justify-center text-[8px] sm:text-[10px]`}
                                title={`Empty Walkway (${rowLetter}, Col ${colX})`}
                              >
                                ·
                              </button>
                            );
                          }

                          if (seat.seatType === "REGULAR") {
                            return (
                              <button
                                key={colX}
                                onClick={() =>
                                  handleCellClick(colX, gridY, rowLetter)
                                }
                                className="aspect-square w-full rounded-t-sm rounded-b-md bg-[#38bdf8] text-slate-950 font-black text-[8px] sm:text-[10px] font-mono shadow-sm shadow-sky-500/20 hover:scale-105 active:scale-95 transition cursor-pointer flex flex-col items-center justify-center"
                                title={`Seat ${seat.seatRow}${seat.seatNumber} (Standard)`}
                              >
                                <div className="w-3 sm:w-4 h-0.5 bg-white/40 rounded-full mb-0.5" />
                                <span className="leading-none scale-90 sm:scale-100">
                                  {seat.seatNumber}
                                </span>
                              </button>
                            );
                          }

                          if (isCouple) {
                            return (
                              <button
                                key={colX}
                                onClick={() =>
                                  handleCellClick(colX, gridY, rowLetter)
                                }
                                className={`aspect-square w-full bg-[#c084fc] text-slate-950 font-black text-[8px] sm:text-[10px] font-mono shadow-sm shadow-purple-500/20 hover:brightness-110 active:scale-95 transition cursor-pointer flex flex-col items-center justify-center relative ${
                                  isLeftOfCouple
                                    ? "rounded-l-lg rounded-r-none border-r border-purple-400/30"
                                    : isRightOfCouple
                                      ? "rounded-r-lg rounded-l-none"
                                      : "rounded-md"
                                }`}
                                title={`Seat ${seat.seatRow}${seat.seatNumber} (Couple)`}
                              >
                                <div className="h-0.5 w-3 sm:w-4 bg-white/50 rounded-full mb-0.5" />
                                <span className="leading-none scale-90 sm:scale-100">
                                  {seat.seatNumber}
                                </span>
                              </button>
                            );
                          }

                          return (
                            <button
                              key={colX}
                              onClick={() =>
                                handleCellClick(colX, gridY, rowLetter)
                              }
                              className="aspect-square w-full rounded-t-sm rounded-b-md bg-[#f472b6] text-slate-950 font-black text-[8px] sm:text-[10px] font-mono shadow-sm shadow-pink-500/20 hover:scale-105 active:scale-95 transition cursor-pointer flex flex-col items-center justify-center"
                              title={`Seat ${seat.seatRow}${seat.seatNumber} (VIP)`}
                            >
                              <div className="w-3 sm:w-4 h-0.5 bg-white/40 rounded-full mb-0.5" />
                              <span className="leading-none scale-90 sm:scale-100">
                                {seat.seatNumber}
                              </span>
                            </button>
                          );
                        },
                      )}
                    </div>

                    {/* Right Row Label */}
                    <span className="w-4 sm:w-6 text-center font-mono text-[10px] sm:text-xs font-black text-slate-500 select-none shrink-0">
                      {rowLetter}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Legend Status Bar */}
        <div
          className={`flex flex-wrap items-center justify-center gap-4 sm:gap-6 pt-4 sm:pt-6 border-t ${borderCol} text-[11px] sm:text-xs z-10 relative`}
        >
          <div className="flex items-center gap-1.5 sm:gap-2">
            <div className="h-3.5 w-3.5 sm:h-4 sm:w-4 rounded bg-[#38bdf8]" />
            <span className={`${textPrimary} font-bold`}>$4.50 Standard</span>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            <div className="flex items-center">
              <div className="h-3.5 w-2.5 sm:h-4 sm:w-3 rounded-l-md bg-[#c084fc] border-r border-purple-400/40" />
              <div className="h-3.5 w-2.5 sm:h-4 sm:w-3 rounded-r-md bg-[#c084fc]" />
            </div>
            <span className={`${textPrimary} font-bold`}>$10.00 Couple</span>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            <div className="h-3.5 w-3.5 sm:h-4 sm:w-4 rounded bg-[#f472b6]" />
            <span className={`${textPrimary} font-bold`}>$10.00 VIP</span>
          </div>
        </div>
      </div>
    </div>
  );
}
