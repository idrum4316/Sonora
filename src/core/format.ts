/** "1 track", "2 tracks". */
export function plural(n: number, noun: string): string {
  return `${n} ${noun}${n === 1 ? '' : 's'}`;
}

/** "m:ss". Expects whole seconds, so callers floor fractional times first. */
export function fmt(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

/** "1 hr 3 min" for > 1h, otherwise "m:ss" */
export function fmtDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h} hr ${m} min`;
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

/** "today", "yesterday", "3 days ago", "2 months ago": how long ago a time was, roughly. */
export function fmtAgo(time: number, now = Date.now()): string {
  const days = Math.floor((startOfDay(now) - startOfDay(time)) / 86_400_000);
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 14) return `${days} days ago`;
  if (days < 60) return `${Math.round(days / 7)} weeks ago`;
  if (days < 365) return `${Math.round(days / 30.4)} months ago`;
  const years = Math.floor(days / 365);
  return years === 1 ? 'a year ago' : `${years} years ago`;
}

const startOfDay = (t: number) => new Date(t).setHours(0, 0, 0, 0);

/** Plain text from a server's HTML, such as an artist biography. Line and paragraph breaks become newlines. */
export function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .trim();
}
