import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/lib/database";

async function getAuthenticatedUserId(): Promise<string | null> {
  // セッション管理は簡素化
  return "1"; // demo@hiidel.comのユーザーID
}

// 星評価を数値に変換する関数
function convertStarRating(starRating: any): number {
  if (typeof starRating === "number") {
    return starRating;
  }

  if (typeof starRating === "string") {
    switch (starRating.toUpperCase()) {
      case "FIVE":
        return 5;
      case "FOUR":
        return 4;
      case "THREE":
        return 3;
      case "TWO":
        return 2;
      case "ONE":
        return 1;
      default:
        return 0;
    }
  }

  return 0;
}

export async function GET(request: NextRequest) {
  console.log(`🚀 === REVIEWS API CALLED ===`);
  console.log(`📅 Timestamp: ${new Date().toISOString()}`);
  console.log(`🔗 Request URL: ${request.url}`);

  try {
    const userId = await getAuthenticatedUserId();
    console.log(`👤 Authentication check - User ID: ${userId}`);

    if (!userId) {
      console.log("❌ User not authenticated - returning 401");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const storeId = searchParams.get("storeId");
    const unreplied = searchParams.get("unreplied") === "true";
    const limit = searchParams.get("limit")
      ? parseInt(searchParams.get("limit")!)
      : undefined;

    console.log(
      `📊 Fetching reviews for ${storeId ? "store " + storeId : "all stores"}${
        unreplied ? " (unreplied only)" : ""
      }${limit ? ` (limit: ${limit})` : ""}`
    );

    const cookieStore = await cookies();
    const accessToken = cookieStore.get("google_access_token")?.value;

    if (!accessToken) {
      return NextResponse.json(
        { error: "Google authentication required" },
        { status: 401 }
      );
    }

    // 店舗リストを取得
    console.log(`👤 Getting stores for userId: ${userId}`);
    const stores = await db.getStores(userId);
    console.log(`🏪 Raw stores from database:`, stores);
    console.log(`🏪 Number of stores found: ${stores.length}`);

    // 特定の店舗が指定されている場合はフィルタリング
    const targetStores = storeId
      ? stores.filter((store: any) => store.id === storeId)
      : stores;

    console.log(`🎯 Target stores after filtering:`, targetStores);
    console.log(`🏪 Found ${targetStores.length} stores to fetch reviews for`);

    // 各ストアの詳細をログ出力
    targetStores.forEach((store, index) => {
      console.log(`📍 Store ${index + 1}:`, {
        id: store.id,
        displayName: store.displayName,
        googleLocationId: store.googleLocationId,
        hasLocationId: !!store.googleLocationId,
      });
    });

    const allReviews: any[] = [];

    // 各店舗のレビューを取得
    for (const store of targetStores) {
      console.log(
        `📝 Fetching reviews for ${store.displayName} (${store.googleLocationId})`
      );

      try {
        // まず、アカウント情報を取得
        console.log(`🔍 Fetching account information...`);
        const accountsUrl = `https://mybusinessaccountmanagement.googleapis.com/v1/accounts`;

        const accountsResponse = await fetch(accountsUrl, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        });

        if (accountsResponse.ok) {
          const accountsData = await accountsResponse.json();
          console.log(`📊 Accounts data:`, accountsData);

          if (accountsData.accounts && accountsData.accounts.length > 0) {
            const accountName = accountsData.accounts[0].name;
            console.log(`🏢 Using account: ${accountName}`);

            // 新しいGoogle My Business APIエンドポイントを使用
            const locationName = `${accountName}/locations/${store.googleLocationId}`;
            const reviewsUrl = `https://mybusiness.googleapis.com/v4/${locationName}/reviews`;
            console.log(`🔗 Reviews API URL: ${reviewsUrl}`);

            const reviewsResponse = await fetch(reviewsUrl, {
              method: "GET",
              headers: {
                Authorization: `Bearer ${accessToken}`,
                "Content-Type": "application/json",
              },
            });

            console.log(
              `📍 Reviews API response status: ${reviewsResponse.status}`
            );
            console.log(
              `📍 Reviews API response headers:`,
              Object.fromEntries(reviewsResponse.headers.entries())
            );

            if (reviewsResponse.ok) {
              const reviewsData = await reviewsResponse.json();
              console.log(
                `📝 Reviews data for ${store.displayName}:`,
                reviewsData
              );

              if (reviewsData.reviews && reviewsData.reviews.length > 0) {
                const processedReviews = reviewsData.reviews.map(
                  (review: any) => ({
                    id:
                      review.name ||
                      `${store.id}_${Date.now()}_${Math.random()}`,
                    storeId: store.id,
                    storeName: store.displayName || "店舗名未設定",
                    googleLocationId: store.googleLocationId,
                    rating: convertStarRating(review.starRating),
                    comment: review.comment || "",
                    reviewer: {
                      displayName:
                        review.reviewer?.displayName || "匿名ユーザー",
                      profilePhotoUrl: review.reviewer?.profilePhotoUrl || null,
                    },
                    createdAt: review.createTime || new Date().toISOString(),
                    updateTime:
                      review.updateTime ||
                      review.createTime ||
                      new Date().toISOString(),
                    replied: !!(
                      review.reviewReply && review.reviewReply.comment
                    ),
                    replyText: review.reviewReply?.comment || null,
                    replyTime: review.reviewReply?.updateTime || null,
                    isRealData: true,
                    isSystemMessage: false,
                  })
                );

                allReviews.push(...processedReviews);
                console.log(
                  `✅ Added ${processedReviews.length} reviews for ${store.displayName}`
                );
              } else {
                console.log(`📝 No reviews found for ${store.displayName}`);

                // レビューが見つからない場合の通知
                const noReviewsMessage = {
                  id: `no_reviews_${store.id}_${Date.now()}`,
                  storeId: store.id,
                  storeName: store.displayName || "店舗名未設定",
                  googleLocationId: store.googleLocationId,
                  rating: 0,
                  comment:
                    "この店舗にはまだレビューが投稿されていません。アンケートを活用してお客様からレビューを集めましょう！",
                  reviewer: {
                    displayName: "システム通知",
                    profilePhotoUrl: null,
                  },
                  createdAt: new Date().toISOString(),
                  updateTime: new Date().toISOString(),
                  replied: false,
                  replyText: null,
                  replyTime: null,
                  isRealData: false,
                  isSystemMessage: true,
                  messageType: "no_reviews_available",
                };

                allReviews.push(noReviewsMessage);
              }
            } else {
              const errorText = await reviewsResponse.text();
              console.error(
                `❌ Failed to fetch reviews for ${store.displayName}:`,
                {
                  status: reviewsResponse.status,
                  statusText: reviewsResponse.statusText,
                  errorBody: errorText,
                }
              );

              // より詳細なエラー分析
              let errorMessage = "";
              let messageType = "";

              if (reviewsResponse.status === 403) {
                console.warn(
                  `🔒 Reviews API access restricted for ${store.displayName} - this is normal for most Google Business Profile accounts`
                );
                errorMessage =
                  "Google Business Profile APIの制限により、この店舗のレビューにアクセスできません。これは一般的な制限で、プライバシー保護のためレビューデータへの直接アクセスは多くの場合制限されています。\n\n代替案：\n• Google My Businessの管理画面で直接レビューを確認\n• アンケート機能を活用してお客様の声を収集\n• QRコードでお客様にGoogleレビューへの投稿を促進";
                messageType = "api_access_restricted";
              } else if (reviewsResponse.status === 404) {
                console.warn(
                  `📝 Reviews endpoint not found for ${store.displayName}`
                );
                errorMessage =
                  "この店舗のレビューエンドポイントが見つかりませんでした。店舗がGoogle Business Profileで正しく設定されていない可能性があります。";
                messageType = "endpoint_not_found";
              } else if (reviewsResponse.status === 401) {
                console.warn(`🔐 Authentication failed for reviews API`);
                errorMessage =
                  "Google認証の有効期限が切れています。再度Google Business Profileとの連携を行ってください。";
                messageType = "auth_expired";
              } else {
                errorMessage = `レビューの取得中にエラーが発生しました（ステータス: ${reviewsResponse.status}）。Google Business Profile APIの一時的な問題の可能性があります。`;
                messageType = "api_error";
              }

              const errorNotificationMessage = {
                id: `error_${store.id}_${Date.now()}`,
                storeId: store.id,
                storeName: store.displayName || "店舗名未設定",
                googleLocationId: store.googleLocationId,
                rating: 0,
                comment: errorMessage,
                reviewer: {
                  displayName: "システム通知",
                  profilePhotoUrl: null,
                },
                createdAt: new Date().toISOString(),
                updateTime: new Date().toISOString(),
                replied: false,
                replyText: null,
                replyTime: null,
                isRealData: false,
                isSystemMessage: true,
                messageType: messageType,
              };

              allReviews.push(errorNotificationMessage);
              console.log(
                `ℹ️ Added error notification for ${store.displayName}`
              );
            }
          } else {
            console.error(`❌ No accounts found for user`);

            // アカウントが見つからない場合の通知
            const noAccountMessage = {
              id: `no_account_${store.id}_${Date.now()}`,
              storeId: store.id,
              storeName: store.displayName || "店舗名未設定",
              googleLocationId: store.googleLocationId,
              rating: 0,
              comment:
                "Google Business Profileのアカウント情報を取得できませんでした。アカウントの権限設定を確認してください。",
              reviewer: {
                displayName: "システム通知",
                profilePhotoUrl: null,
              },
              createdAt: new Date().toISOString(),
              updateTime: new Date().toISOString(),
              replied: false,
              replyText: null,
              replyTime: null,
              isRealData: false,
              isSystemMessage: true,
              messageType: "no_account_access",
            };

            allReviews.push(noAccountMessage);
          }
        } else {
          const accountsErrorText = await accountsResponse.text();
          console.error(`❌ Failed to fetch accounts:`, {
            status: accountsResponse.status,
            statusText: accountsResponse.statusText,
            errorBody: accountsErrorText,
          });

          // アカウント取得エラーの通知
          const accountErrorMessage = {
            id: `account_error_${store.id}_${Date.now()}`,
            storeId: store.id,
            storeName: store.displayName || "店舗名未設定",
            googleLocationId: store.googleLocationId,
            rating: 0,
            comment:
              "Google Business Profileのアカウント情報の取得に失敗しました。認証トークンの更新が必要な可能性があります。",
            reviewer: {
              displayName: "システム通知",
              profilePhotoUrl: null,
            },
            createdAt: new Date().toISOString(),
            updateTime: new Date().toISOString(),
            replied: false,
            replyText: null,
            replyTime: null,
            isRealData: false,
            isSystemMessage: true,
            messageType: "account_error",
          };

          allReviews.push(accountErrorMessage);
        }
      } catch (error) {
        console.error(
          `❌ Error fetching reviews for ${store.displayName}:`,
          error
        );

        // エラーの通知
        const errorMessage = {
          id: `error_${store.id}_${Date.now()}`,
          storeId: store.id,
          storeName: store.displayName || "店舗名未設定",
          googleLocationId: store.googleLocationId,
          rating: 0,
          comment: `レビューの取得中にエラーが発生しました: ${
            error instanceof Error ? error.message : "不明なエラー"
          }`,
          reviewer: {
            displayName: "システム通知",
            profilePhotoUrl: null,
          },
          createdAt: new Date().toISOString(),
          updateTime: new Date().toISOString(),
          replied: false,
          replyText: null,
          replyTime: null,
          isRealData: false,
          isSystemMessage: true,
          messageType: "fetch_error",
        };

        allReviews.push(errorMessage);
      }
    }

    // 作成日時でソート
    allReviews.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    // 未返信フィルターを適用
    let filteredReviews = allReviews;
    if (unreplied) {
      filteredReviews = allReviews.filter(
        (review) =>
          !review.isSystemMessage && !review.replied && review.isRealData
      );
      console.log(`📊 Filtered to ${filteredReviews.length} unreplied reviews`);
    }

    // limit適用
    if (limit && limit > 0) {
      filteredReviews = filteredReviews.slice(0, limit);
      console.log(`📊 Limited to ${filteredReviews.length} reviews`);
    }

    console.log(`📊 Total reviews returned: ${filteredReviews.length}`);
    console.log(
      `📊 Review details:`,
      filteredReviews.map((r) => ({
        id: r.id,
        storeName: r.storeName,
        rating: r.rating,
        hasComment: !!r.comment,
        isRealData: r.isRealData,
        replied: r.replied,
        messageType: r.messageType,
      }))
    );

    const realReviewsCount = filteredReviews.filter((r) => r.isRealData).length;
    const systemMessagesCount = filteredReviews.filter(
      (r) => r.isSystemMessage
    ).length;

    return NextResponse.json({
      reviews: filteredReviews,
      count: filteredReviews.length,
      totalCount: allReviews.length,
      realReviewsCount: realReviewsCount,
      systemMessagesCount: systemMessagesCount,
      storeId: storeId || null,
      unreplied: unreplied,
      limit: limit,
      isRealData: filteredReviews.some((r) => r.isRealData),
      storesChecked: targetStores.length,
      hasSystemMessages: allReviews.some((r) => r.isSystemMessage),
      message:
        filteredReviews.length === 0 && unreplied
          ? "未返信のレビューはありません。"
          : filteredReviews.length === 0
          ? "レビューデータを取得できませんでした。Google Business Profile APIのアクセス制限により、レビューの詳細情報が利用できない可能性があります。"
          : realReviewsCount > 0
          ? `${realReviewsCount}件の${
              unreplied ? "未返信" : ""
            }レビューを取得しました。`
          : "Google Business Profile APIの制限により、レビューの詳細情報を取得できませんでした。システム通知をご確認ください。",
    });
  } catch (error) {
    console.error("Reviews GET Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { storeId, rating, text, authorName, googleReviewId } = body;

    if (!storeId || !rating || !text || !authorName) {
      return NextResponse.json(
        {
          error: "Store ID, rating, text, and author name are required",
        },
        { status: 400 }
      );
    }

    const review = await db.createReview({
      storeId,
      userId,
      googleReviewId,
      rating,
      text,
      authorName,
      isTestData: !googleReviewId,
      replied: false,
    });

    return NextResponse.json({ review }, { status: 201 });
  } catch (error) {
    console.error("Reviews POST Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { reviewId, replyText } = body;

    if (!reviewId || !replyText) {
      return NextResponse.json(
        {
          error: "Review ID and reply text are required",
        },
        { status: 400 }
      );
    }

    const success = await db.replyToReview(reviewId, replyText, userId);

    if (!success) {
      return NextResponse.json(
        { error: "Review not found or unauthorized" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Reviews PATCH Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
