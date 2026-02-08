import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { logger } from "@/lib/logger";

// Define role-based protected routes
const protectedRoutes: Record<string, string[]> = {
  "/admin": ["admin"],
  "/management": ["management", "admin"],
  "/approvals": ["executive", "admin"],
  "/evaluations": ["evaluator", "content_manager", "admin"],
  "/legal": ["legal", "admin"],
  "/finance/payments": ["finance", "admin"],
  "/content-department/call-reports": ["content_manager", "content_creator", "evaluator"],
  "/content-department": ["content_manager", "content_creator"],
  "/gcm": ["gcm"],
  "/programmer": ["programmer", "admin"],
  "/evaluator": ["evaluator", "admin"],
  // /stakeholder-demo is intentionally not listed here to make it publicly accessible
};

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Early return for paths that don't need processing
  if (
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/api/') ||
    pathname.startsWith('/images/') ||
    pathname.startsWith('/fonts/') ||
    pathname.match(/\.(ico|png|jpg|jpeg|gif|webp|svg|css|js|woff|woff2|ttf|otf|eot)$/)
  ) {
    return NextResponse.next();
  }

  // Compute protected/auth paths upfront and short-circuit for public pages
  const isProtectedPath = Object.keys(protectedRoutes).some((path) => pathname.startsWith(path)) || pathname.startsWith("/dashboard");
  const isAuthPage = pathname === "/login" || pathname === "/signup";

  if (!isProtectedPath && !isAuthPage) {
    return NextResponse.next();
  }

  let supabaseResponse = NextResponse.next({ request });

  // Security headers (applied to all responses from proxy)
  supabaseResponse.headers.set('Strict-Transport-Security', 'max-age=15552000; includeSubDomains');
  supabaseResponse.headers.set('X-Frame-Options', 'DENY');
  supabaseResponse.headers.set('X-Content-Type-Options', 'nosniff');
  supabaseResponse.headers.set('Referrer-Policy', 'no-referrer');
  supabaseResponse.headers.set('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  // Basic CSP (adjust allowed sources as needed)
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' *.supabase.co va.vercel-scripts.com vitals.vercel-insights.com",
    "style-src 'self' 'unsafe-inline' fonts.googleapis.com",
    "img-src 'self' data: blob: *.supabase.co",
    "font-src 'self' fonts.googleapis.com fonts.gstatic.com",
    "connect-src 'self' *.supabase.co wss://*.supabase.co vitals.vercel-insights.com",
    "frame-ancestors 'none'",
  ].join('; ');
  supabaseResponse.headers.set('Content-Security-Policy', csp);

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  // Redirect to login if not authenticated and accessing a protected route
  if (!user && isProtectedPath) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (user) {
    let userRole: string | undefined;

    // Try session cookie first (fast path)
    const sessionCookie = request.cookies.get('user_session');
    if (sessionCookie) {
      try {
        const sessionData = JSON.parse(sessionCookie.value);
        if (sessionData.id === user.id) {
          userRole = sessionData.role;
          logger.dev(`✅ [Proxy] Using session cookie for role: ${userRole}`);
        }
      } catch (error) {
        logger.error('❌ [Proxy] Failed to parse session cookie:', error);
      }
    }

    // Fall back to DB query if needed
    if (!userRole) {
      logger.dev('⚠️ [Proxy] No session cookie, querying DB for role');
      try {
        const { data: userData, error } = await supabase
          .from('users')
          .select('id, email, name, role, position, department')
          .eq('id', user.id)
          .single();

        if (error) {
          logger.error('❌ [Proxy] Error querying user role:', error);
          userRole = undefined;
        } else {
          userRole = userData?.role;
          logger.dev(`🔍 [Proxy] DB query returned role: ${userRole}`);

          // Set session cookie for future requests (performance optimization)
          if (userData) {
            const sessionData = {
              id: userData.id,
              email: userData.email,
              name: userData.name,
              role: userData.role,
              position: userData.position,
              department: userData.department,
            };
            supabaseResponse.cookies.set('user_session', JSON.stringify(sessionData), {
              httpOnly: true,
              secure: process.env.NODE_ENV === 'production',
              sameSite: 'lax',
              maxAge: 60 * 60 * 24 * 7, // 7 days
              path: '/',
            });
            logger.dev('✅ [Proxy] Session cookie updated');
          }
        }
      } catch (error) {
        logger.error('❌ [Proxy] Exception querying user role:', error);
        userRole = undefined;
      }
    }

    // Check protected routes
    const sortedRoutes = Object.keys(protectedRoutes).sort((a, b) => b.length - a.length);
    for (const path of sortedRoutes) {
      if (pathname.startsWith(path)) {
        if (!userRole || !protectedRoutes[path].includes(userRole)) {
          return NextResponse.redirect(new URL("/unauthorized", request.url));
        }
        break;
      }
    }

    // Role-based dashboard redirects - send users to their dedicated portals
    if (pathname === "/dashboard") {
      switch (userRole) {
        case "admin":
          return NextResponse.redirect(new URL("/admin", request.url));
        case "management":
          return NextResponse.redirect(new URL("/management", request.url));
        case "content_manager":
        case "content_creator":
          return NextResponse.redirect(new URL("/content-department", request.url));
        case "gcm":
          return NextResponse.redirect(new URL("/gcm", request.url));
        case "evaluator":
          return NextResponse.redirect(new URL("/evaluator", request.url));
        case "programmer":
          return NextResponse.redirect(new URL("/programmer", request.url));
        // executive, legal, finance stay on /dashboard (no default case needed)
      }
    }

    // Redirect logged-in users away from auth pages to their dedicated portals
    if (pathname === "/login" || pathname === "/signup") {
      switch (userRole) {
        case "admin":
          return NextResponse.redirect(new URL("/admin", request.url));
        case "management":
          return NextResponse.redirect(new URL("/management", request.url));
        case "content_manager":
        case "content_creator":
          return NextResponse.redirect(new URL("/content-department", request.url));
        case "gcm":
          return NextResponse.redirect(new URL("/gcm", request.url));
        case "evaluator":
          return NextResponse.redirect(new URL("/evaluator", request.url));
        case "programmer":
          return NextResponse.redirect(new URL("/programmer", request.url));
        default:
          // executive, legal, finance → dashboard
          return NextResponse.redirect(new URL("/dashboard", request.url));
      }
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};


