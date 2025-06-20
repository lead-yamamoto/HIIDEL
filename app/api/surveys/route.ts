import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { promises as fs } from "fs";
import path from "path";

// データファイルのパス
const DATA_FILE_PATH = path.join(process.cwd(), "data", "surveys.json");

// ファイルからアンケートデータを読み込み
async function loadSurveys(): Promise<any[]> {
  try {
    await fs.mkdir(path.dirname(DATA_FILE_PATH), { recursive: true });
    const data = await fs.readFile(DATA_FILE_PATH, "utf-8");
    return JSON.parse(data);
  } catch (error) {
    // ファイルが存在しない場合は初期データを返す
    const initialData = [
      {
        id: "1",
        title: "カフェ満足度調査",
        description: "お客様のご意見をお聞かせください。",
        createdAt: "2024-01-15T10:00:00Z",
        isActive: true,
        userId: "demo@hiidel.com",
        questions: [
          {
            id: 1,
            type: "rating",
            question: "サービスの満足度を教えてください",
            required: true,
            options: [],
          },
          {
            id: 2,
            type: "text",
            question: "改善点があれば教えてください",
            required: false,
            options: [],
          },
        ],
        responses: [],
        shareUrl: `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/s/1`,
      },
    ];
    await saveSurveys(initialData);
    return initialData;
  }
}

// ファイルにアンケートデータを保存
async function saveSurveys(surveys: any[]): Promise<void> {
  try {
    await fs.mkdir(path.dirname(DATA_FILE_PATH), { recursive: true });
    await fs.writeFile(DATA_FILE_PATH, JSON.stringify(surveys, null, 2));
  } catch (error) {
    console.error("Failed to save surveys:", error);
  }
}

// アンケートデータの取得（動的読み込み）
async function getSurveys(): Promise<any[]> {
  return await loadSurveys();
}

// GET: アンケート一覧取得
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();

    if (!session?.user?.email) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const surveys = await getSurveys();

    // 回答数を最新データから計算
    try {
      const responsesData = await fs.readFile(
        path.join(process.cwd(), "data", "survey-responses.json"),
        "utf-8"
      );
      const responses = JSON.parse(responsesData);

      // 各アンケートの回答数を計算
      surveys.forEach((survey, index) => {
        const surveyResponses = responses.filter(
          (r: any) => r.surveyId === survey.id
        );
        surveys[index] = {
          ...survey,
          responseCount: surveyResponses.length,
        };
      });
    } catch (error) {
      // 回答ファイルが存在しない場合は回答数0
      surveys.forEach((survey, index) => {
        surveys[index] = {
          ...survey,
          responseCount: 0,
        };
      });
    }

    const userSurveys = surveys.filter(
      (survey) => survey.userId === session.user.email
    );

    return NextResponse.json({
      surveys: userSurveys,
      count: userSurveys.length,
    });
  } catch (error) {
    console.error("アンケート取得エラー:", error);
    return NextResponse.json(
      { error: "アンケートの取得に失敗しました" },
      { status: 500 }
    );
  }
}

// POST: 新しいアンケート作成
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();

    if (!session?.user?.email) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const { title, description, questions, storeId } = await request.json();

    // 店舗IDのバリデーション
    if (!storeId) {
      return NextResponse.json(
        { error: "店舗の選択が必要です" },
        { status: 400 }
      );
    }

    // 新しいアンケートID生成
    const newId = `survey_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`;

    // アンケートURL生成
    const shareUrl = `${
      process.env.NEXTAUTH_URL || "http://localhost:3000"
    }/s/${newId}`;

    const newSurvey = {
      id: newId,
      title: title || "新しいアンケート",
      description: description || "お客様のご意見をお聞かせください。",
      createdAt: new Date().toISOString(),
      isActive: true,
      userId: session.user.email,
      storeId: storeId,
      questions: questions || [
        {
          id: 1,
          type: "rating",
          question: "満足度を教えてください",
          required: true,
          options: [],
        },
      ],
      responses: [],
      shareUrl,
    };

    const surveys = await getSurveys();
    surveys.push(newSurvey);
    await saveSurveys(surveys);

    return NextResponse.json({
      survey: newSurvey,
      message: "アンケートが作成されました",
    });
  } catch (error) {
    console.error("アンケート作成エラー:", error);
    return NextResponse.json(
      { error: "アンケートの作成に失敗しました" },
      { status: 500 }
    );
  }
}

// PUT: アンケート更新
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession();

    if (!session?.user?.email) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const { id, title, description, questions, isActive, storeId } =
      await request.json();

    const surveys = await getSurveys();
    const surveyIndex = surveys.findIndex(
      (survey) => survey.id === id && survey.userId === session.user.email
    );

    if (surveyIndex === -1) {
      return NextResponse.json(
        { error: "アンケートが見つかりません" },
        { status: 404 }
      );
    }

    surveys[surveyIndex] = {
      ...surveys[surveyIndex],
      title: title || surveys[surveyIndex].title,
      description: description || surveys[surveyIndex].description,
      questions: questions || surveys[surveyIndex].questions,
      storeId: storeId || surveys[surveyIndex].storeId,
      isActive:
        isActive !== undefined ? isActive : surveys[surveyIndex].isActive,
      updatedAt: new Date().toISOString(),
    };

    await saveSurveys(surveys);

    return NextResponse.json({
      survey: surveys[surveyIndex],
      message: "アンケートが更新されました",
    });
  } catch (error) {
    console.error("アンケート更新エラー:", error);
    return NextResponse.json(
      { error: "アンケートの更新に失敗しました" },
      { status: 500 }
    );
  }
}

// DELETE: アンケート削除
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession();

    if (!session?.user?.email) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "アンケートIDが必要です" },
        { status: 400 }
      );
    }

    const surveys = await getSurveys();
    const surveyIndex = surveys.findIndex(
      (survey) => survey.id === id && survey.userId === session.user.email
    );

    if (surveyIndex === -1) {
      return NextResponse.json(
        { error: "アンケートが見つかりません" },
        { status: 404 }
      );
    }

    surveys.splice(surveyIndex, 1);
    await saveSurveys(surveys);

    return NextResponse.json({
      message: "アンケートが削除されました",
    });
  } catch (error) {
    console.error("アンケート削除エラー:", error);
    return NextResponse.json(
      { error: "アンケートの削除に失敗しました" },
      { status: 500 }
    );
  }
}

// exportする必要がある場合（他のファイルからアクセス用）
export { getSurveys as surveys };
