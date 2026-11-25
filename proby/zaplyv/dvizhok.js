// Движок существ «Заплыва» (Роман 25.11: «движок для создания клеток… чтобы было легко создавать вариации»;
// план design/zaplyv_dvizhok_plan.md). Существо — одна запись-анкета в vidy.json. По ней движок создаёт существо в мире,
// ведёт его (ход рывками к еде, гарпун в ответ на таран), отдаёт паспорт движку жизни (zhizn.js: кто его ест, делится ли,
// что остаётся после гибели) и собирает карточку Альманаха. Вариация — запись с ot и только отличиями: кода не требует.
// Первый шаг: палочки-соседи (гарпунщица, серая соперница и их вариации), они живут в списке мира pseudos.
// sim.js зовёт poyavlenie() и shag(); main.js рисует по telo(); слова карточек — только книга.
const url = new URL('./vidy.json', import.meta.url);
export const V = url.protocol === 'file:' ? JSON.parse((await import('node:fs')).readFileSync(url, 'utf8')) : await (await fetch(url)).json();

const num = (c, k) => typeof k === 'string' ? c[k] : k;
const sliv = (a, b) => { // запись поверх родителя: разделы сливаются по полям, списки и числа заменяются
  const out = { ...a };
  for (const k in b) out[k] = b[k] && typeof b[k] === 'object' && !Array.isArray(b[k]) && a[k] && typeof a[k] === 'object' && !Array.isArray(a[k]) ? sliv(a[k], b[k]) : b[k];
  return out;
};
const gotovo = new Map();
// Полная анкета вида: родитель (ot) плюс свои отличия. Круг в родословной — ошибка записи.
export function anketa(k, put = []) {
  if (gotovo.has(k) && gotovo.get(k).src === V.vidy[k]) return gotovo.get(k).a;
  const z = V.vidy[k]; if (!z) throw new Error('vidy.json: нет вида «' + k + '»');
  if (put.includes(k)) throw new Error('vidy.json: родословная по кругу: ' + [...put, k].join(' → '));
  const a = z.ot ? sliv(anketa(z.ot, [...put, k]), z) : z;
  gotovo.set(k, { src: z, a }); return a;
}
export const zhivut = () => Object.keys(V.vidy);
// Чей это вид. У существ, созданных до движка (тесты, студия снимков), поля vid нет: серая соперница помечена strain.
export const klyuch = q => q.vid || (q.strain ? 'strain' : 'pseudo');
export const svoi = (w, k) => w.pseudos.filter(q => klyuch(q) === k);
export const beret = (kto, q) => !q.vid || anketa(q.vid).edyat.includes(kto); // ест ли его этот охотник

// Чего в анкете не хватает или что в ней не так — словами, для теста и для того, кто пишет запись.
export function oshibki(k, c) {
  let a; try { a = anketa(k); } catch (e) { return [e.message]; }
  const bad = [], n = (v, name) => { const x = num(c, v); if (!(typeof x === 'number' && x >= 0)) bad.push(k + ': ' + name + ' не число (' + JSON.stringify(v) + ')'); };
  const T = a.telo || {}, H = a.hod || {}, M = a.mir || {};
  for (const [v, name] of [[T.dlina, 'telo.dlina'], [T.tolshchina, 'telo.tolshchina'], [T.zazor, 'telo.zazor'], [T.r, 'telo.r'], [H.skorost, 'hod.skorost'], [H.chuet, 'hod.chuet'], [H.otdyh, 'hod.otdyh'], [H.plavnost, 'hod.plavnost'], [a.eda?.r, 'eda.r'], [M.s_rosta, 'mir.s_rosta']]) n(v, name);
  if (![T.cepochka].flat().every(v => v >= 1)) bad.push(k + ': telo.cepochka — целое от 1 или [от, до]');
  for (const [v, name] of [[T.cvet, 'telo.cvet'], [T.kromka, 'telo.kromka'], [T.zhgutiki?.cvet, 'telo.zhgutiki.cvet'], [num(c, M.shans), 'mir.shans']]) if (!(Array.isArray(v) && v.length === 3)) bad.push(k + ': ' + name + ' — три числа');
  if (!['korma', 'krugom'].includes(T.zhgutiki?.gde)) bad.push(k + ': telo.zhgutiki.gde — korma или krugom');
  for (const f of ['dlina', 'volna', 'vitkov', 'beg', 'tolshch', 'alpha']) n(T.zhgutiki?.[f], 'telo.zhgutiki.' + f);
  if (T.zhgutiki?.gde === 'krugom' && !(T.zhgutiki.n >= 2 && T.zhgutiki.n % 2 === 0)) bad.push(k + ': telo.zhgutiki.n — чётное от 2');
  if (!Array.isArray(a.edyat)) bad.push(k + ': edyat — список тех, кто его ест');
  if (a.garpun) for (const f of ['otkat', 'oglushenie', 'udar', 'predel']) n(a.garpun[f], 'garpun.' + f);
  return bad;
}

// Появление в новом квадрате мира: по порядку записей, каждый вид по своему шансу для этой воды (b) и удалению от старта.
export function poyavlenie(w, b, far, safe, pt, mesto) { // mesto(u, v) — точка квадрата по двум долям, без общего жребия
  const c = w.cfg, r = w.r;
  for (const k of zhivut()) { const M = anketa(k).mir, o = M.zhrebiy === 'obshchiy'; // у нового вида свой жребий: запись не перетасовывает остальной мир
    let h = 2166136261; for (const ch of k + '|' + far + '|' + w.ids) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
    const sv = () => { h = Math.imul(h ^ h >>> 15, 2246822507); h = Math.imul(h ^ h >>> 13, 3266489909); return ((h ^= h >>> 16) >>> 0) / 4294967296; }, rr = o ? r : sv;
    if (!safe && far > num(c, M.s_rosta) && rr() < num(c, M.shans)[b]) {
      w.pseudos.push({ ...(o ? pt() : mesto(sv(), sv())), vx: 0, vy: 0, a: rr() * 6.283, t: 0, cool: 0, ...(k === 'strain' ? { strain: true } : {}), vid: k, id: ++w.ids }); } }
}

// Шаг всех палочек из анкет: рывок к ближней еде, пауза, новый курс; еду у носа съедает. Столкнулась с тобой — толчок;
// если у вида есть гарпун и налетел ты, бьёт в ответ («око за око»).
export function shag(w, dt, radius) {
  const c = w.cfg, r = w.r;
  for (const q of w.pseudos) {
    if (q.held > 0) continue; // в ней хищник: округлилась в шарик
    const k = klyuch(q), A = anketa(k), H = A.hod, G = A.garpun;
    q.t -= dt; q.cool = Math.max(0, q.cool - dt);
    if (q.t <= 0) {
      let best = null, bd = num(c, H.chuet);
      for (const f of w.food) { const d = Math.hypot(f.x - q.x, f.y - q.y); if (d < bd) { bd = d; best = f; } }
      q.a = best ? Math.atan2(best.y - q.y, best.x - q.x) : q.a + (r() - 0.5) * H.ryskanie; q.t = H.pauza[0] + r() * H.pauza[1]; q.rest = H.otdyh;
    }
    const go = q.t > q.rest ? num(c, H.skorost) : 0, e = Math.min(1, H.plavnost * dt);
    q.vx += (Math.cos(q.a) * go - q.vx) * e; q.vy += (Math.sin(q.a) * go - q.vy) * e; q.x += q.vx * dt; q.y += q.vy * dt;
    for (const f of w.food) if (!f.gone && Math.hypot(f.x - q.x, f.y - q.y) < A.eda.r) f.gone = true;
    for (const a of [...w.me]) {
      const dx = q.x - a.x, dy = q.y - a.y, d = Math.hypot(dx, dy) || 1;
      if (d > radius(a.m) + num(c, A.telo.r) || a.spore > 0) continue;
      const mine = (a.vx * dx + a.vy * dy) / d, its = -(q.vx * dx + q.vy * dy) / d; // кто на кого налетел
      a.vx -= dx / d * H.tolchok; a.vy -= dy / d * H.tolchok; q.vx += dx / d * H.tolchok; q.vy += dy / d * H.tolchok;
      if (G && mine > its && q.cool <= 0) {
        q.cool = num(c, G.otkat); a.stun = num(c, G.oglushenie); a.m *= num(c, G.udar); w.events.push(['zap', q.x, q.y, a.x, a.y]);
        if (a.m < num(c, G.predel)) w.lose(a, a.x, a.y, k);
      }
    }
  }
}

// Паспорт для движка жизни: чего нет в zhizn.json, выводится из анкеты. Кто его ест (edyat) и берёт ли вирус — туда же.
export function pasport(P, k) {
  const A = anketa(k);
  if (!P[k]) { P[k] = { est: ['food'], zanyatie: 'ryvki', gibel: A.gibel, opasen: !!A.garpun, ...(A.delitsya ? { delitsya: A.delitsya } : {}) };
    for (const kto of A.edyat) if (P[kto]?.est && !P[kto].est.includes(k)) P[kto].est.push(k);
    if (A.virus && P.phage && !P.phage.zarazhaet.includes(k)) P.phage.zarazhaet.push(k); }
  return P[k];
}

// Витрина: строка полки Альманаха и запасная карточка — из анкеты и слов книги (T). То, что уже записано руками, не трогаем.
export function vitrina(K, cards, T) {
  for (const k of zhivut()) { const A = anketa(k), t = T[k] || {}, al = A.almanah || {};
    K.items[k] ??= { group: A.garpun ? 'danger' : 'near', line: t.korotko || '', size: al.size || '', hint: al.hint || '', span: al.span || 20 * A.telo.dlina * [A.telo.cepochka].flat().pop(), a: -0.35 };
    cards[k] ??= { name: t.imya || k, who: t.imya || k, text: t.kto || '', fact: t.priroda || '', tip: t.sovet || '' }; }
}

// Рисунок палочки по анкете: тело (одна клетка или цепочка концами), цвет-метка, жгутики. Кисти даёт main.js (и песочница).
// Нить жгутика сплошная: шаг точек не больше их размера (урок L047: пунктир и бусы — брак).
export function risuy(q, { x, y, z, time, bodies, glow }) {
  const A = anketa(klyuch(q)), T = A.telo, F = T.zhgutiki, w = V.mera.tolshchina * z, ux = Math.cos(q.a), uy = Math.sin(q.a), wt = w * T.tolshchina;
  if (q.held > 0) { bodies.sphere(x, y, w * 1.5, T.cvet, [1, 0.5, 0.3], q.id); glow.put(x, y, w * 3, 1, 0.3, 0.1, 0.15); return; } // в ней хищник: шарик
  const hl = w * T.dlina, C = T.cepochka, n = Array.isArray(C) ? C[0] + q.id % (C[1] - C[0] + 1) : C, // [от, до]: у каждой цепочки своя длина
     shag = hl * 2 * T.zazor, all = hl + shag * (n - 1) / 2, [fr, fg, fb] = F.cvet;
  for (let i = 0; i < n; i++) { const o = (i - (n - 1) / 2) * shag;
    bodies.rod(x + ux * o, y + uy * o, q.a, hl, wt, 0, T.cvet, T.kromka, q.id + i * 37, Math.sin(time * T.kach[0] + q.id + i) * w * T.kach[1]); }
  const pr = F.tolshch * Math.max(z, 0.7), len = F.dlina * w, m = Math.ceil(len / pr * 1.9); // точки гуще своего размера: нить, а не бусы
  const nit = (bx, by, dx, dy, ph) => { for (let k = 0; k <= m; k++) { const f = 1.5 * (1 - Math.pow(3, -k / m)), wv = Math.sin(f * F.vitkov - time * F.beg + ph) * w * F.volna * f; // шаг мельче к кончику
    glow.put(bx + dx * f * len - dy * wv, by + dy * f * len + dx * wv, pr * (1.5 - f), fr, fg, fb, F.alpha * (0.85 - f * 0.65)); } }; // у тела толще, к кончику сходит на нет
  if (F.gde === 'krugom') for (let j = 0, h = F.n / 2; j < F.n; j++) { const s = j < h ? 1 : -1, b = ((j % h + 0.5) / h * 2 - 1) * all, dx = -uy * s * 0.81 - ux * 0.58, dy = ux * s * 0.81 - uy * 0.58; // вбок и назад
    nit(x + ux * b - uy * s * wt * 0.9, y + uy * b + ux * s * wt * 0.9, dx, dy, j); } // корень нити у самой оболочки
  else nit(x - ux * (all - w * 0.1), y - uy * (all - w * 0.1), -ux, -uy, 0);
  if (A.garpun && q.cool > 0) glow.put(x, y, w * 3.5, 0.5, 1, 0.75, 0.25 * q.cool); // только что стреляла
}
