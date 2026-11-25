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

// Прежний код из sim.js (main 2cc8ea3, 0.76, до движка) дословно: появление в квадрате и шаг гарпунщицы с серой соперницей.
const staroe = {
  poyavlenie(w, b, far, safe, pt) { const c = w.cfg, r = w.r;
    if (!safe && far > c.pseudo_from && r() < c.pseudo_chance[b]) w.pseudos.push({ ...pt(), vx: 0, vy: 0, a: r() * 6.283, t: 0, cool: 0, id: ++w.ids });
    if (!safe && far > c.strain_from && r() < c.strain_chance[b]) w.pseudos.push({ ...pt(), vx: 0, vy: 0, a: r() * 6.283, t: 0, cool: 0, strain: true, id: ++w.ids }); },
  shag(w, dt) { const c = w.cfg, r = w.r;
    for (const q of w.pseudos) {
      if (q.held > 0) continue;
      q.t -= dt; q.cool = Math.max(0, q.cool - dt);
      if (q.t <= 0) {
        let best = null, bd = c.pseudo_sense;
        for (const f of w.food) { const d = Math.hypot(f.x - q.x, f.y - q.y); if (d < bd) { bd = d; best = f; } }
        q.kurs = best ? Math.atan2(best.y - q.y, best.x - q.x) : q.a + (r() - 0.5) * 3; q.t = 0.25 + r() * 1.2; q.rest = 0.25;
      }
      if (q.kurs !== undefined) { const d = Math.atan2(Math.sin(q.kurs - q.a), Math.cos(q.kurs - q.a)), m = 6 * dt; q.a += Math.abs(d) <= m ? d : Math.sign(d) * m; } // с 25.11 поворот плавный и в прежнем коде-образце
      const go = q.t > q.rest ? (q.strain ? c.strain_speed : c.pseudo_speed) : 0, k = Math.min(1, 6 * dt);
      q.vx += (Math.cos(q.a) * go - q.vx) * k; q.vy += (Math.sin(q.a) * go - q.vy) * k; q.x += q.vx * dt; q.y += q.vy * dt;
      for (const f of w.food) if (!f.gone && Math.hypot(f.x - q.x, f.y - q.y) < 14) f.gone = true;
      for (const a of [...w.me]) {
        const dx = q.x - a.x, dy = q.y - a.y, d = Math.hypot(dx, dy) || 1;
        if (d > radius(a.m) + c.pseudo_r || a.spore > 0) continue;
        const mine = (a.vx * dx + a.vy * dy) / d, its = -(q.vx * dx + q.vy * dy) / d;
        a.vx -= dx / d * 120; a.vy -= dy / d * 120; q.vx += dx / d * 120; q.vy += dy / d * 120;
        if (mine > its && q.cool <= 0 && !q.strain) {
          q.cool = c.pseudo_cool; a.stun = c.pseudo_stun; a.m *= c.pseudo_hit; w.events.push(['zap', q.x, q.y, a.x, a.y]);
          if (a.m < c.pseudo_min) w.lose(a, a.x, a.y, 'pseudo');
        }
      }
    } },
};
check('test_dvizhok_kak_ranshe: гарпунщица и серая соперница из анкет появляются и живут точь-в-точь как по прежнему коду (один мир, одно зерно, 40 с)', () => {
  const svoi = Object.keys(dv.V.vidy).filter(k => !['pseudo', 'strain'].includes(k)), was = {};
  for (const k of svoi) { was[k] = dv.V.vidy[k]; delete dv.V.vidy[k]; } // сверяем двух прежних: новые виды берут свои случайные числа
  try {
    const mir = kto => { let s = 12345; const r = () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296; // свой мир-заглушка: только то, что трогает шаг палочек
      const w = { cfg, r, ids: 0, pseudos: [], food: [], events: [], lost: 0, me: [{ x: 0, y: 0, vx: 60, vy: 10, m: 1.2 }, { x: 300, y: -200, vx: -40, vy: 30, m: 2 }], lose(a) { this.lost++; this.me = this.me.filter(c => c !== a); } };
      for (let i = 0; i < 40; i++) kto.poyavlenie(w, i % 3, 1 + i * 0.2, i % 7 === 0, () => ({ x: (r() - 0.5) * 900, y: (r() - 0.5) * 900 }));
      for (let i = 0; i < 150; i++) w.food.push({ x: (r() - 0.5) * 1200, y: (r() - 0.5) * 1200 });
      for (let i = 0; i < 1200; i++) { if (i % 60 === 0 && w.me.length) { const a = w.me[0], g = w.pseudos.filter(q => !q.strain).sort((p, q) => Math.hypot(p.x - a.x, p.y - a.y) - Math.hypot(q.x - a.x, q.y - a.y))[0], d = Math.hypot(g.x - a.x, g.y - a.y) || 1; a.vx = (g.x - a.x) / d * 260; a.vy = (g.y - a.y) / d * 260; } // первая клетка таранит ближнюю гарпунщицу
        for (const a of w.me) { a.x += a.vx / 30; a.y += a.vy / 30; } kto === dv ? dv.shag(w, 1 / 30, radius) : kto.shag(w, 1 / 30); }
      return w; };
    const A = mir(staroe), B = mir(dv), zap = w => w.events.filter(e => e[0] === 'zap').length, eaten = w => w.food.filter(f => f.gone).length;
    console.log('    паспорт: палочек', B.pseudos.length, '(серых', B.pseudos.filter(q => q.strain).length + ') · съели кусков', eaten(B), 'из 150 · выстрелов гарпуна', zap(B), '· было по прежнему коду:', A.pseudos.length, eaten(A), zap(A));
    if (B.pseudos.length < 6 || !B.pseudos.some(q => q.strain) || !B.pseudos.some(q => !q.strain) || !eaten(B) || !zap(B)) return 'мир пустой или без событий — сверка ничего не доказывает';
    if (A.pseudos.length !== B.pseudos.length || eaten(A) !== eaten(B) || zap(A) !== zap(B) || A.lost !== B.lost) return 'итоги разошлись с прежним кодом';
    const far = A.pseudos.findIndex((q, i) => q.x !== B.pseudos[i].x || q.y !== B.pseudos[i].y || !!q.strain !== !!B.pseudos[i].strain || q.cool !== B.pseudos[i].cool);
    if (far >= 0) return 'палочка №' + far + ' оказалась не там, где по прежнему коду';
    if (A.me.some((a, i) => a.m !== B.me[i].m || a.x !== B.me[i].x)) return 'твои клетки после столкновений разошлись с прежним кодом';
  } finally { Object.assign(dv.V.vidy, was); }
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
check('test_dvizhok_povorot: ни одно существо движка не поворачивается скачком — за кадр не больше, чем разрешает его запись (приёмка роликов 25.11: кувырок сенной палочки выглядел склейкой)', () => {
  const PRED = 0.35, out = []; // радиан за кадр при 30 кадрах в секунду: больше глаз видит как скачок
  for (const vid of Object.keys(dv.V.vidy)) { const H = dv.anketa(vid).hod, pov = process.env.DVIZHOK_SKACHOK ? 999 : H.povorot;
    const w = new World(cfg, 3); for (const k of ['food', 'prey', 'amoebas', 'phages', 'plants', 'bdellos', 'slippers', 'bells', 'rotis', 'pseudos', 'donors']) w[k] = [];
    const me = w.me[0]; for (let i = 0; i < 8; i++) w.pseudos.push({ x: me.x + 800 + i * 200, y: me.y + 800, vx: 0, vy: 0, a: i, t: 0, cool: 0, vid, strain: vid === 'strain', id: 500 + i });
    for (let i = 0; i < 20; i++) w.food.push({ x: me.x + 700 + i * 90, y: me.y + 700 + (i % 5) * 60, vx: 0, vy: 0, s: 1 });
    const zap = dv.V.vidy[vid]; if (process.env.DVIZHOK_SKACHOK) dv.V.vidy[vid] = { ...zap, hod: { ...zap.hod, povorot: pov } };
    let mx = 0, kuv = 0;
    try { for (let s = 0; s < 30 * 30; s++) { const do_ = w.pseudos.map(q => q.a); dv.shag(w, 1 / 30, radius);
      w.pseudos.forEach((q, i) => { const d = Math.abs(Math.atan2(Math.sin(q.a - do_[i]), Math.cos(q.a - do_[i]))); if (d > mx) mx = d; if (d > 0.01) kuv++; }); } }
    finally { dv.V.vidy[vid] = zap; }
    out.push(vid + ' ' + mx.toFixed(2)); if (!kuv) return vid + ': за 30 секунд ни разу не повернула — проверка ничего не доказывает';
    if (mx > PRED) return vid + ': поворот ' + mx.toFixed(2) + ' радиан за кадр, предел ' + PRED;
    if (vid === 'seno' && !(mx < dv.anketa('strain').hod.povorot / 30 * 0.6) && !process.env.DVIZHOK_SKACHOK) return 'цепочка сенной палочки разворачивается так же резко, как одиночная клетка: ' + mx.toFixed(3) + ' за кадр';
    if (mx > H.povorot / 30 + 1e-6 && !process.env.DVIZHOK_SKACHOK) return vid + ': поворот ' + mx.toFixed(3) + ' за кадр больше записи hod.povorot ' + H.povorot + ' в секунду'; }
  console.log('    паспорт: самый резкий поворот за кадр, радиан ·', out.join(' · '), '· предел', PRED);
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
    const dliny = new Set(); // сенная палочка: цепочки разной длины, от двух до четырёх клеток (запись [2, 4])
    for (let id = 1; id <= 12; id++) { const rods = []; dv.risuy({ x: 0, y: 0, a: 0, vid: 'seno', id, cool: 0 }, { x: 0, y: 0, z: 1, time: 0, bodies: { rod: (...a) => rods.push(a), sphere: () => {} }, glow: { put: () => {} } }); dliny.add(rods.length); }
    if ([...dliny].sort().join() !== '2,3,4') return 'сенная палочка: длины цепочек ' + [...dliny].sort().join() + ', по записи должны быть 2, 3 и 4';
    out.push('seno: цепочки по ' + [...dliny].sort().join('/'));
    console.log('    паспорт:', out.join(' · '));
  } finally { delete dv.V.vidy.cep; }
});
check('test_dvizhok_svoy_zhrebiy: новая запись не перетасовывает мир — с сенной палочкой прежние соседки появляются там же, а общий жребий мира идёт так же', () => {
  const mir = () => { let s = 777; const r = () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296, w = { cfg, r, ids: 0, pseudos: [] };
    for (let i = 0; i < 300; i++) dv.poyavlenie(w, i % 3, 1.3 + i * 0.05, false, () => ({ x: r(), y: r() }), (u, v) => ({ x: u, y: v }));
    return { w, dalshe: r() }; };
  const s = mir(), z = dv.V.vidy.seno; delete dv.V.vidy.seno; let bez; try { bez = mir(); } finally { dv.V.vidy.seno = z; }
  const starye = m => m.w.pseudos.filter(q => q.vid !== 'seno').map(q => [q.vid, q.x, q.y, q.a].join()).join(';'), sena = s.w.pseudos.filter(q => q.vid === 'seno');
  if (!sena.length) return 'сенная палочка ни разу не появилась за 300 квадратов — проверять нечего';
  if (starye(s) !== starye(bez)) return 'с новой записью прежние соседки появились в других местах';
  if (s.dalshe !== bez.dalshe) return 'новая запись берёт числа из общего жребия мира: всё, что случится после, пойдёт иначе';
  if (new Set(sena.map(q => q.x)).size < sena.length * 0.9) return 'сенные палочки появляются в одной точке: свой жребий не случаен';
  console.log('    паспорт: сенных палочек', sena.length, 'из 300 квадратов · прежних соседок', bez.w.pseudos.length, '· общий жребий совпал');
});
process.exit(bad ? 1 : 0);
