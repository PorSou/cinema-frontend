"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Ticket,
  Loader2,
  Calendar,
  Clock,
  Building,
  ArrowLeft,
  QrCode,
  CheckCircle2,
  Printer,
} from "lucide-react";
import BookingService, { BookingResponse } from "@/app/service/booking.service";
import Toast from "@/app/components/Toast";

export default function CustomerTicketDetailPage({
  params,
}: {
  params: Promise<{ bookingNumber: string }>;
}) {
  const { bookingNumber } = use(params);
  const router = useRouter();

  const [booking, setBooking] = useState<BookingResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const [toast, setToast] = useState<{ message: string | null; type: "success" | "error" | "info" }>({
    message: null,
    type: "success",
  });

  useEffect(() => {
    async function loadTicketDetail() {
      try {
        const res = await BookingService.getByBookingNumber(bookingNumber);
        setBooking(res);
      } catch {
        setToast({ message: "Failed to load ticket details.", type: "error" });
      } finally {
        setLoading(false);
      }
    }
    if (bookingNumber) {
      loadTicketDetail();
    }
  }, [bookingNumber]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950">
        <Loader2 className="h-8 w-8 animate-spin text-red-600" />
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center text-slate-400 space-y-3">
        <h2 className="text-lg font-bold text-white">Ticket Not Found</h2>
        <p className="text-xs">The requested ticket reference could not be located.</p>
        <Link
          href="/customer/tickets"
          className="inline-flex items-center gap-1.5 rounded-xl bg-red-600 px-4 py-2 text-xs font-bold text-white shadow-md"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to My Tickets</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-10 space-y-8 text-slate-100 min-h-screen">
      <Toast message={toast.message} type={toast.type} duration={3500} onClose={() => setToast({ message: null, type: "success" })} />

      {/* Global Print Stylesheet for Real Thermal Receipt Styling */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-thermal-receipt, #printable-thermal-receipt * {
            visibility: visible;
          }
          #printable-thermal-receipt {
            position: absolute;
            left: 0;
            top: 0;
            width: 80mm; /* Standard thermal receipt width */
            background: white !important;
            color: black !important;
            font-family: 'Courier New', Courier, monospace !important;
            padding: 15px !important;
            border: none !important;
            box-shadow: none !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      {/* Screen Toolbar */}
      <div className="no-print flex items-center justify-between border-b border-slate-800 pb-4">
        <Link
          href="/customer/tickets"
          className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white transition"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Tickets</span>
        </Link>

        <button
          onClick={() => window.print()}
          className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 px-3.5 py-2 text-xs font-bold text-slate-200 hover:bg-slate-700 transition cursor-pointer"
        >
          <Printer className="h-3.5 w-3.5" />
          <span>Print Receipt</span>
        </button>
      </div>

      {/* Digital & Printable Pass Card Container */}
      <div 
        id="printable-thermal-receipt"
        className="rounded-3xl border border-slate-800 bg-slate-900/80 p-8 shadow-2xl backdrop-blur-md space-y-6 relative overflow-hidden mx-auto max-w-lg"
      >
        <div className="absolute top-0 right-0 transform translate-x-6 -translate-y-6 w-32 h-32 bg-red-600/10 rounded-full blur-2xl pointer-events-none" />

        {/* Receipt Header */}
        <div className="text-center border-b border-dashed border-slate-700 pb-4 space-y-1">
          <h2 className="text-xl font-black text-white tracking-wider uppercase">{booking.cinemaName || "CineMax Cinema"}</h2>
          <p className="text-xs font-bold text-slate-400 uppercase">Hall: {booking.hallName}</p>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="space-y-1 text-center sm:text-left">
            <span className="text-[10px] font-bold uppercase tracking-widest text-red-400">Movie Admission</span>
            <h3 className="text-xl font-black text-white">{booking.movieTitle}</h3>
          </div>
          <div className="px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold flex items-center gap-1.5 w-fit mx-auto sm:mx-0">
            <CheckCircle2 className="h-4 w-4" />
            <span>{booking.status}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs">
          <div className="space-y-4">
            <div>
              <p className="text-slate-500">Screening Time</p>
              <p className="font-bold text-white text-sm flex items-center gap-1.5 mt-0.5 font-mono">
                <Clock className="h-4 w-4 text-slate-400" />
                {booking.startTime?.replace("T", " ")}
              </p>
            </div>

            <div>
              <p className="text-slate-500">Assigned Seats</p>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {booking.tickets?.map((t, idx) => (
                  <span key={idx} className="px-2.5 py-1 rounded-lg bg-slate-800 font-mono text-xs text-red-400 border border-slate-700 font-bold">
                    Seat {t.seatCode} ({t.seatType})
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="flex flex-col items-center justify-center p-4 rounded-2xl bg-slate-950 border border-slate-800/80 text-center space-y-2">
            <div className="p-2 bg-white rounded-xl shadow-inner">
              <QrCode className="h-20 w-20 text-slate-950" />
            </div>
            <span className="font-mono text-[11px] font-bold text-slate-400 tracking-wider">
              #{booking.bookingNumber}
            </span>
          </div>
        </div>

        {/* Receipt Footer Info */}
        <div className="pt-4 border-t border-dashed border-slate-700 space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-slate-500">Trans No:</span>
            <span className="font-mono text-slate-300">{booking.bookingNumber}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-500">WorkStation:</span>
            <span className="font-mono text-slate-300">POS-CINE-01</span>
          </div>
          <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-sm font-bold">
            <span className="text-slate-400">Total Paid</span>
            <span className="font-mono text-amber-400">${Number(booking.totalAmount).toFixed(2)} USD</span>
          </div>
        </div>
      </div>
    </div>
  );
}