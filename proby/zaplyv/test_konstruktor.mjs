// Проверки конструктора бактерий (konstruktor.js, числа konstruktor.json) без экрана: node proby/zaplyv/test_konstruktor.mjs. Провал — код 1.
// KON_LOMAT=1 отключает тягу жгутиков: test_konstruktor_plyvet обязан покраснеть (самопроверка шага 64_konstruktor).
import { World, radius } from './sim.js';
import * as dv from './dvizhok.js';
import * as kn from './konstruktor.js';
import { readFileSync } from 'node:fs';
const cfg = JSON.parse(readFileSync(new URL('./data.json', import.meta.url)));
const K = process.env.KON_LOMAT ? { ...kn.K, stepen_tyagi: 0 } : kn.K, E = { ...K.etalon };
let bad = 0;
const check = (name, fn) => {
  try { const r = fn(); if (r) { bad++; console.log('  ПРОВАЛ', name + ':', r); } else console.log('  ок   ', name); }
  catch (e) { bad++; console.log('  ПРОВАЛ', name + ':', e.stack); }
};
// Выпускает в пустую воду 12 бактерий этой формы и возвращает, сколько они в среднем проплыли за 20 секунд игры.
const zaplyv = forma => { const w = new World(cfg, 5); for (const k of ['food', 'prey', 'amoebas', 'phages', 'plants', 'bdellos', 'slippers', 'bells', 'rotis', 'pseudos', 'donors']) w[k] = [];
  dv.V.vidy.svoya = kn.anketa(forma, cfg, K); const err = dv.oshibki('svoya', cfg); if (err.length) throw new Error('анкета не годится: ' + err.join('; '));
  const me = w.me[0]; for (let i = 0; i < 12; i++) w.pseudos.push({ x: me.x + 900 + i * 300, y: me.y + 900, vx: 0, vy: 0, a: i, t: 0, cool: 0, vid: 'svoya', id: 1000 + i });
  let put = 0; for (let s = 0; s < 20 * 30; s++) { const do_ = w.pseudos.map(q => [q.x, q.y]); dv.shag(w, 1 / 30, radius); w.pseudos.forEach((q, i) => put += Math.hypot(q.x - do_[i][0], q.y - do_[i][1])); }
  return put / 12; };

check('test_konstruktor_etalon: ползунки в положении серой соперницы дают ровно её числа из игры', () => {
  const F = kn.fizika(E, cfg, kn.K), S = dv.anketa('strain'), v = cfg[E.skorost] ?? E.skorost;
  if (Math.abs(F.skorost - v) > 1e-9 || F.ryskanie !== E.ryskanie || F.eda_r !== E.eda_r) return 'эталон считает ' + JSON.stringify(F);
  if (cfg[S.hod.skorost] !== v && S.hod.skorost !== v) return 'скорость эталона ' + v + ' не та, что у соперницы в игре: ' + S.hod.skorost;
  if (S.hod.ryskanie !== E.ryskanie || S.eda.r !== E.eda_r) return 'рысканье или захват эталона не те, что у соперницы: ' + S.hod.ryskanie + ', ' + S.eda.r;
});
check('test_konstruktor_plyvet: собранная бактерия плывёт в воде так, как посчитала формула — больше жгутиков быстрее, толще медленнее', () => {
  const tonkaya = zaplyv({ ...E, zhgutiki: 8 }), obychnaya = zaplyv(E), odin = zaplyv({ ...E, zhgutiki: 1 }), tolstaya = zaplyv({ ...E, tolshchina: 1.3, cepochka: 3 }), dlinnye = zaplyv({ ...E, zh_dlina: 7.3 });
  console.log('    паспорт: путь за 20 с · 8 жгутиков', Math.round(tonkaya), '· 4 (соперница)', Math.round(obychnaya), '· 1 жгутик', Math.round(odin), '· толстая цепочка из трёх', Math.round(tolstaya));
  if (!(tonkaya > obychnaya * 1.2)) return '8 жгутиков не быстрее 4: ' + Math.round(tonkaya) + ' против ' + Math.round(obychnaya);
  if (!(dlinnye > obychnaya * 1.15)) return 'длинные жгутики не быстрее: ' + Math.round(dlinnye) + ' против ' + Math.round(obychnaya);
  if (!(odin < obychnaya * 0.8)) return '1 жгутик не медленнее 4: ' + Math.round(odin) + ' против ' + Math.round(obychnaya);
  if (!(tolstaya < obychnaya * 0.8)) return 'толстая цепочка не медленнее тонкой палочки: ' + Math.round(tolstaya) + ' против ' + Math.round(obychnaya);
});
check('test_konstruktor_polzunki: любое положение ползунков даёт годную анкету, а в строках под ними стоят числа всех трёх законов', () => {
  const P = K.polzunki, ryad = Z => Z.znacheniya || [Z.ot, (Z.ot + Z.do) / 2, Z.do]; let n = 0;
  for (const d of ryad(P.dlina)) for (const t of ryad(P.tolshchina)) for (const z of ryad(P.zhgutiki)) for (const c of [P.cepochka.ot, P.cepochka.do]) for (const zd of [P.zh_dlina.ot, P.zh_dlina.do]) { const f = { ...E, dlina: d, tolshchina: t, zhgutiki: z, cepochka: c, zh_dlina: zd, yarkost: P.yarkost.do };
    dv.V.vidy.svoya = kn.anketa(f, cfg, K); const err = dv.oshibki('svoya', cfg); if (err.length) return JSON.stringify(f) + ': ' + err.join('; ');
    const s = kn.stroki(f, cfg, K); if (s.length !== 3 || s.some(x => !/^Л\d+$/.test(x.zakon) || !x.imya || /[{}]|NaN|undefined/.test(x.tekst) || !(x.chislo > 0))) return 'строка закона без числа: ' + JSON.stringify(s); n++; }
  console.log('    паспорт: положений ползунков проверено', n);
});
process.exit(bad ? 1 : 0);
