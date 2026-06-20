import Link from "next/link";
import type { Metadata } from "next";

const appName = "AI Facebook Poster / iM Sticker Poster";
const appUrl = "https://im-sticker-poster.vercel.app";
const contactEmail = "manit.pong@gmail.com";

export const metadata: Metadata = {
  title: `ข้อกำหนดการใช้บริการ | ${appName}`,
  description: "Terms of service for AI Facebook Poster / iM Sticker Poster",
};

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-slate-950 px-6 py-12 text-slate-100">
      <article className="mx-auto max-w-3xl rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-2xl sm:p-10">
        <Link href="/" className="text-sm font-medium text-blue-300 hover:text-blue-200">
          ← กลับหน้าแรก
        </Link>

        <p className="mt-8 text-sm font-semibold uppercase tracking-[0.2em] text-blue-300">
          Terms of Service
        </p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">
          ข้อกำหนดการใช้บริการ
        </h1>
        <p className="mt-4 text-sm text-slate-400">อัปเดตล่าสุด: 20 มิถุนายน 2026</p>

        <section className="mt-8 space-y-5 leading-8 text-slate-200">
          <p>
            ข้อกำหนดนี้ใช้กับการใช้งาน {appName} ผ่านเว็บไซต์ {appUrl}
            ซึ่งเป็นระบบช่วยสร้าง จัดการ ตั้งเวลา และเผยแพร่โพสต์ไปยัง Facebook Page
          </p>

          <h2 className="text-xl font-semibold text-white">การใช้งานระบบ</h2>
          <ul className="list-disc space-y-2 pl-6">
            <li>ผู้ใช้ต้องเป็นเจ้าของหรือมีสิทธิ์จัดการ Facebook Page ที่นำมาเชื่อมต่อกับระบบ</li>
            <li>ผู้ใช้เป็นผู้รับผิดชอบต่อหัวข้อ ข้อความ รูปแบบคอนเทนต์ และโพสต์ที่เผยแพร่จากระบบ</li>
            <li>ผู้ใช้ต้องไม่ใช้ระบบเพื่อสร้างหรือเผยแพร่เนื้อหาที่ผิดกฎหมาย หลอกลวง ละเมิดสิทธิ์ หรือขัดต่อนโยบายของ Meta/Facebook</li>
            <li>ผู้ใช้ควรตรวจสอบความถูกต้องของเนื้อหาที่ AI สร้างขึ้นก่อนใช้งานจริง โดยเฉพาะข้อมูลราคา โปรโมชัน กฎหมาย สุขภาพ หรือข้อมูลที่อาจเปลี่ยนแปลงได้</li>
          </ul>

          <h2 className="text-xl font-semibold text-white">การเชื่อมต่อ Facebook Page</h2>
          <p>
            ระบบจะใช้ Page access token ที่ผู้ใช้กำหนดเพื่อเผยแพร่โพสต์ไปยังเพจตามคำสั่งของผู้ใช้
            หาก token หมดอายุ ถูกยกเลิก หรือสิทธิ์ของแอปเปลี่ยนแปลง ระบบอาจไม่สามารถโพสต์ได้จนกว่าจะเชื่อมต่อใหม่
          </p>

          <h2 className="text-xl font-semibold text-white">AI และความถูกต้องของเนื้อหา</h2>
          <p>
            ข้อความที่สร้างโดย AI อาจมีข้อผิดพลาดหรือไม่เหมาะกับทุกสถานการณ์
            ผู้ใช้ควรตรวจสอบเนื้อหาก่อนเผยแพร่ โดยเฉพาะเมื่อเปิดใช้โหมด Auto Publish
            ซึ่งระบบสามารถเผยแพร่โพสต์อัตโนมัติเมื่อถึงเวลาที่ตั้งไว้
          </p>

          <h2 className="text-xl font-semibold text-white">ข้อจำกัดความรับผิด</h2>
          <p>
            ระบบให้บริการตามสภาพการใช้งานจริง ผู้ดูแลระบบไม่รับประกันว่าระบบจะทำงานได้ตลอดเวลา
            หรือปราศจากข้อผิดพลาดทั้งหมด ผู้ใช้ควรสำรองข้อมูลสำคัญและติดตามผลการโพสต์บน Facebook Page ของตนเองเสมอ
          </p>

          <h2 className="text-xl font-semibold text-white">การเปลี่ยนแปลงบริการ</h2>
          <p>
            ผู้ดูแลระบบอาจปรับปรุง แก้ไข หยุดให้บริการบางส่วน หรือเปลี่ยนแปลงข้อกำหนดนี้ได้ตามความเหมาะสม
            หากมีการเปลี่ยนแปลงสำคัญจะพยายามแจ้งให้ผู้ใช้ทราบผ่านช่องทางที่เหมาะสม
          </p>

          <h2 className="text-xl font-semibold text-white">การติดต่อ</h2>
          <p>
            หากมีคำถามเกี่ยวกับข้อกำหนดการใช้บริการ ติดต่อผู้ดูแลระบบได้ที่{" "}
            <a href={`mailto:${contactEmail}`} className="text-blue-300 hover:text-blue-200">
              {contactEmail}
            </a>
          </p>
        </section>
      </article>
    </main>
  );
}
