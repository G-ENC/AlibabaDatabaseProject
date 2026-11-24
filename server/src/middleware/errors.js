import { HttpError } from '../utils/httpError.js';

export function notFound(req, res) {
  res.status(404).json({ error: 'Not found' });
}

// Express 5 forwards errors from async handlers here automatically.
export function errorHandler(err, req, res, next) {
  if (err instanceof HttpError) return res.status(err.status).json({ error: err.message });
  if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'Invalid JSON body' });

  // PostgreSQL constraint errors (used once the database is connected).
  if (err.code === '23505') return res.status(409).json({ error: 'Already exists' });
  if (err.code === '23503') return res.status(409).json({ error: 'Linked to other records, or the referenced record does not exist' });
  if (err.code === '23514') return res.status(400).json({ error: 'Value breaks a rule of the database' });

  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
}
