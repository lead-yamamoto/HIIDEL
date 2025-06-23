import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { db } from "@/lib/database";

async function getAuthenticatedUserId(): Promise<string | null> {
  try {
    const session = await getServerSession(authOptions);
    if (session?.user?.id) {
      console.log("✅ 認証されたユーザーID:", session.user.id);
      return session.user.id;
    }
    console.log("⚠️ セッションが見つからない、フォールバックを使用");
    // フォールバック: デモユーザー
    return "1";
  } catch (error) {
    console.error("認証エラー:", error);
    return "1"; // フォールバック
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("🔄 Initializing test data for user:", userId);

    await db.initializeTestData(userId);

    console.log("✅ Test data initialized successfully");

    return NextResponse.json({
      success: true,
      message: "Test data initialized successfully",
    });
  } catch (error) {
    console.error("Init Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
