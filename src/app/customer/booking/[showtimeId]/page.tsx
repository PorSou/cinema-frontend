"use client";

import { useEffect, useState, useRef, use, useMemo, useCallback } from "react";
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
  X,
  Clock3,
  CheckCircle2,
  Clapperboard,
  MapPin,
  Coffee,
  Plus,
  Minus,
  Armchair,
  Ticket,
  CheckCircle,
  Banknote,
  QrCode,
} from "lucide-react";

import BookingService from "@/app/service/booking.service";
import { PaymentService } from "@/app/service/payment.service";
import { AuthService } from "@/app/service/auth.service";
import ShowtimeService from "@/app/service/showtime.service";
import ConcessionService, {
  ConcessionItemResponse,
} from "@/app/service/concession.service";
import { VoucherService } from "@/app/service/voucher.service";
import Toast from "@/app/components/Toast";
import { useSettings } from "@/app/context/SettingsContext";

const MIN_ZOOM = 0.55;
const MAX_ZOOM = 1.35;
const ZOOM_STEP = 0.15;
const CONFIRM_COUNTDOWN_SECONDS = 5 * 60;

const API_ORIGIN = (
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api/v1"
).replace(/\/api\/v1\/?$/, "");

const resolvePosterUrl = (path?: string | null) => {
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;
  return `${API_ORIGIN}/${path.replace(/^\/+/, "")}`;
};

const extractArray = <T,>(res: any): T[] => {
  if (Array.isArray(res)) return res;
  if (Array.isArray(res?.content)) return res.content;
  if (Array.isArray(res?.data)) return res.data;
  if (Array.isArray(res?.body?.data)) return res.body.data;
  if (Array.isArray(res?.data?.content)) return res.data.content;
  return [];
};

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
  const isDark = theme === "dark";

  const [layout, setLayout] = useState<any | null>(null);
  const [selectedSeatIds, setSelectedSeatIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // F&B Add-on States & Steps (1: Seats, 2: F&B)
  const [concessionItems, setConcessionItems] = useState<
    ConcessionItemResponse[]
  >([]);
  const [selectedFAndB, setSelectedFAndB] = useState<Record<number, number>>(
    {},
  );
  const [activeStep, setActiveStep] = useState<1 | 2>(1);

  const [showtimeInfo, setShowtimeInfo] = useState<any | null>(null);

  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const initialPinchDistRef = useRef<number | null>(null);
  const initialZoomRef = useRef<number>(1);

  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [modalView, setModalView] = useState<
    "review" | "processing" | "success"
  >("review");
  const [confirmedBookingRef, setConfirmedBookingRef] = useState<
    string | number | null
  >(null);
  const [countdown, setCountdown] = useState(CONFIRM_COUNTDOWN_SECONDS);
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(
    null,
  );

  // 👇 NEW — Payment method switch: Cash at counter or KHQR (Bakong)
  const [paymentMethod, setPaymentMethod] = useState<"CASH" | "KHQR">("CASH");

  // Voucher states for checkout modal
  const [promoCode, setPromoCode] = useState("");
  const [applyingVoucher, setApplyingVoucher] = useState(false);
  const [appliedVoucher, setAppliedVoucher] = useState<{
    code: string;
    discountAmount: number;
    finalTotal: number;
  } | null>(null);
  const [voucherError, setVoucherError] = useState<string | null>(null);

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
    if (typeof window !== "undefined" && window.innerWidth < 640) {
      setZoomLevel(0.85);
    }
  }, []);

  useEffect(() => {
    if (!sId) return;
    let cancelled = false;

    (async () => {
      try {
        const [showtimeRes, concessionRes] = await Promise.all([
          ShowtimeService.getShowtimeById(sId),
          ConcessionService.getAllAdminItems(0, 100).catch(() => []),
        ]);
        if (!cancelled) {
          setShowtimeInfo(showtimeRes);
          const allItems = extractArray<ConcessionItemResponse>(concessionRes);
          setConcessionItems(allItems.filter((i) => i.active));
        }
      } catch (error) {
        console.error("Failed to load showtime info or F&B items:", error);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [sId]);

  const handleZoomIn = () =>
    setZoomLevel((prev) =>
      Math.min(MAX_ZOOM, parseFloat((prev + ZOOM_STEP).toFixed(2))),
    );
  const handleZoomOut = () =>
    setZoomLevel((prev) =>
      Math.max(MIN_ZOOM, parseFloat((prev - ZOOM_STEP).toFixed(2))),
    );
  const handleResetZoom = () =>
    setZoomLevel(
      typeof window !== "undefined" && window.innerWidth < 640 ? 0.85 : 1,
    );

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 2) {
      initialPinchDistRef.current = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY,
      );
      initialZoomRef.current = zoomLevel;
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 2 && initialPinchDistRef.current !== null) {
      const currentDist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY,
      );
      const ratio = currentDist / initialPinchDistRef.current;
      setZoomLevel(
        Math.min(
          MAX_ZOOM,
          Math.max(
            MIN_ZOOM,
            parseFloat((initialZoomRef.current * ratio).toFixed(2)),
          ),
        ),
      );
    }
  };

  const handleTouchEnd = () => {
    initialPinchDistRef.current = null;
  };

  const loadLayout = useCallback(
    async (showLoadingSpinner = true) => {
      if (!sId) {
        setLoading(false);
        showToast("Invalid showtime.", "error");
        return;
      }
      try {
        if (showLoadingSpinner) setLoading(true);
        const res = await BookingService.getSeatLayoutForShowtime(sId);
        setLayout(res);
      } catch (error) {
        console.error("Failed to load seat layout:", error);
        setLayout(null);
        showToast("Failed to load seat availability layout.", "error");
      } finally {
        if (showLoadingSpinner) setLoading(false);
      }
    },
    [sId],
  );

  useEffect(() => {
    loadLayout(true);
    const refetch = () => loadLayout(false);
    window.addEventListener("focus", refetch);
    window.addEventListener("pageshow", refetch);
    return () => {
      window.removeEventListener("focus", refetch);
      window.removeEventListener("pageshow", refetch);
    };
  }, [loadLayout]);

  const getX = (seat: any) =>
    seat?.gridX !== undefined && seat?.gridX !== null
      ? Number(seat.gridX)
      : Number(seat?.seatNumber ?? 1);
  const getY = (seat: any) =>
    seat?.gridY !== undefined && seat?.gridY !== null ? Number(seat.gridY) : 0;

  const { gridRows, maxCols } = useMemo(() => {
    if (
      !layout?.seats ||
      !Array.isArray(layout.seats) ||
      layout.seats.length === 0
    ) {
      return { gridRows: [], maxCols: 14 };
    }
    const seats = layout.seats;
    const minY = Math.min(...seats.map(getY));
    const maxY = Math.max(...seats.map(getY));
    const rows = [];
    for (let y = minY; y <= maxY; y++) {
      const seatsInRow = seats.filter((seat: any) => getY(seat) === y);
      rows.push({
        gridY: y,
        rowLetter: seatsInRow[0]?.seatRow || "",
        seats: seatsInRow,
        isWalkwayRow: seatsInRow.length === 0,
      });
    }
    return { gridRows: rows, maxCols: Math.max(14, ...seats.map(getX)) };
  }, [layout]);

  const getSeatAtCol = (rowSeats: any[], colX: number) =>
    rowSeats.find((seat: any) => getX(seat) === colX);

  const findCouplePartner = (seat: any, rowSeats: any[]) => {
    if (!seat || seat?.seatType !== "COUPLE") return null;
    const targetSeatNumber =
      seat.seatNumber % 2 !== 0 ? seat.seatNumber + 1 : seat.seatNumber - 1;
    return (
      rowSeats.find(
        (other: any) =>
          other.seatId !== seat.seatId &&
          other.seatType === "COUPLE" &&
          other.seatNumber === targetSeatNumber,
      ) || null
    );
  };

  const toggleSeat = (seat: any, rowSeats: any[]) => {
    if (!seat?.seatId) return;
    const isAvailable =
      seat.availabilityStatus === "AVAILABLE" && seat.available !== false;
    if (!isAvailable) return;

    if (seat.seatType === "COUPLE") {
      const partner = findCouplePartner(seat, rowSeats);
      if (
        partner &&
        (partner.availabilityStatus !== "AVAILABLE" ||
          partner.available === false)
      )
        return;
      const idsToToggle = partner
        ? [seat.seatId, partner.seatId]
        : [seat.seatId];
      setSelectedSeatIds((prev) => {
        const allSelected = idsToToggle.every((id) => prev.includes(id));
        if (allSelected) return prev.filter((id) => !idsToToggle.includes(id));
        return Array.from(new Set([...prev, ...idsToToggle]));
      });
      return;
    }

    setSelectedSeatIds((prev) =>
      prev.includes(seat.seatId)
        ? prev.filter((id) => id !== seat.seatId)
        : [...prev, seat.seatId],
    );
  };

  const handleUpdateFAndBQty = (itemId: number, delta: number) => {
    setSelectedFAndB((prev) => {
      const current = prev[itemId] || 0;
      const next = Math.max(0, current + delta);
      if (next === 0) {
        const copy = { ...prev };
        delete copy[itemId];
        return copy;
      }
      return { ...prev, [itemId]: next };
    });
  };

  const ticketsTotal = layout?.seats
    ? layout.seats
        .filter((seat: any) => selectedSeatIds.includes(seat.seatId))
        .reduce(
          (sum: number, seat: any) => sum + Number(seat.calculatedPrice || 0),
          0,
        )
    : 0;

  const fAndBTotal = useMemo(() => {
    return Object.entries(selectedFAndB).reduce((sum, [idStr, qty]) => {
      const item = concessionItems.find((i) => i.id === Number(idStr));
      return sum + (item ? item.price * qty : 0);
    }, 0);
  }, [selectedFAndB, concessionItems]);

  const calculatedTotal = ticketsTotal + fAndBTotal;
  const finalPayableAmount = appliedVoucher
    ? appliedVoucher.finalTotal
    : calculatedTotal;

  const selectedSeats = layout?.seats
    ? layout.seats.filter((seat: any) => selectedSeatIds.includes(seat.seatId))
    : [];

  const ticketBreakdown = useMemo(() => {
    const groups: Record<string, { count: number; total: number }> = {};
    selectedSeats.forEach((seat: any) => {
      const key = seat.seatType || "REGULAR";
      if (!groups[key]) groups[key] = { count: 0, total: 0 };
      groups[key].count += 1;
      groups[key].total += Number(seat.calculatedPrice || 0);
    });
    return Object.entries(groups).map(([type, { count, total }]) => ({
      type,
      count,
      total,
    }));
  }, [selectedSeats]);

  const fAndBBreakdown = useMemo(() => {
    return Object.entries(selectedFAndB)
      .map(([idStr, qty]) => {
        const item = concessionItems.find((i) => i.id === Number(idStr));
        if (!item || qty <= 0) return null;
        return {
          id: item.id,
          name: item.name,
          quantity: qty,
          total: item.price * qty,
        };
      })
      .filter(Boolean) as {
      id: number;
      name: string;
      quantity: number;
      total: number;
    }[];
  }, [selectedFAndB, concessionItems]);

  const formatDuration = (mins?: number | null) => {
    if (!mins && mins !== 0) return null;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return h <= 0 ? `${m}m` : `${h}h ${m}m`;
  };

  const handleOpenConfirm = () => {
    if (selectedSeatIds.length === 0 || submitting) return;
    const token = AuthService.getAccessToken();
    const currentUser = AuthService.getCurrentUser();
    if (!token || !currentUser) {
      showToast(
        "Please sign in or register to complete your ticket booking.",
        "info",
      );
      const currentPath =
        typeof window !== "undefined"
          ? window.location.pathname
          : `/customer/booking/${showtimeId}`;
      setTimeout(
        () => router.push(`/login?redirect=${encodeURIComponent(currentPath)}`),
        1200,
      );
      return;
    }
    setCountdown(CONFIRM_COUNTDOWN_SECONDS);
    setModalView("review");
    setConfirmedBookingRef(null);
    setShowConfirmModal(true);
  };

  const closeConfirmModal = () => {
    if (modalView !== "review") return;
    setShowConfirmModal(false);
  };

  const handleApplyVoucher = async () => {
    if (!promoCode.trim()) return;
    setApplyingVoucher(true);
    setVoucherError(null);

    try {
      const res = await VoucherService.applyVoucher(
        promoCode.trim().toUpperCase(),
        calculatedTotal,
      );

      const data = res?.body?.data || res?.data || res;

      let discountAmount = Number(
        data?.discountAmount ?? data?.discount ?? data?.value ?? 0,
      );
      let finalTotal = Number(data?.finalTotal ?? data?.total ?? 0);

      if (discountAmount === 0 && data?.discountValue) {
        const val = Number(data.discountValue);
        if (data.discountType === "PERCENTAGE" || val <= 100) {
          discountAmount = (calculatedTotal * val) / 100;
        } else {
          discountAmount = val;
        }
      }

      discountAmount = Math.min(discountAmount, calculatedTotal);
      if (!finalTotal || finalTotal === calculatedTotal) {
        finalTotal = Math.max(0, calculatedTotal - discountAmount);
      }

      setAppliedVoucher({
        code: promoCode.trim().toUpperCase(),
        discountAmount,
        finalTotal,
      });
      showToast("Voucher applied successfully!", "success");
    } catch (err: any) {
      setVoucherError(
        err?.response?.data?.message || "Invalid or expired promo code.",
      );
    } finally {
      setApplyingVoucher(false);
    }
  };

  useEffect(() => {
    if (!showConfirmModal || modalView !== "review") {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
      }
      return;
    }
    countdownIntervalRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          if (countdownIntervalRef.current) {
            clearInterval(countdownIntervalRef.current);
            countdownIntervalRef.current = null;
          }
          setShowConfirmModal(false);
          showToast(
            "Your selection review timed out. Please confirm again.",
            "info",
          );
          return CONFIRM_COUNTDOWN_SECONDS;
        }
        return prev - 1;
      });
    }, 1000);
    return () => {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
      }
    };
  }, [showConfirmModal, modalView]);

  const formattedCountdown = useMemo(() => {
    const m = Math.floor(countdown / 60)
      .toString()
      .padStart(2, "0");
    const s = (countdown % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  }, [countdown]);

  // 👇 UPDATED — was handlePayCash (cash-only). Now branches on
  // paymentMethod. CASH keeps the exact original atomic book+pay flow.
  // KHQR creates the booking (PENDING) then hands off to the payment
  // page, which generates the Bakong QR and polls for confirmation.
  const handleConfirmBooking = async () => {
    if (selectedSeatIds.length === 0 || submitting) return;
    setSubmitting(true);
    setModalView("processing");

    const fbPayload = Object.entries(selectedFAndB).map(([idStr, qty]) => ({
      concessionItemId: Number(idStr),
      quantity: qty,
    }));

    try {
      if (paymentMethod === "CASH") {
        const result = await PaymentService.bookAndPayCash({
          showtimeId: sId,
          seatIds: selectedSeatIds,
          concessions: fbPayload.length > 0 ? fbPayload : undefined,
          voucherCode: appliedVoucher ? appliedVoucher.code : undefined,
        } as any);

        const bookingRef = result?.bookingNumber || result?.bookingId || null;
        setConfirmedBookingRef(bookingRef);
        setModalView("success");

        setTimeout(() => {
          setShowConfirmModal(false);
          router.push(`/customer/tickets/${bookingRef}`);
        }, 1600);
      } else {
        // KHQR flow — create the booking first (no payment yet), then
        // redirect to the payment page to generate/scan the QR code.
        const booking = await BookingService.createBooking(
          {
            showtimeId: sId,
            seatIds: selectedSeatIds,
            concessions: fbPayload.length > 0 ? fbPayload : undefined,
          } as any,
          appliedVoucher ? appliedVoucher.code : undefined,
        );

        const newBookingId = booking?.id;
        setShowConfirmModal(false);
        router.push(`/customer/payment/${newBookingId}`);
        return;
      }
    } catch (err: any) {
      console.error("Failed to confirm booking:", err);
      const status = err?.response?.status;
      if (status === 401 || status === 403) {
        showToast("Your session has expired. Please sign in again.", "info");
        AuthService.logout();
        setShowConfirmModal(false);
        setTimeout(() => router.push(`/login`), 1200);
        setSubmitting(false);
        return;
      }
      if (status === 409) {
        showToast(
          "One of your selected seats was just booked by someone else.",
          "error",
        );
        setShowConfirmModal(false);
        setSelectedSeatIds([]);
        loadLayout(false);
        setSubmitting(false);
        setModalView("review");
        return;
      }
      showToast(
        err?.response?.data?.message || "Failed to confirm booking.",
        "error",
      );
      setModalView("review");
      setSubmitting(false);
      return;
    }

    setSubmitting(false);
  };

  const pageBg = isLight
    ? "bg-white text-slate-900"
    : "bg-[#0b0c10] text-slate-100";
  const headerBg = isLight
    ? "bg-white/95 border-slate-200 shadow-sm"
    : "bg-[#0b0c10]/95 border-[#1c1d21]/80 shadow-xl";
  const mutedText = isLight ? "text-slate-500" : "text-slate-400";
  const primaryText = isLight ? "text-slate-900" : "text-white";
  const cardBg = isLight
    ? "bg-white border-slate-200 shadow-lg"
    : "bg-[#131417]/95 border-[#232428] shadow-2xl";
  const modalBg = isLight
    ? "bg-white border-slate-200 text-slate-900"
    : "bg-[#131417] border-[#232428] text-slate-100";
  const innerBg = isLight
    ? "bg-slate-50 border-slate-200"
    : "bg-slate-950 border-slate-800";

  if (loading) {
    return (
      <div
        className={`flex min-h-screen items-center justify-center ${pageBg}`}
      >
        <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
      </div>
    );
  }

  const steps = [
    { number: 1, label: "Choose Seats", icon: Armchair },
    { number: 2, label: "Add Snacks & F&B", icon: Coffee },
  ];

  return (
    <div className={`min-h-screen transition-colors duration-200 ${pageBg}`}>
      <style jsx global>{`
        ::-webkit-scrollbar {
          display: none;
        }
        html,
        body {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>

      {/* Modern Header Bar */}
      <div
        className={`sticky top-16 z-40 w-full backdrop-blur-md border-b transition-colors ${headerBg}`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-8 py-3.5 flex items-center justify-between">
          <button
            type="button"
            onClick={() => {
              if (activeStep === 2) setActiveStep(1);
              else router.back();
            }}
            className={`flex items-center gap-2 rounded-xl border px-3.5 py-2 text-xs font-bold transition cursor-pointer ${
              isLight
                ? "border-slate-200 bg-white text-slate-600 hover:border-slate-300 shadow-sm"
                : "border-white/10 bg-slate-900 text-slate-300 hover:border-white/20 hover:text-white"
            }`}
          >
            <ArrowLeft className="h-4 w-4" />
            <span>{activeStep === 2 ? "Back to Seats" : "Back to Movie"}</span>
          </button>

          {/* Stepper Header Component */}
          <div className="flex items-center gap-1 sm:gap-3">
            {steps.map((step, idx) => {
              const Icon = step.icon;
              const isCompleted = activeStep > step.number;
              const isCurrent = activeStep === step.number;
              const isReached = activeStep >= step.number;

              return (
                <div key={step.number} className="flex items-center">
                  {idx > 0 && (
                    <div
                      className={`h-0.5 w-6 sm:w-12 mx-2 sm:mx-3 rounded-full transition-colors duration-500 ${
                        isReached
                          ? "bg-amber-500"
                          : isDark
                            ? "bg-slate-700"
                            : "bg-slate-200"
                      }`}
                    />
                  )}
                  <div className="flex items-center gap-2">
                    <div
                      className={`flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-xl font-black text-xs transition-all duration-300 border ${
                        isCompleted || isCurrent
                          ? "bg-amber-500 border-amber-500 text-slate-950 shadow-lg shadow-amber-500/25"
                          : isDark
                            ? "bg-slate-900 border-slate-700 text-slate-500"
                            : "bg-slate-100 border-slate-200 text-slate-400"
                      }`}
                    >
                      {isCompleted ? "✓" : <Icon className="h-4 w-4" />}
                    </div>
                    <span
                      className={`hidden sm:inline text-xs font-black tracking-tight ${isCurrent ? "text-amber-500" : mutedText}`}
                    >
                      {step.label}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="w-full max-w-7xl mx-auto space-y-4 sm:space-y-6 p-2 sm:p-8 pt-6 pb-24">
        <Toast
          message={toast.message}
          type={toast.type}
          duration={3500}
          onClose={() => setToast((prev) => ({ ...prev, message: null }))}
        />

        {!layout ? (
          <div className={`rounded-3xl border p-12 text-center ${cardBg}`}>
            <p className={`text-sm font-semibold ${primaryText}`}>
              Seat layout unavailable
            </p>
            <button
              type="button"
              onClick={() => router.back()}
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-400 px-5 py-2.5 text-xs font-black text-slate-950 transition cursor-pointer shadow-lg shadow-amber-500/20"
            >
              <ArrowLeft className="h-4 w-4" /> Go Back
            </button>
          </div>
        ) : (
          <>
            {/* STEP 1: SEAT SELECTION */}
            <div style={{ display: activeStep === 1 ? "block" : "none" }}>
              <div
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                className={`relative rounded-2xl sm:rounded-3xl border p-3 sm:p-8 md:p-12 space-y-6 sm:space-y-8 overflow-hidden select-none transition-colors ${
                  isLight
                    ? "border-slate-200 bg-gradient-to-b from-slate-50 via-white to-slate-50"
                    : "border-slate-800/80 bg-gradient-to-b from-[#18191c] via-[#131417] to-[#0f1012]"
                }`}
              >
                <div className="relative z-30 flex justify-end px-1">
                  <div
                    className={`flex items-center gap-1 backdrop-blur-md rounded-xl p-1 shadow-2xl border ${isLight ? "bg-white/95 border-slate-200" : "bg-[#131417]/90 border-[#232428]/70"}`}
                  >
                    <button
                      type="button"
                      onClick={handleZoomOut}
                      disabled={zoomLevel <= MIN_ZOOM}
                      aria-label="Zoom out"
                      className={`p-1.5 rounded-lg transition disabled:opacity-30 cursor-pointer ${isLight ? "text-slate-500 hover:text-slate-900" : "text-slate-400 hover:text-white"}`}
                    >
                      <ZoomOut className="h-4 w-4" />
                    </button>
                    <span
                      className={`text-[10px] font-mono font-bold px-1.5 min-w-[42px] text-center ${isLight ? "text-slate-700" : "text-slate-300"}`}
                    >
                      {Math.round(zoomLevel * 100)}%
                    </span>
                    <button
                      type="button"
                      onClick={handleZoomIn}
                      disabled={zoomLevel >= MAX_ZOOM}
                      aria-label="Zoom in"
                      className={`p-1.5 rounded-lg transition disabled:opacity-30 cursor-pointer ${isLight ? "text-slate-500 hover:text-slate-900" : "text-slate-400 hover:text-white"}`}
                    >
                      <ZoomIn className="h-4 w-4" />
                    </button>
                    <div
                      className={`w-[1px] h-3.5 mx-0.5 ${isLight ? "bg-slate-200" : "bg-slate-700"}`}
                    />
                    <button
                      type="button"
                      onClick={handleResetZoom}
                      aria-label="Reset zoom"
                      className={`p-1.5 rounded-lg transition cursor-pointer ${isLight ? "text-slate-500 hover:text-slate-900" : "text-slate-400 hover:text-white"}`}
                    >
                      <Maximize2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

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
                          <stop offset="0%" stopColor="#f59e0b" />
                          <stop offset="50%" stopColor="#fb923c" />
                          <stop offset="100%" stopColor="#fb7185" />
                        </linearGradient>
                      </defs>
                      <path
                        d="M 15,38 Q 200,0 385,38"
                        fill="none"
                        stroke="url(#customerScreenGrad)"
                        strokeWidth="3.5"
                        strokeLinecap="round"
                      />
                    </svg>
                    <span
                      className={`absolute top-4 sm:top-6 text-[9px] sm:text-[11px] font-black uppercase tracking-widest drop-shadow-md ${isLight ? "text-slate-500" : "text-slate-400"}`}
                    >
                      SCREEN
                    </span>
                  </div>
                </div>

                <div className="w-full z-10 relative py-4">
                  <div
                    style={{
                      transform: `scale(${zoomLevel})`,
                      transformOrigin: "top center",
                      transition: "transform 0.15s ease-out",
                    }}
                    className="w-full max-w-2xl mx-auto flex flex-col space-y-1.5 sm:space-y-2 px-1"
                  >
                    {gridRows.map(
                      ({ gridY, rowLetter, seats: rowSeats, isWalkwayRow }) => {
                        if (isWalkwayRow) {
                          return (
                            <div
                              key={gridY}
                              className="h-4 sm:h-6 flex items-center justify-center w-full"
                            >
                              <div
                                className={`w-full border-t border-dashed ${isLight ? "border-slate-200" : "border-slate-800/40"}`}
                              />
                            </div>
                          );
                        }
                        return (
                          <div
                            key={gridY}
                            className="flex items-center justify-center gap-1 sm:gap-2 w-full"
                          >
                            <span
                              className={`w-4 sm:w-6 text-center font-mono text-[10px] sm:text-xs font-black select-none shrink-0 ${isLight ? "text-slate-400" : "text-slate-500"}`}
                            >
                              {rowLetter}
                            </span>
                            <div
                              className="flex-1 grid gap-1 items-center justify-center"
                              style={{
                                gridTemplateColumns: `repeat(${maxCols}, minmax(0, 1fr))`,
                              }}
                            >
                              {Array.from(
                                { length: maxCols },
                                (_, index) => index + 1,
                              ).map((colX) => {
                                const seat = getSeatAtCol(rowSeats, colX);
                                if (!seat)
                                  return (
                                    <div
                                      key={colX}
                                      className={`aspect-square w-full text-center text-[8px] ${isLight ? "text-slate-200" : "text-slate-800"}`}
                                    >
                                      ·
                                    </div>
                                  );

                                const isCouple = seat.seatType === "COUPLE";
                                const partner = isCouple
                                  ? findCouplePartner(seat, rowSeats)
                                  : null;
                                const isAvailable =
                                  seat.availabilityStatus === "AVAILABLE" &&
                                  seat.available !== false;
                                const partnerAvailable =
                                  !partner ||
                                  (partner.availabilityStatus === "AVAILABLE" &&
                                    partner.available !== false);
                                const isSeatFullyAvailable =
                                  isAvailable &&
                                  (!isCouple || partnerAvailable);
                                const isSelected = selectedSeatIds.includes(
                                  seat.seatId,
                                );

                                if (!isSeatFullyAvailable) {
                                  return (
                                    <div
                                      key={colX}
                                      className="aspect-square w-full flex items-center justify-center"
                                    >
                                      <div
                                        className={`h-full w-full rounded-full border flex items-center justify-center cursor-not-allowed ${isLight ? "bg-slate-200 border-slate-300 text-slate-400" : "bg-slate-800/80 border-slate-700 text-slate-500"}`}
                                        title="Already booked"
                                      >
                                        <UserRound className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                                      </div>
                                    </div>
                                  );
                                }

                                if (isSelected) {
                                  return (
                                    <div
                                      key={colX}
                                      className="aspect-square w-full flex items-center justify-center"
                                    >
                                      <button
                                        type="button"
                                        onClick={() =>
                                          toggleSeat(seat, rowSeats)
                                        }
                                        className="h-full w-full rounded-full bg-amber-500 hover:bg-amber-400 flex items-center justify-center text-slate-950 shadow-lg shadow-amber-500/40 transition cursor-pointer"
                                        title="Selected"
                                      >
                                        <Check
                                          className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-slate-950"
                                          strokeWidth={3}
                                        />
                                      </button>
                                    </div>
                                  );
                                }

                                let seatBg =
                                  "bg-pink-500 text-slate-950 shadow-md shadow-pink-500/40 border border-pink-300 font-black";
                                if (seat.seatType === "REGULAR")
                                  seatBg =
                                    "bg-cyan-400 text-slate-950 shadow-md shadow-cyan-400/40 border border-cyan-200 font-black";
                                else if (isCouple)
                                  seatBg =
                                    "bg-purple-600 text-white shadow-md shadow-purple-600/40 border border-purple-400 font-bold";

                                const isLeftOfCouple =
                                  isCouple && seat.seatNumber % 2 !== 0;
                                const isRightOfCouple =
                                  isCouple && seat.seatNumber % 2 === 0;
                                const shapeClass = isCouple
                                  ? isLeftOfCouple
                                    ? "rounded-l-lg rounded-r-none"
                                    : isRightOfCouple
                                      ? "rounded-r-lg rounded-l-none"
                                      : "rounded-md"
                                  : "rounded-t-sm rounded-b-md";

                                return (
                                  <button
                                    key={colX}
                                    type="button"
                                    onClick={() => toggleSeat(seat, rowSeats)}
                                    className={`aspect-square w-full transition cursor-pointer flex flex-col items-center justify-center relative ${seatBg} ${shapeClass}`}
                                  >
                                    <div className="w-2.5 h-0.5 mb-0.5 rounded-full bg-white/60" />
                                    <span className="leading-none scale-90 sm:scale-100 text-[8px] sm:text-[10px]">
                                      {seat.seatNumber}
                                    </span>
                                  </button>
                                );
                              })}
                            </div>
                            <span
                              className={`w-4 sm:w-6 text-center font-mono text-[10px] sm:text-xs font-black select-none shrink-0 ${isLight ? "text-slate-400" : "text-slate-500"}`}
                            >
                              {rowLetter}
                            </span>
                          </div>
                        );
                      },
                    )}
                  </div>
                </div>

                <div
                  className={`flex flex-wrap items-center justify-center gap-4 sm:gap-6 pt-4 sm:pt-6 border-t text-[11px] sm:text-xs z-10 relative ${isLight ? "border-slate-200" : "border-slate-800/80"}`}
                >
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <div className="h-3.5 w-3.5 rounded bg-cyan-400 border border-cyan-200" />
                    <span
                      className={`font-semibold ${isLight ? "text-slate-600" : "text-slate-300"}`}
                    >
                      Standard
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <div className="h-3.5 w-3.5 rounded bg-purple-600 border border-purple-400" />
                    <span
                      className={`font-semibold ${isLight ? "text-slate-600" : "text-slate-300"}`}
                    >
                      Couple
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <div className="h-3.5 w-3.5 rounded bg-pink-500 border border-pink-400" />
                    <span
                      className={`font-semibold ${isLight ? "text-slate-600" : "text-slate-300"}`}
                    >
                      VIP
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <div className="h-3.5 w-3.5 rounded-full bg-amber-500 flex items-center justify-center">
                      <Check
                        className="h-2.5 w-2.5 text-slate-950"
                        strokeWidth={3}
                      />
                    </div>
                    <span
                      className={`font-semibold ${isLight ? "text-slate-600" : "text-slate-300"}`}
                    >
                      Selected
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <div
                      className={`h-3.5 w-3.5 rounded-full border flex items-center justify-center ${isLight ? "bg-slate-200 border-slate-300" : "bg-slate-800 border-slate-700"}`}
                    >
                      <UserRound
                        className={`h-2.5 w-2.5 ${isLight ? "text-slate-400" : "text-slate-500"}`}
                      />
                    </div>
                    <span
                      className={`font-semibold ${isLight ? "text-slate-600" : "text-slate-300"}`}
                    >
                      Booked
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* STEP 2: F&B SNACKS SELECTION (FULL IMAGE CARD DESIGN) */}
            <div style={{ display: activeStep === 2 ? "block" : "none" }}>
              <div
                className={`rounded-3xl border p-6 sm:p-8 space-y-6 ${cardBg}`}
              >
                <div className="flex items-center justify-between border-b pb-4 border-inherit">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-2xl bg-amber-500/10 text-amber-500 border border-amber-500/20">
                      <Coffee className="h-6 w-6" />
                    </div>
                    <div>
                      <h2 className="text-lg font-black">
                        Pre-order Cinema Snacks & Combos
                      </h2>
                      <p className={`text-xs ${mutedText}`}>
                        Enjoy fresh popcorn and drinks right at your movie
                        screening!
                      </p>
                    </div>
                  </div>
                </div>

                {concessionItems.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5">
                    {concessionItems.map((item) => {
                      const qty = selectedFAndB[item.id] || 0;
                      return (
                        <div
                          key={item.id}
                          className={`group relative flex flex-col justify-between overflow-hidden rounded-2xl border transition-all duration-300 ${
                            qty > 0
                              ? "border-amber-500 ring-2 ring-amber-500/40 shadow-xl shadow-amber-500/20"
                              : isLight
                                ? "border-slate-200 bg-white hover:border-slate-300 shadow-sm"
                                : "border-[#232428] bg-[#15161a] hover:border-[#2c2d33] shadow-md"
                          }`}
                          style={{ height: "310px" }}
                        >
                          {/* Full Background / Cover Image */}
                          <div className="absolute inset-0 w-full h-full overflow-hidden">
                            {item.imageUrl ? (
                              <img
                                src={item.imageUrl}
                                alt={item.name}
                                className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                              />
                            ) : (
                              <div
                                className={`flex h-full w-full items-center justify-center ${isLight ? "bg-slate-100 text-slate-400" : "bg-[#1c1d21] text-slate-500"}`}
                              >
                                <Coffee className="h-8 w-8" />
                              </div>
                            )}
                            {/* Rich dark gradient overlay so text is readable */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/50 to-black/10" />
                          </div>

                          {/* Top Badges */}
                          <div className="relative z-10 p-3 flex items-start justify-between">
                            <span className="rounded-md bg-black/70 backdrop-blur-md px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-amber-400 border border-white/10">
                              {item.categoryName}
                            </span>
                            <span className="rounded-lg bg-amber-500 px-2 py-0.5 font-mono text-xs font-black text-slate-950 shadow-lg">
                              ${item.price.toFixed(2)}
                            </span>
                          </div>

                          {/* Bottom Content & Controls */}
                          <div className="relative z-10 p-3.5 space-y-2.5 flex flex-col justify-end">
                            <div>
                              <h3 className="text-xs font-black text-white leading-snug line-clamp-1 drop-shadow-sm">
                                {item.name}
                              </h3>
                              <p className="text-[10px] text-slate-300 line-clamp-2 leading-relaxed mt-0.5 drop-shadow-sm">
                                {item.description}
                              </p>
                            </div>

                            <div className="flex items-center justify-between pt-1">
                              {qty > 0 ? (
                                <div className="flex items-center gap-1.5 rounded-full border border-white/20 bg-black/60 backdrop-blur-md px-1 py-0.5">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleUpdateFAndBQty(item.id, -1)
                                    }
                                    className="flex h-6 w-6 items-center justify-center rounded-full bg-white/20 text-white hover:bg-white/30 transition cursor-pointer"
                                  >
                                    <Minus className="h-3 w-3" />
                                  </button>
                                  <span className="w-4 text-center font-mono text-xs font-bold text-white">
                                    {qty}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleUpdateFAndBQty(item.id, 1)
                                    }
                                    className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-500 text-slate-950 hover:bg-amber-400 transition cursor-pointer shadow-sm"
                                  >
                                    <Plus className="h-3 w-3" />
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleUpdateFAndBQty(item.id, 1)
                                  }
                                  className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 py-2 px-3 text-xs font-black text-slate-950 shadow-lg shadow-amber-500/25 transition cursor-pointer"
                                >
                                  <Plus className="h-3.5 w-3.5" />
                                  <span>Add to Order</span>
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="py-12 text-center text-xs text-slate-500">
                    No F&B items currently available.
                  </div>
                )}
              </div>
            </div>

            {/* BOTTOM SUMMARY BAR */}
            <div
              className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl border shadow-2xl backdrop-blur-md ${cardBg}`}
            >
              <div>
                <p className={`text-xs ${mutedText}`}>
                  Selected Seats ({selectedSeatIds.length}){" "}
                  {Object.values(selectedFAndB).reduce((a, b) => a + b, 0) >
                    0 && "• Snacks Added"}
                </p>
                <p
                  className={`font-mono font-bold text-sm mt-0.5 ${isLight ? "text-slate-900" : "text-white"}`}
                >
                  {selectedSeats.length > 0
                    ? selectedSeats.map((seat: any) => seat.seatCode).join(", ")
                    : "None selected"}
                </p>
              </div>

              <div className="flex items-center gap-6">
                <div className="text-left sm:text-right">
                  <p className={`text-xs ${mutedText}`}>Total Amount:</p>
                  <p className="font-mono font-black text-amber-500 text-xl">
                    ${calculatedTotal.toFixed(2)} USD
                  </p>
                </div>

                {activeStep === 1 ? (
                  <button
                    type="button"
                    onClick={() => {
                      if (selectedSeatIds.length === 0) {
                        showToast(
                          "Please pick at least one seat first.",
                          "info",
                        );
                        return;
                      }
                      setActiveStep(2);
                    }}
                    disabled={selectedSeatIds.length === 0}
                    className="flex items-center gap-2 rounded-2xl bg-amber-500 hover:bg-amber-400 px-7 py-4 text-xs font-black text-slate-950 shadow-lg shadow-amber-500/25 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
                  >
                    <span>Next: Add Snacks (Optional)</span>
                    <ArrowRight className="h-4 w-4" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleOpenConfirm}
                    disabled={submitting || selectedSeatIds.length === 0}
                    className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-red-600 to-rose-600 px-7 py-4 text-xs font-black text-white shadow-lg shadow-red-600/30 hover:from-red-500 hover:to-rose-500 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
                  >
                    <span>Proceed to Checkout</span>
                    <ArrowRight className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Confirmation & Checkout Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-0 sm:p-4">
          <div
            className={`w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl border shadow-2xl ${modalBg}`}
          >
            {modalView === "success" ? (
              <div className="flex flex-col items-center justify-center text-center gap-4 p-10">
                <div
                  className={`flex h-16 w-16 items-center justify-center rounded-full border ${isLight ? "bg-emerald-50 border-emerald-200" : "bg-emerald-500/20 border-emerald-500/30"}`}
                >
                  <CheckCircle2 className="h-9 w-9 text-emerald-400" />
                </div>
                <div>
                  <h2 className="text-lg font-black">Booking Confirmed!</h2>
                  <p className={`mt-2 text-xs ${mutedText}`}>
                    Please proceed to the counter to pay in cash and collect
                    your tickets & snacks.
                  </p>
                  {confirmedBookingRef && (
                    <p className="mt-1 text-xs font-mono font-bold text-emerald-500">
                      Ref: {confirmedBookingRef}
                    </p>
                  )}
                </div>
                <Loader2 className="h-5 w-5 animate-spin text-emerald-400" />
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between px-5 py-4 border-b border-inherit">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={closeConfirmModal}
                      disabled={modalView === "processing"}
                      aria-label="Back"
                      className={`p-1.5 rounded-lg transition cursor-pointer ${isLight ? "hover:bg-slate-100 text-slate-600" : "hover:bg-slate-800 text-slate-300"}`}
                    >
                      <ArrowLeft className="h-4 w-4" />
                    </button>
                    <h2 className="text-sm font-black">Confirmation Summary</h2>
                  </div>
                  <div className="flex items-center gap-3">
                    {modalView === "review" && (
                      <span
                        className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold ${isLight ? "bg-red-50 text-red-600" : "bg-red-500/10 text-red-400"}`}
                      >
                        <Clock3 className="h-3 w-3" /> {formattedCountdown}
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={closeConfirmModal}
                      disabled={modalView === "processing"}
                      aria-label="Close"
                      className={`p-1.5 rounded-lg transition cursor-pointer ${isLight ? "hover:bg-slate-100 text-slate-500" : "hover:bg-slate-800 text-slate-400"}`}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="px-5 py-4 space-y-4 max-h-[65vh] overflow-y-auto">
                  {showtimeInfo && (
                    <div
                      className={`flex gap-3 rounded-2xl border p-3 ${isLight ? "border-slate-200 bg-slate-50" : "border-slate-800 bg-slate-950/60"}`}
                    >
                      {resolvePosterUrl(showtimeInfo.moviePosterUrl) ? (
                        <img
                          src={resolvePosterUrl(showtimeInfo.moviePosterUrl)!}
                          alt="Poster"
                          className="h-24 w-16 shrink-0 rounded-lg object-cover shadow-md"
                        />
                      ) : (
                        <div
                          className={`flex h-24 w-16 shrink-0 items-center justify-center rounded-lg border ${isLight ? "border-slate-200 bg-slate-100 text-slate-400" : "border-slate-700 bg-slate-800 text-slate-500"}`}
                        >
                          <Clapperboard className="h-6 w-6" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1 space-y-1.5">
                        {showtimeInfo.movieTitle && (
                          <h3 className="text-sm font-black leading-tight truncate">
                            {showtimeInfo.movieTitle}
                          </h3>
                        )}
                        <div className="flex flex-wrap items-center gap-1.5">
                          {formatDuration(
                            showtimeInfo.movieDurationMinutes,
                          ) && (
                            <span
                              className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-bold ${isLight ? "bg-white text-slate-600 border border-slate-200" : "bg-slate-800 text-slate-300 border border-slate-700"}`}
                            >
                              <Clock3 className="h-2.5 w-2.5" />{" "}
                              {formatDuration(
                                showtimeInfo.movieDurationMinutes,
                              )}
                            </span>
                          )}
                          {showtimeInfo.hallType && (
                            <span
                              className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold ${isLight ? "bg-white text-slate-600 border border-slate-200" : "bg-slate-800 text-slate-300 border border-slate-700"}`}
                            >
                              {showtimeInfo.hallType}
                            </span>
                          )}
                        </div>
                        {showtimeInfo.cinemaName && (
                          <p
                            className={`flex items-center gap-1 text-[11px] truncate ${mutedText}`}
                          >
                            <MapPin className="h-3 w-3 shrink-0" />
                            <span className="truncate">
                              {showtimeInfo.cinemaName}
                            </span>
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    <p
                      className={`text-[11px] font-bold uppercase tracking-wider ${mutedText}`}
                    >
                      Tickets ({selectedSeatIds.length})
                    </p>
                    {ticketBreakdown.map(({ type, count, total }) => (
                      <div
                        key={type}
                        className="flex items-center justify-between text-xs"
                      >
                        <span className={mutedText}>
                          {count}x{" "}
                          {type.charAt(0) + type.slice(1).toLowerCase()}
                        </span>
                        <span className="font-mono font-semibold">
                          ${total.toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>

                  {fAndBBreakdown.length > 0 && (
                    <div className="space-y-2 pt-2 border-t border-inherit">
                      <p
                        className={`text-[11px] font-bold uppercase tracking-wider text-amber-500`}
                      >
                        Snacks & Combos (
                        {Object.values(selectedFAndB).reduce(
                          (a, b) => a + b,
                          0,
                        )}
                        )
                      </p>
                      {fAndBBreakdown.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between text-xs"
                        >
                          <span className={mutedText}>
                            {item.quantity}x {item.name}
                          </span>
                          <span className="font-mono font-semibold">
                            ${item.total.toFixed(2)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* --- PAYMENT METHOD SELECTOR --- */}
                  <div
                    className={`rounded-2xl border p-3.5 space-y-2.5 ${innerBg}`}
                  >
                    <span className="text-xs font-bold uppercase tracking-wider">
                      Payment Method
                    </span>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setPaymentMethod("CASH")}
                        className={`flex items-center justify-center gap-2 rounded-xl border py-2.5 text-xs font-black transition cursor-pointer ${
                          paymentMethod === "CASH"
                            ? "bg-amber-500 border-amber-500 text-slate-950"
                            : isLight
                              ? "border-slate-200 bg-white text-slate-600"
                              : "border-slate-700 bg-slate-900 text-slate-300"
                        }`}
                      >
                        <Banknote className="h-3.5 w-3.5" />
                        <span>Cash at Counter</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setPaymentMethod("KHQR")}
                        className={`flex items-center justify-center gap-2 rounded-xl border py-2.5 text-xs font-black transition cursor-pointer ${
                          paymentMethod === "KHQR"
                            ? "bg-amber-500 border-amber-500 text-slate-950"
                            : isLight
                              ? "border-slate-200 bg-white text-slate-600"
                              : "border-slate-700 bg-slate-900 text-slate-300"
                        }`}
                      >
                        <QrCode className="h-3.5 w-3.5" />
                        <span>KHQR (Bakong)</span>
                      </button>
                    </div>
                  </div>

                  {/* --- PROMOTIONAL VOUCHER REDEMPTION BOX --- */}
                  <div
                    className={`rounded-2xl border p-3.5 space-y-2.5 text-left ${innerBg}`}
                  >
                    <div className="flex items-center gap-2">
                      <Ticket className="h-4 w-4 text-amber-500" />
                      <span className="text-xs font-bold uppercase tracking-wider">
                        Promotional Voucher
                      </span>
                    </div>

                    {appliedVoucher ? (
                      <div className="flex items-center justify-between rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-3 py-2 text-xs">
                        <div className="flex items-center gap-2 text-emerald-400 font-bold">
                          <CheckCircle className="h-4 w-4" />
                          <span>
                            &ldquo;{appliedVoucher.code}&rdquo; Applied (-$
                            {appliedVoucher.discountAmount.toFixed(2)})
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setAppliedVoucher(null);
                            setPromoCode("");
                          }}
                          className="text-[10px] text-slate-400 hover:text-rose-400 underline cursor-pointer"
                        >
                          Remove
                        </button>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={promoCode}
                          onChange={(e) =>
                            setPromoCode(e.target.value.toUpperCase())
                          }
                          placeholder="Enter promo code"
                          className={`flex-1 rounded-xl border px-3 py-2 text-xs font-mono uppercase outline-none focus:border-amber-500 ${isLight ? "bg-white border-slate-200 text-slate-900" : "bg-slate-900 border-slate-700 text-white"}`}
                        />
                        <button
                          type="button"
                          disabled={applyingVoucher || !promoCode.trim()}
                          onClick={handleApplyVoucher}
                          className="inline-flex items-center justify-center rounded-xl bg-amber-500 px-4 py-2 text-xs font-black text-slate-950 transition hover:bg-amber-400 disabled:opacity-50 cursor-pointer"
                        >
                          {applyingVoucher ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            "Apply"
                          )}
                        </button>
                      </div>
                    )}

                    {voucherError && (
                      <p className="text-[11px] font-semibold text-rose-500">
                        {voucherError}
                      </p>
                    )}
                  </div>

                  <div
                    className={`border-t pt-3 space-y-1.5 ${isLight ? "border-slate-200" : "border-slate-800"}`}
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className={mutedText}>Subtotal</span>
                      <span className="font-mono font-semibold">
                        ${calculatedTotal.toFixed(2)}
                      </span>
                    </div>

                    {appliedVoucher && (
                      <div className="flex items-center justify-between text-xs text-emerald-400 font-bold">
                        <span>Voucher Discount</span>
                        <span className="font-mono">
                          -${appliedVoucher.discountAmount.toFixed(2)}
                        </span>
                      </div>
                    )}

                    <div className="flex items-center justify-between text-sm font-black pt-1">
                      <span>Total Amount</span>
                      <span className="font-mono text-amber-500 text-base">
                        ${finalPayableAmount.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {paymentMethod === "CASH" ? (
                    <div
                      className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-[11px] ${isLight ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-emerald-500/20 bg-emerald-500/5 text-emerald-400"}`}
                    >
                      <span>💵</span>
                      <span>
                        Pay at counter. Your seats & snacks will be instantly
                        confirmed.
                      </span>
                    </div>
                  ) : (
                    <div
                      className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-[11px] ${isLight ? "border-red-200 bg-red-50 text-red-700" : "border-red-500/20 bg-red-500/5 text-red-400"}`}
                    >
                      <span>📱</span>
                      <span>
                        You&apos;ll get a Bakong QR code to scan on the next
                        screen.
                      </span>
                    </div>
                  )}
                </div>

                <div className="p-5 pt-2">
                  <button
                    type="button"
                    onClick={handleConfirmBooking}
                    disabled={submitting}
                    className="w-full flex items-center justify-center gap-2 rounded-2xl bg-amber-500 hover:bg-amber-400 py-3.5 text-xs font-black text-slate-950 shadow-lg shadow-amber-500/25 disabled:opacity-60 transition cursor-pointer"
                  >
                    {modalView === "processing" && (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    )}
                    <span>
                      {modalView === "processing"
                        ? "Processing..."
                        : paymentMethod === "CASH"
                          ? `Confirm Booking $${finalPayableAmount.toFixed(2)}`
                          : "Continue to KHQR Payment"}
                    </span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
