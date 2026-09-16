"use client";

import { useEffect, useState } from "react";
import {
  Plus,
  Ticket,
  Loader2,
  Trash2,
  Power,
  TicketPercent,
  ChevronsLeft,
  ChevronLeft,
  ChevronRight,
  ChevronsRight,
} from "lucide-react";
import { VoucherService } from "@/app/service/voucher.service";
import { useSettings } from "@/app/context/SettingsContext";
import Toast from "@/app/components/Toast";
import ConfirmDialog from "@/app/components/ConfirmDialog";

const extractArray = <T,>(res: any): T[] => {
  if (Array.isArray(res)) return res;
  if (Array.isArray(res?.content)) return res.content;
  if (Array.isArray(res?.data)) return res.data;
  if (Array.isArray(res?.body?.data)) return res.body.data;
  if (Array.isArray(res?.data?.content)) return res.data.content;
  if (Array.isArray(res?.body?.data?.content)) return res.body.data.content;
  return [];
};

export default function AdminVouchersPage() {
  const { theme } = useSettings();
  const isLight = theme === "light";

  const [vouchers, setVouchers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Pagination states
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);
  const pageSize = 10;

  // Form states
  const [code, setCode] = useState("");
  const [discountType, setDiscountType] = useState<"PERCENTAGE" | "FIXED">(
    "PERCENTAGE",
  );
  const [discountValue, setDiscountValue] = useState("");
  const [minSpend, setMinSpend] = useState("");
  const [usageLimit, setUsageLimit] = useState("");
  const [expiryDate, setExpiryDate] = useState("");

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

  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    targetName: string;
    action: () => Promise<void>;
  }>({
    isOpen: false,
    targetName: "",
    action: async () => {},
  });

  const fetchVouchers = async () => {
    setLoading(true);
    try {
      const response = await VoucherService.getAllVouchers(page, pageSize);
      const list = extractArray<any>(response);

      setVouchers(list);

      // Extract pagination metadata safely if available
      const rawPageObj = response?.body?.data || response?.data || response;
      setTotalPages(rawPageObj?.totalPages || 1);
      setTotalElements(rawPageObj?.totalElements || list.length);
    } catch (error) {
      console.error("Failed to fetch vouchers:", error);
      showToast("Failed to load vouchers.", "error");
      setVouchers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVouchers();
  }, [page]);

  const handleCreateVoucher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) {
      showToast("Voucher code is required.", "error");
      return;
    }

    setSubmitting(true);
    try {
      await VoucherService.createVoucher({
        code: code.trim(),
        discountType,
        discountValue: Number(discountValue),
        minSpend: minSpend ? Number(minSpend) : 0,
        usageLimit: usageLimit ? Number(usageLimit) : 100,
        expiryDate: expiryDate ? new Date(expiryDate).toISOString() : undefined,
      });

      showToast("Voucher created successfully!", "success");
      setIsModalOpen(false);
      setCode("");
      setDiscountValue("");
      setMinSpend("");
      setUsageLimit("");
      setExpiryDate("");
      fetchVouchers();
    } catch (error: any) {
      const msg = error?.response?.data?.message || "Failed to create voucher.";
      showToast(msg, "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (id: number) => {
    try {
      await VoucherService.toggleStatus(id);
      showToast("Voucher status updated successfully.", "success");
      fetchVouchers();
    } catch (error) {
      showToast("Failed to update voucher status.", "error");
    }
  };

  const handleDeletePrompt = (id: number, codeStr: string) => {
    setConfirmDialog({
      isOpen: true,
      targetName: codeStr,
      action: async () => {
        await VoucherService.deleteVoucher(id);
        fetchVouchers();
        showToast(`Voucher "${codeStr}" deleted successfully.`, "success");
      },
    });
  };

  // Theme matching tokens
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
    ? "border-slate-300 bg-white shadow-2xl text-slate-900 ring-1 ring-slate-200"
    : "border-slate-800 bg-slate-900 shadow-2xl text-slate-100";
  const textPrimary = isLight
    ? "text-slate-900 font-black"
    : "text-white font-black";
  const textSecondary = isLight
    ? "text-slate-700 font-bold"
    : "text-slate-400 font-medium";
  const borderCol = isLight ? "border-slate-300" : "border-slate-800";

  return (
    <div
      className={`min-h-screen py-6 px-4 sm:px-8 lg:px-10 w-full space-y-6 transition-colors duration-300 pb-24 ${pageClass}`}
    >
      <Toast
        message={toast.message}
        type={toast.type}
        duration={3500}
        onClose={() => setToast((prev) => ({ ...prev, message: null }))}
      />

      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        type="HARD_DELETE"
        targetName={confirmDialog.targetName}
        onConfirm={async () => {
          try {
            await confirmDialog.action();
            setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
          } catch (err: any) {
            showToast(err.response?.data?.message || "Action failed.", "error");
            setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
          }
        }}
        onCancel={() =>
          setConfirmDialog((prev) => ({ ...prev, isOpen: false }))
        }
      />

      {/* Header */}
      <div
        className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b ${borderCol} pb-5`}
      >
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-500 shrink-0">
            <TicketPercent className="h-5 w-5" />
          </div>
          <div>
            <h1
              className={`text-xl sm:text-2xl font-black tracking-tight ${textPrimary} flex items-center gap-2`}
            >
              Promotional Vouchers
              <span
                className={`text-[10px] font-black px-2 py-0.5 rounded-full ${isLight ? "bg-white text-slate-800 border-slate-300 shadow-sm" : "bg-slate-800 text-slate-400 border-slate-700"} border`}
              >
                {totalElements} Total
              </span>
            </h1>
            <p className={`text-xs ${textSecondary} mt-0.5`}>
              Create discount promo codes, set minimum spend rules, and track
              global redemptions
            </p>
          </div>
        </div>

        <button
          onClick={() => {
            setCode("");
            setDiscountValue("");
            setMinSpend("");
            setUsageLimit("");
            setExpiryDate("");
            setIsModalOpen(true);
          }}
          className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-red-600 px-4 py-2.5 text-xs font-bold text-slate-950 shadow-lg shadow-amber-500/25 hover:from-amber-400 hover:to-red-500 transition cursor-pointer"
        >
          <Plus className="h-4 w-4 stroke-[3]" />
          <span>Create Voucher</span>
        </button>
      </div>

      {/* Table Section */}
      {loading ? (
        <div className="flex min-h-[36vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
        </div>
      ) : vouchers.length > 0 ? (
        <div
          className={`rounded-3xl border ${cardClass} overflow-hidden shadow-xl backdrop-blur-md relative`}
        >
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr
                  className={`border-b ${borderCol} ${isLight ? "bg-slate-100 text-slate-700" : "bg-slate-950/60 text-slate-400"} text-[11px] font-black uppercase tracking-wider`}
                >
                  <th className="py-3.5 px-4">Code</th>
                  <th className="py-3.5 px-4">Discount</th>
                  <th className="py-3.5 px-4">Min Spend</th>
                  <th className="py-3.5 px-4">Usage Tracking</th>
                  <th className="py-3.5 px-4">Expiry</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody
                className={`divide-y ${isLight ? "divide-slate-200 text-slate-900 font-medium" : "divide-slate-800/60 text-slate-300"} text-xs`}
              >
                {vouchers.map((v) => (
                  <tr
                    key={v.id}
                    className={`transition ${isLight ? "hover:bg-slate-100/70" : "hover:bg-slate-800/40"}`}
                  >
                    <td className="py-3.5 px-4 font-mono font-black text-amber-500 text-sm">
                      {v.code}
                    </td>
                    <td className="py-3.5 px-4 font-black">
                      {v.discountType === "PERCENTAGE"
                        ? `${v.discountValue}%`
                        : `$${Number(v.discountValue).toFixed(2)}`}
                    </td>
                    <td className="py-3.5 px-4 font-mono">
                      ${Number(v.minSpend || 0).toFixed(2)}
                    </td>
                    <td className="py-3.5 px-4 font-mono">
                      <span className="text-amber-400 font-bold">
                        {v.timesUsed ?? 0}
                      </span>{" "}
                      / {v.usageLimit} redemptions
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[11px]">
                      {v.expiryDate
                        ? new Date(v.expiryDate).toLocaleString()
                        : "No expiry"}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`px-2 py-0.5 rounded-md text-[10px] font-black border ${v.isActive ? "bg-emerald-500/15 text-emerald-500 border-emerald-500/30" : "bg-rose-500/15 text-rose-500 border-rose-500/30"}`}
                      >
                        {v.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleToggleStatus(v.id)}
                          className={`p-2 rounded-xl border transition cursor-pointer ${v.isActive ? "border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10" : "border-slate-700 text-slate-400 hover:bg-slate-800"}`}
                          title={v.isActive ? "Deactivate" : "Activate"}
                        >
                          <Power className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeletePrompt(v.id, v.code)}
                          className="p-2 rounded-xl text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 transition cursor-pointer border border-transparent hover:border-rose-500/20"
                          title="Delete Voucher"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div
          className={`flex min-h-[30vh] flex-col items-center justify-center rounded-3xl border ${cardClass} p-8 text-center text-xs space-y-2`}
        >
          <Ticket className="h-10 w-10 text-slate-500 mb-1" />
          <p className={`font-black ${textPrimary}`}>
            No promo vouchers created yet.
          </p>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div
          className={`flex flex-col sm:flex-row items-center justify-between border-t ${borderCol} pt-4 text-xs gap-3`}
        >
          <span className={textSecondary}>
            Page <span className={`font-black ${textPrimary}`}>{page + 1}</span>{" "}
            of <span className={`font-black ${textPrimary}`}>{totalPages}</span>{" "}
            ({totalElements} vouchers)
          </span>

          <div className="flex items-center gap-1.5 flex-wrap justify-center">
            <button
              onClick={() => setPage(0)}
              disabled={page === 0}
              className={`p-2 rounded-xl border ${borderCol} ${isLight ? "bg-white text-slate-800" : "bg-slate-900 text-slate-400"} disabled:opacity-30 transition cursor-pointer`}
            >
              <ChevronsLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => setPage((p) => Math.max(p - 1, 0))}
              disabled={page === 0}
              className={`flex items-center gap-1 px-3 py-2 rounded-xl border ${borderCol} ${isLight ? "bg-white text-slate-800" : "bg-slate-900 text-slate-300"} disabled:opacity-30 transition cursor-pointer`}
            >
              <ChevronLeft className="h-4 w-4" />
              <span>Prev</span>
            </button>
            <button
              onClick={() => setPage((p) => Math.min(p + 1, totalPages - 1))}
              disabled={page >= totalPages - 1}
              className={`flex items-center gap-1 px-3 py-2 rounded-xl border ${borderCol} ${isLight ? "bg-white text-slate-800" : "bg-slate-900 text-slate-300"} disabled:opacity-30 transition cursor-pointer`}
            >
              <span>Next</span>
              <ChevronRight className="h-4 w-4" />
            </button>
            <button
              onClick={() => setPage(totalPages - 1)}
              disabled={page >= totalPages - 1}
              className={`p-2 rounded-xl border ${borderCol} ${isLight ? "bg-white text-slate-800" : "bg-slate-900 text-slate-400"} disabled:opacity-30 transition cursor-pointer`}
            >
              <ChevronsRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* ================= MODAL: CREATE VOUCHER ================= */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm overflow-y-auto">
          <div
            className={`relative w-full max-w-md rounded-3xl border p-6 sm:p-8 shadow-2xl space-y-5 my-8 ${modalBgClass}`}
          >
            <div
              className={`border-b ${borderCol} pb-3 flex items-center justify-between`}
            >
              <h2
                className={`text-base sm:text-lg ${textPrimary} flex items-center gap-2`}
              >
                <TicketPercent className="h-5 w-5 text-amber-500" />
                Create New Promo Voucher
              </h2>
            </div>

            <form onSubmit={handleCreateVoucher} className="space-y-4 text-xs">
              <div>
                <label className={`block mb-1 font-bold ${textSecondary}`}>
                  Voucher Code *
                </label>
                <input
                  type="text"
                  required
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="e.g. SUMMER2026"
                  className={`w-full rounded-xl border ${inputClass} p-3 outline-none font-mono uppercase`}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={`block mb-1 font-bold ${textSecondary}`}>
                    Discount Type *
                  </label>
                  <select
                    value={discountType}
                    onChange={(e: any) => setDiscountType(e.target.value)}
                    className={`w-full rounded-xl border ${inputClass} p-3 outline-none cursor-pointer`}
                  >
                    <option value="PERCENTAGE">Percentage (%)</option>
                    <option value="FIXED">Fixed Amount ($)</option>
                  </select>
                </div>
                <div>
                  <label className={`block mb-1 font-bold ${textSecondary}`}>
                    Discount Value *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={discountValue}
                    onChange={(e) => setDiscountValue(e.target.value)}
                    placeholder={
                      discountType === "PERCENTAGE" ? "15 (for 15%)" : "5.00"
                    }
                    className={`w-full rounded-xl border ${inputClass} p-3 outline-none font-mono`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={`block mb-1 font-bold ${textSecondary}`}>
                    Min Spend ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={minSpend}
                    onChange={(e) => setMinSpend(e.target.value)}
                    placeholder="0.00"
                    className={`w-full rounded-xl border ${inputClass} p-3 outline-none font-mono`}
                  />
                </div>
                <div>
                  <label className={`block mb-1 font-bold ${textSecondary}`}>
                    Usage Limit
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={usageLimit}
                    onChange={(e) => setUsageLimit(e.target.value)}
                    placeholder="100"
                    className={`w-full rounded-xl border ${inputClass} p-3 outline-none font-mono`}
                  />
                </div>
              </div>

              <div>
                <label className={`block mb-1 font-bold ${textSecondary}`}>
                  Expiry Date & Time
                </label>
                <input
                  type="datetime-local"
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(e.target.value)}
                  className={`w-full rounded-xl border ${inputClass} p-3 outline-none font-mono`}
                />
              </div>

              <div
                className={`flex justify-end gap-2.5 pt-3 border-t ${borderCol}`}
              >
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className={`rounded-xl border ${borderCol} px-4 py-2.5 text-xs font-bold cursor-pointer transition`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-red-600 px-5 py-2.5 text-xs font-bold text-slate-950 shadow-lg hover:from-amber-400 hover:to-red-500 disabled:opacity-50 cursor-pointer transition"
                >
                  {submitting && (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  )}
                  <span>Save Voucher</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
