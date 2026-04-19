export interface Segment {
  start: number;
  end: number;
  title: string;
  summary: string;
  categories: string[];
}

export function normalizeSegments(
  segments: Segment[],
  opts: { windowStart: number; windowEnd: number; minDurationS?: number; maxDurationS?: number },
): Segment[] {
  const minDurationS = opts.minDurationS ?? 60;
  const maxDurationS = opts.maxDurationS ?? 180;

  const normalized = segments
    .map(s => {
      const start = Math.max(opts.windowStart, Math.floor(Number(s.start)));
      let end = Math.floor(Number(s.end));
      if (!Number.isFinite(end)) end = start + minDurationS;
      end = Math.min(opts.windowEnd, end);

      const duration = end - start;
      if (duration < minDurationS) end = Math.min(opts.windowEnd, start + minDurationS);
      if (end - start > maxDurationS) end = Math.min(opts.windowEnd, start + maxDurationS);

      return {
        start,
        end,
        title: String(s.title ?? '').trim(),
        summary: String(s.summary ?? '').trim(),
        categories: Array.isArray(s.categories) ? s.categories.map(String) : ['city-council'],
      } satisfies Segment;
    })
    .filter(s => s.title && s.end > s.start)
    .sort((a, b) => a.start - b.start);

  const out: Segment[] = [];
  for (const seg of normalized) {
    const prev = out[out.length - 1];
    if (!prev) {
      out.push(seg);
      continue;
    }
    if (seg.start < prev.end) {
      if (seg.start === prev.start && seg.end > prev.end) {
        out[out.length - 1] = seg;
      }
      continue;
    }
    out.push(seg);
  }

  return out;
}
