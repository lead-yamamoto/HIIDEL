import { NextAuthOptions } from "next-auth";
import NextAuth from "next-auth/next";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { promises as fs } from "fs";
import path from "path";

// データファイルのパス
const USERS_DATA_FILE_PATH = path.join(process.cwd(), "data", "users.json");

// ユーザーデータを読み込み
async function loadUsers(): Promise<any[]> {
  try {
    await fs.mkdir(path.dirname(USERS_DATA_FILE_PATH), { recursive: true });
    const data = await fs.readFile(USERS_DATA_FILE_PATH, "utf-8");
    return JSON.parse(data);
  } catch (error) {
    // ファイルが存在しない場合は初期データを返す
    const initialData = [
      {
        id: "1",
        email: "demo@hiidel.com",
        password:
          "$2b$12$gNcrqlaAYEEYcLRz6UMN/.5tUPffhMDbw/celxuqRguIinUsUl/Mu", // "demo123"
        name: "デモユーザー",
        role: "owner",
        companyName: "デモ株式会社",
        phoneNumber: "03-1234-5678",
        createdAt: "2024-01-01T00:00:00.000Z",
        isActive: true,
        subscription: {
          plan: "trial",
          startDate: "2024-01-01T00:00:00.000Z",
          endDate: "2024-01-31T00:00:00.000Z",
        },
        stores: [],
      },
    ];
    return initialData;
  }
}

// プロバイダー配列を動的に構築
const providers: any[] = [
  CredentialsProvider({
    name: "credentials",
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Password", type: "password" },
    },
    async authorize(credentials) {
      console.log("🔐 [NextAuth] authorize function called");
      console.log("📧 Email:", credentials?.email);
      console.log("🔑 Password provided:", !!credentials?.password);

      if (!credentials?.email || !credentials?.password) {
        console.log("❌ Missing credentials");
        return null;
      }

      try {
        // ファイルからユーザーデータを読み込み
        const users = await loadUsers();
        console.log("👥 Loaded users count:", users.length);

        console.log("👤 Looking for user:", credentials.email);

        const user = users.find((u) => u.email === credentials.email);

        if (user) {
          console.log("✅ User found:", user.email);
          console.log("🔍 Checking password...");

          const isPasswordValid = await compare(
            credentials.password,
            user.password
          );

          console.log("🔐 Password valid:", isPasswordValid);

          if (isPasswordValid) {
            console.log("🎉 Login successful for user:", user.email);
            const userResponse = {
              id: user.id,
              email: user.email,
              name: user.name,
              role: user.role,
              companyName: user.companyName,
            };
            console.log("📤 Returning user:", userResponse);
            return userResponse;
          } else {
            console.log("❌ Invalid password for user:", user.email);
          }
        } else {
          console.log("❌ User not found:", credentials.email);
        }

        return null;
      } catch (error) {
        console.error("💥 Auth error:", error);
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

const authOptions: NextAuthOptions = {
  providers,
  callbacks: {
    async jwt({ token, user, account }) {
      console.log("🔑 [NextAuth] jwt callback called");
      if (user) {
        console.log("👤 Adding user to token:", user);
        token.role = user.role;
        token.companyName = user.companyName;
        token.stores = user.stores || [];
      }

      if (account?.provider === "google") {
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
      }

      return token;
    },
    async session({ session, token }) {
      console.log("📝 [NextAuth] session callback called");
      if (session.user) {
        console.log("👤 Adding token data to session");
        session.user.id = token.sub!;
        session.user.role = token.role as string;
        session.user.companyName = token.companyName as string;
        session.user.stores = token.stores as any[];
        session.accessToken = token.accessToken as string;
      }
      console.log("✨ Final session:", {
        user: session.user?.email,
        role: session.user?.role,
      });
      return session;
    },
    async signIn({ user, account, profile }) {
      console.log("🚪 [NextAuth] signIn callback called");
      console.log("👤 User:", user?.email);
      console.log("🔗 Account provider:", account?.provider);

      if (account?.provider === "google") {
        // Google認証時の処理
        // 実際の実装ではユーザーをデータベースに保存
        console.log("🔍 Google sign in:", { user, profile });
        return true;
      }

      console.log("✅ Sign in approved");
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
  },
  secret:
    process.env.NEXTAUTH_SECRET ||
    "fallback-secret-for-development-only-please-change-in-production",
  debug: true,
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
