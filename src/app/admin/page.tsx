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
