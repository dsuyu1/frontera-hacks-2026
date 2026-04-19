import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { withClient } from '../lib/db';

const bedrock = new BedrockRuntimeClient({ region: 'us-east-1' });
const s3 = new S3Client({});
const BUCKET = process.env.S3_BUCKET!;

interface Segment { start: number; end: number; title: string; summary: string; categories: string[] }
interface Event { video_id: string }

interface VttCue { start: number; end: number; text: string }

function parseVtt(vtt: string): VttCue[] {
  const cues: VttCue[] = [];
  const blocks = vtt.split(/\n\n+/);
  for (const block of blocks) {
    const lines = block.trim().split('\n');
    const timeLine = lines.find(l => l.includes('-->'));
    if (!timeLine) continue;
    const [startStr, endStr] = timeLine.split('-->').map(s => s.trim().split(' ')[0]);
    const start = toSeconds(startStr);
    const end = toSeconds(endStr);
    const text = lines.filter(l => !l.includes('-->') && !l.match(/^\d+$/) && l.trim())
      .join(' ')
      .replace(/<[^>]+>/g, '')
      .trim();
    if (text && text !== '[music]' && text !== '[Music]') {
      cues.push({ start, end, text });
    }
  }
  return cues;
}

function toSeconds(ts: string): number {
  const parts = ts.split(':').map(Number);
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return parts[0];
}

export const handler = async (event: Event) => {
  const { video_id } = event;

  return withClient(async (db) => {
    const { rows: [video] } = await db.query(
      'SELECT * FROM videos WHERE id = $1',
      [video_id],
    );
    if (!video) throw new Error(`Video not found: ${video_id}`);

    const captionKey = video.caption_s3_key;
    let cues: VttCue[] = [];

    if (captionKey) {
      try {
        const obj = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: captionKey }));
        const vttText = await obj.Body!.transformToString();
        cues = parseVtt(vttText);
      } catch {
        console.warn('Could not load captions for', video_id);
      }
    }

    const embedBase = video.embed_url ?? `https://www.youtube.com/embed/${video.source_url.split('v=')[1]}`;

    // If no captions or very sparse, generate one segment from video title/description
    if (cues.length < 5) {
      const { rows: [fi] } = await db.query(
        'SELECT title, summary FROM feed_items WHERE id = $1', [video.feed_item_id],
      );
      const seg = await generateSegmentFromMeta(fi?.title ?? 'Meeting', fi?.summary ?? '');
      await db.query(
        `INSERT INTO clips (video_id, start_time_s, end_time_s, title, summary, categories, embed_url, status)
         VALUES ($1, $2, $3, $4, $5, $6::text[], $7, 'pending')`,
        [video_id, seg.start, seg.end, seg.title, seg.summary, seg.categories,
         `${embedBase}?start=${seg.start}`],
      );
      await db.query("UPDATE videos SET status = 'segmented' WHERE id = $1", [video_id]);
      return { video_id, segments_created: 1 };
    }

    const durationS = cues[cues.length - 1]?.end ?? 3600;
    const windowSize = 30 * 60;
    const numWindows = Math.ceil(durationS / windowSize);
    let segmentsCreated = 0;

    for (let w = 0; w < numWindows; w++) {
      const windowStart = w * windowSize;
      const windowEnd = Math.min((w + 1) * windowSize, durationS);
      const windowCues = cues.filter(c => c.start >= windowStart && c.start < windowEnd);
      if (windowCues.length < 3) continue;

      const transcriptText = windowCues.map(c => c.text).join(' ').slice(0, 6000);
      const seg = await askBedrockForSegment(transcriptText, windowStart, windowEnd);

      await db.query(
        `INSERT INTO clips (video_id, start_time_s, end_time_s, title, summary, categories, embed_url, status)
         VALUES ($1, $2, $3, $4, $5, $6::text[], $7, 'pending')`,
        [video_id, seg.start, seg.end, seg.title, seg.summary, seg.categories,
         `${embedBase}?start=${seg.start}`],
      );
      segmentsCreated++;
    }

    await db.query("UPDATE videos SET status = 'segmented' WHERE id = $1", [video_id]);
    return { video_id, segments_created: segmentsCreated };
  });
};

async function askBedrockForSegment(transcript: string, windowStart: number, windowEnd: number): Promise<Segment> {
  const prompt = `You are a local government reporter analyzing a meeting transcript (${formatTime(windowStart)}–${formatTime(windowEnd)}).

Transcript excerpt:
${transcript}

Identify the single most newsworthy agenda item or decision. Write a SHORT, SPECIFIC newspaper headline for it (5-9 words, action-focused).
Good examples: "Council Approves $4M Road Repaving Contract", "Zoning Variance Denied for Proposed Walmart", "New Police Substation Approved for South Side"
Bad examples: "Meeting Discussion", "City Council Meeting", "Council Talks About Issues"

Return ONLY valid JSON:
{"start": <seconds from transcript>, "end": <start + 60 to 120>, "title": "<newspaper headline, max 10 words>", "summary": "<2 sentences describing the decision and its civic impact>", "categories": [<1-2 slugs from: politics-elections,city-council,planning-zoning,infrastructure,public-safety,education,transportation,utilities-water,economic-development,business,environment,budget-taxes,health>]}`;

  try {
    const res = await bedrock.send(new InvokeModelCommand({
      modelId: 'anthropic.claude-3-haiku-20240307-v1:0',
      body: JSON.stringify({
        anthropic_version: 'bedrock-2023-05-31',
        max_tokens: 400,
        messages: [{ role: 'user', content: prompt }],
      }),
      contentType: 'application/json',
      accept: 'application/json',
    }));
    const response = JSON.parse(new TextDecoder().decode(res.body));
    const text = response.content[0].text.trim();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON');
    const parsed = JSON.parse(jsonMatch[0]);
    return {
      start: Math.max(windowStart, Number(parsed.start)),
      end: Math.min(windowEnd, Number(parsed.start) + Math.min(120, Number(parsed.end) - Number(parsed.start))),
      title: String(parsed.title),
      summary: String(parsed.summary),
      categories: Array.isArray(parsed.categories) ? parsed.categories : ['city-council'],
    };
  } catch {
    return {
      start: windowStart + 60,
      end: windowStart + 180,
      title: `Meeting Segment ${formatTime(windowStart)}`,
      summary: 'Government meeting discussion.',
      categories: ['city-council'],
    };
  }
}

async function generateSegmentFromMeta(title: string, description: string): Promise<Segment> {
  try {
    const res = await bedrock.send(new InvokeModelCommand({
      modelId: 'anthropic.claude-3-haiku-20240307-v1:0',
      body: JSON.stringify({
        anthropic_version: 'bedrock-2023-05-31',
        max_tokens: 300,
        messages: [{
          role: 'user',
          content: `You are a local government reporter. Create a SHORT, SPECIFIC newspaper headline (5-9 words) for this government meeting video. The headline should describe the most likely civic action, not just repeat the video title.

Video title: "${title}"
Description: "${description}"

Examples of good headlines: "City Council Reviews Annual Infrastructure Budget", "McAllen Approves New Drainage Improvement Plan"

Return ONLY valid JSON: {"start":60,"end":180,"title":"<specific 5-9 word headline>","summary":"<2 sentences about what this meeting likely covers and why it matters to residents>","categories":["city-council"]}`,
        }],
      }),
      contentType: 'application/json',
      accept: 'application/json',
    }));
    const response = JSON.parse(new TextDecoder().decode(res.body));
    const text = response.content[0].text.trim();
    const parsed = JSON.parse(text.match(/\{[\s\S]*\}/)![0]);
    return { start: 60, end: 180, title: parsed.title ?? title, summary: parsed.summary ?? description, categories: parsed.categories ?? ['city-council'] };
  } catch {
    return { start: 60, end: 180, title, summary: description || 'Government meeting recording.', categories: ['city-council'] };
  }
}

function formatTime(s: number): string {
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}` : `${m}:${String(sec).padStart(2, '0')}`;
}
