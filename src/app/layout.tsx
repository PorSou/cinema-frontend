import type { Metadata, Viewport } from "next";
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

// ---------------------------------------------------------------
// SEO / link-preview settings
// ---------------------------------------------------------------
// Change this when you get a custom domain (or set NEXT_PUBLIC_SITE_URL on Vercel).
const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://cinema-frontend-py8v.vercel.app";

const SITE_NAME = "CINEMAX";
const SITE_TITLE = "CINEMAX - Movie Tickets & Reservations";
const SITE_DESCRIPTION =
  "Book movie tickets online in Phnom Penh. Browse now showing and coming soon movies, choose your seats in real time and pay with Bakong KHQR.";

// Cloudinary image resized to 1200x630 (the size Telegram, Messenger and Facebook expect).
// "w_1200,h_630,c_fill,q_auto,f_jpg" is inserted right after /upload/.
const OG_IMAGE =
  "https://res.cloudinary.com/dppeuniv1/image/upload/w_1200,h_630,c_fill,q_auto,f_jpg/v1789377134/i90z9f9zl749cf9oda2y.jpg";

// Google Search Console HTML-tag verification.
// Paste ONLY the value of content="..." from the meta tag Google shows you.
const GOOGLE_SITE_VERIFICATION = "ujeGV3TIZ7nX7Zjk0Mbx0YCO9Iw9gITFGvOmiWyAmPs";

export const metadata: Metadata = {
  // Makes relative URLs in metadata absolute
  metadataBase: new URL(SITE_URL),

  title: {
    default: SITE_TITLE,
    template: `%s | ${SITE_NAME}`, // child pages: export const metadata = { title: "Movies" }
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: [
    "CINEMAX",
    "cinema",
    "movie tickets",
    "book movie tickets online",
    "movie showtimes",
    "cinema Phnom Penh",
    "Cambodia cinema",
    "KHQR",
  ],
  robots: { index: true, follow: true },

  // Google Search Console ownership verification (renders <meta name="google-site-verification">)
  verification: {
    google: GOOGLE_SITE_VERIFICATION,
  },

  // Used by Telegram, Messenger, Facebook, WhatsApp, LinkedIn, Discord...
  openGraph: {
    type: "website",
    url: SITE_URL,
    siteName: SITE_NAME,
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    locale: "en_US",
    images: [
      {
        url: OG_IMAGE,
        width: 1200,
        height: 630,
        alt: "CINEMAX - Movie Tickets & Reservations",
      },
    ],
  },

  // Used by X (Twitter)
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: [OG_IMAGE],
  },
};

export const viewport: Viewport = {
  themeColor: "#020617",
};

// Structured data so Google understands the site name
const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: SITE_NAME,
  alternateName: "CINEMAX Phnom Penh",
  url: SITE_URL,
  description: SITE_DESCRIPTION,
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

        {/* JSON-LD structured data for search engines */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
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
