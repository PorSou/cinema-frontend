"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
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
} from "lucide-react";

import { UserResponse } from "@/app/types/api.types";
import { AuthService } from "@/app/service/auth.service";

const NAV_SECTIONS = [
  {
    title: "Overview",
    items: [
      { label: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
      { label: "Admission Scanner", href: "/admin/scanner", icon: ScanLine },
    ],
  },
  {
    title: "Cinema Configuration",
    items: [
      { label: "Cinemas & Branches", href: "/admin/cinemas", icon: Building2 },
      { label: "Halls & Auditoriums", href: "/admin/halls", icon: Tv },
      { label: "Auditorium Seats", href: "/admin/seats", icon: Armchair },
    ],
  },
  {
    title: "Catalog & Scheduling",
    items: [
      { label: "Genres & Categories", href: "/admin/genres", icon: Tags },
      { label: "Movies Catalog", href: "/admin/movies", icon: Film },
      { label: "Showtimes Schedule", href: "/admin/showtimes", icon: CalendarDays },
    ],
  },
  {
    title: "Sales & Auditing",
    items: [
      { label: "Bookings Ledger", href: "/admin/bookings", icon: Ticket },
      { label: "Payment Audit", href: "/admin/payments", icon: CreditCard },
      { label: "Analytics & Reports", href: "/admin/analytics", icon: BarChart3 },
      { label: "Users & Staff", href: "/admin/users", icon: Users },
    ],
  },
  {
    title: "System & Preferences",
    items: [
      { label: "System Settings", href: "/admin/settings", icon: Settings },
    ],
  },
];

function getCookieValue(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.split("=").slice(1).join("=")) : null;
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  const [user, setUser] = useState<UserResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  useEffect(() => {
    let currentUser = AuthService.getCurrentUser();

    if (!currentUser && typeof window !== "undefined") {
      const fallback = localStorage.getItem("cinemax_user") || localStorage.getItem("user");
      if (fallback) {
        try {
          currentUser = JSON.parse(fallback);
        } catch (e) {
          // ignore
        }
      }
    }

    if (!currentUser) {
      const cookieRole = getCookieValue("userRole");
      const cookieToken = getCookieValue("accessToken");

      if (cookieToken && (cookieRole === "ADMIN" || cookieRole === "STAFF")) {
        currentUser = {
          id: 0,
          email: "",
          fullName: cookieRole === "ADMIN" ? "Admin" : "Staff",
          role: cookieRole,
        } as UserResponse;

        try {
          localStorage.setItem("accessToken", cookieToken);
          localStorage.setItem("cinemax_user", JSON.stringify(currentUser));
        } catch (e) {
          // storage unavailable
        }
      }
    }

    const role = currentUser?.role?.toString().toUpperCase();

    if (!currentUser || (role !== "ADMIN" && role !== "STAFF")) {
      router.replace("/login?redirect=" + encodeURIComponent(pathname));
    } else {
      setUser(currentUser);
    }
    setLoading(false);
  }, [pathname, router]);

  const confirmLogout = () => {
    setShowLogoutModal(false);
    AuthService.logout();
    window.location.href = "/login";
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950">
        <Loader2 className="h-8 w-8 animate-spin text-red-600" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-400 text-xs">
        <Loader2 className="h-6 w-6 animate-spin text-red-600 mr-2" />
        Verifying permissions...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex selection:bg-red-500 selection:text-white">
      {/* Mobile Backdrop Overlay */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-40 bg-black/80 backdrop-blur-sm lg:hidden transition-opacity duration-300"
        />
      )}

      {/* Sidebar Navigation */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 border-r border-slate-800/80 bg-slate-950/90 backdrop-blur-2xl flex flex-col justify-between transition-all duration-300 ease-in-out ${
          isCollapsed ? "w-20" : "w-72"
        } ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}
      >
        <div className="flex flex-col h-full overflow-hidden">
          {/* Brand Header */}
          <div className="h-16 px-5 flex items-center justify-between border-b border-slate-800/80 shrink-0">
            <Link href="/admin/dashboard" className="flex items-center gap-3 overflow-hidden group">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-red-600 via-rose-600 to-red-500 shadow-lg shadow-red-600/30 group-hover:scale-105 transition-transform">
                <Film className="h-5 w-5 text-white" />
              </div>
              {!isCollapsed && (
                <div className="flex flex-col transition-opacity duration-300">
                  <span className="text-base font-black tracking-tight text-white leading-none">
                    CINE<span className="text-red-500">MAX</span>
                  </span>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">
                    Workspace
                  </span>
                </div>
              )}
            </Link>

            {/* Desktop Collapse Button */}
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="hidden lg:flex items-center justify-center p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-900/80 transition cursor-pointer"
              title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
            >
              {isCollapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
            </button>

            {/* Mobile Close */}
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-900 transition cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Nav Items Container */}
          <div className="flex-1 px-3 py-4 space-y-6 overflow-y-auto scrollbar-none">
            {NAV_SECTIONS.map((section) => (
              <div key={section.title} className="space-y-1">
                {!isCollapsed && (
                  <p className="px-3 text-[10px] font-extrabold uppercase tracking-widest text-slate-500/70 mb-1.5">
                    {section.title}
                  </p>
                )}

                {section.items.map((item) => {
                  const Icon = item.icon;
                  const isActive =
                    pathname === item.href ||
                    (item.href !== "/admin/dashboard" && pathname.startsWith(item.href));

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setSidebarOpen(false)}
                      title={isCollapsed ? item.label : undefined}
                      className={`group flex items-center justify-between rounded-2xl px-3 py-2.5 text-xs font-bold transition-all duration-200 relative ${
                        isActive
                          ? "bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-lg shadow-red-600/30 scale-[1.02]"
                          : "text-slate-400 hover:bg-slate-900/70 hover:text-slate-200"
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <Icon
                          className={`h-4 w-4 shrink-0 transition-all duration-200 group-hover:scale-110 ${
                            isActive ? "text-white" : "text-slate-400 group-hover:text-red-400"
                          }`}
                        />
                        {!isCollapsed && <span className="truncate tracking-wide">{item.label}</span>}
                      </div>
                      {!isCollapsed && isActive && (
                        <ChevronRight className="h-3.5 w-3.5 text-white/80 shrink-0" />
                      )}
                    </Link>
                  );
                })}
              </div>
            ))}
          </div>

          {/* User Footer Profile */}
          <div className="p-3 border-t border-slate-800/80 bg-slate-950/80 shrink-0">
            <div
              className={`flex items-center ${
                isCollapsed ? "justify-center" : "justify-between"
              } p-2.5 rounded-2xl bg-slate-900/60 border border-slate-800/80 shadow-inner`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-600/20 border border-red-500/30 font-mono text-xs font-bold text-red-400 shrink-0">
                  {user?.fullName?.substring(0, 2).toUpperCase() || "AD"}
                </div>
                {!isCollapsed && (
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-white truncate">{user?.fullName}</p>
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-red-400">
                      <ShieldAlert className="h-2.5 w-2.5" />
                      {user?.role}
                    </span>
                  </div>
                )}
              </div>

              {!isCollapsed && (
                <button
                  onClick={() => setShowLogoutModal(true)}
                  className="text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 p-2 rounded-xl transition cursor-pointer"
                  title="Sign Out"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div
        className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ease-in-out ${
          isCollapsed ? "lg:pl-20" : "lg:pl-72"
        }`}
      >
        {/* Mobile Top Bar */}
        <header className="h-16 px-4 flex items-center justify-between border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-xl sticky top-0 z-30 lg:hidden">
          <button
            onClick={() => setSidebarOpen(true)}
            className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-xs font-bold text-slate-300 cursor-pointer shadow-sm"
          >
            <Menu className="h-4 w-4 text-red-500" />
            <span>Admin Menu</span>
          </button>
          <span className="text-xs font-bold text-slate-300 truncate max-w-[160px]">
            {user?.fullName}
          </span>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 sm:p-8 bg-slate-950 overflow-y-auto min-h-screen">
          {children}
        </main>
      </div>

      {/* Sign Out Modal */}
      {showLogoutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-sm rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-2xl space-y-5 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-500 shadow-lg shadow-rose-500/10">
              <AlertTriangle className="h-6 w-6" />
            </div>

            <div className="space-y-1.5">
              <h3 className="text-lg font-black text-white tracking-tight">Confirm Sign Out</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Are you sure you want to log out of the CinemaX Admin Workspace?
              </p>
            </div>

            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowLogoutModal(false)}
                className="w-1/2 rounded-xl border border-slate-700 bg-slate-800/80 py-2.5 text-xs font-bold text-slate-300 hover:bg-slate-700 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmLogout}
                className="w-1/2 rounded-xl bg-red-600 py-2.5 text-xs font-bold text-white shadow-lg shadow-red-600/30 hover:bg-red-500 transition cursor-pointer"
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