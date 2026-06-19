import { supabase, ok, err, CORS, verifyToken } from './_db.mjs';

async function authed(event) {
  const auth = event.headers['authorization'] || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return null;
  return verifyToken(token); // returns username or null
}

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: CORS, body: '' };

  const username = await authed(event);
  if (!username) return err('Unauthorized', 401);

  // GET — load profile + published worlds + marketplace creations
  if (event.httpMethod === 'GET') {
    const [{ data: profile }, { data: published }, { data: market }] = await Promise.all([
      supabase.from('profiles').select('*').eq('username', username).maybeSingle(),
      supabase.from('published').select('*').eq('username', username),
      supabase.from('user_market').select('*').eq('username', username),
    ]);
    return ok({ profile, published: published || [], market: market || [] });
  }

  // POST — save profile + optionally published / market
  if (event.httpMethod === 'POST') {
    let body;
    try { body = JSON.parse(event.body); } catch { return err('Invalid JSON'); }

    const { profile, published, market } = body;

    const ops = [];

    if (profile) {
      // upsert — creates row if not exists, updates if it does
      ops.push(
        supabase.from('profiles').upsert({ ...profile, username }, { onConflict: 'username' })
      );
    }

    if (published) {
      // Replace all published worlds for this user
      ops.push(
        supabase.from('published').delete().eq('username', username).then(() =>
          published.length
            ? supabase.from('published').insert(published.map(r => ({ ...r, username })))
            : Promise.resolve()
        )
      );
    }

    if (market) {
      ops.push(
        supabase.from('user_market').delete().eq('username', username).then(() =>
          market.length
            ? supabase.from('user_market').insert(market.map(r => ({ ...r, username })))
            : Promise.resolve()
        )
      );
    }

    await Promise.all(ops);
    return ok({ ok: true });
  }

  return err('Method not allowed', 405);
}
