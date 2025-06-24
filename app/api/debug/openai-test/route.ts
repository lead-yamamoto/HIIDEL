import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]/route";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    // 管理者権限チェック
    if (session.user.email !== "demo@hiidel.com") {
      return NextResponse.json(
        { error: "管理者権限が必要です" },
        { status: 403 }
      );
    }

    const openaiApiKey = process.env.OPENAI_API_KEY;

    if (!openaiApiKey) {
      return NextResponse.json({
        success: false,
        error: "OpenAI APIキーが設定されていません",
      });
    }

    console.log("🧪 [OpenAI Test] Testing OpenAI API...");

    // シンプルなテストリクエスト
    const testResponse = await fetch(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${openaiApiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4o",
          messages: [
            {
              role: "system",
              content: "あなたは顧客サービスの専門家です。",
            },
            {
              role: "user",
              content:
                "テストメッセージです。「こんにちは」と返答してください。",
            },
          ],
          max_tokens: 50,
          temperature: 0.7,
        }),
      }
    );

    console.log("🧪 [OpenAI Test] Response status:", testResponse.status);
    console.log(
      "🧪 [OpenAI Test] Response headers:",
      Object.fromEntries(testResponse.headers.entries())
    );

    if (testResponse.ok) {
      const data = await testResponse.json();
      console.log("🧪 [OpenAI Test] Success:", data);

      return NextResponse.json({
        success: true,
        model: "gpt-4o",
        response: data.choices[0]?.message?.content,
        usage: data.usage,
        timestamp: new Date().toISOString(),
      });
    } else {
      const errorData = await testResponse.text();
      console.error("🧪 [OpenAI Test] Error:", errorData);

      let parsedError;
      try {
        parsedError = JSON.parse(errorData);
      } catch {
        parsedError = { raw: errorData };
      }

      return NextResponse.json({
        success: false,
        error: "OpenAI API error",
        status: testResponse.status,
        statusText: testResponse.statusText,
        details: parsedError,
        timestamp: new Date().toISOString(),
      });
    }
  } catch (error) {
    console.error("🧪 [OpenAI Test] Exception:", error);
    return NextResponse.json({
      success: false,
      error: "OpenAI APIテスト中にエラーが発生しました",
      details: error instanceof Error ? error.message : "Unknown error",
      timestamp: new Date().toISOString(),
    });
  }
}
