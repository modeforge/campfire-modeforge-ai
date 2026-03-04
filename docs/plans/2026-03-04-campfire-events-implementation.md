# Campfire Events Section - Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a standalone `/campfire` events section with event listing, detail pages, RSVP with Supabase storage, calendar integration, and password-protected admin view.

**Architecture:** Markdown files for event data (mirroring the case study pattern), Supabase for RSVP storage, Server Actions for form submission and admin auth. Campfire pages use a custom layout that replaces the main site nav/footer with a minimal "CAMPFIRE" header.

**Tech Stack:** Next.js 15 App Router, Supabase (PostgreSQL + RLS), gray-matter, remark/rehype, zod, jose (JWT for admin sessions)

**Design doc:** `docs/plans/2026-03-04-campfire-events-design.md`

---

### Task 1: Supabase Migration for campfire_rsvps Table

**Files:**
- Create: `supabase/migrations/20260304000000_create_campfire_rsvps.sql`

**Step 1: Create the migration file**

```sql
-- Campfire RSVP submissions table
create table if not exists public.campfire_rsvps (
  id uuid primary key default gen_random_uuid(),
  event_slug text not null,
  name text not null,
  email text not null,
  guest_count integer not null default 1,
  created_at timestamptz default now()
);

-- Enable RLS
alter table public.campfire_rsvps enable row level security;

-- No public read policies. Server action uses service_role key for inserts.
-- Admin reads also use service_role key.

-- Indexes for common queries
create index if not exists idx_campfire_rsvps_event_slug
  on public.campfire_rsvps (event_slug);

create index if not exists idx_campfire_rsvps_created_at
  on public.campfire_rsvps (created_at desc);
```

**Step 2: Run the migration against Supabase**

Run: `npx supabase db push` (or apply via Supabase dashboard if not using CLI locally)

**Step 3: Commit**

```bash
git add supabase/migrations/20260304000000_create_campfire_rsvps.sql
git commit -m "feat(campfire): add campfire_rsvps migration"
```

---

### Task 2: CampfireEvent Type and Content Loading Functions

**Files:**
- Modify: `src/lib/content.ts`

**Step 1: Add the CampfireEvent interface**

Add after the `CaseStudy` interface (around line 64):

```typescript
export interface CampfireEvent {
  slug: string;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  venue: string;
  address: string;
  image?: string;
  rsvpDeadline: string;
  content: string;
  htmlContent: string;
}
```

**Step 2: Add the content directory constant**

Add after `CASE_STUDIES_DIR` (around line 218):

```typescript
const CAMPFIRE_DIR = path.join(CONTENT_DIR, 'campfire');
```

**Step 3: Add getAllCampfireEvents function**

Add after the case study loading section:

```typescript
// ---------------------------------------------------------------------------
// Campfire event loading
// ---------------------------------------------------------------------------

export async function getAllCampfireEvents(): Promise<CampfireEvent[]> {
  const events: CampfireEvent[] = [];

  if (!fs.existsSync(CAMPFIRE_DIR)) return events;

  const files = fs
    .readdirSync(CAMPFIRE_DIR)
    .filter((f) => f.endsWith('.md'));

  for (const file of files) {
    const filePath = path.join(CAMPFIRE_DIR, file);
    const raw = fs.readFileSync(filePath, 'utf-8');
    const { data, content } = matter(raw);
    const slug = generateSlug(file);
    const htmlContent = await renderMarkdown(content);

    events.push({
      slug,
      title: data.title ?? '',
      date: data.date ?? '',
      startTime: data.startTime ?? '',
      endTime: data.endTime ?? '',
      venue: data.venue ?? '',
      address: data.address ?? '',
      image: data.image,
      rsvpDeadline: data.rsvpDeadline ?? '',
      content,
      htmlContent,
    });
  }

  // Sort by date ascending (nearest upcoming first)
  events.sort((a, b) => {
    const dateA = new Date(a.date).getTime() || 0;
    const dateB = new Date(b.date).getTime() || 0;
    return dateA - dateB;
  });

  return events;
}

export async function getCampfireEvent(
  slug: string,
): Promise<CampfireEvent | null> {
  const allEvents = await getAllCampfireEvents();
  return allEvents.find((e) => e.slug === slug) ?? null;
}

export function getUpcomingCampfireEvents(
  events: CampfireEvent[],
): CampfireEvent[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return events.filter((e) => new Date(e.date) >= today);
}
```

**Step 4: Commit**

```bash
git add src/lib/content.ts
git commit -m "feat(campfire): add CampfireEvent type and loading functions"
```

---

### Task 3: First Campfire Event Markdown File and Default Image

**Files:**
- Create: `content/campfire/2026-04-04.md`
- Add: default campfire image to `public/images/campfire/default.jpg`

**Step 1: Create the content directory**

```bash
mkdir -p content/campfire
mkdir -p public/images/campfire
```

**Step 2: Create a sample event file**

Create `content/campfire/2026-04-04.md`:

```markdown
---
title: "CAMPFIRE 04/04/2026 6PM to 9PM"
date: "2026-04-04"
startTime: "18:00"
endTime: "21:00"
venue: "Shero Estate"
address: "989 Greenwood Lane, Waco, TX 76705"
rsvpDeadline: "2026-04-04"
---

Campfire is a once-a-month, guys-only space. The only agenda is friendship.

We will grill some meat, sit around a campfire next to the Brazos River, and encourage each other as friends.

Feel free to bring along a friend, neighbor, or coworker.

Meat and potatoes will be provided. Bring whatever you'd like to drink (we will have two coolers for leaded or unleaded beverages).
```

**Step 3: Add a placeholder default image**

Copy or create a default campfire image at `public/images/campfire/default.jpg`. If no image is available yet, create a placeholder text file noting one is needed.

**Step 4: Commit**

```bash
git add content/campfire/ public/images/campfire/
git commit -m "feat(campfire): add first event and image directory"
```

---

### Task 4: Campfire Layout with Minimal Header

The campfire section uses its own layout with a minimal header instead of the main site nav and footer.

**Files:**
- Create: `src/app/campfire/layout.tsx`
- Create: `src/components/campfire-header.tsx`

**Step 1: Create the campfire header component**

Create `src/components/campfire-header.tsx`:

```tsx
import Link from 'next/link';

export function CampfireHeader() {
  return (
    <nav
      className="w-full"
      style={{ borderBottom: '1px solid var(--border-subtle)' }}
    >
      <div className="flex items-center justify-between px-6 md:px-12 py-6">
        <Link
          href="/campfire"
          className="text-lg font-light tracking-widest uppercase"
          style={{ color: 'var(--text-primary)', letterSpacing: '0.2em' }}
        >
          Campfire
        </Link>
        <Link
          href="/"
          className="text-sm font-light tracking-wide"
          style={{ color: 'var(--text-muted)' }}
        >
          modeforge.ai
        </Link>
      </div>
    </nav>
  );
}
```

**Step 2: Create the campfire layout**

Create `src/app/campfire/layout.tsx`:

```tsx
import { CampfireHeader } from '@/components/campfire-header';

export default function CampfireLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <CampfireHeader />
      <div className="flex-1">{children}</div>
    </>
  );
}
```

Note: Because the root layout has `<Nav />` and `<Footer />`, we need the campfire routes to skip those. Next.js route groups can solve this. We will restructure using route groups:

- `src/app/(main)/` - all existing pages (uses root layout with Nav + Footer)
- `src/app/(campfire)/campfire/` - campfire pages (uses its own layout without Nav + Footer)

**Revised Step 2: Restructure with route groups**

Move the existing root layout's Nav/Footer into a `(main)` route group:

a. Create `src/app/(main)/layout.tsx`:

```tsx
import { Nav } from '@/components/nav';
import { Footer } from '@/components/footer';

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Nav />
      <main className="flex-1">{children}</main>
      <Footer />
    </>
  );
}
```

b. Move ALL existing page directories into `src/app/(main)/`:
- `about/`, `ai-reformation/`, `case-studies/`, `contact/`, `insights/`, `privacy/`, `services/`, `terms/`, `page.tsx` (homepage)

c. Update root layout `src/app/layout.tsx` to remove Nav/Footer:

```tsx
import type { Metadata } from 'next';
import { Analytics } from '@/components/analytics';
import { JsonLd } from '@/components/json-ld';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'MODEFORGE | AI Reformation for Established Businesses',
    template: '%s | MODEFORGE',
  },
  description: 'MODEFORGE helps established businesses reimagine how they run with AI at the foundation.',
  metadataBase: new URL('https://modeforge.ai'),
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://modeforge.ai',
    siteName: 'MODEFORGE',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                var theme = localStorage.getItem('theme');
                if (theme === 'dark') document.documentElement.classList.add('dark');
                else if (theme === 'light') document.documentElement.classList.add('light');
              })();
            `,
          }}
        />
        <JsonLd
          data={{
            '@context': 'https://schema.org',
            '@type': 'Organization',
            name: 'MODEFORGE',
            url: 'https://modeforge.ai',
            description: 'AI Reformation for established businesses.',
            contactPoint: {
              '@type': 'ContactPoint',
              email: 'hello@modeforge.com',
              contactType: 'sales',
            },
          }}
        />
      </head>
      <body className="antialiased min-h-screen flex flex-col">
        {children}
        <Analytics />
      </body>
    </html>
  );
}
```

d. Create `src/app/(campfire)/campfire/layout.tsx`:

```tsx
import { CampfireHeader } from '@/components/campfire-header';

export default function CampfireLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <CampfireHeader />
      <main className="flex-1">{children}</main>
    </>
  );
}
```

**Step 3: Verify build passes after restructure**

Run: `npx next build`
Expected: Build succeeds with all existing routes still working.

**Step 4: Commit**

```bash
git add -A
git commit -m "feat(campfire): add route groups and campfire layout with minimal header"
```

---

### Task 5: Campfire Event List Page

**Files:**
- Create: `src/app/(campfire)/campfire/page.tsx`

**Step 1: Create the list page**

```tsx
import { getAllCampfireEvents, getUpcomingCampfireEvents } from '@/lib/content';
import Image from 'next/image';
import Link from 'next/link';

export const metadata = {
  title: 'Campfire',
  description: 'A once-a-month, guys-only space. The only agenda is friendship.',
};

function formatDate(dateStr: string) {
  const date = new Date(dateStr + 'T00:00:00');
  return {
    dayOfWeek: date.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase(),
    dayNumber: date.getDate(),
  };
}

function formatTime(time24: string) {
  const [h, m] = time24.split(':').map(Number);
  const ampm = h >= 12 ? 'pm' : 'am';
  const h12 = h % 12 || 12;
  return `${h12}:${m.toString().padStart(2, '0')} ${ampm}`;
}

function formatMonthYear(dateStr: string) {
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

export default async function CampfireListPage() {
  const allEvents = await getAllCampfireEvents();
  const upcoming = getUpcomingCampfireEvents(allEvents);

  return (
    <section className="px-6 md:px-12 py-12">
      <div className="max-w-[1000px] mx-auto">
        {/* Header */}
        <h1 className="text-3xl font-light tracking-tight mb-8">
          Upcoming
        </h1>

        {upcoming.length === 0 && (
          <p style={{ color: 'var(--text-secondary)' }}>
            No upcoming campfires scheduled. Check back soon.
          </p>
        )}

        {/* Group events by month */}
        {upcoming.map((event, i) => {
          const { dayOfWeek, dayNumber } = formatDate(event.date);
          const monthYear = formatMonthYear(event.date);
          const prevMonthYear = i > 0 ? formatMonthYear(upcoming[i - 1].date) : null;
          const showMonthHeader = monthYear !== prevMonthYear;
          const imageSrc = event.image || '/images/campfire/default.jpg';

          return (
            <div key={event.slug}>
              {showMonthHeader && (
                <div
                  className="text-sm font-light mb-4 mt-8 pb-2"
                  style={{
                    color: 'var(--text-secondary)',
                    borderBottom: '1px solid var(--border-subtle)',
                  }}
                >
                  {monthYear}
                </div>
              )}

              <Link
                href={`/campfire/${event.slug}`}
                className="flex gap-6 py-6 transition-colors"
                style={{ borderBottom: '1px solid var(--border-subtle)' }}
              >
                {/* Date column */}
                <div className="flex-shrink-0 w-16 text-center">
                  <div
                    className="text-xs font-light uppercase"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    {dayOfWeek}
                  </div>
                  <div
                    className="text-2xl font-light"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    {dayNumber}
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div
                    className="text-sm mb-1"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    {new Date(event.date + 'T00:00:00').toLocaleDateString('en-US', {
                      month: 'long',
                      day: 'numeric',
                    })}{' '}
                    @ {formatTime(event.startTime)} - {formatTime(event.endTime)}
                  </div>
                  <h2
                    className="text-xl font-light mb-2"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    {event.title}
                  </h2>
                  <div
                    className="text-sm mb-2"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    <strong style={{ fontWeight: 500 }}>{event.venue}</strong>{' '}
                    {event.address}
                  </div>
                  <p
                    className="text-sm"
                    style={{
                      color: 'var(--text-muted)',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    }}
                  >
                    {event.content.split('\n').filter(Boolean)[0]}
                  </p>
                </div>

                {/* Image */}
                <div className="hidden sm:block flex-shrink-0 w-48 h-32 relative">
                  <Image
                    src={imageSrc}
                    alt={event.title}
                    fill
                    className="object-cover"
                    sizes="192px"
                  />
                </div>
              </Link>
            </div>
          );
        })}

        {/* Subscribe to calendar */}
        <div className="flex justify-end mt-8">
          <a
            href="/campfire/calendar.ics"
            className="text-sm font-light tracking-wide"
            style={{ color: 'var(--text-muted)' }}
          >
            Subscribe to calendar
          </a>
        </div>
      </div>
    </section>
  );
}
```

**Step 2: Verify page renders**

Run: `npx next build`
Expected: Build succeeds, `/campfire` route appears in output.

**Step 3: Commit**

```bash
git add src/app/\(campfire\)/campfire/page.tsx
git commit -m "feat(campfire): add event list page"
```

---

### Task 6: Add to Calendar Dropdown Component

**Files:**
- Create: `src/components/add-to-calendar.tsx`

**Step 1: Create the component**

This is a client component that builds calendar URLs from event data.

```tsx
'use client';

import { useState, useRef, useEffect } from 'react';

interface AddToCalendarProps {
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  venue: string;
  address: string;
  description: string;
}

function formatICSDate(date: string, time: string): string {
  const [year, month, day] = date.split('-');
  const [hour, min] = time.split(':');
  return `${year}${month}${day}T${hour}${min}00`;
}

function generateICSContent(props: AddToCalendarProps): string {
  const dtStart = formatICSDate(props.date, props.startTime);
  const dtEnd = formatICSDate(props.date, props.endTime);
  const location = `${props.venue}, ${props.address}`;

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Campfire//EN',
    'BEGIN:VEVENT',
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    `SUMMARY:${props.title}`,
    `LOCATION:${location}`,
    `DESCRIPTION:${props.description.replace(/\n/g, '\\n')}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
}

function getGoogleCalendarUrl(props: AddToCalendarProps): string {
  const dtStart = formatICSDate(props.date, props.startTime);
  const dtEnd = formatICSDate(props.date, props.endTime);
  const location = `${props.venue}, ${props.address}`;
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: props.title,
    dates: `${dtStart}/${dtEnd}`,
    location,
    details: props.description,
  });
  return `https://calendar.google.com/calendar/render?${params}`;
}

function getOutlookUrl(props: AddToCalendarProps, type: 'office' | 'live'): string {
  const base = type === 'office'
    ? 'https://outlook.office.com/calendar/0/deeplink/compose'
    : 'https://outlook.live.com/calendar/0/deeplink/compose';

  const startDt = `${props.date}T${props.startTime}:00`;
  const endDt = `${props.date}T${props.endTime}:00`;
  const location = `${props.venue}, ${props.address}`;

  const params = new URLSearchParams({
    subject: props.title,
    startdt: startDt,
    enddt: endDt,
    location,
    body: props.description,
    path: '/calendar/action/compose',
  });
  return `${base}?${params}`;
}

export function AddToCalendar(props: AddToCalendarProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  function downloadICS() {
    const content = generateICSContent(props);
    const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${props.title.replace(/\s+/g, '-')}.ics`;
    a.click();
    URL.revokeObjectURL(url);
    setOpen(false);
  }

  const linkStyle: React.CSSProperties = {
    display: 'block',
    padding: '0.5rem 1rem',
    fontSize: '0.875rem',
    color: 'var(--text-primary)',
    textDecoration: 'none',
    cursor: 'pointer',
  };

  return (
    <div ref={ref} className="relative inline-block">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 text-sm font-light tracking-wide px-4 py-2"
        style={{
          border: '1px solid var(--border-medium)',
          background: 'var(--bg-primary)',
          color: 'var(--text-primary)',
          cursor: 'pointer',
        }}
      >
        <span>Add to calendar</span>
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path d="M3 5L6 8L9 5" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      </button>

      {open && (
        <div
          className="absolute left-0 top-full mt-1 z-10 min-w-[180px]"
          style={{
            border: '1px solid var(--border-medium)',
            background: 'var(--bg-primary)',
            boxShadow: '0 4px 12px var(--shadow-color)',
          }}
        >
          <a
            href={getGoogleCalendarUrl(props)}
            target="_blank"
            rel="noopener noreferrer"
            style={linkStyle}
            onClick={() => setOpen(false)}
          >
            Google Calendar
          </a>
          <button onClick={downloadICS} style={{ ...linkStyle, width: '100%', textAlign: 'left', border: 'none', background: 'none' }}>
            iCalendar
          </button>
          <a
            href={getOutlookUrl(props, 'office')}
            target="_blank"
            rel="noopener noreferrer"
            style={linkStyle}
            onClick={() => setOpen(false)}
          >
            Outlook 365
          </a>
          <a
            href={getOutlookUrl(props, 'live')}
            target="_blank"
            rel="noopener noreferrer"
            style={linkStyle}
            onClick={() => setOpen(false)}
          >
            Outlook Live
          </a>
        </div>
      )}
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add src/components/add-to-calendar.tsx
git commit -m "feat(campfire): add AddToCalendar dropdown component"
```

---

### Task 7: RSVP Server Action

**Files:**
- Create: `src/app/(campfire)/campfire/actions.ts`

**Step 1: Create the RSVP action**

```typescript
'use server';

import { z } from 'zod';

const rsvpSchema = z.object({
  eventSlug: z.string().min(1),
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Valid email is required'),
  guestCount: z.coerce.number().int().min(1, 'At least 1 guest required'),
});

export type RsvpFormState = {
  success: boolean;
  error?: string;
};

export async function submitRsvp(
  prevState: RsvpFormState,
  formData: FormData
): Promise<RsvpFormState> {
  try {
    const data = rsvpSchema.parse({
      eventSlug: formData.get('eventSlug'),
      name: formData.get('name'),
      email: formData.get('email'),
      guestCount: formData.get('guestCount'),
    });

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (supabaseUrl && supabaseServiceKey && !supabaseUrl.includes('placeholder')) {
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      const { error } = await supabase.from('campfire_rsvps').insert({
        event_slug: data.eventSlug,
        name: data.name,
        email: data.email,
        guest_count: data.guestCount,
      });
      if (error) {
        console.error('RSVP insert error:', error);
        return { success: false, error: 'Something went wrong. Please try again.' };
      }
    }

    return { success: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.issues[0].message };
    }
    console.error('RSVP error:', error);
    return { success: false, error: 'Something went wrong. Please try again.' };
  }
}
```

**Step 2: Commit**

```bash
git add src/app/\(campfire\)/campfire/actions.ts
git commit -m "feat(campfire): add RSVP server action"
```

---

### Task 8: RSVP Card Component

**Files:**
- Create: `src/components/rsvp-card.tsx`

**Step 1: Create the RSVP card with modal**

```tsx
'use client';

import { useState, useActionState } from 'react';
import { submitRsvp, type RsvpFormState } from '@/app/(campfire)/campfire/actions';

interface RsvpCardProps {
  eventSlug: string;
  eventDate: string;
  rsvpDeadline: string;
  initialCount: number;
}

const inputStyles: React.CSSProperties = {
  width: '100%',
  padding: '0.75rem 1rem',
  border: '1px solid var(--border-medium)',
  background: 'var(--bg-primary)',
  color: 'var(--text-primary)',
  fontSize: '0.9rem',
  borderRadius: 0,
  outline: 'none',
};

export function RsvpCard({ eventSlug, eventDate, rsvpDeadline, initialCount }: RsvpCardProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [rsvpCount, setRsvpCount] = useState(initialCount);

  const isExpired = new Date(rsvpDeadline + 'T23:59:59') < new Date();

  const [state, formAction, pending] = useActionState<RsvpFormState, FormData>(
    async (prevState, formData) => {
      const result = await submitRsvp(prevState, formData);
      if (result.success) {
        const guestCount = Number(formData.get('guestCount')) || 1;
        setRsvpCount((prev) => prev + guestCount);
        setModalOpen(false);
      }
      return result;
    },
    { success: false }
  );

  const formattedDate = new Date(eventDate + 'T00:00:00').toLocaleDateString('en-US', {
    month: '2-digit',
    day: '2-digit',
    year: 'numeric',
  });

  return (
    <>
      <div
        className="mt-8 p-6"
        style={{ border: '1px dashed var(--border-medium)' }}
      >
        <div className="flex items-start justify-between gap-6">
          <div>
            <div
              className="text-lg font-light mb-1"
              style={{ color: 'var(--text-primary)' }}
            >
              {formattedDate} CAMPFIRE
            </div>
            <div
              className="text-3xl font-light mb-1"
              style={{ color: 'var(--text-primary)' }}
            >
              {rsvpCount}
            </div>
            <div
              className="text-sm"
              style={{ color: 'var(--text-muted)' }}
            >
              Going
            </div>
            {!isExpired && (
              <div
                className="text-xs mt-2"
                style={{ color: 'var(--text-muted)' }}
              >
                Last day to RSVP
              </div>
            )}
          </div>

          <div>
            <div
              className="text-sm font-medium mb-2"
              style={{ color: 'var(--text-primary)' }}
            >
              RSVP Here
            </div>
            {isExpired ? (
              <div
                className="text-sm px-6 py-2"
                style={{
                  color: 'var(--text-muted)',
                  border: '1px solid var(--border-medium)',
                }}
              >
                RSVP closed
              </div>
            ) : (
              <button
                onClick={() => setModalOpen(true)}
                className="text-sm tracking-wide px-6 py-2 cursor-pointer"
                style={{
                  background: 'var(--btn-primary-bg)',
                  color: 'var(--btn-primary-text)',
                  border: 'none',
                }}
              >
                Going
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Modal */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.5)' }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setModalOpen(false);
          }}
        >
          <div
            className="w-full max-w-md mx-4 p-8"
            style={{
              background: 'var(--bg-primary)',
              border: '1px solid var(--border-medium)',
            }}
          >
            <h3
              className="text-lg font-medium mb-6"
              style={{ color: 'var(--text-primary)' }}
            >
              Please submit your RSVP information, including the total number of guests.
            </h3>

            <form action={formAction} className="space-y-4">
              <input type="hidden" name="eventSlug" value={eventSlug} />

              <div>
                <label
                  htmlFor="rsvp-name"
                  className="block text-sm font-normal mb-2"
                  style={{ color: 'var(--text-primary)' }}
                >
                  Name <span style={{ color: 'var(--accent)' }}>*</span>
                </label>
                <input
                  type="text"
                  id="rsvp-name"
                  name="name"
                  required
                  style={inputStyles}
                />
              </div>

              <div>
                <label
                  htmlFor="rsvp-email"
                  className="block text-sm font-normal mb-2"
                  style={{ color: 'var(--text-primary)' }}
                >
                  Email <span style={{ color: 'var(--accent)' }}>*</span>
                </label>
                <input
                  type="email"
                  id="rsvp-email"
                  name="email"
                  required
                  style={inputStyles}
                />
              </div>

              <div>
                <label
                  htmlFor="rsvp-guests"
                  className="block text-sm font-normal mb-2"
                  style={{ color: 'var(--text-primary)' }}
                >
                  Number of Guests <span style={{ color: 'var(--accent)' }}>*</span>
                </label>
                <input
                  type="number"
                  id="rsvp-guests"
                  name="guestCount"
                  min={1}
                  defaultValue={1}
                  required
                  style={{ ...inputStyles, width: '80px' }}
                />
              </div>

              {state.error && (
                <div
                  className="text-sm py-3 px-4"
                  style={{
                    color: 'var(--accent)',
                    border: '1px solid var(--accent)',
                    background: 'var(--bg-secondary)',
                  }}
                >
                  {state.error}
                </div>
              )}

              <div className="flex gap-4 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="text-sm tracking-wide px-6 py-2 cursor-pointer"
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-secondary)',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={pending}
                  className="text-sm tracking-wide px-6 py-2 cursor-pointer disabled:opacity-50"
                  style={{
                    background: 'var(--btn-primary-bg)',
                    color: 'var(--btn-primary-text)',
                    border: 'none',
                  }}
                >
                  {pending ? 'Submitting...' : 'Finish'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
```

**Step 2: Commit**

```bash
git add src/components/rsvp-card.tsx
git commit -m "feat(campfire): add RSVP card component with modal form"
```

---

### Task 9: RSVP Count Helper

**Files:**
- Create: `src/lib/campfire.ts`

**Step 1: Create helper to fetch RSVP count**

```typescript
export async function getRsvpCount(eventSlug: string): Promise<number> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey || supabaseUrl.includes('placeholder')) {
    return 0;
  }

  const { createClient } = await import('@supabase/supabase-js');
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const { data, error } = await supabase
    .from('campfire_rsvps')
    .select('guest_count')
    .eq('event_slug', eventSlug);

  if (error || !data) return 0;

  return data.reduce((sum, row) => sum + (row.guest_count || 0), 0);
}
```

**Step 2: Commit**

```bash
git add src/lib/campfire.ts
git commit -m "feat(campfire): add RSVP count helper"
```

---

### Task 10: Campfire Event Detail Page

**Files:**
- Create: `src/app/(campfire)/campfire/[slug]/page.tsx`

**Step 1: Create the detail page**

```tsx
import { getAllCampfireEvents, getCampfireEvent } from '@/lib/content';
import { getRsvpCount } from '@/lib/campfire';
import { AddToCalendar } from '@/components/add-to-calendar';
import { RsvpCard } from '@/components/rsvp-card';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';

export async function generateStaticParams() {
  const events = await getAllCampfireEvents();
  return events.map((e) => ({ slug: e.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const event = await getCampfireEvent(slug);
  if (!event) return {};
  return {
    title: event.title,
    description: `Campfire at ${event.venue} on ${event.date}`,
  };
}

function formatTime(time24: string) {
  const [h, m] = time24.split(':').map(Number);
  const ampm = h >= 12 ? 'pm' : 'am';
  const h12 = h % 12 || 12;
  return `${h12}:${m.toString().padStart(2, '0')} ${ampm}`;
}

export default async function CampfireDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const event = await getCampfireEvent(slug);
  if (!event) notFound();

  const allEvents = await getAllCampfireEvents();
  const currentIndex = allEvents.findIndex((e) => e.slug === slug);
  const prevEvent = currentIndex > 0 ? allEvents[currentIndex - 1] : null;
  const nextEvent = currentIndex < allEvents.length - 1 ? allEvents[currentIndex + 1] : null;

  const rsvpCount = await getRsvpCount(slug);
  const imageSrc = event.image || '/images/campfire/default.jpg';
  const plainDescription = event.content.split('\n').filter(Boolean).join(' ');

  const formattedDate = new Date(event.date + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
  });

  return (
    <article className="px-6 md:px-12 py-12">
      <div className="max-w-[800px] mx-auto">
        {/* Back link */}
        <Link
          href="/campfire"
          className="text-sm mb-8 inline-block"
          style={{ color: 'var(--text-muted)' }}
        >
          &laquo; All Campfires
        </Link>

        {/* Title */}
        <h1
          className="text-3xl md:text-4xl font-light tracking-tight mb-4"
          style={{ color: 'var(--text-primary)' }}
        >
          {event.title}
        </h1>

        {/* Date/time */}
        <div
          className="text-sm mb-8"
          style={{ color: 'var(--text-muted)' }}
        >
          {formattedDate} @ {formatTime(event.startTime)} - {formatTime(event.endTime)}
        </div>

        {/* Image */}
        <div className="relative w-full aspect-video mb-8">
          <Image
            src={imageSrc}
            alt={event.title}
            fill
            className="object-cover"
            sizes="(max-width: 800px) 100vw, 800px"
            priority
          />
        </div>

        {/* Content */}
        <div
          className="article-content mb-8"
          dangerouslySetInnerHTML={{ __html: event.htmlContent }}
        />

        {/* Add to calendar */}
        <AddToCalendar
          title={event.title}
          date={event.date}
          startTime={event.startTime}
          endTime={event.endTime}
          venue={event.venue}
          address={event.address}
          description={plainDescription}
        />

        {/* RSVP */}
        <RsvpCard
          eventSlug={event.slug}
          eventDate={event.date}
          rsvpDeadline={event.rsvpDeadline}
          initialCount={rsvpCount}
        />

        {/* Details footer */}
        <div
          className="grid grid-cols-1 sm:grid-cols-3 gap-8 mt-12 pt-8"
          style={{ borderTop: '1px solid var(--border-medium)' }}
        >
          {/* Details */}
          <div>
            <h3
              className="text-xs uppercase tracking-widest mb-4 font-medium"
              style={{ color: 'var(--text-primary)' }}
            >
              Details
            </h3>
            <div className="space-y-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
              <div>
                <span className="font-medium" style={{ color: 'var(--text-primary)' }}>Date:</span>
                <br />
                {formattedDate}
              </div>
              <div>
                <span className="font-medium" style={{ color: 'var(--text-primary)' }}>Time:</span>
                <br />
                {formatTime(event.startTime)} - {formatTime(event.endTime)}
              </div>
            </div>
          </div>

          {/* Organizer */}
          <div>
            <h3
              className="text-xs uppercase tracking-widest mb-4 font-medium"
              style={{ color: 'var(--text-primary)' }}
            >
              Organizer
            </h3>
            <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              CAMPFIRE WACO
            </div>
          </div>

          {/* Venue */}
          <div>
            <h3
              className="text-xs uppercase tracking-widest mb-4 font-medium"
              style={{ color: 'var(--text-primary)' }}
            >
              Venue
            </h3>
            <div className="text-sm space-y-1" style={{ color: 'var(--text-secondary)' }}>
              <div style={{ color: 'var(--text-primary)' }}>{event.venue}</div>
              <div>{event.address}</div>
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.address)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block mt-2 text-sm"
                style={{ color: 'var(--accent)' }}
              >
                Open in Maps
              </a>
            </div>
          </div>
        </div>

        {/* Prev/Next navigation */}
        <div
          className="flex justify-between mt-12 pt-6"
          style={{ borderTop: '1px solid var(--border-medium)' }}
        >
          {prevEvent ? (
            <Link
              href={`/campfire/${prevEvent.slug}`}
              className="text-sm"
              style={{ color: 'var(--text-muted)' }}
            >
              &lsaquo; {prevEvent.title}
            </Link>
          ) : (
            <span />
          )}
          {nextEvent ? (
            <Link
              href={`/campfire/${nextEvent.slug}`}
              className="text-sm"
              style={{ color: 'var(--text-muted)' }}
            >
              {nextEvent.title} &rsaquo;
            </Link>
          ) : (
            <span />
          )}
        </div>
      </div>
    </article>
  );
}
```

**Step 2: Verify build passes**

Run: `npx next build`
Expected: Build succeeds with `/campfire` and `/campfire/[slug]` routes.

**Step 3: Commit**

```bash
git add src/app/\(campfire\)/campfire/\[slug\]/page.tsx
git commit -m "feat(campfire): add event detail page"
```

---

### Task 11: iCal Feed Route Handler

**Files:**
- Create: `src/app/(campfire)/campfire/calendar.ics/route.ts`

**Step 1: Create the iCal feed**

```typescript
import { getAllCampfireEvents } from '@/lib/content';

function formatICSDate(date: string, time: string): string {
  const [year, month, day] = date.split('-');
  const [hour, min] = time.split(':');
  return `${year}${month}${day}T${hour}${min}00`;
}

function escapeICS(text: string): string {
  return text.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
}

export async function GET() {
  const events = await getAllCampfireEvents();

  const vevents = events.map((event) => {
    const dtStart = formatICSDate(event.date, event.startTime);
    const dtEnd = formatICSDate(event.date, event.endTime);
    const location = `${event.venue}, ${event.address}`;
    const description = event.content.split('\n').filter(Boolean).join(' ');

    return [
      'BEGIN:VEVENT',
      `UID:${event.slug}@campfire.modeforge.ai`,
      `DTSTART:${dtStart}`,
      `DTEND:${dtEnd}`,
      `SUMMARY:${escapeICS(event.title)}`,
      `LOCATION:${escapeICS(location)}`,
      `DESCRIPTION:${escapeICS(description)}`,
      'END:VEVENT',
    ].join('\r\n');
  });

  const calendar = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Campfire Waco//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:Campfire Waco',
    ...vevents,
    'END:VCALENDAR',
  ].join('\r\n');

  return new Response(calendar, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': 'inline; filename="campfire.ics"',
    },
  });
}
```

**Step 2: Commit**

```bash
git add src/app/\(campfire\)/campfire/calendar.ics/
git commit -m "feat(campfire): add iCal feed route handler"
```

---

### Task 12: Admin Authentication

**Files:**
- Create: `src/app/(campfire)/campfire/admin/actions.ts`

**Step 1: Create admin auth action**

Uses `jose` for JWT signing/verification (already available or install if needed).

```typescript
'use server';

import { cookies } from 'next/headers';
import { SignJWT, jwtVerify } from 'jose';

const COOKIE_NAME = 'campfire_admin_session';
const SESSION_DURATION = 24 * 60 * 60; // 24 hours in seconds

function getSecret() {
  const password = process.env.CAMPFIRE_ADMIN_PASSWORD;
  if (!password) throw new Error('CAMPFIRE_ADMIN_PASSWORD not set');
  return new TextEncoder().encode(password);
}

export type AdminAuthState = {
  authenticated: boolean;
  error?: string;
};

export async function loginAdmin(
  prevState: AdminAuthState,
  formData: FormData
): Promise<AdminAuthState> {
  const password = formData.get('password') as string;
  const expected = process.env.CAMPFIRE_ADMIN_PASSWORD;

  if (!expected) {
    return { authenticated: false, error: 'Admin not configured.' };
  }

  if (password !== expected) {
    return { authenticated: false, error: 'Incorrect password.' };
  }

  const token = await new SignJWT({ role: 'campfire_admin' })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime(`${SESSION_DURATION}s`)
    .sign(getSecret());

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_DURATION,
    path: '/campfire/admin',
  });

  return { authenticated: true };
}

export async function checkAdminSession(): Promise<boolean> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (!token) return false;
    await jwtVerify(token, getSecret());
    return true;
  } catch {
    return false;
  }
}
```

**Step 2: Install jose if not already present**

Run: `npm ls jose 2>/dev/null || npm install jose`

**Step 3: Commit**

```bash
git add src/app/\(campfire\)/campfire/admin/actions.ts package.json package-lock.json
git commit -m "feat(campfire): add admin authentication with JWT sessions"
```

---

### Task 13: Admin Login Component

**Files:**
- Create: `src/components/campfire-admin-login.tsx`

**Step 1: Create the login form**

```tsx
'use client';

import { useActionState } from 'react';
import { loginAdmin, type AdminAuthState } from '@/app/(campfire)/campfire/admin/actions';

const inputStyles: React.CSSProperties = {
  width: '100%',
  padding: '0.75rem 1rem',
  border: '1px solid var(--border-medium)',
  background: 'var(--bg-primary)',
  color: 'var(--text-primary)',
  fontSize: '0.9rem',
  borderRadius: 0,
  outline: 'none',
};

export function CampfireAdminLogin() {
  const [state, formAction, pending] = useActionState<AdminAuthState, FormData>(
    loginAdmin,
    { authenticated: false }
  );

  // If authenticated, trigger a page reload to show the admin content
  if (state.authenticated) {
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
    return null;
  }

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-full max-w-sm">
        <h1
          className="text-2xl font-light tracking-tight mb-8 text-center"
          style={{ color: 'var(--text-primary)' }}
        >
          Campfire Admin
        </h1>
        <form action={formAction} className="space-y-4">
          <div>
            <label
              htmlFor="password"
              className="block text-sm font-normal mb-2"
              style={{ color: 'var(--text-primary)' }}
            >
              Password
            </label>
            <input
              type="password"
              id="password"
              name="password"
              required
              autoFocus
              style={inputStyles}
            />
          </div>

          {state.error && (
            <div
              className="text-sm py-3 px-4"
              style={{
                color: 'var(--accent)',
                border: '1px solid var(--accent)',
                background: 'var(--bg-secondary)',
              }}
            >
              {state.error}
            </div>
          )}

          <button
            type="submit"
            disabled={pending}
            className="w-full py-3 text-sm tracking-wide transition-colors disabled:opacity-50 cursor-pointer"
            style={{
              background: 'var(--btn-primary-bg)',
              color: 'var(--btn-primary-text)',
              border: 'none',
              borderRadius: 0,
            }}
          >
            {pending ? 'Logging in...' : 'Log In'}
          </button>
        </form>
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add src/components/campfire-admin-login.tsx
git commit -m "feat(campfire): add admin login component"
```

---

### Task 14: Admin Page

**Files:**
- Create: `src/app/(campfire)/campfire/admin/page.tsx`

**Step 1: Create the admin page**

```tsx
import { checkAdminSession } from './actions';
import { CampfireAdminLogin } from '@/components/campfire-admin-login';
import { getAllCampfireEvents, getUpcomingCampfireEvents } from '@/lib/content';
import type { CampfireEvent } from '@/lib/content';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Campfire Admin',
  robots: 'noindex, nofollow',
};

async function getRsvpsForEvent(eventSlug: string) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey || supabaseUrl.includes('placeholder')) {
    return [];
  }

  const { createClient } = await import('@supabase/supabase-js');
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const { data } = await supabase
    .from('campfire_rsvps')
    .select('*')
    .eq('event_slug', eventSlug)
    .order('created_at', { ascending: true });

  return data || [];
}

async function EventCard({ event }: { event: CampfireEvent }) {
  const rsvps = await getRsvpsForEvent(event.slug);
  const totalGuests = rsvps.reduce((sum: number, r: { guest_count: number }) => sum + r.guest_count, 0);

  const formattedDate = new Date(event.date + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <div
      className="mb-6 p-6"
      style={{ border: '1px solid var(--border-medium)' }}
    >
      <div className="flex items-start justify-between mb-4">
        <div>
          <h2
            className="text-lg font-light"
            style={{ color: 'var(--text-primary)' }}
          >
            {event.title}
          </h2>
          <div
            className="text-sm mt-1"
            style={{ color: 'var(--text-muted)' }}
          >
            {formattedDate}
          </div>
        </div>
        <div className="text-right">
          <div
            className="text-2xl font-light"
            style={{ color: 'var(--text-primary)' }}
          >
            {totalGuests}
          </div>
          <div
            className="text-xs"
            style={{ color: 'var(--text-muted)' }}
          >
            total guests
          </div>
        </div>
      </div>

      {rsvps.length > 0 ? (
        <details>
          <summary
            className="text-sm cursor-pointer mb-3"
            style={{ color: 'var(--text-secondary)' }}
          >
            {rsvps.length} RSVP{rsvps.length !== 1 ? 's' : ''}
          </summary>
          <table className="w-full text-sm">
            <thead>
              <tr
                style={{
                  borderBottom: '1px solid var(--border-medium)',
                  color: 'var(--text-muted)',
                }}
              >
                <th className="text-left py-2 font-normal">Name</th>
                <th className="text-left py-2 font-normal">Email</th>
                <th className="text-left py-2 font-normal">Guests</th>
                <th className="text-left py-2 font-normal">Submitted</th>
              </tr>
            </thead>
            <tbody>
              {rsvps.map((rsvp: { id: string; name: string; email: string; guest_count: number; created_at: string }) => (
                <tr
                  key={rsvp.id}
                  style={{
                    borderBottom: '1px solid var(--border-subtle)',
                    color: 'var(--text-secondary)',
                  }}
                >
                  <td className="py-2">{rsvp.name}</td>
                  <td className="py-2">{rsvp.email}</td>
                  <td className="py-2">{rsvp.guest_count}</td>
                  <td className="py-2">
                    {new Date(rsvp.created_at).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </details>
      ) : (
        <div
          className="text-sm"
          style={{ color: 'var(--text-muted)' }}
        >
          No RSVPs yet
        </div>
      )}
    </div>
  );
}

export default async function CampfireAdminPage() {
  const isAuthenticated = await checkAdminSession();

  if (!isAuthenticated) {
    return <CampfireAdminLogin />;
  }

  const allEvents = await getAllCampfireEvents();
  const upcoming = getUpcomingCampfireEvents(allEvents);
  const past = allEvents.filter((e) => !upcoming.includes(e)).reverse();

  return (
    <section className="px-6 md:px-12 py-12">
      <div className="max-w-[800px] mx-auto">
        <h1
          className="text-2xl font-light tracking-tight mb-8"
          style={{ color: 'var(--text-primary)' }}
        >
          Campfire Admin
        </h1>

        {/* Upcoming events */}
        <div className="mb-12">
          <h2
            className="text-xs uppercase tracking-widest mb-6"
            style={{ color: 'var(--accent)', letterSpacing: '0.15em' }}
          >
            Upcoming Events
          </h2>
          {upcoming.length === 0 ? (
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              No upcoming events
            </p>
          ) : (
            upcoming.map((event) => (
              <EventCard key={event.slug} event={event} />
            ))
          )}
        </div>

        {/* Past events */}
        {past.length > 0 && (
          <details>
            <summary
              className="text-xs uppercase tracking-widest mb-6 cursor-pointer"
              style={{ color: 'var(--text-muted)', letterSpacing: '0.15em' }}
            >
              Past Events ({past.length})
            </summary>
            <div className="mt-4">
              {past.map((event) => (
                <EventCard key={event.slug} event={event} />
              ))}
            </div>
          </details>
        )}
      </div>
    </section>
  );
}
```

**Step 2: Verify build passes**

Run: `npx next build`

**Step 3: Commit**

```bash
git add src/app/\(campfire\)/campfire/admin/
git commit -m "feat(campfire): add password-protected admin page with RSVP view"
```

---

### Task 15: Update Middleware CSP and Sitemap

**Files:**
- Modify: `src/middleware.ts` (add Google Maps to CSP frame-src if needed)
- Modify: `src/app/sitemap.ts` (add campfire routes)

**Step 1: Check if middleware CSP needs updating**

The detail page links to Google Maps externally (no embed), so CSP changes may not be needed. Verify by checking the existing CSP in middleware.

**Step 2: Add campfire routes to sitemap**

In `src/app/sitemap.ts`, add:

```typescript
import { getAllCampfireEvents, getUpcomingCampfireEvents } from '@/lib/content';

// In the sitemap function, add:
const allCampfireEvents = await getAllCampfireEvents();
const upcomingCampfire = getUpcomingCampfireEvents(allCampfireEvents);

// Add to the urls array:
{
  url: 'https://modeforge.ai/campfire',
  lastModified: new Date(),
  changeFrequency: 'weekly',
  priority: 0.5,
},
...upcomingCampfire.map((event) => ({
  url: `https://modeforge.ai/campfire/${event.slug}`,
  lastModified: new Date(),
  changeFrequency: 'weekly' as const,
  priority: 0.4,
})),
```

Note: Do NOT add `/campfire/admin` to the sitemap.

**Step 3: Commit**

```bash
git add src/app/sitemap.ts src/middleware.ts
git commit -m "feat(campfire): add campfire routes to sitemap"
```

---

### Task 16: Add CAMPFIRE_ADMIN_PASSWORD to Environment

**Files:**
- Modify: `.env.local` (add `CAMPFIRE_ADMIN_PASSWORD`)
- If `.env.example` exists, add placeholder there too

**Step 1: Add environment variable**

Add to `.env.local`:
```
CAMPFIRE_ADMIN_PASSWORD=<choose-a-password>
```

Also add to Vercel environment variables for the production deployment.

**Step 2: Commit**

Do NOT commit `.env.local`. Only commit `.env.example` if it exists.

---

### Task 17: Final Build Verification and Smoke Test

**Step 1: Run build**

Run: `npx next build`
Expected: All routes build successfully including:
- `/campfire` (list page)
- `/campfire/[slug]` (detail pages)
- `/campfire/admin` (admin page)
- `/campfire/calendar.ics` (iCal feed)

**Step 2: Run dev server and manually verify**

Run: `npx next dev`

Verify:
- `/campfire` shows the upcoming event list
- `/campfire/2026-04-04` shows the event detail with RSVP card and Add to Calendar
- `/campfire/admin` shows the login form
- `/campfire/calendar.ics` downloads/shows a valid iCal feed

**Step 3: Commit any fixes**

If any issues found, fix and commit.
