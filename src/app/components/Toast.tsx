"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";

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
      icon: <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />,
      bar: "bg-emerald-500",
    },
    error: {
      icon: <AlertCircle className="h-4 w-4 text-rose-400 shrink-0" />,
      bar: "bg-rose-500",
    },
    info: {
      icon: <Info className="h-4 w-4 text-sky-400 shrink-0" />,
      bar: "bg-sky-500",
    },
  }[type];

  return (
    <div className="fixed top-4 right-4 sm:top-5 sm:right-5 z-50 max-w-sm overflow-hidden rounded-xl border border-slate-800/90 bg-slate-900/95 shadow-xl shadow-black/40 backdrop-blur-md transition-all animate-in fade-in slide-in-from-top-2">
      <div className="flex items-center justify-between gap-3 px-3.5 py-2.5">
        <div className="flex items-center gap-2.5">
          {styles.icon}
          <p className="text-xs font-semibold text-slate-200 leading-tight">
            {message}
          </p>
        </div>
        <button
          onClick={onClose}
          className="text-slate-500 hover:text-slate-300 transition cursor-pointer p-0.5 rounded-md hover:bg-slate-800 shrink-0 ml-2"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Thin loading bar */}
      <div className="h-0.5 w-full bg-slate-800">
        <div
          className={`h-full ${styles.bar} transition-all ease-linear`}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}