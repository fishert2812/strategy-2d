// Проверки режима «Рост» (rost.js) без экрана: node proby/zaplyv/test_rost.mjs. Провал — код 1.
// ROST_OFF=1 гоняет те же проверки в обычном заплыве: доказательство test_rost_pasti обязано покраснеть (самопроверка шага 58_rost).
import { World } from './sim.js';
import * as rost from './rost.js';
import { readFileSync } from 'node:fs';
const cfg = JSON.parse(readFileSync(new URL('./data.json', import.meta.url)));
const MODE = process.env.ROST_OFF ? 'swim' : 'rost';
if (process.env.ROST_SYTOST) rost.R.sytost = +process.env.ROST_SYTOST; // самопроверка темпа: сторож краснеет и на медленном, и на быстром росте
if (process.env.ROST_GRYZT) rost.R.gryzt_bolshe = +process.env.ROST_GRYZT; // самопроверка: как было до правки (любой комок тормозит) — test_rost_bolshaya_ne_vyaznet обязан покраснеть
let bad = 0;
const check = (name, fn) => {
  try { const r = fn(); if (r) { bad++; console.log('  ПРОВАЛ', name + ':', r); } else console.log('  ок   ', name); }
  catch (e) { bad++; console.log('  ПРОВАЛ', name + ':', e.stack); }
};
const empty = (seed, m = 1) => {
  const w = new World(cfg, seed); w.mode = MODE;
  for (const k of ['food', 'prey', 'amoebas', 'phages', 'plants', 'crumbs', 'bdellos', 'slime', 'slippers', 'bells', 'rotis', 'pseudos', 'donors']) w[k] = [];
  w.tidy = 1e9; w.tiho = 1; w.me[0].m = m; return w; // tiho: тихую воду у старта не наводим, хищников ставит сама проверка
};
// Бот-новичок: плывёт к ближайшей еде, которую уже может есть (комок и нить — тоже еда, когда открыты).
const bot = w => { const c = w.center(); let best = null, bd = 400;
  for (const f of [...w.food.filter(f => rost.can(w, f.kind || 'bits')), ...(rost.can(w, 'crumb') ? w.crumbs : []), ...(rost.can(w, 'plant') ? w.plants : [])]) { const d = Math.hypot(f.x - c.x, f.y - c.y); if (d < bd) { bd = d; best = f; } }
  return best ? { x: best.x, y: best.y } : { dx: Math.cos(w.dir), dy: Math.sin(w.dir), p: 1 }; };
// Темп меряем без хищников (safe): иначе мерили бы, умеет ли бот уворачиваться, а не сколько еды нужно на рост.
const SAFE = ['amoebas', 'phages', 'bdellos', 'slippers', 'bells', 'rotis', 'pseudos'];
// lenivy — раз в сколько кадров бот заново смотрит на еду (медленный живой игрок, круг 10: он рос втрое медленнее ловкого бота).
const play = (seed, sec, mode = MODE, safe = true, lenivy = 1) => {
  const w = new World(cfg, seed); w.mode = mode; w.dir = seed * 1.3; const lv = [], most = { n: 1 }; let cel = null;
  for (let i = 0; i < 30 * sec && w.me.length; i++) {
    if (safe) for (const k of SAFE) w[k] = [];
    if (i % lenivy === 0) cel = bot(w);
    const m0 = w.me[0].m; w.step(1 / 30, cel); most.n = Math.max(most.n, w.me.length); if (w.me[0]) most.jump = Math.max(most.jump || 0, w.me[0].m / m0 - 1);
    for (const e of w.events) if (e[0] === 'rost') lv[e[3]] = w.stats.time; w.events.length = 0;
    if (w.choice.length) w.pick(w.choice[0]); if (i % 300 === 0) w.dir += 0.7;
  }
  return { w, lv, most: most.n, jump: most.jump || 0 };
};
const runs = [2, 3, 4, 5, 6].map(s => play(s, 360));

check('test_rost_bez_potolka: в «Росте» клетка не делится и вырастает больше потолка обычного заплыва', () => {
  const out = runs.map(r => `${r.most}кл m${(r.w.me[0]?.m ?? 0).toFixed(0)}`);
  console.log('    за 360 с без хищников:', out.join(', '), '| потолок заплыва', cfg.max_m);
  if (runs.some(r => r.most > 1)) return 'клетка поделилась';
  const big = runs.filter(r => r.w.me[0] && r.w.me[0].m > cfg.max_m * 3).length;
  if (big < 4) return `больше трёх потолков выросли ${big} из ${runs.length}`;
});

// Темп с двух сторон. Роман 25.11: «клетка растет и мутирует очень быстро» — значит, не чаще раза в 8 с у ловкого бота.
// Круг игроков 10 на 0.81: живой игрок за 70 с дорос с 1,4 до 1,7 мкм и выбора не дождался — значит, и медленный игрок
// (смотрит на еду раз в 1,5 с) получает первый рост за полминуты. Числа: rost.json sytost, kusok, porog.
const lenivye = [2, 3, 4, 5, 6].map(s => play(s, 120, MODE, true, 45));
check('test_rost_temp: ловкий растёт раз в 20–30 с и не чаще раза в 8 с, медленный получает первый рост за полминуты', () => {
  const gaps = runs.map(r => r.lv.slice(1, 9).map((t, i) => t - (i ? r.lv[i] : 0)).filter(x => x !== undefined && !isNaN(x)));
  const perv = lenivye.map(r => r.lv[1]);
  console.log('    ловкий, секунд между ростами:', gaps.map(g => g.map(x => x.toFixed(0)).join(' ')).join(' | '));
  console.log('    медленный, первый рост на секунде:', perv.map(t => t ? t.toFixed(0) : 'нет').join(' '));
  if (runs.some(r => !(r.lv[8] > 0))) return 'ловкий за 6 минут не дошёл до восьмого роста — слишком медленно';
  const all = gaps.flat();
  if (all.some(x => x < 8)) return 'рост чаще раза в 8 с — слишком быстро';
  if (all.some(x => x > 70)) return 'пауза между ростами дольше 70 с';
  const mean = all.reduce((a, b) => a + b, 0) / all.length;
  if (mean < 18 || mean > 35) return `ловкий растёт в среднем раз в ${mean.toFixed(0)} с, цель 20–30`;
  if (perv.some(t => !(t > 0) || t > 60)) return 'медленный игрок не дождался первого роста за минуту — слишком медленно';
  const sr = perv.reduce((a, b) => a + b, 0) / perv.length;
  if (sr > 40) return `медленный ждёт первого роста в среднем ${sr.toFixed(0)} с — скучно`;
});

// Круг 10: «Рост» дважды начался у колокольчика. В тихой воде у старта (rost.json tiho) хищников нет.
check('test_rost_start: у старта в тихой воде нет ни одного хищника', () => {
  for (let seed = 1; seed <= 40; seed++) {
    const w = new World(cfg, seed); w.mode = MODE; w.step(1 / 30, null);
    for (const k of SAFE) for (const q of w[k]) { const d = Math.hypot(q.x, q.y); if (d < 1250) return `заплыв ${seed}: ${k} в ${d.toFixed(0)} от старта`; }
  }
});

// Доказательство плавного роста (Роман 25.11: «Растет по чуть чуть с каждой едой. В зависимости от ценности»):
// масса за кадр не прыгает больше чем на 1%, а сок лопнувших клеток кормит сильнее крошки.
check('test_rost_plavno: клетка растёт по чуть-чуть от каждого куска, сытный кусок даёт больше', () => {
  const jump = Math.max(...runs.map(r => r.jump));
  const bite = kind => { const w = empty(12, 3.5); w.food.push({ x: 0, y: 0, vx: 0, vy: 0, kind }); for (let i = 0; i < 60; i++) w.step(1 / 30, null); return w.me[0].m - 3.5; };
  const [b, l] = [bite('bits'), bite('lysate')];
  console.log('    наибольший шаг массы за кадр', (jump * 100).toFixed(2) + '% | от крошки +' + b.toFixed(3), '| от сока +' + l.toFixed(3));
  if (!(jump < 0.01)) return 'масса прыгает за кадр на ' + (jump * 100).toFixed(1) + '%';
  if (!(l > b * 2)) return 'сок кормит не сильнее крошки';
});

check('test_rost_eda: еда открывается по ростам, у комка клетка встаёт и грызёт', () => {
  const w = empty(7); const a = w.me[0];
  w.food.push({ x: 0, y: 0, vx: 0, vy: 0, kind: 'glucose' }); w.step(1 / 30, null);
  if (MODE === 'rost' && w.food.length !== 1) return 'искру сахара съела ещё маленькой';
  a.m = 2.1; w.food.push({ x: a.x, y: a.y, vx: 0, vy: 0, kind: 'glucose' }); w.step(1 / 30, null);
  if (w.food.some(f => f.kind === 'glucose')) return 'подросла, а искру сахара не съела';
  const w2 = empty(8, 4); w2.crumbs.push({ x: 0, y: 0, m: 4, id: 99 }); const m0 = w2.me[0].m; for (let i = 0; i < 30; i++) w2.step(1 / 30, { x: 0, y: -400 });
  if (MODE === 'rost' && w2.me[0].m > m0 + 0.01) return 'до третьего роста уже грызёт комок';
  const w3 = empty(9, 6.5), b = w3.me[0]; w3.crumbs.push({ x: 0, y: -10, m: 4, id: 99 });
  const w4 = empty(9, 6.5); let v3 = 0, v4 = 0;
  for (let i = 0; i < 45; i++) { w3.step(1 / 30, { x: 0, y: -400 }); w4.step(1 / 30, { x: 0, y: -400 }); if (i > 20) { v3 += Math.hypot(b.vx, b.vy); v4 += Math.hypot(w4.me[0].vx, w4.me[0].vy); } }
  console.log('    у комка: масса', 6.5, '→', b.m.toFixed(2), '| ход у комка', (v3 / v4).toFixed(2), 'от хода без комка');
  if (!(b.m + (b.zhd || 0) > 6.55)) return 'комок не грызёт';
  if (MODE === 'rost' && !(v3 < v4 * 0.7)) return 'у комка клетка не встаёт';
});

check('test_rost_bolshaya_ne_vyaznet: большая клетка у мелкого комка не тормозит, а у крупного встаёт', () => {
  const hod = (m, km) => { const w = empty(11, m), b = w.me[0]; w.crumbs.push({ x: 0, y: -10, m: km, id: 99 }); const w0 = empty(11, m); let v = 0, v0 = 0;
    for (let i = 0; i < 45; i++) { w.crumbs[0] && Object.assign(w.crumbs[0], { x: b.x, y: b.y - 5 }); w.step(1 / 30, { x: 0, y: -4000 }); w0.step(1 / 30, { x: 0, y: -4000 }); if (i > 20) { v += Math.hypot(b.vx, b.vy); v0 += Math.hypot(w0.me[0].vx, w0.me[0].vy); } }
    return v / v0; };
  const mel = hod(150, 4), krup = hod(150, 100);
  console.log('    масса 150: ход у мелкого комка', mel.toFixed(2), '| у крупного', krup.toFixed(2), 'от хода без комка');
  if (MODE !== 'rost') return '';
  if (!(mel > 0.9)) return `мелкий комок держит большую клетку: ход ${mel.toFixed(2)} от свободного`;
  if (!(krup < 0.7)) return `у крупного комка клетка не встаёт: ход ${krup.toFixed(2)}`;
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
  const r = play(2, 90, 'swim', false);
  const top = Math.max(...r.w.me.map(a => a.m), 0);
  if (r.most < 2) return 'в заплыве клетка не поделилась';
  if (top > cfg.max_m + 1e-9) return 'в заплыве масса выше потолка';
});

console.log(bad ? `РОСТ: провалов ${bad}` : 'РОСТ: все проверки прошли');
process.exit(bad ? 1 : 0);
