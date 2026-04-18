import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { withClient } from '../lib/db';

const bedrock = new BedrockRuntimeClient({ region: 'us-east-1' });
const s3 = new S3Client({});
const BUCKET = process.env.S3_BUCKET!;

interface Segment { start: number; end: number; title: string; summary: string; categories: string[] }
interface Event { video_id: string }

export const handler = async (event: Event) => {
  const { video_id } = event;

  return withClient(async (db) => {
    const { rows: [video] } = await db.query(
      'SELECT v.*, t.s3_key as transcript_key FROM videos v JOIN transcripts t ON t.video_id = v.id WHERE v.id = $1',
      [video_id],
    );
    if (!video) throw new Error(`Video not found: ${video_id}`);

    // Load transcript from S3
    const obj = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: video.transcript_key }));
    const raw = await obj.Body!.transformToString();
    const transcriptData = JSON.parse(raw);

    const items: Array<{ start_time: string; end_time: string; content: string; speaker: string }> =
      transcriptData.results?.items ?? [];

    const durationS: number = video.duration_s ?? 3600;
    const windowSize = 30 * 60; // 30 minutes in seconds
    const numWindows = Math.ceil(durationS / windowSize);

    const segments: Segment[] = [];

    for (let w = 0; w < numWindows; w++) {
      const windowStart = w * windowSize;
      const windowEnd = Math.min((w + 1) * windowSize, durationS);

      // Get transcript text for this window
      const windowItems = items.filter((item) => {
        const t = parseFloat(item.start_time ?? '0');
        return t >= windowStart && t < windowEnd && item.content;
      });

      if (windowItems.length === 0) continue;

      const transcriptText = windowItems.map((i) => i.content).join(' ').slice(0, 8000);

      const segment = await askBedrockForBestSegment(transcriptText, windowStart, windowEnd);
      segments.push(segment);
    }

    // Save segments to DB
    for (const seg of segments) {
      await db.query(
        `INSERT INTO clips (video_id, start_time_s, end_time_s, title, summary, categories, status)
         VALUES ($1, $2, $3, $4, $5, $6::text[], 'pending')`,
        [video_id, seg.start, seg.end, seg.title, seg.summary, seg.categories],
      );
    }

    await db.query("UPDATE videos SET status = 'segmented' WHERE id = $1", [video_id]);

    return { video_id, segments_created: segments.length };
  });
};

async function askBedrockForBestSegment(
  transcript: string, windowStart: number, windowEnd: number,
): Promise<Segment> {
  const prompt = `You are analyzing a local government meeting transcript segment (${formatTime(windowStart)} to ${formatTime(windowEnd)}).

Transcript:
${transcript}

Identify the single most important 60-90 second segment in this window. Return a JSON object with:
- "start": number (seconds from start of full video, between ${windowStart} and ${windowEnd})
- "end": number (seconds, max 180s after start)
- "title": string (specific title, e.g. "Rezoning vote for Main St development")
- "summary": string (2-3 sentence factual summary)
- "categories": array of relevant slugs from: politics-elections, city-council, planning-zoning, infrastructure, public-safety, education, transportation, utilities-water, economic-development, business, environment, budget-taxes, health

Return ONLY valid JSON, no other text.`;

  try {
    const res = await bedrock.send(new InvokeModelCommand({
      modelId: 'anthropic.claude-3-haiku-20240307-v1:0',
      body: JSON.stringify({
        anthropic_version: 'bedrock-2023-05-31',
        max_tokens: 512,
        messages: [{ role: 'user', content: prompt }],
      }),
      contentType: 'application/json',
      accept: 'application/json',
    }));

    const response = JSON.parse(new TextDecoder().decode(res.body));
    const text = response.content[0].text.trim();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON in response');

    const parsed = JSON.parse(jsonMatch[0]);
    return {
      start: Math.max(windowStart, Math.min(windowEnd - 60, Number(parsed.start))),
      end: Math.min(windowEnd, Number(parsed.start) + Math.min(180, Number(parsed.end) - Number(parsed.start))),
      title: String(parsed.title),
      summary: String(parsed.summary),
      categories: Array.isArray(parsed.categories) ? parsed.categories : ['city-council'],
    };
  } catch (err) {
    console.error('Bedrock segment selection failed, using fallback:', err);
    return {
      start: windowStart + Math.floor((windowEnd - windowStart) * 0.3),
      end: windowStart + Math.floor((windowEnd - windowStart) * 0.3) + 90,
      title: `Meeting segment ${formatTime(windowStart)}–${formatTime(windowEnd)}`,
      summary: 'Automated segment selection. Full transcript available.',
      categories: ['city-council'],
    };
  }
}

function formatTime(s: number): string {
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}` : `${m}:${String(sec).padStart(2, '0')}`;
}
