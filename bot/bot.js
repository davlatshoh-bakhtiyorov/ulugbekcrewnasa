// Neyra Telegram bot (step 5): /start -> button that opens the Mini App; a shared location -> opens the Mini App
// at that field (?lat=..&lon=..). Long polling, no dependencies, Node 18+.
// Run:  npm run bot   (= node --env-file=.env bot/bot.js; TELEGRAM_BOT_TOKEN and WEBAPP_URL in .env, see .env.example)
const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const APP = (process.env.WEBAPP_URL || 'https://davlatshoh-bakhtiyorov.github.io/ulugbekcrewnasa/web/').replace(/\/?$/, '/');
if (!TOKEN) { console.error('TELEGRAM_BOT_TOKEN is missing - copy .env.example to .env and fill it in'); process.exit(1); }

const T = {
  uz: {
    start: 'Neyra — ekishdan oldin ko‘ring.\n\nDalangizni ko‘rsating, uchta savolga javob bering — NASA ma’lumoti bilan uchta ekin varianti.',
    open: '🌱 Dalani tekshirish', loc: '📍 Joylashuvimni yuborish',
    got: (la, lo) => `Dala: ${la.toFixed(4)}° N, ${lo.toFixed(4)}° E`, openHere: 'Shu dalani tekshirish',
  },
  en: {
    start: 'Neyra — see before you sow.\n\nShow your field, answer three questions — three crop options from NASA data.',
    open: '🌱 Check my field', loc: '📍 Send my location',
    got: (la, lo) => `Field: ${la.toFixed(4)}° N, ${lo.toFixed(4)}° E`, openHere: 'Check this field',
  },
};
const L = (msg) => (String(msg.from?.language_code || '').startsWith('en') ? T.en : T.uz);

async function api(method, body) {
  const r = await fetch(`https://api.telegram.org/bot${TOKEN}/${method}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body ?? {}) });
  const j = await r.json();
  if (!j.ok) throw new Error(`${method}: ${j.description}`);
  return j.result;
}
const openBtn = (text, url) => ({ inline_keyboard: [[{ text, web_app: { url } }]] });
// Bitta doimiy klaviatura: ilovani ochish (web_app tugmasi) va joylashuv yuborish
const mainKb = (l) => ({ keyboard: [[{ text: l.open, web_app: { url: APP } }], [{ text: l.loc, request_location: true }]], resize_keyboard: true, is_persistent: true });

async function onMessage(m) {
  const l = L(m), chat = m.chat.id;
  if (m.location) {
    const { latitude: la, longitude: lo } = m.location;
    const url = `${APP}?lat=${la.toFixed(5)}&lon=${lo.toFixed(5)}`;
    return api('sendMessage', { chat_id: chat, text: l.got(la, lo), reply_markup: openBtn(l.openHere, url) });
  }
  return api('sendMessage', { chat_id: chat, text: l.start, reply_markup: mainKb(l) }); // /start, /help va har qanday matn - bitta xabar
}

async function setup() {
  const me = await api('getMe');
  await api('setMyCommands', { commands: [{ command: 'start', description: 'Neyra — ekishdan oldin ko‘ring / see before you sow' }] });
  await api('setChatMenuButton', { menu_button: { type: 'web_app', text: 'Dalani tekshirish', web_app: { url: APP } } });
  console.log(`@${me.username} ready · Mini App: ${APP}`);
}

async function poll() {
  let offset = 0;
  for (;;) {
    try {
      const updates = await api('getUpdates', { offset, timeout: 50, allowed_updates: ['message'] });
      for (const u of updates) {
        offset = u.update_id + 1;
        if (u.message) await onMessage(u.message).catch((e) => console.error('message:', e.message));
      }
    } catch (e) {
      console.error('poll:', e.message);
      await new Promise((r) => setTimeout(r, 3000));
    }
  }
}

await setup();
if (process.argv.includes('--once')) process.exit(0);
await poll();
