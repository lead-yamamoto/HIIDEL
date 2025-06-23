import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/database";

async function getAuthenticatedUserId(): Promise<string | null> {
  // セッション管理は簡素化
  return "1"; // demo@hiidel.comのユーザーID
}

// POST: アンケート回答を送信（公開アクセス可能）
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const surveyId = id;
    const { answers, respondentInfo } = await request.json();

    console.log(
      `📝 Submitting survey response (public access) for: ${surveyId}`
    );
    console.log(`📊 Answers:`, answers);
    console.log(`ℹ️ Respondent info:`, respondentInfo);

    // アンケートの存在確認（全ユーザーから検索）
    let survey = null;
    const users = ["1"]; // 現在は demo ユーザーのみ
    for (const userId of users) {
      const userSurveys = await db.getSurveys(userId);
      survey = userSurveys.find((s) => s.id === surveyId);
      if (survey) break;
    }

    if (!survey) {
      console.log(`❌ Survey not found: ${surveyId}`);
      return NextResponse.json(
        { error: "アンケートが見つかりません" },
        { status: 404 }
      );
    }

    // アンケートがアクティブか確認
    if (!survey.isActive) {
      console.log(`❌ Survey is inactive: ${surveyId}`);
      return NextResponse.json(
        { error: "このアンケートは現在利用できません" },
        { status: 400 }
      );
    }

    // 回答の検証
    const requiredQuestions = survey.questions.filter((q) => q.required);
    for (const question of requiredQuestions) {
      const answerId = question.id.toString();
      if (!answers[answerId] || answers[answerId].toString().trim() === "") {
        console.log(`❌ Required question not answered: ${question.id}`);
        return NextResponse.json(
          {
            error: `必須項目「${question.question}」に回答してください`,
            questionId: question.id,
          },
          { status: 400 }
        );
      }
    }

    // 新しい回答を保存
    const newResponse = await db.createSurveyResponse({
      surveyId,
      storeId: survey.storeId,
      responses: {
        answers,
        respondentInfo: respondentInfo || {},
        submittedAt: new Date().toISOString(),
        ipAddress: request.headers.get("x-forwarded-for") || "unknown",
        userAgent: request.headers.get("user-agent") || "unknown",
      },
    });

    console.log(`✅ Survey response created: ${newResponse.id}`);

    return NextResponse.json({
      success: true,
      responseId: newResponse.id,
      message: "アンケートの回答をありがとうございました！",
    });
  } catch (error) {
    console.error("アンケート回答送信エラー:", error);
    return NextResponse.json(
      { error: "回答の送信に失敗しました" },
      { status: 500 }
    );
  }
}

// GET: アンケートの回答一覧を取得（管理者用）
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const surveyId = id;
    const userId = await getAuthenticatedUserId();

    if (!userId) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    console.log(`📊 Getting responses for survey: ${surveyId}`);

    // 特定のアンケートに対する回答を取得
    const responses = await db.getSurveyResponses(surveyId, userId);

    console.log(`📊 Found ${responses.length} responses`);

    // アンケート詳細を取得
    const surveys = await db.getSurveys(userId);
    const survey = surveys.find((s) => s.id === surveyId);

    if (!survey) {
      return NextResponse.json(
        { error: "アンケートが見つかりません" },
        { status: 404 }
      );
    }

    // 回答の統計情報を生成
    const statistics: any = {};

    if (responses.length > 0) {
      survey.questions.forEach((question) => {
        const questionId = question.id.toString();
        const questionResponses = responses
          .map((r) => r.responses.answers?.[questionId])
          .filter((answer) => answer !== undefined && answer !== "");

        statistics[questionId] = {
          question: question.question,
          type: question.type,
          totalResponses: questionResponses.length,
          responses: questionResponses,
        };

        // 選択肢質問の場合の集計
        if (question.type === "choice" && question.options) {
          const counts: any = {};
          question.options.forEach((option: string) => {
            counts[option] = questionResponses.filter(
              (r) => r === option
            ).length;
          });
          statistics[questionId].optionCounts = counts;
        }

        // 評価質問の場合の平均計算
        if (question.type === "rating") {
          const numericResponses = questionResponses
            .map((r) => parseFloat(r))
            .filter((r) => !isNaN(r));

          if (numericResponses.length > 0) {
            statistics[questionId].average =
              numericResponses.reduce((sum, val) => sum + val, 0) /
              numericResponses.length;
            statistics[questionId].distribution = {};
            for (let i = 1; i <= 5; i++) {
              statistics[questionId].distribution[i] = numericResponses.filter(
                (r) => r === i
              ).length;
            }
          }
        }
      });
    }

    return NextResponse.json({
      survey: {
        id: survey.id,
        name: survey.name,
        title: survey.name,
        questions: survey.questions,
        storeId: survey.storeId,
      },
      responses: responses.map((r) => ({
        id: r.id,
        answers: r.responses.answers,
        respondentInfo: r.responses.respondentInfo,
        submittedAt: r.responses.submittedAt || r.createdAt.toISOString(),
      })),
      statistics,
      totalResponses: responses.length,
    });
  } catch (error) {
    console.error("アンケート回答取得エラー:", error);
    return NextResponse.json(
      { error: "回答の取得に失敗しました" },
      { status: 500 }
    );
  }
}
