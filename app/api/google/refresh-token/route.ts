import { type NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"

// Google OAuth設定
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET

export async function GET(request: NextRequest) {
  const cookieStore = cookies()
  const refreshToken = cookieStore.get("google_refresh_token")?.value

  if (!refreshToken) {
    return NextResponse.json({ error: "No refresh token found" }, { status: 401 })
  }

  try {
    // リフレッシュトークンを使用して新しいアクセストークンを取得
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: GOOGLE_CLIENT_ID!,
        client_secret: GOOGLE_CLIENT_SECRET!,
        refresh_token: refreshToken,
        grant_type: "refresh_token",
      }),
    })

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json()
      console.error("Token refresh error:", errorData)
      return NextResponse.json({ error: "Failed to refresh token" }, { status: 400 })
    }

    const tokenData = await tokenResponse.json()

    // 新しいアクセストークンをCookieに保存
    cookieStore.set("google_access_token", tokenData.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: tokenData.expires_in,
      path: "/",
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Token refresh error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
