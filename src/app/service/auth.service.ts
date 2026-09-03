import api from "@/app/lib/api";
import {
  ApiResponse,
  AuthResponse,
  LoginRequest,
  RegisterRequest,
  VerifyOtpRequest,
  ForgotPasswordRequest,
  ResetPasswordRequest,
  UserResponse,
} from "@/app/types/api.types";

const AUTH_USER_KEY = "cinemax_user";
const ACCESS_TOKEN_KEY = "accessToken";
const REFRESH_TOKEN_KEY = "refreshToken";

const setCookie = (name: string, value: string, days = 7) => {
  if (typeof document === "undefined") return;
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
};

const deleteCookie = (name: string) => {
  if (typeof document === "undefined") return;
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; SameSite=Lax`;
};

export const AuthService = {
  login: async (credentials: LoginRequest): Promise<AuthResponse> => {
    const res = await api.post<ApiResponse<AuthResponse>>("/auth/login", credentials);
    const authData = res.data.body?.data || (res.data as any).data;

    if (authData?.accessToken) {
      localStorage.setItem(ACCESS_TOKEN_KEY, authData.accessToken);
      localStorage.setItem(REFRESH_TOKEN_KEY, authData.refreshToken || "");
      localStorage.setItem(AUTH_USER_KEY, JSON.stringify(authData.user));

      setCookie("accessToken", authData.accessToken);
      setCookie("userRole", authData.user?.role || "CUSTOMER");
    }
    return authData;
  },

  register: async (data: RegisterRequest): Promise<void> => {
    await api.post<ApiResponse<null>>("/auth/register", data);
  },

  verifyOtp: async (data: VerifyOtpRequest): Promise<AuthResponse> => {
    const res = await api.post<ApiResponse<AuthResponse>>("/auth/verify-otp", data);
    const authData = res.data.body?.data || (res.data as any).data;

    if (authData?.accessToken) {
      localStorage.setItem(ACCESS_TOKEN_KEY, authData.accessToken);
      localStorage.setItem(REFRESH_TOKEN_KEY, authData.refreshToken || "");
      localStorage.setItem(AUTH_USER_KEY, JSON.stringify(authData.user));

      setCookie("accessToken", authData.accessToken);
      setCookie("userRole", authData.user?.role || "CUSTOMER");
    }
    return authData;
  },

  resendOtp: async (email: string): Promise<void> => {
    await api.post<ApiResponse<null>>(`/auth/resend-otp?email=${encodeURIComponent(email)}`);
  },

  forgotPassword: async (data: ForgotPasswordRequest): Promise<void> => {
    await api.post<ApiResponse<null>>("/auth/forgot-password", data);
  },

  resetPassword: async (data: ResetPasswordRequest): Promise<void> => {
    await api.post<ApiResponse<null>>("/auth/reset-password", data);
  },

  getCurrentUser: (): UserResponse | null => {
    if (typeof window === "undefined") return null;
    const userStr = localStorage.getItem(AUTH_USER_KEY);
    if (!userStr) return null;
    try {
      return JSON.parse(userStr);
    } catch {
      return null;
    }
  },

  getAccessToken: (): string | null => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(ACCESS_TOKEN_KEY);
  },

  logout: () => {
    if (typeof window === "undefined") return;
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(AUTH_USER_KEY);

    deleteCookie("accessToken");
    deleteCookie("userRole");
  },
};

export default AuthService;