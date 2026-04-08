"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

const HEARTBEAT_INTERVAL = 5 * 60 * 1000; // 5 minutes

/**
 * Sends a periodic heartbeat to keep last_seen_at fresh in user_sessions.
 * Also tracks how many minutes the tab was actually visible (foreground) between
 * heartbeats using the Page Visibility API, and reports that as active_minutes.
 */
export function SessionTrackerProvider() {
  useEffect(() => {
    const supabase = createClient();

    // Track foreground time between heartbeats
    let visibleSince: number | null =
      typeof document !== "undefined" && document.visibilityState === "visible"
        ? Date.now()
        : null;
    let accumulatedMs = 0;

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        visibleSince = Date.now();
      } else {
        if (visibleSince !== null) {
          accumulatedMs += Date.now() - visibleSince;
          visibleSince = null;
        }
      }
    };

    document.addEventListener("visibilitychange", onVisibilityChange);

    const sendHeartbeat = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // Flush any accumulated visible time up to this moment
      if (visibleSince !== null) {
        accumulatedMs += Date.now() - visibleSince;
        visibleSince = Date.now(); // reset window start
      }
      const activeMinutes = Math.round(accumulatedMs / 60000);
      accumulatedMs = 0; // reset after capturing

      fetch("/api/auth/heartbeat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active_minutes: activeMinutes }),
      }).catch(() => {
        // Silently ignore — heartbeat failures are non-fatal
      });
    };

    sendHeartbeat();
    const interval = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, []);

  return null;
}
