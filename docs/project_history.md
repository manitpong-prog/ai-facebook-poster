# AI Facebook Poster - Project History

## Project Overview
AI Facebook Poster เป็นระบบช่วยสร้างโพสต์ Facebook โดยใช้ AI ช่วยสร้างเนื้อหา แต่ผู้ใช้เป็นผู้ตรวจสอบและกดโพสต์เอง

## Development History
- Auto Facebook Poster
- Auto Pilot (Cron)
- Pantip Manual Post
- RSS News

## Pantip
ปัญหาสำคัญคือ Pantip ใช้ class display-post-story ทั้งกับโพสต์หลักและคอมเมนต์

แนวทางที่สำเร็จคือใช้ HTML-first Main Story Extractor โดยดึงจาก

display-post-status-leftside -> display-post-story-wrapper -> display-post-story

ทำให้ดึงข้อความกระทู้หลักได้ถูกต้องและไม่ดึงคอมเมนต์

## Caption Style
- ภาษาคน
- เหมือนเล่าให้เพื่อนฟัง
- ใส่เครดิตและลิงก์ต้นทาง

## 2026-07-13 — Gemini API Key settings in Dashboard

### Goal
เพิ่มหน้าตั้งค่า Gemini API Key ภายในระบบ เพื่อให้เจ้าของระบบเปลี่ยนคีย์ได้จากหน้าเว็บโดยไม่ต้องเข้า Vercel และไม่ต้อง Redeploy ทุกครั้ง พร้อมรองรับการแสดงคีย์เต็มสำหรับระบบปิดที่เจ้าของใช้งานคนเดียว

### New behavior
- เพิ่มหน้า `/dashboard/settings/ai`
- แสดงแหล่งคีย์ที่กำลังใช้งานว่าเป็นคีย์จาก Workspace หรือ `GEMINI_API_KEY` บนเซิร์ฟเวอร์
- แสดงคีย์แบบย่อ และสามารถกดแสดง/ซ่อน/คัดลอกคีย์เต็มได้
- วางคีย์ใหม่แล้วเลือกได้ระหว่าง:
  - ทดสอบกับ Gemini ก่อนแล้วบันทึก
  - บันทึกโดยไม่ทดสอบ
- เปลี่ยน Gemini model จากหน้าเดียวกันได้
- ลบคีย์ที่บันทึกผ่านหน้าเว็บเพื่อกลับไปใช้ `GEMINI_API_KEY` จาก Vercel/.env.local ได้
- คีย์ใหม่เริ่มใช้งานทันทีโดยไม่ต้อง Redeploy

### Security design
- คีย์แยกตาม Workspace
- เข้ารหัสด้วย AES-256-GCM ก่อนบันทึกใน PostgreSQL
- ใช้ `APP_ENCRYPTION_KEY` ขนาด 32 bytes จาก Environment Variable เป็น master key
- ใช้ Workspace ID เป็น Additional Authenticated Data เพื่อป้องกันการสลับ ciphertext ระหว่าง Workspace
- เก็บเฉพาะ ciphertext, IV, authentication tag และตัวอักษรท้าย 4 ตัว
- หน้าเว็บปกติไม่รับคีย์เต็มกลับมา ยกเว้นผู้ใช้กด “แสดงคีย์เต็ม” หลังล็อกอิน
- จำกัดการเปลี่ยนแปลงการตั้งค่าไว้ที่ role `owner` และ `admin`

### Gemini key resolution order
1. คีย์ที่เข้ารหัสไว้ใน `workspace_ai_settings`
2. `GEMINI_API_KEY` จาก Vercel หรือ `.env.local`
3. ถ้าไม่มีทั้งสองแหล่ง ระบบแจ้งว่ายังไม่ได้ตั้งค่า Gemini API Key

### Database
เพิ่ม migration:

```text
drizzle/0006_loose_xorn.sql
```

เพิ่มตาราง:

```text
workspace_ai_settings
```

ข้อมูลสำคัญในตาราง:
- `workspace_id`
- `model`
- `api_key_encrypted`
- `api_key_iv`
- `api_key_auth_tag`
- `api_key_last_four`
- `encryption_version`
- `last_tested_at`
- `updated_by_user_id`

### Environment Variables
เพิ่มตัวแปรที่ต้องตั้งหนึ่งครั้ง:

```text
APP_ENCRYPTION_KEY
```

สร้างค่าได้ด้วย:

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

`GEMINI_API_KEY` เปลี่ยนเป็นคีย์สำรอง ไม่บังคับเมื่อมีคีย์ในหน้า AI Settings แล้ว

### Integration changes
- Manual post generation ใช้ Workspace key
- Topic Queue / Auto Writer ใช้ Workspace key
- Auto Pilot และ Cron ใช้ Workspace key
- Pantip preview ใช้ Workspace key
- News preview ใช้ Workspace key
- Dashboard, Auto Pilot Diagnostics และ Deploy Readiness แสดงสถานะจากระบบคีย์ใหม่

### Files added
- `src/lib/encryption.ts`
- `src/lib/ai/settings.ts`
- `src/app/dashboard/settings/ai/page.tsx`
- `src/app/dashboard/settings/ai/actions.ts`
- `src/components/settings/api-key-display.tsx`
- `drizzle/0006_loose_xorn.sql`
- `drizzle/meta/0006_snapshot.json`

### Files updated
- `src/db/schema.ts`
- `src/lib/ai/gemini.ts`
- `src/lib/topic-auto-writer.ts`
- `src/app/api/pantip/preview/route.ts`
- `src/app/api/news/preview/route.ts`
- `src/app/dashboard/posts/[postId]/actions.ts`
- `src/app/dashboard/page.tsx`
- `src/app/dashboard/autopilot/page.tsx`
- `src/app/dashboard/deploy/page.tsx`
- `src/components/dashboard/dashboard-nav.tsx`
- `.env.vercel.example`
- `README.md`
- `docs/deploy-vercel.md`
- `docs/project_history.md`

### Required deployment steps
1. รัน `npm run db:migrate` กับฐานข้อมูล Neon ที่ Production ใช้
2. เพิ่ม `APP_ENCRYPTION_KEY` ใน Vercel
3. Redeploy หนึ่งครั้ง
4. เปิด `/dashboard/settings/ai`
5. วางคีย์ Gemini แล้วกด “ทดสอบและบันทึก”
6. หลังจากนั้นเปลี่ยนคีย์จากหน้าเว็บได้ทันทีโดยไม่ต้อง Redeploy
