"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";

import {
  exchangeCodeForToken,
  consumePostLoginRedirect,
} from "@/app/lib/keycloakAuth";
import { AuthService } from "@/app/service/auth.service";
import { useToast } from "@/app/context/ToastContext";

const processedCodes = new Set<string>();

function KeycloakCallbackContent() {
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const { addToast } = useToast();

  useEffect(() => {
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

        if (processedCodes.has(code)) {
          return;
        }
        processedCodes.add(code);

        window.history.replaceState(null, "", window.location.pathname);

        const keycloakAccessToken = await exchangeCodeForToken(code, state);

        if (!keycloakAccessToken) {
          throw new Error("No access token was returned by Keycloak.");
        }

        const auth = await AuthService.loginWithKeycloak({
          accessToken: keycloakAccessToken,
        });

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
  }, [searchParams]);

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
