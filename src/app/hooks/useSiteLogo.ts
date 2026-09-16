"use client";

import { useEffect, useState } from "react";
import api from "@/app/lib/api";

export const LOGO_UPDATE_EVENT = "cinemax-logo-updated";

export function useSiteLogo() {
  const [logoUrl, setLogoUrl] = useState<string>(() => {
    // Check local storage immediately on initial render to prevent flashing
    if (typeof window !== "undefined") {
      return localStorage.getItem("cinemax-cached-logo") || "/logo2.png";
    }
    return "/logo2.png";
  });

  const fetchLogo = async () => {
    try {
      const res = await api.get("/settings/public");
      const data = res.data?.body?.data || res.data?.data || res.data;
      if (data?.SITE_LOGO_URL) {
        setLogoUrl(data.SITE_LOGO_URL);
        localStorage.setItem("cinemax-cached-logo", data.SITE_LOGO_URL);
      }
    } catch {
      // Fallback to cached or static logo if backend call fails
      const cached = localStorage.getItem("cinemax-cached-logo");
      if (cached) setLogoUrl(cached);
    }
  };

  useEffect(() => {
    fetchLogo();

    // Listen for custom update events triggered from the settings page
    const handleLogoUpdate = (e: CustomEvent) => {
      if (e.detail) {
        setLogoUrl(e.detail);
        localStorage.setItem("cinemax-cached-logo", e.detail);
      }
    };

    window.addEventListener(LOGO_UPDATE_EVENT as any, handleLogoUpdate);
    return () => {
      window.removeEventListener(LOGO_UPDATE_EVENT as any, handleLogoUpdate);
    };
  }, []);

  return logoUrl;
}
