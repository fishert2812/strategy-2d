// Проверки слоя «вид и анимации» (vid.js, fx.js). Каждое событие мира из sim.js должно быть видно: fx.on даёт анимацию.
// Роман 24.11: «Анимацию взаимодействия не забудь это очень важно». Тихое событие (meet — имя у края экрана) — в списке тихих.
import { readFileSync } from 'node:fs';
import { Fx } from './fx.js';
import * as vid from './vid.js';
import { sobrat, VC, KLYUCHI } from './vid_chasti.js';
import { look } from './look.js';
const sim = readFileSync(new URL('./sim.js', import.meta.url), 'utf8'), main = readFileSync(new URL('./main.js', import.meta.url), 'utf8'), fx = readFileSync(new URL('./fx.js', import.meta.url), 'utf8'), body3d = readFileSync(new URL('./body3d.js', import.meta.url), 'utf8');
const kinds = [...new Set([...sim.matchAll(/events\.push\(\[['"](\w+)/g)].map(m => m[1]))];
const quiet = new Set(['meet', 'split']); // встречу показывает main.js подписью у края; деление — само тело (vid.birth: перемычка и расклеивание, test_vid_split), без кольца и брызг (L055)
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
check('test_vid_split: деление — мать стягивается перетяжкой до конца, потом дочки торец к торцу расходятся вдоль оси, зазор от нуля, в конце клетка на своём месте', () => {
  const P = vid.V.split, mom = { id: 901, x: 9, y: 0 }, kid = { id: 902, x: -9, y: 0 }, all = [mom, kid], hd = 8, wr = 4, hm = 12.5, wm = 4.8;
  vid.splitAt(901, 902);
  const at = (c, t) => vid.birth(c, 100 + t * P.slide, all, 0, hd, wr, c.x, c.y, hm, wm);
  const a0 = at(mom, 0), b0 = at(kid, 0); if (!a0 || !b0) return 'деление не рисуется';
  if (!b0.hide || Math.abs(a0.x) > 1e-6 || Math.abs(a0.fl * hd - hm) > 1e-6) return 'в миг деления не мать посередине — дочка просто появилась';
  if (at(mom, P.join * 0.99).pinch < 0.97) return 'перетяжка не стянулась до конца';
  const a1 = at(mom, P.join + 1e-4), b1 = at(kid, P.join + 1e-4);
  if (a1.hide || b1.hide || Math.abs(a1.y) > 1e-6) return 'дочки расходятся не вдоль оси';
  if (Math.abs(a1.x - b1.x - 2 * hd) > 0.1 || Math.abs(at(mom, P.join * 0.999).fl - 2) > 0.01) return 'после перетяжки дочки не половинки матери торец к торцу: ' + (a1.x - b1.x).toFixed(2);
  let prev = a1.x - b1.x; for (let t = P.join + 0.03; t < P.join + (1 - P.join) * P.free; t += 0.03) { const d = at(mom, t).x - at(kid, t).x; if (d < prev - 1e-6) return 'дочки сходятся обратно'; if (d - prev > hd * 0.3) return 'рывок в расхождении на ' + t.toFixed(2); prev = d; }
  if (at(mom, 1.01)) return 'деление не кончилось за V.split.slide';
  return '';
});
check('test_L047 (след за клеткой, холодная приёмка 0.83: «пунктирные следы за клеткой»): частицы следа шире шага между ними — мягкое завихрение, а не цепочка бусин', () => {
  const m = main.match(/wake\.put\(x, y, \(([\d.]+) \+ ([\d.]+) \* p\.t\) \* z, [^;]*?, ([\d.]+) \* \(1 - p\.t/);
  if (!m) return 'не нашёл в main.js строку следа wake.put(x, y, (A + B * p.t) * z, …)';
  const A = +m[1], shag = 2 * cfgD.speed / 60; // частица на кадр, сторона случайна: в одной полосе шаг около двух кадров хода
  if (2 * A <= shag) return 'след бусами: частица радиусом ' + A + ' при шаге ' + shag.toFixed(1) + ' — между ними просвет';
  if (+m[3] > 0.15) return 'широкий след слишком плотный (' + m[3] + '): должен быть мягким';
  return '';
});
check('test_L055 (Роман 25.11: «деление… не реалистична физика разделения клетки… бери реальную физику!»): палочка растёт в длину при постоянной толщине, ДНК делится раньше кольца, кольцо сжимается по массе только в одну сторону, деление без кольца-свечения и без толчка', () => {
  const D = cfgD.delenie, P = vid.V.split, g = fm => vid.grow(fm, D);
  if (Math.abs(g(1).half / g(0.5).half - 2) > 1e-9) return 'к делению палочка не вдвое длиннее новорождённой: ' + (g(1).half / g(0.5).half).toFixed(2);
  if (g(0.79).u > 0 || g(0.69).dna > 0) return 'кольцо или ДНК начинаются раньше срока';
  if (g(0.8).dna < 1) return 'к началу кольца ДНК ещё не разошлась надвое';
  let prev = -1; for (let fm = 0.5; fm <= 1.0001; fm += 0.01) { const u = g(fm).u; if (u < prev - 1e-12) return 'кольцо разжимается обратно при массе ' + fm.toFixed(2); prev = u; }
  if (Math.abs(g(1).u - D.u_max) > 1e-9 || D.u_max >= 1) return 'у созревшей нет тонкой перемычки';
  const neck = u => Math.sqrt(1 - u * u); if (Math.abs(neck(0.5) - 0.866) > 0.001) return 'шейка не по формуле r = R·√(1−u²)';
  if (!/max\(0\.0, prm\.x - abs\(p\.y\)\)/.test(body3d)) return 'перетяжка не куполами будущих полюсов (body3d.js)';
  if (/R\(0, 30\)/.test(fx) || /Math\.sin\(time \* 6\)/.test(main) || /0\.62 \+ 0\.12/.test(main)) return 'вернулось кольцо-свечение или пульсация перетяжки';
  if (Math.abs(P.slide * P.join - 0.3) > 0.02 || Math.abs(P.slide * (1 - P.join) - 0.5) > 0.02 || P.gap) return 'перемычка не 0,3 с или расклеивание не 0,5 с, или между дочками зазор';
  if (/vx: c\.vx - ax \* \d+/.test(sim)) return 'дочка снова рождается с толчком';
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
check('test_vid_ameba: амёба как на образцах Романа — полупрозрачное желтоватое тело, во все стороны десятки тонких шипиков, внутри крупное ядро и розовые пузырьки; не оранжевый шар', () => {
  const pts = [], b = { put: (x, y, r, cr, cg, cb, a) => pts.push({ d: Math.hypot(x, y), r, cr, cg, cb, a }) }, r = 50;
  vid.amoeba({ m: { id: 3 }, x: 0, y: 0, r, head: 0, sp: 0, time: 1, z: 1, glow: b, ink: b, bubbles: b });
  const A = vid.V.amoeba, out = pts.filter(p => p.d > r * (A.core + A.lump * 1.1) + r * 0.15);
  if (out.length < 60) return 'шипиков почти нет: ' + out.length;
  const tips = pts.filter(p => p.d > r * 1.2 && p.r < r * 0.03); if (tips.length < 20) return 'шипики не острые: у концов нет тонких точек';
  const fill = pts.filter(p => p.d < r * 0.5 && p.r > r * 0.15); if (!fill.length || fill.some(p => p.a > 0.6)) return 'тело не полупрозрачное';
  if (!pts.some(p => p.cb > p.cr && p.r >= r * A.nucleus * 1.9)) return 'нет крупного голубовато-серого ядра';
  if (!pts.some(p => p.cr > 0.9 && p.cg < 0.7 && p.cb > 0.6)) return 'нет розовых пузырьков';
  if (pts.some(p => p.cr === 1 && p.cg === 0.4 && p.cb === 0.12)) return 'остался оранжевый шар';
  return '';
});
check('test_vid_roti: коловратка как в жизни — на голове венец из двух лопастей ресничек с бегущей волной, зубцы панциря, тёмная кишка и челюсти, которые смыкаются при укусе', () => {
  const shot = (time, bite = 0) => { const pts = []; const b = { put: (x, y, r, cr, cg, cb, a) => pts.push({ x, y, r, cr, cg, cb, a }) }; vid.roti({ tx: 0, ty: 0, vx: 0, vy: -1, L: 200, w: 34, pw: 1, time, id: 2, z: 1, glow: b, ink: b, bite }); return pts; };
  const p0 = shot(1), C = vid.V.roti, cil = p0.filter(p => p.cr === C.cil_col[0] && p.cg === C.cil_col[1] && p.r < 3);
  const left = cil.filter(p => p.x < 0).length, right = cil.filter(p => p.x > 0).length; if (left < 60 || right < 60) return 'венец не из двух лопастей ресничек: ' + left + '/' + right;
  if (cil.some(p => p.y > -200 * 0.12)) return 'реснички не на голове';
  const bright = ps => ps.filter(p => p.cr === C.cil_col[0] && p.a > 0.8).map(p => Math.round(p.x) + ':' + Math.round(p.y)).join('|'); if (bright(p0) === bright(shot(1.1))) return 'по венцу не бежит волна';
  if (!p0.some(p => p.cr === C.jaw[0] && p.cg === C.jaw[1])) return 'челюстей не видно'; if (!p0.some(p => p.cr === C.gut_col[0])) return 'кишки не видно';
  const jaws = ps => { const j = ps.filter(p => p.cr === C.jaw[0] && p.cg === C.jaw[1]); return Math.max(...j.map(p => p.x)) - Math.min(...j.map(p => p.x)); };
  if (!(jaws(shot(1, 0.15)) < jaws(shot(1, 0.001)) * 0.7)) return 'челюсти не смыкаются при укусе';
  return '';
});
check('test_vid_bell: колокольчик как в жизни — испугался, стебель сжат тугой спиралью и бокал у опоры, потом стебель плавно распрямляется и бокал раскрыт', () => {
  const B = vid.V.bell, shot = shut => { const pts = [], ink = { put: (x, y) => pts.push({ x, y }) }; const [bx, by, open] = vid.bell({ x: 0, y: 0, dir: 0, Ls: 70, r: 18, shut, time: 1, id: 3, z: 1, ink }); return { pts, bx, by, open }; };
  const o = shot(0), c = shot(2.5), m = shot(B.unfold / 2), l = shot(0.05);
  if (o.open !== 1 || Math.abs(o.bx - 70) > 0.01) return 'раскрытый бокал не на конце стебля: ' + o.bx.toFixed(1);
  if (!(c.bx < 70 * 0.6) || c.open !== 0) return 'испуганный бокал не подтянут к опоре: ' + c.bx.toFixed(1);
  const wide = q => Math.max(...q.pts.map(p => Math.abs(p.y))), turns = q => q.pts.filter((p, i) => i && (p.y > 0) !== (q.pts[i - 1].y > 0)).length;
  if (!(turns(c) >= 8 && wide(c) > 4)) return 'стебель не свёрнут спиралью: витков ' + turns(c) + ', ширина ' + wide(c).toFixed(1);
  if (!(c.bx < m.bx && m.bx < l.bx && l.bx < 70 && m.open > 0 && m.open < 1)) return 'стебель распрямляется не плавно: ' + [c.bx, m.bx, l.bx].map(v => v.toFixed(0));
  if (!(wide(o) < wide(c) * 0.5)) return 'раскрытый стебель всё ещё в спирали';
  return '';
});
check('test_vid_fag_lapy: вирус садится как в жизни — шесть лап веером, все ступни замирают на одной линии поперёк хвоста, хвост стоит вышкой; плывёт — лапы поджаты и шевелятся', () => {
  const g = {}, s = 10, shot = (on, time) => { const pts = []; vid.phageLegs({ P: (a, b) => [a, b], s, on, key: g, seed: 0, time, ink: { put: (x, y, r) => pts.push({ x, y, r }) } }); return pts; };
  const free = shot(false, 0), feet = q => q.filter(p => p.r > s * vid.V.legs.w * 1.5);
  if (feet(free).length) return 'плывущий вирус уже стоит на ступнях';
  shot(true, 0.05); const mid = shot(true, 0.1); for (let t = 0.15; t < 1; t += 0.05) shot(true, t); const sat = shot(true, 1);
  const f = feet(sat); if (f.length !== 6) return 'ступней не шесть: ' + f.length;
  const ax = f.map(p => p.x); if (Math.max(...ax) - Math.min(...ax) > 0.5) return 'ступни не на одной линии поперёк хвоста';
  if (f.filter(p => p.y < 0).length !== 3) return 'лапы не поровну по обе стороны хвоста';
  const key = q => q.map(p => p.x.toFixed(2) + ':' + p.y.toFixed(2)).join('|'); if (key(shot(true, 1.3)) !== key(sat)) return 'севший вирус шевелит лапами';
  if (key(shot(false, 2.02)) === key(shot(false, 2.3))) return 'плывущий вирус не шевелит лапами';
  if (!(feet(mid).length === 0 || mid.some(p => !sat.some(q => q.x === p.x && q.y === p.y)))) return 'лапы встали мгновенно, без посадки';
  if (feet(shot(false, 2)).length) return 'стряхнутый вирус не поджал лапы';
  return '';
});
check('test_vid_lizis_oblako: лопнула — сок встаёт за 0,1 с в паре размеров клетки и расплывается облаком √(4Dt), густота как 1/t; пустую оболочку трясёт вода (Ф3, Ф4)', () => {
  const C = { r: 1, g: 1, b: 1 }, fx = new Fx({}, [C, C, C]), P = vid.V.lysis; fx.reset(); fx.lyse(0, 0, null);
  const x0 = fx.drops[0].x, y0 = fx.drops[0].y, far = () => Math.max(...fx.drops.map(p => Math.hypot(p.x - x0, p.y - y0)));
  for (let i = 0; i < 6; i++) fx.step(1 / 60); const d1 = far(); for (let i = 0; i < 24; i++) fx.step(1 / 60); const d2 = far();
  if (d1 < 30 || d2 > 80) return 'брызги летят не на 30–60: ' + d1.toFixed(0) + ' → ' + d2.toFixed(0);
  if (d2 - d1 > d1 * 0.1) return 'брызги катятся после 0,1 с: ' + d1.toFixed(0) + ' → ' + d2.toFixed(0);
  if (!fx.clouds.length) return 'на месте брызг нет облака';
  const look = () => { const pts = [], b = { put: (x, y, r, cr, cg, cb, a) => { if (cr === P.cloud[0] && cg === P.cloud[1]) pts.push({ r, a }); } }; fx.drawOver({ scr: (x, y) => [x, y], z: 1, time: 0, glow: b, ink: b }); return pts[0]; };
  const a = look(); for (let i = 0; i < 90; i++) fx.step(1 / 60); const b = look(); // t растёт с ~0,65 до ~2,15 — втрое с лишним
  const tr = (fx.clouds[0].t + P.t0) / (fx.clouds[0].t + P.t0 - 1.5);
  if (Math.abs(b.r / a.r - Math.sqrt(tr)) > 0.05) return 'облако растёт не как корень из времени: ' + (b.r / a.r).toFixed(2) + ' вместо ' + Math.sqrt(tr).toFixed(2);
  if (Math.abs(a.a / b.a - tr) > 0.05) return 'облако бледнеет не как 1/t';
  const g = new Fx({}, [C, C, C]); g.reset(); for (let i = 0; i < 300; i++) g.ghosts.push({ x: 0, y: 0, ang: 0, L: 8, w: 6, p0: 0, t: 0 });
  const msd = () => g.ghosts.reduce((s, q) => s + q.x * q.x + q.y * q.y, 0) / g.ghosts.length;
  for (let i = 0; i < 60; i++) g.step(1 / 60); const m1 = msd(); for (let i = 0; i < 180; i++) g.step(1 / 60); const m4 = msd();
  if (m1 < 4 * P.ghost_D * 0.6 || m1 > 4 * P.ghost_D * 1.4) return 'оболочку трясёт не по Ф3: за 1 с ' + m1.toFixed(0) + ' ед.² вместо ' + 4 * P.ghost_D;
  if (m4 / m1 < 3 || m4 / m1 > 5) return 'оболочка уплывает, а не топчется: за вчетверо дольше уходит в ' + Math.sqrt(m4 / m1).toFixed(1) + ' раза дальше вместо 2';
  return '';
});
check('test_vid_ameba_est: амёба ест как в жизни — надевает себя на добычу рукавом: валик ползёт по самой добыче с обеих сторон ровно, края сходятся позади, пузырёк уходит в тело, добыча темнеет в крупинку; шипики с этого края втянуты', () => {
  const C = { r: 1, g: 1, b: 1 }, M = { x: 0, y: 0, id: 5 }, fx = new Fx({}, [C, C, C]), S = vid.V.eaten.amoeba, A = vid.V.amoeba; fx.reset(); fx.world = { amoebas: [M], me: [] };
  fx.swallow(40, 0, 'amoeba', 'strain'); const e = fx.eats[0]; e.ang = Math.PI / 2; // добыча лежит поперёк, касается амёбы боком
  const look = () => { const pts = []; const b = { put: (x, y, r, cr, cg, cb, a) => pts.push({ x, y, r, c: [cr, cg, cb], a }) }; fx.drawOver({ scr: (x, y) => [x, y], z: 1, time: 0, glow: b, ink: b }); return pts; };
  const at = s => { e.t = s; return look(); }, same = (p, c) => p.c[0] === c[0] && p.c[1] === c[1] && p.c[2] === c[2], body = ps => ps.filter(p => same(p, A.body));
  const sd = ps => { const b = body(ps); return [b.filter(p => p.y < -1).length, b.filter(p => p.y > 1).length]; };
  const n = [0.25, 0.5, 0.75].map(f => body(at(S.touch + S.cup * f)).length); if (!(n[0] < n[1] && n[1] < n[2])) return 'валик не ползёт: ' + n;
  if (Math.abs((n[2] - n[1]) - (n[1] - n[0])) > 2) return 'край ползёт неровно, рывками: ' + n;
  const [l, r] = sd(at(S.touch + S.cup * 0.5)); if (Math.abs(l - r) > 2 || l < 2) return 'валик не идёт с обеих сторон сразу: ' + l + '/' + r;
  const far = at(S.touch + S.cup * 0.5).filter(p => same(p, A.body)).map(p => { const dx = p.x - e.x, dy = Math.max(0, Math.abs(p.y - e.y) - e.L); return Math.hypot(dx, dy) - e.w; });
  if (Math.max(...far) > S.gap + S.th) return 'рукав не облегает добычу, отстаёт на ' + Math.max(...far).toFixed(1);
  if (body(at(S.touch * 0.5)).some(p => p.x > e.x + 1)) return 'при касании край сразу полез за добычу';
  const shut = at(S.touch + S.cup); if (!body(shut).some(p => p.x > e.x + e.w)) return 'края не сошлись позади добычи';
  const prey = ps => { const q = ps.filter(p => p.c[0] > 0.8 && p.c[1] < 0.5 && p.a > 0.1); return q.reduce((s, p) => s + p.x, 0) / q.length; };
  const x0 = prey(shut), x1 = prey(at(S.touch + S.cup + S.sink)); if (!(x1 < x0 - e.L)) return 'пузырёк не ушёл в глубь тела: ' + x0.toFixed(0) + ' → ' + x1.toFixed(0);
  if (body(at(S.touch + S.cup + S.seam + 0.05)).length) return 'шов не растаял';
  const late = at(S.life - 0.9).filter(p => p.c.every((v, i) => Math.abs(v - S.dark[i]) < 0.05)); if (!late.length) return 'добыча не стала тёмной крупинкой';
  const reachOut = eat => { if (eat) vid.eating(9, 0, 1); let mx = 0; const b = { put: (x, y) => { if (Math.abs(y) < 8) mx = Math.max(mx, x); } }; vid.amoeba({ m: { id: 9 }, x: 0, y: 0, r: 30, head: Math.PI, sp: 0, time: 1, z: 1, glow: b, ink: b }); return mx; };
  if (!(reachOut(true) < reachOut(false) - 3)) return 'шипики с края, которым обтекает, не втянуты';
  return '';
});
check('test_vid_ameba_obrazec: акантамёба ближе к образцам Романа — тело сплюснуто, шипы длинные, изогнутые волной, со светлыми кромками по обоим краям, пузырьки мелкие', () => {
  const A = vid.V.amoeba, r = 30, ink = [], glow = []; vid.amoeba({ m: { id: 4 }, x: 0, y: 0, r, head: 0, sp: 0, time: 2, z: 1, glow: { put: (x, y, rr, cr, cg, cb, a) => glow.push({ x, y, r: rr, c: [cr, cg, cb] }) }, ink: { put: (x, y, rr, cr, cg, cb, a) => ink.push({ x, y, r: rr, c: [cr, cg, cb] }) } });
  const edge = glow.filter(p => p.c[0] === A.edge[0] && p.c[2] === A.edge[2]), far = edge.filter(p => Math.hypot(p.x, p.y) > r * 1.2);
  if (Math.max(...edge.map(p => Math.hypot(p.x, p.y))) < r * 2) return 'шипы короткие, на образцах длиной с тело';
  const rimR = a => Math.max(0, ...edge.filter(p => p.r > 2 && Math.abs(Math.atan2(p.y, p.x) - a) < 0.2).map(p => Math.hypot(p.x, p.y)));
  let lo = 1e9, hi = 0; for (let a = -3; a < 3; a += 0.3) { const v = rimR(a); if (v) { lo = Math.min(lo, v); hi = Math.max(hi, v); } } if (hi / lo < 1.25) return 'тело круглое, а на образцах сплюснутое: ' + (hi / lo).toFixed(2);
  if (far.length < A.spikes * A.seg * 0.8) return 'у шипов нет светлых кромок по краям: ' + far.length;
  const big = ink.filter(p => p.c[0] === A.vac_col[0] && p.c[1] === A.vac_col[1]).map(p => p.r); if (Math.max(...big) > r * 0.15) return 'розовые пузырьки крупнее, чем на образцах';
  return '';
});
check('test_vid_sploshno: у своей клетки нити сплошные — жгутик и ворсинки рисуются линией, а не бусами и не отдельными голубыми точками (L047, Роман про пунктир: «халтура»)', () => {
  const runs = [], br = { put: (x, y, r, cr, cg, cb) => runs.push({ x, y, r, c: cr + ',' + cg + ',' + cb }) };
  const a = { id: 7, x: 0, y: 0, m: 1, a: 0, vx: 0, vy: 0 };
  vid.skin({ a, lk: look({}, cfgD.look, 0), x: 0, y: 0, ang: 0, ax: 1, ay: 0, half: 20, w: 9, z: 1, along: (u, o) => [u, o], arc: () => 0, body: { at: () => [0, 0] }, scr: (x, y) => [x, y],
    time: 1, pdt: 0, run: false, phageNear: false, foodNear: false, spacers: 0, plasmid: false, cfg: cfgD, alive: [a], glow: br, ink: br });
  const gaps = (col, per = 0) => { const q = runs.filter(p => p.c === col.join(',')); let bad = 0, n = 0; for (let i = 1; i < q.length; i++) { if (per && i % per === 0) continue; const d = Math.hypot(q[i].x - q[i - 1].x, q[i].y - q[i - 1].y); if (d > 6) continue; n++; if (d > q[i].r + q[i - 1].r) bad++; } return [bad, n]; };
  const [fb, fn] = gaps(cfgD.flag.color); if (!fn || fb > fn * 0.05) return 'жгутик бусами: разрывов ' + fb + ' из ' + fn;
  const [pb, pn] = gaps(vid.V.pili.col, vid.V.pili.n + 1); if (pn < 40 || pb) return 'ворсинки точками, а не линией: разрывов ' + pb + ' из ' + pn;
  return '';
});
check('test_vid_capsule_dent: капсула прогибается от удара хищника и пружинит обратно', () => {
  vid.stepVid(5); const was = paint({ capsule: true }).join('|'); vid.poke(-15, 13); const hit = paint({ capsule: true }).join('|');
  vid.stepVid(5); const after = paint({ capsule: true }).join('|');
  return hit === was ? 'удар не виден' : after !== was ? 'плёнка не вернулась' : '';
});
check('test_vid_ryvok: рывок — один знак на всю игру: выскользнула из амёбы, вырвалась из пасти, развернулась щелчком — одинаковый след за кормой и две линии хода, гаснет за полсекунды (дизайнер, «Кнопка умения»)', () => {
  const C = { r: 1, g: 1, b: 1 }, shot = (k, x, y, s) => { const fx = new Fx({}, [C, C, C]); fx.reset(); const a = { id: 3, x: 0, y: 0, m: 1, a: 0, vx: 220, vy: 0 }; fx.world = { me: [a] };
    paint({ capsule: false }); fx.on(k, x, y, s ?? 1, s === undefined ? undefined : 'turn'); fx.step(0.15); const pts = [], b = { put: (px, py, r, cr, cg, cb, al) => { if ([cr, cg, cb].join() === vid.V.dash.col.join()) pts.push({ x: px, y: py, r, al }); } }; fx.drawOver({ scr: (u, v) => [u, v], z: 1, time: 0, glow: b, ink: b });
    const shape = pts.map(p => p.x.toFixed(0) + ',' + p.y.toFixed(0)).join('|'); for (let i = 0; i < 12; i++) fx.step(1 / 30); const n0 = pts.length; pts.length = 0; fx.drawOver({ scr: (u, v) => [u, v], z: 1, time: 0, glow: b, ink: b });
    let gap = 0; for (let i = 1; i < pts.length; i++) { const dd = Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y); if (dd < 8 && dd > pts[i].r + pts[i - 1].r) gap++; }
    return { shape, n0, gap, after: pts.length, pts: shape.split('|').map(q => q.split(',').map(Number)) }; };
  const slip = shot('slip', 0, 0), torn = shot('shake', 0, 0), snap = shot('snap', 0, 0, 0);
  if (!slip.n0) return 'выскользнула без рывка'; if (!torn.n0) return 'вырвалась без рывка'; if (!snap.n0) return 'щелчок без рывка';
  if (slip.shape !== torn.shape || slip.shape !== snap.shape) return 'знак рывка разный у трёх умений';
  const behind = slip.pts.filter(([x]) => x < -8).length, sides = new Set(slip.pts.filter(([x, y]) => Math.abs(y) > 4).map(([, y]) => Math.sign(y)));
  if (behind < slip.pts.length * 0.5) return 'след не за кормой: позади ' + behind + ' из ' + slip.pts.length;
  if (sides.size !== 2) return 'нет двух линий хода по бокам';
  if (slip.gap) return 'знак пунктиром: разрывов ' + slip.gap + ' (L047: только сплошные линии)';
  if (slip.after) return 'знак не погас за полсекунды';
  if (shot('shake', 0, 12).n0) return 'стряхнутый с края вирус даёт рывок';
  if (shot('snap', 0, 0).n0) return 'сувойка (щелчок без угла) даёт рывок клетке';
  return '';
});
check('test_vid_ameba_obyom: амёба в игре — объёмное тело со стеклянной оболочкой, шипы — сплошные стеклянные конусы, ядро и зёрна внутри; точек нет, кроме мягкой тени (Роман 25.11: «не объёмная… пятно из точек»)', () => {
  const got = { blobby: 0, spine: 0, sphere: 0 }, dots = [], br = { put: (...q) => dots.push(q) };
  const B = { spines: {}, blobby: () => got.blobby++, spine: (x, y, a, len, w) => { if (!(len > 0 && w > 0)) got.bad = 1; got.spine++; }, sphere: () => got.sphere++ };
  vid.amoeba({ m: { id: 5, m: 6 }, x: 0, y: 0, r: 40, head: 0, sp: 0, side: 1, time: 1, z: 2, glow: br, ink: br, bubbles: br, bodies: B });
  if (got.blobby !== 1) return 'нет объёмного тела'; if (got.spine < vid.V.amoeba.spikes) return 'шипов меньше, чем в образце: ' + got.spine; if (got.bad) return 'пустой шип';
  if (got.sphere < 1 + vid.V.amoeba.vac) return 'внутри нет ядра и пузырьков'; if (dots.length > 1) return 'амёба всё ещё рисует точки: ' + dots.length;
  return '';
});
check('test_vid_tufelka: туфелька — прозрачное тело-туфля с бороздкой, реснички — сплошные стеклянные волоски по всему краю, внутри ядро, пузырьки и сократительные пузырьки с каналами; точек нет', () => {
  const got = { slip: 0, spine: 0, sphere: 0, ball: 0 }, dots = [], br = { put: (...q) => dots.push(q) }, ang = [];
  const B = { ball: {}, slipper: (x, y, a, hl, w) => { if (!(hl > w && w > 0)) got.bad = 'тело не вытянуто'; got.slip++; }, spine: (x, y, a, len, w) => { if (!(len > 0 && w > 0)) got.bad = 'пустая ресничка'; got.spine++; ang.push(a); }, sphere: () => got.sphere++, put: () => got.ball++ };
  const n = vid.slipper({ x: 0, y: 0, a: 0.4, L: 200, w: 54, z: 2, time: 1, id: 3, mx: 40, my: 20, bodies: B, glow: br, ink: br });
  const C = VC.chasti, S = { cilia: C.resnichki.n, canals: C.sokr_puzyr.kanaly, food: C.puzyri_edy.n };
  if (n !== Object.keys(VC.vidy.tuflya.chasti).length) return 'туфелька собрана не из всех своих частей: ' + n;
  if (got.bad) return got.bad; if (got.slip !== 1) return 'нет объёмного тела';
  if (got.spine < S.cilia + 2 * S.canals) return 'ресничек и каналов меньше, чем в данных: ' + got.spine;
  const sides = new Set(ang.slice(0, S.cilia).map(a => Math.floor((((a - 0.4) % 6.283) + 6.283) % 6.283 / 1.571))); if (sides.size < 4) return 'реснички не со всех сторон';
  if (got.ball < 1 || got.sphere < S.food + 2) return 'внутри нет ядра, пузырьков еды или сократительных пузырьков';
  if (dots.length > 0) return 'туфелька всё ещё рисует точки: ' + dots.length;
  return '';
});
check('test_vid_chasti: существа собираются из частей движка — каждая часть записи рисуется объёмными телами, ключи частей едины с договором, точек нет', () => {
  for (const kl of ['telo', 'resnichki', 'yadro', 'zerna', 'puzyri_edy', 'sokr_puzyr', 'vorsinki', 'zhgutik_vint']) if (!KLYUCHI.includes(kl)) return 'нет части ' + kl;
  for (const kl of KLYUCHI) if (!VC.chasti[kl]) return 'у части нет умолчаний в vid_chasti.json: ' + kl;
  for (const tip of ['tuflya', 'palochka', 'shar']) {
    let calls = 0; const cnt = () => calls++, B = { ball: {}, slipper: cnt, rod: cnt, spine: cnt, sphere: cnt, put: cnt, seg: (x0, y0, x1, y1, r) => { if (![x0, y0, x1, y1, r].every(Number.isFinite)) calls = -1e9; calls++; } };
    const zap = { forma: { tip }, chasti: Object.fromEntries(KLYUCHI.map(k => [k, {}])) };
    const n = sobrat(zap, { x: 0, y: 0, a: 0.7, dlina: 120, tolshchina: 30, z: 1, time: 2, id: 5 }, B);
    if (n !== KLYUCHI.length) return tip + ': нарисовано частей ' + n + ' из ' + KLYUCHI.length;
    if (!(calls > 200)) return tip + ': части почти не рисуют тела (' + calls + ')';
  }
  return '';
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
