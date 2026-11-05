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
