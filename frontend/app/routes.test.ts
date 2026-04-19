import { describe, expect, it } from 'vitest';
import { readdirSync, statSync } from 'node:fs';
import path from 'node:path';

function walkDirs(root: string): string[] {
  const out: string[] = [];
  const stack = [root];

  while (stack.length) {
    const current = stack.pop()!;
    out.push(current);

    for (const entry of readdirSync(current)) {
      const full = path.join(current, entry);
      if (statSync(full).isDirectory()) stack.push(full);
    }
  }

  return out;
}

describe('app routes', () => {
  it('does not include unexpected dynamic routes (static export)', () => {
    const appDir = path.join(process.cwd(), 'app');
    const dirs = walkDirs(appDir);

    const dynamic = dirs
      .map(d => path.relative(appDir, d))
      .filter(rel => rel.split(path.sep).some(seg => seg.startsWith('[') && seg.endsWith(']')))
      .filter(rel => rel !== path.join('locality', '[id]'));

    expect(dynamic).toEqual([]);
  });
});
