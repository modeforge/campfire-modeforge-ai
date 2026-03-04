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
          href="/"
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
              href={`/${prevEvent.slug}`}
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
              href={`/${nextEvent.slug}`}
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
