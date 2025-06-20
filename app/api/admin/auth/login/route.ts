import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";

// 管理者アカウント定義（実際の本番環境では環境変数やデータベースで管理）
const ADMIN_ACCOUNTS = [
  {
    id: "admin_001",
    username: "admin",
    password: "admin123", // プレーンテキスト（デモ用）
    name: "システム管理者",
    email: "admin@hiidel.com",
    role: "admin",
    permissions: ["all"],
    createdAt: "2024-01-01T00:00:00.000Z",
  },
  {
    id: "admin_002",
    username: "superadmin",
    password: "super123", // プレーンテキスト（デモ用）
    name: "スーパー管理者",
    email: "superadmin@hiidel.com",
    role: "superadmin",
    permissions: ["all", "system"],
    createdAt: "2024-01-01T00:00:00.000Z",
  },
];

const SECRET_KEY =
  process.env.NEXTAUTH_SECRET || "admin-secret-key-hiidel-2024";

// 簡易トークン生成
function generateToken(adminData: any): string {
  const payload = {
    adminId: adminData.id,
    username: adminData.username,
    role: adminData.role,
    permissions: adminData.permissions,
    timestamp: Date.now(),
    expiresAt: Date.now() + 24 * 60 * 60 * 1000, // 24時間
  };

  const payloadStr = JSON.stringify(payload);
  const token = Buffer.from(payloadStr).toString("base64");
  const signature = createHash("sha256")
    .update(token + SECRET_KEY)
    .digest("hex");

  return `${token}.${signature}`;
}

// トークン検証
function verifyToken(token: string): any {
  try {
    const [payload, signature] = token.split(".");
    if (!payload || !signature) return null;

    // 署名検証
    const expectedSignature = createHash("sha256")
      .update(payload + SECRET_KEY)
      .digest("hex");
    if (signature !== expectedSignature) return null;

    // ペイロードデコード
    const decoded = JSON.parse(Buffer.from(payload, "base64").toString());

    // 有効期限チェック
    if (decoded.expiresAt < Date.now()) return null;

    return decoded;
  } catch (error) {
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();

    // 入力値チェック
    if (!username || !password) {
      return NextResponse.json(
        { error: "ユーザー名とパスワードを入力してください" },
        { status: 400 }
      );
    }

    // 管理者アカウントを検索
    const admin = ADMIN_ACCOUNTS.find((acc) => acc.username === username);

    if (!admin) {
      return NextResponse.json(
        { error: "管理者アカウントが見つかりません" },
        { status: 401 }
      );
    }

    // パスワード検証（プレーンテキスト比較）
    if (password !== admin.password) {
      return NextResponse.json(
        { error: "パスワードが正しくありません" },
        { status: 401 }
      );
    }

    // トークン生成
    const token = generateToken(admin);

    // ログイン成功レスポンス
    const adminUser = {
      id: admin.id,
      username: admin.username,
      name: admin.name,
      email: admin.email,
      role: admin.role,
      permissions: admin.permissions,
    };

    // ログ記録
    console.log(
      `[ADMIN LOGIN] ${admin.username} (${
        admin.name
      }) logged in at ${new Date().toISOString()}`
    );

    return NextResponse.json({
      success: true,
      message: "管理者ログインに成功しました",
      token,
      user: adminUser,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    });
  } catch (error) {
    console.error("管理者ログインエラー:", error);
    return NextResponse.json(
      {
        error: "認証中にエラーが発生しました",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// 管理者セッション検証API
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "認証トークンが必要です" },
        { status: 401 }
      );
    }

    const token = authHeader.split(" ")[1];
    const decoded = verifyToken(token);

    if (!decoded) {
      return NextResponse.json(
        { error: "無効なトークンです" },
        { status: 401 }
      );
    }

    // 管理者アカウント存在確認
    const admin = ADMIN_ACCOUNTS.find((acc) => acc.id === decoded.adminId);

    if (!admin) {
      return NextResponse.json(
        { error: "管理者アカウントが無効です" },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      valid: true,
      user: {
        id: admin.id,
        username: admin.username,
        name: admin.name,
        email: admin.email,
        role: admin.role,
        permissions: admin.permissions,
      },
    });
  } catch (error) {
    console.error("セッション検証エラー:", error);
    return NextResponse.json(
      {
        error: "セッション検証中にエラーが発生しました",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
