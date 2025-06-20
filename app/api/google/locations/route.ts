import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

// Location IDをCIDまたはPlace IDに変換する関数
async function convertLocationIdToPlaceId(
  locationId: string,
  accessToken: string
): Promise<string | null> {
  try {
    // Location IDからPlace IDを取得するためのGoogle My Business API呼び出し
    const response = await fetch(
      `https://mybusinessbusinessinformation.googleapis.com/v1/locations/${locationId}?readMask=metadata`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (response.ok) {
      const data = await response.json();
      if (data.metadata?.placeId) {
        return data.metadata.placeId;
      }

      // Maps URIからCIDを抽出を試行
      if (data.metadata?.mapsUri) {
        const cidMatch = data.metadata.mapsUri.match(/cid=(\d+)/);
        if (cidMatch) {
          return cidMatch[1];
        }
      }
    }

    return null;
  } catch (error) {
    console.error("Error converting location ID:", error);
    return null;
  }
}

// GoogleレビューURLを生成する関数
function generateGoogleReviewUrl(
  placeId: string | null,
  mapsUri: string | null,
  locationId: string
): string {
  // 1. Place IDがある場合（ChIJで始まる）
  if (placeId && placeId.startsWith("ChIJ")) {
    return `https://search.google.com/local/writereview?placeid=${placeId}`;
  }

  // 2. Maps URIからCIDを抽出
  if (mapsUri) {
    const cidMatch = mapsUri.match(/cid=(\d+)/);
    if (cidMatch) {
      return `https://search.google.com/local/writereview?placeid=${cidMatch[1]}`;
    }
  }

  // 3. 数値IDの場合はそのまま使用
  if (/^\d+$/.test(locationId)) {
    return `https://search.google.com/local/writereview?placeid=${locationId}`;
  }

  // 4. Location IDから数値部分を抽出
  const numericMatch = locationId.match(/(\d+)$/);
  if (numericMatch) {
    return `https://search.google.com/local/writereview?placeid=${numericMatch[1]}`;
  }

  // 5. フォールバック: Google検索ベースのURL（完全ではないが動作する可能性あり）
  return `https://www.google.com/search?q=${encodeURIComponent(
    "write review " + locationId
  )}`;
}

export async function GET(request: NextRequest) {
  console.log("🔍 === GOOGLE LOCATIONS API CALLED ===");
  console.log(`📅 Timestamp: ${new Date().toISOString()}`);

  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get("google_access_token")?.value;
    const refreshToken = cookieStore.get("google_refresh_token")?.value;

    console.log("🔐 Token status:", {
      hasAccessToken: !!accessToken,
      hasRefreshToken: !!refreshToken,
    });

    if (!accessToken) {
      console.log("❌ No access token found");
      return NextResponse.json(
        { error: "Google authentication required" },
        { status: 401 }
      );
    }

    // URLパラメータから検索クエリを取得
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q") || "";
    console.log(`🔎 Search query: "${query}"`);

    try {
      // まずアカウント情報を取得
      console.log("📋 Fetching Google My Business accounts...");
      const accountsResponse = await fetch(
        "https://mybusinessaccountmanagement.googleapis.com/v1/accounts",
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (!accountsResponse.ok) {
        const errorText = await accountsResponse.text();
        console.error("❌ Accounts API error:", {
          status: accountsResponse.status,
          statusText: accountsResponse.statusText,
          error: errorText,
        });

        if (accountsResponse.status === 401) {
          return NextResponse.json(
            { error: "Google authentication expired" },
            { status: 401 }
          );
        }

        return NextResponse.json(
          { error: "Failed to fetch Google accounts" },
          { status: accountsResponse.status }
        );
      }

      const accountsData = await accountsResponse.json();
      console.log("✅ Accounts fetched:", {
        count: accountsData.accounts?.length || 0,
      });

      if (!accountsData.accounts || accountsData.accounts.length === 0) {
        console.log("⚠️ No Google My Business accounts found");
        return NextResponse.json({ locations: [] });
      }

      // 最初のアカウントを使用
      const accountName = accountsData.accounts[0].name;
      console.log(`📍 Using account: ${accountName}`);

      // ロケーション一覧を取得
      console.log("📋 Fetching locations...");
      const locationsResponse = await fetch(
        `https://mybusinessbusinessinformation.googleapis.com/v1/${accountName}/locations?readMask=name,title,storefrontAddress,websiteUri,phoneNumbers,categories,metadata,profile`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (!locationsResponse.ok) {
        const errorText = await locationsResponse.text();
        console.error("❌ Locations API error:", {
          status: locationsResponse.status,
          statusText: locationsResponse.statusText,
          error: errorText,
        });

        return NextResponse.json(
          { error: "Failed to fetch locations" },
          { status: locationsResponse.status }
        );
      }

      const locationsData = await locationsResponse.json();
      console.log("✅ Locations fetched:", {
        count: locationsData.locations?.length || 0,
      });

      // ロケーションデータを整形し、レビューURLを生成
      const locations = await Promise.all(
        (locationsData.locations || []).map(async (location: any) => {
          const locationId = location.name?.split("/").pop() || "";

          console.log(`🔍 Processing location: ${location.title}`);
          console.log(`📍 Location ID: ${locationId}`);
          console.log(`🗺️ Place ID: ${location.metadata?.placeId || "なし"}`);
          console.log(`🔗 Maps URI: ${location.metadata?.mapsUri || "なし"}`);

          // より詳細なPlace ID取得を試行
          let placeId = location.metadata?.placeId;
          if (!placeId) {
            console.log(`🔄 Attempting to fetch Place ID for ${locationId}...`);
            placeId = await convertLocationIdToPlaceId(
              `locations/${locationId}`,
              accessToken
            );
            console.log(`🆔 Converted Place ID: ${placeId || "変換失敗"}`);
          }

          // GoogleレビューURLを生成
          const googleReviewUrl = generateGoogleReviewUrl(
            placeId,
            location.metadata?.mapsUri,
            locationId
          );

          console.log(`🌐 Generated review URL: ${googleReviewUrl}`);

          return {
            googleLocationId: locationId,
            displayName: location.title || "名称未設定",
            address: location.storefrontAddress
              ? `${location.storefrontAddress.addressLines?.join(" ") || ""} ${
                  location.storefrontAddress.locality || ""
                } ${location.storefrontAddress.administrativeArea || ""} ${
                  location.storefrontAddress.postalCode || ""
                }`.trim()
              : "住所未設定",
            phone: location.phoneNumbers?.primaryPhone || "",
            website: location.websiteUri || "",
            category: location.categories?.primaryCategory?.displayName || "",
            placeId: placeId || "",
            mapsUri: location.metadata?.mapsUri || "",
            googleReviewUrl: googleReviewUrl,
          };
        })
      );

      // 検索クエリでフィルタリング
      const filteredLocations = query
        ? locations.filter(
            (location: any) =>
              location.displayName
                .toLowerCase()
                .includes(query.toLowerCase()) ||
              location.address.toLowerCase().includes(query.toLowerCase()) ||
              location.category.toLowerCase().includes(query.toLowerCase())
          )
        : locations;

      console.log(`📊 Returning ${filteredLocations.length} locations`);
      return NextResponse.json({ locations: filteredLocations });
    } catch (error: any) {
      console.error("💥 API call error:", error);

      // より詳細なエラー情報をログ出力
      if (error.response) {
        console.error("Response error:", {
          status: error.response.status,
          data: error.response.data,
        });
      }

      return NextResponse.json(
        { error: "Failed to fetch locations", details: error.message },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("💥 Unexpected error in Google Locations API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
