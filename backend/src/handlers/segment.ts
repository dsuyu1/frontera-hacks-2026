import { BedrockRuntimeClient, ConverseCommand } from '@aws-sdk/client-bedrock-runtime';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { withClient } from '../lib/db';
import { normalizeSegments, type Segment } from '../segmenting/selectSegments';

const bedrock = new BedrockRuntimeClient({ region: 'us-east-1' });
const s3 = new S3Client({});
const BUCKET = process.env.S3_BUCKET!;

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

function parseTranscribeJson(json: string): VttCue[] {
  try {
    const data = JSON.parse(json);
    const items = data.results?.items ?? [];
    const cues: VttCue[] = [];
    let sentence = '';
    let sentStart = 0;
    let sentEnd = 0;

    for (const item of items) {
      if (item.type === 'punctuation') {
        sentence += item.alternatives[0]?.content ?? '';
        continue;
      }
      const word = item.alternatives[0]?.content ?? '';
      if (!sentence) sentStart = parseFloat(item.start_time ?? '0');
      sentence += (sentence ? ' ' : '') + word;
      sentEnd = parseFloat(item.end_time ?? String(sentStart + 1));

      if (sentence.split(' ').length >= 15) {
        cues.push({ start: sentStart, end: sentEnd, text: sentence });
        sentence = '';
      }
    }
    if (sentence) cues.push({ start: sentStart, end: sentEnd, text: sentence });
    return cues;
  } catch {
    return [];
  }
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
        const rawText = await obj.Body!.transformToString();
        // Detect format: Transcribe JSON has a "results" key; VTT starts with WEBVTT
        if (rawText.trimStart().startsWith('{')) {
          cues = parseTranscribeJson(rawText);
        } else {
          cues = parseVtt(rawText);
        }
      } catch {
        console.warn('Could not load captions for', video_id);
      }
    }

    // Extract YouTube video ID safely for embed URL construction
    const youtubeIdMatch = video.source_url?.match(/[?&]v=([^&]+)/) ?? video.source_url?.match(/youtu\.be\/([^?]+)/);
    const embedBase = video.embed_url ?? (youtubeIdMatch ? `https://www.youtube.com/embed/${youtubeIdMatch[1]}` : null);

    // If no captions or very sparse, generate one segment from video title/description
    if (cues.length < 5) {
      const { rows: [fi] } = await db.query(
        'SELECT title, summary FROM feed_items WHERE id = $1', [video.feed_item_id],
      );
      const seg = await generateSegmentFromMeta(fi?.title ?? 'Meeting', fi?.summary ?? '');
      const clipEmbedUrl = embedBase ? `${embedBase}?start=${seg.start}&end=${seg.end}` : null;
      await db.query(
        `INSERT INTO clips (video_id, start_time_s, end_time_s, title, summary, categories, embed_url, status)
         VALUES ($1, $2, $3, $4, $5, $6::text[], $7, 'pending')`,
        [video_id, seg.start, seg.end, seg.title, seg.summary, seg.categories, clipEmbedUrl],
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
      const segs = await askBedrockForSegments(transcriptText, windowStart, windowEnd);
      const picked = normalizeSegments(segs, { windowStart, windowEnd }).slice(0, 2);
      for (const seg of picked) {
        const clipEmbedUrl = embedBase ? `${embedBase}?start=${seg.start}&end=${seg.end}` : null;
        await db.query(
          `INSERT INTO clips (video_id, start_time_s, end_time_s, title, summary, categories, embed_url, status)
           VALUES ($1, $2, $3, $4, $5, $6::text[], $7, 'pending')`,
          [video_id, seg.start, seg.end, seg.title, seg.summary, seg.categories, clipEmbedUrl],
        );
        segmentsCreated++;
      }
    }

    await db.query("UPDATE videos SET status = 'segmented' WHERE id = $1", [video_id]);
    return { video_id, segments_created: segmentsCreated };
  });
};

async function askBedrockForSegments(transcript: string, windowStart: number, windowEnd: number): Promise<Segment[]> {
  const prompt = `You are a local government reporter analyzing a meeting transcript (${formatTime(windowStart)}–${formatTime(windowEnd)}).

Transcript excerpt:
${transcript}

Pick the 2 most newsworthy moments in this time range. For each moment:
- Choose a start/end within this window.
- Make the clip 60–180 seconds.
- Write a SHORT, SPECIFIC newspaper headline (5–9 words).
- Write a 1–2 sentence summary about the decision and civic impact.

Return ONLY valid JSON array (no markdown):
[
  {"start": <seconds>, "end": <seconds>, "title": "...", "summary": "...", "categories": ["<1-2 slugs>"]},
  {"start": <seconds>, "end": <seconds>, "title": "...", "summary": "...", "categories": ["<1-2 slugs>"]}
]

Allowed category slugs:
politics-elections,city-council,planning-zoning,infrastructure,public-safety,education,transportation,utilities-water,economic-development,business,environment,budget-taxes,health`;

  try {
    const res = await bedrock.send(new ConverseCommand({
      modelId: process.env.BEDROCK_HAIKU_MODEL_ID ?? 'amazon.nova-lite-v1:0',
      messages: [{ role: 'user', content: [{ text: prompt }] }],
      inferenceConfig: { maxTokens: 700 },
    }));
    const text = res.output?.message?.content?.[0]?.text?.trim() ?? '';
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) throw new Error('No JSON');
    const parsed = JSON.parse(jsonMatch[0]);
    if (!Array.isArray(parsed)) throw new Error('Not array');
    return parsed as Segment[];
  } catch {
    return [
      {
        start: windowStart + 60,
        end: Math.min(windowEnd, windowStart + 180),
        title: `Meeting Segment ${formatTime(windowStart)}`,
        summary: 'Government meeting discussion.',
        categories: ['city-council'],
      },
    ];
  }
}

async function generateSegmentFromMeta(title: string, description: string): Promise<Segment> {
  try {
    const res = await bedrock.send(new ConverseCommand({
      modelId: process.env.BEDROCK_HAIKU_MODEL_ID ?? 'amazon.nova-lite-v1:0',
      messages: [{
        role: 'user',
        content: [{ text: `You are a local government reporter. Create a SHORT, SPECIFIC newspaper headline (5-9 words) for this government meeting video. The headline should describe the most likely civic action, not just repeat the video title.

Video title: "${title}"
Description: "${description}"

Examples of good headlines: "City Council Reviews Annual Infrastructure Budget", "McAllen Approves New Drainage Improvement Plan"

Return ONLY valid JSON: {"start":60,"end":180,"title":"<specific 5-9 word headline>","summary":"<2 sentences about what this meeting likely covers and why it matters to residents>","categories":["city-council"]}` }],
      }],
      inferenceConfig: { maxTokens: 300 },
    }));
    const text = res.output?.message?.content?.[0]?.text?.trim() ?? '';
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
