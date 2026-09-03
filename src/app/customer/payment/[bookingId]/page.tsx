"use client";

import {
  useEffect,
  useState,
  useRef,
  use,
} from "react";
import { useRouter } from "next/navigation";
import {
  QrCode,
  Loader2,
  CheckCircle2,
  Clock,
  ShieldCheck,
  AlertCircle,
  ArrowLeft,
} from "lucide-react";

import { PaymentService } from "@/app/service/payment.service";
import { PaymentResponse } from "@/app/types/api.types";
import { useSettings } from "@/app/context/SettingsContext";

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

  const [paymentData, setPaymentData] =
    useState<PaymentResponse | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [isSuccess, setIsSuccess] =
    useState(false);

  const [errorMsg, setErrorMsg] =
    useState<string | null>(null);

  const pollingRef =
    useRef<ReturnType<
      typeof setInterval
    > | null>(null);

  const redirectTimeoutRef =
    useRef<ReturnType<
      typeof setTimeout
    > | null>(null);

  const clearPolling = () => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  };

  const clearRedirect = () => {
    if (redirectTimeoutRef.current) {
      clearTimeout(
        redirectTimeoutRef.current
      );
      redirectTimeoutRef.current = null;
    }
  };

  useEffect(() => {
    let cancelled = false;

    async function initPayment() {
      if (!bId || Number.isNaN(bId)) {
        setErrorMsg("Invalid booking ID.");
        setLoading(false);
        return;
      }

      setLoading(true);
      setErrorMsg(null);

      try {
        const existingPayment =
          await PaymentService.getByBookingId(
            bId
          );

        if (cancelled) return;

        setPaymentData(existingPayment);

        if (
          existingPayment.paymentStatus ===
          "COMPLETED"
        ) {
          setIsSuccess(true);

          redirectTimeoutRef.current =
            setTimeout(() => {
              router.push(
                `/customer/tickets/${existingPayment.bookingNumber}`
              );
            }, 1500);
        }
      } catch (existingError: any) {
        if (cancelled) return;

        try {
          const newPayment =
            await PaymentService.generateKhqr({
              bookingId: bId,
              currency: "USD",
            });

          if (cancelled) return;

          setPaymentData(newPayment);

          if (
            newPayment.paymentStatus ===
            "COMPLETED"
          ) {
            setIsSuccess(true);

            redirectTimeoutRef.current =
              setTimeout(() => {
                router.push(
                  `/customer/tickets/${newPayment.bookingNumber}`
                );
              }, 1500);
          }
        } catch (generateError: any) {
          if (cancelled) return;

          const message =
            generateError?.response?.data
              ?.status?.message ||
            generateError?.response?.data
              ?.message ||
            generateError?.message ||
            "Failed to initialize payment gateway.";

          setErrorMsg(message);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    initPayment();

    return () => {
      cancelled = true;
      clearPolling();
      clearRedirect();
    };
  }, [bId, router]);

  useEffect(() => {
    if (
      !paymentData ||
      isSuccess ||
      paymentData.paymentStatus ===
        "COMPLETED"
    ) {
      return;
    }

    if (!paymentData.transactionId) {
      return;
    }

    clearPolling();

    pollingRef.current =
      setInterval(async () => {
        try {
          const result =
            await PaymentService.checkBakongMd5(
              {
                transactionId:
                  paymentData.transactionId,
              }
            );

          if (
            result?.responseCode === 0
          ) {
            clearPolling();

            setIsSuccess(true);

            redirectTimeoutRef.current =
              setTimeout(() => {
                router.push(
                  `/customer/tickets/${paymentData.bookingNumber}`
                );
              }, 1500);
          }
        } catch {
          // Payment is still pending.
        }
      }, 3000);

    return () => {
      clearPolling();
    };
  }, [
    paymentData,
    isSuccess,
    router,
  ]);

  useEffect(() => {
    return () => {
      clearPolling();
      clearRedirect();
    };
  }, []);

  const pageBg = isLight
    ? "bg-white text-slate-900"
    : "bg-slate-950 text-slate-100";

  const cardBg = isLight
    ? "bg-white border-slate-200"
    : "bg-slate-900/90 border-slate-800";

  const innerBg = isLight
    ? "bg-slate-50 border-slate-200"
    : "bg-slate-950 border-slate-800";

  const headingColor = isLight
    ? "text-slate-900"
    : "text-white";

  const mutedColor = isLight
    ? "text-slate-500"
    : "text-slate-400";

  const borderColor = isLight
    ? "border-slate-200"
    : "border-slate-800/60";

  if (loading) {
    return (
      <div
        className={`min-h-screen flex items-center justify-center p-4 transition-colors ${pageBg}`}
      >
        <div
          className={`w-full max-w-md rounded-3xl border p-8 shadow-2xl ${cardBg}`}
        >
          <div className="flex min-h-[300px] flex-col items-center justify-center gap-4">
            <div
              className={`flex h-14 w-14 items-center justify-center rounded-2xl border ${
                isLight
                  ? "bg-red-50 border-red-100"
                  : "bg-red-600/10 border-red-500/20"
              }`}
            >
              <Loader2 className="h-7 w-7 animate-spin text-red-500" />
            </div>

            <div className="text-center">
              <p
                className={`text-sm font-bold ${headingColor}`}
              >
                Preparing Payment
              </p>

              <p
                className={`mt-1 text-xs ${mutedColor}`}
              >
                Generating your secure KHQR
                payment...
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div
        className={`min-h-screen flex items-center justify-center p-4 transition-colors ${pageBg}`}
      >
        <div
          className={`w-full max-w-md rounded-3xl border p-6 sm:p-8 shadow-2xl ${cardBg}`}
        >
          <div className="flex flex-col items-center text-center gap-4">
            <div
              className={`flex h-14 w-14 items-center justify-center rounded-full border ${
                isLight
                  ? "bg-red-50 border-red-100"
                  : "bg-red-500/10 border-red-500/20"
              }`}
            >
              <AlertCircle className="h-7 w-7 text-red-400" />
            </div>

            <div>
              <h1
                className={`text-lg font-black ${headingColor}`}
              >
                Payment Error
              </h1>

              <p
                className={`mt-2 text-xs leading-5 ${mutedColor}`}
              >
                {errorMsg}
              </p>
            </div>

            <button
              type="button"
              onClick={() => router.back()}
              className="flex items-center gap-2 rounded-xl bg-red-600 px-5 py-3 text-xs font-bold text-white transition hover:bg-red-500"
            >
              <ArrowLeft className="h-4 w-4" />
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

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
              className={`flex h-16 w-16 items-center justify-center rounded-full border ${
                isLight
                  ? "bg-emerald-50 border-emerald-200"
                  : "bg-emerald-500/20 border-emerald-500/30"
              }`}
            >
              <CheckCircle2 className="h-9 w-9 text-emerald-400" />
            </div>

            <div>
              <h1
                className={`text-xl font-black ${headingColor}`}
              >
                Payment Received!
              </h1>

              <p
                className={`mt-2 text-xs ${mutedColor}`}
              >
                Your payment was successfully
                confirmed.
              </p>

              <p
                className={`mt-1 text-xs ${
                  isLight
                    ? "text-slate-400"
                    : "text-slate-500"
                }`}
              >
                Preparing your official
                admission ticket...
              </p>
            </div>

            <Loader2 className="mt-2 h-5 w-5 animate-spin text-emerald-400" />
          </div>

          <div
            className={`flex items-center justify-center gap-1.5 border-t pt-4 text-[10px] ${
              isLight
                ? "border-slate-200 text-slate-400"
                : "border-slate-800/60 text-slate-500"
            }`}
          >
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />

            <span>
              Secured by National Bank of
              Cambodia (NBC Bakong)
            </span>
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
        {/* Header */}
        <div className="text-center space-y-1">
          <div
            className={`inline-flex h-12 w-12 items-center justify-center rounded-2xl border text-red-500 mb-2 ${
              isLight
                ? "bg-red-50 border-red-100"
                : "bg-red-600/10 border-red-500/20"
            }`}
          >
            <QrCode className="h-6 w-6" />
          </div>

          <h1
            className={`text-lg font-black tracking-tight ${headingColor}`}
          >
            Scan to Pay with KHQR
          </h1>

          <p
            className={`text-xs leading-5 ${mutedColor}`}
          >
            Scan via Bakong, ABA Mobile, or any
            supported Cambodian banking app.
          </p>
        </div>

        {paymentData && (
          <>
            {/* QR */}
            <div className="relative mx-auto flex w-fit flex-col items-center justify-center rounded-2xl bg-white p-4 text-slate-950 shadow-inner">
              {paymentData.qrCodeImageBase64 ? (
                <img
                  src={
                    paymentData.qrCodeImageBase64
                  }
                  alt="Bakong KHQR payment"
                  className="h-48 w-48 object-contain"
                />
              ) : (
                <div className="flex h-48 w-48 items-center justify-center text-xs text-slate-400">
                  QR Format Error
                </div>
              )}

              <span className="mt-2 text-[10px] font-black uppercase tracking-widest text-red-600">
                KHQR BAKONG
              </span>
            </div>

            {/* Booking information */}
            <div
              className={`rounded-2xl border p-4 space-y-3 text-xs ${innerBg}`}
            >
              <div
                className={`flex items-center justify-between gap-4 border-b pb-3 ${
                  isLight
                    ? "border-slate-200"
                    : "border-slate-800/80"
                }`}
              >
                <span className={mutedColor}>
                  Booking Reference
                </span>

                <span className="font-mono font-bold text-red-500">
                  {paymentData.bookingNumber ||
                    "-"}
                </span>
              </div>

              <div className="flex items-center justify-between gap-4">
                <span className={mutedColor}>
                  Total Amount
                </span>

                <span className="font-mono text-base font-black text-emerald-500">
                  $
                  {Number(
                    paymentData.amount || 0
                  ).toFixed(2)}{" "}
                  USD
                </span>
              </div>
            </div>

            {/* Waiting status */}
            <div
              className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-3 text-center text-xs ${
                isLight
                  ? "border-amber-200 bg-amber-50 text-slate-500"
                  : "border-amber-500/10 bg-amber-500/5 text-slate-400"
              }`}
            >
              <Clock className="h-3.5 w-3.5 shrink-0 animate-pulse text-amber-400" />

              <span>
                Waiting for mobile transfer
                confirmation...
              </span>
            </div>
          </>
        )}

        {/* Security */}
        <div
          className={`flex items-center justify-center gap-1.5 border-t pt-4 text-[10px] ${
            isLight
              ? "border-slate-200 text-slate-400"
              : "border-slate-800/60 text-slate-500"
          }`}
        >
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />

          <span>
            Secured bsy National Bank of
            Cambodia (NBC Bakong)
          </span>
        </div>
      </div>
    </div>
  );
}
