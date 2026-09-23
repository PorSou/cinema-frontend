"use client";

import { useState, useRef, FormEvent, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Lock,
  Mail,
  Loader2,
  AlertCircle,
  Eye,
  EyeOff,
  ShieldAlert,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";
import { Turnstile, type TurnstileInstance } from "@marsidev/react-turnstile";

import { AuthService } from "@/app/service/auth.service";
import { useSettings } from "@/app/context/SettingsContext";
import SocialLoginButtons from "@/app/components/SocialLoginButtons";

const MAX_ATTEMPTS = 5;
const LOCKOUT_SECONDS = 30;

const ATTEMPTS_KEY = "cinemax_login_attempts";
const LOCKOUT_TIME_KEY = "cinemax_login_lockout_until";

// Only allow same-site relative paths. Rejects absolute URLs and
// protocol-relative URLs ("//evil.com"), which browsers still treat as
// external redirects.
function sanitizeRedirect(url: string | null): string | null {
  if (!url) return null;
  if (!url.startsWith("/") || url.startsWith("//")) return null;
  return url;
}

function LoginForm() {
  const searchParams = useSearchParams();
  const redirectUrl = sanitizeRedirect(searchParams.get("redirect"));

  const justVerified = searchParams.get("verified") === "true";
  const verifiedEmail =
    searchParams.get("email") || searchParams.get("emailAddress") || "";

  const { t, theme } = useSettings();
  const isLight = theme === "light";

  const [email, setEmail] = useState(verifiedEmail);
  const [password, setPassword] = useState("");
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const turnstileRef = useRef<TurnstileInstance>(null);

  // ---- Turnstile responsive sizing --------------------------------------
  // "flexible" size lets some Android WebViews (Oppo/Realme/Vivo — ColorOS
  // / FuntouchOS Chrome builds) mis-measure the available width on first
  // paint, so the widget renders wider than the card and gets cropped by
  // the card's own overflow-hidden (used for the glow effect). We measure
  // the real space ourselves and fall back to the fixed "compact" size —
  // which always renders fully regardless of container width — whenever
  // there isn't comfortably enough room, then remount the widget (via key)
  // any time that measurement changes so a stale first-paint value never
  // sticks.
  const turnstileWrapperRef = useRef<HTMLDivElement>(null);
  const [turnstileSize, setTurnstileSize] = useState<"compact" | "flexible">(
    "flexible",
  );

  useEffect(() => {
    const el = turnstileWrapperRef.current;
    if (!el) return;

    const measure = () => {
      const width = el.offsetWidth;
      setTurnstileSize(width < 300 ? "compact" : "flexible");
    };

    measure();

    const observer = new ResizeObserver(() => measure());
    observer.observe(el);

    // Some Android WebViews report a stale width on the very first paint,
    // before their font/zoom scaling settles — remeasure shortly after
    // mount to correct for that.
    const retry = window.setTimeout(measure, 300);

    return () => {
      observer.disconnect();
      window.clearTimeout(retry);
    };
  }, []);

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showVerifiedBanner, setShowVerifiedBanner] = useState(justVerified);

  const [errors, setErrors] = useState<{
    email?: string;
    password?: string;
    turnstile?: string;
  }>({});

  const [isLocked, setIsLocked] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(0);

  /*
   * LOCKOUT
   */
  useEffect(() => {
    const checkLockout = () => {
      const lockoutUntil = localStorage.getItem(LOCKOUT_TIME_KEY);
      if (!lockoutUntil) {
        setIsLocked(false);
        setRemainingSeconds(0);
        return;
      }

      const lockoutTime = parseInt(lockoutUntil, 10);
      const remaining = Math.ceil((lockoutTime - Date.now()) / 1000);

      if (remaining > 0) {
        setIsLocked(true);
        setRemainingSeconds(remaining);
        return;
      }

      localStorage.removeItem(LOCKOUT_TIME_KEY);
      localStorage.removeItem(ATTEMPTS_KEY);
      setIsLocked(false);
      setRemainingSeconds(0);
    };

    checkLockout();
    const interval = setInterval(checkLockout, 1000);
    return () => {
      clearInterval(interval);
    };
  }, []);

  /*
   * VALIDATION
   */
  const validate = () => {
    const newErrors: {
      email?: string;
      password?: string;
      turnstile?: string;
    } = {};

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!email.trim()) {
      newErrors.email = t("login.emailRequired");
    } else if (!emailRegex.test(email.trim())) {
      newErrors.email = t("login.emailInvalid");
    }

    if (!password) {
      newErrors.password = t("login.passwordRequired");
    } else if (password.length < 6) {
      newErrors.password = t("login.passwordMin");
    }

    if (!turnstileToken) {
      newErrors.turnstile = "Please complete the Cloudflare verification.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const formatCountdown = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const seconds = secs % 60;
    return `${mins}:${seconds < 10 ? "0" : ""}${seconds}`;
  };

  /*
   * LOGIN
   */
  const handleLogin = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (isLocked || loading) {
      return;
    }

    setErrorMsg(null);

    if (!validate()) {
      return;
    }

    setLoading(true);

    try {
      const auth = await AuthService.login({
        email: email.trim().toLowerCase(),
        password,
        turnstileToken,
      });

      if (!auth?.accessToken) {
        throw new Error("Login response did not include a valid session.");
      }

      localStorage.removeItem(ATTEMPTS_KEY);
      localStorage.removeItem(LOCKOUT_TIME_KEY);

      // Extract user role safely from different backend response structures without type complaints
      const typedAuth = auth as any;
      const rawRole =
        typedAuth?.user?.role ||
        typedAuth?.role ||
        typedAuth?.data?.role ||
        typedAuth?.data?.user?.role ||
        "CUSTOMER";

      const userRole = String(rawRole).toUpperCase();
      const isAdminOrStaff = userRole === "ADMIN" || userRole === "STAFF";

      if (redirectUrl) {
        window.location.href = redirectUrl;
      } else if (isAdminOrStaff) {
        window.location.href = "/admin/dashboard";
      } else {
        window.location.href = "/";
      }
    } catch (err: any) {
      console.error("Login failed:", err);

      const currentAttempts =
        parseInt(localStorage.getItem(ATTEMPTS_KEY) || "0", 10) + 1;

      localStorage.setItem(ATTEMPTS_KEY, currentAttempts.toString());

      if (currentAttempts >= MAX_ATTEMPTS) {
        const lockoutUntil = Date.now() + LOCKOUT_SECONDS * 1000;

        localStorage.setItem(LOCKOUT_TIME_KEY, lockoutUntil.toString());

        setIsLocked(true);

        setRemainingSeconds(LOCKOUT_SECONDS);

        setErrorMsg(
          t("login.tooManyAttempts").replace(
            "{minutes}",
            `${LOCKOUT_SECONDS} seconds`,
          ),
        );
      } else {
        const remainingAttempts = MAX_ATTEMPTS - currentAttempts;

        const serverError =
          err?.response?.data?.status?.message ||
          err?.response?.data?.message ||
          t("login.invalidCredentials");

        const attemptText = t("login.attemptsRemaining")
          .replace("{count}", remainingAttempts.toString())
          .replace("{plural}", remainingAttempts > 1 ? "s" : "");

        setErrorMsg(`${serverError} (${attemptText})`);
      }

      setTurnstileToken(null);
      turnstileRef.current?.reset();
    } finally {
      setLoading(false);
    }
  };

  /*
   * STYLES (Cyber-Cinematic Glow Theme)
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

  const passwordButtonClass = isLight
    ? "text-slate-400 hover:text-slate-600"
    : "text-slate-400 hover:text-amber-400";

  const footerTextClass = isLight ? "text-slate-500" : "text-slate-400";

  const dividerLineClass = isLight ? "border-slate-200" : "border-slate-800/80";

  const dividerTextClass = isLight ? "text-slate-400" : "text-slate-500";

  return (
    <div
      className={`
        min-h-[85vh]
        flex
        items-center
        justify-center
        py-12
        px-4
        transition-colors
        duration-300
        overflow-x-hidden
        ${pageClass}
      `}
    >
      <div
        className={`
          w-full
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
        {/* Subtle top ambient glow */}
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-48 h-48 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />

        <div className="space-y-3 text-center relative z-10">
          <div className="mx-auto flex w-40 items-center justify-center py-1 drop-shadow-[0_4px_16px_rgba(245,158,11,0.3)]">
            <img
              src="/logo2.png"
              alt="Logo"
              className="h-12 w-full object-contain"
            />
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
            {t("login.title")}
          </h1>

          <p
            className={`
              text-xs
              transition-colors
              duration-300
              ${descriptionClass}
            `}
          >
            {t("login.subtitle")}
          </p>
        </div>

        {showVerifiedBanner && (
          <div className="flex items-start gap-2 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-3.5 text-xs text-emerald-500 relative z-10">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />

            <span className="flex-1 font-medium">
              Your account has been verified. Please sign in to continue.
            </span>

            <button
              type="button"
              onClick={() => setShowVerifiedBanner(false)}
              className="shrink-0 text-emerald-500/70 hover:text-emerald-500 font-bold px-1"
              aria-label="Dismiss"
            >
              ✕
            </button>
          </div>
        )}

        {isLocked ? (
          <div className="flex items-center gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs text-amber-500 relative z-10">
            <ShieldAlert className="h-5 w-5 shrink-0" />

            <div>
              <p className="font-bold">{t("login.lockedTitle")}</p>

              <p className="mt-0.5 text-[11px] text-amber-500/80">
                {t("login.lockedDescription").replace(
                  "{time}",
                  formatCountdown(remainingSeconds),
                )}
              </p>
            </div>
          </div>
        ) : (
          errorMsg && (
            <div className="flex items-center gap-2 rounded-2xl border border-red-500/30 bg-red-500/10 p-3.5 text-xs text-red-500 relative z-10">
              <AlertCircle className="h-4 w-4 shrink-0" />

              <span className="font-medium">{errorMsg}</span>
            </div>
          )
        )}

        <form
          onSubmit={handleLogin}
          noValidate
          className="space-y-4 text-xs relative z-10"
        >
          {/* EMAIL */}
          <div>
            <label
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
              {t("login.email")} <span className="text-amber-500">*</span>
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
                type="email"
                autoComplete="email"
                disabled={isLocked || loading}
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);

                  setErrorMsg(null);

                  if (errors.email) {
                    setErrors((prev) => ({
                      ...prev,
                      email: undefined,
                    }));
                  }
                }}
                placeholder={t("login.emailPlaceholder")}
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
                  disabled:opacity-50
                  disabled:cursor-not-allowed
                  ${inputClass}
                  ${errors.email ? "border-red-500" : ""}
                `}
              />
            </div>

            {errors.email && (
              <p className="mt-1.5 text-[11px] text-red-500 font-medium pl-1">
                {errors.email}
              </p>
            )}
          </div>

          {/* PASSWORD */}
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label
                className={`
                  block
                  font-semibold
                  tracking-wide
                  transition-colors
                  duration-300
                  ${labelClass}
                `}
              >
                {t("login.password")} <span className="text-amber-500">*</span>
              </label>

              <Link
                href="/forgot-password"
                className="text-xs font-semibold text-amber-400 hover:text-amber-300 transition-colors"
              >
                {t("login.forgotPassword")}
              </Link>
            </div>

            <div className="relative">
              <Lock
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
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                disabled={isLocked || loading}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);

                  setErrorMsg(null);

                  if (errors.password) {
                    setErrors((prev) => ({
                      ...prev,
                      password: undefined,
                    }));
                  }
                }}
                placeholder={t("login.passwordPlaceholder")}
                className={`
                  w-full
                  rounded-2xl
                  border
                  py-3.5
                  pl-11
                  pr-11
                  outline-none
                  transition-all
                  duration-300
                  disabled:opacity-50
                  disabled:cursor-not-allowed
                  ${inputClass}
                  ${errors.password ? "border-red-500" : ""}
                `}
              />

              <button
                type="button"
                onClick={() => setShowPassword((current) => !current)}
                tabIndex={-1}
                disabled={isLocked || loading}
                className={`
                  absolute
                  right-4
                  top-1/2
                  -translate-y-1/2
                  transition-colors
                  disabled:opacity-50
                  ${passwordButtonClass}
                `}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>

            {errors.password && (
              <p className="mt-1.5 text-[11px] text-red-500 font-medium pl-1">
                {errors.password}
              </p>
            )}
          </div>

          {/* TURNSTILE — measured width decides compact vs flexible size,
              plus an overflow-x-auto safety net so nothing is ever
              silently clipped by the card's overflow-hidden. */}
          <div className="my-4 w-full">
            <div
              ref={turnstileWrapperRef}
              className="w-full min-w-0 flex justify-center overflow-x-auto"
            >
              <Turnstile
                key={turnstileSize}
                ref={turnstileRef}
                siteKey="0x4AAAAAAEpf88txuioOhN0W"
                options={{
                  theme: isLight ? "light" : "dark",
                  size: turnstileSize,
                }}
                className={turnstileSize === "flexible" ? "w-full" : ""}
                onSuccess={(token) => {
                  setTurnstileToken(token);
                  setErrors((prev) => ({
                    ...prev,
                    turnstile: undefined,
                  }));
                }}
                onExpire={() => setTurnstileToken(null)}
              />
            </div>

            {errors.turnstile && (
              <p className="mt-2 text-[11px] text-red-500 font-medium text-center">
                {errors.turnstile}
              </p>
            )}
          </div>

          {/* LOGIN BUTTON */}
          <button
            type="submit"
            disabled={loading || isLocked}
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
              disabled:opacity-50
              transition-all
              duration-300
              cursor-pointer
              disabled:cursor-not-allowed
            "
          >
            {loading && (
              <Loader2 className="h-4 w-4 animate-spin text-slate-950" />
            )}

            <span>
              {isLocked
                ? `${t("login.lockedTitle")} (${formatCountdown(
                    remainingSeconds,
                  )})`
                : loading
                  ? t("login.signingIn")
                  : t("login.signIn")}
            </span>
            {!loading && !isLocked && (
              <ArrowRight className="h-4 w-4 stroke-[3]" />
            )}
          </button>
        </form>

        {/* SOCIAL */}
        <div className="flex items-center gap-3 relative z-10">
          <div className={`h-px flex-1 ${dividerLineClass}`} />

          <span
            className={`text-[10px] font-semibold uppercase tracking-wider ${dividerTextClass}`}
          >
            Or continue with
          </span>

          <div className={`h-px flex-1 ${dividerLineClass}`} />
        </div>

        <div className="relative z-10">
          <SocialLoginButtons redirectTo={redirectUrl} isLight={isLight} />
        </div>

        {/* FOOTER */}
        <p
          className={`
            text-center
            text-xs
            transition-colors
            duration-300
            relative
            z-10
            ${footerTextClass}
          `}
        >
          {t("login.noAccount")}{" "}
          <Link
            href="/register"
            className="font-bold text-amber-400 hover:text-amber-300 transition-colors inline-flex items-center gap-1"
          >
            {t("login.createAccount")} <ArrowRight className="h-3 w-3" />
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-slate-950 transition-colors duration-300">
          <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
