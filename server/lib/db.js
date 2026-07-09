let _migrated = false;

const MIGRATIONS = [
  `CREATE TABLE IF NOT EXISTS koc_profiles (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    province TEXT NOT NULL,
    followers INTEGER NOT NULL DEFAULT 0,
    engagement_rate REAL NOT NULL DEFAULT 0,
    price INTEGER NOT NULL DEFAULT 0,
    bio TEXT DEFAULT '',
    tags TEXT DEFAULT '[]',
    available INTEGER NOT NULL DEFAULT 1,
    contract_signed_at INTEGER,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  )`, // v1
  `CREATE TABLE IF NOT EXISTS bookings (
    id TEXT PRIMARY KEY,
    profile_id TEXT NOT NULL,
    koc_user_id TEXT NOT NULL,
    business_user_id TEXT NOT NULL,
    business_name TEXT NOT NULL,
    title TEXT NOT NULL,
    note TEXT DEFAULT '',
    price INTEGER NOT NULL DEFAULT 0,
    fee_amount INTEGER NOT NULL DEFAULT 0,
    payout_amount INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  )`, // v2
  `CREATE TABLE IF NOT EXISTS wallet_tx (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    booking_id TEXT,
    type TEXT NOT NULL,
    amount INTEGER NOT NULL,
    created_at INTEGER NOT NULL
  )`, // v3
  `CREATE TABLE IF NOT EXISTS reviews (
    id TEXT PRIMARY KEY,
    booking_id TEXT NOT NULL,
    profile_id TEXT NOT NULL,
    business_user_id TEXT NOT NULL,
    rating INTEGER NOT NULL,
    comment TEXT DEFAULT '',
    created_at INTEGER NOT NULL
  )`, // v4
];

const META_TABLE_SQL = `CREATE TABLE IF NOT EXISTS schema_meta (meta_key TEXT PRIMARY KEY, meta_value TEXT)`;

export async function migrate(env) {
  if (_migrated) return;
  _migrated = true;
  await env.DB.exec(META_TABLE_SQL);
  const row = await env.DB.prepare('SELECT meta_value FROM schema_meta WHERE meta_key = ?').bind('schema_version').first();
  const cur = row ? Number(row.meta_value) || 0 : 0;
  for (let i = cur; i < MIGRATIONS.length; i++) {
    try {
      const sql = MIGRATIONS[i].replace(/\s+/g, ' ');
      await env.DB.exec(sql);
    } catch (e) {
      console.error(`Migration v${i + 1} failed:`, e);
    }
  }
  if (MIGRATIONS.length > cur) {
    await env.DB.prepare(
      `INSERT INTO schema_meta (meta_key, meta_value) VALUES ('schema_version', ?) ON CONFLICT(meta_key) DO UPDATE SET meta_value = excluded.meta_value`
    ).bind(String(MIGRATIONS.length)).run();
  }
}

export function now() {
  return Math.floor(Date.now() / 1000);
}

export function uid() {
  return crypto.randomUUID();
}
