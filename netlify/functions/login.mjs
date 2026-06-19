import { supabase, ok, err, CORS, makeToken } from './_db.mjs';

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: CORS, body: '' };
  if (event.httpMethod !== 'POST') return err('Method not allowed', 405);

  let username, password;
  try { ({ username, password } = JSON.parse(event.body)); } catch { return err('Invalid JSON'); }

  username = (username || '').trim().toLowerCase();
  if (!username || !password) return err('Missing credentials.');

  const { data: acct } = await supabase.from('accounts').select('username, salt, hash').eq('username', username).maybeSingle();
  if (!acct) return err('No account with that name.');

  const raw = new TextEncoder().encode(acct.salt + '::' + password);
  const buf = await crypto.subtle.digest('SHA-256', raw);
  const hash = [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');

  if (hash !== acct.hash) return err('Wrong password.');

  const token = await makeToken(username);
  return ok({ token, username });
}
