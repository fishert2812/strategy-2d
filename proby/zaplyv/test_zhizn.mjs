// Проверки движка жизни капли (zhizn.js) без экрана: node proby/zaplyv/test_zhizn.mjs. Каждая печатает паспорт; провал — код 1.
// ZHIZN_OFF=1 выключает движок: проверка-доказательство обязана покраснеть (самопроверка шага 56_zhizn).
import { World, radius } from './sim.js';
import { Z } from './zhizn.js';
import { readFileSync } from 'node:fs';
const cfg = JSON.parse(readFileSync(new URL('./data.json', import.meta.url)));
let bad = 0;
const check = (name, fn) => {
  try { const r = fn(); if (r) { bad++; console.log('  ПРОВАЛ', name + ':', r); } else console.log('  ок   ', name); }
  catch (e) { bad++; console.log('  ПРОВАЛ', name + ':', e.stack); }
};
const fresh = (seed, still) => {
  const w = new World(still ? { ...cfg, strain_speed: 0, pseudo_speed: 0 } : cfg, seed); if (process.env.ZHIZN_OFF) w.zhizn = false;
  for (const k of ['food', 'prey', 'amoebas', 'phages', 'plants', 'crumbs', 'bdellos', 'slime', 'slippers', 'bells', 'rotis', 'pseudos', 'donors']) w[k] = [];
  w.tidy = 1e9; w.me[0].x = 5000; return w; // игрок далеко: всё происходит без него
};
const log = [];
const run = (w, sec, target = null) => { for (let t = 0; t < sec; t += 1 / 30) { w.step(1 / 30, typeof target === 'function' ? target(w) : target); log.push(...w.events); w.events.length = 0; } };
const eater = { slipper: (w, x, y) => w.slippers.push({ x, y, a: 0, back: 0, id: ++w.ids }), bell: (w, x, y) => w.bells.push({ x, y, dir: 0, shut: 0, id: ++w.ids }),
  roti: (w, x, y) => w.rotis.push({ x, y, a: 0, sit: true, t: 5, id: ++w.ids }), amoeba: (w, x, y) => w.amoebas.push({ x, y, vx: 0, vy: 0, m: 6, id: ++w.ids }) };
const victim = { coccus: (w, x, y) => w.prey.push({ x, y, vx: 0, vy: 0, m: 0.6, a: 0, id: ++w.ids }), strain: (w, x, y) => w.pseudos.push({ x, y, vx: 0, vy: 0, a: 0, t: 9, rest: 0, cool: 0, strain: true, id: ++w.ids }),
  pseudo: (w, x, y) => w.pseudos.push({ x, y, vx: 0, vy: 0, a: 0, t: 9, rest: 0, cool: 0, id: ++w.ids }), donor: (w, x, y) => w.donors.push({ x, y, a: 0, link: 0, id: ++w.ids }),
  bdello: (w, x, y) => w.bdellos.push({ x, y, vx: 0, vy: 0, a: 0, t: 9, rest: 99, id: ++w.ids }) };
const mouth = (w, who) => who === 'slipper' ? w.mouth(w.slippers[0]) : who === 'bell' ? w.bell(w.bells[0]) : who === 'roti' ? w.head(w.rotis[0]) : [w.amoebas[0].x, w.amoebas[0].y];

check('test_zhizn_pasport: каждое «ест» из паспорта едока на деле происходит в мире без игрока', () => {
  const miss = [], seen = [];
  for (const [who, p] of Object.entries(Z.pasport)) for (const kind of p.est) {
    if (!eater[who] || !victim[kind]) continue;
    const w = fresh(3); eater[who](w, 0, 0); const [mx, my] = mouth(w, who);
    for (let i = 0; i < 6; i++) { victim[kind](w, mx + 40 + i * 6, my + 30); const v = (kind === 'coccus' ? w.prey : kind === 'donor' ? w.donors : kind === 'bdello' ? w.bdellos : w.pseudos).at(-1); v.a = Math.atan2(my - v.y, mx - v.x); } // проплывают мимо рта // шестеро в потоке: сквозь сито проскакивает только часть
    log.length = 0; run(w, 12);
    const n = log.filter(e => e[0] === 'eaten_other' && e[3] === who && e[4] === kind).length;
    (n ? seen : miss).push(who + '→' + kind + (n ? ' ' + n : ''));
  }
  console.log('    паспорт: съедено', seen.join(', '), '| не съедено', miss.join(', ') || '—');
  if (miss.length) return 'паспорт обещает, а в мире не едят: ' + miss.join(', ');
});

check('test_zhizn_syt: сытый едок какое-то время не ест', () => {
  const w = fresh(4); eater.slipper(w, 0, 0); const [mx, my] = w.mouth(w.slippers[0]), [n, t] = Z.pasport.slipper.syt;
  for (let i = 0; i < n + 4; i++) victim.coccus(w, mx + 20, my + (i - 4) * 4);
  log.length = 0; run(w, 3); const first = log.filter(e => e[0] === 'eaten_other').length;
  console.log('    паспорт: сыт после', n, '— съел за 3 с', first, ', сыт ещё', w.slippers[0].syt?.toFixed(1), 'с');
  if (first !== n) return 'съел ' + first + ' вместо ' + n + ' до сытости';
  if (!(w.slippers[0].syt > 0)) return 'не насытился';
});

check('test_zhizn_vspyshka: твой вирус идёт по стае соперниц волной (одна даёт не меньше трёх следующих в 5 из 6 стай), гарпунщицу не берёт, после каждой — сок; вирусов не больше потолка', () => {
  const res = []; let harp = 0, food = 0, most = 0;
  for (let s = 5; s <= 10; s++) {
    const w = fresh(s, true);
    for (let i = 0; i < 10; i++) victim.strain(w, (i % 5) * 20, Math.floor(i / 5) * 20);
    victim.pseudo(w, 60, -24); w.pseudos[0].zamok = false; // первая — с той же дверью, что у тебя
    w.phages = []; w.cloud(0, 0, 'me', 0); log.length = 0;
    for (let t = 0; t < 40; t += 1) { run(w, 1); most = Math.max(most, w.phages.length); }
    res.push(log.filter(e => e[0] === 'pop' && e[3] === 'strain').length); harp += log.filter(e => e[0] === 'pop' && e[3] === 'pseudo').length; food += w.food.length;
  }
  console.log('    паспорт: лопнуло соперниц по стаям', res.join(' '), ', гарпунщиц', harp, ', еды на месте', food, ', вирусов наибольше', most, 'из', Z.phage_max);
  if (res.filter(n => n >= 4).length < 5) return 'вспышка не пошла по стае: ' + res.join(' ');
  if (harp) return 'твой вирус взял гарпунщицу';
  if (!food) return 'после гибели не осталось еды';
  if (most > Z.phage_max) return 'вирусов больше потолка';
});

check('test_zhizn_delenie: соперница ест еду и делится, но не бесконечно', () => {
  const w = fresh(6, true); victim.strain(w, 0, 0);
  for (let i = 0; i < 60; i++) w.food.push({ x: (i % 10) * 3 - 15, y: Math.floor(i / 10) * 3, vx: 0, vy: 0, s: 1 });
  log.length = 0; run(w, 20);
  const n = w.pseudos.length;
  console.log('    паспорт: соперниц было 1, стало', n, ', делений', log.filter(e => e[0] === 'divide_other').length);
  if (n < 2) return 'соперница не поделилась';
  if (n > Z.crowd_max + 1) return 'делится без предела';
});

// Доказательство пользы: игрок, который просто плывёт за едой, за первую минуту видит на своём экране,
// как соседи живут без него — кого-то съели, кто-то лопнул, кто-то поделился.
const player = w => {
  if (w.choice.length) w.pick(w.choice[0]);
  const c = w.center(); let best = null, bd = 1e9;
  for (const f of w.food) { const d = Math.hypot(f.x - c.x, f.y - c.y); if (d < bd) { bd = d; best = f; } }
  return best ? { x: best.x, y: best.y } : { x: c.x, y: c.y - 100 };
};
check('test_zhizn_minuta: за первую минуту игрок видит на экране, как соседи живут без него, в 10 из 12 заплывов', () => {
  const when = [], kinds = {};
  for (let s = 1; s <= 12; s++) {
    const w = new World(cfg, s * 7919); if (process.env.ZHIZN_OFF) w.zhizn = false;
    let at = null;
    for (let t = 0; t < 60 && w.me.length; t += 1 / 30) {
      w.step(1 / 30, player(w)); const c = w.center();
      for (const e of w.events) if ((e[0] === 'eaten_other' || e[0] === 'divide_other' || (e[0] === 'pop' && typeof e[3] === 'string')) && Math.abs(e[1] - c.x) < 330 && Math.abs(e[2] - c.y) < 600) {
        at ??= w.stats.time; const k = e[0] === 'eaten_other' ? e[3] + ' съел ' + e[4] : e[0] === 'pop' ? e[3] + ' лопнул' : e[3] + ' поделился'; kinds[k] = (kinds[k] || 0) + 1;
      }
      w.events.length = 0;
    }
    when.push(at === null ? '—' : at.toFixed(0));
  }
  console.log('    паспорт: на экране за 12 минут:', Object.entries(kinds).map(([k, n]) => k + ' ' + n).join(', ') || '—');
  console.log('    паспорт: первое событие на экране, с:', when.join(' '));
  if (when.filter(x => x !== '—').length < 10) return 'мир живёт на глазах только в ' + when.filter(x => x !== '—').length + ' из 12';
});

console.log(bad ? 'ЖИЗНЬ КАПЛИ: провалов ' + bad : 'ЖИЗНЬ КАПЛИ: все проверки прошли');
process.exit(bad ? 1 : 0);
