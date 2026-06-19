import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY  // service role — never exposed to browser
);

// CORS headers included on every response
export const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

export const ok  = (body, status = 200) => ({ statusCode: status, headers: { ...CORS, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
export const err = (msg,  status = 400) => ({ statusCode: status, headers: { ...CORS, 'Content-Type': 'application/json' }, body: JSON.stringify({ error: msg }) });

// Tokens are stateless (no DB lookup needed to verify), but now carry an expiry:
// token = base64(username + "|" + expiresAtMillis) + "." + HMAC-SHA256(that payload)
// They self-expire after TOKEN_TTL_MS — no more "valid forever" tokens.
// Rotating TOKEN_SECRET still invalidates every token at once if you ever need to.
const TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

async function hmacHex(secret, message) {
  const keyMat = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', keyMat, new TextEncoder().encode(message));
  return [...new Uint8Array(sig)].map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function makeToken(username) {
  const secret = process.env.TOKEN_SECRET; // set this in Netlify env vars to any long random string
  const expiresAt = Date.now() + TOKEN_TTL_MS;
  const payload = `${username}|${expiresAt}`;
  const sig = await hmacHex(secret, payload);
  return btoa(payload) + '.' + sig;
}

export async function verifyToken(token) {
  try {
    const [b64, sig] = token.split('.');
    if (!b64 || !sig) return null;
    const payload = atob(b64);
    const [username, expiresAtStr] = payload.split('|');
    const expiresAt = Number(expiresAtStr);
    if (!username || !expiresAt) return null;
    if (Date.now() > expiresAt) return null; // expired — caller gets 401, client re-prompts login
    const expected = await hmacHex(process.env.TOKEN_SECRET, payload);
    if (sig !== expected) return null;
    return username;
  } catch { return null; }
}
