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

---

## 2026-06-18 - Neon + Drizzle Initial Schema

### What was done
- Created Neon Postgres database for the project
- Added DATABASE_URL to .env.local
- Added Drizzle config
- Added initial application database schema
- Added database connection helper
- Added health check API route for database testing
- Generated and applied first database migration

### Files created
- drizzle.config.ts
- src/db/schema.ts
- src/db/index.ts
- src/app/api/health/db/route.ts
- drizzle/*

### Files updated
- package.json
- package-lock.json
- .env.local

### Commands run
```powershell
npm run db:generate
npm run db:migrate
npm run dev
```

### Database tables created
- workspaces
- workspace_members
- facebook_pages
- writing_profiles
- posts
- ai_usage_logs

### Current status
- Next.js project can connect to Neon Postgres through Drizzle
- Database schema for core posting system is ready
- Better Auth is not connected yet
- OpenAI API is not connected yet
- Facebook API is not connected yet

### Next steps
1. Add Better Auth database adapter and auth route
2. Create Login/Register pages
3. Create protected Dashboard layout
4. Auto-create workspace and default writing profile after user signup

---

## 2026-06-18 - Better Auth Login/Register Code Prepared from ZIP

### What was done
- Updated the uploaded project ZIP directly instead of asking the user to edit files manually
- Added Better Auth core tables to the Drizzle schema
- Added Better Auth server configuration with Drizzle adapter
- Added Better Auth React client configuration
- Added Next.js auth route handler
- Added Register page
- Added Login page
- Added protected Dashboard page
- Added Sign Out button
- Added workspace helper to create a default workspace and default writing profile for new users
- Updated Landing Page from default Next.js starter page to AI Facebook Poster landing page
- Updated app metadata and HTML language

### Files created
- src/lib/auth.ts
- src/lib/auth-client.ts
- src/lib/workspace.ts
- src/app/api/auth/[...all]/route.ts
- src/app/register/page.tsx
- src/app/login/page.tsx
- src/app/dashboard/page.tsx
- src/components/auth/sign-out-button.tsx

### Files updated
- src/db/schema.ts
- src/app/page.tsx
- src/app/layout.tsx
- log_project.md

### Database / Migration status
- Better Auth schema code is ready
- Migration file has not been generated in this ZIP because node_modules is not included in the uploaded ZIP
- After replacing files, run the commands below on the local machine:

```powershell
cd $env:USERPROFILE\Desktop\ai-facebook-poster
npm install
npm run db:generate
npm run db:migrate
npm run dev
```

### Expected new database tables after migration
- user
- session
- account
- verification

### Existing app tables remain
- workspaces
- workspace_members
- facebook_pages
- writing_profiles
- posts
- ai_usage_logs

### Current status
- Code for email/password registration and login is prepared
- Dashboard is protected with server-side Better Auth session validation
- New users should receive a default workspace and default writing profile automatically
- Dashboard also calls ensureDefaultWorkspace as a fallback so a workspace can be created if the signup hook did not finish before redirect

### Known issues / not done yet
- Migration still needs to be generated and applied locally
- No email verification yet
- No password reset yet
- No OpenAI integration yet
- No Facebook API integration yet
- No create-post form yet

### Next steps
1. Replace the old project folder with this ZIP contents
2. Run npm install if node_modules is missing
3. Run npm run db:generate
4. Run npm run db:migrate
5. Run npm run dev
6. Test register, login, dashboard, and logout
7. Commit + Push with GitHub Desktop after successful test

---

## 2026-06-18 - Writing Style Settings Page

### What was done
- Added a reusable Dashboard layout with protected auth check
- Added Dashboard navigation component
- Added Writing Style settings page at `/dashboard/style`
- Added server action to update the default writing profile in Neon
- Updated Dashboard page to use the shared layout and link to Writing Style settings
- Improved workspace helper to ensure a default writing profile exists even if the workspace already exists

### Files created
- src/app/dashboard/layout.tsx
- src/app/dashboard/style/page.tsx
- src/app/dashboard/style/actions.ts
- src/components/dashboard/dashboard-nav.tsx

### Files updated
- src/app/dashboard/page.tsx
- src/lib/workspace.ts
- log_project.md

### Commands to run after replacing files
```powershell
npm install
npm run dev
```

### Database / Migration
- No new database tables were added in this step
- No Drizzle migration is required for this step
- Existing `writing_profiles` table is used

### Current status
- User can open `/dashboard/style`
- User can edit the default writing style
- Style fields are saved to Neon through a server action
- Dashboard shows the latest default writing style

### Known issues
- Create Post form is not implemented yet
- OpenAI integration is not implemented yet
- Facebook API integration is not implemented yet
- Scheduled posts are not implemented yet

### Next steps
1. Build Create Post form
2. Save draft post to database
3. Add Preview page
4. Connect OpenAI Responses API to generate posts using the saved Writing Style

---

## 2026-06-18 - Create Post Draft Flow

### What was done
- Added Create Post page for entering a topic and optional per-post style instructions
- Added server action to save a new post as a Draft in Neon
- Added Posts list page to view recent posts in the current workspace
- Added Post detail page to review a saved Draft
- Updated Dashboard navigation with Create Post and Posts menu items
- Updated Dashboard home card to link to Create Post and Posts list
- Kept this step database-compatible with the existing `posts` table; no new migration required

### Files created
- src/app/dashboard/posts/new/page.tsx
- src/app/dashboard/posts/new/actions.ts
- src/app/dashboard/posts/page.tsx
- src/app/dashboard/posts/[postId]/page.tsx

### Files updated
- src/components/dashboard/dashboard-nav.tsx
- src/app/dashboard/page.tsx
- log_project.md

### Commands to run after applying this ZIP
```powershell
cd $env:USERPROFILE\Desktop\ai-facebook-poster
npm install
npm run dev
```

### Database / Migration
- No schema changes
- No migration required
- Uses existing `posts` table and existing `writing_profiles` table

### Current status
- User can create a Draft post from `/dashboard/posts/new`
- Draft post is saved in Neon with status `draft` and publish mode `draft`
- User can view saved posts at `/dashboard/posts`
- User can open a Draft detail page at `/dashboard/posts/[postId]`
- Draft is linked to the user's default writing profile
- OpenAI generation is not connected yet
- Facebook publishing is not connected yet

### Known issues
- Draft editing is not implemented yet
- Draft deletion/cancel is not implemented yet
- AI-generated content preview is not implemented yet
- Publish now and schedule are not implemented yet

### Next steps
1. Add OpenAI Responses API integration
2. Add Generate with AI button on Draft detail page
3. Save generated text back to the `posts.generated_text` column
4. Add manual edit generated text flow
5. Add Facebook Page settings and publish-now flow

---

## 2026-06-18 - Step 16.1 Neon Session Stability Patch

### What was done
- Switched the app database runtime connection from Neon HTTP driver to `postgres` + `drizzle-orm/postgres-js`.
- Kept a single Postgres client during local development hot reloads to reduce repeated short-lived connections.
- Added cached session/dashboard context helpers to avoid repeated `auth.api.getSession()` calls in the same request.
- Added user-friendly Dashboard load error UI instead of allowing Better Auth API errors to crash the page.
- Added try/catch handling around dashboard data loading and post/style server actions.
- Improved database health check route to return a clear JSON error when the database is temporarily unreachable.

### Files created
- src/lib/session.ts
- src/lib/dashboard-context.ts
- src/components/dashboard/dashboard-load-error.tsx

### Files updated
- src/db/index.ts
- src/app/api/health/db/route.ts
- src/app/dashboard/layout.tsx
- src/app/dashboard/page.tsx
- src/app/dashboard/style/page.tsx
- src/app/dashboard/style/actions.ts
- src/app/dashboard/posts/page.tsx
- src/app/dashboard/posts/new/page.tsx
- src/app/dashboard/posts/new/actions.ts
- src/app/dashboard/posts/[postId]/page.tsx
- log_project.md

### Database / Migration
- No schema changes.
- No migration required.

### Commands to run after applying this ZIP
```powershell
npm install
npm run dev
```

### Current status
- Draft creation flow remains unchanged from the user perspective.
- Dashboard pages now reuse a cached dashboard context per request.
- Temporary Neon/session connection failures should show a Thai reload UI instead of an uncaught browser/API error.

### Known issues
- If the local internet connection or Neon project is unavailable, the app still cannot load protected data, but it should fail more gracefully.
- If `postgres` has not been installed on the local machine, run `npm install` first. The dependency is already listed in package.json.

### Next steps
1. Test `/dashboard/posts/new`, create Draft, return to `/dashboard/posts`, and refresh several times.
2. If stable, commit and push this patch.
3. Continue to Step 17: OpenAI Generate Post from Draft.
