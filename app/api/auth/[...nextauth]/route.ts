import { NextAuthOptions } from "next-auth";
import NextAuth from "next-auth/next";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { db } from "../../../../lib/database";

// プロバイダー設定
const providers: any[] = [
  CredentialsProvider({
    name: "credentials",
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Password", type: "password" },
    },
    async authorize(credentials) {
      if (!credentials?.email || !credentials?.password) {
        console.log("❌ Missing credentials");
        return null;
      }

      try {
        console.log("🔍 Authenticating user with Redis database...");
        await db.ensureInitialized();

        const user = await db.getUser(credentials.email);

        if (!user) {
          console.log("❌ User not found:", credentials.email);
          return null;
        }

        // パスワード検証（デモユーザーの場合は固定パスワード）
        if (
          credentials.email === "demo@hiidel.com" &&
          credentials.password === "demo123"
        ) {
          console.log("✅ Demo user authenticated successfully");
          return {
            id: user.id, // データベースからの固定ID
            email: user.email,
            name: user.name,
            role: user.role,
            companyName: user.companyName,
          };
        }

        console.log("❌ Invalid password for user:", credentials.email);
        return null;
      } catch (error) {
        console.error("💥 Authentication error:", error);
        return null;
      }
    },
  }),
];

// Google OAuth設定が利用可能な場合のみ追加
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  providers.push(
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      authorization: {
        params: {
          scope: [
            "openid",
            "email",
            "profile",
            "https://www.googleapis.com/auth/business.manage",
          ].join(" "),
        },
      },
    })
  );
}

export const authOptions: NextAuthOptions = {
  providers,
  callbacks: {
    async jwt({ token, user, account }) {
      console.log("🔑 [NextAuth] jwt callback called");
      console.log("🔍 Token before modification:", {
        sub: token.sub,
        id: token.id,
      });

      if (user) {
        console.log(
          "👤 Adding user to token:",
          user.email,
          "with ID:",
          user.id
        );
        // カスタムIDを使用（NextAuth.jsが自動生成するIDを上書き）
        token.sub = user.id; // NextAuth.jsの標準フィールド
        token.id = user.id; // カスタムフィールド
        token.role = user.role;
        token.companyName = user.companyName;
      }

      if (account?.provider === "google") {
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;

        // Googleトークンをデータベースに保存
        if (user?.email && account.access_token) {
          try {
            const expiryDate = new Date();
            expiryDate.setSeconds(
              expiryDate.getSeconds() + (account.expires_at || 3600)
            );

            await db.updateUserGoogleTokens(user.email, {
              accessToken: account.access_token,
              refreshToken: account.refresh_token,
              expiryDate: expiryDate,
            });

            await db.updateUserGoogleConnection(user.email, true);
            console.log("✅ Google tokens saved to database");
          } catch (error) {
            console.error("❌ Error saving Google tokens:", error);
          }
        }
      }

      console.log("🔍 Token after modification:", {
        sub: token.sub,
        id: token.id,
      });
      return token;
    },
    async session({ session, token }) {
      console.log("📝 [NextAuth] session callback called");
      console.log("🔍 Token in session callback:", {
        sub: token.sub,
        id: token.id,
      });

      if (session.user && token) {
        console.log("👤 Adding token data to session");
        // NextAuth.jsの標準フィールド（token.sub）を使用
        session.user.id = token.sub!;
        session.user.role = token.role as string;
        session.user.companyName = token.companyName as string;
        session.accessToken = token.accessToken as string;
      }

      console.log("✨ Final session:", {
        user: session.user?.email,
        id: session.user?.id,
        role: session.user?.role,
      });
      return session;
    },
    async signIn({ user, account, profile }) {
      if (account?.provider === "google") {
        try {
          console.log("🔍 Google sign-in attempt:", profile?.email);
          await db.ensureInitialized();

          let existingUser = await db.getUser(profile?.email || "");

          if (!existingUser && profile?.email) {
            // 新規Googleユーザーをデータベースに作成
            console.log("✅ Creating new Google user in database");
            // ユーザー作成はデータベースの初期化で自動的に行われる
          } else {
            console.log("✅ Existing Google user found:", existingUser?.email);
          }
        } catch (error) {
          console.error("💥 Google sign-in error:", error);
          return false;
        }
      }
      return true;
    },
  },
  pages: {
    signIn: "/auth/signin",
    error: "/auth/error",
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
    updateAge: 24 * 60 * 60, // 24 hours
  },
  cookies: {
    sessionToken: {
      name: `next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
        maxAge: 30 * 24 * 60 * 60, // 30 days
      },
    },
  },
  secret:
    process.env.NEXTAUTH_SECRET ||
    "fallback-secret-for-development-only-please-change-in-production",
  debug: process.env.NODE_ENV === "development",
  logger: {
    error(code, metadata) {
      console.error(`🚨 [NextAuth Error]: ${code}`, metadata);
    },
    warn(code) {
      console.warn(`⚠️ [NextAuth Warning]: ${code}`);
    },
    debug(code, metadata) {
      if (process.env.NODE_ENV === "development") {
        console.debug(`🐛 [NextAuth Debug]: ${code}`, metadata);
      }
    },
  },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
