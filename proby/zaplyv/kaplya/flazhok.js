// Один флажок на всех экранах «Капли» (Роман 27.11 10:08: «в меню я не могу правки фоткать как в игре! Это проблема!»; урок L070).
// Флажок висит поверх любого окна: игра, пауза и её разделы, Альманах, Режимы, Ночь рода, карточки, вопрос мутации, гибель, список отметок.
// Тянешь — снимок всего экрана (мир внизу, открытое окно поверх) с кольцом там, где отпустил; коснулся — тот же снимок без кольца.
// Отметка — одна картинка; подпись (слова, экран, момент) впечатывается в неё при отправке. Второго кадра без подписи нет.
// Окна сверху вниз: первое открытое и есть экран отметки.
export const OKNA = [['cabinet', 'Альманах'], ['genome', null], ['night', 'Ночь рода'], ['menu', 'Режимы'], ['end', 'экран гибели'],
  ['kvybor', 'вопрос мутации'], ['offer', 'карточки умений']];
const otkryto = el => el && (el.id === 'kvybor' || el.classList.contains('on'));
export function ekran(doc, razdel) { for (const [id, imya] of OKNA) if (otkryto(doc.getElementById(id))) return imya || razdel || 'Пауза'; return 'игра'; }
// Чего на снимке быть не должно: сам флажок, его лист и надписи о нём. Холст игры снимаем сами, сразу после кадра.
export const MIMO = new Set(['c', 'flag', 'fpin', 'fsheet', 'note', 'nundo']);
let gruz = null;
export function podgruzit(src) {
  if (window.html2canvas) return Promise.resolve(window.html2canvas);
  if (!gruz) gruz = new Promise((ok, no) => { const s = document.createElement('script'); s.src = src; s.onload = () => ok(window.html2canvas); s.onerror = () => { gruz = null; no(new Error('снимок окон не загрузился')); }; document.head.appendChild(s); });
  return gruz;
}
// Снимок экрана шириной W. Холст игры копируется сразу (до первого await), пока в нём свежий кадр; окна и надписи — поверх.
// cx, cy — где отпустил флажок (null — коснулся). Возвращает { full: картинка экрана, kusok: 320×320 вокруг флажка или null, okna: снялись ли окна }.
export async function snimok(game, W, src, cx, cy) {
  const iw = innerWidth, ih = innerHeight, k = W / iw, H = Math.round(ih * k), c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d'); g.fillStyle = '#04121a'; g.fillRect(0, 0, W, H); try { g.drawImage(game, 0, 0, W, H); } catch (_) {}
  let okna = false;
  try { const h2c = await podgruzit(src);
    const dom = await h2c(document.documentElement, { backgroundColor: null, scale: k, x: scrollX, y: scrollY, width: iw, height: ih, windowWidth: iw, windowHeight: ih,
      logging: false, useCORS: true, ignoreElements: el => MIMO.has(el.id),
      onclone: d => { for (const e of [d.documentElement, d.body]) e.style.background = 'transparent'; } }); /* фон страницы прозрачный: мир под окнами виден */
    g.drawImage(dom, 0, 0, W, H); okna = true; } catch (_) { /* окна не снялись — остаётся мир */ }
  if (cx != null) { const fx = cx * k, fy = cy * k; g.lineWidth = 9; g.strokeStyle = 'rgba(0,0,0,0.55)'; g.beginPath(); g.arc(fx, fy, 30, 0, 6.283); g.stroke(); g.lineWidth = 4; g.strokeStyle = '#ffb48a'; g.stroke(); }
  let kusok = null;
  if (cx != null) { const S = Math.min(W, H) * 0.45, x0 = Math.max(0, Math.min(W - S, cx * k - S / 2)), y0 = Math.max(0, Math.min(H - S, cy * k - S / 2)), q = document.createElement('canvas'); q.width = q.height = 320;
    q.getContext('2d').drawImage(c, x0, y0, S, S, 0, 0, 320, 320); kusok = q.toDataURL('image/jpeg', 0.8); }
  return { full: c.toDataURL('image/jpeg', 0.82), kusok, okna };
}
