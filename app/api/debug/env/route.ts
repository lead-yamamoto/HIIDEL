import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]/route";

export async function GET() {
  try {
    // 認証チェック（本番環境でのセキュリティ）
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    // 環境変数の状態をチェック（値は隠す）
    const envStatus = {
      NODE_ENV: process.env.NODE_ENV,
      NEXTAUTH_URL: !!process.env.NEXTAUTH_URL,
      NEXTAUTH_SECRET: !!process.env.NEXTAUTH_SECRET,
      OPENAI_API_KEY: {
        isSet: !!process.env.OPENAI_API_KEY,
        length: process.env.OPENAI_API_KEY?.length || 0,
        startsWithSk: process.env.OPENAI_API_KEY?.startsWith("sk-") || false,
      },
      GEMINI_API_KEY: {
        isSet: !!process.env.GEMINI_API_KEY,
        length: process.env.GEMINI_API_KEY?.length || 0,
      },
      GOOGLE_CLIENT_ID: !!process.env.GOOGLE_CLIENT_ID,
      GOOGLE_CLIENT_SECRET: !!process.env.GOOGLE_CLIENT_SECRET,
      REDIS_URL: !!process.env.REDIS_URL,
      KV_REST_API_URL: !!process.env.KV_REST_API_URL,
      KV_REST_API_TOKEN: !!process.env.KV_REST_API_TOKEN,
    };

    return NextResponse.json({
      success: true,
      envStatus,
      timestamp: new Date().toISOString(),
      user: session.user.email,
    });
  } catch (error) {
    console.error("環境変数チェックエラー:", error);
    return NextResponse.json(
      {
        error: "環境変数のチェック中にエラーが発生しました",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
