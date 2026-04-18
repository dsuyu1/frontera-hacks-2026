import { randomUUID } from "node:crypto";
import { prisma } from "../lib/db";
import { computeDedupeHash } from "../lib/dedupe";
import { StandardUnit } from "@aws-sdk/client-cloudwatch";
import {
  emitIngestMetrics,
  logIngest,
} from "../lib/observability";
import { getConnector } from "../connectors/index";
import { enqueueVideoAcquisition } from "../jobs/videoQueue";

function maxDate(dates: Date[]): Date | null {
  if (dates.length === 0) return null;
  return new Date(Math.max(...dates.map((d) => d.getTime())));
}

function jurisdictionLabel(input: { name: string; county?: string | null; city?: string | null }) {
  if (input.city && input.county) return `${input.city}, ${input.county}`;
  if (input.city) return input.city;
  if (input.county) return input.county;
  return input.name;
}

export async function runIngest(options: { runId?: string } = {}) {
  const runId = options.runId ?? randomUUID();
  const maxPerSource = Number.parseInt(
    process.env.INGEST_MAX_ITEMS_PER_SOURCE ?? "100",
    10,
  );

  logIngest({
    level: "info",
    msg: "ingest_run_start",
    runId,
  });

  const sources = await prisma.source.findMany({
    where: { enabled: true },
    include: { locality: true },
  });

  for (let i = 0; i < sources.length; i++) {
    const source = sources[i]!;
    if (i > 0 && source.crawlDelayMs && source.crawlDelayMs > 0) {
      await new Promise((r) => setTimeout(r, source.crawlDelayMs));
    }
    const t0 = Date.now();
    let itemsDiscovered = 0;
    let itemsNew = 0;
    let itemsDuplicate = 0;
    try {
      const connector = getConnector(source.type, source.config);
      const userAgent = source.userAgent ?? null;
      const rawItems = await connector.listNewItemsSince({
        lastSeenPublishedAt: source.lastSeenPublishedAt,
        lastSeenItemKey: source.lastSeenItemKey,
        userAgent,
        respectRobots: source.respectRobots,
      });
      const items = rawItems
        .sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime())
        .slice(0, Number.isFinite(maxPerSource) ? maxPerSource : 100);
      itemsDiscovered = items.length;

      const jurs = jurisdictionLabel(source.locality);

      for (const item of items) {
        const dedupeHash = computeDedupeHash({
          sourceUrl: item.url,
          title: item.title,
          publishedAt: item.publishedAt,
          jurisdiction: jurs,
        });

        const existingFeed = await prisma.feedItem.findUnique({
          where: { dedupeHash },
        });

        await prisma.sourceItem.upsert({
          where: {
            sourceId_externalId: {
              sourceId: source.id,
              externalId: item.externalId,
            },
          },
          create: {
            sourceId: source.id,
            externalId: item.externalId,
            title: item.title,
            url: item.url,
            publishedAt: item.publishedAt,
            dedupeHash,
            rawSnapshotKey: item.rawSnapshotKey ?? null,
          },
          update: {
            title: item.title,
            url: item.url,
            publishedAt: item.publishedAt,
            dedupeHash,
            rawSnapshotKey: item.rawSnapshotKey ?? null,
          },
        });

        if (existingFeed) {
          itemsDuplicate += 1;
          continue;
        }

        const feed = await prisma.feedItem.create({
          data: {
            type: "video",
            localityId: source.localityId,
            jurisdiction: jurs,
            publishedAt: item.publishedAt,
            title: item.title,
            summary: null,
            sourceUrl: item.url,
            dedupeHash,
            sourceId: source.id,
          },
        });
        itemsNew += 1;

        const q = await enqueueVideoAcquisition({
          feedItemId: feed.id,
          sourceId: source.id,
          videoId: item.externalId,
          sourceUrl: item.url,
        });
        if (!q.queued) {
          logIngest({
            level: "info",
            msg: "video_queue_skipped",
            runId,
            sourceId: source.id,
            sourceName: source.name,
          });
        }
      }

      const newest = maxDate(items.map((i) => i.publishedAt));
      await prisma.source.update({
        where: { id: source.id },
        data: {
          lastSuccessAt: new Date(),
          lastRunStatus: "ok",
          lastRunError: null,
          lastRunAt: new Date(),
          ...(newest ? { lastSeenPublishedAt: newest } : {}),
          ...(items[0]?.externalId
            ? { lastSeenItemKey: items[0].externalId }
            : {}),
        },
      });

      const durationMs = Date.now() - t0;
      logIngest({
        level: "info",
        msg: "ingest_source_complete",
        runId,
        sourceId: source.id,
        sourceName: source.name,
        durationMs,
        itemsDiscovered,
        itemsNew,
        itemsDuplicate,
      });
      await emitIngestMetrics(
        { sourceId: source.id },
        { name: "ItemsIngested", value: itemsNew },
      );
      await emitIngestMetrics(
        { sourceId: source.id },
        { name: "IngestDurationMs", value: durationMs, unit: StandardUnit.Milliseconds },
      );
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      await prisma.source.update({
        where: { id: source.id },
        data: {
          lastRunStatus: "error",
          lastRunError: errMsg,
          lastRunAt: new Date(),
        },
      });
      logIngest({
        level: "error",
        msg: "ingest_source_failed",
        runId,
        sourceId: source.id,
        sourceName: source.name,
        error: errMsg,
        itemsDiscovered,
        itemsNew,
        itemsDuplicate,
      });
      await emitIngestMetrics({ sourceId: source.id }, { name: "IngestFailures", value: 1 });
    }
  }

  logIngest({
    level: "info",
    msg: "ingest_run_complete",
    runId,
  });
}
