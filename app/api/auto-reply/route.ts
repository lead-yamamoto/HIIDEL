import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]/route";
import { db } from "@/lib/database";

// 自動返信の実行
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
    const { storeId, force = false } = body;

    console.log(
      "🤖 [Auto Reply] Starting auto-reply for user:",
      user.id,
      "store:",
      storeId
    );

    // AI設定を取得
    const aiSettings = await db.getAISettings(user.id, storeId);
    if (!aiSettings) {
      return NextResponse.json(
        { error: "AI設定が見つかりません" },
        { status: 404 }
      );
    }

    if (!aiSettings.autoReplyEnabled && !force) {
      return NextResponse.json({
        success: false,
        message: "自動返信が無効になっています",
        processed: 0,
      });
    }

    // 営業時間チェック
    if (
      aiSettings.autoReplyBusinessHoursOnly &&
      !force &&
      !isWithinBusinessHours(aiSettings)
    ) {
      return NextResponse.json({
        success: false,
        message: "営業時間外のため自動返信をスキップしました",
        processed: 0,
      });
    }

    // 未返信レビューを取得
    const unrepliedReviews = await db.getUnrepliedReviews(user.id, storeId);

    // レビューをフィルタリング（評価範囲、時間など）
    const eligibleReviews = unrepliedReviews.filter((review) => {
      // 評価範囲チェック
      if (
        review.rating < aiSettings.autoReplyMinRating ||
        review.rating > aiSettings.autoReplyMaxRating
      ) {
        return false;
      }

      // 遅延時間チェック（強制実行でない場合）
      if (!force) {
        const reviewTime = new Date(review.createdAt);
        const now = new Date();
        const diffMinutes =
          (now.getTime() - reviewTime.getTime()) / (1000 * 60);

        if (diffMinutes < aiSettings.autoReplyDelayMinutes) {
          return false;
        }
      }

      return true;
    });

    console.log(
      `📋 [Auto Reply] Found ${eligibleReviews.length} eligible reviews for auto-reply`
    );

    let processedCount = 0;
    const results = [];

    for (const review of eligibleReviews) {
      try {
        // AI返信を生成
        const replyResponse = await generateAIReply(
          review,
          aiSettings,
          user.id
        );

        if (replyResponse.success) {
          // データベースに返信を保存
          const success = await db.replyToReview(
            review.id,
            replyResponse.reply,
            user.id
          );

          if (success) {
            processedCount++;
            results.push({
              reviewId: review.id,
              success: true,
              reply: replyResponse.reply,
              metadata: replyResponse.metadata,
            });

            console.log(
              `✅ [Auto Reply] Successfully replied to review ${review.id}`
            );
          } else {
            results.push({
              reviewId: review.id,
              success: false,
              error: "データベース保存に失敗",
            });
          }
        } else {
          results.push({
            reviewId: review.id,
            success: false,
            error: replyResponse.error || "AI返信生成に失敗",
          });
        }
      } catch (error) {
        console.error(
          `❌ [Auto Reply] Error processing review ${review.id}:`,
          error
        );
        results.push({
          reviewId: review.id,
          success: false,
          error: error instanceof Error ? error.message : "未知のエラー",
        });
      }

      // レート制限を避けるため少し待機
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    console.log(
      `🎉 [Auto Reply] Completed: ${processedCount}/${eligibleReviews.length} reviews processed`
    );

    return NextResponse.json({
      success: true,
      message: `${processedCount}件のレビューに自動返信しました`,
      processed: processedCount,
      total: eligibleReviews.length,
      results: results,
    });
  } catch (error) {
    console.error("💥 [Auto Reply] Error in auto-reply:", error);
    return NextResponse.json(
      {
        error: "自動返信の実行に失敗しました",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// 営業時間内かどうかをチェック
function isWithinBusinessHours(settings: any): boolean {
  const now = new Date();
  const currentTime =
    now.getHours().toString().padStart(2, "0") +
    ":" +
    now.getMinutes().toString().padStart(2, "0");

  return (
    currentTime >= settings.businessHoursStart &&
    currentTime <= settings.businessHoursEnd
  );
}

// AI返信を生成する関数
async function generateAIReply(review: any, settings: any, userId: string) {
  try {
    const reviewText = review.text?.trim() || "";
    const hasReviewText = reviewText.length > 0;
    const isPositive = review.rating >= 4;
    const isNeutral = review.rating === 3;

    // プロンプトを選択
    let prompt: string;
    if (settings.customPromptEnabled) {
      if (!hasReviewText) {
        prompt = settings.noCommentReviewPrompt;
      } else if (isPositive) {
        prompt = settings.positiveReviewPrompt;
      } else if (isNeutral) {
        prompt = settings.neutralReviewPrompt;
      } else {
        prompt = settings.negativeReviewPrompt;
      }
    } else {
      // デフォルトプロンプト
      if (!hasReviewText) {
        prompt =
          "この度は{店舗名}をご利用いただき、ありがとうございます。評価をいただき、スタッフ一同大変嬉しく思っております。今後もお客様にご満足いただけるよう、サービス向上に努めてまいります。またのご利用を心よりお待ちしております。";
      } else if (isPositive) {
        prompt =
          "この度は{店舗名}をご利用いただき、ありがとうございます。お客様からの温かいお言葉を頂戴し、スタッフ一同大変嬉しく思っております。今後もより良いサービスを提供できるよう努めてまいります。またのご利用を心よりお待ちしております。";
      } else if (isNeutral) {
        prompt =
          "この度は{店舗名}をご利用いただき、ありがとうございます。貴重なご意見をいただき、サービス向上のための参考にさせていただきます。何かご不明点がございましたら、お気軽にお問い合わせください。";
      } else {
        prompt =
          "この度は{店舗名}をご利用いただき、ありがとうございました。ご不便をおかけし申し訳ございません。ご指摘いただいた点について早急に改善いたします。詳細についてお話を伺いたいので、よろしければご連絡いただけますと幸いです。";
      }
    }

    // 店舗情報を取得してプロンプトに挿入
    const stores = await db.getStores(userId);
    const store = stores.find((s) => s.id === review.storeId);
    const storeName = store?.displayName || "当店";

    // プロンプト内の変数を置換
    const processedPrompt = prompt.replace(/\{店舗名\}/g, storeName);

    // AI返信APIを呼び出し
    const aiResponse = await fetch(
      `${process.env.NEXTAUTH_URL}/api/ai/review-reply`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          reviewText: reviewText,
          rating: review.rating,
          businessName: storeName,
          businessType: store?.category || "ビジネス",
          customPrompt: processedPrompt,
          useCustomPrompt: settings.customPromptEnabled,
        }),
      }
    );

    if (!aiResponse.ok) {
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const result = await aiResponse.json();

    if (result.success) {
      return {
        success: true,
        reply: result.reply,
        metadata: {
          ...result.metadata,
          autoGenerated: true,
          usedCustomPrompt: settings.customPromptEnabled,
        },
      };
    } else {
      throw new Error(result.error || "AI返信生成に失敗");
    }
  } catch (error) {
    console.error("❌ Error generating AI reply:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "AI返信生成エラー",
    };
  }
}
