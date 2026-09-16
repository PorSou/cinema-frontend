"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";

import {
  LogOut,
  ShieldAlert,
  Menu,
  X,
  Ticket,
  Sun,
  Moon,
  Languages,
  ChevronDown,
  Coffee,
  Clapperboard,
  MapPin,
  Heart,
  User,
} from "lucide-react";

import { UserResponse } from "@/app/types/api.types";
import { AuthService, AUTH_CHANGE_EVENT } from "@/app/service/auth.service";
import ConfirmDialog from "@/app/components/ConfirmDialog";
import { useSettings, Language } from "@/app/context/SettingsContext";
import { useSiteLogo } from "@/app/hooks/useSiteLogo"; // Dynamic logo hook
import api from "@/app/lib/api";

const LANGUAGE_OPTIONS: {
  code: Language;
  label: string;
  shortLabel: string;
}[] = [
  { code: "en", label: "English", shortLabel: "English" },
  { code: "km", label: "ខ្មែរ", shortLabel: "ខ្មែរ" },
  { code: "zh", label: "中文", shortLabel: "中文" },
];

type NavItem = {
  href: string;
  label: string;
  icon: React.ElementType;
  match: (pathname: string) => boolean;
};

const API_ORIGIN = (
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api/v1"
).replace(/\/api\/v1\/?$/, "");

const resolveAvatarUrl = (path?: string | null) => {
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;
  return `${API_ORIGIN}/${path.replace(/^\/+/, "")}`;
};

const getAvatarPath = (u: any): string | null =>
  u?.avatarUrl || u?.avatar || u?.profileImage || u?.photoUrl || null;

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();

  const { theme, toggleTheme, language, setLanguage, t } = useSettings();
  const logoUrl = useSiteLogo(); // Fetch dynamic database logo

  const [user, setUser] = useState<UserResponse | null>(null);

  const [menuOpen, setMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [languageOpen, setLanguageOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [avatarError, setAvatarError] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);

  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
  const [logoutLoading, setLogoutLoading] = useState(false);

  const isDark = theme === "dark";

  /* ============================================================
   * LOAD CURRENT USER
   * ========================================================== */

  useEffect(() => {
    setMounted(true);

    const loadUser = async () => {
      try {
        const currentUser = AuthService.getCurrentUser();
        setUser(currentUser ?? null);

        if (currentUser) {
          try {
            const res = await api.get("/users/me");
            const fresh = res.data?.body?.data || res.data?.data || res.data;
            const freshAvatar = getAvatarPath(fresh);

            if (freshAvatar) {
              setUser((prev) =>
                prev ? { ...prev, avatarUrl: freshAvatar } : prev,
              );
            }
          } catch {
            // Silent fallback
          }
        }
      } catch (error) {
        console.error("Failed to load current user:", error);
        setUser(null);
      }
    };

    loadUser();

    window.addEventListener(AUTH_CHANGE_EVENT, loadUser);
    return () => window.removeEventListener(AUTH_CHANGE_EVENT, loadUser);
  }, [pathname]);

  /* ============================================================
   * CLOSE PROFILE DROPDOWN ON OUTSIDE CLICK
   * ========================================================== */

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setProfileDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  /* ============================================================
   * SCROLL
   * ========================================================== */

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 8);
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  /* ============================================================
   * CLOSE MENUS WHEN ROUTE CHANGES
   * ========================================================== */

  useEffect(() => {
    setMenuOpen(false);
    setLanguageOpen(false);
    setProfileDropdownOpen(false);
  }, [pathname]);

  /* ============================================================
   * LOCK BACKGROUND SCROLL WHEN MOBILE MENU IS OPEN
   * ========================================================== */

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  /* ============================================================
   * LOGOUT
   * ========================================================== */

  const handleLogoutClick = () => {
    if (!user) return;
    setMenuOpen(false);
    setProfileDropdownOpen(false);
    setLogoutConfirmOpen(true);
  };

  const handleLogoutConfirm = async () => {
    if (!user || logoutLoading) return;
    try {
      setLogoutLoading(true);
      AuthService.logout();
      setUser(null);
      setLogoutConfirmOpen(false);
      router.push("/login");
    } catch (error) {
      console.error("Logout failed:", error);
    } finally {
      setLogoutLoading(false);
    }
  };

  const handleLogoutCancel = () => {
    if (logoutLoading) return;
    setLogoutConfirmOpen(false);
  };

  /* ============================================================
   * LANGUAGE
   * ========================================================== */

  const handleLanguageChange = (value: Language) => {
    setLanguage(value);
    setLanguageOpen(false);
  };

  const currentLanguageLabel =
    LANGUAGE_OPTIONS.find((option) => option.code === language)?.shortLabel ??
    "English";

  /* ============================================================
   * NAV ITEMS
   * ========================================================== */

  const navItems: NavItem[] = [
    {
      href: "/",
      label: t("moviesAndShowtimes"),
      icon: Clapperboard,
      match: (p) => p === "/",
    },
    {
      href: "/customer/cinemas",
      label: t("cinemasAndLocations"),
      icon: MapPin,
      match: (p) => p.startsWith("/customer/cinemas"),
    },
    {
      href: "/customer/concessions",
      label: "F&B Menu",
      icon: Coffee,
      match: (p) => p.startsWith("/customer/concessions"),
    },
  ];

  if (pathname.startsWith("/admin")) {
    return null;
  }

  /* ============================================================
   * RENDER
   * ========================================================== */

  return (
    <>
      {/* ========================================================
          DESKTOP / MAIN NAVBAR
      ======================================================== */}

      <nav
        suppressHydrationWarning
        className={`sticky top-0 z-40 w-full border-b backdrop-blur-xl transition-all duration-300 ${
          isDark
            ? `border-white/5 ${isScrolled ? "bg-[#0A0C14]/90" : "bg-[#0A0C14]"}`
            : `border-slate-200 ${isScrolled ? "bg-white/95" : "bg-white"}`
        }`}
      >
        <div className="mx-auto grid h-16 max-w-[1400px] grid-cols-[auto_1fr_auto] items-center gap-4 px-5 sm:px-8 lg:px-14 xl:px-20">
          {/* ==================================================
              LOGO
          ================================================== */}

          <Link href="/" className="group flex shrink-0 items-center gap-2">
            <Image
              src={mounted ? logoUrl : "/logo2.png"} // 🌟 Hydration-safe dynamic logo
              alt="CineMax Logo"
              width={150}
              height={48}
              priority
              style={{ width: "auto" }}
              className="h-12 object-contain"
            />
            <span
              suppressHydrationWarning
              className={`text-base font-black tracking-tight ${
                isDark ? "text-white" : "text-slate-900"
              }`}
            >
              CINE<span className="text-red-500">MAX</span>
            </span>
          </Link>

          {/* ==================================================
              DESKTOP NAVIGATION — CENTER COLUMN
          ================================================== */}

          <div className="hidden items-center justify-center gap-8 text-xs font-bold md:flex lg:gap-14">
            {navItems.map((item) => {
              const active = item.match(pathname);
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2 text-sm transition-all duration-200 hover:scale-[1.07] ${
                    active
                      ? "scale-[1.05] font-black text-amber-500"
                      : isDark
                        ? "text-slate-300 hover:text-white"
                        : "text-slate-600 hover:text-slate-950"
                  }`}
                >
                  <Icon className="h-[18px] w-[18px] text-amber-500" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>

          {/* ==================================================
              RIGHT COLUMN — desktop actions + mobile hamburger
          ================================================== */}

          <div className="flex items-center justify-end gap-2">
            {/* ---------------- DESKTOP ACTIONS ---------------- */}

            <div className="hidden items-center gap-2.5 md:flex">
              <div
                className={`flex items-center gap-1 rounded-2xl border p-1 ${
                  isDark
                    ? "border-white/10 bg-white/[0.03]"
                    : "border-slate-200 bg-slate-50/70"
                }`}
              >
                {/* THEME TOGGLE (Fixed with immediate DOM synchronization) */}

                <button
                  suppressHydrationWarning
                  type="button"
                  onClick={() => {
                    toggleTheme();
                    // Force immediate class application to prevent blink/blank screen
                    const nextTheme = theme === "dark" ? "light" : "dark";
                    document.documentElement.classList.remove("dark", "light");
                    document.documentElement.classList.add(nextTheme);
                    document.documentElement.setAttribute(
                      "data-theme",
                      nextTheme,
                    );
                  }}
                  aria-label={isDark ? t("lightMode") : t("darkMode")}
                  title={isDark ? t("lightMode") : t("darkMode")}
                  className={`flex h-8 w-8 cursor-pointer items-center justify-center rounded-xl transition ${
                    isDark
                      ? "text-amber-400 hover:bg-white/[0.08]"
                      : "text-slate-600 hover:bg-white"
                  }`}
                >
                  {isDark ? (
                    <Sun className="h-4 w-4" />
                  ) : (
                    <Moon className="h-4 w-4" />
                  )}
                </button>

                <div
                  className={`h-5 w-px ${
                    isDark ? "bg-white/10" : "bg-slate-200"
                  }`}
                />

                {/* LANGUAGE */}

                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setLanguageOpen((value) => !value)}
                    aria-label={t("language")}
                    aria-expanded={languageOpen}
                    className={`flex h-8 cursor-pointer items-center gap-1.5 rounded-xl px-2.5 text-xs font-bold transition ${
                      isDark
                        ? "text-slate-300 hover:bg-white/[0.08] hover:text-white"
                        : "text-slate-700 hover:bg-white"
                    }`}
                  >
                    <Languages className="h-3.5 w-3.5 text-amber-500" />
                    <span>{currentLanguageLabel}</span>
                    <ChevronDown
                      className={`h-3.5 w-3.5 transition ${
                        languageOpen ? "rotate-180" : ""
                      }`}
                    />
                  </button>

                  {languageOpen && (
                    <div
                      className={`animate-in fade-in zoom-in-95 absolute right-0 top-11 z-50 w-40 overflow-hidden rounded-2xl border shadow-2xl duration-150 ${
                        isDark
                          ? "border-white/10 bg-[#11141D] shadow-black/40"
                          : "border-slate-200 bg-white shadow-slate-300/40"
                      }`}
                    >
                      <div className="h-0.5 w-full bg-gradient-to-r from-amber-500 via-red-500 to-rose-600" />

                      <div className="p-1.5">
                        {LANGUAGE_OPTIONS.map((option) => (
                          <button
                            key={option.code}
                            type="button"
                            onClick={() => handleLanguageChange(option.code)}
                            className={`flex w-full cursor-pointer items-center justify-between rounded-xl px-3 py-2.5 text-xs font-bold transition ${
                              language === option.code
                                ? isDark
                                  ? "bg-amber-500/10 text-amber-400"
                                  : "bg-amber-50 text-amber-600"
                                : isDark
                                  ? "text-slate-300 hover:bg-white/[0.05]"
                                  : "text-slate-600 hover:bg-slate-50"
                            }`}
                          >
                            <span>{option.label}</span>
                            {language === option.code && (
                              <span className="text-amber-500">✓</span>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* USER / GUEST */}

              {mounted && user ? (
                <div className="flex items-center gap-2.5">
                  {(user.role === "ADMIN" || user.role === "STAFF") && (
                    <Link
                      href="/admin/dashboard"
                      className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-bold shadow-sm transition ${
                        isDark
                          ? "border-white/10 bg-white/[0.04] text-slate-300 hover:border-white/20 hover:bg-white/[0.08] hover:text-white"
                          : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-950"
                      }`}
                    >
                      <ShieldAlert className="h-3.5 w-3.5" />
                      <span>{t("adminConsole")}</span>
                    </Link>
                  )}

                  <div className="relative" ref={dropdownRef}>
                    <button
                      type="button"
                      onClick={() => setProfileDropdownOpen((prev) => !prev)}
                      className={`flex cursor-pointer items-center gap-2.5 rounded-full py-1 pl-1 pr-3.5 transition ${
                        isDark
                          ? "bg-white/[0.04] hover:bg-white/[0.09]"
                          : "bg-slate-50 hover:bg-slate-100"
                      } ${profileDropdownOpen ? "ring-1 ring-amber-500/40" : ""}`}
                    >
                      <div className="relative flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-amber-500 to-red-600 p-[1.5px]">
                        <div className="flex h-full w-full items-center justify-center overflow-hidden rounded-full bg-slate-900 text-[11px] font-bold text-amber-400">
                          {getAvatarPath(user) && !avatarError ? (
                            <img
                              key={getAvatarPath(user)}
                              src={resolveAvatarUrl(getAvatarPath(user))!}
                              alt="Avatar"
                              className="h-full w-full object-cover"
                              onError={() => setAvatarError(true)}
                            />
                          ) : (
                            user.fullName?.substring(0, 2).toUpperCase() || "US"
                          )}
                        </div>
                      </div>

                      <div className="hidden flex-col text-left lg:flex">
                        <span
                          className={`max-w-[100px] truncate text-xs font-bold leading-tight ${
                            isDark ? "text-slate-200" : "text-slate-800"
                          }`}
                        >
                          {user.fullName}
                        </span>
                        <span className="font-mono text-[9px] font-bold uppercase tracking-wider text-amber-500">
                          {user.role}
                        </span>
                      </div>
                      <ChevronDown
                        className={`h-3.5 w-3.5 shrink-0 text-slate-400 transition-transform ${
                          profileDropdownOpen ? "rotate-180" : ""
                        }`}
                      />
                    </button>

                    {profileDropdownOpen && (
                      <div
                        className={`animate-in fade-in zoom-in-95 absolute right-0 top-12 z-50 w-64 overflow-hidden rounded-2xl border shadow-2xl duration-150 ${
                          isDark
                            ? "border-white/10 bg-[#11141D] text-slate-200 shadow-black/40"
                            : "border-slate-200 bg-white text-slate-800 shadow-slate-300/40"
                        }`}
                      >
                        <div className="h-0.5 w-full bg-gradient-to-r from-amber-500 via-red-500 to-rose-600" />

                        <div
                          className={`flex items-center gap-3 px-4 py-3.5 ${
                            isDark ? "bg-white/[0.02]" : "bg-slate-50"
                          }`}
                        >
                          <div className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-amber-500 to-red-600 p-[1.5px]">
                            <div className="flex h-full w-full items-center justify-center overflow-hidden rounded-full bg-slate-900 text-xs font-bold text-amber-400">
                              {getAvatarPath(user) && !avatarError ? (
                                <img
                                  src={resolveAvatarUrl(getAvatarPath(user))!}
                                  alt="Avatar"
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                user.fullName?.substring(0, 2).toUpperCase() ||
                                "US"
                              )}
                            </div>
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-xs font-black">
                              {user.fullName}
                            </p>
                            <p className="truncate text-[10px] text-slate-400">
                              {user.email}
                            </p>
                          </div>
                        </div>

                        <div className="space-y-0.5 p-1.5">
                          <Link
                            href="/customer/profile"
                            onClick={() => setProfileDropdownOpen(false)}
                            className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-bold transition ${
                              isDark
                                ? "hover:bg-white/[0.06] hover:text-white"
                                : "hover:bg-slate-50 hover:text-slate-950"
                            }`}
                          >
                            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/10 text-amber-500 transition group-hover:bg-amber-500/20">
                              <User className="h-3.5 w-3.5" />
                            </span>
                            <span>Account Settings & Profile</span>
                          </Link>

                          <Link
                            href="/customer/tickets"
                            onClick={() => setProfileDropdownOpen(false)}
                            className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-bold transition ${
                              isDark
                                ? "hover:bg-white/[0.06] hover:text-white"
                                : "hover:bg-slate-50 hover:text-slate-950"
                            }`}
                          >
                            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/10 text-amber-500 transition group-hover:bg-amber-500/20">
                              <Ticket className="h-3.5 w-3.5" />
                            </span>
                            <span>My Ticket History</span>
                          </Link>

                          <Link
                            href="/customer/watchlist"
                            onClick={() => setProfileDropdownOpen(false)}
                            className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-bold transition ${
                              isDark
                                ? "hover:bg-white/[0.06] hover:text-white"
                                : "hover:bg-slate-50 hover:text-slate-950"
                            }`}
                          >
                            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-500/10 text-rose-500 transition group-hover:bg-rose-500/20">
                              <Heart className="h-3.5 w-3.5" />
                            </span>
                            <span>Saved Watchlist</span>
                          </Link>
                        </div>

                        <div
                          className={`border-t p-1.5 ${
                            isDark ? "border-white/5" : "border-slate-100"
                          }`}
                        >
                          <button
                            onClick={handleLogoutClick}
                            className={`flex w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-bold text-rose-500 transition ${
                              isDark
                                ? "hover:bg-rose-500/10"
                                : "hover:bg-rose-50"
                            }`}
                          >
                            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-500/10">
                              <LogOut className="h-3.5 w-3.5" />
                            </span>
                            <span>{t("signOut")}</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="ml-1 flex items-center gap-2.5">
                  <Link
                    href="/login"
                    className={`rounded-xl px-4 py-2 text-xs font-bold transition ${
                      isDark
                        ? "text-slate-300 hover:text-white"
                        : "text-slate-600 hover:text-slate-950"
                    }`}
                  >
                    {t("signIn")}
                  </Link>

                  <Link
                    href="/register"
                    className="rounded-xl bg-gradient-to-r from-amber-500 to-red-600 px-4 py-2 text-xs font-bold text-slate-950 shadow-lg shadow-amber-500/20 transition hover:from-amber-400 hover:to-red-500"
                  >
                    {t("register")}
                  </Link>
                </div>
              )}
            </div>

            {/* ---------------- MOBILE HAMBURGER ---------------- */}

            <button
              onClick={() => setMenuOpen(true)}
              className={`cursor-pointer rounded-xl p-2 transition md:hidden ${
                isDark
                  ? "text-slate-400 hover:bg-white/[0.06] hover:text-white"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"
              }`}
              type="button"
              aria-label={t("openMenu")}
              aria-expanded={menuOpen}
            >
              <Menu className="h-6 w-6" />
            </button>
          </div>
        </div>
      </nav>

      {/* ========================================================
          MOBILE OVERLAY
      ======================================================== */}

      <div
        className={`fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm transition-opacity duration-300 md:hidden ${
          menuOpen
            ? "pointer-events-auto opacity-100"
            : "pointer-events-none opacity-0"
        }`}
        onClick={() => setMenuOpen(false)}
        aria-hidden="true"
      />

      {/* ========================================================
          MOBILE DRAWER
      ======================================================== */}

      <aside
        suppressHydrationWarning
        className={`fixed right-0 top-0 z-[70] flex h-[100dvh] w-[86%] max-w-sm flex-col overflow-hidden border-l shadow-2xl transition-transform duration-300 ease-out md:hidden ${
          isDark ? "border-white/5 bg-[#0A0C14]" : "border-slate-200 bg-white"
        } ${menuOpen ? "translate-x-0" : "translate-x-full"}`}
        aria-hidden={!menuOpen}
      >
        <div
          aria-hidden="true"
          className={`pointer-events-none absolute -top-24 right-[-20%] h-72 w-72 rounded-full blur-3xl ${
            isDark ? "bg-amber-500/10" : "bg-amber-500/15"
          }`}
        />

        {/* HEADER */}

        <div
          className={`relative flex h-16 shrink-0 items-center justify-between border-b px-5 ${
            isDark ? "border-white/5" : "border-slate-200"
          }`}
        >
          <Link
            href="/"
            onClick={() => setMenuOpen(false)}
            className="flex items-center gap-2"
          >
            <Image
              src={mounted ? logoUrl : "/logo2.png"} // 🌟 Hydration-safe dynamic logo
              alt="CineMax"
              width={100}
              height={32}
              priority
              className="h-8 w-auto object-contain"
            />
            <span
              className={`text-sm font-black tracking-tight ${
                isDark ? "text-white" : "text-slate-900"
              }`}
            >
              CINE<span className="text-red-500">MAX</span>
            </span>
          </Link>

          <button
            onClick={() => setMenuOpen(false)}
            className={`cursor-pointer rounded-full border p-2 transition ${
              isDark
                ? "border-white/10 bg-white/[0.04] text-slate-400 hover:bg-white/[0.08] hover:text-white"
                : "border-slate-200 bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
            }`}
            type="button"
            aria-label={t("closeMenu")}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="relative flex flex-1 flex-col overflow-y-auto">
          <div className="p-5 pb-0">
            {!mounted ? (
              <div className="h-16 w-full animate-pulse rounded-2xl bg-white/[0.04]" />
            ) : user ? (
              <div
                className={`flex items-center gap-3 rounded-2xl border p-3.5 ${
                  isDark
                    ? "border-white/10 bg-white/[0.04]"
                    : "border-slate-200 bg-slate-50"
                }`}
              >
                <Link
                  href="/customer/profile"
                  onClick={() => setMenuOpen(false)}
                  className="group flex min-w-0 flex-1 cursor-pointer items-center gap-3"
                >
                  <div
                    className={`flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 text-sm font-bold transition group-hover:border-amber-500 ${
                      isDark
                        ? "border-amber-500/40 bg-[#0B0C10] text-amber-400"
                        : "border-amber-500/50 bg-white text-amber-500"
                    }`}
                  >
                    {getAvatarPath(user) && !avatarError ? (
                      <img
                        key={getAvatarPath(user)}
                        src={resolveAvatarUrl(getAvatarPath(user))!}
                        alt="Avatar"
                        className="h-full w-full object-cover"
                        onError={() => setAvatarError(true)}
                      />
                    ) : (
                      user.fullName?.substring(0, 2).toUpperCase() || "US"
                    )}
                  </div>

                  <div className="min-w-0 flex-1 text-left">
                    <p
                      className={`truncate text-sm font-bold transition group-hover:text-amber-500 ${
                        isDark ? "text-white" : "text-slate-900"
                      }`}
                    >
                      {user.fullName}
                    </p>
                    <p
                      className={`mt-0.5 text-[10px] font-bold uppercase tracking-wider ${
                        isDark ? "text-slate-500" : "text-slate-400"
                      }`}
                    >
                      {user.role} • View Profile
                    </p>
                  </div>
                </Link>

                <button
                  onClick={handleLogoutClick}
                  className={`shrink-0 cursor-pointer rounded-full p-2 transition ${
                    isDark
                      ? "text-slate-500 hover:bg-white/[0.08] hover:text-white"
                      : "text-slate-400 hover:bg-slate-100 hover:text-slate-900"
                  }`}
                  type="button"
                  title={t("signOut")}
                  aria-label={t("signOut")}
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2.5">
                <Link
                  href="/login"
                  onClick={() => setMenuOpen(false)}
                  className={`flex-1 rounded-2xl border py-3 text-center text-sm font-bold transition ${
                    isDark
                      ? "border-white/10 bg-white/[0.04] text-white hover:bg-white/[0.08]"
                      : "border-slate-200 bg-slate-50 text-slate-800 hover:bg-slate-100"
                  }`}
                >
                  {t("signIn")}
                </Link>
                <Link
                  href="/register"
                  onClick={() => setMenuOpen(false)}
                  className="flex-1 rounded-2xl bg-gradient-to-r from-amber-500 to-red-600 py-3 text-center text-sm font-bold text-slate-950 shadow-lg shadow-amber-500/20 transition hover:from-amber-400 hover:to-red-500"
                >
                  {t("register")}
                </Link>
              </div>
            )}

            {mounted && user && (
              <div className="mt-3 grid grid-cols-2 gap-2.5">
                <Link
                  href="/customer/watchlist"
                  onClick={() => setMenuOpen(false)}
                  className={`flex items-center justify-center gap-2 rounded-2xl border py-3 text-xs font-bold transition ${
                    isDark
                      ? "border-white/10 bg-white/[0.04] text-slate-300 hover:bg-white/[0.08] hover:text-white"
                      : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  <Heart className="h-4 w-4 fill-rose-500 text-rose-500" />
                  <span>Watchlist</span>
                </Link>
                <Link
                  href="/customer/tickets"
                  onClick={() => setMenuOpen(false)}
                  className={`flex items-center justify-center gap-2 rounded-2xl border py-3 text-xs font-bold transition ${
                    isDark
                      ? "border-white/10 bg-white/[0.04] text-slate-300 hover:bg-white/[0.08] hover:text-white"
                      : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  <Ticket className="h-4 w-4 text-amber-500" />
                  <span>My Bookings</span>
                </Link>
              </div>
            )}
          </div>

          <div className="space-y-1.5 p-5">
            {navItems.map((item, index) => {
              const active = item.match(pathname);
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMenuOpen(false)}
                  style={{
                    transitionDelay: menuOpen ? `${index * 40}ms` : "0ms",
                  }}
                  className={`flex translate-x-3 items-center gap-3 rounded-2xl px-4 py-3.5 text-sm font-bold opacity-0 transition-all duration-300 ease-out ${
                    menuOpen ? "translate-x-0 opacity-100" : ""
                  } ${
                    active
                      ? "bg-amber-500 font-black text-slate-950 shadow-lg shadow-amber-500/25"
                      : isDark
                        ? "text-slate-300 hover:bg-white/[0.06] hover:text-white"
                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"
                  }`}
                >
                  <Icon
                    className={`h-4 w-4 ${
                      active ? "text-slate-950" : "text-amber-500"
                    }`}
                  />
                  <span>{item.label}</span>
                </Link>
              );
            })}

            {mounted &&
              user &&
              (user.role === "ADMIN" || user.role === "STAFF") && (
                <Link
                  href="/admin/dashboard"
                  onClick={() => setMenuOpen(false)}
                  className={`flex items-center gap-3 rounded-2xl border px-4 py-3.5 text-sm font-bold transition ${
                    isDark
                      ? "border-white/10 bg-white/[0.04] text-slate-300 hover:bg-white/[0.08] hover:text-white"
                      : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-950"
                  }`}
                >
                  <ShieldAlert className="h-4 w-4 text-amber-500" />
                  <span>{t("adminConsole")}</span>
                </Link>
              )}
          </div>

          <div
            className={`mx-5 border-t ${
              isDark ? "border-white/5" : "border-slate-200"
            }`}
          />

          <div className="p-5">
            <p
              className={`mb-3 px-1 text-[10px] font-black uppercase tracking-[0.2em] ${
                isDark ? "text-slate-600" : "text-slate-400"
              }`}
            >
              {t("settingsTitle")}
            </p>

            <button
              type="button"
              onClick={() => {
                toggleTheme();
                const nextTheme = theme === "dark" ? "light" : "dark";
                document.documentElement.classList.remove("dark", "light");
                document.documentElement.classList.add(nextTheme);
                document.documentElement.setAttribute("data-theme", nextTheme);
              }}
              className={`mb-3 flex w-full cursor-pointer items-center justify-between rounded-2xl border px-4 py-3.5 text-sm font-bold transition ${
                isDark
                  ? "border-white/10 bg-white/[0.04] text-slate-200 hover:bg-white/[0.08]"
                  : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
              }`}
            >
              <span className="flex items-center gap-3">
                {isDark ? (
                  <Sun className="h-4 w-4 text-amber-400" />
                ) : (
                  <Moon className="h-4 w-4 text-slate-600" />
                )}
                <span>{isDark ? t("lightMode") : t("darkMode")}</span>
              </span>
              <span className="text-[10px] uppercase tracking-wider text-slate-400">
                {isDark ? t("navDark") : t("navLight")}
              </span>
            </button>

            <div
              className={`rounded-2xl border ${
                isDark
                  ? "border-white/10 bg-white/[0.04]"
                  : "border-slate-200 bg-slate-50"
              }`}
            >
              <div
                className={`flex items-center gap-3 px-4 py-3 ${
                  isDark ? "text-slate-300" : "text-slate-700"
                }`}
              >
                <Languages className="h-4 w-4 text-amber-500" />
                <span className="text-sm font-bold">{t("language")}</span>
              </div>

              <div
                className={`grid grid-cols-3 gap-2 border-t p-2 ${
                  isDark ? "border-white/5" : "border-slate-200"
                }`}
              >
                {LANGUAGE_OPTIONS.map((option) => (
                  <button
                    key={option.code}
                    type="button"
                    onClick={() => handleLanguageChange(option.code)}
                    className={`cursor-pointer rounded-xl px-2 py-2 text-xs font-bold transition ${
                      language === option.code
                        ? "bg-amber-500 font-black text-slate-950"
                        : isDark
                          ? "text-slate-400 hover:bg-white/[0.05]"
                          : "text-slate-500 hover:bg-white"
                    }`}
                  >
                    {option.shortLabel}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div
            className={`mt-auto border-t p-5 ${
              isDark ? "border-white/5" : "border-slate-200"
            }`}
          >
            <div
              className={`rounded-2xl border p-4 ${
                isDark
                  ? "border-white/10 bg-white/[0.03]"
                  : "border-slate-200 bg-slate-50"
              }`}
            >
              <p className="text-[9px] font-black uppercase tracking-[0.25em] text-amber-500">
                CINEMAX
              </p>
              <p
                className={`mt-1 text-[10px] leading-relaxed ${
                  isDark ? "text-slate-500" : "text-slate-500"
                }`}
              >
                {t("yourUltimateMovieExperience")}
              </p>
            </div>
          </div>
        </div>
      </aside>

      <ConfirmDialog
        isOpen={logoutConfirmOpen}
        type="LOGOUT"
        title={t("logoutTitle")}
        targetName={user?.fullName || t("logoutTargetFallback")}
        loading={logoutLoading}
        onConfirm={handleLogoutConfirm}
        onCancel={handleLogoutCancel}
      />
    </>
  );
}
