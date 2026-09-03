import api from "../lib/api";
import { PageResponse, ShowtimeRequest, ShowtimeResponse } from "@/app/types/api.types";

const extractData = (res: any) =>
  res.data?.body?.data || res.data?.data || res.data;

export const ShowtimeService = {
  async getAllShowtimes(
    page = 0,
    size = 10,
    sortBy: string = "startTime",
    direction: "asc" | "desc" = "asc"
  ): Promise<PageResponse<ShowtimeResponse>> {
    const res = await api.get(`/showtimes`, {
      params: { page, size, sortBy, direction },
    });
    return extractData(res);
  },

  async getTrashShowtimes(page = 0, size = 10): Promise<PageResponse<ShowtimeResponse>> {
    const res = await api.get(`/showtimes/trash`, {
      params: { page, size },
    });
    return extractData(res);
  },

  async getShowtimeById(id: number): Promise<ShowtimeResponse> {
    const res = await api.get(`/showtimes/${id}`);
    return extractData(res);
  },

  async getShowtimesByMovie(movieId: number): Promise<ShowtimeResponse[]> {
    const res = await api.get(`/showtimes/movie/${movieId}`);
    return extractData(res);
  },

  async getShowtimesByHall(hallId: number): Promise<ShowtimeResponse[]> {
    const res = await api.get(`/showtimes/hall/${hallId}`);
    return extractData(res);
  },

  async createShowtime(data: ShowtimeRequest): Promise<ShowtimeResponse> {
    const res = await api.post("/showtimes", data);
    return extractData(res);
  },

  // Batch creation method matching the Spring Boot /batch endpoint
  async createBatchShowtimes(dataList: ShowtimeRequest[]): Promise<ShowtimeResponse[]> {
    const res = await api.post("/showtimes/batch", dataList);
    return extractData(res);
  },

  async updateShowtime(id: number, data: ShowtimeRequest): Promise<ShowtimeResponse> {
    const res = await api.put(`/showtimes/${id}`, data);
    return extractData(res);
  },

  async softDeleteShowtime(id: number): Promise<void> {
    await api.delete(`/showtimes/${id}`);
  },

  async hardDeleteShowtime(id: number): Promise<void> {
    await api.delete(`/showtimes/${id}/hard`);
  },

  async restoreShowtime(id: number): Promise<ShowtimeResponse> {
    const res = await api.put(`/showtimes/${id}/restore`);
    return extractData(res);
  },
};

export default ShowtimeService;