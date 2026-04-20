# Gather — Daily Check-in App for Christian Fellowship Groups

**Live at:** gatherdaily.app
**Stack:** Next.js 16 · TypeScript · Supabase · Resend · Vercel
**Demo:** demo@gatherdaily.app / gather-demo-2026

---

## What is this?

Gather is a daily pulse-check app built for my Christian fellowship group of about 25 people. We meet weekly but life gets busy — people go through things quietly, struggles go unnoticed, and before long someone has been carrying something alone for weeks without the group knowing.

I wanted to fix that without making it feel like surveillance or a performance tracker. The idea was simple: every day, take less than 60 seconds to check in. Let your community know how you're doing spiritually, emotionally, physically. You choose who sees the details. Others can respond — with encouragement, prayer, or advice — named or anonymously.

The app is live, has 20+ active members, and people are using it daily.

---

## Features

### Daily check-in
- Spiritual life, bible study, prayer life, emotional state, physical state
- Visibility control — share with everyone, specific people, or just one person
- "I'd like someone to reach out" toggle
- Edit check-in anytime during the day
- Check-in times displayed in Toronto timezone

### Home dashboard
- See who checked in today and who hasn't
- Support request banners with member names (respecting visibility rules)
- Streak display per member (🔥 N days)
- Birthday and event reminders within 7 days
- Unread response indicators

### Responses
- Named or anonymous responses on any visible check-in
- Threaded replies to responses
- Email notification when someone responds to your check-in

### Prayer wall
- Post prayer requests visible to the whole group
- 🙏 Praying toggle with count
- Mark as answered → moves to Testimonies section
- Search prayer requests
- Admin can delete any prayer request

### Sermon of the day
- Admin schedules daily sermons from a Spotify podcast
- Search episodes by theme or browse all
- Optional YouTube link for live streams
- Discussion thread per sermon

### Birthday & event calendar
- Apple Calendar-style month grid view
- Pre-loaded group member birthdays
- Admin can add/edit/delete birthdays
- Group events with RSVP (Going / Maybe / Can't make it)

### Notifications & emails
- Magic link login (no passwords)
- Daily check-in reminders at 9am, 12pm, 6pm Toronto time (max once per day per person)
- Birthday email to whole group at midnight Toronto time
- Response notification emails
- Admin daily summary of members who haven't prayed or done bible study
- Weekly participation summary to admins every Sunday
- Admin broadcast email to all members
- Admin manual check-in reminder with editable message

### Admin features
- Manage members (view all, change roles)
- Send broadcast email to all members
- Send manual check-in reminder
- Delete any check-in or prayer request (moderation)
- Add/delete birthdays and calendar events
- Schedule sermons

### Profile & settings
- Edit name and display name
- Toggle daily reminder emails
- Set default visibility for check-ins
- Dark/light mode toggle
- Check-in history with streaks
- Sign out / leave group

---

## Tech stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16 (App Router, Turbopack) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| Backend | Supabase (Postgres + Auth + RLS) |
| Email | Resend |
| Podcast | Spotify API |
| Hosting | Vercel |
| Domain | gatherdaily.app |

---

## System architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Client (Browser)                      │
│                     gatherdaily.app                          │
│                                                             │
│   Next.js 16 App Router · TypeScript · Tailwind CSS        │
│   PWA (manifest.json + service worker)                      │
└──────────────────────┬──────────────────────────────────────┘
                       │ HTTPS
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                     Vercel (Edge Network)                    │
│                                                             │
│   proxy.ts          → Auth guard on every request          │
│   Server Components → Data fetched server-side             │
│   API Routes        → /api/* endpoints                     │
│   Cron Jobs         → 6 scheduled jobs                     │
└──────┬───────────────────────────────┬───────────────────────┘
       │                               │
       ▼                               ▼
┌──────────────────┐         ┌─────────────────────┐
│    Supabase      │         │       Resend         │
│                  │         │                      │
│  PostgreSQL DB   │         │  Transactional email │
│  Auth (magic     │         │  noreply@            │
│  link + OTP)     │         │  gatherdaily.app     │
│  Row Level       │         │  Batch API           │
│  Security        │         └─────────────────────┘
└──────────────────┘

Data flow — check-in:
User submits → Client calculates Toronto date → Server validates session
→ Upsert to check_ins (unique: user_id + date)
→ If support_requested → notify relevant members via Resend
→ Redirect to home dashboard

Visibility logic (server-side):
canViewDetails(viewer, check_in):
  if viewer == owner          → YES
  if viewer.role == admin     → YES
  if visibility == everyone   → YES
  if visibility == specific   → check visibility_grants
  if visibility == one_person → check visibility_grants
  else                        → NO

Cron schedule (Toronto time):
  9am  → check-in reminder
  12pm → check-in reminder
  6pm  → check-in reminder
  12am → birthday email
  8pm  → prayer/bible study admin summary
  Sun 8pm → weekly recap to admins
```

---

## Why I built it this way

### Supabase RLS for visibility enforcement
I could have handled visibility rules only in application code. I chose to enforce them at the database level using Row Level Security because if visibility logic only lives in the frontend, a determined user could bypass it. With RLS, the database itself refuses to return data the user shouldn't see.

### Server-side anonymous response stripping
Anonymous responses store the `responder_id` in the database (for admin moderation), but the API strips all identity information before returning to any client. The frontend never receives the author of an anonymous response — not even in hidden fields.

### Magic link auth
For a fellowship group where many members aren't technical, passwordless login removes the biggest friction point. No forgotten passwords, no reset flows, no confusion. Just enter your email and click the link.

### Toronto timezone centralisation
All date logic lives in `src/lib/date.ts`. Nothing in the app calculates "today" inline — every file imports from the same source. This was a deliberate decision after discovering that check-ins submitted between 8pm–midnight were being saved with the wrong date because of UTC vs Toronto time differences.

---

## What broke and how I fixed it

### Session persistence (the hardest bug)
Users were getting logged out every time they navigated between pages. Login worked. But tapping from Home to Prayer kicked you back to login.

The cause: Next.js 16 renamed `middleware.ts` to `proxy.ts` and requires the exported function to be named `proxy`. Our file was correctly named `proxy.ts` but the function inside was exported with the wrong name in some versions. When the name didn't match, the proxy never ran. Sessions were set after login but never refreshed on subsequent requests — so they appeared dead.

One word fix. Hours of debugging.

### Email rate limiting
Parallel email sends with `Promise.allSettled()` hit Resend's rate limiter silently — 12 emails sent, only 4-5 received. Fixed by switching to Resend's batch API: one HTTP request sends all emails at once, no rate limiting, no timeout risk.

### Timezone bug
Check-ins submitted between 8pm–midnight Toronto time were saved with the next day's UTC date, breaking streaks and the dashboard. Fixed by always passing `check_in_date` explicitly from the client using `Intl.DateTimeFormat` with `America/Toronto` timezone — never relying on the database `current_date` default.

### SQL constraint ordering
Updating a database constraint before migrating existing data caused constraint violations. The correct order: update existing rows first, then drop the old constraint, then add the new one.

---

## Environment variables

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_SITE_URL=https://gatherdaily.app
RESEND_API_KEY=
RESEND_FROM_EMAIL=Gather <noreply@gatherdaily.app>
SPOTIFY_CLIENT_ID=
SPOTIFY_CLIENT_SECRET=
SPOTIFY_PODCAST_ID=
CRON_SECRET=
NEXT_PUBLIC_DEMO_PASSWORD=
```

---

## Database tables

| Table | Purpose |
|-------|---------|
| profiles | Member accounts, roles, settings |
| check_ins | Daily check-in submissions |
| visibility_grants | Who can see specific check-ins |
| responses | Responses and replies on check-ins |
| response_seen | Tracks which responses have been read |
| checkin_seen | Tracks which check-ins have been viewed |
| prayer_requests | Prayer wall posts |
| prayer_praying | Who is praying for each request |
| prayer_comments | Encouragement comments on prayers |
| sermon_schedule | Daily sermon assignments |
| sermon_curriculum | Weekly sermon themes |
| sermon_discussions | Discussion posts per sermon |
| birthdays | Group member birthdays |
| events | Group calendar events |
| event_rsvps | Member RSVPs for events |
| reminder_log | Tracks daily reminder sends (max 1/day) |

---

## Cron jobs

| Endpoint | Schedule (UTC) | Toronto time |
|----------|---------------|-------------|
| /api/reminders?time=morning | 0 13 * * * | 9am |
| /api/reminders?time=midday | 0 16 * * * | 12pm |
| /api/reminders?time=evening | 0 22 * * * | 6pm |
| /api/birthday-reminder | 0 4 * * * | 12am |
| /api/notify-admin | 0 0 * * * | 8pm |
| /api/weekly-summary | 0 0 * * 1 | Sun 8pm |

---

## Built with

Claude (Anthropic) + Claude Code — designed and built from zero to production
in a single focused session. 20+ active members using it daily.
