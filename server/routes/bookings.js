import { now, uid } from '../lib/db.js';

const FEE_RATE = 0.05;

export async function handleBookings(request, env, url) {
  const path = url.pathname;
  const method = request.method;

  if (path === '/api/bookings' && method === 'POST') {
    if (!env.USER_ID || env.USER_ID === 'anon') return Response.json({ error: 'Vui lòng đăng nhập' }, { status: 401 });
    const body = await request.json().catch(() => ({}));
    const profileId = String(body.profileId || '');
    const title = String(body.title || '').trim().slice(0, 120);
    const note = String(body.note || '').trim().slice(0, 500);
    const businessName = String(body.businessName || '').trim().slice(0, 80) || 'Doanh nghiệp';
    if (!profileId || !title) return Response.json({ error: 'Vui lòng nhập tiêu đề job.' }, { status: 400 });

    const profile = await env.DB.prepare('SELECT * FROM koc_profiles WHERE id = ?').bind(profileId).first();
    if (!profile) return Response.json({ error: 'Không tìm thấy hồ sơ KOC' }, { status: 404 });
    if (profile.user_id === env.USER_ID) return Response.json({ error: 'Không thể tự đặt booking chính mình' }, { status: 400 });
    if (!profile.available) return Response.json({ error: 'KOC hiện không nhận booking' }, { status: 400 });

    const price = Math.max(0, Math.round(Number(profile.price) || 0));
    const fee = Math.round(price * FEE_RATE);
    const payout = price - fee;
    const id = uid();
    const ts = now();
    await env.DB.prepare(`INSERT INTO bookings
      (id, profile_id, koc_user_id, business_user_id, business_name, title, note, price, fee_amount, payout_amount, status, created_at, updated_at)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`)
      .bind(id, profile.id, profile.user_id, env.USER_ID, businessName, title, note, price, fee, payout, 'pending', ts, ts)
      .run();
    return Response.json({ id }, { status: 201 });
  }

  if (path === '/api/bookings' && method === 'GET') {
    if (!env.USER_ID || env.USER_ID === 'anon') return Response.json({ error: 'Vui lòng đăng nhập' }, { status: 401 });
    const role = url.searchParams.get('role') === 'business' ? 'business' : 'koc';
    const col = role === 'business' ? 'business_user_id' : 'koc_user_id';
    const { results } = await env.DB.prepare(`SELECT * FROM bookings WHERE ${col} = ? ORDER BY created_at DESC LIMIT 100`).bind(env.USER_ID).all();
    let reviewedSet = new Set();
    const ids = results.map((r) => r.id);
    if (ids.length) {
      const placeholders = ids.map(() => '?').join(',');
      const { results: rv } = await env.DB.prepare(`SELECT booking_id FROM reviews WHERE booking_id IN (${placeholders})`).bind(...ids).all();
      reviewedSet = new Set(rv.map((r) => r.booking_id));
    }
    const bookings = results.map((b) => ({ ...b, reviewed: reviewedSet.has(b.id) }));
    return Response.json({ bookings });
  }

  const actionMatch = path.match(/^\/api\/bookings\/([^/]+)\/action$/);
  if (actionMatch && method === 'POST') {
    if (!env.USER_ID || env.USER_ID === 'anon') return Response.json({ error: 'Vui lòng đăng nhập' }, { status: 401 });
    const id = actionMatch[1];
    const body = await request.json().catch(() => ({}));
    const action = String(body.action || '');
    const booking = await env.DB.prepare('SELECT * FROM bookings WHERE id = ?').bind(id).first();
    if (!booking) return Response.json({ error: 'Không tìm thấy booking' }, { status: 404 });

    const isOwner = env.USER_ID === env.OWNER_ID;
    const isKoc = booking.koc_user_id === env.USER_ID;
    const isBiz = booking.business_user_id === env.USER_ID;
    if (!isKoc && !isBiz && !isOwner) return Response.json({ error: 'Không có quyền thao tác booking này' }, { status: 403 });

    let newStatus = null;
    if (action === 'accept' && booking.status === 'pending' && (isKoc || isOwner)) newStatus = 'accepted';
    else if (action === 'decline' && booking.status === 'pending' && (isKoc || isOwner)) newStatus = 'declined';
    else if (action === 'deliver' && booking.status === 'accepted' && (isKoc || isOwner)) newStatus = 'delivered';
    else if (action === 'complete' && booking.status === 'delivered' && (isBiz || isOwner)) newStatus = 'completed';
    else if (action === 'cancel' && booking.status === 'pending' && (isBiz || isOwner)) newStatus = 'cancelled';
    else return Response.json({ error: 'Hành động không hợp lệ ở trạng thái hiện tại.' }, { status: 400 });

    const ts = now();
    const upd = await env.DB.prepare('UPDATE bookings SET status = ?, updated_at = ? WHERE id = ? AND status = ?')
      .bind(newStatus, ts, id, booking.status).run();
    if (!upd.meta || upd.meta.changes === 0) return Response.json({ error: 'Trạng thái đã thay đổi, vui lòng tải lại.' }, { status: 409 });

    if (newStatus === 'completed') {
      await env.DB.prepare('INSERT INTO wallet_tx (id, user_id, booking_id, type, amount, created_at) VALUES (?,?,?,?,?,?)')
        .bind(uid(), booking.koc_user_id, booking.id, 'earning', booking.payout_amount, ts).run();
    }
    return Response.json({ status: newStatus });
  }

  const reviewMatch = path.match(/^\/api\/bookings\/([^/]+)\/review$/);
  if (reviewMatch && method === 'POST') {
    if (!env.USER_ID || env.USER_ID === 'anon') return Response.json({ error: 'Vui lòng đăng nhập' }, { status: 401 });
    const id = reviewMatch[1];
    const booking = await env.DB.prepare('SELECT * FROM bookings WHERE id = ?').bind(id).first();
    if (!booking) return Response.json({ error: 'Không tìm thấy booking' }, { status: 404 });
    const isOwner = env.USER_ID === env.OWNER_ID;
    if (booking.business_user_id !== env.USER_ID && !isOwner) return Response.json({ error: 'Không có quyền đánh giá booking này' }, { status: 403 });
    if (booking.status !== 'completed') return Response.json({ error: 'Chỉ có thể đánh giá sau khi booking hoàn tất.' }, { status: 400 });

    const existing = await env.DB.prepare('SELECT id FROM reviews WHERE booking_id = ?').bind(id).first();
    if (existing) return Response.json({ error: 'Booking này đã được đánh giá.' }, { status: 400 });

    const body = await request.json().catch(() => ({}));
    const rating = Math.min(5, Math.max(1, Math.round(Number(body.rating) || 0)));
    if (!rating) return Response.json({ error: 'Vui lòng chọn số sao từ 1-5.' }, { status: 400 });
    const comment = String(body.comment || '').trim().slice(0, 300);

    await env.DB.prepare('INSERT INTO reviews (id, booking_id, profile_id, business_user_id, rating, comment, created_at) VALUES (?,?,?,?,?,?,?)')
      .bind(uid(), id, booking.profile_id, env.USER_ID, rating, comment, now()).run();
    return Response.json({ ok: true }, { status: 201 });
  }

  return Response.json({ error: 'Not found' }, { status: 404 });
}
