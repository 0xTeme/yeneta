import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { db } from "@/lib/db";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      profileComplete: boolean;
    };
  }
  interface User {
    id: string;
    profileComplete: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    profileComplete: boolean;
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code"
        }
      }
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET,
  callbacks: {
    async jwt({ token }) {
      if (token.email) {
        try {
          const dbUser = await db.user.findUnique({ where: { email: token.email } });
          if (dbUser) {
            token.id = dbUser.id;
            token.profileComplete = !!(dbUser.role && dbUser.level && dbUser.gender);
          } else {
            token.profileComplete = false;
          }
        } catch (error) {
          console.error("NextAuth DB fetch error:", error);
          token.profileComplete = true; 
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id ?? "";
        session.user.profileComplete = token.profileComplete;
      }
      return session;
    },
  },
};