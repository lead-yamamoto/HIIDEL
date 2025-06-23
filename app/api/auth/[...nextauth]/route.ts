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

    // 初期データをファイルに保存
    try {
      await fs.writeFile(
        USERS_DATA_FILE_PATH,
        JSON.stringify(initialData, null, 2)
      );
    } catch (writeError) {
      console.error("初期ユーザーデータの保存に失敗:", writeError);
    }

    return initialData;
  }
}

// ユーザーを保存
async function saveUsers(users: any[]): Promise<void> {
  try {
    await fs.mkdir(path.dirname(USERS_DATA_FILE_PATH), { recursive: true });
    await fs.writeFile(USERS_DATA_FILE_PATH, JSON.stringify(users, null, 2));
  } catch (error) {
    console.error("ユーザーデータの保存に失敗:", error);
  }
}

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
        console.log("🔍 Loading users for authentication...");
        const users = await loadUsers();
        const user = users.find(
          (u) => u.email.toLowerCase() === credentials.email.toLowerCase()
        );

        if (!user) {
          console.log("❌ User not found:", credentials.email);
          return null;
        }

        if (!user.isActive) {
          console.log("❌ User account is inactive:", credentials.email);
          return null;
        }

        const isPasswordValid = await compare(
          credentials.password,
          user.password
        );

        if (!isPasswordValid) {
          console.log("❌ Invalid password for user:", credentials.email);
          return null;
        }

        console.log("✅ User authenticated successfully:", user.email);

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          companyName: user.companyName,
          stores: user.stores || [],
        };
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
      if (user) {
        console.log("👤 Adding user to token:", user.email);
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
      if (account?.provider === "google") {
        try {
          console.log("🔍 Google sign-in attempt:", profile?.email);
          const users = await loadUsers();
          let existingUser = users.find(
            (u) => u.email.toLowerCase() === profile?.email?.toLowerCase()
          );

          if (!existingUser) {
            // 新規Googleユーザーを作成
            const newUser = {
              id: Date.now().toString(),
              email: profile?.email || "",
              name: profile?.name || "",
              role: "owner",
              companyName: "",
              phoneNumber: "",
              createdAt: new Date().toISOString(),
              isActive: true,
              subscription: {
                plan: "trial",
                startDate: new Date().toISOString(),
                endDate: new Date(
                  Date.now() + 30 * 24 * 60 * 60 * 1000
                ).toISOString(),
              },
              stores: [],
              googleId: profile?.sub,
            };

            users.push(newUser);
            await saveUsers(users);
            console.log("✅ New Google user created:", newUser.email);
          } else {
            console.log("✅ Existing Google user found:", existingUser.email);
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
