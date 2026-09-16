"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";

const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/**
 * Global scroll progress through the whole document, 0 → 1.
 * Drive ambient background color / hue shifts from this so the page
 * "breathes" as the visitor scrolls, instead of static AOS fade-ins.
 */
export function useScrollProgress() {
  const [progress, setProgress] = useState(0);
  const raf = useRef(0);

  useEffect(() => {
    const onScroll = () => {
      cancelAnimationFrame(raf.current);
      raf.current = requestAnimationFrame(() => {
        const { scrollTop, scrollHeight, clientHeight } =
          document.documentElement;
        const max = scrollHeight - clientHeight;
        setProgress(max > 0 ? Math.min(1, Math.max(0, scrollTop / max)) : 0);
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      cancelAnimationFrame(raf.current);
    };
  }, []);

  return progress;
}

/**
 * Fires once, smoothly, the moment an element enters the viewport.
 * Use sparingly (per-section, not per-card) so motion stays orchestrated
 * rather than scattered.
 */
export function useReveal<T extends HTMLElement>(opts?: {
  threshold?: number;
  rootMargin?: string;
}) {
  const ref = useRef<T | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || prefersReducedMotion()) {
      setVisible(true);
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          io.unobserve(el);
        }
      },
      {
        threshold: opts?.threshold ?? 0.15,
        rootMargin: opts?.rootMargin ?? "0px",
      },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [opts?.threshold, opts?.rootMargin]);

  return { ref, visible };
}

/**
 * Gentle vertical parallax tied to an element's position relative to the
 * viewport center. Feed the returned offset into a transform.
 */
export function useParallax<T extends HTMLElement>(speed = 0.15) {
  const ref = useRef<T | null>(null);
  const [offset, setOffset] = useState(0);
  const raf = useRef(0);

  useEffect(() => {
    if (prefersReducedMotion()) return;
    const onScroll = () => {
      cancelAnimationFrame(raf.current);
      raf.current = requestAnimationFrame(() => {
        const el = ref.current;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const center = rect.top + rect.height / 2 - window.innerHeight / 2;
        setOffset(center * speed);
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf.current);
    };
  }, [speed]);

  return { ref, offset };
}

/**
 * Subtle 3D tilt that follows the cursor — motion that answers the user's
 * own action, for poster art / feature cards.
 */
export function useTilt<T extends HTMLElement>(strength = 8) {
  const ref = useRef<T | null>(null);
  const [style, setStyle] = useState<CSSProperties>({});

  const onMouseMove = (e: React.MouseEvent) => {
    if (prefersReducedMotion()) return;
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width - 0.5;
    const py = (e.clientY - rect.top) / rect.height - 0.5;
    setStyle({
      transform: `perspective(900px) rotateX(${-py * strength}deg) rotateY(${
        px * strength
      }deg) translateZ(0)`,
      transition: "transform 0.08s ease-out",
    });
  };

  const onMouseLeave = () => {
    setStyle({
      transform: "perspective(900px) rotateX(0deg) rotateY(0deg)",
      transition: "transform 0.5s cubic-bezier(0.22, 1, 0.36, 1)",
    });
  };

  return { ref, style, onMouseMove, onMouseLeave };
}

/** Utility: turn a scroll progress (0-1) into a hue for ambient gradients. */
export function hueFromProgress(progress: number, from = 252, to = 34) {
  return from + (to - from) * progress;
}
