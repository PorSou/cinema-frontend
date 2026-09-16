import api from "../lib/api";

export const AdminReviewService = {
  async getAllReviews(page = 0, size = 10): Promise<any> {
    const response = await api.get(
      `/api/v1/admin/reviews?page=${page}&size=${size}`,
    );
    return response.data?.data ?? response.data;
  },

  async toggleHideReview(id: number): Promise<any> {
    const response = await api.patch(`/api/v1/admin/reviews/${id}/toggle-hide`);
    return response.data?.data ?? response.data;
  },

  async deleteReview(id: number): Promise<any> {
    const response = await api.delete(`/api/v1/admin/reviews/${id}`);
    return response.data?.data ?? response.data;
  },
};
