"use client";

import { useEffect, useState, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";

import {
  exchangeCodeForToken,
  consumePostLoginRedirect,
} from "@/app/lib/keycloakAuth";
import { AuthService } from "@/app/service/auth.service";
import { useToast } from "@/app/context/ToastContext";

function KeycloakCallbackContent() {
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const { addToast } = useToast();

  // Synchronous, per-mount guard. This is checked and flipped BEFORE any
  // `await`, so a second effect firing (React re-invoking the effect, a
  // fast re-render, etc.) sees hasRun.current === true immediately and
  // bails out before it can read searchParams a second time or touch
  // state at all. The previous version guarded against double-processing
  // with a module-level Set keyed by the code string, but that check ran
  // *inside* the async function after the first run had already done
  // window.history.replaceState() — so a second invocation could read a
  // now-empty URL, find no code, and throw "No authorization code was
  // returned", overwriting the first run's in-flight (and successful)
  // token exchange with a false error. A ref checked synchronously at the
  // very top closes that window entirely.
  const hasRun = useRef(false);

  useEffect(() => {
    if (hasRun.current) return;
    hasRun.current = true;

    let cancelled = false;

    const handleCallback = async () => {
      try {
        const code = searchParams.get("code");
        const state = searchParams.get("state");
        const keycloakError = searchParams.get("error");

        if (keycloakError) {
          const description = searchParams.get("error_description");
          window.history.replaceState(null, "", window.location.pathname);
          throw new Error(
            description || `Keycloak login failed: ${keycloakError}`,
          );
        }

        if (!code) {
          throw new Error("No authorization code was returned by Keycloak.");
        }

        // Clear the code/state from the URL immediately so a manual page
        // refresh, or any stray re-render, can never resubmit the same
        // one-time-use code to Keycloak's token endpoint.
        window.history.replaceState(null, "", window.location.pathname);

        const keycloakAccessToken = await exchangeCodeForToken(code, state);

        if (cancelled) return;

        if (!keycloakAccessToken) {
          throw new Error("No access token was returned by Keycloak.");
        }

        const auth = await AuthService.loginWithKeycloak({
          accessToken: keycloakAccessToken,
        });

        if (cancelled) return;

        if (!auth?.accessToken) {
          throw new Error("Backend did not return a valid session.");
        }

        const message = auth.isNewUser
          ? "Welcome! Your account has been created."
          : `Welcome back, ${auth.user?.fullName ?? "there"}!`;
        addToast(message, "success");

        const redirectTo = consumePostLoginRedirect(state);
        const userRole = auth?.user?.role?.toUpperCase();
        const isAdminOrStaff = userRole === "ADMIN" || userRole === "STAFF";

        if (redirectTo) {
          window.location.href = redirectTo;
        } else if (isAdminOrStaff) {
          window.location.href = "/admin/dashboard";
        } else {
          window.location.href = "/";
        }
      } catch (err) {
        console.error("Keycloak callback error:", err);
        if (!cancelled) {
          const msg =
            err instanceof Error ? err.message : "Keycloak login failed.";
          setError(msg);
          addToast(msg, "error");
        }
      }
    };

    handleCallback();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Intentionally empty: this must run exactly once per mount.
  // Depending on [searchParams] was what allowed a second run in the
  // first place — the code is only ever read here, at mount time, from
  // whatever the URL was when the page first loaded.

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4">
        <div className="w-full max-w-md rounded-2xl border border-red-500/30 bg-slate-900 p-6 text-center shadow-2xl">
          <h1 className="mb-3 text-xl font-bold text-red-500">Login Failed</h1>
          <p className="mb-5 text-sm text-slate-400">{error}</p>
          <button
            type="button"
            onClick={() => {
              window.location.href = "/login";
            }}
            className="rounded-xl bg-red-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-red-500"
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950">
      <div className="text-center">
        <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-slate-700 border-t-red-600" />
        <p className="text-sm text-slate-400">Completing login...</p>
      </div>
    </div>
  );
}

// This page handles a one-time-use authorization code and must never be
// served from Vercel's edge cache or as a static prerendered shell — an
// earlier check showed this route responding with X-Vercel-Cache: HIT and
// X-Nextjs-Prerender: 1, which risks a stale shell being reused across
// requests with different query strings. force-dynamic guarantees a fresh
// render (and fresh client bundle evaluation) on every request.
export const dynamic = "force-dynamic";

export default function KeycloakCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-slate-950">
          <div className="text-center">
            <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-slate-700 border-t-red-600" />
            <p className="text-sm text-slate-400">Loading authentication...</p>
          </div>
        </div>
      }
    >
      <KeycloakCallbackContent />
    </Suspense>
  );
}
