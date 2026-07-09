let cache = null;
let pending = null;

export async function getStockPhotos() {
  if (cache) return cache;
  if (pending) return pending;
  pending = fetch('/__nexrall/img?q=' + encodeURIComponent('content creator social media influencer') + '&n=10')
    .then((r) => r.json())
    .then((d) => { cache = d.photos || []; return cache; })
    .catch(() => { cache = []; return cache; });
  return pending;
}

export async function getHeroPhoto() {
  try {
    const r = await fetch('/__nexrall/img?q=' + encodeURIComponent('vietnam social media creator phone') + '&n=1');
    const d = await r.json();
    return (d.photos && d.photos[0]) || null;
  } catch (e) {
    return null;
  }
}
