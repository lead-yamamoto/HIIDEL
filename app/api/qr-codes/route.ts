import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]/route";
import { db } from "@/lib/database";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const storeId = searchParams.get("storeId") || undefined;

    console.log(
      `📋 [GET /api/qr-codes] Fetching QR codes for user: ${session.user.email}, storeId: ${storeId}`
    );

    // データベースの初期化を確認
    await db.ensureInitialized();

    // データベースからQRコードを取得
    const qrCodes = await db.getQRCodes(session.user.email, storeId);

    // Date型をstring型に変換（フロントエンドとの互換性のため）
    const formattedQRCodes = qrCodes.map((qr) => ({
      ...qr,
      createdAt: qr.createdAt.toISOString(),
      lastScannedAt: qr.lastScannedAt?.toISOString(),
    }));

    console.log(
      `✅ [GET /api/qr-codes] Found ${formattedQRCodes.length} QR codes`
    );

    return NextResponse.json({ qrCodes: formattedQRCodes });
  } catch (error) {
    console.error("❌ [GET /api/qr-codes] Error:", error);
    return NextResponse.json({ error: "内部サーバーエラー" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const body = await request.json();
    const { storeId, name, type, url, surveyId } = body;

    console.log(`📝 [POST /api/qr-codes] Creating QR code:`, {
      storeId,
      name,
      type,
      url,
      surveyId,
    });

    if (!storeId || !name || !type || !url) {
      return NextResponse.json(
        {
          error: "Store ID、name、type、URLは必須です",
        },
        { status: 400 }
      );
    }

    // データベースの初期化を確認
    await db.ensureInitialized();

    // データベースにQRコードを作成
    const newQRCode = await db.createQRCode({
      storeId,
      userId: session.user.email,
      name,
      type,
      url,
    });

    // Date型をstring型に変換（フロントエンドとの互換性のため）
    const formattedQRCode = {
      ...newQRCode,
      surveyId: surveyId || undefined, // surveyIdは別途追加
      createdAt: newQRCode.createdAt.toISOString(),
      updatedAt: newQRCode.createdAt.toISOString(), // updatedAtフィールドも追加
      lastScannedAt: newQRCode.lastScannedAt?.toISOString(),
    };

    console.log(`✅ [POST /api/qr-codes] QR code created:`, formattedQRCode.id);

    return NextResponse.json({ qrCode: formattedQRCode }, { status: 201 });
  } catch (error) {
    console.error("❌ [POST /api/qr-codes] Error:", error);
    return NextResponse.json({ error: "内部サーバーエラー" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const qrId = searchParams.get("id");

    if (!qrId) {
      return NextResponse.json(
        { error: "QRコードIDが必要です" },
        { status: 400 }
      );
    }

    console.log(`🗑️ [DELETE /api/qr-codes] Deleting QR code: ${qrId}`);

    // データベースの初期化を確認
    await db.ensureInitialized();

    // データベースからQRコードを削除
    const success = await db.deleteQRCode(qrId, session.user.email);

    if (!success) {
      return NextResponse.json(
        { error: "QRコードが見つかりません" },
        { status: 404 }
      );
    }

    console.log(`✅ [DELETE /api/qr-codes] QR code deleted: ${qrId}`);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("❌ [DELETE /api/qr-codes] Error:", error);
    return NextResponse.json({ error: "内部サーバーエラー" }, { status: 500 });
  }
}
