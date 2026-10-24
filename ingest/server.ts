// Runs ingest, classify and embed together in one process. Run: npm run ingest-server
// Stopping the server (Ctrl+C) stops both.
import { runClassifier } from './classify.ts';
import { runEmbedder } from './embedder.ts';
import { runIngest } from './ingest.ts';

// Neither loop returns, so reaching the catch means one crashed. Exit rather than run half a pipeline.
await Promise.all([runIngest(), runClassifier(), runEmbedder()]).catch((err) => {
  console.error(err);
  process.exit(1);
});
