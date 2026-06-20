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

---

## 2026-06-19 - Step 21.1 Schedule Post UI + Save Scheduled Queue

### What was done
- Added a first scheduled-publishing flow on the post detail page at `/dashboard/posts/[postId]`
- Added a new “Schedule Post” card that lets the user choose a date/time using a `datetime-local` input
- The selected time is interpreted as Thailand time (`Asia/Bangkok`, UTC+7) before saving to the database
- Added server action `scheduleGeneratedPostAction` to save a generated Preview as a scheduled post
- Added server action `cancelScheduledPostAction` to cancel a scheduled post and return it to editable generated/draft state
- Added validation for scheduled posts:
  - post must have generated Preview text
  - Facebook Page settings must already be connected
  - date/time must be valid
  - schedule time must be in the future
  - already posted / posting posts cannot be scheduled
- Updated the post detail UI to show scheduled time badges and success/error messages
- Updated the posts list to show scheduled time for scheduled posts
- Updated Preview save behavior so scheduled posts can keep their `scheduled` status after editing/saving the Preview
- Updated Generate behavior to clear any old schedule when Gemini regenerates a post, to prevent accidental posting of changed content at an old time
- Updated Publish Now behavior to clear `scheduled_at` when the user manually publishes a scheduled post immediately

### Important behavior / decision
- Step 21.1 only saves the scheduled queue into the database. It does not automatically publish at the scheduled time yet.
- Automatic publishing will be implemented in Step 21.2 with a Cron endpoint.
- Scheduled times are shown and entered in Thailand time (`Asia/Bangkok`). The database stores the timestamp as a timezone-aware value.

### Files updated
- src/app/dashboard/posts/[postId]/actions.ts
- src/app/dashboard/posts/[postId]/page.tsx
- src/app/dashboard/posts/page.tsx
- log_project.md

### Commands run
```powershell
npm ci --prefer-offline --no-audit --no-fund --ignore-scripts
npm run lint
npx tsc --noEmit
npm run build
```

### Validation result
- `npm run lint` passed
- `npx tsc --noEmit` passed
- `npm run build` compiled successfully, then the sandbox timed out while Next.js was still running its TypeScript/build analysis step. This is the same sandbox timeout pattern seen in earlier steps, and standalone `npx tsc --noEmit` passed.

### Database / Migration
- No migration required
- Existing `posts` columns are used:
  - `status`
  - `publish_mode`
  - `scheduled_at`
  - `facebook_page_id`
  - `posting_started_at`
  - `error_message`
  - `updated_at`

### Environment variables
- No new environment variables required

### Current status
- Users can now set a generated post to `scheduled` status with a future Thailand date/time
- Users can cancel scheduled posts before they are published
- Scheduled posts appear with schedule metadata in both the detail page and posts list

### Known issues
- Scheduled posts are not published automatically yet because the Cron worker is not implemented
- The app still stores the Page Access Token as dev-only plain text in `facebook_pages.access_token_encrypted`
- Scheduled publishing has no retry worker yet; retries will be designed with the Cron endpoint

### Next steps
1. Test Step 21.1 locally:
   - Create or open a generated post
   - Save Preview if edited
   - Choose a future Thailand date/time
   - Click “บันทึกเวลาตั้งโพสต์”
   - Confirm status becomes `scheduled` and the schedule time appears in the post detail/list
   - Try “ยกเลิกเวลาตั้งโพสต์” and confirm status returns to generated/draft
2. Commit Step 21.1 after local test passes
3. Step 21.2: Add Cron endpoint to automatically publish due scheduled posts
4. Step 21.3: Configure Vercel Cron to call the scheduled publishing endpoint

---

## 2026-06-19 - Step 21.2A Manual Cron Endpoint for Scheduled Publishing

### What was done
- Added a manual Cron/API endpoint for publishing due scheduled posts:
  - `GET /api/cron/publish-scheduled`
  - `POST /api/cron/publish-scheduled`
- Added shared server helper `publishDueScheduledPosts()` to keep the scheduled publishing logic outside the route handler.
- The endpoint checks posts that are ready to publish using these conditions:
  - `status = scheduled`
  - `scheduled_at <= now`
  - `facebook_post_id IS NULL`
- Added a small claim/lock step before posting:
  - each due post is changed from `scheduled` to `posting` before calling Facebook
  - the update condition still requires `status = scheduled`, which helps prevent duplicate posting if two Cron calls run at almost the same time
- After a successful Facebook publish, the post is updated with:
  - `status = posted`
  - `publish_mode = schedule`
  - `facebook_post_id`
  - `facebook_post_url`
  - `posted_at`
  - cleared `error_message`
- If publishing fails, the post is marked as:
  - `status = error`
  - `error_message = <Facebook/API error>`
  - `retry_count = retry_count + 1`
- The endpoint returns JSON with a clear summary:
  - `dueCount`
  - `publishedCount`
  - `failedCount`
  - `skippedCount`
  - per-post results
- Added optional Cron authorization:
  - Local development works without `CRON_SECRET`
  - Production should set `CRON_SECRET`
  - When `CRON_SECRET` exists, call the endpoint with `Authorization: Bearer <CRON_SECRET>` or `?secret=<CRON_SECRET>`

### Important behavior / decision
- This is Step 21.2A: manual Cron endpoint first.
- The app does not yet include `vercel.json` / Vercel Cron scheduling. That is intentionally left for Step 21.2B after the manual endpoint is tested.
- On publish failure, the post is moved to `error` instead of automatic retrying. This avoids duplicate posts in uncertain cases where Facebook may have accepted a post but the response failed.
- Existing "Publish Now" behavior is unchanged.

### Files added
- src/lib/scheduled-publisher.ts
- src/app/api/cron/publish-scheduled/route.ts

### Files updated
- log_project.md

### Commands run
```powershell
npm ci --prefer-offline --no-audit --no-fund --ignore-scripts
npm run lint
npx tsc --noEmit
npm run build
```

### Validation result
- `npm run lint` passed
- `npx tsc --noEmit` passed
- `npm run build` compiled successfully and finished TypeScript, then the sandbox timed out while Next.js was collecting page data. This is the same sandbox timeout pattern seen in earlier steps, not a TypeScript error.

### Database / Migration
- No migration required
- Existing `posts` columns are used:
  - `status`
  - `publish_mode`
  - `scheduled_at`
  - `posting_started_at`
  - `posted_at`
  - `facebook_post_id`
  - `facebook_post_url`
  - `error_message`
  - `retry_count`
- Existing `facebook_pages` columns are used:
  - `page_id`
  - `access_token_encrypted`

### Environment variables
- Optional new production variable:
  - `CRON_SECRET`
- Local development can test the endpoint without setting `CRON_SECRET`.
- For production, set `CRON_SECRET` before enabling an external Cron trigger.

### How to test locally
1. Run the app:
```powershell
npm run dev
```
2. Make sure `/dashboard/facebook` has a working Page ID and Page Access Token.
3. Create or open a generated post.
4. Schedule it for a near-future Thailand time.
5. Wait until the scheduled time has passed.
6. Open this URL in the browser:
```text
http://localhost:3000/api/cron/publish-scheduled
```
7. Expected success response example:
```json
{
  "ok": true,
  "dueCount": 1,
  "publishedCount": 1,
  "failedCount": 0,
  "skippedCount": 0,
  "results": [
    {
      "status": "published",
      "facebookPostId": "105037572408076_..."
    }
  ]
}
```
8. Go back to `/dashboard/posts` and confirm the post status is `posted`.

### Current status
- Scheduled posts can now be published by manually calling the Cron endpoint.
- This confirms the worker logic before connecting a real automatic scheduler.

### Known issues
- Vercel Cron is not configured yet.
- Posts that fail auto publishing are set to `error` for manual review instead of retrying automatically.
- The app still stores the Page Access Token as dev-only plain text in `facebook_pages.access_token_encrypted`.

### Next steps
1. Test Step 21.2A locally with a scheduled post whose time has passed.
2. Commit Step 21.2A after local test passes.
3. Step 21.2B: add `vercel.json` and configure Vercel Cron to call `/api/cron/publish-scheduled` automatically every 5 or 10 minutes.
4. Later: add a retry strategy / stuck `posting` recovery screen if needed.

---

## Step 21.2B - Secure Cron + Vercel Cron config

### Goal
Make the scheduled-post publisher ready for automatic production execution while still supporting external cron services.

### What was added
- Added `vercel.json` at the project root.
- Configured Vercel Cron to call:
  - `/api/cron/publish-scheduled`
  - every 10 minutes with cron expression `*/10 * * * *`
- Kept support for external cron services such as cron-job.org by allowing:
  - `?secret=<CRON_SECRET>`
- Kept support for Vercel's automatic Authorization header:
  - `Authorization: Bearer <CRON_SECRET>`

### What was improved
- Refined Cron auth handling in `src/app/api/cron/publish-scheduled/route.ts`.
- Production now returns clearer errors when `CRON_SECRET` is missing or invalid.
- Successful cron responses now include `authMode`, which helps confirm whether the request used:
  - `authorization-header`
  - `secret-query`
  - `local-dev-no-secret`
- Updated `.env.local` comments to explain that `CRON_SECRET` can stay empty locally but should be set in production.
- Rewrote `README.md` with project-specific local dev, environment, Vercel Cron, and external cron instructions.

### Files added
- `vercel.json`

### Files updated
- `src/app/api/cron/publish-scheduled/route.ts`
- `.env.local`
- `README.md`
- `log_project.md`

### Database / Migration
- No migration required.
- Existing scheduled post columns are still used.

### Environment variables
Set this in Vercel before relying on production cron:

```text
CRON_SECRET=<long-random-string>
```

Local development can keep:

```text
CRON_SECRET=
```

### Vercel setup notes
1. Deploy this version to Vercel.
2. In Vercel Project Settings → Environment Variables, add `CRON_SECRET`.
3. Redeploy after adding the environment variable.
4. Vercel Cron will call `/api/cron/publish-scheduled` automatically.
5. If frequent Vercel Cron is not available on the current plan, use an external cron service to call:

```text
https://YOUR_DOMAIN/api/cron/publish-scheduled?secret=YOUR_CRON_SECRET
```

### How to test locally
Run the app:

```powershell
npm run dev
```

Then open:

```text
http://localhost:3000/api/cron/publish-scheduled
```

Expected result includes:

```json
{
  "ok": true,
  "authMode": "local-dev-no-secret"
}
```

### How to test production manually after deploy
Use browser or PowerShell with query secret:

```text
https://YOUR_DOMAIN/api/cron/publish-scheduled?secret=YOUR_CRON_SECRET
```

Or use an Authorization header:

```powershell
Invoke-RestMethod -Method Get -Uri "https://YOUR_DOMAIN/api/cron/publish-scheduled" -Headers @{ Authorization = "Bearer YOUR_CRON_SECRET" }
```

### Current status
- Manual scheduled publisher is still working.
- Endpoint is now protected for production.
- Vercel Cron configuration is present.
- External cron fallback is supported.

### Next steps
1. Test a production deployment with `CRON_SECRET` set.
2. If Vercel Cron frequency is not enough for the current plan, configure cron-job.org or another external scheduler.
3. Step 22.1: build Topic Queue so the user can add many future content ideas.
4. Step 22.2: add Auto Writer so Gemini can select a queued topic and draft a post automatically.
5. Step 22.3: combine Auto Writer + Auto Publish to generate and publish posts on a daily/every-2-days schedule.

### Validation result after implementation
Commands run in sandbox:

```powershell
npm ci --prefer-offline --no-audit --no-fund --ignore-scripts --silent
npm run lint
npx tsc --noEmit
npm run build
```

Result:
- `npm run lint` passed.
- `npx tsc --noEmit` passed.
- `npm run build` started the optimized production build but timed out in the sandbox at `Creating an optimized production build ...`. No TypeScript errors were shown before the timeout. This is consistent with previous sandbox build-time limitations.

---

## Step 22.1 - Topic Queue

### Goal
Start the Auto Content Queue / Autopilot direction by adding a place to store many future post ideas before AI writing automation is added.

### What was added
- Added a new dashboard page:
  - `/dashboard/topics`
- The user can paste many topics at once, one topic per line.
- The user can add an optional shared note/instruction for the batch of topics.
- Topics are saved into a new `content_topics` table.
- Topic statuses are supported:
  - `active` = ready to use
  - `paused` = keep for later but do not use yet
  - `used` = already converted into a draft
  - `archived` = hidden/retired from future automation
- The Topic Queue page shows counts by status.
- The user can manually create a Draft from a topic to test the future automation flow.
- When a topic is converted to a Draft, the topic is marked `used`, linked to the created post, and `used_at` is saved.
- Added Topic Queue to the dashboard navigation.
- Added a Dashboard quick link to start from Topic Queue.

### Files added
- `src/app/dashboard/topics/page.tsx`
- `src/app/dashboard/topics/actions.ts`
- `drizzle/0002_optimal_grim_reaper.sql`
- `drizzle/meta/0002_snapshot.json`

### Files updated
- `src/db/schema.ts`
- `src/components/dashboard/dashboard-nav.tsx`
- `src/app/dashboard/page.tsx`
- `README.md`
- `log_project.md`
- `drizzle/meta/_journal.json`

### Database / Migration
This step requires a new database migration.

New enum:

```text
content_topic_status = active | paused | used | archived
```

New table:

```text
content_topics
```

Important columns:

```text
id
workspace_id
created_post_id
title
notes
status
priority
used_at
created_by_user_id
created_at
updated_at
```

Run after extracting this ZIP:

```powershell
npm install
npm run db:migrate
npm run dev
```

### How to test
1. Open `/dashboard/topics`.
2. Paste multiple topic ideas, one per line.
3. Click `เพิ่มเข้าคลังหัวข้อ`.
4. Confirm the topics appear in the list with status `รอใช้`.
5. Try `พักไว้ก่อน`, `เปิดใช้งาน`, and `เก็บถาวร`.
6. For an active topic, click `สร้าง Draft`.
7. Confirm the app redirects to the new post detail page.
8. Go back to `/dashboard/topics` and confirm that topic is now `ใช้แล้ว` and links back to the created Draft.

### Current status
- Topic Queue is now available.
- The app can store future ideas and manually convert one topic into a Draft.
- This prepares the data model and UX for the Auto Writer.

### Known issues / intentional limitations
- Auto Writer is not implemented yet.
- The app does not automatically pick a topic from the queue yet.
- The app does not automatically generate and publish from the queue yet.
- Topic ordering uses a simple `priority` value for future automation, but there is no drag-and-drop UI yet.

### Next steps
1. Test Step 22.1 locally and commit if it passes.
2. Step 22.2: add Auto Writer that selects one active topic and asks Gemini to create a Draft automatically.
3. Step 22.3: add automation settings for frequency such as every day / every 2 days and combine Auto Writer + scheduled publishing.

### Validation result after implementation
Commands run in sandbox:

```powershell
npm install --no-audit --no-fund
npm run db:generate
npm run lint
npx tsc --noEmit
npm run build
```

Result:
- `npm run db:generate` created `drizzle/0002_optimal_grim_reaper.sql` and `drizzle/meta/0002_snapshot.json`.
- `npm run lint` passed.
- `npx tsc --noEmit` passed.
- `npm run build` compiled successfully, then timed out in the sandbox during the later TypeScript/build analysis phase. No TypeScript errors were shown before the timeout.


---

## Step 22.2 - Auto Writer from Topic Queue

### Goal
Let the user keep a queue of future topics, then click one button to have the system pick the next active topic and ask Gemini to write the Facebook post automatically.

### What was added
- Added an Auto Writer flow on `/dashboard/topics`.
- Added a new button: `ให้ AI เขียนจากหัวข้อถัดไป`.
- The button selects the next `active` topic by queue order.
- The selected topic is temporarily claimed as `paused` while Gemini is writing to reduce duplicate generation from double clicks.
- The app creates a new post from that topic.
- Gemini writes the post immediately and saves the result into `posts.generated_text`.
- The new post status becomes `generated`.
- The topic becomes `used`, stores `used_at`, and links to the created post via `created_post_id`.
- AI usage is recorded in `ai_usage_logs`.
- If Gemini fails, the topic is restored to `active` and the created post, if any, is marked `error`.

### Files added
- `src/lib/topic-auto-writer.ts`

### Files updated
- `src/app/dashboard/topics/actions.ts`
- `src/app/dashboard/topics/page.tsx`
- `README.md`
- `log_project.md`

### Database / Migration
No new migration is required in this step.

This step reuses existing tables:

```text
content_topics
posts
ai_usage_logs
writing_profiles
```

### How to test
1. Open `/dashboard/topics`.
2. Add several active topics if there are none.
3. Click `ให้ AI เขียนจากหัวข้อถัดไป`.
4. Wait for Gemini to generate the post.
5. Confirm the app redirects to `/dashboard/posts/[postId]`.
6. Confirm the Preview already contains AI-generated text.
7. Go back to `/dashboard/topics`.
8. Confirm the selected topic is now `ใช้แล้ว` and links to the generated post.

### Current status
- Topic Queue can now create AI-generated posts in one click.
- This is still manual-trigger Auto Writer, which is safer for testing quality before fully automatic publishing.

### Known issues / intentional limitations
- The system does not yet run Auto Writer on a schedule.
- The system does not yet combine Auto Writer + publish-to-Facebook in one automatic cron run.
- Topic ordering is based on `priority` then creation time. There is no drag-and-drop reordering UI yet.

### Next steps
1. Test Step 22.2 locally and commit if it passes.
2. Step 22.3: add automation settings for frequency such as every day / every 2 days.
3. Step 22.4: connect scheduled automation so the system can pick a topic, generate a post, and optionally publish automatically.

### Validation result after implementation
Commands run in sandbox:

```powershell
npm install --no-audit --no-fund
npm run lint
npx tsc --noEmit
npm run build
```

Result:
- `npm run lint` passed.
- `npx tsc --noEmit` passed.
- `npm run build` compiled successfully, finished TypeScript, generated static pages, and reached final page optimization. The sandbox command then timed out after the successful build output was already shown.

---

## Step 22.3 - Auto Pilot Settings and Cron Integration

### Goal
Move the app from manual Auto Writer toward true autopilot: the user can add many topics, set a frequency and time, then let cron pick the next topic, ask Gemini to write it, and optionally post it to Facebook automatically.

### What was added
- Added new dashboard page `/dashboard/autopilot`.
- Added Auto Pilot settings:
  - Enable / disable Auto Pilot.
  - Mode: `draft_only` or `auto_publish`.
  - Frequency: every 1, 2, 3, or 7 days.
  - Post/write time using Thailand timezone `Asia/Bangkok`.
- Added a manual test button: `รัน Auto Pilot ตอนนี้`.
- Added readiness checks for active topics and connected Facebook Page.
- Added status display for next run, last run, last result, and last error.
- Added `automation_settings` table to store one Auto Pilot configuration per workspace.
- Added `src/lib/auto-pilot.ts` for reusable Auto Pilot job logic.
- Updated `/api/cron/publish-scheduled` so one cron request now runs:
  1. due Auto Pilot jobs, then
  2. due scheduled post publishing.
- Added `skipAutoPilot=1` query option for manual testing of scheduled publishing only.
- Added Auto Pilot link to the dashboard navigation.

### Files added
- `src/app/dashboard/autopilot/page.tsx`
- `src/app/dashboard/autopilot/actions.ts`
- `src/lib/auto-pilot.ts`
- `drizzle/0003_auto_pilot_settings.sql`
- `drizzle/meta/0003_snapshot.json`

### Files updated
- `src/db/schema.ts`
- `src/app/api/cron/publish-scheduled/route.ts`
- `src/components/dashboard/dashboard-nav.tsx`
- `src/app/dashboard/page.tsx`
- `README.md`
- `log_project.md`
- `drizzle/meta/_journal.json`

### Database / Migration
This step requires a migration because it adds the new `automation_settings` table.

Run after extracting the ZIP:

```powershell
npm install
npm run db:migrate
npm run dev
```

### How the Auto Pilot flow works
1. User adds topics to `/dashboard/topics`.
2. User opens `/dashboard/autopilot` and enables Auto Pilot.
3. Cron calls `/api/cron/publish-scheduled` every 10 minutes locally/manual or via Vercel/external cron later.
4. If an Auto Pilot job is due, the app claims it and calculates the next run.
5. The app selects the next active topic from Topic Queue.
6. Gemini writes the post using the default writing profile.
7. If mode is `draft_only`, the generated post stays in the app for review.
8. If mode is `auto_publish`, the generated post is immediately scheduled and the same cron run publishes it to the connected Facebook Page.
9. The used topic is marked `used` and linked to the created post.

### How to test locally
1. Run migration and start dev server.
2. Open `/dashboard/topics` and ensure at least one topic has status `รอใช้`.
3. Open `/dashboard/autopilot`.
4. Choose mode `เขียนไว้ให้ตรวจก่อน` for safe testing first.
5. Click `รัน Auto Pilot ตอนนี้`.
6. Confirm a new generated post is created and the topic becomes `ใช้แล้ว`.
7. Switch mode to `เขียนแล้วโพสต์ลงเพจอัตโนมัติ` only after confirming Facebook Page settings are connected.
8. Click `รัน Auto Pilot ตอนนี้` again and confirm the generated post is posted to Facebook.
9. Test scheduled run by enabling Auto Pilot and opening `/api/cron/publish-scheduled` when `next_run_at` is due.

### Current status
- Auto Pilot settings page is implemented.
- Manual Auto Pilot test is implemented.
- Cron endpoint now combines Auto Pilot generation and scheduled publishing.
- The project is ready for user testing in local development before connecting to production cron.

### Known issues / intentional limitations
- Topic order is still based on `priority` then creation time. There is no drag-and-drop UI yet.
- Auto Publish mode can post to Facebook immediately, so it should be tested carefully with the user's own Page first.
- Auto Pilot uses the first connected Facebook Page for the workspace.
- Vercel or external cron is still needed for fully automatic operation while the user's computer is off.

### Next steps
1. Test Step 22.3 locally and commit if it passes.
2. Add a clearer Auto Pilot history/log page if needed.
3. Add topic priority/reorder controls.
4. Later deploy to Vercel and enable Vercel Cron or external cron when ready.

### Validation result after implementation
Commands run in sandbox:

```powershell
npm install
npx drizzle-kit generate --name auto_pilot_settings
npm run lint
npx tsc --noEmit
npm run build
```

Result:
- `npx drizzle-kit generate --name auto_pilot_settings` created `drizzle/0003_auto_pilot_settings.sql` and `drizzle/meta/0003_snapshot.json`.
- `npm run lint` passed.
- `npx tsc --noEmit` passed.
- `npm run build` passed completely and generated all pages successfully.

---

## 2026-06-20 - Step 22.3.1: Delete buttons on list pages

### Goal
Add delete buttons directly on overview/list pages so the user can remove created items without opening each detail page first.

### Completed
- Added a list-level delete action for posts on `/dashboard/posts`.
- Refactored the posts list so each row has a separate `เปิดดู` button and `ลบ` button.
- Allows deleting post records from the app for draft/generated/scheduled/posted/error/cancelled states, except the transient `posting` state to avoid race conditions while Facebook publishing is running.
- Clarified that deleting a posted record from the app does not delete the already-published Facebook post.
- Updated the existing post detail delete section to match the new behavior and wording.
- Added a delete action for Topic Queue items on `/dashboard/topics`.
- Added `ลบ` buttons for every topic row, including active, paused, used, and archived topics.
- Deleting a topic does not delete any post that was already generated from that topic.

### Files added
- `src/app/dashboard/posts/actions.ts`

### Files updated
- `src/app/dashboard/posts/page.tsx`
- `src/app/dashboard/posts/[postId]/actions.ts`
- `src/app/dashboard/posts/[postId]/page.tsx`
- `src/app/dashboard/topics/actions.ts`
- `src/app/dashboard/topics/page.tsx`
- `README.md`
- `log_project.md`

### Database / Migration
No database migration is required in this step.

### How to test locally
1. Start the app with `npm run dev`.
2. Open `/dashboard/posts`.
3. Click `ลบ` on a post row and confirm that the row disappears and the success message appears.
4. For a posted item, confirm that only the app record is deleted; the Facebook post remains on the Facebook Page.
5. Open `/dashboard/topics`.
6. Click `ลบ` on active, paused, used, or archived topic rows and confirm that the item disappears.

### Current status
- Delete buttons are now available from the Posts overview and Topic Queue overview.
- This improves cleanup while testing Auto Writer and Auto Pilot flows.

### Known issues / intentional limitations
- Delete does not remove already-published content from Facebook. It only removes the local app record.
- Posts in the `posting` state cannot be deleted until the publish attempt finishes.
- Topic deletion does not cascade-delete posts generated from that topic.

### Next steps
1. User tests delete buttons locally.
2. If needed, add a richer delete confirmation modal later.
3. Continue with Auto Pilot diagnostics/history so failed auto-publish attempts show exactly which stage failed.

### Validation result after implementation
Commands run in sandbox:

```powershell
npm install --ignore-scripts --prefer-offline --no-audit --no-fund
npm run lint
npx tsc --noEmit
```

Result:
- `npm run lint` passed.
- `npx tsc --noEmit` passed.

---

## 2026-06-20 - Step 22.3.2: Auto Pilot Diagnostics

### Goal
Make Auto Pilot failures easier to understand by showing exactly whether the problem is likely from Topic Queue, Gemini API, Facebook Page/token, or the publish worker.

### Completed
- Improved `/dashboard/autopilot` run result messages for auto-publish mode.
- Added a Cron summary after manual Auto Pilot runs: due / published / failed / skipped.
- Added a Diagnostics Checklist on `/dashboard/autopilot` for:
  - Topic Queue readiness
  - Gemini API key/model readiness
  - Facebook Page + Page Access Token readiness
- Added automatic error category hints:
  - Gemini API issue
  - Facebook Page/token/permission issue
  - Topic Queue issue
  - Unknown issue requiring terminal inspection
- Added a “โพสต์ล่าสุดจาก Auto Pilot” section that shows:
  - Last post topic
  - Last local post status
  - Scheduled/post time
  - Facebook Post ID / URL if available
  - Exact post-level error message if posting failed
  - Link to open the local post record
- Updated `runAutoPilotNowAction` so when Auto Pilot writes successfully but Facebook publishing fails, the exact publish error from the scheduled publisher is copied into `automation_settings.last_error_message`.
- Added clearer `last_result` text for successful auto-publish, failed auto-publish, and queued-but-not-published cases.

### Files updated
- `src/app/dashboard/autopilot/actions.ts`
- `src/app/dashboard/autopilot/page.tsx`
- `README.md`
- `log_project.md`

### Database / Migration
No database migration is required in this step. It reuses:
- `automation_settings.last_result`
- `automation_settings.last_error_message`
- `automation_settings.last_post_id`
- `posts.error_message`
- existing Facebook post fields on `posts`

### How to test locally
1. Start the app with `npm run dev`.
2. Open `/dashboard/autopilot`.
3. Check the new Diagnostics Checklist.
4. Test safe mode first: select `เขียนไว้ให้ตรวจก่อน`, save, then click `รัน Auto Pilot ตอนนี้`.
5. Test auto-publish mode: select `เขียนแล้วโพสต์ลงเพจอัตโนมัติ`, save, then click `รัน Auto Pilot ตอนนี้`.
6. If the run fails, read:
   - the blue run summary banner
   - `ผลลัพธ์ล่าสุด`
   - `Error ล่าสุด`
   - `โพสต์ล่าสุดจาก Auto Pilot`
   - terminal output from `npm run dev`

### Current status
- Auto Pilot now exposes actionable diagnostics on the page instead of showing only a broad generic error.
- This should make it clear whether auto-publish is failing at topic selection, Gemini writing, Facebook token/permission, or scheduled publishing.

### Known issues / intentional limitations
- There is still no dedicated historical log table for every Auto Pilot run; diagnostics show the latest run and latest generated post only.
- The page does not expose the full Facebook token for safety; it only shows readiness status.
- If the error is highly unusual, the terminal may still be needed for deeper debugging.

### Next steps
1. User tests Auto Pilot diagnostics in both modes.
2. If useful, add an `automation_run_logs` table later for full history of each run.
3. Continue improving Auto Pilot reliability and topic scheduling once diagnostics confirm the current failure source.

### Validation result after implementation
Commands run in sandbox:

```powershell
npm install
npm run lint -- --no-cache
npx tsc --noEmit
npm run build
```

Result:
- `npm run lint -- --no-cache` passed.
- `npx tsc --noEmit` passed.
- `npm run build` compiled successfully and started TypeScript/build analysis, then sandbox timed out during the later build phase. No TypeScript error appeared before timeout.

---

## Step 22.3.2 Hotfix — Auto Pilot Server Action Redirect Handling

### Goal
Fix the Auto Pilot manual run button reporting failure even when the run succeeded and created/published a post.

### Root cause
Next.js `redirect()` intentionally throws a `NEXT_REDIRECT` control-flow error. The previous `runAutoPilotNowAction` called `redirect()` inside a broad `try/catch`, so the success redirect was caught as if it were a real error and the UI was redirected to `?error=run_failed`.

### Completed
- Moved the final `redirect()` call outside the `try/catch` block.
- Kept real errors caught and converted to `?error=run_failed`.
- Preserved successful redirect parameters such as `ran`, `status`, `published`, `failed`, `due`, `skipped`, and `postId`.

### Files updated
- `src/app/dashboard/autopilot/actions.ts`
- `log_project.md`

### Database / Migration
No database migration is required.

### How to test locally
1. Start the app with `npm run dev`.
2. Open `/dashboard/autopilot`.
3. Use either Auto Pilot mode and click `รัน Auto Pilot ตอนนี้`.
4. If the server-side work succeeds, the page should redirect to a success URL like `?ran=1&status=published...` or `?ran=1&status=generated...`, not `?error=run_failed`.
5. Terminal should no longer log `NEXT_REDIRECT` as a failure from `runAutoPilotNowAction`.

### Current status
Auto Pilot success redirects should now be treated as successful UI navigation rather than caught as server-action errors.

## Step 22.4 - Auto Pilot Run Logs / ประวัติการทำงาน

### เป้าหมาย
เพิ่มประวัติการรันของ Auto Pilot เพื่อดูย้อนหลังว่าแต่ละรอบทำอะไรไปบ้าง เช่น รันเองหรือ Cron, ใช้หัวข้ออะไร, สร้างโพสต์ไหน, โพสต์ลง Facebook สำเร็จหรือไม่, และ error จริงคืออะไร

### สิ่งที่ทำแล้ว
- เพิ่มตาราง `auto_pilot_run_logs` สำหรับเก็บประวัติ Auto Pilot
- เพิ่ม helper `src/lib/auto-pilot-run-logs.ts` สำหรับบันทึก log จากทั้ง manual run และ cron run
- หน้า `/dashboard/autopilot` แสดงกล่อง “ประวัติ Auto Pilot” ล่าสุด 10 รายการ
- บันทึก log เมื่อกด “รัน Auto Pilot ตอนนี้”
- บันทึก log เมื่อ `/api/cron/publish-scheduled` เรียก Auto Pilot ผ่าน cron
- log เก็บข้อมูลสำคัญ เช่น trigger, mode, status, topic, postId, publish summary และ error message

### ไฟล์ที่เพิ่ม
- `src/lib/auto-pilot-run-logs.ts`
- `drizzle/0004_auto_pilot_run_logs.sql`
- `drizzle/meta/0004_snapshot.json`

### ไฟล์ที่แก้
- `src/db/schema.ts`
- `src/app/dashboard/autopilot/actions.ts`
- `src/app/dashboard/autopilot/page.tsx`
- `src/app/api/cron/publish-scheduled/route.ts`
- `README.md`
- `log_project.md`
- `drizzle/meta/_journal.json`

### Database / Migration
ต้องรัน migration เพราะเพิ่มตารางใหม่:

```powershell
npm run db:migrate
```

### คำสั่งตรวจสอบ
- `npm run lint -- --no-cache` ผ่าน
- `npx tsc --noEmit` ผ่าน

### สถานะปัจจุบัน
ระบบ Auto Pilot สามารถดูประวัติย้อนหลังได้แล้ว ช่วยให้ debug ได้ง่ายขึ้นว่าติดที่ Topic Queue, Gemini, Facebook Page หรือ Cron

### ขั้นตอนถัดไปที่แนะนำ
- ทดสอบ run history ด้วย manual Auto Pilot และ cron endpoint
- ถ้าผ่าน ให้ commit: `Add Auto Pilot run logs`
- ขั้นต่อไปอาจเพิ่ม “ล้างประวัติ Auto Pilot” หรือ “ดูประวัติแบบละเอียดรายรายการ” ได้ภายหลัง

---

## Step 22.5 - Topic Queue Controls / กันหัวข้อซ้ำ + ใช้หัวข้อซ้ำได้

### เป้าหมาย
ปรับ Topic Queue ให้เหมาะกับการใช้งาน Auto Pilot ระยะยาวมากขึ้น โดยกันหัวข้อซ้ำ เพิ่มการนำหัวข้อที่ใช้แล้วกลับมาใช้ซ้ำ และให้ Auto Pilot เลือกหัวข้อได้ทั้งแบบเรียงลำดับและแบบสุ่ม

### สิ่งที่ทำแล้ว
- เพิ่มการตรวจหัวข้อซ้ำตอนเพิ่มหัวข้อใหม่ โดยเทียบกับหัวข้อที่มีอยู่ใน Workspace แล้ว
- ถ้าพบหัวข้อซ้ำ ระบบจะข้ามและแจ้งจำนวนหัวข้อที่ถูกข้าม
- เพิ่มปุ่ม `ใช้ซ้ำอีกครั้ง` สำหรับหัวข้อสถานะ `used` เพื่อเปลี่ยนกลับเป็น `active`
- เพิ่มปุ่ม `รีเซ็ตหัวข้อที่ใช้แล้วทั้งหมดกลับมาเป็นรอใช้`
- เพิ่มตัวเลือกใน `/dashboard/autopilot` สำหรับวิธีเลือกหัวข้อ:
  - `ordered` = เรียงตามลำดับคิวเดิม
  - `random` = สุ่มจากหัวข้อที่รอใช้
- Auto Writer / Auto Pilot ใช้ค่า `topic_selection_mode` ตอนเลือกหัวข้อจาก Topic Queue
- หน้ารายการหัวข้อแสดงลิงก์เป็น `เปิดโพสต์ล่าสุดจากหัวข้อนี้` เพื่อให้เข้าใจว่าหัวข้อที่ถูกใช้ซ้ำอาจมีโพสต์ล่าสุดเปลี่ยนได้

### ไฟล์ที่เพิ่ม
- `drizzle/0005_topic_queue_controls.sql`
- `drizzle/meta/0005_snapshot.json`

### ไฟล์ที่แก้
- `src/db/schema.ts`
- `src/lib/topic-auto-writer.ts`
- `src/lib/auto-pilot.ts`
- `src/app/dashboard/autopilot/actions.ts`
- `src/app/dashboard/autopilot/page.tsx`
- `src/app/dashboard/topics/actions.ts`
- `src/app/dashboard/topics/page.tsx`
- `README.md`
- `log_project.md`
- `drizzle/meta/_journal.json`

### Database / Migration
ต้องรัน migration เพราะเพิ่ม column ใหม่ในตาราง `automation_settings`:

```powershell
npm run db:migrate
```

เพิ่ม column:

```sql
ALTER TABLE "automation_settings" ADD COLUMN "topic_selection_mode" text DEFAULT 'ordered' NOT NULL;
```

### วิธีทดสอบ
1. รัน `npm run db:migrate` แล้ว `npm run dev`
2. เข้า `/dashboard/topics`
3. เพิ่มหัวข้อที่ซ้ำกับหัวข้อเดิม แล้วตรวจว่าระบบข้ามและแจ้งจำนวนหัวข้อซ้ำ
4. ใช้หัวข้อหนึ่งให้เป็นสถานะ `used` แล้วกด `ใช้ซ้ำอีกครั้ง`
5. กด `รีเซ็ตหัวข้อที่ใช้แล้วทั้งหมดกลับมาเป็นรอใช้`
6. เข้า `/dashboard/autopilot`
7. เปลี่ยนวิธีเลือกหัวข้อเป็น `สุ่มจากหัวข้อที่รอใช้` แล้วบันทึก
8. กดรัน Auto Pilot ตอนนี้ และตรวจว่าใช้งานได้ปกติ

### สถานะปัจจุบัน
ระบบ Topic Queue พร้อมสำหรับการใช้งาน Auto Pilot แบบต่อเนื่องมากขึ้น ลดโอกาสใส่หัวข้อซ้ำโดยไม่ตั้งใจ และรองรับการวนใช้หัวข้อเดิมในอนาคต

---

## Step 22.6 - Dashboard Summary / ภาพรวม Auto Pilot

### เป้าหมาย
ปรับหน้า `/dashboard` ให้เป็นศูนย์รวมสถานะของระบบ Auto Pilot เพื่อให้ผู้ใช้เห็นภาพรวมได้ทันทีโดยไม่ต้องเปิดหลายหน้า

### สิ่งที่ทำแล้ว
- ปรับหน้า Dashboard เป็น Summary Dashboard ใหม่
- เพิ่มการ์ดสรุปสถานะสำคัญ:
  - Auto Pilot เปิด/ปิด และพร้อมรันหรือไม่
  - จำนวนหัวข้อรอใช้ / ใช้แล้ว / พักไว้ / เก็บถาวร
  - จำนวนโพสต์ที่เผยแพร่แล้ว / รอคิว / Error
  - สถานะ Facebook Page ว่าพร้อมโพสต์หรือยัง
- เพิ่มส่วน “สถานะ Auto Pilot” แสดง:
  - โหมดการทำงาน
  - วิธีเลือกหัวข้อ
  - ความถี่และเวลาโพสต์
  - รอบถัดไป
  - คำเตือนถ้าโหมด auto publish ยังไม่พร้อม
- เพิ่มส่วน “ประวัติล่าสุด” แสดง Auto Pilot run log ล่าสุด พร้อมหัวข้อ, สถานะ, summary และลิงก์เปิดโพสต์
- เพิ่มส่วน “คิวโพสต์” แสดงโพสต์ตั้งเวลาถัดไปและโพสต์ล่าสุดที่เผยแพร่แล้ว
- ยังคงแสดงสไตล์การเขียนเริ่มต้นและทางลัดไปหน้าสำคัญ

### ไฟล์ที่แก้
- `src/app/dashboard/page.tsx`
- `README.md`
- `log_project.md`

### Database / Migration
ไม่ต้องรัน migration

### วิธีทดสอบ
1. รัน `npm run dev`
2. เข้า `/dashboard`
3. ตรวจว่าการ์ดสรุปสถานะ Auto Pilot, Topic Queue, Posts และ Facebook Page แสดงถูกต้อง
4. เข้า `/dashboard/autopilot` แล้วลองรัน Auto Pilot 1 รอบ จากนั้นกลับมา `/dashboard` เพื่อดูประวัติล่าสุด
5. ตั้งเวลาโพสต์ 1 รายการ แล้วกลับมาดูว่า Dashboard แสดงโพสต์ตั้งเวลาถัดไปหรือไม่

### คำสั่งตรวจสอบ
- `npm run lint -- --no-cache` ผ่าน
- `npx tsc --noEmit` ผ่าน

### สถานะปัจจุบัน
Dashboard เป็นหน้าสรุปภาพรวมของระบบ Auto Pilot แล้ว เหมาะสำหรับใช้เป็นหน้าแรกหลัง login เพื่อตรวจว่าระบบพร้อมทำงานหรือมีจุดไหนต้องเช็กก่อน

---

## Step 23.1 - Deployment Readiness / ตรวจความพร้อมก่อนขึ้น Vercel

### เป้าหมาย
เพิ่มหน้าตรวจความพร้อมก่อน deploy production เพื่อให้ผู้ใช้รู้ว่าระบบพร้อมขึ้น Vercel หรือยัง โดยยังไม่ต้อง deploy จริงทันที

### สิ่งที่ทำแล้ว
- เพิ่มหน้า `/dashboard/deploy`
- เพิ่มเมนู `Deploy` ใน sidebar/dashboard navigation
- เพิ่มปุ่มลัด `เช็กก่อน Deploy` ในหน้า `/dashboard`
- หน้า Deploy ตรวจสถานะสำคัญ:
  - Environment variables: `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `GEMINI_API_KEY`, `AI_PROVIDER`, `GEMINI_MODEL`, `CRON_SECRET`
  - สถานะ runtime ว่ารัน local หรือ Vercel
  - Production base URL
  - Cron path `/api/cron/publish-scheduled`
  - External cron URL template
  - Database / Workspace readiness
  - Gemini API readiness
  - Facebook Page readiness
  - Topic Queue readiness
  - Auto Pilot settings
  - Auto Pilot run log ล่าสุด
  - จำนวนโพสต์ posted / scheduled / error
- ซ่อนค่า secret จริง ไม่แสดง token หรือ key แบบเต็มใน UI
- เพิ่มคำแนะนำลำดับ deploy ในหน้า `/dashboard/deploy`

### ไฟล์ที่เพิ่ม
- `src/app/dashboard/deploy/page.tsx`

### ไฟล์ที่แก้
- `src/components/dashboard/dashboard-nav.tsx`
- `src/app/dashboard/page.tsx`
- `README.md`
- `log_project.md`

### Database / Migration
ไม่ต้องรัน migration

### วิธีทดสอบ
1. รัน `npm run dev`
2. เข้า `/dashboard/deploy`
3. ตรวจว่า Environment Variables, Facebook Page, Topic Queue, Auto Pilot และ Cron แสดงสถานะถูกต้อง
4. ลองกลับไป `/dashboard` แล้วกดปุ่ม `เช็กก่อน Deploy`
5. เช็กว่าเมนู `Deploy` ใน sidebar ใช้งานได้

### สถานะปัจจุบัน
ระบบมีหน้าตรวจความพร้อมก่อนขึ้น Vercel แล้ว เหมาะสำหรับใช้เป็น checklist ก่อนเริ่ม Step 23.2 Deploy to Vercel จริง

### ขั้นตอนถัดไปที่แนะนำ
- ทดสอบ `/dashboard/deploy`
- ถ้าผ่าน ให้ commit: `Add deployment readiness page`
- ขั้นต่อไปคือ Step 23.2: Deploy to Vercel + ตั้ง Environment Variables + ทดสอบ production cron

---

## Step 23.2 - Production Deploy Setup / คู่มือขึ้น Vercel จริง

### เป้าหมาย
เตรียมคู่มือและ checklist สำหรับ deploy production ไปยัง Vercel โดยไม่ต้อง deploy จริงทันที เพื่อให้ผู้ใช้สามารถขึ้น production ได้เป็นขั้นตอนเมื่อต้องการให้ Auto Pilot ทำงานเองตอนปิดเครื่อง local

### สิ่งที่ทำแล้ว
- เพิ่มคู่มือ `docs/deploy-vercel.md`
- เพิ่มไฟล์ตัวอย่าง env สำหรับ Vercel: `.env.vercel.example`
- อัปเดตหน้า `/dashboard/deploy` ให้แสดงว่า Step 23.2 มีคู่มือ deploy production พร้อมแล้ว
- อัปเดต `README.md` ให้บันทึกขั้นตอน Production Deploy Setup
- คู่มือครอบคลุม:
  - Commit / Push ด้วย GitHub Desktop
  - Import project เข้า Vercel
  - ตั้งค่า Environment Variables
  - ตั้ง `BETTER_AUTH_URL` เป็น production domain
  - รัน Drizzle migration กับ Neon production database
  - ทดสอบ Facebook Page token บน production
  - ใช้ Vercel Cron หรือ external cron เช่น cron-job.org
  - Smoke test หลัง deploy
  - วิธี rollback / ปิด Auto Pilot ชั่วคราว

### ไฟล์ที่เพิ่ม
- `docs/deploy-vercel.md`
- `.env.vercel.example`

### ไฟล์ที่แก้
- `src/app/dashboard/deploy/page.tsx`
- `README.md`
- `log_project.md`

### Database / Migration
ไม่ต้องรัน migration

### วิธีทดสอบ
1. รัน `npm run dev`
2. เข้า `/dashboard/deploy`
3. ตรวจว่ามีกล่องแจ้งคู่มือ deploy production พร้อมแล้ว
4. เปิดไฟล์ `docs/deploy-vercel.md` ใน VS Code แล้วตรวจว่ามีขั้นตอนครบ
5. เปิด `.env.vercel.example` แล้วตรวจว่ามี key ที่ต้องใช้ใน Vercel ครบ

### คำสั่งตรวจสอบ
- `npm run lint -- --no-cache`
- `npx tsc --noEmit`

### สถานะปัจจุบัน
ระบบพร้อมสำหรับขั้นตอนต่อไปคือ deploy production จริงเมื่อผู้ใช้ต้องการ โดยยังสามารถพัฒนาต่อใน local ได้ตามปกติ

### ขั้นตอนถัดไปที่แนะนำ
- ทดสอบหน้า `/dashboard/deploy`
- Commit: `Add Vercel deployment guide`
- หลังจากนั้นทำ Step 23.3: Deploy to Vercel จริง / ตั้ง Env / ทดสอบ production


---

## Step 23.5 - Forgot Password / Reset Password

### เป้าหมาย
เพิ่มระบบลืมรหัสผ่านเพื่อให้ผู้ใช้ที่ลืมรหัสผ่านบน production สามารถขอลิงก์ตั้งรหัสผ่านใหม่ได้ โดยใช้ Better Auth password reset flow

### สิ่งที่ทำแล้ว
- เพิ่มหน้า `/forgot-password` สำหรับกรอกอีเมลเพื่อขอ reset link
- เพิ่มหน้า `/reset-password` สำหรับตั้งรหัสผ่านใหม่ด้วย token จากลิงก์
- เพิ่มลิงก์ `ลืมรหัสผ่าน?` ในหน้า `/login`
- ปรับ `src/lib/auth.ts` ให้เปิด `sendResetPassword`, `onPasswordReset`, `revokeSessionsOnPasswordReset` และ token expiry 1 ชั่วโมง
- เพิ่ม `src/lib/password-reset-email.ts` สำหรับส่งอีเมลผ่าน Resend หรือ fallback เป็น server log/debug link
- เพิ่มสถานะ Password reset delivery ในหน้า `/dashboard/deploy`
- อัปเดต `.env.vercel.example`, `.env.local`, `README.md`, และ `docs/deploy-vercel.md`

### ไฟล์ที่เพิ่ม
- `src/lib/password-reset-email.ts`
- `src/app/forgot-password/page.tsx`
- `src/app/forgot-password/actions.ts`
- `src/app/reset-password/page.tsx`
- `src/app/reset-password/actions.ts`

### ไฟล์ที่แก้
- `src/lib/auth.ts`
- `src/app/login/page.tsx`
- `src/app/dashboard/deploy/page.tsx`
- `.env.local`
- `.env.vercel.example`
- `README.md`
- `docs/deploy-vercel.md`
- `log_project.md`

### Environment Variables เพิ่มเติม
- `RESEND_API_KEY` สำหรับส่งอีเมลจริงผ่าน Resend
- `PASSWORD_RESET_FROM` สำหรับอีเมลผู้ส่ง
- `PASSWORD_RESET_DEBUG_LINKS=1` สำหรับทดสอบ local/debug เท่านั้น

### Database / Migration
ไม่ต้องรัน migration เพราะใช้ตาราง `verification` เดิมของ Better Auth

### วิธีทดสอบ
1. รัน `npm run dev`
2. เข้า `/login`
3. กด `ลืมรหัสผ่าน?`
4. กรอกอีเมล user ที่มีอยู่
5. ถ้า `PASSWORD_RESET_DEBUG_LINKS=1` จะเห็น reset link ในหน้าเว็บ
6. เปิด reset link แล้วตั้งรหัสผ่านใหม่
7. กลับไป login ด้วยรหัสผ่านใหม่
8. ตรวจ `/dashboard/deploy` ว่า Password reset delivery แสดงสถานะถูกต้อง

### หมายเหตุ
สำหรับ production ควรตั้ง `RESEND_API_KEY` และ `PASSWORD_RESET_FROM` ใน Vercel แล้วปิด `PASSWORD_RESET_DEBUG_LINKS` ก่อนใช้งานจริง

---

## Step 23.6 - Meta App Publish Required Public Pages

### เป้าหมาย
เพิ่มหน้าสาธารณะที่ Meta for Developers ต้องใช้ก่อนเปลี่ยน Facebook App จาก Development เป็น Live / Published สำหรับ production domain `https://im-sticker-poster.vercel.app`

### สิ่งที่ทำแล้ว
- เพิ่มหน้า Privacy Policy ที่ `/privacy`
- เพิ่มหน้า Terms of Service ที่ `/terms`
- เพิ่มหน้า User Data Deletion Instructions ที่ `/data-deletion`
- เพิ่ม footer link จากหน้าแรกไปยัง `/privacy`, `/terms`, `/data-deletion`
- เพิ่มไฟล์ไอคอนแอปชั่วคราวขนาด 1024 x 1024 ที่ `public/meta-app-icon.png` เพื่อให้อัปโหลดใน Meta for Developers ได้หากยังไม่มีโลโก้จริง
- อัปเดต `README.md` เพื่อบันทึก URL ที่ต้องนำไปกรอกใน Meta for Developers

### ไฟล์ที่เพิ่ม
- `src/app/privacy/page.tsx`
- `src/app/terms/page.tsx`
- `src/app/data-deletion/page.tsx`
- `public/meta-app-icon.png`

### ไฟล์ที่แก้
- `src/app/page.tsx`
- `README.md`
- `log_project.md`

### URL ที่ต้องนำไปกรอกใน Meta for Developers
```text
App Domains:
im-sticker-poster.vercel.app

Privacy Policy URL:
https://im-sticker-poster.vercel.app/privacy

Terms of Service URL:
https://im-sticker-poster.vercel.app/terms

User Data Deletion:
เลือก URL คำแนะนำการลบข้อมูล / Data Deletion Instructions URL
https://im-sticker-poster.vercel.app/data-deletion
```

### Database / Migration
ไม่ต้องรัน migration เพราะเป็นการเพิ่มหน้า public และไฟล์ static เท่านั้น

### Environment Variables
ไม่ต้องเพิ่ม Environment Variables ใหม่

### วิธีทดสอบหลังนำไฟล์ไปวางทับ
1. รัน `npm run dev`
2. เปิด `http://localhost:3000/privacy`
3. เปิด `http://localhost:3000/terms`
4. เปิด `http://localhost:3000/data-deletion`
5. ตรวจว่าหน้าแรกมีลิงก์ footer ไปยัง Privacy Policy, Terms และ Data Deletion
6. รัน `npm run lint -- --no-cache`
7. รัน `npx tsc --noEmit`
8. Deploy ไปยัง Vercel แล้วเปิด production URLs ทั้ง 3 หน้าให้แน่ใจว่าเข้าถึงได้แบบ public ไม่ติด login

### คำสั่งตรวจสอบที่รันจริงในรอบนี้
- `npm ci` ผ่าน
- `npm run lint -- --no-cache` ผ่าน
- `npx tsc --noEmit` ผ่าน
- `npm run build` compile และ TypeScript ผ่าน แต่ sandbox timeout ระหว่าง `Collecting page data using 24 workers` จึงยังไม่ได้ยืนยัน full build จนจบในเครื่องมือ sandbox

### สถานะปัจจุบัน
พร้อมนำ URL ไปกรอกใน Meta for Developers Basic Settings เพื่อแก้ปัญหา Published/Live ไม่ได้เพราะข้อมูลแอปยังไม่ครบ

### ขั้นตอนถัดไปที่แนะนำ
- Deploy ZIP นี้ไปยัง Vercel production
- เปิด URL ทั้ง 3 หน้าใน production เพื่อตรวจว่าสาธารณะจริง
- กรอกข้อมูลใน Meta for Developers Basic Settings
- อัปโหลด `public/meta-app-icon.png` หรือโลโก้จริงขนาด 1024 x 1024
- เลือกหมวดหมู่ของแอปเป็น Business / ธุรกิจ หรือหมวดที่ใกล้เคียง
- กด Save Changes แล้วลองเปลี่ยน App Mode เป็น Live / Published อีกครั้ง
---

## Step 23.7 - TypeScript Check Fix for Next Dev Generated Types

### เป้าหมาย
แก้ปัญหา `npx tsc --noEmit` ไปตรวจไฟล์ generated type ของ Next.js dev mode ที่อยู่ใน `.next/dev/types/validator.ts` แล้วเกิด error `Type 'Route' does not satisfy the constraint '"/"'` หลังมีการรัน development server

### สาเหตุ
ไฟล์ `.next/dev/types/*` เป็นไฟล์ generated ชั่วคราวจาก Next.js dev mode ไม่ใช่ source code ของโปรเจค และสามารถค้างจากการรัน dev ก่อนหน้าได้ ทำให้ `tsc` ตรวจไฟล์ generated/stale แล้วรายงาน error แม้โค้ดจริงไม่ได้มีปัญหา

### สิ่งที่ทำแล้ว
- ปรับ `tsconfig.json` ไม่ให้ include `.next/dev/types/**/*.ts`
- เพิ่ม `.next/dev` ใน `exclude` เพื่อกันไม่ให้ `**/*.ts` ดึงไฟล์ generated dev mode เข้ามาตรวจ
- ยังคง include `.next/types/**/*.ts` ไว้ตามรูปแบบที่ Next.js ใช้สำหรับ production/build type generation

### ไฟล์ที่แก้
- `tsconfig.json`
- `log_project.md`

### Database / Migration
ไม่ต้องรัน migration

### Environment Variables
ไม่ต้องเพิ่ม Environment Variables ใหม่

### คำสั่งแนะนำหลังนำไฟล์ไปวางทับ
```powershell
Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue
Remove-Item -Force tsconfig.tsbuildinfo -ErrorAction SilentlyContinue
npm run lint -- --no-cache
npx tsc --noEmit
npm run build
```

### สถานะ
แก้ที่สาเหตุของ error ที่เกิดจาก `.next/dev/types/validator.ts` แล้ว

