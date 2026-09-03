"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  MapPin,
  Phone,
  Building2,
  Tv,
  Loader2,
  Search,
  ArrowRight,
} from "lucide-react";

import CinemaService from "@/app/service/cinema.service";
import { CinemaResponse } from "@/app/types/api.types";
import Toast from "@/app/components/Toast";
import { useSettings, Language } from "@/app/context/SettingsContext";

const extractArray = <T,>(res: any): T[] => {
  if (Array.isArray(res)) return res;
  if (Array.isArray(res?.data)) return res.data;
  if (Array.isArray(res?.body?.data)) return res.body.data;
  if (Array.isArray(res?.data?.body?.data)) return res.data.body.data;

  return [];
};

const PAGE_LABELS: Record<
  Language,
  {
    title: string;
    description: string;
    searchPlaceholder: string;
    hallsAvailable: string;
    viewShowtimes: string;
    noCinemas: string;
    noCinemasDescription: string;
    failedToLoad: string;
    address: string;
    phone: string;
  }
> = {
  en: {
    title: "Cinemas & Locations",
    description:
      "Pick a branch to see what's playing and book showtimes there.",
    searchPlaceholder: "Search by name or city...",
    hallsAvailable: "Halls Available",
    viewShowtimes: "View Showtimes",
    noCinemas: "No cinema locations found.",
    noCinemasDescription:
      "Check back soon as we expand to new cities.",
    failedToLoad: "Failed to load cinema locations.",
    address: "Address",
    phone: "Phone",
  },

  km: {
    title: "រោងកុន និងទីតាំង",
    description:
      "ជ្រើសរើសសាខាមួយ ដើម្បីមើលភាពយន្តដែលកំពុងបញ្ចាំង និងកក់ម៉ោងបញ្ចាំង។",
    searchPlaceholder: "ស្វែងរកតាមឈ្មោះ ឬទីក្រុង...",
    hallsAvailable: "បន្ទប់បញ្ចាំងដែលមាន",
    viewShowtimes: "មើលម៉ោងបញ្ចាំង",
    noCinemas: "រកមិនឃើញទីតាំងរោងកុនទេ។",
    noCinemasDescription:
      "សូមពិនិត្យមើលម្ដងទៀតនៅពេលក្រោយ ខណៈពេលដែលយើងពង្រីកទៅកាន់ទីក្រុងថ្មីៗ។",
    failedToLoad: "មិនអាចផ្ទុកទីតាំងរោងកុនបានទេ។",
    address: "អាសយដ្ឋាន",
    phone: "ទូរស័ព្ទ",
  },

  zh: {
    title: "影院与地点",
    description:
      "选择一家影院，查看正在上映的电影并预订放映时间。",
    searchPlaceholder: "按影院名称或城市搜索...",
    hallsAvailable: "可用影厅",
    viewShowtimes: "查看放映时间",
    noCinemas: "未找到影院地点。",
    noCinemasDescription:
      "随着我们扩展到更多城市，请稍后再回来查看。",
    failedToLoad: "加载影院地点失败。",
    address: "地址",
    phone: "电话",
  },
};

export default function CustomerCinemasPage() {
  const { theme, language } = useSettings();

  const isDark = theme === "dark";
  const labels = PAGE_LABELS[language] ?? PAGE_LABELS.en;

  const [cinemas, setCinemas] = useState<CinemaResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const [toast, setToast] = useState<{
    message: string | null;
    type: "success" | "error" | "info";
  }>({
    message: null,
    type: "success",
  });

  useEffect(() => {
    async function loadCinemas() {
      try {
        setLoading(true);

        const res = await CinemaService.getAllCinemas();

        setCinemas(
          extractArray<CinemaResponse>(res)
        );
      } catch (error) {
        console.error("Failed to load cinemas:", error);

        setToast({
          message: labels.failedToLoad,
          type: "error",
        });
      } finally {
        setLoading(false);
      }
    }

    loadCinemas();
  }, [labels.failedToLoad]);

  const filteredCinemas = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();

    if (!query) {
      return cinemas;
    }

    return cinemas.filter(
      (cinema) =>
        cinema.name?.toLowerCase().includes(query) ||
        cinema.city?.toLowerCase().includes(query) ||
        cinema.address?.toLowerCase().includes(query)
    );
  }, [cinemas, searchQuery]);

  return (
    <div
      className={`min-h-screen transition-colors duration-300 ${
        isDark
          ? "bg-slate-950 text-slate-100"
          : "bg-slate-50 text-slate-900"
      }`}
    >
      {/* Hide Scrollbar Style */}
      <style jsx global>{`
        ::-webkit-scrollbar {
          display: none;
        }
        html, body {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>

      {/* Toast */}
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

      <div className="mx-auto max-w-7xl space-y-8 px-4 py-10 sm:px-8 sm:py-12">
        {/* ==================== PAGE HEADER ==================== */}
        <div
          className={`flex flex-col justify-between gap-5 border-b pb-6 sm:flex-row sm:items-center ${
            isDark
              ? "border-slate-800"
              : "border-slate-200"
          }`}
        >
          {/* Title */}
          <div className="space-y-2">
            <h1
              className={`flex items-center gap-2.5 text-2xl font-black tracking-tight sm:text-3xl ${
                isDark
                  ? "text-white"
                  : "text-slate-950"
              }`}
            >
              <MapPin className="h-7 w-7 shrink-0 text-red-500" />

              <span>{labels.title}</span>
            </h1>

            <p
              className={`max-w-xl text-xs leading-relaxed sm:text-sm ${
                isDark
                  ? "text-slate-400"
                  : "text-slate-500"
              }`}
            >
              {labels.description}
            </p>
          </div>

          {/* Search */}
          <div className="relative w-full sm:w-72">
            <Search
              className={`absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 ${
                isDark
                  ? "text-slate-500"
                  : "text-slate-400"
              }`}
            />

            <input
              type="text"
              value={searchQuery}
              onChange={(e) =>
                setSearchQuery(e.target.value)
              }
              placeholder={labels.searchPlaceholder}
              className={`w-full rounded-2xl border py-2.5 pl-10 pr-4 text-xs outline-none transition ${
                isDark
                  ? "border-slate-800 bg-slate-900 text-white placeholder:text-slate-500 focus:border-red-500"
                  : "border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 shadow-sm focus:border-red-500"
              }`}
            />
          </div>
        </div>

        {/* ==================== CONTENT ==================== */}

        {loading ? (
          /* Loading */
          <div className="flex min-h-[40vh] items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-red-600" />

              <span
                className={`text-xs ${
                  isDark
                    ? "text-slate-500"
                    : "text-slate-400"
                }`}
              >
                Loading...
              </span>
            </div>
          </div>
        ) : filteredCinemas.length > 0 ? (
          /* Cinema Cards */
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredCinemas.map((cinema) => (
              <Link
                key={cinema.id}
                href={`/customer/cinemas/${cinema.id}`}
                className={`group block rounded-3xl border p-6 shadow-xl transition duration-300 ${
                  isDark
                    ? "border-slate-800 bg-slate-900/60 hover:border-red-500/50 hover:bg-slate-900 hover:shadow-red-600/10"
                    : "border-slate-200 bg-white shadow-slate-200/60 hover:border-red-300 hover:shadow-red-500/10"
                }`}
              >
                {/* Cinema Header */}
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border ${
                      isDark
                        ? "border-red-500/20 bg-gradient-to-br from-red-500/20 to-rose-500/5 text-red-400"
                        : "border-red-100 bg-gradient-to-br from-red-50 to-rose-50 text-red-500"
                    }`}
                  >
                    <Building2 className="h-5 w-5" />
                  </div>

                  <div className="min-w-0">
                    <h3
                      className={`truncate text-sm font-black transition ${
                        isDark
                          ? "text-white group-hover:text-red-400"
                          : "text-slate-900 group-hover:text-red-500"
                      }`}
                    >
                      {cinema.name}
                    </h3>

                    {cinema.city && (
                      <span
                        className={`mt-1 inline-block rounded-md border px-2 py-0.5 text-[10px] font-semibold ${
                          isDark
                            ? "border-slate-700/80 bg-slate-800/80 text-slate-300"
                            : "border-slate-200 bg-slate-100 text-slate-600"
                        }`}
                      >
                        {cinema.city}
                      </span>
                    )}
                  </div>
                </div>

                {/* Cinema Information */}
                <div
                  className={`mt-4 space-y-2.5 border-t pt-4 text-xs ${
                    isDark
                      ? "border-slate-800 text-slate-400"
                      : "border-slate-200 text-slate-500"
                  }`}
                >
                  {/* Address */}
                  <div className="flex items-start gap-2">
                    <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-500" />

                    <span className="line-clamp-2">
                      {cinema.address ||
                        labels.address}
                    </span>
                  </div>

                  {/* Phone */}
                  <div className="flex items-center gap-2">
                    <Phone className="h-3.5 w-3.5 shrink-0 text-red-500" />

                    <span
                      className={`font-mono ${
                        isDark
                          ? "text-slate-300"
                          : "text-slate-600"
                      }`}
                    >
                      {cinema.phone || "-"}
                    </span>
                  </div>
                </div>

                {/* Bottom Information */}
                <div
                  className={`mt-4 flex items-center justify-between border-t pt-4 text-xs font-bold ${
                    isDark
                      ? "border-slate-800"
                      : "border-slate-200"
                  }`}
                >
                  {/* Halls */}
                  <span
                    className={`flex items-center gap-1.5 ${
                      isDark
                        ? "text-slate-300"
                        : "text-slate-600"
                    }`}
                  >
                    <Tv className="h-3.5 w-3.5 text-red-400" />

                    <span>
                      {cinema.totalHalls || 0}{" "}
                      {labels.hallsAvailable}
                    </span>
                  </span>

                  {/* View Showtimes */}
                  <span className="flex items-center gap-1 text-red-500 transition group-hover:translate-x-1">
                    <span>{labels.viewShowtimes}</span>

                    <ArrowRight className="h-3.5 w-3.5" />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          /* Empty State */
          <div
            className={`flex min-h-[30vh] flex-col items-center justify-center rounded-3xl border p-8 text-center ${
              isDark
                ? "border-slate-800 bg-slate-900/30"
                : "border-slate-200 bg-white"
            }`}
          >
            <Building2
              className={`mb-2 h-10 w-10 ${
                isDark
                  ? "text-slate-600"
                  : "text-slate-300"
              }`}
            />

            <p
              className={`text-sm font-semibold ${
                isDark
                  ? "text-slate-300"
                  : "text-slate-700"
              }`}
            >
              {searchQuery.trim()
                ? labels.noCinemas
                : labels.noCinemas}
            </p>

            <p
              className={`mt-1 text-xs ${
                isDark
                  ? "text-slate-500"
                  : "text-slate-400"
              }`}
            >
              {labels.noCinemasDescription}
            </p>

            {/* Clear Search */}
            {searchQuery.trim() && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="mt-4 rounded-xl bg-red-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-red-500"
              >
                Clear Search
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}