"use client";

import { useState, useRef, useEffect, FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Lock,
  Mail,
  User,
  Phone,
  Loader2,
  AlertCircle,
  Eye,
  EyeOff,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";
import { Turnstile } from "@marsidev/react-turnstile";

import { AuthService } from "@/app/service/auth.service";
import { useSettings } from "@/app/context/SettingsContext";
import SocialLoginButtons from "@/app/components/SocialLoginButtons";

export default function RegisterPage() {
  const router = useRouter();

  const { t, theme } = useSettings();

  const isLight = theme === "light";

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);

  // ---- Turnstile Android WebView fix -------------------------------------
  // Same fix as the Login page: "flexible" size renders fine on every
  // device, iPhone included — the real bug is that some Android WebViews
  // (Oppo/Realme/Vivo) report a stale width on the very first paint, so
  // Cloudflare sizes the iframe wrong and the card's overflow-hidden crops
  // it. Forcing one remount shortly after mount — plus again on any real
  // size change — fixes that without changing how the widget looks.
  const turnstileWrapperRef = useRef<HTMLDivElement>(null);
  const [turnstileKey, setTurnstileKey] = useState(0);
  const lastTurnstileWidthRef = useRef<number | null>(null);

  // ---- Turnstile responsive size ------------------------------------------
  // "flexible" has a hidden internal minimum width (~300px) enforced by
  // Cloudflare's iframe. On phones, the card's actual inner content width
  // (viewport - page padding - card padding) is often narrower than that
  // (~279px on a 375px-wide iPhone), so the widget overflows its container
  // and both left/right rounded corners get visually clipped by the card's
  // overflow-hidden. Below the sm breakpoint we switch to "compact", which
  // has a small fixed footprint that fits comfortably. From sm: up
  // (tablet/desktop web) we keep "flexible" exactly as before.
  const [turnstileSize, setTurnstileSize] = useState<"compact" | "flexible">(
    "flexible",
  );

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 639px)");

    const applySize = () => {
      const nextSize = mq.matches ? "compact" : "flexible";
      setTurnstileSize((current) => {
        if (current !== nextSize) {
          setTurnstileKey((k) => k + 1); // force remount so Cloudflare re-renders at new size
        }
        return nextSize;
      });
    };

    applySize();
    mq.addEventListener("change", applySize);
    return () => mq.removeEventListener("change", applySize);
  }, []);

  useEffect(() => {
    const el = turnstileWrapperRef.current;
    if (!el) return;

    const remount = () => setTurnstileKey((k) => k + 1);

    const checkWidth = () => {
      const width = Math.round(el.offsetWidth);
      if (
        lastTurnstileWidthRef.current !== null &&
        Math.abs(width - lastTurnstileWidthRef.current) > 4
      ) {
        remount();
      }
      lastTurnstileWidthRef.current = width;
    };

    checkWidth();

    const observer = new ResizeObserver(checkWidth);
    observer.observe(el);

    const retry = window.setTimeout(remount, 350);

    return () => {
      observer.disconnect();
      window.clearTimeout(retry);
    };
  }, []);

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [errors, setErrors] = useState<{
    fullName?: string;
    email?: string;
    phone?: string;
    password?: string;
    turnstile?: string;
  }>({});

  const validate = () => {
    const newErrors: {
      fullName?: string;
      email?: string;
      phone?: string;
      password?: string;
      turnstile?: string;
    } = {};

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const phoneRegex = /^[0-9+() -]{8,15}$/;

    if (!fullName.trim()) {
      newErrors.fullName = t("register.fullNameRequired");
    } else if (fullName.trim().length < 2) {
      newErrors.fullName = t("register.fullNameMin");
    }

    if (!email.trim()) {
      newErrors.email = t("register.emailRequired");
    } else if (!emailRegex.test(email.trim())) {
      newErrors.email = t("register.emailInvalid");
    }

    if (!phone.trim()) {
      newErrors.phone = t("register.phoneRequired");
    } else if (!phoneRegex.test(phone.trim())) {
      newErrors.phone = t("register.phoneInvalid");
    }

    if (!password) {
      newErrors.password = t("register.passwordRequired");
    } else if (password.length < 6) {
      newErrors.password = t("register.passwordMin");
    }

    if (!turnstileToken) {
      newErrors.turnstile = "Please complete the Cloudflare verification.";
    }

    setErrors(newErrors);

    return Object.keys(newErrors).length === 0;
  };

  const getServerError = (err: any): string => {
    return (
      err?.response?.data?.status?.message ||
      err?.response?.data?.message ||
      err?.message ||
      ""
    );
  };

  const isDuplicateRegistrationError = (err: any) => {
    const status = err?.response?.status;

    const message = getServerError(err).toLowerCase();

    if (status === 409) {
      return true;
    }

    return (
      message.includes("already exists") ||
      message.includes("already registered") ||
      message.includes("email exists") ||
      message.includes("email already") ||
      message.includes("user exists") ||
      message.includes("duplicate")
    );
  };

  const handleRegister = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (loading) {
      return;
    }

    setErrorMsg(null);
    setSuccessMsg(null);

    if (!validate()) {
      return;
    }

    setLoading(true);

    const cleanEmail = email.trim().toLowerCase();
    const cleanFullName = fullName.trim();
    const cleanPhone = phone.trim();

    try {
      /*
       * IMPORTANT:
       *
       * AuthService.register() should ONLY create the account/send OTP.
       *
       * It must NOT call persistSession().
       */
      await AuthService.register({
        fullName: cleanFullName,
        email: cleanEmail,
        phone: cleanPhone,
        password,
        turnstileToken,
      });

      setSuccessMsg("Registration successful. Please verify your email.");

      /*
       * No sessionStorage writes here.
       *
       * User is not logged in yet.
       */
      router.push(`/verify-otp?email=${encodeURIComponent(cleanEmail)}`);
    } catch (err: any) {
      const isDuplicate = isDuplicateRegistrationError(err);

      // 👇 CHANGED: a 409 duplicate-email is an EXPECTED, already-handled
      // outcome (we show a friendly message + "Go to Sign In" link right
      // below) — not a real bug. Only log to console when something
      // genuinely unexpected happened, so the browser console stays clean
      // for actual errors worth investigating. The 409 network request
      // itself will still show up in DevTools' Network tab regardless —
      // that's the browser's own logging and can't be suppressed from here.
      if (!isDuplicate) {
        console.error("Registration failed:", err);
      }

      if (isDuplicate) {
        setErrorMsg(
          "This email is already registered. Please sign in instead.",
        );

        /*
         * Put the existing email back into the form.
         * User can immediately click Sign In.
         */
        setEmail(cleanEmail);

        return;
      }

      const serverError = getServerError(err);

      setErrorMsg(serverError || t("register.failed"));
    } finally {
      setLoading(false);
    }
  };

  const clearFieldError = (
    field: "fullName" | "email" | "phone" | "password" | "turnstile",
  ) => {
    if (errors[field]) {
      setErrors((prev) => ({
        ...prev,
        [field]: undefined,
      }));
    }
  };

  /*

* STYLES
* Same visual design as Login page
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
        {/* Same ambient glow as Login */}{" "}
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-48 h-48 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />
        {/* HEADER */}
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
            {t("register.title")}
          </h1>

          <p
            className={`
          text-xs
          transition-colors
          duration-300
          ${descriptionClass}
        `}
          >
            {t("register.subtitle")}
          </p>
        </div>
        {/* SUCCESS */}
        {successMsg && (
          <div className="flex items-start gap-2 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-3.5 text-xs text-emerald-500 relative z-10">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />

            <span className="flex-1 font-medium">{successMsg}</span>
          </div>
        )}
        {/* ERROR */}
        {errorMsg && (
          <div className="flex items-start gap-2 rounded-2xl border border-red-500/30 bg-red-500/10 p-3.5 text-xs text-red-500 relative z-10">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />

            <div className="flex-1">
              <p className="font-medium">{errorMsg}</p>

              {errorMsg.includes("already registered") && (
                <Link
                  href={`/login?email=${encodeURIComponent(
                    email.trim().toLowerCase(),
                  )}`}
                  className="mt-1.5 inline-flex items-center gap-1 font-bold text-red-500 hover:text-red-400 transition-colors"
                >
                  Go to Sign In
                  <ArrowRight className="h-3 w-3" />
                </Link>
              )}
            </div>
          </div>
        )}
        <form
          onSubmit={handleRegister}
          noValidate
          className="space-y-4 text-xs relative z-10"
        >
          {/* FULL NAME */}
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
              {t("register.fullName")} <span className="text-amber-500">*</span>
            </label>

            <div className="relative">
              <User
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
                type="text"
                value={fullName}
                autoComplete="name"
                disabled={loading}
                onChange={(e) => {
                  setFullName(e.target.value);
                  clearFieldError("fullName");
                  setErrorMsg(null);
                }}
                placeholder={t("register.fullNamePlaceholder")}
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
              ${errors.fullName ? "border-red-500" : ""}
            `}
              />
            </div>

            {errors.fullName && (
              <p className="mt-1.5 text-[11px] text-red-500 font-medium pl-1">
                {errors.fullName}
              </p>
            )}
          </div>

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
              {t("register.email")} <span className="text-amber-500">*</span>
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
                disabled={loading}
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  clearFieldError("email");
                  setErrorMsg(null);
                }}
                placeholder={t("register.emailPlaceholder")}
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

          {/* PHONE */}
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
              {t("register.phone")} <span className="text-amber-500">*</span>
            </label>

            <div className="relative">
              <Phone
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
                type="tel"
                autoComplete="tel"
                disabled={loading}
                value={phone}
                onChange={(e) => {
                  setPhone(e.target.value);
                  clearFieldError("phone");
                  setErrorMsg(null);
                }}
                placeholder={t("register.phonePlaceholder")}
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
              ${errors.phone ? "border-red-500" : ""}
            `}
              />
            </div>

            {errors.phone && (
              <p className="mt-1.5 text-[11px] text-red-500 font-medium pl-1">
                {errors.phone}
              </p>
            )}
          </div>

          {/* PASSWORD */}
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
              {t("register.password")} <span className="text-amber-500">*</span>
            </label>

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
                autoComplete="new-password"
                disabled={loading}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  clearFieldError("password");
                  setErrorMsg(null);
                }}
                placeholder={t("register.passwordPlaceholder")}
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
                onClick={() => setShowPassword((value) => !value)}
                tabIndex={-1}
                disabled={loading}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className={`
              absolute
              right-4
              top-1/2
              -translate-y-1/2
              transition-colors
              disabled:opacity-50
              ${passwordButtonClass}
            `}
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

          {/* TURNSTILE — "compact" below sm (phones: iPhone, Oppo/Realme/
              Vivo, etc.) avoids Cloudflare's ~300px "flexible" floor
              clipping the card's rounded corners; "flexible" is restored
              from sm: up so web/desktop is unchanged. overflow-x-auto stays
              as a safety net so nothing is ever silently cropped. */}
          <div className="my-4 w-full flex justify-center">
            <div
              ref={turnstileWrapperRef}
              className="turnstile-scroll w-full min-w-0 flex justify-center overflow-x-auto"
            >
              <style jsx>{`
                .turnstile-scroll::-webkit-scrollbar {
                  display: none;
                }
                .turnstile-scroll {
                  -ms-overflow-style: none;
                  scrollbar-width: none;
                }
              `}</style>
              <Turnstile
                key={turnstileKey}
                siteKey="0x4AAAAAAEpf88txuioOhN0W"
                options={{
                  theme: isLight ? "light" : "dark",
                  size: turnstileSize,
                }}
                className={turnstileSize === "flexible" ? "w-full" : ""}
                onSuccess={(token) => {
                  setTurnstileToken(token);
                  clearFieldError("turnstile");
                }}
                onExpire={() => {
                  setTurnstileToken(null);
                }}
              />
            </div>

            {errors.turnstile && (
              <p className="mt-2 text-[11px] text-red-500 font-medium text-center">
                {errors.turnstile}
              </p>
            )}
          </div>

          {/* REGISTER BUTTON */}
          <button
            type="submit"
            disabled={loading}
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
              {loading ? t("register.creating") : t("register.signUp")}
            </span>

            {!loading && <ArrowRight className="h-4 w-4 stroke-[3]" />}
          </button>
        </form>
        {/* SOCIAL */}
        <div className="flex items-center gap-3 relative z-10">
          <div className={`h-px flex-1 ${dividerLineClass}`} />

          <span
            className={`
          text-[10px]
          font-semibold
          uppercase
          tracking-wider
          ${dividerTextClass}
        `}
          >
            Or continue with
          </span>

          <div className={`h-px flex-1 ${dividerLineClass}`} />
        </div>
        <div className="relative z-10">
          <SocialLoginButtons isLight={isLight} />
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
          {t("register.haveAccount")}{" "}
          <Link
            href="/login"
            className="
          font-bold
          text-amber-400
          hover:text-amber-300
          transition-colors
          inline-flex
          items-center
          gap-1
        "
          >
            {t("register.signIn")}
            <ArrowRight className="h-3 w-3" />
          </Link>
        </p>
      </div>
    </div>
  );
}
