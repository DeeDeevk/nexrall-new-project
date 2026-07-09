import { api } from '../api.js';
import { CATEGORIES, PROVINCES, toast } from '../format.js';

export async function render(root) {
  root.innerHTML = `
    <div class="section-title">Đăng ký làm KOC</div>
    <div class="section-desc">Tạo hồ sơ theo lĩnh vực bạn muốn nhận booking. Bạn có thể quay lại đây để thêm hồ sơ ở lĩnh vực khác bất cứ lúc nào.</div>
    <div id="ob-error"></div>
    <form id="ob-form">
      <div class="field">
        <label>Tên hiển thị</label>
        <input type="text" id="ob-name" maxlength="60" placeholder="VD: Linh Chi" required>
      </div>
      <div class="grid-2">
        <div class="field">
          <label>Lĩnh vực</label>
          <select id="ob-category">${CATEGORIES.map((c) => `<option value="${c}">${c}</option>`).join('')}</select>
        </div>
        <div class="field">
          <label>Tỉnh/Thành</label>
          <select id="ob-province">${PROVINCES.map((p) => `<option value="${p}">${p}</option>`).join('')}</select>
        </div>
      </div>
      <div class="grid-2">
        <div class="field">
          <label>Số follower</label>
          <input type="number" id="ob-followers" min="0" step="1" placeholder="12000" required>
        </div>
        <div class="field">
          <label>Tỉ lệ tương tác (%)</label>
          <input type="number" id="ob-engagement" min="0" max="100" step="0.1" placeholder="6.5">
        </div>
      </div>
      <div class="field">
        <label>Giá booking đề xuất (đ)</label>
        <input type="number" id="ob-price" min="0" step="1000" placeholder="1200000" required>
      </div>
      <div class="field">
        <label>Giới thiệu ngắn</label>
        <textarea id="ob-bio" maxlength="500" placeholder="Kinh nghiệm, phong cách nội dung..."></textarea>
      </div>
      <div class="field">
        <label>Hashtag / thẻ (cách nhau bằng dấu phẩy)</label>
        <input type="text" id="ob-tags" placeholder="#SkincareRoutine, #GlowUp">
      </div>

      <div class="section-title" style="margin-top:24px;">Hợp đồng hợp tác KOC — NetViet</div>
      <div class="contract-box">
        <p><b>Điều 1.</b> KOC hợp tác cùng NetViet nhận booking quảng cáo, sử dụng hình ảnh/giọng nói để tạo nội dung giới thiệu sản phẩm.</p>
        <p><b>Điều 2.</b> KOC cấp phép có thời hạn, giới hạn phạm vi sử dụng cho nội dung được duyệt; không dùng ngoài mục đích hợp đồng.</p>
        <p><b>Điều 3.</b> Mọi nội dung đều được KOC xem trước và xác nhận trước khi phát hành.</p>
        <p><b>Điều 4.</b> Booking trực tiếp qua Marketplace áp dụng phí dịch vụ 5%, KOC nhận 95% giá trị booking khi hoàn tất.</p>
        <p><b>Điều 5.</b> Tuân thủ Nghị định 13/2023/NĐ-CP về bảo vệ dữ liệu cá nhân; dữ liệu KYC chỉ dùng để xác minh & chi trả.</p>
        <p><b>Điều 6.</b> Hai bên có quyền chấm dứt hợp tác với thông báo trước 15–30 ngày.</p>
      </div>
      <label class="check-row">
        <input type="checkbox" id="ob-agree">
        <span>Tôi đã đọc và đồng ý với các điều khoản hợp tác KOC ở trên. Việc tick chọn có giá trị như chữ ký điện tử xác nhận ký kết hợp đồng.</span>
      </label>
      <button type="submit" class="btn" id="ob-submit">Ký hợp đồng & Kích hoạt hồ sơ</button>
    </form>
  `;

  document.getElementById('ob-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const errBox = document.getElementById('ob-error');
    errBox.innerHTML = '';
    const agree = document.getElementById('ob-agree').checked;
    if (!agree) {
      errBox.innerHTML = `<div class="error-box">Vui lòng đồng ý điều khoản hợp đồng để tiếp tục.</div>`;
      return;
    }
    const btn = document.getElementById('ob-submit');
    btn.disabled = true;
    btn.textContent = 'Đang xử lý...';
    try {
      const payload = {
        name: document.getElementById('ob-name').value,
        category: document.getElementById('ob-category').value,
        province: document.getElementById('ob-province').value,
        followers: Number(document.getElementById('ob-followers').value || 0),
        engagementRate: Number(document.getElementById('ob-engagement').value || 0),
        price: Number(document.getElementById('ob-price').value || 0),
        bio: document.getElementById('ob-bio').value,
        tags: document.getElementById('ob-tags').value.split(',').map((t) => t.trim()).filter(Boolean),
        contractSigned: true,
      };
      await api('/api/koc/profile', { method: 'POST', body: payload });
      toast('🎉 Đã ký hợp đồng & kích hoạt hồ sơ KOC!');
      location.hash = '#/dashboard';
    } catch (err) {
      errBox.innerHTML = `<div class="error-box">${err.status === 401 ? 'Vui lòng đăng nhập trong app Nexrall để đăng ký làm KOC.' : err.message}</div>`;
      btn.disabled = false;
      btn.textContent = 'Ký hợp đồng & Kích hoạt hồ sơ';
    }
  });
}
