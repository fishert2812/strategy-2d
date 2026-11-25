// Проверки численности сводно (mir_chislo.js) без экрана: node proby/zaplyv/test_mir_chislo.mjs. Провал — код 1.
// Проверяется, что сводный счёт идёт теми же законами, что поштучный мир (mir.json «zhizn», zakony.js): рост по приходу и цене,
// голод, охота, расселение, граница «сводно ↔ поштучно». Баланс видов — паспортом (числа законов у хозяина движка).
// CHISLO_LOMAT=1: охота не убавляет добычу — test_chislo_ohota обязан покраснеть (самопроверка в конце).
import * as C from './mir_chislo.js';
import * as pole from './pole.js';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
const cfg = JSON.parse(readFileSync(new URL('./data.json', import.meta.url))), Z = C.MR.zhizn, CH = C.CH;
let bad = 0;
const check = (name, fn) => {
  try { const r = fn(); if (r) { bad++; console.log('  ПРОВАЛ', name + ':', r); } else console.log('  ок   ', name); }
  catch (e) { bad++; console.log('  ПРОВАЛ', name + ':', e.stack); }
};
const m_sr = Z.delitsya / (2 * Math.log(2)), dt = 0.5;
const pusto = () => { const f = pole.sozdat(cfg.pond, 2), W = C.sozdat(f, 2); for (const k of W.V) W.N[k].fill(0); f.S.fill(0); f.K.fill(0); return W; };
const c0 = W => Math.floor(W.f.m * 0.3) * W.f.n + Math.floor(W.f.n / 2);

if (!process.env.CHISLO_LOMAT) {
check('test_chislo_rost: племя в сытой клетке растёт с той скоростью, что дают закон питания и цена по Клайберу', () => {
  const W = pusto(), c = c0(W), p = W.P.nasha, S = 20; W.N.nasha[c] = 2; // мало особей: еды вдоволь, растёт по закону, а не упирается в сахар
  const mel = (W.f.C / C.MR.pole.kletka) ** 2, I = Z.eda * p.h.k_eda * p.rz * S * C.MR.pole.massa_kuska / mel * Z.kpd, cena = Z.cena * p.cena1 * Math.pow(p.telo * m_sr, Z.stepen_ceny), r = (I - cena) / (p.telo * m_sr);
  for (let i = 0; i < 60 / dt; i++) { W.f.S[c] = S; const n0 = W.N.nasha.reduce((a, b) => a + b, 0); C.shag(W, dt); const n1 = W.N.nasha.reduce((a, b) => a + b, 0); W.N.nasha.fill(0); W.N.nasha[c] = n1; if (!(n1 >= n0)) return 'в сытой клетке не растёт'; }
  const want = 2 * Math.pow(1 + r * dt, 60 / dt), got = W.N.nasha[c]; console.log(`    паспорт: за минуту ${got.toFixed(1)} особей, по закону ${want.toFixed(1)} (удвоение ${(Math.log(2) / r).toFixed(0)} с, шаг ${dt} с)`);
  if (Math.abs(got - want) > want * 0.05) return `рост ${got.toFixed(1)} вместо ${want.toFixed(1)}`;
});

check('test_chislo_golod: без еды племя вымирает за время голода, и остатки уходят в воду сахаром', () => {
  const W = pusto(), c = c0(W), p = W.P.nasha; W.N.nasha[c] = 50; const t_g = (m_sr - Z.smert) * p.telo / (Z.cena * p.cena1 * Math.pow(p.telo * Z.smert, Z.stepen_ceny));
  let t = 0; while (W.N.nasha.reduce((a, b) => a + b, 0) > 0.5 && t < 20 * t_g) { C.shag(W, dt); W.f.S.fill(0, 0, c); W.f.S.fill(0, c + 1); t += dt; }
  console.log(`    паспорт: вымерли за ${t.toFixed(0)} с, время голода по закону ${t_g.toFixed(0)} с, остатков в воде ${W.f.S[c].toFixed(2)} кусков`);
  if (t > 3 * t_g || t < 0.3 * t_g) return `вымерли за ${t.toFixed(0)} с при законе ${t_g.toFixed(0)} с`;
  if (!(W.f.S[c] > 0)) return 'остатки умерших не ушли в воду';
});

const ohota = () => { // одна и та же клетка без сахара: добыча с охотниками и без них, охотники с добычей и без неё
  const run = (zap, prey) => { const W = pusto(), c = c0(W); W.N.zapyataya[c] = zap; W.N.nasha[c] = prey; for (let i = 0; i < 60 / dt; i++) { C.shag(W, dt); W.f.S[c] = 0; } return [C.vsego(W, 'nasha'), C.vsego(W, 'zapyataya')]; };
  const [p1, h1] = run(20, 400), [p0] = run(0, 400), [, h0] = run(20, 0);
  console.log(`    паспорт: за минуту добычи с охотниками ${p1.toFixed(0)}, без них ${p0.toFixed(0)}; запятых с добычей ${h1.toFixed(1)}, без добычи ${h0.toFixed(1)}`);
  if (!(p1 < p0 - 10)) return 'охотники не убавляют добычу';
  if (!(h1 > h0)) return 'с добычей охотнику не лучше, чем без неё';
};
check('test_chislo_ohota: охотник ест добычу по своим правилам — добычи меньше, охотник сыт; без добычи голодает', () => {
  const W = pusto(); if (!W.est.zapyataya.some(([o]) => o === 'nasha')) return 'запятая не берёт нашу клетку — правила удара не сработали';
  return ohota();
});

check('test_chislo_rasselenie: особи расходятся как случайные пловцы, число сохраняется', () => {
  const W = pusto(), c = c0(W), f = W.f; W.N.nasha[c] = 1000; let D = 0; for (let i = 0; i < 300 / dt; i++) D = C.rasselit(W, 'nasha', dt);
  const s = C.vsego(W, 'nasha'); let r2 = 0; W.N.nasha.forEach((n, k) => { r2 += n * (((k % f.n) - (c % f.n)) ** 2 + (Math.floor(k / f.n) - Math.floor(c / f.n)) ** 2) * f.C * f.C; }); r2 /= s;
  console.log(`    паспорт: за 5 мин средний разбег ${Math.sqrt(r2).toFixed(0)} ед., по закону √(4Dt) = ${Math.sqrt(4 * D * 300).toFixed(0)}`);
  if (Math.abs(s - 1000) > 0.5) return 'число изменилось: ' + s;
  if (Math.abs(Math.sqrt(r2) / Math.sqrt(4 * D * 300) - 1) > 0.25) return 'разбег не по закону случайного пловца';
});

check('test_chislo_granica: сводно → поштучно → сводно: те же число и масса, съеденные при игроке не возвращаются', () => {
  const W = pusto(), c = c0(W); W.N.kokki[c] = 7.4; W.m.kokki[c] = 1.3; let k = 0; const r = () => (k = (k * 9301 + 49297) % 233280) / 233280;
  const L = C.razvernut(W, c, r); if (C.vsego(W, 'kokki') !== 0) return 'развёрнутая клетка не обнулилась';
  if (L.length < 7 || L.length > 8 || L.some(q => q.m !== W.m.kokki[c])) return 'развернули ' + L.length + ' особей';
  C.svernut(W, c, L.slice(2)); if (W.N.kokki[c] !== L.length - 2 || Math.abs(W.m.kokki[c] - 1.3) > 1e-6) return 'свернули не тех: ' + W.N.kokki[c];
});

check('test_chislo_mir: полчаса всей капли без игрока — без NaN и минусов (паспорт: кто остался)', () => {
  const f = pole.sozdat(cfg.pond, 3), W = C.sozdat(f, 3), was = W.V.map(k => k + ' ' + C.vsego(W, k).toFixed(0));
  for (let i = 0; i < 1800 / 1; i++) { pole.shag(f, 1); C.shag(W, 1); }
  for (const k of W.V) for (const x of [...W.N[k], ...W.m[k]]) if (!(x >= 0) || !isFinite(x)) return k + ': ' + x;
  console.log('    паспорт: было', was.join(', '), '\n    через 30 мин', W.V.map(k => k + ' ' + C.vsego(W, k).toFixed(0)).join(', '));
});
}

check('test_chislo_ohota_lomat: самопроверка — если охота не убавляет добычу, сторож краснеет', () => {
  if (process.env.CHISLO_LOMAT) return ohota();
  let out = ''; try { execFileSync('node', [new URL(import.meta.url).pathname], { env: { ...process.env, CHISLO_LOMAT: '1' }, encoding: 'utf8' }); } catch (e) { out = e.stdout || ''; }
  if (!/ПРОВАЛ test_chislo_ohota_lomat/.test(out)) return 'сломанная охота прошла проверку — сторож ничего не меряет';
  console.log('    (так и должно быть: охота без убыли добычи — красное)');
});
console.log(bad ? `ЧИСЛЕННОСТЬ: провалов ${bad}` : 'ЧИСЛЕННОСТЬ: все проверки прошли');
process.exit(bad ? 1 : 0);
