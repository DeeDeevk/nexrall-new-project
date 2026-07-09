export function money(n) {
  const v = Number(n) || 0;
  return v.toLocaleString('vi-VN') + 'đ';
}

export function dateStr(ts) {
  if (!ts) return '—';
  const d = new Date(ts * 1000);
  return d.toLocaleDateString('vi-VN') + ' ' + d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
}

export function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

export const CATEGORIES = ['Làm đẹp', 'Mẹ & bé', 'Ẩm thực', 'Thời trang', 'Công nghệ', 'Du lịch', 'Gia dụng', 'Khác'];
export const PROVINCES = ['Hà Nội', 'TP.HCM', 'Đà Nẵng', 'Hải Phòng', 'Cần Thơ', 'Nghệ An', 'Khánh Hòa', 'Thanh Hóa', 'Bắc Giang', 'Quảng Ninh', 'Hải Dương', 'Long An', 'An Giang', 'Khác'];

export function statusLabel(s) {
  return ({
    pending: 'Chờ xác nhận',
    accepted: 'Đã nhận job',
    delivered: 'Đã giao nội dung',
    completed: 'Hoàn tất',
    declined: 'Đã từ chối',
    cancelled: 'Đã huỷ',
  })[s] || s;
}

export function toast(msg) {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => el.classList.remove('show'), 2600);
}
