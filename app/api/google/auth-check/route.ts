import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]/route";
import { db } from "../../../../lib/database";

export async function GET(request: NextRequest) {
  try {
    console.log("🔍 [Google Auth Check] Starting authentication check");

    // セッション情報を取得
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({
        needsAuth: true,
        reason: "no_session",
        message: "ログインが必要です",
        redirectTo: "/auth/signin",
      });
    }

    console.log("👤 [Google Auth Check] User found:", session.user.email);

    // データベースからユーザー情報を取得
    await db.ensureInitialized();
    const user = await db.getUser(session.user.email);

    if (!user) {
      return NextResponse.json({
        needsAuth: true,
        reason: "user_not_found",
        message: "ユーザー情報が見つかりません",
        redirectTo: "/auth/signin",
      });
    }

    // Google連携状況をチェック
    if (!user.isGoogleConnected) {
      console.log("⚠️ [Google Auth Check] User not connected to Google");
      return NextResponse.json({
        needsAuth: true,
        reason: "google_not_connected",
        message: "Google Business Profileとの連携が必要です",
        redirectTo: "/google-business/connect",
      });
    }

    // Googleアクセストークンをチェック
    const accessToken = await db.getGoogleAccessToken(session.user.email);

    if (!accessToken) {
      console.log("⚠️ [Google Auth Check] No valid access token");
      return NextResponse.json({
        needsAuth: true,
        reason: "no_access_token",
        message: "Google認証の更新が必要です。再度連携してください。",
        redirectTo: "/google-business/connect",
      });
    }

    // トークンの有効性をGoogleで確認
    try {
      console.log("🔗 [Google Auth Check] Validating token with Google");
      const googleResponse = await fetch(
        "https://www.googleapis.com/oauth2/v1/userinfo",
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (!googleResponse.ok) {
        console.log("❌ [Google Auth Check] Token validation failed");

        // 無効なトークンをクリーンアップ
        await db.updateUserGoogleConnection(session.user.email, false);

        return NextResponse.json({
          needsAuth: true,
          reason: "invalid_token",
          message: "Google認証が無効になっています。再度連携してください。",
          redirectTo: "/google-business/connect",
        });
      }

      const userInfo = await googleResponse.json();
      console.log("✅ [Google Auth Check] Token validation successful");

      return NextResponse.json({
        needsAuth: false,
        isAuthenticated: true,
        userInfo: {
          email: userInfo.email,
          name: userInfo.name,
        },
        message: "Google認証は正常です",
      });
    } catch (error) {
      console.error("💥 [Google Auth Check] Token validation error:", error);
      return NextResponse.json({
        needsAuth: true,
        reason: "validation_error",
        message:
          "Google認証の確認中にエラーが発生しました。再度連携してください。",
        redirectTo: "/google-business/connect",
      });
    }
  } catch (error) {
    console.error("💥 [Google Auth Check] Error:", error);
    return NextResponse.json(
      {
        needsAuth: true,
        reason: "system_error",
        message: "システムエラーが発生しました",
        redirectTo: "/auth/signin",
      },
      { status: 500 }
    );
  }
}
