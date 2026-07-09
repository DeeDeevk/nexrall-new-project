import { render as renderLanding } from './views/landing.js';
import { render as renderOnboarding } from './views/onboarding.js';
import { render as renderMarketplace } from './views/marketplace.js';
import { render as renderDashboard } from './views/dashboard.js';

const view = document.getElementById('view');
const navLinks = {
  '': document.getElementById('nav-home'),
  marketplace: document.getElementById('nav-market'),
  koc: document.getElementById('nav-market'),
  onboarding: document.getElementById('nav-onboard'),
  dashboard: document.getElementById('nav-dashboard'),
};

function parseHash() {
  const raw = (location.hash || '#/').slice(1);
  const parts = raw.split('/').filter(Boolean);
  return { name: parts[0] || '', param: parts[1] || null };
}

async function route() {
  const { name, param } = parseHash();
  Object.entries(navLinks).forEach(([key, el]) => { if (el) el.classList.toggle('active', key === name); });
  try {
    if (name === '' ) return await renderLanding(view);
    if (name === 'onboarding') return await renderOnboarding(view);
    if (name === 'marketplace') return await renderMarketplace(view, {});
    if (name === 'koc') return await renderMarketplace(view, { id: param });
    if (name === 'dashboard') return await renderDashboard(view);
    view.innerHTML = `<div class="empty"><div class="em">🤔</div>Không tìm thấy trang này.</div>`;
  } catch (err) {
    console.error(err);
    view.innerHTML = `<div class="error-box">Đã có lỗi xảy ra: ${String(err.message || err)}</div>`;
  }
}

window.addEventListener('hashchange', route);
window.addEventListener('DOMContentLoaded', route);
if (document.readyState !== 'loading') route();

window.onerror = (msg) => {
  console.error('Global error:', msg);
};

async function initUser() {
  const chip = document.getElementById('user-chip');
  try {
    if (window.Nexrall && window.Nexrall.getUser) {
      const user = await window.Nexrall.getUser();
      if (user && user.name && chip) chip.textContent = user.name;
    }
    if (window.Nexrall && window.Nexrall.ready) window.Nexrall.ready();
  } catch (e) { /* not running in Nexrall shell */ }
}
initUser();
