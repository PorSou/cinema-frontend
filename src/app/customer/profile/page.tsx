"use client";

import { ChangeEvent, useEffect, useState } from "react";
import {
  User,
  Camera,
  Mail,
  Phone,
  Lock,
  Globe2,
  Save,
  ShieldCheck,
} from "lucide-react";

type Language = "en" | "km" | "zh";

interface CustomerProfile {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  language: Language;
  avatar: string;
}

const DEFAULT_PROFILE: CustomerProfile = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  language: "en",
  avatar: "",
};

export default function CustomerProfilePage() {
  const [profile, setProfile] =
    useState<CustomerProfile>(DEFAULT_PROFILE);

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem("cinemax-customer-profile");

    if (saved) {
      try {
        setProfile({
          ...DEFAULT_PROFILE,
          ...JSON.parse(saved),
        });
      } catch {
        setProfile(DEFAULT_PROFILE);
      }
    }
  }, []);

  const updateProfile = <K extends keyof CustomerProfile>(
    key: K,
    value: CustomerProfile[K]
  ) => {
    setProfile((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleAvatarChange = (
    event: ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setMessage("Please select an image file.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setMessage("Avatar must be smaller than 5MB.");
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      updateProfile("avatar", reader.result as string);
    };

    reader.readAsDataURL(file);
  };

  const saveProfile = async () => {
    setSaving(true);
    setMessage("");

    try {
      localStorage.setItem(
        "cinemax-customer-profile",
        JSON.stringify(profile)
      );

      localStorage.setItem(
        "cinemax-language",
        profile.language
      );

      setMessage("Profile updated successfully.");
    } catch {
      setMessage("Failed to save profile.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-8 text-slate-100">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-white">
          My Profile
        </h1>

        <p className="mt-1 text-sm text-slate-400">
          Manage your CINEMAX account and personal information.
        </p>
      </div>

      {/* Profile Header */}
      <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-xl">
        <div className="flex flex-col items-center gap-5 sm:flex-row">
          <div className="relative">
            <div className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-full border-4 border-slate-800 bg-slate-950">
              {profile.avatar ? (
                <img
                  src={profile.avatar}
                  alt="Profile avatar"
                  className="h-full w-full object-cover"
                />
              ) : (
                <User className="h-12 w-12 text-slate-600" />
              )}
            </div>

            <label
              htmlFor="avatar-upload"
              className="absolute bottom-0 right-0 flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-red-600 text-white shadow-lg hover:bg-red-500"
            >
              <Camera className="h-4 w-4" />

              <input
                id="avatar-upload"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarChange}
              />
            </label>
          </div>

          <div>
            <h2 className="text-xl font-black text-white">
              {profile.firstName || profile.lastName
                ? `${profile.firstName} ${profile.lastName}`
                : "Cinema Customer"}
            </h2>

            <p className="mt-1 text-sm text-slate-400">
              Update your profile picture and personal information.
            </p>

            <p className="mt-2 text-xs text-slate-500">
              JPG, PNG or WEBP. Maximum 5MB.
            </p>
          </div>
        </div>
      </div>

      {/* Personal Information */}
      <section className="rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-xl">
        <div className="mb-6 flex items-center gap-3 border-b border-slate-800 pb-4">
          <User className="h-5 w-5 text-red-400" />

          <div>
            <h2 className="font-black text-white">
              Personal Information
            </h2>

            <p className="text-xs text-slate-400">
              Keep your account information up to date.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <InputField
            label="First Name"
            value={profile.firstName}
            onChange={(value) =>
              updateProfile("firstName", value)
            }
          />

          <InputField
            label="Last Name"
            value={profile.lastName}
            onChange={(value) =>
              updateProfile("lastName", value)
            }
          />

          <InputField
            label="Email"
            type="email"
            icon={<Mail className="h-4 w-4" />}
            value={profile.email}
            onChange={(value) =>
              updateProfile("email", value)
            }
          />

          <InputField
            label="Phone Number"
            type="tel"
            icon={<Phone className="h-4 w-4" />}
            value={profile.phone}
            onChange={(value) =>
              updateProfile("phone", value)
            }
          />
        </div>
      </section>

      {/* Language */}
      <section className="rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-xl">
        <div className="mb-6 flex items-center gap-3 border-b border-slate-800 pb-4">
          <Globe2 className="h-5 w-5 text-blue-400" />

          <div>
            <h2 className="font-black text-white">
              Language
            </h2>

            <p className="text-xs text-slate-400">
              Choose your preferred language.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {[
            {
              value: "en" as Language,
              flag: "🇬🇧",
              title: "English",
              subtitle: "English",
            },
            {
              value: "km" as Language,
              flag: "🇰🇭",
              title: "ខ្មែរ",
              subtitle: "Khmer",
            },
            {
              value: "zh" as Language,
              flag: "🇨🇳",
              title: "中文",
              subtitle: "Chinese",
            },
          ].map((language) => (
            <button
              key={language.value}
              type="button"
              onClick={() =>
                updateProfile(
                  "language",
                  language.value
                )
              }
              className={`rounded-2xl border p-5 text-left transition ${
                profile.language === language.value
                  ? "border-red-500 bg-red-600/10"
                  : "border-slate-800 bg-slate-950/50 hover:border-slate-700"
              }`}
            >
              <div className="text-3xl">
                {language.flag}
              </div>

              <p className="mt-3 font-black text-white">
                {language.title}
              </p>

              <p className="mt-1 text-xs text-slate-500">
                {language.subtitle}
              </p>
            </button>
          ))}
        </div>
      </section>

      {/* Password */}
      <section className="rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-xl">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Lock className="h-5 w-5 text-amber-400" />

            <div>
              <h2 className="font-black text-white">
                Password
              </h2>

              <p className="text-xs text-slate-400">
                Keep your account secure.
              </p>
            </div>
          </div>

          <button
            type="button"
            className="rounded-xl border border-slate-700 px-4 py-2 text-xs font-bold text-white transition hover:bg-slate-800"
          >
            Change Password
          </button>
        </div>
      </section>

      {/* Security */}
      <section className="rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-xl">
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-0.5 h-5 w-5 text-emerald-400" />

          <div>
            <h2 className="font-black text-white">
              Account Security
            </h2>

            <p className="mt-1 text-xs leading-5 text-slate-400">
              Never share your password or account credentials
              with another person.
            </p>
          </div>
        </div>
      </section>

      {/* Message */}
      {message && (
        <div
          className={`rounded-xl border px-4 py-3 text-sm font-semibold ${
            message.includes("success")
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
              : "border-red-500/30 bg-red-500/10 text-red-400"
          }`}
        >
          {message}
        </div>
      )}

      {/* Save */}
      <div className="flex justify-end">
        <button
          type="button"
          disabled={saving}
          onClick={saveProfile}
          className="flex items-center gap-2 rounded-xl bg-red-600 px-6 py-3 text-sm font-black text-white shadow-lg shadow-red-600/20 transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Save className="h-4 w-4" />

          {saving ? "Saving..." : "Save Profile"}
        </button>
      </div>
    </div>
  );
}

function InputField({
  label,
  value,
  onChange,
  type = "text",
  icon,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  icon?: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-400">
        {label}
      </label>

      <div className="relative">
        {icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
            {icon}
          </div>
        )}

        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`w-full rounded-xl border border-slate-700 bg-slate-950 py-3 text-sm font-semibold text-white outline-none transition focus:border-red-500 ${
            icon ? "pl-10 pr-4" : "px-4"
          }`}
          placeholder={`Enter ${label.toLowerCase()}`}
        />
      </div>
    </div>
  );
}