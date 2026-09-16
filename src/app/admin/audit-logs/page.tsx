"use client";

import { useEffect, useState } from "react";
import {
  ShieldCheck,
  Loader2,
  ChevronsLeft,
  ChevronLeft,
  ChevronRight,
  ChevronsRight,
  Activity,
  UserCheck,
  Globe,
  Clock,
  Search,
  Film,
  Calendar,
  Tag,
  Users,
  Coffee,
} from "lucide-react";
import Toast from "@/app/components/Toast";
import { useSettings } from "@/app/context/SettingsContext";
import api from "@/app/lib/api";

const extractArray = <T,>(res: any): T[] => {
  if (Array.isArray(res)) return res;
  if (Array.isArray(res?.content)) return res.content;
  if (Array.isArray(res?.data)) return res.data;
  if (Array.isArray(res?.body?.data)) return res.body.data;
  if (Array.isArray(res?.data?.content)) return res.data.content;
  return [];
};

// Helper function to render matching icons and styles for each module action
const getActionBadgeStyle = (action: string) => {
  if (action?.includes("MOVIE")) {
    return {
      icon: <Film className="h-3 w-3" />,
      className: "bg-rose-500/10 border-rose-500/20 text-rose-500",
    };
  }
  if (action?.includes("SHOWTIME")) {
    return {
      icon: <Calendar className="h-3 w-3" />,
      className: "bg-indigo-500/10 border-indigo-500/20 text-indigo-500",
    };
  }
  if (action?.includes("VOUCHER")) {
    return {
      icon: <Tag className="h-3 w-3" />,
      className: "bg-emerald-500/10 border-emerald-500/20 text-emerald-500",
    };
  }
  if (action?.includes("USER")) {
    return {
      icon: <Users className="h-3 w-3" />,
      className: "bg-amber-500/10 border-amber-500/20 text-amber-500",
    };
  }
  if (
    action?.includes("CONCESSION") ||
    action?.includes("CATEGORY") ||
    action?.includes("ITEM")
  ) {
    return {
      icon: <Coffee className="h-3 w-3" />,
      className: "bg-purple-500/10 border-purple-500/20 text-purple-500",
    };
  }
  return {
    icon: <Activity className="h-3 w-3" />,
    className: "bg-sky-500/10 border-sky-500/20 text-sky-500",
  };
};

export default function AdminAuditLogsPage() {
  const { theme } = useSettings();
  const isLight = theme === "light";

  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  // Pagination states
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);
  const pageSize = 15;

  // Toast
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

  const fetchAuditLogs = async () => {
    setLoading(true);
    try {
      const res = await api.get(
        `/admin/audit-logs?page=${page}&size=${pageSize}`,
      );
      const rawObj = res.data?.body?.data || res.data?.data || res.data;
      const list = extractArray<any>(rawObj);

      setAuditLogs(list);
      setTotalPages(rawObj?.totalPages || 1);
      setTotalElements(rawObj?.totalElements || list.length);
    } catch {
      showToast("Failed to load audit logs.", "error");
      setAuditLogs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAuditLogs();
  }, [page]);

  // Filter logs locally based on search term
  const filteredLogs = auditLogs.filter((log) => {
    const query = searchTerm.toLowerCase();
    return (
      log.action?.toLowerCase().includes(query) ||
      log.userEmail?.toLowerCase().includes(query) ||
      log.description?.toLowerCase().includes(query) ||
      log.ipAddress?.toLowerCase().includes(query)
    );
  });

  const pageClass = isLight
    ? "bg-slate-50 text-slate-900"
    : "bg-slate-950 text-slate-100";
  const cardClass = isLight
    ? "border-slate-300 bg-white shadow-xl shadow-slate-200 ring-1 ring-slate-200"
    : "border-slate-800 bg-slate-900/60 shadow-2xl backdrop-blur-md";
  const textPrimary = isLight
    ? "text-slate-900 font-black"
    : "text-white font-black";
  const textSecondary = isLight
    ? "text-slate-700 font-bold"
    : "text-slate-400 font-medium";
  const borderCol = isLight ? "border-slate-300" : "border-slate-800";
  const inputClass = isLight
    ? "bg-white border-slate-300 text-slate-900 placeholder-slate-400 focus:ring-indigo-500"
    : "bg-slate-900/80 border-slate-700 text-white placeholder-slate-500 focus:ring-indigo-500";

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

      {/* Header */}
      <div
        className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b ${borderCol} pb-5`}
      >
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-500 shrink-0">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <h1
              className={`text-xl sm:text-2xl font-black tracking-tight ${textPrimary} flex items-center gap-2`}
            >
              System Audit Logs
              <span
                className={`text-[10px] font-black px-2 py-0.5 rounded-full ${isLight ? "bg-white text-slate-800 border-slate-300 shadow-sm" : "bg-slate-800 text-slate-400 border-slate-700"} border`}
              >
                {totalElements} Events Recorded
              </span>
            </h1>
            <p className={`text-xs ${textSecondary} mt-0.5`}>
              Track changes across Movies, Showtimes, Vouchers, Users, and F&B
              concessions
            </p>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search action, email, description..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={`w-full pl-10 pr-4 py-2 rounded-2xl border text-xs font-medium focus:outline-none focus:ring-2 transition ${inputClass}`}
          />
        </div>
      </div>

      {/* Table Section */}
      {loading ? (
        <div className="flex min-h-[36vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
        </div>
      ) : filteredLogs.length > 0 ? (
        <div
          className={`rounded-3xl border ${cardClass} overflow-hidden shadow-xl backdrop-blur-md relative`}
        >
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr
                  className={`border-b ${borderCol} ${isLight ? "bg-slate-100 text-slate-700" : "bg-slate-950/60 text-slate-400"} text-[11px] font-black uppercase tracking-wider`}
                >
                  <th className="py-3.5 px-4">Action Type</th>
                  <th className="py-3.5 px-4">User Administrator</th>
                  <th className="py-3.5 px-4">Description</th>
                  <th className="py-3.5 px-4">IP Address</th>
                  <th className="py-3.5 px-4 text-right">Timestamp</th>
                </tr>
              </thead>
              <tbody
                className={`divide-y ${isLight ? "divide-slate-200 text-slate-900 font-medium" : "divide-slate-800/60 text-slate-300"} text-xs`}
              >
                {filteredLogs.map((log) => {
                  const badge = getActionBadgeStyle(log.action);
                  return (
                    <tr
                      key={log.id}
                      className={`transition ${isLight ? "hover:bg-slate-100/70" : "hover:bg-slate-800/40"}`}
                    >
                      <td className="py-3.5 px-4 font-mono font-bold">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border ${badge.className}`}
                        >
                          {badge.icon}
                          <span>{log.action}</span>
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-bold flex items-center gap-1.5">
                        <UserCheck className="h-3.5 w-3.5 text-slate-400" />
                        <span>{log.userEmail}</span>
                      </td>
                      <td
                        className={`py-3.5 px-4 ${textSecondary} max-w-xs truncate`}
                      >
                        {log.description || "No description provided"}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-400">
                        <span className="inline-flex items-center gap-1">
                          <Globe className="h-3 w-3" />
                          {log.ipAddress || "127.0.0.1"}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono text-slate-400">
                        <span className="inline-flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {log.createdAt
                            ? new Date(log.createdAt).toLocaleString()
                            : "N/A"}
                        </span>
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
          className={`flex min-h-[30vh] flex-col items-center justify-center rounded-3xl border ${cardClass} p-8 text-center text-xs space-y-2`}
        >
          <ShieldCheck className="h-10 w-10 text-slate-500 mb-1" />
          <p className={`font-black ${textPrimary}`}>
            No audit logs found matching your search.
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
            ({totalElements} events)
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
    </div>
  );
}
