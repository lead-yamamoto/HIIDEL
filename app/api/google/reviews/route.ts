import { type NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import { db } from "../../../../lib/database";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const locationId = searchParams.get("locationId");

  if (!locationId) {
    return NextResponse.json(
      { error: "Location ID is required" },
      { status: 400 }
    );
  }

  // 🔧 データベース優先でGoogle アクセストークンを取得
  const session = await getServerSession(authOptions);
  const accessToken = await db.getGoogleAccessToken(
    session?.user?.email || undefined
  );

  if (!accessToken) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    console.log(`🔍 Fetching reviews for location: ${locationId}`);

    // まずアカウント情報を取得
    console.log(`🔍 Getting account information...`);
    const accountsResponse = await fetch(
      "https://mybusinessaccountmanagement.googleapis.com/v1/accounts",
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!accountsResponse.ok) {
      console.error(`❌ Failed to fetch accounts: ${accountsResponse.status}`);
      return NextResponse.json(
        {
          error: "Failed to fetch accounts",
          details: `API returned ${accountsResponse.status}: ${accountsResponse.statusText}`,
        },
        { status: accountsResponse.status }
      );
    }

    const accountsData = await accountsResponse.json();
    if (!accountsData.accounts || accountsData.accounts.length === 0) {
      console.error(`❌ No accounts found`);
      return NextResponse.json(
        {
          error: "No accounts found",
          details:
            "No Google Business Profile accounts associated with this user",
        },
        { status: 404 }
      );
    }

    // 最初のアカウントを使用（通常は1つしかない）
    const accountName = accountsData.accounts[0].name;
    console.log(`✅ Using account: ${accountName}`);

    // Google Business Profile API の最新エンドポイントを使用
    const apiUrl = `https://mybusinessbusinessinformation.googleapis.com/v1/${accountName}/locations/${locationId}/reviews`;
    console.log(`🔗 API URL: ${apiUrl}`);

    const reviewsResponse = await fetch(apiUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });

    console.log(`📍 Reviews API response status: ${reviewsResponse.status}`);

    if (!reviewsResponse.ok) {
      // トークンが無効な場合はリフレッシュを試みる
      if (reviewsResponse.status === 401) {
        console.log(`🔄 Trying to refresh access token...`);
        const refreshResponse = await fetch("/api/google/refresh-token", {
          method: "POST",
        });

        if (refreshResponse.ok) {
          console.log(`✅ Token refreshed, retrying review fetch...`);
          // リフレッシュ成功したら再試行
          const newAccessToken = await db.getGoogleAccessToken(
            session?.user?.email || undefined
          );

          if (newAccessToken) {
            const retryResponse = await fetch(apiUrl, {
              headers: {
                Authorization: `Bearer ${newAccessToken}`,
                "Content-Type": "application/json",
              },
            });

            if (retryResponse.ok) {
              const retryData = await retryResponse.json();
              console.log(
                `✅ Successfully fetched reviews after token refresh`
              );
              return NextResponse.json(retryData);
            }
          }
        }
      }

      const errorText = await reviewsResponse.text();
      console.error(`❌ Failed to fetch reviews:`, {
        status: reviewsResponse.status,
        statusText: reviewsResponse.statusText,
        errorBody: errorText,
      });

      return NextResponse.json(
        {
          error: "Failed to fetch reviews",
          details: `API returned ${reviewsResponse.status}: ${reviewsResponse.statusText}`,
          message:
            reviewsResponse.status === 403
              ? "レビューアクセスが制限されています。Google Business Profileの設定を確認してください。"
              : reviewsResponse.status === 404
              ? "レビューが見つかりません。ロケーションIDを確認してください。"
              : "レビューの取得に失敗しました。",
        },
        { status: reviewsResponse.status }
      );
    }

    const reviewsData = await reviewsResponse.json();
    console.log(
      `✅ Successfully fetched ${reviewsData.reviews?.length || 0} reviews`
    );

    return NextResponse.json(reviewsData);
  } catch (error) {
    console.error("Fetch reviews error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
