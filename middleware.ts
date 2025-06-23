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
     * - api/auth: NextAuth.js認証API
     * - api/google: Google認証API
     * - api/analytics: 分析API（公開）
     * - api/surveys: アンケートAPI（公開）
     * - api/stores: 店舗API（公開）
     * - api/debug: デバッグAPI（開発用）
     * - s: アンケート回答ページ（公開）
     * - auth: 認証ページ
     * - _next: Next.jsシステムファイル
     * - 静的ファイル
     * 残りのパスに認証を適用
     */
    "/((?!api/auth|api/google|api/analytics|api/surveys|api/stores|api/debug|s/|auth|_next|favicon\\.ico).*)",
  ],
};
