import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { promises as fs } from "fs";
import path from "path";

// 画像保存ディレクトリ
const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads", "profiles");

// 許可される画像形式とサイズ制限
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];
const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();

    if (!session?.user?.email) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("image") as File;

    if (!file) {
      return NextResponse.json(
        { error: "画像ファイルが選択されていません" },
        { status: 400 }
      );
    }

    // ファイルタイプの検証
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        {
          error:
            "JPG、PNG、GIF、またはWebP形式の画像をアップロードしてください",
        },
        { status: 400 }
      );
    }

    // ファイルサイズの検証
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "ファイルサイズは2MB以下にしてください" },
        { status: 400 }
      );
    }

    // アップロードディレクトリを作成
    await fs.mkdir(UPLOAD_DIR, { recursive: true });

    // ファイル名を生成（ユーザーIDベース + タイムスタンプ）
    const fileExtension = path.extname(file.name);
    const fileName = `${session.user.email.replace(
      /[@.]/g,
      "_"
    )}_${Date.now()}${fileExtension}`;
    const filePath = path.join(UPLOAD_DIR, fileName);

    // ファイルを保存
    const buffer = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(filePath, buffer);

    // 公開URLを生成
    const imageUrl = `/uploads/profiles/${fileName}`;

    return NextResponse.json({
      imageUrl,
      message: "プロフィール画像がアップロードされました",
    });
  } catch (error) {
    console.error("画像アップロードエラー:", error);
    return NextResponse.json(
      { error: "画像のアップロードに失敗しました" },
      { status: 500 }
    );
  }
}

// DELETE: プロフィール画像を削除
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession();

    if (!session?.user?.email) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const imageUrl = searchParams.get("imageUrl");

    if (!imageUrl) {
      return NextResponse.json(
        { error: "削除する画像URLが指定されていません" },
        { status: 400 }
      );
    }

    // ファイルパスを構築
    const fileName = path.basename(imageUrl);
    const filePath = path.join(UPLOAD_DIR, fileName);

    try {
      // ファイルが存在するか確認してから削除
      await fs.access(filePath);
      await fs.unlink(filePath);

      return NextResponse.json({
        message: "プロフィール画像が削除されました",
      });
    } catch (fileError) {
      // ファイルが存在しない場合も成功として扱う
      return NextResponse.json({
        message: "プロフィール画像の削除が完了しました",
      });
    }
  } catch (error) {
    console.error("画像削除エラー:", error);
    return NextResponse.json(
      { error: "画像の削除に失敗しました" },
      { status: 500 }
    );
  }
}
