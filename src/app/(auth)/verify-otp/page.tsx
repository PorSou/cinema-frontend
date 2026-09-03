"use client";

import {
  useState,
  FormEvent,
  useEffect,
  Suspense,
} from "react";
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

  const handleVerify = async (e: FormEvent) => {
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
      const auth = await AuthService.verifyOtp({
        email,
        code: cleanCode,
      });

      setSuccessMsg(t("verify.success"));

      setTimeout(() => {
        if (
          auth?.user?.role === "ADMIN" ||
          auth?.user?.role === "STAFF"
        ) {
          router.push("/admin/users");
        } else {
          router.push("/");
        }
      }, 500);
    } catch (err: any) {
      setErrorMsg(
        err?.response?.data?.status?.message ||
          err?.response?.data?.message ||
          t("verify.invalid")
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
          t("verify.resendFailed")
      );
    } finally {
      setResending(false);
    }
  };

  /**
   * ============================================================
   * THEME CLASSES
   * ============================================================
   */

  const pageClass = isDark
    ? "bg-slate-950 text-slate-100"
    : "bg-slate-50 text-slate-900";

  const cardClass = isDark
    ? "border-slate-800 bg-slate-900/90"
    : "border-slate-200 bg-white";

  const headingClass = isDark
    ? "text-white"
    : "text-slate-900";

  const secondaryTextClass = isDark
    ? "text-slate-400"
    : "text-slate-500";

  const emailClass = isDark
    ? "text-white"
    : "text-slate-900";

  const inputClass = isDark
    ? "border-slate-800 bg-slate-950 text-white placeholder:text-slate-700"
    : "border-slate-200 bg-white text-slate-900 placeholder:text-slate-400";

  const countdownClass = isDark
    ? "text-slate-500"
    : "text-slate-400";

  const securityClass = isDark
    ? "border-slate-800 bg-slate-950/50"
    : "border-slate-200 bg-slate-50";

  const securityTextClass = isDark
    ? "text-slate-500"
    : "text-slate-500";

  const resendClass = isDark
    ? "text-red-400 hover:text-red-300"
    : "text-red-600 hover:text-red-500";

  return (
    <div
      className={`flex min-h-screen w-full items-center justify-center p-4 transition-colors duration-300 ${pageClass}`}
    >
      <div
        className={`w-full max-w-md space-y-6 rounded-3xl border p-6 shadow-2xl backdrop-blur-xl transition-colors duration-300 sm:p-8 ${cardClass}`}
      >
        {/* =====================================================
            HEADER
        ===================================================== */}

        <div className="space-y-2 text-center">
          <div className="mb-2 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-red-600 shadow-lg shadow-red-600/30">
            <KeyRound className="h-6 w-6 text-white" />
          </div>

          <h1
            className={`text-2xl font-black tracking-tight ${headingClass}`}
          >
            {t("verify.title")}
          </h1>

          <p
            className={`text-xs leading-relaxed ${secondaryTextClass}`}
          >
            {t("verify.subtitle").replace(
              "{email}",
              email || "your email"
            )}
          </p>
        </div>

        {/* =====================================================
            ERROR MESSAGE
        ===================================================== */}

        {errorMsg && (
          <div className="flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-500">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />

            <span>{errorMsg}</span>
          </div>
        )}

        {/* =====================================================
            SUCCESS MESSAGE
        ===================================================== */}

        {successMsg && (
          <div className="flex items-start gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-500">
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
          className="space-y-4 text-xs"
        >
          <div>
            <label
              htmlFor="verification-code"
              className={`mb-1 block text-center font-semibold ${secondaryTextClass}`}
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
                const value = e.target.value
                  .replace(/\D/g, "")
                  .slice(0, 6);

                setCode(value);

                if (errorMsg) {
                  setErrorMsg(null);
                }

                if (successMsg) {
                  setSuccessMsg(null);
                }
              }}
              placeholder={t("verify.codePlaceholder")}
              className={`w-full rounded-xl border py-3 text-center font-mono text-xl font-bold tracking-[0.4em] outline-none transition focus:border-red-500 disabled:cursor-not-allowed disabled:opacity-60 ${inputClass}`}
            />
          </div>

          {/* ===================================================
              VERIFY BUTTON
          =================================================== */}

          <button
            type="submit"
            disabled={
              loading ||
              resending ||
              !email ||
              code.trim().length !== 6
            }
            className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-red-600 py-3 text-xs font-bold text-white shadow-lg shadow-red-600/30 transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading && (
              <Loader2 className="h-4 w-4 animate-spin" />
            )}

            <span>
              {loading
                ? t("verify.verifying")
                : t("verify.button")}
            </span>
          </button>
        </form>

        {/* =====================================================
            RESEND CODE
        ===================================================== */}

        <div
          className={`text-center text-xs ${secondaryTextClass}`}
        >
          {t("verify.didNotReceive")}{" "}

          {countdown > 0 ? (
            <span
              className={`font-mono ${countdownClass}`}
            >
              {t("verify.resendIn").replace(
                "{seconds}",
                String(countdown)
              )}
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
                {resending
                  ? t("verify.resending")
                  : t("verify.resend")}
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
          <p
            className={`text-center text-[10px] leading-relaxed ${securityTextClass}`}
          >
            {t("verify.securityNote")}
          </p>
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
        <div className="flex min-h-screen items-center justify-center bg-slate-50">
          <Loader2 className="h-8 w-8 animate-spin text-red-600" />
        </div>
      }
    >
      <VerifyOtpContent />
    </Suspense>
  );
}
