import { now, uid } from '../lib/db.js';

export async function handleWallet(request, env, url) {
  if (!env.USER_ID || env.USER_ID === 'anon') return Response.json({ error: 'Vui lòng đăng nhập' }, { status: 401 });

  if (request.method === 'GET') {
    const { results } = await env.DB.prepare('SELECT * FROM wallet_tx WHERE user_id = ? ORDER BY created_at DESC LIMIT 100').bind(env.USER_ID).all();
    const balance = results.reduce((sum, r) => sum + (r.type === 'earning' ? r.amount : -Math.abs(r.amount)), 0);
    return Response.json({ balance, transactions: results });
  }

  if (request.method === 'POST') {
    const body = await request.json().catch(() => ({}));
    const amount = Math.round(Number(body.amount) || 0);
    if (!amount || amount <= 0) return Response.json({ error: 'Số tiền không hợp lệ.' }, { status: 400 });

    const { results } = await env.DB.prepare('SELECT type, amount FROM wallet_tx WHERE user_id = ?').bind(env.USER_ID).all();
    const balance = results.reduce((sum, r) => sum + (r.type === 'earning' ? r.amount : -Math.abs(r.amount)), 0);
    if (amount > balance) return Response.json({ error: 'Số dư không đủ để rút.' }, { status: 400 });

    await env.DB.prepare('INSERT INTO wallet_tx (id, user_id, booking_id, type, amount, created_at) VALUES (?,?,?,?,?,?)')
      .bind(uid(), env.USER_ID, null, 'withdrawal', amount, now()).run();
    return Response.json({ ok: true, balance: balance - amount });
  }

  return Response.json({ error: 'Method not allowed' }, { status: 405 });
}
