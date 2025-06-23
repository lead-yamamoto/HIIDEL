import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { promises as fs } from "fs";
import path from "path";

// データファイルのパス
const SURVEYS_DATA_FILE_PATH = path.join(process.cwd(), "data", "surveys.json");
const RESPONSES_DATA_FILE_PATH = path.join(
  process.cwd(),
  "data",
  "survey-responses.json"
);

async function getAuthenticatedUserId(): Promise<string | null> {
  try {
    const session = await getServerSession(authOptions);
    if (session?.user?.id) {
      console.log("✅ 認証されたユーザーID:", session.user.id);
      return session.user.id;
    }
    console.log("⚠️ セッションが見つからない、フォールバックを使用");
    // フォールバック: デモユーザー
    return "1";
  } catch (error) {
    console.error("認証エラー:", error);
    return "1"; // フォールバック
  }
}

// アンケートデータを読み込み
async function loadSurveys(): Promise<any[]> {
  try {
    const data = await fs.readFile(SURVEYS_DATA_FILE_PATH, "utf-8");
    return JSON.parse(data);
  } catch (error) {
    return [];
  }
}

// 回答データを読み込み
async function loadResponses(): Promise<any[]> {
  try {
    const data = await fs.readFile(RESPONSES_DATA_FILE_PATH, "utf-8");
    return JSON.parse(data);
  } catch (error) {
    return [];
  }
}

export async function GET(request: NextRequest) {
  console.log("🚀 === IMPROVEMENT FEEDBACKS API CALLED ===");
  console.log(`📅 Timestamp: ${new Date().toISOString()}`);
  console.log(`🔗 Request URL: ${request.url}`);

  try {
    const userId = await getAuthenticatedUserId();
    console.log(`👤 Authentication check - User ID: ${userId}`);

    if (!userId) {
      console.log("❌ User not authenticated - returning 401");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = searchParams.get("limit")
      ? parseInt(searchParams.get("limit")!)
      : 10;

    console.log(`📊 Fetching improvement feedbacks (limit: ${limit})`);

    // アンケートと回答データを読み込み
    const surveys = await loadSurveys();
    const responses = await loadResponses();

    console.log(
      `📋 Found ${surveys.length} surveys and ${responses.length} responses`
    );

    const improvementFeedbacks: any[] = [];

    // 各回答を確認
    for (const response of responses) {
      try {
        // 回答データから改善点を抽出
        const answers = response.answers || {};
        const respondentInfo = response.respondentInfo || {};

        console.log(`📝 Processing response:`, {
          id: response.id,
          surveyId: response.surveyId,
          hasAnswers: !!answers,
          answerKeys: Object.keys(answers),
          averageRating: respondentInfo.averageRating,
        });

        // 改善点テキストを取得
        let improvementText = "";
        if (answers.improvement && typeof answers.improvement === "string") {
          improvementText = answers.improvement;
        } else if (
          answers.improvementText &&
          typeof answers.improvementText === "string"
        ) {
          improvementText = answers.improvementText;
        }

        // 平均評価を取得
        const averageRating = respondentInfo.averageRating || 0;

        console.log(
          `⭐ Response ${
            response.id
          } - Average rating: ${averageRating}, Improvement text: ${
            improvementText ? "Yes" : "No"
          }`
        );

        // 星3.9以下で改善点テキストがある場合のみ追加
        if (averageRating <= 3.9 && improvementText && improvementText.trim()) {
          // 対応するアンケートを取得
          const survey = surveys.find((s: any) => s.id === response.surveyId);

          improvementFeedbacks.push({
            id: response.id,
            surveyId: response.surveyId,
            surveyTitle: survey?.title || survey?.name || "アンケート",
            improvementText: improvementText.trim(),
            averageRating: Math.round(averageRating * 10) / 10, // 小数点1桁まで
            submittedAt: response.submittedAt,
            responseData: answers,
          });

          console.log(
            `✅ Added improvement feedback from response ${response.id}`
          );
        }
      } catch (error) {
        console.error(`❌ Error processing response ${response.id}:`, error);
      }
    }

    // 提出日時でソート（新しい順）
    improvementFeedbacks.sort(
      (a, b) =>
        new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
    );

    // limit適用
    const limitedFeedbacks =
      limit > 0 ? improvementFeedbacks.slice(0, limit) : improvementFeedbacks;

    console.log(
      `📊 Total improvement feedbacks found: ${improvementFeedbacks.length}`
    );
    console.log(`📊 Returning ${limitedFeedbacks.length} feedbacks`);

    return NextResponse.json({
      feedbacks: limitedFeedbacks,
      count: limitedFeedbacks.length,
      totalCount: improvementFeedbacks.length,
      limit: limit,
      message:
        limitedFeedbacks.length === 0
          ? "改善点のフィードバックはありません。"
          : `${limitedFeedbacks.length}件の改善点フィードバックを取得しました。`,
    });
  } catch (error) {
    console.error("Improvement Feedbacks GET Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
