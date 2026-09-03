import api from "@/app/lib/api";
import {
  ApiResponse,
  PaymentRequest,
  PaymentResponse,
  KhqrGenerateRequest,
  BakongCheckMd5Response,
} from "@/app/types/api.types";

export const PaymentService = {
  getAllPayments: async (): Promise<PaymentResponse[]> => {
    const res = await api.get<ApiResponse<PaymentResponse[]>>("/payments");
    return res.data?.body?.data ?? [];
  },

  getPaymentById: async (id: number): Promise<PaymentResponse> => {
    const res = await api.get<ApiResponse<PaymentResponse>>(`/payments/${id}`);
    return res.data.body.data;
  },

  getByBookingId: async (bookingId: number): Promise<PaymentResponse> => {
    const res = await api.get<ApiResponse<PaymentResponse>>(`/payments/booking/${bookingId}`);
    return res.data.body.data;
  },

  generateKhqr: async (data: KhqrGenerateRequest): Promise<PaymentResponse> => {
    const res = await api.post<ApiResponse<PaymentResponse>>("/payments/khqr/generate", data);
    return res.data.body.data;
  },

  checkBakongMd5: async (identifier: string | { transactionId?: string; md5?: string }): Promise<BakongCheckMd5Response> => {
    const payload = typeof identifier === "string" ? { transactionId: identifier } : identifier;
    const res = await api.post<ApiResponse<BakongCheckMd5Response>>("/payments/khqr/check-md5", payload);
    return res.data.body.data;
  },

  verifyBakongPayment: async (transactionId: string): Promise<PaymentResponse> => {
    const res = await api.post<ApiResponse<PaymentResponse>>(`/payments/verify-bakong/${transactionId}`);
    return res.data.body.data;
  },

  // Added refund payment method for admin audit operations
  refundPayment: async (id: number): Promise<PaymentResponse> => {
    const res = await api.put<ApiResponse<PaymentResponse>>(`/payments/${id}/refund`);
    return res.data.body.data;
  },
};