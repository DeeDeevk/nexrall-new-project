import { api } from '../api.js';
import { money, dateStr, escapeHtml, CATEGORIES, PROVINCES, toast } from '../format.js';
import { getStockPhotos } from '../images.js';

function photoFor(photos, i) {
  if (!photos || !photos.length) return '';
  const p = photos[i % photos.length];
  return p ? p.thumb : '';
}

export async function render(root, params) {
  if (params && params.id) return renderDetail(root, params.id);
  return renderList(root);
}

async function renderList(root) {
  root.innerHTML = `
    <div class="section-title">Marketplace KOC</div>
    <div class="section-desc">Tìm & đặt booking trực tiếp với KOC theo lĩnh vực và tỉnh thành.</div>
    <div class="field">
      <input type="text" id="mp-q" placeholder="🔎 Tìm theo tên hoặc hashtag...">
    </div>
    <div class="grid-2">
      <div class="field">
        <select id="mp-category"><option value="">Tất cả lĩnh vực</option>${CATEGORIES.map((c) => `<option value="${c}">${c}</option>`).join('')}</select>
      </div>
      <div class="field">
        <select id="mp-province"><option value="">Tất cả tỉnh thành</option>${PROVINCES.map((p) => `<option value="${p}">${p}</option>`).join('')}</select>
      </div>
    </div>
    <div id="mp-list"><div class="loading">Đang tải danh sách KOC...</div></div>
  `;

  const list = document.getElementById('mp-list');
  const qEl = document.getElementById('mp-q');
  const catEl = document.getElementById('mp-category');
  const provEl = document.getElementById('mp-province');

  let debounceT = null;
  const load = async () => {
    list.innerHTML = `<div class="loading">Đang tải danh sách KOC...</div>`;
    try {
      const qs = new URLSearchParams();
      if (catEl.value) qs.set('category', catEl.value);
      if (provEl.value) qs.set('province', provEl.value);
      if (qEl.value.trim()) qs.set('q', qEl.value.trim());
      const [{ profiles }, photos] = await Promise.all([
        api('/api/koc/marketplace?' + qs.toString()),
        getStockPhotos(),
      ]);
      if (!profiles.length) {
        list.innerHTML = `<div class="empty"><div class="em">🕵️‍♀️</div>Chưa có KOC phù hợp bộ lọc này.</div>`;
        return;
      }
      list.innerHTML = profiles.map((p, i) => `
        <a href="#/koc/${p.id}" class="card profile-card" style="text-decoration:none;">
          <div class="avatar lg" style="background-image:url('${photoFor(photos, i)}')"></div>
          <div style="flex:1;">
            <div style="display:flex; align-items:center; gap:6px; flex-wrap:wrap;">
              <b style="font-size:13.5px;">${escapeHtml(p.name)}</b>
              <span class="chip">${escapeHtml(p.category)}</span>
            </div>
            <div style="font-size:11px; color:var(--muted); margin-top:3px;">📍 ${escapeHtml(p.province)} · ${p.followers.toLocaleString('vi-VN')} followers</div>
            <div style="display:flex; align-items:center; gap:6px; margin-top:5px;">
              <span class="stars">${p.rating ? '★'.repeat(Math.round(p.rating)) + '☆'.repeat(5 - Math.round(p.rating)) : '☆☆☆☆☆'}</span>
              <span style="font-size:10.5px;color:var(--muted);">${p.rating ? p.rating + ' (' + p.reviewCount + ')' : 'Chưa có đánh giá'}</span>
            </div>
            <div style="font-size:12.5px; font-weight:800; color:var(--orange); margin-top:5px;">${money(p.price)}</div>
          </div>
        </a>
      `).join('');
    } catch (err) {
      list.innerHTML = `<div class="error-box">Không tải được danh sách: ${escapeHtml(err.message)}</div>`;
    }
  };

  qEl.addEventListener('input', () => { clearTimeout(debounceT); debounceT = setTimeout(load, 350); });
  catEl.addEventListener('change', load);
  provEl.addEventListener('change', load);
  load();
}

async function renderDetail(root, id) {
  root.innerHTML = `<div class="loading">Đang tải hồ sơ...</div>`;
  try {
    const { profile, reviews } = await api('/api/koc/profile/' + encodeURIComponent(id));
    const tags = (() => { try { return JSON.parse(profile.tags || '[]'); } catch (e) { return []; } })();
    root.innerHTML = `
      <a href="#/marketplace" style="font-size:12.5px; color:var(--muted); display:inline-block; margin-bottom:10px;">← Quay lại Marketplace</a>
      <div class="card">
        <div class="profile-card">
          <div class="avatar lg"></div>
          <div style="flex:1;">
            <div style="display:flex; align-items:center; gap:6px; flex-wrap:wrap;">
              <b style="font-size:15px;">${escapeHtml(profile.name)}</b>
              ${profile.contract_signed_at ? '<span class="verified">✔ Đã ký hợp đồng</span>' : ''}
            </div>
            <div style="font-size:11.5px; color:var(--muted); margin-top:4px;">📍 ${escapeHtml(profile.province)} · ${escapeHtml(profile.category)}</div>
            <div style="font-size:11.5px; color:var(--muted); margin-top:2px;">${profile.followers.toLocaleString('vi-VN')} followers · Tỉ lệ tương tác ${profile.engagement_rate}%</div>
          </div>
        </div>
        ${profile.bio ? `<p style="margin-top:12px; font-size:12.8px;">${escapeHtml(profile.bio)}</p>` : ''}
        <div style="margin-top:10px;">${tags.map((t) => `<span class="chip">${escapeHtml(t)}</span>`).join('')}</div>
        <div style="margin-top:10px; font-size:13px;">
          <span class="stars">${profile.rating ? '★'.repeat(Math.round(profile.rating)) + '☆'.repeat(5 - Math.round(profile.rating)) : '☆☆☆☆☆'}</span>
          <span style="font-size:11.5px; color:var(--muted);"> ${profile.rating ? profile.rating + '/5 (' + profile.reviewCount + ' đánh giá)' : 'Chưa có đánh giá'}</span>
        </div>
        ${!profile.available ? '<div class="error-box" style="margin-top:12px;">KOC này hiện đang tạm ngưng nhận booking.</div>' : ''}
      </div>

      <div class="card">
        <h4>Bảng giá tham khảo</h4>
        <div class="fee-line total"><span>Giá booking</span><span>${money(profile.price)}</span></div>
        <div class="fee-line"><span>Phí dịch vụ NetViet (5%)</span><span style="color:var(--orange);">${money(Math.round(profile.price * 0.05))}</span></div>
        <div class="fee-line"><span>KOC nhận</span><span style="color:var(--green);">${money(profile.price - Math.round(profile.price * 0.05))}</span></div>
      </div>

      <div class="card" id="book-box">
        <h4>Đặt booking trực tiếp</h4>
        <div id="book-error"></div>
        <div class="field"><label>Tên doanh nghiệp / thương hiệu</label><input type="text" id="bk-business" maxlength="80" placeholder="VD: GlowBeauty"></div>
        <div class="field"><label>Tiêu đề job</label><input type="text" id="bk-title" maxlength="120" placeholder="VD: Video giới thiệu Serum Vitamin C 15s" required></div>
        <div class="field"><label>Ghi chú / kịch bản</label><textarea id="bk-note" maxlength="500" placeholder="Yêu cầu nội dung, deadline..."></textarea></div>
        <button class="btn" id="bk-submit" ${profile.available ? '' : 'disabled'}>Thanh toán vào Ví Escrow & Đặt booking</button>
      </div>

      <div class="section-title">Đánh giá từ doanh nghiệp</div>
      ${reviews.length ? reviews.map((r) => `
        <div class="card">
          <span class="stars">${'★'.repeat(r.rating)}${'☆'.repeat(5 - r.rating)}</span>
          ${r.comment ? `<p style="margin-top:6px;">${escapeHtml(r.comment)}</p>` : ''}
          <div style="font-size:10.5px; color:var(--muted); margin-top:4px;">${dateStr(r.created_at)}</div>
        </div>
      `).join('') : `<div class="empty" style="padding:20px;"><div class="em">💬</div>Chưa có đánh giá nào.</div>`}
    `;

    const btn = document.getElementById('bk-submit');
    if (btn) {
      btn.addEventListener('click', async () => {
        const errBox = document.getElementById('book-error');
        errBox.innerHTML = '';
        const title = document.getElementById('bk-title').value.trim();
        if (!title) { errBox.innerHTML = `<div class="error-box">Vui lòng nhập tiêu đề job.</div>`; return; }
        btn.disabled = true;
        btn.textContent = 'Đang xử lý...';
        try {
          await api('/api/bookings', {
            method: 'POST',
            body: {
              profileId: profile.id,
              businessName: document.getElementById('bk-business').value,
              title,
              note: document.getElementById('bk-note').value,
            },
          });
          toast('✅ Đã đặt booking & thanh toán vào Ví Escrow!');
          location.hash = '#/dashboard';
        } catch (err) {
          errBox.innerHTML = `<div class="error-box">${err.status === 401 ? 'Vui lòng đăng nhập để đặt booking.' : escapeHtml(err.message)}</div>`;
          btn.disabled = false;
          btn.textContent = 'Thanh toán vào Ví Escrow & Đặt booking';
        }
      });
    }
  } catch (err) {
    root.innerHTML = `<a href="#/marketplace" style="font-size:12.5px;">← Quay lại</a><div class="error-box">Không tìm thấy hồ sơ: ${escapeHtml(err.message)}</div>`;
  }
}
