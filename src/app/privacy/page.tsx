import Link from "next/link";
import type { Metadata } from "next";

const appName = "AI Facebook Poster / iM Sticker Poster";
const appUrl = "https://im-sticker-poster.vercel.app";
const contactEmail = "manit.pong@gmail.com";

export const metadata: Metadata = {
  title: `นโยบายความเป็นส่วนตัว | ${appName}`,
  description: "Privacy policy for AI Facebook Poster / iM Sticker Poster",
};

export default function PrivacyPolicyPage() {
  return (
    <main className="min-h-screen bg-slate-950 px-6 py-12 text-slate-100">
      <article className="mx-auto max-w-3xl rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-2xl sm:p-10">
        <Link href="/" className="text-sm font-medium text-blue-300 hover:text-blue-200">
          ← กลับหน้าแรก
        </Link>

        <p className="mt-8 text-sm font-semibold uppercase tracking-[0.2em] text-blue-300">
          Privacy Policy
        </p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">
          นโยบายความเป็นส่วนตัว
        </h1>
        <p className="mt-4 text-sm text-slate-400">อัปเดตล่าสุด: 20 มิถุนายน 2026</p>

        <section className="mt-8 space-y-5 leading-8 text-slate-200">
          <p>
            นโยบายนี้อธิบายว่า {appName} เก็บ ใช้ และดูแลข้อมูลอย่างไร
            เมื่อผู้ใช้ใช้งานระบบช่วยสร้างและโพสต์คอนเทนต์ไปยัง Facebook Page
            ผ่านเว็บไซต์ {appUrl}
          </p>

          <h2 className="text-xl font-semibold text-white">ข้อมูลที่เราอาจเก็บ</h2>
          <ul className="list-disc space-y-2 pl-6">
            <li>ข้อมูลบัญชีผู้ใช้ เช่น อีเมล ชื่อบัญชี และข้อมูลสำหรับเข้าสู่ระบบ</li>
            <li>ข้อมูล Facebook Page ที่ผู้ใช้เชื่อมต่อ เช่น Page ID, Page name และ Page access token</li>
            <li>หัวข้อโพสต์ ข้อความโพสต์ สไตล์การเขียน รูปแบบการตั้งเวลา และประวัติการโพสต์</li>
            <li>การตั้งค่า Auto Pilot, Topic Queue, Scheduler และสถานะการทำงานของระบบ</li>
            <li>ข้อมูลทางเทคนิค เช่น log การทำงานที่จำเป็นต่อการตรวจสอบข้อผิดพลาดและความปลอดภัย</li>
          </ul>

          <h2 className="text-xl font-semibold text-white">เราใช้ข้อมูลเพื่ออะไร</h2>
          <ul className="list-disc space-y-2 pl-6">
            <li>สร้างข้อความโพสต์ด้วย AI ตามหัวข้อและสไตล์ที่ผู้ใช้กำหนด</li>
            <li>บันทึก แก้ไข ตั้งเวลา และเผยแพร่โพสต์ไปยัง Facebook Page ที่ผู้ใช้เชื่อมต่อ</li>
            <li>แสดงประวัติการสร้างโพสต์ ประวัติการเผยแพร่ และสถานะ Auto Pilot</li>
            <li>ปรับปรุงความเสถียรของระบบ แก้ปัญหา และป้องกันการใช้งานที่ผิดปกติ</li>
          </ul>

          <h2 className="text-xl font-semibold text-white">การแชร์ข้อมูลกับบริการภายนอก</h2>
          <p>
            ระบบอาจส่งข้อมูลที่จำเป็นไปยังบริการภายนอกเพื่อให้ระบบทำงานได้ เช่น
            Meta/Facebook สำหรับการเผยแพร่โพสต์, Google Gemini สำหรับการสร้างข้อความด้วย AI,
            ผู้ให้บริการฐานข้อมูล โฮสติ้ง และอีเมลที่เกี่ยวข้องกับการทำงานของระบบ
            เราไม่ขายข้อมูลส่วนตัวของผู้ใช้ให้บุคคลภายนอก
          </p>

          <h2 className="text-xl font-semibold text-white">การดูแล Page access token</h2>
          <p>
            Page access token ใช้เพื่อให้ระบบเผยแพร่โพสต์ไปยัง Facebook Page ตามคำสั่งของผู้ใช้เท่านั้น
            ผู้ใช้สามารถยกเลิกการเชื่อมต่อแอปหรือเปลี่ยน token ได้จากระบบของเราและจากการตั้งค่าในบัญชี Meta/Facebook
          </p>

          <h2 className="text-xl font-semibold text-white">การลบข้อมูล</h2>
          <p>
            ผู้ใช้สามารถขอให้ลบข้อมูลที่เกี่ยวข้องกับบัญชีได้ โดยดูขั้นตอนที่หน้า
            <Link href="/data-deletion" className="ml-1 text-blue-300 hover:text-blue-200">
              คำแนะนำการลบข้อมูลผู้ใช้
            </Link>
          </p>

          <h2 className="text-xl font-semibold text-white">การติดต่อ</h2>
          <p>
            หากมีคำถามเกี่ยวกับนโยบายความเป็นส่วนตัวนี้ ติดต่อผู้ดูแลระบบได้ที่{" "}
            <a href={`mailto:${contactEmail}`} className="text-blue-300 hover:text-blue-200">
              {contactEmail}
            </a>
          </p>
        </section>
      </article>
    </main>
  );
}
