import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { prisma } from "@/lib/prisma";
import { SignJWT } from "jose";
import { cookies } from "next/headers";
import { getJwtSecret } from "@/lib/jwt-secret";

async function generateUniqueReferralCode() {
  while (true) {
    const generated = `MIVO${Math.random()
      .toString(36)
      .substring(2, 8)
      .toUpperCase()}`;

    const existingUser =
      await prisma.user.findUnique({
        where: {
          referralCode: generated,
        },

        select: {
          id: true,
        },
      });

    if (!existingUser) {
      return generated;
    }
  }
}

export const { handlers, signIn, signOut, auth } =
  NextAuth({
    providers: [
      Google({
        clientId:
          process.env.GOOGLE_CLIENT_ID!,
        clientSecret:
          process.env.GOOGLE_CLIENT_SECRET!,
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

        try {
          const email =
            user.email.trim().toLowerCase();

          const cookieStore =
            await cookies();

          const savedReferralCode =
            cookieStore
              .get("mivo_referral")
              ?.value?.trim()
              .toUpperCase() || "";

          let dbUser =
            await prisma.user.findUnique({
              where: {
                email,
              },
            });

          // --------------------------------
          // NEW GOOGLE USER
          // --------------------------------

          if (!dbUser) {
            let referrer: {
              id: string;
            } | null = null;

            if (savedReferralCode) {
              referrer =
                await prisma.user.findUnique({
                  where: {
                    referralCode:
                      savedReferralCode,
                  },

                  select: {
                    id: true,
                  },
                });
            }

            const newReferralCode =
              await generateUniqueReferralCode();

            dbUser =
              await prisma.user.create({
                data: {
                  name:
                    user.name ||
                    "Mivo Trader",

                  email,

                  // Google accounts do not
                  // initially need a password.
                  password: null,

                  authProvider:
                    "GOOGLE",

                  googleId:
                    account.providerAccountId,

                  // Google has already
                  // verified ownership
                  // of this email address.
                  emailVerified: true,

                  // No Mivo verification
                  // token is required.
                  emailVerificationToken:
                    null,

                  emailVerificationExpiresAt:
                    null,

                  referralCode:
                    newReferralCode,

                  referredById:
                    referrer?.id ?? null,
                },
              });
          } else {
            // --------------------------------
            // EXISTING USER USING GOOGLE
            // --------------------------------

            const updateData: {
              authProvider?: string;
              googleId?: string;
              referralCode?: string;
              emailVerified?: boolean;
              emailVerificationToken?:
                string | null;
              emailVerificationExpiresAt?:
                Date | null;
            } = {};

            if (
              dbUser.authProvider !==
              "GOOGLE"
            ) {
              updateData.authProvider =
                "GOOGLE";
            }

            if (!dbUser.googleId) {
              updateData.googleId =
                account.providerAccountId;
            }

            if (!dbUser.referralCode) {
              updateData.referralCode =
                await generateUniqueReferralCode();
            }

            // Successful Google authentication
            // verifies ownership of the email.
            if (!dbUser.emailVerified) {
              updateData.emailVerified =
                true;

              updateData.emailVerificationToken =
                null;

              updateData.emailVerificationExpiresAt =
                null;
            }

            if (
              Object.keys(updateData)
                .length > 0
            ) {
              dbUser =
                await prisma.user.update({
                  where: {
                    id: dbUser.id,
                  },

                  data: updateData,
                });
            }
          }

          // --------------------------------
          // CLEAR REFERRAL COOKIE
          // --------------------------------

          cookieStore.set(
            "mivo_referral",
            "",
            {
              path: "/",
              maxAge: 0,
              sameSite: "lax",

              secure:
                process.env.NODE_ENV ===
                "production",
            }
          );

          // --------------------------------
          // CREATE MIVO LOGIN TOKEN
          // --------------------------------

          const token =
            await new SignJWT({
              userId: dbUser.id,
              email: dbUser.email,
              role: dbUser.role,
            })
              .setProtectedHeader({
                alg: "HS256",
              })
              .setIssuedAt()
              .setExpirationTime("7d")
              .sign(new TextEncoder().encode(getJwtSecret()));

          cookieStore.set(
            "token",
            token,
            {
              httpOnly: true,

              secure:
                process.env.NODE_ENV ===
                "production",

              sameSite: "lax",

              path: "/",

              maxAge:
                60 * 60 * 24 * 7,
            }
          );

          return true;
        } catch (error) {
          console.error(
            "GOOGLE AUTH ERROR:",
            error
          );

          return false;
        }
      },

      async redirect({ baseUrl }) {
        return `${baseUrl}/dashboard`;
      },
    },
  });
