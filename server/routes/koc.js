import { now, uid } from '../lib/db.js';

const CATEGORIES = ['Làm đẹp', 'Mẹ & bé', 'Ẩm thực', 'Thời trang', 'Công nghệ', 'Du lịch', 'Gia dụng', 'Khác'];

function rowToProfile(row) {
  return { ...row, available: !!row.available };
}

async function attachRatings(env, profiles) {
  if (!profiles.length) return profiles;
  const { results } = await env.DB.prepare('SELECT profile_id, AVG(rating) as avg, COUNT(*) as cnt FROM reviews GROUP BY profile_id').all();
  const map = new Map(results.map((r) => [r.profile_id, r]));
  return profiles.map((p) => {
    const stat = map.get(p.id);
    return { ...p, rating: stat ? Math.round(stat.avg * 10) / 10 : null, reviewCount: stat ? stat.cnt : 0 };
  });
}

export async function handleKoc(request, env, url) {
  const path = url.pathname;
  const method = request.method;

  if (path === '/api/koc/marketplace' && method === 'GET') {
    const category = url.searchParams.get('category') || '';
    const province = url.searchParams.get('province') || '';
    const q = (url.searchParams.get('q') || '').trim().toLowerCase();
    let sql = 'SELECT * FROM koc_profiles WHERE available = 1';
    const binds = [];
    if (category) { sql += ' AND category = ?'; binds.push(category); }
    if (province) { sql += ' AND province = ?'; binds.push(province); }
    sql += ' ORDER BY created_at DESC LIMIT 100';
    const { results } = await env.DB.prepare(sql).bind(...binds).all();
    let profiles = await attachRatings(env, results.map(rowToProfile));
    if (q) {
      profiles = profiles.filter((p) => {
        let tags = [];
        try { tags = JSON.parse(p.tags || '[]'); } catch (e) { /* ignore */ }
        return p.name.toLowerCase().includes(q) || tags.some((t) => String(t).toLowerCase().includes(q));
      });
    }
    return Response.json({ profiles });
  }

  if (path === '/api/koc/mine' && method === 'GET') {
    if (!env.USER_ID || env.USER_ID === 'anon') return Response.json({ error: 'Vui lòng đăng nhập' }, { status: 401 });
    const { results } = await env.DB.prepare('SELECT * FROM koc_profiles WHERE user_id = ? ORDER BY created_at DESC').bind(env.USER_ID).all();
    return Response.json({ profiles: results.map(rowToProfile) });
  }

  if (path === '/api/koc/profile' && method === 'POST') {
    if (!env.USER_ID || env.USER_ID === 'anon') return Response.json({ error: 'Vui lòng đăng nhập' }, { status: 401 });
    const body = await request.json().catch(() => ({}));
    const name = String(body.name || '').trim().slice(0, 60);
    const category = CATEGORIES.includes(body.category) ? body.category : '';
    const province = String(body.province || '').trim().slice(0, 60);
    const followers = Math.max(0, Math.round(Number(body.followers) || 0));
    const engagementRate = Math.min(100, Math.max(0, Number(body.engagementRate) || 0));
    const price = Math.max(0, Math.round(Number(body.price) || 0));
    const bio = String(body.bio || '').trim().slice(0, 500);
    const tags = Array.isArray(body.tags) ? body.tags.slice(0, 10).map((t) => String(t).slice(0, 30)) : [];
    const contractSigned = body.contractSigned === true;

    if (!name || !category || !province || !contractSigned) {
      return Response.json({ error: 'Vui lòng điền đầy đủ thông tin và đồng ý điều khoản hợp đồng.' }, { status: 400 });
    }

    const id = uid();
    const ts = now();
    await env.DB.prepare(`INSERT INTO koc_profiles
      (id, user_id, name, category, province, followers, engagement_rate, price, bio, tags, available, contract_signed_at, created_at, updated_at)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`)
      .bind(id, env.USER_ID, name, category, province, followers, engagementRate, price, bio, JSON.stringify(tags), 1, ts, ts, ts)
      .run();
    return Response.json({ id }, { status: 201 });
  }

  const profileMatch = path.match(/^\/api\/koc\/profile\/([^/]+)$/);
  if (profileMatch && method === 'GET') {
    const id = profileMatch[1];
    const profile = await env.DB.prepare('SELECT * FROM koc_profiles WHERE id = ?').bind(id).first();
    if (!profile) return Response.json({ error: 'Không tìm thấy hồ sơ' }, { status: 404 });
    const [rated] = await attachRatings(env, [rowToProfile(profile)]);
    const { results: reviews } = await env.DB.prepare('SELECT * FROM reviews WHERE profile_id = ? ORDER BY created_at DESC LIMIT 30').bind(id).all();
    return Response.json({ profile: rated, reviews });
  }

  if (profileMatch && method === 'PATCH') {
    if (!env.USER_ID || env.USER_ID === 'anon') return Response.json({ error: 'Vui lòng đăng nhập' }, { status: 401 });
    const id = profileMatch[1];
    const profile = await env.DB.prepare('SELECT * FROM koc_profiles WHERE id = ?').bind(id).first();
    if (!profile) return Response.json({ error: 'Không tìm thấy hồ sơ' }, { status: 404 });
    const isOwner = env.USER_ID === env.OWNER_ID;
    if (profile.user_id !== env.USER_ID && !isOwner) return Response.json({ error: 'Không có quyền chỉnh sửa hồ sơ này' }, { status: 403 });
    const body = await request.json().catch(() => ({}));
    const available = body.available ? 1 : 0;
    await env.DB.prepare('UPDATE koc_profiles SET available = ?, updated_at = ? WHERE id = ?').bind(available, now(), id).run();
    return Response.json({ ok: true, available: !!available });
  }

  return Response.json({ error: 'Not found' }, { status: 404 });
}
