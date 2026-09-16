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
  ArrowRight,
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
  const isLight = theme === "light";

  /**

* ============================================================
* LANGUAGE
* ============================================================
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

      router.push(`/reset-password?email=${encodeURIComponent(cleanEmail)}`);
    } catch (err: any) {
      setErrorMsg(
        err?.response?.data?.status?.message ||
          err?.response?.data?.message ||
          t("forgot.failed"),
      );
    } finally {
      setLoading(false);
    }
  };

  /**

* ============================================================
* STYLES
* Same Cyber-Cinematic design as Login/Register
* ============================================================
  */

  const pageClass = isLight
    ? "bg-slate-100 text-slate-900"
    : "bg-slate-950 text-slate-100";

  const cardClass = isLight
    ? "border border-slate-300 bg-white/90 shadow-2xl shadow-slate-300/50 backdrop-blur-2xl"
    : "border border-sky-500/20 bg-slate-900/80 shadow-[0_0_50px_rgba(0,0,0,0.8),inset_0_1px_1px_rgba(255,255,255,0.1)] backdrop-blur-2xl";

  const titleClass = isLight ? "text-slate-900" : "text-white";

  const descriptionClass = isLight ? "text-slate-500" : "text-slate-400";

  const labelClass = isLight ? "text-slate-700" : "text-amber-400/90";

  const inputClass = isLight
    ? "bg-slate-50 text-slate-900 border-slate-300 placeholder:text-slate-400 focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
    : "bg-slate-950/80 text-white border-slate-800/80 placeholder:text-slate-500 focus:border-amber-500/60 focus:ring-2 focus:ring-amber-500/20";

  const iconClass = isLight ? "text-slate-400" : "text-amber-500/70";

  const footerTextClass = isLight ? "text-slate-500" : "text-slate-400";

  return (
    <div
      className={`         min-h-[85vh]
        flex
        items-center
        justify-center
        py-12
        px-4
        transition-colors
        duration-300
        ${pageClass}
      `}
    >
      <div
        className={`           w-full
          max-w-md
          rounded-[2.5rem]
          p-8
          sm:p-10
          space-y-6
          transition-all
          duration-300
          relative
          overflow-hidden
          ${cardClass}
        `}
      >
        {/* =====================================================
AMBIENT GLOW
===================================================== */}

        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-48 h-48 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />
        {/* =====================================================
        HEADER
    ===================================================== */}
        <div className="space-y-3 text-center relative z-10">
          {/* CINEMAX LOGO */}

          <div className="mx-auto flex w-40 items-center justify-center py-1 drop-shadow-[0_4px_16px_rgba(245,158,11,0.3)]">
            <img
              src="/logo2.png"
              alt="Logo"
              className="h-12 w-full object-contain"
            />
          </div>

          {/* KEY ICON */}

          <div className="mx-auto mt-1 flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500 to-red-600 shadow-[0_0_25px_rgba(245,158,11,0.35)]">
            <KeyRound className="h-5 w-5 text-slate-950" />
          </div>

          <h1
            className={`
          text-2xl
          font-black
          tracking-tight
          transition-colors
          duration-300
          ${titleClass}
        `}
          >
            {t("forgot.title")}
          </h1>

          <p
            className={`
          text-xs
          leading-relaxed
          transition-colors
          duration-300
          ${descriptionClass}
        `}
          >
            {t("forgot.subtitle")}
          </p>
        </div>
        {/* =====================================================
        ERROR
    ===================================================== */}
        {errorMsg && (
          <div className="flex items-start gap-2 rounded-2xl border border-red-500/30 bg-red-500/10 p-3.5 text-xs text-red-500 relative z-10">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />

            <span className="font-medium">{errorMsg}</span>
          </div>
        )}
        {/* =====================================================
        FORM
    ===================================================== */}
        <form
          onSubmit={handleSubmit}
          noValidate
          className="space-y-4 text-xs relative z-10"
        >
          {/* EMAIL */}

          <div>
            <label
              htmlFor="email"
              className={`
            block
            mb-1.5
            font-semibold
            tracking-wide
            transition-colors
            duration-300
            ${labelClass}
          `}
            >
              {t("forgot.email")} <span className="text-amber-500">*</span>
            </label>

            <div className="relative">
              <Mail
                className={`
              absolute
              left-4
              top-1/2
              -translate-y-1/2
              h-4
              w-4
              transition-colors
              duration-300
              ${iconClass}
            `}
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
                className={`
              w-full
              rounded-2xl
              border
              py-3.5
              pl-11
              pr-4
              outline-none
              transition-all
              duration-300
              disabled:cursor-not-allowed
              disabled:opacity-50
              ${inputClass}
            `}
              />
            </div>
          </div>

          {/* ===================================================
          SUBMIT BUTTON
      =================================================== */}

          <button
            type="submit"
            disabled={loading || !email.trim()}
            className="
          flex
          w-full
          items-center
          justify-center
          gap-2
          rounded-2xl
          bg-gradient-to-r
          from-amber-500
          to-red-600
          py-4
          text-xs
          font-extrabold
          uppercase
          tracking-wider
          text-slate-950
          shadow-[0_0_25px_rgba(245,158,11,0.4)]
          hover:from-amber-400
          hover:to-red-500
          hover:shadow-[0_0_35px_rgba(245,158,11,0.6)]
          disabled:cursor-not-allowed
          disabled:opacity-50
          transition-all
          duration-300
        "
          >
            {loading && (
              <Loader2 className="h-4 w-4 animate-spin text-slate-950" />
            )}

            <span>{loading ? t("forgot.sending") : t("forgot.sendCode")}</span>

            {!loading && <ArrowRight className="h-4 w-4 stroke-[3]" />}
          </button>
        </form>
        {/* =====================================================
        DIVIDER
    ===================================================== */}
        <div className="flex items-center gap-3 relative z-10">
          <div className="h-px flex-1 border-t border-slate-800/80" />

          <span
            className={`
          text-[10px]
          font-semibold
          uppercase
          tracking-wider
          ${isLight ? "text-slate-400" : "text-slate-500"}
        `}
          >
            Account access
          </span>

          <div className="h-px flex-1 border-t border-slate-800/80" />
        </div>
        {/* =====================================================
        BACK TO LOGIN
    ===================================================== */}
        <div className="relative z-10 text-center">
          <Link
            href="/login"
            className={`
          inline-flex
          items-center
          gap-1.5
          text-xs
          font-bold
          transition-colors
          ${
            isLight
              ? "text-amber-500 hover:text-amber-600"
              : "text-amber-400 hover:text-amber-300"
          }
        `}
          >
            <ArrowLeft className="h-3.5 w-3.5" />

            {t("forgot.back")}
          </Link>
        </div>
        {/* =====================================================
        FOOTER HINT
    ===================================================== */}
        <div
          className={`
        relative
        z-10
        rounded-2xl
        border
        p-4
        transition-colors
        ${
          isLight
            ? "border-slate-200 bg-slate-50"
            : "border-slate-800/80 bg-slate-950/50"
        }
      `}
        >
          <p
            className={`
          text-center
          text-[10px]
          leading-relaxed
          transition-colors
          ${footerTextClass}
        `}
          >
            {t("forgot.subtitle")}
          </p>
        </div>
      </div>
    </div>
  );
}
