import { describe, expect, test } from 'vitest';
import { normalizeSegments } from './selectSegments';

describe('normalizeSegments', () => {
  test('clamps to window bounds and enforces duration limits', () => {
    const out = normalizeSegments(
      [
        { start: -10, end: 10, title: 'A', summary: 'a', categories: ['x'] },
        { start: 50, end: 5000, title: 'B', summary: 'b', categories: ['y'] },
      ],
      { windowStart: 100, windowEnd: 220 },
    );

    expect(out).toHaveLength(1);
    expect(out[0].start).toBe(100);
    expect(out[0].end).toBe(220);
  });

  test('drops overlaps by keeping earliest segments and sorting', () => {
    const out = normalizeSegments(
      [
        { start: 190, end: 240, title: 'Late', summary: 'l', categories: ['x'] },
        { start: 110, end: 180, title: 'Early', summary: 'e', categories: ['x'] },
        { start: 170, end: 210, title: 'Overlap', summary: 'o', categories: ['x'] },
      ],
      { windowStart: 100, windowEnd: 260 },
    );

    expect(out.map(s => s.title)).toEqual(['Early', 'Late']);
    expect(out[0].end).toBeLessThanOrEqual(out[1].start);
  });
});
