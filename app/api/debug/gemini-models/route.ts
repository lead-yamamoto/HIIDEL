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

    const geminiApiKey = process.env.GEMINI_API_KEY;

    if (!geminiApiKey) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY environment variable is not set" },
        { status: 500 }
      );
    }

    console.log("📋 [Gemini Models] Fetching available models...");

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${geminiApiKey}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("❌ [Gemini Models] API error:", {
        status: response.status,
        error: errorData,
      });

      return NextResponse.json(
        {
          success: false,
          error: `Gemini API error: ${response.status}`,
          details: errorData.error?.message || response.statusText,
          status: response.status,
        },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log("✅ [Gemini Models] Models fetched successfully");

    // モデル情報を整理
    const models =
      data.models?.map((model: any) => ({
        name: model.name,
        displayName: model.displayName,
        description: model.description,
        supportedGenerationMethods: model.supportedGenerationMethods,
        inputTokenLimit: model.inputTokenLimit,
        outputTokenLimit: model.outputTokenLimit,
      })) || [];

    // generateContentをサポートするモデルのみフィルタ
    const generateContentModels = models.filter((model: any) =>
      model.supportedGenerationMethods?.includes("generateContent")
    );

    return NextResponse.json({
      success: true,
      message: "Available Gemini models",
      totalModels: models.length,
      generateContentModels: generateContentModels.length,
      models: models,
      generateContentSupportedModels: generateContentModels,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("💥 [Gemini Models] Unexpected error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch Gemini models",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
