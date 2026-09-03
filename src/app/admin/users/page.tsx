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

const ROLE_BADGES: Record<Role, { label: string; badge: string }> = {
  ADMIN: {
    label: "Admin",
    badge: "bg-red-500/10 border-red-500/20 text-red-400",
  },
  STAFF: {
    label: "Staff",
    badge: "bg-blue-500/10 border-blue-500/20 text-blue-400",
  },
  CUSTOMER: {
    label: "Customer",
    badge: "bg-slate-800 border-slate-700 text-slate-300",
  },
};

export default function AdminUsersPage() {
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
  const [createForm, setCreateForm] = useState<CreateStaffRequest & { role: Role }>({
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
        err.response?.data?.status?.message || "Failed to create account."
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
        prev.map((u) => (u.id === selectedUser.id ? { ...u, ...updated } : u))
      );
      setToast({ message: "User updated successfully!", type: "success" });
      setIsEditOpen(false);
      setSelectedUser(null);
    } catch (err: any) {
      setFormError(
        err.response?.data?.status?.message || "Failed to update user."
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
        setToast({ message: `${fullName} restored successfully.`, type: "success" });
      } else if (actionDialog.action === "HARD_DELETE") {
        await UserService.hardDeleteUser(id);
        setUsers((prev) => prev.filter((u) => u.id !== id));
        setToast({ message: `${fullName} permanently deleted.`, type: "success" });
      } else if (actionDialog.action === "TOGGLE_STATUS") {
        const updated = await UserService.toggleUserStatus(id);
        setUsers((prev) =>
          prev.map((u) => (u.id === id ? { ...u, isActive: updated.isActive } : u))
        );
        setToast({ message: `Status updated for ${fullName}.`, type: "success" });
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

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-6">
      <Toast
        message={toast.message}
        type={toast.type}
        onClose={() => setToast({ message: null, type: "success" })}
      />

      {/* Confirmation Dialog */}
      {actionDialog.isOpen && actionDialog.user && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-2xl">
            <h3 className="text-sm font-bold text-white">
              {actionDialog.action === "SOFT_DELETE" && "Move to Trash"}
              {actionDialog.action === "RESTORE" && "Restore Account"}
              {actionDialog.action === "HARD_DELETE" && "Delete Permanently"}
              {actionDialog.action === "TOGGLE_STATUS" && "Change Status"}
            </h3>

            <p className="mt-2 text-xs leading-relaxed text-slate-400">
              {actionDialog.action === "SOFT_DELETE" && (
                <>
                  Move <span className="text-white font-semibold">{actionDialog.user.fullName}</span> to the trash bin?
                </>
              )}
              {actionDialog.action === "RESTORE" && (
                <>
                  Restore <span className="text-white font-semibold">{actionDialog.user.fullName}</span> back to active accounts?
                </>
              )}
              {actionDialog.action === "HARD_DELETE" && (
                <>
                  Permanently purge <span className="text-white font-semibold">{actionDialog.user.fullName}</span> from the database? This cannot be undone.
                </>
              )}
              {actionDialog.action === "TOGGLE_STATUS" && (
                <>
                  {actionDialog.user.isActive ? "Deactivate" : "Activate"} login access for{" "}
                  <span className="text-white font-semibold">{actionDialog.user.fullName}</span>?
                </>
              )}
            </p>

            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setActionDialog({ isOpen: false, action: "SOFT_DELETE", user: null })}
                className="rounded-lg border border-slate-700 bg-transparent px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={actionLoading}
                onClick={handleExecuteAction}
                className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-semibold text-white transition cursor-pointer disabled:opacity-50 ${
                  actionDialog.action === "RESTORE" ||
                  (actionDialog.action === "TOGGLE_STATUS" && !actionDialog.user.isActive)
                    ? "bg-emerald-600 hover:bg-emerald-500"
                    : actionDialog.action === "HARD_DELETE"
                    ? "bg-red-700 hover:bg-red-600"
                    : "bg-red-600 hover:bg-red-500"
                }`}
              >
                {actionLoading && <Loader2 className="h-3 w-3 animate-spin" />}
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <Users className="h-6 w-6 text-red-500 shrink-0" />
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
              User & Staff Management
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Update profiles, manage account statuses, restore, or purge records
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewTrash(!viewTrash)}
            className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition cursor-pointer border ${
              viewTrash
                ? "bg-amber-500/10 border-amber-500/30 text-amber-400"
                : "bg-slate-900 border-slate-800 text-slate-400 hover:text-white"
            }`}
          >
            <Archive className="h-4 w-4" />
            <span>{viewTrash ? "View Active Users" : "Trash Bin"}</span>
          </button>

          {!viewTrash && (
            <button
              onClick={() => setIsCreateOpen(true)}
              className="flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-red-600/30 hover:bg-red-500 transition cursor-pointer"
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
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, email, or phone..."
            className="w-full rounded-xl border border-slate-800 bg-slate-900/80 py-2.5 pl-10 pr-4 text-xs text-white placeholder-slate-500 outline-none focus:border-red-500"
          />
        </div>

        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto">
          {["ALL", "STAFF", "CUSTOMER", "ADMIN"].map((r) => (
            <button
              key={r}
              onClick={() => setRoleFilter(r)}
              className={`rounded-xl px-3 py-2 text-xs font-bold transition cursor-pointer shrink-0 ${
                roleFilter === r
                  ? "bg-red-600 text-white shadow"
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
        <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60 backdrop-blur-md shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-800 bg-slate-950/70 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="px-5 py-4">Account Member</th>
                  <th className="px-5 py-4">Contact Phone</th>
                  <th className="px-5 py-4">Access Role</th>
                  <th className="px-5 py-4">Active Status</th>
                  <th className="px-5 py-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredUsers.map((u) => {
                  const roleConfig = ROLE_BADGES[u.role] || ROLE_BADGES.CUSTOMER;
                  const isActive = u.isActive ?? true;

                  return (
                    <tr key={u.id} className="transition hover:bg-slate-800/30">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-800 border border-slate-700 font-bold text-white text-xs">
                            {u.fullName?.substring(0, 2).toUpperCase() || "US"}
                          </div>
                          <div>
                            <p className="font-bold text-white text-sm">{u.fullName}</p>
                            <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                              <Mail className="h-3 w-3 text-slate-500" />
                              {u.email}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-3.5 text-slate-300 font-mono">
                        {u.phone ? (
                          <span className="flex items-center gap-1.5">
                            <Phone className="h-3.5 w-3.5 text-slate-500" />
                            {u.phone}
                          </span>
                        ) : (
                          <span className="text-slate-600">-</span>
                        )}
                      </td>

                      <td className="px-5 py-3.5">
                        <span
                          className={`inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-[10px] font-bold ${roleConfig.badge}`}
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
                              isActive ? "bg-emerald-500" : "bg-slate-700"
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
                            className={`text-[11px] font-bold select-none ${
                              isActive ? "text-emerald-400" : "text-slate-500"
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
                                className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-700 bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition cursor-pointer"
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
                                className="flex h-7 w-7 items-center justify-center rounded-lg border border-red-500/20 bg-red-500/10 text-red-400 hover:bg-red-500/20 transition cursor-pointer"
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
                                className="flex h-7 w-7 items-center justify-center rounded-lg border border-emerald-500/20 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition cursor-pointer"
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
                                className="flex h-7 w-7 items-center justify-center rounded-lg border border-red-500/20 bg-red-500/10 text-red-400 hover:bg-red-500/20 transition cursor-pointer"
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
        <div className="flex min-h-[30vh] flex-col items-center justify-center rounded-2xl border border-slate-800 bg-slate-900/30 p-8 text-center text-slate-400 text-sm">
          <Users className="h-10 w-10 text-slate-600 mb-2" />
          <p>{viewTrash ? "Trash bin is empty." : "No registered accounts found."}</p>
        </div>
      )}

      {/* Edit User Modal */}
      {isEditOpen && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900 p-6 sm:p-8 shadow-2xl space-y-4">
            <button
              onClick={() => setIsEditOpen(false)}
              className="absolute right-5 top-5 text-slate-400 hover:text-white cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>

            <h2 className="text-lg font-bold text-white border-b border-slate-800 pb-3">
              Update Account Details
            </h2>

            {formError && (
              <div className="flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-400">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleUpdateUser} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Email Address</label>
                <input
                  type="email"
                  disabled
                  value={selectedUser.email}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950/60 p-2.5 text-slate-500 cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Full Name *</label>
                <input
                  type="text"
                  required
                  value={editForm.fullName}
                  onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 p-2.5 text-white outline-none focus:border-red-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Phone Number</label>
                <input
                  type="tel"
                  value={editForm.phone}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 p-2.5 text-white outline-none focus:border-red-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Account Role</label>
                <select
                  value={editForm.role}
                  onChange={(e) => setEditForm({ ...editForm, role: e.target.value as Role })}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 p-2.5 text-white outline-none focus:border-red-500 cursor-pointer"
                >
                  <option value="CUSTOMER">Customer</option>
                  <option value="STAFF">Staff Member</option>
                  <option value="ADMIN">Administrator</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsEditOpen(false)}
                  className="rounded-xl border border-slate-800 bg-slate-950 px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex items-center gap-2 rounded-xl bg-red-600 px-5 py-2 text-xs font-bold text-white shadow-lg shadow-red-600/30 hover:bg-red-500 disabled:opacity-50 cursor-pointer"
                >
                  {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create User Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900 p-6 sm:p-8 shadow-2xl space-y-4">
            <button
              onClick={() => setIsCreateOpen(false)}
              className="absolute right-5 top-5 text-slate-400 hover:text-white cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>

            <h2 className="text-lg font-bold text-white border-b border-slate-800 pb-3">
              Create New Account
            </h2>

            {formError && (
              <div className="flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-400">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleCreateUser} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Full Name *</label>
                <input
                  type="text"
                  required
                  value={createForm.fullName}
                  onChange={(e) => setCreateForm({ ...createForm, fullName: e.target.value })}
                  placeholder="e.g. John Doe"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 p-2.5 text-white outline-none focus:border-red-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Email Address *</label>
                <input
                  type="email"
                  required
                  value={createForm.email}
                  onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                  placeholder="user@cinema.com"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 p-2.5 text-white outline-none focus:border-red-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Phone Number</label>
                <input
                  type="tel"
                  value={createForm.phone}
                  onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
                  placeholder="012 345 678"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 p-2.5 text-white outline-none focus:border-red-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Initial Role *</label>
                <select
                  value={createForm.role}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, role: e.target.value as Role })
                  }
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 p-2.5 text-white outline-none focus:border-red-500 cursor-pointer"
                >
                  <option value="STAFF">Staff Member</option>
                  <option value="CUSTOMER">Customer</option>
                  <option value="ADMIN">Administrator</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Initial Password *</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={createForm.password}
                    onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                    placeholder="••••••••"
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 py-2.5 pl-9 pr-3 text-white outline-none focus:border-red-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="rounded-xl border border-slate-800 bg-slate-950 px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex items-center gap-2 rounded-xl bg-red-600 px-5 py-2 text-xs font-bold text-white shadow-lg shadow-red-600/30 hover:bg-red-500 disabled:opacity-50 cursor-pointer"
                >
                  {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
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