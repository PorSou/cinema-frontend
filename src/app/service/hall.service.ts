import api from "@/app/lib/api";
import {
  ApiResponse,
  HallRequest,
  HallResponse,
  PageResponse,
} from "@/app/types/api.types";

export const HallService = {
  getHallsByCinema: async (cinemaId: number): Promise<HallResponse[]> => {
    const res = await api.get<ApiResponse<HallResponse[]>>(`/halls/cinema/${cinemaId}`);
    return res.data?.body?.data || [];
  },

  getTrashHallsByCinema: async (cinemaId: number): Promise<HallResponse[]> => {
    const res = await api.get<ApiResponse<HallResponse[]>>(`/halls/cinema/${cinemaId}/trash`);
    return res.data?.body?.data || [];
  },

  getHallById: async (id: number): Promise<HallResponse> => {
    const res = await api.get<ApiResponse<HallResponse>>(`/halls/${id}`);
    return res.data?.body?.data;
  },

  createHall: async (data: HallRequest): Promise<HallResponse> => {
    const res = await api.post<ApiResponse<HallResponse>>("/halls", data);
    return res.data?.body?.data;
  },

  updateHall: async (id: number, data: HallRequest): Promise<HallResponse> => {
    const res = await api.put<ApiResponse<HallResponse>>(`/halls/${id}`, data);
    return res.data?.body?.data;
  },

  softDeleteHall: async (id: number): Promise<void> => {
    await api.delete<ApiResponse<void>>(`/halls/${id}`);
  },

  restoreHall: async (id: number): Promise<HallResponse> => {
    const res = await api.put<ApiResponse<HallResponse>>(`/halls/${id}/restore`);
    return res.data?.body?.data;
  },

  hardDeleteHall: async (id: number): Promise<void> => {
    await api.delete<ApiResponse<void>>(`/halls/${id}/hard`);
  },
};

export default HallService;