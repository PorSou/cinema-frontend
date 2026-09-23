"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Film,
  CalendarDays,
  Armchair,
  Building2,
  Tv,
  Tags,
  Ticket,
  CreditCard,
  ScanLine,
  Users,
  LogOut,
  ChevronRight,
  Menu,
  X,
  ShieldAlert,
  Loader2,
  AlertTriangle,
  PanelLeftClose,
  PanelLeftOpen,
  BarChart3,
  Settings,
  Sun,
  Moon,
  Bell,
  TicketPercent,
  Popcorn,
  MessageSquare,
  ShieldCheck,
  TrendingUp,
  User,
  ChevronDown,
} from "lucide-react";

import { UserResponse } from "@/app/types/api.types";
import { AuthService } from "@/app/service/auth.service";
import { useSettings } from "@/app/context/SettingsContext";
import { useSiteLogo } from "@/app/hooks/useSiteLogo"; // 🌟 Dynamic logo hook
import api from "@/app/lib/api";

const NAV_SECTIONS = [
  {
    title: "Overview",
    items: [
      {
        label: "Dashboard",
        href: "/admin/dashboard",
        icon: LayoutDashboard,
        adminOnly: false,
      },
      {
        label: "Admission Scanner",
        href: "/admin/scanner",
        icon: ScanLine,
        adminOnly: false,
      },
    ],
  },
  {
    title: "Cinema Configuration",
    items: [
      {
        label: "Cinemas & Branches",
        href: "/admin/cinemas",
        icon: Building2,
        adminOnly: true, // 👈 Locked for staff
      },
      {
        label: "Halls & Auditoriums",
        href: "/admin/halls",
        icon: Tv,
        adminOnly: true, // 👈 Locked for staff
      },
      {
        label: "Auditorium Seats",
        href: "/admin/seats",
        icon: Armchair,
        adminOnly: true, // 👈 Locked for staff
      },
    ],
  },
  {
    title: "Catalog & Scheduling",
    items: [
      {
        label: "Genres & Categories",
        href: "/admin/genres",
        icon: Tags,
        adminOnly: false,
      },
      {
        label: "Movies Catalog",
        href: "/admin/movies",
        icon: Film,
        adminOnly: false,
      },
      {
        label: "Showtimes Schedule",
        href: "/admin/showtimes",
        icon: CalendarDays,
        adminOnly: false,
      },
      {
        label: "Promotional Vouchers",
        href: "/admin/vouchers",
        icon: TicketPercent,
        adminOnly: true, // 👈 Locked for staff to prevent financial leaks
      },
    ],
  },
  {
    title: "Sales & Auditing",
    items: [
      {
        label: "Bookings Ledger",
        href: "/admin/bookings",
        icon: Ticket,
        adminOnly: false,
      },
      {
        label: "Payment Audit",
        href: "/admin/payments",
        icon: CreditCard,
        adminOnly: false,
      },
      {
        label: "F&B Concessions",
        href: "/admin/concessions",
        icon: Popcorn,
        adminOnly: false,
      },
      {
        label: "Customer Feedback & Reviews",
        href: "/admin/reviews",
        icon: MessageSquare,
        adminOnly: false,
      },
      {
        label: "Analytics & Reports",
        href: "/admin/analytics",
        icon: BarChart3,
        adminOnly: true,
      },
      {
        label: "Movie Popularity Demand",
        href: "/admin/analytics/popularity",
        icon: TrendingUp,
        adminOnly: true,
      },
      {
        label: "Users & Staff",
        href: "/admin/users",
        icon: Users,
        adminOnly: true,
      },
    ],
  },
  {
    title: "System & Preferences",
    adminOnlySection: true,
    items: [
      {
        label: "System Settings",
        href: "/admin/settings",
        icon: Settings,
        adminOnly: true,
      },
      {
        label: "Audit Logs",
        href: "/admin/audit-logs",
        icon: ShieldCheck,
        adminOnly: true,
      },
    ],
  },
];

const API_ORIGIN = (
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api/v1"
).replace(/\/api\/v1\/?$/, "");

const resolveAvatarUrl = (path?: string | null) => {
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;
  return `${API_ORIGIN}/${path.replace(/^\/+/, "")}`;
};

const getAvatarPath = (u: any): string | null =>
  u?.avatarUrl || u?.avatar || u?.profileImage || u?.photoUrl || null;

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  const { theme, setTheme } = useSettings();
  const isLight = theme === "light";
  const logoUrl = useSiteLogo(); // 🌟 Fetch dynamic workspace logo

  const [user, setUser] = useState<UserResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [avatarError, setAvatarError] = useState(false);

  // Notification States
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifDropdownOpen, setNotifDropdownOpen] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const notifDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const currentUser = AuthService.getCurrentUser();
    const role = currentUser?.role?.toString().toUpperCase();

    if (
      !currentUser ||
      (role !== "ADMIN" && role !== "STAFF" && role !== "SUPER_ADMIN")
    ) {
      router.replace("/login?redirect=" + encodeURIComponent(pathname));
      setLoading(false);
      return;
    }

    setUser(currentUser);

    const isAdmin = role === "ADMIN" || role === "SUPER_ADMIN";
    const adminOnlyPaths = [
      "/admin/cinemas",
      "/admin/halls",
      "/admin/seats",
      "/admin/vouchers",
      "/admin/analytics",
      "/admin/analytics/popularity",
      "/admin/users",
      "/admin/settings",
      "/admin/audit-logs",
    ];
    if (!isAdmin && adminOnlyPaths.some((p) => pathname.startsWith(p))) {
      router.replace("/admin/dashboard");
    }

    setLoading(false);
  }, [pathname, router]);

  // Fetch notifications from Spring Boot backend
  const fetchNotifications = async () => {
    try {
      const res = await api.get("/notifications");
      const list = res.data?.body?.data || res.data?.data || res.data;
      if (Array.isArray(list)) {
        setNotifications(list);
        const unread = list.filter((n: any) => !n.isRead).length;
        setUnreadCount(unread);
      }
    } catch (err) {
      console.error("Failed to fetch notifications", err);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setProfileDropdownOpen(false);
      }
      if (
        notifDropdownRef.current &&
        !notifDropdownRef.current.contains(event.target as Node)
      ) {
        setNotifDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleMarkAsRead = async (id: number) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)),
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error("Failed to mark notification as read", err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await api.patch("/notifications/read-all");
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error("Failed to mark all as read", err);
    }
  };

  const confirmLogout = () => {
    setShowLogoutModal(false);
    AuthService.logout();
    window.location.href = "/login";
  };

  const userRole = user?.role?.toString().toUpperCase() || "";
  const isAdmin = userRole === "ADMIN" || userRole === "SUPER_ADMIN";

  const activeNavItem = NAV_SECTIONS.flatMap((s) => s.items).find((item) =>
    item.href === "/admin/analytics"
      ? pathname === "/admin/analytics"
      : pathname === item.href ||
        (item.href !== "/admin/dashboard" && pathname.startsWith(item.href)),
  );
  const currentpageTitle = activeNavItem ? activeNavItem.label : "Dashboard";

  const pageClass = isLight
    ? "bg-slate-100 text-slate-900"
    : "bg-slate-950 text-slate-100";

  const sidebarClass = isLight
    ? "border-slate-200 bg-white/90 text-slate-900"
    : "border-slate-800/80 bg-slate-950/90 text-slate-100";

  const borderClass = isLight ? "border-slate-200" : "border-slate-800/80";

  const hoverItemClass = isLight
    ? "text-slate-600 hover:bg-slate-100 hover:text-slate-900 font-bold"
    : "text-slate-400 hover:bg-slate-900/70 hover:text-slate-200 font-medium";

  const footerBoxClass = isLight
    ? "bg-slate-50 border-slate-200"
    : "bg-slate-900/60 border-slate-800/80";

  const topNavbarClass = isLight
    ? "bg-white/80 border-slate-200 text-slate-900"
    : "bg-slate-950/80 border-slate-800/80 text-slate-100";

  if (loading) {
    return (
      <div
        className={`flex min-h-screen items-center justify-center ${pageClass}`}
      >
        <Loader2 className="h-8 w-8 animate-spin text-red-600" />
      </div>
    );
  }

  if (!user) {
    return (
      <div
        className={`flex min-h-screen items-center justify-center text-xs ${pageClass}`}
      >
        <Loader2 className="h-6 w-6 animate-spin text-red-600 mr-2" />
        Verifying permissions...
      </div>
    );
  }

  return (
    <div
      className={`min-h-screen flex selection:bg-red-500 selection:text-white transition-colors duration-300 ${pageClass}`}
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

      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden transition-opacity duration-300"
        />
      )}

      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 border-r backdrop-blur-2xl flex flex-col justify-between transition-all duration-300 ease-in-out ${sidebarClass} ${
          isCollapsed ? "w-20" : "w-72"
        } ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}
      >
        <div className="flex flex-col h-full overflow-hidden">
          {/* 🌟 Adaptive Header Layout (Handles collapsed/expanded states smoothly) */}
          <div
            className={`h-16 px-2 flex items-center ${
              isCollapsed ? "flex-col justify-center py-2" : "justify-between"
            } border-b shrink-0 gap-1 overflow-hidden ${borderClass}`}
          >
            <Link
              href="/admin/dashboard"
              className={`flex items-center gap-2 overflow-hidden group py-1 ${
                isCollapsed ? "justify-center w-full" : "flex-1 min-w-0"
              }`}
            >
              <div className="relative flex h-9 w-10 shrink-0 items-center justify-center transition-transform group-hover:scale-105">
                <Image
                  src={logoUrl} // 🌟 Dynamic Database Logo URL
                  alt="Logo"
                  fill
                  sizes="40px"
                  className="object-contain object-center"
                  priority
                />
              </div>
              {!isCollapsed && (
                <div className="flex flex-col transition-opacity duration-300 min-w-0">
                  <span
                    className={`text-xs font-black tracking-tight leading-none truncate ${isLight ? "text-slate-900" : "text-white"}`}
                  >
                    CINE
                    <span className="text-red-600 dark:text-red-400">MAX</span>
                  </span>
                  <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-0.5 truncate">
                    Workspace
                  </span>
                </div>
              )}
            </Link>

            {!isCollapsed && (
              <button
                onClick={() => setIsCollapsed(!isCollapsed)}
                className={`hidden lg:flex items-center justify-center p-1.5 rounded-xl transition cursor-pointer shrink-0 ${
                  isLight
                    ? "text-slate-500 hover:text-slate-900 hover:bg-slate-100"
                    : "text-slate-400 hover:text-white hover:bg-slate-900/80"
                }`}
                title="Collapse Sidebar"
              >
                <PanelLeftClose className="h-4 w-4" />
              </button>
            )}

            {isCollapsed && (
              <button
                onClick={() => setIsCollapsed(!isCollapsed)}
                className={`hidden lg:flex items-center justify-center p-1 rounded-lg transition cursor-pointer ${
                  isLight
                    ? "text-slate-500 hover:text-slate-900 hover:bg-slate-100"
                    : "text-slate-400 hover:text-white hover:bg-slate-900/80"
                }`}
                title="Expand Sidebar"
              >
                <PanelLeftOpen className="h-3.5 w-3.5" />
              </button>
            )}

            <button
              onClick={() => setSidebarOpen(false)}
              className={`lg:hidden p-1.5 rounded-xl transition cursor-pointer shrink-0 ${
                isLight
                  ? "text-slate-500 hover:text-slate-900 hover:bg-slate-100"
                  : "text-slate-400 hover:text-white hover:bg-slate-900"
              }`}
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="flex-1 px-3 py-4 space-y-6 overflow-y-auto scrollbar-none">
            {NAV_SECTIONS.map((section) => {
              if (section.adminOnlySection && !isAdmin) return null;

              const visibleItems = section.items.filter(
                (item) => isAdmin || !item.adminOnly,
              );

              if (visibleItems.length === 0) return null;

              return (
                <div key={section.title} className="space-y-1">
                  {!isCollapsed && (
                    <p className="px-3 text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">
                      {section.title}
                    </p>
                  )}

                  {visibleItems.map((item) => {
                    const Icon = item.icon;
                    const isActive =
                      item.href === "/admin/analytics"
                        ? pathname === "/admin/analytics"
                        : pathname === item.href ||
                          (item.href !== "/admin/dashboard" &&
                            pathname.startsWith(item.href));

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setSidebarOpen(false)}
                        title={isCollapsed ? item.label : undefined}
                        className={`group flex items-center justify-between rounded-2xl px-3.5 py-2.5 text-xs font-bold transition-all duration-500 ease-out relative overflow-hidden ${
                          isActive
                            ? "bg-gradient-to-r from-teal-600 to-emerald-600 text-white shadow-lg shadow-emerald-600/40 scale-[1.02]"
                            : `${hoverItemClass} hover:scale-[1.01] active:scale-[0.98]`
                        }`}
                      >
                        {isActive && (
                          <span className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent animate-pulse" />
                        )}

                        <div className="flex items-center gap-3 min-w-0 relative z-10">
                          <Icon
                            className={`h-4 w-4 shrink-0 transition-all duration-300 ease-out ${
                              isActive
                                ? "text-white scale-110"
                                : isLight
                                  ? "text-slate-500 group-hover:text-red-600 group-hover:scale-110"
                                  : "text-slate-400 group-hover:text-red-400 group-hover:scale-110"
                            }`}
                          />
                          {!isCollapsed && (
                            <span className="truncate tracking-wide font-black">
                              {item.label}
                            </span>
                          )}
                        </div>
                        {!isCollapsed && isActive && (
                          <ChevronRight className="h-3.5 w-3.5 text-white/90 shrink-0 relative z-10 animate-in slide-in-from-left-1 duration-300" />
                        )}
                      </Link>
                    );
                  })}
                </div>
              );
            })}
          </div>

          <div
            className={`p-3 border-t shrink-0 ${borderClass} ${isLight ? "bg-slate-50/80" : "bg-slate-950/80"}`}
          >
            <div
              className={`flex items-center ${
                isCollapsed ? "justify-center" : "justify-between"
              } p-2.5 rounded-2xl border shadow-inner ${footerBoxClass}`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-600/20 border border-red-500/30 font-mono text-xs font-black text-red-600 dark:text-red-400 shrink-0">
                  {user?.fullName?.substring(0, 2).toUpperCase() || "AD"}
                </div>
                {!isCollapsed && (
                  <div className="min-w-0">
                    <p
                      className={`text-xs font-black truncate ${isLight ? "text-slate-900" : "text-white"}`}
                    >
                      {user?.fullName}
                    </p>
                    <span className="inline-flex items-center gap-1 text-[10px] font-black text-red-600 dark:text-red-400">
                      <ShieldAlert className="h-2.5 w-2.5" />
                      {user?.role}
                    </span>
                  </div>
                )}
              </div>

              {!isCollapsed && (
                <button
                  onClick={() => setShowLogoutModal(true)}
                  className="text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 p-2 rounded-xl transition cursor-pointer"
                  title="Sign Out"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      </aside>

      <div
        className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ease-in-out ${
          isCollapsed ? "lg:pl-20" : "lg:pl-72"
        }`}
      >
        <header
          className={`h-16 px-4 sm:px-8 flex items-center justify-between border-b backdrop-blur-xl sticky top-0 z-30 ${topNavbarClass}`}
        >
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className={`lg:hidden flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-bold cursor-pointer shadow-sm ${
                isLight
                  ? "border-slate-200 bg-slate-50 text-slate-700"
                  : "border-slate-800 bg-slate-900 text-slate-300"
              }`}
            >
              <Menu className="h-4 w-4 text-red-600 dark:text-red-400" />
              <span>Menu</span>
            </button>

            <div className="flex items-center gap-2">
              <span className="hidden sm:inline-block text-xs font-bold text-slate-400">
                Admin
              </span>
              <ChevronRight className="hidden sm:inline-block h-3 w-3 text-slate-500" />
              <span
                className={`text-xs font-black tracking-tight ${isLight ? "text-slate-900" : "text-white"}`}
              >
                {currentpageTitle}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setTheme(isLight ? "dark" : "light")}
              className={`relative flex items-center h-8 w-16 rounded-full p-1 transition-colors duration-300 cursor-pointer shadow-inner ${
                isLight
                  ? "bg-slate-300"
                  : "bg-slate-800 border border-slate-700/60"
              }`}
              title={isLight ? "Switch to Dark Mode" : "Switch to Light Mode"}
            >
              <div
                className={`flex h-6 w-6 transform items-center justify-center rounded-full bg-white shadow-md transition-transform duration-300 ease-in-out ${
                  isLight ? "translate-x-0" : "translate-x-8"
                }`}
              >
                {isLight ? (
                  <Sun className="h-3.5 w-3.5 text-amber-500 stroke-[2.5]" />
                ) : (
                  <Moon className="h-3.5 w-3.5 text-indigo-500 stroke-[2.5]" />
                )}
              </div>
              <div className="absolute inset-x-2 flex justify-between items-center pointer-events-none text-[10px]">
                <Sun
                  className={`h-3 w-3 ${isLight ? "opacity-0" : "opacity-40 text-amber-400"}`}
                />
                <Moon
                  className={`h-3 w-3 ${isLight ? "opacity-40 text-slate-500" : "opacity-0"}`}
                />
              </div>
            </button>

            {/* 🌟 INTERACTIVE NOTIFICATION DROPDOWN */}
            <div className="relative" ref={notifDropdownRef}>
              <button
                type="button"
                onClick={() => setNotifDropdownOpen((prev) => !prev)}
                className={`relative p-2.5 rounded-2xl border transition cursor-pointer ${
                  isLight
                    ? "border-slate-300 bg-white text-slate-700 hover:bg-slate-100 shadow-sm"
                    : "border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800"
                }`}
                title="Notifications"
              >
                <Bell className="h-4 w-4" />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-red-600"></span>
                  </span>
                )}
              </button>

              {notifDropdownOpen && (
                <div
                  className={`animate-in fade-in zoom-in-95 absolute right-0 top-12 z-50 w-80 sm:w-96 overflow-hidden rounded-3xl border shadow-2xl duration-150 ${
                    isLight
                      ? "bg-white border-slate-300 text-slate-900 ring-1 ring-slate-200"
                      : "bg-slate-900 border-slate-800 text-slate-100"
                  }`}
                >
                  <div className="h-0.5 w-full bg-gradient-to-r from-red-600 to-rose-600" />

                  <div
                    className={`flex items-center justify-between p-4 border-b ${isLight ? "border-slate-200 bg-slate-50" : "border-slate-800 bg-slate-950/50"}`}
                  >
                    <div className="flex items-center gap-2">
                      <h3
                        className={`text-xs font-black uppercase tracking-wider ${isLight ? "text-slate-900" : "text-white"}`}
                      >
                        System Alerts
                      </h3>
                      {unreadCount > 0 && (
                        <span className="px-2 py-0.5 text-[10px] font-black rounded-full bg-red-600/20 text-red-500 border border-red-500/30">
                          {unreadCount} new
                        </span>
                      )}
                    </div>
                    {unreadCount > 0 && (
                      <button
                        type="button"
                        onClick={handleMarkAllAsRead}
                        className="text-[11px] font-bold text-red-500 hover:underline cursor-pointer"
                      >
                        Mark all read
                      </button>
                    )}
                  </div>

                  <div className="max-h-80 overflow-y-auto divide-y divide-slate-700/20">
                    {notifications.length === 0 ? (
                      <div className="p-6 text-center text-xs text-slate-400 font-medium">
                        No notifications right now.
                      </div>
                    ) : (
                      notifications.map((item) => (
                        <div
                          key={item.id}
                          onClick={() =>
                            !item.isRead && handleMarkAsRead(item.id)
                          }
                          className={`p-4 transition cursor-pointer flex gap-3 items-start ${
                            !item.isRead
                              ? isLight
                                ? "bg-red-50/50"
                                : "bg-red-950/20"
                              : isLight
                                ? "hover:bg-slate-50"
                                : "hover:bg-slate-800/40"
                          }`}
                        >
                          <div
                            className={`mt-0.5 h-2 w-2 rounded-full shrink-0 ${!item.isRead ? "bg-red-600 animate-pulse" : "bg-transparent"}`}
                          />
                          <div className="min-w-0 flex-1 space-y-1">
                            <div className="flex items-center justify-between gap-2">
                              <p
                                className={`text-xs font-black truncate ${isLight ? "text-slate-900" : "text-white"}`}
                              >
                                {item.title}
                              </p>
                              <span className="text-[9px] text-slate-400 font-mono shrink-0">
                                {new Date(item.createdAt).toLocaleTimeString(
                                  [],
                                  { hour: "2-digit", minute: "2-digit" },
                                )}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-400 font-medium leading-relaxed">
                              {item.message}
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* 🌟 DYNAMIC & INTERACTIVE ADMIN PROFILE DROPDOWN */}
            <div
              className="relative border-l pl-3 border-slate-700/40"
              ref={dropdownRef}
            >
              <button
                type="button"
                onClick={() => setProfileDropdownOpen((prev) => !prev)}
                className={`flex cursor-pointer items-center gap-2.5 rounded-2xl p-1.5 transition ${
                  isLight ? "hover:bg-slate-200/60" : "hover:bg-slate-800/60"
                } ${profileDropdownOpen ? "ring-1 ring-red-500/50" : ""}`}
              >
                <div className="relative flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-tr from-red-600 to-rose-600 text-xs font-black text-white shadow-md">
                  {getAvatarPath(user) && !avatarError ? (
                    <img
                      key={getAvatarPath(user)}
                      src={resolveAvatarUrl(getAvatarPath(user))!}
                      alt="Avatar"
                      className="h-full w-full object-cover"
                      onError={() => setAvatarError(true)}
                    />
                  ) : (
                    user?.fullName?.substring(0, 2).toUpperCase() || "AD"
                  )}
                </div>
                <span
                  className={`hidden md:inline-block text-xs font-black truncate max-w-[120px] ${
                    isLight ? "text-slate-900" : "text-white"
                  }`}
                >
                  {user?.fullName}
                </span>
                <ChevronDown
                  className={`h-3 w-3 text-slate-400 transition-transform ${
                    profileDropdownOpen ? "rotate-180" : ""
                  }`}
                />
              </button>

              {profileDropdownOpen && (
                <div
                  className={`animate-in fade-in zoom-in-95 absolute right-0 top-12 z-50 w-60 overflow-hidden rounded-3xl border shadow-2xl duration-150 ${
                    isLight
                      ? "bg-white border-slate-300 text-slate-900 ring-1 ring-slate-200"
                      : "bg-slate-900 border-slate-800 text-slate-100"
                  }`}
                >
                  <div className="h-0.5 w-full bg-gradient-to-r from-red-600 to-rose-600" />

                  <div
                    className={`p-4 border-b ${isLight ? "border-slate-200 bg-slate-50" : "border-slate-800 bg-slate-950/50"}`}
                  >
                    <p
                      className={`text-xs font-black truncate ${isLight ? "text-slate-900" : "text-white"}`}
                    >
                      {user?.fullName}
                    </p>
                    <p className="text-[10px] text-slate-400 truncate mt-0.5">
                      {user?.email}
                    </p>
                  </div>

                  <div className="p-1.5 space-y-0.5">
                    <Link
                      href="/customer/profile"
                      onClick={() => setProfileDropdownOpen(false)}
                      className={`flex items-center gap-2.5 rounded-2xl px-3 py-2.5 text-xs font-bold transition ${
                        isLight
                          ? "hover:bg-slate-100 text-slate-700"
                          : "hover:bg-slate-800 text-slate-300"
                      }`}
                    >
                      <User className="h-4 w-4 text-red-500" />
                      <span>Account Settings & Profile</span>
                    </Link>
                  </div>

                  <div
                    className={`border-t p-1.5 ${isLight ? "border-slate-200" : "border-slate-800"}`}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setProfileDropdownOpen(false);
                        setShowLogoutModal(true);
                      }}
                      className="flex w-full items-center gap-2.5 rounded-2xl px-3 py-2.5 text-xs font-bold text-rose-500 hover:bg-rose-500/10 transition cursor-pointer"
                    >
                      <LogOut className="h-4 w-4" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        <main
          className={`flex-1 p-4 sm:p-8 overflow-y-auto min-h-screen transition-colors duration-300 ${pageClass}`}
        >
          {children}
        </main>
      </div>

      {showLogoutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div
            className={`w-full max-w-sm rounded-3xl border p-6 shadow-2xl space-y-5 text-center ${
              isLight
                ? "bg-white border-slate-300 text-slate-900 shadow-2xl ring-1 ring-slate-200"
                : "bg-slate-900 border-slate-800 text-slate-100 shadow-2xl"
            }`}
          >
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-500 shadow-lg shadow-rose-500/20">
              <AlertTriangle className="h-6 w-6" />
            </div>

            <div className="space-y-1.5">
              <h3
                className={`text-lg font-black tracking-tight ${isLight ? "text-slate-900" : "text-white"}`}
              >
                Confirm Sign Out
              </h3>
              <p className="text-xs text-slate-400 font-semibold leading-relaxed">
                Are you sure you want to log out of the CinemaX Admin Workspace?
              </p>
            </div>

            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowLogoutModal(false)}
                className={`w-1/2 rounded-xl border py-2.5 text-xs font-bold transition cursor-pointer ${
                  isLight
                    ? "border-slate-300 bg-white text-slate-800 hover:bg-slate-100 shadow-sm"
                    : "border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700"
                }`}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmLogout}
                className="w-1/2 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 py-2.5 text-xs font-bold text-white shadow-lg shadow-red-600/30 hover:from-red-500 hover:to-rose-500 transition cursor-pointer"
              >
                Yes, Sign Out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
