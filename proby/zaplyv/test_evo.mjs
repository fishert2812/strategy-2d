// Проверки режима «Эволюция» (evo.js) без экрана: node proby/zaplyv/test_evo.mjs. Провал — код 1.
// EVO_OFF=1 гоняет те же заплывы в «Росте»: доказательство test_evo_vybor обязано покраснеть (самопроверка шага 58_evo).
import { World } from './sim.js';
import * as rost from './rost.js';
import * as evo from './evo.js';
import { readFileSync } from 'node:fs';
const cfg = JSON.parse(readFileSync(new URL('./data.json', import.meta.url)));
const MODE = process.env.EVO_OFF ? 'rost' : 'evo';
let bad = 0;
const check = (name, fn) => {
  try { const r = fn(); if (r) { bad++; console.log('  ПРОВАЛ', name + ':', r); } else console.log('  ок   ', name); }
  catch (e) { bad++; console.log('  ПРОВАЛ', name + ':', e.stack); }
};
// Бот-новичок: плывёт к ближайшей еде, которую уже может есть; на выборе берёт первую способность.
const bot = w => { const c = w.center(); let best = null, bd = 400;
  for (const f of [...w.food.filter(f => rost.can(w, f.kind || 'bits')), ...(rost.can(w, 'crumb') ? w.crumbs : []), ...(rost.can(w, 'plant') ? w.plants : [])]) { const d = Math.hypot(f.x - c.x, f.y - c.y); if (d < bd) { bd = d; best = f; } }
  return best ? { x: best.x, y: best.y } : { dx: Math.cos(w.dir), dy: Math.sin(w.dir), p: 1 }; };
const SAFE = ['amoebas', 'phages', 'bdellos', 'slippers', 'bells', 'rotis', 'pseudos']; // выбор и рост меряем без хищников
const play = (seed, sec) => {
  const w = new World(cfg, seed); w.mode = MODE; w.dir = seed * 1.3; let rosts = 0, asks = 0, most = 1; const got = [];
  for (let i = 0; i < 30 * sec && w.me.length; i++) {
    for (const k of SAFE) w[k] = [];
    w.step(1 / 30, bot(w)); most = Math.max(most, w.me.length);
    for (const e of w.events) if (e[0] === 'rost') rosts++; w.events.length = 0;
    if (w.choice.length) { asks++; if (new Set(w.choice).size !== w.choice.length || w.choice.some(g => w.genes[g])) got.push('!'); got.push(w.choice[0]); w.pick(w.choice[0]); }
    if (i % 300 === 0) w.dir += 0.7;
  }
  return { w, rosts, asks, most, got };
};
const runs = [2, 3, 4, 5, 6, 7].map(s => play(s, 300)), grown = runs.filter(r => r.rosts >= 4); // в капле можно и погибнуть: меряем по выросшим

// Доказательство: каждый рост — новая способность на выбор, и она остаётся у клетки.
check('test_evo_vybor: на каждом росте клетке дают выбор новой способности, взятые копятся', () => {
  console.log('    за 300 с:', runs.map(r => `ростов ${r.rosts}, выборов ${r.asks}, генов ${Object.keys(r.w.genes).length}`).join(' | '));
  if (grown.length < 3) return `до четвёртого роста дожили ${grown.length} из ${runs.length} — проверка ничего не меряет`;
  const short = runs.filter(r => r.asks < Math.min(r.rosts, evo.pool({ cfg, genes: {} }).length));
  if (short.length) return `выбор был не на каждом росте (${short.map(r => r.asks + ' из ' + r.rosts).join(', ')})`;
  if (runs.some(r => r.got.includes('!'))) return 'предложили способность, которая уже есть, или одну дважды';
  if (runs.some(r => Object.keys(r.w.genes).length < r.asks)) return 'взятая способность не осталась у клетки';
});

check('test_evo_rost: клетка не делится и растёт выше потолка заплыва, как в «Росте»', () => {
  if (runs.some(r => r.most > 1)) return 'клетка поделилась';
  if (grown.filter(r => r.w.me[0] && r.w.me[0].m > cfg.max_m * 3).length < 3) return 'не выросла больше трёх потолков';
});

check('test_evo_semya: умения семьи одной клетке не предлагают', () => {
  const all = runs.flatMap(r => r.got);
  const fam = evo.E.bez.filter(g => all.includes(g));
  if (fam.length) return 'предложили: ' + fam.join(', ');
});

// Доказательство Г51: с умением клетка глотает живых мельче себя и растёт, а кто крупнее — не тронут; без умения никого.
// Выросшая ест того, кто ел её маленькой: амёба, которая проглотила бы клетку массы 1, сама проглочена клеткой массы 12.
check('test_evo_glotat: «Глотает целиком» — ест живых мельче себя, крупнее не трогает, выросшая ест того, кто ел её', () => {
  const empty = (m, genes) => { const w = new World(cfg, 21); w.mode = MODE;
    for (const k of ['food', 'prey', 'amoebas', 'phages', 'plants', 'crumbs', 'bdellos', 'slime', 'slippers', 'bells', 'rotis', 'pseudos', 'donors']) w[k] = [];
    w.tidy = 1e9; Object.assign(w.me[0], { m, x: 0, y: 0, vx: 0, vy: 0 }); for (const g of genes) w.genes[g] = true; return w; };
  const run = w => { for (let i = 0; i < 60 && w.me.length; i++) { w.step(1 / 30, null); w.events.length = 0; if (w.choice.length) w.choice = []; } return w; };
  const res = {};
  for (const [name, m, genes, prey] of [['мелкий кокк', 6, ['gulp'], { prey: { m: 1 } }], ['кокк без умения', 6, [], { prey: { m: 1 } }],
    ['крупная амёба', 3, ['gulp'], { amoebas: { m: 5 } }], ['амёба у выросшей', 12, ['gulp'], { amoebas: { m: 5 } }], ['амёба у маленькой', 1, ['gulp'], { amoebas: { m: 5 } }]]) {
    const w = empty(m, genes), [list, q] = Object.entries(prey)[0]; w[list].push({ x: 4, y: 0, vx: 0, vy: 0, a: 0, id: 77, ...q }); run(w);
    res[name] = { alive: w.me.length > 0, ate: !w[list].length && (w.stats.gulped || 0) > 0, m: (w.me[0]?.m ?? 0) + (w.me[0]?.zhd || 0), m0: m };
  }
  console.log('    ', Object.entries(res).map(([k, r]) => `${k}: ${r.alive ? (r.ate ? 'проглотила, масса ' + r.m0 + '→' + r.m.toFixed(1) : 'не глотала') : 'съедена'}`).join(' | '));
  if (!res['мелкий кокк'].ate || !(res['мелкий кокк'].m > 6.3)) return 'с умением мелкого кокка не проглотила или не выросла';
  if (res['кокк без умения'].ate) return 'без умения глотает';
  if (res['крупная амёба'].ate) return 'проглотила того, кто крупнее';
  if (!res['амёба у выросшей'].ate) return 'выросшая не проглотила амёбу';
  if (res['амёба у маленькой'].alive) return 'маленькую амёба не съела — проверка ничего не меряет';
});

check('test_evo_glotat_vybor: «Глотает целиком» обязательно среди выбора со второго роста', () => {
  const late = runs.filter(r => r.rosts >= 2 && !r.got.slice(0, 2).includes('gulp'));
  if (late.length) return `не предложили к второму росту в ${late.length} заплывах`;
});

// Доказательство Г55: с умением тычок носом на ходу убивает соперницу (стоит, потом растекается соком), без умения и без тычка — нет.
check('test_evo_igla: «Нить-игла» — тычок носом на ходу убивает соперницу, она растекается едой', () => {
  const go = (genes, fast) => { const w = new World(cfg, 31); w.mode = MODE;
    for (const k of ['food', 'prey', 'amoebas', 'phages', 'plants', 'crumbs', 'bdellos', 'slime', 'slippers', 'bells', 'rotis', 'pseudos', 'donors']) w[k] = [];
    w.tidy = 1e9; const a = w.me[0]; Object.assign(a, { m: 2, x: 0, y: 0, a: 0, vx: fast ? 200 : 0, vy: 0 }); for (const g of genes) w.genes[g] = true;
    w.pseudos.push({ x: 40, y: 0, vx: 0, vy: 0, a: Math.PI, t: 5, rest: 0.25, cool: 5, strain: true, id: 88 });
    let stab = 0, juice = 0;
    for (let i = 0; i < 75 && w.me.length; i++) { w.step(1 / 30, fast ? { x: 600, y: 0 } : null); stab += w.events.filter(e => e[0] === 'igla').length; w.events.length = 0; if (w.choice.length) w.choice = []; }
    juice = w.food.filter(f => f.kind === 'lysate').length;
    return { stab, juice, left: w.pseudos.length };
  };
  const yes = go(['igla'], true), no = go([], true), slow = go(['igla'], false);
  console.log('    тычок с иглой:', JSON.stringify(yes), '| без иглы:', JSON.stringify(no), '| игла без тычка:', JSON.stringify(slow));
  if (!(yes.stab === 1 && yes.left === 0 && yes.juice > 0)) return 'с иглой тычок не убил соперницу или она не растеклась едой';
  if (no.stab || no.left === 0) return 'без иглы соперница погибла';
  if (slow.stab) return 'укол без тычка — игла бьёт от простого касания';
});

console.log(bad ? `ЭВОЛЮЦИЯ: провалов ${bad}` : 'ЭВОЛЮЦИЯ: все проверки прошли');
process.exit(bad ? 1 : 0);
