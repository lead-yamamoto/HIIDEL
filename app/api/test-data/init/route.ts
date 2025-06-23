import { NextResponse } from "next/server";
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

    // セッションが見つからない場合はnullを返す（フォールバックしない）
    console.log("⚠️ セッションが見つかりません - 認証が必要です");
    return null;
  } catch (error) {
    console.error("認証エラー:", error);
    return null;
  }
}

export async function POST() {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("🧪 Initializing test data for user:", userId);

    // テストデータを初期化
    await db.initializeTestData(userId);

    console.log("✅ Test data initialized successfully");

    return NextResponse.json({
      success: true,
      message: "Test data initialized successfully",
    });
  } catch (error) {
    console.error("❌ Error initializing test data:", error);
    return NextResponse.json(
      {
        error: "Failed to initialize test data",
      },
      { status: 500 }
    );
  }
}
