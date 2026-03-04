import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { remark } from 'remark';
import remarkGfm from 'remark-gfm';
import remarkRehype from 'remark-rehype';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';
import rehypeStringify from 'rehype-stringify';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Utility functions
// ---------------------------------------------------------------------------

/**
 * Convert a markdown filename to a URL-safe slug by stripping the .md extension.
 */
export function generateSlug(filename: string): string {
  return filename.replace(/\.md$/, '');
}

// ---------------------------------------------------------------------------
// Markdown rendering
// ---------------------------------------------------------------------------

// Sanitization schema: extends defaults with elements needed for content
const sanitizeSchema = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    img: ['src', 'alt', 'title', 'width', 'height', 'loading'],
    a: ['href', 'title', 'target', 'rel'],
    td: ['align', 'valign'],
    th: ['align', 'valign'],
    code: ['className'],
    span: ['className'],
    pre: ['className'],
  },
  tagNames: [
    ...(defaultSchema.tagNames ?? []),
    'figure',
    'figcaption',
    'picture',
    'source',
    'details',
    'summary',
  ],
};

/**
 * Render markdown content to HTML using remark with GFM support and
 * rehype-sanitize to strip dangerous elements (scripts, event handlers).
 */
export async function renderMarkdown(content: string): Promise<string> {
  const result = await remark()
    .use(remarkGfm)
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeRaw)
    .use(rehypeSanitize, sanitizeSchema)
    .use(rehypeStringify)
    .process(content);
  return result.toString();
}

// ---------------------------------------------------------------------------
// Content directories
// ---------------------------------------------------------------------------

const CAMPFIRE_DIR = path.join(process.cwd(), 'content', 'campfire');

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
