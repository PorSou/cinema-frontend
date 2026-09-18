import axios from "axios";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api/v1";

const ACCESS_TOKEN_KEY = "accessToken";
const REFRESH_TOKEN_KEY = "refreshToken";
const USER_ROLE_KEY = "userRole";
const AUTH_USER_KEY = "cinemax_user";
const AUTH_CHANGE_EVENT = "cinemax-auth-change";

// NOTE: adjust this to match your backend's real refresh-token route if it's
// not /auth/refresh — check your AuthController for the exact path/shape.
const REFRESH_ENDPOINT = "/auth/refresh";

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// ---- small helpers, kept in sync with AuthService.ts's storage keys ------
const readAccessToken = () =>
  typeof window === "undefined"
    ? null
    : sessionStorage.getItem(ACCESS_TOKEN_KEY);

const readRefreshToken = () =>
  typeof window === "undefined"
    ? null
    : sessionStorage.getItem(REFRESH_TOKEN_KEY);

const setCookie = (name: string, value: string) => {
  if (typeof document === "undefined") return;
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; SameSite=Lax${secure}`;
};

const clearCookie = (name: string) => {
  if (typeof document === "undefined") return;
  document.cookie = `${name}=; path=/; Max-Age=0; SameSite=Lax`;
};

// Persists a freshly-issued token pair from the refresh endpoint. Mirrors
// AuthService.persistSession's storage + cookie writes exactly, so
// middleware.ts (cookie-only) and AuthService (sessionStorage-only) never
// disagree about whether the session is still valid.
const persistRefreshedTokens = (accessToken: string, refreshToken?: string) => {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  if (refreshToken) sessionStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  setCookie(ACCESS_TOKEN_KEY, accessToken);
  window.dispatchEvent(new Event(AUTH_CHANGE_EVENT));
};

const forceLogoutToLogin = () => {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(ACCESS_TOKEN_KEY);
  sessionStorage.removeItem(REFRESH_TOKEN_KEY);
  sessionStorage.removeItem(AUTH_USER_KEY);
  sessionStorage.removeItem(USER_ROLE_KEY);
  clearCookie(ACCESS_TOKEN_KEY);
  clearCookie(USER_ROLE_KEY);
  window.dispatchEvent(new Event(AUTH_CHANGE_EVENT));
  window.location.href = "/login";
};

api.interceptors.request.use(
  (config) => {
    const token = readAccessToken();
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// ---- silent refresh on 401 ------------------------------------------------
// Access tokens are short-lived (~5-10 min here). Without this, the token
// quietly dies mid-session, every request after that (including the
// notifications poll) starts 401'ing, and the user gets bounced with no
// warning. A single in-flight refresh is shared across every request that
// hits a 401 at the same time, so a burst of failed requests only triggers
// one refresh call, not one per request.
let refreshPromise: Promise<string> | null = null;

const requestNewAccessToken = async (): Promise<string> => {
  const refreshToken = readRefreshToken();
  if (!refreshToken) throw new Error("No refresh token available");

  // Plain axios here, not `api` — going through `api` would re-trigger this
  // same interceptor and could loop.
  const res = await axios.post(`${API_BASE_URL}${REFRESH_ENDPOINT}`, {
    refreshToken,
  });
  const data = res.data?.body?.data || res.data?.data || res.data;

  if (!data?.accessToken) {
    throw new Error("Refresh response did not include an accessToken");
  }

  persistRefreshedTokens(data.accessToken, data.refreshToken);
  return data.accessToken;
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const isAuthEndpoint = originalRequest?.url?.includes("/auth/");

    // Only attempt a refresh for a genuine "token expired" 401, only once
    // per request, and never for the auth endpoints themselves (a failed
    // login shouldn't try to "refresh" its way out of a wrong password).
    if (
      error.response?.status !== 401 ||
      isAuthEndpoint ||
      originalRequest?._retried
    ) {
      return Promise.reject(error);
    }

    originalRequest._retried = true;

    try {
      if (!refreshPromise) {
        refreshPromise = requestNewAccessToken().finally(() => {
          refreshPromise = null;
        });
      }
      const newToken = await refreshPromise;

      originalRequest.headers = originalRequest.headers || {};
      originalRequest.headers.Authorization = `Bearer ${newToken}`;
      return api(originalRequest);
    } catch (refreshError) {
      // Refresh token is also dead/revoked — this is a real logout, not a
      // transient blip, so send the user to /login for real this time.
      forceLogoutToLogin();
      return Promise.reject(refreshError);
    }
  },
);

export default api;
