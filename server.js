import { migrate } from './server/lib/db.js';
import { handleKoc } from './server/routes/koc.js';
import { handleBookings } from './server/routes/bookings.js';
import { handleWallet } from './server/routes/wallet.js';

export async function handle(request, env) {
  await migrate(env);
  const url = new URL(request.url);
  const path = url.pathname;

  if (path.startsWith('/api/koc/')) return handleKoc(request, env, url);
  if (path.startsWith('/api/bookings')) return handleBookings(request, env, url);
  if (path === '/api/wallet') return handleWallet(request, env, url);

  return Response.json({ error: 'Not found' }, { status: 404 });
}
