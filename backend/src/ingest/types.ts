export type SourceRow = {
  id: string;
  locality_id: string;
  type: string;
  url: string;
  config: unknown;
  locality_name: string;
  city: string;
  county: string | null;
  region: string;
};

export type IngestResult = {
  sourcesProcessed: number;
  itemsInserted: number;
  errors: string[];
};
