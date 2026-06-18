import { redirect } from "next/navigation";

import { DashboardLoadError } from "@/components/dashboard/dashboard-load-error";
import { getDashboardContext } from "@/lib/dashboard-context";
import { getSessionErrorMessage } from "@/lib/session";
import { ensureDefaultWritingProfile } from "@/lib/workspace";

import { updateWritingStyleAction } from "./actions";

type StylePageProps = {
  searchParams?: Promise<{
    updated?: string;
    error?: string;
  }>;
};

export default async function WritingStylePage({ searchParams }: StylePageProps) {
  const { session, currentMembership, error } = await getDashboardContext();

  if (error) {
    return (
      <DashboardLoadError
        title="โหลดหน้าตั้งค่าสไตล์ไม่สำเร็จ"
        technicalMessage={getSessionErrorMessage(error)}
      />
    );
  }

  if (!session) {
    redirect("/login");
  }

  if (!currentMembership) {
    return <DashboardLoadError title="ไม่พบ Workspace" />;
  }

  let profile;

  try {
    profile = await ensureDefaultWritingProfile(currentMembership.workspaceId);
  } catch (profileError) {
    return (
      <DashboardLoadError
        title="โหลดสไตล์การเขียนไม่สำเร็จ"
        technicalMessage={getSessionErrorMessage(profileError)}
      />
    );
  }

  const params = await searchParams;
  const wasUpdated = params?.updated === "1";
  const saveError =
    params?.error === "save_failed" || params?.error === "session_failed";

  return (
    <div className="mx-auto max-w-5xl">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Writing Style</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
            ตั้งค่าสไตล์การเขียนหลักของเพจ เพื่อให้ AI เขียนโพสต์ออกมาใกล้เคียงแนวทางของคุณทุกครั้ง
          </p>
        </div>

        <div className="flex flex-col gap-3">
          {wasUpdated ? (
            <div className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
              บันทึกสไตล์การเขียนแล้ว
            </div>
          ) : null}

          {saveError ? (
            <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-100">
              บันทึกไม่สำเร็จ กรุณาลองใหม่อีกครั้ง
            </div>
          ) : null}
        </div>
      </div>

      <form
        action={updateWritingStyleAction}
        className="mt-8 grid gap-6 rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-xl"
      >
        <div className="grid gap-6 lg:grid-cols-2">
          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium text-slate-200">ชื่อสไตล์</span>
            <input
              name="name"
              defaultValue={profile.name}
              className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-blue-500"
              placeholder="เช่น สไตล์หลักของฉัน"
              required
            />
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium text-slate-200">
              จำนวนคำสูงสุด
            </span>
            <input
              name="maxWords"
              defaultValue={profile.maxWords}
              type="number"
              min={50}
              max={1000}
              className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-blue-500"
            />
            <span className="text-xs text-slate-500">
              แนะนำ 120–300 คำสำหรับ Facebook บนมือถือ
            </span>
          </label>
        </div>

        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium text-slate-200">โทนภาษา</span>
          <textarea
            name="tone"
            defaultValue={profile.tone ?? ""}
            rows={3}
            className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-blue-500"
            placeholder="เช่น เป็นกันเอง อ่านง่าย เหมือนเจ้าของเพจเล่าเอง"
          />
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium text-slate-200">กลุ่มเป้าหมาย</span>
          <textarea
            name="targetAudience"
            defaultValue={profile.targetAudience ?? ""}
            rows={3}
            className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-blue-500"
            placeholder="เช่น เจ้าของร้านค้า คนทำธุรกิจเล็ก ๆ ลูกค้าเพจ"
          />
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium text-slate-200">กติกาการเขียน</span>
          <textarea
            name="rules"
            defaultValue={profile.rules ?? ""}
            rows={5}
            className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-blue-500"
            placeholder="เช่น เขียนภาษาไทย ย่อหน้าสั้น อ่านง่าย ไม่ขายของแรง ไม่ใช้คำเกินจริง"
          />
        </label>

        <div className="grid gap-6 lg:grid-cols-2">
          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium text-slate-200">
              คำหรือวลีที่ชอบใช้
            </span>
            <textarea
              name="favoriteWords"
              defaultValue={profile.favoriteWords ?? ""}
              rows={4}
              className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-blue-500"
              placeholder="เช่น ลองเริ่มจาก, ค่อย ๆ ทำ, เอาไปปรับใช้ได้"
            />
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium text-slate-200">
              คำที่ไม่อยากให้ใช้
            </span>
            <textarea
              name="bannedWords"
              defaultValue={profile.bannedWords ?? ""}
              rows={4}
              className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-blue-500"
              placeholder="เช่น ปัง, รวยแน่นอน, การันตี, เปลี่ยนชีวิต"
            />
          </label>
        </div>

        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium text-slate-200">แนวทาง CTA / ตัวอย่าง CTA หลายแบบ</span>
          <textarea
            name="callToAction"
            defaultValue={profile.callToAction ?? ""}
            rows={6}
            className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-blue-500"
            placeholder={`เช่น
ปิดท้ายแบบนุ่ม ๆ ไม่ขายของแรง
- ชวนคอมเมนต์เล่าประสบการณ์
- ชวนลองนำไปปรับใช้
- ชวนทักมาคุยถ้าอยากได้ไอเดียเพิ่ม
- ชวนสังเกตปัญหาของร้านตัวเอง`}
          />
          <span className="text-xs leading-5 text-slate-500">
            แนะนำให้ใส่เป็นแนวทางหรือหลายตัวอย่าง ระบบจะให้ AI เลือก/ดัดแปลงให้เข้ากับแต่ละโพสต์ ไม่คัดลอกประโยคเดิมซ้ำทุกครั้ง
          </span>
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium text-slate-200">
            ตัวอย่างโพสต์เก่าที่อยากให้ AI เลียนแบบ
          </span>
          <textarea
            name="samplePosts"
            defaultValue={profile.samplePosts ?? ""}
            rows={8}
            className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-blue-500"
            placeholder="วางตัวอย่างโพสต์ที่คุณเคยเขียนเอง 1–3 โพสต์ เพื่อช่วยให้ AI จับสไตล์ได้ดีขึ้น"
          />
        </label>

        <div className="flex flex-col gap-3 border-t border-slate-800 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-500">
            ระบบจะใช้ค่านี้เป็นสไตล์เริ่มต้นตอนสร้างโพสต์ในขั้นถัดไป
          </p>

          <button className="rounded-xl bg-blue-500 px-6 py-3 font-semibold text-white transition hover:bg-blue-400">
            บันทึกสไตล์การเขียน
          </button>
        </div>
      </form>
    </div>
  );
}
