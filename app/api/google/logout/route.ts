import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import { db } from "../../../../lib/database";

export async function POST() {
  try {
    console.log(
      "🧹 Clearing Google authentication cookies and database tokens..."
    );

    const response = NextResponse.json({
      success: true,
      message: "Google authentication cleared",
    });

    // Google認証関連のCookieを削除
    response.cookies.set("google_access_token", "", {
      httpOnly: true,
      secure: false,
      maxAge: 0,
      path: "/",
      sameSite: "lax",
    });

    response.cookies.set("google_refresh_token", "", {
      httpOnly: true,
      secure: false,
      maxAge: 0,
      path: "/",
      sameSite: "lax",
    });

    // 🔧 データベースからもトークンを削除
    try {
      const session = await getServerSession(authOptions);
      if (session?.user?.email) {
        console.log("🗑️ Clearing database tokens for:", session.user.email);
        await db.updateUserGoogleConnection(session.user.email, false);
        await db.updateUserGoogleTokens(session.user.email, {
          accessToken: undefined,
          refreshToken: undefined,
          expiryDate: undefined,
        });
        console.log("✅ Database tokens cleared for:", session.user.email);
      }
    } catch (dbError) {
      console.error("❌ Failed to clear database tokens:", dbError);
      // Cookieはクリアされているので続行
    }

    console.log("✅ Google authentication cleared successfully");

    return response;
  } catch (error) {
    console.error("💥 Error clearing Google auth:", error);
    return NextResponse.json(
      {
        error: "Failed to clear authentication",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  // GETリクエストでも同じ処理を実行
  return POST();
}
