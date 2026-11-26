// Мир живёт сам долго: node proby/zaplyv/test_mir_dolgo.mjs. Провал — код 1.
// Полчаса капли без игрока (mir_zhizn.js): ни один вид не забирает каплю (доля живой массы) и ни один не вымирает (число особей:
// у хищника масса по природе мала, пирамида Элтона, поэтому «жив» меряется особями, а не долей); шаг мира укладывается в кадр телефона.
// Пороги — mir.json «dolgo». Самопроверки (MIR_DOLGO_SAMO=1): ил кормит вдесятеро — кокки забирают каплю, сторож долей обязан покраснеть;
// столкновения по обводам и решения каждый шаг, чутьё впятеро дальше — сторож времени обязан покраснеть.
import { sozdat, shag, massa, MR } from './mir_zhizn.js';
let bad = 0; const check = (n, f) => { let e; try { e = f(); } catch (x) { e = 'ошибка скрипта: ' + x.message + ' ' + (x.stack || '').split('\n')[1]; } console.log((e ? '  ПРОВАЛ ' : '  ок    ') + n + (e ? ': ' + e : '')); if (e) bad++; return e; };
const D = MR.dolgo, kopiya = f => { const K = JSON.parse(JSON.stringify(MR)); f?.(K); return K; };
// Доли видов по живой массе, средние за последние D.okno секунд, и самое малое число особей за то же время.
function prozhit(K, sd) { const M = sozdat('kaplya', sd, K), V = Object.keys(K.miry.kaplya.naselenie), dolya = {}, nmin = {}; let z = 0, nmax = 0;
  for (const k of V) { dolya[k] = 0; nmin[k] = 1e9; }
  for (let i = 0, t = 0; t < D.sekund; i++, t += 0.1) { shag(M, 0.1); nmax = Math.max(nmax, M.sv.length);
    if (t > D.sekund - D.okno && i % 50 === 0) { z++; const m = {}, n = {}; let s = 0; for (const q of M.sv) { const b = massa(q); m[q.vid] = (m[q.vid] || 0) + b; n[q.vid] = (n[q.vid] || 0) + 1; s += b; } for (const k of V) { dolya[k] += (m[k] || 0) / s / 1; nmin[k] = Math.min(nmin[k], n[k] || 0); } } }
  for (const k of V) dolya[k] /= z; return { M, V, dolya, nmin, nmax, zanos: M.schet.zaneslo / Math.max(1, M.schet.rodilos) }; }
// «жив» — особей вида всё время не меньше доли начального населения, но не меньше osobey_ne_menshe (у инфузории в начале 4, у нашей 40)
const porog = k => Math.max(D.osobey_ne_menshe, Math.floor(D.osobey_ot_nachala * MR.miry.kaplya.naselenie[k]));
const sudit = r => { const pl = r.V.map(k => k + ' ' + (r.dolya[k] * 100).toFixed(0) + '%/' + r.nmin[k]).join(', ');
  const mx = r.V.reduce((a, k) => r.dolya[k] > r.dolya[a] ? k : a); if (r.dolya[mx] > D.dolya_max) return `${mx} забрал ${(r.dolya[mx] * 100).toFixed(0)}% массы капли (${pl})`;
  for (const k of r.V) { const mn = porog(k); if (r.nmin[k] < mn) return `${k}: в какой-то миг осталось ${r.nmin[k]} особей, а нужно не меньше ${mn} (${pl})`; }
  if (r.nmax >= MR.zhizn.predel) return 'число существ упёрлось в защитный предел ' + MR.zhizn.predel + ': число держит заглушка, а не еда';
  if (r.zanos > D.zanos_max) return `мир держится на заносе: ${(r.zanos * 100).toFixed(1)}% от рождённых`; };
// время шага на D.na_sushchestv существ (шаг растёт с числом существ почти линейно, поэтому меряем на той капле, что есть, и приводим)
const vremya = K => { const M = sozdat('kaplya', 1, K); for (let t = 0; t < 120; t += 0.1) shag(M, 0.1); const t0 = performance.now(); let n = 0, sv = 0; for (let t = 0; t < 60; t += 0.1, n++) { shag(M, 0.1); sv += M.sv.length; } sv /= n; return { ms: (performance.now() - t0) / n * D.na_sushchestv / sv, sv: Math.round(sv) }; };
if (!process.env.MIR_DOLGO_SAMO) {
  check(`test_mir_dolgo: полчаса без игрока — ни один вид не забирает больше ${D.dolya_max * 100}% живой массы капли, у каждого всё время не меньше ${D.osobey_ot_nachala * 100}% начального населения (не меньше ${D.osobey_ne_menshe}), без заноса`, () => {
    for (const sd of D.zerna) { const r = prozhit(MR, sd); console.log(`    паспорт: зерно ${sd}, через ${D.sekund / 60} мин существ ${r.M.sv.length} (наибольшее ${r.nmax}), доли массы и наименьшее число: ` + r.V.map(k => k + ' ' + (r.dolya[k] * 100).toFixed(0) + '%/' + r.nmin[k]).join(', ') + `, занос ${(r.zanos * 100).toFixed(1)}%`);
      const e = sudit(r); if (e) return 'зерно ' + sd + ': ' + e; } });
  check(`test_mir_bystro: шаг мира не дольше ${D.shag_ms} мс на ${D.na_sushchestv} существ`, () => { const v = vremya(MR); console.log(`    паспорт: шаг ${v.ms.toFixed(2)} мс на ${D.na_sushchestv} существ (в капле ${v.sv})`); if (v.ms > D.shag_ms) return `шаг ${v.ms.toFixed(1)} мс`; });
} else {
  const e1 = sudit(prozhit(kopiya(K => { K.pole.il *= 10; }), D.zerna[0]));
  check('test_mir_dolgo_samo: ил кормит вдесятеро — сторож долей краснеет', () => e1 ? (console.log('    (так и должно быть: ' + e1 + ')'), '') : 'кокки на сытном иле, а сторож зелёный — он ничего не меряет');
  const v = vremya(kopiya(K => { K.zhizn.razvodit_cherez = 1; K.zhizn.reshaet = 0; K.zhizn.chuet *= 5; }));
  check('test_mir_bystro_samo: обводы и решения каждый шаг, чутьё впятеро дальше — сторож времени краснеет', () => v.ms > D.shag_ms ? (console.log(`    (так и должно быть: ${v.ms.toFixed(1)} мс)`), '') : `шаг ${v.ms.toFixed(1)} мс и с обводами везде — порог ничего не ловит`);
}
console.log(bad ? 'МИР ДОЛГО: провалов ' + bad : 'МИР ДОЛГО: все проверки прошли'); process.exit(bad ? 1 : 0);
