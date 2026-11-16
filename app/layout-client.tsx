"use client";

import { useEffect } from "react";
import { initWebVitals } from "./web-vitals";

export default function LayoutClient({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    initWebVitals();
    if ('serviceWorker' in navigator) {
      // The service worker only makes the portal installable. Browsers may refuse it (private mode,
      // privacy extensions, some Android web views); that's an expected outcome, not an app error,
      // so it's handled here instead of surfacing as an unhandled rejection on every page load.
      navigator.serviceWorker.register('/sw.js').catch((err) => {
        console.warn('Service worker not registered:', err);
      });
    }
  }, []);
  return <>{children}</>;
}


