import { generateCodeVerifier, generateCodeChallenge } from "@/app/lib/pkce";

const KEYCLOAK_ISSUER =
  process.env.NEXT_PUBLIC_KEYCLOAK_ISSUER ||
  "http://localhost:8081/realms/cinemax";

const KEYCLOAK_CLIENT_ID =
  process.env.NEXT_PUBLIC_KEYCLOAK_CLIENT_ID || "cinemax-frontend";

// ── Canonical site origin ──────────────────────────────────────────────
// redirect_uri must be byte-identical between the initial auth request
// and the later token exchange, and it must exactly match one of the
// "Valid redirect URIs" registered on the Keycloak client. Building it
// from window.location.origin is what broke login: if a visitor lands on
// the bare apex (porsou.store) and clicks a social login button, Keycloak
// gets redirect_uri=https://porsou.store/..., but Vercel's own apex->www
// redirect then bounces the browser to a different origin
// (www.porsou.store) before this page can read the query string —
// dropping the code/state in the process on some browsers.
//
// Pinning this to one fixed value means every login, no matter which
// domain the visitor started on, always requests and exchanges the same
// redirect_uri, so there is never a cross-domain hop in the middle of the
// OAuth flow.
//
// Set NEXT_PUBLIC_SITE_URL in Vercel (Production) to your canonical
// domain, e.g. https://www.porsou.store — no trailing slash. Falls back
// to window.location.origin only if that variable isn't set (e.g. local
// dev without a .env.local override), so localhost keeps working.
const SITE_ORIGIN =
  process.env.NEXT_PUBLIC_SITE_URL ||
  (typeof window !== "undefined" ? window.location.origin : "");

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

// ── open-redirect guard ──────────────────────────────────────────
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
 * session so login always re-runs through the upstream IdP, instead of
 * Keycloak short-circuiting straight back to the app.
 */
export async function redirectToKeycloak(
  provider: SocialProvider,
  redirectTo?: string | null,
) {
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = await generateCodeChallenge(codeVerifier);

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
   * The correct URL is: {SITE_ORIGIN}/keycloak/callback
   *
   * This is now built from SITE_ORIGIN, not window.location.origin, so it
   * is the same value regardless of which domain (apex or www) the
   * visitor was on when they clicked the button. It must exactly match a
   * "Valid redirect URI" registered on the cinemax-frontend client in
   * Keycloak.
   */
  const redirectUri = `${SITE_ORIGIN}/keycloak/callback`;

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

  // Must be byte-identical to the redirect_uri sent in the original auth
  // request above, or Keycloak's token endpoint rejects the exchange —
  // that's an OAuth/PKCE requirement, not a Keycloak quirk.
  const redirectUri = `${SITE_ORIGIN}/keycloak/callback`;

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

  if (stored) return sanitizeRedirect(stored);

  if (state) {
    const decoded = decodeStateString<StatePayload>(state);
    if (decoded?.redirectTo) return sanitizeRedirect(decoded.redirectTo);
  }

  return null;
}
