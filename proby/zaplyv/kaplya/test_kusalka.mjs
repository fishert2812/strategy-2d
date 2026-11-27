// Сторож «Кусалки» по местам «Капли» (задание kolonia_eda_boy.md Ш38, 12.6): node proby/zaplyv/kaplya/test_kusalka.mjs.
// Бот плывёт носом на цель, кусает, его отбрасывает, плывёт снова. Прижатая (не вертится) цель прокушена за 5–9 с; цель, что вертится и подставляет
// разные места, за 30 с не прокушена. Самопроверка: место не заживает — укусы вразнобой прокусывают, судья краснеет.
import fs from 'fs'; import * as kus from './kusalka.js';
const KAP = JSON.parse(fs.readFileSync(new URL('./kaplya.json', import.meta.url))), K = KAP.kusalka, DT = 1 / 30;
let bad = 0; const check = (n, e) => { console.log((e ? '  ПРОВАЛ ' : '  ок ') + n + (e ? ': ' + e : '')); if (e) bad++; };
const rnd = s => () => ((s = (s * 16807) % 2147483647) / 2147483647); const radius = m => 13 * Math.sqrt(m);
function opyt(K0, vert, seed) { const q = { x: 0, y: 0, a: 0, m: 2 }, a = { x: -60, y: 0, a: 0, m: 2 }, w = { me: [a], pseudos: [q], genes: { kusalka: true }, stats: { time: 0 } }, S = kus.sozdat(), r = rnd(seed);
  for (let t = 0; t < 30; t += DT) { w.stats.time = t; q.a += vert * DT; const dx = q.x - a.x, dy = q.y - a.y, d = Math.hypot(dx, dy); a.a = Math.atan2(dy, dx); if (d > radius(2) * 2 + 1) { a.x += dx / d * 120 * DT; a.y += dy / d * 120 * DT; }
    for (const e of kus.shag(S, w, DT, K0, [['sopernica', 'pseudos']], radius, r)) if (e[0] === 'proryv') return t; }
  return null; }
const med = A => A.sort((x, y) => (x ?? 99) - (y ?? 99))[A.length >> 1];
const sud = K0 => { const pr = [], vr = []; for (let s = 1; s <= 15; s++) { pr.push(opyt(K0, 0, s * 7)); vr.push(opyt(K0, 2.5, s * 7)); }
  const m = med(pr), nevr = vr.filter(x => x != null).length; if (m == null || m < 5 || m > 9) return `прижатую прокусил за ${m == null ? '—' : m.toFixed(1)} с, а нужно 5–9`;
  if (nevr > 1) return `вертящуюся прокусил в ${nevr} из 15 опытов за 30 с`; return ''; };
check('test_kusalka_mesta: прижатую цель прокусил за 5–9 с, вертящуюся вразнобой за 30 с нет (Ш38, 12.6)', sud(K));
check('test_kusalka_mesta_samoproverka: место без заживления судья ловит', sud({ ...K, zazhiv: 0 }) ? '' : 'не заметил');
process.exit(bad ? 1 : 0);
