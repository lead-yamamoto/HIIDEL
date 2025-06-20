import { NextRequest, NextResponse } from "next/server";

export async function POST() {
  try {
    console.log("🧹 Clearing Google authentication cookies...");

    const response = NextResponse.json({
      success: true,
      message: "Google authentication cookies cleared",
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

    console.log("✅ Google authentication cookies cleared successfully");

    return response;
  } catch (error) {
    console.error("💥 Error clearing Google auth cookies:", error);
    return NextResponse.json(
      {
        error: "Failed to clear authentication cookies",
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
