import {
  GenreResponse,
  GenreRequest,
  PageResponse,
} from "@/app/types/api.types";
import api from "../lib/api";

const extractData = (res: any) => res.data?.body?.data || res.data?.data || res.data;

export const GenreService = {
  async createGenre(payload: GenreRequest): Promise<GenreResponse> {
    const res = await api.post("/genres", payload);
    return extractData(res);
  },

  async getGenreById(id: number): Promise<GenreResponse> {
    const res = await api.get(`/genres/${id}`);
    return extractData(res);
  },

  async getAllGenres(
    page: number = 0,
    size: number = 10,
    sortBy: string = "createdAt",
    direction: "asc" | "desc" = "desc"
  ): Promise<PageResponse<GenreResponse>> {
    const res = await api.get("/genres", {
      params: { page, size, sortBy, direction },
    });
    return extractData(res);
  },

  async getActiveGenresList(): Promise<GenreResponse[]> {
    const res = await api.get("/genres/list");
    const data = extractData(res);
    return Array.isArray(data) ? data : [];
  },

  async getTrashGenres(
    page: number = 0,
    size: number = 10,
    sortBy: string = "updatedAt",
    direction: "asc" | "desc" = "desc"
  ): Promise<PageResponse<GenreResponse>> {
    const res = await api.get("/genres/trash", {
      params: { page, size, sortBy, direction },
    });
    return extractData(res);
  },

  async updateGenre(id: number, payload: GenreRequest): Promise<GenreResponse> {
    const res = await api.put(`/genres/${id}`, payload);
    return extractData(res);
  },

  async softDeleteGenre(id: number): Promise<void> {
    await api.delete(`/genres/${id}`);
  },

  async hardDeleteGenre(id: number): Promise<void> {
    await api.delete(`/genres/${id}/hard`);
  },

  async restoreGenre(id: number): Promise<GenreResponse> {
    const res = await api.put(`/genres/${id}/restore`);
    return extractData(res);
  },
};

export default GenreService;