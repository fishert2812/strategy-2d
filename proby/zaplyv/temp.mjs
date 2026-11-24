// Коридор темпа «Заплыва» (урок L028, design/zaplyv_temp_koridor.md; масса к 10-й минуте — по дожившим, еда в секунду — средняя за заплыв): бот-новичок играет seeds заплывов по sec секунд,
// замер — медианы. node proby/zaplyv/temp.mjs печатает замер; тест и шаг проверки берут corridor().
import { World } from './sim.js';
const DANGER = ['amoebas', 'bdellos', 'pseudos', 'phages', 'slippers']; // новичок видит хищника и уплывает от него, как живой игрок в первые минуты
export const novice = w => { const c = w.center(); let fx = 0, fy = 0;
  for (const l of DANGER) for (const q of w[l]) { const d = Math.hypot(q.x - c.x, q.y - c.y); if (d < 220 && d > 1) { fx += (c.x - q.x) / d; fy += (c.y - q.y) / d; } }
  const wn = w.warning && w.warning(); if (wn && wn.level > 0) { const d = Math.hypot(c.x - wn.zone[0], c.y - wn.zone[1]) || 1, ux = (c.x - wn.zone[0]) / d, uy = (c.y - wn.zone[1]) / d; // видит признак (L030)
    if (wn.zone[3] === 'bdello') return { dx: -uy, dy: ux, p: 1 }; // линия прицела: уйти вбок с линии броска
    fx += ux * 2; fy += uy * 2; } // край воронки: выплыть наружу
  if (fx || fy) return { dx: fx, dy: fy, p: 1 };
  let best = null, bd = 260; for (const f of w.food) { const d = Math.hypot(f.x - c.x, f.y - c.y); if (d < bd) { bd = d; best = f; } }
  return best ? { x: best.x, y: best.y } : { dx: Math.cos(w.dir), dy: Math.sin(w.dir), p: 1 }; };
const LISTS = ['amoebas', 'phages', 'bdellos', 'slippers', 'bells', 'rotis', 'pseudos', 'donors', 'plants', 'crumbs', 'prey'];
export function play(cfg, seed, sec) {
  const w = new World(cfg, seed * 53); w.dir = seed * 1.3; const o = { food1: null, div: [], mut: [], gaps: 0, mass1: 0, mass10: 0, died: null, eat: [] };
  let gen = 0, lastReward = 0, met = new Set(); const seen = {};
  for (let i = 0; i < 30 * sec && w.me.length; i++) {
    const e0 = w.stats.eaten; w.step(1 / 30, novice(w)); const t = w.stats.time;
    const wn = w.warning && w.warning(); if (wn && wn.level > 0) seen[wn.zone[3]] = t; // когда игрок последний раз видел признак каждого убийцы
    if (w.zones) { const lead = cfg.speed * cfg.zone.lead; for (const zn of w.zones()) if (w.me.some(a => Math.hypot(a.x - zn[0], a.y - zn[1]) - zn[2] < lead)) seen[zn[3]] = t; } // кольцо рядом видно, даже если тревожит другое
    if (w.stats.eaten > e0) { if (o.food1 === null) o.food1 = t; o.eat.push(t); }
    let reward = false;
    if (w.splits > o.div.length) { while (o.div.length < w.splits) o.div.push(t); reward = true; }
    if (w.choice.length) { o.mut.push(t); w.pick(w.choice[0]); reward = true; }
    if (i % 15 === 0) { const c = w.center(); for (const l of LISTS) if (!met.has(l) && w[l].some(q => Math.hypot(q.x - c.x, q.y - c.y) < 250)) { met.add(l); reward = true; } } // новая запись в Альманахе
    if (reward) { if (t - lastReward > o.gaps) { o.gaps = t - lastReward; o.gapAt = lastReward; } lastReward = t; }
    if (Math.abs(t - 60) < 0.02) o.mass1 = w.me.reduce((s, a) => s + a.m, 0);
  }
  if (w.me.length) { o.gaps = Math.max(o.gaps, w.stats.time - lastReward); o.mass10 = w.me.reduce((s, a) => s + a.m, 0); }
  else { o.died = w.stats.time; o.killer = w.stats.killer; o.sign = seen[o.killer] !== undefined && o.died - seen[o.killer] < 4; }
  return o;
}
const med = a => { a = a.filter(x => x != null).sort((x, y) => x - y); return a.length ? a[(a.length - 1) >> 1] : null; };
export function corridor(cfg, seeds = 8, sec = 600) {
  const R = []; for (let s = 1; s <= seeds; s++) R.push(play(cfg, s, sec));
  const alive = R.filter(o => !o.died);
  const m = {
    food1: med(R.map(o => o.food1)), div1: med(R.map(o => o.div[0])), div4: med(R.map(o => o.div[3])),
    mut1: med(R.map(o => o.mut[0])), mut23: med(R.map(o => o.mut[2] != null && o.mut[1] != null ? o.mut[2] - o.mut[1] : null)),
    mut34: med(R.map(o => o.mut[3] != null ? o.mut[3] - o.mut[2] : null)), gap: med(R.map(o => o.gaps)),
    grow: med(alive.map(o => o.mass1 ? o.mass10 / o.mass1 : null)), early: R.filter(o => o.died !== null && o.died < 45).length,
    life: med(R.map(o => o.died || 600)), alive: alive.length,
    rate: med(R.map(o => o.eat.filter(t => t < 600).length / Math.min(600, o.died || 600))),
  };
  const bad = [];
  const want = (ok, t) => { if (!ok) bad.push(t); };
  want(m.food1 !== null && m.food1 <= 5, `первая еда ${m.food1?.toFixed(1)} с (≤ 5)`);
  want(m.div1 !== null && m.div1 >= 12 && m.div1 <= 25, `первое деление ${m.div1?.toFixed(0)} с (12–25)`);
  want(m.div4 !== null && m.div4 >= 60 && m.div4 <= 120, `четвёртое деление ${m.div4?.toFixed(0)} с (60–120)`);
  want(m.mut1 !== null && m.mut1 <= 30, `первая мутация ${m.mut1?.toFixed(0)} с (≤ 30)`);
  want(m.mut23 !== null && m.mut23 >= 40, `между 2-й и 3-й мутацией ${m.mut23?.toFixed(0)} с (≥ 40)`);
  want(m.mut34 === null || m.mut34 >= 60, `после 3-й мутации ${m.mut34?.toFixed(0)} с (≥ 60)`);
  want(m.gap !== null && m.gap <= 60, `самая долгая пауза без награды ${m.gap?.toFixed(0)} с (≤ 60)`);
  if (alive.length < 3) bad.push(`до 10-й минуты дожили ${alive.length} из ${seeds} (≥ 3); рост массы не считаем`);
  else want(m.grow !== null && m.grow >= 3, `масса колонии к 10-й минуте ×${m.grow?.toFixed(1)} от 1-й по дожившим (≥ 3)`);
  m.blind = R.filter(o => o.died && !o.sign).map(o => o.killer);
  want(!m.blind.length, `смертей без признака ${m.blind.length}: ${m.blind.join(', ')} (0)`);
  want(m.life >= 300, `медиана жизни ${(m.life / 60).toFixed(1)} мин (≥ 5)`);
  want(m.early <= 1, `гибель в первые 45 с: ${m.early} из ${seeds} (≤ 1)`);
  want(m.rate >= 0.3 && m.rate <= 2, `еды в секунду ${m.rate?.toFixed(2)} (0,3–2)`);
  return { m, bad, runs: R };
}
if (import.meta.url === `file://${process.argv[1]}`) {
  const { readFileSync } = await import('node:fs'); const cfg = JSON.parse(readFileSync(new URL('./data.json', import.meta.url)));
  const { m, bad } = corridor(cfg, +(process.argv[2] || 8), +(process.argv[3] || 600));
  console.log(JSON.stringify(m, (k, v) => typeof v === 'number' ? +v.toFixed(2) : v)); console.log((bad.length ? '  ПРОВАЛ test_L028: темп вне коридора: ' + bad.join('; ') : '  ок   test_L028: темп в коридоре')); if (bad.length) process.exitCode = 1;
}
