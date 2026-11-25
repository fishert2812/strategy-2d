// Рост и деление записью (движок, кусок 5 карты движка; решение Романа 25.11 «А 1»). Чистая математика, без рисования.
// Существо — запись { forma: { tochki: [[x, y, r], …] }, chasti, … }; тело считает os() из telo_os.js.
// rost: 0 — только что родилась, 1 — объём вдвое, пора делиться. Еда кладёт рост в запас по ценности, запас доходит до тела
// ровно и понемногу (без рывков). Тело растёт в длину, с доли peretyazhka.s посередине стягивается перетяжка.
// При делении две дочки — новорождённые копии матери; если выпал выбор, у каждой своё отличие (игрок потом берёт одну).
// Числа — delenie.json.
import { os } from './telo_os.js';
const url = new URL('./delenie.json', import.meta.url);
export const DL = url.protocol === 'file:' ? JSON.parse((await import('node:fs')).readFileSync(url, 'utf8')) : await (await fetch(url)).json();

const kopiya = z => JSON.parse(JSON.stringify(z));

// Съедено на ценность cennost: рост ложится в запас.
export function est(z, cennost, C = DL) { z.zapas = (z.zapas || 0) + Math.max(0, cennost) * C.za_ukus; }

// Шаг времени: из запаса в рост не больше zapas_v_sek·dt и не больше shag_max за шаг. Возвращает прирост.
export function shag(z, dt, C = DL) {
  const d = Math.min(z.zapas || 0, C.zapas_v_sek * dt, C.shag_max, Math.max(0, 1 - (z.rost || 0)));
  z.rost = (z.rost || 0) + d; z.zapas = (z.zapas || 0) - d; return d;
}

// Вытянуть точки вдоль оси в k раз от середины (толщина та же).
const vytyanut = (T, k) => { const cx = T.reduce((s, p) => s + p[0], 0) / T.length, cy = T.reduce((s, p) => s + p[1], 0) / T.length;
  return T.map(([x, y, r]) => [cx + (x - cx) * k, cy + (y - cy) * k, r]); };
const razmah = T => Math.max(...T.map(p => Math.hypot(p[0] - T[0][0], p[1] - T[0][1])));
// Подобрать вытяжку так, чтобы объём стал cel (палочка, запятая); шар (одна точка или ось нулевой длины) толстеет.
function podobrat(T, cel, C) {
  if (T.length < 2 || razmah(T) < 0.05) { const k = Math.cbrt(cel / os(T, 28, C.r_min).obem); return T.map(([x, y, r]) => [x, y, r * k]); }
  let lo = 0.2, hi = 8; for (let i = 0; i < 40; i++) { const m = (lo + hi) / 2; if (os(vytyanut(T, m), 28, C.r_min).obem < cel) lo = m; else hi = m; }
  return vytyanut(T, (lo + hi) / 2);
}

// Тело при нынешнем росте: точки [x, y, r]. Объём = объём новорождённой × (1 + rost); после peretyazhka.s посередине перетяжка.
export function telo(z, C = DL) {
  const T0 = z.forma.tochki, V0 = os(T0, 28, C.r_min).obem, rost = Math.max(0, Math.min(1, z.rost || 0)), cel = V0 * (1 + rost);
  let T = podobrat(T0, cel, C); const P = C.peretyazhka, f = (rost - P.s) / (1 - P.s);
  if (f <= 0) return T;
  if (T.length < 2 || razmah(T) < 0.05) { // шар (кокк) делится перетяжкой поперёк: две половинки расходятся на f толщины, середина стягивается
    const [cx, cy, r0] = T[0], g = k => { const d = f * k; return [[cx - d, cy, k], [cx, cy, Math.max(C.r_min * 0.5, k * (1 - P.glubina * f))], [cx + d, cy, k]]; };
    let lo = r0 * 0.3, hi = r0 * 2; for (let i = 0; i < 40; i++) { const m = (lo + hi) / 2; if (os(g(m), 28, C.r_min).obem < cel) lo = m; else hi = m; }
    return g((lo + hi) / 2); }
  const o = os(T, 28, C.r_min), K = C.tochek, b = o.dlina, R = o.poperechnik / 2, S = [];
  const r0 = Math.max(C.r_min, T[0][2]), r1 = Math.max(C.r_min, T[T.length - 1][2]), w = P.shirina * Math.min(2 * R, b / 4); // ось от центра кормовой шапки до центра носовой
  for (let i = 0; i < K; i++) { const s = r0 + (b - r0 - r1) * i / (K - 1), q = o.sech(s), u = (s - b / 2) / w;
    S.push([q.x, q.y, Math.max(C.r_min * 0.5, q.r * (1 - P.glubina * f * Math.exp(-u * u)))]); }
  return podobrat(S, cel, C);
}

// Выпадает ли при делении выбор из двух разных дочек. У мутатора (способность Г46) чаще в C.mutator раз.
export const mutator = z => !!(z.sposobnosti && (Array.isArray(z.sposobnosti) ? z.sposobnosti.includes('mutator') : z.sposobnosti.mutator));
export const shans = (z, C = DL) => Math.min(1, C.shans_vybora * (mutator(z) ? C.mutator : 1));

const vzyat = (z, put) => put.split('.').reduce((o, k) => (o == null ? undefined : o[k]), z);
const polozhit = (z, put, v) => { const k = put.split('.'), last = k.pop(); k.reduce((o, q) => o[q], z)[last] = v; };
// Какие отличия применимы к этой записи (число по пути есть, или это форма).
const primenimy = (z, C) => C.otlichiya.filter(o => o.put === 'forma.dlina' ? z.forma.tochki.length > 1 && razmah(z.forma.tochki) >= 0.05 : o.put.startsWith('forma.') || typeof vzyat(z, o.put) === 'number'); // шар длиннее не станет

// Применить отличие o со знаком zn (+1 больше, −1 меньше) к записи d (новорождённой).
function otlichit(d, o, zn) {
  if (o.put === 'forma.tolshchina') d.forma.tochki = d.forma.tochki.map(([x, y, r]) => [x, y, r * (1 + zn * o.shag)]);
  else if (o.put === 'forma.dlina') d.forma.tochki = vytyanut(d.forma.tochki, 1 + zn * o.shag);
  else { const v = vzyat(d, o.put), n = o.celoe ? v + zn * o.shag : v * (1 + zn * o.shag); polozhit(d, o.put, Math.max(o.ot ?? -Infinity, Math.min(o.do ?? Infinity, n))); }
  d.otlichie = { put: o.put, znak: zn, imya: o.imya };
}

// Разделить мать (rost ≥ 1). rnd — случайные числа 0…1; novoe — что новое у каждой дочки для игры (например, гены). Возвращает
// { dochki: [A, B], vybor }: дочки — новорождённые записи (rost 0, запас матери пополам) в системе координат матери,
// у задней и передней половины тела; при выборе у каждой своё отличие, и дочки разные.
export function razdelit(z, rnd = Math.random, novoe = [], C = DL) {
  if ((z.rost || 0) < 1) return null;
  const M = os(telo(z, C), 28, C.r_min), N = os(z.forma.tochki, 28, C.r_min), cN = N.sech(N.dlina / 2), H = M.dlina;
  const vybor = rnd() < shans(z, C), mozhno = primenimy(z, C), dochki = [0.25, 0.75].map((u, i) => {
    const d = kopiya(z), c = M.sech(H * u); delete d.otlichie;
    d.forma.tochki = z.forma.tochki.map(([x, y, r]) => [x - cN.x + c.x, y - cN.y + c.y, r]);
    d.rost = 0; d.zapas = (z.zapas || 0) / 2; d.pokolenie = (z.pokolenie || 0) + 1; if (novoe[i] !== undefined) d.novoe = novoe[i];
    return d; });
  if (vybor && mozhno.length) { // разные отличия; если применимо одно — в разные стороны
    const i = Math.floor(rnd() * mozhno.length), j = mozhno.length > 1 ? (i + 1 + Math.floor(rnd() * (mozhno.length - 1))) % mozhno.length : i;
    otlichit(dochki[0], mozhno[i], rnd() < 0.5 ? 1 : -1); otlichit(dochki[1], mozhno[j], i === j ? -dochki[0].otlichie.znak : (rnd() < 0.5 ? 1 : -1)); }
  return { dochki, vybor: vybor && mozhno.length > 0 };
}
