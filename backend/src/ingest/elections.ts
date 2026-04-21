import type { Pool } from 'pg';

export type ElectionSnapshot = {
  nextElectionDate: string | null;
  earlyVotingStart: string | null;
  earlyVotingEnd: string | null;
  rawExcerpt: string;
};

function cleanText(s: string): string {
  return s.replace(/\s+/g, ' ').trim();
}

function extractDateLike(s: string): string | null {
  const m = s.match(/\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},\s+\d{4}\b/i);
  if (!m) return null;
  const d = new Date(m[0]);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

export function parseElectionSnapshotFromText(text: string): ElectionSnapshot {
  const t = cleanText(text);

  const nextElectionDate = (
    extractDateLike((/Election Day\s+is\s+(?:on\s+)?([^\.]+)\./i.exec(t) ?? [])[1] ?? '')
    ?? extractDateLike((/For the\s+([^\-]+?)\s*-\s*(?:Joint\s+Local\s+Election|Joint\s+Local\s+Elections)/i.exec(t) ?? [])[1] ?? '')
    ?? extractDateLike(t)
  );

  const earlyVotingStart = extractDateLike((/First Day of Early Voting\s+([^\n]+?)(?:Polling|Last Day|Election Day|$)/i.exec(t) ?? [])[1] ?? '')
    ?? extractDateLike((/Early voting will begin\s+([^\n]+?)\s+and\s+will\s+run\s+to/i.exec(t) ?? [])[1] ?? '');

  const earlyVotingEnd = extractDateLike((/Last Day of Early Voting\s+([^\n]+?)(?:Election Day|$)/i.exec(t) ?? [])[1] ?? '')
    ?? extractDateLike((/will\s+run\s+to\s+([^\n]+?)\./i.exec(t) ?? [])[1] ?? '');

  const rawExcerpt = t.slice(0, 2000);

  return {
    nextElectionDate,
    earlyVotingStart,
    earlyVotingEnd,
    rawExcerpt,
  };
}

export async function refreshElectionSnapshots(pool: Pool): Promise<{ updated: number } > {
  const { rows: sources } = await pool.query<{ id: string; url: string }>(
    `SELECT id, url FROM election_sources WHERE active = true ORDER BY slug`,
  );

  let updated = 0;
  for (const src of sources) {
    const res = await fetch(src.url, { headers: { 'User-Agent': 'FronteraElections/0.1' } });
    if (!res.ok) continue;
    const text = await res.text();
    const snap = parseElectionSnapshotFromText(text);
    await pool.query(
      `INSERT INTO election_snapshots (source_id, next_election_date, early_voting_start, early_voting_end, raw_excerpt)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (source_id) DO UPDATE SET
         fetched_at = now(),
         next_election_date = EXCLUDED.next_election_date,
         early_voting_start = EXCLUDED.early_voting_start,
         early_voting_end = EXCLUDED.early_voting_end,
         raw_excerpt = EXCLUDED.raw_excerpt`,
      [src.id, snap.nextElectionDate, snap.earlyVotingStart, snap.earlyVotingEnd, snap.rawExcerpt],
    );
    updated += 1;
  }

  return { updated };
}

