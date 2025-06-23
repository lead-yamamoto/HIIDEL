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
      console.log("🔍 [NextAuth] authorize called with:", credentials?.email);

      if (!credentials?.email || !credentials?.password) {
        console.log("❌ [NextAuth] Missing credentials");
        return null;
      }

      try {
        console.log("🔍 [NextAuth] Authenticating user with Redis database...");
        await db.ensureInitialized();

        const user = await db.getUser(credentials.email);
        console.log(
          "🔍 [NextAuth] User from database:",
          user ? { id: user.id, email: user.email } : null
        );

        if (!user) {
          console.log("❌ [NextAuth] User not found:", credentials.email);
          return null;
        }

        // パスワード検証（デモユーザーの場合は固定パスワード）
        if (
          credentials.email === "demo@hiidel.com" &&
          credentials.password === "demo123"
        ) {
          console.log("✅ [NextAuth] Demo user authenticated successfully");
          const authUser = {
            id: user.id, // データベースからの固定ID
            email: user.email,
            name: user.name,
            role: user.role,
            companyName: user.companyName,
          };
          console.log("✅ [NextAuth] Returning auth user:", authUser);
          return authUser;
        }

        console.log(
          "❌ [NextAuth] Invalid password for user:",
          credentials.email
        );
        return null;
      } catch (error) {
        console.error("💥 [NextAuth] Authentication error:", error);
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
      console.log("🔍 [NextAuth] Token before modification:", {
        sub: token.sub,
        id: token.id,
        email: token.email,
        hasUser: !!user,
      });

      if (user) {
        console.log("👤 [NextAuth] Adding user to token:", {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        });

        // カスタムIDを使用（NextAuth.jsが自動生成するIDを上書き）
        token.sub = user.id; // NextAuth.jsの標準フィールド
        token.id = user.id; // カスタムフィールド
        token.email = user.email;
        token.name = user.name;
        token.role = user.role;
        token.companyName = user.companyName;
      }

      if (account?.provider === "google") {
        console.log("🔍 [NextAuth] Google account detected, saving tokens");
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
            console.log("✅ [NextAuth] Google tokens saved to database");
          } catch (error) {
            console.error("❌ [NextAuth] Error saving Google tokens:", error);
          }
        }
      }

      console.log("🔍 [NextAuth] Token after modification:", {
        sub: token.sub,
        id: token.id,
        email: token.email,
        role: token.role,
      });
      return token;
    },
    async session({ session, token }) {
      console.log("📝 [NextAuth] session callback called");
      console.log("🔍 [NextAuth] Token in session callback:", {
        sub: token.sub,
        id: token.id,
        email: token.email,
        role: token.role,
      });

      if (session.user && token) {
        console.log("👤 [NextAuth] Adding token data to session");
        // NextAuth.jsの標準フィールド（token.sub）を使用
        session.user.id = token.sub!;
        session.user.email = token.email as string;
        session.user.name = token.name as string;
        session.user.role = token.role as string;
        session.user.companyName = token.companyName as string;
        session.accessToken = token.accessToken as string;
      }

      console.log("✨ [NextAuth] Final session:", {
        user: session.user
          ? {
              id: session.user.id,
              email: session.user.email,
              name: session.user.name,
              role: session.user.role,
            }
          : null,
        hasAccessToken: !!session.accessToken,
      });
      return session;
    },
    async signIn({ user, account, profile }) {
      console.log("🔐 [NextAuth] signIn callback called");
      console.log("🔍 [NextAuth] SignIn data:", {
        provider: account?.provider,
        userEmail: user?.email,
        profileEmail: profile?.email,
      });

      if (account?.provider === "google") {
        try {
          console.log("🔍 [NextAuth] Google sign-in attempt:", profile?.email);
          await db.ensureInitialized();

          let existingUser = await db.getUser(profile?.email || "");

          if (!existingUser && profile?.email) {
            // 新規Googleユーザーをデータベースに作成
            console.log("✅ [NextAuth] Creating new Google user in database");
            // ユーザー作成はデータベースの初期化で自動的に行われる
          } else {
            console.log(
              "✅ [NextAuth] Existing Google user found:",
              existingUser?.email
            );
          }
        } catch (error) {
          console.error("💥 [NextAuth] Google sign-in error:", error);
          return false;
        }
      }

      console.log("✅ [NextAuth] SignIn approved");
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
  jwt: {
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  cookies: {
    sessionToken: {
      name:
        process.env.NODE_ENV === "production"
          ? "__Secure-next-auth.session-token"
          : "next-auth.session-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
        maxAge: 30 * 24 * 60 * 60, // 30 days
      },
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: true, // 開発環境でのデバッグを有効化
  logger: {
    error(code, metadata) {
      console.error(`🚨 [NextAuth Error]: ${code}`, metadata);
    },
    warn(code) {
      console.warn(`⚠️ [NextAuth Warning]: ${code}`);
    },
    debug(code, metadata) {
      console.debug(`🐛 [NextAuth Debug]: ${code}`, metadata);
    },
  },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
