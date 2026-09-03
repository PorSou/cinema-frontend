"use client";

import {
  useState,
  FormEvent,
  useEffect,
  Suspense,
} from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Film,
  Lock,
  Mail,
  Loader2,
  AlertCircle,
  Eye,
  EyeOff,
  ShieldAlert,
} from "lucide-react";

import { AuthService } from "@/app/service/auth.service";
import { useSettings } from "@/app/context/SettingsContext";

const MAX_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 5;

const ATTEMPTS_KEY = "cinemax_login_attempts";
const LOCKOUT_TIME_KEY = "cinemax_login_lockout_until";

function LoginForm() {
  const searchParams = useSearchParams();

  const redirectUrl = searchParams.get("redirect");

  /**
   * =========================================================
   * SETTINGS
   * =========================================================
   *
   * IMPORTANT:
   * Use SettingsContext only.
   *
   * theme = "dark" | "light"
   * language = "en" | "km" | "zh"
   */
  const { t, theme } = useSettings();

  const isLight = theme === "light";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [showPassword, setShowPassword] =
    useState(false);

  const [loading, setLoading] =
    useState(false);

  const [errorMsg, setErrorMsg] =
    useState<string | null>(null);

  const [errors, setErrors] = useState<{
    email?: string;
    password?: string;
  }>({});

  const [isLocked, setIsLocked] =
    useState(false);

  const [remainingSeconds, setRemainingSeconds] =
    useState(0);

  /**
   * =========================================================
   * CHECK LOGIN LOCKOUT
   * =========================================================
   */

  useEffect(() => {
    const checkLockout = () => {
      const lockoutUntil =
        localStorage.getItem(
          LOCKOUT_TIME_KEY
        );

      if (!lockoutUntil) {
        setIsLocked(false);
        setRemainingSeconds(0);
        return;
      }

      const lockoutTime =
        parseInt(lockoutUntil, 10);

      const remaining = Math.ceil(
        (lockoutTime - Date.now()) / 1000
      );

      if (remaining > 0) {
        setIsLocked(true);
        setRemainingSeconds(remaining);
        return;
      }

      localStorage.removeItem(
        LOCKOUT_TIME_KEY
      );

      localStorage.removeItem(
        ATTEMPTS_KEY
      );

      setIsLocked(false);
      setRemainingSeconds(0);
    };

    checkLockout();

    const interval = setInterval(
      checkLockout,
      1000
    );

    return () => {
      clearInterval(interval);
    };
  }, []);

  /**
   * =========================================================
   * VALIDATION
   * =========================================================
   */

  const validate = () => {
    const newErrors: {
      email?: string;
      password?: string;
    } = {};

    const emailRegex =
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!email.trim()) {
      newErrors.email =
        t("login.emailRequired");
    } else if (
      !emailRegex.test(email.trim())
    ) {
      newErrors.email =
        t("login.emailInvalid");
    }

    if (!password) {
      newErrors.password =
        t("login.passwordRequired");
    } else if (
      password.length < 6
    ) {
      newErrors.password =
        t("login.passwordMin");
    }

    setErrors(newErrors);

    return (
      Object.keys(newErrors).length === 0
    );
  };

  /**
   * =========================================================
   * FORMAT COUNTDOWN
   * =========================================================
   */

  const formatCountdown = (
    secs: number
  ) => {
    const mins = Math.floor(
      secs / 60
    );

    const seconds = secs % 60;

    return `${mins}:${
      seconds < 10 ? "0" : ""
    }${seconds}`;
  };

  /**
   * =========================================================
   * LOGIN
   * =========================================================
   */

  const handleLogin = async (
    e: FormEvent<HTMLFormElement>
  ) => {
    e.preventDefault();

    if (isLocked) {
      return;
    }

    if (!validate()) {
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      const auth =
        await AuthService.login({
          email: email
            .trim()
            .toLowerCase(),

          password,
        });

      /**
       * Reset failed attempts
       */
      localStorage.removeItem(
        ATTEMPTS_KEY
      );

      localStorage.removeItem(
        LOCKOUT_TIME_KEY
      );

      /**
       * Save access token
       */
      if (auth?.accessToken) {
        localStorage.setItem(
          "accessToken",
          auth.accessToken
        );
      }

      /**
       * Save refresh token
       */
      if (auth?.refreshToken) {
        localStorage.setItem(
          "refreshToken",
          auth.refreshToken
        );
      }

      /**
       * Save user
       */
      if (auth?.user) {
        localStorage.setItem(
          "user",
          JSON.stringify(auth.user)
        );
      }

      /**
       * Get user role
       */
      const userRole =
        auth?.user?.role?.toUpperCase();

      const isAdminOrStaff =
        userRole === "ADMIN" ||
        userRole === "STAFF";

      /**
       * =====================================================
       * REDIRECT
       * =====================================================
       */

      if (redirectUrl) {
        window.location.href =
          redirectUrl;
      } else if (
        isAdminOrStaff
      ) {
        window.location.href =
          "/admin/dashboard";
      } else {
        window.location.href = "/";
      }
    } catch (err: any) {
      /**
       * =====================================================
       * LOGIN FAILED
       * =====================================================
       */

      const currentAttempts =
        parseInt(
          localStorage.getItem(
            ATTEMPTS_KEY
          ) || "0",
          10
        ) + 1;

      localStorage.setItem(
        ATTEMPTS_KEY,
        currentAttempts.toString()
      );

      /**
       * =====================================================
       * MAX ATTEMPTS REACHED
       * =====================================================
       */

      if (
        currentAttempts >=
        MAX_ATTEMPTS
      ) {
        const lockoutUntil =
          Date.now() +
          LOCKOUT_MINUTES *
            60 *
            1000;

        localStorage.setItem(
          LOCKOUT_TIME_KEY,
          lockoutUntil.toString()
        );

        setIsLocked(true);

        setRemainingSeconds(
          LOCKOUT_MINUTES * 60
        );

        setErrorMsg(
          t(
            "login.tooManyAttempts"
          ).replace(
            "{minutes}",
            LOCKOUT_MINUTES.toString()
          )
        );
      } else {
        const remainingAttempts =
          MAX_ATTEMPTS -
          currentAttempts;

        const serverError =
          err?.response?.data
            ?.status?.message ||
          err?.response?.data
            ?.message ||
          t(
            "login.invalidCredentials"
          );

        const attemptText =
          t(
            "login.attemptsRemaining"
          )
            .replace(
              "{count}",
              remainingAttempts.toString()
            )
            .replace(
              "{plural}",
              remainingAttempts > 1
                ? "s"
                : ""
            );

        setErrorMsg(
          `${serverError} (${attemptText})`
        );
      }
    } finally {
      setLoading(false);
    }
  };

  /**
   * =========================================================
   * THEME CLASSES
   * =========================================================
   *
   * These classes are controlled directly by SettingsContext.
   *
   * This is the important part that fixes the problem.
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
    ? "bg-white text-slate-900 border-slate-300 placeholder:text-slate-400 focus:border-red-500"
    : "bg-slate-950 text-white border-slate-800 placeholder:text-slate-500 focus:border-red-500";

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
        min-h-screen
        flex
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
          rounded-3xl
          border
          p-6
          sm:p-8
          backdrop-blur-xl
          space-y-6
          transition-colors
          duration-300
          ${cardClass}
        `}
      >
        {/* ===================================================
            HEADER
        =================================================== */}

        <div className="text-center space-y-2">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-red-600 shadow-lg shadow-red-600/30 mb-2">
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

        {/* ===================================================
            LOCKED MESSAGE
        =================================================== */}

        {isLocked ? (
          <div className="flex items-center gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5 text-xs text-amber-500">
            <ShieldAlert className="h-5 w-5 shrink-0" />

            <div>
              <p className="font-bold">
                {t(
                  "login.lockedTitle"
                )}
              </p>

              <p className="text-[11px] text-amber-500/80 mt-0.5">
                {t(
                  "login.lockedDescription"
                ).replace(
                  "{time}",
                  formatCountdown(
                    remainingSeconds
                  )
                )}
              </p>
            </div>
          </div>
        ) : (
          errorMsg && (
            <div className="flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-500">
              <AlertCircle className="h-4 w-4 shrink-0" />

              <span>
                {errorMsg}
              </span>
            </div>
          )
        )}

        {/* ===================================================
            LOGIN FORM
        =================================================== */}

        <form
          onSubmit={handleLogin}
          noValidate
          className="space-y-4 text-xs"
        >
          {/* =================================================
              EMAIL
          ================================================= */}

          <div>
            <label
              className={`
                block
                mb-1
                font-semibold
                transition-colors
                duration-300
                ${labelClass}
              `}
            >
              {t("login.email")}
            </label>

            <div className="relative">
              <Mail
                className={`
                  absolute
                  left-3.5
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
                disabled={
                  isLocked ||
                  loading
                }
                value={email}
                onChange={(e) => {
                  setEmail(
                    e.target.value
                  );

                  if (
                    errors.email
                  ) {
                    setErrors(
                      (prev) => ({
                        ...prev,
                        email:
                          undefined,
                      })
                    );
                  }
                }}
                placeholder={t(
                  "login.emailPlaceholder"
                )}
                className={`
                  w-full
                  rounded-xl
                  border
                  py-3
                  pl-10
                  pr-3
                  outline-none
                  transition-all
                  duration-300
                  disabled:opacity-50
                  disabled:cursor-not-allowed
                  ${inputClass}
                  ${
                    errors.email
                      ? "border-red-500"
                      : ""
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
              PASSWORD
          ================================================= */}

          <div>
            <div className="flex items-center justify-between mb-1">
              <label
                className={`
                  block
                  font-semibold
                  transition-colors
                  duration-300
                  ${labelClass}
                `}
              >
                {t(
                  "login.password"
                )}
              </label>

              <Link
                href="/forgot-password"
                className="text-xs text-red-500 hover:text-red-400 font-medium transition-colors"
              >
                {t(
                  "login.forgotPassword"
                )}
              </Link>
            </div>

            <div className="relative">
              <Lock
                className={`
                  absolute
                  left-3.5
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
                type={
                  showPassword
                    ? "text"
                    : "password"
                }
                autoComplete="current-password"
                disabled={
                  isLocked ||
                  loading
                }
                value={password}
                onChange={(e) => {
                  setPassword(
                    e.target.value
                  );

                  if (
                    errors.password
                  ) {
                    setErrors(
                      (prev) => ({
                        ...prev,
                        password:
                          undefined,
                      })
                    );
                  }
                }}
                placeholder={t(
                  "login.passwordPlaceholder"
                )}
                className={`
                  w-full
                  rounded-xl
                  border
                  py-3
                  pl-10
                  pr-10
                  outline-none
                  transition-all
                  duration-300
                  disabled:opacity-50
                  disabled:cursor-not-allowed
                  ${inputClass}
                  ${
                    errors.password
                      ? "border-red-500"
                      : ""
                  }
                `}
              />

              <button
                type="button"
                onClick={() =>
                  setShowPassword(
                    (current) =>
                      !current
                  )
                }
                tabIndex={-1}
                disabled={
                  isLocked ||
                  loading
                }
                className={`
                  absolute
                  right-3.5
                  top-1/2
                  -translate-y-1/2
                  transition-colors
                  disabled:opacity-50
                  ${passwordButtonClass}
                `}
                aria-label={
                  showPassword
                    ? "Hide password"
                    : "Show password"
                }
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
              SUBMIT BUTTON
          ================================================= */}

          <button
            type="submit"
            disabled={
              loading ||
              isLocked
            }
            className="
              flex
              w-full
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
              hover:bg-red-500
              disabled:opacity-50
              transition
              cursor-pointer
              disabled:cursor-not-allowed
            "
          >
            {loading && (
              <Loader2 className="h-4 w-4 animate-spin" />
            )}

            <span>
              {isLocked
                ? `${t(
                    "login.lockedTitle"
                  )} (${formatCountdown(
                    remainingSeconds
                  )})`
                : loading
                ? t(
                    "login.signingIn"
                  )
                : t(
                    "login.signIn"
                  )}
            </span>
          </button>
        </form>

        {/* ===================================================
            REGISTER
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
          {t(
            "login.noAccount"
          )}{" "}

          <Link
            href="/register"
            className="font-bold text-red-500 hover:text-red-400 transition-colors"
          >
            {t(
              "login.createAccount"
            )}
          </Link>
        </p>
      </div>
    </div>
  );
}

/**
 * ============================================================
 * LOGIN PAGE
 * ============================================================
 */

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-100 dark:bg-slate-950 flex items-center justify-center transition-colors duration-300">
          <Loader2 className="h-8 w-8 animate-spin text-red-600" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
