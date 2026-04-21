import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { withClient } from '../lib/db';

const s3 = new S3Client({});
const BUCKET = process.env.S3_BUCKET!;

interface Event { video_id: string }

const WEB_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
const ANDROID_UA = 'com.google.android.youtube/20.10.38 (Linux; U; Android 14)';

function extractVideoId(url: string): string | null {
  const m =
    url.match(/[?&]v=([a-zA-Z0-9_-]{11})/) ??
    url.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/) ??
    url.match(/embed\/([a-zA-Z0-9_-]{11})/);
  return m ? m[1] : null;
}

function formatVttTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${s.toFixed(3).padStart(6, '0')}`;
}

// Parse YouTube timed-text XML to VTT string
function parseTimedTextXml(xml: string): string | null {
  const cues: { start: number; end: number; text: string }[] = [];
  const regex = /<text[^>]+start="([\d.]+)"[^>]*(?:dur="([\d.]+)")?[^>]*>([\s\S]*?)<\/text>/g;
  let m: RegExpExecArray | null;

  while ((m = regex.exec(xml)) !== null) {
    const start = parseFloat(m[1]);
    const dur = parseFloat(m[2] ?? '5');
    const rawText = m[3]
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
      .replace(/<[^>]+>/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    if (rawText) cues.push({ start, end: start + dur, text: rawText });
  }

  if (cues.length === 0) return null;

  const lines = ['WEBVTT', ''];
  cues.forEach((cue, i) => {
    lines.push(String(i + 1));
    lines.push(`${formatVttTime(cue.start)} --> ${formatVttTime(cue.end)}`);
    lines.push(cue.text);
    lines.push('');
  });
  return lines.join('\n');
}

async function fetchYouTubeCaptions(videoId: string): Promise<string | null> {
  // Step 1: Fetch the watch page to extract INNERTUBE_API_KEY
  let html: string;
  try {
    const ctrl = new AbortController();
    setTimeout(() => ctrl.abort(), 15_000);
    const pageRes = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
      signal: ctrl.signal,
      headers: {
        'User-Agent': WEB_UA,
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Cookie': 'CONSENT=YES+42',
      },
    });
    if (!pageRes.ok) return null;
    html = await pageRes.text();
  } catch (e) {
    console.warn(`Failed to fetch watch page for ${videoId}:`, e);
    return null;
  }

  const apiKeyMatch = html.match(/"INNERTUBE_API_KEY":\s*"([a-zA-Z0-9_-]+)"/);
  if (!apiKeyMatch) {
    console.warn(`No INNERTUBE_API_KEY found for ${videoId}`);
    return null;
  }
  const apiKey = apiKeyMatch[1];

  // Step 2: Call the player API with the Android client (bypasses bot detection)
  let playerData: any;
  try {
    const ctrl = new AbortController();
    setTimeout(() => ctrl.abort(), 15_000);
    const playerRes = await fetch(
      `https://www.youtube.com/youtubei/v1/player?key=${apiKey}`,
      {
        method: 'POST',
        signal: ctrl.signal,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': ANDROID_UA,
        },
        body: JSON.stringify({
          context: {
            client: {
              clientName: 'ANDROID',
              clientVersion: '20.10.38',
              androidSdkVersion: 34,
            },
          },
          videoId,
        }),
      },
    );
    if (!playerRes.ok) {
      console.warn(`Player API returned ${playerRes.status} for ${videoId}`);
      return null;
    }
    playerData = await playerRes.json();
  } catch (e) {
    console.warn(`Player API request failed for ${videoId}:`, e);
    return null;
  }

  // Step 3: Extract caption tracks from the player response
  const captionTracks: Array<{ baseUrl: string; languageCode: string; kind?: string }> =
    playerData?.captions?.playerCaptionsTracklistRenderer?.captionTracks ?? [];

  if (captionTracks.length === 0) {
    console.warn(`No captionTracks in player response for ${videoId}`);
    return null;
  }

  // Prefer English ASR (auto-generated), then any English, then first available
  const preferred =
    captionTracks.find(t => t.languageCode === 'en' && t.kind === 'asr') ??
    captionTracks.find(t => t.languageCode === 'en') ??
    captionTracks.find(t => t.languageCode?.startsWith('en')) ??
    captionTracks[0];

  if (!preferred?.baseUrl) return null;

  // Step 4: Fetch the timed-text XML (remove &fmt=srv3 to get default XML format)
  const captionUrl = preferred.baseUrl.replace(/&fmt=srv3/g, '');
  console.log(`Fetching captions XML for ${videoId}`);

  let xmlText: string;
  try {
    const ctrl = new AbortController();
    setTimeout(() => ctrl.abort(), 20_000);
    const captionRes = await fetch(captionUrl, {
      signal: ctrl.signal,
      headers: { 'User-Agent': WEB_UA },
    });
    if (!captionRes.ok) return null;
    xmlText = await captionRes.text();
  } catch (e) {
    console.warn(`Caption fetch failed for ${videoId}:`, e);
    return null;
  }

  console.log(`Caption XML: ${xmlText.length} bytes for ${videoId}`);
  return parseTimedTextXml(xmlText);
}

export const handler = async (event: Event) => {
  const { video_id } = event;

  return withClient(async (db) => {
    const { rows: [video] } = await db.query(
      'SELECT * FROM videos WHERE id = $1', [video_id],
    );
    if (!video) throw new Error(`Video not found: ${video_id}`);
    if (video.status !== 'pending') return { video_id, skipped: true, status: video.status };

    const videoUrl = video.source_url;
    const videoId = extractVideoId(videoUrl);

    let vttContent: string | null = null;

    if (videoId) {
      console.log(`Fetching captions for ${videoUrl} (id: ${videoId})`);
      try {
        vttContent = await fetchYouTubeCaptions(videoId);
        if (vttContent) {
          console.log(`Got captions for ${video_id}: ${vttContent.length} bytes`);
        } else {
          console.log(`No captions available for ${video_id}`);
        }
      } catch (err) {
        console.warn(`Caption fetch failed for ${video_id}:`, err);
      }
    } else {
      console.log(`No YouTube video ID extracted from ${videoUrl}`);
    }

    const s3Key = `captions/${video_id}/auto.vtt`;
    await s3.send(new PutObjectCommand({
      Bucket: BUCKET,
      Key: s3Key,
      Body: vttContent ?? 'WEBVTT\n\n',
      ContentType: 'text/vtt',
    }));

    await db.query(
      "UPDATE videos SET caption_s3_key = $1, status = 'transcribed' WHERE id = $2",
      [s3Key, video_id],
    );

    return {
      video_id,
      caption_s3_key: s3Key,
      status: 'transcribed',
      has_captions: !!vttContent,
    };
  });
};
