import { CORS, ok } from './_db.mjs';

// Public config for the browser — only ever the URL + anon key, which Supabase
// designs to be safe in client-side code (unlike SUPABASE_SERVICE_ROLE_KEY,
// which stays in env vars and is never sent here). Used to open a Realtime
// connection for multiplayer; no DB tables or RLS changes are needed for that.
export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: CORS, body: '' };
  return ok({
    url: process.env.SUPABASE_URL || null,
    anonKey: process.env.SUPABASE_ANON_KEY || null,
  });
}
