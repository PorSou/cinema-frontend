"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import AOS from "aos"; // 🌟 Import AOS
import {
  MapPin,
  Phone,
  Building2,
  Tv,
  Loader2,
  Search,
  ArrowRight,
  ExternalLink,
  Sparkles,
} from "lucide-react";

import CinemaService from "@/app/service/cinema.service";
import { CinemaResponse } from "@/app/types/api.types";
import Toast from "@/app/components/Toast";
import { useSettings, Language } from "@/app/context/SettingsContext";
import Footer from "@/app/components/Footer";

const extractArray = <T,>(res: any): T[] => {
  if (Array.isArray(res)) return res;
  if (Array.isArray(res?.data)) return res.data;
  if (Array.isArray(res?.body?.data)) return res.body.data;
  if (Array.isArray(res?.data?.body?.data)) return res.data.body.data;

  return [];
};

const getImageUrl = (imagePath?: string) => {
  if (!imagePath) return null;
  if (imagePath.startsWith("http")) return imagePath;
  const cleanPath = imagePath.startsWith("/")
    ? imagePath.substring(1)
    : imagePath;
  if (cleanPath.startsWith("uploads/")) {
    return `http://localhost:8080/${cleanPath}`;
  }
  return `http://localhost:8080/uploads/${cleanPath}`;
};

const PAGE_LABELS: Record<
  Language,
  {
    title: string;
    description: string;
    bannerTag: string;
    searchPlaceholder: string;
    hallsAvailable: string;
    viewShowtimes: string;
    noCinemas: string;
    noCinemasDescription: string;
    failedToLoad: string;
    address: string;
    phone: string;
    openMap: string;
  }
> = {
  en: {
    title: "Cinemas & Locations",
    description:
      "Pick a branch to see what's playing and book showtimes there.",
    bannerTag: "Explore Branch Locations",
    searchPlaceholder: "Search by name or city...",
    hallsAvailable: "Halls Available",
    viewShowtimes: "View Showtimes",
    noCinemas: "No cinema locations found.",
    noCinemasDescription: "Check back soon as we expand to new cities.",
    failedToLoad: "Failed to load cinema locations.",
    address: "Address",
    phone: "Phone",
    openMap: "Open in Google Maps",
  },

  km: {
    title: "រោងកុន និងទីតាំង",
    description:
      "ជ្រើសរើសសាខាមួយ ដើម្បីមើលភាពយន្តដែលកំពុងបញ្ចាំង និងកក់ម៉ោងបញ្ចាំង។",
    bannerTag: "ស្វែងរកសាខារោងកុន",
    searchPlaceholder: "ស្វែងរកតាមឈ្មោះ ឬទីក្រុង...",
    hallsAvailable: "បន្ទប់បញ្ចាំងដែលមាន",
    viewShowtimes: "មើលម៉ោងបញ្ចាំង",
    noCinemas: "រកមិនឃើញទីតាំងរោងកុនទេ។",
    noCinemasDescription:
      "សូមពិនិត្យមើលម្ដងទៀតនៅពេលក្រោយ ខណៈពេលដែលយើងពង្រីកទៅកាន់ទីក្រុងថ្មីៗ។",
    failedToLoad: "មិនអាចផ្ទុកទីតាំងរោងកុនបានទេ។",
    address: "អាសយដ្ឋាន",
    phone: "ទូរស័ព្ទ",
    openMap: "បើកក្នុងផែនទី Google",
  },

  zh: {
    title: "影院与地点",
    description: "选择一家影院，查看正在上映的电影并预订放映时间。",
    bannerTag: "探索分店位置",
    searchPlaceholder: "按影院名称或城市搜索...",
    hallsAvailable: "可用影厅",
    viewShowtimes: "查看放映时间",
    noCinemas: "未找到影院地点。",
    noCinemasDescription: "随着我们扩展到更多城市，请稍后再回来查看。",
    failedToLoad: "加载影院地点失败。",
    address: "地址",
    phone: "电话",
    openMap: "在谷歌地图中打开",
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

  // Refresh AOS when cinemas load or search query updates
  useEffect(() => {
    const timer = setTimeout(() => {
      AOS.refresh();
    }, 100);
    return () => clearTimeout(timer);
  }, [cinemas, loading, searchQuery]);

  useEffect(() => {
    async function loadCinemas() {
      try {
        setLoading(true);

        const res = await CinemaService.getAllCinemas();

        setCinemas(extractArray<CinemaResponse>(res));
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
        cinema.address?.toLowerCase().includes(query),
    );
  }, [cinemas, searchQuery]);

  return (
    <div
      className={`min-h-screen flex flex-col justify-between transition-colors duration-300 ${
        isDark ? "bg-[#0b0c10] text-slate-100" : "bg-slate-50 text-slate-900"
      }`}
    >
      {/* Hide Scrollbar Style */}
      <style jsx global>{`
        ::-webkit-scrollbar {
          display: none;
        }
        html,
        body {
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

      <div className="mx-auto max-w-7xl space-y-8 px-4 py-10 sm:px-8 sm:py-12 w-full flex-1">
        {/* ==================== BANNER ==================== */}
        <div
          data-aos="fade-up"
          data-aos-duration="800"
          className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-amber-600 via-red-600 to-rose-700 p-8 sm:p-12 text-white shadow-2xl"
        >
          <div className="relative z-10 max-w-2xl space-y-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/35 backdrop-blur-md text-amber-300 text-xs font-bold border border-amber-400/30">
              <Sparkles className="h-3.5 w-3.5" /> {labels.bannerTag}
            </span>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight">
              {labels.title}
            </h1>
            <p className="text-xs sm:text-sm text-slate-100 font-medium leading-relaxed">
              {labels.description}
            </p>
          </div>
        </div>

        {/* ==================== SEARCH BAR HEADER ==================== */}
        <div
          data-aos="fade-up"
          data-aos-delay="100"
          className="flex flex-col sm:flex-row items-center justify-between gap-4"
        >
          <div className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-amber-500" />
            <h2 className="text-sm font-black tracking-wider uppercase">
              All Branches ({filteredCinemas.length})
            </h2>
          </div>

          <div className="relative w-full sm:w-80">
            <Search
              className={`absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 ${
                isDark ? "text-slate-500" : "text-slate-400"
              }`}
            />

            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={labels.searchPlaceholder}
              className={`w-full rounded-2xl border py-2.5 pl-10 pr-4 text-xs outline-none transition font-bold ${
                isDark
                  ? "border-white/10 bg-white/[0.04] text-white placeholder:text-slate-500 focus:border-amber-500"
                  : "border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 shadow-sm focus:border-amber-500"
              }`}
            />
          </div>
        </div>

        {/* ==================== CONTENT ==================== */}

        {loading ? (
          /* Loading */
          <div className="flex min-h-[40vh] items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-amber-500" />

              <span
                className={`text-xs font-bold ${
                  isDark ? "text-slate-500" : "text-slate-400"
                }`}
              >
                Loading cinemas...
              </span>
            </div>
          </div>
        ) : filteredCinemas.length > 0 ? (
          /* Cinema Cards with Smooth AOS Staggered Scroll Animations */
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredCinemas.map((cinema, index) => {
              const bgImg = getImageUrl(cinema.image);

              return (
                <Link
                  key={cinema.id}
                  href={`/customer/cinemas/${cinema.id}`}
                  data-aos="fade-up"
                  data-aos-delay={(index % 3) * 100} // Stagger effect per column item
                  className={`group relative flex flex-col justify-between h-80 w-full overflow-hidden rounded-3xl border shadow-xl transition-all duration-300 ease-out hover:-translate-y-2 hover:shadow-2xl p-6 ${
                    isDark
                      ? "border-white/10 bg-slate-900/60 hover:border-amber-500/40 hover:bg-slate-900/90"
                      : "border-slate-200 bg-white hover:border-amber-500/50 hover:shadow-amber-500/10"
                  }`}
                >
                  {/* Full Background Cover Image */}
                  {bgImg && (
                    <div className="absolute inset-0 z-0 overflow-hidden">
                      <img
                        src={bgImg}
                        alt={cinema.name}
                        className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-110"
                      />
                      {/* Dark Atmospheric Gradient Overlays */}
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/75 to-black/50" />
                    </div>
                  )}

                  {/* Fallback pattern / background if no image uploaded */}
                  {!bgImg && (
                    <div className="absolute inset-0 z-0 bg-gradient-to-br from-slate-900 via-slate-950 to-black" />
                  )}

                  {/* Top Content (Header & City Badge) */}
                  <div className="relative z-10 flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border backdrop-blur-md ${
                          bgImg
                            ? "border-white/20 bg-black/40 text-amber-400 shadow-lg"
                            : isDark
                              ? "border-amber-500/20 bg-gradient-to-br from-amber-500/20 to-rose-500/5 text-amber-400"
                              : "border-amber-100 bg-gradient-to-br from-amber-50 to-rose-50 text-amber-500"
                        }`}
                      >
                        <Building2 className="h-5 w-5" />
                      </div>

                      <div className="min-w-0">
                        <h3
                          className={`truncate text-sm font-black transition-colors duration-300 group-hover:text-amber-400 ${
                            bgImg
                              ? "text-white drop-shadow-md"
                              : isDark
                                ? "text-white"
                                : "text-slate-900"
                          }`}
                        >
                          {cinema.name}
                        </h3>

                        {cinema.city && (
                          <span
                            className={`mt-1 inline-block rounded-md border px-2 py-0.5 text-[10px] font-semibold backdrop-blur-sm ${
                              bgImg
                                ? "border-white/20 bg-black/50 text-slate-200"
                                : isDark
                                  ? "border-slate-700/80 bg-slate-800/80 text-slate-300"
                                  : "border-slate-200 bg-slate-100 text-slate-600"
                            }`}
                          >
                            {cinema.city}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Bottom Content (Address, Interactive Map Action & Phone) */}
                  <div className="relative z-10 space-y-3 pt-3">
                    <div
                      className={`space-y-2 border-t pt-3 text-xs ${
                        bgImg
                          ? "border-white/15 text-slate-300"
                          : isDark
                            ? "border-slate-800 text-slate-400"
                            : "border-slate-200 text-slate-500"
                      }`}
                    >
                      {/* Address Text */}
                      <div className="flex items-start gap-2">
                        <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
                        <span className="line-clamp-2 font-medium">
                          {cinema.address || labels.address}
                        </span>
                      </div>

                      {/* Phone & Dedicated Map Button Row */}
                      <div className="flex items-center justify-between gap-2 pt-1">
                        <div className="flex items-center gap-2 min-w-0">
                          <Phone className="h-3.5 w-3.5 shrink-0 text-amber-500" />
                          <span
                            className={`font-mono truncate font-bold ${
                              bgImg
                                ? "text-slate-200"
                                : isDark
                                  ? "text-slate-300"
                                  : "text-slate-600"
                            }`}
                          >
                            {cinema.phone || "-"}
                          </span>
                        </div>

                        {/* Interactive Google Maps Button */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                              `${cinema.name}, ${cinema.address}, ${cinema.city}`,
                            )}`;
                            window.open(
                              mapsUrl,
                              "_blank",
                              "noopener,noreferrer",
                            );
                          }}
                          className="flex items-center gap-1.5 rounded-xl bg-amber-500/90 hover:bg-amber-500 border border-amber-400/40 px-3 py-1.5 text-[11px] font-black text-slate-950 shadow-lg transition cursor-pointer shrink-0 backdrop-blur-md"
                          title={labels.openMap}
                        >
                          <MapPin className="h-3 w-3" />
                          <span>Map</span>
                          <ExternalLink className="h-2.5 w-2.5 opacity-80" />
                        </button>
                      </div>
                    </div>

                    {/* Bottom Information */}
                    <div
                      className={`flex items-center justify-between border-t pt-3 text-xs font-bold ${
                        bgImg
                          ? "border-white/15 text-white"
                          : isDark
                            ? "border-slate-800"
                            : "border-slate-200"
                      }`}
                    >
                      <span
                        className={`flex items-center gap-1.5 ${
                          bgImg
                            ? "text-slate-200"
                            : isDark
                              ? "text-slate-300"
                              : "text-slate-600"
                        }`}
                      >
                        <Tv className="h-3.5 w-3.5 text-amber-500" />
                        <span>
                          {cinema.totalHalls || 0} {labels.hallsAvailable}
                        </span>
                      </span>

                      <span className="flex items-center gap-1 text-amber-400 transition group-hover:translate-x-1 font-black">
                        <span>{labels.viewShowtimes}</span>
                        <ArrowRight className="h-3.5 w-3.5" />
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          /* Empty State */
          <div
            data-aos="fade-up"
            className={`flex min-h-[30vh] flex-col items-center justify-center rounded-3xl border p-8 text-center ${
              isDark
                ? "border-white/10 bg-white/[0.02]"
                : "border-slate-200 bg-white"
            }`}
          >
            <Building2
              className={`mb-2 h-10 w-10 ${
                isDark ? "text-slate-600" : "text-slate-300"
              }`}
            />

            <p
              className={`text-sm font-semibold ${
                isDark ? "text-slate-300" : "text-slate-700"
              }`}
            >
              {labels.noCinemas}
            </p>

            <p
              className={`mt-1 text-xs ${
                isDark ? "text-slate-500" : "text-slate-400"
              }`}
            >
              {labels.noCinemasDescription}
            </p>

            {/* Clear Search */}
            {searchQuery.trim() && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="mt-4 rounded-xl bg-amber-500 px-4 py-2 text-xs font-black text-slate-950 transition hover:bg-amber-400 cursor-pointer shadow-lg shadow-amber-500/20"
              >
                Clear Search
              </button>
            )}
          </div>
        )}
      </div>

      <div data-aos="fade-up">
        <Footer />
      </div>
    </div>
  );
}
