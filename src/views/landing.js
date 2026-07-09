import { getHeroPhoto } from '../images.js';

export async function render(root) {
  root.innerHTML = `
    <div class="hero" id="hero-box">
      <div class="eyebrow">● NetViet KOC Program</div>
      <h1>Kiếm thu nhập từ AI Clone của chính bạn</h1>
      <p>Đăng ký làm KOC, ký hợp đồng điện tử, nhận booking từ doanh nghiệp hoặc tự chốt job trực tiếp trên Marketplace — không cần quay video mỗi ngày.</p>
      <a href="#/onboarding" class="btn">Đăng ký làm KOC ngay →</a>
      <div class="hero-stats">
        <div class="hstat"><div class="n">100%</div><div class="l">Ký kết số hoá, không giấy tờ</div></div>
        <div class="hstat"><div class="n">95%</div><div class="l">KOC nhận được / booking trực tiếp</div></div>
        <div class="hstat"><div class="n">&lt;5 phút</div><div class="l">Tạo hồ sơ & ký hợp đồng</div></div>
      </div>
    </div>

    <div class="section-title">3 bước để bắt đầu</div>
    <div class="card"><h4>1. Tạo hồ sơ theo lĩnh vực</h4><p>Chọn ngành hàng (làm đẹp, ẩm thực, mẹ & bé…), tỉnh thành, mức giá booking bạn mong muốn.</p></div>
    <div class="card"><h4>2. Ký hợp đồng điện tử</h4><p>Đọc điều khoản hợp tác & xác nhận đồng ý — có giá trị pháp lý ngay lập tức, không cần gặp mặt.</p></div>
    <div class="card"><h4>3. Nhận booking & rút tiền</h4><p>Duyệt nội dung trước khi đăng, theo dõi Ví thu nhập, rút tiền bất cứ lúc nào.</p></div>

    <div class="section-title">Marketplace booking trực tiếp</div>
    <div class="section-desc">Doanh nghiệp tự tìm & đặt lịch trực tiếp với bạn qua ví ký quỹ (escrow), phí dịch vụ chỉ 5% — bạn nhận 95% giá trị booking.</div>
    <div class="card">
      <div class="fee-line"><span>KOC nhận (95%)</span><span style="color:var(--green);font-weight:800;">✓</span></div>
      <div class="fee-line"><span>Phí dịch vụ NetViet</span><span>5%</span></div>
      <a href="#/marketplace" class="btn outline" style="margin-top:8px;">Khám phá Marketplace</a>
    </div>
  `;

  const photo = await getHeroPhoto();
  const hero = document.getElementById('hero-box');
  if (photo && hero) {
    hero.style.backgroundImage = `linear-gradient(160deg, rgba(11,31,58,.88), rgba(18,42,77,.88)), url('${photo.url}')`;
    hero.style.backgroundSize = 'cover';
    hero.style.backgroundPosition = 'center';
  }
}
