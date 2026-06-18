# AI Facebook Poster - Project Log

## Project Goal
ระบบช่วยเขียนโพสต์ Facebook Page ด้วย AI จากหัวข้อสั้น ๆ รองรับ Preview, แก้ไข, โพสต์ทันที, ตั้งเวลาโพสต์ และต่อยอดเป็น SaaS ให้ผู้ใช้อื่นเชื่อมเพจตัวเองได้ในอนาคต

## Current Stack Decision
- Next.js App Router
- TypeScript
- Tailwind CSS
- Vercel
- Neon Postgres
- Drizzle ORM
- Better Auth
- OpenAI Responses API
- Meta Facebook Pages API
- Vercel Cron
- GitHub Desktop

## 2026-06-18 - Fresh Project Initialization

### What we decided
- เริ่มโปรเจกต์ใหม่แบบ clean setup
- ใช้ GitHub Desktop สำหรับจัดการ Git/GitHub แทนการใช้คำสั่ง git เป็นหลัก
- ใช้ Neon Postgres แทน Supabase/Firebase เพราะเหมาะกับระบบ Dashboard, SaaS, Scheduled Posts, Usage Logs และข้อมูลสัมพันธ์หลายตาราง
- ใช้ Next.js App Router สำหรับ frontend/backend ในโปรเจกต์เดียว
- ใช้ Drizzle ORM สำหรับ schema และ migration
- ใช้ Better Auth สำหรับ login/register/session
- ใช้ OpenAI Responses API สำหรับให้ AI เขียนโพสต์แบบควบคุมรูปแบบผลลัพธ์
- ใช้ Meta Pages API สำหรับโพสต์ลง Facebook Page
- ใช้ Vercel Cron สำหรับตั้งเวลาโพสต์ในอนาคต

### Initial MVP Plan
Phase 1:
- Landing Page
- Login/Register
- Dashboard หลังล็อกอิน
- Database schema
- Writing Style
- Create Post + Preview + Save Draft

Phase 2:
- OpenAI Generate Post ไม่เกิน 300 คำ

Phase 3:
- Facebook Page Settings
- Publish Now

Phase 4:
- Scheduled Posts
- Vercel Cron

Phase 5:
- Multi-user / Multi-workspace / SaaS readiness

### Files created
- log_project.md
- .env.local

### Commands run
```powershell
cd $env:USERPROFILE\Desktop
npx create-next-app@latest ai-facebook-poster --ts --tailwind --eslint --app --src-dir --import-alias "@/*"
cd ai-facebook-poster
npm install @neondatabase/serverless drizzle-orm better-auth
npm install -D drizzle-kit dotenv
```

### Environment variables planned
- DATABASE_URL
- BETTER_AUTH_SECRET
- BETTER_AUTH_URL
- OPENAI_API_KEY
- FACEBOOK_PAGE_ID
- FACEBOOK_PAGE_ACCESS_TOKEN
- CRON_SECRET

### Database / SQL / Migration
- ยังไม่ได้สร้าง Neon database
- ยังไม่ได้สร้าง Drizzle schema
- ยังไม่มี migration

### Current status
- สร้างโปรเจกต์ Next.js ตั้งต้น
- ติดตั้งแพ็กเกจหลัก
- เตรียมไฟล์ environment
- เตรียมไฟล์บันทึกโปรเจกต์

### Known issues
- ก่อนเริ่มโปรเจกต์พบปัญหา npm global เสียในเครื่อง Windows
- แก้แล้วโดยตรวจ path npm/node/npx และ npm กลับมาใช้งานได้ปกติ

### Next steps
1. เพิ่มโปรเจกต์เข้า GitHub Desktop
2. Commit แรก
3. Publish repository ขึ้น GitHub
4. สร้าง Neon database
5. เพิ่ม DATABASE_URL
6. สร้าง Drizzle schema
7. เชื่อม Better Auth
