import { NextRequest, NextResponse } from "next/server";
import { compare, hash } from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";

// 管理者アカウント（本番環境では環境変数またはデータベースに保存）
const ADMIN_ACCOUNTS = [
  {
    id: "admin-1",
    username: "hiidel_admin",
    name: "HIIDEL管理者",
    email: "admin@hiidel.com",
    // パスワード: "hiidel_admin_2024" (ハッシュ化済み)
    password: "$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewU5GdkcAg0Bzo8.",
    role: "super_admin",
    permissions: [
      "users:read",
      "users:write",
      "users:delete",
      "analytics:read",
      "system:manage",
    ],
  },
];

// JWT秘密鍵
const JWT_SECRET = new TextEncoder().encode(
  process.env.NEXTAUTH_SECRET || "hiidel-admin-secret-key-change-in-production"
);

// JWTトークン生成
async function generateToken(adminId: string): Promise<string> {
  const jwt = await new SignJWT({ adminId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("24h")
    .sign(JWT_SECRET);

  return jwt;
}

// JWTトークン検証
async function verifyToken(token: string): Promise<{ adminId: string } | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as { adminId: string };
  } catch (error) {
    console.error("JWT検証エラー:", error);
    return null;
  }
}

// 管理者ログインAPI
export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();

    console.log("🔐 Admin login attempt:", username);

    // 入力値検証
    if (!username || !password) {
      return NextResponse.json(
        { error: "ユーザー名とパスワードが必要です" },
        { status: 400 }
      );
    }

    // 管理者アカウント検索
    const admin = ADMIN_ACCOUNTS.find(
      (acc) => acc.username === username || acc.email === username
    );

    if (!admin) {
      console.log("❌ Admin account not found:", username);
      return NextResponse.json(
        { error: "ユーザー名またはパスワードが正しくありません" },
        { status: 401 }
      );
    }

    // パスワード検証
    const isPasswordValid = await compare(password, admin.password);

    if (!isPasswordValid) {
      console.log("❌ Invalid password for admin:", username);
      return NextResponse.json(
        { error: "ユーザー名またはパスワードが正しくありません" },
        { status: 401 }
      );
    }

    // JWTトークン生成
    const token = await generateToken(admin.id);

    console.log("✅ Admin login successful:", admin.username);

    // セキュアなレスポンス
    const response = NextResponse.json({
      success: true,
      user: {
        id: admin.id,
        username: admin.username,
        name: admin.name,
        email: admin.email,
        role: admin.role,
        permissions: admin.permissions,
      },
    });

    // HTTPOnlyクッキーでトークンを設定
    response.cookies.set("admin_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 24 * 60 * 60, // 24時間
      path: "/",
      sameSite: "strict",
    });

    return response;
  } catch (error) {
    console.error("管理者ログインエラー:", error);
    return NextResponse.json(
      {
        error: "ログイン処理中にエラーが発生しました",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// 管理者セッション検証API
export async function GET(request: NextRequest) {
  try {
    // Cookieからトークンを取得
    const token = request.cookies.get("admin_token")?.value;

    if (!token) {
      return NextResponse.json(
        { error: "認証トークンが必要です" },
        { status: 401 }
      );
    }

    const decoded = await verifyToken(token);

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

// 管理者ログアウトAPI
export async function DELETE(request: NextRequest) {
  try {
    const response = NextResponse.json({
      success: true,
      message: "ログアウトしました",
    });

    // Cookieを削除
    response.cookies.delete("admin_token");

    return response;
  } catch (error) {
    console.error("ログアウトエラー:", error);
    return NextResponse.json(
      {
        error: "ログアウト処理中にエラーが発生しました",
      },
      { status: 500 }
    );
  }
}
