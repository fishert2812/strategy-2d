// Проверки движка существ (dvizhok.js, анкеты vidy.json) без экрана: node proby/zaplyv/test_dvizhok.mjs. Провал — код 1.
// DVIZHOK_LOMAT=1 портит одну анкету: test_dvizhok_ankety обязан покраснеть (самопроверка шага 61_dvizhok).
import { World, radius } from './sim.js';
import * as dv from './dvizhok.js';
import { Z } from './zhizn.js';
import { readFileSync } from 'node:fs';
const cfg = JSON.parse(readFileSync(new URL('./data.json', import.meta.url)));
if (process.env.DVIZHOK_LOMAT) dv.V.vidy.strain = { ...dv.V.vidy.strain, hod: { skorost: 'net_takogo_chisla' } };
let bad = 0;
const check = (name, fn) => {
  try { const r = fn(); if (r) { bad++; console.log('  ПРОВАЛ', name + ':', r); } else console.log('  ок   ', name); }
  catch (e) { bad++; console.log('  ПРОВАЛ', name + ':', e.stack); }
};
const novice = w => { const c = w.center(); let best = null, bd = 260; for (const f of w.food) { const d = Math.hypot(f.x - c.x, f.y - c.y); if (d < bd) { bd = d; best = f; } } return best ? { x: best.x, y: best.y } : { dx: Math.cos(w.dir), dy: Math.sin(w.dir), p: 1 }; };
const empty = seed => { const w = new World(cfg, seed); for (const k of ['food', 'prey', 'amoebas', 'phages', 'plants', 'crumbs', 'bdellos', 'slime', 'slippers', 'bells', 'rotis', 'pseudos', 'donors']) w[k] = []; w.tidy = 1e9; return w; };
const run = (w, sec, log = []) => { for (let t = 0; t < sec; t += 1 / 30) { w.step(1 / 30, null); log.push(...w.events); w.events.length = 0; } return log; };
const put = (w, vid, x, y, more = {}) => { const q = { x, y, vx: 0, vy: 0, a: 0, t: 0, cool: 0, vid, id: ++w.ids, ...more }; w.pseudos.push(q); return q; };

check('test_dvizhok_ankety: каждая запись vidy.json полна и читается; испорченная запись называется словами', () => {
  const errs = dv.zhivut().flatMap(k => dv.oshibki(k, cfg));
  console.log('    паспорт: видов в анкетах —', dv.zhivut().length + ':', dv.zhivut().join(', '), '· ошибок', errs.length);
  if (errs.length) return errs.join('; ');
  dv.V.vidy.krug_a = { ot: 'krug_b' }; dv.V.vidy.krug_b = { ot: 'krug_a' }; dv.V.vidy.pusto = { ot: 'strain', telo: { cvet: 'серый' }, edyat: 'все' };
  const krug = dv.oshibki('krug_a', cfg), pusto = dv.oshibki('pusto', cfg);
  delete dv.V.vidy.krug_a; delete dv.V.vidy.krug_b; delete dv.V.vidy.pusto;
  if (!krug.some(e => e.includes('по кругу'))) return 'круг в родословной не пойман';
  if (pusto.length !== 2) return 'у испорченной записи ждали две ошибки (цвет и edyat), нашли ' + pusto.length + ': ' + pusto;
});

// Отпечаток заплыва бота: сколько палочек, из них серых, свёртка их мест, съедено тобой, время, выстрелов гарпуна.
const otpechatok = seed => { const w = new World(cfg, seed); w.dir = seed; let h = 0, zap = 0;
  for (let i = 0; i < 30 * 90 && w.me.length; i++) { w.step(1 / 30, novice(w)); if (w.choice.length) w.pick(w.choice[0]); zap += w.events.filter(e => e[0] === 'zap').length; w.events.length = 0; }
  for (const q of w.pseudos) h = (h * 31 + Math.round(q.x * 10) + Math.round(q.y * 10) * 7 + (q.strain ? 3 : 1)) % 1000000007;
  return [w.pseudos.length, w.pseudos.filter(q => q.strain).length, h, w.stats.eaten, Math.round(w.stats.time * 10), zap].join(' '); };
// Снято на коде до движка (main 2cc8ea3, 0.76): гарпунщица и серая соперница тогда ходили своим циклом в sim.js.
const DO_DVIZHKA = { 5: '8 3 -625808140 225 900 0', 17: '5 2 -729066303 191 900 2', 41: '3 2 -101370136 161 900 0' };
check('test_dvizhok_kak_ranshe: гарпунщица и серая соперница из анкет живут точь-в-точь как до движка (три заплыва бота по 90 с)', () => {
  const svoi = Object.keys(dv.V.vidy).filter(k => !['pseudo', 'strain'].includes(k)), was = {};
  for (const k of svoi) { was[k] = dv.V.vidy[k]; delete dv.V.vidy[k]; } // сверяем только двух прежних: новые виды берут свои случайные числа
  const got = Object.keys(DO_DVIZHKA).map(s => [s, otpechatok(+s)]); Object.assign(dv.V.vidy, was);
  console.log('    паспорт: отпечатки —', got.map(([s, f]) => 'зерно ' + s + ': ' + f).join(' | '));
  const diff = got.filter(([s, f]) => f !== DO_DVIZHKA[s]); if (diff.length) return 'заплыв разошёлся с прежним: ' + diff.map(([s, f]) => 'зерно ' + s + ' стало «' + f + '», было «' + DO_DVIZHKA[s] + '»').join('; ');
});

check('test_dvizhok_variaciya: новый сосед одной записью — появляется, плывёт к еде и ест её, живёт по своей анкете, получает паспорт и карточку', () => {
  dv.V.vidy.proba = { ot: 'strain', telo: { cepochka: 3, cvet: [0.9, 0.85, 0.6] }, hod: { skorost: 90 }, rodnya: false, virus: false, delitsya: null, edyat: ['amoeba', 'slipper'], mir: { shans: [1, 1, 1], s_rosta: 0 }, almanah: { size: 'Цепочка из трёх клеток', hint: 'У дна' } };
  try {
    const errs = dv.oshibki('proba', cfg); if (errs.length) return 'анкета: ' + errs;
    const A = dv.anketa('proba'); if (A.telo.dlina !== dv.anketa('strain').telo.dlina || A.telo.zhgutiki.gde !== 'krugom') return 'не унаследовала тело родителя';
    const w0 = new World(cfg, 9); w0.dir = 1; let born = 0; // 1) появляется в мире сама и попадает во встречи
    for (let i = 0; i < 30 * 60 && w0.me.length; i++) { w0.step(1 / 30, novice(w0)); if (w0.choice.length) w0.pick(w0.choice[0]); born = Math.max(born, dv.svoi(w0, 'proba').length); w0.events.length = 0; }
    if (!born) return 'за минуту заплыва не появилась ни одна'; const m = empty(3); put(m, 'proba', m.me[0].x + 80, m.me[0].y, { t: 9, rest: 9 }); run(m, 1); if (!m.met.has('proba')) return 'встреча с ней не записана (встречены: ' + [...m.met] + ')';
    const w = empty(3); w.me[0].x = 5000; const q = put(w, 'proba', 0, 0); w.food.push({ x: 120, y: 0, vx: 0, vy: 0, s: 1 }); run(w, 4); // 2) плывёт к еде и съедает её
    if (w.food.length) return 'не съела кусок в 120 единицах за 4 с (стоит в ' + Math.round(q.x) + ')';
    const sp = empty(3); sp.me[0].x = 5000; const a = put(sp, 'proba', 0, 0, { t: 9, rest: 0 }), b = put(sp, 'strain', 0, 500, { t: 9, rest: 0, strain: true }); run(sp, 2); // 3) своя скорость из записи
    if (!(a.x > 100 && a.x < b.x * 0.75)) return 'скорость не из записи: за 2 с прошла ' + Math.round(a.x) + ', серая соперница ' + Math.round(b.x);
    const t = empty(3), me = t.me[0]; t.genes.toxin = true; const s1 = put(t, 'strain', me.x + 5, me.y, { t: 9, rest: 9, strain: true }), p1 = put(t, 'proba', me.x - 5, me.y, { t: 9, rest: 9 }); run(t, 0.5); // 4) ядовитое касание берёт только родню
    if (!s1.gone && t.pseudos.includes(s1)) return 'ядовитое касание не убило серую соперницу — проверка ничего не доказывает'; if (p1.gone || !t.pseudos.includes(p1)) return 'ядовитое касание убило не родню';
    const d = empty(3); d.me[0].x = 5000; const p2 = put(d, 'proba', 0, 0, { t: 9, rest: 9 }); d.bdellos.push({ x: 2, y: 0, vx: 0, vy: 0, a: 0, t: 5, rest: 9, id: ++d.ids }); run(d, 0.3); // 5) запятая берёт только тех, кто записан её добычей
    if (p2.held > 0) return 'красная запятая взяла ту, кого в записи не ест';
    const P = Z.pasport; if (!P.proba) return 'нет паспорта в движке жизни'; // 6) паспорт: кто ест — только названные
    if (!P.amoeba.est.includes('proba') || !P.slipper.est.includes('proba') || P.bell.est.includes('proba') || P.bdello.est.includes('proba') || P.phage.zarazhaet.includes('proba')) return 'паспорт разошёлся с записью: ' + JSON.stringify({ amoeba: P.amoeba.est, bell: P.bell.est, phage: P.phage.zarazhaet });
    const am = empty(3); am.me[0].x = 5000; put(am, 'proba', 0, 0, { t: 9, rest: 9 }); am.amoebas.push({ x: 30, y: 0, vx: 0, vy: 0, m: 6, id: ++am.ids }); const log = run(am, 8); // 7) амёба её ест на деле
    if (!log.some(e => e[0] === 'eaten_other' && e[4] === 'proba')) return 'амёба не съела её за 8 с';
    const K = { items: {} }, cards = {}; dv.vitrina(K, cards, { proba: { imya: 'Проба', korotko: 'Цепочка палочек', kto: 'Кто это', sovet: 'Совет', priroda: 'Факт' } }); // 8) карточка сама
    if (K.items.proba?.line !== 'Цепочка палочек' || K.items.proba.group !== 'near' || K.items.proba.size !== 'Цепочка из трёх клеток' || cards.proba?.name !== 'Проба') return 'карточка не собралась: ' + JSON.stringify([K.items.proba, cards.proba]);
    if (K.items.pseudo.group !== 'danger') return 'вид с гарпуном не в опасных';
    console.log('    паспорт: запись «proba» (от серой соперницы, цепочка 3) — появилось до', born, 'за заплыв · за 2 с прошла', Math.round(a.x), 'против', Math.round(b.x), '· едят:', dv.anketa('proba').edyat.join(', '), '· карточка «' + cards.proba.name + '»');
  } finally { delete dv.V.vidy.proba; }
});
check('test_dvizhok_niti: у соседок из анкет жгутики — сплошные нити, а не цепочки точек (L047, Роман про пунктир: «халтура»); тело и цепочка — по записи', () => {
  dv.V.vidy.cep = { ot: 'strain', telo: { cepochka: 3 } };
  try {
    const out = [];
    for (const [vid, z] of [['pseudo', 1], ['strain', 1], ['strain', 2.6], ['cep', 0.6]]) {
      const pts = [], rods = [], F = dv.anketa(vid).telo.zhgutiki;
      dv.risuy({ x: 0, y: 0, a: 0.4, vid, id: 3, cool: 0 }, { x: 0, y: 0, z, time: 1.7, bodies: { rod: (...a) => rods.push(a), sphere: () => {} }, glow: { put: (x, y, r) => pts.push({ x, y, r }) } });
      const nitey = F.gde === 'krugom' ? F.n : 1, per = pts.length / nitey; let gaps = 0, n = 0;
      if (per < 24) return vid + ': в нити всего ' + per + ' точек';
      for (let i = 1; i < pts.length; i++) { if (i % per === 0) continue; n++; if (Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y) > pts[i].r * 1.5) gaps++; } // сосед дальше полутора радиусов точки — разрыв, «бусы» (у своей клетки порог мягче: два радиуса)
      if (gaps) return vid + ' при масштабе ' + z + ': нить с разрывами, ' + gaps + ' из ' + n;
      if (rods.length !== dv.anketa(vid).telo.cepochka) return vid + ': клеток нарисовано ' + rods.length + ', в записи ' + dv.anketa(vid).telo.cepochka;
      out.push(vid + ' ×' + z + ': нитей ' + nitey + ', точек в нити ' + per + ', клеток ' + rods.length);
    }
    console.log('    паспорт:', out.join(' · '));
  } finally { delete dv.V.vidy.cep; }
});
process.exit(bad ? 1 : 0);
