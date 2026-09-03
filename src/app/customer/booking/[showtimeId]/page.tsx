"use client";

import {
  useEffect,
  useState,
  useRef,
  use,
  useMemo,
} from "react";
import { useRouter } from "next/navigation";
import {
  Loader2,
  ArrowLeft,
  ArrowRight,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Check,
  UserRound,
} from "lucide-react";

import BookingService from "@/app/service/booking.service";
import { AuthService } from "@/app/service/auth.service";
import Toast from "@/app/components/Toast";
import { useSettings } from "@/app/context/SettingsContext";

const MIN_ZOOM = 0.55;
const MAX_ZOOM = 1.35;
const ZOOM_STEP = 0.15;

export default function CustomerSeatBookingPage({
  params,
}: {
  params: Promise<{ showtimeId: string }>;
}) {
  const { showtimeId } = use(params);
  const sId = Number(showtimeId);
  const router = useRouter();

  const { theme } = useSettings();
  const isLight = theme === "light";

  const [layout, setLayout] = useState<any | null>(null);
  const [selectedSeatIds, setSelectedSeatIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const initialPinchDistRef = useRef<number | null>(null);
  const initialZoomRef = useRef<number>(1);

  const [toast, setToast] = useState<{
    message: string | null;
    type: "success" | "error" | "info";
  }>({
    message: null,
    type: "success",
  });

  const showToast = (
    message: string,
    type: "success" | "error" | "info" = "success"
  ) => {
    setToast({ message, type });
  };

  useEffect(() => {
    if (typeof window !== "undefined" && window.innerWidth < 640) {
      setZoomLevel(0.75);
    }
  }, []);

  const handleZoomIn = () => {
    setZoomLevel((prev) =>
      Math.min(
        MAX_ZOOM,
        parseFloat((prev + ZOOM_STEP).toFixed(2))
      )
    );
  };

  const handleZoomOut = () => {
    setZoomLevel((prev) =>
      Math.max(
        MIN_ZOOM,
        parseFloat((prev - ZOOM_STEP).toFixed(2))
      )
    );
  };

  const handleResetZoom = () => {
    if (
      typeof window !== "undefined" &&
      window.innerWidth < 640
    ) {
      setZoomLevel(0.75);
    } else {
      setZoomLevel(1);
    }
  };

  const handleTouchStart = (
    e: React.TouchEvent<HTMLDivElement>
  ) => {
    if (e.touches.length === 2) {
      const dist = Math.hypot(
        e.touches[0].clientX -
          e.touches[1].clientX,
        e.touches[0].clientY -
          e.touches[1].clientY
      );

      initialPinchDistRef.current = dist;
      initialZoomRef.current = zoomLevel;
    }
  };

  const handleTouchMove = (
    e: React.TouchEvent<HTMLDivElement>
  ) => {
    if (
      e.touches.length === 2 &&
      initialPinchDistRef.current !== null
    ) {
      const currentDist = Math.hypot(
        e.touches[0].clientX -
          e.touches[1].clientX,
        e.touches[0].clientY -
          e.touches[1].clientY
      );

      const ratio =
        currentDist / initialPinchDistRef.current;

      const targetZoom = Math.min(
        MAX_ZOOM,
        Math.max(
          MIN_ZOOM,
          parseFloat(
            (
              initialZoomRef.current * ratio
            ).toFixed(2)
          )
        )
      );

      setZoomLevel(targetZoom);
    }
  };

  const handleTouchEnd = () => {
    initialPinchDistRef.current = null;
  };

  useEffect(() => {
    let mounted = true;

    async function loadLayout() {
      if (!sId) {
        if (mounted) {
          setLoading(false);
          showToast("Invalid showtime.", "error");
        }
        return;
      }

      try {
        setLoading(true);

        const res =
          await BookingService.getSeatLayoutForShowtime(
            sId
          );

        if (!mounted) return;

        setLayout(res);
      } catch (error) {
        console.error(
          "Failed to load seat layout:",
          error
        );

        if (!mounted) return;

        setLayout(null);

        showToast(
          "Failed to load seat availability layout.",
          "error"
        );
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadLayout();

    return () => {
      mounted = false;
    };
  }, [sId]);

  const getX = (seat: any): number => {
    if (
      seat?.gridX !== undefined &&
      seat?.gridX !== null
    ) {
      return Number(seat.gridX);
    }

    return Number(seat?.seatNumber ?? 1);
  };

  const getY = (seat: any): number => {
    if (
      seat?.gridY !== undefined &&
      seat?.gridY !== null
    ) {
      return Number(seat.gridY);
    }

    return 0;
  };

  const { gridRows, maxCols } = useMemo(() => {
    if (
      !layout?.seats ||
      !Array.isArray(layout.seats) ||
      layout.seats.length === 0
    ) {
      return {
        gridRows: [],
        maxCols: 14,
      };
    }

    const seats = layout.seats;

    const minY = Math.min(...seats.map(getY));
    const maxY = Math.max(...seats.map(getY));

    const rows: {
      gridY: number;
      rowLetter: string;
      seats: any[];
      isWalkwayRow: boolean;
    }[] = [];

    for (let y = minY; y <= maxY; y++) {
      const seatsInRow = seats.filter(
        (seat: any) => getY(seat) === y
      );

      const rowLetter =
        seatsInRow[0]?.seatRow || "";

      rows.push({
        gridY: y,
        rowLetter,
        seats: seatsInRow,
        isWalkwayRow:
          seatsInRow.length === 0,
      });
    }

    const maxColVal = Math.max(
      14,
      ...seats.map(getX)
    );

    return {
      gridRows: rows,
      maxCols: maxColVal,
    };
  }, [layout]);

  const getSeatAtCol = (
    rowSeats: any[],
    colX: number
  ) => {
    return rowSeats.find(
      (seat: any) => getX(seat) === colX
    );
  };

  const findCouplePartner = (seat: any) => {
    if (
      !layout?.seats ||
      !Array.isArray(layout.seats) ||
      seat?.seatType !== "COUPLE"
    ) {
      return null;
    }

    const seatX = getX(seat);

    return (
      layout.seats.find(
        (otherSeat: any) =>
          otherSeat.seatId !== seat.seatId &&
          otherSeat.seatType === "COUPLE" &&
          otherSeat.seatRow === seat.seatRow &&
          getY(otherSeat) === getY(seat) &&
          Math.abs(
            getX(otherSeat) - seatX
          ) === 1
      ) || null
    );
  };

  const toggleSeat = (seat: any) => {
    if (!seat?.seatId) return;

    const isAvailable =
      seat.isAvailable !== false;

    if (!isAvailable) return;

    if (seat.seatType === "COUPLE") {
      const partner =
        findCouplePartner(seat);

      if (
        partner &&
        partner.isAvailable === false
      ) {
        return;
      }

      const idsToToggle = partner
        ? [
            seat.seatId,
            partner.seatId,
          ]
        : [seat.seatId];

      setSelectedSeatIds((prev) => {
        const allSelected =
          idsToToggle.every((id) =>
            prev.includes(id)
          );

        if (allSelected) {
          return prev.filter(
            (id) =>
              !idsToToggle.includes(id)
          );
        }

        const merged = new Set([
          ...prev,
          ...idsToToggle,
        ]);

        return Array.from(merged);
      });

      return;
    }

    setSelectedSeatIds((prev) =>
      prev.includes(seat.seatId)
        ? prev.filter(
            (id) => id !== seat.seatId
          )
        : [...prev, seat.seatId]
    );
  };

  const handleCheckout = async () => {
    if (
      selectedSeatIds.length === 0 ||
      submitting
    ) {
      return;
    }

    const token =
      typeof window !== "undefined"
        ? localStorage.getItem("token") ||
          localStorage.getItem(
            "accessToken"
          )
        : null;

    const currentUser =
      AuthService.getCurrentUser();

    if (!token && !currentUser) {
      showToast(
        "Please sign in or register to complete your ticket booking.",
        "info"
      );

      const currentPath =
        typeof window !== "undefined"
          ? window.location.pathname
          : `/customer/booking/${showtimeId}`;

      setTimeout(() => {
        router.push(
          `/login?redirect=${encodeURIComponent(
            currentPath
          )}`
        );
      }, 1200);

      return;
    }

    setSubmitting(true);

    try {
      const booking =
        await BookingService.createBooking({
          showtimeId: sId,
          seatIds: selectedSeatIds,
        });

      if (!booking?.id) {
        throw new Error(
          "Booking was created but no booking ID was returned."
        );
      }

      router.push(
        `/customer/payment/${booking.id}`
      );
    } catch (err: any) {
      console.error(
        "Failed to create booking:",
        err
      );

      const message =
        err?.response?.data?.status
          ?.message ||
        err?.response?.data?.message ||
        err?.message ||
        "Failed to create booking.";

      showToast(message, "error");
      setSubmitting(false);
    }
  };

  const calculatedTotal = layout?.seats
    ? layout.seats
        .filter((seat: any) =>
          selectedSeatIds.includes(
            seat.seatId
          )
        )
        .reduce(
          (
            sum: number,
            seat: any
          ) =>
            sum +
            Number(
              seat.calculatedPrice || 0
            ),
          0
        )
    : 0;

  const selectedSeats = layout?.seats
    ? layout.seats.filter(
        (seat: any) =>
          selectedSeatIds.includes(
            seat.seatId
          )
      )
    : [];

  const pageBg = isLight
    ? "bg-white text-slate-900"
    : "bg-slate-950 text-slate-100";

  const headerBg = isLight
    ? "bg-white/95 border-slate-200 shadow-sm"
    : "bg-slate-950/95 border-slate-800/80 shadow-xl";

  const mutedText = isLight
    ? "text-slate-500"
    : "text-slate-400";

  const primaryText = isLight
    ? "text-slate-900"
    : "text-white";

  const cardBg = isLight
    ? "bg-white border-slate-200 shadow-lg"
    : "bg-slate-900/95 border-slate-800 shadow-2xl";

  const darkCard = isLight
    ? "bg-slate-50 border-slate-200"
    : "bg-slate-950 border-slate-800";

  if (loading) {
    return (
      <div
        className={`flex min-h-screen items-center justify-center ${pageBg}`}
      >
        <Loader2 className="h-8 w-8 animate-spin text-red-600" />
      </div>
    );
  }

  return (
    <div
      className={`min-h-screen transition-colors duration-200 ${pageBg}`}
    >
      {/* Global CSS to hide the scrollbar while keeping scrolling functional */}
      <style jsx global>{`
        ::-webkit-scrollbar {
          display: none;
        }
        html, body {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>

      {/* Header - Aligned under the main navbar with matching max-w-7xl container structure */}
      <div
        className={`sticky top-16 z-40 w-full backdrop-blur-md border-b transition-colors ${headerBg}`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-8 py-3.5 flex items-center justify-between">
          {/* Back Button */}
          <button
            type="button"
            onClick={() => router.back()}
            className={`flex items-center gap-2 rounded-xl border px-3.5 py-2 text-xs font-bold backdrop-blur-md transition cursor-pointer ${
              isLight
                ? "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900 shadow-sm"
                : "border-white/10 bg-slate-900 text-slate-300 hover:border-white/20 hover:text-white"
            }`}
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Movie Details</span>
          </button>

          {/* Title */}
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-red-600 animate-pulse" />
            <h1
              className={`text-xs sm:text-sm font-black uppercase tracking-wider ${primaryText}`}
            >
              Select Your Seats
            </h1>
          </div>
        </div>
      </div>

      <div className="w-full max-w-7xl mx-auto space-y-4 sm:space-y-6 p-4 sm:p-8 pt-6 pb-24">
        <Toast
          message={toast.message}
          type={toast.type}
          duration={3500}
          onClose={() =>
            setToast((prev) => ({
              ...prev,
              message: null,
            }))
          }
        />

        {!layout ? (
          <div
            className={`rounded-3xl border p-12 text-center ${cardBg}`}
          >
            <p
              className={`text-sm font-semibold ${primaryText}`}
            >
              Seat layout unavailable
            </p>

            <p
              className={`mt-2 text-xs ${mutedText}`}
            >
              We could not load the seats for
              this showtime.
            </p>

            <button
              type="button"
              onClick={() => router.back()}
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-red-600 hover:bg-red-500 px-5 py-2.5 text-xs font-bold text-white transition cursor-pointer"
            >
              <ArrowLeft className="h-4 w-4" />
              Go Back
            </button>
          </div>
        ) : (
          <>
            {/* Seat Layout */}
            <div
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              className={`relative rounded-2xl sm:rounded-3xl border p-4 sm:p-8 md:p-12 shadow-2xl space-y-6 sm:space-y-8 overflow-hidden select-none transition-colors ${
                isLight
                  ? "border-slate-200 bg-gradient-to-b from-slate-50 via-white to-slate-50"
                  : "border-slate-800/80 bg-gradient-to-b from-[#18191c] via-[#131417] to-[#0f1012]"
              }`}
            >
              {/* Zoom Controls */}
              <div
                className={`absolute top-4 right-4 z-30 flex items-center gap-1 backdrop-blur-md rounded-xl p-1 shadow-2xl border ${
                  isLight
                    ? "bg-white/95 border-slate-200"
                    : "bg-slate-900/90 border-slate-700/70"
                }`}
              >
                <button
                  type="button"
                  onClick={handleZoomOut}
                  disabled={
                    zoomLevel <= MIN_ZOOM
                  }
                  aria-label="Zoom out"
                  className={`p-1.5 rounded-lg transition disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed ${
                    isLight
                      ? "text-slate-500 hover:text-slate-900"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  <ZoomOut className="h-4 w-4" />
                </button>

                <span
                  className={`text-[10px] font-mono font-bold px-1.5 min-w-[42px] text-center ${
                    isLight
                      ? "text-slate-700"
                      : "text-slate-300"
                  }`}
                >
                  {Math.round(
                    zoomLevel * 100
                  )}
                  %
                </span>

                <button
                  type="button"
                  onClick={handleZoomIn}
                  disabled={
                    zoomLevel >= MAX_ZOOM
                  }
                  aria-label="Zoom in"
                  className={`p-1.5 rounded-lg transition disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed ${
                    isLight
                      ? "text-slate-500 hover:text-slate-900"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  <ZoomIn className="h-4 w-4" />
                </button>

                <div
                  className={`w-[1px] h-3.5 mx-0.5 ${
                    isLight
                      ? "bg-slate-200"
                      : "bg-slate-700"
                  }`}
                />

                <button
                  type="button"
                  onClick={handleResetZoom}
                  aria-label="Reset zoom"
                  className={`p-1.5 rounded-lg transition cursor-pointer ${
                    isLight
                      ? "text-slate-500 hover:text-slate-900"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  <Maximize2 className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* Screen Light */}
              <div
                className="absolute top-12 left-1/2 -translate-x-1/2 w-3/4 h-[75%] pointer-events-none opacity-30 z-0"
                style={{
                  background:
                    "linear-gradient(to bottom, rgba(56, 189, 248, 0.35) 0%, rgba(192, 132, 252, 0.25) 40%, rgba(251, 146, 60, 0.1) 80%, transparent 100%)",
                  clipPath:
                    "polygon(25% 0%, 75% 0%, 100% 100%, 0% 100%)",
                }}
              />

              {/* Theater Screen */}
              <div className="relative mx-auto max-w-lg text-center space-y-2 z-10 px-4">
                <div className="relative h-10 sm:h-14 w-full flex items-center justify-center">
                  <svg
                    viewBox="0 0 400 45"
                    className="w-full h-full overflow-visible max-w-md"
                  >
                    <defs>
                      <linearGradient
                        id="customerScreenGrad"
                        x1="0%"
                        y1="0%"
                        x2="100%"
                        y2="0%"
                      >
                        <stop
                          offset="0%"
                          stopColor="#38bdf8"
                        />
                        <stop
                          offset="50%"
                          stopColor="#c084fc"
                        />
                        <stop
                          offset="100%"
                          stopColor="#fb923c"
                        />
                      </linearGradient>

                      <filter id="customerGlow">
                        <feGaussianBlur
                          stdDeviation="3.5"
                          result="coloredBlur"
                        />

                        <feMerge>
                          <feMergeNode in="coloredBlur" />
                          <feMergeNode in="SourceGraphic" />
                        </feMerge>
                      </filter>
                    </defs>

                    <path
                      d="M 15,38 Q 200,0 385,38"
                      fill="none"
                      stroke="url(#customerScreenGrad)"
                      strokeWidth="3.5"
                      strokeLinecap="round"
                      filter="url(#customerGlow)"
                    />
                  </svg>

                  <span
                    className={`absolute top-4 sm:top-6 text-[9px] sm:text-[11px] font-black uppercase tracking-widest drop-shadow-md ${
                      isLight
                        ? "text-slate-500"
                        : "text-slate-400"
                    }`}
                  >
                    SCREEN
                  </span>
                </div>
              </div>

              {/* Seat Map */}
              <div className="w-full flex justify-center items-center overflow-auto py-2 z-10 relative">
                <div
                  style={{
                    transform: `scale(${zoomLevel})`,
                    transformOrigin:
                      "top center",
                    transition:
                      "transform 0.15s ease-out",
                  }}
                  className="min-w-max flex flex-col items-center space-y-2 px-4 py-2"
                >
                  {gridRows.map(
                    ({
                      gridY,
                      rowLetter,
                      seats: rowSeats,
                      isWalkwayRow,
                    }) => {
                      if (isWalkwayRow) {
                        return (
                          <div
                            key={gridY}
                            className="h-6 flex items-center justify-center w-full"
                          >
                            <div
                              className={`w-full border-t border-dashed ${
                                isLight
                                  ? "border-slate-200"
                                  : "border-slate-800/40"
                              }`}
                            />
                          </div>
                        );
                      }

                      return (
                        <div
                          key={gridY}
                          className="flex items-center gap-3"
                        >
                          <span
                            className={`w-5 text-center font-mono text-xs font-black select-none ${
                              isLight
                                ? "text-slate-400"
                                : "text-slate-500"
                            }`}
                          >
                            {rowLetter}
                          </span>

                          <div className="flex items-center">
                            {Array.from(
                              {
                                length: maxCols,
                              },
                              (_, index) =>
                                index + 1
                            ).map(
                              (colX) => {
                                const seat =
                                  getSeatAtCol(
                                    rowSeats,
                                    colX
                                  );

                                const prevSeat =
                                  getSeatAtCol(
                                    rowSeats,
                                    colX - 1
                                  );

                                const nextSeat =
                                  getSeatAtCol(
                                    rowSeats,
                                    colX + 1
                                  );

                                if (!seat) {
                                  return (
                                    <div
                                      key={colX}
                                      className={`inline-block w-8 mx-1 text-center text-[10px] ${
                                        isLight
                                          ? "text-slate-200"
                                          : "text-slate-800"
                                      }`}
                                    >
                                      ·
                                    </div>
                                  );
                                }

                                const isCouple =
                                  seat.seatType ===
                                  "COUPLE";

                                const partner =
                                  isCouple
                                    ? findCouplePartner(
                                        seat
                                      )
                                    : null;

                                const rawAvailable =
                                  seat.isAvailable !==
                                  false;

                                const partnerAvailable =
                                  !partner ||
                                  partner.isAvailable !==
                                    false;

                                const isAvailable =
                                  rawAvailable &&
                                  (!isCouple ||
                                    partnerAvailable);

                                const isSelected =
                                  selectedSeatIds.includes(
                                    seat.seatId
                                  );

                                if (
                                  !isAvailable
                                ) {
                                  return (
                                    <div
                                      key={colX}
                                      className="inline-block mx-1"
                                    >
                                      <div
                                        className={`h-8 w-8 rounded-full border flex items-center justify-center cursor-not-allowed ${
                                          isLight
                                            ? "bg-slate-200 border-slate-300 text-slate-400"
                                            : "bg-slate-800/80 border-slate-700 text-slate-500"
                                        }`}
                                        title={`${seat.seatCode} - Already booked`}
                                      >
                                        <UserRound className="h-4 w-4" />
                                      </div>
                                    </div>
                                  );
                                }

                                if (
                                  isSelected
                                ) {
                                  return (
                                    <div
                                      key={colX}
                                      className="inline-block mx-1"
                                    >
                                      <button
                                        type="button"
                                        onClick={() =>
                                          toggleSeat(
                                            seat
                                          )
                                        }
                                        className="h-8 w-8 rounded-full bg-orange-500 hover:bg-orange-400 flex items-center justify-center text-white shadow-lg shadow-orange-500/40 transition cursor-pointer"
                                        title={`${seat.seatCode} - Selected`}
                                      >
                                        <Check
                                          className="h-4 w-4"
                                          strokeWidth={
                                            3
                                          }
                                        />
                                      </button>
                                    </div>
                                  );
                                }

                                const isLeftOfCouple =
                                  isCouple &&
                                  nextSeat?.seatType ===
                                    "COUPLE" &&
                                  (seat.seatNumber %
                                    2 !==
                                    0 ||
                                    !prevSeat ||
                                    prevSeat.seatType !==
                                      "COUPLE");

                                const isRightOfCouple =
                                  isCouple &&
                                  prevSeat?.seatType ===
                                    "COUPLE" &&
                                  prevSeat.seatNumber ===
                                    seat.seatNumber -
                                      1;

                                const marginClass =
                                  isLeftOfCouple
                                    ? "mx-0 mr-0 ml-1"
                                    : "mx-1";

                                let seatBg =
                                  "bg-[#f472b6] text-slate-950 shadow-pink-500/20";

                                if (
                                  seat.seatType ===
                                  "REGULAR"
                                ) {
                                  seatBg =
                                    "bg-[#38bdf8] text-slate-950 shadow-sky-500/20";
                                } else if (
                                  isCouple
                                ) {
                                  seatBg =
                                    "bg-[#c084fc] text-slate-950 shadow-purple-500/20";
                                }

                                const shapeClass =
                                  isCouple
                                    ? isLeftOfCouple
                                      ? "rounded-l-xl rounded-r-none border-r border-purple-400/40 w-9"
                                      : isRightOfCouple
                                      ? "rounded-r-xl rounded-l-none w-9"
                                      : "rounded-xl w-9"
                                    : "rounded-t-md rounded-b-lg w-8";

                                return (
                                  <div
                                    key={colX}
                                    className={`inline-block ${marginClass}`}
                                  >
                                    <button
                                      type="button"
                                      onClick={() =>
                                        toggleSeat(
                                          seat
                                        )
                                      }
                                      className={`h-8 font-black text-[10px] font-mono shadow-md transition cursor-pointer flex flex-col items-center justify-center relative ${seatBg} ${shapeClass}`}
                                      title={
                                        isCouple
                                          ? `${seat.seatCode} + partner (Couple) - $${seat.calculatedPrice} each`
                                          : `${seat.seatCode} (${seat.seatType}) - $${seat.calculatedPrice}`
                                      }
                                    >
                                      <div
                                        className={`h-1 mb-0.5 rounded-full bg-white/40 ${
                                          isCouple
                                            ? isLeftOfCouple
                                              ? "w-6 ml-auto"
                                              : isRightOfCouple
                                              ? "w-6 mr-auto"
                                              : "w-5"
                                            : "w-4"
                                        }`}
                                      />

                                      <span>
                                        {
                                          seat.seatNumber
                                        }
                                      </span>
                                    </button>
                                  </div>
                                );
                              }
                            )}
                          </div>

                          <span
                            className={`w-5 text-center font-mono text-xs font-black select-none ${
                              isLight
                                ? "text-slate-400"
                                : "text-slate-500"
                            }`}
                          >
                            {rowLetter}
                          </span>
                        </div>
                      );
                    }
                  )}
                </div>
              </div>

              {/* Legend */}
              <div
                className={`flex flex-wrap items-center justify-center gap-4 sm:gap-6 pt-4 sm:pt-6 border-t text-[11px] sm:text-xs z-10 relative ${
                  isLight
                    ? "border-slate-200"
                    : "border-slate-800/80"
                }`}
              >
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <div className="h-3.5 w-3.5 rounded bg-[#38bdf8]" />
                  <span
                    className={`font-semibold ${
                      isLight
                        ? "text-slate-600"
                        : "text-slate-300"
                    }`}
                  >
                    $4.50 Standard
                  </span>
                </div>

                <div className="flex items-center gap-1.5 sm:gap-2">
                  <div className="h-3.5 w-3.5 rounded bg-[#c084fc]" />
                  <span
                    className={`font-semibold ${
                      isLight
                        ? "text-slate-600"
                        : "text-slate-300"
                    }`}
                  >
                    $10.00 Couple (pair)
                  </span>
                </div>

                <div className="flex items-center gap-1.5 sm:gap-2">
                  <div className="h-3.5 w-3.5 rounded bg-[#f472b6]" />
                  <span
                    className={`font-semibold ${
                      isLight
                        ? "text-slate-600"
                        : "text-slate-300"
                    }`}
                  >
                    $10.00 VIP
                  </span>
                </div>

                <div className="flex items-center gap-1.5 sm:gap-2">
                  <div className="h-3.5 w-3.5 rounded-full bg-orange-500 flex items-center justify-center">
                    <Check
                      className="h-2.5 w-2.5 text-white"
                      strokeWidth={3}
                    />
                  </div>

                  <span
                    className={`font-semibold ${
                      isLight
                        ? "text-slate-600"
                        : "text-slate-300"
                    }`}
                  >
                    Selected
                  </span>
                </div>

                <div className="flex items-center gap-1.5 sm:gap-2">
                  <div
                    className={`h-3.5 w-3.5 rounded-full border flex items-center justify-center ${
                      isLight
                        ? "bg-slate-200 border-slate-300"
                        : "bg-slate-800 border-slate-700"
                    }`}
                  >
                    <UserRound
                      className={`h-2.5 w-2.5 ${
                        isLight
                          ? "text-slate-400"
                          : "text-slate-500"
                      }`}
                    />
                  </div>

                  <span
                    className={`font-semibold ${
                      isLight
                        ? "text-slate-600"
                        : "text-slate-300"
                    }`}
                  >
                    Booked
                  </span>
                </div>
              </div>
            </div>

            {/* Booking Summary */}
            <div
              className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl border shadow-2xl backdrop-blur-md ${cardBg}`}
            >
              <div>
                <p
                  className={`text-xs ${mutedText}`}
                >
                  Selected Seats (
                  {selectedSeatIds.length}):
                </p>

                <p
                  className={`font-mono font-bold text-sm mt-0.5 ${
                    isLight
                      ? "text-slate-900"
                      : "text-white"
                  }`}
                >
                  {selectedSeats.length > 0
                    ? selectedSeats
                        .map(
                          (seat: any) =>
                            seat.seatCode
                        )
                        .join(", ")
                    : "None selected"}
                </p>
              </div>

              <div className="flex items-center gap-6">
                <div className="text-left sm:text-right">
                  <p
                    className={`text-xs ${mutedText}`}
                  >
                    Total Price:
                  </p>

                  <p className="font-mono font-black text-amber-500 text-xl">
                    $
                    {calculatedTotal.toFixed(
                      2
                    )}{" "}
                    USD
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleCheckout}
                  disabled={
                    submitting ||
                    selectedSeatIds.length ===
                      0
                  }
                  className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-red-600 to-rose-600 px-7 py-4 text-xs font-bold text-white shadow-lg shadow-red-600/30 hover:from-red-500 hover:to-rose-500 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
                >
                  {submitting && (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  )}

                  <span>
                    Proceed to Payment
                  </span>

                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}