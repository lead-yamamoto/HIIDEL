import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET(request: NextRequest) {
  try {
    console.log("🔍 Checking Google auth status...");

    const cookieStore = await cookies();
    const accessToken = cookieStore.get("google_access_token")?.value;

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

        // リフレッシュトークンを使って新しいアクセストークンを取得を試行
        const refreshToken = cookieStore.get("google_refresh_token")?.value;
        if (refreshToken && googleResponse.status === 401) {
          console.log("🔄 Attempting to refresh access token...");

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

              // 新しいアクセストークンをCookieに保存
              const refreshedResponse = NextResponse.json({
                isAuthenticated: true,
                message: "Token refreshed successfully",
                userInfo: {
                  email: "Token refreshed - retrieving user info...",
                },
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

        // 無効なトークンの場合、Cookieを削除
        const errorResponse = NextResponse.json({
          isAuthenticated: false,
          message: "Invalid access token",
        });

        errorResponse.cookies.delete("google_access_token");
        errorResponse.cookies.delete("google_refresh_token");

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
