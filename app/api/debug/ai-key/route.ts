import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]/route";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    // 管理者権限チェック（必要に応じて）
    if (session.user.email !== "demo@hiidel.com") {
      return NextResponse.json(
        { error: "管理者権限が必要です" },
        { status: 403 }
      );
    }

    const openaiApiKey = process.env.OPENAI_API_KEY;
    const geminiApiKey = process.env.GEMINI_API_KEY;

    console.log("🔑 [Debug] API keys check:", {
      openai: !!openaiApiKey,
      gemini: !!geminiApiKey,
      openaiLength: openaiApiKey?.length,
      geminiLength: geminiApiKey?.length,
    });

    return NextResponse.json({
      success: true,
      apiKeys: {
        openai: {
          exists: !!openaiApiKey,
          length: openaiApiKey?.length || 0,
          prefix: openaiApiKey ? openaiApiKey.substring(0, 7) + "..." : null,
        },
        gemini: {
          exists: !!geminiApiKey,
          length: geminiApiKey?.length || 0,
          prefix: geminiApiKey ? geminiApiKey.substring(0, 7) + "..." : null,
        },
      },
      environment: process.env.NODE_ENV,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("💥 [Debug] API key check error:", error);
    return NextResponse.json(
      {
        error: "デバッグ情報の取得に失敗しました",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
