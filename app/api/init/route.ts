import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/database";

async function getAuthenticatedUserId(): Promise<string | null> {
  // セッション管理は簡素化
  return "1"; // demo@hiidel.comのユーザーID
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
