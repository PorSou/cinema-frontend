"use client";

import Image, { ImageProps } from "next/image";
import { useState, useEffect, useRef } from "react";

interface LazyImageProps extends Omit<ImageProps, "onLoadingComplete"> {
  src: string;
  alt: string;
  placeholderColor?: string;
}

export default function LazyImage({
  src,
  alt,
  placeholderColor = "#e5e7eb",
  ...props
}: LazyImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.unobserve(entry.target);
        }
      },
      {
        rootMargin: "50px",
      }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className="relative overflow-hidden">
      {!isLoaded && (
        <div
          className="absolute inset-0 animate-pulse"
          style={{ backgroundColor: placeholderColor }}
        />
      )}
      {isInView && (
        <Image
          src={src}
          alt={alt}
          onLoadingComplete={() => setIsLoaded(true)}
          {...props}
        />
      )}
    </div>
  );
}
