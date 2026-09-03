"use client";

import { useState, FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Film,
  Lock,
  Mail,
  User,
  Phone,
  Loader2,
  AlertCircle,
  Eye,
  EyeOff,
} from "lucide-react";

import { AuthService } from "@/app/service/auth.service";
import { useSettings } from "@/app/context/SettingsContext";

export default function RegisterPage() {
  const router = useRouter();

  /**
   * =========================================================
   * SETTINGS
   * =========================================================
   *
   * Get theme + translations from the global SettingsProvider.
   */
  const { t, theme } = useSettings();

  const isLight = theme === "light";

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [errors, setErrors] = useState<{
    fullName?: string;
    email?: string;
    phone?: string;
    password?: string;
  }>({});

  /**
   * =========================================================
   * VALIDATION
   * =========================================================
   */

  const validate = () => {
    const newErrors: {
      fullName?: string;
      email?: string;
      phone?: string;
      password?: string;
    } = {};

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const phoneRegex = /^[0-9+() -]{8,15}$/;

    if (!fullName.trim()) {
      newErrors.fullName = t(
        "register.fullNameRequired"
      );
    } else if (fullName.trim().length < 2) {
      newErrors.fullName = t(
        "register.fullNameMin"
      );
    }

    if (!email.trim()) {
      newErrors.email = t(
        "register.emailRequired"
      );
    } else if (!emailRegex.test(email.trim())) {
      newErrors.email = t(
        "register.emailInvalid"
      );
    }

    if (!phone.trim()) {
      newErrors.phone = t(
        "register.phoneRequired"
      );
    } else if (!phoneRegex.test(phone.trim())) {
      newErrors.phone = t(
        "register.phoneInvalid"
      );
    }

    if (!password) {
      newErrors.password = t(
        "register.passwordRequired"
      );
    } else if (password.length < 6) {
      newErrors.password = t(
        "register.passwordMin"
      );
    }

    setErrors(newErrors);

    return Object.keys(newErrors).length === 0;
  };

  /**
   * =========================================================
   * REGISTER
   * =========================================================
   */

  const handleRegister = async (
    e: FormEvent<HTMLFormElement>
  ) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    const cleanEmail = email.trim().toLowerCase();
    const cleanFullName = fullName.trim();
    const cleanPhone = phone.trim();

    try {
      await AuthService.register({
        fullName: cleanFullName,
        email: cleanEmail,
        phone: cleanPhone,
        password,
      });

      /**
       * Go to OTP verification page.
       */
      router.push(
        `/verify-otp?email=${encodeURIComponent(
          cleanEmail
        )}`
      );
    } catch (err: any) {
      setErrorMsg(
        err?.response?.data?.status?.message ||
          err?.response?.data?.message ||
          t("register.failed")
      );
    } finally {
      setLoading(false);
    }
  };

  /**
   * =========================================================
   * CLEAR FIELD ERROR
   * =========================================================
   */

  const clearFieldError = (
    field:
      | "fullName"
      | "email"
      | "phone"
      | "password"
  ) => {
    if (errors[field]) {
      setErrors((prev) => ({
        ...prev,
        [field]: undefined,
      }));
    }
  };

  /**
   * =========================================================
   * THEME CLASSES
   * =========================================================
   *
   * IMPORTANT:
   *
   * Do not hard-code bg-slate-950 / text-white everywhere.
   *
   * These classes change depending on SettingsContext.
   */

  const pageClass = isLight
    ? "bg-slate-100 text-slate-900"
    : "bg-slate-950 text-slate-100";

  const cardClass = isLight
    ? "border-slate-200 bg-white shadow-xl shadow-slate-300/40"
    : "border-slate-800 bg-slate-900/90 shadow-2xl";

  const titleClass = isLight
    ? "text-slate-900"
    : "text-white";

  const descriptionClass = isLight
    ? "text-slate-500"
    : "text-slate-400";

  const labelClass = isLight
    ? "text-slate-600"
    : "text-slate-400";

  const inputClass = isLight
    ? "bg-white text-slate-900 border-slate-300 placeholder:text-slate-400"
    : "bg-slate-950 text-white border-slate-800 placeholder:text-slate-600";

  const iconClass = isLight
    ? "text-slate-400"
    : "text-slate-500";

  const passwordButtonClass = isLight
    ? "text-slate-400 hover:text-slate-600"
    : "text-slate-500 hover:text-slate-300";

  const footerTextClass = isLight
    ? "text-slate-500"
    : "text-slate-400";

  /**
   * =========================================================
   * UI
   * =========================================================
   */

  return (
    <div
      className={`
        flex
        min-h-screen
        items-center
        justify-center
        p-4
        transition-colors
        duration-300
        ${pageClass}
      `}
    >
      <div
        className={`
          w-full
          max-w-md
          space-y-6
          rounded-3xl
          border
          p-6
          backdrop-blur-xl
          transition-colors
          duration-300
          sm:p-8
          ${cardClass}
        `}
      >
        {/* ===================================================
            HEADER
        =================================================== */}

        <div className="space-y-2 text-center">
          <div className="mb-2 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-red-600 shadow-lg shadow-red-600/30">
            <Film className="h-6 w-6 text-white" />
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

        {/* ===================================================
            ERROR MESSAGE
        =================================================== */}

        {errorMsg && (
          <div className="flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-500">
            <AlertCircle className="h-4 w-4 shrink-0" />

            <span>{errorMsg}</span>
          </div>
        )}

        {/* ===================================================
            REGISTER FORM
        =================================================== */}

        <form
          onSubmit={handleRegister}
          noValidate
          className="space-y-3.5 text-xs"
        >
          {/* =================================================
              FULL NAME
          ================================================= */}

          <div>
            <label
              className={`
                mb-1
                block
                font-semibold
                transition-colors
                duration-300
                ${labelClass}
              `}
            >
              {t("register.fullName")} *
            </label>

            <div className="relative">
              <User
                className={`
                  absolute
                  left-3.5
                  top-1/2
                  h-4
                  w-4
                  -translate-y-1/2
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
                }}
                placeholder={t(
                  "register.fullNamePlaceholder"
                )}
                className={`
                  w-full
                  rounded-xl
                  border
                  py-2.5
                  pl-10
                  pr-3
                  outline-none
                  transition-all
                  duration-300
                  disabled:cursor-not-allowed
                  disabled:opacity-50
                  ${inputClass}
                  ${
                    errors.fullName
                      ? "border-red-500 focus:border-red-500"
                      : "focus:border-red-500"
                  }
                `}
              />
            </div>

            {errors.fullName && (
              <p className="mt-1 text-[11px] text-red-500">
                {errors.fullName}
              </p>
            )}
          </div>

          {/* =================================================
              EMAIL
          ================================================= */}

          <div>
            <label
              className={`
                mb-1
                block
                font-semibold
                transition-colors
                duration-300
                ${labelClass}
              `}
            >
              {t("register.email")} *
            </label>

            <div className="relative">
              <Mail
                className={`
                  absolute
                  left-3.5
                  top-1/2
                  h-4
                  w-4
                  -translate-y-1/2
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
                }}
                placeholder={t(
                  "register.emailPlaceholder"
                )}
                className={`
                  w-full
                  rounded-xl
                  border
                  py-2.5
                  pl-10
                  pr-3
                  outline-none
                  transition-all
                  duration-300
                  disabled:cursor-not-allowed
                  disabled:opacity-50
                  ${inputClass}
                  ${
                    errors.email
                      ? "border-red-500 focus:border-red-500"
                      : "focus:border-red-500"
                  }
                `}
              />
            </div>

            {errors.email && (
              <p className="mt-1 text-[11px] text-red-500">
                {errors.email}
              </p>
            )}
          </div>

          {/* =================================================
              PHONE
          ================================================= */}

          <div>
            <label
              className={`
                mb-1
                block
                font-semibold
                transition-colors
                duration-300
                ${labelClass}
              `}
            >
              {t("register.phone")} *
            </label>

            <div className="relative">
              <Phone
                className={`
                  absolute
                  left-3.5
                  top-1/2
                  h-4
                  w-4
                  -translate-y-1/2
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
                }}
                placeholder={t(
                  "register.phonePlaceholder"
                )}
                className={`
                  w-full
                  rounded-xl
                  border
                  py-2.5
                  pl-10
                  pr-3
                  outline-none
                  transition-all
                  duration-300
                  disabled:cursor-not-allowed
                  disabled:opacity-50
                  ${inputClass}
                  ${
                    errors.phone
                      ? "border-red-500 focus:border-red-500"
                      : "focus:border-red-500"
                  }
                `}
              />
            </div>

            {errors.phone && (
              <p className="mt-1 text-[11px] text-red-500">
                {errors.phone}
              </p>
            )}
          </div>

          {/* =================================================
              PASSWORD
          ================================================= */}

          <div>
            <label
              className={`
                mb-1
                block
                font-semibold
                transition-colors
                duration-300
                ${labelClass}
              `}
            >
              {t("register.password")} *
            </label>

            <div className="relative">
              <Lock
                className={`
                  absolute
                  left-3.5
                  top-1/2
                  h-4
                  w-4
                  -translate-y-1/2
                  transition-colors
                  duration-300
                  ${iconClass}
                `}
              />

              <input
                type={
                  showPassword
                    ? "text"
                    : "password"
                }
                autoComplete="new-password"
                disabled={loading}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  clearFieldError("password");
                }}
                placeholder={t(
                  "register.passwordPlaceholder"
                )}
                className={`
                  w-full
                  rounded-xl
                  border
                  py-2.5
                  pl-10
                  pr-10
                  outline-none
                  transition-all
                  duration-300
                  disabled:cursor-not-allowed
                  disabled:opacity-50
                  ${inputClass}
                  ${
                    errors.password
                      ? "border-red-500 focus:border-red-500"
                      : "focus:border-red-500"
                  }
                `}
              />

              <button
                type="button"
                onClick={() =>
                  setShowPassword(
                    (value) => !value
                  )
                }
                tabIndex={-1}
                disabled={loading}
                aria-label={
                  showPassword
                    ? "Hide password"
                    : "Show password"
                }
                className={`
                  absolute
                  right-3.5
                  top-1/2
                  -translate-y-1/2
                  cursor-pointer
                  transition-colors
                  disabled:cursor-not-allowed
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
              <p className="mt-1 text-[11px] text-red-500">
                {errors.password}
              </p>
            )}
          </div>

          {/* =================================================
              SUBMIT
          ================================================= */}

          <button
            type="submit"
            disabled={loading}
            className="
              flex
              w-full
              cursor-pointer
              items-center
              justify-center
              gap-2
              rounded-xl
              bg-red-600
              py-3
              text-xs
              font-bold
              text-white
              shadow-lg
              shadow-red-600/30
              transition
              hover:bg-red-500
              disabled:cursor-not-allowed
              disabled:opacity-50
            "
          >
            {loading && (
              <Loader2 className="h-4 w-4 animate-spin" />
            )}

            <span>
              {loading
                ? t("register.creating")
                : t("register.signUp")}
            </span>
          </button>
        </form>

        {/* ===================================================
            LOGIN LINK
        =================================================== */}

        <p
          className={`
            text-center
            text-xs
            transition-colors
            duration-300
            ${footerTextClass}
          `}
        >
          {t("register.haveAccount")}{" "}

          <Link
            href="/login"
            className="
              font-bold
              text-red-500
              transition
              hover:text-red-400
            "
          >
            {t("register.signIn")}
          </Link>
        </p>
      </div>
    </div>
  );
}
