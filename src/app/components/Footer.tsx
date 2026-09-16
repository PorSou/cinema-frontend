"use client";

import Link from "next/link";
import Image from "next/image";
import { Mail, MapPin, Phone, ShieldCheck } from "lucide-react";
import { useSettings } from "@/app/context/SettingsContext";

export default function Footer() {
  const { theme, t } = useSettings();
  const isDark = theme === "dark";

  return (
    <footer
      className={`mt-8 border-t pt-16 pb-12 ${
        isDark
          ? "border-slate-800/80 bg-[#0b0c10]"
          : "border-slate-200 bg-white"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-8 grid grid-cols-1 md:grid-cols-4 gap-10">
        {/* BRAND */}
        <div className="space-y-4">
          <div
            className={`flex items-center gap-2 font-black tracking-wider text-base ${
              isDark ? "text-white" : "text-slate-900"
            }`}
          >
            <span className="text-red-500">
              <Image
                src="/logo2.png"
                alt="CineMax"
                width={120}
                height={36}
                priority
                className="h-9 w-auto object-contain"
              />
            </span>
            <span>CINEMAX STUDIOS</span>
          </div>

          <p
            className={`text-xs leading-relaxed ${
              isDark ? "text-slate-400" : "text-slate-500"
            }`}
          >
            {t("yourUltimateDestination")}
          </p>
        </div>

        {/* QUICK NAVIGATION */}
        <div className="space-y-3">
          <h4
            className={`text-xs font-black uppercase tracking-wider ${
              isDark ? "text-white" : "text-slate-900"
            }`}
          >
            {t("quickNavigation")}
          </h4>

          <ul
            className={`space-y-2 text-xs ${
              isDark ? "text-slate-400" : "text-slate-500"
            }`}
          >
            <li>
              <Link href="/" className="hover:text-red-500 transition">
                {t("nowShowingFooter")}
              </Link>
            </li>
            <li>
              <Link href="/" className="hover:text-red-500 transition">
                {t("comingSoonFooter")}
              </Link>
            </li>
            <li>
              <Link
                href="/customer/cinemas"
                className="hover:text-red-500 transition"
              >
                {t("cinemasAndLocations")}
              </Link>
            </li>
            <li>
              <Link href="/" className="hover:text-red-500 transition">
                {t("vipSuites")}
              </Link>
            </li>
          </ul>
        </div>

        {/* SUPPORT */}
        <div className="space-y-3">
          <h4
            className={`text-xs font-black uppercase tracking-wider ${
              isDark ? "text-white" : "text-slate-900"
            }`}
          >
            {t("customerSupport")}
          </h4>

          <ul
            className={`space-y-2.5 text-xs ${
              isDark ? "text-slate-400" : "text-slate-500"
            }`}
          >
            <li className="flex items-center gap-2">
              <Phone className="h-3.5 w-3.5 text-red-500" />
              +855 12 345 678
            </li>
            <li className="flex items-center gap-2">
              <Mail className="h-3.5 w-3.5 text-red-500" />
              support@cinemax.com
            </li>
            <li className="flex items-center gap-2">
              <MapPin className="h-3.5 w-3.5 text-red-500" />
              {t("phnomPenhCambodia")}
            </li>
          </ul>
        </div>

        {/* SECURITY */}
        <div className="space-y-3">
          <h4
            className={`text-xs font-black uppercase tracking-wider ${
              isDark ? "text-white" : "text-slate-900"
            }`}
          >
            {t("secureTicketing")}
          </h4>

          <div
            className={`p-4 rounded-2xl border space-y-2 ${
              isDark
                ? "border-slate-800 bg-slate-950"
                : "border-slate-200 bg-slate-50"
            }`}
          >
            <div className="flex items-center gap-2 text-emerald-500 text-xs font-bold">
              <ShieldCheck className="h-4 w-4" />
              <span>{t("secureCheckout")}</span>
            </div>
            <p className="text-[11px] leading-relaxed text-slate-500">
              {t("secureCheckoutDescription")}
            </p>
          </div>
        </div>
      </div>

      {/* FOOTER BOTTOM */}
      <div
        className={`max-w-7xl mx-auto px-4 sm:px-8 mt-12 pt-6 border-t flex flex-col sm:flex-row items-center justify-between gap-4 text-xs ${
          isDark
            ? "border-slate-800/60 text-slate-500"
            : "border-slate-200 text-slate-500"
        }`}
      >
        <p>{t("allRightsReserved")}</p>

        <div className="flex items-center gap-6">
          <span
            className={`transition cursor-pointer ${isDark ? "hover:text-white" : "hover:text-slate-900"}`}
          >
            {t("privacyPolicy")}
          </span>
          <span
            className={`transition cursor-pointer ${isDark ? "hover:text-white" : "hover:text-slate-900"}`}
          >
            {t("termsOfService")}
          </span>
          <span
            className={`transition cursor-pointer ${isDark ? "hover:text-white" : "hover:text-slate-900"}`}
          >
            {t("cookieSettings")}
          </span>
        </div>
      </div>
    </footer>
  );
}
