"use client";

import { useEffect, useState, FormEvent } from "react";
import {
  Users,
  UserPlus,
  Trash2,
  RotateCcw,
  Search,
  Loader2,
  Shield,
  Phone,
  Mail,
  X,
  AlertCircle,
  Lock,
  Edit3,
  Archive,
} from "lucide-react";
import { UserService } from "@/app/service/user.service";
import {
  UserResponse,
  Role,
  CreateStaffRequest,
  UserUpdateRequest,
} from "@/app/types/api.types";
import Toast from "@/app/components/Toast";
import { useSettings } from "@/app/context/SettingsContext";

const ROLE_BADGES: Record<Role, { label: string; badge: string }> = {
  ADMIN: {
    label: "Admin",
    badge:
      "bg-red-500/15 border-red-500/30 text-red-600 dark:text-red-400 font-bold",
  },
  STAFF: {
    label: "Staff",
    badge:
      "bg-blue-500/15 border-blue-500/30 text-blue-600 dark:text-blue-400 font-bold",
  },
  CUSTOMER: {
    label: "Customer",
    badge:
      "bg-slate-500/15 border-slate-500/30 text-slate-700 dark:text-slate-300 font-bold",
  },
};

export default function AdminUsersPage() {
  const { theme } = useSettings();
  const isLight = theme === "light";

  const [users, setUsers] = useState<UserResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("ALL");
  const [viewTrash, setViewTrash] = useState(false);

  // Modal States
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserResponse | null>(null);

  // Form States
  const [createForm, setCreateForm] = useState<
    CreateStaffRequest & { role: Role }
  >({
    fullName: "",
    email: "",
    phone: "",
    password: "",
    role: "STAFF",
  });
  const [editForm, setEditForm] = useState<UserUpdateRequest>({
    fullName: "",
    phone: "",
    role: "CUSTOMER",
  });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Action Confirmation Dialog State
  const [actionDialog, setActionDialog] = useState<{
    isOpen: boolean;
    action: "SOFT_DELETE" | "RESTORE" | "HARD_DELETE" | "TOGGLE_STATUS";
    user: UserResponse | null;
  }>({
    isOpen: false,
    action: "SOFT_DELETE",
    user: null,
  });
  const [actionLoading, setActionLoading] = useState(false);

  // Notification Toast State
  const [toast, setToast] = useState<{
    message: string | null;
    type: "success" | "error";
  }>({
    message: null,
    type: "success",
  });

  const loadUsers = async (showTrash = viewTrash) => {
    setLoading(true);
    try {
      const data = showTrash
        ? await UserService.getTrashUsers()
        : await UserService.getAllUsers();
      setUsers(Array.isArray(data) ? data : []);
    } catch {
      setToast({ message: "Failed to load accounts.", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers(viewTrash);
  }, [viewTrash]);

  const handleCreateUser = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError(null);
    try {
      await UserService.createStaff(createForm);
      setToast({ message: "Account created successfully!", type: "success" });
      setIsCreateOpen(false);
      setCreateForm({
        fullName: "",
        email: "",
        phone: "",
        password: "",
        role: "STAFF",
      });
      if (!viewTrash) {
        await loadUsers(false);
      }
    } catch (err: any) {
      setFormError(
        err.response?.data?.status?.message || "Failed to create account.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenEdit = (u: UserResponse) => {
    setSelectedUser(u);
    setEditForm({
      fullName: u.fullName,
      phone: u.phone || "",
      role: u.role,
    });
    setFormError(null);
    setIsEditOpen(true);
  };

  const handleUpdateUser = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    setSubmitting(true);
    setFormError(null);
    try {
      const updated = await UserService.updateUser(selectedUser.id, editForm);
      setUsers((prev) =>
        prev.map((u) => (u.id === selectedUser.id ? { ...u, ...updated } : u)),
      );
      setToast({ message: "User updated successfully!", type: "success" });
      setIsEditOpen(false);
      setSelectedUser(null);
    } catch (err: any) {
      setFormError(
        err.response?.data?.status?.message || "Failed to update user.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleExecuteAction = async () => {
    if (!actionDialog.user) return;
    const { id, fullName } = actionDialog.user;
    setActionLoading(true);

    try {
      if (actionDialog.action === "SOFT_DELETE") {
        await UserService.softDeleteUser(id);
        setUsers((prev) => prev.filter((u) => u.id !== id));
        setToast({ message: `${fullName} moved to trash.`, type: "success" });
      } else if (actionDialog.action === "RESTORE") {
        await UserService.restoreUser(id);
        setUsers((prev) => prev.filter((u) => u.id !== id));
        setToast({
          message: `${fullName} restored successfully.`,
          type: "success",
        });
      } else if (actionDialog.action === "HARD_DELETE") {
        await UserService.hardDeleteUser(id);
        setUsers((prev) => prev.filter((u) => u.id !== id));
        setToast({
          message: `${fullName} permanently deleted.`,
          type: "success",
        });
      } else if (actionDialog.action === "TOGGLE_STATUS") {
        const updated = await UserService.toggleUserStatus(id);
        setUsers((prev) =>
          prev.map((u) =>
            u.id === id ? { ...u, isActive: updated.isActive } : u,
          ),
        );
        setToast({
          message: `Status updated for ${fullName}.`,
          type: "success",
        });
      }

      setActionDialog({ isOpen: false, action: "SOFT_DELETE", user: null });
    } catch (err: any) {
      setToast({
        message: err.response?.data?.status?.message || "Action failed.",
        type: "error",
      });
    } finally {
      setActionLoading(false);
    }
  };

  const filteredUsers = users.filter((u) => {
    const query = searchQuery.toLowerCase().trim();
    const matchesSearch =
      u.fullName?.toLowerCase().includes(query) ||
      u.email?.toLowerCase().includes(query) ||
      u.phone?.toLowerCase().includes(query);

    const matchesRole = roleFilter === "ALL" || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  /**
   * =========================================================
   * DYNAMIC THEME CLASSES (PERMANENT HIGH-CONTRAST LIGHT & DARK)
   * =========================================================
   */
  const pageClass = isLight
    ? "bg-slate-50 text-slate-900"
    : "bg-slate-950 text-slate-100";

  const cardClass = isLight
    ? "border-slate-300 bg-white shadow-xl shadow-slate-200 ring-1 ring-slate-200"
    : "border-slate-800 bg-slate-900/60 shadow-2xl backdrop-blur-md";

  const inputClass = isLight
    ? "border-slate-300 bg-white text-slate-900 placeholder-slate-400 focus:border-red-500 shadow-sm font-bold"
    : "border-slate-800 bg-slate-900/90 text-white placeholder-slate-500 focus:border-red-500";

  const modalBgClass = isLight
    ? "border-slate-300 bg-white shadow-2xl shadow-slate-300/60 text-slate-900 ring-1 ring-slate-200"
    : "border-slate-800 bg-slate-900 shadow-2xl text-slate-100";

  const textPrimary = isLight
    ? "text-slate-900 font-black"
    : "text-white font-black";
  const textSecondary = isLight
    ? "text-slate-700 font-bold"
    : "text-slate-400 font-medium";
  const textMuted = isLight
    ? "text-slate-600 font-bold"
    : "text-slate-600 font-medium";
  const borderCol = isLight ? "border-slate-300" : "border-slate-800";

  return (
    <div
      className={`min-h-screen py-6 px-4 sm:px-8 lg:px-10 w-full space-y-6 transition-colors duration-300 pb-24 ${pageClass}`}
    >
      <style jsx global>{`
        /* Completely hide scrollbars for Chrome, Safari, Edge, and Firefox */
        ::-webkit-scrollbar {
          display: none;
        }
        * {
          -ms-overflow-style: none; /* IE and Edge */
          scrollbar-width: none; /* Firefox */
        }
      `}</style>

      <Toast
        message={toast.message}
        type={toast.type}
        duration={3500}
        onClose={() => setToast({ message: null, type: "success" })}
      />

      {/* Confirmation Dialog */}
      {actionDialog.isOpen && actionDialog.user && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div
            className={`w-full max-w-sm rounded-3xl border p-6 shadow-2xl ${modalBgClass}`}
          >
            <h3 className={`text-base font-black ${textPrimary}`}>
              {actionDialog.action === "SOFT_DELETE" && "Move to Trash"}
              {actionDialog.action === "RESTORE" && "Restore Account"}
              {actionDialog.action === "HARD_DELETE" && "Delete Permanently"}
              {actionDialog.action === "TOGGLE_STATUS" && "Change Status"}
            </h3>

            <p className={`mt-2 text-xs leading-relaxed ${textSecondary}`}>
              {actionDialog.action === "SOFT_DELETE" && (
                <>
                  Move{" "}
                  <span className={`${textPrimary} font-black`}>
                    {actionDialog.user.fullName}
                  </span>{" "}
                  to the trash bin?
                </>
              )}
              {actionDialog.action === "RESTORE" && (
                <>
                  Restore{" "}
                  <span className={`${textPrimary} font-black`}>
                    {actionDialog.user.fullName}
                  </span>{" "}
                  back to active accounts?
                </>
              )}
              {actionDialog.action === "HARD_DELETE" && (
                <>
                  Permanently purge{" "}
                  <span className={`${textPrimary} font-black`}>
                    {actionDialog.user.fullName}
                  </span>{" "}
                  from the database? This cannot be undone.
                </>
              )}
              {actionDialog.action === "TOGGLE_STATUS" && (
                <>
                  {actionDialog.user.isActive ? "Deactivate" : "Activate"} login
                  access for{" "}
                  <span className={`${textPrimary} font-black`}>
                    {actionDialog.user.fullName}
                  </span>
                  ?
                </>
              )}
            </p>

            <div
              className={`mt-5 flex items-center justify-end gap-2.5 pt-3 border-t ${borderCol}`}
            >
              <button
                type="button"
                onClick={() =>
                  setActionDialog({
                    isOpen: false,
                    action: "SOFT_DELETE",
                    user: null,
                  })
                }
                className={`rounded-xl border px-4 py-2 text-xs font-bold cursor-pointer transition ${
                  isLight
                    ? "border-slate-300 bg-white text-slate-800 hover:bg-slate-100 shadow-sm"
                    : "border-slate-800 bg-slate-950 text-slate-400 hover:text-white"
                }`}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={actionLoading}
                onClick={handleExecuteAction}
                className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold text-white transition cursor-pointer disabled:opacity-50 ${
                  actionDialog.action === "RESTORE" ||
                  (actionDialog.action === "TOGGLE_STATUS" &&
                    !actionDialog.user.isActive)
                    ? "bg-emerald-600 hover:bg-emerald-500 shadow-lg shadow-emerald-600/30"
                    : actionDialog.action === "HARD_DELETE"
                      ? "bg-red-700 hover:bg-red-600 shadow-lg shadow-red-700/30"
                      : "bg-red-600 hover:bg-red-500 shadow-lg shadow-red-600/30"
                }`}
              >
                {actionLoading && (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                )}
                <span>
                  {actionDialog.action === "SOFT_DELETE" && "Move to Trash"}
                  {actionDialog.action === "RESTORE" && "Restore"}
                  {actionDialog.action === "HARD_DELETE" && "Delete"}
                  {actionDialog.action === "TOGGLE_STATUS" && "Confirm"}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div
        className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b ${borderCol} pb-5`}
      >
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-600 shrink-0">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <h1
                className={`text-xl sm:text-2xl font-black tracking-tight ${textPrimary} flex items-center gap-2`}
              >
                User & Staff Management
              </h1>
              <p className={`text-xs ${textSecondary} mt-0.5`}>
                Update profiles, manage account statuses, restore, or purge
                records
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setViewTrash(!viewTrash)}
            className={`flex items-center gap-2 rounded-xl px-3.5 py-2.5 text-xs font-bold transition cursor-pointer border shadow-sm ${
              viewTrash
                ? "bg-amber-500/10 border-amber-500/30 text-amber-500"
                : isLight
                  ? "bg-white border-slate-300 text-slate-700 hover:text-slate-900 hover:bg-slate-50 shadow-sm"
                  : "bg-slate-900 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800"
            }`}
          >
            <Archive className="h-4 w-4" />
            <span>{viewTrash ? "View Active Users" : "Trash Bin"}</span>
          </button>

          {!viewTrash && (
            <button
              onClick={() => setIsCreateOpen(true)}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-red-600/25 hover:from-red-500 hover:to-rose-500 transition cursor-pointer"
            >
              <UserPlus className="h-4 w-4" />
              <span>Create User</span>
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:max-w-md">
          <Search
            className={`absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 ${textSecondary}`}
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, email, or phone..."
            className={`w-full rounded-2xl border py-3 pl-10 pr-4 text-xs font-bold outline-none shadow-lg transition ${inputClass}`}
          />
        </div>

        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          {["ALL", "STAFF", "CUSTOMER", "ADMIN"].map((r) => (
            <button
              key={r}
              onClick={() => setRoleFilter(r)}
              className={`rounded-xl px-3.5 py-2 text-xs font-bold transition cursor-pointer shrink-0 ${
                roleFilter === r
                  ? "bg-red-600 text-white shadow-lg shadow-red-600/30"
                  : isLight
                    ? "bg-white border border-slate-300 text-slate-700 hover:text-slate-900 shadow-sm"
                    : "bg-slate-900 border border-slate-800 text-slate-400 hover:text-white"
              }`}
            >
              {r === "ALL" ? "All Roles" : r}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex min-h-[40vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-red-600" />
        </div>
      ) : filteredUsers.length > 0 ? (
        <div
          className={`overflow-hidden rounded-3xl border ${cardClass} backdrop-blur-md shadow-xl`}
        >
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead
                className={`border-b ${borderCol} ${isLight ? "bg-slate-100 text-slate-700" : "bg-slate-950/70 text-slate-400"} text-[11px] font-black uppercase tracking-wider`}
              >
                <tr>
                  <th className="px-5 py-4">Account Member</th>
                  <th className="px-5 py-4">Email Address</th>
                  <th className="px-5 py-4">Contact Phone</th>
                  <th className="px-5 py-4">Access Role</th>
                  <th className="px-5 py-4">Active Status</th>
                  <th className="px-5 py-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody
                className={`divide-y ${isLight ? "divide-slate-200 text-slate-900 font-medium" : "divide-slate-800/60 text-slate-300"}`}
              >
                {filteredUsers.map((u) => {
                  const roleConfig =
                    ROLE_BADGES[u.role] || ROLE_BADGES.CUSTOMER;
                  const isActive = u.isActive ?? true;

                  return (
                    <tr
                      key={u.id}
                      className={`transition group ${isLight ? "hover:bg-slate-100/70" : "hover:bg-slate-800/30"}`}
                    >
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div
                            className={`flex h-9 w-9 items-center justify-center rounded-xl ${isLight ? "bg-white text-slate-900 border-slate-300 font-black shadow-sm" : "bg-slate-800 border-slate-700 text-white font-bold"} text-xs border`}
                          >
                            {u.fullName?.substring(0, 2).toUpperCase() || "US"}
                          </div>
                          <p className={`font-black ${textPrimary} text-xs`}>
                            {u.fullName}
                          </p>
                        </div>
                      </td>

                      <td
                        className={`px-5 py-3.5 ${textSecondary} font-semibold`}
                      >
                        <span className="flex items-center gap-1.5">
                          <Mail className="h-3.5 w-3.5 text-red-600 shrink-0" />
                          {u.email}
                        </span>
                      </td>

                      <td
                        className={`px-5 py-3.5 ${textSecondary} font-mono font-bold`}
                      >
                        {u.phone ? (
                          <span className="flex items-center gap-1.5">
                            <Phone className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                            {u.phone}
                          </span>
                        ) : (
                          <span className={textMuted}>-</span>
                        )}
                      </td>

                      <td className="px-5 py-3.5">
                        <span
                          className={`inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-[10px] font-black ${roleConfig.badge}`}
                        >
                          <Shield className="h-3 w-3" />
                          {roleConfig.label}
                        </span>
                      </td>

                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            disabled={viewTrash}
                            onClick={() =>
                              setActionDialog({
                                isOpen: true,
                                action: "TOGGLE_STATUS",
                                user: u,
                              })
                            }
                            className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                              isActive ? "bg-emerald-500" : "bg-slate-500"
                            } ${viewTrash ? "opacity-40 cursor-not-allowed" : ""}`}
                            role="switch"
                            aria-checked={isActive}
                          >
                            <span
                              aria-hidden="true"
                              className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                                isActive ? "translate-x-5" : "translate-x-0"
                              }`}
                            />
                          </button>
                          <span
                            className={`text-[11px] font-black select-none ${
                              isActive
                                ? "text-emerald-600 dark:text-emerald-400"
                                : textMuted
                            }`}
                          >
                            {isActive ? "Active" : "Disabled"}
                          </span>
                        </div>
                      </td>

                      {/* Centered Actions */}
                      <td className="px-5 py-3.5 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {!viewTrash ? (
                            <>
                              <button
                                onClick={() => handleOpenEdit(u)}
                                className={`flex h-8 w-8 items-center justify-center rounded-xl border transition cursor-pointer ${
                                  isLight
                                    ? "border-slate-300 bg-white text-slate-700 hover:text-slate-900 hover:bg-slate-100 shadow-sm"
                                    : "border-slate-700 bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700"
                                }`}
                                title="Edit User"
                              >
                                <Edit3 className="h-3.5 w-3.5" />
                              </button>

                              <button
                                onClick={() =>
                                  setActionDialog({
                                    isOpen: true,
                                    action: "SOFT_DELETE",
                                    user: u,
                                  })
                                }
                                className="flex h-8 w-8 items-center justify-center rounded-xl border border-red-500/30 bg-red-500/15 text-red-600 dark:text-red-400 hover:bg-red-500/25 transition cursor-pointer"
                                title="Move to Trash"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() =>
                                  setActionDialog({
                                    isOpen: true,
                                    action: "RESTORE",
                                    user: u,
                                  })
                                }
                                className="flex h-8 w-8 items-center justify-center rounded-xl border border-emerald-500/30 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/25 transition cursor-pointer"
                                title="Restore User"
                              >
                                <RotateCcw className="h-3.5 w-3.5" />
                              </button>

                              <button
                                onClick={() =>
                                  setActionDialog({
                                    isOpen: true,
                                    action: "HARD_DELETE",
                                    user: u,
                                  })
                                }
                                className="flex h-8 w-8 items-center justify-center rounded-xl border border-red-500/30 bg-red-500/15 text-red-600 dark:text-red-400 hover:bg-red-500/25 transition cursor-pointer"
                                title="Hard Delete Permanently"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div
          className={`flex min-h-[30vh] flex-col items-center justify-center rounded-3xl border ${cardClass} p-8 text-center ${textSecondary} text-sm shadow-xl`}
        >
          <Users className={`h-10 w-10 ${textMuted} mb-2`} />
          <p className={`font-black ${textPrimary}`}>
            {viewTrash
              ? "Trash bin is empty."
              : "No registered accounts found."}
          </p>
        </div>
      )}

      {/* Edit User Modal */}
      {isEditOpen && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div
            className={`relative w-full max-w-md rounded-3xl border p-6 sm:p-8 shadow-2xl space-y-4 ${modalBgClass}`}
          >
            <button
              onClick={() => setIsEditOpen(false)}
              className={`absolute right-5 top-5 ${textSecondary} hover:${textPrimary} cursor-pointer p-1 rounded-lg ${isLight ? "hover:bg-slate-100" : "hover:bg-slate-800"} transition`}
            >
              <X className="h-5 w-5" />
            </button>

            <h2
              className={`text-base sm:text-lg font-black ${textPrimary} border-b ${borderCol} pb-3`}
            >
              Update Account Details
            </h2>

            {formError && (
              <div className="flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/15 p-3 text-xs text-red-600 dark:text-red-400 font-bold">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleUpdateUser} className="space-y-4 text-xs">
              <div>
                <label className={`block ${textSecondary} mb-1 font-bold`}>
                  Email Address
                </label>
                <input
                  type="email"
                  disabled
                  value={selectedUser.email}
                  className={`w-full rounded-xl border ${isLight ? "border-slate-300 bg-slate-100 text-slate-500 font-bold" : "border-slate-800 bg-slate-950/60 text-slate-500"} p-2.5 cursor-not-allowed`}
                />
              </div>

              <div>
                <label className={`block ${textSecondary} mb-1 font-bold`}>
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={editForm.fullName}
                  onChange={(e) =>
                    setEditForm({ ...editForm, fullName: e.target.value })
                  }
                  className={`w-full rounded-xl border ${inputClass} p-2.5 outline-none`}
                />
              </div>

              <div>
                <label className={`block ${textSecondary} mb-1 font-bold`}>
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={editForm.phone}
                  onChange={(e) =>
                    setEditForm({ ...editForm, phone: e.target.value })
                  }
                  className={`w-full rounded-xl border ${inputClass} p-2.5 outline-none font-mono`}
                />
              </div>

              <div>
                <label className={`block ${textSecondary} mb-1 font-bold`}>
                  Account Role
                </label>
                <select
                  value={editForm.role}
                  onChange={(e) =>
                    setEditForm({ ...editForm, role: e.target.value as Role })
                  }
                  className={`w-full rounded-xl border ${inputClass} p-2.5 outline-none cursor-pointer`}
                >
                  <option value="CUSTOMER">Customer</option>
                  <option value="STAFF">Staff Member</option>
                  <option value="ADMIN">Administrator</option>
                </select>
              </div>

              <div
                className={`flex justify-end gap-2.5 pt-3 border-t ${borderCol}`}
              >
                <button
                  type="button"
                  onClick={() => setIsEditOpen(false)}
                  className={`rounded-xl border ${isLight ? "border-slate-300 bg-white text-slate-800 hover:bg-slate-100 shadow-sm font-bold" : "border-slate-800 bg-slate-950 text-slate-400 hover:text-white"} px-4 py-2.5 text-xs cursor-pointer transition`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-red-600/30 hover:from-red-500 hover:to-rose-500 disabled:opacity-50 cursor-pointer transition"
                >
                  {submitting && (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  )}
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create User Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div
            className={`relative w-full max-w-md rounded-3xl border p-6 sm:p-8 shadow-2xl space-y-4 ${modalBgClass}`}
          >
            <button
              onClick={() => setIsCreateOpen(false)}
              className={`absolute right-5 top-5 ${textSecondary} hover:${textPrimary} cursor-pointer p-1 rounded-lg ${isLight ? "hover:bg-slate-100" : "hover:bg-slate-800"} transition`}
            >
              <X className="h-5 w-5" />
            </button>

            <h2
              className={`text-base sm:text-lg font-black ${textPrimary} border-b ${borderCol} pb-3`}
            >
              Create New Account
            </h2>

            {formError && (
              <div className="flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/15 p-3 text-xs text-red-600 dark:text-red-400 font-bold">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleCreateUser} className="space-y-4 text-xs">
              <div>
                <label className={`block ${textSecondary} mb-1 font-bold`}>
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={createForm.fullName}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, fullName: e.target.value })
                  }
                  placeholder="e.g. John Doe"
                  className={`w-full rounded-xl border ${inputClass} p-2.5 outline-none`}
                />
              </div>

              <div>
                <label className={`block ${textSecondary} mb-1 font-bold`}>
                  Email Address *
                </label>
                <input
                  type="email"
                  required
                  value={createForm.email}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, email: e.target.value })
                  }
                  placeholder="user@cinema.com"
                  className={`w-full rounded-xl border ${inputClass} p-2.5 outline-none`}
                />
              </div>

              <div>
                <label className={`block ${textSecondary} mb-1 font-bold`}>
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={createForm.phone}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, phone: e.target.value })
                  }
                  placeholder="012 345 678"
                  className={`w-full rounded-xl border ${inputClass} p-2.5 outline-none font-mono`}
                />
              </div>

              <div>
                <label className={`block ${textSecondary} mb-1 font-bold`}>
                  Initial Role *
                </label>
                <select
                  value={createForm.role}
                  onChange={(e) =>
                    setCreateForm({
                      ...createForm,
                      role: e.target.value as Role,
                    })
                  }
                  className={`w-full rounded-xl border ${inputClass} p-2.5 outline-none cursor-pointer`}
                >
                  <option value="STAFF">Staff Member</option>
                  <option value="CUSTOMER">Customer</option>
                  <option value="ADMIN">Administrator</option>
                </select>
              </div>

              <div>
                <label className={`block ${textSecondary} mb-1 font-bold`}>
                  Initial Password *
                </label>
                <div className="relative">
                  <Lock
                    className={`absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 ${textSecondary}`}
                  />
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={createForm.password}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, password: e.target.value })
                    }
                    placeholder="••••••••"
                    className={`w-full rounded-xl border ${inputClass} py-2.5 pl-9 pr-3 outline-none`}
                  />
                </div>
              </div>

              <div
                className={`flex justify-end gap-2.5 pt-3 border-t ${borderCol}`}
              >
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className={`rounded-xl border ${isLight ? "border-slate-300 bg-white text-slate-800 hover:bg-slate-100 shadow-sm font-bold" : "border-slate-800 bg-slate-950 text-slate-400 hover:text-white"} px-4 py-2.5 text-xs cursor-pointer transition`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-red-600/30 hover:from-red-500 hover:to-rose-500 disabled:opacity-50 cursor-pointer transition"
                >
                  {submitting && (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  )}
                  <span>Create Account</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
