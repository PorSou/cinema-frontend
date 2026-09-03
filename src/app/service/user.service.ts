import api from "@/app/lib/api";
import {
  ApiResponse,
  UserResponse,
  CreateStaffRequest,
  UserUpdateRequest,
} from "@/app/types/api.types";

export const UserService = {
  // 1. Get only active users (isDeleted == false)
  getAllUsers: async (): Promise<UserResponse[]> => {
    const res = await api.get<ApiResponse<UserResponse[]>>("/users");
    return res.data?.body?.data || [];
  },

  // 2. Get only deleted users in trash (isDeleted == true)
  getTrashUsers: async (): Promise<UserResponse[]> => {
    const res = await api.get<ApiResponse<UserResponse[]>>("/users/trash");
    return res.data?.body?.data || [];
  },

  // 3. Create staff or user
  createStaff: async (data: CreateStaffRequest): Promise<UserResponse> => {
    const res = await api.post<ApiResponse<UserResponse>>("/users/staff", data);
    return res.data?.body?.data;
  },

  // 4. Update user
  updateUser: async (id: number, data: UserUpdateRequest): Promise<UserResponse> => {
    const res = await api.put<ApiResponse<UserResponse>>(`/users/${id}`, data);
    return res.data?.body?.data;
  },

  // 5. Toggle active status
  toggleUserStatus: async (id: number): Promise<UserResponse> => {
    const res = await api.patch<ApiResponse<UserResponse>>(`/users/${id}/toggle-status`);
    return res.data?.body?.data;
  },

  // 6. Soft Delete (moves user to trash)
  softDeleteUser: async (id: number): Promise<void> => {
    await api.delete<ApiResponse<void>>(`/users/${id}`);
  },

  // 7. Restore user (moves user back to active)
  restoreUser: async (id: number): Promise<UserResponse> => {
    const res = await api.put<ApiResponse<UserResponse>>(`/users/${id}/restore`, {});
    return res.data?.body?.data;
  },

  // 8. Hard Delete (permanent purge from database)
  hardDeleteUser: async (id: number): Promise<void> => {
    await api.delete<ApiResponse<void>>(`/users/${id}/hard`);
  },
};  

export default UserService;