import { XMLParser } from "fast-xml-parser";
import type { DiscoveredItem, SourceConnector } from "./types";

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  isArray: (name) =>
    name === "entry" || name === "link" || name === "atom:link",
});

function getText(node: unknown): string {
  if (node === null || node === undefined) return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (typeof node === "object" && "#text" in (node as object)) {
    return String((node as { "#text": unknown })["#text"]);
  }
  return "";
}

/**
 * YouTube exposes a public Atom feed per channel (no API quota).
 * URL: https://www.youtube.com/feeds/videos.xml?channel_id=CHANNEL_ID
 */
export function createYouTubeChannelConnector(config: {
  channelId: string;
}): SourceConnector {
  const feedUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${encodeURIComponent(config.channelId)}`;

  return {
    async listNewItemsSince(input) {
      const ua =
        input.userAgent ??
        "FronteraIngest/0.1 (+https://github.com/frontera-hacks; local-gov-feed)";
      const res = await fetch(feedUrl, {
        headers: { "User-Agent": ua, Accept: "application/atom+xml" },
      });
      if (!res.ok) {
        throw new Error(`YouTube RSS fetch failed: ${res.status} ${res.statusText}`);
      }
      const xml = await res.text();
      if (input.respectRobots) {
        // Public feed URL is allowed for typical use; per-source `respectRobots` is honored for HTML crawlers elsewhere.
      }
      const doc = parser.parse(xml) as Record<string, unknown>;
      const feed = (doc.feed ?? doc.rss?.channel ?? doc) as Record<string, unknown>;
      const rawEntries = feed.entry;
      const entries: unknown[] = Array.isArray(rawEntries)
        ? rawEntries
        : rawEntries
          ? [rawEntries]
          : [];

      const items: DiscoveredItem[] = [];
      for (const e of entries) {
        if (!e || typeof e !== "object") continue;
        const entry = e as Record<string, unknown>;
        const videoId =
          getEntryField(entry, "yt:videoId") ||
          extractIdFromYtId(String(getText(entry.id) || "")) ||
          "";
        const title = getText(entry.title) || "(untitled)";
        const publishedRaw = getText(entry.published) || getText(entry.updated);
        const publishedAt = publishedRaw ? new Date(publishedRaw) : new Date(0);
        const linkHref =
          findLinkHref(entry.link) ||
          (videoId ? `https://www.youtube.com/watch?v=${videoId}` : "");

        if (!videoId || !linkHref) continue;

        items.push({
          externalId: videoId,
          title,
          url: linkHref,
          publishedAt,
        });
      }

      items.sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime());

      if (!input.lastSeenPublishedAt) {
        return items;
      }
      const cutoff = input.lastSeenPublishedAt.getTime();
      return items.filter((i) => i.publishedAt.getTime() > cutoff);
    },
  };
}

function getEntryField(entry: Record<string, unknown>, name: string): string {
  const direct = entry[name];
  if (direct !== undefined) return getText(direct);
  const hit = Object.keys(entry).find(
    (k) => k === name || k.endsWith(`:${name.split(":").pop()}`),
  );
  return hit ? getText(entry[hit]) : "";
}

function extractIdFromYtId(idText: string): string | null {
  const m = idText.match(/video:(\w+)/);
  return m?.[1] ?? null;
}

function findLinkHref(
  link: unknown,
): string | null {
  if (!link) return null;
  const arr = Array.isArray(link) ? link : [link];
  for (const l of arr) {
    if (l && typeof l === "object") {
      const o = l as Record<string, unknown>;
      const rel = o["@_rel"];
      const href = o["@_href"] as string | undefined;
      if (href && (rel === "alternate" || rel === undefined)) {
        return href;
      }
    }
  }
  return null;
}
