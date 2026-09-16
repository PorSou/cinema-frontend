import api from "../lib/api";

export const FavoriteService = {
  async toggleFavorite(movieId: number): Promise<boolean> {
    const response = await api.post(`/api/v1/favorites/toggle/${movieId}`);
    return response.data?.data ?? response.data;
  },

  async getUserWatchlist(page = 0, size = 10): Promise<any> {
    const response = await api.get(
      `/api/v1/favorites?page=${page}&size=${size}`,
    );
    return response.data?.data ?? response.data;
  },

  async checkIsFavorited(movieId: number): Promise<boolean> {
    const response = await api.get(`/api/v1/favorites/check/${movieId}`);
    return response.data?.data ?? response.data;
  },

  async getMoviePopularity(page = 0, size = 10): Promise<any> {
    const response = await api.get(
      `/api/v1/admin/analytics/popularity?page=${page}&size=${size}`,
    );
    return response.data?.data ?? response.data;
  },
};
