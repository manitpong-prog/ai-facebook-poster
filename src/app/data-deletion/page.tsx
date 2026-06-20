import Link from "next/link";
import type { Metadata } from "next";

const appName = "AI Facebook Poster / iM Sticker Poster";
const contactEmail = "manit.pong@gmail.com";

export const metadata: Metadata = {
  title: `คำแนะนำการลบข้อมูลผู้ใช้ | ${appName}`,
  description: "User data deletion instructions for AI Facebook Poster / iM Sticker Poster",
};

export default function DataDeletionPage() {
  return (
    <main className="min-h-screen bg-slate-950 px-6 py-12 text-slate-100">
      <article className="mx-auto max-w-3xl rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-2xl sm:p-10">
        <Link href="/" className="text-sm font-medium text-blue-300 hover:text-blue-200">
          ← กลับหน้าแรก
        </Link>

        <p className="mt-8 text-sm font-semibold uppercase tracking-[0.2em] text-blue-300">
          Data Deletion Instructions
        </p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">
          คำแนะนำการลบข้อมูลผู้ใช้
        </h1>
        <p className="mt-4 text-sm text-slate-400">อัปเดตล่าสุด: 20 มิถุนายน 2026</p>

        <section className="mt-8 space-y-5 leading-8 text-slate-200">
          <p>
            ผู้ใช้สามารถขอลบข้อมูลที่เกี่ยวข้องกับการใช้งาน {appName}
            ได้ตามขั้นตอนด้านล่างนี้
          </p>

          <h2 className="text-xl font-semibold text-white">วิธีขอลบข้อมูลจากระบบ</h2>
          <ol className="list-decimal space-y-2 pl-6">
            <li>
              ส่งอีเมลไปที่{" "}
              <a href={`mailto:${contactEmail}`} className="text-blue-300 hover:text-blue-200">
                {contactEmail}
              </a>
            </li>
            <li>ใส่หัวข้ออีเมลว่า: Request to Delete My Data</li>
            <li>ระบุอีเมลบัญชีที่ใช้สมัครในระบบ</li>
            <li>ระบุชื่อ Facebook Page หรือ Page ID ที่เชื่อมต่อกับระบบ ถ้ามี</li>
            <li>ผู้ดูแลระบบจะตรวจสอบและดำเนินการลบข้อมูลที่เกี่ยวข้องภายในระยะเวลาที่เหมาะสม</li>
          </ol>

          <h2 className="text-xl font-semibold text-white">ข้อมูลที่อาจถูกลบ</h2>
          <ul className="list-disc space-y-2 pl-6">
            <li>บัญชีผู้ใช้และข้อมูลอีเมลที่เกี่ยวข้อง</li>
            <li>ข้อมูล Facebook Page และ Page access token ที่บันทึกไว้ในระบบ</li>
            <li>หัวข้อโพสต์ Topic Queue และการตั้งค่า Auto Pilot</li>
            <li>โพสต์ที่สร้างไว้ในระบบ ประวัติการตั้งเวลา และ log การเผยแพร่ที่เกี่ยวข้องกับบัญชี</li>
          </ul>

          <h2 className="text-xl font-semibold text-white">การยกเลิกการเชื่อมต่อจาก Facebook</h2>
          <p>
            นอกจากการขอลบข้อมูลจากระบบนี้ ผู้ใช้สามารถไปที่การตั้งค่า Facebook/Meta ของตนเอง
            เพื่อลบหรือยกเลิกการเชื่อมต่อแอปที่เกี่ยวข้องได้เช่นกัน
            การยกเลิกจากฝั่ง Facebook อาจทำให้ระบบไม่สามารถโพสต์ไปยังเพจได้อีกจนกว่าจะเชื่อมต่อใหม่
          </p>

          <h2 className="text-xl font-semibold text-white">หมายเหตุ</h2>
          <p>
            ข้อมูลบางประเภทอาจถูกเก็บไว้ชั่วคราวในระบบสำรองข้อมูลหรือ log ทางเทคนิคตามความจำเป็นด้านความปลอดภัย
            และจะถูกลบหรือหมดอายุตามรอบการดูแลระบบ
          </p>

          <h2 className="text-xl font-semibold text-white">ลิงก์ที่เกี่ยวข้อง</h2>
          <ul className="list-disc space-y-2 pl-6">
            <li>
              <Link href="/privacy" className="text-blue-300 hover:text-blue-200">
                นโยบายความเป็นส่วนตัว
              </Link>
            </li>
            <li>
              <Link href="/terms" className="text-blue-300 hover:text-blue-200">
                ข้อกำหนดการใช้บริการ
              </Link>
            </li>
          </ul>
        </section>
      </article>
    </main>
  );
}
