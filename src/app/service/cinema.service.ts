import api from "@/app/lib/api";
import {
  ApiResponse,
  CinemaRequest,
  CinemaResponse,
  PageResponse,
} from "@/app/types/api.types";
import { HallService } from "./hall.service";

export const CinemaService = {
  getAllCinemas: async (page = 0, size = 50): Promise<CinemaResponse[]> => {
    const res = await api.get<
      ApiResponse<PageResponse<CinemaResponse> | CinemaResponse[]>
    >(`/cinemas?page=${page}&size=${size}`);
    const data = res.data?.body?.data;
    if (data && "content" in data) return data.content;
    return Array.isArray(data) ? data : [];
  },

  getTrashCinemas: async (page = 0, size = 50): Promise<CinemaResponse[]> => {
    const res = await api.get<
      ApiResponse<PageResponse<CinemaResponse> | CinemaResponse[]>
    >(`/cinemas/trash?page=${page}&size=${size}`);
    const data = res.data?.body?.data;
    if (data && "content" in data) return data.content;
    return Array.isArray(data) ? data : [];
  },

  getCinemaById: async (id: number): Promise<CinemaResponse> => {
    const res = await api.get<ApiResponse<CinemaResponse>>(`/cinemas/${id}`);
    return res.data?.body?.data;
  },

  createCinema: async (
    data: CinemaRequest,
    file?: File,
  ): Promise<CinemaResponse> => {
    const formData = new FormData();
    formData.append(
      "request",
      new Blob([JSON.stringify(data)], { type: "application/json" }),
    );
    if (file) {
      formData.append("file", file);
    }

    const res = await api.post<ApiResponse<CinemaResponse>>(
      "/cinemas",
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      },
    );
    return res.data?.body?.data;
  },

  updateCinema: async (
    id: number,
    data: CinemaRequest,
    file?: File,
  ): Promise<CinemaResponse> => {
    const formData = new FormData();
    formData.append(
      "request",
      new Blob([JSON.stringify(data)], { type: "application/json" }),
    );
    if (file) {
      formData.append("file", file);
    }

    const res = await api.put<ApiResponse<CinemaResponse>>(
      `/cinemas/${id}`,
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      },
    );
    return res.data?.body?.data;
  },

  softDeleteCinema: async (id: number): Promise<void> => {
    await api.delete<ApiResponse<void>>(`/cinemas/${id}`);
  },

  restoreCinema: async (id: number): Promise<CinemaResponse> => {
    const res = await api.put<ApiResponse<CinemaResponse>>(
      `/cinemas/${id}/restore`,
    );
    return res.data?.body?.data;
  },

  hardDeleteCinema: async (id: number): Promise<void> => {
    await api.delete<ApiResponse<void>>(`/cinemas/${id}/hard`);
  },
};

// Re-export HallService for cross-compatibility
export { HallService };
export default CinemaService;
