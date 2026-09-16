"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import {
  Ticket,
  Loader2,
  Clock,
  ArrowLeft,
  QrCode,
  CheckCircle2,
  AlertCircle,
  Printer,
  Coffee,
} from "lucide-react";

import BookingService from "@/app/service/booking.service";
import { PaymentService } from "@/app/service/payment.service";
import Toast from "@/app/components/Toast";
import { useSettings } from "@/app/context/SettingsContext";

/* ============================================================
   TYPES
============================================================ */

type ToastState = {
  message: string | null;
  type: "success" | "error" | "info";
};

/* ============================================================
   RESPONSE UNWRAPPER
============================================================ */

function unwrapResponse(response: any): any {
  let data = response;

  if (data?.data !== undefined) {
    data = data.data;
  }

  if (data?.body !== undefined) {
    data = data.body;
  }

  if (data?.data !== undefined) {
    data = data.data;
  }

  return data;
}

/* ============================================================
   DATE FORMAT
============================================================ */

function formatDateTime(value: any): string {
  if (!value) {
    return "N/A";
  }

  try {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return String(value).replace("T", " ");
    }

    return date.toLocaleString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return String(value).replace("T", " ");
  }
}

/* ============================================================
   MONEY FORMAT
============================================================ */

function formatMoney(value: any): string {
  const amount = Number(value);

  if (!Number.isFinite(amount)) {
    return "0.00";
  }

  return amount.toFixed(2);
}

/* ============================================================
   PAGE
============================================================ */

export default function CustomerTicketDetailPage({
  params,
}: {
  params: Promise<{ bookingNumber: string }>;
}) {
  const { bookingNumber } = use(params);

  const { theme } = useSettings();
  const isLight = theme === "light";

  /* ==========================================================
     STATE
  ========================================================== */

  const [booking, setBooking] = useState<any | null>(null);
  const [payment, setPayment] = useState<any | null>(null);

  const [loading, setLoading] = useState(true);
  const [paymentLoading, setPaymentLoading] = useState(false);

  const [toast, setToast] = useState<ToastState>({
    message: null,
    type: "success",
  });

  /* ==========================================================
     LOAD BOOKING + PAYMENT
  ========================================================== */

  useEffect(() => {
    let mounted = true;

    async function loadTicketDetail() {
      try {
        setLoading(true);

        let bookingResponse: any;

        if (/^\d+$/.test(bookingNumber)) {
          bookingResponse = await BookingService.getBookingById(
            Number(bookingNumber),
          );
        } else {
          bookingResponse =
            await BookingService.getByBookingNumber(bookingNumber);
        }

        const bookingData = unwrapResponse(bookingResponse);

        if (!mounted) {
          return;
        }

        if (!bookingData || typeof bookingData !== "object") {
          setBooking(null);
          return;
        }

        setBooking(bookingData);

        const bookingId = bookingData?.id;

        if (bookingId) {
          try {
            setPaymentLoading(true);

            const paymentResponse = await PaymentService.getByBookingId(
              Number(bookingId),
            );

            const paymentData = unwrapResponse(paymentResponse);

            if (mounted) {
              setPayment(paymentData);
            }
          } catch (paymentError) {
            console.warn("Could not load payment information:", paymentError);

            if (mounted) {
              setPayment(null);
            }
          } finally {
            if (mounted) {
              setPaymentLoading(false);
            }
          }
        }
      } catch (error) {
        console.error("Failed to load ticket details:", error);

        if (!mounted) {
          return;
        }

        setBooking(null);

        setToast({
          message: "Failed to load ticket details.",
          type: "error",
        });
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    if (bookingNumber) {
      loadTicketDetail();
    }

    return () => {
      mounted = false;
    };
  }, [bookingNumber]);

  /* ==========================================================
     PRINT
  ========================================================== */

  const handlePrintReceipt = () => {
    if (typeof window === "undefined") {
      return;
    }

    window.print();
  };

  /* ==========================================================
     LOADING
  ========================================================== */

  if (loading) {
    return (
      <div
        className={`flex min-h-screen items-center justify-center ${
          isLight ? "bg-white text-slate-900" : "bg-[#0b0c10] text-white"
        }`}
      >
        <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
      </div>
    );
  }

  /* ==========================================================
     NOT FOUND
  ========================================================== */

  if (!booking) {
    return (
      <div
        className={`flex min-h-screen items-center justify-center px-4 ${
          isLight ? "bg-white text-slate-900" : "bg-[#0b0c10] text-white"
        }`}
      >
        <div className="w-full max-w-md space-y-4 text-center">
          <Ticket className="mx-auto h-12 w-12 text-amber-500" />

          <h2 className="text-xl font-black">Ticket Not Found</h2>

          <p
            className={`text-sm ${
              isLight ? "text-slate-500" : "text-slate-400"
            }`}
          >
            The requested ticket could not be found.
          </p>

          <Link
            href="/customer/tickets"
            className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-5 py-2.5 text-xs font-black text-slate-950 transition hover:bg-amber-400 shadow-lg shadow-amber-500/20"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to My Tickets
          </Link>
        </div>
      </div>
    );
  }

  /* ==========================================================
     BOOKING DATA
  ========================================================== */

  const bookingStatus = String(booking?.status ?? "").toUpperCase();

  const paymentStatus = String(
    payment?.paymentStatus ?? payment?.status ?? "",
  ).toUpperCase();

  const isPaymentCompleted =
    paymentStatus === "COMPLETED" ||
    paymentStatus === "PAID" ||
    bookingStatus === "CONFIRMED" ||
    bookingStatus === "CHECKED_IN";

  const cinemaName =
    booking?.cinemaName || booking?.cinema?.name || "CINEMAX CINEMA";

  const hallName =
    booking?.hallName ||
    booking?.hall?.name ||
    booking?.screenName ||
    booking?.screen?.name ||
    "N/A";

  const movieTitle =
    booking?.movieTitle ||
    booking?.movie?.title ||
    booking?.showtime?.movie?.title ||
    "Movie";

  const startTime =
    booking?.startTime ||
    booking?.showtime?.startTime ||
    booking?.showTime?.startTime ||
    null;

  const bookingRef =
    booking?.bookingNumber ||
    booking?.bookingCode ||
    booking?.id ||
    bookingNumber;

  const totalAmount = Number(
    booking?.totalAmount ?? booking?.total ?? booking?.amount ?? 0,
  );

  const discountAmount = Number(
    booking?.discountAmount ?? booking?.discount ?? 0,
  );

  const subtotalAmount = totalAmount + discountAmount;

  const tickets = Array.isArray(booking?.tickets)
    ? booking.tickets
    : Array.isArray(booking?.bookingSeats)
      ? booking.bookingSeats
      : Array.isArray(booking?.seats)
        ? booking.seats
        : [];

  const concessionsList = Array.isArray(booking?.concessions)
    ? booking.concessions
    : Array.isArray(booking?.bookingConcessions)
      ? booking.bookingConcessions
      : Array.isArray(payment?.concessions)
        ? payment.concessions
        : [];

  const paymentMethod =
    payment?.paymentMethod || payment?.method || payment?.type || "CASH";

  /* ==========================================================
     THEME
  ========================================================== */

  const pageBg = isLight
    ? "bg-white text-slate-900"
    : "bg-[#0b0c10] text-slate-100";

  const cardBg = isLight
    ? "bg-slate-50 border-slate-200 shadow-xl"
    : "bg-slate-900/80 border-slate-800 shadow-2xl";

  const innerBoxBg = isLight
    ? "bg-white border-slate-200"
    : "bg-slate-950 border-slate-800";

  const titleColor = isLight ? "text-slate-900" : "text-white";

  const mutedColor = isLight ? "text-slate-500" : "text-slate-400";

  const borderColor = isLight ? "border-slate-200" : "border-slate-800";

  /* ==========================================================
     RENDER
  ========================================================== */

  return (
    <>
      <style jsx global>{`
        @media print {
          @page {
            size: 80mm 220mm;
            margin: 0 !important;
          }

          html {
            width: 80mm !important;
            min-width: 80mm !important;
            max-width: 80mm !important;
            height: 220mm !important;
            min-height: 220mm !important;
            max-height: 220mm !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow: hidden !important;
            background: #ffffff !important;
          }

          body {
            width: 80mm !important;
            min-width: 80mm !important;
            max-width: 80mm !important;
            height: 220mm !important;
            min-height: 220mm !important;
            max-height: 220mm !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow: hidden !important;
            background: #ffffff !important;
            color: #000000 !important;
            font-family: "Courier New", Courier, monospace !important;
          }

          body > div,
          #__next {
            width: 80mm !important;
            height: 220mm !important;
            min-height: 220mm !important;
            max-height: 220mm !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow: hidden !important;
            background: #ffffff !important;
          }

          body * {
            visibility: hidden !important;
          }

          #printable-thermal-receipt,
          #printable-thermal-receipt * {
            visibility: visible !important;
          }

          #printable-thermal-receipt {
            display: block !important;
            position: fixed !important;
            left: 0 !important;
            top: 0 !important;
            width: 80mm !important;
            min-width: 80mm !important;
            max-width: 80mm !important;
            margin: 0 !important;
            padding: 4mm !important;
            box-sizing: border-box !important;
            background: #ffffff !important;
            color: #000000 !important;
            border: none !important;
            border-radius: 0 !important;
            box-shadow: none !important;
            font-family: "Courier New", Courier, monospace !important;
            font-size: 10px !important;
            line-height: 1.25 !important;
          }

          #printable-thermal-receipt * {
            color: #000000 !important;
            background: transparent !important;
            background-color: transparent !important;
            border-color: #000000 !important;
            box-shadow: none !important;
            text-shadow: none !important;
            animation: none !important;
            transition: none !important;
          }

          #printable-thermal-receipt .pointer-events-none {
            display: none !important;
          }

          .no-print {
            display: none !important;
            visibility: hidden !important;
          }

          #printable-thermal-receipt .grid {
            display: block !important;
          }

          #printable-thermal-receipt .print-qr-box {
            width: 48mm !important;
            height: 32mm !important;
            margin-left: auto !important;
            margin-right: auto !important;
            padding: 3mm !important;
            border: 1px solid #000000 !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            box-sizing: border-box !important;
          }

          #printable-thermal-receipt .print-qr-icon {
            width: 22mm !important;
            height: 22mm !important;
          }

          *,
          *::before,
          *::after {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}</style>

      <main
        className={`min-h-screen px-4 py-10 transition-colors duration-300 ${pageBg}`}
      >
        <div className="mx-auto max-w-3xl">
          <div
            className={`no-print mb-8 flex items-center justify-between border-b pb-4 ${borderColor}`}
          >
            <Link
              href="/customer/tickets"
              className={`flex items-center gap-2 text-xs font-semibold transition ${
                isLight
                  ? "text-slate-600 hover:text-slate-950"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Tickets</span>
            </Link>

            <button
              type="button"
              onClick={handlePrintReceipt}
              className={`flex cursor-pointer items-center gap-2 rounded-xl border px-4 py-2.5 text-xs font-bold transition ${
                isLight
                  ? "border-slate-200 bg-white text-slate-700 shadow-sm hover:bg-slate-100"
                  : "border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700"
              }`}
            >
              <Printer className="h-4 w-4" />
              <span>Print Receipt</span>
            </button>
          </div>

          <section
            id="printable-thermal-receipt"
            className={`relative mx-auto max-w-lg space-y-6 overflow-hidden rounded-3xl border p-8 transition-colors duration-300 ${cardBg}`}
          >
            <div className="pointer-events-none absolute right-0 top-0 h-32 w-32 translate-x-6 -translate-y-6 rounded-full bg-amber-500/10 blur-2xl" />

            <header
              className={`space-y-1 border-b border-dashed pb-4 text-center ${isLight ? "border-slate-300" : "border-slate-700"}`}
            >
              <h1
                className={`text-xl font-black uppercase tracking-wider ${titleColor}`}
              >
                {cinemaName}
              </h1>

              <p className={`text-xs font-bold uppercase ${mutedColor}`}>
                HALL: {hallName}
              </p>
            </header>

            <div
              className={`flex flex-col justify-between gap-4 border-b pb-4 sm:flex-row sm:items-center ${borderColor}`}
            >
              <div className="space-y-1">
                <p className="text-[10px] font-bold uppercase tracking-widest text-amber-500">
                  Movie Admission & F&B
                </p>

                <h2 className={`text-xl font-black ${titleColor}`}>
                  {movieTitle}
                </h2>
              </div>

              {isPaymentCompleted ? (
                <div className="mx-auto flex w-fit items-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-bold text-emerald-500 sm:mx-0">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Paid Success</span>
                </div>
              ) : (
                <div className="mx-auto flex w-fit items-center gap-1.5 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs font-bold text-amber-500 sm:mx-0">
                  <AlertCircle className="h-4 w-4" />
                  <span>Payment Pending</span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 gap-6 text-xs sm:grid-cols-2">
              <div className="space-y-4">
                <div>
                  <p className={mutedColor}>Screening Time</p>

                  <p
                    className={`mt-1 flex items-center gap-1.5 font-mono text-sm font-bold ${titleColor}`}
                  >
                    <Clock className={`h-4 w-4 ${mutedColor}`} />
                    {formatDateTime(startTime)}
                  </p>
                </div>

                <div>
                  <p className={mutedColor}>Assigned Seats</p>

                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {tickets.length > 0 ? (
                      tickets.map((ticket: any, index: number) => {
                        const seatCode =
                          ticket?.seatCode ||
                          ticket?.seat?.code ||
                          ticket?.seatNumber ||
                          ticket?.seat?.seatNumber ||
                          "N/A";

                        const seatType =
                          ticket?.seatType || ticket?.seat?.type || "STANDARD";

                        return (
                          <span
                            key={ticket?.id || ticket?.seatId || index}
                            className={`rounded-lg border px-2.5 py-1 font-mono text-xs font-bold text-amber-500 ${
                              isLight
                                ? "border-slate-200 bg-white shadow-sm"
                                : "border-slate-700 bg-slate-800"
                            }`}
                          >
                            Seat {seatCode} ({seatType})
                          </span>
                        );
                      })
                    ) : (
                      <span className={mutedColor}>No seat information</span>
                    )}
                  </div>
                </div>

                {concessionsList.length > 0 && (
                  <div>
                    <p className={`flex items-center gap-1 ${mutedColor}`}>
                      <Coffee className="h-3.5 w-3.5 text-amber-500" /> Snacks &
                      F&B Pre-orders
                    </p>

                    <div className="mt-1 flex flex-col gap-1.5">
                      {concessionsList.map((item: any, index: number) => {
                        const itemName =
                          item?.itemName ||
                          item?.concessionItem?.name ||
                          item?.name ||
                          "Snack Item";
                        const qty = item?.quantity || 1;
                        const itemTotal =
                          Number(item?.totalPrice || item?.price || 0) *
                          (item?.totalPrice ? 1 : qty);

                        return (
                          <div
                            key={index}
                            className="flex items-center justify-between rounded-lg border px-2.5 py-1.5 font-mono text-xs font-bold text-amber-400 border-amber-500/30 bg-amber-500/10 shadow-sm"
                          >
                            <span>
                              {qty}x {itemName}
                            </span>
                            <span>${formatMoney(itemTotal)}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              <div
                className={`flex flex-col items-center justify-center space-y-2 rounded-2xl border p-4 text-center ${innerBoxBg}`}
              >
                <div className="print-qr-box rounded-xl bg-white p-2 shadow-inner">
                  <QrCode className="print-qr-icon h-20 w-20 text-slate-950" />
                </div>

                <span
                  className={`font-mono text-[11px] font-bold tracking-wider ${mutedColor}`}
                >
                  #{bookingRef}
                </span>
              </div>
            </div>

            <div
              className={`space-y-2 border-t border-dashed pt-4 text-xs ${
                isLight ? "border-slate-300" : "border-slate-700"
              }`}
            >
              <div className="flex items-center justify-between gap-4">
                <span className={mutedColor}>Booking Reference:</span>
                <span
                  className={`text-right font-mono font-bold ${
                    isLight ? "text-slate-800" : "text-slate-200"
                  }`}
                >
                  {bookingRef}
                </span>
              </div>

              <div className="flex items-center justify-between gap-4">
                <span className={mutedColor}>WorkStation:</span>
                <span className="font-mono font-bold">POS-CINE-01</span>
              </div>

              <div className="flex items-center justify-between gap-4">
                <span className={mutedColor}>Booking Status:</span>
                <span className="font-mono font-bold">
                  {bookingStatus || "N/A"}
                </span>
              </div>

              <div className="flex items-center justify-between gap-4">
                <span className={mutedColor}>Payment Status:</span>
                <span className="font-mono font-bold">
                  {paymentLoading
                    ? "LOADING..."
                    : paymentStatus ||
                      (isPaymentCompleted ? "COMPLETED" : "PENDING")}
                </span>
              </div>

              <div className="flex items-center justify-between gap-4">
                <span className={mutedColor}>Payment Method:</span>
                <span className="font-mono font-bold uppercase">
                  {paymentMethod}
                </span>
              </div>

              {discountAmount > 0 && (
                <>
                  <div className="flex items-center justify-between gap-4">
                    <span className={mutedColor}>Subtotal:</span>
                    <span className="font-mono">
                      ${formatMoney(subtotalAmount)} USD
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-4 text-emerald-400 font-bold">
                    <span>Voucher Discount:</span>
                    <span className="font-mono">
                      -${formatMoney(discountAmount)} USD
                    </span>
                  </div>
                </>
              )}

              <div
                className={`flex items-center justify-between border-t pt-3 text-sm font-black ${
                  isLight ? "border-slate-200" : "border-slate-800"
                }`}
              >
                <span className={mutedColor}>Total Paid</span>
                <span className="font-mono text-amber-500">
                  ${formatMoney(totalAmount)} USD
                </span>
              </div>
            </div>

            <footer
              className={`print-footer space-y-1 border-t border-dashed pt-4 text-center ${
                isLight ? "border-slate-300" : "border-slate-700"
              }`}
            >
              <p
                className={`text-[10px] font-bold uppercase tracking-widest ${mutedColor}`}
              >
                Thank You For Choosing CineMax
              </p>
              <p className={`text-[9px] ${mutedColor}`}>
                Please present this ticket and F&B receipt at the counter.
              </p>
            </footer>
          </section>
        </div>
      </main>

      {toast.message && (
        <Toast
          message={toast.message}
          type={toast.type}
          duration={3500}
          onClose={() =>
            setToast({
              message: null,
              type: "success",
            })
          }
        />
      )}
    </>
  );
}
