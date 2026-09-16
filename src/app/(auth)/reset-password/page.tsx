"use client";

import { useState, FormEvent, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Lock,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  ArrowLeft,
} from "lucide-react";

import { AuthService } from "@/app/service/auth.service";
import { useSettings } from "@/app/context/SettingsContext";
import { useLanguage } from "@/app/context/LanguageContext";

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  /**

* ============================================================
* THEME
* ============================================================
  */

  const { theme } = useSettings();

  const isDark = theme === "dark";
  const isLight = !isDark;

  /**

* ============================================================
* LANGUAGE
* ============================================================
  */

  const { t } = useLanguage();

  const emailParam = searchParams.get("email") || "";

  const [email] = useState(emailParam);
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [success, setSuccess] = useState(false);

  /**

* ============================================================
* CODE CHANGE
* ============================================================
  */

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, "").slice(0, 6);

    setCode(value);

    if (errorMsg) {
      setErrorMsg(null);
    }
  };

  /**

* ============================================================
* PASSWORD CHANGE
* ============================================================
  */

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewPassword(e.target.value);

    if (errorMsg) {
      setErrorMsg(null);
    }
  };

  /**

* ============================================================
* RESET PASSWORD
* ============================================================
  */

  const handleReset = async (e: FormEvent) => {
    e.preventDefault();

    if (loading || success) return;

    setErrorMsg(null);

    const cleanEmail = email.trim().toLowerCase();
    const cleanCode = code.trim();

    if (!cleanEmail) {
      setErrorMsg(t("reset.emailMissing"));
      return;
    }

    if (!cleanCode) {
      setErrorMsg(t("validation.codeRequired"));
      return;
    }

    if (cleanCode.length !== 6) {
      setErrorMsg(t("validation.codeInvalid"));
      return;
    }

    if (!newPassword) {
      setErrorMsg(t("common.required"));
      return;
    }

    if (newPassword.length < 6) {
      setErrorMsg(t("validation.passwordMin"));
      return;
    }

    setLoading(true);

    try {
      await AuthService.resetPassword({
        email: cleanEmail,
        code: cleanCode,
        newPassword,
      });

      setSuccess(true);

      setTimeout(() => {
        router.push("/login");
      }, 2000);
    } catch (err: any) {
      setErrorMsg(
        err?.response?.data?.status?.message ||
          err?.response?.data?.message ||
          t("reset.failed"),
      );
    } finally {
      setLoading(false);
    }
  };

  /**

* ============================================================
* CYBER-CINEMATIC THEME CLASSES
* ============================================================
  */

  const pageClass = isLight
    ? "bg-slate-100 text-slate-900"
    : "bg-slate-950 text-slate-100";

  const cardClass = isLight
    ? "border border-slate-300 bg-white/90 shadow-2xl shadow-slate-300/50 backdrop-blur-2xl"
    : "border border-sky-500/20 bg-slate-900/80 shadow-[0_0_50px_rgba(0,0,0,0.8),inset_0_1px_1px_rgba(255,255,255,0.1)] backdrop-blur-2xl";

  const labelClass = isLight ? "text-slate-700" : "text-amber-400/90";

  const secondaryTextClass = isLight ? "text-slate-500" : "text-slate-400";

  const inputClass = isLight
    ? "bg-slate-50 text-slate-900 border-slate-300 placeholder:text-slate-400 focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
    : "bg-slate-950/80 text-white border-slate-800/80 placeholder:text-slate-500 focus:border-amber-500/60 focus:ring-2 focus:ring-amber-500/20";

  const iconClass = isLight ? "text-slate-400" : "text-amber-500/70";

  const backLinkClass = isLight
    ? "text-red-600 hover:text-red-500"
    : "text-amber-400 hover:text-amber-300";

  const hintClass = isLight
    ? "border-slate-300 bg-slate-50 text-slate-500"
    : "border-slate-800/80 bg-slate-950/60 text-slate-500";

  return (
    <div
      className={`flex min-h-screen w-full items-center justify-center px-4 py-12 transition-colors duration-300 ${pageClass}`}
    >
      {" "}
      <div className="w-full max-w-md">
        <div
          className={`relative w-full overflow-hidden rounded-[2.5rem] p-8 space-y-6 transition-colors duration-300 sm:p-10 ${cardClass}`}
        >
          {/* =====================================================
AMBIENT GLOW
===================================================== */}
          <div className="pointer-events-none absolute -top-24 left-1/2 h-48 w-48 -translate-x-1/2 rounded-full bg-amber-500/15 blur-3xl" />

          {/* =====================================================
          HEADER
      ===================================================== */}

          <div className="relative space-y-4 text-center">
            {/* LOGO */}

            <div className="mx-auto flex h-12 w-40 items-center justify-center">
              <img
                src="/logo2.png"
                alt="Logo"
                className="h-12 w-full object-contain drop-shadow-[0_0_15px_rgba(245,158,11,0.35)]"
              />
            </div>

            {/* ICON */}

            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500 to-red-600 shadow-[0_0_25px_rgba(245,158,11,0.35)]">
              <Lock className="h-6 w-6 text-slate-950" />
            </div>

            <div className="space-y-2">
              <h1
                className={`text-2xl font-black tracking-tight ${
                  isLight ? "text-slate-900" : "text-white"
                }`}
              >
                {t("reset.title")}
              </h1>

              <p className={`text-xs leading-relaxed ${secondaryTextClass}`}>
                {email ? (
                  <>{t("reset.subtitle").replace("{email}", email)}</>
                ) : (
                  t("reset.invalidEmail")
                )}
              </p>
            </div>
          </div>

          {/* =====================================================
          MISSING EMAIL WARNING
      ===================================================== */}

          {!email && !success && (
            <div className="flex items-start gap-2 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-500">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />

              <span>{t("reset.noEmail")}</span>
            </div>
          )}

          {/* =====================================================
          ERROR MESSAGE
      ===================================================== */}

          {errorMsg && (
            <div className="flex items-start gap-2 rounded-2xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-500">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />

              <span>{errorMsg}</span>
            </div>
          )}

          {/* =====================================================
          SUCCESS MESSAGE
      ===================================================== */}

          {success && (
            <div className="flex items-start gap-2 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-500">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />

              <div>
                <p className="font-semibold">{t("reset.successTitle")}</p>

                <p className="mt-0.5 text-emerald-500/80">
                  {t("reset.redirecting")}
                </p>
              </div>
            </div>
          )}

          {/* =====================================================
          RESET FORM
      ===================================================== */}

          <form
            onSubmit={handleReset}
            noValidate
            className="relative space-y-5 text-xs"
          >
            {/* =================================================
            RESET CODE
        ================================================= */}

            <div>
              <label
                htmlFor="reset-code"
                className={`mb-2 block font-semibold ${labelClass}`}
              >
                {t("reset.code")}
              </label>

              <input
                id="reset-code"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                value={code}
                onChange={handleCodeChange}
                placeholder={t("reset.codePlaceholder")}
                disabled={loading || success || !email}
                className={`w-full rounded-2xl border py-4 text-center font-mono text-xl font-bold tracking-[0.35em] outline-none transition duration-200 disabled:cursor-not-allowed disabled:opacity-50 ${inputClass}`}
              />

              <p className={`mt-2 text-[10px] ${secondaryTextClass}`}>
                {t("reset.codeHint")}
              </p>
            </div>

            {/* =================================================
            NEW PASSWORD
        ================================================= */}

            <div>
              <label
                htmlFor="new-password"
                className={`mb-2 block font-semibold ${labelClass}`}
              >
                {t("reset.newPassword")}
              </label>

              <div className="relative">
                <Lock
                  className={`absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 ${iconClass}`}
                />

                <input
                  id="new-password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  minLength={6}
                  value={newPassword}
                  onChange={handlePasswordChange}
                  placeholder={t("reset.passwordPlaceholder")}
                  disabled={loading || success || !email}
                  className={`w-full rounded-2xl border py-3.5 pl-11 pr-11 outline-none transition duration-200 disabled:cursor-not-allowed disabled:opacity-50 ${inputClass}`}
                />

                <button
                  type="button"
                  tabIndex={-1}
                  disabled={loading || success || !email}
                  onClick={() => setShowPassword((value) => !value)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className={`absolute right-4 top-1/2 -translate-y-1/2 cursor-pointer transition disabled:cursor-not-allowed disabled:opacity-50 ${
                    isDark
                      ? "text-slate-500 hover:text-amber-400"
                      : "text-slate-400 hover:text-red-500"
                  }`}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>

              <p className={`mt-2 text-[10px] ${secondaryTextClass}`}>
                {t("reset.passwordHint")}
              </p>
            </div>

            {/* =================================================
            SUBMIT
        ================================================= */}

            <button
              type="submit"
              disabled={
                loading ||
                success ||
                !email ||
                code.length !== 6 ||
                newPassword.length < 6
              }
              className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-500 to-red-600 py-4 text-xs font-extrabold uppercase tracking-wider text-slate-950 shadow-[0_0_25px_rgba(245,158,11,0.4)] transition duration-200 hover:from-amber-400 hover:to-red-500 hover:shadow-[0_0_35px_rgba(245,158,11,0.6)] disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}

              <span>
                {loading
                  ? t("reset.updating")
                  : success
                    ? t("reset.updated")
                    : t("reset.update")}
              </span>
            </button>
          </form>

          {/* =====================================================
          DIVIDER
      ===================================================== */}

          <div className="flex items-center gap-3">
            <div
              className={`h-px flex-1 ${
                isLight ? "bg-slate-200" : "bg-slate-800"
              }`}
            />

            <span
              className={`text-[10px] font-bold uppercase tracking-[0.2em] ${secondaryTextClass}`}
            >
              Account access
            </span>

            <div
              className={`h-px flex-1 ${
                isLight ? "bg-slate-200" : "bg-slate-800"
              }`}
            />
          </div>

          {/* =====================================================
          BACK TO LOGIN
      ===================================================== */}

          <div className="text-center">
            <Link
              href="/login"
              className={`inline-flex items-center gap-1.5 text-xs font-bold transition ${backLinkClass}`}
            >
              <ArrowLeft className="h-3.5 w-3.5" />

              {t("common.backToSignIn")}
            </Link>
          </div>

          {/* =====================================================
          FOOTER HINT
      ===================================================== */}

          <div
            className={`rounded-2xl border p-4 transition-colors duration-300 ${hintClass}`}
          >
            <p className="text-center text-[10px] leading-relaxed">
              {t("reset.passwordHint")}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/**

* ============================================================
* RESET PASSWORD PAGE
* ============================================================
  */

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-slate-950">
          {" "}
          <Loader2 className="h-8 w-8 animate-spin text-amber-500" />{" "}
        </div>
      }
    >
      {" "}
      <ResetPasswordContent />{" "}
    </Suspense>
  );
}
