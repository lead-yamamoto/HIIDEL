import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import { db } from "../../../../lib/database";

export async function GET(request: NextRequest) {
  try {
    console.log("🔍 Checking Google auth status...");

    // 🔧 まずデータベースからトークンを取得
    let accessToken: string | undefined;
    let refreshToken: string | undefined;
    let tokenExpiry: Date | undefined;

    try {
      const session = await getServerSession(authOptions);
      if (session?.user?.email) {
        console.log("👤 Getting tokens from database for:", session.user.email);
        const tokens = await db.getUserGoogleTokens(session.user.email);

        if (tokens) {
          accessToken = tokens.accessToken;
          refreshToken = tokens.refreshToken;
          tokenExpiry = tokens.expiryDate;
          console.log("✅ Tokens found in database");
        } else {
          console.log("⚠️ No tokens found in database");
        }
      }
    } catch (dbError) {
      console.error("❌ Database token retrieval error:", dbError);
    }

    // フォールバック: Cookieからトークンを取得
    if (!accessToken) {
      console.log("🍪 Falling back to cookie-based tokens");
      const cookieStore = await cookies();
      accessToken = cookieStore.get("google_access_token")?.value;
      refreshToken = cookieStore.get("google_refresh_token")?.value;
    }

    console.log("🍪 Access token found:", !!accessToken);
    console.log(
      "🍪 Access token preview:",
      accessToken ? accessToken.substring(0, 20) + "..." : "none"
    );

    if (!accessToken) {
      console.log("❌ No Google access token found");
      return NextResponse.json({
        isAuthenticated: false,
        message: "Google access token not found",
      });
    }

    // トークンの有効期限をチェック
    if (tokenExpiry && tokenExpiry < new Date()) {
      console.log("⏰ Token expired, attempting refresh...");

      if (refreshToken) {
        try {
          const refreshResponse = await fetch(
            "https://oauth2.googleapis.com/token",
            {
              method: "POST",
              headers: {
                "Content-Type": "application/x-www-form-urlencoded",
              },
              body: new URLSearchParams({
                refresh_token: refreshToken,
                client_id: process.env.GOOGLE_CLIENT_ID!,
                client_secret: process.env.GOOGLE_CLIENT_SECRET!,
                grant_type: "refresh_token",
              }),
            }
          );

          if (refreshResponse.ok) {
            const tokenData = await refreshResponse.json();
            console.log("✅ Token refreshed successfully");

            // 新しいトークンをデータベースに保存
            const session = await getServerSession(authOptions);
            if (session?.user?.email) {
              const expiryDate = new Date();
              expiryDate.setSeconds(
                expiryDate.getSeconds() + (tokenData.expires_in || 3600)
              );

              await db.updateUserGoogleTokens(session.user.email, {
                accessToken: tokenData.access_token,
                refreshToken: tokenData.refresh_token || refreshToken,
                expiryDate: expiryDate,
              });
            }

            // 新しいアクセストークンを使用
            accessToken = tokenData.access_token;

            // Cookieも更新
            const refreshedResponse = NextResponse.json({
              isAuthenticated: true,
              message: "Token refreshed successfully",
            });

            refreshedResponse.cookies.set(
              "google_access_token",
              tokenData.access_token,
              {
                httpOnly: true,
                secure: false,
                maxAge: 7 * 24 * 60 * 60, // 7日間
                path: "/",
                sameSite: "lax",
              }
            );

            return refreshedResponse;
          } else {
            console.log("❌ Token refresh failed");
          }
        } catch (refreshError) {
          console.error("💥 Token refresh error:", refreshError);
        }
      }
    }

    // トークンの有効性を確認
    try {
      console.log("🔗 Validating token with Google...");
      const googleResponse = await fetch(
        "https://www.googleapis.com/oauth2/v1/userinfo",
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      console.log("📡 Google API response status:", googleResponse.status);

      if (googleResponse.ok) {
        const userInfo = await googleResponse.json();
        console.log("✅ Token validation successful:", userInfo.email);
        return NextResponse.json({
          isAuthenticated: true,
          userInfo: {
            email: userInfo.email,
            name: userInfo.name,
            picture: userInfo.picture,
          },
        });
      } else {
        console.log("❌ Invalid access token, status:", googleResponse.status);
        const errorText = await googleResponse.text();
        console.log("❌ Error details:", errorText);

        // 無効なトークンの場合、Cookieとデータベースを削除
        const errorResponse = NextResponse.json({
          isAuthenticated: false,
          message: "Invalid access token",
        });

        errorResponse.cookies.delete("google_access_token");
        errorResponse.cookies.delete("google_refresh_token");

        // データベースからも削除
        try {
          const session = await getServerSession(authOptions);
          if (session?.user?.email) {
            await db.updateUserGoogleConnection(session.user.email, false);
          }
        } catch (cleanupError) {
          console.error("❌ Failed to cleanup database tokens:", cleanupError);
        }

        return errorResponse;
      }
    } catch (error) {
      console.error("💥 Token validation error:", error);
      return NextResponse.json({
        isAuthenticated: false,
        message: "Token validation failed",
      });
    }
  } catch (error) {
    console.error("💥 Auth status check error:", error);
    return NextResponse.json(
      {
        error: "Failed to check authentication status",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
