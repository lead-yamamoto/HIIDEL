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
     * 除外パターン: 公開アクセス可能なパス
     * 残りのパスに認証を適用
     */
    "/((?!api/auth|api/google|api/analytics|api/surveys|api/stores|s|auth|_next|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|webp|ico)).*)",
  ],
};
