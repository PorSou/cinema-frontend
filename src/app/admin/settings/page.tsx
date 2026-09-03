"use client";

import { useEffect, useState } from "react";
import {
  Palette,
  Globe2,
  Ticket,
  Clapperboard,
  CreditCard,
  Bell,
  ShieldCheck,
  Settings2,
  Save,
  RotateCcw,
  Moon,
  Sun,
  Monitor,
} from "lucide-react";
import Toast from "@/app/components/Toast";

type Language = "en" | "km" | "zh";
type Theme = "dark" | "light" | "system";

interface SystemSettings {
  theme: Theme;
  language: Language;

  onlineBooking: boolean;
  allowCancellation: boolean;
  seatHoldMinutes: number;
  maxTicketsPerBooking: number;
  cancellationDeadlineHours: number;

  showtimeGapMinutes: number;
  allowOverlappingShowtimes: boolean;
  allowLateBooking: boolean;

  currency: string;
  cashPayment: boolean;
  cardPayment: boolean;
  onlinePayment: boolean;
  qrPayment: boolean;

  bookingConfirmation: boolean;
  paymentConfirmation: boolean;
  showtimeReminder: boolean;
  cancellationNotification: boolean;

  sessionTimeoutMinutes: number;
  loginNotification: boolean;

  maintenanceMode: boolean;
}

const DEFAULT_SETTINGS: SystemSettings = {
  theme: "dark",
  language: "en",

  onlineBooking: true,
  allowCancellation: true,
  seatHoldMinutes: 10,
  maxTicketsPerBooking: 10,
  cancellationDeadlineHours: 2,

  showtimeGapMinutes: 20,
  allowOverlappingShowtimes: false,
  allowLateBooking: false,

  currency: "USD",
  cashPayment: true,
  cardPayment: true,
  onlinePayment: true,
  qrPayment: true,

  bookingConfirmation: true,
  paymentConfirmation: true,
  showtimeReminder: true,
  cancellationNotification: true,

  sessionTimeoutMinutes: 60,
  loginNotification: true,

  maintenanceMode: false,
};

const Toggle = ({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
}) => {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`relative h-6 w-11 rounded-full transition ${
        checked ? "bg-red-600" : "bg-slate-700"
      }`}
    >
      <span
        className={`absolute top-1 h-4 w-4 rounded-full bg-white transition ${
          checked ? "left-6" : "left-1"
        }`}
      />
    </button>
  );
};

export default function AdminSettingsPage() {
  const [settings, setSettings] =
    useState<SystemSettings>(DEFAULT_SETTINGS);

  const [toast, setToast] = useState<{
    message: string | null;
    type: "success" | "error";
  }>({
    message: null,
    type: "success",
  });

  useEffect(() => {
    const saved = localStorage.getItem("cinemax-system-settings");

    if (saved) {
      try {
        setSettings({
          ...DEFAULT_SETTINGS,
          ...JSON.parse(saved),
        });
      } catch {
        setSettings(DEFAULT_SETTINGS);
      }
    }
  }, []);

  const updateSetting = <K extends keyof SystemSettings>(
    key: K,
    value: SystemSettings[K]
  ) => {
    setSettings((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const saveSettings = () => {
    localStorage.setItem(
      "cinemax-system-settings",
      JSON.stringify(settings)
    );

    // Save language globally
    localStorage.setItem("cinemax-language", settings.language);

    setToast({
      message: "System settings saved successfully.",
      type: "success",
    });
  };

  const resetSettings = () => {
    setSettings(DEFAULT_SETTINGS);

    localStorage.setItem(
      "cinemax-system-settings",
      JSON.stringify(DEFAULT_SETTINGS)
    );

    setToast({
      message: "Settings have been reset to default.",
      type: "success",
    });
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-24 text-slate-100">
      <Toast
        message={toast.message}
        type={toast.type}
        onClose={() =>
          setToast({
            message: null,
            type: "success",
          })
        }
      />

      {/* Header */}
      <div className="border-b border-slate-800 pb-5">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-red-600/10 text-red-500">
            <Settings2 className="h-6 w-6" />
          </div>

          <div>
            <h1 className="text-2xl font-black text-white">
              System Settings
            </h1>

            <p className="mt-1 text-xs text-slate-400">
              Manage CINEMAX workspace preferences and system behavior.
            </p>
          </div>
        </div>
      </div>

      {/* Appearance */}
      <section className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6 shadow-xl">
        <div className="mb-6 flex items-center gap-3 border-b border-slate-800 pb-4">
          <Palette className="h-5 w-5 text-purple-400" />

          <div>
            <h2 className="font-black text-white">Appearance</h2>
            <p className="text-xs text-slate-400">
              Customize the CINEMAX workspace.
            </p>
          </div>
        </div>

        <div className="space-y-6">
          {/* Theme */}
          <div>
            <label className="mb-3 block text-sm font-bold text-slate-200">
              Theme
            </label>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {[
                {
                  value: "dark" as Theme,
                  label: "Dark",
                  icon: Moon,
                },
                {
                  value: "light" as Theme,
                  label: "Light",
                  icon: Sun,
                },
                {
                  value: "system" as Theme,
                  label: "System",
                  icon: Monitor,
                },
              ].map((item) => {
                const Icon = item.icon;
                const active = settings.theme === item.value;

                return (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() =>
                      updateSetting("theme", item.value)
                    }
                    className={`flex items-center gap-3 rounded-2xl border p-4 text-left transition ${
                      active
                        ? "border-red-500 bg-red-600/10 text-white"
                        : "border-slate-800 bg-slate-950/60 text-slate-400 hover:border-slate-700"
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    <span className="text-sm font-bold">
                      {item.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Language */}
      <section className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6 shadow-xl">
        <div className="mb-6 flex items-center gap-3 border-b border-slate-800 pb-4">
          <Globe2 className="h-5 w-5 text-blue-400" />

          <div>
            <h2 className="font-black text-white">
              Language & Localization
            </h2>

            <p className="text-xs text-slate-400">
              Choose the default language for CINEMAX.
            </p>
          </div>
        </div>

        <div>
          <label className="mb-2 block text-sm font-bold text-slate-300">
            Default Language
          </label>

          <select
            value={settings.language}
            onChange={(e) =>
              updateSetting(
                "language",
                e.target.value as Language
              )
            }
            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm font-semibold text-white outline-none focus:border-red-500 sm:max-w-md"
          >
            <option value="en">🇬🇧 English</option>
            <option value="km">🇰🇭 ខ្មែរ (Khmer)</option>
            <option value="zh">🇨🇳 中文 (Chinese)</option>
          </select>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {[
            ["en", "🇬🇧", "English"],
            ["km", "🇰🇭", "ខ្មែរ"],
            ["zh", "🇨🇳", "中文"],
          ].map(([value, flag, label]) => (
            <button
              key={value}
              type="button"
              onClick={() =>
                updateSetting("language", value as Language)
              }
              className={`rounded-2xl border p-4 transition ${
                settings.language === value
                  ? "border-red-500 bg-red-600/10"
                  : "border-slate-800 bg-slate-950/50"
              }`}
            >
              <div className="text-2xl">{flag}</div>
              <div className="mt-2 text-sm font-bold text-white">
                {label}
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* Booking */}
      <section className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6 shadow-xl">
        <div className="mb-6 flex items-center gap-3 border-b border-slate-800 pb-4">
          <Ticket className="h-5 w-5 text-red-400" />

          <div>
            <h2 className="font-black text-white">Booking</h2>
            <p className="text-xs text-slate-400">
              Configure cinema ticket booking rules.
            </p>
          </div>
        </div>

        <div className="space-y-5">
          <SettingToggle
            title="Online Booking"
            description="Allow customers to purchase tickets online."
            checked={settings.onlineBooking}
            onChange={(v) => updateSetting("onlineBooking", v)}
          />

          <SettingToggle
            title="Allow Cancellation"
            description="Allow customers to cancel their bookings."
            checked={settings.allowCancellation}
            onChange={(v) =>
              updateSetting("allowCancellation", v)
            }
          />

          <SettingNumber
            label="Seat Hold Duration"
            value={settings.seatHoldMinutes}
            suffix="minutes"
            onChange={(v) =>
              updateSetting("seatHoldMinutes", v)
            }
          />

          <SettingNumber
            label="Maximum Tickets Per Booking"
            value={settings.maxTicketsPerBooking}
            suffix="tickets"
            onChange={(v) =>
              updateSetting("maxTicketsPerBooking", v)
            }
          />

          <SettingNumber
            label="Cancellation Deadline"
            value={settings.cancellationDeadlineHours}
            suffix="hours before showtime"
            onChange={(v) =>
              updateSetting(
                "cancellationDeadlineHours",
                v
              )
            }
          />
        </div>
      </section>

      {/* Showtime */}
      <section className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6 shadow-xl">
        <div className="mb-6 flex items-center gap-3 border-b border-slate-800 pb-4">
          <Clapperboard className="h-5 w-5 text-amber-400" />

          <div>
            <h2 className="font-black text-white">Showtime</h2>
            <p className="text-xs text-slate-400">
              Configure movie scheduling behavior.
            </p>
          </div>
        </div>

        <div className="space-y-5">
          <SettingNumber
            label="Minimum Gap Between Shows"
            value={settings.showtimeGapMinutes}
            suffix="minutes"
            onChange={(v) =>
              updateSetting("showtimeGapMinutes", v)
            }
          />

          <SettingToggle
            title="Allow Overlapping Showtimes"
            description="Allow the same hall to have overlapping shows."
            checked={settings.allowOverlappingShowtimes}
            onChange={(v) =>
              updateSetting(
                "allowOverlappingShowtimes",
                v
              )
            }
          />

          <SettingToggle
            title="Allow Late Booking"
            description="Allow customers to book after the movie has started."
            checked={settings.allowLateBooking}
            onChange={(v) =>
              updateSetting("allowLateBooking", v)
            }
          />
        </div>
      </section>

      {/* Payment */}
      <section className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6 shadow-xl">
        <div className="mb-6 flex items-center gap-3 border-b border-slate-800 pb-4">
          <CreditCard className="h-5 w-5 text-emerald-400" />

          <div>
            <h2 className="font-black text-white">Payment</h2>
            <p className="text-xs text-slate-400">
              Configure supported payment methods.
            </p>
          </div>
        </div>

        <div className="space-y-5">
          <div>
            <label className="mb-2 block text-sm font-bold text-slate-300">
              Currency
            </label>

            <select
              value={settings.currency}
              onChange={(e) =>
                updateSetting("currency", e.target.value)
              }
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none sm:max-w-md"
            >
              <option value="USD">USD - US Dollar</option>
              <option value="KHR">KHR - Cambodian Riel</option>
              <option value="CNY">CNY - Chinese Yuan</option>
            </select>
          </div>

          <SettingToggle
            title="Cash Payment"
            description="Allow payment at the cinema counter."
            checked={settings.cashPayment}
            onChange={(v) =>
              updateSetting("cashPayment", v)
            }
          />

          <SettingToggle
            title="Card Payment"
            description="Allow debit and credit card payments."
            checked={settings.cardPayment}
            onChange={(v) =>
              updateSetting("cardPayment", v)
            }
          />

          <SettingToggle
            title="Online Payment"
            description="Allow online payment during checkout."
            checked={settings.onlinePayment}
            onChange={(v) =>
              updateSetting("onlinePayment", v)
            }
          />

          <SettingToggle
            title="QR Payment"
            description="Allow customers to pay using QR codes."
            checked={settings.qrPayment}
            onChange={(v) =>
              updateSetting("qrPayment", v)
            }
          />
        </div>
      </section>

      {/* Notifications */}
      <section className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6 shadow-xl">
        <div className="mb-6 flex items-center gap-3 border-b border-slate-800 pb-4">
          <Bell className="h-5 w-5 text-blue-400" />

          <div>
            <h2 className="font-black text-white">
              Notifications
            </h2>

            <p className="text-xs text-slate-400">
              Control customer notification behavior.
            </p>
          </div>
        </div>

        <div className="space-y-5">
          <SettingToggle
            title="Booking Confirmation"
            description="Send confirmation after successful booking."
            checked={settings.bookingConfirmation}
            onChange={(v) =>
              updateSetting("bookingConfirmation", v)
            }
          />

          <SettingToggle
            title="Payment Confirmation"
            description="Send confirmation after successful payment."
            checked={settings.paymentConfirmation}
            onChange={(v) =>
              updateSetting("paymentConfirmation", v)
            }
          />

          <SettingToggle
            title="Showtime Reminder"
            description="Remind customers about upcoming shows."
            checked={settings.showtimeReminder}
            onChange={(v) =>
              updateSetting("showtimeReminder", v)
            }
          />

          <SettingToggle
            title="Cancellation Notification"
            description="Notify customers when a booking is cancelled."
            checked={settings.cancellationNotification}
            onChange={(v) =>
              updateSetting(
                "cancellationNotification",
                v
              )
            }
          />
        </div>
      </section>

      {/* Security */}
      <section className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6 shadow-xl">
        <div className="mb-6 flex items-center gap-3 border-b border-slate-800 pb-4">
          <ShieldCheck className="h-5 w-5 text-green-400" />

          <div>
            <h2 className="font-black text-white">Security</h2>
            <p className="text-xs text-slate-400">
              Configure basic workspace security behavior.
            </p>
          </div>
        </div>

        <div className="space-y-5">
          <SettingNumber
            label="Session Timeout"
            value={settings.sessionTimeoutMinutes}
            suffix="minutes"
            onChange={(v) =>
              updateSetting(
                "sessionTimeoutMinutes",
                v
              )
            }
          />

          <SettingToggle
            title="Login Notification"
            description="Notify administrators about new logins."
            checked={settings.loginNotification}
            onChange={(v) =>
              updateSetting("loginNotification", v)
            }
          />
        </div>
      </section>

      {/* System */}
      <section className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6 shadow-xl">
        <div className="mb-6 flex items-center gap-3 border-b border-slate-800 pb-4">
          <Settings2 className="h-5 w-5 text-slate-300" />

          <div>
            <h2 className="font-black text-white">System</h2>
            <p className="text-xs text-slate-400">
              Global system configuration.
            </p>
          </div>
        </div>

        <SettingToggle
          title="Maintenance Mode"
          description="Temporarily disable customer-facing features."
          checked={settings.maintenanceMode}
          onChange={(v) =>
            updateSetting("maintenanceMode", v)
          }
        />

        <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
          <p className="text-xs text-slate-500">
            CINEMAX Workspace
          </p>

          <p className="mt-1 font-mono text-sm font-bold text-white">
            Version 1.0.0
          </p>
        </div>
      </section>

      {/* Buttons */}
      <div className="sticky bottom-4 z-20 flex flex-col gap-3 rounded-2xl border border-slate-800 bg-slate-950/90 p-3 shadow-2xl backdrop-blur-xl sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={resetSettings}
          className="flex items-center justify-center gap-2 rounded-xl border border-slate-700 px-5 py-3 text-sm font-bold text-slate-300 transition hover:bg-slate-800"
        >
          <RotateCcw className="h-4 w-4" />
          Reset
        </button>

        <button
          type="button"
          onClick={saveSettings}
          className="flex items-center justify-center gap-2 rounded-xl bg-red-600 px-6 py-3 text-sm font-black text-white shadow-lg shadow-red-600/20 transition hover:bg-red-500"
        >
          <Save className="h-4 w-4" />
          Save Changes
        </button>
      </div>
    </div>
  );
}

/* -------------------------------- */
/* Reusable components              */
/* -------------------------------- */

function SettingToggle({
  title,
  description,
  checked,
  onChange,
}: {
  title: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
      <div>
        <p className="text-sm font-bold text-white">{title}</p>

        <p className="mt-1 text-xs text-slate-500">
          {description}
        </p>
      </div>

      <Toggle checked={checked} onChange={onChange} />
    </div>
  );
}

function SettingNumber({
  label,
  value,
  suffix,
  onChange,
}: {
  label: string;
  value: number;
  suffix: string;
  onChange: (value: number) => void;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-slate-800 bg-slate-950/50 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-sm font-bold text-white">{label}</p>
      </div>

      <div className="flex items-center gap-2">
        <input
          type="number"
          min={0}
          value={value}
          onChange={(e) =>
            onChange(Number(e.target.value))
          }
          className="w-24 rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-right text-sm font-bold text-white outline-none focus:border-red-500"
        />

        <span className="text-xs text-slate-500">
          {suffix}
        </span>
      </div>
    </div>
  );
}