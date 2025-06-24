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

    console.log("🧪 [Gemini Test] Testing Gemini API...");

    const testPrompt =
      "Hello! Please reply with '正常に動作しています' in Japanese.";

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${geminiApiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: testPrompt,
                },
              ],
            },
          ],
          generationConfig: {
            maxOutputTokens: 50,
            temperature: 0.3,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("❌ [Gemini Test] API error:", {
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
    const replyText = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

    console.log("✅ [Gemini Test] API test successful:", replyText);

    return NextResponse.json({
      success: true,
      message: "Gemini API is working correctly",
      response: replyText,
      model: "gemini-pro",
      isFree: true,
      quotaInfo: "Free tier: 60 requests per minute",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("💥 [Gemini Test] Unexpected error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Gemini API test failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
