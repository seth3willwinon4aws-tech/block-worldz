import { supabase, ok, err, CORS, makeToken } from './_db.mjs';

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: CORS, body: '' };
  if (event.httpMethod !== 'POST') return err('Method not allowed', 405);

  let username, password;
  try { ({ username, password } = JSON.parse(event.body)); } catch { return err('Invalid JSON'); }

  username = (username || '').trim().toLowerCase();
  if (!username || username.length < 2) return err('Username must be 2+ characters.');
  if (!/^[a-z0-9_]+$/.test(username))  return err('Letters, numbers, and underscore only.');
  if (username === 'guest')             return err('That name is reserved.');
  if (!password || password.length < 4) return err('Password must be 4+ characters.');

  // Check username taken
  const { data: existing } = await supabase.from('accounts').select('username').eq('username', username).maybeSingle();
  if (existing) return err('Username already taken.');

  // Hash password with SHA-256 + random salt (Web Crypto available in Node 18+)
  const salt = crypto.randomUUID() + crypto.randomUUID();
  const raw  = new TextEncoder().encode(salt + '::' + password);
  const buf  = await crypto.subtle.digest('SHA-256', raw);
  const hash = [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');

  const { error } = await supabase.from('accounts').insert({ username, salt, hash, created_at: new Date().toISOString() });
  if (error) return err('Could not create account: ' + error.message, 500);

  // Also create a default profile row
  const defaultProfile = {
    username,
    name: username,
    skin: 0xffcb8e, shirt: 0xe8553e, legs: 0x3554a0,
    hat: { type: 'none', color: 0xffd33d },
    decal: { kind: 'none', value: null },
    accessory: null,
    cubits: 100, owned: [], play_ms: 0, earned_chunks: 0,
  };
  await supabase.from('profiles').insert(defaultProfile);

  const token = await makeToken(username);
  return ok({ token, username });
}
