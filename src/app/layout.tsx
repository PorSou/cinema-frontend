import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

import Navbar from "@/app/components/Navbar";
import LogoSplashLoader from "@/app/components/LogoSplashLoader";
import { SettingsProvider } from "@/app/context/SettingsContext";
import { LanguageProvider } from "@/app/context/LanguageContext";
import { ToastProvider } from "@/app/context/ToastContext";
import { FavoritesProvider } from "@/app/context/FavoritesContext";
import AosInit from "@/app/components/AosInit"; // 🌟 NEW: AOS Client Initializer

const inter = Inter({
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "CINEMAX - Movie Tickets & Reservations",
  description: "Modern Cinema Reservation Platform",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/*
          Runs before React hydrates / before first paint.
          Applies the saved theme to <html> immediately so there
          is zero flash of the wrong theme on refresh.
        */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function () {
                try {
                  var t = localStorage.getItem("cinemax-theme");
                  if (t !== "light" && t !== "dark") t = "dark";
                  var r = document.documentElement;
                  r.classList.remove("dark", "light");
                  r.classList.add(t);
                  r.setAttribute("data-theme", t);
                  
                  if (t === "dark") {
                    r.style.backgroundColor = "#020617";
                    r.style.color = "#f8fafc";
                  } else {
                    r.style.backgroundColor = "#f8fafc";
                    r.style.color = "#0f172a";
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body
        suppressHydrationWarning
        className={`${inter.className} min-h-screen antialiased`}
      >
        <LanguageProvider>
          <SettingsProvider>
            <ToastProvider>
              <FavoritesProvider>
                {/* 🌟 Initialize AOS Client-side */}
                <AosInit />

                <LogoSplashLoader />

                <Navbar />

                <main className="min-h-screen flex-1">{children}</main>
              </FavoritesProvider>
            </ToastProvider>
          </SettingsProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
