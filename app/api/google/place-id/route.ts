import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  console.log("🔍 === GOOGLE PLACE ID API CALLED ===");
  console.log(`📅 Timestamp: ${new Date().toISOString()}`);

  try {
    const { storeName, address } = await request.json();

    if (!storeName || !address) {
      return NextResponse.json(
        { error: "Store name and address are required" },
        { status: 400 }
      );
    }

    // Google Places API キーを環境変数から取得
    const apiKey = process.env.GOOGLE_PLACES_API_KEY;

    if (!apiKey) {
      console.log("⚠️ Google Places API key not found, using fallback method");
      // APIキーがない場合のフォールバック処理
      return NextResponse.json({
        placeId: null,
        googleReviewUrl: generateFallbackReviewUrl(storeName, address),
        method: "fallback",
      });
    }

    console.log(`🔍 Searching for: "${storeName}" at "${address}"`);

    // Google Places API Text Search を使用
    const searchQuery = `${storeName} ${address}`;
    const placesUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(
      searchQuery
    )}&key=${apiKey}`;

    console.log(`📡 Places API URL: ${placesUrl}`);

    const response = await fetch(placesUrl);
    const data = await response.json();

    console.log(`📊 Places API response status: ${data.status}`);

    if (data.status === "OK" && data.results && data.results.length > 0) {
      const place = data.results[0];
      const placeId = place.place_id;

      console.log(`✅ Found Place ID: ${placeId}`);
      console.log(`📍 Place name: ${place.name}`);
      console.log(`📍 Place address: ${place.formatted_address}`);

      // 正しいGoogleレビューURLを生成
      const googleReviewUrl = `https://search.google.com/local/writereview?placeid=${placeId}`;

      console.log(`🌐 Generated review URL: ${googleReviewUrl}`);

      return NextResponse.json({
        placeId: placeId,
        googleReviewUrl: googleReviewUrl,
        placeName: place.name,
        placeAddress: place.formatted_address,
        method: "places_api",
      });
    } else {
      console.log(`⚠️ No places found or API error: ${data.status}`);

      // 検索結果がない場合のフォールバック
      return NextResponse.json({
        placeId: null,
        googleReviewUrl: generateFallbackReviewUrl(storeName, address),
        method: "fallback",
        error: `Places API: ${data.status}`,
      });
    }
  } catch (error) {
    console.error("💥 Error in Place ID API:", error);

    // エラー時のフォールバック
    const { storeName, address } = await request.json();
    return NextResponse.json({
      placeId: null,
      googleReviewUrl: generateFallbackReviewUrl(storeName, address),
      method: "fallback_error",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

// フォールバック用のGoogleレビューURL生成
function generateFallbackReviewUrl(storeName: string, address: string): string {
  // Google検索ベースのレビューURL
  const searchQuery = `"${storeName}" "${address}" google レビュー 書く`;
  return `https://www.google.com/search?q=${encodeURIComponent(searchQuery)}`;
}
