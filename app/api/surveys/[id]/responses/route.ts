import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

// データファイルのパス
const SURVEYS_DATA_FILE_PATH = path.join(process.cwd(), "data", "surveys.json");
const RESPONSES_DATA_FILE_PATH = path.join(
  process.cwd(),
  "data",
  "survey-responses.json"
);

// アンケートデータを読み込み
async function loadSurveys(): Promise<any[]> {
  try {
    const data = await fs.readFile(SURVEYS_DATA_FILE_PATH, "utf-8");
    return JSON.parse(data);
  } catch (error) {
    return [];
  }
}

// アンケートデータを保存
async function saveSurveys(surveys: any[]): Promise<void> {
  try {
    await fs.mkdir(path.dirname(SURVEYS_DATA_FILE_PATH), { recursive: true });
    await fs.writeFile(
      SURVEYS_DATA_FILE_PATH,
      JSON.stringify(surveys, null, 2)
    );
  } catch (error) {
    console.error("Failed to save surveys:", error);
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

// 回答データを保存
async function saveResponses(responses: any[]): Promise<void> {
  try {
    await fs.mkdir(path.dirname(RESPONSES_DATA_FILE_PATH), { recursive: true });
    await fs.writeFile(
      RESPONSES_DATA_FILE_PATH,
      JSON.stringify(responses, null, 2)
    );
  } catch (error) {
    console.error("Failed to save responses:", error);
  }
}

// POST: アンケート回答を送信
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const surveyId = id;
    const { answers, respondentInfo } = await request.json();

    // アンケートの存在確認（永続化データから）
    const surveys = await loadSurveys();
    const surveyIndex = surveys.findIndex((s: any) => s.id === surveyId);
    if (surveyIndex === -1) {
      return NextResponse.json(
        { error: "アンケートが見つかりません" },
        { status: 404 }
      );
    }

    const survey = surveys[surveyIndex];

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
      if (!answers[question.id] || answers[question.id].trim() === "") {
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
    const responseId = `response_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`;
    const newResponse = {
      id: responseId,
      surveyId,
      answers,
      respondentInfo: respondentInfo || {},
      submittedAt: new Date().toISOString(),
      ipAddress: request.headers.get("x-forwarded-for") || "unknown",
      userAgent: request.headers.get("user-agent") || "unknown",
    };

    const responses = await loadResponses();
    responses.push(newResponse);
    await saveResponses(responses);

    // アンケートの回答数を更新
    const surveyResponses = responses.filter((r) => r.surveyId === surveyId);
    surveys[surveyIndex] = {
      ...survey,
      responseCount: surveyResponses.length,
      lastResponseAt: new Date().toISOString(),
    };
    await saveSurveys(surveys);

    return NextResponse.json({
      success: true,
      responseId,
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

    // 特定のアンケートに対する回答を取得
    const responses = await loadResponses();
    const surveyResponses = responses.filter((r) => r.surveyId === surveyId);

    // 回答の統計情報を生成
    const surveys = await loadSurveys();
    const survey = surveys.find((s: any) => s.id === surveyId);
    const statistics: any = {};

    if (survey && surveyResponses.length > 0) {
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
      const date = new Date(response.submittedAt).toISOString().split("T")[0];
      respondentAnalysis.responsesByDate[date] =
        (respondentAnalysis.responsesByDate[date] || 0) + 1;

      const hour = new Date(response.submittedAt).getHours();
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
        submittedAt: response.submittedAt,
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
      survey: survey
        ? {
            id: survey.id,
            title: survey.title,
            description: survey.description,
            createdAt: survey.createdAt,
            isActive: survey.isActive,
          }
        : null,
    });
  } catch (error) {
    console.error("アンケート回答取得エラー:", error);
    return NextResponse.json(
      { error: "回答の取得に失敗しました" },
      { status: 500 }
    );
  }
}
