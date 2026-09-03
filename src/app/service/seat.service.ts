
import {
  SeatResponse,
  SeatRequest,
  BulkSeatGenerateRequest,
  BatchSeatCreateRequest,
  PageResponse,
} from "@/app/types/api.types";
import api from "../lib/api";

export const SeatService = {
  // Save custom dynamic layout in 1 atomic transaction
  async saveBatchSeats(payload: BatchSeatCreateRequest): Promise<SeatResponse[]> {
    const res = await api.post("/seats/batch", payload);
    return res.data?.body?.data || res.data?.data || res.data || [];
  },

  async createSeat(payload: SeatRequest): Promise<SeatResponse> {
    const res = await api.post("/seats", payload);
    return res.data?.body?.data || res.data?.data || res.data;
  },

  async generateBulkSeats(payload: BulkSeatGenerateRequest): Promise<SeatResponse[]> {
    const res = await api.post("/seats/bulk-generate", payload);
    return res.data?.body?.data || res.data?.data || res.data || [];
  },

  async getSeatById(id: number): Promise<SeatResponse> {
    const res = await api.get(`/seats/${id}`);
    return res.data?.body?.data || res.data?.data || res.data;
  },

  async getSeatsByHall(hallId: number): Promise<SeatResponse[]> {
    const res = await api.get(`/seats/hall/${hallId}`);
    return res.data?.body?.data || res.data?.data || res.data || [];
  },

  async getSeatsByHallPage(
    hallId: number,
    page: number = 0,
    size: number = 20,
    sortBy: string = "seatRow",
    direction: "asc" | "desc" = "asc"
  ): Promise<PageResponse<SeatResponse>> {
    const res = await api.get(`/seats/hall/${hallId}/page`, {
      params: { page, size, sortBy, direction },
    });
    return res.data?.body?.data || res.data?.data || res.data;
  },

  async updateSeat(id: number, payload: SeatRequest): Promise<SeatResponse> {
    const res = await api.put(`/seats/${id}`, payload);
    return res.data?.body?.data || res.data?.data || res.data;
  },

  async softDeleteSeat(id: number): Promise<void> {
    await api.delete(`/seats/${id}`);
  },

  async hardDeleteSeat(id: number): Promise<void> {
    await api.delete(`/seats/${id}/hard`);
  },

  async clearAllSeatsByHall(hallId: number): Promise<void> {
    await api.delete(`/seats/hall/${hallId}/clear`);
  },

  async restoreSeat(id: number): Promise<SeatResponse> {
    const res = await api.put(`/seats/${id}/restore`);
    return res.data?.body?.data || res.data?.data || res.data;
  },
};