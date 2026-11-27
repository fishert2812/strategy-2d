// Обитатели «Капли» в Альманахе (проверка блока К 27.11, daf250b: «обитатели 11 из 11», а бодо, церкомонада, трубач, синегнойка и ещё
// полтора десятка жителей капли карточек не получали). Каждый житель книги из kaplya.json «obitateli.kto» — запись Альманаха со снимком
// (студия рисует его запись движка, рамка как у снимка убийцы, gibel.js) и карточка словами. Встреча — как у ручных: подплыла ближе meet к краю его тела.
import { kadr } from './gibel.js';
export function zapisi(KAB, cards, O, N, SPISKI, G, radius, est) { const dobavleno = [];
  for (const [k, z] of Object.entries(O.kto)) { const it = kadr(k, SPISKI, N, G, radius); if (!it || !est(it.spisok)) continue;
    if (!KAB.items[k]) { KAB.items[k] = { group: z.gruppa, line: z.line, size: '', hint: z.hint || '', ...it }; dobavleno.push(k); }
    cards[k] ??= { name: z.imya, who: z.ubil || z.imya, text: z.kto || '', fact: z.priroda || '', tip: z.sovet || '' }; }
  return dobavleno; }
// Кого из жителей книги ты сейчас встретила впервые в заплыве: ключи для meet() в main.js. met — Set заплыва (world.met).
export function vstrechi(w, O, SPISKI, R, met, radius) { const a = w.me[0], out = []; if (!a) return out;
  for (const k of Object.keys(O.kto)) { if (met.has(k) || !SPISKI[k] && !(O.kto[k].spisok)) continue; const [l, v] = (SPISKI[k] || O.kto[k].spisok).split(':');
    if ((w[l] || []).some(q => !q.gone && (v ? q.vid === v : !q.vid || !SPISKI[l + ':' + q.vid]) && Math.hypot(q.x - a.x, q.y - a.y) - radius(q.m || 1) < R)) { met.add(k); out.push(k); } } /* у великана мерим от края тела */
  return out; }
