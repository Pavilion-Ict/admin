import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const path = req.nextUrl.pathname;

    if (!token) {
      return NextResponse.redirect(new URL("/login", req.url));
    }

    const role = token.role as string;

    // Super admin can access everything
    if (role === "super_admin") {
      return NextResponse.next();
    }

    // Role-based access control for specific paths
    const rolePaths: Record<string, string> = {
      publishing: "/publishing",
      digital_prints: "/digital-prints",
      tech_services: "/tech-services",
      ecafe: "/ecafe",
    };

    const allowedPath = rolePaths[role];

    // If user is accessing a restricted path that doesn't belong to them
    if (path.startsWith("/publishing") || 
        path.startsWith("/digital-prints") || 
        path.startsWith("/tech-services") || 
        path.startsWith("/ecafe")) {
      
      if (path !== allowedPath) {
        // Redirect to their allowed path or root
        return NextResponse.redirect(new URL(allowedPath || "/", req.url));
      }
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
);

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - login (login page)
     * - public files (images, etc)
     */
    "/((?!api|_next/static|_next/image|favicon.ico|login|.*\\.(?:png|jpg|jpeg|svg|gif|webp)$).*)",
  ],
};
