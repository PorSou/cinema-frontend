import api from "@/app/lib/api";
import {
  ApiResponse,
  PaymentRequest,
  PaymentResponse,
  KhqrGenerateRequest,
  BakongCheckMd5Response,
} from "@/app/types/api.types";

export interface ConcessionSelectionRequest {
  concessionItemId: number;
  quantity: number;
}

export interface CashBookingRequest {
  showtimeId: number;
  seatIds: number[];
  concessions?: ConcessionSelectionRequest[];
  voucherCode?: string;
}

export const PaymentService = {
  getAllPayments: async (page = 0, size = 1000): Promise<PaymentResponse[]> => {
    const res = await api.get<ApiResponse<any>>(
      `/payments?page=${page}&size=${size}`,
    );
    const bodyData = res.data?.body?.data;
    if (Array.isArray(bodyData)) return bodyData;
    if (bodyData && Array.isArray(bodyData.content)) return bodyData.content;
    return [];
  },

  getPaymentById: async (id: number): Promise<PaymentResponse> => {
    const res = await api.get<ApiResponse<PaymentResponse>>(`/payments/${id}`);
    return res.data.body.data;
  },

  // 👇 CHANGED: returns null instead of throwing when no payment exists yet
  // for this booking (404). Callers should treat `null` as "not generated
  // yet" rather than an error state.
  getByBookingId: async (
    bookingId: number,
  ): Promise<PaymentResponse | null> => {
    try {
      const res = await api.get<ApiResponse<PaymentResponse>>(
        `/payments/booking/${bookingId}`,
      );
      return res.data.body.data;
    } catch (err: any) {
      if (err?.response?.status === 404) {
        return null;
      }
      throw err;
    }
  },

  generateKhqr: async (data: KhqrGenerateRequest): Promise<PaymentResponse> => {
    const res = await api.post<ApiResponse<PaymentResponse>>(
      "/payments/khqr/generate",
      data,
    );
    return res.data.body.data;
  },

  checkBakongMd5: async (
    identifier: string | { transactionId?: string; md5?: string },
  ): Promise<BakongCheckMd5Response> => {
    const payload =
      typeof identifier === "string"
        ? { transactionId: identifier }
        : identifier;
    const res = await api.post<ApiResponse<BakongCheckMd5Response>>(
      "/payments/khqr/check-md5",
      payload,
    );
    return res.data.body.data;
  },

  verifyBakongPayment: async (
    transactionId: string,
  ): Promise<PaymentResponse> => {
    const res = await api.post<ApiResponse<PaymentResponse>>(
      `/payments/verify-bakong/${transactionId}`,
    );
    return res.data.body.data;
  },

  payWithCash: async (
    data: PaymentRequest & { voucherCode?: string },
  ): Promise<PaymentResponse> => {
    const res = await api.post<ApiResponse<PaymentResponse>>(
      "/payments/cash",
      data,
    );
    return res.data.body.data;
  },

  bookAndPayCash: async (
    data: CashBookingRequest,
  ): Promise<PaymentResponse> => {
    const res = await api.post<ApiResponse<PaymentResponse>>(
      "/payments/cash-booking",
      data,
    );
    return res.data.body.data;
  },

  refundPayment: async (id: number): Promise<PaymentResponse> => {
    const res = await api.put<ApiResponse<PaymentResponse>>(
      `/payments/${id}/refund`,
    );
    return res.data.body.data;
  },
};

export default PaymentService;
