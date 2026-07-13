# Deploy to Vercel Guide - AI Facebook Poster

คู่มือนี้ใช้สำหรับนำโปรเจกต์ `AI Facebook Poster` ขึ้น Vercel แบบ production โดยยังคงใช้ Neon Postgres, Better Auth, Gemini API, Facebook Page API และ Cron endpoint เดิม

> สถานะปัจจุบัน: ระบบพร้อม deploy ได้เมื่อคุณต้องการให้ Auto Pilot ทำงานเองแม้ปิดเครื่อง local แล้ว

## 1. สิ่งที่ต้องมีให้พร้อมก่อน deploy

ตรวจจากหน้าในระบบก่อน:

```text
/dashboard/deploy
```

ควรผ่านอย่างน้อย:

```text
- DATABASE_URL ตั้งค่าแล้ว
- BETTER_AUTH_SECRET ตั้งค่าแล้ว
- BETTER_AUTH_URL เป็นโดเมน production
- APP_ENCRYPTION_KEY ตั้งค่าแล้ว
- รัน migration `0006_loose_xorn.sql` แล้ว
- Gemini API Key ตั้งผ่าน `/dashboard/settings/ai` หรือมี `GEMINI_API_KEY` เป็นตัวสำรอง
- Facebook Page connected แล้ว
- Topic Queue มีหัวข้อ active ถ้าจะเปิด Auto Pilot
- CRON_SECRET ตั้งค่าแล้วก่อนใช้ production cron
```

## 2. Commit และ Push ด้วย GitHub Desktop

1. เปิด GitHub Desktop
2. ตรวจ changed files
3. Commit เช่น:

```text
Prepare Vercel deployment guide
```

4. กด Push origin

## 3. Import Project ใน Vercel

1. เข้า Vercel Dashboard
2. กด Add New → Project
3. เลือก GitHub repository `ai-facebook-poster`
4. Framework Preset: `Next.js`
5. Root Directory: ใช้ root ของโปรเจกต์
6. Build Command: ใช้ค่า default หรือ `npm run build`
7. Install Command: ใช้ค่า default หรือ `npm install`

อย่าเพิ่งเปิด Auto Pilot โหมด auto_publish จนกว่าจะทดสอบ production ผ่าน

## 4. Environment Variables ที่ต้องใส่ใน Vercel

ไปที่:

```text
Vercel Project → Settings → Environment Variables
```

ใส่ค่าเหล่านี้ใน Production environment:

```text
DATABASE_URL=postgresql://...
BETTER_AUTH_SECRET=สุ่มยาว ๆ อย่างน้อย 32 ตัวอักษร
BETTER_AUTH_URL=https://YOUR_DOMAIN
APP_ENCRYPTION_KEY=ค่าที่สุ่มแบบ 32 bytes base64
GEMINI_API_KEY=AIza...  # ไม่บังคับ ใช้เป็นตัวสำรอง
AI_PROVIDER=gemini
GEMINI_MODEL=gemini-3.1-flash-lite
CRON_SECRET=สุ่มยาว ๆ อย่างน้อย 32 ตัวอักษร
```

ถ้าใช้ model อื่นที่ทดสอบแล้วทำงานได้ เช่น `gemini-2.5-flash-lite` สามารถใช้ค่านั้นได้

สร้าง `APP_ENCRYPTION_KEY` บน Windows PowerShell หรือ Terminal ด้วยคำสั่งนี้:

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

คัดลอกผลลัพธ์ทั้งบรรทัดไปใส่ใน Vercel โดยห้ามเปลี่ยนค่านี้ภายหลังแบบตรง ๆ เพราะคีย์ Gemini ที่บันทึกไว้เดิมจะถอดรหัสไม่ได้

หลังเพิ่มหรือแก้ Environment Variable ต้อง Redeploy หนึ่งครั้ง จากนั้นการเปลี่ยน Gemini API Key ผ่าน `/dashboard/settings/ai` ไม่ต้อง Redeploy อีก

## 5. BETTER_AUTH_URL ต้องเป็น production domain

ตอน local ใช้:

```text
BETTER_AUTH_URL=http://localhost:3000
```

ตอนขึ้น Vercel ให้เปลี่ยนเป็น domain จริง เช่น:

```text
BETTER_AUTH_URL=https://ai-facebook-poster.vercel.app
```

ถ้าเปลี่ยน Environment Variables หลัง deploy แล้ว ต้อง redeploy อีกครั้งเพื่อให้ค่ามีผลกับ deployment ใหม่

## 6. Database migration

เวอร์ชันนี้เพิ่มตาราง `workspace_ai_settings` จึงต้องรัน migration `0006_loose_xorn.sql` กับฐานข้อมูล production หนึ่งครั้ง ไม่ว่าจะเป็นฐานเดิมหรือฐานใหม่

ตั้ง `DATABASE_URL` ใน `.env.local` ให้ชี้ฐาน Neon ที่ใช้งานจริง แล้วรัน:

```powershell
npm install
npm run db:migrate
```

หลัง migration แล้วค่อย deploy หรือ redeploy Vercel

## 7. Facebook Page token

ใน production ระบบใช้ Page Access Token ที่บันทึกในหน้า:

```text
/dashboard/facebook
```

หลัง deploy ให้ login เข้า production แล้วตรวจ:

```text
/dashboard/facebook
```

จากนั้นกดทดสอบโพสต์ 1 ครั้ง ถ้าผ่านจึงเปิด Auto Pilot

หมายเหตุ: ถ้า token ที่เคยแปะในแชตหรือใช้ทดสอบหลายรอบแล้ว ควรสร้าง Page Access Token ใหม่ แล้วนำไปบันทึกใน production เพื่อความเรียบร้อย

## 8. Cron options

โปรเจกต์มีไฟล์ `vercel.json` แล้ว:

```json
{
  "crons": [
    {
      "path": "/api/cron/publish-scheduled",
      "schedule": "50 8 * * *"
    }
  ]
}
```

Endpoint นี้ทำ 2 งาน:

```text
1. รัน Auto Pilot ที่ถึงเวลา
2. โพสต์ scheduled posts ที่ถึงเวลา
```

### Option A: Vercel Cron

ใช้ได้เมื่อ Vercel plan รองรับความถี่ตามที่ต้องการ

Vercel จะเรียก:

```text
GET https://YOUR_DOMAIN/api/cron/publish-scheduled
```

ถ้าตั้ง `CRON_SECRET` ใน Vercel แล้ว ระบบจะตรวจ Authorization header ได้

### Option B: External cron เช่น cron-job.org

ถ้าต้องการควบคุมความถี่เอง ให้ใช้ external cron เรียก URL นี้:

```text
https://YOUR_DOMAIN/api/cron/publish-scheduled?secret=YOUR_CRON_SECRET
```

แนะนำเริ่มที่ทุก 10 นาที

## 9. Smoke test หลัง deploy

หลัง deploy ให้ทดสอบตามลำดับนี้:

```text
1. เปิด production URL
2. สมัคร/ล็อกอิน
3. เปิด /dashboard/deploy
4. เปิด /dashboard/settings/ai แล้ววางคีย์ใหม่ กด “ทดสอบและบันทึก”
5. กด “แสดงคีย์เต็ม” เพื่อตรวจว่าระบบใช้คีย์ถูกตัว
6. เปิด /dashboard/facebook แล้วทดสอบโพสต์
7. เปิด /dashboard/topics แล้วเพิ่มหัวข้อ active
8. เปิด /dashboard/autopilot
9. ตั้งโหมด draft_only ก่อน แล้วกด Run now
10. ถ้าผ่าน ค่อยเปลี่ยนเป็น auto_publish แล้ว Run now
11. เปิด /api/cron/publish-scheduled?secret=YOUR_CRON_SECRET เพื่อทดสอบ cron endpoint
12. ตรวจ /dashboard/autopilot ว่ามี run logs ใหม่
```

## 10. Rollback / ปิดระบบอัตโนมัติชั่วคราว

ถ้ามีปัญหา ให้ทำตามนี้ก่อน:

```text
1. เข้า /dashboard/autopilot
2. ปิด Auto Pilot
3. ถ้ามีโพสต์ scheduled ที่ไม่ต้องการ ให้เข้า /dashboard/posts แล้วจัดการรายโพสต์
4. ตรวจ /dashboard/autopilot logs เพื่อดู error ล่าสุด
```

ถ้าต้องหยุด cron ชั่วคราว:

```text
- ลบหรือเปลี่ยน CRON_SECRET ใน Vercel แล้ว redeploy
- หรือปิด external cron job
```

## 11. Checklist ก่อนเปิด Auto Pilot แบบ auto_publish

```text
[ ] Production login ใช้งานได้
[ ] /dashboard/deploy ไม่มีรายการ missing สำคัญ
[ ] Facebook Page test post ผ่าน
[ ] Topic Queue มีหัวข้อ active อย่างน้อย 3-5 หัวข้อ
[ ] Writing Style / CTA ตั้งค่าถูกใจแล้ว
[ ] Auto Pilot draft_only ผ่านอย่างน้อย 1 รอบ
[ ] Auto Pilot auto_publish ผ่านด้วยการกด Run now อย่างน้อย 1 รอบ
[ ] Cron endpoint เรียกผ่านจริง
[ ] Run Logs แสดงผลชัดเจน
```


## Password reset on production

If you want the `ลืมรหัสผ่าน?` flow to send real email, add these optional environment variables in Vercel:

```text
RESEND_API_KEY=your-resend-api-key
PASSWORD_RESET_FROM=AI Facebook Poster <your-verified-sender@example.com>
PASSWORD_RESET_DEBUG_LINKS=0
```

Temporary testing option:

```text
PASSWORD_RESET_DEBUG_LINKS=1
```

When debug links are enabled, `/forgot-password` can show the reset link after submitting an email. Use this only while testing because anyone with access to the page and email value could see a reset URL during that short-lived request.

If `RESEND_API_KEY` is empty and debug links are disabled, reset links are logged to Vercel Function Logs. This is useful for emergency testing but not recommended for normal use.
