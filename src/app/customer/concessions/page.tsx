"use client";

import { useEffect, useState } from "react";
import AOS from "aos"; // 🌟 Import AOS
import {
  Coffee,
  Search,
  Loader2,
  Sparkles,
  SlidersHorizontal,
  Tag,
} from "lucide-react";
import ConcessionService, {
  ConcessionCategoryResponse,
  ConcessionItemResponse,
} from "@/app/service/concession.service";
import Toast from "@/app/components/Toast";
import { useSettings } from "@/app/context/SettingsContext";
import Footer from "@/app/components/Footer";

const extractArray = <T,>(res: any): T[] => {
  if (Array.isArray(res)) return res;
  if (Array.isArray(res?.content)) return res.content;
  if (Array.isArray(res?.data)) return res.data;
  if (Array.isArray(res?.body?.data)) return res.body.data;
  if (Array.isArray(res?.data?.content)) return res.data.content;
  return [];
};

export default function CustomerConcessionsPage() {
  const { theme } = useSettings();
  const isDark = theme === "dark";

  const [items, setItems] = useState<ConcessionItemResponse[]>([]);
  const [categories, setCategories] = useState<ConcessionCategoryResponse[]>(
    [],
  );

  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(
    null,
  );

  const [sortBy, setSortBy] = useState<string>("default");
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

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

  // Refresh AOS when items load or filters change
  useEffect(() => {
    const timer = setTimeout(() => {
      AOS.refresh();
    }, 100);
    return () => clearTimeout(timer);
  }, [items, loading, searchQuery, selectedCategoryId, sortBy]);

  useEffect(() => {
    async function loadData() {
      setLoading(true);

      try {
        const catRes = await ConcessionService.getActiveCategoriesList();
        setCategories(extractArray<ConcessionCategoryResponse>(catRes));

        const itemRes = await ConcessionService.getAllAdminItems(0, 100);
        const allItems = extractArray<ConcessionItemResponse>(itemRes);

        setItems(allItems.filter((i) => i.active));
      } catch (err) {
        showToast("Failed to load F&B concessions menu.", "error");
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  // Filter items by category & search query
  let filteredItems = items.filter((item) => {
    const matchesCategory = selectedCategoryId
      ? item.categoryId === selectedCategoryId
      : true;

    const matchesSearch = item.name
      .toLowerCase()
      .includes(searchQuery.toLowerCase());

    return matchesCategory && matchesSearch;
  });

  // Sort items based on dropdown selection
  if (sortBy === "price-low") {
    filteredItems.sort((a, b) => a.price - b.price);
  } else if (sortBy === "price-high") {
    filteredItems.sort((a, b) => b.price - a.price);
  } else if (sortBy === "name-asc") {
    filteredItems.sort((a, b) => a.name.localeCompare(b.name));
  }

  return (
    <div
      className={`min-h-screen flex flex-col justify-between ${
        isDark ? "bg-[#0b0c10] text-slate-100" : "bg-slate-50 text-slate-900"
      }`}
    >
      <Toast
        message={toast.message}
        type={toast.type}
        onClose={() => setToast({ message: null, type: "success" })}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-10 w-full space-y-8 flex-1">
        {/* Banner */}
        <div
          data-aos="fade-up"
          data-aos-duration="800"
          className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-amber-600 via-red-600 to-rose-700 p-8 sm:p-12 text-white shadow-2xl"
        >
          <div className="relative z-10 max-w-2xl space-y-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/35 backdrop-blur-md text-amber-300 text-xs font-bold border border-amber-400/30">
              <Sparkles className="h-3.5 w-3.5" />
              Cinema Snacks & Combos
            </span>

            <h1 className="text-3xl sm:text-4xl font-black tracking-tight">
              Enhance Your Movie Experience
            </h1>

            <p className="text-xs sm:text-sm text-slate-100 font-medium leading-relaxed">
              Pre-order delicious popcorn, refreshing fountain drinks, and
              exclusive combos online and pick them up at the snack counter!
            </p>
          </div>
        </div>

        {/* Search & Sort Header Bar */}
        <div
          data-aos="fade-up"
          data-aos-delay="100"
          className="flex flex-col sm:flex-row items-center justify-between gap-4"
        >
          {/* Search Box */}
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />

            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search snacks or combos..."
              className={`w-full rounded-2xl border py-2.5 pl-10 pr-4 text-xs font-bold outline-none transition-all duration-300 ${
                isDark
                  ? "border-white/10 bg-white/[0.04] text-white placeholder-slate-500 focus:border-amber-500"
                  : "border-slate-200 bg-white text-slate-900 placeholder-slate-400 focus:border-amber-500 shadow-sm"
              }`}
            />
          </div>

          {/* Category + Sort */}
          <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
            {/* Category dropdown - mobile/tablet */}
            <div className="flex items-center gap-2 lg:hidden flex-1 max-w-[170px] min-w-0">
              <Tag className="h-4 w-4 text-amber-500 shrink-0" />

              <select
                value={
                  selectedCategoryId === null ? "" : String(selectedCategoryId)
                }
                onChange={(e) =>
                  setSelectedCategoryId(
                    e.target.value === "" ? null : Number(e.target.value),
                  )
                }
                className={`w-full min-w-0 rounded-2xl border py-2.5 px-3 text-xs font-bold outline-none cursor-pointer transition-all ${
                  isDark
                    ? "border-white/10 bg-[#11141D] text-white focus:border-amber-500"
                    : "border-slate-200 bg-white text-slate-800 focus:border-amber-500 shadow-sm"
                }`}
              >
                <option value="">🔥 All Items ({items.length})</option>

                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name} ({cat.itemCount})
                  </option>
                ))}
              </select>
            </div>

            {/* Sort dropdown */}
            <div className="flex items-center gap-2 flex-1 min-w-0 sm:min-w-[150px]">
              <SlidersHorizontal className="h-4 w-4 text-amber-500 shrink-0" />

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className={`w-full min-w-0 rounded-2xl border py-2.5 px-3 text-xs font-bold outline-none cursor-pointer transition-all ${
                  isDark
                    ? "border-white/10 bg-[#11141D] text-white focus:border-amber-500"
                    : "border-slate-200 bg-white text-slate-800 focus:border-amber-500 shadow-sm"
                }`}
              >
                <option value="default">Sort by: Default</option>
                <option value="price-low">Price: Low to High</option>
                <option value="price-high">Price: High to Low</option>
                <option value="name-asc">Name: A to Z</option>
              </select>
            </div>
          </div>
        </div>

        {/* Main Content Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
          {/* LEFT SIDEBAR: Categories */}
          <div
            data-aos="fade-right"
            data-aos-delay="150"
            className={`hidden lg:block lg:col-span-1 rounded-3xl border p-5 space-y-2 lg:sticky lg:top-20 shadow-xl ${
              isDark
                ? "border-white/10 bg-slate-900/40 backdrop-blur-md"
                : "border-slate-200 bg-white"
            }`}
          >
            <div className="flex items-center gap-2 pb-3 mb-2 border-b border-slate-800/20 dark:border-white/10">
              <Tag className="h-4 w-4 text-amber-500" />

              <h3 className="text-xs font-black uppercase tracking-wider">
                Categories
              </h3>
            </div>

            {/* All Items */}
            <button
              onClick={() => setSelectedCategoryId(null)}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl text-xs font-black transition-all cursor-pointer border ${
                selectedCategoryId === null
                  ? "bg-amber-500 border-amber-500 text-slate-950 shadow-md shadow-amber-500/25"
                  : isDark
                    ? "border-transparent bg-white/[0.02] text-slate-300 hover:bg-white/[0.06] hover:text-white"
                    : "border-transparent bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              <span>🔥 All Items</span>

              <span className="text-[10px] px-2 py-0.5 rounded-lg bg-black/20">
                {items.length}
              </span>
            </button>

            {/* Categories */}
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategoryId(cat.id)}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl text-xs font-black transition-all cursor-pointer border ${
                  selectedCategoryId === cat.id
                    ? "bg-amber-500 border-amber-500 text-slate-950 shadow-md shadow-amber-500/25"
                    : isDark
                      ? "border-transparent bg-white/[0.02] text-slate-300 hover:bg-white/[0.06] hover:text-white"
                      : "border-transparent bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                <span className="truncate">{cat.name}</span>

                <span className="text-[10px] px-2 py-0.5 rounded-lg bg-black/20 shrink-0">
                  {cat.itemCount}
                </span>
              </button>
            ))}
          </div>

          {/* RIGHT SIDE: Product Cards Grid */}
          <div className="lg:col-span-3">
            {loading ? (
              <div className="flex min-h-[40vh] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
              </div>
            ) : filteredItems.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredItems.map((item, index) => (
                  <div
                    key={item.id}
                    data-aos="fade-up"
                    data-aos-delay={(index % 3) * 100} // Staggered card animation
                    className={`group rounded-3xl border overflow-hidden shadow-lg transition-all duration-300 ease-out hover:-translate-y-2 hover:shadow-2xl flex flex-col justify-between ${
                      isDark
                        ? "border-white/10 bg-slate-900/60 hover:border-amber-500/40 hover:bg-slate-900/90"
                        : "border-slate-200 bg-white hover:border-amber-500/50 hover:shadow-amber-500/10"
                    }`}
                  >
                    {/* Image */}
                    <div className="relative aspect-[4/3] w-full bg-slate-950 overflow-hidden">
                      {item.imageUrl ? (
                        <img
                          src={item.imageUrl}
                          alt={item.name}
                          className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-110"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-slate-600 transition-transform duration-500 group-hover:scale-110">
                          <Coffee className="h-10 w-10" />
                        </div>
                      )}

                      <div className="absolute top-3 left-3">
                        <span className="px-2.5 py-1 rounded-xl bg-black/60 backdrop-blur-md text-[10px] font-black text-amber-400 border border-amber-400/30">
                          {item.categoryName}
                        </span>
                      </div>
                    </div>

                    {/* Product Info */}
                    <div className="p-5 space-y-3 flex-1 flex flex-col justify-between">
                      <div className="space-y-1.5">
                        <h3
                          className={`text-sm font-black tracking-tight transition-colors duration-300 group-hover:text-amber-500 ${
                            isDark ? "text-white" : "text-slate-900"
                          }`}
                        >
                          {item.name}
                        </h3>

                        <p
                          className={`text-xs line-clamp-2 ${
                            isDark ? "text-slate-400" : "text-slate-600"
                          }`}
                        >
                          {item.description ||
                            "Freshly prepared cinema concession item."}
                        </p>
                      </div>

                      {/* Price */}
                      <div className="flex items-center justify-between pt-3 border-t border-slate-800/10 dark:border-white/5">
                        <span className="font-mono text-base font-black text-amber-500">
                          ${item.price.toFixed(2)}
                        </span>

                        <span className="text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20">
                          Ready Online
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div
                data-aos="fade-up"
                className={`flex min-h-[30vh] flex-col items-center justify-center rounded-3xl border ${
                  isDark
                    ? "border-white/10 bg-white/[0.02]"
                    : "border-slate-200 bg-white"
                } p-8 text-center text-xs space-y-2`}
              >
                <Coffee className="h-10 w-10 text-slate-500 mb-1" />

                <p className="font-black text-base">
                  No food items found matching your filter.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div data-aos="fade-up">
        <Footer />
      </div>
    </div>
  );
}
