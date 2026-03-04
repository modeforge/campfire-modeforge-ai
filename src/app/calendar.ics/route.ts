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
