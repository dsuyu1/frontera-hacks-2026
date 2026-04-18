import type { SourceConnector } from "./types";
import { createYouTubeChannelConnector } from "./youtubeRss";

export type SourceConfigYoutube = { channelId: string };

export function getConnector(
  type: string,
  config: unknown,
): SourceConnector {
  if (type === "youtube_channel") {
    const c = config as SourceConfigYoutube;
    if (!c?.channelId) {
      throw new Error("youtube_channel config requires channelId");
    }
    return createYouTubeChannelConnector({ channelId: c.channelId });
  }
  throw new Error(`Unsupported source type: ${type}`);
}

export * from "./types";
export { createYouTubeChannelConnector } from "./youtubeRss";
