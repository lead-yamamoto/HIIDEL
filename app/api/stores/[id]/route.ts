import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/database";

// GET: 個別店舗取得（公開アクセス可能）
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const storeId = params.id;
    console.log(`🔍 Getting single store (public access): ${storeId}`);

    // 全ユーザーの店舗から検索（公開アクセス用）
    let allStores: any[] = [];
    try {
      const users = ["1"]; // 現在はdemoユーザーのみ
      for (const userId of users) {
        const userStores = await db.getStores(userId);
        allStores.push(...userStores);
      }
      console.log(`📊 Found ${allStores.length} total stores from database`);
    } catch (error) {
      console.error("Database error:", error);
      return NextResponse.json(
        { error: "店舗の取得に失敗しました" },
        { status: 500 }
      );
    }

    const store = allStores.find((s) => s.id === storeId);

    if (!store) {
      console.log(`❌ Store not found: ${storeId}`);
      return NextResponse.json(
        { error: "店舗が見つかりません" },
        { status: 404 }
      );
    }

    console.log(`✅ Found store: ${store.displayName}`);

    return NextResponse.json({
      store,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("店舗取得エラー:", error);
    return NextResponse.json(
      { error: "店舗の取得に失敗しました" },
      { status: 500 }
    );
  }
}
