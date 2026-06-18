import { NextResponse } from "next/server";

import { db } from "@/db";
import { workspaces } from "@/db/schema";

export async function GET() {
  const rows = await db.select().from(workspaces).limit(1);

  return NextResponse.json({
    ok: true,
    database: "connected",
    workspaceCountChecked: rows.length,
  });
}