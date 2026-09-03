import {
  MovieResponse,
  MovieStatus,
  MovieLanguage,
  PageResponse,
} from "@/app/types/api.types";
import api from "../lib/api";

const extractData = (res: any) =>
  res.data?.body?.data || res.data?.data || res.data;

export interface MovieQueryParams {
  status?: MovieStatus | null;
  language?: MovieLanguage | null;
  genreId?: number | null;
  search?: string;
  page?: number;
  size?: number;
  sortBy?: string;
  direction?: "asc" | "desc";
}

export const MovieService = {
  async getAllMovies(params: MovieQueryParams = {}): Promise<PageResponse<MovieResponse>> {
    const {
      status,
      language,
      genreId,
      search,
      page = 0,
      size = 10,
      sortBy = "createdAt",
      direction = "desc",
    } = params;

    const res = await api.get("/movies", {
      params: {
        status: status || undefined,
        language: language || undefined,
        genreId: genreId || undefined,
        search: search ? search.trim() : undefined,
        page,
        size,
        sortBy,
        direction,
      },
    });
    return extractData(res);
  },

  async getTrashMovies(
    search?: string,
    page: number = 0,
    size: number = 10,
    sortBy: string = "updatedAt",
    direction: "asc" | "desc" = "desc"
  ): Promise<PageResponse<MovieResponse>> {
    const res = await api.get("/movies/trash", {
      params: {
        search: search ? search.trim() : undefined,
        page,
        size,
        sortBy,
        direction,
      },
    });
    return extractData(res);
  },

  async getMovieById(id: number): Promise<MovieResponse> {
    const res = await api.get(`/movies/${id}`);
    return extractData(res);
  },

  async createMovie(formData: FormData): Promise<MovieResponse> {
    const res = await api.post("/movies", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return extractData(res);
  },

  async updateMovie(id: number, formData: FormData): Promise<MovieResponse> {
    const res = await api.put(`/movies/${id}`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return extractData(res);
  },

  async softDeleteMovie(id: number): Promise<void> {
    await api.delete(`/movies/${id}`);
  },

  async hardDeleteMovie(id: number): Promise<void> {
    await api.delete(`/movies/${id}/hard`);
  },

  async restoreMovie(id: number): Promise<MovieResponse> {
    const res = await api.put(`/movies/${id}/restore`);
    return extractData(res);
  },
};

export default MovieService;