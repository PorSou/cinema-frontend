"use client";

import { useState, FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  KeyRound,
  Mail,
  Loader2,
  AlertCircle,
  ArrowLeft,
} from "lucide-react";

import { AuthService } from "@/app/service/auth.service";
import { useSettings } from "@/app/context/SettingsContext";
import { useLanguage } from "@/app/context/LanguageContext";

export default function ForgotPasswordPage() {
  const router = useRouter();

  /**
   * ============================================================
   * SETTINGS / THEME
   * ============================================================
   */
  const { theme } = useSettings();

  const isDark = theme === "dark";

  /**
   * ============================================================
   * LANGUAGE
   * ============================================================
   *
   * Language is managed globally by LanguageProvider.
   *
   * Supported:
   * - English
   * - Khmer
   * - Chinese
   */
  const { t } = useLanguage();

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  /**
   * ============================================================
   * SUBMIT
   * ============================================================
   */

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail) {
      setErrorMsg(t("common.required"));
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      await AuthService.forgotPassword({
        email: cleanEmail,
      });

      router.push(
        `/reset-password?email=${encodeURIComponent(cleanEmail)}`
      );
    } catch (err: any) {
      setErrorMsg(
        err?.response?.data?.status?.message ||
          err?.response?.data?.message ||
          t("forgot.failed")
      );
    } finally {
      setLoading(false);
    }
  };

  /**
   * ============================================================
   * UI
   * ============================================================
   */

  return (
    <div
      className={`flex min-h-screen items-center justify-center p-4 transition-colors duration-300 ${
        isDark
          ? "bg-slate-950 text-slate-100"
          : "bg-slate-50 text-slate-900"
      }`}
    >
      <div
        className={`w-full max-w-md space-y-6 rounded-3xl border p-6 shadow-2xl backdrop-blur-xl transition-colors duration-300 sm:p-8 ${
          isDark
            ? "border-slate-800 bg-slate-900/90"
            : "border-slate-200 bg-white/95 shadow-slate-200/60"
        }`}
      >
        {/* =====================================================
            HEADER
        ===================================================== */}

        <div className="space-y-2 text-center">
          <div className="mb-2 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-red-600 shadow-lg shadow-red-600/30">
            <KeyRound className="h-6 w-6 text-white" />
          </div>

          <h1
            className={`text-2xl font-black tracking-tight transition-colors ${
              isDark ? "text-white" : "text-slate-900"
            }`}
          >
            {t("forgot.title")}
          </h1>

          <p
            className={`text-xs leading-relaxed transition-colors ${
              isDark ? "text-slate-400" : "text-slate-500"
            }`}
          >
            {t("forgot.subtitle")}
          </p>
        </div>

        {/* =====================================================
            ERROR MESSAGE
        ===================================================== */}

        {errorMsg && (
          <div className="flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-400">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />

            <span>{errorMsg}</span>
          </div>
        )}

        {/* =====================================================
            FORM
        ===================================================== */}

        <form
          onSubmit={handleSubmit}
          noValidate
          className="space-y-4 text-xs"
        >
          <div>
            <label
              htmlFor="email"
              className={`mb-1 block font-semibold transition-colors ${
                isDark ? "text-slate-400" : "text-slate-600"
              }`}
            >
              {t("forgot.email")}
            </label>

            <div className="relative">
              <Mail
                className={`absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 transition-colors ${
                  isDark ? "text-slate-500" : "text-slate-400"
                }`}
              />

              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);

                  if (errorMsg) {
                    setErrorMsg(null);
                  }
                }}
                placeholder={t("forgot.emailPlaceholder")}
                disabled={loading}
                className={`w-full rounded-xl border py-3 pl-10 pr-3 outline-none transition-colors ${
                  isDark
                    ? "border-slate-800 bg-slate-950 text-white placeholder:text-slate-600 focus:border-red-500"
                    : "border-slate-200 bg-slate-50 text-slate-900 placeholder:text-slate-400 focus:border-red-500 focus:bg-white"
                } disabled:cursor-not-allowed disabled:opacity-60`}
              />
            </div>
          </div>

          {/* ===================================================
              SUBMIT BUTTON
          =================================================== */}

          <button
            type="submit"
            disabled={loading || !email.trim()}
            className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-red-600 py-3 text-xs font-bold text-white shadow-lg shadow-red-600/30 transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading && (
              <Loader2 className="h-4 w-4 animate-spin" />
            )}

            <span>
              {loading
                ? t("forgot.sending")
                : t("forgot.sendCode")}
            </span>
          </button>
        </form>

        {/* =====================================================
            BACK TO LOGIN
        ===================================================== */}

        <div className="text-center">
          <Link
            href="/login"
            className={`inline-flex items-center gap-1.5 text-xs font-medium transition-colors ${
              isDark
                ? "text-slate-400 hover:text-white"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            {t("forgot.back")}
          </Link>
        </div>

        {/* =====================================================
            FOOTER HINT
        ===================================================== */}

        <div
          className={`rounded-2xl border p-4 transition-colors ${
            isDark
              ? "border-slate-800 bg-slate-950/50"
              : "border-slate-200 bg-slate-50"
          }`}
        >
          <p
            className={`text-center text-[10px] leading-relaxed transition-colors ${
              isDark ? "text-slate-500" : "text-slate-500"
            }`}
          >
            {t("forgot.subtitle")}
          </p>
        </div>
      </div>
    </div>
  );
}
