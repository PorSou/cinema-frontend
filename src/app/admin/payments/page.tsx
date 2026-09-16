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
  ZoomIn,
  ZoomOut,
  Film,
} from "lucide-react";

import {
  PaymentResponse,
  PaymentStatus,
  PaymentMethod,
} from "@/app/types/api.types";
import Toast from "@/app/components/Toast";
import ConfirmDialog from "@/app/components/ConfirmDialog";
import { PaymentService } from "@/app/service/payment.service";
import { useSettings } from "@/app/context/SettingsContext";
import { AuthService } from "@/app/service/auth.service";

const STATUS_CONFIG: Record<
  PaymentStatus,
  { label: string; color: string; icon: typeof CheckCircle2 }
> = {
  COMPLETED: {
    label: "Completed",
    color:
      "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 font-bold",
    icon: CheckCircle2,
  },
  PENDING: {
    label: "Pending",
    color:
      "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30 font-bold",
    icon: Clock,
  },
  FAILED: {
    label: "Failed",
    color:
      "bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/30 font-bold",
    icon: XCircle,
  },
  REFUNDED: {
    label: "Refunded",
    color:
      "bg-purple-500/15 text-purple-700 dark:text-purple-400 border-purple-500/30 font-bold",
    icon: RotateCcw,
  },
};

const METHOD_LABELS: Record<PaymentMethod, { label: string; badge: string }> = {
  KHQR_BAKONG: {
    label: "Bakong KHQR",
    badge:
      "bg-red-600/10 border-red-500/20 text-red-600 dark:text-red-400 font-bold",
  },
  STRIPE_CARD: {
    label: "Stripe Card",
    badge:
      "bg-blue-600/10 border-blue-500/20 text-blue-600 dark:text-blue-400 font-bold",
  },
  CASH: {
    label: "Counter Cash",
    badge:
      "bg-slate-500/10 border-slate-500/20 text-slate-700 dark:text-slate-300 font-bold",
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
  const { theme } = useSettings();
  const isLight = theme === "light";

  const [currentUser, setCurrentUser] = useState<any>(null);
  const userRole = currentUser?.role?.toString().toUpperCase() || "";
  const isAdmin = userRole === "ADMIN" || userRole === "SUPER_ADMIN";

  const [payments, setPayments] = useState<PaymentResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [methodFilter, setMethodFilter] = useState<string>("ALL");

  const [selectedPaymentIds, setSelectedPaymentIds] = useState<number[]>([]);
  const [page, setPage] = useState(0);
  const pageSize = 10;

  const [selectedPayment, setSelectedPayment] =
    useState<PaymentResponse | null>(null);
  const [receiptZoom, setReceiptZoom] = useState<number>(100);

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

  const [toast, setToast] = useState<{
    message: string | null;
    type: "success" | "error";
  }>({
    message: null,
    type: "success",
  });

  useEffect(() => {
    const user = AuthService.getCurrentUser();
    if (user) setCurrentUser(user);
  }, []);

  const loadPayments = async (isBackground = false) => {
    if (!isBackground) setLoading(true);
    try {
      const data = await PaymentService.getAllPayments(0, 1000);
      const fetchedPayments = extractArray<PaymentResponse>(data);

      fetchedPayments.sort((a, b) => {
        const dateA = new Date(a.paidAt || a.createdAt || 0).getTime();
        const dateB = new Date(b.paidAt || b.createdAt || 0).getTime();
        if (dateB !== dateA) return dateB - dateA;
        return b.id - a.id;
      });

      setPayments(fetchedPayments);
    } catch (err: any) {
      if (!isBackground) {
        setToast({ message: "Failed to load payment records.", type: "error" });
      }
    } finally {
      if (!isBackground) setLoading(false);
    }
  };

  useEffect(() => {
    loadPayments(false);
    const pollInterval = setInterval(() => {
      loadPayments(true);
    }, 10000);

    return () => clearInterval(pollInterval);
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
      } else if (
        p.paymentStatus === "FAILED" ||
        p.paymentStatus === "REFUNDED"
      ) {
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

      const matchesStatus =
        statusFilter === "ALL" || p.paymentStatus === statusFilter;
      const matchesMethod =
        methodFilter === "ALL" || p.paymentMethod === methodFilter;

      return matchesSearch && matchesStatus && matchesMethod;
    });
  }, [payments, searchQuery, statusFilter, methodFilter]);

  const totalPages = Math.ceil(filteredPayments.length / pageSize) || 1;

  useEffect(() => {
    if (page >= totalPages && totalPages > 0) {
      setPage(totalPages - 1);
    }
  }, [filteredPayments.length, totalPages, page]);

  const paginatedPayments = useMemo(() => {
    const start = page * pageSize;
    return filteredPayments.slice(start, start + pageSize);
  }, [filteredPayments, page]);

  const allCurrentPageSelected =
    paginatedPayments.length > 0 &&
    paginatedPayments.every((p) => selectedPaymentIds.includes(p.id));

  const handleToggleSelectOne = (id: number) => {
    if (!isAdmin) return;
    setSelectedPaymentIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  const handleSelectAllCurrentPage = () => {
    if (!isAdmin) return;
    if (paginatedPayments.every((p) => selectedPaymentIds.includes(p.id))) {
      setSelectedPaymentIds([]);
    } else {
      setSelectedPaymentIds(paginatedPayments.map((p) => p.id));
    }
  };

  const handleActionConfirm = async () => {
    if (!isAdmin) {
      setToast({
        message: "Action restricted to administrators.",
        type: "error",
      });
      return;
    }
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
      await loadPayments(false);
    } catch (err: any) {
      setToast({
        message:
          err.response?.data?.status?.message ||
          "Failed to process payment action.",
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

    const headers = [
      "Transaction Ref",
      "Booking Number",
      "Customer Name",
      "Customer Email",
      "Gateway",
      "Amount ($)",
      "Status",
      "Date",
    ];
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

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `financial_audit_ledger_${new Date().toISOString().split("T")[0]}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setToast({
      message: "Financial audit ledger exported successfully!",
      type: "success",
    });
  };

  const handlePrintReceipt = () => {
    if (!selectedPayment) return;

    const printWindow = window.open("", "_blank", "width=850,height=950");
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Payment Receipt - ${selectedPayment.transactionId}</title>
          <style>
            @media print {
              body { margin: 0; padding: 0; background: #ffffff; }
              @page { size: portrait; margin: 10mm; }
            }
            body {
              font-family: Arial, sans-serif;
              padding: 20px;
              background: #ffffff;
              color: #0f172a;
              display: flex;
              justify-content: center;
              align-items: center;
              min-height: 100vh;
            }
            .receipt {
              border: 1px solid #cbd5e1;
              padding: 30px;
              border-radius: 16px;
              width: 520px;
              background: #ffffff;
              box-shadow: 0 4px 12px rgba(0,0,0,0.05);
              box-sizing: border-box;
            }
            .brand { text-align: center; font-weight: 900; font-size: 18px; text-transform: uppercase; margin-bottom: 4px; }
            .branch { text-align: center; font-size: 12px; color: #475569; margin-bottom: 2px; }
            .address { text-align: center; font-size: 11px; color: #64748b; margin-bottom: 16px; }
            .divider { border-bottom: 1px dashed #94a3b8; margin: 14px 0; }
            .title-receipt { text-align: center; font-weight: 800; font-size: 13px; text-transform: uppercase; margin-bottom: 16px; letter-spacing: 0.05em; }
            .meta-row { display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 6px; }
            .meta-label { color: #64748b; font-weight: 700; }
            .meta-val { font-weight: 800; color: #0f172a; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 12px; }
            th { border-bottom: 1px solid #0f172a; border-top: 1px solid #0f172a; padding: 6px 4px; text-align: left; font-size: 11px; font-weight: 800; }
            th:last-child, td:last-child { text-align: right; }
            td { padding: 8px 4px; border-bottom: 1px solid #f1f5f9; }
            .totals-section { margin-top: 12px; font-size: 12px; }
            .totals-row { display: flex; justify-content: space-between; margin-bottom: 4px; }
            .grand-total { border-top: 2px solid #0f172a; border-bottom: 2px solid #0f172a; padding: 8px 0; margin-top: 6px; font-size: 15px; font-weight: 900; display: flex; justify-content: space-between; }
            .footer { text-align: center; margin-top: 24px; font-size: 10px; color: #64748b; line-height: 1.4; }
          </style>
        </head>
        <body>
          <div class="receipt">
            <div class="brand">CINEMAX WORKSPACE</div>
            <div class="branch">Phnom Penh Main Branch</div>
            <div class="address">St 39, Srah Chak, Doun Penh, Phnom Penh • Tel: +855 12 345 655</div>
            
            <div class="divider"></div>
            <div class="title-receipt">ប័ណ្ណបង់ប្រាក់ / RECEIPT</div>

            <div class="meta-row"><span class="meta-label">លេខវិក្កយបត្រ / No:</span> <span class="meta-val">${selectedPayment.transactionId}</span></div>
            <div class="meta-row"><span class="meta-label">កាលបរិច្ឆេទ / Date:</span> <span class="meta-val">${formatDateTime(selectedPayment.paidAt || selectedPayment.createdAt)}</span></div>
            <div class="meta-row"><span class="meta-label">អតិថិជន / Customer:</span> <span class="meta-val">${selectedPayment.customerName || "Customer"}</span></div>
            <div class="meta-row"><span class="meta-label">លេខបញ្ជាទិញ / Order:</span> <span class="meta-val" style="color: #dc2626;">${selectedPayment.bookingNumber || "-"}</span></div>

            <table>
              <thead>
                <tr>
                  <th>មុខទំនិញ (Item)</th>
                  <th>តម្លៃ (Price)</th>
                  <th>ចំនួន (Qty)</th>
                  <th>សរុប (Total)</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><b>${selectedPayment.movieTitle || "Cinema Movie Ticket"}</b><br/><span style="font-size: 10px; color: #64748b;">${selectedPayment.cinemaName || ""} • ${selectedPayment.hallName || ""}</span></td>
                  <td>$${Number(selectedPayment.amount || 0).toFixed(2)}</td>
                  <td>1</td>
                  <td>$${Number(selectedPayment.amount || 0).toFixed(2)}</td>
                </tr>
              </tbody>
            </table>

            <div class="totals-section">
              <div class="totals-row"><span class="meta-label">សរុប / Subtotal:</span> <span class="meta-val">$${Number(selectedPayment.amount || 0).toFixed(2)}</span></div>
              <div class="totals-row"><span class="meta-label">ពន្ធ / Tax (0%):</span> <span class="meta-val">$0.00</span></div>
              <div class="grand-total"><span>ប្រាក់សរុប / TOTAL:</span> <span>${selectedPayment.currency === "KHR" ? "៛" : "$"}${Number(selectedPayment.amount || 0).toFixed(2)}</span></div>
            </div>

            <div class="meta-row" style="margin-top: 12px;"><span class="meta-label">ទូទាត់តាម / PAYMENT BY:</span> <span class="meta-val">${selectedPayment.paymentMethod?.replace("_", " ")}</span></div>
            <div class="meta-row"><span class="meta-label">ស្ថានភាព / Status:</span> <span class="meta-val" style="color: #10b981;">${selectedPayment.paymentStatus}</span></div>

            <div class="footer">
              សូមអរគុណសម្រាប់ការគាំទ្រទំនិញ! / Thank you for your purchase!<br/>
              Powered by Cinemax POS System
            </div>
          </div>
          <script>
            window.onload = function() {
              window.print();
              window.close();
            }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

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
        isOpen={actionDialog.isOpen}
        type="HARD_DELETE"
        title={
          actionDialog.isBulk
            ? "Refund Selected Transactions?"
            : "Refund Payment Record?"
        }
        targetName={
          actionDialog.isBulk
            ? `${selectedPaymentIds.length} records`
            : actionDialog.payment?.transactionId || ""
        }
        loading={actionLoading}
        onConfirm={handleActionConfirm}
        onCancel={() =>
          setActionDialog({ isOpen: false, payment: null, isBulk: false })
        }
      />

      {/* Header */}
      <div
        className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b ${borderCol} pb-5`}
      >
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-600 shrink-0">
              <CreditCard className="h-5 w-5" />
            </div>
            <div>
              <h1
                className={`text-xl sm:text-2xl font-black tracking-tight ${textPrimary} flex items-center gap-2`}
              >
                Financial & Payment Audits Management
              </h1>
              <p className={`text-xs ${textSecondary} mt-0.5`}>
                Monitor revenue streams, inspect settlement hashes, and export
                financial audit reports
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={handleExportCSV}
          className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 text-xs font-bold transition cursor-pointer shadow-sm ${
            isLight
              ? "border-slate-300 bg-white text-slate-800 hover:bg-slate-100 hover:text-slate-900 shadow-sm"
              : "border-slate-700 bg-slate-800 text-slate-200 hover:text-white hover:bg-slate-700"
          }`}
        >
          <Download className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          <span>Export Ledger CSV</span>
        </button>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div
          className={`rounded-3xl border ${cardClass} p-5 backdrop-blur-md space-y-2 shadow-xl`}
        >
          <div className={`flex items-center justify-between ${textSecondary}`}>
            <span className="text-xs font-bold">Total Revenue (USD)</span>
            <DollarSign className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <p className="text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400">
            ${metrics.totalRevenue.toFixed(2)}
          </p>
          <span className={`text-[11px] ${textSecondary} font-bold`}>
            From {metrics.completedCount} successful checkouts
          </span>
        </div>

        <div
          className={`rounded-3xl border ${cardClass} p-5 backdrop-blur-md space-y-2 shadow-xl`}
        >
          <div className={`flex items-center justify-between ${textSecondary}`}>
            <span className="text-xs font-bold">Successful Payments</span>
            <CheckCircle2 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          </div>
          <p className={`text-2xl font-black font-mono ${textPrimary}`}>
            {metrics.completedCount}
          </p>
          <span className="text-[11px] text-blue-600 dark:text-blue-400 font-bold">
            Cleared Settlements
          </span>
        </div>

        <div
          className={`rounded-3xl border ${cardClass} p-5 backdrop-blur-md space-y-2 shadow-xl`}
        >
          <div className={`flex items-center justify-between ${textSecondary}`}>
            <span className="text-xs font-bold">Pending Awaiting Pay</span>
            <Clock className="h-4 w-4 text-amber-500" />
          </div>
          <p className="text-2xl font-black font-mono text-amber-600 dark:text-amber-400">
            {metrics.pendingCount}
          </p>
          <span className={`text-[11px] ${textSecondary} font-bold`}>
            Awaiting customer transfer
          </span>
        </div>

        <div
          className={`rounded-3xl border ${cardClass} p-5 backdrop-blur-md space-y-2 shadow-xl`}
        >
          <div className={`flex items-center justify-between ${textSecondary}`}>
            <span className="text-xs font-bold">Failed / Refunded</span>
            <XCircle className="h-4 w-4 text-rose-500" />
          </div>
          <p className="text-2xl font-black font-mono text-rose-600 dark:text-rose-400">
            {metrics.failedCount}
          </p>
          <span className={`text-[11px] ${textSecondary} font-bold`}>
            Cancelled or dropped sessions
          </span>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        <div className="relative w-full lg:max-w-md">
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
            placeholder="Search txn ID, booking #, customer, film..."
            className={`w-full rounded-2xl border py-3 pl-10 pr-4 text-xs font-bold outline-none transition ${inputClass}`}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(0);
            }}
            className={`rounded-2xl border py-3 px-3 text-xs font-bold outline-none focus:border-red-500 cursor-pointer ${inputClass}`}
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
            className={`rounded-2xl border py-3 px-3 text-xs font-bold outline-none focus:border-red-500 cursor-pointer ${inputClass}`}
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
        <div
          className={`overflow-hidden rounded-3xl border ${cardClass} backdrop-blur-md shadow-xl`}
        >
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead
                className={`border-b ${borderCol} ${isLight ? "bg-slate-100 text-slate-700" : "bg-slate-950/70 text-slate-400"} text-[11px] font-black uppercase tracking-wider`}
              >
                <tr>
                  {isAdmin && (
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
                  )}
                  <th className="px-5 py-4">Transaction Ref</th>
                  <th className="px-5 py-4">Order Reference</th>
                  <th className="px-5 py-4">Customer</th>
                  <th className="px-5 py-4">Gateway</th>
                  <th className="px-5 py-4">Settled Amount</th>
                  <th className="px-5 py-4">Status</th>
                  <th className="px-5 py-4 text-right">Audit</th>
                </tr>
              </thead>
              <tbody
                className={`divide-y ${isLight ? "divide-slate-200 text-slate-900 font-medium" : "divide-slate-800/60 text-slate-300"}`}
              >
                {paginatedPayments.map((p) => {
                  const status =
                    STATUS_CONFIG[p.paymentStatus] || STATUS_CONFIG.PENDING;
                  const method = METHOD_LABELS[p.paymentMethod] || {
                    label: p.paymentMethod || "UNKNOWN",
                    badge:
                      "bg-slate-500/10 text-slate-500 border-slate-500/20 font-bold",
                  };
                  const StatusIcon = status.icon;
                  const isChecked = selectedPaymentIds.includes(p.id);

                  return (
                    <tr
                      key={p.id}
                      className={`transition group ${isChecked ? (isLight ? "bg-red-50" : "bg-red-950/20") : isLight ? "hover:bg-slate-100/70" : "hover:bg-slate-800/30"}`}
                    >
                      {isAdmin && (
                        <td className="px-4 py-3.5 text-center">
                          <button
                            type="button"
                            onClick={() => handleToggleSelectOne(p.id)}
                            className={`h-5 w-5 mx-auto rounded-lg border flex items-center justify-center transition cursor-pointer ${
                              isChecked
                                ? "bg-red-600 border-red-500 text-white shadow-md shadow-red-600/30"
                                : `${isLight ? "border-slate-300 bg-white text-transparent" : "border-slate-700 bg-slate-900 text-transparent"} hover:border-slate-500`
                            }`}
                          >
                            <Check className="h-3.5 w-3.5 stroke-[3]" />
                          </button>
                        </td>
                      )}

                      <td className="px-5 py-3.5 font-mono font-bold">
                        <span className={textPrimary}>{p.transactionId}</span>
                        <p
                          className={`text-[10px] ${textSecondary} font-sans mt-0.5 font-semibold`}
                        >
                          {formatDateTime(p.paidAt || p.createdAt)}
                        </p>
                      </td>

                      <td className="px-5 py-3.5 font-mono text-red-600 dark:text-red-400 font-black">
                        {p.bookingNumber || "-"}
                      </td>

                      <td className="px-5 py-3.5">
                        <p className={`font-black ${textPrimary}`}>
                          {p.customerName || "Customer"}
                        </p>
                        <p
                          className={`text-[10px] ${textSecondary} font-semibold`}
                        >
                          {p.customerEmail || "-"}
                        </p>
                      </td>

                      <td className="px-5 py-3.5">
                        <span
                          className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-black ${method.badge}`}
                        >
                          {p.paymentMethod === "KHQR_BAKONG" && (
                            <QrCode className="h-3 w-3" />
                          )}
                          {method.label}
                        </span>
                      </td>

                      <td className="px-5 py-3.5 font-mono font-black text-emerald-600 dark:text-emerald-400">
                        {p.currency === "KHR" ? "៛" : "$"}
                        {Number(p.amount || 0).toFixed(2)}
                      </td>

                      <td className="px-5 py-3.5">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[10px] font-black ${status.color}`}
                        >
                          <StatusIcon className="h-3 w-3" />
                          {status.label}
                        </span>
                      </td>

                      <td className="px-5 py-3.5 text-right">
                        <button
                          onClick={() => {
                            setSelectedPayment(p);
                            setReceiptZoom(100);
                          }}
                          className={`inline-flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-bold transition cursor-pointer shadow-sm ${
                            isLight
                              ? "border-slate-300 bg-white text-slate-800 hover:bg-slate-100 hover:text-slate-900 font-bold"
                              : "border-slate-700 bg-slate-800 text-slate-200 hover:text-white hover:border-slate-500"
                          }`}
                        >
                          <Receipt className="h-3 w-3 text-red-600 dark:text-red-400" />
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
        <div
          className={`flex min-h-[30vh] flex-col items-center justify-center rounded-3xl border ${cardClass} p-8 text-center ${textSecondary} text-sm shadow-xl`}
        >
          <CreditCard className={`h-10 w-10 ${textMuted} mb-2`} />
          <p className={`font-black ${textPrimary}`}>
            {searchQuery
              ? "No matching payment records found."
              : "No transactions recorded."}
          </p>
        </div>
      )}

      {/* Floating Bulk Action Bar (Admin Only) */}
      {isAdmin && selectedPaymentIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-4 rounded-2xl border border-rose-500/40 bg-slate-950/90 px-5 py-3 shadow-2xl backdrop-blur-md animate-in slide-in-from-bottom-5">
          <span className="text-xs font-bold text-white">
            {selectedPaymentIds.length} transaction
            {selectedPaymentIds.length > 1 ? "s" : ""} selected
          </span>
          <button
            onClick={() =>
              setActionDialog({ isOpen: true, payment: null, isBulk: true })
            }
            className="flex items-center gap-2 rounded-xl bg-rose-600 hover:bg-rose-500 px-4 py-2 text-xs font-bold text-white transition shadow-lg shadow-rose-600/30 cursor-pointer"
          >
            <Ban className="h-4 w-4" />
            <span>Process Bulk Refunds</span>
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
            ({filteredPayments.length} records)
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
              className={`flex items-center gap-1 px-3 py-2 rounded-xl border ${borderCol} ${isLight ? "bg-white text-slate-800 hover:text-slate-900" : "bg-slate-900 text-slate-300 hover:text-white"} disabled:opacity-30 transition cursor-pointer`}
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

      {/* Payment Details & Zoomable Receipt Preview Modal */}
      {selectedPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-md overflow-y-auto">
          <div
            className={`relative w-full max-w-2xl max-h-[92vh] flex flex-col rounded-3xl border shadow-2xl overflow-hidden ${modalBgClass}`}
          >
            {/* Modal Header */}
            <div
              className={`flex items-center justify-between px-6 py-4 border-b ${borderCol}`}
            >
              <div className="flex items-center gap-2">
                <Receipt className="h-5 w-5 text-red-600 dark:text-red-400" />
                <h2 className={`text-base font-black ${textPrimary}`}>
                  Receipt Preview & Audit
                </h2>
              </div>
              <button
                onClick={() => setSelectedPayment(null)}
                className={`p-1.5 rounded-xl ${isLight ? "hover:bg-slate-100 text-slate-600" : "hover:bg-slate-800 text-slate-300"} transition cursor-pointer`}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Zoom Controls Bar */}
            <div
              className={`flex items-center justify-between px-6 py-2.5 ${isLight ? "bg-slate-100 border-b border-slate-200" : "bg-slate-950 border-b border-slate-800"} text-xs`}
            >
              <span className={`font-bold ${textSecondary}`}>
                Zoom: {receiptZoom}%
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() =>
                    setReceiptZoom((prev) => Math.max(prev - 15, 60))
                  }
                  className={`p-1.5 rounded-lg border ${borderCol} ${isLight ? "bg-white text-slate-800 hover:bg-slate-50 font-bold" : "bg-slate-900 text-white"} transition cursor-pointer`}
                  title="Zoom Out"
                >
                  <ZoomOut className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => setReceiptZoom(100)}
                  className={`px-2.5 py-1 rounded-lg border ${borderCol} ${isLight ? "bg-white text-slate-800 hover:bg-slate-50 font-bold" : "bg-slate-900 text-white"} transition cursor-pointer`}
                  title="Reset Zoom"
                >
                  100%
                </button>
                <button
                  onClick={() =>
                    setReceiptZoom((prev) => Math.min(prev + 15, 150))
                  }
                  className={`p-1.5 rounded-lg border ${borderCol} ${isLight ? "bg-white text-slate-800 hover:bg-slate-50 font-bold" : "bg-slate-900 text-white"} transition cursor-pointer`}
                  title="Zoom In"
                >
                  <ZoomIn className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* Scrollable Receipt Preview Box */}
            <div
              className={`flex-1 overflow-auto p-6 sm:p-8 flex items-center justify-center ${isLight ? "bg-slate-200/60" : "bg-slate-950/80"}`}
            >
              <div
                style={{
                  transform: `scale(${receiptZoom / 100})`,
                  transformOrigin: "top center",
                }}
                className="transition-transform duration-200 w-[440px] bg-white text-slate-900 border border-slate-300 p-6 rounded-2xl shadow-2xl space-y-4 font-sans text-xs"
              >
                <div className="text-center font-black text-sm uppercase tracking-wider">
                  CINEMAX WORKSPACE
                </div>
                <div className="text-center text-[11px] text-slate-600 font-bold">
                  Phnom Penh Main Branch
                </div>
                <div className="text-center text-[10px] text-slate-500 pb-2 border-b border-dashed border-slate-300">
                  St 39, Srah Chak, Doun Penh, Phnom Penh • Tel: +855 12 345 655
                </div>

                <div className="text-center font-black text-xs uppercase tracking-wider text-slate-800">
                  ប័ណ្ណបង់ប្រាក់ / RECEIPT
                </div>

                <div className="space-y-1 font-semibold text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-slate-600">លេខវិក្កយបត្រ / No:</span>
                    <span className="font-mono font-black">
                      {selectedPayment.transactionId}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">កាលបរិច្ឆេទ / Date:</span>
                    <span>
                      {formatDateTime(
                        selectedPayment.paidAt || selectedPayment.createdAt,
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">អតិថិជន / Customer:</span>
                    <span>{selectedPayment.customerName || "Customer"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">
                      លេខបញ្ជាទិញ / Booking:
                    </span>
                    <span className="font-mono text-red-600 font-black">
                      {selectedPayment.bookingNumber || "-"}
                    </span>
                  </div>
                </div>

                <table className="w-full text-left border-collapse pt-2">
                  <thead>
                    <tr className="border-t border-b border-slate-900 text-[10px] font-black uppercase">
                      <th className="py-1">មុខទំនិញ (Item)</th>
                      <th className="py-1 text-right">តម្លៃ</th>
                      <th className="py-1 text-center">ចំនួន</th>
                      <th className="py-1 text-right">សរុប</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-[11px]">
                    <tr>
                      <td className="py-2 pr-1">
                        <p className="font-black">
                          {selectedPayment.movieTitle || "Cinema Movie Ticket"}
                        </p>
                        <p className="text-[9px] text-slate-500 font-bold">
                          {selectedPayment.cinemaName || ""} •{" "}
                          {selectedPayment.hallName || ""}
                        </p>
                      </td>
                      <td className="py-2 text-right font-mono font-bold">
                        ${Number(selectedPayment.amount || 0).toFixed(2)}
                      </td>
                      <td className="py-2 text-center font-mono font-bold">
                        1
                      </td>
                      <td className="py-2 text-right font-mono font-bold">
                        ${Number(selectedPayment.amount || 0).toFixed(2)}
                      </td>
                    </tr>
                  </tbody>
                </table>

                <div className="border-t border-slate-200 pt-2 space-y-1 text-[11px] font-semibold">
                  <div className="flex justify-between">
                    <span className="text-slate-600">សរុប / Subtotal:</span>
                    <span className="font-mono">
                      ${Number(selectedPayment.amount || 0).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">ពន្ធ / Tax (0%):</span>
                    <span className="font-mono">$0.00</span>
                  </div>
                  <div className="border-t border-b border-slate-900 py-1.5 flex justify-between font-black text-sm">
                    <span>ប្រាក់សរុប / TOTAL:</span>
                    <span className="font-mono text-emerald-600">
                      {selectedPayment.currency === "KHR" ? "៛" : "$"}
                      {Number(selectedPayment.amount || 0).toFixed(2)}
                    </span>
                  </div>
                </div>

                <div className="space-y-1 text-[11px] font-semibold">
                  <div className="flex justify-between">
                    <span className="text-slate-600">
                      ទូទាត់តាម / PAYMENT BY:
                    </span>
                    <span className="font-bold">
                      {selectedPayment.paymentMethod?.replace("_", " ")}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">ស្ថានភាព / Status:</span>
                    <span className="font-black text-emerald-600">
                      {selectedPayment.paymentStatus}
                    </span>
                  </div>
                </div>

                <div className="text-center text-[9px] text-slate-500 pt-3 border-t border-slate-200 leading-tight">
                  សូមអរគុណសម្រាប់ការគាំទ្រទំនិញ! / Thank you for your purchase!
                  <br />
                  Powered by Cinemax System
                </div>
              </div>
            </div>

            {/* Modal Footer Controls */}
            <div
              className={`flex items-center justify-between px-6 py-4 border-t ${borderCol} ${isLight ? "bg-white" : "bg-slate-900"}`}
            >
              {isAdmin && selectedPayment.paymentStatus === "COMPLETED" ? (
                <button
                  onClick={() =>
                    setActionDialog({
                      isOpen: true,
                      payment: selectedPayment,
                      isBulk: false,
                    })
                  }
                  className="rounded-xl border border-red-500/30 bg-red-500/15 px-4 py-2.5 text-xs font-black text-red-600 dark:text-red-400 hover:bg-red-500/25 transition cursor-pointer"
                >
                  Refund Payment
                </button>
              ) : (
                <div />
              )}

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSelectedPayment(null)}
                  className={`rounded-xl border ${isLight ? "border-slate-300 bg-white text-slate-800 hover:bg-slate-100 font-bold" : "border-slate-700 bg-slate-800 text-slate-300 hover:text-white"} px-4 py-2.5 text-xs transition cursor-pointer`}
                >
                  Close
                </button>
                <button
                  onClick={handlePrintReceipt}
                  className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-red-600/30 hover:from-red-500 hover:to-rose-500 transition cursor-pointer"
                >
                  <Printer className="h-4 w-4" />
                  <span>Print Receipt</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
