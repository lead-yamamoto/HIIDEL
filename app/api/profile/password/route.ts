import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { promises as fs } from "fs";
import path from "path";
import bcrypt from "bcryptjs";

// パスワードファイルのパス（簡単な実装として）
const PASSWORDS_DATA_FILE_PATH = path.join(
  process.cwd(),
  "data",
  "passwords.json"
);

interface UserPassword {
  userId: string;
  hashedPassword: string;
  updatedAt: string;
}

// パスワードデータを読み込み
async function loadPasswords(): Promise<UserPassword[]> {
  try {
    await fs.mkdir(path.dirname(PASSWORDS_DATA_FILE_PATH), { recursive: true });
    const data = await fs.readFile(PASSWORDS_DATA_FILE_PATH, "utf-8");
    return JSON.parse(data);
  } catch (error) {
    // ファイルが存在しない場合は初期データを返す
    const initialData: UserPassword[] = [
      {
        userId: "demo@hiidel.com",
        hashedPassword: await bcrypt.hash("demo123", 12),
        updatedAt: new Date().toISOString(),
      },
    ];
    await savePasswords(initialData);
    return initialData;
  }
}

// パスワードデータを保存
async function savePasswords(passwords: UserPassword[]): Promise<void> {
  try {
    await fs.mkdir(path.dirname(PASSWORDS_DATA_FILE_PATH), { recursive: true });
    await fs.writeFile(
      PASSWORDS_DATA_FILE_PATH,
      JSON.stringify(passwords, null, 2)
    );
  } catch (error) {
    console.error("Failed to save passwords:", error);
  }
}

// PUT: パスワード変更
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession();

    if (!session?.user?.email) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const { currentPassword, newPassword, confirmPassword } =
      await request.json();

    // バリデーション
    if (!currentPassword || !newPassword || !confirmPassword) {
      return NextResponse.json(
        { error: "すべての項目を入力してください" },
        { status: 400 }
      );
    }

    if (newPassword !== confirmPassword) {
      return NextResponse.json(
        { error: "新しいパスワードが一致しません" },
        { status: 400 }
      );
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: "パスワードは6文字以上で入力してください" },
        { status: 400 }
      );
    }

    const passwords = await loadPasswords();
    const userPasswordIndex = passwords.findIndex(
      (pwd) => pwd.userId === session.user.email
    );

    if (userPasswordIndex === -1) {
      return NextResponse.json(
        { error: "ユーザーが見つかりません" },
        { status: 404 }
      );
    }

    // 現在のパスワードを確認
    const isCurrentPasswordValid = await bcrypt.compare(
      currentPassword,
      passwords[userPasswordIndex].hashedPassword
    );

    if (!isCurrentPasswordValid) {
      return NextResponse.json(
        { error: "現在のパスワードが間違っています" },
        { status: 400 }
      );
    }

    // 新しいパスワードをハッシュ化
    const hashedNewPassword = await bcrypt.hash(newPassword, 12);

    // パスワードを更新
    passwords[userPasswordIndex] = {
      ...passwords[userPasswordIndex],
      hashedPassword: hashedNewPassword,
      updatedAt: new Date().toISOString(),
    };

    await savePasswords(passwords);

    return NextResponse.json({
      message: "パスワードが正常に変更されました",
    });
  } catch (error) {
    console.error("パスワード変更エラー:", error);
    return NextResponse.json(
      { error: "パスワードの変更に失敗しました" },
      { status: 500 }
    );
  }
}
