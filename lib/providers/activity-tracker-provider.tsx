"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

interface ActivityEvent {
  type: "page_view" | "click" | "client_error";
  session_id: string;
  route?: string;
  element_tag?: string;
  element_text?: string;
  element_id?: string;
  error_message?: string;
  error_stack?: string;
  metadata?: Record<string, unknown>;
}

function getOrCreateSessionId(): string {
  try {
    const key = "dastaan-session-id";
    let id = sessionStorage.getItem(key);
    if (!id) {
      id = crypto.randomUUID();
      sessionStorage.setItem(key, id);
    }
    return id;
  } catch {
    return "unknown";
  }
}

function flushEvents(events: ActivityEvent[], beacon = false) {
  if (events.length === 0) return;
  const url = "/api/activity/track";
  const body = JSON.stringify({ events });
  if (beacon && navigator.sendBeacon) {
    navigator.sendBeacon(url, new Blob([body], { type: "application/json" }));
  } else {
    fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
    }).catch(() => {});
  }
}

export function ActivityTrackerProvider() {
  const pathname = usePathname();
  const sessionId = useRef<string>("");
  const buffer = useRef<ActivityEvent[]>([]);
  const initialized = useRef(false);

  // Initialize session ID once on mount
  useEffect(() => {
    sessionId.current = getOrCreateSessionId();
  }, []);

  // Enqueue helper
  const enqueue = (event: Omit<ActivityEvent, "session_id">) => {
    buffer.current.push({ ...event, session_id: sessionId.current });
  };

  // Track page views on route change
  useEffect(() => {
    if (!pathname) return;
    enqueue({ type: "page_view", route: pathname });
  }, [pathname]);

  // Set up global handlers + flush interval — once on mount
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    // Global JS error handler
    const handleError = (event: ErrorEvent) => {
      enqueue({
        type: "client_error",
        route: window.location.pathname,
        error_message: event.message,
        error_stack: event.error?.stack,
        metadata: {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
        },
      });
    };

    // Unhandled promise rejection handler
    const handleRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      enqueue({
        type: "client_error",
        route: window.location.pathname,
        error_message: reason instanceof Error ? reason.message : String(reason),
        error_stack: reason instanceof Error ? reason.stack : undefined,
        metadata: { type: "unhandledrejection" },
      });
    };

    // Click event delegation — capture buttons, links, selects, role=button
    const handleClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      const el = target.closest("button, a, select, [role='button'], [role='menuitem'], [role='tab']") as HTMLElement | null;
      if (!el) return;

      // Skip if inside a password input context
      if (el.querySelector("input[type='password']")) return;

      const tag = el.tagName.toLowerCase();
      const text = (el.textContent || el.getAttribute("aria-label") || el.getAttribute("title") || "").trim().slice(0, 100);
      const id = el.id || undefined;
      const href = tag === "a" ? (el as HTMLAnchorElement).pathname : undefined;

      enqueue({
        type: "click",
        route: window.location.pathname,
        element_tag: tag,
        element_text: text,
        element_id: id,
        metadata: href ? { href } : undefined,
      });
    };

    window.addEventListener("error", handleError);
    window.addEventListener("unhandledrejection", handleRejection);
    document.addEventListener("click", handleClick, { capture: true });

    // Flush buffer every 5 seconds
    const interval = setInterval(() => {
      const events = buffer.current.splice(0);
      flushEvents(events);
    }, 5000);

    // Flush on tab hide/close
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        const events = buffer.current.splice(0);
        flushEvents(events, true); // use sendBeacon
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("error", handleError);
      window.removeEventListener("unhandledrejection", handleRejection);
      document.removeEventListener("click", handleClick, { capture: true });
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      clearInterval(interval);
      // Final flush on unmount
      const events = buffer.current.splice(0);
      flushEvents(events);
    };
  }, []);

  return null;
}
