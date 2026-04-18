import { createHash } from "node:crypto";

/**
 * Strip tracking params and normalize URL for stable dedupe keys (PRD §12.2).
 */
export function canonicalizeUrl(raw: string): string {
  try {
    const u = new URL(raw);
    const drop = [
      "utm_source",
      "utm_medium",
      "utm_campaign",
      "utm_content",
      "utm_term",
      "fbclid",
      "gclid",
    ];
    for (const k of drop) {
      u.searchParams.delete(k);
    }
    u.hash = "";
    return u.toString();
  } catch {
    return raw.trim();
  }
}

function normalizeTitle(title: string): string {
  return title.trim().replace(/\s+/g, " ").toLowerCase();
}

/**
 * Bucket publish time to a one-hour window for "same event" collapsing when titles/URLs match closely (PRD §12.2).
 */
function timeBucketKey(d: Date): string {
  const t = d.getTime();
  const hourMs = 60 * 60 * 1000;
  return String(Math.floor(t / hourMs));
}

/**
 * Dedupe identity: canonical URL + normalized title + hourly time bucket + jurisdiction hint.
 */
export function computeDedupeHash(input: {
  sourceUrl: string;
  title: string;
  publishedAt: Date;
  jurisdiction?: string;
}): string {
  const payload = [
    canonicalizeUrl(input.sourceUrl),
    normalizeTitle(input.title),
    timeBucketKey(input.publishedAt),
    (input.jurisdiction ?? "").trim().toLowerCase(),
  ].join("|");

  return createHash("sha256").update(payload, "utf8").digest("hex");
}
