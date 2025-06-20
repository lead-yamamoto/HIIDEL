import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

const SURVEYS_DATA_FILE_PATH = path.join(process.cwd(), "data", "surveys.json");

// GET: 個別のアンケート取得
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const surveyId = resolvedParams.id;

    // アンケートデータを読み込み
    const data = await fs.readFile(SURVEYS_DATA_FILE_PATH, "utf-8");
    const surveys = JSON.parse(data);

    // 指定されたIDのアンケートを検索
    const survey = surveys.find((s: any) => s.id === surveyId);

    if (!survey) {
      return NextResponse.json(
        { error: "アンケートが見つかりません" },
        { status: 404 }
      );
    }

    // アンケートが非アクティブの場合
    if (!survey.isActive) {
      return NextResponse.json(
        { error: "このアンケートは現在利用できません" },
        { status: 403 }
      );
    }

    return NextResponse.json({
      survey: {
        id: survey.id,
        title: survey.title,
        description: survey.description,
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
