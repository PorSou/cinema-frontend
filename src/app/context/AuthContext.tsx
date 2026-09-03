"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { UserResponse } from "@/app/types/api.types";

interface AuthContextType {
  user: UserResponse | null;
  token: string | null;
  isLoading: boolean;
  isAdmin: boolean;
  isStaff: boolean;
  login: (token: string, user: UserResponse, refreshToken?: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserResponse | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    try {
      const storedToken = localStorage.getItem("accessToken");
      const storedUser = localStorage.getItem("cinemax_user") || localStorage.getItem("user");
      const storedAuth = localStorage.getItem("cinemax_auth");

      if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
      } else if (storedAuth) {
        const parsed = JSON.parse(storedAuth);
        setToken(parsed.accessToken || parsed.token);
        setUser(parsed.user || parsed);
      }
    } catch (err) {
      console.error("Auth state initialization error:", err);
    } finally {
      // Always stop the loading spinner
      setIsLoading(false);
    }
  }, []);

  const login = (newToken: string, newUser: UserResponse, refreshToken?: string) => {
    setToken(newToken);
    setUser(newUser);
    localStorage.setItem("accessToken", newToken);
    localStorage.setItem("cinemax_user", JSON.stringify(newUser));
    if (refreshToken) {
      localStorage.setItem("refreshToken", refreshToken);
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("cinemax_user");
    localStorage.removeItem("cinemax_auth");
    router.push("/login");
  };

  const isAdmin = user?.role === "ADMIN";
  const isStaff = user?.role === "STAFF" || user?.role === "ADMIN";

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isAdmin,
        isStaff,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};