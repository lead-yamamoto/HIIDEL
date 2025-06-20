import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/database";

async function getAuthenticatedUserId(): Promise<string | null> {
  // セッション管理は簡素化
  return "1"; // demo@hiidel.comのユーザーID
}

// GET: 個別のアンケート取得
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const surveyId = resolvedParams.id;
    const userId = await getAuthenticatedUserId();

    if (!userId) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    console.log(`🔍 Getting survey: ${surveyId} for user: ${userId}`);

    // すべてのアンケートを取得
    const surveys = await db.getSurveys(userId);

    // 指定されたIDのアンケートを検索
    const survey = surveys.find((s) => s.id === surveyId);

    if (!survey) {
      console.log(`❌ Survey not found: ${surveyId}`);
      return NextResponse.json(
        { error: "アンケートが見つかりません" },
        { status: 404 }
      );
    }

    // アンケートが非アクティブの場合
    if (!survey.isActive) {
      console.log(`❌ Survey is inactive: ${surveyId}`);
      return NextResponse.json(
        { error: "このアンケートは現在利用できません" },
        { status: 403 }
      );
    }

    console.log(`✅ Survey found: ${survey.name}`);

    return NextResponse.json({
      survey: {
        id: survey.id,
        name: survey.name,
        title: survey.name, // nameをtitleとして使用
        description: `店舗のサービス向上のためのアンケートです`, // デフォルトの説明
        questions: survey.questions,
        isActive: survey.isActive,
        storeId: survey.storeId,
      },
    });
  } catch (error) {
    console.error("アンケート取得エラー:", error);
    return NextResponse.json(
      { error: "アンケートの取得に失敗しました" },
      { status: 500 }
    );
  }
}
