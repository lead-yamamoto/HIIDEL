import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { db } from "@/lib/database";

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

export async function GET(request: NextRequest) {
  console.log("🚀 === STORES API GET CALLED ===");
  console.log(`📅 Timestamp: ${new Date().toISOString()}`);

  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log(`👤 User ID: ${userId}`);

    // URLパラメータから店舗IDを取得
    const { searchParams } = new URL(request.url);
    const storeId = searchParams.get("id");

    if (storeId) {
      console.log(`🔍 Fetching single store: ${storeId}`);
      const store = await db
        .getStores(userId)
        .then((stores) => stores.find((s) => s.id === storeId));
      if (!store) {
        return NextResponse.json({ error: "Store not found" }, { status: 404 });
      }

      console.log(`🏪 Found store for URL generation:`, {
        id: store.id,
        displayName: store.displayName,
        address: store.address,
        googleLocationId: store.googleLocationId,
      });

      const { url: googleReviewUrl, placeId } =
        await generateGoogleReviewUrlFromPlaceId(
          store.displayName,
          store.address,
          store.googleLocationId,
          store.placeId
        );

      console.log(`🔗 Generated Google Review URL: ${googleReviewUrl}`);
      console.log(`🔑 Place ID: ${placeId || "Not found"}`);

      const storeWithReviewUrl = {
        ...store,
        googleReviewUrl,
        placeId,
      };

      console.log(`📤 Returning store with review URL:`, storeWithReviewUrl);
      return NextResponse.json({ store: storeWithReviewUrl });
    }

    console.log(`🔍 Fetching stores for userId: ${userId}`);
    const stores = await db.getStores(userId);

    // 各店舗にGoogleレビューURLを追加（並列処理で高速化）
    const storesWithReviewUrls = await Promise.all(
      stores.map(async (store: any) => {
        if (store.googleReviewUrl) {
          return {
            ...store,
            googleReviewUrl: store.googleReviewUrl,
            placeId: store.placeId,
          };
        }

        const { url: googleReviewUrl, placeId } =
          await generateGoogleReviewUrlFromPlaceId(
            store.displayName,
            store.address,
            store.googleLocationId,
            store.placeId
          );

        return {
          ...store,
          googleReviewUrl,
          placeId,
        };
      })
    );

    return NextResponse.json({ stores: storesWithReviewUrls });
  } catch (error) {
    console.error("Stores GET Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  console.log(`🚀 === STORES API POST CALLED ===`);
  console.log(`📅 Timestamp: ${new Date().toISOString()}`);

  try {
    const userId = await getAuthenticatedUserId();
    console.log(`👤 User ID: ${userId}`);

    if (!userId) {
      console.log("❌ User not authenticated");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    console.log(`📝 Request body:`, body);

    const { displayName, address, phone, website, category, googleLocationId } =
      body;

    if (!displayName || !address) {
      console.log("❌ Missing required fields: displayName or address");
      return NextResponse.json(
        { error: "Display name and address are required" },
        { status: 400 }
      );
    }

    console.log(`➕ Creating store with data:`, {
      userId,
      googleLocationId,
      displayName,
      address,
      phone,
      website,
      category,
      isTestStore: !googleLocationId,
    });

    console.log(`📡 Getting Place ID for new store...`);
    // まず、Place IDを取得
    const { url: googleReviewUrl, placeId } =
      await generateGoogleReviewUrlFromPlaceId(
        displayName,
        address,
        googleLocationId,
        undefined // 新規作成時はPlaceIDはまだない
      );

    const store = await db.createStore({
      userId,
      googleLocationId,
      displayName,
      address,
      phone,
      website,
      category,
      googleReviewUrl,
      placeId,
      isTestStore: !googleLocationId, // Google Location IDがない場合はテストストア
    } as any); // TypeScript型エラーを回避

    console.log(`✅ Store created successfully:`, store);
    console.log(`🔗 Google Review URL: ${googleReviewUrl}`);
    console.log(`🔑 Place ID: ${placeId || "Not obtained"}`);

    // 作成後にストア一覧を確認
    const allStores = await db.getStores(userId);
    console.log(`📊 Total stores after creation: ${allStores.length}`);

    const storeWithReviewUrl = {
      ...store,
      googleReviewUrl,
      placeId,
    };

    return NextResponse.json({ store: storeWithReviewUrl }, { status: 201 });
  } catch (error) {
    console.error("Stores POST Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const storeId = searchParams.get("id");

    if (!storeId) {
      return NextResponse.json(
        { error: "Store ID is required" },
        { status: 400 }
      );
    }

    const success = await db.deleteStore(storeId, userId);

    if (!success) {
      return NextResponse.json(
        { error: "Store not found or unauthorized" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Stores DELETE Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
