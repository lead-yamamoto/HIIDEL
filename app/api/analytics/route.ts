import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { db } from "@/lib/database";
import { cookies } from "next/headers";

async function getAuthenticatedUserId(): Promise<string | null> {
  try {
    const session = await getServerSession();
    if (session?.user?.id) {
      return session.user.id;
    }
    // フォールバック: デモユーザー
    return "1";
  } catch (error) {
    console.error("認証エラー:", error);
    return "1"; // フォールバック
  }
}

export async function GET(request: NextRequest) {
  try {
    // ホームダッシュボード用：認証なしでも基本データを提供
    const userId = await getAuthenticatedUserId();
    if (!userId) {
      console.log(
        "🔐 No authenticated user, returning basic analytics without auth"
      );

      // 認証なしでも基本的な店舗データを取得
      try {
        const basicStores = await db.getStores("1"); // デフォルトユーザーのデータ
        const basicAnalytics = {
          totalStores: basicStores.length,
          totalReviews: 0,
          averageRating: 0,
          unansweredReviews: 0,
          responseRate: 0,
          totalQRScans: 0,
          totalSurveyResponses: 0,
          todayReviews: 0,
          todayScans: 0,
          hasRealData: false,
          period: 30,
          storeId: null,
          dailyReviews: [],
          dailyScans: [],
          ratingDistribution: [0, 0, 0, 0, 0],
          storeStats: basicStores.map((store: any) => ({
            storeId: store.id,
            storeName: store.displayName,
            reviewCount: 0,
            averageRating: 0,
            unansweredReviews: 0,
          })),
          message:
            basicStores.length > 0
              ? `${basicStores.length}件の店舗が登録済みです。Google Business Profileと連携するとレビューデータを表示できます。`
              : "店舗が登録されていません。まず店舗を追加してください。",
        };
        return NextResponse.json(basicAnalytics);
      } catch (dbError) {
        console.error("❌ Failed to fetch basic store data:", dbError);
        return NextResponse.json({
          totalStores: 0,
          totalReviews: 0,
          averageRating: 0,
          unansweredReviews: 0,
          responseRate: 0,
          totalQRScans: 0,
          totalSurveyResponses: 0,
          todayReviews: 0,
          todayScans: 0,
          hasRealData: false,
          period: 30,
          storeId: null,
          message: "データの取得に失敗しました。",
        });
      }
    }

    const { searchParams } = new URL(request.url);
    const storeId = searchParams.get("storeId");
    const period = searchParams.get("period") || "30"; // デフォルト30日

    console.log(
      `📊 Fetching analytics data for ${
        storeId ? "store " + storeId : "all stores"
      } (${period} days)`
    );

    const cookieStore = await cookies();
    const accessToken = cookieStore.get("google_access_token")?.value;

    // 店舗データを取得
    const allStores = await db.getStores(userId);
    const targetStores = storeId
      ? allStores.filter((s: any) => s.id === storeId)
      : allStores;

    console.log(`🏪 Found ${targetStores.length} stores for analytics`);

    // Google認証がない場合は基本的な統計データのみ返す
    if (!accessToken) {
      console.log("🔐 No Google access token, returning basic analytics");

      const basicAnalytics = {
        totalStores: targetStores.length,
        totalReviews: 0,
        averageRating: 0,
        unansweredReviews: 0,
        responseRate: 0,
        totalQRScans: 0,
        totalSurveyResponses: 0,
        todayReviews: 0,
        todayScans: 0,
        hasRealData: false,
        period: parseInt(period),
        storeId: storeId || null,

        // チャート用のダミーデータ
        dailyReviews: [],
        dailyScans: [],
        ratingDistribution: [0, 0, 0, 0, 0],

        // 店舗別統計
        storeStats: targetStores.map((store: any) => ({
          storeId: store.id,
          storeName: store.displayName,
          reviewCount: 0,
          averageRating: 0,
          unansweredReviews: 0,
        })),

        message:
          targetStores.length > 0
            ? `${targetStores.length}件の店舗が登録済みです。Google Business Profileと連携するとレビューデータを表示できます。`
            : "店舗が登録されていません。まず店舗を追加してください。",
      };

      return NextResponse.json(basicAnalytics);
    }

    try {
      // Google Business Profileからレビューを取得
      const allReviews: any[] = [];

      for (const store of targetStores) {
        if (!store.googleLocationId) {
          console.log(
            `⚠️ Store ${store.displayName} has no Google Location ID, skipping`
          );
          continue;
        }

        try {
          console.log(
            `📝 Fetching reviews for analytics: ${store.displayName} (${store.googleLocationId})`
          );

          // まずアカウント情報を取得
          console.log(`🔍 Getting account information for analytics...`);
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
            console.error(
              `❌ Failed to fetch accounts for analytics: ${accountsResponse.status}`
            );
            continue;
          }

          const accountsData = await accountsResponse.json();
          if (!accountsData.accounts || accountsData.accounts.length === 0) {
            console.error(`❌ No accounts found for analytics`);
            continue;
          }

          // 最初のアカウントを使用（通常は1つしかない）
          const accountName = accountsData.accounts[0].name;
          console.log(`✅ Using account for analytics: ${accountName}`);

          // 正しいGoogle My Business API v4.9のレビューエンドポイントを使用
          const apiUrl = `https://mybusiness.googleapis.com/v4/${accountName}/locations/${store.googleLocationId}/reviews`;

          const reviewsResponse = await fetch(apiUrl, {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
          });

          if (reviewsResponse.ok) {
            const reviewsData = await reviewsResponse.json();

            if (reviewsData.reviews && reviewsData.reviews.length > 0) {
              const processedReviews = reviewsData.reviews.map(
                (review: any) => ({
                  id:
                    review.reviewId ||
                    review.name ||
                    `review_${Date.now()}_${Math.random()}`,
                  storeId: store.id,
                  storeName: store.displayName,
                  rating:
                    review.starRating === "FIVE"
                      ? 5
                      : review.starRating === "FOUR"
                      ? 4
                      : review.starRating === "THREE"
                      ? 3
                      : review.starRating === "TWO"
                      ? 2
                      : review.starRating === "ONE"
                      ? 1
                      : typeof review.starRating === "number"
                      ? review.starRating
                      : 0,
                  comment: review.comment || "",
                  reviewer: {
                    displayName: review.reviewer?.displayName || "匿名ユーザー",
                  },
                  createdAt: review.createTime || new Date().toISOString(),
                  replied: !!review.reviewReply,
                  replyText: review.reviewReply?.comment || null,
                  isRealData: true,
                })
              );

              allReviews.push(...processedReviews);
              console.log(
                `✅ Added ${processedReviews.length} real reviews for analytics from ${store.displayName}`
              );
            } else {
              console.log(
                `📝 No reviews found for analytics from ${store.displayName}`
              );
            }
          } else {
            console.warn(
              `⚠️ Failed to fetch reviews for analytics from ${store.displayName}:`,
              reviewsResponse.status
            );

            // トークンリフレッシュを試行
            if (reviewsResponse.status === 401) {
              console.log(`🔄 Trying to refresh access token for analytics...`);
              try {
                const refreshResponse = await fetch(
                  "/api/google/refresh-token",
                  {
                    method: "POST",
                  }
                );

                if (refreshResponse.ok) {
                  console.log(
                    `✅ Token refreshed, retrying analytics fetch...`
                  );
                  // 新しいトークンで再試行
                  const newCookieStore = await cookies();
                  const newAccessToken = newCookieStore.get(
                    "google_access_token"
                  )?.value;

                  if (newAccessToken) {
                    const retryResponse = await fetch(apiUrl, {
                      headers: {
                        Authorization: `Bearer ${newAccessToken}`,
                        "Content-Type": "application/json",
                      },
                    });

                    if (retryResponse.ok) {
                      const retryData = await retryResponse.json();
                      if (retryData.reviews && retryData.reviews.length > 0) {
                        const processedReviews = retryData.reviews.map(
                          (review: any) => ({
                            id:
                              review.reviewId ||
                              review.name ||
                              `review_${Date.now()}_${Math.random()}`,
                            storeId: store.id,
                            storeName: store.displayName,
                            rating:
                              review.starRating === "FIVE"
                                ? 5
                                : review.starRating === "FOUR"
                                ? 4
                                : review.starRating === "THREE"
                                ? 3
                                : review.starRating === "TWO"
                                ? 2
                                : review.starRating === "ONE"
                                ? 1
                                : typeof review.starRating === "number"
                                ? review.starRating
                                : 0,
                            comment: review.comment || "",
                            reviewer: {
                              displayName:
                                review.reviewer?.displayName || "匿名ユーザー",
                            },
                            createdAt:
                              review.createTime || new Date().toISOString(),
                            replied: !!review.reviewReply,
                            replyText: review.reviewReply?.comment || null,
                            isRealData: true,
                          })
                        );

                        allReviews.push(...processedReviews);
                        console.log(
                          `✅ Added ${processedReviews.length} real reviews for analytics from ${store.displayName} after token refresh`
                        );
                      }
                    }
                  }
                }
              } catch (refreshError) {
                console.error(
                  "Token refresh failed for analytics:",
                  refreshError
                );
              }
            }
          }
        } catch (error) {
          console.warn(
            `⚠️ Error fetching reviews for analytics from ${store.displayName}:`,
            error
          );
        }
      }

      // 期間フィルタリング
      const periodDays = parseInt(period);
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - periodDays);

      const filteredReviews = allReviews.filter((review: any) => {
        const reviewDate = new Date(review.createdAt);
        return reviewDate >= cutoffDate;
      });

      // 今日のデータ
      const today = new Date().toISOString().split("T")[0];
      const todayReviews = allReviews.filter(
        (r: any) => r.createdAt && r.createdAt.startsWith(today)
      ).length;

      // 分析データを計算
      const totalReviews = filteredReviews.length;
      const averageRating =
        totalReviews > 0
          ? filteredReviews.reduce(
              (sum: number, r: any) => sum + (r.rating || 0),
              0
            ) / totalReviews
          : 0;

      const unansweredReviews = filteredReviews.filter(
        (r: any) => !r.replied
      ).length;
      const responseRate =
        totalReviews > 0
          ? Math.round(
              ((totalReviews - unansweredReviews) / totalReviews) * 100
            )
          : 0;

      // 評価分布を計算
      const ratingDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
      filteredReviews.forEach((review: any) => {
        const rating = Math.floor(review.rating || 0);
        if (rating >= 1 && rating <= 5) {
          ratingDistribution[rating as keyof typeof ratingDistribution]++;
        }
      });

      // 日別データを生成
      const generateDailyData = (type: "reviews" | "scans", days: number) => {
        const data = [];
        for (let i = days - 1; i >= 0; i--) {
          const date = new Date();
          date.setDate(date.getDate() - i);
          const dateStr = date.toISOString().split("T")[0];

          let value = 0;
          if (type === "reviews") {
            value = allReviews.filter(
              (r: any) => r.createdAt && r.createdAt.startsWith(dateStr)
            ).length;
          } else {
            // QRスキャンデータは実際の店舗では0
            value = 0;
          }

          data.push({
            date: dateStr,
            value,
            dayOfWeek: date.getDay(),
          });
        }
        return data;
      };

      const analyticsData = {
        totalStores: targetStores.length,
        totalReviews,
        averageRating: Math.round(averageRating * 10) / 10,
        unansweredReviews,
        responseRate,
        totalQRScans: 0, // 実際のGoogle APIには含まれない
        totalSurveyResponses: 0, // 実際のGoogle APIには含まれない
        todayReviews,
        todayScans: 0,
        hasRealData: true,
        period,
        storeId: storeId || null,

        // チャート用データ
        dailyReviews: generateDailyData("reviews", periodDays),
        dailyScans: generateDailyData("scans", periodDays),
        ratingDistribution,

        // 店舗別統計
        storeStats: targetStores.map((store: any) => {
          const storeReviews = allReviews.filter(
            (r: any) => r.storeId === store.id
          );
          const storeAvgRating =
            storeReviews.length > 0
              ? storeReviews.reduce(
                  (sum: number, r: any) => sum + (r.rating || 0),
                  0
                ) / storeReviews.length
              : 0;

          return {
            storeId: store.id,
            storeName: store.displayName,
            reviewCount: storeReviews.length,
            averageRating: Math.round(storeAvgRating * 10) / 10,
            unansweredReviews: storeReviews.filter((r: any) => !r.replied)
              .length,
          };
        }),
      };

      console.log(
        `✅ Calculated analytics from Google Business Profile data:`,
        {
          stores: targetStores.length,
          reviews: totalReviews,
          avgRating: analyticsData.averageRating,
        }
      );

      return NextResponse.json(analyticsData);
    } catch (dataError) {
      console.error("Error fetching analytics data:", dataError);

      return NextResponse.json({
        totalStores: 0,
        totalReviews: 0,
        averageRating: 0,
        unansweredReviews: 0,
        responseRate: 0,
        totalQRScans: 0,
        totalSurveyResponses: 0,
        todayReviews: 0,
        todayScans: 0,
        hasRealData: false,
        error: "Unable to fetch analytics data",
        period,
        storeId: storeId || null,
      });
    }
  } catch (error) {
    console.error("Analytics GET Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
