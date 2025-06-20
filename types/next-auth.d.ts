import { DefaultSession, DefaultUser } from "next-auth";
import { JWT, DefaultJWT } from "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: string;
      companyName?: string;
      stores?: any[];
    } & DefaultSession["user"];
    accessToken?: string;
  }

  interface User extends DefaultUser {
    role: string;
    companyName?: string;
    stores?: any[];
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    role: string;
    accessToken?: string;
    refreshToken?: string;
    companyName?: string;
    stores?: any[];
  }
}
