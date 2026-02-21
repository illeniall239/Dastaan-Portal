"use client";

import { useEffect } from "react";

const HEARTBEAT_INTERVAL = 5 * 60 * 1000; // 5 minutes

/**
 * Sends a periodic heartbeat to keep last_seen_at fresh in user_sessions.
 * This allows the admin to see approximate session duration even if the user
 * closes the tab without explicitly logging out.
 */
export function SessionTrackerProvider() {
  useEffect(() => {
    // Send once immediately on mount, then every 5 minutes
    const sendHeartbeat = () => {
      fetch("/api/auth/heartbeat", { method: "POST" }).catch(() => {
        // Silently ignore — heartbeat failures are non-fatal
      });
    };

    sendHeartbeat();
    const interval = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL);
    return () => clearInterval(interval);
  }, []);

  return null;
}
