import { NextResponse } from "next/server";
import { db } from "@/lib/database";

async function getAuthenticatedUserId(): Promise<string | null> {
  // セッション管理は簡素化
  return "1"; // demo@hiidel.comのユーザーID
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
