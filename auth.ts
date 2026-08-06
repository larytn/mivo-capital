import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { prisma } from "@/lib/prisma";
import { SignJWT } from "jose";
import { cookies } from "next/headers";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "mivo-secret-key"
);

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],

  callbacks: {
    async signIn({ user, account }) {
      if (
        account?.provider !== "google" ||
        !user.email
      ) {
        return false;
      }

      const email = user.email.toLowerCase();

      let dbUser = await prisma.user.findUnique({
        where: {
          email,
        },
      });

      if (!dbUser) {
        dbUser = await prisma.user.create({
          data: {
            name: user.name || "Mivo Trader",
            email,
            password: null,
            authProvider: "GOOGLE",
          },
        });
      } else if (dbUser.authProvider !== "GOOGLE") {
        dbUser = await prisma.user.update({
          where: {
            id: dbUser.id,
          },
          data: {
            authProvider: "GOOGLE",
          },
        });
      }

      const token = await new SignJWT({
        userId: dbUser.id,
        email: dbUser.email,
        role: dbUser.role,
      })
        .setProtectedHeader({
          alg: "HS256",
        })
        .setIssuedAt()
        .setExpirationTime("7d")
        .sign(JWT_SECRET);

      const cookieStore = await cookies();

      cookieStore.set("token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 7,
      });

      return true;
    },

    async redirect({ baseUrl }) {
      return `${baseUrl}/dashboard`;
    },
  },
});