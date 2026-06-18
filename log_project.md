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

---

## 2026-06-18 - Step 17 Gemini Generate Post Preview

### What was done
- Added Gemini AI integration using the official `@google/genai` SDK
- Added Gemini post generation helper for Thai Facebook Page posts
- Added server action to generate post content from an existing Draft
- Updated post detail page to include a “Generate with Gemini” action
- Added generated text Preview area in post detail page
- Saved Gemini output to `posts.generated_text`
- Changed post status from `draft` to `generated` after successful generation
- Added AI usage logging into `ai_usage_logs` when usage metadata is available
- Added `GEMINI_MODEL` environment variable support with default `gemini-3.5-flash`

### Files created
- src/lib/ai/gemini.ts
- src/app/dashboard/posts/[postId]/actions.ts

### Files updated
- src/app/dashboard/posts/[postId]/page.tsx
- src/app/dashboard/posts/page.tsx
- .env.local
- log_project.md

### Commands to run
```powershell
npm install
npm run dev
```

### Environment variables used
- GEMINI_API_KEY
- AI_PROVIDER=gemini
- GEMINI_MODEL=gemini-3.5-flash

### Database / Migration
- No migration required
- Existing tables used:
  - posts
  - writing_profiles
  - ai_usage_logs

### Current status
- Users can create a Draft post
- Users can open the Draft detail page
- Users can click “ให้ Gemini เขียนโพสต์”
- Gemini generates Thai Facebook post content using the selected Writing Style
- Generated content is saved and displayed as Preview

### Known issues
- Generated text cannot be edited manually yet
- No Facebook publishing yet
- No scheduled post flow yet
- If Gemini quota/API key/model fails, user sees an error message on the post detail page

### Next steps
1. Add generated text edit/save flow
2. Add Regenerate UX with better loading state
3. Add Facebook Page Settings
4. Add Publish Now through Meta Pages API


---

## 2026-06-18 - Gemini Model Fix and Error Diagnostics

### What was done
- Changed default Gemini model from `gemini-3.5-flash` to stable `gemini-2.5-flash`
- Updated `.env.local` model setting to `GEMINI_MODEL=gemini-2.5-flash`
- Improved Gemini generation error handling so the UI shows the real technical error message
- Save Gemini generation errors into `posts.error_message` for easier debugging

### Files updated
- src/lib/ai/gemini.ts
- src/app/dashboard/posts/[postId]/actions.ts
- src/app/dashboard/posts/[postId]/page.tsx
- .env.local
- log_project.md

### Commands to run
```powershell
npm install
npm run dev
```

### Database / Migration
- No migration required
- Uses existing `posts.error_message` column

### Current status
- Gemini generation uses a valid stable text model name by default
- If Gemini fails again, the post detail page should show the exact API error message

### Next steps
1. Test Generate with Gemini again
2. If the API key or quota has an issue, use the exact error message now shown on the page to fix it
3. After Gemini generation passes, build Preview Edit + Save

---

## 2026-06-18 - Step 18 Preview Edit, CTA Variation, and Draft Delete

### What was done
- Added editable Preview textarea on the post detail page after Gemini generation
- Added server action to save edited Preview text back to `posts.generated_text`
- Added a “ลบ Draft นี้” action for Draft/Generated/Error/Cancelled posts so duplicate drafts can be removed
- Added disabled/pending submit button component to reduce accidental double submission
- Updated Create Post form to disable the submit button while saving a Draft
- Updated Generate and Save Preview buttons to show pending states while server actions run
- Updated Writing Style CTA field label from fixed CTA text to “แนวทาง CTA / ตัวอย่าง CTA หลายแบบ”
- Updated Gemini prompt so CTA guidelines are treated as inspiration and varied per post instead of copied exactly every time
- Changed Gemini default fallback model to `gemini-2.5-flash-lite`
- Updated Posts list to show a success message after deleting a draft

### Files created
- src/components/forms/submit-button.tsx

### Files updated
- src/app/dashboard/posts/[postId]/actions.ts
- src/app/dashboard/posts/[postId]/page.tsx
- src/app/dashboard/posts/new/page.tsx
- src/app/dashboard/posts/page.tsx
- src/app/dashboard/style/page.tsx
- src/lib/ai/gemini.ts
- log_project.md

### Commands to run
```powershell
npm install
npm run dev
```

### Database / Migration
- No migration required
- Existing columns used:
  - `posts.generated_text`
  - `posts.status`
  - `posts.error_message`
  - `writing_profiles.call_to_action`

### Current status
- Users can create a Draft
- Users can generate a post with Gemini
- Users can edit and save the generated Preview
- Users can delete duplicate Draft/Generated/Error/Cancelled posts
- CTA settings now guide Gemini to vary the closing CTA instead of always repeating one exact sentence

### Known issues
- Delete is intentionally disabled for scheduled/posting/posted statuses
- There is still no Facebook publishing flow yet
- There is still no schedule publishing flow yet

### Next steps
1. Test Create Draft double-click prevention
2. Test delete duplicate Draft
3. Test Generate → Edit Preview → Save
4. Build Facebook Page Settings and Publish Now flow
