import type { ScheduledEvent, Handler } from "aws-lambda";
import { runIngest } from "../ingest/runIngest";

/**
 * EventBridge scheduled rule target (daily batch — PRD §8.3, §11).
 */
export const handler: Handler<ScheduledEvent> = async (_event) => {
  await runIngest();
  return { ok: true };
};
