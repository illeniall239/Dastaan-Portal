"use client";

import { onCLS, onFCP, onLCP, onINP, onTTFB } from "web-vitals";

function sendToAnalytics(metric: any) {
  try {
    const enriched = {
      ...metric,
      url: window.location.pathname,
      referrer: document.referrer || undefined,
      network: (navigator as any).connection?.effectiveType,
      ts: Date.now(),
    };
    // Fire-and-forget
    navigator.sendBeacon?.(
      "/metrics",
      new Blob([JSON.stringify(enriched)], { type: "application/json" })
    ) || fetch("/metrics", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(enriched), keepalive: true });
  } catch {}
}

export function initWebVitals() {
  // Report key Web Vitals
  onCLS(sendToAnalytics);
  onFCP(sendToAnalytics);
  onLCP(sendToAnalytics);
  onINP(sendToAnalytics);
  onTTFB(sendToAnalytics);
}


