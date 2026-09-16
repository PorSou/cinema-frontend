"use client";

import { useSettings } from "@/app/context/SettingsContext";
import { Armchair, Coffee, ShieldCheck } from "lucide-react";

interface BookingStepperProps {
  currentStep: 1 | 2 | 3;
}

export default function BookingStepper({ currentStep }: BookingStepperProps) {
  const { theme } = useSettings();
  const isDark = theme === "dark";

  const steps = [
    { number: 1, label: "Choose Seats", icon: Armchair },
    { number: 2, label: "Add Snacks & F&B", icon: Coffee },
    { number: 3, label: "Review & Checkout", icon: ShieldCheck },
  ];

  return (
    <div className="w-full max-w-3xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between relative">
        {/* Background Connecting Line */}
        <div
          className={`absolute left-8 right-8 top-1/2 -translate-y-1/2 h-1 rounded-full z-0 transition-all duration-500 ${
            isDark ? "bg-slate-800" : "bg-slate-200"
          }`}
        />

        {/* Active Progress Line */}
        <div
          className="absolute left-8 top-1/2 -translate-y-1/2 h-1 bg-amber-500 rounded-full z-0 transition-all duration-500"
          style={{
            width:
              currentStep === 1 ? "0%" : currentStep === 2 ? "50%" : "100%",
          }}
        />

        {steps.map((step) => {
          const Icon = step.icon;
          const isCompleted = currentStep > step.number;
          const isCurrent = currentStep === step.number;

          return (
            <div
              key={step.number}
              className="relative z-10 flex flex-col items-center group"
            >
              <div
                className={`flex h-12 w-12 items-center justify-center rounded-2xl font-black text-xs transition-all duration-300 shadow-xl border ${
                  isCompleted
                    ? "bg-amber-500 border-amber-500 text-slate-950 shadow-amber-500/30 scale-105"
                    : isCurrent
                      ? "bg-amber-500 border-amber-400 text-slate-950 shadow-amber-500/40 ring-4 ring-amber-500/20 scale-110"
                      : isDark
                        ? "bg-slate-900 border-slate-700 text-slate-400"
                        : "bg-white border-slate-300 text-slate-400 shadow-sm"
                }`}
              >
                {isCompleted ? (
                  <span className="text-sm font-black">✓</span>
                ) : (
                  <Icon className="h-5 w-5" />
                )}
              </div>

              <div className="absolute -bottom-7 whitespace-nowrap text-center">
                <span
                  className={`text-[11px] font-black tracking-tight transition-colors duration-300 ${
                    isCurrent
                      ? "text-amber-500"
                      : isCompleted
                        ? isDark
                          ? "text-slate-200"
                          : "text-slate-800"
                        : isDark
                          ? "text-slate-600"
                          : "text-slate-400"
                  }`}
                >
                  {step.label}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
