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
const USER_ROLE_KEY = "userRole";

// NOTE: adjust this to match your backend's real refresh-token route if it's
// not /auth/refresh — check your AuthController. Kept identical to the one
// in api.ts's response interceptor; if you change one, change both.
const REFRESH_ENDPOINT = "/auth/refresh";

export const AUTH_CHANGE_EVENT = "cinemax-auth-change";

const notifyAuthChange = () => {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(AUTH_CHANGE_EVENT));
};

// NEW: middleware.ts runs on the server/edge and can only read cookies —
// it has no access to sessionStorage at all. Without mirroring these two
// values into cookies, the middleware's `request.cookies.get("accessToken")`
// is always undefined, so every /admin/* request gets redirected back to
// /login even after a fully successful client-side login. These are
// session cookies (no max-age), matching the sessionStorage lifetime as
// closely as a cookie can.
const setCookie = (name: string, value: string) => {
  if (typeof document === "undefined") return;
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; SameSite=Lax${secure}`;
};

const clearCookie = (name: string) => {
  if (typeof document === "undefined") return;
  document.cookie = `${name}=; path=/; Max-Age=0; SameSite=Lax`;
};

// ---- proactive token refresh ----------------------------------------------
// The access token here is short-lived (~5-10 min). Relying only on a
// reactive "refresh after a 401" means the FIRST request after the token
// dies always fails once before quietly recovering — fine for background
// polling, but jarring for whatever the user just clicked. Decoding the
// token's own `exp` claim lets us refresh a little before it actually
// expires, so in practice the user never sees an expired token at all.
let refreshTimer: ReturnType<typeof setTimeout> | null = null;

const decodeJwtExp = (token: string): number | null => {
  try {
    const payload = token.split(".")[1];
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const json = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + c.charCodeAt(0).toString(16).padStart(2, "0"))
        .join(""),
    );
    const parsed = JSON.parse(json);
    return typeof parsed.exp === "number" ? parsed.exp : null;
  } catch {
    return null;
  }
};

const scheduleProactiveRefresh = (accessToken: string) => {
  if (typeof window === "undefined") return;
  if (refreshTimer) clearTimeout(refreshTimer);

  const expSeconds = decodeJwtExp(accessToken);
  if (!expSeconds) return; // not a decodable JWT — fall back to reactive-only refresh

  const msUntilExpiry = expSeconds * 1000 - Date.now();
  // Refresh 60s before it actually expires; never schedule less than 5s out
  // (covers a token that's already nearly-expired on page load).
  const refreshInMs = Math.max(msUntilExpiry - 60_000, 5_000);

  refreshTimer = setTimeout(() => {
    AuthService.refreshSession().catch(() => {
      // Refresh token is also dead/revoked — this is a real logout.
      AuthService.logout();
      window.location.href = "/login";
    });
  }, refreshInMs);
};

const clearScheduledRefresh = () => {
  if (refreshTimer) {
    clearTimeout(refreshTimer);
    refreshTimer = null;
  }
};

// Shared session-saving logic for login methods
const persistSession = (authData: AuthResponse) => {
  if (!authData?.accessToken) return;

  sessionStorage.setItem(ACCESS_TOKEN_KEY, authData.accessToken);
  sessionStorage.setItem(REFRESH_TOKEN_KEY, authData.refreshToken || "");
  sessionStorage.setItem(AUTH_USER_KEY, JSON.stringify(authData.user));
  sessionStorage.setItem(USER_ROLE_KEY, authData.user?.role || "CUSTOMER");

  // NEW: mirror into cookies so middleware.ts can see the session too.
  setCookie(ACCESS_TOKEN_KEY, authData.accessToken);
  setCookie(USER_ROLE_KEY, authData.user?.role || "CUSTOMER");

  scheduleProactiveRefresh(authData.accessToken);
  notifyAuthChange();
};

let refreshPromise: Promise<string> | null = null;

const requestNewAccessToken = async (): Promise<string> => {
  const refreshToken = sessionStorage.getItem(REFRESH_TOKEN_KEY);
  if (!refreshToken) throw new Error("No refresh token available");

  const res = await api.post<ApiResponse<AuthResponse>>(REFRESH_ENDPOINT, {
    refreshToken,
  });
  const authData = res.data.body?.data || (res.data as any).data;

  if (!authData?.accessToken) {
    throw new Error("Refresh response did not include an accessToken");
  }

  // Full persistSession so the mirrored cookie + reschedule all happen
  // together, same as a fresh login.
  persistSession(authData);
  return authData.accessToken;
};

/**
 * ============================================================
 * AUTH SERVICE
 * ============================================================
 *
 * All auth state lives in sessionStorage instead of
 * localStorage/cookies. sessionStorage is isolated PER TAB —
 * opening a new tab starts with a completely empty session.
 */
export const AuthService = {
  login: async (credentials: LoginRequest): Promise<AuthResponse> => {
    const res = await api.post<ApiResponse<AuthResponse>>(
      "/auth/login",
      credentials,
    );

    const authData = res.data.body?.data || (res.data as any).data;
    persistSession(authData);

    return authData;
  },

  // Exchanges a Keycloak-issued access token for your backend's JWT
  loginWithKeycloak: async (data: {
    accessToken: string;
  }): Promise<AuthResponse> => {
    const res = await api.post<ApiResponse<AuthResponse>>(
      "/auth/keycloak",
      data,
    );

    const authData = res.data.body?.data || (res.data as any).data;
    persistSession(authData);

    return authData;
  },

  register: async (data: RegisterRequest): Promise<void> => {
    await api.post<ApiResponse<null>>("/auth/register", data);
  },

  verifyOtp: async (data: VerifyOtpRequest): Promise<AuthResponse> => {
    const res = await api.post<ApiResponse<AuthResponse>>(
      "/auth/verify-otp",
      data,
    );

    const authData = res.data.body?.data || (res.data as any).data;

    // OTP verification does NOT log the user in — no session data saved here.
    return authData;
  },

  resendOtp: async (email: string): Promise<void> => {
    await api.post<ApiResponse<null>>(
      `/auth/resend-otp?email=${encodeURIComponent(email)}`,
    );
  },

  forgotPassword: async (data: ForgotPasswordRequest): Promise<void> => {
    await api.post<ApiResponse<null>>("/auth/forgot-password", data);
  },

  resetPassword: async (data: ResetPasswordRequest): Promise<void> => {
    await api.post<ApiResponse<null>>("/auth/reset-password", data);
  },

  getCurrentUser: (): UserResponse | null => {
    if (typeof window === "undefined") return null;

    const userStr = sessionStorage.getItem(AUTH_USER_KEY);
    if (!userStr) return null;

    try {
      return JSON.parse(userStr);
    } catch {
      return null;
    }
  },

  // 🌟 NEW / ADDED: Updates current user data in sessionStorage and triggers instant UI sync (Navbar avatar, name, etc.)
  updateCurrentUser: (updatedUser: UserResponse) => {
    if (typeof window === "undefined") return;

    sessionStorage.setItem(AUTH_USER_KEY, JSON.stringify(updatedUser));
    if (updatedUser.role) {
      sessionStorage.setItem(USER_ROLE_KEY, updatedUser.role);
      // NEW: keep the middleware-visible cookie in sync too.
      setCookie(USER_ROLE_KEY, updatedUser.role);
    }

    notifyAuthChange();
  },

  getAccessToken: (): string | null => {
    if (typeof window === "undefined") return null;
    return sessionStorage.getItem(ACCESS_TOKEN_KEY);
  },

  getUserRole: (): string | null => {
    if (typeof window === "undefined") return null;
    return sessionStorage.getItem(USER_ROLE_KEY);
  },

  // Silently exchanges the stored refreshToken for a new accessToken.
  // Shared across simultaneous callers so a burst of expired requests only
  // triggers one network call instead of one per caller.
  refreshSession: (): Promise<string> => {
    if (!refreshPromise) {
      refreshPromise = requestNewAccessToken().finally(() => {
        refreshPromise = null;
      });
    }
    return refreshPromise;
  },

  // Call once when the app mounts (e.g. top of AdminLayout, or a root
  // provider) so a page refresh/reopen schedules the next silent refresh
  // immediately, instead of only reacting after the first 401.
  resumeSession: () => {
    const token = AuthService.getAccessToken();
    if (token) scheduleProactiveRefresh(token);
  },

  logout: () => {
    if (typeof window === "undefined") return;

    clearScheduledRefresh();

    sessionStorage.removeItem(ACCESS_TOKEN_KEY);
    sessionStorage.removeItem(REFRESH_TOKEN_KEY);
    sessionStorage.removeItem(AUTH_USER_KEY);
    sessionStorage.removeItem(USER_ROLE_KEY);

    // NEW: clear the mirrored cookies too, or the middleware would keep
    // treating the user as logged in after a client-side logout.
    clearCookie(ACCESS_TOKEN_KEY);
    clearCookie(USER_ROLE_KEY);

    notifyAuthChange();
  },
};

export default AuthService;
