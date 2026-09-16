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
import {
  BookingResponse,
  BookingStatus,
  MovieResponse,
} from "@/app/types/api.types";
import { BookingService } from "@/app/service/booking.service";
import MovieService from "@/app/service/movie.service";
import { useSettings } from "@/app/context/SettingsContext";

const STATUS_BADGES: Record<
  BookingStatus,
  { label: string; color: string; icon: typeof CheckCircle2 }
> = {
  CONFIRMED: {
    label: "Confirmed",
    color:
      "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 font-bold",
    icon: CheckCircle2,
  },
  CHECKED_IN: {
    label: "Checked-In",
    color:
      "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30 font-bold",
    icon: CheckCircle2,
  },
  PENDING: {
    label: "Pending Payment",
    color:
      "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30 font-bold",
    icon: Clock,
  },
  CANCELLED: {
    label: "Cancelled",
    color:
      "bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/30 font-bold",
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
  const { theme } = useSettings();
  const isLight = theme === "light";

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
  const [selectedBooking, setSelectedBooking] =
    useState<BookingResponse | null>(null);

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
  const [toast, setToast] = useState<{
    message: string | null;
    type: "success" | "error";
  }>({
    message: null,
    type: "success",
  });

  const loadData = async (isBackground = false) => {
    if (!isBackground) setLoading(true);
    try {
      const [bookingsRes, moviesRes] = await Promise.all([
        BookingService.getAllBookings({ size: 1000 }), // Ensure a large enough size or unpaged endpoint is used so old data is never truncated
        MovieService.getAllMovies({ size: 100 }),
      ]);

      const fetchedBookings = extractArray<BookingResponse>(bookingsRes);

      // Sort newest first by creation date or ID to keep historical data intact safely
      fetchedBookings.sort((a, b) => {
        const dateA = new Date(a.createdAt || 0).getTime();
        const dateB = new Date(b.createdAt || 0).getTime();
        if (dateB !== dateA) return dateB - dateA;
        return b.id - a.id;
      });

      setBookings(fetchedBookings);
      setMoviesList(extractArray<MovieResponse>(moviesRes));
    } catch (err) {
      if (!isBackground) {
        setToast({
          message: "Failed to load bookings or movies data.",
          type: "error",
        });
      }
    } finally {
      if (!isBackground) setLoading(false);
    }
  };

  useEffect(() => {
    loadData(false);

    // Auto-poll every 10 seconds to catch new customer bookings without wiping history
    const pollInterval = setInterval(() => {
      loadData(true);
    }, 10000);

    return () => clearInterval(pollInterval);
  }, []);

  // Robust poster URL resolver preventing relative path root-fetching errors
  const getPosterUrl = (
    booking: BookingResponse & { moviePosterUrl?: string },
  ) => {
    let rawUrl = booking.moviePosterUrl;
    if (!rawUrl && booking.movieTitle) {
      const matchedMovie = moviesList.find(
        (m) => m.title?.toLowerCase() === booking.movieTitle?.toLowerCase(),
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
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
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
        message:
          err.response?.data?.status?.message || "Failed to cancel booking.",
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

  // Safe pagination guard if records decrease or filters change
  useEffect(() => {
    if (page >= totalPages && totalPages > 0) {
      setPage(totalPages - 1);
    }
  }, [filteredBookings.length, totalPages, page]);

  const paginatedBookings = useMemo(() => {
    const start = page * pageSize;
    return filteredBookings.slice(start, start + pageSize);
  }, [filteredBookings, page]);

  const allCurrentPageSelected =
    paginatedBookings.length > 0 &&
    paginatedBookings.every((b) => selectedBookingIds.includes(b.id));

  const handleExportCSV = () => {
    if (filteredBookings.length === 0) {
      setToast({ message: "No booking data to export.", type: "error" });
      return;
    }

    const headers = [
      "Booking Number",
      "Customer Name",
      "Customer Email",
      "Movie Title",
      "Cinema",
      "Hall",
      "Status",
      "Total Amount ($)",
    ];
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

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `customer_bookings_report_${new Date().toISOString().split("T")[0]}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setToast({
      message: "Bookings report downloaded successfully!",
      type: "success",
    });
  };

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
    ? "border-slate-300 bg-white text-slate-900 placeholder-slate-400 focus:border-red-500 shadow-sm font-bold"
    : "border-slate-800 bg-slate-900/90 text-white placeholder-slate-500 focus:border-red-500";

  const modalBgClass = isLight
    ? "border-slate-300 bg-white shadow-2xl shadow-slate-300/60 text-slate-900 ring-1 ring-slate-200"
    : "border-slate-800 bg-slate-900 shadow-2xl text-slate-100";

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

      <Toast
        message={toast.message}
        type={toast.type}
        duration={3500}
        onClose={() => setToast({ message: null, type: "success" })}
      />

      <ConfirmDialog
        isOpen={cancelDialog.isOpen}
        type="HARD_DELETE"
        title={
          cancelDialog.isBulk
            ? "Cancel Selected Bookings?"
            : "Cancel Customer Booking?"
        }
        targetName={
          cancelDialog.isBulk
            ? `${selectedBookingIds.length} orders`
            : cancelDialog.booking?.bookingNumber || ""
        }
        loading={cancelLoading}
        onConfirm={handleCancelConfirm}
        onCancel={() =>
          setCancelDialog({ isOpen: false, booking: null, isBulk: false })
        }
      />

      {/* Header */}
      <div
        className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b ${borderCol} pb-5`}
      >
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-600 shrink-0">
              <Ticket className="h-5 w-5" />
            </div>
            <div>
              <h1
                className={`text-xl sm:text-2xl font-black tracking-tight ${textPrimary} flex items-center gap-2`}
              >
                Customer Bookings Management
              </h1>
              <p className={`text-xs ${textSecondary} mt-0.5`}>
                Audit reservation orders, monitor ticket redemptions, execute
                bulk cancellations, and export audit reports
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={handleExportCSV}
          className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 text-xs font-bold transition cursor-pointer shadow-sm ${
            isLight
              ? "border-slate-300 bg-white text-slate-800 hover:bg-slate-100 shadow-sm"
              : "border-slate-700 bg-slate-800 text-slate-200 hover:text-white hover:bg-slate-700"
          }`}
        >
          <Download className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          <span>Export CSV Report</span>
        </button>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:max-w-md">
          <Search
            className={`absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 ${textSecondary}`}
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(0);
            }}
            placeholder="Search booking #, customer, film, or branch..."
            className={`w-full rounded-2xl border py-3 pl-10 pr-4 text-xs font-bold outline-none transition ${inputClass}`}
          />
        </div>

        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          {["ALL", "CONFIRMED", "CHECKED_IN", "PENDING", "CANCELLED"].map(
            (st) => (
              <button
                key={st}
                onClick={() => {
                  setStatusFilter(st);
                  setPage(0);
                }}
                className={`rounded-xl px-3.5 py-2 text-xs font-bold transition cursor-pointer shrink-0 ${
                  statusFilter === st
                    ? "bg-red-600 text-white shadow-lg shadow-red-600/30"
                    : `${isLight ? "bg-white border border-slate-300 text-slate-700 hover:text-slate-900 shadow-sm" : "bg-slate-900 border border-slate-800 text-slate-400 hover:text-white"}`
                }`}
              >
                {st === "ALL" ? "All Orders" : st.replace("_", " ")}
              </button>
            ),
          )}
        </div>
      </div>

      {/* Bookings Table */}
      {loading ? (
        <div className="flex min-h-[40vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-red-600" />
        </div>
      ) : paginatedBookings.length > 0 ? (
        <div
          className={`overflow-hidden rounded-3xl border ${cardClass} backdrop-blur-md shadow-xl`}
        >
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead
                className={`border-b ${borderCol} ${isLight ? "bg-slate-100 text-slate-700" : "bg-slate-950/60 text-slate-400"} text-[11px] font-black uppercase tracking-wider`}
              >
                <tr>
                  <th className="px-4 py-4 w-12 text-center">
                    <button
                      type="button"
                      onClick={handleSelectAllCurrentPage}
                      className={`h-5 w-5 mx-auto rounded-lg border flex items-center justify-center transition cursor-pointer ${
                        allCurrentPageSelected
                          ? "bg-red-600 border-red-500 text-white shadow-md shadow-red-600/30"
                          : `${isLight ? "border-slate-300 bg-white text-transparent" : "border-slate-700 bg-slate-900 text-transparent"} hover:border-slate-500`
                      }`}
                      title={
                        allCurrentPageSelected ? "Deselect All" : "Select All"
                      }
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
              <tbody
                className={`divide-y ${isLight ? "divide-slate-200 text-slate-900 font-medium" : "divide-slate-800/60 text-slate-300"}`}
              >
                {paginatedBookings.map((b) => {
                  const badge =
                    STATUS_BADGES[b.status] || STATUS_BADGES.PENDING;
                  const Icon = badge.icon;
                  const isChecked = selectedBookingIds.includes(b.id);

                  return (
                    <tr
                      key={b.id}
                      className={`transition group ${isChecked ? (isLight ? "bg-red-50" : "bg-red-950/20") : isLight ? "hover:bg-slate-100/70" : "hover:bg-slate-800/30"}`}
                    >
                      <td className="px-4 py-3.5 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleSelectOne(b.id)}
                          className={`h-5 w-5 mx-auto rounded-lg border flex items-center justify-center transition cursor-pointer ${
                            isChecked
                              ? "bg-red-600 border-red-500 text-white shadow-md shadow-red-600/30"
                              : `${isLight ? "border-slate-300 bg-white text-transparent" : "border-slate-700 bg-slate-900 text-transparent"} hover:border-slate-500`
                          }`}
                        >
                          <Check className="h-3.5 w-3.5 stroke-[3]" />
                        </button>
                      </td>

                      <td className="px-5 py-3.5 font-mono font-bold">
                        <span className="text-red-600 dark:text-red-400 font-black">
                          {b.bookingNumber}
                        </span>
                        <p
                          className={`text-[10px] ${textSecondary} font-sans mt-0.5 font-semibold`}
                        >
                          {b.createdAt?.substring(0, 16) || "Recent"}
                        </p>
                      </td>

                      <td className="px-5 py-3.5">
                        <div className="space-y-0.5">
                          <p className={`font-black ${textPrimary}`}>
                            {b.userFullName || "Customer"}
                          </p>
                          <p
                            className={`text-[10px] ${textSecondary} font-semibold`}
                          >
                            {b.userEmail}
                          </p>
                        </div>
                      </td>

                      <td className="px-5 py-3.5">
                        <div className="space-y-0.5">
                          <p
                            className={`font-black ${textPrimary} truncate max-w-[180px]`}
                          >
                            {b.movieTitle}
                          </p>
                          <p
                            className={`text-[10px] ${textSecondary} font-semibold`}
                          >
                            {b.cinemaName} • {b.hallName}
                          </p>
                        </div>
                      </td>

                      <td className="px-5 py-3.5">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[10px] font-black ${badge.color}`}
                        >
                          <Icon className="h-3 w-3" />
                          {badge.label}
                        </span>
                      </td>

                      <td className="px-5 py-3.5 font-mono font-black text-emerald-600 dark:text-emerald-400">
                        ${Number(b.totalAmount || 0).toFixed(2)}
                      </td>

                      <td className="px-5 py-3.5 text-right">
                        <button
                          onClick={() => setSelectedBooking(b)}
                          className={`rounded-xl border px-3.5 py-2 text-xs font-bold transition cursor-pointer shadow-sm ${
                            isLight
                              ? "border-slate-300 bg-white text-slate-800 hover:bg-slate-100 hover:text-slate-900 font-bold"
                              : "border-slate-700 bg-slate-800 text-slate-200 hover:text-white hover:border-slate-500"
                          }`}
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
        <div
          className={`flex min-h-[30vh] flex-col items-center justify-center rounded-3xl border ${cardClass} p-8 text-center ${textSecondary} text-sm shadow-xl`}
        >
          <Ticket className={`h-10 w-10 ${textMuted} mb-2`} />
          <p className={`font-black ${textPrimary}`}>
            {searchQuery
              ? "No matching orders found."
              : "No bookings recorded in system."}
          </p>
        </div>
      )}

      {/* Floating Bulk Action Bar */}
      {selectedBookingIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-4 rounded-2xl border border-rose-500/40 bg-slate-950/90 px-5 py-3 shadow-2xl backdrop-blur-md animate-in slide-in-from-bottom-5">
          <span className="text-xs font-bold text-white">
            {selectedBookingIds.length} booking
            {selectedBookingIds.length > 1 ? "s" : ""} selected
          </span>
          <button
            onClick={() =>
              setCancelDialog({ isOpen: true, booking: null, isBulk: true })
            }
            className="flex items-center gap-2 rounded-xl bg-rose-600 hover:bg-rose-500 px-4 py-2 text-xs font-bold text-white transition shadow-lg shadow-rose-600/30 cursor-pointer"
          >
            <Ban className="h-4 w-4" />
            <span>Cancel Selected Orders</span>
          </button>
        </div>
      )}

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div
          className={`flex flex-col sm:flex-row items-center justify-between border-t ${borderCol} pt-4 text-xs gap-3`}
        >
          <span className={textSecondary}>
            Page <span className={`font-black ${textPrimary}`}>{page + 1}</span>{" "}
            of <span className={`font-black ${textPrimary}`}>{totalPages}</span>{" "}
            ({filteredBookings.length} orders)
          </span>

          <div className="flex items-center gap-1.5 flex-wrap justify-center">
            <button
              onClick={() => setPage(0)}
              disabled={page === 0}
              className={`p-2 rounded-xl border ${borderCol} ${isLight ? "bg-white text-slate-800 hover:bg-slate-100 shadow-sm font-bold" : "bg-slate-900 text-slate-400 hover:text-white"} disabled:opacity-30 transition cursor-pointer`}
              title="First Page"
            >
              <ChevronsLeft className="h-4 w-4" />
            </button>

            <button
              onClick={() => setPage((prev) => Math.max(prev - 1, 0))}
              disabled={page === 0}
              className={`flex items-center gap-1 px-3 py-2 rounded-xl border ${borderCol} ${isLight ? "bg-white text-slate-800 hover:bg-slate-100 shadow-sm font-bold" : "bg-slate-900 text-slate-300 hover:text-white"} disabled:opacity-30 transition cursor-pointer`}
            >
              <ChevronLeft className="h-4 w-4" />
              <span>Prev</span>
            </button>

            {Array.from({ length: totalPages }, (_, i) => i)
              .filter(
                (pNum) =>
                  pNum === 0 ||
                  pNum === totalPages - 1 ||
                  Math.abs(pNum - page) <= 1,
              )
              .map((pNum, idx, arr) => {
                const showEllipsisBefore = idx > 0 && pNum - arr[idx - 1] > 1;
                return (
                  <div key={pNum} className="flex items-center gap-1.5">
                    {showEllipsisBefore && (
                      <span className="text-slate-500 px-1">...</span>
                    )}
                    <button
                      onClick={() => setPage(pNum)}
                      className={`h-9 w-9 rounded-xl border text-xs font-bold transition cursor-pointer flex items-center justify-center font-mono ${
                        page === pNum
                          ? "bg-red-600 border-red-500 text-white shadow-lg shadow-red-600/30"
                          : `${borderCol} ${isLight ? "bg-white text-slate-800 hover:bg-slate-100 shadow-sm font-bold" : "bg-slate-900 text-slate-400 hover:text-white"}`
                      }`}
                    >
                      {pNum + 1}
                    </button>
                  </div>
                );
              })}

            <button
              onClick={() =>
                setPage((prev) => Math.min(prev + 1, totalPages - 1))
              }
              disabled={page >= totalPages - 1}
              className={`flex items-center gap-1 px-3 py-2 rounded-xl border ${borderCol} ${isLight ? "bg-white text-slate-800 hover:bg-slate-100 shadow-sm font-bold" : "bg-slate-900 text-slate-300 hover:text-white"} disabled:opacity-30 transition cursor-pointer`}
            >
              <span>Next</span>
              <ChevronRight className="h-4 w-4" />
            </button>

            <button
              onClick={() => setPage(totalPages - 1)}
              disabled={page >= totalPages - 1}
              className={`p-2 rounded-xl border ${borderCol} ${isLight ? "bg-white text-slate-800 hover:bg-slate-100 shadow-sm font-bold" : "bg-slate-900 text-slate-400 hover:text-white"} disabled:opacity-30 transition cursor-pointer`}
              title="Last Page"
            >
              <ChevronsRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Booking Details Drawer / Modal */}
      {selectedBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div
            className={`relative w-full max-w-lg rounded-3xl border p-6 sm:p-8 shadow-2xl space-y-5 ${modalBgClass}`}
          >
            <button
              onClick={() => setSelectedBooking(null)}
              className={`absolute right-5 top-5 ${textSecondary} hover:${textPrimary} cursor-pointer p-1 rounded-lg ${isLight ? "hover:bg-slate-100" : "hover:bg-slate-800"} transition`}
            >
              <X className="h-5 w-5" />
            </button>

            <div className={`border-b ${borderCol} pb-3`}>
              <span className="text-[10px] font-black text-red-600 dark:text-red-400 tracking-widest uppercase">
                Reservation Summary & Audit
              </span>
              <h2 className={`text-base font-black ${textPrimary}`}>
                {selectedBooking.bookingNumber}
              </h2>
            </div>

            <div
              className={`p-4 rounded-2xl ${isLight ? "bg-slate-50 border border-slate-300 shadow-sm" : "bg-slate-950/70 border border-slate-800"} space-y-3`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`relative h-14 w-14 rounded-xl ${isLight ? "bg-white border-slate-300 shadow-sm" : "bg-slate-800 border-slate-700"} overflow-hidden shrink-0 border flex items-center justify-center`}
                >
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
                  <h3 className={`text-sm font-black ${textPrimary}`}>
                    {selectedBooking.movieTitle}
                  </h3>
                  <div
                    className={`flex items-center gap-2 text-[11px] ${textSecondary} mt-0.5 font-bold`}
                  >
                    <Building2 className="h-3 w-3 text-slate-400" />
                    <span>{selectedBooking.cinemaName}</span>
                    <span>•</span>
                    <Tv className="h-3 w-3 text-slate-400" />
                    <span>{selectedBooking.hallName}</span>
                  </div>
                </div>
              </div>

              <div
                className={`flex items-center justify-between text-xs font-mono ${isLight ? "text-slate-800 font-bold" : "text-slate-300"} pt-2 border-t ${borderCol}`}
              >
                <div className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>{formatDateTime(selectedBooking.startTime)}</span>
                </div>
                <span
                  className={`rounded-md border px-2.5 py-1 text-[10px] font-black ${
                    STATUS_BADGES[selectedBooking.status]?.color
                  }`}
                >
                  {selectedBooking.status}
                </span>
              </div>
            </div>

            <div>
              <p className={`text-xs font-black ${textPrimary} mb-2`}>
                Reserved Seat Tickets ({selectedBooking.tickets?.length || 0})
              </p>
              <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                {selectedBooking.tickets?.map((t, idx) => (
                  <div
                    key={idx}
                    className={`flex items-center justify-between p-2.5 rounded-xl border ${borderCol} ${isLight ? "bg-slate-50 text-slate-900 font-bold shadow-sm" : "bg-slate-950 text-xs text-white font-bold"}`}
                  >
                    <div className="flex items-center gap-2">
                      <div className="h-7 w-7 rounded-lg bg-red-600/15 border border-red-500/30 flex items-center justify-center font-black text-red-600 dark:text-red-400 text-xs">
                        {t.seatCode}
                      </div>
                      <div>
                        <span className={`font-black ${textPrimary}`}>
                          Row {t.seatRow}
                        </span>
                        <span
                          className={`text-[10px] ${textSecondary} ml-1.5 font-bold`}
                        >
                          ({t.seatType})
                        </span>
                      </div>
                    </div>
                    <span className="font-mono font-black text-emerald-600 dark:text-emerald-400">
                      ${Number(t.price).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div
              className={`flex items-center justify-between pt-3 border-t ${borderCol}`}
            >
              <div>
                <p
                  className={`text-[10px] ${textSecondary} uppercase font-black`}
                >
                  Total Bill
                </p>
                <p className="text-lg font-mono font-black text-emerald-600 dark:text-emerald-400">
                  ${Number(selectedBooking.totalAmount).toFixed(2)}
                </p>
              </div>

              {selectedBooking.status !== "CANCELLED" && (
                <button
                  onClick={() =>
                    setCancelDialog({
                      isOpen: true,
                      booking: selectedBooking,
                      isBulk: false,
                    })
                  }
                  className="rounded-xl border border-red-500/30 bg-red-500/15 px-4 py-2 text-xs font-black text-red-600 dark:text-red-400 hover:bg-red-500/25 transition cursor-pointer"
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
