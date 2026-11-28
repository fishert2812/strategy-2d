// Сторож потолков роста «Капли» (книга П53, ЛЭ14; Роман 26.11 23:03 «Я вырос и что? Что делать то?»): node proby/zaplyv/kaplya/test_potolok.mjs.
// Судья: клетка ест без остановки. Без объятия она упирается в 0,2 мм и строка называет, что нужно; после объятия растёт до 2 мм и упирается снова;
// после «много записей» потолка нет. Перед потолком рост замедляется плавно, а не обрывается.
// Самопроверка: без потолков клетка уходит за 20 мкм, и судья это ловит.
import fs from 'fs'; import * as ptl from './potolok.js';
const KAP = JSON.parse(fs.readFileSync(new URL('./kaplya.json', import.meta.url))), R = KAP.rost;
let bad = 0; const check = (n, e) => { console.log((e ? '  ПРОВАЛ ' : '  ок ') + n + (e ? ': ' + e : '')); if (e) bad++; };
const dl = m => R.mkm * Math.cbrt(m);
const est = s => n => s.includes(n);
const ras = (K, sobytiya, T = 4000) => { const a = { m: 300 }, w = { me: [a] }, S = ptl.sozdat(); let upor = null, kogda = null, shagi = [];
  for (let t = 0; t < T; t++) { const m0 = new Map([[a, a.m]]); a.m *= 1.01; const r = ptl.shag(S, w, m0, K, R, est(sobytiya)); shagi.push(a.m / m0.get(a)); if (r.upor && !upor) { upor = r.upor; kogda = t; } }
  return { dlina: dl(a.m), upor, shagi }; };
const sud = K => { const a = ras(K, []), b = ras(K, ['obyatie'], 6000), c = ras(K, ['obyatie', 'zapisi'], 6000);
  if (a.dlina > 20.1) return `без объятия выросла до ${a.dlina.toFixed(0)} мкм`; if (a.dlina < 19.5) return `без объятия встала на ${a.dlina.toFixed(0)} мкм, не дойдя до потолка`;
  if (!a.upor || !/кроху/.test(a.upor.upor)) return 'на потолке 20 мкм нет строки про кроху';
  if (b.dlina > 201 || b.dlina < 195) return `после объятия потолок ${b.dlina.toFixed(0)} мкм вместо 200`; if (c.dlina < 250) return `после «много записей» встала на ${c.dlina.toFixed(0)} мкм`;
  const plavno = a.shagi.filter((x, i) => i && x < a.shagi[i - 1] - 0.005).length; if (plavno) return `рост обрывается рывками ${plavno} раз`;
  return ''; };
check('test_potolok: без объятия потолок 20 мкм и строка «найди кроху», после него 0,2 мм, после «много записей» дальше; замедление плавное (П53)', sud(KAP.potolok));
check('test_potolok_samoproverka: без потолков судья ловит', sud({ ...KAP.potolok, stupeni: [] }) ? '' : 'судья не заметил');
process.exit(bad ? 1 : 0);
