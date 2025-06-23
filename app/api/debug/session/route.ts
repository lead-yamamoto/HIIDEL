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
          }
        : null,
      storesCount: stores.length,
      stores: stores.map((store) => ({
        id: store.id,
        displayName: store.displayName,
        userId: store.userId,
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
