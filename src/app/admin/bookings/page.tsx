"use client";

import { useEffect, useState, useMemo } from "react";
import {
  Ticket,
  Search,
  Loader2,
  Clock,
  X,
  CheckCircle2,
  XCircle,
  Building2,
  Tv,
  Film,
  Check,
  Download,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Ban,
} from "lucide-react";
import Toast from "@/app/components/Toast";
import ConfirmDialog from "@/app/components/ConfirmDialog";
import { BookingResponse, BookingStatus, MovieResponse } from "@/app/types/api.types";
import { BookingService } from "@/app/service/booking.service";
import MovieService from "@/app/service/movie.service";

const STATUS_BADGES: Record<
  BookingStatus,
  { label: string; color: string; icon: typeof CheckCircle2 }
> = {
  CONFIRMED: {
    label: "Confirmed",
    color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    icon: CheckCircle2,
  },
  CHECKED_IN: {
    label: "Checked-In",
    color: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    icon: CheckCircle2,
  },
  PENDING: {
    label: "Pending Payment",
    color: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    icon: Clock,
  },
  CANCELLED: {
    label: "Cancelled",
    color: "bg-red-500/10 text-red-400 border-red-500/20",
    icon: XCircle,
  },
};

const extractArray = <T,>(res: any): T[] => {
  if (Array.isArray(res)) return res;
  if (Array.isArray(res?.content)) return res.content;
  if (Array.isArray(res?.data)) return res.data;
  if (Array.isArray(res?.body?.data)) return res.body.data;
  if (Array.isArray(res?.data?.content)) return res.data.content;
  return [];
};

// Helper function to format 24-hour time to 12-hour AM/PM
const formatDateTime = (dateString?: string) => {
  if (!dateString) return "N/A";
  try {
    const cleaned = dateString.replace("T", " ");
    const [datePart, timePart] = cleaned.split(" ");
    if (!timePart) return cleaned;

    const [hourStr, minuteStr] = timePart.split(":");
    let hour = parseInt(hourStr, 10);
    const ampm = hour >= 12 ? "PM" : "AM";
    hour = hour % 12;
    hour = hour ? hour : 12;

    return `${datePart} • ${hour}:${minuteStr} ${ampm}`;
  } catch {
    return dateString;
  }
};

export default function AdminBookingsPage() {
  const [bookings, setBookings] = useState<BookingResponse[]>([]);
  const [moviesList, setMoviesList] = useState<MovieResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  // Multi-select state for bulk actions
  const [selectedBookingIds, setSelectedBookingIds] = useState<number[]>([]);

  // Pagination state
  const [page, setPage] = useState(0);
  const pageSize = 10;

  // Detail Modal State
  const [selectedBooking, setSelectedBooking] = useState<BookingResponse | null>(null);

  // Cancellation Confirm Dialog State
  const [cancelDialog, setCancelDialog] = useState<{
    isOpen: boolean;
    booking: BookingResponse | null;
    isBulk?: boolean;
  }>({
    isOpen: false,
    booking: null,
    isBulk: false,
  });
  const [cancelLoading, setCancelLoading] = useState(false);

  // Toast
  const [toast, setToast] = useState<{ message: string | null; type: "success" | "error" }>({
    message: null,
    type: "success",
  });

  const loadData = async (isBackground = false) => {
    if (!isBackground) setLoading(true);
    try {
      const [bookingsRes, moviesRes] = await Promise.all([
        BookingService.getAllBookings(),
        MovieService.getAllMovies({ size: 100 }),
      ]);
      setBookings(extractArray<BookingResponse>(bookingsRes));
      setMoviesList(extractArray<MovieResponse>(moviesRes));
    } catch (err) {
      if (!isBackground) {
        setToast({ message: "Failed to load bookings or movies data.", type: "error" });
      }
    } finally {
      if (!isBackground) setLoading(false);
    }
  };

  useEffect(() => {
    loadData(false);

    // Auto-poll every 10 seconds so admin dashboard updates immediately with new customer bookings
    const pollInterval = setInterval(() => {
      loadData(true);
    }, 10000);

    return () => clearInterval(pollInterval);
  }, []);

  // Robust poster URL resolver preventing relative path root-fetching errors
  const getPosterUrl = (booking: BookingResponse & { moviePosterUrl?: string }) => {
    let rawUrl = booking.moviePosterUrl;
    if (!rawUrl && booking.movieTitle) {
      const matchedMovie = moviesList.find(
        (m) => m.title?.toLowerCase() === booking.movieTitle?.toLowerCase()
      );
      rawUrl = matchedMovie?.posterUrl;
    }

    if (!rawUrl) return null;
    if (rawUrl.startsWith("http")) return rawUrl;

    const cleanPath = rawUrl.startsWith("/") ? rawUrl.substring(1) : rawUrl;
    if (cleanPath.startsWith("uploads/")) {
      return `http://localhost:8080/${cleanPath}`;
    }
    return `http://localhost:8080/uploads/${cleanPath}`;
  };

  const handleToggleSelectOne = (id: number) => {
    setSelectedBookingIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAllCurrentPage = () => {
    if (paginatedBookings.every((b) => selectedBookingIds.includes(b.id))) {
      setSelectedBookingIds([]);
    } else {
      setSelectedBookingIds(paginatedBookings.map((b) => b.id));
    }
  };

  const handleCancelConfirm = async () => {
    setCancelLoading(true);
    try {
      if (cancelDialog.isBulk) {
        for (const id of selectedBookingIds) {
          await BookingService.cancelBooking(id);
        }
        setToast({
          message: `Successfully cancelled ${selectedBookingIds.length} customer bookings.`,
          type: "success",
        });
        setSelectedBookingIds([]);
      } else if (cancelDialog.booking) {
        await BookingService.cancelBooking(cancelDialog.booking.id);
        setToast({
          message: `Booking ${cancelDialog.booking.bookingNumber} cancelled successfully.`,
          type: "success",
        });
        if (selectedBooking?.id === cancelDialog.booking.id) {
          setSelectedBooking(null);
        }
      }
      setCancelDialog({ isOpen: false, booking: null, isBulk: false });
      await loadData(false);
    } catch (err: any) {
      setToast({
        message: err.response?.data?.status?.message || "Failed to cancel booking.",
        type: "error",
      });
    } finally {
      setCancelLoading(false);
    }
  };

  const filteredBookings = useMemo(() => {
    return bookings.filter((b) => {
      const query = searchQuery.toLowerCase().trim();
      const matchesSearch =
        b.bookingNumber?.toLowerCase().includes(query) ||
        b.userFullName?.toLowerCase().includes(query) ||
        b.userEmail?.toLowerCase().includes(query) ||
        b.movieTitle?.toLowerCase().includes(query) ||
        b.cinemaName?.toLowerCase().includes(query);

      const matchesStatus = statusFilter === "ALL" || b.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [bookings, searchQuery, statusFilter]);

  const totalPages = Math.ceil(filteredBookings.length / pageSize) || 1;
  const paginatedBookings = useMemo(() => {
    const start = page * pageSize;
    return filteredBookings.slice(start, start + pageSize);
  }, [filteredBookings, page]);

  const allCurrentPageSelected =
    paginatedBookings.length > 0 && paginatedBookings.every((b) => selectedBookingIds.includes(b.id));

  const handleExportCSV = () => {
    if (filteredBookings.length === 0) {
      setToast({ message: "No booking data to export.", type: "error" });
      return;
    }

    const headers = ["Booking Number", "Customer Name", "Customer Email", "Movie Title", "Cinema", "Hall", "Status", "Total Amount ($)"];
    const rows = filteredBookings.map((b) => [
      b.bookingNumber,
      `"${b.userFullName || "Customer"}"`,
      b.userEmail || "",
      `"${b.movieTitle || ""}"`,
      `"${b.cinemaName || ""}"`,
      `"${b.hallName || ""}"`,
      b.status,
      Number(b.totalAmount || 0).toFixed(2),
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `customer_bookings_report_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setToast({ message: "Bookings report downloaded successfully!", type: "success" });
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-8 max-w-7xl mx-auto space-y-6 pb-24">
      <Toast
        message={toast.message}
        type={toast.type}
        onClose={() => setToast({ message: null, type: "success" })}
      />

      <ConfirmDialog
        isOpen={cancelDialog.isOpen}
        type="HARD_DELETE"
        title={cancelDialog.isBulk ? "Cancel Selected Bookings?" : "Cancel Customer Booking?"}
        targetName={cancelDialog.isBulk ? `${selectedBookingIds.length} orders` : (cancelDialog.booking?.bookingNumber || "")}
        loading={cancelLoading}
        onConfirm={handleCancelConfirm}
        onCancel={() => setCancelDialog({ isOpen: false, booking: null, isBulk: false })}
      />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <Ticket className="h-6 w-6 text-red-500 shrink-0" />
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
              Customer Bookings Management
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Audit reservation orders, monitor ticket redemptions, execute bulk cancellations, and export audit reports
          </p>
        </div>

        <button
          onClick={handleExportCSV}
          className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-xs font-bold text-slate-200 hover:text-white hover:bg-slate-700 transition cursor-pointer shadow"
        >
          <Download className="h-4 w-4 text-emerald-400" />
          <span>Export CSV Report</span>
        </button>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(0);
            }}
            placeholder="Search booking #, customer, film, or branch..."
            className="w-full rounded-xl border border-slate-800 bg-slate-900/80 py-2.5 pl-10 pr-4 text-xs text-white placeholder-slate-500 outline-none focus:border-red-500 transition"
          />
        </div>

        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          {["ALL", "CONFIRMED", "CHECKED_IN", "PENDING", "CANCELLED"].map((st) => (
            <button
              key={st}
              onClick={() => {
                setStatusFilter(st);
                setPage(0);
              }}
              className={`rounded-xl px-3 py-2 text-xs font-bold transition cursor-pointer shrink-0 ${
                statusFilter === st
                  ? "bg-red-600 text-white shadow"
                  : "bg-slate-900 border border-slate-800 text-slate-400 hover:text-white"
              }`}
            >
              {st === "ALL" ? "All Orders" : st.replace("_", " ")}
            </button>
          ))}
        </div>
      </div>

      {/* Bookings Table */}
      {loading ? (
        <div className="flex min-h-[40vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-red-600" />
        </div>
      ) : paginatedBookings.length > 0 ? (
        <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60 backdrop-blur-md">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-800 bg-slate-950/70 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="px-4 py-4 w-12 text-center">
                    <button
                      type="button"
                      onClick={handleSelectAllCurrentPage}
                      className={`h-5 w-5 mx-auto rounded-lg border flex items-center justify-center transition cursor-pointer ${
                        allCurrentPageSelected
                          ? "bg-red-600 border-red-500 text-white shadow-md shadow-red-600/30"
                          : "border-slate-700 bg-slate-900 text-transparent hover:border-slate-500"
                      }`}
                      title={allCurrentPageSelected ? "Deselect All" : "Select All"}
                    >
                      <Check className="h-3.5 w-3.5 stroke-[3]" />
                    </button>
                  </th>
                  <th className="px-5 py-4">Booking Number</th>
                  <th className="px-5 py-4">Customer</th>
                  <th className="px-5 py-4">Movie & Hall</th>
                  <th className="px-5 py-4">Status</th>
                  <th className="px-5 py-4">Amount</th>
                  <th className="px-5 py-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {paginatedBookings.map((b) => {
                  const badge = STATUS_BADGES[b.status] || STATUS_BADGES.PENDING;
                  const Icon = badge.icon;
                  const isChecked = selectedBookingIds.includes(b.id);

                  return (
                    <tr key={b.id} className={`transition group ${isChecked ? "bg-red-950/20" : "hover:bg-slate-800/30"}`}>
                      <td className="px-4 py-3.5 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleSelectOne(b.id)}
                          className={`h-5 w-5 mx-auto rounded-lg border flex items-center justify-center transition cursor-pointer ${
                            isChecked
                              ? "bg-red-600 border-red-500 text-white shadow-md shadow-red-600/30"
                              : "border-slate-700 bg-slate-900 text-transparent hover:border-slate-500"
                          }`}
                        >
                          <Check className="h-3.5 w-3.5 stroke-[3]" />
                        </button>
                      </td>

                      <td className="px-5 py-3.5 font-mono font-bold text-white">
                        <span className="text-red-400">{b.bookingNumber}</span>
                        <p className="text-[10px] text-slate-500 font-sans mt-0.5">
                          {b.createdAt?.substring(0, 16) || "Recent"}
                        </p>
                      </td>

                      <td className="px-5 py-3.5 text-slate-300">
                        <div className="space-y-0.5">
                          <p className="font-bold text-white">{b.userFullName || "Customer"}</p>
                          <p className="text-[10px] text-slate-500">{b.userEmail}</p>
                        </div>
                      </td>

                      <td className="px-5 py-3.5 text-slate-300">
                        <div className="space-y-0.5">
                          <p className="font-bold text-white truncate max-w-[180px]">
                            {b.movieTitle}
                          </p>
                          <p className="text-[10px] text-slate-500">
                            {b.cinemaName} • {b.hallName}
                          </p>
                        </div>
                      </td>

                      <td className="px-5 py-3.5">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[10px] font-bold ${badge.color}`}
                        >
                          <Icon className="h-3 w-3" />
                          {badge.label}
                        </span>
                      </td>

                      <td className="px-5 py-3.5 font-mono font-bold text-emerald-400">
                        ${Number(b.totalAmount || 0).toFixed(2)}
                      </td>

                      <td className="px-5 py-3.5 text-right">
                        <button
                          onClick={() => setSelectedBooking(b)}
                          className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-bold text-slate-200 hover:text-white hover:border-slate-500 transition cursor-pointer"
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="flex min-h-[30vh] flex-col items-center justify-center rounded-2xl border border-slate-800 bg-slate-900/30 p-8 text-center text-slate-400 text-sm">
          <Ticket className="h-10 w-10 text-slate-600 mb-2" />
          <p>{searchQuery ? "No matching orders found." : "No bookings recorded in system."}</p>
        </div>
      )}

      {/* Floating Bulk Action Bar */}
      {selectedBookingIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-4 rounded-2xl border border-rose-500/40 bg-slate-950/90 px-5 py-3 shadow-2xl backdrop-blur-md animate-in slide-in-from-bottom-5">
          <span className="text-xs font-bold text-white">
            {selectedBookingIds.length} booking{selectedBookingIds.length > 1 ? "s" : ""} selected
          </span>
          <button
            onClick={() => setCancelDialog({ isOpen: true, booking: null, isBulk: true })}
            className="flex items-center gap-2 rounded-xl bg-rose-600 hover:bg-rose-500 px-4 py-2 text-xs font-bold text-white transition shadow-lg shadow-rose-600/30 cursor-pointer"
          >
            <Ban className="h-4 w-4" />
            <span>Cancel Selected Orders</span>
          </button>
        </div>
      )}

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between border-t border-slate-800/80 pt-4 text-xs gap-3">
          <span className="text-slate-400 font-medium">
            Page <span className="font-bold text-white">{page + 1}</span> of{" "}
            <span className="font-bold text-white">{totalPages}</span> ({filteredBookings.length} orders)
          </span>

          <div className="flex items-center gap-1.5 flex-wrap justify-center">
            <button
              onClick={() => setPage(0)}
              disabled={page === 0}
              className="p-2 rounded-xl border border-slate-800 bg-slate-900 text-slate-400 hover:text-white disabled:opacity-30 transition cursor-pointer"
              title="First Page"
            >
              <ChevronsLeft className="h-4 w-4" />
            </button>

            <button
              onClick={() => setPage((prev) => Math.max(prev - 1, 0))}
              disabled={page === 0}
              className="flex items-center gap-1 px-3 py-2 rounded-xl border border-slate-800 bg-slate-900 text-slate-300 hover:text-white disabled:opacity-30 transition cursor-pointer font-bold"
            >
              <ChevronLeft className="h-4 w-4" />
              <span>Prev</span>
            </button>

            {Array.from({ length: totalPages }, (_, i) => i)
              .filter((pNum) => pNum === 0 || pNum === totalPages - 1 || Math.abs(pNum - page) <= 1)
              .map((pNum, idx, arr) => {
                const showEllipsisBefore = idx > 0 && pNum - arr[idx - 1] > 1;
                return (
                  <div key={pNum} className="flex items-center gap-1.5">
                    {showEllipsisBefore && <span className="text-slate-600 px-1">...</span>}
                    <button
                      onClick={() => setPage(pNum)}
                      className={`h-9 w-9 rounded-xl border text-xs font-bold transition cursor-pointer flex items-center justify-center font-mono ${
                        page === pNum
                          ? "bg-red-600 border-red-500 text-white shadow-lg shadow-red-600/30"
                          : "border-slate-800 bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800"
                      }`}
                    >
                      {pNum + 1}
                    </button>
                  </div>
                );
              })}

            <button
              onClick={() => setPage((prev) => Math.min(prev + 1, totalPages - 1))}
              disabled={page >= totalPages - 1}
              className="flex items-center gap-1 px-3 py-2 rounded-xl border border-slate-800 bg-slate-900 text-slate-300 hover:text-white disabled:opacity-30 transition cursor-pointer font-bold"
            >
              <span>Next</span>
              <ChevronRight className="h-4 w-4" />
            </button>

            <button
              onClick={() => setPage(totalPages - 1)}
              disabled={page >= totalPages - 1}
              className="p-2 rounded-xl border border-slate-800 bg-slate-900 text-slate-400 hover:text-white disabled:opacity-30 transition cursor-pointer"
              title="Last Page"
            >
              <ChevronsRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Booking Details Drawer / Modal */}
      {selectedBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-lg rounded-3xl border border-slate-800 bg-slate-900 p-6 sm:p-8 shadow-2xl space-y-5">
            <button
              onClick={() => setSelectedBooking(null)}
              className="absolute right-5 top-5 text-slate-400 hover:text-white cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="border-b border-slate-800 pb-3">
              <span className="text-[10px] font-bold text-red-500 tracking-widest uppercase">
                Reservation Summary & Audit
              </span>
              <h2 className="text-base font-black text-white">{selectedBooking.bookingNumber}</h2>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-3">
              <div className="flex items-center gap-3">
                <div className="relative h-14 w-14 rounded-xl bg-slate-800 overflow-hidden shrink-0 border border-slate-700 flex items-center justify-center">
                  {getPosterUrl(selectedBooking) ? (
                    <img
                      src={getPosterUrl(selectedBooking)!}
                      alt={selectedBooking.movieTitle}
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                  ) : (
                    <Film className="h-5 w-5 text-slate-400" />
                  )}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">{selectedBooking.movieTitle}</h3>
                  <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                    <Building2 className="h-3 w-3 text-slate-500" />
                    <span>{selectedBooking.cinemaName}</span>
                    <span>•</span>
                    <Tv className="h-3 w-3 text-slate-500" />
                    <span>{selectedBooking.hallName}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs font-mono text-slate-300 pt-2 border-t border-slate-800">
                <div className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-emerald-400" />
                  <span>{formatDateTime(selectedBooking.startTime)}</span>
                </div>
                <span
                  className={`rounded-md border px-2 py-0.5 text-[10px] font-bold ${
                    STATUS_BADGES[selectedBooking.status]?.color
                  }`}
                >
                  {selectedBooking.status}
                </span>
              </div>
            </div>

            <div>
              <p className="text-xs font-bold text-slate-400 mb-2">Reserved Seat Tickets ({selectedBooking.tickets?.length || 0})</p>
              <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                {selectedBooking.tickets?.map((t, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2.5 rounded-xl border border-slate-800 bg-slate-950 text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <div className="h-7 w-7 rounded-lg bg-red-600/10 border border-red-500/20 flex items-center justify-center font-bold text-red-400 text-xs">
                        {t.seatCode}
                      </div>
                      <div>
                        <span className="font-semibold text-white">Row {t.seatRow}</span>
                        <span className="text-[10px] text-slate-500 ml-1.5">({t.seatType})</span>
                      </div>
                    </div>
                    <span className="font-mono font-bold text-emerald-400">
                      ${Number(t.price).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-800">
              <div>
                <p className="text-[10px] text-slate-500 uppercase font-bold">Total Bill</p>
                <p className="text-lg font-mono font-black text-emerald-400">
                  ${Number(selectedBooking.totalAmount).toFixed(2)}
                </p>
              </div>

              {selectedBooking.status !== "CANCELLED" && (
                <button
                  onClick={() => setCancelDialog({ isOpen: true, booking: selectedBooking, isBulk: false })}
                  className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2 text-xs font-bold text-red-400 hover:bg-red-500/20 transition cursor-pointer"
                >
                  Cancel Order
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}