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
      "schedule": "*/10 * * * *"
    }
  ]
}
```

This asks Vercel to call the scheduled publisher every 10 minutes. If `CRON_SECRET` is set in Vercel, Vercel will send it as an Authorization header automatically.

## External cron option

If the current Vercel plan or project settings are not suitable for frequent cron checks, an external cron service can call:

```text
https://YOUR_DOMAIN/api/cron/publish-scheduled?secret=YOUR_CRON_SECRET
```

Use every 10 minutes for normal testing. The publisher already prevents duplicate posting by claiming a scheduled post before it sends it to Facebook.

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
