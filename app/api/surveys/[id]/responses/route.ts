import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/database";

// POST: アンケート回答を送信
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const surveyId = id;
    const { answers, respondentInfo } = await request.json();

    console.log(`📝 Submitting survey response for survey: ${surveyId}`, {
      answers,
      respondentInfo,
    });

    // アンケートの存在確認
    const survey = await db.getSurvey(surveyId);
    if (!survey) {
      console.error(`❌ Survey not found: ${surveyId}`);
      return NextResponse.json(
        { error: "アンケートが見つかりません" },
        { status: 404 }
      );
    }

    console.log(`✅ Survey found:`, survey);

    // アンケートがアクティブか確認
    if (!survey.isActive) {
      return NextResponse.json(
        { error: "このアンケートは現在利用できません" },
        { status: 400 }
      );
    }

    // 回答の検証
    const requiredQuestions = survey.questions.filter((q: any) => q.required);
    for (const question of requiredQuestions) {
      if (!answers[question.id] || String(answers[question.id]).trim() === "") {
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
    const responseData = {
      surveyId,
      answers,
      respondentInfo: respondentInfo || {},
      ipAddress: request.headers.get("x-forwarded-for") || "unknown",
      userAgent: request.headers.get("user-agent") || "unknown",
    };

    console.log(`💾 Saving response data:`, responseData);

    const savedResponse = await db.saveSurveyResponse(responseData);

    console.log(`✅ Response saved successfully:`, savedResponse);

    return NextResponse.json({
      success: true,
      responseId: savedResponse.id,
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

    console.log(`📊 Getting responses for survey: ${surveyId}`);

    // アンケートの存在確認
    const survey = await db.getSurvey(surveyId);
    if (!survey) {
      return NextResponse.json(
        { error: "アンケートが見つかりません" },
        { status: 404 }
      );
    }

    // 特定のアンケートに対する回答を取得
    const surveyResponses = await db.getSurveyResponses(
      surveyId,
      survey.userId
    );

    console.log(`📊 Found ${surveyResponses.length} responses`);

    // 回答の統計情報を生成
    const statistics: any = {};

    if (surveyResponses.length > 0) {
      survey.questions.forEach((question: any) => {
        const questionResponses = surveyResponses
          .map((r) => r.answers[question.id])
          .filter((answer) => answer !== undefined && answer !== "");

        statistics[question.id] = {
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
          statistics[question.id].optionCounts = counts;
        }

        // 評価質問の場合の平均計算
        if (question.type === "rating") {
          const numericResponses = questionResponses
            .map((r) => parseFloat(r))
            .filter((r) => !isNaN(r));

          if (numericResponses.length > 0) {
            statistics[question.id].average =
              numericResponses.reduce((sum, val) => sum + val, 0) /
              numericResponses.length;
            statistics[question.id].distribution = {};
            for (let i = 1; i <= 5; i++) {
              statistics[question.id].distribution[i] = numericResponses.filter(
                (r) => r === i
              ).length;
            }
          }
        }
      });
    }

    // 回答者情報の分析
    const respondentAnalysis = {
      totalResponses: surveyResponses.length,
      responsesByDate: {} as Record<string, number>,
      responsesByHour: {} as Record<number, number>,
      averageResponseTime: 0,
    };

    // 日付別回答数
    surveyResponses.forEach((response) => {
      const date = new Date(response.createdAt).toISOString().split("T")[0];
      respondentAnalysis.responsesByDate[date] =
        (respondentAnalysis.responsesByDate[date] || 0) + 1;

      const hour = new Date(response.createdAt).getHours();
      respondentAnalysis.responsesByHour[hour] =
        (respondentAnalysis.responsesByHour[hour] || 0) + 1;
    });

    // 改善点フィードバックの抽出（星3.9以下の回答から）
    const improvementFeedbacks = surveyResponses
      .filter((response) => {
        // 改善点テキストが存在し、平均評価が3.9以下の回答を抽出
        const hasImprovement =
          response.answers.improvement &&
          response.answers.improvement.trim() !== "";
        const averageRating = response.respondentInfo?.averageRating || 0;
        return hasImprovement && averageRating <= 3.9;
      })
      .map((response) => ({
        id: response.id,
        improvementText: response.answers.improvement,
        averageRating: response.respondentInfo?.averageRating || 0,
        submittedAt: response.createdAt,
      }))
      .sort(
        (a, b) =>
          new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
      ); // 新しい順にソート

    return NextResponse.json({
      responses: surveyResponses,
      totalResponses: surveyResponses.length,
      statistics,
      respondentAnalysis,
      improvementFeedbacks,
      survey: {
        id: survey.id,
        title: survey.name,
        description: `店舗のサービス向上のためのアンケートです`,
        createdAt: survey.createdAt,
        isActive: survey.isActive,
      },
    });
  } catch (error) {
    console.error("アンケート回答取得エラー:", error);
    return NextResponse.json(
      { error: "回答の取得に失敗しました" },
      { status: 500 }
    );
  }
}
