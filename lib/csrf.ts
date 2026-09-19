import { NextResponse } from "next/server";

const SAFE_METHODS = ['GET', 'HEAD', 'OPTIONS'];

/**
 * Check that state-changing requests come from our own origin.
 * Returns null if OK, or a 403 NextResponse if the origin doesn't match.
 */
export function checkCsrfOrigin(method: string, origin: string | null): NextResponse | null {
  if (SAFE_METHODS.includes(method)) return null;
  // No Origin header = same-origin navigation (form submits without fetch)
  if (!origin) return null;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || '';
  const appOrigin = appUrl ? new URL(appUrl).origin : '';

  if (origin === appOrigin) return null;

  return NextResponse.json(
    { error: "Forbidden", message: "Cross-origin request rejected" },
    { status: 403 }
  );
}
