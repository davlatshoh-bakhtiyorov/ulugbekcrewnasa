// Telegram Mini App bilan bog'lanish. Telegram tashqarisida (oddiy brauzer) hammasi sahifa ichidagi
// tugmalar va navigator.geolocation bilan ishlaydi.
const tg = window.Telegram?.WebApp ?? null;
export const inTelegram = !!(tg && tg.initData);

export function initTelegram() {
  const root = document.documentElement;
  if (!inTelegram) return;
  root.classList.add('in-tg');
  tg.ready();
  tg.expand();
  const apply = () => root.setAttribute('data-theme', tg.colorScheme === 'dark' ? 'dark' : 'light');
  apply();
  tg.onEvent('themeChanged', apply);
}

/** Dehqon tilini taxmin qilish: Telegram tili 'en' bo'lsa inglizcha, aks holda o'zbekcha */
export const telegramLang = () => tg?.initDataUnsafe?.user?.language_code ?? null;

// ---------- asosiy tugma (Telegram: MainButton; brauzer: pastdagi tugma) ----------
let mainHandler = null;
export function setPrimary(text, onClick, enabled = true) {
  const btn = document.getElementById('primary');
  if (inTelegram) {
    const mb = tg.MainButton;
    if (mainHandler) mb.offClick(mainHandler);
    mainHandler = onClick;
    if (!text) { mb.hide(); return; }
    mb.setText(text);
    mb.onClick(mainHandler);
    enabled ? mb.enable() : mb.disable();
    mb.show();
    return;
  }
  if (!text) { btn.hidden = true; btn.onclick = null; return; }
  btn.hidden = false;
  btn.textContent = text;
  btn.disabled = !enabled;
  btn.onclick = onClick;
}

export function primaryProgress(on) {
  if (!inTelegram) return;
  on ? tg.MainButton.showProgress(false) : tg.MainButton.hideProgress();
}

// ---------- orqaga tugmasi ----------
let backHandler = null;
export function setBack(onClick) {
  const btn = document.getElementById('back');
  if (inTelegram) {
    const bb = tg.BackButton;
    if (backHandler) bb.offClick(backHandler);
    backHandler = onClick;
    if (onClick) { bb.onClick(onClick); bb.show(); } else bb.hide();
    btn.hidden = true;
    return;
  }
  btn.hidden = !onClick;
  btn.onclick = onClick;
}

export const haptic = () => { try { tg?.HapticFeedback?.selectionChanged(); } catch { /* yo'q */ } };

// ---------- joylashuv ----------
function browserLocation() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error('no geolocation'));
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lon: p.coords.longitude }),
      reject, { enableHighAccuracy: true, timeout: 15000 });
  });
}

/** Telegram 8.0+ LocationManager, bo'lmasa brauzer geolokatsiyasi */
export function getLocation() {
  if (!inTelegram || !tg.isVersionAtLeast?.('8.0') || !tg.LocationManager) return browserLocation();
  return new Promise((resolve, reject) => {
    const lm = tg.LocationManager;
    lm.init(() => {
      if (!lm.isLocationAvailable) { browserLocation().then(resolve, reject); return; }
      lm.getLocation((d) => (d ? resolve({ lat: d.latitude, lon: d.longitude }) : reject(new Error('denied'))));
    });
  });
}
