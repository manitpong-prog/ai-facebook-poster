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
- Gemini API via `@google/genai`
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

---

## 2026-06-19 - Step 19 Facebook Page Settings and Test Post

### What was done
- Added a new Dashboard page for Facebook Page connection settings at `/dashboard/facebook`
- Added a Dashboard navigation item named “Facebook Page”
- Added a save form for:
  - Page Name
  - Page ID
  - Page Access Token
- Added a connection status card showing page name, page id, masked token, status, and last test time
- Added a real “โพสต์ทดสอบไปที่เพจ” button that posts to the saved Facebook Page using the Meta Pages API endpoint `POST /{page-id}/feed`
- Added a reusable Facebook API helper for posting plain text to a Facebook Page
- Added server actions for saving Facebook Page settings and testing a real Facebook post
- Kept the existing database schema and reused the existing `facebook_pages` table
- Removed `next/font/google` usage and switched to local CSS fallback fonts so local builds do not fail when Google Fonts cannot be fetched in restricted environments
- Marked the dashboard layout as dynamic so dashboard pages remain server/session driven instead of being treated as static pages during build analysis
- Removed an unused ESLint directive from the database client file

### Files created
- src/app/dashboard/facebook/page.tsx
- src/app/dashboard/facebook/actions.ts
- src/lib/facebook.ts

### Files updated
- src/components/dashboard/dashboard-nav.tsx
- src/app/dashboard/layout.tsx
- src/app/layout.tsx
- src/app/globals.css
- src/db/index.ts
- log_project.md

### Commands run
```powershell
npm install
npm run lint
npx tsc --noEmit
```

### Validation result
- `npm run lint` passed
- `npx tsc --noEmit` passed
- `npm run build` progressed past compile and TypeScript, but the sandbox command timed out while Next.js was collecting page data. Before the font change, build failed on Google Fonts fetching; that issue is now fixed.

### Database / Migration
- No migration required
- Existing `facebook_pages` table is used
- Existing columns used:
  - `workspace_id`
  - `page_name`
  - `page_id`
  - `access_token_encrypted`
  - `status`
  - `last_tested_at`
  - `updated_at`

### Environment variables
- No new environment variables required for Step 19
- Facebook Page settings are saved through the UI into the database
- Current MVP stores the Page Access Token in `facebook_pages.access_token_encrypted` as dev-only plain text, despite the column name. Add real encryption before production use.

### Current status
- User has confirmed Facebook API posting works through PowerShell
- User has confirmed Facebook API posting works through Graph API Explorer after switching to the Facebook Page token/context
- The app now has a page to save Facebook Page settings and test a real post from inside the dashboard

### Known issues
- The Page Access Token should be regenerated after testing because earlier test tokens were pasted into chat while debugging
- Token encryption is not implemented yet
- The generated post detail page still does not have a “Publish Now” button connected to Facebook
- Scheduled publishing is not implemented yet

### Next steps
1. Test `/dashboard/facebook` locally:
   - Save Page Name, Page ID, and Page Access Token
   - Click “โพสต์ทดสอบไปที่เพจ”
   - Confirm the post appears on Facebook
2. Regenerate a fresh Page Access Token after test flow works, then save the new token in the app
3. Step 20: Add “Publish Now” on the post detail page so generated Preview text can be posted to the connected Facebook Page
4. Step 21: Add scheduled publishing and Vercel Cron

---

## 2026-06-19 - Step 20 Publish Generated Preview to Facebook Page

### What was done
- Added a real “Publish Now to Facebook” flow on the post detail page at `/dashboard/posts/[postId]`
- Added a server action that publishes the saved generated Preview text to the connected Facebook Page
- Reused the Facebook Page settings saved in Step 19 from the existing `facebook_pages` table
- Updated post lifecycle when publishing:
  - `posting` while the app is sending to Meta
  - `posted` after Meta returns a Facebook Post ID
  - `error` if Meta rejects the post or the token/permission has a problem
- Saved Facebook publish metadata back to the `posts` table:
  - `facebook_page_id`
  - `publish_mode = post_now`
  - `posting_started_at`
  - `posted_at`
  - `facebook_post_id`
  - `facebook_post_url`
  - `error_message`
- Added duplicate-post protection by disabling/denying publish for posts that already have `posted` status or an existing Facebook Post ID
- Added guidance on the post detail page reminding the user to click “บันทึก Preview” before publishing if they edited the textarea
- Updated the posts list to show when a post already has a Facebook link
- Extended the Facebook API helper to fetch `permalink_url` after creating a post when available, with a fallback Facebook post URL built from the returned Post ID

### Files updated
- src/app/dashboard/posts/[postId]/actions.ts
- src/app/dashboard/posts/[postId]/page.tsx
- src/app/dashboard/posts/page.tsx
- src/app/dashboard/facebook/page.tsx
- src/lib/facebook.ts
- log_project.md

### Commands run
```powershell
npm install
npm run lint
npx tsc --noEmit
npm run build
```

### Validation result
- `npm run lint` passed
- `npx tsc --noEmit` passed
- `npm run build` compiled successfully, then the sandbox timed out while Next.js was still in its TypeScript/build analysis step. This appears to be the same sandbox timeout behavior seen in Step 19, not a TypeScript compile error, because standalone `npx tsc --noEmit` passed.

### Database / Migration
- No migration required
- Existing `posts` columns are used:
  - `facebook_page_id`
  - `publish_mode`
  - `posting_started_at`
  - `posted_at`
  - `facebook_post_id`
  - `facebook_post_url`
  - `error_message`
  - `status`
  - `updated_at`
- Existing `facebook_pages` columns are used:
  - `page_id`
  - `access_token_encrypted`
  - `page_name`

### Environment variables
- No new environment variables required
- The flow uses the Page Access Token saved through `/dashboard/facebook`

### Current status
- Facebook Page connection/test post flow exists
- Generated Preview text can now be posted directly to the connected Facebook Page from the post detail page
- After a successful publish, the post is marked as `posted` and stores the Facebook Post ID/URL

### Known issues
- The app still stores the Page Access Token as dev-only plain text in `facebook_pages.access_token_encrypted`
- Facebook posts created while the Meta App is in Development mode may only be visible to app/page roles, which is expected during testing
- There is still no scheduled publishing flow yet
- There is no image upload/media posting flow yet; Step 20 publishes text-only posts

### Next steps
1. Test Step 20 locally:
   - Confirm `/dashboard/facebook` has a valid Page ID and Page Access Token
   - Open a generated post detail page
   - Edit Preview if needed
   - Click “บันทึก Preview”
   - Click “โพสต์ Preview นี้ไป Facebook Page”
   - Confirm status changes to `posted` and the Facebook Post ID/URL is saved
2. Commit Step 20 after local test passes
3. Step 21: Add scheduled posts and Vercel Cron
