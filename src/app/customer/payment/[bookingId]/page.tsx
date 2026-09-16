"use client";

import { useEffect, useState, useRef, use, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  QrCode,
  Loader2,
  CheckCircle2,
  Clock,
  AlertCircle,
  ArrowLeft,
  CreditCard,
  Banknote,
  Lock,
  Ticket,
  CheckCircle,
  RefreshCcw,
  TimerOff,
} from "lucide-react";

import { PaymentService } from "@/app/service/payment.service";
import BookingService, { BookingResponse } from "@/app/service/booking.service";
import { VoucherService } from "@/app/service/voucher.service";
import { useSettings } from "@/app/context/SettingsContext";

// Controls which methods are actually FUNCTIONAL (clickable).
// KHQR is enabled alongside Cash. CARD stays off ("Coming Soon") since
// Stripe integration isn't wired up yet.
const ENABLED_METHODS: Record<"CARD" | "KHQR" | "CASH", boolean> = {
  CARD: false,
  KHQR: true,
  CASH: true,
};

// 👇 NEW — KHQR QR codes now expire after 5 minutes, same hold window as
// the cash confirmation review step on the seat booking page.
const KHQR_COUNTDOWN_SECONDS = 5 * 60;

export default function CustomerPaymentPage({
  params,
}: {
  params: Promise<{ bookingId: string }>;
}) {
  const router = useRouter();
  const { bookingId } = use(params);
  const bId = Number(bookingId);

  const { theme } = useSettings();
  const isLight = theme === "light";

  const [selectedMethod, setSelectedMethod] = useState<
    "CASH" | "CARD" | "KHQR" | null
  >(null);

  const [paymentData, setPaymentData] = useState<any | null>(null);
  const [booking, setBooking] = useState<BookingResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [submittingCard, setSubmittingCard] = useState(false);

  // 👇 NEW — KHQR expiry state
  const [khqrCountdown, setKhqrCountdown] = useState(KHQR_COUNTDOWN_SECONDS);
  const [khqrExpired, setKhqrExpired] = useState(false);
  const khqrIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Voucher states
  const [promoCode, setPromoCode] = useState("");
  const [applyingVoucher, setApplyingVoucher] = useState(false);
  const [appliedVoucher, setAppliedVoucher] = useState<{
    code: string;
    discountAmount: number;
    finalTotal: number;
  } | null>(null);
  const [voucherError, setVoucherError] = useState<string | null>(null);

  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const redirectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    async function loadBookingInfo() {
      try {
        const res = await BookingService.getBookingById(bId);
        setBooking(res);
      } catch (err) {
        console.error("Failed to fetch booking details:", err);
      }
    }
    if (bId) {
      loadBookingInfo();
    }
  }, [bId]);

  const clearPolling = () => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  };

  const clearRedirect = () => {
    if (redirectTimeoutRef.current) {
      clearTimeout(redirectTimeoutRef.current);
      redirectTimeoutRef.current = null;
    }
  };

  // 👇 NEW — stop/reset the KHQR expiry countdown
  const clearKhqrCountdown = () => {
    if (khqrIntervalRef.current) {
      clearInterval(khqrIntervalRef.current);
      khqrIntervalRef.current = null;
    }
  };

  const handleSelectMethod = async (method: "CASH" | "CARD" | "KHQR") => {
    if (!ENABLED_METHODS[method]) return;

    setSelectedMethod(method);
    setErrorMsg(null);

    if (method === "KHQR") {
      await initializeKhqrPayment();
    }
  };

  const initializeKhqrPayment = async () => {
    setLoading(true);
    setKhqrExpired(false);
    setKhqrCountdown(KHQR_COUNTDOWN_SECONDS);
    try {
      const existingPayment = await PaymentService.getByBookingId(bId);

      if (existingPayment) {
        setPaymentData(existingPayment);
        if (existingPayment.paymentStatus === "COMPLETED") {
          setIsSuccess(true);
          redirectTimeoutRef.current = setTimeout(() => {
            const targetRef = booking?.bookingNumber || booking?.id || bId;
            router.push(`/customer/tickets/${targetRef}`);
          }, 1500);
        }
        return;
      }

      // No payment exists for this booking yet — generate a fresh KHQR one.
      const newPayment = await PaymentService.generateKhqr({
        bookingId: bId,
        currency: "USD",
      });
      setPaymentData(newPayment);

      if (newPayment.paymentStatus === "COMPLETED") {
        setIsSuccess(true);
        redirectTimeoutRef.current = setTimeout(() => {
          const targetRef = booking?.bookingNumber || booking?.id || bId;
          router.push(`/customer/tickets/${targetRef}`);
        }, 1500);
      }
    } catch (err: any) {
      setErrorMsg(
        err?.response?.data?.message || "Failed to initialize KHQR payment.",
      );
    } finally {
      setLoading(false);
    }
  };

  // 👇 NEW — user hit "Generate New QR" after expiry. Re-runs the same
  // init flow, which resets the countdown and (since the previous payment
  // record has no completed status) will simply reuse/regen as needed.
  const handleRegenerateKhqr = async () => {
    setErrorMsg(null);
    await initializeKhqrPayment();
  };

  // Handle Counter Cash Payment Confirmation (Calls backend /payments/cash)
  const handleCashPayment = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      await PaymentService.payWithCash({
        bookingId: bId,
        paymentMethod: "CASH",
        voucherCode: appliedVoucher ? appliedVoucher.code : undefined,
      });

      setIsSuccess(true);
      redirectTimeoutRef.current = setTimeout(() => {
        const targetRef = booking?.bookingNumber || booking?.id || bId;
        router.push(`/customer/tickets/${targetRef}`);
      }, 1500);
    } catch (err: any) {
      setErrorMsg(
        err?.response?.data?.message || "Failed to process cash booking.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleCardPaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingCard(true);
    setErrorMsg(null);

    try {
      await new Promise((resolve) => setTimeout(resolve, 1500));

      setIsSuccess(true);
      redirectTimeoutRef.current = setTimeout(() => {
        const targetRef = booking?.bookingNumber || booking?.id || bId;
        router.push(`/customer/tickets/${targetRef}`);
      }, 1500);
    } catch {
      setErrorMsg("Card payment failed. Please check your card details.");
    } finally {
      setSubmittingCard(false);
    }
  };

  // Apply Voucher Handler
  const handleApplyVoucher = async () => {
    if (!promoCode.trim() || !booking) return;
    setApplyingVoucher(true);
    setVoucherError(null);

    try {
      const subtotal = Number(booking.totalAmount || 0);
      const res = await VoucherService.applyVoucher(
        promoCode.trim().toUpperCase(),
        subtotal,
      );

      const discountAmount = res?.discountAmount || 0;
      const finalTotal =
        res?.finalTotal || Math.max(0, subtotal - discountAmount);

      setAppliedVoucher({
        code: promoCode.trim().toUpperCase(),
        discountAmount,
        finalTotal,
      });
    } catch (err: any) {
      setVoucherError(
        err?.response?.data?.message || "Invalid or expired promo code.",
      );
    } finally {
      setApplyingVoucher(false);
    }
  };

  // Bakong payment polling — pauses once expired so we stop hammering the
  // backend for a QR the customer can no longer pay against.
  // Bakong payment polling — pauses once expired so we stop hammering the
  // backend for a QR the customer can no longer pay against.
  useEffect(() => {
    if (
      selectedMethod !== "KHQR" ||
      !paymentData ||
      isSuccess ||
      khqrExpired ||
      paymentData.paymentStatus === "COMPLETED" ||
      !paymentData.transactionId
    ) {
      return;
    }

    clearPolling();
    pollingRef.current = setInterval(async () => {
      try {
        const result = await PaymentService.checkBakongMd5({
          transactionId: paymentData.transactionId,
        });

        // 👇 TEMP DEBUG — remove once confirmed working. Shows exactly
        // what the backend returns on every 3s poll.
        console.log("[KHQR poll]", result);

        // 👇 WIDENED — accept responseCode 0 (the documented success case)
        // OR an explicit COMPLETED/PAID status if the backend response
        // shape ever includes one, so we don't miss a real success due to
        // a field-naming mismatch.
        const isPaid =
          result?.responseCode === 0 ||
          String((result as any)?.paymentStatus ?? "").toUpperCase() ===
            "COMPLETED" ||
          String((result as any)?.status ?? "").toUpperCase() === "COMPLETED";

        if (isPaid) {
          clearPolling();
          clearKhqrCountdown();
          setIsSuccess(true);
          redirectTimeoutRef.current = setTimeout(() => {
            const targetRef = booking?.bookingNumber || booking?.id || bId;
            router.push(`/customer/tickets/${targetRef}`);
          }, 1500);
        }
      } catch (err) {
        // 👇 TEMP DEBUG — previously swallowed entirely. Log it so a real
        // backend error (500, transaction not found, etc.) during polling
        // doesn't fail totally silently every 3 seconds.
        console.warn("[KHQR poll] check failed (will retry):", err);
      }
    }, 3000);

    return () => clearPolling();
  }, [
    paymentData,
    isSuccess,
    khqrExpired,
    router,
    selectedMethod,
    booking,
    bId,
  ]);

  // 👇 NEW — 5-minute KHQR expiry countdown, mirroring the cash flow's
  // confirmation review timer. Starts once a pending QR is on screen and
  // stops itself the moment the payment succeeds or the customer leaves
  // the KHQR view.
  useEffect(() => {
    if (
      selectedMethod !== "KHQR" ||
      !paymentData ||
      isSuccess ||
      khqrExpired ||
      paymentData.paymentStatus === "COMPLETED"
    ) {
      clearKhqrCountdown();
      return;
    }

    clearKhqrCountdown();
    khqrIntervalRef.current = setInterval(() => {
      setKhqrCountdown((prev) => {
        if (prev <= 1) {
          clearKhqrCountdown();
          clearPolling();
          setKhqrExpired(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearKhqrCountdown();
  }, [selectedMethod, paymentData, isSuccess, khqrExpired]);

  // Reset the countdown whenever the customer leaves KHQR entirely (e.g.
  // "Change Payment Method") so coming back in fresh starts at 5:00 again.
  useEffect(() => {
    if (selectedMethod !== "KHQR") {
      setKhqrExpired(false);
      setKhqrCountdown(KHQR_COUNTDOWN_SECONDS);
      clearKhqrCountdown();
    }
  }, [selectedMethod]);

  useEffect(() => {
    return () => {
      clearPolling();
      clearRedirect();
      clearKhqrCountdown();
    };
  }, []);

  const formattedKhqrCountdown = useMemo(() => {
    const m = Math.floor(khqrCountdown / 60)
      .toString()
      .padStart(2, "0");
    const s = (khqrCountdown % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  }, [khqrCountdown]);

  const pageBg = isLight
    ? "bg-white text-slate-900"
    : "bg-slate-950 text-slate-100";
  const cardBg = isLight
    ? "bg-white border-slate-200"
    : "bg-slate-900/90 border-slate-800";
  const innerBg = isLight
    ? "bg-slate-50 border-slate-200"
    : "bg-slate-950 border-slate-800";
  const headingColor = isLight ? "text-slate-900" : "text-white";
  const mutedColor = isLight ? "text-slate-500" : "text-slate-400";

  const originalAmount = Number(booking?.totalAmount || 0);
  const displayTotal = appliedVoucher
    ? appliedVoucher.finalTotal
    : originalAmount;

  if (isSuccess) {
    return (
      <div
        className={`min-h-screen flex items-center justify-center p-4 transition-colors ${pageBg}`}
      >
        <div
          className={`w-full max-w-md rounded-3xl border p-6 sm:p-8 shadow-2xl ${cardBg}`}
        >
          <div className="flex min-h-[320px] flex-col items-center justify-center text-center gap-4">
            <div
              className={`flex h-16 w-16 items-center justify-center rounded-full border ${isLight ? "bg-emerald-50 border-emerald-200" : "bg-emerald-500/20 border-emerald-500/30"}`}
            >
              <CheckCircle2 className="h-9 w-9 text-emerald-400" />
            </div>
            <div>
              <h1 className={`text-xl font-black ${headingColor}`}>
                Booking Confirmed!
              </h1>
              <p className={`mt-2 text-xs ${mutedColor}`}>
                Your reservation has been recorded successfully.
              </p>
              <p
                className={`mt-1 text-xs ${isLight ? "text-slate-400" : "text-slate-500"}`}
              >
                Redirecting to your ticket details...
              </p>
            </div>
            <Loader2 className="mt-2 h-5 w-5 animate-spin text-emerald-400" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`min-h-screen flex items-center justify-center p-4 transition-colors ${pageBg}`}
    >
      <div
        className={`w-full max-w-md rounded-3xl border p-6 sm:p-8 backdrop-blur-xl shadow-2xl space-y-6 ${cardBg}`}
      >
        {selectedMethod && (
          <button
            type="button"
            onClick={() => setSelectedMethod(null)}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-red-500 hover:text-red-400 transition cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Change Payment Method</span>
          </button>
        )}

        {!selectedMethod && (
          <div className="space-y-4">
            <div className="text-center space-y-1">
              <h1
                className={`text-lg font-black tracking-tight ${headingColor}`}
              >
                Select Payment Method
              </h1>
              <p className={`text-xs ${mutedColor}`}>
                Choose how you would like to complete your booking.
              </p>
            </div>

            <div className="space-y-3 pt-2">
              {/* Credit / Debit Card */}
              <button
                type="button"
                onClick={() => handleSelectMethod("CARD")}
                disabled={!ENABLED_METHODS.CARD}
                className={`w-full flex items-center justify-between p-4 rounded-2xl border transition group ${innerBg} ${
                  ENABLED_METHODS.CARD
                    ? "cursor-pointer hover:border-red-500/50"
                    : "cursor-not-allowed opacity-60"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-500 group-hover:scale-105 transition">
                    <CreditCard className="h-5 w-5" />
                  </div>
                  <div className="text-left">
                    <p className={`text-xs font-bold ${headingColor}`}>
                      Credit / Debit Card
                    </p>
                    <p className={`text-[10px] ${mutedColor}`}>
                      Pay securely via Stripe Card
                    </p>
                  </div>
                </div>
                {ENABLED_METHODS.CARD ? (
                  <span className="text-xs font-bold text-red-500">Select</span>
                ) : (
                  <span
                    className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full ${
                      isLight
                        ? "bg-slate-200 text-slate-500"
                        : "bg-slate-800 text-slate-400"
                    }`}
                  >
                    Coming Soon
                  </span>
                )}
              </button>

              {/* Bakong KHQR */}
              <button
                type="button"
                onClick={() => handleSelectMethod("KHQR")}
                disabled={!ENABLED_METHODS.KHQR}
                className={`w-full flex items-center justify-between p-4 rounded-2xl border transition group ${innerBg} ${
                  ENABLED_METHODS.KHQR
                    ? "cursor-pointer hover:border-red-500/50"
                    : "cursor-not-allowed opacity-60"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/10 text-red-500 group-hover:scale-105 transition">
                    <QrCode className="h-5 w-5" />
                  </div>
                  <div className="text-left">
                    <p className={`text-xs font-bold ${headingColor}`}>
                      Bakong KHQR
                    </p>
                    <p className={`text-[10px] ${mutedColor}`}>
                      Scan with ABA, Bakong, or any app
                    </p>
                  </div>
                </div>
                {ENABLED_METHODS.KHQR ? (
                  <span className="text-xs font-bold text-red-500">Select</span>
                ) : (
                  <span
                    className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full ${
                      isLight
                        ? "bg-slate-200 text-slate-500"
                        : "bg-slate-800 text-slate-400"
                    }`}
                  >
                    Coming Soon
                  </span>
                )}
              </button>

              {/* Counter Cash */}
              <button
                type="button"
                onClick={() => handleSelectMethod("CASH")}
                disabled={!ENABLED_METHODS.CASH}
                className={`w-full flex items-center justify-between p-4 rounded-2xl border transition group ${innerBg} ${
                  ENABLED_METHODS.CASH
                    ? "cursor-pointer hover:border-red-500/50"
                    : "cursor-not-allowed opacity-60"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500 group-hover:scale-105 transition">
                    <Banknote className="h-5 w-5" />
                  </div>
                  <div className="text-left">
                    <p className={`text-xs font-bold ${headingColor}`}>
                      Counter Cash
                    </p>
                    <p className={`text-[10px] ${mutedColor}`}>
                      Pay physically at the cinema counter
                    </p>
                  </div>
                </div>
                {ENABLED_METHODS.CASH ? (
                  <span className="text-xs font-bold text-red-500">Select</span>
                ) : (
                  <span
                    className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full ${
                      isLight
                        ? "bg-slate-200 text-slate-500"
                        : "bg-slate-800 text-slate-400"
                    }`}
                  >
                    Coming Soon
                  </span>
                )}
              </button>
            </div>
          </div>
        )}

        {errorMsg && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {selectedMethod === "KHQR" && (
          <div className="text-center space-y-4 py-2">
            {loading && !paymentData ? (
              <div className="flex min-h-[220px] flex-col items-center justify-center gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-red-500" />
                <p className={`text-xs ${mutedColor}`}>
                  Generating your KHQR code...
                </p>
              </div>
            ) : khqrExpired ? (
              // 👇 NEW — QR expired state. Polling and countdown are both
              // already stopped by this point; give the customer a clear
              // way to get a fresh QR instead of scanning a dead one.
              <div className="flex min-h-[220px] flex-col items-center justify-center gap-4 py-2">
                <div
                  className={`flex h-14 w-14 items-center justify-center rounded-2xl border ${isLight ? "bg-slate-100 border-slate-200 text-slate-400" : "bg-slate-800/60 border-slate-700 text-slate-500"}`}
                >
                  <TimerOff className="h-7 w-7" />
                </div>
                <div className="space-y-1">
                  <h2 className={`text-sm font-bold ${headingColor}`}>
                    QR Code Expired
                  </h2>
                  <p className={`text-xs ${mutedColor}`}>
                    Your 5-minute payment window has ended. Generate a new QR
                    code to continue.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleRegenerateKhqr}
                  disabled={loading}
                  className="inline-flex items-center gap-2 rounded-2xl bg-red-500 hover:bg-red-400 px-5 py-2.5 text-xs font-black text-white shadow-lg shadow-red-500/25 transition cursor-pointer disabled:opacity-60"
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCcw className="h-4 w-4" />
                  )}
                  <span>Generate New QR</span>
                </button>
              </div>
            ) : paymentData ? (
              <>
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-500/10 text-red-500 border border-red-500/20">
                  <QrCode className="h-7 w-7" />
                </div>
                <div className="space-y-1">
                  <h2 className={`text-sm font-bold ${headingColor}`}>
                    Scan to Pay with Bakong
                  </h2>
                  <p className={`text-xs ${mutedColor}`}>
                    Open ABA Mobile, Bakong, or any supporting banking app and
                    scan the code below.
                  </p>
                </div>

                {paymentData.qrCodeImageBase64 && (
                  <div className="flex justify-center">
                    <img
                      src={paymentData.qrCodeImageBase64}
                      alt="Bakong KHQR Code"
                      className={`h-56 w-56 rounded-2xl border p-3 ${isLight ? "border-slate-200 bg-white" : "border-slate-700 bg-white"}`}
                    />
                  </div>
                )}

                {/* 👇 NEW — 5-minute expiry countdown, same badge style used
                    on the seat booking page's cash confirmation review. */}
                <div
                  className={`flex items-center justify-center gap-1.5 rounded-full px-2.5 py-1 mx-auto w-fit text-[11px] font-bold ${isLight ? "bg-red-50 text-red-600" : "bg-red-500/10 text-red-400"}`}
                >
                  <Clock className="h-3 w-3" />
                  <span>Expires in {formattedKhqrCountdown}</span>
                </div>

                <div
                  className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-[11px] ${isLight ? "border-amber-200 bg-amber-50 text-amber-700" : "border-amber-500/20 bg-amber-500/5 text-amber-400"}`}
                >
                  <Clock className="h-3.5 w-3.5" />
                  <span>Waiting for payment confirmation...</span>
                </div>

                <div className="flex justify-between items-center pt-1 border-t border-slate-700/40 text-xs font-mono">
                  <span className={mutedColor}>Amount Due:</span>
                  <span className="font-bold text-red-400">
                    ${Number(paymentData.amount ?? displayTotal).toFixed(2)}{" "}
                    {paymentData.currency || "USD"}
                  </span>
                </div>

                <div className="flex items-center justify-center gap-1.5 text-[10px] text-slate-500">
                  <Lock className="h-3 w-3" />
                  <span>Secured by Bakong / NBC</span>
                </div>
              </>
            ) : null}
          </div>
        )}

        {selectedMethod === "CASH" && (
          <div className="text-center space-y-4 py-2">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
              <Banknote className="h-7 w-7" />
            </div>
            <div className="space-y-1">
              <h2 className={`text-sm font-bold ${headingColor}`}>
                Pay at Counter Selected
              </h2>
              <p className={`text-xs ${mutedColor}`}>
                Please proceed to the cinema ticket counter to pay in cash and
                collect your physical ticket.
              </p>
            </div>

            {/* --- PROMOTIONAL VOUCHER SECTION --- */}
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
                    onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
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

              <div className="flex justify-between items-center pt-1 border-t border-slate-700/40 text-xs font-mono">
                <span className={mutedColor}>Total Amount:</span>
                <span className="font-bold text-emerald-400">
                  ${displayTotal.toFixed(2)} USD
                </span>
              </div>
            </div>
            {/* ----------------------------------- */}

            <button
              type="button"
              onClick={handleCashPayment}
              disabled={loading}
              className="w-full rounded-2xl bg-emerald-600 py-3 text-xs font-bold text-white shadow-lg shadow-emerald-600/30 hover:bg-emerald-500 transition cursor-pointer disabled:opacity-50"
            >
              {loading && (
                <Loader2 className="h-4 w-4 animate-spin inline mr-2" />
              )}
              Confirm Cash Booking
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
