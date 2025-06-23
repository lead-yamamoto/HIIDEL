import { type NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import { db } from "../../../../lib/database";

// Google OAuth設定
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REDIRECT_URI =
  process.env.REDIRECT_URI || "http://localhost:3000/api/google/callback";

export async function GET(request: NextRequest) {
  console.log("🔗 Google OAuth callback initiated");

  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  console.log("📝 Callback params:", { code: !!code, error });

  // エラーパラメータがある場合
  if (error) {
    console.error("❌ OAuth error:", error);
    return NextResponse.redirect(
      new URL(
        "/google-business/connect?error=" + encodeURIComponent(error),
        request.url
      )
    );
  }

  if (!code) {
    console.error("❌ No authorization code provided");
    return NextResponse.redirect(
      new URL("/google-business/connect?error=no_code", request.url)
    );
  }

  // 必要な環境変数が設定されているか確認
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    console.error("❌ Missing required environment variables");
    return NextResponse.redirect(
      new URL(
        "/google-business/connect?error=server_configuration_error",
        request.url
      )
    );
  }

  try {
    console.log("🔄 Exchanging code for tokens...");

    // 認証コードをトークンと交換
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: REDIRECT_URI,
        grant_type: "authorization_code",
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse
        .json()
        .catch(() => ({ error: "Unknown token exchange error" }));
      console.error("❌ Token exchange error:", errorData);
      return NextResponse.redirect(
        new URL(
          "/google-business/connect?error=token_exchange_failed",
          request.url
        )
      );
    }

    const tokenData = await tokenResponse.json();
    console.log("✅ Token exchange successful");
    console.log("🔑 Access token received:", !!tokenData.access_token);
    console.log("🔄 Refresh token received:", !!tokenData.refresh_token);

    // トークンをCookieに保存
    const cookieStore = await cookies();

    console.log("🍪 Setting access token cookie...");
    cookieStore.set("google_access_token", tokenData.access_token, {
      httpOnly: true,
      secure: false, // localhost用にfalseに設定
      maxAge: 7 * 24 * 60 * 60, // 7日間に延長
      path: "/",
      sameSite: "lax",
    });

    if (tokenData.refresh_token) {
      console.log("🍪 Setting refresh token cookie...");
      cookieStore.set("google_refresh_token", tokenData.refresh_token, {
        httpOnly: true,
        secure: false, // localhost用にfalseに設定
        maxAge: 30 * 24 * 60 * 60, // 30日
        path: "/",
        sameSite: "lax",
      });
    }

    // 追加: デバッグ用にCookie設定を確認
    console.log("🔍 Cookie setting debug:");
    console.log("Access token length:", tokenData.access_token?.length);
    console.log("Expires in:", tokenData.expires_in);

    // 正常に設定されたかテスト
    const testToken = cookieStore.get("google_access_token");
    console.log("🧪 Cookie test read:", !!testToken?.value);

    // ユーザー情報を取得
    console.log("👤 Fetching user info...");
    const userInfoResponse = await fetch(
      "https://www.googleapis.com/oauth2/v2/userinfo",
      {
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
        },
      }
    );

    if (!userInfoResponse.ok) {
      console.error("❌ Failed to fetch user info");
      return NextResponse.redirect(
        new URL("/google-business/connect?error=user_info_failed", request.url)
      );
    }

    const userInfo = await userInfoResponse.json();
    console.log("✅ User info retrieved:", userInfo.email);

    // 🔧 トークンをデータベースに保存
    try {
      console.log("💾 Saving Google tokens to database...");

      // 現在のセッションからユーザー情報を取得
      const session = await getServerSession(authOptions);
      const userEmail = session?.user?.email || userInfo.email;

      if (userEmail) {
        // トークンの有効期限を計算
        const expiryDate = new Date();
        expiryDate.setSeconds(
          expiryDate.getSeconds() + (tokenData.expires_in || 3600)
        );

        await db.updateUserGoogleTokens(userEmail, {
          accessToken: tokenData.access_token,
          refreshToken: tokenData.refresh_token,
          expiryDate: expiryDate,
        });

        console.log("✅ Google tokens saved to database for:", userEmail);
      } else {
        console.log("⚠️ No user email found, tokens saved only to cookies");
      }
    } catch (dbError) {
      console.error("❌ Failed to save tokens to database:", dbError);
      // データベース保存に失敗してもCookieは設定されているので続行
    }

    // 認証成功後、GBP連携ページにリダイレクト
    console.log("🎉 Google OAuth flow completed successfully");
    return NextResponse.redirect(
      new URL("/google-business/connect?success=true", request.url)
    );
  } catch (error) {
    console.error("💥 OAuth callback error:", error);
    return NextResponse.redirect(
      new URL("/google-business/connect?error=oauth_error", request.url)
    );
  }
}
