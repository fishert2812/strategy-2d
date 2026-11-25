// Стенд сравнения (кусок Ж, design/dlya_dvizhka/kuski_parallelno.md). Адрес: /zaplyv/?stend (?stend=zapyataya — сразу эта пара).
// Роман 25.11: «чтобы движок был как ядро наше!! Чтобы больше не пришлось руками писать». Каждый перенос существа
// из ручного кода в запись движка принимается глазами: слева существо, как его рисует нынешний ручной код игры,
// справа то же существо из записи vidy.json, одна поза, одна вода, тот же рисунок main.js. Стенд только показывает:
// мир стоит (шаг мира заменён на «держать позу»), еды и чужих нет, касания по воде не доходят до игры.
// Пары — stend.json. Пока настоящей записи в vidy.json нет, справа черновик из stend.json (в игре он не живёт).
import * as dv from './dvizhok.js';

const url = new URL('./stend.json', import.meta.url);
export const S = url.protocol === 'file:' ? JSON.parse((await import('node:fs')).readFileSync(url, 'utf8')) : await (await fetch(url)).json();

// Чистые правила (проверяет test_stend.mjs). Ключ записи движка: настоящая из vidy.json, иначе черновик стенда.
export const klyuch = p => dv.V.vidy[p.dvizhok] && dv.V.vidy[p.dvizhok] !== p.chernovik ? p.dvizhok : 'stend_' + p.kto;
export const chernovik = p => klyuch(p) !== p.dvizhok;
export function zapis(p) { const k = klyuch(p); if (!dv.V.vidy[k]) dv.V.vidy[k] = p.chernovik; return k; } // черновик виден движку только на стенде
export function oshibki(p, cfg) { // что не так в паре — словами
  const bad = [], k = zapis(p);
  if (!p.kto || !p.imya) bad.push('пара без kto или imya');
  if (!p.ruka) bad.push(p.kto + ': ruka — список мира с ручным рисунком');
  if (!(p.mashtab > 0)) bad.push(p.kto + ': mashtab не число');
  return bad.concat(dv.oshibki(k, cfg));
}

if (typeof document !== 'undefined') {
  const Q = new URLSearchParams(location.search), lomat = Q.get('lomat'); // lomat=levo|pravo — самопроверка шага 63: одной половины нет
  const el = (tag, cls, text, parent) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text) e.textContent = text; parent?.appendChild(e); return e; };
  el('style', '', `#hud,#pause,#flag,#scalebox,#growbar,#toast,#ver,#goal,#arrow{display:none!important}
#sv{position:fixed;inset:0;z-index:19;touch-action:none}
#st,#sk{position:fixed;left:0;right:0;z-index:20;display:flex;gap:8px;align-items:center;font:600 17px -apple-system,system-ui,sans-serif;color:#dff3f5}
#st{top:0;justify-content:space-between;padding:calc(env(safe-area-inset-top) + 6px) 12px 6px}
#st a{color:#8fe6f2;text-decoration:none;min-height:44px;min-width:44px;display:flex;align-items:center}
#sk{bottom:0;padding:8px 10px calc(env(safe-area-inset-bottom) + 10px);background:linear-gradient(#02040a00,#02040af2 20%)}
#sk button{flex:1;min-height:48px;margin:0;border-radius:24px;border:1px solid #3b8a96;background:#0a2832cc;color:#dff3f5;font:inherit;font-weight:500}
#sk button.on{background:#dff3f5;border-color:#fff;color:#04202a;font-weight:600}
.sp{position:fixed;z-index:20;width:50%;text-align:center;font:600 15px -apple-system,system-ui,sans-serif;color:#bfe6ea;pointer-events:none}.sp small{display:block;font-weight:400;color:#8fb8be}`, document.head);
  const sv = el('div', '', '', document.body); sv.id = 'sv'; // касания по воде не доходят до игры: стенд ничего не меняет
  for (const ev of ['pointerdown', 'pointermove', 'pointerup', 'touchstart', 'click']) sv.addEventListener(ev, e => e.stopPropagation());
  const top = el('div', '', '', document.body); top.id = 'st'; el('a', '', S.slova.nazad, top).href = './'; const zag = el('span', '', S.slova.zagolovok, top); el('span', '', '', top).style.minWidth = '44px';
  const L = el('div', 'sp', '', document.body), R = el('div', 'sp', '', document.body); L.style.left = '0'; R.style.right = '0';
  const podpis = (d, t, s) => { d.textContent = t; el('small', '', s, d); }; // над половиной: чей рисунок и откуда
  const kn = el('div', '', '', document.body); kn.id = 'sk';
  let i = Math.max(0, S.pary.findIndex(p => p.kto === Q.get('stend'))), moy = null, sut = 720, H = 1280, nado = true;
  const knop = S.pary.map((p, j) => { const b = el('button', '', p.imya, kn); b.onclick = () => { i = j; nado = true; }; return b; });
  const W = () => window.zaplyvWorld();
  // Поза пары: каждое существо на середине своей половины, оба смотрят вверх; камера стоит.
  const mesto = s => { const P = S.pary[i], z = P.mashtab, D = S.poza.razmah * sut / z; return { x: s * D, y: 0, a: S.poza.a, z }; };
  const derzhi = (q, m) => { q.x = m.x; q.y = m.y; q.a = m.a; q.vx = 0; q.vy = 0; };
  const nastroy = w => { const P = S.pary[i], k = zapis(P), l = mesto(-1), r = mesto(1), id = 7; // одно зерно: прожилки и блики тел совпадают
    for (const s of ['food', 'prey', 'amoebas', 'phages', 'plants', 'crumbs', 'bdellos', 'slime', 'slippers', 'bells', 'rotis', 'pseudos', 'donors', 'away']) if (Array.isArray(w[s])) w[s] = [];
    w.me.length = 1; const me = w.me[0]; me.tr = null; me.m = 1; // ручной рисунок нашей клетки следует за следом: новый след для новой позы
    if (P.ruka === 'me' && lomat !== 'levo') derzhi(me, l); else derzhi(me, { x: 0, y: 1e5, a: S.poza.a }); // не на стенде — далеко за кадром
    if (P.ruka !== 'me' && lomat !== 'levo') w[P.ruka] = [{ ...l, vx: 0, vy: 0, t: 99, m: 1, id }];
    if (lomat !== 'pravo') w.pseudos = [{ ...r, vx: 0, vy: 0, t: 99, cool: 0, vid: k, id }];
    zag.textContent = P.imya; podpis(L, S.slova.ruka, S.slova.ruka_m); podpis(R, S.slova.dvizhok, chernovik(P) ? S.slova.chernovik_m : S.slova.zapis_m + ' ' + k);
    knop.forEach((b, j) => b.classList.toggle('on', j === i)); nado = false;
    window.zaplyvStend = { para: P.kto, ruka: P.ruka, dvizhok: k, chernovik: chernovik(P), lomat, levo: l, pravo: r }; };
  const shag = w => { const P = S.pary[i], l = mesto(-1), r = mesto(1);
    if (nado) nastroy(w);
    if (P.ruka !== 'me') for (const q of w[P.ruka] || []) derzhi(q, l); else if (lomat !== 'levo') derzhi(w.me[0], l);
    for (const q of w.pseudos) derzhi(q, r);
    w.choice = []; w.events.length = 0; };
  const sledi = () => { const w = W();
    const menu = document.getElementById('menu'); if (menu?.classList.contains('on')) document.getElementById('mgo')?.click(); // со второго запуска игра открывается меню: стенду нужен мир, плывём сразу
    if (w && w !== moy) { moy = w; nado = true; w.chunk = () => {}; w.step = () => shag(w); // мир стоит: только поза
      w.kamera = (v, Wd, Hd) => { sut = Wd; H = Hd; const m = mesto(0); v.x = 0; v.y = S.poza.vverh * H / m.z; v.z = m.z; }; }
    const y = innerHeight * (0.5 - S.poza.vverh) - innerWidth * 0.62; L.style.top = R.style.top = Math.max(60, y) + 'px';
    requestAnimationFrame(sledi); };
  sledi();
}
