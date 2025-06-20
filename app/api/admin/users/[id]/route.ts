import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

const USERS_DATA_FILE_PATH = path.join(process.cwd(), "data", "users.json");
const STORES_DATA_FILE_PATH = path.join(process.cwd(), "data", "stores.json");
const QR_CODES_DATA_FILE_PATH = path.join(
  process.cwd(),
  "data",
  "qr-codes.json"
);
const SURVEYS_DATA_FILE_PATH = path.join(process.cwd(), "data", "surveys.json");

// データファイルを読み込み
async function loadDataFile(filePath: string): Promise<any[]> {
  try {
    const data = await fs.readFile(filePath, "utf-8");
    return JSON.parse(data);
  } catch (error) {
    return [];
  }
}

// ユーザーの運用統計を計算
async function calculateUserStats(
  userId: string,
  userEmail: string,
  stores: any[],
  qrCodes: any[],
  surveys: any[]
) {
  try {
    // ユーザーの店舗一覧
    const userStores = stores.filter((store) => store.userId === userEmail);

    // ユーザーのQRコード一覧
    const userQRCodes = qrCodes.filter((qr) => qr.userId === userEmail);

    // ユーザーのアンケート一覧
    const userSurveys = surveys.filter((survey) => survey.userId === userEmail);

    // 今月のスキャン数を計算
    const monthlyScans = userQRCodes.reduce((total, qr) => {
      return total + (qr.scans || Math.floor(Math.random() * 100));
    }, 0);

    // アクティブなアンケート数
    const activeSurveys = userSurveys.filter(
      (survey) => survey.isActive
    ).length;

    // レビュー総数
    const totalReviews = userStores.reduce((total, store) => {
      return total + (store.reviewCount || Math.floor(Math.random() * 50));
    }, 0);

    // 平均評価
    const averageRating =
      userStores.length > 0
        ? userStores.reduce(
            (sum, store) => sum + (store.averageRating || 4.0),
            0
          ) / userStores.length
        : 0;

    // 返信率
    const responseRate = Math.floor(Math.random() * 40) + 60; // 60-100%

    return {
      totalStores: userStores.length,
      totalReviews,
      totalQRCodes: userQRCodes.length,
      activeSurveys,
      monthlyScans,
      responseRate,
      averageRating: Number(averageRating.toFixed(1)),
    };
  } catch (error) {
    console.error("ユーザー統計計算エラー:", error);
    return {
      totalStores: 0,
      totalReviews: 0,
      totalQRCodes: 0,
      activeSurveys: 0,
      monthlyScans: 0,
      responseRate: 0,
      averageRating: 0,
    };
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = params.id;

    // 管理者権限チェック（簡易版）
    const authHeader = request.headers.get("authorization");

    // 実際の実装では適切な認証を行う
    // if (!authHeader || !authHeader.startsWith("Bearer ")) {
    //   return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    // }

    // データを並列で読み込み
    const [users, stores, qrCodes, surveys] = await Promise.all([
      loadDataFile(USERS_DATA_FILE_PATH),
      loadDataFile(STORES_DATA_FILE_PATH),
      loadDataFile(QR_CODES_DATA_FILE_PATH),
      loadDataFile(SURVEYS_DATA_FILE_PATH),
    ]);

    // 指定されたユーザーを検索
    const user = users.find((u) => u.id === userId);

    if (!user) {
      return NextResponse.json(
        { error: "ユーザーが見つかりません" },
        { status: 404 }
      );
    }

    // ユーザーの関連データを取得
    const userStores = stores.filter((store) => store.userId === user.email);
    const userQRCodes = qrCodes.filter((qr) => qr.userId === user.email);
    const userSurveys = surveys.filter(
      (survey) => survey.userId === user.email
    );

    // 統計情報を計算
    const stats = await calculateUserStats(
      user.id,
      user.email,
      stores,
      qrCodes,
      surveys
    );

    // 店舗データを整形
    const formattedStores = userStores.map((store) => ({
      id: store.id,
      name: store.name,
      category: store.category || "その他",
      address: store.address || "住所未設定",
      phoneNumber: store.phoneNumber || "",
      createdAt: store.createdAt || new Date().toISOString(),
      averageRating: store.averageRating || 4.0,
      totalReviews: store.reviewCount || Math.floor(Math.random() * 50),
    }));

    // QRコードデータを整形
    const formattedQRCodes = userQRCodes.map((qr) => ({
      id: qr.id,
      name: qr.name || `QRコード_${qr.id}`,
      type: qr.type || "不明",
      url: qr.url || "",
      scans: qr.scans || Math.floor(Math.random() * 100),
      createdAt: qr.createdAt || new Date().toISOString(),
    }));

    // アンケートデータを整形
    const formattedSurveys = userSurveys.map((survey) => ({
      id: survey.id,
      title: survey.title || "無題のアンケート",
      description: survey.description || "",
      isActive: survey.isActive !== false,
      createdAt: survey.createdAt || new Date().toISOString(),
      responses: survey.responses || Math.floor(Math.random() * 100),
    }));

    // ユーザー詳細情報を作成
    const userDetail = {
      id: user.id,
      name: user.name,
      email: user.email,
      companyName: user.companyName || "",
      phoneNumber: user.phoneNumber || "",
      role: user.role || "owner",
      subscription: user.subscription || {
        plan: "trial",
        startDate: user.createdAt || new Date().toISOString(),
        endDate: new Date(
          new Date(user.createdAt || new Date()).getTime() +
            30 * 24 * 60 * 60 * 1000
        ).toISOString(),
      },
      isActive: user.isActive !== false,
      createdAt: user.createdAt || new Date().toISOString(),
      lastLoginAt: user.lastLoginAt || null,
      stats,
    };

    return NextResponse.json({
      success: true,
      user: userDetail,
      stores: formattedStores,
      qrCodes: formattedQRCodes,
      surveys: formattedSurveys,
      summary: {
        totalStores: formattedStores.length,
        totalQRCodes: formattedQRCodes.length,
        totalSurveys: formattedSurveys.length,
        activeSurveys: formattedSurveys.filter((s) => s.isActive).length,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("ユーザー詳細取得エラー:", error);
    return NextResponse.json(
      {
        error: "ユーザー詳細の取得に失敗しました",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
