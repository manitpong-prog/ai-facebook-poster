import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";

import { db } from "@/db";
import * as schema from "@/db/schema";
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
