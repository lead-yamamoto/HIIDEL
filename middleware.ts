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
     * 認証が必要なページのみマッチさせる
     * 除外するパス:
     * - /api/auth/* (NextAuth routes)
     * - /api/google/* (Google integration)
     * - /api/analytics/* (Analytics)
     * - /api/surveys/* (Survey routes - public)
     * - /api/stores* (Store routes - public for surveys)
     * - /s/* (Survey response pages)
     * - /auth/* (Auth pages)
     * - /_next/* (Next.js internals)
     * - /favicon.ico
     * - static files
     */
    "/((?!api/auth/|api/google/|api/analytics/|api/surveys|api/stores|s/|auth/|_next/|favicon\\.ico|.*\\.(svg|png|jpg|jpeg|webp|ico)$).*)",
  ],
};
