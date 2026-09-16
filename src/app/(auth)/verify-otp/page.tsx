"use client";

import { useState, FormEvent, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  KeyRound,
  Loader2,
  AlertCircle,
  RotateCcw,
  CheckCircle2,
} from "lucide-react";

import { AuthService } from "@/app/service/auth.service";
import { useSettings } from "@/app/context/SettingsContext";
import { useLanguage } from "@/app/context/LanguageContext";

function VerifyOtpContent() {
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

  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  const [countdown, setCountdown] = useState(60);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  /**

* ============================================================
* COUNTDOWN
* ============================================================
  */

  useEffect(() => {
    if (countdown <= 0) return;

    const interval = setInterval(() => {
      setCountdown((current) => current - 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [countdown]);

  /**

* ============================================================
* VERIFY OTP
* ============================================================
  */

  const handleVerify = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!email) {
      setErrorMsg(t("verify.emailMissing"));
      return;
    }

    const cleanCode = code.trim();

    if (cleanCode.length !== 6) {
      setErrorMsg(t("validation.codeInvalid"));
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      /**
       * IMPORTANT:
       *
       * verifyOtp only verifies the account.
       * It does NOT create a login session.
       *
       * The user must login after OTP verification.
       */

      await AuthService.verifyOtp({
        email,
        code: cleanCode,
      });

      setSuccessMsg(t("verify.success"));

      /**
       * Give the user a short moment to see
       * the successful verification message.
       *
       * Then send them to LOGIN.
       */

      setTimeout(() => {
        router.replace(
          `/login?verified=true&email=${encodeURIComponent(email)}`,
        );
      }, 800);
    } catch (err: any) {
      setErrorMsg(
        err?.response?.data?.status?.message ||
          err?.response?.data?.message ||
          t("verify.invalid"),
      );
    } finally {
      setLoading(false);
    }
  };

  /**

* ============================================================
* RESEND OTP
* ============================================================
  */

  const handleResend = async () => {
    if (!email || countdown > 0 || resending) {
      return;
    }

    setResending(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      await AuthService.resendOtp(email);

      setSuccessMsg(t("verify.success"));

      setCode("");
      setCountdown(60);
    } catch (err: any) {
      setErrorMsg(
        err?.response?.data?.status?.message ||
          err?.response?.data?.message ||
          t("verify.resendFailed"),
      );
    } finally {
      setResending(false);
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

  const headingClass = isLight ? "text-slate-900" : "text-white";

  const secondaryTextClass = isLight ? "text-slate-500" : "text-slate-400";

  const inputClass = isLight
    ? "bg-slate-50 text-slate-900 border-slate-300 placeholder:text-slate-400 focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
    : "bg-slate-950/80 text-white border-slate-800/80 placeholder:text-slate-500 focus:border-amber-500/60 focus:ring-2 focus:ring-amber-500/20";

  const countdownClass = isLight ? "text-slate-400" : "text-slate-500";

  const securityClass = isLight
    ? "border-slate-300 bg-slate-50 text-slate-500"
    : "border-slate-800/80 bg-slate-950/60 text-slate-500";

  const resendClass = isLight
    ? "text-red-600 hover:text-red-500"
    : "text-amber-400 hover:text-amber-300";

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
              <KeyRound className="h-6 w-6 text-slate-950" />
            </div>

            <div className="space-y-2">
              <h1
                className={`text-2xl font-black tracking-tight ${headingClass}`}
              >
                {t("verify.title")}
              </h1>

              <p className={`text-xs leading-relaxed ${secondaryTextClass}`}>
                {t("verify.subtitle").replace("{email}", email || "your email")}
              </p>
            </div>
          </div>

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

          {successMsg && (
            <div className="flex items-start gap-2 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-500">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />

              <span>{successMsg}</span>
            </div>
          )}

          {/* =====================================================
          VERIFICATION FORM
      ===================================================== */}

          <form
            onSubmit={handleVerify}
            noValidate
            className="relative space-y-5 text-xs"
          >
            <div>
              <label
                htmlFor="verification-code"
                className={`mb-2 block text-center font-semibold ${
                  isLight ? "text-slate-700" : "text-amber-400/90"
                }`}
              >
                {t("verify.code")}
              </label>

              <input
                id="verification-code"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                required
                maxLength={6}
                autoFocus
                value={code}
                disabled={loading}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, "").slice(0, 6);

                  setCode(value);

                  if (errorMsg) {
                    setErrorMsg(null);
                  }

                  if (successMsg) {
                    setSuccessMsg(null);
                  }
                }}
                placeholder={t("verify.codePlaceholder")}
                className={`w-full rounded-2xl border py-4 text-center font-mono text-xl font-bold tracking-[0.4em] outline-none transition duration-200 disabled:cursor-not-allowed disabled:opacity-60 ${inputClass}`}
              />
            </div>

            {/* ===================================================
            VERIFY BUTTON
        =================================================== */}

            <button
              type="submit"
              disabled={
                loading || resending || !email || code.trim().length !== 6
              }
              className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-500 to-red-600 py-4 text-xs font-extrabold uppercase tracking-wider text-slate-950 shadow-[0_0_25px_rgba(245,158,11,0.4)] transition duration-200 hover:from-amber-400 hover:to-red-500 hover:shadow-[0_0_35px_rgba(245,158,11,0.6)] disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}

              <span>
                {loading ? t("verify.verifying") : t("verify.button")}
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
              Verification
            </span>

            <div
              className={`h-px flex-1 ${
                isLight ? "bg-slate-200" : "bg-slate-800"
              }`}
            />
          </div>

          {/* =====================================================
          RESEND CODE
      ===================================================== */}

          <div className={`text-center text-xs ${secondaryTextClass}`}>
            {t("verify.didNotReceive")}{" "}
            {countdown > 0 ? (
              <span className={`font-mono ${countdownClass}`}>
                {t("verify.resendIn").replace("{seconds}", String(countdown))}
              </span>
            ) : (
              <button
                type="button"
                onClick={handleResend}
                disabled={resending || !email}
                className={`inline-flex cursor-pointer items-center gap-1 font-bold transition disabled:cursor-not-allowed disabled:opacity-50 ${resendClass}`}
              >
                {resending ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <RotateCcw className="h-3 w-3" />
                )}

                <span>
                  {resending ? t("verify.resending") : t("verify.resend")}
                </span>
              </button>
            )}
          </div>

          {/* =====================================================
          SECURITY NOTE
      ===================================================== */}

          <div
            className={`rounded-2xl border p-4 transition-colors duration-300 ${securityClass}`}
          >
            <p className="text-center text-[10px] leading-relaxed">
              {t("verify.securityNote")}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/**

* ============================================================
* VERIFY OTP PAGE
* ============================================================
  */

export default function VerifyOtpPage() {
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
      <VerifyOtpContent />{" "}
    </Suspense>
  );
}
