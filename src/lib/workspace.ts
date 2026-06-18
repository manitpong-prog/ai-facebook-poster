import { eq } from "drizzle-orm";

import { db } from "@/db";
import { workspaceMembers, workspaces, writingProfiles } from "@/db/schema";

type WorkspaceUser = {
  id: string;
  name?: string | null;
  email?: string | null;
};

function createWorkspaceSlug(userId: string) {
  return `workspace-${userId.slice(0, 12).toLowerCase()}`;
}

function createWorkspaceName(user: WorkspaceUser) {
  if (user.name?.trim()) {
    return `${user.name.trim()}'s Workspace`;
  }

  if (user.email?.trim()) {
    return `${user.email.split("@")[0]}'s Workspace`;
  }

  return "My Workspace";
}

async function createDefaultWritingProfile(workspaceId: string) {
  await db.insert(writingProfiles).values({
    workspaceId,
    name: "สไตล์หลักของฉัน",
    tone: "เป็นกันเอง อ่านง่าย เหมือนเจ้าของเพจเล่าเอง",
    targetAudience: "เจ้าของธุรกิจ เจ้าของเพจ และคนที่สนใจเนื้อหาของเพจ",
    rules:
      "เขียนภาษาไทย ย่อหน้าสั้น อ่านง่ายบนมือถือ ไม่ขายของแรง ไม่ใช้คำเกินจริง ความยาวไม่เกิน 300 คำ",
    favoriteWords: "ลองเริ่มจาก, ค่อย ๆ ทำ, เอาไปปรับใช้ได้",
    bannedWords: "ปัง, รวยแน่นอน, การันตี, เปลี่ยนชีวิต",
    callToAction: "ถ้าสนใจ ลองทักมาคุยกันได้ครับ",
    samplePosts: "",
    maxWords: 300,
    isDefault: true,
  });
}

export async function ensureDefaultWorkspace(user: WorkspaceUser) {
  const existingMemberships = await db
    .select({
      workspaceId: workspaceMembers.workspaceId,
      role: workspaceMembers.role,
      workspaceName: workspaces.name,
    })
    .from(workspaceMembers)
    .innerJoin(workspaces, eq(workspaceMembers.workspaceId, workspaces.id))
    .where(eq(workspaceMembers.userId, user.id))
    .limit(1);

  const existingMembership = existingMemberships[0];

  if (existingMembership) {
    return existingMembership;
  }

  const [workspace] = await db
    .insert(workspaces)
    .values({
      ownerUserId: user.id,
      name: createWorkspaceName(user),
      slug: createWorkspaceSlug(user.id),
    })
    .returning({
      id: workspaces.id,
      name: workspaces.name,
    });

  if (!workspace) {
    throw new Error("Failed to create default workspace");
  }

  await db.insert(workspaceMembers).values({
    workspaceId: workspace.id,
    userId: user.id,
    role: "owner",
  });

  await createDefaultWritingProfile(workspace.id);

  return {
    workspaceId: workspace.id,
    role: "owner" as const,
    workspaceName: workspace.name,
  };
}
