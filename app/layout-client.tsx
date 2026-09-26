"use client";

import { useEffect } from "react";
import { initWebVitals } from "./web-vitals";

export default function LayoutClient({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    initWebVitals();
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js');
    }
  }, []);
  return <>{children}</>;
}


