import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";

import { db } from "@/db";
import * as schema from "@/db/schema";
import { sendPasswordResetEmail } from "@/lib/password-reset-email";
import { ensureDefaultWorkspace } from "@/lib/workspace";

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL ?? "http://localhost:3000",

  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
  }),

  emailAndPassword: {
    enabled: true,
    autoSignIn: true,
    revokeSessionsOnPasswordReset: true,
    resetPasswordTokenExpiresIn: 60 * 60,
    sendResetPassword: async ({ user, url }) => {
      await sendPasswordResetEmail({
        to: user.email,
        userName: user.name,
        resetUrl: url,
      });
    },
    onPasswordReset: async ({ user }) => {
      console.log(`Password reset completed for ${user.email}`);
    },
  },

  trustedOrigins: [process.env.BETTER_AUTH_URL ?? "http://localhost:3000"],

  databaseHooks: {
    user: {
      create: {
        after: async (createdUser) => {
          try {
            await ensureDefaultWorkspace(createdUser);
          } catch (error) {
            console.error("Failed to create initial workspace:", error);
          }
        },
      },
    },
  },

  plugins: [nextCookies()],
});
