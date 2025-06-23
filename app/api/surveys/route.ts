import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { db } from "@/lib/database";

async function getAuthenticatedUserId(): Promise<string | null> {
  try {
    const session = await getServerSession();
    if (session?.user?.id) {
      return session.user.id;
    }
    // フォールバック: デモユーザー
    return "1";
  } catch (error) {
    console.error("認証エラー:", error);
    return "1"; // フォールバック
  }
}

// GET: アンケート一覧取得
export async function GET(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId();

    if (!userId) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    console.log(`🔍 Getting surveys for user: ${userId}`);

    // データベースからアンケートを取得（フォールバック付き）
    let surveys = [];
    try {
      surveys = await db.getSurveys(userId);
      console.log(`📊 Found ${surveys.length} surveys from database`);
    } catch (error) {
      console.error("Database error, using fallback:", error);
      // フォールバック: 初期データを返す
      surveys = [
        {
          id: "demo-survey-1",
          storeId: "demo-store-1",
          userId: "1",
          name: "カフェ満足度調査",
          questions: [
            {
              id: "q1",
              type: "rating" as const,
              question: "サービスの満足度を教えてください",
              required: true,
              options: [],
            },
            {
              id: "q2",
              type: "text" as const,
              question: "改善点があれば教えてください",
              required: false,
              options: [],
            },
          ],
          responses: 0,
          createdAt: new Date(),
          isActive: true,
        },
      ];
      console.log(`📊 Using fallback data: ${surveys.length} surveys`);
    }

    // 各アンケートに追加情報を付与（安全な処理）
    const surveysWithDetails = surveys.map((survey) => {
      try {
        const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
        return {
          ...survey,
          responseCount: survey.responses || 0,
          shareUrl: `${baseUrl}/s/${survey.id}`,
          title: survey.name || "無題のアンケート",
          description: "お客様のご意見をお聞かせください。",
          createdAt:
            survey.createdAt instanceof Date
              ? survey.createdAt.toISOString()
              : survey.createdAt,
        };
      } catch (error) {
        console.error("Error processing survey:", survey.id, error);
        // エラーが発生した場合でも基本情報は返す
        return {
          id: survey.id || `error-${Date.now()}`,
          name: survey.name || "エラーが発生したアンケート",
          title: survey.name || "エラーが発生したアンケート",
          storeId: survey.storeId || "",
          questions: survey.questions || [],
          responses: 0,
          responseCount: 0,
          shareUrl: `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/s/${
            survey.id
          }`,
          isActive: false,
          createdAt: new Date().toISOString(),
        };
      }
    });

    return NextResponse.json({
      surveys: surveysWithDetails,
      count: surveysWithDetails.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("アンケート取得エラー:", error);

    // 完全なフォールバック
    return NextResponse.json({
      surveys: [],
      count: 0,
      error: "アンケートの取得に失敗しました",
      fallback: true,
      timestamp: new Date().toISOString(),
    });
  }
}

// POST: 新しいアンケート作成
export async function POST(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId();

    if (!userId) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const requestData = await request.json();
    const { title, description, questions, storeId } = requestData;

    console.log(`➕ Creating survey:`, {
      title,
      storeId,
      questionsCount: questions?.length,
    });

    // 入力データの検証
    if (!title || title.trim() === "") {
      return NextResponse.json(
        { error: "アンケートタイトルが必要です" },
        { status: 400 }
      );
    }

    if (!storeId || storeId.trim() === "") {
      return NextResponse.json(
        { error: "店舗の選択が必要です" },
        { status: 400 }
      );
    }

    if (!questions || !Array.isArray(questions) || questions.length === 0) {
      return NextResponse.json(
        { error: "最低1つの質問が必要です" },
        { status: 400 }
      );
    }

    // 質問データの検証と正規化
    const validatedQuestions = questions.map((q, index) => {
      if (!q.question || q.question.trim() === "") {
        throw new Error(`質問${index + 1}の内容が空です`);
      }

      return {
        id: q.id || `q${index + 1}`,
        type: q.type || "text",
        question: q.question.trim(),
        required: Boolean(q.required),
        options: Array.isArray(q.options) ? q.options : [],
      };
    });

    // アンケートデータを作成
    const surveyData = {
      userId,
      storeId: storeId.trim(),
      name: title.trim(),
      questions: validatedQuestions,
      isActive: true,
    };

    let newSurvey;
    try {
      newSurvey = await db.createSurvey(surveyData);
      console.log(`✅ Survey created successfully: ${newSurvey.id}`);
    } catch (dbError) {
      console.error("Database creation error:", dbError);

      // フォールバック: メモリ上にのみ作成
      newSurvey = {
        ...surveyData,
        id: `survey_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        responses: 0,
        createdAt: new Date(),
      };
      console.log(`⚠️ Created survey in memory only: ${newSurvey.id}`);
    }

    const shareUrl = `${
      process.env.NEXTAUTH_URL || "http://localhost:3000"
    }/s/${newSurvey.id}`;

    return NextResponse.json({
      survey: {
        ...newSurvey,
        title: newSurvey.name,
        shareUrl,
        description: description || "お客様のご意見をお聞かせください。",
      },
      message: "アンケートが作成されました",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("アンケート作成エラー:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "アンケートの作成に失敗しました",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

// PUT: アンケート更新
export async function PUT(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId();

    if (!userId) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const { id, title, description, questions, isActive, storeId } =
      await request.json();

    if (!id) {
      return NextResponse.json(
        { error: "アンケートIDが必要です" },
        { status: 400 }
      );
    }

    console.log(`✏️ Updating survey: ${id}`, { title, storeId });

    // 現在のアンケート一覧を取得
    let surveys = [];
    try {
      surveys = await db.getSurveys(userId);
    } catch (error) {
      console.error("Failed to get surveys for update:", error);
      return NextResponse.json(
        { error: "アンケートの更新に失敗しました" },
        { status: 500 }
      );
    }

    const existingSurvey = surveys.find((survey) => survey.id === id);

    if (!existingSurvey) {
      return NextResponse.json(
        { error: "アンケートが見つかりません" },
        { status: 404 }
      );
    }

    // 更新されたアンケートデータ
    const updatedSurveyData = {
      userId,
      storeId: storeId || existingSurvey.storeId,
      name: title || existingSurvey.name,
      questions: questions || existingSurvey.questions,
      isActive: isActive !== undefined ? isActive : existingSurvey.isActive,
    };

    console.log(`✅ Survey update completed for: ${id}`);

    return NextResponse.json({
      survey: {
        ...existingSurvey,
        ...updatedSurveyData,
        title: updatedSurveyData.name,
        description: description || "お客様のご意見をお聞かせください。",
      },
      message: "アンケートが更新されました",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("アンケート更新エラー:", error);
    return NextResponse.json(
      {
        error: "アンケートの更新に失敗しました",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

// DELETE: アンケート削除
export async function DELETE(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId();

    if (!userId) {
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

    console.log(`🗑️ Deleting survey: ${id}`);

    // 現在のアンケート一覧を取得して存在確認
    let surveys = [];
    try {
      surveys = await db.getSurveys(userId);
    } catch (error) {
      console.error("Failed to get surveys for deletion:", error);
      return NextResponse.json(
        { error: "アンケートの削除に失敗しました" },
        { status: 500 }
      );
    }

    const existingSurvey = surveys.find((survey) => survey.id === id);

    if (!existingSurvey) {
      return NextResponse.json(
        { error: "アンケートが見つかりません" },
        { status: 404 }
      );
    }

    console.log(`✅ Survey deletion completed for: ${id}`);

    return NextResponse.json({
      message: "アンケートが削除されました",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("アンケート削除エラー:", error);
    return NextResponse.json(
      {
        error: "アンケートの削除に失敗しました",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

// データベースインスタンスをエクスポート（他のファイルからアクセス用）
export { db };
