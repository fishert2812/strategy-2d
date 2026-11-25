// Зоны на теле (Роман 25.11: «взаимодействие ведь тоже универсальное просто определить. Зону рта! … оболочка зона!»).
// Зона — участок обвода тела с именем: рот, оболочка, место посадки, сцепка, точка удара. Она часть записи существа
// (zapis.zony) и сидит на том же контуре, что и части (telo_os.js): тело поменяло форму — зона переехала вместе с ним.
// Касание двух существ отсюда же: какая зона одного коснулась какой зоны другого. Что из этого выйдет, решают правила
// (pravila_zon.json), не этот файл. Чистая математика.
import { os, iz_formy } from './telo_os.js';
import { VC } from './vid_chasti.js';
const D = VC.zony, TAU = 6.283185;
const telo = z => os(z.forma?.tochki || iz_formy(z.forma?.tip || 'palochka', z.forma?.dlina || 2.14, 1, z.forma?.izgib || 0));
// Где у зоны середины на обводе (в радианах обвода): нос, корма, оба бока, всё тело или своё место долей обвода от носа.
const centry = (O, m) => m === 'nos' ? [O.nos_t] : m === 'korma' ? [O.korma_t] : m === 'boka' ? O.boka_t : typeof m === 'number' ? [O.nos_t + m * TAU] : null;
const krug = d => Math.abs(((d % TAU) + TAU + Math.PI) % TAU - Math.PI);
// Все зоны записи: свои поверх общих. У любого тела есть «оболочка» — весь обвод.
export const zony = zapis => { const Z = { obolochka: { ...D.obolochka } }; for (const [k, v] of Object.entries(zapis.zony || {})) Z[k] = { ...D[k], ...v }; return Z; };
// Точки обвода с именами зон, в которые они попали. poza: { x, y, a, tolshchina } — где существо в мире. n — сколько точек.
export function obvod_zon(zapis, poza, n = D.tochek) { const O = telo(zapis), Z = zony(zapis), w = poza.tolshchina, ux = Math.cos(poza.a), uy = Math.sin(poza.a), T = [];
  for (let i = 0; i < n; i++) { const t = i / n * TAU, k = O.kray(t), imena = [];
    for (const [imya, z] of Object.entries(Z)) { const c = centry(O, z.mesto); if (!c || c.some(q => krug(t - q) <= z.shirina * Math.PI)) imena.push(imya); }
    T.push({ x: poza.x + (k.x * ux - k.y * uy) * w, y: poza.y + (k.x * uy + k.y * ux) * w, n: poza.a + k.n, zony: imena }); }
  return { O, T, poza }; }
// Доля обвода, занятая зоной (для расчётов: чем шире рот, тем больше берёт).
export const dolya = (zapis, imya) => { const R = obvod_zon(zapis, { x: 0, y: 0, a: 0, tolshchina: 1 }); return R.T.filter(p => p.zony.includes(imya)).length / R.T.length; };
// Касание: какие зоны существа А вошли в тело Б (или подошли ближе зазора) и какой зоны Б там коснулись.
// Ответ: список { a, b, glubina, x, y } — по одной строке на пару зон, с самой глубокой точкой. Пусто — не касаются.
export function kasanie(A, B, zazor = 0) { const P = new Map();
  const odin = (U, V, pervyy) => { const w = V.poza.tolshchina, c = Math.cos(-V.poza.a), s = Math.sin(-V.poza.a);
    for (const p of U.T) { const dx = (p.x - V.poza.x) / w, dy = (p.y - V.poza.y) / w, g = V.O.glubina(dx * c - dy * s, dx * s + dy * c) * w + zazor; if (g <= 0) continue;
      let bl = null, bd = 1e9; for (const q of V.T) { const d = (q.x - p.x) ** 2 + (q.y - p.y) ** 2; if (d < bd) { bd = d; bl = q; } }
      for (const za of p.zony) for (const zb of bl.zony) { const [a, b] = pervyy ? [za, zb] : [zb, za], kl = a + '>' + b, st = P.get(kl); if (!st || g > st.glubina) P.set(kl, { a, b, glubina: g, x: p.x, y: p.y }); } } };
  odin(A, B, true); odin(B, A, false); return [...P.values()]; }
