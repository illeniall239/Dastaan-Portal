"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

/**
 * Lightweight top progress bar for route transitions.
 * Starts on in-app link clicks and completes when the URL changes.
 * No external deps, optimized for App Router.
 */
export default function RouteProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [isVisible, setIsVisible] = useState(false);
  const [width, setWidth] = useState(0);
  const intervalRef = useRef<number | null>(null);
  const lastUrlRef = useRef<string>("");

  const currentUrl = useMemo(() => `${pathname}?${searchParams?.toString() ?? ""}`, [pathname, searchParams]);

  // Begin the progress bar animation
  const start = () => {
    if (isVisible) return;
    setIsVisible(true);
    setWidth(0);

    // Accelerate quickly to 80%, then creep
    if (intervalRef.current) window.clearInterval(intervalRef.current);
    intervalRef.current = window.setInterval(() => {
      setWidth((prev) => {
        if (prev < 80) return prev + 8; // fast start
        if (prev < 95) return prev + 1; // slow creep
        return prev;
      });
    }, 100);
  };

  // Complete and hide the progress bar
  const complete = () => {
    if (intervalRef.current) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setWidth(100);
    // Small delay for smooth finish
    window.setTimeout(() => {
      setIsVisible(false);
      setWidth(0);
    }, 250);
  };

  // Detect URL changes to complete the progress
  useEffect(() => {
    if (lastUrlRef.current && lastUrlRef.current !== currentUrl) {
      complete();
    }
    lastUrlRef.current = currentUrl;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUrl]);

  // Global click listener to start progress for in-app navigations
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      // Ignore if modified clicks
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

      // Find nearest anchor
      let el = e.target as HTMLElement | null;
      while (el && el.tagName !== "A") el = el.parentElement;
      if (!el) return;

      const anchor = el as HTMLAnchorElement;
      if (!anchor.href) return;
      // Same origin only
      const isSameOrigin = anchor.origin === window.location.origin;
      if (!isSameOrigin) return;
      // Ignore if target is _blank
      if (anchor.target && anchor.target === "_blank") return;

      const nextUrl = anchor.pathname + (anchor.search || "");
      const currUrl = window.location.pathname + (window.location.search || "");
      if (nextUrl !== currUrl) {
        start();
      }
    };

    window.addEventListener("click", onClick, true);
    return () => window.removeEventListener("click", onClick, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!isVisible) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        height: 3,
        width: "100%",
        zIndex: 9999,
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          height: "100%",
          width: `${width}%`,
          backgroundColor: "#224794",
          boxShadow: "0 0 10px rgba(34,71,148,0.4)",
          transition: "width 150ms ease-out, opacity 200ms ease",
        }}
      />
    </div>
  );
}


