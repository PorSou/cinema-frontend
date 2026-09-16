import api from "../lib/api";
import { PageResponse } from "@/app/types/api.types";

// Safe extraction helper that avoids 'never' type inference
const extractData = (res: any): any => {
  return res?.data?.body?.data ?? res?.data?.data ?? res?.data ?? res;
};

export interface ConcessionCategoryResponse {
  id: number;
  name: string;
  description: string;
  itemCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ConcessionItemResponse {
  id: number;
  name: string;
  description: string;
  price: number;
  imageUrl: string;
  active: boolean;
  categoryId: number;
  categoryName: string;
  createdAt: string;
  updatedAt: string;
}

export const ConcessionService = {
  // ================= CATEGORIES =================
  async getAllCategories(
    page = 0,
    size = 10,
    sortBy = "createdAt",
    direction = "desc",
  ): Promise<PageResponse<ConcessionCategoryResponse>> {
    const res = await api.get("/concession-categories", {
      params: { page, size, sortBy, direction },
    });
    return extractData(res);
  },

  async getActiveCategoriesList(): Promise<ConcessionCategoryResponse[]> {
    const res = await api.get("/concession-categories/list");
    return extractData(res);
  },

  async getTrashCategories(
    page = 0,
    size = 10,
  ): Promise<PageResponse<ConcessionCategoryResponse>> {
    const res = await api.get("/concession-categories/trash", {
      params: { page, size },
    });
    return extractData(res);
  },

  async createCategory(data: {
    name: string;
    description?: string;
  }): Promise<ConcessionCategoryResponse> {
    const res = await api.post("/concession-categories", data);
    return extractData(res);
  },

  async updateCategory(
    id: number,
    data: { name: string; description?: string },
  ): Promise<ConcessionCategoryResponse> {
    const res = await api.put(`/concession-categories/${id}`, data);
    return extractData(res);
  },

  async softDeleteCategory(id: number): Promise<void> {
    await api.delete(`/concession-categories/${id}`);
  },

  async restoreCategory(id: number): Promise<ConcessionCategoryResponse> {
    const res = await api.put(`/concession-categories/${id}/restore`);
    return extractData(res);
  },

  async hardDeleteCategory(id: number): Promise<void> {
    await api.delete(`/concession-categories/${id}/hard`);
  },

  // ================= CONCESSION ITEMS =================
  async getAllAdminItems(
    page = 0,
    size = 10,
    sortBy = "createdAt",
    direction = "desc",
  ): Promise<PageResponse<ConcessionItemResponse>> {
    const res = await api.get("/concessions/admin", {
      params: { page, size, sortBy, direction },
    });
    return extractData(res);
  },

  async getTrashItems(
    page = 0,
    size = 10,
  ): Promise<PageResponse<ConcessionItemResponse>> {
    const res = await api.get("/concessions/trash", { params: { page, size } });
    return extractData(res);
  },

  async createItem(formData: FormData): Promise<ConcessionItemResponse> {
    const res = await api.post("/concessions", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return extractData(res);
  },

  async updateItem(
    id: number,
    formData: FormData,
  ): Promise<ConcessionItemResponse> {
    const res = await api.put(`/concessions/${id}`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return extractData(res);
  },

  async softDeleteItem(id: number): Promise<void> {
    await api.delete(`/concessions/${id}`);
  },

  async restoreItem(id: number): Promise<ConcessionItemResponse> {
    const res = await api.put(`/concessions/${id}/restore`);
    return extractData(res);
  },

  async hardDeleteItem(id: number): Promise<void> {
    await api.delete(`/concessions/${id}/hard`);
  },
};

export default ConcessionService;
