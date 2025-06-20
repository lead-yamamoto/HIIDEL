import { NextRequest, NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { promises as fs } from "fs";
import path from "path";

// データファイルのパス
const USERS_DATA_FILE_PATH = path.join(process.cwd(), "data", "users.json");

// ユーザーデータを読み込み
async function loadUsers(): Promise<any[]> {
  try {
    await fs.mkdir(path.dirname(USERS_DATA_FILE_PATH), { recursive: true });
    const data = await fs.readFile(USERS_DATA_FILE_PATH, "utf-8");
    return JSON.parse(data);
  } catch (error) {
    // ファイルが存在しない場合は初期データを返す
    const initialData = [
      {
        id: "1",
        email: "demo@hiidel.com",
        password:
          "$2b$12$gNcrqlaAYEEYcLRz6UMN/.5tUPffhMDbw/celxuqRguIinUsUl/Mu", // "demo123"
        name: "デモユーザー",
        role: "owner",
        companyName: "デモ株式会社",
        phoneNumber: "03-1234-5678",
        createdAt: "2024-01-01T00:00:00.000Z",
        isActive: true,
        subscription: {
          plan: "trial",
          startDate: "2024-01-01T00:00:00.000Z",
          endDate: "2024-01-31T00:00:00.000Z",
        },
        stores: [],
      },
    ];
    await saveUsers(initialData);
    return initialData;
  }
}

// ユーザーデータを保存
async function saveUsers(users: any[]): Promise<void> {
  try {
    await fs.mkdir(path.dirname(USERS_DATA_FILE_PATH), { recursive: true });
    await fs.writeFile(USERS_DATA_FILE_PATH, JSON.stringify(users, null, 2));
  } catch (error) {
    console.error("Failed to save users:", error);
    throw error;
  }
}

export async function POST(request: NextRequest) {
  try {
    const { name, email, password, companyName, phoneNumber } =
      await request.json();

    // バリデーション
    if (!name || !email || !password) {
      return NextResponse.json(
        { error: "必須項目を入力してください" },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "パスワードは8文字以上で入力してください" },
        { status: 400 }
      );
    }

    // 既存ユーザーをロード
    const existingUsers = await loadUsers();

    // メールアドレスの重複チェック
    if (existingUsers.some((user) => user.email === email)) {
      return NextResponse.json(
        { error: "このメールアドレスは既に登録されています" },
        { status: 400 }
      );
    }

    // パスワードをハッシュ化
    const hashedPassword = await hash(password, 12);

    // 新しいユーザーデータ
    const userData = {
      id: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name,
      email,
      password: hashedPassword,
      companyName: companyName || "",
      phoneNumber: phoneNumber || "",
      role: "owner",
      createdAt: new Date().toISOString(),
      stores: [],
      isActive: true,
      subscription: {
        plan: "trial",
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30日間のトライアル
      },
    };

    // ユーザーリストに追加
    existingUsers.push(userData);

    // ファイルに保存
    await saveUsers(existingUsers);

    console.log("New user registered and saved:", {
      id: userData.id,
      email: userData.email,
      name: userData.name,
      companyName: userData.companyName,
    });

    return NextResponse.json({
      success: true,
      message: "アカウントが作成されました",
      user: {
        id: userData.id,
        name: userData.name,
        email: userData.email,
        companyName: userData.companyName,
      },
    });
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "登録中にエラーが発生しました" },
      { status: 500 }
    );
  }
}
