import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { promises as fs } from "fs";
import path from "path";

// データファイルのパス
const QR_CODES_DATA_FILE_PATH = path.join(
  process.cwd(),
  "data",
  "qr-codes.json"
);

interface QRCode {
  id: string;
  storeId: string;
  userId: string;
  name: string;
  type: "review" | "survey" | "contact";
  url: string;
  surveyId?: string; // アンケート用の追加フィールド
  scans: number;
  createdAt: string;
  updatedAt: string;
}

// QRコードデータを読み込み
async function loadQRCodes(): Promise<QRCode[]> {
  try {
    await fs.mkdir(path.dirname(QR_CODES_DATA_FILE_PATH), { recursive: true });
    const data = await fs.readFile(QR_CODES_DATA_FILE_PATH, "utf-8");
    return JSON.parse(data);
  } catch (error) {
    return [];
  }
}

// QRコードデータを保存
async function saveQRCodes(qrCodes: QRCode[]): Promise<void> {
  try {
    await fs.mkdir(path.dirname(QR_CODES_DATA_FILE_PATH), { recursive: true });
    await fs.writeFile(
      QR_CODES_DATA_FILE_PATH,
      JSON.stringify(qrCodes, null, 2)
    );
  } catch (error) {
    console.error("Failed to save QR codes:", error);
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const storeId = searchParams.get("storeId") || undefined;

    const qrCodes = await loadQRCodes();
    const userQRCodes = qrCodes.filter(
      (qr) => qr.userId === session.user.email
    );

    const filteredQRCodes = storeId
      ? userQRCodes.filter((qr) => qr.storeId === storeId)
      : userQRCodes;

    return NextResponse.json({ qrCodes: filteredQRCodes });
  } catch (error) {
    console.error("QR Codes GET Error:", error);
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

    if (!storeId || !name || !type || !url) {
      return NextResponse.json(
        {
          error: "Store ID、name、type、URLは必須です",
        },
        { status: 400 }
      );
    }

    // 新しいQRコードID生成
    const newId = `qr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const newQRCode: QRCode = {
      id: newId,
      storeId,
      userId: session.user.email,
      name,
      type,
      url,
      surveyId: surveyId || undefined,
      scans: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const qrCodes = await loadQRCodes();
    qrCodes.push(newQRCode);
    await saveQRCodes(qrCodes);

    return NextResponse.json({ qrCode: newQRCode }, { status: 201 });
  } catch (error) {
    console.error("QR Codes POST Error:", error);
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

    const qrCodes = await loadQRCodes();
    const qrIndex = qrCodes.findIndex(
      (qr) => qr.id === qrId && qr.userId === session.user.email
    );

    if (qrIndex === -1) {
      return NextResponse.json(
        { error: "QRコードが見つかりません" },
        { status: 404 }
      );
    }

    qrCodes.splice(qrIndex, 1);
    await saveQRCodes(qrCodes);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("QR Codes DELETE Error:", error);
    return NextResponse.json({ error: "内部サーバーエラー" }, { status: 500 });
  }
}
