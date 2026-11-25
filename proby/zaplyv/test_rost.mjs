// Проверки режима «Рост» (rost.js) без экрана: node proby/zaplyv/test_rost.mjs. Провал — код 1.
// ROST_OFF=1 гоняет те же проверки в обычном заплыве: доказательство test_rost_pasti обязано покраснеть (самопроверка шага 58_rost).
import { World } from './sim.js';
import * as rost from './rost.js';
import { readFileSync } from 'node:fs';
const cfg = JSON.parse(readFileSync(new URL('./data.json', import.meta.url)));
const MODE = process.env.ROST_OFF ? 'swim' : 'rost';
let bad = 0;
const check = (name, fn) => {
  try { const r = fn(); if (r) { bad++; console.log('  ПРОВАЛ', name + ':', r); } else console.log('  ок   ', name); }
  catch (e) { bad++; console.log('  ПРОВАЛ', name + ':', e.stack); }
};
const empty = (seed, m = 1) => {
  const w = new World(cfg, seed); w.mode = MODE;
  for (const k of ['food', 'prey', 'amoebas', 'phages', 'plants', 'crumbs', 'bdellos', 'slime', 'slippers', 'bells', 'rotis', 'pseudos', 'donors']) w[k] = [];
  w.tidy = 1e9; w.me[0].m = m; return w;
};
// Бот-новичок: плывёт к ближайшей еде, которую уже может есть (комок и нить — тоже еда, когда открыты).
const bot = w => { const c = w.center(); let best = null, bd = 400;
  for (const f of [...w.food.filter(f => rost.can(w, f.kind || 'bits')), ...(rost.can(w, 'crumb') ? w.crumbs : []), ...(rost.can(w, 'plant') ? w.plants : [])]) { const d = Math.hypot(f.x - c.x, f.y - c.y); if (d < bd) { bd = d; best = f; } }
  return best ? { x: best.x, y: best.y } : { dx: Math.cos(w.dir), dy: Math.sin(w.dir), p: 1 }; };
const play = (seed, sec, mode = MODE) => {
  const w = new World(cfg, seed); w.mode = mode; w.dir = seed * 1.3; const lv = [], most = { n: 1 };
  for (let i = 0; i < 30 * sec && w.me.length; i++) {
    w.step(1 / 30, bot(w)); most.n = Math.max(most.n, w.me.length);
    for (const e of w.events) if (e[0] === 'rost') lv[e[3]] = w.stats.time; w.events.length = 0;
    if (w.choice.length) w.pick(w.choice[0]); if (i % 300 === 0) w.dir += 0.7;
  }
  return { w, lv, most: most.n };
};
const runs = [2, 3, 4, 5, 6].map(s => play(s, 150));

check('test_rost_bez_potolka: в «Росте» клетка не делится и вырастает больше потолка обычного заплыва', () => {
  const out = runs.map(r => `${r.most}кл m${(r.w.me[0]?.m ?? 0).toFixed(0)}`);
  console.log('    за 150 с:', out.join(', '), '| потолок заплыва', cfg.max_m);
  if (runs.some(r => r.most > 1)) return 'клетка поделилась';
  const big = runs.filter(r => r.w.me[0] && r.w.me[0].m > cfg.max_m * 3).length;
  if (big < 4) return `больше трёх потолков выросли ${big} из ${runs.length}`;
});

check('test_rost_zamedlyaetsya: каждый следующий рост требует больше времени', () => {
  const ok = runs.filter(r => r.lv[3] && r.lv[7]), early = ok.map(r => r.lv[3] / 3), late = ok.map(r => (r.lv[7] - r.lv[4]) / 3);
  console.log('    секунд на рост: первые три', early.map(x => x.toFixed(0)).join(' '), '| с пятого по седьмой', late.map(x => x.toFixed(0)).join(' '));
  if (ok.length < 4) return `до седьмого роста дошли ${ok.length} из ${runs.length}`;
  if (ok.filter((r, i) => late[i] > early[i] * 1.5).length < ok.length - 1) return 'поздние росты не медленнее ранних';
});

check('test_rost_eda: еда открывается по ростам, у комка клетка встаёт и грызёт', () => {
  const w = empty(7); const a = w.me[0];
  w.food.push({ x: 0, y: 0, vx: 0, vy: 0, kind: 'glucose' }); w.step(1 / 30, null);
  if (MODE === 'rost' && w.food.length !== 1) return 'искру сахара съела ещё маленькой';
  a.m = 2.1; w.food.push({ x: a.x, y: a.y, vx: 0, vy: 0, kind: 'glucose' }); w.step(1 / 30, null);
  if (w.food.some(f => f.kind === 'glucose')) return 'подросла, а искру сахара не съела';
  const w2 = empty(8, 4); w2.crumbs.push({ x: 0, y: 0, m: 4, id: 99 }); const m0 = w2.me[0].m; for (let i = 0; i < 30; i++) w2.step(1 / 30, { x: 0, y: -400 });
  if (MODE === 'rost' && w2.me[0].m > m0 + 0.01) return 'до третьего роста уже грызёт комок';
  const w3 = empty(9, 5.5), b = w3.me[0]; w3.crumbs.push({ x: 0, y: -10, m: 4, id: 99 });
  const w4 = empty(9, 5.5); let v3 = 0, v4 = 0;
  for (let i = 0; i < 45; i++) { w3.step(1 / 30, { x: 0, y: -400 }); w4.step(1 / 30, { x: 0, y: -400 }); if (i > 20) { v3 += Math.hypot(b.vx, b.vy); v4 += Math.hypot(w4.me[0].vx, w4.me[0].vy); } }
  console.log('    у комка: масса', 5.5, '→', b.m.toFixed(2), '| ход у комка', (v3 / v4).toFixed(2), 'от хода без комка');
  if (!(b.m > 5.6)) return 'комок не грызёт';
  if (MODE === 'rost' && !(v3 < v4 * 0.7)) return 'у комка клетка не встаёт';
});

// Доказательство: выросшая клетка переживает пасть, которая маленькую съедает.
check('test_rost_pasti: выросшую клетку колокольчик, коловратка и туфелька не берут, а маленькую берут', () => {
  const res = [];
  for (const [who, add, at] of [['bell', w => w.bells.push({ x: 0, y: 0, dir: 0, shut: 0, id: 50 }), w => w.bell(w.bells[0])],
    ['roti', w => w.rotis.push({ x: 0, y: 0, a: 0, sit: true, t: 5, id: 50 }), w => w.head(w.rotis[0])],
    ['slipper', w => w.slippers.push({ x: 0, y: 0, a: 0, back: 0, id: 50 }), w => w.mouth(w.slippers[0])]]) {
    for (const m of [1, rost.R.rot[who] * 1.2]) {
      const w = empty(11, m); add(w); const [mx, my] = at(w); Object.assign(w.me[0], { x: mx, y: my, vx: 0, vy: 0 });
      let lost = false; for (let i = 0; i < 90 && !lost; i++) { w.step(1 / 30, null); lost = !w.me.length; }
      res.push([who, m, lost]);
    }
  }
  console.log('    у пасти:', res.map(([w, m, l]) => `${w} m${m.toFixed(0)} ${l ? 'съедена' : 'цела'}`).join(', '));
  if (res.some(([, m, l]) => m === 1 && !l)) return 'маленькую пасть не взяла — проверка ничего не меряет';
  const eaten = res.filter(([, m, l]) => m > 1 && l).map(r => r[0]);
  if (eaten.length) return 'выросшую всё равно съели: ' + eaten.join(', ');
});

check('test_rost_zaplyv: обычный заплыв как был — потолок массы и деление', () => {
  const r = play(2, 90, 'swim');
  const top = Math.max(...r.w.me.map(a => a.m), 0);
  if (r.most < 2) return 'в заплыве клетка не поделилась';
  if (top > cfg.max_m + 1e-9) return 'в заплыве масса выше потолка';
});

console.log(bad ? `РОСТ: провалов ${bad}` : 'РОСТ: все проверки прошли');
process.exit(bad ? 1 : 0);
