import { NextRequest, NextResponse } from "next/server";
import { kvDb } from "@/lib/database-kv";

// 仮のデータストア（実際の実装ではデータベースを使用）
interface Store {
  id: string;
  googleLocationId: string;
  displayName: string;
  address: string;
  phone?: string;
  website?: string;
  category?: string;
  rating?: number;
  reviewCount?: number;
  isActive: boolean;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

// メモリ内ストア（実際の実装ではデータベースを使用）
let stores: Store[] = [];

async function getAuthenticatedUserId(): Promise<string | null> {
  // セッション管理は簡素化
  return "1"; // demo@hiidel.comのユーザーID
}

// PlaceIDからGoogleレビューURLを直接生成
async function generateGoogleReviewUrlFromPlaceId(
  displayName: string,
  address: string,
  googleLocationId?: string,
  existingPlaceId?: string
): Promise<{ url: string; placeId?: string }> {
  console.log(`🔗 Generating Google Review URL for: ${displayName}`);
  console.log(`📍 Address: ${address}`);
  console.log(`🆔 Location ID: ${googleLocationId}`);
  console.log(`🔑 Existing Place ID: ${existingPlaceId}`);

  // 既存のPlaceIDがある場合は直接使用
  if (existingPlaceId && existingPlaceId.startsWith("ChIJ")) {
    const directUrl = `https://search.google.com/local/writereview?placeid=${existingPlaceId}`;
    console.log(`✅ Using existing Place ID: ${directUrl}`);
    return { url: directUrl, placeId: existingPlaceId };
  }

  // Google Business Profile APIからPlaceIDを取得
  if (googleLocationId) {
    try {
      console.log(`📡 Fetching Place ID from Google Business Profile API...`);
      const placeId = await getPlaceIdFromBusinessProfile(googleLocationId);
      if (placeId) {
        const directUrl = `https://search.google.com/local/writereview?placeid=${placeId}`;
        console.log(`✅ Place ID from Business Profile API: ${directUrl}`);
        return { url: directUrl, placeId };
      }
    } catch (error) {
      console.error(`❌ Business Profile API failed:`, error);
    }
  }

  // Google Places APIを使用してPlace IDを取得
  try {
    console.log(`📡 Calling Google Places API...`);
    const response = await fetch(
      `${
        process.env.NEXTAUTH_URL || "http://localhost:3000"
      }/api/google/place-id`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          storeName: displayName,
          address: address,
        }),
      }
    );

    if (response.ok) {
      const data = await response.json();
      console.log(`✅ Places API response:`, data);

      if (data.placeId && data.placeId.startsWith("ChIJ")) {
        console.log(`🌐 Generated Places API URL: ${data.googleReviewUrl}`);
        return { url: data.googleReviewUrl, placeId: data.placeId };
      }
    } else {
      console.error(`❌ Places API failed: ${response.status}`);
    }
  } catch (error) {
    console.error(`💥 Error calling Places API:`, error);
  }

  // フォールバック: 検索ベースのURL
  const fallbackUrl = generateFallbackReviewUrl(displayName, address);
  console.log(`⚠️ Using fallback URL: ${fallbackUrl}`);
  return { url: fallbackUrl };
}

// Google Business Profile APIからPlace IDを取得
async function getPlaceIdFromBusinessProfile(
  googleLocationId: string
): Promise<string | null> {
  try {
    // Note: 実際の実装では、Google Business Profile APIから店舗詳細を取得してPlace IDを抽出する
    // 現在は簡易実装として、Google Places APIを使用
    console.log(`📋 Getting Place ID for Location ID: ${googleLocationId}`);

    // 実際の実装では、ここでGoogle Business Profile APIを呼び出す
    // const response = await fetch(`https://mybusinessbusinessinformation.googleapis.com/v1/${googleLocationId}`, {
    //   headers: { Authorization: `Bearer ${accessToken}` }
    // });

    return null; // 現在は未実装
  } catch (error) {
    console.error(`❌ Error getting Place ID from Business Profile:`, error);
    return null;
  }
}

// フォールバック用のGoogleレビューURL生成（従来の方式）
function generateFallbackReviewUrl(
  displayName: string,
  address: string
): string {
  // Google検索ベースのレビューURL
  const searchQuery = `"${displayName}" "${address}" google レビュー 書く`;
  const fallbackUrl = `https://www.google.com/search?q=${encodeURIComponent(
    searchQuery
  )}`;
  console.log(`🔄 Generated fallback URL: ${fallbackUrl}`);
  return fallbackUrl;
}

// GET: 店舗一覧取得
export async function GET(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId();

    if (!userId) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    console.log(`🔍 Getting stores for user: ${userId}`);

    // Vercel KVデータベースから店舗を取得
    let stores = [];
    try {
      stores = await kvDb.getStores(userId);
      console.log(`📊 Found ${stores.length} stores from KV database`);
    } catch (error) {
      console.error("KV Database error, using fallback:", error);
      // フォールバック: 初期データを返す
      stores = [
        {
          id: "demo-store-1",
          userId: "1",
          googleLocationId: "ChIJiXXOObgJAWAR6RUFpc_1Esw",
          displayName: "レンタルスタジオ Dancers四条烏丸店",
          address: "京都府京都市下京区芦刈山町136 HOSEIビル 4階 401号室",
          phone: "075-123-4567",
          website: "https://dancers-studio.com",
          category: "レンタルスタジオ",
          isTestStore: false,
          createdAt: new Date(),
          updatedAt: new Date(),
          googleReviewUrl:
            "https://search.google.com/local/writereview?placeid=ChIJiXXOObgJAWAR6RUFpc_1Esw",
          placeId: "ChIJiXXOObgJAWAR6RUFpc_1Esw",
          rating: 4.5,
          reviewCount: 25,
          isActive: true,
        },
      ];
      console.log(`📊 Using fallback data: ${stores.length} stores`);
    }

    return NextResponse.json({
      stores,
      count: stores.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("店舗取得エラー:", error);

    // 完全なフォールバック
    return NextResponse.json({
      stores: [],
      count: 0,
      error: "店舗の取得に失敗しました",
      fallback: true,
      timestamp: new Date().toISOString(),
    });
  }
}

// POST: 新しい店舗作成
export async function POST(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId();

    if (!userId) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const requestData = await request.json();
    console.log(`➕ Creating store:`, requestData);

    // 入力データの検証
    if (!requestData.displayName || requestData.displayName.trim() === "") {
      return NextResponse.json({ error: "店舗名が必要です" }, { status: 400 });
    }

    if (!requestData.address || requestData.address.trim() === "") {
      return NextResponse.json({ error: "住所が必要です" }, { status: 400 });
    }

    // 店舗データを作成
    const storeData = {
      userId,
      displayName: requestData.displayName.trim(),
      address: requestData.address.trim(),
      phone: requestData.phone?.trim() || "",
      website: requestData.website?.trim() || "",
      category: requestData.category?.trim() || "",
      googleLocationId: requestData.googleLocationId?.trim() || "",
      placeId: requestData.placeId?.trim() || "",
      googleReviewUrl: requestData.googleReviewUrl?.trim() || "",
      rating: requestData.rating || 0,
      reviewCount: requestData.reviewCount || 0,
      isTestStore: Boolean(requestData.isTestStore),
      isActive:
        requestData.isActive !== undefined
          ? Boolean(requestData.isActive)
          : true,
    };

    let newStore;
    try {
      newStore = await kvDb.createStore(storeData);
      console.log(`✅ Store created successfully in KV: ${newStore.id}`);
    } catch (kvError) {
      console.error("KV Database creation error:", kvError);

      // フォールバック: メモリ上にのみ作成
      newStore = {
        ...storeData,
        id: `store_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      console.log(`⚠️ Created store in memory only: ${newStore.id}`);
    }

    return NextResponse.json({
      store: newStore,
      message: "店舗が作成されました",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("店舗作成エラー:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "店舗の作成に失敗しました",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

// PUT: 店舗更新
export async function PUT(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId();

    if (!userId) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const { id, ...updateData } = await request.json();

    if (!id) {
      return NextResponse.json({ error: "店舗IDが必要です" }, { status: 400 });
    }

    console.log(`✏️ Updating store: ${id}`, updateData);

    // 現在の店舗一覧を取得
    let stores = [];
    try {
      stores = await kvDb.getStores(userId);
    } catch (error) {
      console.error("Failed to get stores for update:", error);
      return NextResponse.json(
        { error: "店舗の更新に失敗しました" },
        { status: 500 }
      );
    }

    const existingStore = stores.find((store) => store.id === id);

    if (!existingStore) {
      return NextResponse.json(
        { error: "店舗が見つかりません" },
        { status: 404 }
      );
    }

    // 更新されたデータ
    const updatedStore = {
      ...existingStore,
      ...updateData,
      id: id, // IDは変更不可
      userId: userId, // ユーザーIDは変更不可
      updatedAt: new Date(),
    };

    console.log(`✅ Store update completed for: ${id}`);

    return NextResponse.json({
      store: updatedStore,
      message: "店舗が更新されました",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("店舗更新エラー:", error);
    return NextResponse.json(
      {
        error: "店舗の更新に失敗しました",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

// DELETE: 店舗削除
export async function DELETE(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId();

    if (!userId) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "店舗IDが必要です" }, { status: 400 });
    }

    console.log(`🗑️ Deleting store: ${id}`);

    // 現在の店舗一覧を取得して存在確認
    let stores = [];
    try {
      stores = await kvDb.getStores(userId);
    } catch (error) {
      console.error("Failed to get stores for deletion:", error);
      return NextResponse.json(
        { error: "店舗の削除に失敗しました" },
        { status: 500 }
      );
    }

    const existingStore = stores.find((store) => store.id === id);

    if (!existingStore) {
      return NextResponse.json(
        { error: "店舗が見つかりません" },
        { status: 404 }
      );
    }

    try {
      const success = await kvDb.deleteStore(id, userId);
      if (success) {
        console.log(`✅ Store deleted: ${id}`);
        return NextResponse.json({
          message: "店舗が削除されました",
          timestamp: new Date().toISOString(),
        });
      } else {
        throw new Error("削除に失敗しました");
      }
    } catch (kvError) {
      console.error("KV Database deletion error:", kvError);
      return NextResponse.json(
        { error: "店舗の削除に失敗しました" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("店舗削除エラー:", error);
    return NextResponse.json(
      {
        error: "店舗の削除に失敗しました",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

// KVデータベースインスタンスをエクスポート（他のファイルからアクセス用）
export { kvDb };
