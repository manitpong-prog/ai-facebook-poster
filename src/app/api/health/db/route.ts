import { NextResponse } from "next/server";

import { db } from "@/db";
import { workspaces } from "@/db/schema";

export async function GET() {
  try {
    const rows = await db.select().from(workspaces).limit(1);

    return NextResponse.json({
      ok: true,
      database: "connected",
      workspaceCountChecked: rows.length,
    });
  } catch (error) {
    console.error("Database health check failed:", error);

    return NextResponse.json(
      {
        ok: false,
        database: "disconnected",
        message:
          error instanceof Error
            ? error.message
            : "Unknown database connection error",
      },
      { status: 503 },
    );
  }
}
