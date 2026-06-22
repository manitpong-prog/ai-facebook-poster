# AI Facebook Poster

AI Facebook Poster is a Next.js dashboard for drafting Thai Facebook posts with Gemini, previewing/editing the copy, publishing to a Facebook Page, and scheduling posts.

## Local development

```powershell
npm install
npm run dev
```

Open:

```text
http://localhost:3000
```

## Environment variables

The app uses `.env.local` during local development.

Important variables:

```text
DATABASE_URL=...
BETTER_AUTH_SECRET=...
BETTER_AUTH_URL=http://localhost:3000
GEMINI_API_KEY=...
AI_PROVIDER=gemini
GEMINI_MODEL=gemini-3.1-flash-lite
CRON_SECRET=
```

`CRON_SECRET` can stay empty for local development. In production, set a long random value in Vercel before enabling an automatic scheduler.

## Scheduled publishing

Manual local test endpoint:

```text
http://localhost:3000/api/cron/publish-scheduled
```

In local development, this endpoint works without `CRON_SECRET` so it is easy to test manually.

In production, the endpoint requires one of these:

```text
Authorization: Bearer <CRON_SECRET>
```

or:

```text
/api/cron/publish-scheduled?secret=<CRON_SECRET>
```

## Vercel Cron

The project includes `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/publish-scheduled",
      "schedule": "0 3 * * *"
    }
  ]
}
```

This asks Vercel to call the scheduled publisher once per day. `0 3 * * *` is 03:00 UTC, around 10:00 Thailand time. This schedule fits Vercel Hobby limits. If `CRON_SECRET` is set in Vercel, Vercel will send it as an Authorization header automatically.

## External cron option

If the current Vercel plan or project settings are not suitable for frequent cron checks, an external cron service can call:

```text
https://YOUR_DOMAIN/api/cron/publish-scheduled?secret=YOUR_CRON_SECRET
```

Use every 10 minutes only if you use an external cron service or a Vercel plan that supports frequent cron checks. The publisher already prevents duplicate posting by claiming a scheduled post before it sends it to Facebook.

## Topic Queue

The dashboard includes a Topic Queue page:

```text
/dashboard/topics
```

Use this page to paste many future post ideas, one topic per line. Each topic can be kept active, paused, archived, converted into a Draft manually, or sent to Auto Writer.

The Auto Writer button selects the next active topic, asks Gemini to write the post, saves the generated Preview, and marks the topic as used. This is the foundation for fully automated content publishing.

## Database migrations

Run only when schema changes:

```powershell
npm run db:generate
npm run db:migrate
```

Step 22.1 adds a migration for the new `content_topics` table. Step 22.2 does not add a new migration. After extracting this ZIP, run:

```powershell
npm install
npm run db:migrate
npm run dev
```

## Auto Pilot

The dashboard includes an Auto Pilot page:

```text
/dashboard/autopilot
```

Use this page to control automatic content generation from Topic Queue.

Available modes:

```text
draft_only   = pick the next active topic and let Gemini write it, then keep it for review
auto_publish = pick the next active topic, let Gemini write it, schedule it immediately, then the cron publisher posts it to Facebook
```

The scheduler uses Thailand time (`Asia/Bangkok`). Supported frequencies are every 1, 2, 3, or 7 days.

The cron endpoint now performs two jobs in one run:

```text
1. Run Auto Pilot jobs that are due
2. Publish scheduled posts that are due
```

Local manual test:

```text
http://localhost:3000/api/cron/publish-scheduled
```

To run only scheduled publishing and skip Auto Pilot:

```text
http://localhost:3000/api/cron/publish-scheduled?skipAutoPilot=1
```

Step 22.3 adds a migration for the new `automation_settings` table. After extracting this ZIP, run:

```powershell
npm install
npm run db:migrate
npm run dev
```

## Delete buttons on list pages

The Posts and Topic Queue overview pages include direct delete buttons:

```text
/dashboard/posts
/dashboard/topics
```

Behavior:

```text
Posts: delete removes the local app post record. If the post was already published to Facebook, the Facebook post remains on the Page.
Topics: delete removes the topic queue item only. It does not delete a post that was already generated from that topic.
```

Posts currently in `posting` status are protected from deletion to avoid deleting a record while a publish attempt is running.

## Auto Pilot diagnostics

Step 22.3.2 improves `/dashboard/autopilot` so failed runs are easier to debug.

The page now shows:

```text
- Topic Queue readiness
- Gemini API readiness and current model
- Facebook Page / Page Access Token readiness
- Latest Auto Pilot result
- Latest Auto Pilot error
- Latest post created by Auto Pilot
- Exact post-level Facebook publish error if available
- Cron summary: due / published / failed / skipped
```

When auto-publish fails, read these areas in order:

```text
1. Blue run result banner at the top
2. สถานะล่าสุด
3. Error ล่าสุด
4. Diagnostics Checklist
5. โพสต์ล่าสุดจาก Auto Pilot
6. Terminal output from npm run dev
```

No migration is required for Step 22.3.2.


## Step 22.4 - Auto Pilot Run Logs

Auto Pilot มีประวัติการรันย้อนหลังในหน้า `/dashboard/autopilot` แล้ว

สิ่งที่เพิ่ม:

- ตาราง `auto_pilot_run_logs` สำหรับเก็บประวัติการรัน
- บันทึก log จากทั้งการกดรันเองและ cron endpoint
- แสดงผลล่าสุด 10 รายการในหน้า Auto Pilot
- ดูได้ว่าแต่ละรอบใช้หัวข้ออะไร สร้างโพสต์ไหน โพสต์สำเร็จหรือไม่ และ error คืออะไร

หลังแตก ZIP รอบนี้ต้องรัน migration:

```powershell
npm run db:migrate
```

## Step 22.5 - Topic Queue Controls

Topic Queue มีเครื่องมือควบคุมหัวข้อเพิ่มแล้ว:

- กันเพิ่มหัวข้อซ้ำกับหัวข้อที่มีอยู่ในคลังแล้ว
- ปุ่ม `ใช้ซ้ำอีกครั้ง` สำหรับหัวข้อที่ถูกใช้แล้ว
- ปุ่มรีเซ็ตหัวข้อที่ใช้แล้วทั้งหมดกลับมาเป็นสถานะ `รอใช้`
- Auto Pilot เลือกหัวข้อได้ 2 แบบ: `เรียงตามลำดับคิว` หรือ `สุ่มจากหัวข้อที่รอใช้`
- หัวข้อยังแสดงลิงก์ไปยังโพสต์ล่าสุดที่สร้างจากหัวข้อนั้น

หลังแตก ZIP รอบนี้ต้องรัน migration เพราะเพิ่ม column ใหม่ใน `automation_settings`:

```powershell
npm run db:migrate
```

## Step 22.6 - Dashboard Summary

หน้า `/dashboard` ถูกปรับให้เป็นหน้ารวมสถานะ Auto Pilot แล้ว โดยแสดง:

- Auto Pilot เปิด/ปิด และพร้อมรันหรือไม่
- จำนวนหัวข้อใน Topic Queue แยกตามสถานะ
- จำนวนโพสต์ที่ posted / scheduled / error
- สถานะ Facebook Page ว่าพร้อมโพสต์หรือยัง
- โหมด Auto Pilot, วิธีเลือกหัวข้อ, ความถี่, เวลาโพสต์ และรอบถัดไป
- Auto Pilot run log ล่าสุด พร้อมลิงก์เปิดโพสต์
- โพสต์ตั้งเวลาถัดไป และโพสต์ล่าสุดที่เผยแพร่แล้ว

รอบนี้ไม่ต้องรัน migration เพิ่ม

## Deployment readiness

Step 23.1 adds a deployment readiness page:

```text
/dashboard/deploy
```

Use this page before deploying to Vercel. It checks:

```text
- DATABASE_URL
- BETTER_AUTH_SECRET
- BETTER_AUTH_URL
- GEMINI_API_KEY
- AI_PROVIDER
- GEMINI_MODEL
- CRON_SECRET
- Facebook Page connection
- Topic Queue readiness
- Auto Pilot status
- Cron endpoint path
- Latest Auto Pilot run log
```

The page does not reveal secret values. It only shows whether each variable is configured and gives safe masked status information.

Recommended deployment flow:

```text
1. Commit and push the latest code
2. Set Vercel Environment Variables
3. Run database migrations against Neon if needed
4. Deploy to Vercel
5. Open /dashboard/deploy on production
6. Test Facebook Page and Auto Pilot
7. Enable Auto Pilot auto_publish only after all checks pass
```

## Step 23.2 - Production Deploy Setup

เพิ่มคู่มือเตรียม deploy production แล้ว:

```text
docs/deploy-vercel.md
.env.vercel.example
```

สิ่งที่คู่มือครอบคลุม:

```text
- การ commit/push ด้วย GitHub Desktop
- การ import project เข้า Vercel
- รายการ Environment Variables ที่ต้องตั้งใน Vercel
- การตั้ง BETTER_AUTH_URL เป็น production domain
- การรัน Drizzle migrations กับ Neon production database
- การทดสอบ Facebook Page token บน production
- การใช้ Vercel Cron หรือ external cron เช่น cron-job.org
- Smoke test หลัง deploy
- วิธีปิด Auto Pilot หรือ rollback ชั่วคราว
```

หลังแตก ZIP รอบนี้ไม่ต้องรัน migration เพราะเป็นเอกสารและ checklist สำหรับ deploy เท่านั้น


## Forgot Password / Reset Password

The app includes password reset pages:

```text
/forgot-password
/reset-password
```

Login page now includes a `ลืมรหัสผ่าน?` link.

Better Auth handles reset tokens. The server sends the reset URL through `sendResetPassword` in `src/lib/auth.ts`.

Email delivery options:

```text
RESEND_API_KEY=...                 # recommended for production email delivery
PASSWORD_RESET_FROM=...            # sender email shown in reset emails
PASSWORD_RESET_DEBUG_LINKS=1       # local/testing only: show reset link on /forgot-password
```

For production, set `RESEND_API_KEY` in Vercel. If it is not set, reset links are written to server logs instead. `PASSWORD_RESET_DEBUG_LINKS=1` is useful for temporary testing but should be turned off before real use.

## Meta App Publish Pages

The app includes public pages required for Meta/Facebook app publishing:

```text
/privacy
/terms
/data-deletion
```

For the production domain, use these URLs in Meta for Developers Basic Settings:

```text
App Domains:
im-sticker-poster.vercel.app

Privacy Policy URL:
https://im-sticker-poster.vercel.app/privacy

Terms of Service URL:
https://im-sticker-poster.vercel.app/terms

User Data Deletion:
Choose URL คำแนะนำการลบข้อมูล / Data Deletion Instructions URL
https://im-sticker-poster.vercel.app/data-deletion
```

A simple 1024 x 1024 app icon is also included at:

```text
public/meta-app-icon.png
```

Upload this file in Meta for Developers if you do not have a final brand icon yet.

## Manual Pantip Source Post

The dashboard includes a manual Pantip posting tool:

```text
/dashboard/pantip
```

Workflow:

```text
1. Paste one Pantip topic URL manually, for example https://pantip.com/topic/12345678
2. Click Create Preview
3. The server creates a temporary screenshot of only the top part of the thread
4. Gemini writes a short Thai teaser caption that links back to the original thread, using the main Writing Style plus the optional Pantip-specific style note on the page
5. Review and edit the caption manually
6. Click Post to Facebook Page
7. The image is uploaded directly to Facebook and is not saved permanently by this app
```

This feature intentionally does not include:

```text
- Random Pantip thread discovery
- Scheduling
- Comment scraping
- Multi-thread selection
- Posting without human review
- Permanent image storage
- Extra database history tables
```

Technical notes:

```text
- Uses the existing Facebook Page token/config from /dashboard/facebook
- Uses the existing GEMINI_API_KEY/GEMINI_MODEL config
- Uses puppeteer-core + @sparticuz/chromium for the temporary server-side screenshot
- If Pantip does not render readable topic content in the headless browser, the app falls back to a generated source card using the topic title/excerpt so the Facebook image is not blank
- No database migration is required
```

If testing screenshot generation locally on Windows fails because Chromium cannot launch, test the feature on Vercel production or set `PUPPETEER_EXECUTABLE_PATH` to a local Chrome/Chromium executable path. This variable is optional and is not required on Vercel when the bundled serverless Chromium works.

### Pantip mobile screenshot behavior

The manual Pantip Source Post flow captures the source preview using a mobile viewport so the image looks closer to reading Pantip on a phone. The app still captures only the top part of the topic, does not scroll into comments, does not store the screenshot in app storage, and keeps the generated fallback card if the real Pantip page does not render clearly in the serverless browser.


### Pantip readable-card fallback and short caption behavior

If the real Pantip mobile screenshot renders as an incomplete page, skeleton, or mostly unreadable content, the app now switches to a generated readable card from the topic title, short excerpt, and source URL. This keeps the Facebook image useful without storing images in the app.

Pantip captions are intentionally short. The caption prompt now treats the extracted short excerpt as the main caption source and avoids long analysis, formal news-style language, and bot-like phrases. If Gemini returns a caption that is too long or too formal, the app falls back to a short caption based on the extracted excerpt plus the original Pantip link.


## Pantip Source Post (current behavior)
- Preview image now uses a readable card built from the Pantip title, short excerpt, and source URL.
- The system no longer depends on a live Pantip webpage screenshot as the main preview image.
- Images remain temporary only and are uploaded directly to Facebook after manual approval.


## Pantip readable card cleanup
- Pantip preview cards now sanitize extracted text to avoid using navigation/footer strings such as Pantip Download App or Pantip Certified Developer.
- Cards use the best Thai title/excerpt candidate from page title/meta/embedded data and fall back to the topic title if the excerpt is not useful.


## Pantip card renderer note
- The Pantip preview card is generated from the extracted topic title and topic detail/excerpt only.
- The card renderer now uses a Thai web font and waits for fonts to load before taking the generated-card screenshot, to avoid missing Thai glyphs in server-rendered images.
- The renderer does not screenshot the live Pantip page.


## News Source Post MVP
- Added `/dashboard/news` as a manual-only RSS news source workflow.
- The user selects an RSS source, loads current items, chooses one story, previews the AI-written Thai caption, edits it, then manually posts to Facebook.
- The feature uses the existing Writing Profile / Writing Style so news posts match the page voice.
- It does not create images/cards, does not use news images, does not run Auto Pilot, and does not publish without manual approval.
- The AI may read/translate the available article text to understand the story, but the Facebook output must be a short Thai summary with source credit and the original link.


## News Source Post RSS categories update
- News Source Post now includes more built-in RSS feeds grouped by category.
- Starter categories include World, Business/Economy, Technology, Science, Health, Entertainment/Culture, Travel, Sport, and Football.
- The News dashboard source selector groups sources by category so the user can choose a more specific feed before loading stories.
- Custom RSS URL remains available for sources that are not hardcoded yet.
- The flow remains manual-only: choose a story, preview the AI caption, edit if needed, and manually publish.


### News Source Post writing modes update

- News Source Post now supports a post mode selector:
  - `เล่าเป็นข่าวแบบเต็มขึ้น` for a fuller rewritten news-style Facebook post.
  - `สรุปสั้น` for quick short updates.
  - `ข่าวกีฬา / ข่าวบอล` for sports/football style updates.
- The AI prompt now explicitly avoids bot-like lead-ins such as `CNN รายงานว่า`, `BBC รายงานว่า`, `The Guardian รายงานว่า`, `มีรายงานว่า`, and `สำนักข่าวรายงานว่า`.
- The generated post should open with the actual news angle immediately, then end with source credit and the original link.
- The feature remains manual-only: user chooses the RSS item, previews/edits the caption, and manually publishes.


## Pantip Source Post strict topic body behavior
- Pantip preview cards now prefer the beginning of the original topic body after the topic title.
- The extractor stops before comment markers such as ความคิดเห็น, แสดงคิดเห็น, ตอบกลับ, ถูกใจ, and สมาชิกหมายเลข.
- Short topic bodies remain short; the system should not fill the card with comments.
- Long topic bodies are truncated from the beginning rather than selecting text from the middle of the topic.


### Pantip topic body extraction note
Pantip card detail now prioritizes `div.display-post-story` as the source of the original topic body before falling back to safer metadata-based extraction. This helps prevent comments, menus, and footer text from appearing in generated cards.
