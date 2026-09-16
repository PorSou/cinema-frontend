"use client";

import { useEffect, useState, useRef, FormEvent } from "react";
import {
  Coffee,
  Plus,
  Edit3,
  Trash2,
  Loader2,
  Archive,
  RotateCcw,
  Sparkles,
  X,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  UploadCloud,
  Layers,
  Check,
  Tag,
} from "lucide-react";

import ConcessionService, {
  ConcessionCategoryResponse,
  ConcessionItemResponse,
} from "@/app/service/concession.service";
import Toast from "@/app/components/Toast";
import ConfirmDialog from "@/app/components/ConfirmDialog";
import { useSettings } from "@/app/context/SettingsContext";

const extractArray = <T,>(res: any): T[] => {
  if (Array.isArray(res)) return res;
  if (Array.isArray(res?.content)) return res.content;
  if (Array.isArray(res?.data)) return res.data;
  if (Array.isArray(res?.body?.data)) return res.body.data;
  if (Array.isArray(res?.data?.content)) return res.data.content;
  return [];
};

export default function AdminConcessionsPage() {
  const { theme } = useSettings();
  const isLight = theme === "light";

  // Active Tab: "items" or "categories"
  const [activeTab, setActiveTab] = useState<"items" | "categories">("items");

  // Data states
  const [items, setItems] = useState<ConcessionItemResponse[]>([]);
  const [categories, setCategories] = useState<ConcessionCategoryResponse[]>(
    [],
  );
  const [dropdownCategories, setDropdownCategories] = useState<
    ConcessionCategoryResponse[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [viewTrash, setViewTrash] = useState(false);

  // Pagination state
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);
  const pageSize = 10;

  // Selected IDs for bulk actions
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  // Item Modal & Form
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ConcessionItemResponse | null>(
    null,
  );
  const [itemForm, setItemForm] = useState({
    name: "",
    description: "",
    price: 5.0,
    categoryId: 0,
    active: true,
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Category Modal & Form
  const [isCatModalOpen, setIsCatModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] =
    useState<ConcessionCategoryResponse | null>(null);
  const [catForm, setCatForm] = useState({ name: "", description: "" });

  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Toast & Confirm
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

  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    type: "SOFT_DELETE" | "HARD_DELETE" | "RESTORE";
    targetName: string;
    action: () => Promise<void>;
  }>({
    isOpen: false,
    type: "SOFT_DELETE",
    targetName: "",
    action: async () => {},
  });

  // Load dropdown categories list
  const loadDropdownCategories = async () => {
    try {
      const list = await ConcessionService.getActiveCategoriesList();
      const arr = extractArray<ConcessionCategoryResponse>(list);
      setDropdownCategories(arr);
    } catch {
      // quiet fail
    }
  };

  // Fetch data based on tab and viewTrash
  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === "items") {
        const res = viewTrash
          ? await ConcessionService.getTrashItems(page, pageSize)
          : await ConcessionService.getAllAdminItems(page, pageSize);
        const list = extractArray<ConcessionItemResponse>(res);
        setItems(list);
        setTotalPages(res?.totalPages || 1);
        setTotalElements(res?.totalElements || list.length);
      } else {
        const res = viewTrash
          ? await ConcessionService.getTrashCategories(page, pageSize)
          : await ConcessionService.getAllCategories(page, pageSize);
        const list = extractArray<ConcessionCategoryResponse>(res);
        setCategories(list);
        setTotalPages(res?.totalPages || 1);
        setTotalElements(res?.totalElements || list.length);
      }
      setSelectedIds([]);
    } catch {
      showToast("Failed to load records from server.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDropdownCategories();
  }, []);

  useEffect(() => {
    setPage(0);
    setViewTrash(false);
  }, [activeTab]);

  useEffect(() => {
    fetchData();
  }, [page, viewTrash, activeTab]);

  // Selection handlers
  const handleToggleSelectOne = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    );
  };

  const handleSelectAllCurrentPage = () => {
    const currentList = activeTab === "items" ? items : categories;
    if (currentList.every((item) => selectedIds.includes(item.id))) {
      setSelectedIds([]);
    } else {
      setSelectedIds(currentList.map((item) => item.id));
    }
  };

  // ================= ITEM MODAL ACTIONS =================
  const openItemModal = (item?: ConcessionItemResponse) => {
    setErrors({});
    setImageFile(null);
    if (item) {
      setEditingItem(item);
      setImagePreview(item.imageUrl || null);
      setItemForm({
        name: item.name,
        description: item.description || "",
        price: item.price,
        categoryId: item.categoryId,
        active: item.active,
      });
    } else {
      setEditingItem(null);
      setImagePreview(null);
      setItemForm({
        name: "",
        description: "",
        price: 5.0,
        categoryId:
          dropdownCategories.length > 0 ? dropdownCategories[0].id : 0,
        active: true,
      });
    }
    setIsItemModalOpen(true);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleItemSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!itemForm.name.trim()) {
      setErrors({ name: "Item name is required" });
      return;
    }
    if (!itemForm.categoryId) {
      setErrors({ categoryId: "Please select a category" });
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append(
        "data",
        new Blob(
          [
            JSON.stringify({
              name: itemForm.name.trim(),
              description: itemForm.description.trim(),
              price: itemForm.price,
              categoryId: itemForm.categoryId,
              active: itemForm.active,
            }),
          ],
          { type: "application/json" },
        ),
      );
      if (imageFile) {
        formData.append("image", imageFile);
      }

      if (editingItem) {
        await ConcessionService.updateItem(editingItem.id, formData);
        showToast("Concession item updated successfully!", "success");
      } else {
        await ConcessionService.createItem(formData);
        showToast("Concession item created successfully!", "success");
      }

      setIsItemModalOpen(false);
      fetchData();
    } catch (err: any) {
      showToast(
        err.response?.data?.message || "Failed to save concession item.",
        "error",
      );
    } finally {
      setSubmitting(false);
    }
  };

  // ================= CATEGORY MODAL ACTIONS =================
  const openCatModal = (cat?: ConcessionCategoryResponse) => {
    setErrors({});
    if (cat) {
      setEditingCategory(cat);
      setCatForm({ name: cat.name, description: cat.description || "" });
    } else {
      setEditingCategory(null);
      setCatForm({ name: "", description: "" });
    }
    setIsCatModalOpen(true);
  };

  const handleCatSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!catForm.name.trim()) {
      setErrors({ name: "Category name is required" });
      return;
    }

    setSubmitting(true);
    try {
      if (editingCategory) {
        await ConcessionService.updateCategory(editingCategory.id, catForm);
        showToast("Category updated successfully!", "success");
      } else {
        await ConcessionService.createCategory(catForm);
        showToast("Category created successfully!", "success");
      }

      setIsCatModalOpen(false);
      fetchData();
      loadDropdownCategories();
    } catch (err: any) {
      showToast(
        err.response?.data?.message || "Failed to save category.",
        "error",
      );
    } finally {
      setSubmitting(false);
    }
  };

  // ================= DELETION & RESTORE HANDLERS =================
  const handleDeleteRecord = (id: number, name: string) => {
    setConfirmDialog({
      isOpen: true,
      type: viewTrash ? "HARD_DELETE" : "SOFT_DELETE",
      targetName: name,
      action: async () => {
        if (activeTab === "items") {
          if (viewTrash) await ConcessionService.hardDeleteItem(id);
          else await ConcessionService.softDeleteItem(id);
        } else {
          if (viewTrash) await ConcessionService.hardDeleteCategory(id);
          else await ConcessionService.softDeleteCategory(id);
        }
        fetchData();
        loadDropdownCategories();
        showToast(
          viewTrash ? "Permanently deleted." : "Moved to trash.",
          "success",
        );
      },
    });
  };

  const handleRestoreRecord = (id: number, name: string) => {
    setConfirmDialog({
      isOpen: true,
      type: "RESTORE",
      targetName: name,
      action: async () => {
        if (activeTab === "items") {
          await ConcessionService.restoreItem(id);
        } else {
          await ConcessionService.restoreCategory(id);
        }
        fetchData();
        loadDropdownCategories();
        showToast(`"${name}" restored successfully.`, "success");
      },
    });
  };

  const currentList = activeTab === "items" ? items : categories;
  const allCurrentSelected =
    currentList.length > 0 &&
    currentList.every((i) => selectedIds.includes(i.id));

  // Style tokens
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
    ? "border-slate-300 bg-white shadow-2xl text-slate-900 ring-1 ring-slate-200"
    : "border-slate-800 bg-slate-900 shadow-2xl text-slate-100";
  const textPrimary = isLight
    ? "text-slate-900 font-black"
    : "text-white font-black";
  const textSecondary = isLight
    ? "text-slate-700 font-bold"
    : "text-slate-400 font-medium";
  const borderCol = isLight ? "border-slate-300" : "border-slate-800";

  return (
    <div
      className={`min-h-screen py-6 px-4 sm:px-8 lg:px-10 w-full space-y-6 transition-colors duration-300 pb-24 ${pageClass}`}
    >
      <Toast
        message={toast.message}
        type={toast.type}
        duration={3500}
        onClose={() => setToast((prev) => ({ ...prev, message: null }))}
      />

      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        type={confirmDialog.type}
        targetName={confirmDialog.targetName}
        onConfirm={async () => {
          try {
            await confirmDialog.action();
            setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
          } catch (err: any) {
            showToast(err.response?.data?.message || "Action failed.", "error");
            setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
          }
        }}
        onCancel={() =>
          setConfirmDialog((prev) => ({ ...prev, isOpen: false }))
        }
      />

      {/* Header */}
      <div
        className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b ${borderCol} pb-5`}
      >
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-500 shrink-0">
            <Coffee className="h-5 w-5" />
          </div>
          <div>
            <h1
              className={`text-xl sm:text-2xl font-black tracking-tight ${textPrimary} flex items-center gap-2`}
            >
              Food & Beverage Concessions
              <span
                className={`text-[10px] font-black px-2 py-0.5 rounded-full ${isLight ? "bg-white text-slate-800 border-slate-300 shadow-sm" : "bg-slate-800 text-slate-400 border-slate-700"} border`}
              >
                {totalElements} Total
              </span>
            </h1>
            <p className={`text-xs ${textSecondary} mt-0.5`}>
              Manage snack categories and menu items for customer pre-orders
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => {
              setViewTrash(!viewTrash);
              setPage(0);
            }}
            className={`flex items-center gap-2 rounded-xl px-3.5 py-2.5 text-xs font-bold transition cursor-pointer border shadow-sm ${
              viewTrash
                ? "bg-amber-500/10 border-amber-500/30 text-amber-500"
                : isLight
                  ? "bg-white border-slate-300 text-slate-700 hover:bg-slate-50"
                  : "bg-slate-900 border-slate-800 text-slate-400 hover:text-white"
            }`}
          >
            <Archive className="h-4 w-4" />
            <span>{viewTrash ? "Back to Active" : "Trash Bin"}</span>
          </button>

          {!viewTrash && (
            <button
              onClick={() =>
                activeTab === "items" ? openItemModal() : openCatModal()
              }
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-red-600 px-4 py-2.5 text-xs font-bold text-slate-950 shadow-lg shadow-amber-500/25 hover:from-amber-400 hover:to-red-500 transition cursor-pointer"
            >
              <Plus className="h-4 w-4 stroke-[3]" />
              <span>
                {activeTab === "items"
                  ? "Add New F&B Item"
                  : "Add New Category"}
              </span>
            </button>
          )}
        </div>
      </div>

      {/* Tabs Switcher */}
      <div className="flex items-center gap-2 border-b border-slate-800/40 pb-3">
        <button
          onClick={() => setActiveTab("items")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
            activeTab === "items"
              ? "bg-amber-500/15 text-amber-500 border border-amber-500/30 shadow-sm"
              : isLight
                ? "text-slate-600 hover:bg-slate-200"
                : "text-slate-400 hover:bg-slate-800"
          }`}
        >
          <Coffee className="h-4 w-4" />
          <span>Menu Items</span>
        </button>

        <button
          onClick={() => setActiveTab("categories")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
            activeTab === "categories"
              ? "bg-amber-500/15 text-amber-500 border border-amber-500/30 shadow-sm"
              : isLight
                ? "text-slate-600 hover:bg-slate-200"
                : "text-slate-400 hover:bg-slate-800"
          }`}
        >
          <Layers className="h-4 w-4" />
          <span>Categories ({categories.length})</span>
        </button>
      </div>

      {/* Table Section */}
      {loading ? (
        <div className="flex min-h-[36vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
        </div>
      ) : currentList.length > 0 ? (
        <div
          className={`rounded-3xl border ${cardClass} overflow-hidden shadow-xl backdrop-blur-md relative`}
        >
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr
                  className={`border-b ${borderCol} ${isLight ? "bg-slate-100 text-slate-700" : "bg-slate-950/60 text-slate-400"} text-[11px] font-black uppercase tracking-wider`}
                >
                  <th className="py-3.5 px-4 w-12 text-center">
                    <button
                      type="button"
                      onClick={handleSelectAllCurrentPage}
                      className={`h-5 w-5 mx-auto rounded-lg border flex items-center justify-center transition cursor-pointer ${
                        allCurrentSelected
                          ? "bg-amber-500 border-amber-600 text-slate-950 shadow-md"
                          : `${isLight ? "border-slate-300 bg-white" : "border-slate-700 bg-slate-900"} text-transparent`
                      }`}
                    >
                      <Check className="h-3.5 w-3.5 stroke-[3]" />
                    </button>
                  </th>

                  {activeTab === "items" ? (
                    <>
                      <th className="py-3.5 px-4">Item Name</th>
                      <th className="py-3.5 px-4">Category</th>
                      <th className="py-3.5 px-4">Description</th>
                      <th className="py-3.5 px-4">Price</th>
                      <th className="py-3.5 px-4">Status</th>
                    </>
                  ) : (
                    <>
                      <th className="py-3.5 px-4">Category Name</th>
                      <th className="py-3.5 px-4">Description</th>
                      <th className="py-3.5 px-4">Linked Items</th>
                    </>
                  )}

                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody
                className={`divide-y ${isLight ? "divide-slate-200 text-slate-900 font-medium" : "divide-slate-800/60 text-slate-300"} text-xs`}
              >
                {activeTab === "items"
                  ? (items as ConcessionItemResponse[]).map((item) => {
                      const isChecked = selectedIds.includes(item.id);
                      return (
                        <tr
                          key={item.id}
                          className={`transition ${isChecked ? (isLight ? "bg-amber-50" : "bg-amber-950/25") : isLight ? "hover:bg-slate-100/70" : "hover:bg-slate-800/40"}`}
                        >
                          <td className="py-3 px-4 text-center">
                            <button
                              type="button"
                              onClick={() => handleToggleSelectOne(item.id)}
                              className={`h-5 w-5 mx-auto rounded-lg border flex items-center justify-center transition cursor-pointer ${
                                isChecked
                                  ? "bg-amber-500 border-amber-600 text-slate-950 shadow-md"
                                  : `${isLight ? "border-slate-300 bg-white" : "border-slate-700 bg-slate-900"} text-transparent`
                              }`}
                            >
                              <Check className="h-3.5 w-3.5 stroke-[3]" />
                            </button>
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 rounded-xl bg-slate-800/50 border border-slate-700 flex items-center justify-center shrink-0 overflow-hidden">
                                {item.imageUrl ? (
                                  <img
                                    src={item.imageUrl}
                                    alt={item.name}
                                    className="h-full w-full object-cover"
                                  />
                                ) : (
                                  <Coffee className="h-5 w-5 text-slate-500" />
                                )}
                              </div>
                              <p
                                className={`font-black ${textPrimary} text-sm`}
                              >
                                {item.name}
                              </p>
                            </div>
                          </td>
                          <td className="py-3.5 px-4">
                            <span
                              className={`px-2 py-0.5 rounded-md text-[10px] font-black border ${isLight ? "bg-slate-200 text-slate-800 border-slate-300" : "bg-slate-800 text-slate-300 border-slate-700"}`}
                            >
                              {item.categoryName}
                            </span>
                          </td>
                          <td
                            className={`py-3.5 px-4 ${textSecondary} max-w-xs truncate`}
                          >
                            {item.description || "No description"}
                          </td>
                          <td className="py-3.5 px-4 font-mono font-black text-amber-500">
                            ${item.price.toFixed(2)}
                          </td>
                          <td className="py-3.5 px-4">
                            <span
                              className={`px-2 py-0.5 rounded-md text-[10px] font-black border ${item.active ? "bg-emerald-500/15 text-emerald-500 border-emerald-500/30" : "bg-slate-500/15 text-slate-400 border-slate-500/30"}`}
                            >
                              {item.active ? "Active" : "Hidden"}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {!viewTrash ? (
                                <>
                                  <button
                                    onClick={() => openItemModal(item)}
                                    className={`p-2 rounded-xl ${isLight ? "text-slate-700 hover:bg-slate-200 border-slate-300" : "text-slate-400 hover:text-white hover:bg-slate-800 border-slate-700"} transition cursor-pointer border shadow-sm`}
                                    title="Edit Item"
                                  >
                                    <Edit3 className="h-4 w-4" />
                                  </button>
                                  <button
                                    onClick={() =>
                                      handleDeleteRecord(item.id, item.name)
                                    }
                                    className="p-2 rounded-xl text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 transition cursor-pointer border border-transparent hover:border-rose-500/20"
                                    title="Move to Trash"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button
                                    onClick={() =>
                                      handleRestoreRecord(item.id, item.name)
                                    }
                                    className="p-2 rounded-xl text-emerald-500 hover:text-emerald-600 hover:bg-emerald-500/10 transition cursor-pointer border border-transparent"
                                    title="Restore"
                                  >
                                    <RotateCcw className="h-4 w-4" />
                                  </button>
                                  <button
                                    onClick={() =>
                                      handleDeleteRecord(item.id, item.name)
                                    }
                                    className="p-2 rounded-xl text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 transition cursor-pointer border border-transparent"
                                    title="Delete Permanently"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  : (categories as ConcessionCategoryResponse[]).map((cat) => {
                      const isChecked = selectedIds.includes(cat.id);
                      return (
                        <tr
                          key={cat.id}
                          className={`transition ${isChecked ? (isLight ? "bg-amber-50" : "bg-amber-950/25") : isLight ? "hover:bg-slate-100/70" : "hover:bg-slate-800/40"}`}
                        >
                          <td className="py-3 px-4 text-center">
                            <button
                              type="button"
                              onClick={() => handleToggleSelectOne(cat.id)}
                              className={`h-5 w-5 mx-auto rounded-lg border flex items-center justify-center transition cursor-pointer ${
                                isChecked
                                  ? "bg-amber-500 border-amber-600 text-slate-950 shadow-md"
                                  : `${isLight ? "border-slate-300 bg-white" : "border-slate-700 bg-slate-900"} text-transparent`
                              }`}
                            >
                              <Check className="h-3.5 w-3.5 stroke-[3]" />
                            </button>
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-2">
                              <Tag className="h-4 w-4 text-amber-500" />
                              <p
                                className={`font-black ${textPrimary} text-sm`}
                              >
                                {cat.name}
                              </p>
                            </div>
                          </td>
                          <td
                            className={`py-3.5 px-4 ${textSecondary} max-w-sm truncate`}
                          >
                            {cat.description || "No description"}
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="font-mono font-bold text-amber-500">
                              {cat.itemCount} items
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {!viewTrash ? (
                                <>
                                  <button
                                    onClick={() => openCatModal(cat)}
                                    className={`p-2 rounded-xl ${isLight ? "text-slate-700 hover:bg-slate-200 border-slate-300" : "text-slate-400 hover:text-white hover:bg-slate-800 border-slate-700"} transition cursor-pointer border shadow-sm`}
                                    title="Edit Category"
                                  >
                                    <Edit3 className="h-4 w-4" />
                                  </button>
                                  <button
                                    onClick={() =>
                                      handleDeleteRecord(cat.id, cat.name)
                                    }
                                    className="p-2 rounded-xl text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 transition cursor-pointer border border-transparent hover:border-rose-500/20"
                                    title="Move to Trash"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button
                                    onClick={() =>
                                      handleRestoreRecord(cat.id, cat.name)
                                    }
                                    className="p-2 rounded-xl text-emerald-500 hover:text-emerald-600 hover:bg-emerald-500/10 transition cursor-pointer border border-transparent"
                                    title="Restore"
                                  >
                                    <RotateCcw className="h-4 w-4" />
                                  </button>
                                  <button
                                    onClick={() =>
                                      handleDeleteRecord(cat.id, cat.name)
                                    }
                                    className="p-2 rounded-xl text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 transition cursor-pointer border border-transparent"
                                    title="Delete Permanently"
                                  >
                                    <Trash2 className="h-4 w-4" />
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
          className={`flex min-h-[30vh] flex-col items-center justify-center rounded-3xl border ${cardClass} p-8 text-center text-xs space-y-2`}
        >
          <Coffee className="h-10 w-10 text-slate-500 mb-1" />
          <p className={`font-black ${textPrimary}`}>
            No records found in {activeTab}.
          </p>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div
          className={`flex flex-col sm:flex-row items-center justify-between border-t ${borderCol} pt-4 text-xs gap-3`}
        >
          <span className={textSecondary}>
            Page <span className={`font-black ${textPrimary}`}>{page + 1}</span>{" "}
            of <span className={`font-black ${textPrimary}`}>{totalPages}</span>{" "}
            ({totalElements} items)
          </span>

          <div className="flex items-center gap-1.5 flex-wrap justify-center">
            <button
              onClick={() => setPage(0)}
              disabled={page === 0}
              className={`p-2 rounded-xl border ${borderCol} ${isLight ? "bg-white text-slate-800" : "bg-slate-900 text-slate-400"} disabled:opacity-30 transition cursor-pointer`}
            >
              <ChevronsLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => setPage((p) => Math.max(p - 1, 0))}
              disabled={page === 0}
              className={`flex items-center gap-1 px-3 py-2 rounded-xl border ${borderCol} ${isLight ? "bg-white text-slate-800" : "bg-slate-900 text-slate-300"} disabled:opacity-30 transition cursor-pointer`}
            >
              <ChevronLeft className="h-4 w-4" />
              <span>Prev</span>
            </button>
            <button
              onClick={() => setPage((p) => Math.min(p + 1, totalPages - 1))}
              disabled={page >= totalPages - 1}
              className={`flex items-center gap-1 px-3 py-2 rounded-xl border ${borderCol} ${isLight ? "bg-white text-slate-800" : "bg-slate-900 text-slate-300"} disabled:opacity-30 transition cursor-pointer`}
            >
              <span>Next</span>
              <ChevronRight className="h-4 w-4" />
            </button>
            <button
              onClick={() => setPage(totalPages - 1)}
              disabled={page >= totalPages - 1}
              className={`p-2 rounded-xl border ${borderCol} ${isLight ? "bg-white text-slate-800" : "bg-slate-900 text-slate-400"} disabled:opacity-30 transition cursor-pointer`}
            >
              <ChevronsRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* ================= MODAL: ADD/EDIT ITEM ================= */}
      {isItemModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm overflow-y-auto">
          <div
            className={`relative w-full max-w-lg rounded-3xl border p-6 sm:p-8 shadow-2xl space-y-5 my-8 ${modalBgClass}`}
          >
            <button
              onClick={() => setIsItemModalOpen(false)}
              className="absolute right-5 top-5 text-slate-400 hover:text-white cursor-pointer p-1 rounded-lg transition"
            >
              <X className="h-5 w-5" />
            </button>

            <div className={`border-b ${borderCol} pb-3`}>
              <h2
                className={`text-base sm:text-lg ${textPrimary} flex items-center gap-2`}
              >
                <Sparkles className="h-4 w-4 text-amber-500" />
                {editingItem ? "Edit F&B Item" : "Create New F&B Item"}
              </h2>
            </div>

            <form
              onSubmit={handleItemSubmit}
              noValidate
              className="space-y-4 text-xs"
            >
              <div>
                <label className={`block mb-1 font-bold ${textSecondary}`}>
                  Item Name *
                </label>
                <input
                  type="text"
                  value={itemForm.name}
                  onChange={(e) =>
                    setItemForm({ ...itemForm, name: e.target.value })
                  }
                  placeholder="e.g. Combo 1 (Popcorn + Drink)"
                  className={`w-full rounded-xl border ${inputClass} p-3 outline-none`}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={`block mb-1 font-bold ${textSecondary}`}>
                    Category *
                  </label>
                  <select
                    value={itemForm.categoryId}
                    onChange={(e) =>
                      setItemForm({
                        ...itemForm,
                        categoryId: Number(e.target.value),
                      })
                    }
                    className={`w-full rounded-xl border ${inputClass} p-3 outline-none cursor-pointer`}
                  >
                    <option value={0} disabled>
                      Select Category
                    </option>
                    {dropdownCategories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className={`block mb-1 font-bold ${textSecondary}`}>
                    Price ($) *
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    value={itemForm.price}
                    onChange={(e) =>
                      setItemForm({
                        ...itemForm,
                        price: Number(e.target.value),
                      })
                    }
                    className={`w-full rounded-xl border ${inputClass} p-3 outline-none font-mono`}
                  />
                </div>
              </div>

              <div>
                <label className={`block mb-1 font-bold ${textSecondary}`}>
                  Description
                </label>
                <textarea
                  rows={2}
                  value={itemForm.description}
                  onChange={(e) =>
                    setItemForm({ ...itemForm, description: e.target.value })
                  }
                  placeholder="Describe combo items..."
                  className={`w-full rounded-xl border ${inputClass} p-3 outline-none resize-none`}
                />
              </div>

              <div>
                <label className={`block mb-1 font-bold ${textSecondary}`}>
                  Combo Image (Upload File)
                </label>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className={`relative h-24 w-full rounded-xl border-2 border-dashed ${isLight ? "border-slate-300 bg-slate-50" : "border-slate-700 bg-slate-950"} flex flex-col items-center justify-center cursor-pointer overflow-hidden group`}
                >
                  {imagePreview ? (
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex items-center gap-2 text-slate-500">
                      <UploadCloud className="h-5 w-5" />
                      <span>Click to upload combo poster</span>
                    </div>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="activeStatus"
                  checked={itemForm.active}
                  onChange={(e) =>
                    setItemForm({ ...itemForm, active: e.target.checked })
                  }
                  className="h-4 w-4 rounded border-slate-700 text-amber-500 accent-amber-500 cursor-pointer"
                />
                <label
                  htmlFor="activeStatus"
                  className={`font-bold cursor-pointer ${textSecondary}`}
                >
                  Active (Visible to customers during checkout)
                </label>
              </div>

              <div
                className={`flex justify-end gap-2.5 pt-3 border-t ${borderCol}`}
              >
                <button
                  type="button"
                  onClick={() => setIsItemModalOpen(false)}
                  className={`rounded-xl border ${borderCol} px-4 py-2.5 text-xs font-bold cursor-pointer transition`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-red-600 px-5 py-2.5 text-xs font-bold text-slate-950 shadow-lg hover:from-amber-400 hover:to-red-500 disabled:opacity-50 cursor-pointer transition"
                >
                  {submitting && (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  )}
                  <span>{editingItem ? "Save Changes" : "Create Item"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: ADD/EDIT CATEGORY ================= */}
      {isCatModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm overflow-y-auto">
          <div
            className={`relative w-full max-w-md rounded-3xl border p-6 sm:p-8 shadow-2xl space-y-5 my-8 ${modalBgClass}`}
          >
            <button
              onClick={() => setIsCatModalOpen(false)}
              className="absolute right-5 top-5 text-slate-400 hover:text-white cursor-pointer p-1 rounded-lg transition"
            >
              <X className="h-5 w-5" />
            </button>

            <div className={`border-b ${borderCol} pb-3`}>
              <h2
                className={`text-base sm:text-lg ${textPrimary} flex items-center gap-2`}
              >
                <Layers className="h-4 w-4 text-amber-500" />
                {editingCategory ? "Edit Category" : "Create New Category"}
              </h2>
            </div>

            <form
              onSubmit={handleCatSubmit}
              noValidate
              className="space-y-4 text-xs"
            >
              <div>
                <label className={`block mb-1 font-bold ${textSecondary}`}>
                  Category Name *
                </label>
                <input
                  type="text"
                  value={catForm.name}
                  onChange={(e) =>
                    setCatForm({ ...catForm, name: e.target.value })
                  }
                  placeholder="e.g. Combos, Popcorn, Drinks"
                  className={`w-full rounded-xl border ${inputClass} p-3 outline-none`}
                />
                {errors.name && (
                  <p className="mt-1 text-[11px] text-rose-500">
                    {errors.name}
                  </p>
                )}
              </div>

              <div>
                <label className={`block mb-1 font-bold ${textSecondary}`}>
                  Description
                </label>
                <textarea
                  rows={2}
                  value={catForm.description}
                  onChange={(e) =>
                    setCatForm({ ...catForm, description: e.target.value })
                  }
                  placeholder="Category description..."
                  className={`w-full rounded-xl border ${inputClass} p-3 outline-none resize-none`}
                />
              </div>

              <div
                className={`flex justify-end gap-2.5 pt-3 border-t ${borderCol}`}
              >
                <button
                  type="button"
                  onClick={() => setIsCatModalOpen(false)}
                  className={`rounded-xl border ${borderCol} px-4 py-2.5 text-xs font-bold cursor-pointer transition`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-red-600 px-5 py-2.5 text-xs font-bold text-slate-950 shadow-lg hover:from-amber-400 hover:to-red-500 disabled:opacity-50 cursor-pointer transition"
                >
                  {submitting && (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  )}
                  <span>
                    {editingCategory ? "Save Category" : "Create Category"}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
