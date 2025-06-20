import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { promises as fs } from "fs";
import path from "path";

// データファイルのパス
const PROFILES_DATA_FILE_PATH = path.join(
  process.cwd(),
  "data",
  "profiles.json"
);

interface UserProfile {
  userId: string;
  name: string;
  email: string;
  companyName: string;
  phone: string;
  bio: string;
  language: string;
  timezone: string;
  profileImage?: string;
  emailNotifications: boolean;
  pushNotifications: boolean;
  marketingEmails: boolean;
  twoFactorAuth: boolean;
  sessionTimeout: string;
  updatedAt: string;
}

// プロフィールデータを読み込み
async function loadProfiles(): Promise<UserProfile[]> {
  try {
    await fs.mkdir(path.dirname(PROFILES_DATA_FILE_PATH), { recursive: true });
    const data = await fs.readFile(PROFILES_DATA_FILE_PATH, "utf-8");
    return JSON.parse(data);
  } catch (error) {
    // ファイルが存在しない場合は空配列を返す
    return [];
  }
}

// プロフィールデータを保存
async function saveProfiles(profiles: UserProfile[]): Promise<void> {
  try {
    await fs.mkdir(path.dirname(PROFILES_DATA_FILE_PATH), { recursive: true });
    await fs.writeFile(
      PROFILES_DATA_FILE_PATH,
      JSON.stringify(profiles, null, 2)
    );
  } catch (error) {
    console.error("Failed to save profiles:", error);
  }
}

// GET: プロフィール情報を取得
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();

    if (!session?.user?.email) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const profiles = await loadProfiles();
    const userProfile = profiles.find(
      (profile) => profile.userId === session.user.email
    );

    if (!userProfile) {
      // デフォルトプロフィールを作成
      const defaultProfile: UserProfile = {
        userId: session.user.email,
        name: session.user.name || "",
        email: session.user.email,
        companyName: "デモ株式会社",
        phone: "",
        bio: "",
        language: "ja",
        timezone: "Asia/Tokyo",
        profileImage: session.user.image || "",
        emailNotifications: true,
        pushNotifications: true,
        marketingEmails: false,
        twoFactorAuth: false,
        sessionTimeout: "30",
        updatedAt: new Date().toISOString(),
      };

      profiles.push(defaultProfile);
      await saveProfiles(profiles);

      return NextResponse.json({ profile: defaultProfile });
    }

    return NextResponse.json({ profile: userProfile });
  } catch (error) {
    console.error("プロフィール取得エラー:", error);
    return NextResponse.json(
      { error: "プロフィールの取得に失敗しました" },
      { status: 500 }
    );
  }
}

// PUT: プロフィール情報を更新
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession();

    if (!session?.user?.email) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const updateData = await request.json();
    const profiles = await loadProfiles();
    const profileIndex = profiles.findIndex(
      (profile) => profile.userId === session.user.email
    );

    if (profileIndex === -1) {
      // 新しいプロフィールを作成
      const newProfile: UserProfile = {
        userId: session.user.email,
        name: updateData.name || session.user.name || "",
        email: updateData.email || session.user.email,
        companyName: updateData.companyName || "",
        phone: updateData.phone || "",
        bio: updateData.bio || "",
        language: updateData.language || "ja",
        timezone: updateData.timezone || "Asia/Tokyo",
        profileImage: updateData.profileImage || session.user.image || "",
        emailNotifications: updateData.emailNotifications ?? true,
        pushNotifications: updateData.pushNotifications ?? true,
        marketingEmails: updateData.marketingEmails ?? false,
        twoFactorAuth: updateData.twoFactorAuth ?? false,
        sessionTimeout: updateData.sessionTimeout || "30",
        updatedAt: new Date().toISOString(),
      };

      profiles.push(newProfile);
    } else {
      // 既存のプロフィールを更新
      profiles[profileIndex] = {
        ...profiles[profileIndex],
        ...updateData,
        userId: session.user.email, // userIdは変更不可
        email: session.user.email, // emailも変更不可（認証と連携）
        updatedAt: new Date().toISOString(),
      };
    }

    await saveProfiles(profiles);

    const updatedProfile =
      profileIndex === -1
        ? profiles[profiles.length - 1]
        : profiles[profileIndex];

    return NextResponse.json({
      profile: updatedProfile,
      message: "プロフィールが正常に更新されました",
    });
  } catch (error) {
    console.error("プロフィール更新エラー:", error);
    return NextResponse.json(
      { error: "プロフィールの更新に失敗しました" },
      { status: 500 }
    );
  }
}
