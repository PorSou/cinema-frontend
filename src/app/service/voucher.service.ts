import api from "../lib/api";

export const VoucherService = {
  // --- Admin Endpoints ---
  async getAllVouchers(page = 0, size = 10): Promise<any> {
    const response = await api.get(`/admin/vouchers?page=${page}&size=${size}`);
    return response.data?.data ?? response.data;
  },

  async createVoucher(data: {
    code: string;
    discountType: "PERCENTAGE" | "FIXED";
    discountValue: number;
    minSpend?: number;
    expiryDate?: string;
    usageLimit?: number;
  }): Promise<any> {
    const response = await api.post("/admin/vouchers", data);
    return response.data?.data ?? response.data;
  },

  async toggleStatus(id: number): Promise<any> {
    const response = await api.patch(`/admin/vouchers/${id}/toggle-status`);
    return response.data?.data ?? response.data;
  },

  async deleteVoucher(id: number): Promise<any> {
    const response = await api.delete(`/admin/vouchers/${id}`);
    return response.data?.data ?? response.data;
  },

  // --- Customer Checkout Endpoint ---
  async applyVoucher(code: string, subtotal: number): Promise<any> {
    const response = await api.post("/vouchers/apply", { code, subtotal });
    return response.data?.data ?? response.data;
  },
};
