"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";
import { useSettings } from "@/app/context/SettingsContext";

export interface ToastProps {
  message: string | null;
  type?: "success" | "error" | "info";
  duration?: number;
  onClose: () => void;
}

export default function Toast({
  message,
  type = "success",
  duration = 3000,
  onClose,
}: ToastProps) {
  const { theme } = useSettings();
  const isLight = theme === "light";

  const [progress, setProgress] = useState(100);

  useEffect(() => {
    if (!message) return;
    setProgress(100);

    const stepMs = 25;
    const decrement = (stepMs / duration) * 100;

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev <= 0) {
          clearInterval(interval);
          return 0;
        }
        return Math.max(prev - decrement, 0);
      });
    }, stepMs);

    const timer = setTimeout(() => {
      onClose();
    }, duration);

    return () => {
      clearInterval(interval);
      clearTimeout(timer);
    };
  }, [message, duration, onClose]);

  if (!message) return null;

  const styles = {
    success: {
      icon: <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />,
      title: "Success",
      borderLeft: "border-l-emerald-500",
      bar: "bg-emerald-500",
    },
    error: {
      icon: <AlertCircle className="h-4 w-4 text-rose-500 shrink-0" />,
      title: "Error",
      borderLeft: "border-l-rose-500",
      bar: "bg-rose-500",
    },
    info: {
      icon: <Info className="h-4 w-4 text-sky-500 shrink-0" />,
      title: "Information",
      borderLeft: "border-l-sky-500",
      bar: "bg-sky-500",
    },
  }[type];

  const toastCardClass = isLight
    ? "border-slate-200 bg-white text-slate-900 shadow-xl shadow-slate-300/50"
    : "border-slate-800 bg-slate-900 text-slate-100 shadow-xl shadow-black/50";

  const titleClass = isLight ? "text-slate-900" : "text-white";
  const descClass = isLight ? "text-slate-500" : "text-slate-400";

  const closeBtnClass = isLight
    ? "text-slate-400 hover:text-slate-700"
    : "text-slate-500 hover:text-slate-300";

  const trackBarClass = isLight ? "bg-slate-100" : "bg-slate-800";

  return (
    <div
      className={`fixed top-4 right-4 sm:top-5 sm:right-5 z-50 w-72 overflow-hidden rounded-xl border border-l-4 ${styles.borderLeft} backdrop-blur-md transition-all duration-150 ease-out animate-in fade-in zoom-in-90 ${toastCardClass}`}
    >
      <div className="flex items-start gap-3 px-3 py-2.5">
        <div className="shrink-0 mt-0.5">{styles.icon}</div>

        <div className="flex-1 min-w-0">
          <h4
            className={`text-[11px] font-bold uppercase tracking-wide ${titleClass}`}
          >
            {styles.title}
          </h4>
          <p
            className={`text-[11px] font-medium leading-snug truncate ${descClass}`}
          >
            {message}
          </p>
        </div>

        <button
          onClick={onClose}
          className={`transition cursor-pointer p-0.5 rounded shrink-0 ${closeBtnClass}`}
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className={`h-0.5 w-full ${trackBarClass}`}>
        <div
          className={`h-full ${styles.bar} transition-all ease-linear`}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}
