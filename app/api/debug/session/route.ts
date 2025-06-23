import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]/route";
import { db } from "../../../../lib/database";

export async function GET(request: NextRequest) {
  try {
    console.log("🔍 [DEBUG] Session check started");

    // セッション情報を取得
    const session = await getServerSession(authOptions);
    console.log("🔍 [DEBUG] Session from NextAuth:", session);

    // データベース情報を取得
    await db.ensureInitialized();
    const user = session?.user?.email
      ? await db.getUser(session.user.email)
      : null;
    console.log("🔍 [DEBUG] User from database:", user);

    // ストア情報を取得
    const stores = session?.user?.id ? await db.getStores(session.user.id) : [];
    console.log("🔍 [DEBUG] Stores for user:", stores);

    // Googleトークン情報を詳しく取得
    let googleTokenDetails = null;
    if (session?.user?.email) {
      try {
        const tokens = await db.getUserGoogleTokens(session.user.email);
        const accessToken = await db.getGoogleAccessToken(session.user.email);

        googleTokenDetails = {
          hasTokensInDB: !!tokens,
          hasAccessToken: !!tokens?.accessToken,
          hasRefreshToken: !!tokens?.refreshToken,
          tokenExpiry: tokens?.expiryDate?.toISOString() || null,
          isTokenExpired: tokens?.expiryDate
            ? tokens.expiryDate < new Date()
            : null,
          accessTokenFromMethod: !!accessToken,
          accessTokenPreview: tokens?.accessToken
            ? tokens.accessToken.substring(0, 20) + "..."
            : null,
        };

        console.log("🔍 [DEBUG] Google token details:", googleTokenDetails);
      } catch (error) {
        console.error("🔍 [DEBUG] Error getting Google tokens:", error);
        googleTokenDetails = {
          error: error instanceof Error ? error.message : "Unknown error",
        };
      }
    }

    return NextResponse.json({
      debug: true,
      timestamp: new Date().toISOString(),
      session: session
        ? {
            user: {
              id: session.user?.id,
              email: session.user?.email,
              name: session.user?.name,
              role: session.user?.role,
            },
            hasAccessToken: !!session.accessToken,
          }
        : null,
      databaseUser: user
        ? {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            isGoogleConnected: user.isGoogleConnected,
            hasGoogleAccessToken: !!user.googleAccessToken,
            hasGoogleRefreshToken: !!user.googleRefreshToken,
            googleTokenExpiry: user.googleTokenExpiry?.toISOString() || null,
          }
        : null,
      googleTokenDetails,
      storesCount: stores.length,
      stores: stores.map((store) => ({
        id: store.id,
        displayName: store.displayName,
        userId: store.userId,
        hasGoogleLocationId: !!store.googleLocationId,
      })),
    });
  } catch (error) {
    console.error("🔍 [DEBUG] Error:", error);
    return NextResponse.json({
      debug: true,
      error: error instanceof Error ? error.message : "Unknown error",
      timestamp: new Date().toISOString(),
    });
  }
}
