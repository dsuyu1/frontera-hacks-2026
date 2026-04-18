export interface DiscoveredItem {
  externalId: string;
  title: string;
  url: string;
  publishedAt: Date;
  /** When set, stored to S3 under this key (optional raw snapshot). */
  rawSnapshotKey?: string;
}

export interface SourceConnector {
  listNewItemsSince(input: {
    lastSeenPublishedAt: Date | null;
    lastSeenItemKey: string | null;
    userAgent: string | null;
    respectRobots: boolean;
  }): Promise<DiscoveredItem[]>;
}
