"use client";

import { useEffect, useState, useMemo } from "react";
import {
  CreditCard,
  Search,
  Loader2,
  QrCode,
  CheckCircle2,
  Clock,
  XCircle,
  RotateCcw,
  DollarSign,
  Receipt,
  Printer,
  X,
  Check,
  Download,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Ban,
} from "lucide-react";

import { PaymentResponse, PaymentStatus, PaymentMethod } from "@/app/types/api.types";
import Toast from "@/app/components/Toast";
import ConfirmDialog from "@/app/components/ConfirmDialog";
import { PaymentService } from "@/app/service/payment.service";

const STATUS_CONFIG: Record<
  PaymentStatus,
  { label: string; color: string; icon: typeof CheckCircle2 }
> = {
  COMPLETED: {
    label: "Completed",
    color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    icon: CheckCircle2,
  },
  PENDING: {
    label: "Pending",
    color: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    icon: Clock,
  },
  FAILED: {
    label: "Failed",
    color: "bg-red-500/10 text-red-400 border-red-500/20",
    icon: XCircle,
  },
  REFUNDED: {
    label: "Refunded",
    color: "bg-purple-500/10 text-purple-400 border-purple-500/20",
    icon: RotateCcw,
  },
};

const METHOD_LABELS: Record<PaymentMethod, { label: string; badge: string }> = {
  KHQR_BAKONG: {
    label: "Bakong KHQR",
    badge: "bg-red-600/10 border-red-500/20 text-red-400",
  },
  STRIPE_CARD: {
    label: "Stripe Card",
    badge: "bg-blue-600/10 border-blue-500/20 text-blue-400",
  },
  CASH: {
    label: "Counter Cash",
    badge: "bg-slate-800 border-slate-700 text-slate-300",
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

// Helper function to format 24-hour time string to 12-hour AM/PM format
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

export default function AdminPaymentsPage() {
  const [payments, setPayments] = useState<PaymentResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [methodFilter, setMethodFilter] = useState<string>("ALL");

  // Multi-select state for bulk actions
  const [selectedPaymentIds, setSelectedPaymentIds] = useState<number[]>([]);

  // Pagination state
  const [page, setPage] = useState(0);
  const pageSize = 10;

  const [selectedPayment, setSelectedPayment] = useState<PaymentResponse | null>(null);

  // Refund / Action Dialog State
  const [actionDialog, setActionDialog] = useState<{
    isOpen: boolean;
    payment: PaymentResponse | null;
    isBulk?: boolean;
  }>({
    isOpen: false,
    payment: null,
    isBulk: false,
  });
  const [actionLoading, setActionLoading] = useState(false);

  const [toast, setToast] = useState<{ message: string | null; type: "success" | "error" }>({
    message: null,
    type: "success",
  });

  const loadPayments = async () => {
    setLoading(true);
    try {
      const data = await PaymentService.getAllPayments();
      setPayments(extractArray<PaymentResponse>(data));
      setSelectedPaymentIds([]);
    } catch (err: any) {
      setToast({ message: "Failed to load payment records.", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPayments();
  }, []);

  const metrics = useMemo(() => {
    let totalRevenue = 0;
    let completedCount = 0;
    let pendingCount = 0;
    let failedCount = 0;

    payments.forEach((p) => {
      const amt = Number(p.amount || 0);
      if (p.paymentStatus === "COMPLETED") {
        totalRevenue += amt;
        completedCount++;
      } else if (p.paymentStatus === "PENDING") {
        pendingCount++;
      } else if (p.paymentStatus === "FAILED" || p.paymentStatus === "REFUNDED") {
        failedCount++;
      }
    });

    return { totalRevenue, completedCount, pendingCount, failedCount };
  }, [payments]);

  const filteredPayments = useMemo(() => {
    return payments.filter((p) => {
      const query = searchQuery.toLowerCase().trim();
      const matchesSearch =
        (p.transactionId && p.transactionId.toLowerCase().includes(query)) ||
        (p.bookingNumber && p.bookingNumber.toLowerCase().includes(query)) ||
        (p.customerName && p.customerName.toLowerCase().includes(query)) ||
        (p.customerEmail && p.customerEmail.toLowerCase().includes(query)) ||
        (p.movieTitle && p.movieTitle.toLowerCase().includes(query));

      const matchesStatus = statusFilter === "ALL" || p.paymentStatus === statusFilter;
      const matchesMethod = methodFilter === "ALL" || p.paymentMethod === methodFilter;

      return matchesSearch && matchesStatus && matchesMethod;
    });
  }, [payments, searchQuery, statusFilter, methodFilter]);

  // Pagination calculation
  const totalPages = Math.ceil(filteredPayments.length / pageSize) || 1;
  const paginatedPayments = useMemo(() => {
    const start = page * pageSize;
    return filteredPayments.slice(start, start + pageSize);
  }, [filteredPayments, page]);

  const allCurrentPageSelected =
    paginatedPayments.length > 0 && paginatedPayments.every((p) => selectedPaymentIds.includes(p.id));

  const handleToggleSelectOne = (id: number) => {
    setSelectedPaymentIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAllCurrentPage = () => {
    if (paginatedPayments.every((p) => selectedPaymentIds.includes(p.id))) {
      setSelectedPaymentIds([]);
    } else {
      setSelectedPaymentIds(paginatedPayments.map((p) => p.id));
    }
  };

  const handleActionConfirm = async () => {
    setActionLoading(true);
    try {
      if (actionDialog.isBulk) {
        for (const id of selectedPaymentIds) {
          await PaymentService.refundPayment(id);
        }
        setToast({
          message: `Successfully processed refunds for ${selectedPaymentIds.length} transactions.`,
          type: "success",
        });
        setSelectedPaymentIds([]);
      } else if (actionDialog.payment) {
        await PaymentService.refundPayment(actionDialog.payment.id);
        setToast({
          message: `Transaction ${actionDialog.payment.transactionId} refunded successfully.`,
          type: "success",
        });
        if (selectedPayment?.id === actionDialog.payment.id) {
          setSelectedPayment(null);
        }
      }
      setActionDialog({ isOpen: false, payment: null, isBulk: false });
      await loadPayments();
    } catch (err: any) {
      setToast({
        message: err.response?.data?.status?.message || "Failed to process payment action.",
        type: "error",
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleExportCSV = () => {
    if (filteredPayments.length === 0) {
      setToast({ message: "No payment records to export.", type: "error" });
      return;
    }

    const headers = ["Transaction Ref", "Booking Number", "Customer Name", "Customer Email", "Gateway", "Amount ($)", "Status", "Date"];
    const rows = filteredPayments.map((p) => [
      p.transactionId,
      p.bookingNumber || "",
      `"${p.customerName || "Customer"}"`,
      p.customerEmail || "",
      p.paymentMethod,
      Number(p.amount || 0).toFixed(2),
      p.paymentStatus,
      p.createdAt || "",
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `financial_audit_ledger_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setToast({ message: "Financial audit ledger exported successfully!", type: "success" });
  };

  const handlePrintReceipt = () => {
    window.print();
  };

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-6 pb-24">
      <Toast
        message={toast.message}
        type={toast.type}
        onClose={() => setToast({ message: null, type: "success" })}
      />

      <ConfirmDialog
        isOpen={actionDialog.isOpen}
        type="HARD_DELETE"
        title={actionDialog.isBulk ? "Refund Selected Transactions?" : "Refund Payment Record?"}
        targetName={actionDialog.isBulk ? `${selectedPaymentIds.length} records` : (actionDialog.payment?.transactionId || "")}
        loading={actionLoading}
        onConfirm={handleActionConfirm}
        onCancel={() => setActionDialog({ isOpen: false, payment: null, isBulk: false })}
      />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <CreditCard className="h-6 w-6 text-red-500 shrink-0" />
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
              Financial & Payment Audits Management
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Monitor revenue streams, inspect settlement hashes, execute bulk refunds, and export financial audit reports
          </p>
        </div>

        <button
          onClick={handleExportCSV}
          className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-xs font-bold text-slate-200 hover:text-white hover:bg-slate-700 transition cursor-pointer shadow"
        >
          <Download className="h-4 w-4 text-emerald-400" />
          <span>Export Ledger CSV</span>
        </button>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 backdrop-blur-md space-y-2 shadow-lg">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold">Total Revenue (USD)</span>
            <DollarSign className="h-4 w-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-black font-mono text-emerald-400">
            ${metrics.totalRevenue.toFixed(2)}
          </p>
          <span className="text-[10px] text-slate-500 font-semibold">
            From {metrics.completedCount} successful checkouts
          </span>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 backdrop-blur-md space-y-2 shadow-lg">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold">Successful Payments</span>
            <CheckCircle2 className="h-4 w-4 text-blue-400" />
          </div>
          <p className="text-2xl font-black font-mono text-white">{metrics.completedCount}</p>
          <span className="text-[10px] text-blue-400 font-semibold">Cleared Settlements</span>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 backdrop-blur-md space-y-2 shadow-lg">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold">Pending Awaiting Pay</span>
            <Clock className="h-4 w-4 text-amber-400" />
          </div>
          <p className="text-2xl font-black font-mono text-amber-400">{metrics.pendingCount}</p>
          <span className="text-[10px] text-slate-500 font-semibold">Awaiting customer transfer</span>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 backdrop-blur-md space-y-2 shadow-lg">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold">Failed / Refunded</span>
            <XCircle className="h-4 w-4 text-rose-400" />
          </div>
          <p className="text-2xl font-black font-mono text-rose-400">{metrics.failedCount}</p>
          <span className="text-[10px] text-slate-500 font-semibold">Cancelled or dropped sessions</span>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        <div className="relative w-full lg:max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(0);
            }}
            placeholder="Search txn ID, booking #, customer, film..."
            className="w-full rounded-xl border border-slate-800 bg-slate-900/80 py-2.5 pl-10 pr-4 text-xs text-white placeholder-slate-500 outline-none focus:border-red-500 transition"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(0);
            }}
            className="rounded-xl border border-slate-800 bg-slate-900/80 py-2.5 px-3 text-xs font-semibold text-white outline-none focus:border-red-500 cursor-pointer"
          >
            <option value="ALL">All Statuses</option>
            <option value="COMPLETED">Completed</option>
            <option value="PENDING">Pending</option>
            <option value="FAILED">Failed</option>
            <option value="REFUNDED">Refunded</option>
          </select>

          <select
            value={methodFilter}
            onChange={(e) => {
              setMethodFilter(e.target.value);
              setPage(0);
            }}
            className="rounded-xl border border-slate-800 bg-slate-900/80 py-2.5 px-3 text-xs font-semibold text-white outline-none focus:border-red-500 cursor-pointer"
          >
            <option value="ALL">All Gateways</option>
            <option value="KHQR_BAKONG">Bakong KHQR</option>
            <option value="STRIPE_CARD">Stripe Card</option>
            <option value="CASH">Counter Cash</option>
          </select>
        </div>
      </div>

      {/* Payments Table */}
      {loading ? (
        <div className="flex min-h-[40vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-red-600" />
        </div>
      ) : paginatedPayments.length > 0 ? (
        <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60 backdrop-blur-md shadow-xl">
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
                  <th className="px-5 py-4">Transaction Ref</th>
                  <th className="px-5 py-4">Order Reference</th>
                  <th className="px-5 py-4">Customer</th>
                  <th className="px-5 py-4">Gateway</th>
                  <th className="px-5 py-4">Settled Amount</th>
                  <th className="px-5 py-4">Status</th>
                  <th className="px-5 py-4 text-right">Audit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {paginatedPayments.map((p) => {
                  const status = STATUS_CONFIG[p.paymentStatus] || STATUS_CONFIG.PENDING;
                  const method = METHOD_LABELS[p.paymentMethod] || {
                    label: p.paymentMethod || "UNKNOWN",
                    badge: "bg-slate-800 text-slate-300",
                  };
                  const StatusIcon = status.icon;
                  const isChecked = selectedPaymentIds.includes(p.id);

                  return (
                    <tr key={p.id} className={`transition group ${isChecked ? "bg-red-950/20" : "hover:bg-slate-800/30"}`}>
                      <td className="px-4 py-3.5 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleSelectOne(p.id)}
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
                        <span className="text-slate-200">{p.transactionId}</span>
                        <p className="text-[10px] text-slate-500 font-sans mt-0.5">
                          {formatDateTime(p.paidAt || p.createdAt)}
                        </p>
                      </td>

                      <td className="px-5 py-3.5 font-mono text-red-400 font-bold">
                        {p.bookingNumber || "-"}
                      </td>

                      <td className="px-5 py-3.5 text-slate-300">
                        <p className="font-bold text-white">{p.customerName || "Customer"}</p>
                        <p className="text-[10px] text-slate-500">{p.customerEmail || "-"}</p>
                      </td>

                      <td className="px-5 py-3.5">
                        <span
                          className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-bold ${method.badge}`}
                        >
                          {p.paymentMethod === "KHQR_BAKONG" && <QrCode className="h-3 w-3" />}
                          {method.label}
                        </span>
                      </td>

                      <td className="px-5 py-3.5 font-mono font-bold text-emerald-400">
                        {p.currency === "KHR" ? "៛" : "$"}{Number(p.amount || 0).toFixed(2)}
                      </td>

                      <td className="px-5 py-3.5">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[10px] font-bold ${status.color}`}
                        >
                          <StatusIcon className="h-3 w-3" />
                          {status.label}
                        </span>
                      </td>

                      <td className="px-5 py-3.5 text-right">
                        <button
                          onClick={() => setSelectedPayment(p)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-bold text-slate-200 hover:text-white hover:border-slate-500 transition cursor-pointer"
                        >
                          <Receipt className="h-3 w-3 text-red-400" />
                          <span>Audit</span>
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
          <CreditCard className="h-10 w-10 text-slate-600 mb-2" />
          <p>{searchQuery ? "No matching payment records found." : "No transactions recorded."}</p>
        </div>
      )}

      {/* Floating Bulk Action Bar */}
      {selectedPaymentIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-4 rounded-2xl border border-rose-500/40 bg-slate-950/90 px-5 py-3 shadow-2xl backdrop-blur-md animate-in slide-in-from-bottom-5">
          <span className="text-xs font-bold text-white">
            {selectedPaymentIds.length} transaction{selectedPaymentIds.length > 1 ? "s" : ""} selected
          </span>
          <button
            onClick={() => setActionDialog({ isOpen: true, payment: null, isBulk: true })}
            className="flex items-center gap-2 rounded-xl bg-rose-600 hover:bg-rose-500 px-4 py-2 text-xs font-bold text-white transition shadow-lg shadow-rose-600/30 cursor-pointer"
          >
            <Ban className="h-4 w-4" />
            <span>Process Bulk Refunds</span>
          </button>
        </div>
      )}

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between border-t border-slate-800/80 pt-4 text-xs gap-3">
          <span className="text-slate-400 font-medium">
            Page <span className="font-bold text-white">{page + 1}</span> of{" "}
            <span className="font-bold text-white">{totalPages}</span> ({filteredPayments.length} records)
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

      {/* Payment Details Audit Modal */}
      {selectedPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900 p-6 sm:p-8 shadow-2xl space-y-4">
            <button
              onClick={() => setSelectedPayment(null)}
              className="absolute right-5 top-5 text-slate-400 hover:text-white cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="border-b border-slate-800 pb-3">
              <span className="text-[10px] font-bold text-red-500 tracking-widest uppercase">
                Payment Audit Receipt
              </span>
              <h2 className="text-base font-black text-white font-mono">
                {selectedPayment.transactionId}
              </h2>
            </div>

            <div className="space-y-2.5 text-xs bg-slate-950 p-4 rounded-2xl border border-slate-800">
              <div className="flex justify-between border-b border-slate-800/80 pb-2">
                <span className="text-slate-400">Order Ref:</span>
                <span className="font-mono font-bold text-red-400">
                  {selectedPayment.bookingNumber || "-"}
                </span>
              </div>
              <div className="flex justify-between border-b border-slate-800/80 pb-2">
                <span className="text-slate-400">Customer:</span>
                <span className="font-semibold text-white">
                  {selectedPayment.customerName || "Customer"}
                </span>
              </div>
              <div className="flex justify-between border-b border-slate-800/80 pb-2">
                <span className="text-slate-400">Movie Title:</span>
                <span className="font-semibold text-white">
                  {selectedPayment.movieTitle || "-"}
                </span>
              </div>
              <div className="flex justify-between border-b border-slate-800/80 pb-2">
                <span className="text-slate-400">Cinema & Hall:</span>
                <span className="text-slate-300">
                  {selectedPayment.cinemaName || "-"} • {selectedPayment.hallName || "-"}
                </span>
              </div>
              <div className="flex justify-between border-b border-slate-800/80 pb-2">
                <span className="text-slate-400">Payment Gateway:</span>
                <span className="font-semibold text-white">
                  {selectedPayment.paymentMethod?.replace("_", " ")}
                </span>
              </div>
              <div className="flex justify-between border-b border-slate-800/80 pb-2">
                <span className="text-slate-400">Timestamp:</span>
                <span className="font-mono text-emerald-400">
                  {formatDateTime(selectedPayment.paidAt || selectedPayment.createdAt)}
                </span>
              </div>
              <div className="flex justify-between pt-1">
                <span className="text-slate-400 font-bold">Total Settled:</span>
                <span className="font-mono font-black text-emerald-400 text-sm">
                  {selectedPayment.currency === "KHR" ? "៛" : "$"}{Number(selectedPayment.amount || 0).toFixed(2)}
                </span>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-between">
              <button
                onClick={handlePrintReceipt}
                className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-bold text-slate-300 hover:text-white transition cursor-pointer"
              >
                <Printer className="h-3.5 w-3.5" />
                <span>Print Record</span>
              </button>

              {selectedPayment.paymentStatus === "COMPLETED" && (
                <button
                  onClick={() => setActionDialog({ isOpen: true, payment: selectedPayment, isBulk: false })}
                  className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2 text-xs font-bold text-red-400 hover:bg-red-500/20 transition cursor-pointer"
                >
                  Refund Payment
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}