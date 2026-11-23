import { HttpError } from './httpError.js';

// Positive integer from a URL param or body value, else 400.
export function toInt(value, name = 'id') {
  const n = Number(value);
  if (!Number.isInteger(n) || n <= 0) throw new HttpError(400, `${name} must be a positive integer`);
  return n;
}

// Number with optional bounds, else 400.
export function toNumber(value, name, { min, integer = false } = {}) {
  const n = Number(value);
  if (value === '' || value === null || value === undefined || Number.isNaN(n)) {
    throw new HttpError(400, `${name} must be a number`);
  }
  if (integer && !Number.isInteger(n)) throw new HttpError(400, `${name} must be a whole number`);
  if (min !== undefined && n < min) throw new HttpError(400, `${name} must be at least ${min}`);
  return n;
}

// Every listed field must be present and non-empty, else 400.
export function requireFields(body, fields) {
  const missing = fields.filter((f) => body?.[f] === undefined || body[f] === null || String(body[f]).trim() === '');
  if (missing.length) throw new HttpError(400, `Missing required field(s): ${missing.join(', ')}`);
}

// Trimmed string or null when empty.
export function optionalText(value) {
  if (value === undefined || value === null) return null;
  const s = String(value).trim();
  return s === '' ? null : s;
}

export function pick(obj, keys) {
  return Object.fromEntries(keys.filter((k) => obj[k] !== undefined).map((k) => [k, obj[k]]));
}

export const round2 = (n) => Math.round(n * 100) / 100;
