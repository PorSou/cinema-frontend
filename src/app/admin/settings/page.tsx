"use client";

import { useEffect, useState } from "react";
import {
  Palette,
  Globe2,
  Ticket,
  Clapperboard,
  CreditCard,
  ShieldCheck,
  Settings2,
  Save,
  RotateCcw,
  Moon,
  Sun,
  Monitor,
  Image as ImageIcon,
  Upload,
  X,
  Loader2,
} from "lucide-react";
import Toast from "@/app/components/Toast";
import { useSettings, Theme, Language } from "@/app/context/SettingsContext";
import api from "@/app/lib/api";
import { LOGO_UPDATE_EVENT } from "@/app/hooks/useSiteLogo";

interface SystemSettingsConfig {
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
  siteLogoUrl: string;
}

const DEFAULT_CONFIG: SystemSettingsConfig = {
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
  siteLogoUrl: "/logo2.png",
};

export default function AdminSettingsPage() {
  const { theme, setTheme, language, setLanguage } = useSettings();
  const isLight = theme === "light";

  const [config, setConfig] = useState<SystemSettingsConfig>(DEFAULT_CONFIG);

  // Modal Dialog States for Logo Upload
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const [toast, setToast] = useState<{
    message: string | null;
    type: "success" | "error";
  }>({
    message: null,
    type: "success",
  });

  useEffect(() => {
    // 1. Load local config defaults first
    const saved = localStorage.getItem("cinemax-system-config");
    if (saved) {
      try {
        setConfig((prev) => ({ ...prev, ...JSON.parse(saved) }));
      } catch {
        // Fallback silently
      }
    }

    // 2. Fetch live settings from backend database table so it never loses state on refresh
    api
      .get("/settings/public")
      .then((res) => {
        const data = res.data?.body?.data || res.data?.data || res.data;
        if (data?.SITE_LOGO_URL) {
          setConfig((prev) => ({ ...prev, siteLogoUrl: data.SITE_LOGO_URL }));
        }
      })
      .catch(() => {
        // Silent fallback
      });
  }, []);

  const updateConfig = <K extends keyof SystemSettingsConfig>(
    key: K,
    value: SystemSettingsConfig[K],
  ) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
  };

  /* -----------------------------------------------------------
     HANDLE FILE SELECTION & CLOUDINARY UPLOAD DIALOG
  ----------------------------------------------------------- */
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setPreviewImage(URL.createObjectURL(file));
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return;

    try {
      setUploading(true);
      const formData = new FormData();
      formData.append("file", selectedFile);

      // 1. Send to your backend Cloudinary upload endpoint
      const res = await api.post("/cloudinary/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      const uploadedUrl =
        res.data?.body?.data || res.data?.data || res.data?.url || res.data;

      if (uploadedUrl) {
        // 2. Update local state
        setConfig((prev) => ({ ...prev, siteLogoUrl: uploadedUrl }));

        // 🌟 3. Automatically save it to the database table immediately!
        await api.put("/settings/update", {
          SITE_LOGO_URL: uploadedUrl,
        });

        // 4. Broadcast the change across the app instantly
        window.dispatchEvent(
          new CustomEvent(LOGO_UPDATE_EVENT, { detail: uploadedUrl }),
        );

        setToast({
          message: "Logo uploaded and saved successfully!",
          type: "success",
        });
        setIsUploadModalOpen(false);
        setSelectedFile(null);
        setPreviewImage(null);
      } else {
        throw new Error("Upload failed");
      }
    } catch (err) {
      setToast({ message: "Failed to upload logo image.", type: "error" });
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    try {
      localStorage.setItem("cinemax-system-config", JSON.stringify(config));

      // Save logo URL to backend database table
      await api.put("/settings/update", {
        SITE_LOGO_URL: config.siteLogoUrl,
      });

      // Broadcast the logo change event instantly to all components and update cache
      window.dispatchEvent(
        new CustomEvent(LOGO_UPDATE_EVENT, { detail: config.siteLogoUrl }),
      );

      setToast({
        message: "Workspace preferences and brand logo updated successfully.",
        type: "success",
      });
    } catch (err) {
      setToast({
        message: "Failed to deploy configurations to server.",
        type: "error",
      });
    }
  };

  const handleReset = () => {
    setConfig(DEFAULT_CONFIG);
    setTheme("dark");
    setLanguage("en");
    localStorage.removeItem("cinemax-system-config");
    localStorage.removeItem("cinemax-cached-logo");
    setToast({
      message: "Settings restored to system defaults.",
      type: "success",
    });
  };

  const pageClass = isLight
    ? "bg-slate-50 text-slate-900"
    : "bg-slate-950 text-slate-100";

  const cardClass = isLight
    ? "border-slate-300 bg-white shadow-xl shadow-slate-200 ring-1 ring-slate-200"
    : "border-slate-800 bg-slate-900/60 shadow-2xl backdrop-blur-md";

  const subCardClass = isLight
    ? "border-slate-300 bg-slate-100/70 text-slate-800 shadow-sm"
    : "border-slate-800 bg-slate-950/60 text-slate-200";

  const inputClass = isLight
    ? "border-slate-300 bg-white text-slate-900 placeholder-slate-400 focus:border-red-500 shadow-sm font-bold"
    : "border-slate-800 bg-slate-900/90 text-white placeholder-slate-500 focus:border-red-500";

  const textPrimary = isLight
    ? "text-slate-900 font-black"
    : "text-white font-black";
  const textSecondary = isLight
    ? "text-slate-700 font-bold"
    : "text-slate-400 font-medium";
  const borderCol = isLight ? "border-slate-300" : "border-slate-800";

  return (
    <div
      className={`min-h-screen py-6 px-4 sm:px-8 lg:px-10 w-full space-y-8 transition-colors duration-300 pb-28 ${pageClass}`}
    >
      <style jsx global>{`
        ::-webkit-scrollbar {
          display: none;
        }
        * {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>

      <Toast
        message={toast.message}
        type={toast.type}
        onClose={() => setToast({ message: null, type: "success" })}
      />

      {/* Header Toolbar */}
      <div
        className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b ${borderCol} pb-6`}
      >
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-red-600 to-rose-500 text-white shadow-lg shadow-red-600/30 shrink-0">
            <Settings2 className="h-6 w-6" />
          </div>
          <div>
            <h1 className={`text-2xl font-black tracking-tight ${textPrimary}`}>
              System Configuration
            </h1>
            <p className={`text-xs ${textSecondary} mt-0.5`}>
              Manage global platform rules, gateways, branding logo, and UI
              preferences.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleReset}
            className={`flex items-center gap-1.5 rounded-xl border px-4 py-2.5 text-xs font-bold transition cursor-pointer shadow-sm ${
              isLight
                ? "border-slate-300 bg-white text-slate-800 hover:bg-slate-100 font-bold"
                : "border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800"
            }`}
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Reset Defaults</span>
          </button>

          <button
            type="button"
            onClick={handleSave}
            className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-red-600/25 hover:from-red-500 hover:to-rose-500 transition cursor-pointer"
          >
            <Save className="h-3.5 w-3.5" />
            <span>Save Configuration</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {/* Brand & Logo Customization Section */}
        <section
          className={`rounded-3xl border ${cardClass} p-6 sm:p-7 space-y-5`}
        >
          <div className={`flex items-center gap-3 border-b ${borderCol} pb-4`}>
            <div className="p-2 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-600 dark:text-amber-400">
              <ImageIcon className="h-5 w-5" />
            </div>
            <div>
              <h2
                className={`text-sm font-black uppercase tracking-wider ${textPrimary}`}
              >
                Brand Identity & Logo
              </h2>
              <p className={`text-xs ${textSecondary}`}>
                Update the platform brand logo URL displayed across Admin and
                Customer navbars.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-6 items-center">
            <div className="space-y-3">
              <label
                className={`block text-xs font-black uppercase tracking-wider ${textSecondary}`}
              >
                Logo Image URL or File Upload
              </label>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={config.siteLogoUrl}
                  onChange={(e) => updateConfig("siteLogoUrl", e.target.value)}
                  placeholder="/logo2.png or Cloudinary URL"
                  className={`w-full rounded-2xl border px-4 py-3 text-xs font-bold outline-none ${inputClass}`}
                />

                {/* Button to Open Upload Dialog Modal */}
                <button
                  type="button"
                  onClick={() => setIsUploadModalOpen(true)}
                  className="flex items-center gap-2 rounded-2xl bg-amber-500 px-4 py-3 text-xs font-black text-slate-950 shadow-md hover:bg-amber-400 transition cursor-pointer shrink-0"
                >
                  <Upload className="h-4 w-4" />
                  <span>Upload Logo</span>
                </button>
              </div>

              <p className="text-[11px] text-slate-400">
                You can type a direct path/URL or click Upload Logo to choose
                from your device.
              </p>
            </div>

            {/* Live Logo Preview Box */}
            <div className="flex flex-col items-center justify-center p-4 rounded-2xl border border-slate-700/50 bg-slate-950/40 w-36 h-28 shrink-auto mx-auto">
              <span className="text-[9px] font-bold uppercase tracking-widest text-slate-500 mb-2">
                Live Preview
              </span>
              <div className="relative h-12 w-24 flex items-center justify-center">
                <img
                  src={config.siteLogoUrl || "/logo2.png"}
                  alt="Logo Preview"
                  className="max-h-full max-w-full object-contain"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = "/logo2.png";
                  }}
                />
              </div>
            </div>
          </div>
        </section>

        {/* Appearance Section */}
        <section
          className={`rounded-3xl border ${cardClass} p-6 sm:p-7 space-y-5`}
        >
          <div className={`flex items-center gap-3 border-b ${borderCol} pb-4`}>
            <div className="p-2 rounded-xl bg-purple-500/15 border border-purple-500/30 text-purple-600 dark:text-purple-400">
              <Palette className="h-5 w-5" />
            </div>
            <div>
              <h2
                className={`text-sm font-black uppercase tracking-wider ${textPrimary}`}
              >
                Visual Appearance
              </h2>
              <p className={`text-xs ${textSecondary}`}>
                Select workspace theme preference.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {[
              { value: "dark" as Theme, label: "Dark Workspace", icon: Moon },
              { value: "light" as Theme, label: "Light Workspace", icon: Sun },
              { value: "system" as Theme, label: "System Sync", icon: Monitor },
            ].map((item) => {
              const Icon = item.icon;
              const active = theme === item.value;
              return (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => setTheme(item.value)}
                  className={`flex items-center gap-3 rounded-2xl border p-4 text-left transition cursor-pointer ${
                    active
                      ? "border-red-600 bg-red-600/15 text-red-600 dark:text-red-400 shadow-md shadow-red-600/20 font-black"
                      : `${subCardClass} ${textSecondary} font-bold`
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="text-xs">{item.label}</span>
                </button>
              );
            })}
          </div>
        </section>

        {/* Language Section */}
        <section
          className={`rounded-3xl border ${cardClass} p-6 sm:p-7 space-y-5`}
        >
          <div className={`flex items-center gap-3 border-b ${borderCol} pb-4`}>
            <div className="p-2 rounded-xl bg-blue-500/15 border border-blue-500/30 text-blue-600 dark:text-blue-400">
              <Globe2 className="h-5 w-5" />
            </div>
            <div>
              <h2
                className={`text-sm font-black uppercase tracking-wider ${textPrimary}`}
              >
                Language & Localization
              </h2>
              <p className={`text-xs ${textSecondary}`}>
                Choose administrative interface language.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {[
              ["en", "🇬🇧", "English"],
              ["km", "🇰🇭", "ខ្មែរ (Khmer)"],
              ["zh", "🇨🇳", "中文 (Chinese)"],
            ].map(([val, flag, label]) => {
              const active = language === val;
              return (
                <button
                  key={val}
                  type="button"
                  onClick={() => setLanguage(val as Language)}
                  className={`flex items-center gap-3 rounded-2xl border p-4 transition cursor-pointer ${
                    active
                      ? "border-red-600 bg-red-600/15 text-red-600 dark:text-red-400 shadow-md shadow-red-600/20"
                      : `${subCardClass} ${textSecondary}`
                  }`}
                >
                  <span className="text-xl">{flag}</span>
                  <span
                    className={`text-xs font-black ${active ? textPrimary : textSecondary}`}
                  >
                    {label}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {/* Booking Rules Section */}
        <section
          className={`rounded-3xl border ${cardClass} p-6 sm:p-7 space-y-5`}
        >
          <div className={`flex items-center gap-3 border-b ${borderCol} pb-4`}>
            <div className="p-2 rounded-xl bg-red-500/15 border border-red-500/30 text-red-600">
              <Ticket className="h-5 w-5" />
            </div>
            <div>
              <h2
                className={`text-sm font-black uppercase tracking-wider ${textPrimary}`}
              >
                Booking Parameters
              </h2>
              <p className={`text-xs ${textSecondary}`}>
                Manage ticket limits, hold timers, and cancellation policies.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <SettingToggle
              title="Online Booking Engine"
              description="Allow external customers to reserve seats online."
              checked={config.onlineBooking}
              onChange={(v) => updateConfig("onlineBooking", v)}
              subCardClass={subCardClass}
              textPrimary={textPrimary}
              textSecondary={textSecondary}
            />
            <SettingToggle
              title="Allow Customer Cancellations"
              description="Enable self-service booking cancellations."
              checked={config.allowCancellation}
              onChange={(v) => updateConfig("allowCancellation", v)}
              subCardClass={subCardClass}
              textPrimary={textPrimary}
              textSecondary={textSecondary}
            />
            <SettingNumber
              label="Temporary Seat Hold Timer"
              value={config.seatHoldMinutes}
              suffix="minutes"
              onChange={(v) => updateConfig("seatHoldMinutes", v)}
              subCardClass={subCardClass}
              textPrimary={textPrimary}
              textSecondary={textSecondary}
              inputClass={inputClass}
            />
            <SettingNumber
              label="Max Tickets Per Single Checkout"
              value={config.maxTicketsPerBooking}
              suffix="tickets"
              onChange={(v) => updateConfig("maxTicketsPerBooking", v)}
              subCardClass={subCardClass}
              textPrimary={textPrimary}
              textSecondary={textSecondary}
              inputClass={inputClass}
            />
          </div>
        </section>
      </div>

      {/* =======================================================
         UPLOAD LOGO MODAL DIALOG POPUP
      ======================================================== */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div
            className={`w-full max-w-md rounded-3xl border p-6 shadow-2xl space-y-6 ${
              isLight
                ? "bg-white border-slate-300 text-slate-900 shadow-2xl ring-1 ring-slate-200"
                : "bg-slate-900 border-slate-800 text-slate-100 shadow-2xl"
            }`}
          >
            <div className="flex items-center justify-between border-b border-slate-700/40 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-500/15 text-amber-500">
                  <Upload className="h-5 w-5" />
                </div>
                <h3
                  className={`text-base font-black tracking-tight ${textPrimary}`}
                >
                  Upload Brand Logo
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsUploadModalOpen(false);
                  setSelectedFile(null);
                  setPreviewImage(null);
                }}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleUploadSubmit} className="space-y-5">
              <div className="flex flex-col items-center justify-center border-2 border-dashed border-slate-700/60 rounded-2xl p-6 text-center bg-slate-950/30 hover:border-amber-500/50 transition">
                {previewImage ? (
                  <div className="relative h-24 w-48 flex items-center justify-center mb-3">
                    <img
                      src={previewImage}
                      alt="Logo Preview"
                      className="max-h-full max-w-full object-contain rounded-xl border border-white/10 shadow-md"
                    />
                  </div>
                ) : (
                  <ImageIcon className="h-12 w-12 text-slate-500 mb-2" />
                )}

                <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-xs font-black text-slate-950 shadow-md hover:bg-amber-400 transition">
                  <Upload className="h-4 w-4" />
                  <span>Choose Image File</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>
                <p className="mt-2 text-[11px] text-slate-400">
                  PNG, JPG, SVG or WEBP (Max 5MB)
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsUploadModalOpen(false);
                    setSelectedFile(null);
                    setPreviewImage(null);
                  }}
                  className={`w-1/2 rounded-xl border py-3 text-xs font-bold transition cursor-pointer ${
                    isLight
                      ? "border-slate-300 bg-white text-slate-800 hover:bg-slate-100"
                      : "border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700"
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!selectedFile || uploading}
                  className="w-1/2 flex items-center justify-center gap-2 rounded-xl bg-amber-500 py-3 text-xs font-black text-slate-950 shadow-lg shadow-amber-500/20 hover:bg-amber-400 transition cursor-pointer disabled:opacity-50"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Uploading...</span>
                    </>
                  ) : (
                    <span>Confirm & Upload</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function SettingToggle({
  title,
  description,
  checked,
  onChange,
  subCardClass,
  textPrimary,
  textSecondary,
}: {
  title: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  subCardClass: string;
  textPrimary: string;
  textSecondary: string;
}) {
  return (
    <div
      className={`flex items-center justify-between gap-4 rounded-2xl border p-4 transition shadow-sm ${subCardClass}`}
    >
      <div>
        <p className={`text-xs font-black ${textPrimary}`}>{title}</p>
        <p className={`mt-0.5 text-[11px] ${textSecondary} font-semibold`}>
          {description}
        </p>
      </div>

      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 rounded-full transition cursor-pointer shrink-0 ${
          checked ? "bg-red-600 shadow-md shadow-red-600/30" : "bg-slate-700"
        }`}
      >
        <span
          className={`absolute top-1 h-4 w-4 rounded-full bg-white transition ${
            checked ? "left-6" : "left-1"
          }`}
        />
      </button>
    </div>
  );
}

function SettingNumber({
  label,
  value,
  suffix,
  onChange,
  subCardClass,
  textPrimary,
  textSecondary,
  inputClass,
}: {
  label: string;
  value: number;
  suffix: string;
  onChange: (value: number) => void;
  subCardClass: string;
  textPrimary: string;
  textSecondary: string;
  inputClass: string;
}) {
  return (
    <div
      className={`flex flex-col gap-3 rounded-2xl border p-4 sm:flex-row sm:items-center sm:justify-between transition shadow-sm ${subCardClass}`}
    >
      <div>
        <p className={`text-xs font-black ${textPrimary}`}>{label}</p>
      </div>

      <div className="flex items-center gap-2">
        <input
          type="number"
          min={0}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className={`w-24 rounded-xl border px-3 py-2 text-right text-xs font-bold outline-none ${inputClass}`}
        />
        <span className={`text-[11px] ${textSecondary} min-w-[70px] font-bold`}>
          {suffix}
        </span>
      </div>
    </div>
  );
}
