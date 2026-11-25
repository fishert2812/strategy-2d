// Проверки слоя «вид и анимации» (vid.js, fx.js). Каждое событие мира из sim.js должно быть видно: fx.on даёт анимацию.
// Роман 24.11: «Анимацию взаимодействия не забудь это очень важно». Тихое событие (meet — имя у края экрана) — в списке тихих.
import { readFileSync } from 'node:fs';
import { Fx } from './fx.js';
import * as vid from './vid.js';
import { look } from './look.js';
const sim = readFileSync(new URL('./sim.js', import.meta.url), 'utf8');
const kinds = [...new Set([...sim.matchAll(/events\.push\(\[['"](\w+)/g)].map(m => m[1]))];
const quiet = new Set(['meet']); // встречу показывает main.js подписью у края
let bad = 0;
const check = (name, f) => { let r; try { r = f(); } catch (e) { r = 'ошибка скрипта: ' + e.message; } if (r) bad++; console.log((r ? '  ПРОВАЛ ' : '  ок    ') + name + (r ? ' — ' + r : '')); };
check('test_vid_events: у каждого события мира есть своя анимация', () => {
  if (kinds.length < 10) return 'не нашёл события в sim.js: ' + kinds;
  const fx = new Fx({}, [{ r: 1, g: 1, b: 1 }, { r: 1, g: 1, b: 1 }, { r: 1, g: 1, b: 1 }]), miss = [];
  for (const k of kinds) { if (quiet.has(k)) continue; fx.reset(); fx.on(k, 0, 0, 1, 0); if (!fx.busy()) miss.push(k); }
  console.log('    паспорт: событий ' + kinds.length + ': ' + kinds.join(' '));
  return miss.length ? 'без анимации: ' + miss.join(', ') : '';
});
check('test_vid_draw: анимации рисуются без ошибок скрипта', () => {
  const C = { r: 1, g: 1, b: 1 }, fx = new Fx({}, [C, C, C]), n = { k: 0 }, brush = { put: () => n.k++ };
  for (const k of kinds) fx.on(k, 0, 0, 10, 10);
  const d = { scr: (x, y) => [x, y], z: 1, time: 0, glow: brush, ink: brush };
  fx.drawUnder(d); fx.drawOver(d); fx.step(0.1);
  return n.k ? '' : 'ни одной точки не нарисовано';
});
check('test_vid_skin: клетка со всеми умениями и спящая рисуются без ошибок', () => {
  const cfg = JSON.parse(readFileSync(new URL('./data.json', import.meta.url))), n = { k: 0 }, brush = { put: () => n.k++ };
  const all = Object.fromEntries(Object.keys(cfg.genes).map(g => [g, true])), lk = look(all, cfg.look, 3), a = { id: 1, m: 1, a: 0, vx: 60, vy: 0, spore: 1 };
  const body = { at: () => [0, 0] };
  for (const run of [true, false]) vid.skin({ a, lk, x: 0, y: 0, ang: 0, ax: 1, ay: 0, half: 20, w: 9, z: 1, along: (u, o) => [u, o], arc: () => 0, body, scr: (x, y) => [x, y],
    time: 1, pdt: 0.016, run, phageNear: true, foodNear: true, spacers: 3, plasmid: true, cfg, alive: [a], glow: brush, ink: brush });
  vid.sleeper({ a, x: 0, y: 0, z: 1, time: 1, cfg, bodies: { rod: () => n.k++ }, glow: brush, ink: brush });
  return n.k > 200 ? '' : 'нарисовано мало точек: ' + n.k;
});
// Роман 24.11: «Анимацию всех талантов… перерисовать! Чтобы они выглядели натурально». Каждое умение меняет вид клетки
// (своими точками, не только числом), спящая клетка замирает (биолог: крупинки перестают дрожать), капсула прогибается от удара.
const cfgD = JSON.parse(readFileSync(new URL('./data.json', import.meta.url)));
const paint = (genes, opt = {}) => { const pts = [], brush = { put: (x, y, r, cr, cg, cb, ca) => pts.push([x, y, r, cr, cg, cb, ca].map(v => Math.round(v * 100) / 100).join()) };
  const a = { id: 1, x: 0, y: 0, m: 1, a: 0, vx: 0, vy: 0, stuck: !!opt.stuck }, lk = look(genes, cfgD.look, opt.spacers || 0);
  vid.skin({ a, lk, x: 0, y: 0, ang: 0, ax: 1, ay: 0, half: 20, w: 9, z: 1, along: (u, o) => [u, o], arc: () => 0, body: { at: () => [0, 0] }, scr: (x, y) => [x, y],
    time: opt.time ?? 1, pdt: opt.pdt ?? 0, run: false, phageNear: false, foodNear: !!opt.food, spacers: opt.spacers || 0, plasmid: false, cfg: cfgD, alive: [a], glow: brush, ink: brush });
  const fl = ',' + cfgD.flag.color.join() + ','; return pts.filter(p => !p.includes(fl)); }; // жгутики живут своим ходом между кадрами (whip.js)
check('test_vid_skills_seen: каждое умение видно на теле своими точками', () => {
  const base = new Set(paint({})), miss = [];
  for (const g of Object.keys(cfgD.genes)) { if (g === 'flagellum') continue; // пучок — число нитей, проверяет test_L020 и whip
    const own = paint({ [g]: true }).filter(p => !base.has(p)).length; if (own < 6) miss.push(g + ' (' + own + ')'); }
  const stuck = paint({ fim: true }, { stuck: true }), free = new Set(paint({ fim: true }));
  if (stuck.filter(p => !free.has(p)).length < 40) miss.push('липучки не натягиваются, когда прилип');
  const mem1 = paint({ crispr: true }, { spacers: 1 }).length, mem3 = paint({ crispr: true }, { spacers: 3 }).length;
  if (mem3 <= mem1) miss.push('память: новый фаг не добавил бусину');
  return miss.length ? 'не видно: ' + miss.join(', ') : '';
});
check('test_vid_sleep_still: спящая клетка замирает, бодрая и просыпающаяся живут', () => {
  const run = (spore, time) => { const pts = [], brush = { put: (...v) => pts.push(v.map(n => Math.round(n * 100)).join()) };
    vid.sleeper({ a: { id: 1, m: 1, a: 0, spore }, x: 0, y: 0, z: 1, time, cfg: cfgD, bodies: { rod: () => {} }, glow: brush, ink: brush }); return pts.join('|'); };
  const mid = cfgD.spore - vid.V.sleep.fall - 0.3; // уснула и ещё не начала просыпаться
  if (run(mid, 1) !== run(mid, 2.3)) return 'посреди сна крупинки и жгутики шевелятся';
  if (run(0.5, 1) === run(0.5, 2.3)) return 'перед пробуждением всё ещё неподвижна';
  return '';
});
check('test_vid_sleep_shape: спящая — короткий овал той же палочки (О28): короче бодрой, но не круглая и не толще', () => {
  const rod = spore => { let r = null; vid.sleeper({ a: { id: 1, m: 1, a: 0, spore }, x: 0, y: 0, z: 1, time: 0, cfg: cfgD, bodies: { rod: (x, y, a, h, w) => { r = [h, w]; } }, glow: { put() {} }, ink: { put() {} } }); return r; };
  const [h0, w0] = rod(cfgD.spore), [h, w] = rod(cfgD.spore - vid.V.sleep.fall - 0.3);
  if (h > h0 / 1.5) return 'спящая не короче бодрой: ' + (h0 / h).toFixed(2) + ' раза';
  if (h / w < 1.2) return 'спящая круглая, как спора';
  if (w > w0) return 'спящая толще бодрой';
  return '';
});
check('test_vid_split: при делении мать и дочка выходят из одной точки и разъезжаются за V.split.slide, перетяжка гаснет', () => {
  const mom = { id: 901, x: 6, y: 0 }, kid = { id: 902, x: -12, y: 0 }, all = [mom, kid];
  vid.splitAt(mom.x, mom.y);
  const b0 = vid.birth(mom, 100, all), k0 = vid.birth(kid, 100, all);
  if (Math.abs(mom.x + b0.d[0] - (kid.x + k0.d[0])) > 1e-6) return 'в миг деления две клетки не в одной точке — дочка просто появилась';
  if (b0.pinch < 0.5) return 'нет перетяжки в миг деления';
  const h = vid.birth(mom, 100 + vid.V.split.slide / 2, all), hk = vid.birth(kid, 100 + vid.V.split.slide / 2, all);
  const gap = Math.abs(mom.x + h.d[0] - (kid.x + hk.d[0]));
  if (gap < 3 || gap > 17.9) return 'на середине не видно разъезда: ' + gap.toFixed(1);
  const e = vid.birth(mom, 100 + vid.V.split.slide + 0.01, all);
  if (e.d[0] || e.d[1] || e.pinch) return 'разъезд не кончился за V.split.slide';
  return '';
});
check('test_vid_cut: CRISPR и обманка срабатывают видимо — светлый разрез на вирусе, половинки расходятся, за V.cut.life всё гаснет; не красный', () => {
  const C = { r: 1, g: 0.2, b: 0.2 }, fx = new Fx({}, [C, C, C]); fx.reset(); fx.on('cut', 50, 50);
  if (!fx.cuts.length) return 'разрез не появился';
  const shot = () => { const pts = []; const b = { put: (x, y, r, cr, cg, cb, a) => pts.push({ x, y, cr, cg, cb, a }) }; fx.drawOver({ scr: (x, y) => [x, y], z: 1, time: 0, glow: b, ink: b }); return pts; };
  fx.step(0.06); const p1 = shot();
  if (!p1.length) return 'разреза не видно';
  if (p1.some(p => p.cr > p.cg + 0.15)) return 'разрез красный: красный только за опасностью';
  const span = ps => Math.max(...ps.map(p => Math.hypot(p.x - 50, p.y - 50)));
  fx.step(0.2); const p2 = shot(); if (span(p2) <= span(p1) - 2) return 'половинки не расходятся';
  for (let i = 0; i < 20 && fx.cuts.length; i++) fx.step(0.05); if (fx.cuts.length) return 'разрез не погас за V.cut.life';
  return '';
});
check('test_vid_poison: от яда соперница не лопается — остаётся целым телом, бледнеет и тонет; от вируса лопается брызгами', () => {
  const C = { r: 1, g: 1, b: 1 }, fx = new Fx({}, [C, C, C]); fx.reset(); fx.on('poisoned', 0, 0, 'strain', 0.5);
  if (fx.drops.length || fx.ghosts.length) return 'отравленная лопнула: брызги или пустая оболочка';
  if (fx.dead.length !== 1) return 'нет целого мёртвого тела';
  const shot = () => { const pts = []; const b = { put: (x, y, r, cr, cg, cb, a) => pts.push({ x, y, cr, cg, cb, a }) }; fx.drawUnder({ scr: (x, y) => [x, y], z: 1, time: 0, glow: b, ink: b }); return pts; };
  const size = ps => Math.max(...ps.map(p => Math.hypot(p.x, p.y))), pale = ps => Math.min(...ps.map(p => Math.min(p.cr, p.cg, p.cb)));
  const p0 = shot(); fx.step(1.5); const p1 = shot();
  if (!(pale(p1) > pale(p0) + 0.1)) return 'тело не бледнеет';
  if (!(size(p1) < size(p0))) return 'тело не тонет (не уменьшается)';
  const v = new Fx({}, [C, C, C]); v.reset(); v.on('pop', 0, 0, 'strain'); if (!v.drops.length) return 'от вируса не лопается';
  return '';
});
check('test_vid_shchit_vspyshka: щит срабатывает видимо — вирус не сел: светлая вспышка в точке касания; первый вирус: светлая волна сходится в клетку; сестра гаснет со светлым контуром', () => {
  const C = { r: 1, g: 1, b: 1 }, shot = fx => { const pts = []; const b = { put: (x, y, r, cr, cg, cb, a) => pts.push({ x, y, r, cr, cg, cb, a }) }; fx.drawOver({ scr: (x, y) => [x, y], z: 1, time: 0, glow: b, ink: b }); fx.drawUnder({ scr: (x, y) => [x, y], z: 1, time: 0, glow: b, ink: b }); return pts; };
  const lock = new Fx({}, [C, C, C]); lock.reset(); lock.world = { me: [{ x: 0, y: 0 }] }; lock.on('shrug', 12, 0); lock.step(0.03);
  if (!shot(lock).some(p => Math.hypot(p.x - 12, p.y) < 6 && p.r >= 8 && p.a > 0.6 && p.cr > 0.9)) return 'вирус не сел — нет светлой вспышки в точке касания';
  const learn = new Fx({}, [C, C, C]); learn.reset(); learn.world = { me: [{ x: 0, y: 0 }] }; learn.on('learn', 30, 0); learn.step(0.3);
  const ring = shot(learn).filter(p => Math.abs(Math.hypot(p.x, p.y) - 40) < 40 && p.a > 0.4); if (ring.length < 20) return 'первый вирус: волны к клетке не видно';
  const ab = new Fx({}, [C, C, C]); ab.reset(); ab.on('abort', 0, 0, 0, 1); ab.step(0.5);
  if (!shot(ab).some(p => p.a > 0.25 && p.cr > 0.5)) return 'сестра гаснет без светлого контура — на тёмной воде не видно';
  return '';
});
check('test_vid_impuls: навык сработал — по телу своей клетки за V.pulse.life пробегает золотой импульс от точки срабатывания к другому концу; на опасности его нет', () => {
  const C = { r: 1, g: 1, b: 1 }, fx = new Fx({}, [C, C, C]); fx.reset(); fx.world = { me: [{ id: 1, x: 0, y: 0, a: 0 }] };
  const gold = () => paint({}).map(p => p.split(',').map(Number)).filter(([x, y, r, cr, cg, cb, a]) => cr > 0.9 && cg > 0.6 && cg < 0.9 && cb < 0.5 && a > 0.05);
  const mid = ps => ps.reduce((s, p) => s + p[0] * p[6], 0) / ps.reduce((s, p) => s + p[6], 0);
  if (gold().length) return 'золото на теле без срабатывания';
  fx.on('shrug', 30, 0); fx.step(0.12); const p1 = gold(); if (p1.length < 3) return 'золотого импульса на теле не видно';
  fx.step(0.25); const p2 = gold(); if (!(mid(p1) > 3 && mid(p2) < mid(p1) - 6)) return 'импульс не бежит от точки срабатывания: ' + mid(p1).toFixed(1) + ' → ' + mid(p2).toFixed(1);
  fx.step(0.3); if (gold().length) return 'импульс не погас за V.pulse.life';
  fx.on('stick', 30, 0); fx.step(0.1); if (gold().length) return 'импульс на опасности: золотой только у навыка';
  return '';
});
check('test_vid_virus: вирус — в гранёной голове светится золотая нить ДНК; впрыснул — голова пустеет', () => {
  const C = { r: 1, g: 1, b: 1 }, me = { id: 7, x: 0, y: 0, m: 1 };
  const gold = (g) => { const f = new Fx({ inject: 2 }, [C, C, C]); f.reset(); f.world = { me: [me], phages: [g] }; let n = 0; const b = { put: (x, y, r, cr, cg, cb) => { if (cr === 1 && cg === vid.V.virus.gold[1]) n++; } }; f.drawOver({ scr: (u, v) => [u, v], z: 1, time: 0, glow: b, ink: b }); return [n]; };
  const [free] = gold({ x: 120, y: 0, d: 0 }); if (free < 20) return 'нет золотой нити в голове: ' + free;
  const [late] = gold({ x: 120, y: 0, d: 0, on: me, t: 0.1 }); if (!(late < free / 3)) return 'впрыснул, а голова полна: ' + late;
  return '';
});
check('test_vid_skorlupa: спящая в тонкой твёрдой скорлупе; хищник рядом — по скорлупе с его стороны бегут трещины, далеко — скорлупа цела', () => {
  const a = { id: 77, x: 0, y: 0, m: 1.6, a: 0, spore: cfgD.spore - vid.V.sleep.fall - 0.3 }, pts = [], br = { put: (x, y, r, cr, cg, cb, al) => pts.push({ x, y, cr, al }) };
  vid.sleeper({ a, x: 0, y: 0, z: 1, time: 0, cfg: cfgD, bodies: { rod() {} }, glow: br, ink: br });
  const sh = vid.shellOf(77); if (!sh) return 'скорлупы нет';
  const ring = pts.filter(p => p.cr > 0.8 && p.al > 0.3 && Math.hypot(p.x, p.y) > sh.R * 0.95); if (ring.length < 40) return 'скорлупа не видна: ' + ring.length;
  const crack = (mx) => { const C = { r: 1, g: 1, b: 1 }, fx = new Fx({}, [C, C, C]); fx.reset(); fx.world = { me: [a], amoebas: [{ x: mx, y: 0 }] }; const q = []; const b = { put: (x, y, r, cr, cg, cb, al) => { if (cr === 1 && cg === 1 && al > 0.3) q.push(x); } }; fx.drawOver({ scr: (x, y) => [x, y], z: 1, time: 0, glow: b, ink: b }); return q; };
  const near = crack(sh.R + 15); if (near.length < 6) return 'хищник у скорлупы, а трещин нет'; if (near.some(x => x < 0)) return 'трещина не с той стороны, где хищник';
  if (crack(500).length) return 'трещины без хищника';
  return '';
});
check('test_vid_capsule_dent: капсула прогибается от удара хищника и пружинит обратно', () => {
  vid.stepVid(5); const was = paint({ capsule: true }).join('|'); vid.poke(-15, 13); const hit = paint({ capsule: true }).join('|');
  vid.stepVid(5); const after = paint({ capsule: true }).join('|');
  return hit === was ? 'удар не виден' : after !== was ? 'плёнка не вернулась' : '';
});
check('test_vid_lysis: клетка от фага лопается прорывом — брызги вязко гаснут, остаётся пустая оболочка с дырой', () => {
  const C = { r: 1, g: 1, b: 1 }, fx = new Fx({}, [C, C, C]); fx.reset();
  // клетка плыла здесь (vid помнит форму), потом лопнула
  paint({ capsule: false }); fx.on('burst', 0, 0);
  if (!fx.ghosts.length) return 'нет оболочки-призрака';
  if (fx.drops.length < 20) return 'нет брызг сока: ' + fx.drops.length;
  const far = () => Math.max(...fx.drops.map(p => Math.hypot(p.x, p.y)));
  for (let i = 0; i < 30; i++) fx.step(1 / 30); const d1 = far();
  for (let i = 0; i < 9; i++) fx.step(1 / 30); const d2 = far();
  if (d2 - d1 > d1 * 0.08) return 'брызги катятся после секунды: ' + d1.toFixed(0) + ' → ' + d2.toFixed(0) + ' (в вязкой воде выката нет)';
  for (let i = 0; i < 150; i++) fx.step(1 / 30);
  if (!fx.ghosts.length) return 'призрак пропал раньше 6 с';
  const n = { k: 0 }, b = { put: () => n.k++ }; fx.drawUnder({ scr: (x, y) => [x, y], z: 1, time: 0, glow: b, ink: b });
  if (n.k < 30 || n.k >= 40) return 'у призрака нет дыры прорыва или он не нарисован: точек ' + n.k;
  for (let i = 0; i < 150; i++) fx.step(1 / 30);
  return fx.ghosts.length ? 'призрак не тает' : '';
});
check('test_vid_ill: заражённая фагом клетка мутнеет и замирает внутри', () => {
  const healthy = paint({}), sick = (() => { const pts = [], brush = { put: (...v) => pts.push(v) }, a = { id: 7, m: 1, a: 0, vx: 0, vy: 0, sick: cfgD.sick * 0.1 };
    vid.skin({ a, lk: look({}, cfgD.look), x: 0, y: 0, ang: 0, ax: 1, ay: 0, half: 20, w: 9, z: 1, along: (u, o) => [u, o], arc: () => 0, body: { at: () => [0, 0] }, scr: (x, y) => [x, y],
      time: 1, pdt: 0, run: false, phageNear: false, foodNear: false, spacers: 0, plasmid: false, cfg: cfgD, alive: [a], glow: brush, ink: brush }); return pts; })();
  const murk = sick.filter(v => Math.abs(v[3] - vid.V.ill.color[0]) < 0.01 && Math.abs(v[4] - vid.V.ill.color[1]) < 0.01).length;
  return murk >= 8 ? '' : 'муть внутри не видна: ' + murk + ' точек';
});
check('test_vid_eat_melts: съеденное зерно тает на месте, а не летит в рот', () => {
  const C = { r: 1, g: 1, b: 1 }, fx = new Fx({}, [C, C, C]); fx.reset(); fx.on('eat', 30, 40, 2);
  const size = () => { let r = []; const b = { put: (x, y, rr) => r.push([x, y, rr]) }; fx.drawOver({ scr: (x, y) => [x, y], z: 1, time: 0, glow: b, ink: b }); return r[0]; };
  const a = size(); fx.step(0.25); const b = size();
  if (!a || !b) return 'зерна не видно';
  if (a[0] !== 30 || b[0] !== 30 || b[1] !== 40) return 'зерно сдвинулось';
  if (b[2] >= a[2]) return 'зерно не уменьшается';
  fx.step(0.3); return fx.melts.length ? 'зерно не растаяло за ' + vid.V.eat.melt + ' с' : '';
});
check('test_vid_zap_instant: гарпун бьёт мгновенно — штрих гаснет за доли секунды, чехол сжимается', () => {
  const C = { r: 1, g: 1, b: 1 }, fx = new Fx({}, [C, C, C]); fx.reset(); fx.on('zap', 0, 0, 100, 0);
  const strokes = () => { let n = 0; const b = { put: (x, y) => { if (x > 20 && x < 90 && Math.abs(y) < 1) n++; } }; fx.drawUnder({ scr: (x, y) => [x, y], z: 1, time: 0, glow: b, ink: b }); return n; };
  const first = strokes(); for (let i = 0; i < 9; i++) strokes(); // drawUnder сам продвигает гарпун на 1/60 с
  return first < 5 ? 'удара не видно' : strokes() ? 'штрих висит дольше ' + vid.V.zap.flash + ' с — это летящий снаряд, а не выстрел' : '';
});
check('test_vid_abort: сестра, умершая за своих, гаснет целой — без брызг и призрака, за 2–3 с', () => {
  const C = { r: 1, g: 1, b: 1 }, fx = new Fx({}, [C, C, C]); fx.reset(); fx.on('abort', 0, 0, 0, 1);
  if (!fx.dead.length) return 'гибели не видно';
  if (fx.drops.length || fx.ghosts.length) return 'есть брызги или призрак — так лопается от вируса, а не гаснет за своих';
  const dots = () => { let n = 0; const b = { put: () => n++ }; fx.drawUnder({ scr: (x, y) => [x, y], z: 1, time: 0, glow: b, ink: b }); return n; };
  if (dots() < 20) return 'тело не нарисовано';
  for (let i = 0; i < 60; i++) fx.step(1 / 30); if (!fx.dead.length) return 'погасла быстрее 2 с';
  for (let i = 0; i < 30; i++) fx.step(1 / 30); return fx.dead.length ? 'не гаснет за 3 с' : '';
});
check('test_vid_eaten_each: у каждого едока своя гибель; в амёбе клетка бьётся в пузыре и плывёт вместе с ней', () => {
  const C = { r: 1, g: 1, b: 1 }, miss = [], sig = new Set();
  for (const who of ['amoeba', 'slipper', 'bell', 'roti', 'bdello', 'pseudo']) {
    const fx = new Fx({}, [C, C, C]); fx.reset(); const am = { x: 0, y: 0 }; fx.world = { me: [], amoebas: [am], slippers: [am], bells: [am], rotis: [am] };
    fx.on('eaten', 0, 0, who); if (!fx.eats.length) { miss.push(who + ': нет анимации'); continue; }
    const S = fx.eats[0].S; sig.add(JSON.stringify(S));
    if (S.life < 1.5) miss.push(who + ': короче 1,5 с');
    if (who === 'amoeba') { const at = () => { let p = null; const b = { put: (x, y) => { p = p || [x, y]; } }; fx.drawOver({ scr: (x, y) => [x, y], z: 1, time: 0, glow: b, ink: b }); return p; };
      const p0 = at(); am.x += 50; const p1 = at(); if (!p0 || !p1 || Math.abs(p1[0] - p0[0] - 50) > 1) miss.push('в амёбе пузырь не плывёт с ней');
      if (S.fight < 2) miss.push('в амёбе клетка не бьётся секунды'); }
  }
  if (sig.size < 6) miss.push('смерти повторяются: разных ' + sig.size + ' из 6');
  return miss.join('; ');
});
check('test_vid_defend: отбилась — у каждой защиты свой след: дуга на борту у врага, клочья при рывке из пасти, мазок слизи у амёбы', () => {
  const C = { r: 1, g: 1, b: 1 }, miss = [], me = { x: 0, y: 0, vx: 220, vy: 0, m: 4, a: 0 };
  const run = (k, x, y) => { const fx = new Fx({}, [C, C, C]); fx.reset(); fx.world = { me: [me], amoebas: [{ x: 60, y: 0 }] }; fx.on(k, x, y); fx.step(0.3);
    const pts = []; const b = { put: (px, py) => pts.push([px, py]) }; fx.drawOver({ scr: (u, v) => [u, v], z: 1, time: 0, glow: b, ink: b }); return { fx, pts }; };
  const sh = run('shrug', 30, 0); if (!sh.fx.flicks.length) miss.push('новая дверь: нет дуги');
  else { const q = sh.fx.flicks[0]; if (q.x <= 0 || q.x >= 30) miss.push('дуга не на борту между клеткой и вирусом'); if (sh.pts.length < 8) miss.push('дуга не видна через 0,3 с'); }
  const ph = run('shake', 30, 0); if (!ph.fx.flicks.length || ph.fx.flicks[0].kind !== 1) miss.push('стряхнула вирус: нет своего следа');
  const es = run('shake', 0, 0); if (es.fx.flicks.length || es.fx.drops.length < 6) miss.push('вырвалась из пасти: нет клочьев');
  else if (es.fx.drops.some(p => p.vx > 0)) miss.push('клочья летят вперёд, а не остаются позади');
  const sl = run('slip', 0, 0); if (sl.fx.drops.length < 6 || sl.fx.drops.some(p => p.vx < 0)) miss.push('выскользнула: нет мазка слизи к амёбе');
  for (const [n, r] of [['shrug', sh], ['shake', ph], ['slip', sl]]) if (r.fx.rings.length) miss.push(n + ': всё ещё простое кольцо');
  return miss.join('; ');
});
check('test_vid_tube: ген по трубочке бежит колечком в клетку; фаг тянет нить ДНК тем дальше, чем дольше сидит; сон и пробуждение — тихая волна, не вспышка', () => {
  const C = { r: 1, g: 1, b: 1 }, miss = [], me = { x: 100, y: 0, m: 4 };
  const pts = fx => { const p = []; const b = { put: (x, y) => p.push([x, y]) }; fx.drawOver({ scr: (u, v) => [u, v], z: 1, time: 0, glow: b, ink: b }); return p; };
  let fx = new Fx({ inject: 2 }, [C, C, C]); fx.reset(); fx.world = { me: [me], phages: [] }; fx.on('gene', 0, 0, 1, 'caps'); fx.step(0.35);
  const p = pts(fx), cx = p.reduce((s, q) => s + q[0], 0) / (p.length || 1); if (!fx.genes.length) miss.push('ген: нет колечка'); else if (cx < 20 || cx > 80) miss.push('колечко не бежит от сородича к клетке');
  if (fx.rings.length) miss.push('ген: всё ещё простое кольцо');
  { const keep = fx.save(); fx.reset(); fx.load(keep); if (!fx.genes.length) miss.push('снимок значка (reset) гасит идущую анимацию'); }
  const len = t => { const f = new Fx({ inject: 2 }, [C, C, C]); f.reset(); f.world = { me: [me], phages: [{ x: 120, y: 0, d: 0, on: me, t }] }; const p = []; const br = { put: (x, y, r, cr, cg, cb) => { if (![vid.V.virus.gold].some(c => c[0] === cr && c[1] === cg && c[2] === cb)) p.push([x, y]); } }; f.drawOver({ scr: (u, v) => [u, v], z: 1, time: 0, glow: br, ink: br }); return p.length; }; // только нить, без головы вируса
  if (!(len(0.2) > len(1.8) + 4)) miss.push('нить ДНК не растёт, пока фаг сидит');
  for (const k of ['spore', 'sprout']) { const f = new Fx({}, [C, C, C]); f.reset(); f.world = { me: [me] }; f.on(k, 0, 0); if (f.rings.length || !f.naps.length) miss.push(k + ': вспышка вместо тихой волны'); }
  return miss.join('; ');
});
check('test_vid_sosedi: соседей едят, они делятся и лопаются видно, каждый своей величины', () => {
  const C = { r: 1, g: 1, b: 1 }, miss = [], am = { x: 0, y: 0 };
  const mk = () => { const fx = new Fx({}, [C, C, C]); fx.reset(); fx.world = { me: [], amoebas: [am], slippers: [am], bells: [am], rotis: [am] }; return fx; };
  for (const who of ['amoeba', 'slipper', 'bell', 'roti']) for (const prey of ['coccus', 'strain', 'pseudo', 'donor', 'bdello']) {
    const fx = mk(); fx.on('eaten_other', 5, 5, who, prey); const e = fx.eats[0];
    if (!e) { miss.push(who + ' ест ' + prey + ': нет анимации'); continue; } if (e.w !== vid.V.sosed[prey].w) miss.push(prey + ': не своей величины'); }
  { const fx = mk(); fx.on('divide_other', 0, 0, 'coccus'); if (fx.drops.length !== 2) miss.push('деление соседа не видно'); }
  for (const k of ['strain', 'pseudo', 'donor']) { const fx = mk(); fx.on('pop', 0, 0, k); if (!fx.ghosts.length || fx.ghosts[0].w !== vid.V.sosed[k].w) miss.push(k + ': лопнул без оболочки своей величины'); if (fx.rings.some(r => r.r >= 90)) miss.push(k + ': всё ещё большое кольцо'); }
  return miss.join('; ');
});
check('test_vid_uchit: соседка учит соперницу — нить растёт, колечко в цвете гена бежит к сопернице, на сопернице знак гена', () => {
  const C = { r: 1, g: 1, b: 1 }, miss = [], riv = { x: 100, y: 0, a: 0 }, don = { x: 0, y: 0, toOther: riv, pull: 0 };
  const pts = fx => { const p = []; const b = { put: (x, y, r, cr, cg, cb) => p.push([x, y, cr, cg, cb]) }; fx.drawOver({ scr: (u, v) => [u, v], z: 1, time: 0, glow: b, ink: b }); return p; };
  const mk = () => { const fx = new Fx({ conj: 3 }, [C, C, C]); fx.reset(); fx.world = { me: [], donors: [don] }; return fx; };
  don.pull = 0.5; const a = pts(mk()).length; don.pull = 2.5; const b = pts(mk()); if (!(b.length > 0) || !(Math.max(...b.map(q => q[0])) > 60)) miss.push('нить к сопернице не растёт');
  don.pull = 0; const fx = mk(); fx.on('gene_other', 100, 0, 'toxin', 'strain'); fx.step(0.35); const p = pts(fx);
  if (!fx.genes.length) miss.push('нет колечка'); else { const cx = p.reduce((s, q) => s + q[0], 0) / p.length; if (cx < 20 || cx > 80) miss.push('колечко не бежит от соседки'); if (p[0][3] > 0.6) miss.push('колечко не в цвете гена'); }
  for (const g of ['capsule', 'toxin', 'crispr']) { const n = []; vid.marks({ x: 0, y: 0, a: 0, genes: { [g]: true } }, { scr: (u, v) => [u, v], z: 1, glow: { put: () => n.push(1) }, ink: { put: () => n.push(1) } }); if (n.length < 3) miss.push(g + ': знака на сопернице нет'); }
  return miss.join('; ');
});
console.log(bad ? 'ВИД: провалов ' + bad : 'ВИД: все проверки прошли');
process.exit(bad ? 1 : 0);
