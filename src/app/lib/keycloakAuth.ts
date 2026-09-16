import { generateCodeVerifier, generateCodeChallenge } from "@/app/lib/pkce";

const KEYCLOAK_ISSUER =
  process.env.NEXT_PUBLIC_KEYCLOAK_ISSUER ||
  "http://localhost:8081/realms/cinemax";

const KEYCLOAK_CLIENT_ID =
  process.env.NEXT_PUBLIC_KEYCLOAK_CLIENT_ID || "cinemax-frontend";

const CODE_VERIFIER_KEY = "kc_code_verifier";
const POST_LOGIN_REDIRECT_KEY = "kc_post_login_redirect";

export type SocialProvider = "google" | "github" | "facebook";

// ── small string<->base64url helpers (separate from pkce.ts's ArrayBuffer
// versions, since here we're encoding a plain JSON string, not raw bytes) ──
function encodeStateString<T extends object>(data: T): string {
  const json = JSON.stringify(data);
  const bytes = new TextEncoder().encode(json);
  let str = "";
  bytes.forEach((b) => (str += String.fromCharCode(b)));
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function decodeStateString<T>(state: string): T | null {
  try {
    const padded = state.replace(/-/g, "+").replace(/_/g, "/");
    const binary = atob(padded);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const json = new TextDecoder().decode(bytes);
    return JSON.parse(json) as T;
  } catch {
    return null;
  }
}

// ── NEW: open-redirect guard ──────────────────────────────────────────
// Only allow same-site relative paths ("/account", "/checkout"). Rejects
// absolute URLs ("https://evil.com") and protocol-relative URLs
// ("//evil.com") which browsers still treat as external.
function sanitizeRedirect(url: string | null | undefined): string | null {
  if (!url) return null;
  if (!url.startsWith("/") || url.startsWith("//")) return null;
  return url;
}

interface StatePayload {
  codeVerifier: string;
  redirectTo: string | null;
}

/**
 * Redirect user to Keycloak.
 *
 * The PKCE code_verifier is stored in sessionStorage (best case — keeps it
 * out of the URL), AND embedded in the OAuth "state" parameter as a
 * resilient fallback. Some browsers partition or clear sessionStorage
 * across the multi-domain redirect chain this flow goes through
 * (app -> Keycloak -> Google/GitHub/Facebook -> Keycloak -> app), which
 * causes "Missing PKCE code verifier" errors that have nothing to do with
 * anything being misconfigured. "state" is guaranteed by the OAuth spec to
 * be echoed back unchanged by Keycloak, so it survives regardless of
 * storage behavior.
 *
 * Note: forcing the Google account picker (instead of silently reusing a
 * cached session) is handled server-side via the "Prompt" field on the
 * Google identity provider in the Keycloak admin console. The prompt=login
 * below is a separate thing — it ignores Keycloak's OWN existing SSO
 * session so login always re-runs through the upstream IdP at all,
 * instead of Keycloak short-circuiting straight back to the app.
 */
export async function redirectToKeycloak(
  provider: SocialProvider,
  redirectTo?: string | null,
) {
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = await generateCodeChallenge(codeVerifier);

  // NEW: sanitize before it ever touches storage or the URL.
  const safeRedirectTo = sanitizeRedirect(redirectTo);

  sessionStorage.setItem(CODE_VERIFIER_KEY, codeVerifier);

  if (safeRedirectTo) {
    sessionStorage.setItem(POST_LOGIN_REDIRECT_KEY, safeRedirectTo);
  } else {
    sessionStorage.removeItem(POST_LOGIN_REDIRECT_KEY);
  }

  const statePayload: StatePayload = {
    codeVerifier,
    redirectTo: safeRedirectTo,
  };
  const state = encodeStateString(statePayload);

  /**
   * IMPORTANT
   *
   * Your folder is: app/(auth)/keycloak/callback/page.tsx
   * "(auth)" is a Next.js route group — it does NOT appear in the URL.
   * The correct URL is: http://localhost:3000/keycloak/callback
   */
  const redirectUri = `${window.location.origin}/keycloak/callback`;

  const params = new URLSearchParams({
    client_id: KEYCLOAK_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email profile",
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
    kc_idp_hint: provider,
    state,
    // Ignores any existing Keycloak SSO session so login always re-runs
    // through the upstream IdP (Google/GitHub/Facebook) instead of
    // silently reusing a prior session.
    prompt: "login",
  });

  window.location.href = `${KEYCLOAK_ISSUER}/protocol/openid-connect/auth?${params.toString()}`;
}

/**
 * Exchange Keycloak authorization code for an access token.
 *
 * Tries sessionStorage first; if that verifier is missing (storage got
 * cleared/partitioned during the redirect chain), falls back to decoding
 * it from the "state" query param Keycloak echoed back.
 */
export async function exchangeCodeForToken(
  code: string,
  state?: string | null,
): Promise<string> {
  let codeVerifier = sessionStorage.getItem(CODE_VERIFIER_KEY);

  if (!codeVerifier && state) {
    const decoded = decodeStateString<StatePayload>(state);
    if (decoded?.codeVerifier) {
      codeVerifier = decoded.codeVerifier;
    }
  }

  if (!codeVerifier) {
    throw new Error(
      "Missing PKCE code verifier — please try signing in again.",
    );
  }

  const redirectUri = `${window.location.origin}/keycloak/callback`;

  const body = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: KEYCLOAK_CLIENT_ID,
    code,
    redirect_uri: redirectUri,
    code_verifier: codeVerifier,
  });

  const res = await fetch(`${KEYCLOAK_ISSUER}/protocol/openid-connect/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  sessionStorage.removeItem(CODE_VERIFIER_KEY);

  if (!res.ok) {
    const errorText = await res.text();
    console.error("Keycloak token exchange failed:", errorText);
    throw new Error("Failed to exchange authorization code with Keycloak.");
  }

  const data = await res.json();

  if (!data.access_token) {
    throw new Error("Keycloak did not return an access token.");
  }

  return data.access_token as string;
}

/**
 * Get the page the user wanted before starting social login.
 * Tries sessionStorage first, falls back to the "state" param same as
 * exchangeCodeForToken does for the verifier.
 */
export function consumePostLoginRedirect(state?: string | null): string | null {
  const stored = sessionStorage.getItem(POST_LOGIN_REDIRECT_KEY);
  sessionStorage.removeItem(POST_LOGIN_REDIRECT_KEY);

  // NEW: re-validate on the way out too — defense in depth in case
  // anything upstream ever changes.
  if (stored) return sanitizeRedirect(stored);

  if (state) {
    const decoded = decodeStateString<StatePayload>(state);
    if (decoded?.redirectTo) return sanitizeRedirect(decoded.redirectTo);
  }

  return null;
}
