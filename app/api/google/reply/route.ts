import { type NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import { db } from "../../../../lib/database";

export async function POST(request: NextRequest) {
  // 🔧 データベース優先でGoogle アクセストークンを取得
  const session = await getServerSession(authOptions);
  const accessToken = await db.getGoogleAccessToken(
    session?.user?.email || undefined
  );

  if (!accessToken) {
    console.error("❌ No Google access token found");
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const { reviewId, reply } = await request.json();
    console.log("🔄 Reply request:", { reviewId, replyLength: reply?.length });

    if (!reviewId || !reply) {
      console.error("❌ Missing required parameters:", {
        reviewId: !!reviewId,
        reply: !!reply,
      });
      return NextResponse.json(
        { error: "Review ID and reply are required" },
        { status: 400 }
      );
    }

    // レビューIDの形式を確認・修正
    let formattedReviewId = reviewId;
    if (!reviewId.includes("/reply")) {
      formattedReviewId = `${reviewId}/reply`;
    }

    console.log("📡 Sending reply to Google API:", formattedReviewId);
    console.log("📝 Reply content:", reply.substring(0, 100) + "...");

    // レビューに返信
    const apiUrl = `https://mybusiness.googleapis.com/v4/${formattedReviewId}`;
    console.log("🔗 API URL:", apiUrl);

    const replyResponse = await fetch(apiUrl, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        comment: reply,
      }),
    });

    console.log("📡 Google API response status:", replyResponse.status);

    if (!replyResponse.ok) {
      const errorText = await replyResponse.text();
      console.error("❌ Google API error response:", errorText);

      // トークンが無効な場合はリフレッシュを試みる
      if (replyResponse.status === 401) {
        console.log("🔄 Attempting token refresh...");
        try {
          const refreshResponse = await fetch("/api/google/refresh-token", {
            method: "POST",
          });
          if (refreshResponse.ok) {
            console.log("✅ Token refreshed, retrying reply...");
            // 新しいトークンを取得して再試行
            const newAccessToken = await db.getGoogleAccessToken(
              session?.user?.email || undefined
            );

            if (newAccessToken) {
              const retryResponse = await fetch(apiUrl, {
                method: "PUT",
                headers: {
                  Authorization: `Bearer ${newAccessToken}`,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  comment: reply,
                }),
              });

              if (retryResponse.ok) {
                const retryData = await retryResponse.json();
                console.log("✅ Reply sent successfully after token refresh");
                return NextResponse.json(retryData);
              } else {
                const retryErrorText = await retryResponse.text();
                console.error("❌ Retry failed:", retryErrorText);
                return NextResponse.json(
                  {
                    error: "Failed to reply to review after token refresh",
                    details: retryErrorText,
                  },
                  { status: retryResponse.status }
                );
              }
            }
          }
        } catch (refreshError) {
          console.error("❌ Token refresh failed:", refreshError);
        }
      }

      return NextResponse.json(
        {
          error: "Failed to reply to review",
          details: errorText,
          status: replyResponse.status,
        },
        { status: replyResponse.status }
      );
    }

    const replyData = await replyResponse.json();
    console.log("✅ Reply sent successfully:", replyData);
    return NextResponse.json(replyData);
  } catch (error) {
    console.error("💥 Reply to review error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
