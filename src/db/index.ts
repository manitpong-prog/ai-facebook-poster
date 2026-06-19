import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";

import * as schema from "./schema";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is not set");
}

declare global {
  // Keep one local dev connection client across hot reloads.
  // This avoids creating many short-lived clients when Next.js reloads files.
  var postgresClient: ReturnType<typeof postgres> | undefined;
}

const client =
  globalThis.postgresClient ??
  postgres(databaseUrl, {
    connect_timeout: 20,
    idle_timeout: 20,
    max: 1,
    prepare: false,
    ssl: "require",
  });

if (process.env.NODE_ENV !== "production") {
  globalThis.postgresClient = client;
}

export const db = drizzle(client, { schema });
