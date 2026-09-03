"use client";

import { useEffect, useState } from "react";
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
} from "lucide-react";

import { UserResponse } from "@/app/types/api.types";
import { AuthService } from "@/app/service/auth.service";
import ConfirmDialog from "@/app/components/ConfirmDialog";
import { useSettings, Language } from "@/app/context/SettingsContext";

const LANGUAGE_OPTIONS: {
  code: Language;
  label: string;
  shortLabel: string;
}[] = [
  { code: "en", label: "English", shortLabel: "English" },
  { code: "km", label: "ខ្មែរ", shortLabel: "ខ្មែរ" },
  { code: "zh", label: "中文", shortLabel: "中文" },
];

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();

  const { theme, toggleTheme, language, setLanguage, t } = useSettings();

  const [user, setUser] = useState<UserResponse | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [languageOpen, setLanguageOpen] = useState(false);

  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
  const [logoutLoading, setLogoutLoading] = useState(false);

  /*
   * Load current user.
   */
  useEffect(() => {
    setMounted(true);

    try {
      const currentUser = AuthService.getCurrentUser();
      setUser(currentUser);
    } catch {
      setUser(null);
    }
  }, [pathname]);

  /*
   * Detect navbar scroll.
   */
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 8);
    };

    handleScroll();

    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  /*
   * Close menus when route changes.
   */
  useEffect(() => {
    setMenuOpen(false);
    setLanguageOpen(false);
  }, [pathname]);

  /*
   * Prevent background scrolling when mobile menu is open.
   */
  useEffect(() => {
    if (menuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  /*
   * Logout.
   */
  const handleLogoutClick = () => {
    if (!user) return;

    setMenuOpen(false);
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

  /*
   * Language.
   */
  const handleLanguageChange = (value: Language) => {
    setLanguage(value);
    setLanguageOpen(false);
  };

  const currentLanguageLabel =
    LANGUAGE_OPTIONS.find((option) => option.code === language)
      ?.shortLabel ?? "English";

  /*
   * Admin pages have their own navbar.
   */
  if (pathname.startsWith("/admin")) {
    return null;
  }

  const isDark = theme === "dark";

  return (
    <>
      {/* =========================================================
          DESKTOP / MAIN NAVBAR
      ========================================================= */}
      <nav
        suppressHydrationWarning
        className={`sticky top-0 z-40 w-full border-b backdrop-blur-xl transition-all duration-300 ${
          isDark
            ? `border-white/5 ${isScrolled ? "bg-[#0A0C14]/90" : "bg-[#0A0C14]"}`
            : `border-slate-200 ${isScrolled ? "bg-white/95" : "bg-white"}`
        }`}
      >
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-8">
          {/* LOGO */}
          <Link href="/" className="group flex items-center gap-2">
            <Image
              src="/logo2.png"
              alt="CineMax"
              width={120}
              height={36}
              priority
              className="h-9 w-auto object-contain transition-transform group-hover:scale-105"
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

          {/* DESKTOP NAVIGATION */}
          <div className="hidden items-center gap-6 text-xs font-bold md:flex">
            {/* Movies */}
            <Link
              href="/"
              className={`text-sm transition ${
                pathname === "/"
                  ? "text-red-500"
                  : isDark
                    ? "text-slate-300 hover:text-white"
                    : "text-slate-600 hover:text-slate-950"
              }`}
            >
              {t("moviesAndShowtimes")}
            </Link>

            {/* Cinemas */}
            <Link
              href="/customer/cinemas"
              suppressHydrationWarning
              className={`text-sm transition ${
                pathname.startsWith("/customer/cinemas")
                  ? "text-red-500"
                  : isDark
                    ? "text-slate-300 hover:text-white"
                    : "text-slate-600 hover:text-slate-950"
              }`}
            >
              {t("cinemasAndLocations")}
            </Link>

            {/* Tickets */}
            {mounted && user && (
              <Link
                href="/customer/tickets"
                className={`flex items-center gap-1.5 transition ${
                  pathname.startsWith("/customer/tickets")
                    ? "text-red-500"
                    : isDark
                      ? "text-slate-300 hover:text-white"
                      : "text-slate-600 hover:text-slate-950"
                }`}
              >
                <Ticket className="h-3.5 w-3.5" />
                <span>{t("myBookings")}</span>
              </Link>
            )}
          </div>

          {/* DESKTOP ACTIONS */}
          <div className="hidden items-center gap-2 md:flex">
            {/* Theme */}
            <button
              suppressHydrationWarning
              type="button"
              onClick={toggleTheme}
              aria-label={isDark ? t("lightMode") : t("darkMode")}
              title={isDark ? t("lightMode") : t("darkMode")}
              className={`flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl border transition ${
                isDark
                  ? "border-white/10 bg-white/[0.04] text-amber-400 hover:bg-white/[0.08]"
                  : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
              }`}
            >
              {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>

            {/* Language */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setLanguageOpen((value) => !value)}
                aria-label={t("language")}
                className={`flex h-9 cursor-pointer items-center gap-1.5 rounded-xl border px-3 text-xs font-bold transition ${
                  isDark
                    ? "border-white/10 bg-white/[0.04] text-slate-300 hover:bg-white/[0.08] hover:text-white"
                    : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
                }`}
              >
                <Languages className="h-4 w-4" />
                <span>{currentLanguageLabel}</span>
                <ChevronDown
                  className={`h-3.5 w-3.5 transition ${languageOpen ? "rotate-180" : ""}`}
                />
              </button>

              {languageOpen && (
                <div
                  className={`absolute right-0 top-11 w-36 overflow-hidden rounded-xl border shadow-2xl ${
                    isDark ? "border-white/10 bg-[#11141D]" : "border-slate-200 bg-white"
                  }`}
                >
                  {LANGUAGE_OPTIONS.map((option) => (
                    <button
                      key={option.code}
                      type="button"
                      onClick={() => handleLanguageChange(option.code)}
                      className={`flex w-full cursor-pointer items-center justify-between px-4 py-3 text-xs font-bold transition ${
                        language === option.code
                          ? "text-red-500"
                          : isDark
                            ? "text-slate-300 hover:bg-white/[0.05]"
                            : "text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      <span>{option.label}</span>
                      {language === option.code && <span>✓</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* USER */}
            {user ? (
              <div className="ml-1 flex items-center gap-3">
                {/* Admin */}
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

                {/* User information */}
                <div
                  className={`flex items-center gap-2.5 border-l pl-3 ${
                    isDark ? "border-white/10" : "border-slate-200"
                  }`}
                >
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-xl border text-xs font-bold ${
                      isDark
                        ? "border-white/10 bg-white/[0.04] text-red-400"
                        : "border-slate-200 bg-slate-50 text-red-500"
                    }`}
                  >
                    {user.fullName?.substring(0, 2).toUpperCase() || "US"}
                  </div>

                  <div className="flex flex-col">
                    <span
                      className={`text-xs font-bold leading-tight ${
                        isDark ? "text-slate-200" : "text-slate-800"
                      }`}
                    >
                      {user.fullName}
                    </span>

                    <span
                      className={`font-mono text-[10px] font-bold uppercase tracking-wider ${
                        isDark ? "text-slate-500" : "text-slate-400"
                      }`}
                    >
                      {user.role}
                    </span>
                  </div>

                  {/* Logout icon */}
                  <button
                    onClick={handleLogoutClick}
                    className={`ml-2 cursor-pointer rounded-xl p-1.5 transition ${
                      isDark
                        ? "text-slate-500 hover:bg-white/[0.06] hover:text-white"
                        : "text-slate-400 hover:bg-slate-100 hover:text-slate-900"
                    }`}
                    title={t("signOut")}
                    type="button"
                    aria-label={t("signOut")}
                  >
                    <LogOut className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ) : (
              /* GUEST */
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
                  className="rounded-xl bg-gradient-to-r from-red-600 to-rose-600 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-red-600/30 transition hover:from-red-500 hover:to-rose-500"
                >
                  {t("register")}
                </Link>
              </div>
            )}
          </div>

          {/* MOBILE MENU BUTTON */}
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
      </nav>

      {/* =========================================================
          MOBILE OVERLAY
      ========================================================= */}
      <div
        className={`fixed inset-0 z-[60] backdrop-blur-sm transition-opacity duration-300 md:hidden ${
          isDark ? "bg-black/70" : "bg-slate-900/30"
        } ${menuOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"}`}
        onClick={() => setMenuOpen(false)}
        aria-hidden="true"
      />

      {/* =========================================================
          MOBILE DRAWER
      ========================================================= */}
      <aside
        suppressHydrationWarning
        className={`fixed left-0 top-0 z-[70] flex h-screen w-[82%] max-w-sm flex-col border-r shadow-2xl transition-transform duration-300 ease-out md:hidden ${
          isDark ? "border-white/5 bg-[#0A0C14]" : "border-slate-200 bg-white"
        } ${menuOpen ? "translate-x-0" : "-translate-x-full"}`}
        aria-hidden={!menuOpen}
      >
        {/* MOBILE HEADER */}
        <div
          className={`flex h-16 items-center justify-between border-b px-5 ${
            isDark ? "border-white/5" : "border-slate-200"
          }`}
        >
          <Link
            href="/"
            onClick={() => setMenuOpen(false)}
            className="flex items-center gap-2"
          >
            <Image
              src="/logo2.png"
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
            className={`cursor-pointer rounded-xl border p-2 transition ${
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

        <div className="flex flex-1 flex-col overflow-y-auto">
          {/* =====================================================
              SETTINGS
          ===================================================== */}
          <div className="p-5">
            <p
              className={`mb-4 px-2 text-[10px] font-black uppercase tracking-[0.2em] ${
                isDark ? "text-slate-600" : "text-slate-400"
              }`}
            >
              {t("settingsTitle")}
            </p>

            {/* Theme */}
            <button
              type="button"
              onClick={toggleTheme}
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

            {/* Language */}
            <div
              className={`rounded-2xl border ${
                isDark ? "border-white/10 bg-white/[0.04]" : "border-slate-200 bg-slate-50"
              }`}
            >
              <div
                className={`flex items-center gap-3 px-4 py-3 ${
                  isDark ? "text-slate-300" : "text-slate-700"
                }`}
              >
                <Languages className="h-4 w-4 text-red-500" />
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
                        ? "bg-red-600 text-white"
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

          {/* DIVIDER */}
          <div className={`mx-5 border-t ${isDark ? "border-white/5" : "border-slate-200"}`} />

          {/* =====================================================
              NAVIGATION
          ===================================================== */}
          <div className="space-y-2 p-5">
            <p
              className={`mb-4 px-2 text-[10px] font-black uppercase tracking-[0.2em] ${
                isDark ? "text-slate-600" : "text-slate-400"
              }`}
            >
              {t("navigation")}
            </p>

            {/* Movies */}
            <Link
              href="/"
              onClick={() => setMenuOpen(false)}
              className={`flex items-center rounded-2xl px-4 py-3.5 text-sm font-bold transition ${
                pathname === "/"
                  ? isDark
                    ? "bg-white/[0.06] text-white"
                    : "bg-slate-100 text-slate-950"
                  : isDark
                    ? "text-slate-300 hover:bg-white/[0.06] hover:text-white"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"
              }`}
            >
              {t("moviesAndShowtimes")}
            </Link>

            {/* Cinemas */}
            <Link
              href="/customer/cinemas"
              onClick={() => setMenuOpen(false)}
              className={`flex items-center rounded-2xl px-4 py-3.5 text-sm font-bold transition ${
                pathname.startsWith("/customer/cinemas")
                  ? isDark
                    ? "bg-white/[0.06] text-white"
                    : "bg-slate-100 text-slate-950"
                  : isDark
                    ? "text-slate-300 hover:bg-white/[0.06] hover:text-white"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"
              }`}
            >
              {t("cinemasAndLocations")}
            </Link>

            {/* Tickets */}
            {mounted && user && (
              <Link
                href="/customer/tickets"
                onClick={() => setMenuOpen(false)}
                className={`flex items-center gap-3 rounded-2xl px-4 py-3.5 text-sm font-bold transition ${
                  pathname.startsWith("/customer/tickets")
                    ? isDark
                      ? "bg-white/[0.06] text-white"
                      : "bg-slate-100 text-slate-950"
                    : isDark
                      ? "text-slate-300 hover:bg-white/[0.06] hover:text-white"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"
                }`}
              >
                <Ticket className="h-4 w-4" />
                <span>{t("myBookings")}</span>
              </Link>
            )}

            {/* Admin */}
            {mounted && (user?.role === "ADMIN" || user?.role === "STAFF") && (
              <Link
                href="/admin/dashboard"
                onClick={() => setMenuOpen(false)}
                className={`flex items-center gap-3 rounded-2xl border px-4 py-3.5 text-sm font-bold transition ${
                  isDark
                    ? "border-white/10 bg-white/[0.04] text-slate-300 hover:bg-white/[0.08] hover:text-white"
                    : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-950"
                }`}
              >
                <ShieldAlert className="h-4 w-4" />
                <span>{t("adminConsole")}</span>
              </Link>
            )}
          </div>

          {/* DIVIDER */}
          <div className={`mx-5 border-t ${isDark ? "border-white/5" : "border-slate-200"}`} />

          {/* =====================================================
              ACCOUNT
          ===================================================== */}
          <div className="p-5">
            <p
              className={`mb-4 px-2 text-[10px] font-black uppercase tracking-[0.2em] ${
                isDark ? "text-slate-600" : "text-slate-400"
              }`}
            >
              {t("account")}
            </p>

            {/* Not resolved yet */}
            {!mounted ? (
              <div className="space-y-3">
                <div className="h-16 w-full animate-pulse rounded-2xl bg-slate-200/60 dark:bg-white/[0.04]" />
                <div className="h-12 w-full animate-pulse rounded-2xl bg-slate-200/60 dark:bg-white/[0.04]" />
              </div>
            ) : user ? (
              <div className="space-y-4">
                {/* User card */}
                <div
                  className={`flex items-center gap-3 rounded-2xl border p-4 ${
                    isDark ? "border-white/10 bg-white/[0.04]" : "border-slate-200 bg-slate-50"
                  }`}
                >
                  <div
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border text-sm font-bold ${
                      isDark
                        ? "border-white/10 bg-[#0B0C10] text-red-400"
                        : "border-slate-200 bg-white text-red-500"
                    }`}
                  >
                    {user.fullName?.substring(0, 2).toUpperCase() || "US"}
                  </div>

                  <div className="min-w-0">
                    <p
                      className={`truncate text-sm font-bold ${
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
                      {user.role}
                    </p>
                  </div>
                </div>

                {/* Logout */}
                <button
                  onClick={handleLogoutClick}
                  className={`flex w-full cursor-pointer items-center justify-between rounded-2xl border px-4 py-3.5 text-sm font-bold transition ${
                    isDark
                      ? "border-white/10 bg-white/[0.04] text-slate-300 hover:bg-white/[0.08] hover:text-white"
                      : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-950"
                  }`}
                  type="button"
                >
                  <span>{t("signOut")}</span>
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            ) : (
              /* Guest */
              <div className="space-y-3">
                {/* Sign in */}
                <Link
                  href="/login"
                  onClick={() => setMenuOpen(false)}
                  className={`flex w-full items-center justify-center rounded-2xl border py-3.5 text-sm font-bold transition ${
                    isDark
                      ? "border-white/10 bg-white/[0.04] text-white hover:bg-white/[0.08]"
                      : "border-slate-200 bg-slate-50 text-slate-800 hover:bg-slate-100"
                  }`}
                >
                  {t("signIn")}
                </Link>

                {/* Register */}
                <Link
                  href="/register"
                  onClick={() => setMenuOpen(false)}
                  className="flex w-full items-center justify-center rounded-2xl bg-gradient-to-r from-red-600 to-rose-600 py-3.5 text-sm font-bold text-white shadow-lg shadow-red-600/20 transition hover:from-red-500 hover:to-rose-500"
                >
                  {t("register")}
                </Link>
              </div>
            )}
          </div>

          {/* =====================================================
              FOOTER
          ===================================================== */}
          <div className={`mt-auto border-t p-5 ${isDark ? "border-white/5" : "border-slate-200"}`}>
            <div
              className={`rounded-2xl border p-4 ${
                isDark ? "border-white/10 bg-white/[0.03]" : "border-slate-200 bg-slate-50"
              }`}
            >
              <p className="text-[9px] font-black uppercase tracking-[0.25em] text-red-500">
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

      {/* =========================================================
          LOGOUT CONFIRMATION
      ========================================================= */}
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