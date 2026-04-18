import { SQSClient, SendMessageCommand } from "@aws-sdk/client-sqs";

export interface VideoAcquisitionMessage {
  feedItemId: string;
  sourceId: string;
  videoId: string;
  sourceUrl: string;
}

const sqsClient =
  process.env.VIDEO_ACQUISITION_QUEUE_URL &&
  (process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION)
    ? new SQSClient({})
    : null;

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Enqueue downstream video acquisition (download / transcribe pipeline). No-op if queue URL unset (local dev).
 */
export async function enqueueVideoAcquisition(
  msg: VideoAcquisitionMessage,
): Promise<{ queued: boolean; reason?: string }> {
  const queueUrl = process.env.VIDEO_ACQUISITION_QUEUE_URL;
  if (!queueUrl || !sqsClient) {
    return {
      queued: false,
      reason: "VIDEO_ACQUISITION_QUEUE_URL or AWS region not configured",
    };
  }

  const body = JSON.stringify(msg);
  let attempt = 0;
  const maxAttempts = 4;
  let delay = 200;
  for (;;) {
    try {
      await sqsClient.send(
        new SendMessageCommand({
          QueueUrl: queueUrl,
          MessageBody: body,
        }),
      );
      return { queued: true };
    } catch (err) {
      attempt += 1;
      if (attempt >= maxAttempts) {
        throw err;
      }
      await sleep(delay);
      delay = Math.min(delay * 2, 5000);
    }
  }
}
