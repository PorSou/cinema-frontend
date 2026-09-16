"use client";

import { Loader2, LogOut, Trash2, RotateCcw } from "lucide-react";

import { useLanguage } from "@/app/context/LanguageContext";
import { useSettings } from "@/app/context/SettingsContext"; // <--- 1. Import useSettings

export interface ConfirmDialogProps {
  isOpen: boolean;

  type: "SOFT_DELETE" | "HARD_DELETE" | "RESTORE" | "LOGOUT";

  title?: string;

  targetName: string;

  loading?: boolean;

  onConfirm: () => void;

  onCancel: () => void;
}

export default function ConfirmDialog({
  isOpen,
  type,
  title,
  targetName,
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const { t } = useLanguage();
  const { theme } = useSettings(); // <--- 2. Get theme context
  const isLight = theme === "light";

  if (!isOpen) {
    return null;
  }

  const config = {
    // ============================================
    // HARD DELETE
    // ============================================
    HARD_DELETE: {
      defaultTitle: t("confirmDialog.hardDelete.title"),

      btnClass: "bg-red-600 hover:bg-red-500 shadow-lg shadow-red-600/20",

      btnText: t("confirmDialog.hardDelete.button"),

      message: t("confirmDialog.hardDelete.message").replace(
        "{name}",
        targetName,
      ),

      icon: Trash2,

      iconClass:
        "text-red-600 bg-red-50 border-red-200 dark:text-red-400 dark:bg-red-500/10 dark:border-red-500/20",
    },

    // ============================================
    // RESTORE
    // ============================================
    RESTORE: {
      defaultTitle: t("confirmDialog.restore.title"),

      btnClass:
        "bg-emerald-600 hover:bg-emerald-500 shadow-lg shadow-emerald-600/20",

      btnText: t("confirmDialog.restore.button"),

      message: t("confirmDialog.restore.message").replace("{name}", targetName),

      icon: RotateCcw,

      iconClass:
        "text-emerald-600 bg-emerald-50 border-emerald-200 dark:text-emerald-400 dark:bg-emerald-500/10 dark:border-emerald-500/20",
    },

    // ============================================
    // SOFT DELETE
    // ============================================
    SOFT_DELETE: {
      defaultTitle: t("confirmDialog.softDelete.title"),

      btnClass: "bg-red-600 hover:bg-red-500 shadow-lg shadow-red-600/20",

      btnText: t("confirmDialog.softDelete.button"),

      message: t("confirmDialog.softDelete.message").replace(
        "{name}",
        targetName,
      ),

      icon: Trash2,

      iconClass:
        "text-red-600 bg-red-50 border-red-200 dark:text-red-400 dark:bg-red-500/10 dark:border-red-500/20",
    },

    // ============================================
    // LOGOUT
    // ============================================
    LOGOUT: {
      defaultTitle: t("confirmDialog.logout.title"),

      btnClass: "bg-red-600 hover:bg-red-500 shadow-lg shadow-red-600/20",

      btnText: t("confirmDialog.logout.button"),

      message: t("confirmDialog.logout.message").replace("{name}", targetName),

      icon: LogOut,

      iconClass:
        "text-red-600 bg-red-50 border-red-200 dark:text-red-400 dark:bg-red-500/10 dark:border-red-500/20",
    },
  }[type];

  const Icon = config.icon;

  /**
   * =========================================================
   * DYNAMIC THEME CLASSES
   * =========================================================
   */
  const overlayClass = isLight
    ? "bg-slate-950/30 backdrop-blur-sm"
    : "bg-black/70 backdrop-blur-sm";

  const dialogBoxClass = isLight
    ? "border-slate-200 bg-white text-slate-900 shadow-2xl shadow-slate-300/50"
    : "border-slate-800 bg-slate-900 text-slate-100 shadow-2xl shadow-black/50";

  const cancelBtnClass = isLight
    ? "border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-200 hover:text-slate-900"
    : "border-slate-700/80 bg-slate-800/40 text-slate-300 hover:bg-slate-800 hover:text-white";

  return (
    <div
      className={`fixed inset-0 z-[100] flex items-center justify-center p-4 transition-colors duration-300 ${overlayClass}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
    >
      <div
        className={`w-full max-w-md rounded-2xl border p-6 sm:p-7 animate-in zoom-in-95 transition-colors duration-300 ${dialogBoxClass}`}
      >
        {/* ============================================
            ICON
        ============================================ */}

        <div
          className={`
            mb-4
            flex
            h-11
            w-11
            items-center
            justify-center
            rounded-xl
            border
            ${config.iconClass}
          `}
        >
          <Icon className="h-5 w-5" />
        </div>

        {/* ============================================
            TITLE
        ============================================ */}

        <h3
          id="confirm-dialog-title"
          className={`
            text-base
            font-bold
            tracking-tight
            sm:text-lg
            ${isLight ? "text-slate-900" : "text-white"}
          `}
        >
          {title || config.defaultTitle}
        </h3>

        {/* ============================================
            MESSAGE
        ============================================ */}

        <p
          className={`
            mt-3
            text-sm
            leading-relaxed
            ${isLight ? "text-slate-600" : "text-slate-300"}
          `}
        >
          {config.message}
        </p>

        {/* ============================================
            BUTTONS
        ============================================ */}

        <div className="mt-6 flex items-center justify-end gap-3">
          {/* Cancel */}

          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className={`
              cursor-pointer
              rounded-xl
              border
              px-4
              py-2.5
              text-xs
              font-semibold
              transition

              disabled:cursor-not-allowed
              disabled:opacity-50
              ${cancelBtnClass}
            `}
          >
            {t("confirmDialog.cancel")}
          </button>

          {/* Confirm */}

          <button
            type="button"
            disabled={loading}
            onClick={onConfirm}
            className={`
              flex
              cursor-pointer
              items-center
              gap-2
              rounded-xl
              px-5
              py-2.5
              text-xs
              font-bold
              text-white
              transition

              disabled:cursor-not-allowed
              disabled:opacity-50

              ${config.btnClass}
            `}
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}

            <span>{config.btnText}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
