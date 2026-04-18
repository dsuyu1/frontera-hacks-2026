#!/usr/bin/env node
import { runIngest } from "./ingest/runIngest";

await runIngest();
process.exit(0);
