import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import { withClient } from '../lib/db';

const bedrock = new BedrockRuntimeClient({ region: 'us-east-1' });

interface Event { video_id: string }

export const handler = async (event: Event) => {
  const { video_id } = event;

  return withClient(async (db) => {
    // Get all ready clips for this video
    const { rows: clips } = await db.query(
      `SELECT c.*, v.feed_item_id FROM clips c
       JOIN videos v ON v.id = c.video_id
       WHERE c.video_id = $1 AND c.status = 'ready'`,
      [video_id],
    );

    if (clips.length === 0) return { video_id, published: 0 };

    let published = 0;
    for (const clip of clips) {
      // Use Bedrock Sonnet for final polished summary
      const betterSummary = await refineSummary(clip.title, clip.summary);

      await db.query(
        "UPDATE clips SET summary = $1, status = 'published' WHERE id = $2",
        [betterSummary, clip.id],
      );

      // Update the parent feed item to be discoverable
      await db.query(
        "UPDATE feed_items SET summary = $1, categories = $2::text[] WHERE id = $3",
        [betterSummary, clip.categories, clip.feed_item_id],
      );

      published++;
    }

    await db.query("UPDATE videos SET status = 'published' WHERE id = $1", [video_id]);

    return { video_id, published };
  });
};

async function refineSummary(title: string, draftSummary: string): Promise<string> {
  try {
    const res = await bedrock.send(new InvokeModelCommand({
      modelId: 'anthropic.claude-3-5-sonnet-20241022-v2:0',
      body: JSON.stringify({
        anthropic_version: 'bedrock-2023-05-31',
        max_tokens: 200,
        messages: [{
          role: 'user',
          content: `Write a 2-sentence factual summary for this local government meeting clip. Be specific and informative. Title: "${title}". Draft summary: "${draftSummary}". Return only the summary text.`,
        }],
      }),
      contentType: 'application/json',
      accept: 'application/json',
    }));
    const resp = JSON.parse(new TextDecoder().decode(res.body));
    return resp.content[0].text.trim();
  } catch {
    return draftSummary;
  }
}
