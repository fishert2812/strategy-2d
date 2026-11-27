// Экран генов «Капли» спиралью ДНК (Роман 26.11 22:05: «экран где у нас гены сделать тоже ДНК… поместить но логически на участки дНК -
// гены которые мы собираем! И нажатие подсвечивало участок ДНК как бы выделяй приближая и разбирая ДНК ! Как делается в крутых презентациях»;
// 21:10: «когда нажимаешь у тебя бы подсвечивалась та часть которая отвечает за этот геном»).
// Поверх кольца генома (genome.js) — холст той же величины: каждая группа генов — своя строка спирали, каждый ген — один виток.
// Включённый ген светится цветом группы, пары оснований те же, что на загрузке (zagruzka.js). Касание гена — камера наезжает,
// виток расплетается в лестницу и пары расходятся с буквами; карточка внизу та же, что у кольца (касание передаётся месту на кольце).
// Кольцо остаётся под холстом невидимым: на нём держатся карточка, мигание части на клетке и счёт «включено».
import { layout } from '../genome.js';

const PARY = [['#7cc8f0', '#f0c35a', 'A', 'T'], ['#b49cff', '#7dffb0', 'G', 'C']];
const SDVIG = Math.PI * 0.78, V_STROKE = 8;
// Гены «Капли», которых нет на кольце: оружие и пасть (evo.json «svoi»); имя в книге у иглы — tssB
export const SVOI = [{ id: 'gulp', gene: 'gulp' }, { id: 'igla', gene: 'tssB' }, { id: 'kislota', gene: 'kislota' }];

// Все участки спирали по строкам. Без DOM — проверяется тестом: каждый ген кольца и каждый свой ген «Капли» на своём месте.
export function uchastki(G, ekstra = []) {
  const vse = layout(G), stroki = [];
  const dobav = (imya, cvet, sp) => { for (let i = 0; i < sp.length; i += V_STROKE) stroki.push({ imya: i ? '' : imya, cvet, sp: sp.slice(i, i + V_STROKE) }); };
  G.arcs.forEach((arc, k) => dobav(arc.name, arc.color, vse.map((p, i) => ({ ...p, idx: i })).filter(p => p.arc === k).map(p => ({ id: p.slot.id, gene: p.slot.gene, idx: p.idx, cvet: arc.color }))));
  const chuzhie = vse.map((p, i) => ({ ...p, idx: i })).filter(p => p.plasmid).map(p => ({ id: p.slot.id, gene: p.slot.gene, idx: p.idx, cvet: p.color }));
  dobav('Чужие и навыки', '#7dffb0', chuzhie);
  const est = new Set(vse.map(p => p.slot.id).filter(Boolean));
  dobav('Оружие и пасть', '#ff8a5c', SVOI.concat(ekstra.filter(id => !SVOI.some(s => s.id === id)).map(id => ({ id, gene: id }))).filter(s => !est.has(s.id)).map(s => ({ ...s, idx: -1, cvet: '#ff8a5c' })));
  return stroki;
}
// Слова гена из книги: по ключу (klyuch) или по латинскому имени
export function slova(book, u) { return (u.gene && book[u.gene]) || Object.values(book).find(b => b.klyuch === u.id) || {}; }

const $ = id => document.getElementById(id);
const [G, KNIGA] = await Promise.all([fetch('genome.json').then(r => r.json()), fetch('kniga/teksty_genov.json').then(r => r.json()).catch(() => ({}))]);
const book = KNIGA.geny || {};
const ring = $('ring'), ekran = $('genome');
const cv = document.createElement('canvas'); cv.id = 'gdnk';
cv.style.cssText = 'position:absolute;z-index:1;touch-action:manipulation;border-radius:22px';
ekran.appendChild(cv);
const g = cv.getContext('2d');
const S = { stroki: [], vybor: null, u: 0, cam: { s: 1, x: 0, y: 0 }, t0: 0, idet: false, w: 0, h: 0 };
window.kaplyaGenomDnk = S;

function rasstavit() { // где строки и витки: в точках холста при камере 1
  const w = S.w, h = S.h, n = S.stroki.length, sh = Math.min(84, (h - 12) / n), sw = Math.min(56, (w - 24) / V_STROKE);
  const y0 = (h - sh * n) / 2;
  S.stroki.forEach((st, r) => { st.y = y0 + r * sh; st.h = sh; st.x0 = (w - sw * V_STROKE) / 2; st.sw = sw;
    st.sp.forEach((u, i) => { u.x = st.x0 + i * sw; u.y = st.y; u.w = sw; u.h = sh; u.yc = st.y + 13 + (sh - 26) / 2 - 2; u.A = Math.min(12, (sh - 30) / 2.4); }); });
}

function otkryt() {
  const w = window.zaplyvWorld?.(), est = Object.keys(w?.genes || {});
  S.stroki = uchastki(G, est); S.vybor = null; S.u = 0; S.cam = null; S.t0 = performance.now();
  ring.style.opacity = '0'; ring.style.pointerEvents = 'none';
  const hint = document.querySelector('#gcard .hint');
  if (hint) hint.textContent = 'Это твоя ДНК. Каждый виток — ген, светятся включённые. Коснись витка — увидишь его участок и что он даёт.';
  if (!S.idet) { S.idet = true; requestAnimationFrame(kadr); }
}

function kadr(now) {
  const r = ring.getBoundingClientRect(), on = ekran.classList.contains('on') && r.width > 0;
  if (!on) { S.idet = false; cv.style.display = 'none'; return; }
  const er = ekran.getBoundingClientRect(), dpr = Math.min(2, devicePixelRatio || 1);
  cv.style.display = 'block'; cv.style.left = (r.left - er.left) + 'px'; cv.style.top = (r.top - er.top) + 'px'; cv.style.width = r.width + 'px'; cv.style.height = r.height + 'px';
  if (S.w !== r.width || S.h !== r.height) { S.w = r.width; S.h = r.height; cv.width = r.width * dpr; cv.height = r.height * dpr; }
  rasstavit();
  const t = (now - S.t0) / 1000, w = window.zaplyvWorld?.() || { genes: {} };
  // камера: к выбранному витку наезд, без выбора — весь геном
  const v = S.vybor, cel = v ? { s: Math.min(2.6, S.w / (v.w * 2.6)), x: v.x + v.w / 2, y: v.yc } : { s: 1, x: S.w / 2, y: S.h / 2 };
  if (!S.cam) S.cam = { ...cel };
  const k = 7 / 60; S.cam.s += (cel.s - S.cam.s) * k; S.cam.x += (cel.x - S.cam.x) * k; S.cam.y += (cel.y - S.cam.y) * k;
  S.u += ((v ? 1 : 0) - S.u) * Math.min(1, 1 / 60 * 4);
  risuy(t, w, dpr);
  requestAnimationFrame(kadr);
}

function risuy(t, w, dpr) {
  const W = S.w, H = S.h;
  g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, W, H);
  g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; // пост 27.11: прозрачность прошлого кадра гасила подложку, сквозь гены проступал мир
  g.fillStyle = 'rgba(3,10,18,0.95)'; g.fillRect(0, 0, W, H);
  const c = S.cam;
  g.save(); g.translate(W / 2, H / 2); g.scale(c.s, c.s); g.translate(-c.x, -c.y);
  const vstup = Math.min(1, t / 0.9); // при открытии спираль собирается слева направо, строка за строкой, как на загрузке
  const vsego = S.stroki.reduce((n, st) => n + st.sp.length, 0); let nom = 0;
  for (const st of S.stroki) {
    if (st.imya) { g.globalAlpha = 0.9 * (1 - S.u); g.fillStyle = st.cvet; g.font = '600 10px -apple-system, system-ui, sans-serif'; g.textAlign = 'left'; g.fillText(st.imya.toUpperCase().split('').join(' '), st.x0 + 2, st.y + 10); }
    for (const u of st.sp) {
      const dolya = Math.max(0, Math.min(1, vstup * vsego * 1.15 - nom++));
      if (dolya > 0) vitok(u, t, !!(u.id && w.genes[u.id]), dolya);
    }
  }
  g.restore();
  if (S.vybor && S.u > 0.3) podpis(S.vybor, !!(S.vybor.id && w.genes[S.vybor.id]));
}

// Один ген — один виток: две нити и семь пар между ними. Выбранный расплетается в лестницу, пары расходятся с буквами.
function vitok(u, t, est, dolya) {
  const sel = S.vybor === u, raz = sel ? S.u : 0, ten = S.vybor && !sel ? 1 - 0.65 * S.u : 1;
  const A = u.A * (1 + 0.8 * raz), krut = 1 - 0.85 * raz, x0 = u.x + 3, x1 = u.x + 3 + (u.w - 6) * dolya;
  const faza = x => ((x - u.x) / u.w) * Math.PI * 2 * krut + t * 0.9 * (1 - raz) + u.x * 0.05;
  const nit = (dop, perednie) => {
    g.lineCap = 'round';
    for (let x = x0; x < x1 - 0.5; x += 2) {
      const a1 = faza(x) + dop, a2 = faza(x + 2) + dop, z = Math.cos((a1 + a2) / 2);
      if ((z >= 0) !== perednie) continue;
      if (est && perednie) { g.globalCompositeOperation = 'lighter'; g.globalAlpha = ten * 0.25; g.strokeStyle = u.cvet; g.lineWidth = 7;
        g.beginPath(); g.moveTo(x, u.yc + A * Math.sin(a1)); g.lineTo(x + 2, u.yc + A * Math.sin(a2)); g.stroke(); g.globalCompositeOperation = 'source-over'; }
      g.globalAlpha = ten * (est ? 0.55 + 0.45 * z : 0.22 + 0.15 * z);
      g.strokeStyle = est ? u.cvet : '#9fb6c8'; g.lineWidth = est ? 2.6 : 1.6;
      g.beginPath(); g.moveTo(x, u.yc + A * Math.sin(a1)); g.lineTo(x + 2, u.yc + A * Math.sin(a2)); g.stroke();
    }
  };
  if (est || sel) { const rx = u.w / 2, ry = A + 8, cx = u.x + u.w / 2, gr = g.createRadialGradient(0, 0, 0, 0, 0, 1); gr.addColorStop(0, u.cvet); gr.addColorStop(1, 'rgba(0,0,0,0)'); // пост 27.11: свет витка мягким пятном, не прямоугольником
    g.save(); g.translate(cx, u.yc); g.scale(rx, ry); g.globalAlpha = ten * (0.12 + 0.12 * raz); g.fillStyle = gr; g.beginPath(); g.arc(0, 0, 1, 0, 7); g.fill(); g.restore(); }
  nit(0, false); nit(SDVIG, false);
  const N = 7;
  for (let i = 0; i < N; i++) {
    const x = u.x + 3 + (u.w - 6) * (i + 0.5) / N; if (x > x1) break;
    const ya = u.yc + A * Math.sin(faza(x)), yb = u.yc + A * Math.sin(faza(x) + SDVIG), pr = PARY[(u.idx * 3 + i * 5 + (u.gene || '').length) % 2], nav = (i + u.x) % 3 < 1.5;
    const ca = nav ? pr[0] : pr[1], cb = nav ? pr[1] : pr[0], la = nav ? pr[2] : pr[3], lb = nav ? pr[3] : pr[2];
    const sr = (ya + yb) / 2, shel = raz * 3; // пары расходятся посередине
    g.globalAlpha = ten * (est ? 0.95 : 0.3); g.lineWidth = est ? 2.2 : 1.4; g.lineCap = 'round';
    g.strokeStyle = est ? ca : '#6d8597'; g.beginPath(); g.moveTo(x, ya); g.lineTo(x, sr - shel * Math.sign(yb - ya || 1)); g.stroke();
    g.strokeStyle = est ? cb : '#6d8597'; g.beginPath(); g.moveTo(x, yb); g.lineTo(x, sr + shel * Math.sign(yb - ya || 1)); g.stroke();
    if (raz > 0.5) { g.globalAlpha = (raz - 0.5) * 2; g.fillStyle = '#e8f6ff'; g.font = '600 4px ui-monospace, Menlo, monospace'; g.textAlign = 'center';
      g.fillText(la, x + 2.6, (ya + sr) / 2 + 1.5); g.fillText(lb, x + 2.6, (yb + sr) / 2 + 1.5); }
  }
  nit(0, true); nit(SDVIG, true);
  // ограничитель участка и подпись гена
  g.globalAlpha = ten * 0.5; g.fillStyle = '#cfe8f5'; g.beginPath(); g.arc(u.x + 1, u.yc, 1.4, 0, 7); g.fill();
  g.globalAlpha = ten * (est ? 1 : 0.6) * (1 - raz); g.fillStyle = est ? u.cvet : '#9fb6c8';
  g.font = `${est ? 700 : 400} italic 10px ui-monospace, Menlo, monospace`; g.textAlign = 'center';
  g.fillText(u.gene === '?' ? '?' : (u.gene || '').slice(0, 7), u.x + u.w / 2, u.yc + u.A + 13);
}

// Над расплетённым участком — имя гена крупно (в точках экрана, не камеры)
function podpis(u, est) {
  const b = slova(book, u);
  g.globalAlpha = Math.min(1, (S.u - 0.3) / 0.5); g.textAlign = 'center';
  g.fillStyle = '#f2fbff'; g.font = '600 20px -apple-system, system-ui, sans-serif'; g.fillText(b.imya || u.gene, S.w / 2, 30);
  g.fillStyle = est ? u.cvet : '#9fb6c8'; g.font = 'italic 14px ui-monospace, Menlo, monospace'; g.fillText((u.gene || '') + (est ? ' · включён' : ' · спит'), S.w / 2, 50);
  g.fillStyle = 'rgba(220,240,250,0.6)'; g.font = '12px -apple-system, system-ui, sans-serif'; g.fillText('коснись ещё раз — весь геном', S.w / 2, S.h - 12);
}

function vybrat(u) {
  S.vybor = u;
  if (!u) return;
  if (u.idx >= 0) { const m = ring.querySelectorAll('g.slot')[u.idx]; m?.onclick?.({ stopPropagation() {} }); return; }
  const b = slova(book, u), w = window.zaplyvWorld?.() || { genes: {} }, box = $('gcard'); // своих генов «Капли» на кольце нет — карточку пишем сами
  box.innerHTML = ''; box.classList.toggle('no', !w.genes[u.id]);
  const h = document.createElement('h2'); h.textContent = (b.imya || u.gene) + ' '; const i = document.createElement('i'); i.textContent = u.gene; h.appendChild(i); box.appendChild(h);
  const sub = document.createElement('div'); sub.className = 'sub'; sub.textContent = 'Оружие и пасть · ' + (w.genes[u.id] ? 'включён' : 'спит'); box.appendChild(sub);
  for (const [k, v] of [['Что даёт', b.daet], ['В природе', b.priroda]]) if (v) { const p = document.createElement('p'); const bb = document.createElement('b'); bb.textContent = k; p.appendChild(bb); p.appendChild(document.createTextNode(v)); box.appendChild(p); }
}

cv.addEventListener('click', e => {
  if (!S.cam) return;
  const r = cv.getBoundingClientRect(), c = S.cam;
  const x = (e.clientX - r.left - S.w / 2) / c.s + c.x, y = (e.clientY - r.top - S.h / 2) / c.s + c.y;
  let hit = null;
  for (const st of S.stroki) for (const u of st.sp) if (x >= u.x && x < u.x + u.w && y >= u.y && y < u.y + u.h) hit = u;
  vybrat(hit && hit !== S.vybor ? hit : null);
});

new MutationObserver(() => { if (ekran.classList.contains('on') && !S.idet) otkryt(); }).observe(ekran, { attributes: true, attributeFilter: ['class'] });
if (ekran.classList.contains('on')) otkryt();
