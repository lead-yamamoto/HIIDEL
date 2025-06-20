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
async function calculateUserStats(userId: string, userEmail: string) {
  try {
    const [stores, qrCodes, surveys] = await Promise.all([
      loadDataFile(STORES_DATA_FILE_PATH),
      loadDataFile(QR_CODES_DATA_FILE_PATH),
      loadDataFile(SURVEYS_DATA_FILE_PATH),
    ]);

    // ユーザーの店舗一覧
    const userStores = stores.filter((store) => store.userId === userEmail);

    // ユーザーのQRコード一覧
    const userQRCodes = qrCodes.filter((qr) => qr.userId === userEmail);

    // ユーザーのアンケート一覧
    const userSurveys = surveys.filter((survey) => survey.userId === userEmail);

    // 今月のスキャン数を計算（仮想データ）
    const monthlyScans = userQRCodes.reduce((total, qr) => {
      return total + (qr.scans || Math.floor(Math.random() * 100));
    }, 0);

    // アクティブなアンケート数
    const activeSurveys = userSurveys.filter(
      (survey) => survey.isActive
    ).length;

    // レビュー総数（仮想データ）
    const totalReviews = userStores.reduce((total, store) => {
      return total + (store.reviewCount || Math.floor(Math.random() * 50));
    }, 0);

    // 平均評価（仮想データ）
    const averageRating =
      userStores.length > 0
        ? userStores.reduce(
            (sum, store) => sum + (store.averageRating || 4.0),
            0
          ) / userStores.length
        : 0;

    // 返信率（仮想データ）
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

export async function GET(request: NextRequest) {
  try {
    // 管理者権限チェック（簡易版）
    const authHeader = request.headers.get("authorization");

    // 実際の実装では適切な認証を行う
    // if (!authHeader || !authHeader.startsWith("Bearer ")) {
    //   return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    // }

    // ユーザーデータを読み込み
    const users = await loadDataFile(USERS_DATA_FILE_PATH);

    // 各ユーザーの統計を取得
    const usersWithStats = await Promise.all(
      users.map(async (user) => {
        const stats = await calculateUserStats(user.id, user.email);

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          companyName: user.companyName || "",
          role: user.role || "owner",
          subscription: user.subscription || {
            plan: "trial",
            startDate: user.createdAt,
            endDate: new Date(
              new Date(user.createdAt).getTime() + 30 * 24 * 60 * 60 * 1000
            ).toISOString(),
          },
          stores: user.stores || [],
          isActive: user.isActive !== false, // デフォルトはtrue
          createdAt: user.createdAt || new Date().toISOString(),
          lastLoginAt: user.lastLoginAt || null,
          stats,
        };
      })
    );

    // 管理者権限のユーザーを除外（必要に応じて）
    const filteredUsers = usersWithStats.filter(
      (user) => user.role !== "admin"
    );

    return NextResponse.json({
      success: true,
      users: filteredUsers,
      total: filteredUsers.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("ユーザー一覧取得エラー:", error);
    return NextResponse.json(
      {
        error: "ユーザー一覧の取得に失敗しました",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
