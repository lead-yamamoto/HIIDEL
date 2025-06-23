import { withAuth } from "next-auth/middleware";

export default withAuth(
  function middleware(req) {
    // 認証済みユーザーのみアクセス可能
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
     * - api/auth (authentication routes)
     * - api/google (Google integration routes - not requiring session auth)
     * - api/analytics (analytics routes - allowing public access for dashboard)
     * - api/surveys (survey-related routes - public access)
     * - api/stores (store routes - public access for surveys)
     * - s (survey response pages - public access)
     * - auth (authentication pages)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - static assets (svg, png, jpg, etc.)
     */
    "/((?!api/auth|api/google|api/analytics|api/surveys|api/stores|s|auth|_next/static|_next/image|favicon.ico|.*\\.svg|.*\\.png|.*\\.jpg|.*\\.jpeg|.*\\.webp|.*\\.ico).*)",
  ],
};
