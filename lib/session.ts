import { cookies } from "next/headers";
import { createHmac, timingSafeEqual } from "crypto";

const SESSION_COOKIE_NAME = "user_session";
export const SESSION_MAX_AGE = 60 * 60; // 1 hour

function getSigningKey(): string {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY for session signing");
  return key;
}

/** Sign a session payload: returns base64url(json).base64url(hmac) */
export function signSessionPayload(payload: Record<string, unknown>): string {
  const json = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = createHmac("sha256", getSigningKey()).update(json).digest("base64url");
  return `${json}.${sig}`;
}

/** Verify a signed session string. Returns parsed payload or null if invalid/tampered. */
export function verifySessionPayload(signed: string): Record<string, unknown> | null {
  try {
    const dotIndex = signed.indexOf(".");
    if (dotIndex === -1) return null;
    const json = signed.substring(0, dotIndex);
    const sig = signed.substring(dotIndex + 1);
    if (!json || !sig) return null;
    const expected = createHmac("sha256", getSigningKey()).update(json).digest("base64url");
    if (!timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
    return JSON.parse(Buffer.from(json, "base64url").toString());
  } catch {
    return null;
  }
}

export interface UserSession {
  id: string;
  email: string;
  name: string;
  role: string;
  position?: string;
  department?: string;
  sessionId?: string; // user_sessions.id — used for heartbeat and logout tracking
}

/**
 * Set user session in HTTP-only cookie
 * Call this after successful login/signup
 */
export async function setUserSession(user: UserSession) {
  const cookieStore = await cookies();

  const sessionData = signSessionPayload(user as unknown as Record<string, unknown>);

  cookieStore.set(SESSION_COOKIE_NAME, sessionData, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_MAX_AGE,
    path: "/",
  });
}

/**
 * Get user session from cookie
 * Returns null if no session or invalid/tampered
 */
export async function getUserSession(): Promise<UserSession | null> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME);

  if (!sessionCookie) {
    return null;
  }

  const payload = verifySessionPayload(sessionCookie.value);
  if (!payload) return null;
  return payload as unknown as UserSession;
}

/**
 * Clear user session cookie
 * Call this on logout
 */
export async function clearUserSession() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

/**
 * Refresh/update user session cookie
 * Call this when user profile changes
 */
export async function refreshUserSession(user: UserSession) {
  await setUserSession(user);
}
