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
                href={`/${event.slug}`}
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
            href="/calendar.ics"
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
