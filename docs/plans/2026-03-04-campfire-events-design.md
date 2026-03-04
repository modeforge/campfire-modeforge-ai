# Campfire Events Section - Design Document

## Overview

Campfire is a standalone events section at `/campfire` on modeforge.ai for a monthly guys-only gathering in Waco, TX, managed by Mark Senefsky and Philip Shero. It is separate from the MODEFORGE business but hosted on the same site with a minimal, stripped-down header.

Replaces the WordPress-based Campfire section previously at modeforge.com/campfire/.

## Routes

| Path | Purpose |
|------|---------|
| `/campfire` | Upcoming events list (landing page) |
| `/campfire/[slug]` | Event detail with RSVP |
| `/campfire/admin` | Password-protected RSVP admin view |
| `/campfire/calendar.ics` | iCal feed endpoint for calendar subscriptions |

## Event Data: Markdown Files

Events are stored as markdown files in `content/campfire/`, one per event. No CMS required. New events are created manually.

**Slug format:** `YYYY-MM-DD` (e.g., `2026-04-04.md`)

**File structure:**

```markdown
---
title: "CAMPFIRE 04/04/2026 6PM to 9PM"
date: "2026-04-04"
startTime: "18:00"
endTime: "21:00"
venue: "Shero Estate"
address: "989 Greenwood Lane, Waco, TX 76705"
image: "/images/campfire/2026-04-04.jpg"
rsvpDeadline: "2026-04-04"
---

Campfire is a once-a-month, guys-only space. The only agenda is friendship.

We will grill some meat, sit around a campfire next to the Brazos River, and encourage each other as friends.

Feel free to bring along a friend, neighbor, or coworker.

Meat and potatoes will be provided. Bring whatever you'd like to drink (we will have two coolers for leaded or unleaded beverages).
```

**Behavior:**
- If `image` is omitted, a default campfire image is used
- `rsvpDeadline` controls when the RSVP form closes. After that date, "Going" button is replaced with "RSVP closed"
- Past events (date before today) are excluded from the list page but still accessible via direct URL

## Database: RSVP Submissions

**Supabase table: `campfire_rsvps`**

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | Primary key, auto-generated |
| `event_slug` | text | Matches the markdown filename (e.g., `2026-04-04`) |
| `name` | text | Required |
| `email` | text | Required |
| `guest_count` | integer | Required, minimum 1 |
| `created_at` | timestamptz | Auto-generated |

**RLS policy:** Public insert (anyone can RSVP). Read access restricted to the admin API route with password verification.

No duplicate prevention. If someone RSVPs twice, both entries are stored. Cleanup via admin or Supabase dashboard if needed.

## RSVP Flow

1. Below the "Add to calendar" button on the detail page, a card shows the event date, current RSVP count (sum of all `guest_count` for that event), and a "Going" button
2. Clicking "Going" opens a modal with the form: Name, Email, Number of Guests (all required)
3. On submit, a Server Action inserts the row into Supabase and closes the modal
4. The RSVP count updates to reflect the new total
5. After `rsvpDeadline`, the card shows "RSVP closed" instead of the button

## Admin View

**Route:** `/campfire/admin`

**Authentication:**
1. Visiting `/campfire/admin` shows a login form with a single password field
2. Password checked against `CAMPFIRE_ADMIN_PASSWORD` environment variable via Server Action
3. On success, sets an HTTP-only cookie (`campfire_admin_session`) with a signed token. Session lasts 24 hours.
4. Subsequent visits check the cookie. Invalid or expired cookie redirects to login.

**Layout:**
- Each upcoming event as a card (most recent first)
- Event title, date, total RSVP count (sum of guest counts)
- Expandable list of RSVPs per event: Name, Email, Guests, Date submitted
- Toggle to show past events
- No edit/delete functionality for RSVPs in the admin UI

## Calendar Integration

### Per-Event "Add to Calendar" Dropdown

A button on each detail page with four options:

| Option | Behavior |
|--------|----------|
| Google Calendar | Opens Google Calendar URL with event details pre-filled |
| iCalendar | Downloads a `.ics` file for that single event |
| Outlook 365 | Opens Outlook 365 web with event details pre-filled |
| Outlook Live | Opens Outlook Live web with event details pre-filled |

All constructed from event frontmatter. No API keys needed.

### Subscribe Feed

GET endpoint at `/campfire/calendar.ics` returning all events as a single iCal feed. Calendar apps that subscribe to this URL will auto-update as new events are added. "Subscribe to calendar" link at the bottom of the list page.

## UI and Layout

### Header

Minimal bar: "CAMPFIRE" in MODEFORGE font weight/style on the left, "modeforge.ai" link on the right. No main site navigation.

### List Page (`/campfire`)

- Each event as a row: day-of-week and date number on the left, date/time, title, venue + address, description snippet, event image on the right
- "Previous Campfires" / "Next Campfires" pagination at bottom
- "Subscribe to calendar" link at bottom right
- Shows upcoming events only by default

### Detail Page (`/campfire/[slug]`)

- "All Campfires" back link at top
- Event title, date/time, image, full description from markdown body
- "Add to calendar" dropdown button
- RSVP card with count and "Going" button (or "RSVP closed")
- Details footer with three columns: Details (Date, Time), Organizer ("CAMPFIRE WACO"), Venue (address + Google Maps embed)
- Previous/next event navigation at bottom

### Design System

Matches modeforge.ai: white background, Inter font, `font-light`, `tracking-wide`, black/neutral palette, square corners (`rounded-none`), black primary buttons (`bg-black text-white`).

### RSVP Modal

Centered overlay modal: Name, Email, Number of Guests fields (all required). "Cancel" and "Finish" buttons. Black primary button styling.

## Environment Variables

| Variable | Purpose |
|----------|---------|
| `CAMPFIRE_ADMIN_PASSWORD` | Shared password for admin access |

## Images

- Default campfire image at `public/images/campfire/default.jpg`
- Per-event images at `public/images/campfire/YYYY-MM-DD.jpg`
