import express, {type ErrorRequestHandler} from 'express';
import {corpus} from './corpus.js';
import {RequestSchema} from '../shared/schema.js';
import {createRetriever, answer} from './rag.js';

// Module initialization happens once per warm runtime. The curated index is
// rebuilt in memory on cold starts, so hosting does not need writable storage.
const retriever = createRetriever(':memory:');
const app = express();

app.use(express.json({limit: '8kb'}));
app.post('/api/ask', (req, res) => {
  const parsed = RequestSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({error: 'Choose a card, enter a question, and use a valid date.'});
    return;
  }
  try {
    res.json(answer(parsed.data, retriever));
  } catch {
    res.status(500).json({error: 'The local evidence search failed. Please retry.'});
  }
});
app.get('/api/catalog', (_, res) => res.json(corpus));
app.get('/api/health', (_, res) => res.json({ok: true, mode: 'local-extractive-demo'}));
app.use('/api', (_, res) => res.status(404).json({error: 'This API route was not found.'}));

const handleError: ErrorRequestHandler = (error, _req, res, next) => {
  if (res.headersSent) {
    next(error);
    return;
  }
  if (error?.type === 'entity.too.large') {
    res.status(413).json({error: 'This request is too large. Please shorten your question.'});
    return;
  }
  if (error?.type === 'entity.parse.failed') {
    res.status(400).json({error: 'The request must contain valid JSON.'});
    return;
  }
  res.status(500).json({error: 'The benefit service could not complete this request.'});
};
app.use(handleError);

export default app;
