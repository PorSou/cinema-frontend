"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import AOS from "aos"; // 🌟 Import AOS
import {
  User,
  Ticket,
  Heart,
  Award,
  Loader2,
  Save,
  ArrowRight,
  ShieldCheck,
  Camera,
  Film,
  Trash2,
  Building,
  Tv,
  Clock,
} from "lucide-react";
import { AuthService } from "@/app/service/auth.service";
import BookingService from "@/app/service/booking.service";
import Toast from "@/app/components/Toast";
import { useSettings } from "@/app/context/SettingsContext";
import api from "@/app/lib/api";

/* ============================================================
   SHARED HELPERS
============================================================ */

const extractArray = <T,>(res: any): T[] => {
  if (Array.isArray(res)) return res;
  if (Array.isArray(res?.content)) return res.content;
  if (Array.isArray(res?.data)) return res.data;
  if (Array.isArray(res?.body?.data)) return res.body.data;
  if (Array.isArray(res?.data?.content)) return res.data.content;
  return [];
};

const STATUS_BADGES: Record<string, { label: string; color: string }> = {
  CONFIRMED: {
    label: "Confirmed",
    color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
  },
  CHECKED_IN: {
    label: "Checked In",
    color: "bg-blue-500/10 text-blue-400 border-blue-500/30",
  },
  PENDING: {
    label: "Pending Payment",
    color: "bg-amber-500/10 text-amber-400 border-amber-500/30",
  },
  CANCELLED: {
    label: "Cancelled",
    color: "bg-rose-500/10 text-rose-400 border-rose-500/30",
  },
};

const formatDateTime = (dateString?: string) => {
  if (!dateString) return "N/A";
  try {
    const cleaned = dateString.replace("T", " ");
    const [datePart, timePart] = cleaned.split(" ");
    if (!timePart) return cleaned;
    const [hourStr, minuteStr] = timePart.split(":");
    let hour = parseInt(hourStr, 10);
    const ampm = hour >= 12 ? "PM" : "AM";
    hour = hour % 12;
    hour = hour ? hour : 12;
    return `${datePart} • ${hour}:${minuteStr} ${ampm}`;
  } catch {
    return dateString;
  }
};

const API_ORIGIN = (
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api/v1"
).replace(/\/api\/v1\/?$/, "");

const resolveAvatarUrl = (path?: string | null) => {
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;
  return `${API_ORIGIN}/${path.replace(/^\/+/, "")}`;
};

const getPosterUrl = (posterUrl?: string) => {
  if (!posterUrl) return null;
  if (posterUrl.startsWith("http")) return posterUrl;
  const cleanPath = posterUrl.startsWith("/")
    ? posterUrl.substring(1)
    : posterUrl;
  if (cleanPath.startsWith("uploads/")) return `${API_ORIGIN}/${cleanPath}`;
  return `${API_ORIGIN}/uploads/${cleanPath}`;
};

type TabId = "profile" | "bookings" | "watchlist" | "membership";

export default function CustomerProfilePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { theme } = useSettings();
  const isDark = theme === "dark";

  const initialTab = (searchParams?.get("tab") as TabId) || "profile";

  const [activeTab, setActiveTab] = useState<TabId>(initialTab);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // User profile states
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const [loyaltyPoints, setLoyaltyPoints] = useState(120);
  const [membershipTier, setMembershipTier] = useState("SILVER");

  // Bookings & Watchlist states
  const [bookings, setBookings] = useState<any[]>([]);
  const [watchlist, setWatchlist] = useState<any[]>([]);
  const [bookingsLoading, setBookingsLoading] = useState(false);
  const [watchlistLoading, setWatchlistLoading] = useState(false);

  const [toast, setToast] = useState<{
    message: string | null;
    type: "success" | "error" | "info";
  }>({
    message: null,
    type: "success",
  });

  const showToast = (
    message: string,
    type: "success" | "error" | "info" = "success",
  ) => {
    setToast({ message, type });
  };

  // Refresh AOS on tab changes or data loading
  useEffect(() => {
    const timer = setTimeout(() => {
      AOS.refresh();
    }, 100);
    return () => clearTimeout(timer);
  }, [activeTab, loading, bookingsLoading, watchlistLoading]);

  const fetchBookings = async () => {
    setBookingsLoading(true);
    try {
      const res = await BookingService.getMyBookings(0, 20);
      setBookings(extractArray<any>(res));
    } catch {
      showToast("Failed to load your ticket reservations.", "error");
      setBookings([]);
    } finally {
      setBookingsLoading(false);
    }
  };

  const fetchWatchlist = async () => {
    setWatchlistLoading(true);
    try {
      const res = await api.get("/favorites?page=0&size=20");
      const rawObj = res.data?.body?.data || res.data?.data || res.data;
      setWatchlist(extractArray<any>(rawObj));
    } catch {
      showToast("Failed to load your watchlist.", "error");
      setWatchlist([]);
    } finally {
      setWatchlistLoading(false);
    }
  };

  const handleRemoveFavorite = async (movieId: number) => {
    try {
      await api.post(`/favorites/toggle/${movieId}`);
      showToast("Movie removed from watchlist.", "success");
      fetchWatchlist();
    } catch {
      showToast("Failed to update watchlist.", "error");
    }
  };

  useEffect(() => {
    const token = AuthService.getAccessToken();
    if (!token) {
      showToast("Please sign in to view your profile.", "info");
      router.push("/login?redirect=/customer/profile");
      return;
    }

    async function loadUserData() {
      try {
        setLoading(true);
        const userRes = await api.get("/users/me").catch(() => null);

        const userData =
          userRes?.data?.body?.data || userRes?.data?.data || userRes?.data;

        if (userData) {
          setFullName(userData.fullName || userData.name || "");
          setEmail(userData.email || "");
          setPhone(userData.phone || "");
          if (userData.avatarUrl) setAvatarUrl(userData.avatarUrl);
          setLoyaltyPoints(userData.loyaltyPoints || 120);
          setMembershipTier(userData.membershipTier || "SILVER");
        } else {
          const localUser = AuthService.getCurrentUser();
          if (localUser) {
            setFullName(localUser.fullName || "");
            setEmail(localUser.email || "");
            if (localUser.avatarUrl) setAvatarUrl(localUser.avatarUrl);
          }
        }

        fetchBookings();
        fetchWatchlist();
      } catch (err) {
        console.error("Failed to load profile data:", err);
        showToast("Failed to load profile details.", "error");
      } finally {
        setLoading(false);
      }
    }

    loadUserData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setPreviewImage(URL.createObjectURL(file));
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const formData = new FormData();
      formData.append("fullName", fullName);
      if (phone) formData.append("phone", phone);
      if (selectedFile) {
        formData.append("avatar", selectedFile);
      }

      const res = await api.put("/users/me/profile", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      const updatedUser = res.data?.body?.data || res.data?.data || res.data;
      if (updatedUser) {
        if (updatedUser.avatarUrl) setAvatarUrl(updatedUser.avatarUrl);

        const existingUser = AuthService.getCurrentUser();
        if (existingUser) {
          const merged = { ...existingUser, ...updatedUser };
          AuthService.updateCurrentUser(merged);
        }
      }

      showToast("Profile updated successfully!", "success");
    } catch (err: any) {
      try {
        const resFallback = await api.put("/users/me", { fullName, phone });
        const updatedUser =
          resFallback.data?.body?.data ||
          resFallback.data?.data ||
          resFallback.data;
        if (updatedUser) {
          const existingUser = AuthService.getCurrentUser();
          if (existingUser) {
            const merged = { ...existingUser, ...updatedUser };
            AuthService.updateCurrentUser(merged);
          }
        }
        showToast("Profile updated successfully!", "success");
      } catch (innerErr: any) {
        showToast(
          innerErr?.response?.data?.message ||
            err?.response?.data?.message ||
            "Failed to update profile.",
          "error",
        );
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div
        className={`flex min-h-screen items-center justify-center ${
          isDark ? "bg-[#0A0C14]" : "bg-slate-50"
        }`}
      >
        <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
      </div>
    );
  }

  return (
    <div
      className={`min-h-[calc(100vh-4rem)] w-full pb-24 pt-8 transition-colors duration-300 ${
        isDark ? "bg-[#0A0C14] text-slate-100" : "bg-slate-50 text-slate-900"
      }`}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <Toast
          message={toast.message}
          type={toast.type}
          duration={3500}
          onClose={() => setToast((prev) => ({ ...prev, message: null }))}
        />

        {/* ======================================================
            HEADER BANNER
        ====================================================== */}

        <div
          data-aos="fade-up"
          data-aos-duration="800"
          className={`relative mb-8 overflow-hidden rounded-3xl border p-6 shadow-2xl sm:p-8 ${
            isDark
              ? "border-white/10 bg-gradient-to-r from-slate-900 via-[#15161a] to-slate-900"
              : "border-slate-200 bg-white"
          }`}
        >
          <div className="pointer-events-none absolute -right-10 -top-10 h-48 w-48 rounded-full bg-amber-500/10 blur-3xl" />

          <div className="relative z-10 flex flex-col items-center gap-6 sm:flex-row">
            <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl border-2 border-amber-500/40 bg-amber-500/20 shadow-lg">
              <div className="flex h-full w-full items-center justify-center text-2xl font-black text-amber-400">
                {previewImage ? (
                  <img
                    src={previewImage}
                    alt="Avatar Preview"
                    className="h-full w-full object-cover"
                  />
                ) : avatarUrl ? (
                  <img
                    src={resolveAvatarUrl(avatarUrl)!}
                    alt="Avatar"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  fullName?.substring(0, 2).toUpperCase() || "CX"
                )}
              </div>
            </div>

            <div className="space-y-1 text-center sm:text-left">
              <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                <h1 className="text-xl font-black sm:text-2xl">
                  {fullName || "CinemaX Member"}
                </h1>
                <span className="rounded-full border border-amber-500/40 bg-amber-500/20 px-2.5 py-0.5 text-[10px] font-black tracking-wider text-amber-400">
                  {membershipTier} MEMBER
                </span>
              </div>
              <p className="text-xs text-slate-400">{email}</p>
              <div className="flex items-center justify-center gap-4 pt-2 text-xs font-bold text-amber-500 sm:justify-start">
                <span className="flex items-center gap-1">
                  <Award className="h-4 w-4" /> {loyaltyPoints} Loyalty Points
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ======================================================
            TABS
        ====================================================== */}

        <div
          data-aos="fade-up"
          data-aos-delay="100"
          className="mb-6 flex items-center gap-2 overflow-x-auto pb-4 scrollbar-none"
        >
          {[
            { id: "profile" as const, label: "Account Details", icon: User },
            {
              id: "bookings" as const,
              label: `My Bookings${bookings.length ? ` (${bookings.length})` : ""}`,
              icon: Ticket,
            },
            {
              id: "watchlist" as const,
              label: `Watchlist${watchlist.length ? ` (${watchlist.length})` : ""}`,
              icon: Heart,
            },
            {
              id: "membership" as const,
              label: "Membership & Rewards",
              icon: Award,
            },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex shrink-0 cursor-pointer items-center gap-2 rounded-2xl border px-5 py-3 text-xs font-black transition ${
                  isActive
                    ? "border-amber-500 bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20"
                    : isDark
                      ? "border-white/10 bg-white/[0.03] text-slate-400 hover:bg-white/[0.06] hover:text-white"
                      : "border-slate-200 bg-white text-slate-600 shadow-sm hover:text-slate-900"
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* ======================================================
            TAB 1: ACCOUNT DETAILS
        ====================================================== */}

        {activeTab === "profile" && (
          <div
            data-aos="fade-up"
            data-aos-delay="150"
            className={`max-w-2xl rounded-3xl border p-6 shadow-xl sm:p-8 ${
              isDark
                ? "border-white/10 bg-slate-900/60"
                : "border-slate-200 bg-white"
            }`}
          >
            <h2 className="mb-6 text-sm font-black uppercase tracking-wider text-amber-500">
              Edit Personal Information
            </h2>
            <form onSubmit={handleUpdateProfile} className="space-y-6">
              <div className="flex flex-col items-center gap-6 sm:flex-row">
                <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl border-2 border-amber-500/40 bg-slate-800 shadow-lg">
                  <div className="flex h-full w-full items-center justify-center">
                    {previewImage ? (
                      <img
                        src={previewImage}
                        alt="Preview"
                        className="h-full w-full object-cover"
                      />
                    ) : avatarUrl ? (
                      <img
                        src={resolveAvatarUrl(avatarUrl)!}
                        alt="Avatar"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="text-xl font-black text-amber-400">
                        {fullName?.substring(0, 2).toUpperCase() || "CX"}
                      </span>
                    )}
                  </div>
                </div>

                <div className="text-center sm:text-left">
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-xs font-black text-slate-950 shadow-md transition hover:bg-amber-400">
                    <Camera className="h-4 w-4" />
                    <span>Upload Profile Picture</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </label>
                  <p className="mt-1.5 text-[11px] text-slate-400">
                    Choose an image file from your device.
                  </p>
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-bold text-slate-400">
                  Full Name
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className={`w-full rounded-2xl border px-4 py-3 text-xs font-bold outline-none focus:border-amber-500 ${
                    isDark
                      ? "border-white/10 bg-slate-950 text-white"
                      : "border-slate-200 bg-slate-50 text-slate-900"
                  }`}
                  required
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-bold text-slate-400">
                  Email Address (Read-only)
                </label>
                <input
                  type="email"
                  value={email}
                  disabled
                  className={`w-full cursor-not-allowed rounded-2xl border px-4 py-3 text-xs font-bold opacity-60 ${
                    isDark
                      ? "border-white/10 bg-slate-950 text-slate-400"
                      : "border-slate-200 bg-slate-100 text-slate-500"
                  }`}
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-bold text-slate-400">
                  Phone Number
                </label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+855 12 345 678"
                  className={`w-full rounded-2xl border px-4 py-3 text-xs font-bold outline-none focus:border-amber-500 ${
                    isDark
                      ? "border-white/10 bg-slate-950 text-white"
                      : "border-slate-200 bg-slate-50 text-slate-900"
                  }`}
                />
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex cursor-pointer items-center gap-2 rounded-2xl bg-amber-500 px-6 py-3 text-xs font-black text-slate-950 shadow-lg shadow-amber-500/20 transition hover:bg-amber-400 disabled:opacity-50"
                >
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ======================================================
            TAB 2: MY BOOKINGS
        ====================================================== */}

        {activeTab === "bookings" && (
          <div data-aos="fade-up" data-aos-delay="150" className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-sm font-black uppercase tracking-wider text-amber-500">
                Past & Active Bookings ({bookings.length})
              </h2>
              <Link
                href="/customer/tickets"
                className="hidden items-center gap-1.5 text-xs font-bold text-amber-500 hover:underline sm:flex"
              >
                Open full ticket view <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            {bookingsLoading ? (
              <div className="flex min-h-[30vh] items-center justify-center">
                <Loader2 className="h-7 w-7 animate-spin text-amber-500" />
              </div>
            ) : bookings.length > 0 ? (
              <div className="space-y-4">
                {bookings.map((booking: any, index: number) => {
                  const statusStyle =
                    STATUS_BADGES[booking.status] || STATUS_BADGES.PENDING;
                  const poster = getPosterUrl(booking.moviePosterUrl);

                  return (
                    <div
                      key={booking.id}
                      data-aos="fade-up"
                      data-aos-delay={(index % 4) * 80}
                      className={`flex flex-col gap-5 rounded-3xl border p-5 shadow-sm transition hover:shadow-lg sm:flex-row sm:items-center sm:justify-between ${
                        isDark
                          ? "border-white/10 bg-slate-900/40"
                          : "border-slate-200 bg-white"
                      }`}
                    >
                      <div className="flex min-w-0 items-start gap-4">
                        <div
                          className={`relative flex h-24 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border sm:h-28 sm:w-20 ${
                            isDark
                              ? "border-white/10 bg-slate-950"
                              : "border-slate-200 bg-slate-100"
                          }`}
                        >
                          {poster ? (
                            <img
                              src={poster}
                              alt={booking.movieTitle}
                              className="absolute inset-0 h-full w-full object-cover"
                            />
                          ) : (
                            <Film className="h-6 w-6 text-slate-500" />
                          )}
                        </div>

                        <div className="min-w-0 space-y-1.5">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-mono text-xs font-black text-amber-400">
                              Ref: {booking.bookingNumber || booking.id}
                            </span>
                            <span
                              className={`rounded-md border px-2 py-0.5 text-[10px] font-black ${statusStyle.color}`}
                            >
                              {statusStyle.label}
                            </span>
                          </div>

                          <h3 className="truncate text-sm font-bold">
                            {booking.movieTitle || "CinemaX Screening"}
                          </h3>

                          <p className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                            <span className="flex items-center gap-1">
                              <Building className="h-3.5 w-3.5 text-amber-500" />
                              {booking.cinemaName || "CineMax"}
                            </span>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <Tv className="h-3.5 w-3.5 text-amber-400" />
                              {booking.hallName || "Standard Hall"}
                            </span>
                          </p>

                          <p className="flex items-center gap-1.5 font-mono text-xs font-bold text-amber-400">
                            <Clock className="h-3.5 w-3.5" />
                            {formatDateTime(booking.startTime)}
                          </p>
                        </div>
                      </div>

                      <Link
                        href={`/customer/tickets/${
                          booking.bookingNumber || booking.id
                        }`}
                        className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2.5 text-xs font-bold text-amber-400 transition hover:bg-amber-500 hover:text-slate-950"
                      >
                        <span>View Pass</span>
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div
                className={`rounded-3xl border p-12 text-center text-xs ${
                  isDark
                    ? "border-white/10 bg-white/[0.02] text-slate-400"
                    : "border-slate-200 bg-white text-slate-500"
                }`}
              >
                <Ticket className="mx-auto mb-3 h-10 w-10 text-slate-500" />
                <p className="font-bold">No ticket history found.</p>
                <Link
                  href="/"
                  className="mt-4 inline-block rounded-xl bg-amber-500 px-5 py-2.5 text-xs font-black text-slate-950 transition hover:bg-amber-400"
                >
                  Browse Movies
                </Link>
              </div>
            )}
          </div>
        )}

        {/* ======================================================
            TAB 3: WATCHLIST
        ====================================================== */}

        {activeTab === "watchlist" && (
          <div data-aos="fade-up" data-aos-delay="150" className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-sm font-black uppercase tracking-wider text-amber-500">
                Your Watchlist ({watchlist.length})
              </h2>
              <Link
                href="/customer/watchlist"
                className="hidden items-center gap-1.5 text-xs font-bold text-amber-500 hover:underline sm:flex"
              >
                Open full watchlist <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            {watchlistLoading ? (
              <div className="flex min-h-[30vh] items-center justify-center">
                <Loader2 className="h-7 w-7 animate-spin text-rose-500" />
              </div>
            ) : watchlist.length > 0 ? (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
                {watchlist.map((item, index) => (
                  <div
                    key={item.id}
                    data-aos="fade-up"
                    data-aos-delay={(index % 5) * 80}
                    className={`group overflow-hidden rounded-2xl border shadow-lg transition hover:-translate-y-1 ${
                      isDark
                        ? "border-white/10 bg-slate-900/60"
                        : "border-slate-200 bg-white"
                    }`}
                  >
                    <div className="relative aspect-[2/3] w-full overflow-hidden bg-slate-950">
                      {item.moviePosterUrl ? (
                        <img
                          src={item.moviePosterUrl}
                          alt={item.movieTitle}
                          className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-slate-600">
                          <Film className="h-8 w-8" />
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={() => handleRemoveFavorite(item.movieId)}
                        className="absolute right-2 top-2 cursor-pointer rounded-lg border border-rose-500/30 bg-black/70 p-1.5 text-rose-500 backdrop-blur-md transition hover:bg-rose-500 hover:text-white"
                        title="Remove from watchlist"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    <Link
                      href={`/customer/movies/${item.movieId}`}
                      className="block p-3"
                    >
                      <h3 className="truncate text-xs font-black">
                        {item.movieTitle}
                      </h3>
                      {item.movieDurationMinutes && (
                        <span className="mt-0.5 flex items-center gap-1 font-mono text-[10px] text-slate-400">
                          <Clock className="h-3 w-3" />
                          {item.movieDurationMinutes}m
                        </span>
                      )}
                    </Link>
                  </div>
                ))}
              </div>
            ) : (
              <div
                className={`rounded-3xl border p-12 text-center text-xs ${
                  isDark
                    ? "border-white/10 bg-white/[0.02] text-slate-400"
                    : "border-slate-200 bg-white text-slate-500"
                }`}
              >
                <Heart className="mx-auto mb-3 h-10 w-10 text-slate-500" />
                <p className="font-bold">Your watchlist is currently empty.</p>
                <Link
                  href="/"
                  className="mt-4 inline-block rounded-xl bg-amber-500 px-5 py-2.5 text-xs font-black text-slate-950 transition hover:bg-amber-400"
                >
                  Browse Movies
                </Link>
              </div>
            )}
          </div>
        )}

        {/* ======================================================
            TAB 4: MEMBERSHIP & REWARDS
        ====================================================== */}

        {activeTab === "membership" && (
          <div
            data-aos="fade-up"
            data-aos-delay="150"
            className="max-w-2xl space-y-6"
          >
            <div
              className={`relative space-y-6 overflow-hidden rounded-3xl border p-6 shadow-xl sm:p-8 ${
                isDark
                  ? "border-amber-500/30 bg-gradient-to-br from-amber-500/10 via-slate-900 to-slate-950"
                  : "border-amber-500/40 bg-gradient-to-br from-amber-500/5 via-white to-slate-50"
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-amber-500">
                    CinemaX Privilege Club
                  </span>
                  <h3 className="mt-1 text-xl font-black">
                    {membershipTier} Tier Status
                  </h3>
                </div>
                <div className="rounded-2xl border border-amber-500/40 bg-amber-500/20 p-3 text-amber-400">
                  <Award className="h-7 w-7" />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-slate-400">Current Points</span>
                  <span className="font-mono text-sm text-amber-400">
                    {loyaltyPoints} PTS
                  </span>
                </div>
                <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-800">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-amber-500 to-yellow-400"
                    style={{
                      width: `${Math.min(100, (loyaltyPoints / 500) * 100)}%`,
                    }}
                  />
                </div>
                <p className="text-[11px] text-slate-400">
                  Earn 10 points for every ticket or snack combo purchased.
                  Reach 500 points to unlock GOLD tier perks!
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4 border-t border-white/10 pt-4 text-xs font-bold sm:grid-cols-2">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-emerald-400" />
                  <span>Free Birthday Popcorn</span>
                </div>
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-emerald-400" />
                  <span>Priority Booking Access</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
