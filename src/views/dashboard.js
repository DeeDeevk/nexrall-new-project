import { api } from '../api.js';
import { money, dateStr, escapeHtml, statusLabel, toast } from '../format.js';

let activeTab = 'profiles';

export async function render(root) {
  root.innerHTML = `
    <div class="section-title">Của tôi</div>
    <div class="tabs">
      <div class="tab" data-tab="profiles" id="tab-profiles">Hồ sơ KOC</div>
      <div class="tab" data-tab="incoming" id="tab-incoming">Booking nhận</div>
      <div class="tab" data-tab="mine" id="tab-mine">Booking tôi đặt</div>
      <div class="tab" data-tab="wallet" id="tab-wallet">Ví</div>
    </div>
    <div id="tab-body"><div class="loading">Đang tải...</div></div>
  `;

  const tabs = root.querySelectorAll('.tab');
  tabs.forEach((t) => t.addEventListener('click', () => { activeTab = t.dataset.tab; renderTabs(); loadTab(); }));
  renderTabs();
  loadTab();

  function renderTabs() {
    tabs.forEach((t) => t.classList.toggle('active', t.dataset.tab === activeTab));
  }

  async function loadTab() {
    const body = document.getElementById('tab-body');
    body.innerHTML = `<div class="loading">Đang tải...</div>`;
    try {
      if (activeTab === 'profiles') return await loadProfiles(body);
      if (activeTab === 'incoming') return await loadBookings(body, 'koc');
      if (activeTab === 'mine') return await loadBookings(body, 'business');
      if (activeTab === 'wallet') return await loadWallet(body);
    } catch (err) {
      body.innerHTML = errBoxOr401(err);
    }
  }
}

function errBoxOr401(err) {
  if (err.status === 401) {
    return `<div class="empty"><div class="em">🔒</div>Vui lòng đăng nhập trong app Nexrall để xem nội dung này.</div>`;
  }
  return `<div class="error-box">${escapeHtml(err.message)}</div>`;
}

async function loadProfiles(body) {
  const { profiles } = await api('/api/koc/mine');
  if (!profiles.length) {
    body.innerHTML = `<div class="empty"><div class="em">📇</div>Bạn chưa có hồ sơ KOC nào.<br><a href="#/onboarding" class="btn" style="margin-top:14px;">Đăng ký làm KOC</a></div>`;
    return;
  }
  body.innerHTML = profiles.map((p) => `
    <div class="card">
      <div style="display:flex; justify-content:space-between; align-items:flex-start;">
        <div>
          <b style="font-size:13.5px;">${escapeHtml(p.name)}</b>
          <span class="chip">${escapeHtml(p.category)}</span>
        </div>
        <label style="display:flex; align-items:center; gap:6px; font-size:11px; color:var(--muted);">
          <input type="checkbox" data-avail="${p.id}" ${p.available ? 'checked' : ''}> Đang nhận
        </label>
      </div>
      <div style="font-size:11.5px; color:var(--muted); margin-top:6px;">📍 ${escapeHtml(p.province)} · ${money(p.price)}</div>
      <a href="#/koc/${p.id}" style="font-size:11.5px; color:var(--orange); font-weight:700; display:inline-block; margin-top:8px;">Xem trang công khai →</a>
    </div>
  `).join('') + `<a href="#/onboarding" class="btn outline">+ Thêm hồ sơ lĩnh vực khác</a>`;

  body.querySelectorAll('[data-avail]').forEach((cb) => {
    cb.addEventListener('change', async () => {
      try {
        await api('/api/koc/profile/' + cb.dataset.avail, { method: 'PATCH', body: { available: cb.checked } });
        toast(cb.checked ? 'Đã bật nhận booking' : 'Đã tạm ngưng nhận booking');
      } catch (err) {
        toast('Lỗi: ' + err.message);
        cb.checked = !cb.checked;
      }
    });
  });
}

async function loadBookings(body, role) {
  const { bookings } = await api('/api/bookings?role=' + role);
  if (!bookings.length) {
    body.innerHTML = `<div class="empty"><div class="em">📭</div>${role === 'koc' ? 'Chưa có booking nào gửi tới bạn.' : 'Bạn chưa đặt booking nào.'}</div>`;
    return;
  }
  body.innerHTML = bookings.map((b) => bookingCard(b, role)).join('');
  attachBookingActions(body, role);
}

function bookingCard(b, role) {
  const actions = [];
  if (role === 'koc') {
    if (b.status === 'pending') { actions.push(['accept', 'Nhận booking', '']); actions.push(['decline', 'Từ chối', 'outline']); }
    if (b.status === 'accepted') actions.push(['deliver', 'Đã giao nội dung', '']);
  } else {
    if (b.status === 'pending') actions.push(['cancel', 'Huỷ booking', 'outline']);
    if (b.status === 'delivered') actions.push(['complete', 'Xác nhận hoàn tất', '']);
    if (b.status === 'completed' && !b.reviewed) actions.push(['review', 'Đánh giá', 'outline']);
  }
  return `
    <div class="card" data-booking="${b.id}">
      <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:8px;">
        <b style="font-size:13px;">${escapeHtml(b.title)}</b>
        <span class="badge ${b.status}">${statusLabel(b.status)}</span>
      </div>
      <div style="font-size:11.5px; color:var(--muted); margin-top:4px;">${role === 'koc' ? '👤 ' + escapeHtml(b.business_name) : ''}</div>
      ${b.note ? `<p style="margin-top:6px;">${escapeHtml(b.note)}</p>` : ''}
      <div class="fee-line"><span>Giá booking</span><span>${money(b.price)}</span></div>
      <div class="fee-line"><span>Phí dịch vụ (5%)</span><span>${money(b.fee_amount)}</span></div>
      <div class="fee-line total"><span>${role === 'koc' ? 'Bạn nhận' : 'Tổng thanh toán'}</span><span>${money(role === 'koc' ? b.payout_amount : b.price)}</span></div>
      <div style="font-size:10.5px; color:var(--muted); margin-top:4px;">${dateStr(b.created_at)}</div>
      ${b.status === 'completed' && b.reviewed ? `<div style="font-size:11px;color:var(--green);margin-top:6px;">✓ Đã đánh giá</div>` : ''}
      ${actions.length ? `<div class="btn-row" style="margin-top:10px;">${actions.map(([a, l, cls]) => `<button class="btn ${cls} small" data-act="${a}">${l}</button>`).join('')}</div>` : ''}
      <div class="review-form" style="display:none; margin-top:10px;">
        <div class="field"><label>Số sao (1-5)</label><input type="number" min="1" max="5" class="rv-rating" value="5"></div>
        <div class="field"><label>Nhận xét</label><textarea class="rv-comment" maxlength="300" placeholder="Chia sẻ trải nghiệm..."></textarea></div>
        <button class="btn small rv-submit">Gửi đánh giá</button>
      </div>
    </div>
  `;
}

function attachBookingActions(body, role) {
  body.querySelectorAll('[data-booking]').forEach((cardEl) => {
    const id = cardEl.dataset.booking;
    cardEl.querySelectorAll('[data-act]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const act = btn.dataset.act;
        if (act === 'review') {
          cardEl.querySelector('.review-form').style.display = 'block';
          btn.parentElement.style.display = 'none';
          return;
        }
        btn.disabled = true;
        try {
          await api('/api/bookings/' + id + '/action', { method: 'POST', body: { action: act } });
          toast('Đã cập nhật trạng thái booking');
          await loadBookings(document.getElementById('tab-body'), role);
        } catch (err) {
          toast('Lỗi: ' + err.message);
          btn.disabled = false;
        }
      });
    });
    const rvBtn = cardEl.querySelector('.rv-submit');
    if (rvBtn) {
      rvBtn.addEventListener('click', async () => {
        const rating = Number(cardEl.querySelector('.rv-rating').value || 5);
        const comment = cardEl.querySelector('.rv-comment').value;
        rvBtn.disabled = true;
        try {
          await api('/api/bookings/' + id + '/review', { method: 'POST', body: { rating, comment } });
          toast('Cảm ơn đánh giá của bạn!');
          await loadBookings(document.getElementById('tab-body'), role);
        } catch (err) {
          toast('Lỗi: ' + err.message);
          rvBtn.disabled = false;
        }
      });
    }
  });
}

async function loadWallet(body) {
  const { balance, transactions } = await api('/api/wallet');
  body.innerHTML = `
    <div class="card" style="text-align:center;">
      <div style="font-size:11px; color:var(--muted);">Số dư khả dụng</div>
      <div style="font-size:24px; font-weight:800; color:var(--orange); margin:6px 0;">${money(balance)}</div>
      <button class="btn small" id="wd-btn" style="width:auto; padding:10px 20px;">Rút tiền</button>
    </div>
    <div id="wd-error"></div>
    <div class="section-title">Lịch sử giao dịch</div>
    ${transactions.length ? transactions.map((t) => `
      <div class="card" style="display:flex; justify-content:space-between; align-items:center;">
        <div>
          <div style="font-size:12.5px; font-weight:700;">${t.type === 'earning' ? '💰 Nhận thu nhập booking' : '🏦 Rút tiền'}</div>
          <div style="font-size:10.5px; color:var(--muted); margin-top:2px;">${dateStr(t.created_at)}</div>
        </div>
        <div style="font-weight:800; color:${t.type === 'earning' ? 'var(--green)' : 'var(--red)'};">${t.type === 'earning' ? '+' : '-'}${money(t.amount)}</div>
      </div>
    `).join('') : `<div class="empty"><div class="em">💳</div>Chưa có giao dịch nào.</div>`}
  `;
  document.getElementById('wd-btn').addEventListener('click', async () => {
    const errBox = document.getElementById('wd-error');
    errBox.innerHTML = '';
    const amt = Number(prompt('Nhập số tiền muốn rút (đ):', '') || 0);
    if (!amt || amt <= 0) return;
    try {
      await api('/api/wallet', { method: 'POST', body: { amount: amt } });
      toast('✅ Yêu cầu rút tiền thành công!');
      await loadWallet(body);
    } catch (err) {
      errBox.innerHTML = `<div class="error-box">${escapeHtml(err.message)}</div>`;
    }
  });
}
