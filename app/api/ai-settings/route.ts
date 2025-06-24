import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]/route";
import { db } from "@/lib/database";

// AI設定の取得
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const user = await db.getUser(session.user.email);
    if (!user) {
      return NextResponse.json(
        { error: "ユーザーが見つかりません" },
        { status: 404 }
      );
    }

    const url = new URL(request.url);
    const storeId = url.searchParams.get("storeId");

    console.log(
      "🔍 [AI Settings] Getting settings for user:",
      user.id,
      "store:",
      storeId
    );

    const settings = await db.getAISettings(user.id, storeId || undefined);

    if (!settings) {
      // デフォルト設定を返す
      const defaultSettings = {
        customPromptEnabled: false,
        positiveReviewPrompt:
          "この度は{店舗名}をご利用いただき、ありがとうございます。お客様からの温かいお言葉を頂戴し、スタッフ一同大変嬉しく思っております。今後もより良いサービスを提供できるよう努めてまいります。またのご利用を心よりお待ちしております。",
        neutralReviewPrompt:
          "この度は{店舗名}をご利用いただき、ありがとうございます。貴重なご意見をいただき、サービス向上のための参考にさせていただきます。何かご不明点がございましたら、お気軽にお問い合わせください。",
        negativeReviewPrompt:
          "この度は{店舗名}をご利用いただき、ありがとうございました。ご不便をおかけし申し訳ございません。ご指摘いただいた点について早急に改善いたします。詳細についてお話を伺いたいので、よろしければご連絡いただけますと幸いです。",
        noCommentReviewPrompt:
          "この度は{店舗名}をご利用いただき、ありがとうございます。評価をいただき、スタッフ一同大変嬉しく思っております。今後もお客様にご満足いただけるよう、サービス向上に努めてまいります。またのご利用を心よりお待ちしております。",
        autoReplyEnabled: false,
        autoReplyDelayMinutes: 60,
        autoReplyBusinessHoursOnly: true,
        businessHoursStart: "09:00",
        businessHoursEnd: "18:00",
        autoReplyMinRating: 1,
        autoReplyMaxRating: 5,
      };

      return NextResponse.json({
        success: true,
        settings: defaultSettings,
        isDefault: true,
      });
    }

    return NextResponse.json({
      success: true,
      settings: settings,
      isDefault: false,
    });
  } catch (error) {
    console.error("💥 [AI Settings] Error getting settings:", error);
    return NextResponse.json(
      {
        error: "AI設定の取得に失敗しました",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// AI設定の保存・更新
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const user = await db.getUser(session.user.email);
    if (!user) {
      return NextResponse.json(
        { error: "ユーザーが見つかりません" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const {
      storeId,
      customPromptEnabled,
      positiveReviewPrompt,
      neutralReviewPrompt,
      negativeReviewPrompt,
      noCommentReviewPrompt,
      autoReplyEnabled,
      autoReplyDelayMinutes,
      autoReplyBusinessHoursOnly,
      businessHoursStart,
      businessHoursEnd,
      autoReplyMinRating,
      autoReplyMaxRating,
    } = body;

    console.log(
      "💾 [AI Settings] Saving settings for user:",
      user.id,
      "store:",
      storeId
    );

    const settingsData = {
      userId: user.id,
      storeId: storeId || undefined,
      customPromptEnabled: !!customPromptEnabled,
      positiveReviewPrompt: positiveReviewPrompt || "",
      neutralReviewPrompt: neutralReviewPrompt || "",
      negativeReviewPrompt: negativeReviewPrompt || "",
      noCommentReviewPrompt: noCommentReviewPrompt || "",
      autoReplyEnabled: !!autoReplyEnabled,
      autoReplyDelayMinutes: parseInt(autoReplyDelayMinutes) || 60,
      autoReplyBusinessHoursOnly: !!autoReplyBusinessHoursOnly,
      businessHoursStart: businessHoursStart || "09:00",
      businessHoursEnd: businessHoursEnd || "18:00",
      autoReplyMinRating: parseInt(autoReplyMinRating) || 1,
      autoReplyMaxRating: parseInt(autoReplyMaxRating) || 5,
    };

    const updatedSettings = await db.createOrUpdateAISettings(settingsData);

    console.log("✅ [AI Settings] Settings saved successfully");

    return NextResponse.json({
      success: true,
      settings: updatedSettings,
      message: "AI設定が保存されました",
    });
  } catch (error) {
    console.error("💥 [AI Settings] Error saving settings:", error);
    return NextResponse.json(
      {
        error: "AI設定の保存に失敗しました",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// AI設定の削除
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const user = await db.getUser(session.user.email);
    if (!user) {
      return NextResponse.json(
        { error: "ユーザーが見つかりません" },
        { status: 404 }
      );
    }

    const url = new URL(request.url);
    const storeId = url.searchParams.get("storeId");

    console.log(
      "🗑️ [AI Settings] Deleting settings for user:",
      user.id,
      "store:",
      storeId
    );

    const deleted = await db.deleteAISettings(user.id, storeId || undefined);

    if (!deleted) {
      return NextResponse.json(
        { error: "設定が見つかりません" },
        { status: 404 }
      );
    }

    console.log("✅ [AI Settings] Settings deleted successfully");

    return NextResponse.json({
      success: true,
      message: "AI設定が削除されました",
    });
  } catch (error) {
    console.error("💥 [AI Settings] Error deleting settings:", error);
    return NextResponse.json(
      {
        error: "AI設定の削除に失敗しました",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
