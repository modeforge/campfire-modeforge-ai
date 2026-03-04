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
