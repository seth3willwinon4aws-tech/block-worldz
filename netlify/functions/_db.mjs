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

// Verify the simple token we issue: base64(username):sha256sig
// We use Supabase's anon JWT secret as an HMAC key via the Web Crypto API
export async function makeToken(username) {
  const secret = process.env.TOKEN_SECRET; // set this in Netlify env vars to any long random string
  const data = new TextEncoder().encode(secret + ':' + username);
  const keyMat = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', keyMat, new TextEncoder().encode(username));
  const sigHex = [...new Uint8Array(sig)].map(b => b.toString(16).padStart(2, '0')).join('');
  return btoa(username) + '.' + sigHex;
}

export async function verifyToken(token) {
  try {
    const [b64, sig] = token.split('.');
    const username = atob(b64);
    const expected = await makeToken(username);
    if (token !== expected) return null;
    return username;
  } catch { return null; }
}
