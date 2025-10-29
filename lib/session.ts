import { cookies } from "next/headers";

const SESSION_COOKIE_NAME = "user_session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

export interface UserSession {
  id: string;
  email: string;
  name: string;
  role: string;
  position?: string;
  department?: string;
}

/**
 * Set user session in HTTP-only cookie
 * Call this after successful login/signup
 */
export async function setUserSession(user: UserSession) {
  const cookieStore = await cookies();

  // Serialize user data
  const sessionData = JSON.stringify(user);

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
 * Returns null if no session or invalid
 */
export async function getUserSession(): Promise<UserSession | null> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME);

  if (!sessionCookie) {
    return null;
  }

  try {
    const user = JSON.parse(sessionCookie.value) as UserSession;
    return user;
  } catch (error) {
    console.error("Failed to parse session cookie:", error);
    return null;
  }
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
