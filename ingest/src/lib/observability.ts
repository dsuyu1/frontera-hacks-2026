import {
  CloudWatchClient,
  PutMetricDataCommand,
  StandardUnit,
} from "@aws-sdk/client-cloudwatch";

export type IngestLogLevel = "info" | "warn" | "error";

export interface IngestLogRecord {
  ts: string;
  level: IngestLogLevel;
  msg: string;
  sourceId?: string;
  sourceName?: string;
  runId: string;
  durationMs?: number;
  itemsDiscovered?: number;
  itemsNew?: number;
  itemsDuplicate?: number;
  error?: string;
}

const cw =
  process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION
    ? new CloudWatchClient({})
    : null;

const namespace = process.env.INGEST_METRICS_NAMESPACE ?? "Frontera/Ingest";

/** Structured JSON logs for CloudWatch Logs Insights (PRD §11). */
export function logIngest(record: Omit<IngestLogRecord, "ts"> & { ts?: string }) {
  const line: IngestLogRecord = {
    ts: record.ts ?? new Date().toISOString(),
    level: record.level,
    msg: record.msg,
    runId: record.runId,
    ...(record.sourceId !== undefined ? { sourceId: record.sourceId } : {}),
    ...(record.sourceName !== undefined ? { sourceName: record.sourceName } : {}),
    ...(record.durationMs !== undefined ? { durationMs: record.durationMs } : {}),
    ...(record.itemsDiscovered !== undefined
      ? { itemsDiscovered: record.itemsDiscovered }
      : {}),
    ...(record.itemsNew !== undefined ? { itemsNew: record.itemsNew } : {}),
    ...(record.itemsDuplicate !== undefined
      ? { itemsDuplicate: record.itemsDuplicate }
      : {}),
    ...(record.error !== undefined ? { error: record.error } : {}),
  };
  const text = JSON.stringify(line);
  if (record.level === "error") {
    console.error(text);
  } else if (record.level === "warn") {
    console.warn(text);
  } else {
    console.log(text);
  }
}

export async function emitIngestMetrics(dimensions: { sourceId?: string }, body: {
  name: string;
  value: number;
  unit?: StandardUnit;
}) {
  if (!cw) return;
  try {
    await cw.send(
      new PutMetricDataCommand({
        Namespace: namespace,
        MetricData: [
          {
            MetricName: body.name,
            Value: body.value,
            Unit: body.unit ?? StandardUnit.Count,
            Timestamp: new Date(),
            ...(dimensions.sourceId
              ? {
                  Dimensions: [{ Name: "SourceId", Value: dimensions.sourceId }],
                }
              : {}),
          },
        ],
      }),
    );
  } catch {
    // Metrics failures must not block ingest (PRD §11 best-effort).
  }
}
