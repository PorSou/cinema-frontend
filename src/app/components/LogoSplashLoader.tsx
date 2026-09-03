"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

const SPLASH_KEY = "cinemax_first_visit";

const DISPLAY_MS = 5500;
const FADE_MS = 800;

export default function LogoSplashLoader() {
  const [showSplash, setShowSplash] = useState(false);
  const [fadeOut, setFadeOut] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    // Only run on homepage
    const path = window.location.pathname;
    if (path !== "/" && path !== "") {
      setChecked(true);
      return;
    }

    let hasVisited = false;

    try {
      hasVisited = localStorage.getItem(SPLASH_KEY) === "true";
    } catch {
      hasVisited = false;
    }

    /*
     * Returning visitor:
     * Do absolutely nothing - show page immediately
     */
    if (hasVisited) {
      setChecked(true);
      return;
    }

    /*
     * First visit:
     * Show splash and mark as visited
     */
    try {
      localStorage.setItem(SPLASH_KEY, "true");
    } catch {
      // Ignore storage errors
    }

    setShowSplash(true);
    setChecked(true);

    const fadeTimer = window.setTimeout(() => {
      setFadeOut(true);
    }, DISPLAY_MS);

    const removeTimer = window.setTimeout(() => {
      setShowSplash(false);
    }, DISPLAY_MS + FADE_MS);

    return () => {
      window.clearTimeout(fadeTimer);
      window.clearTimeout(removeTimer);
    };
  }, []);

  /*
   * IMPORTANT:
   * During the initial check, render nothing.
   *
   * This prevents the splash from flashing on refresh.
   */
  if (!checked || !showSplash) {
    return null;
  }

  return (
    <div
      className={`
        fixed inset-0 top-0 left-0 w-screen h-screen z-[9999]
        overflow-hidden
        bg-black
        transition-all
        duration-[800ms]
        ease-in-out
        pointer-events-auto
        ${
          fadeOut
            ? "scale-110 opacity-0 pointer-events-none"
            : "scale-100 opacity-100"
        }
      `}
    >
      {/* Background */}
      <div
        className="
          absolute inset-0
          bg-[radial-gradient(circle_at_center,#250707_0%,#080303_35%,#030303_75%)]
        "
      />

      {/* Red ambient glow */}
      <div
        className="
          absolute
          left-1/2
          top-1/2
          h-[500px]
          w-[500px]
          -translate-x-1/2
          -translate-y-1/2
          rounded-full
          bg-red-600/10
          blur-[150px]
          animate-pulse
        "
      />

      {/* Top cinematic light */}
      <div
        className="
          absolute
          left-1/2
          top-0
          h-[45vh]
          w-[2px]
          -translate-x-1/2
          bg-gradient-to-b
          from-red-500/0
          via-red-500/30
          to-transparent
          blur-sm
        "
      />

      {/* Cinema light sweep */}
      <div
        className="
          absolute
          left-[-30%]
          top-1/2
          h-[1px]
          w-[160%]
          bg-gradient-to-r
          from-transparent
          via-red-500/70
          to-transparent
          animate-[cinemaSweep_2.2s_ease-in-out_infinite]
        "
      />

      {/* Particle 1 */}
      <div
        className="
          absolute
          left-[15%]
          top-[25%]
          h-1
          w-1
          rounded-full
          bg-red-400/60
          animate-[particle1_2.5s_ease-in-out_infinite]
        "
      />

      {/* Particle 2 */}
      <div
        className="
          absolute
          left-[80%]
          top-[30%]
          h-1
          w-1
          rounded-full
          bg-red-500/50
          animate-[particle2_3s_ease-in-out_infinite]
        "
      />

      {/* Particle 3 */}
      <div
        className="
          absolute
          left-[25%]
          top-[70%]
          h-1
          w-1
          rounded-full
          bg-rose-400/40
          animate-[particle3_3.5s_ease-in-out_infinite]
        "
      />

      {/* Particle 4 */}
      <div
        className="
          absolute
          left-[75%]
          top-[72%]
          h-1
          w-1
          rounded-full
          bg-red-400/50
          animate-[particle1_3s_ease-in-out_infinite]
        "
      />

      {/* Main content */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="flex flex-col items-center">

          {/* Logo */}
          <div
            className="
              relative
              animate-[cinemaLogo_1.3s_cubic-bezier(0.16,1,0.3,1)_forwards]
            "
          >
            {/* Glow */}
            <div
              className="
                absolute
                -inset-12
                rounded-full
                bg-red-600/10
                blur-[60px]
              "
            />

            {/* Rotating ring */}
            <div
              className="
                absolute
                -inset-7
                rounded-full
                border
                border-red-500/10
                animate-[ringRotate_8s_linear_infinite]
              "
            />

            {/* Inner ring */}
            <div
              className="
                absolute
                -inset-4
                rounded-full
                border
                border-white/5
              "
            />

            {/* Logo container */}
            <div
              className="
                relative
                flex
                h-40
                w-40
                items-center
                justify-center
                rounded-[2.5rem]
                border
                border-white/10
                bg-white/[0.025]
                shadow-[0_0_80px_rgba(220,38,38,0.2)]
                backdrop-blur-md
              "
            >
              <div
                className="
                  absolute
                  inset-0
                  rounded-[2.5rem]
                  bg-gradient-to-br
                  from-red-500/10
                  via-transparent
                  to-transparent
                "
              />

              <Image
                src="/logo2.png"
                alt="CineMax"
                width={180}
                height={70}
                priority
                className="
                  relative
                  z-10
                  h-auto
                  w-32
                  object-contain
                  drop-shadow-[0_0_30px_rgba(239,68,68,0.7)]
                "
              />
            </div>
          </div>

          {/* Brand */}
          <div className="mt-9 overflow-hidden">
            <h1
              className="
                text-3xl
                font-black
                tracking-[0.4em]
                text-white
                animate-[brandReveal_1s_0.45s_cubic-bezier(0.16,1,0.3,1)_both]
              "
            >
              CINE<span className="text-red-500">MAX</span>
            </h1>
          </div>

          {/* Tagline */}
          <div
            className="
              mt-4
              flex
              items-center
              gap-3
              animate-[fadeUp_1s_0.8s_ease-out_both]
            "
          >
            <div className="h-px w-8 bg-red-500/50" />

            <p
              className="
                text-[10px]
                font-medium
                uppercase
                tracking-[0.5em]
                text-slate-500
              "
            >
              Your movie experience
            </p>

            <div className="h-px w-8 bg-red-500/50" />
          </div>

          {/* Loading bar */}
          <div
            className="
              mt-9
              h-[2px]
              w-40
              overflow-hidden
              rounded-full
              bg-white/10
            "
          >
            <div
              className="
                h-full
                w-full
                origin-left
                bg-gradient-to-r
                from-red-700
                via-red-500
                to-rose-400
                animate-[loadingBar_5.5s_linear_forwards]
              "
            />
          </div>
        </div>
      </div>

      {/* Corners */}
      <div
        className="
          absolute
          left-8
          top-8
          h-12
          w-12
          border-l
          border-t
          border-red-500/20
        "
      />

      <div
        className="
          absolute
          right-8
          top-8
          h-12
          w-12
          border-r
          border-t
          border-red-500/20
        "
      />

      <div
        className="
          absolute
          bottom-8
          left-8
          h-12
          w-12
          border-b
          border-l
          border-red-500/20
        "
      />

      <div
        className="
          absolute
          bottom-8
          right-8
          h-12
          w-12
          border-b
          border-r
          border-red-500/20
        "
      />

      {/* Bottom text */}
      <div
        className="
          absolute
          bottom-8
          left-1/2
          -translate-x-1/2
          animate-[fadeUp_1s_1s_ease-out_both]
        "
      >
        <p
          className="
            whitespace-nowrap
            text-[8px]
            uppercase
            tracking-[0.6em]
            text-slate-700
          "
        >
          Lights • Camera • Action
        </p>
      </div>
    </div>
  );
}
