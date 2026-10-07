// Shared CORS + optional access token for every Blueprint endpoint.
// Files under api/_lib are not routes on Vercel (leading underscore).
//
// Environment variables (both optional — without them behaviour stays as before):
//   BLUEPRINT_TOKEN   if set, every request must send header  X-Blueprint-Token: <token>
//   ALLOWED_ORIGINS   comma-separated origins allowed by CORS, e.g.
//                     "https://my-app.vercel.app,null"  ("null" = the HTML file opened from disk)
import { timingSafeEqual } from 'node:crypto';

export function applyCors(req, res) {
  const allowed = String(process.env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
  const origin = req.headers.origin;
  if (!allowed.length) res.setHeader('Access-Control-Allow-Origin', '*');
  else if (origin && allowed.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Blueprint-Token');
}

export function authorized(req) {
  const token = process.env.BLUEPRINT_TOKEN;
  if (!token) return true;
  const got = Buffer.from(String(req.headers['x-blueprint-token'] || ''));
  const want = Buffer.from(token);
  return got.length === want.length && timingSafeEqual(got, want);
}

// Handles CORS, preflight, method and token. Returns true when the handler should stop.
export function guard(req, res) {
  applyCors(req, res);
  if (req.method === 'OPTIONS') { res.status(200).end(); return true; }
  if (req.method !== 'POST') { res.status(405).json({ error: 'POST only' }); return true; }
  if (!authorized(req)) { res.status(401).json({ error: 'UNAUTHORIZED' }); return true; }
  return false;
}
