// Как выглядит и движется твоя клетка с умениями: оболочка, капсула, CRISPR, токсин, фимбрии, сон, рецепторы, рибосомы, жгутики.
// Файл слоя «вид и анимации» (свой строитель). main.js только зовёт skin() и sleeper() и даёт кисти; числа — в vid.json и data.json.
import { whip } from './whip.js';
import { mutSkin } from './mutacii.js';

const flags = new Map(); // состояние жгутиков каждой клетки между кадрами (whip.js)
export function whips(a, run, dt, beat, cfg, alive) {
  let F = flags.get(a.id); if (!F) { F = { b: run ? 1 : 0, fan: 0, ph: 0, om: 4, t: Math.random() * 9 }; flags.set(a.id, F); }
  whip(F, a.tumble || a.snap > 0 ? 'tumble' : run ? 'run' : 'rest', dt, beat, cfg.flag); // щелчок разворота (ген snap, один хвост): нить на миг изгибается вбок, как в кувырке
  if (flags.size > 64) for (const k of flags.keys()) { if (!alive.some(c => c.id === k)) flags.delete(k); }
  return F;
}

// Числа слоя — vid.json. В браузере — fetch, в проверках node — с диска.
const url = new URL('./vid.json', import.meta.url);
export const V = url.protocol === 'file:' ? JSON.parse((await import('node:fs')).readFileSync(url, 'utf8')) : await (await fetch(url)).json();

// Точка на контуре капсулы: прямые бока длиной 2L и полукруглые концы радиуса R; p — доля обхода от 0 до 1.
// Возвращает [u вдоль тела, o поперёк, нормаль nu, no].
export function rim(p, L, R) {
  let d = (((p % 1) + 1) % 1) * (4 * L + 2 * Math.PI * R);
  if (d < 2 * L) return [-L + d, R, 0, 1]; d -= 2 * L;
  if (d < Math.PI * R) { const t = Math.PI / 2 - d / R; return [L + Math.cos(t) * R, Math.sin(t) * R, Math.cos(t), Math.sin(t)]; } d -= Math.PI * R;
  if (d < 2 * L) return [L - d, -R, 0, -1]; d -= 2 * L;
  const t = -Math.PI / 2 - d / R; return [-L + Math.cos(t) * R, Math.sin(t) * R, Math.cos(t), Math.sin(t)];
}
// Вмятины капсулы: хищник ткнулся — плёнка прогнулась и пружинит обратно (событие bump, fx.js зовёт poke).
const dents = [];
export function poke(x, y) { dents.push({ x, y, t: 0 }); if (dents.length > 8) dents.shift(); }
const pulses = new Map(); // навык сработал: золотой импульс бежит по телу (эстетика, «Вид 6»); fx.js зовёт pulse()
export function pulse(id, from) { pulses.set(id, { t: 0, from }); }
export function stepVid(dt) { for (const [id, p] of pulses) if ((p.t += dt) > V.pulse.life) pulses.delete(id); for (const d of dents) d.t += dt; while (dents.length && dents[0].t > V.capsule.dent_t) dents.shift(); }
const mem = new Map(); // плавные состояния каждой клетки: нюх разгорается, новая бусина памяти растёт; где была и какой формы — для призрака
const keep = (a, alive) => { let m = mem.get(a.id); if (!m) { m = { smell: 0, beads: -1, grow: 1, tl: 0 }; mem.set(a.id, m); }
  if (mem.size > 64) for (const k of mem.keys()) if (!alive.some(c => c.id === k)) mem.delete(k); return m; };
// Где и какой формы клетка была в последнем кадре (мир): по ней fx.js рисует пустую оболочку-призрак после лопания.
export function seen(x, y, R = 80, alive = null) { let best = null, bd = R; for (const m of mem.values()) { if (alive && alive.some(c => c.id === m.id)) continue; const d = Math.hypot(m.x - x, m.y - y); if (d < bd) { bd = d; best = m; } } return best; } // alive — живые клетки: их не путать с погибшей
const mix = (p, q, k) => [p[0] + (q[0] - p[0]) * k, p[1] + (q[1] - p[1]) * k, p[2] + (q[2] - p[2]) * k];

// Спящая клетка (сон-персистер, биолог: design/zaplyv_vid_i_fizika.md, «Сон»). Не светится и не бледнеет: темнеет и плотнеет по краю,
// жгут сложен вдоль тела и не крутится, крупинки внутри замерли. Засыпает за V.sleep.fall с, просыпается дольше — V.sleep.wake с.
// c: a, x, y (экран), z, time, cfg, bodies, glow, ink.
const shells = new Map(); // где скорлупа спящей: по ней fx.js рисует трещину, когда хищник пробует взять
export const shellOf = id => shells.get(id);
export function sleeper(c) {
  const { a, x, y, z, time, cfg, bodies, glow, ink } = c, S = V.sleep;
  const w = 8.5 * Math.pow(a.m, 0.3) * z, half = w * 2.1, ux = Math.cos(a.a), uy = Math.sin(a.a);
  const k = Math.max(0, Math.min(1, (cfg.spore - a.spore) / S.fall, a.spore / S.wake)), e = k * k * (3 - 2 * k); // 0 — бодрая, 1 — спит
  const along = (u, o) => [x + ux * u - uy * o, y + uy * u + ux * o];
  // Спящая — та же палочка, не спора: вдвое-втрое короче при той же толщине, мельче себя бодрой; нутро темнее и гуще (биолог, О28).
  const H = half + (w * S.short - half) * e, W = w * (1 - S.thin * e);
  bodies.rod(x, y, a.a, H, W, 0, mix(S.awake, S.skin, e), mix(S.awake_core, S.core, e), a.id, 0);
  for (let i = 0; i < S.dense; i++) { const t = i * 2.39996, r = Math.sqrt((i + 0.5) / S.dense), [px, py] = along(Math.cos(t) * r * (H - W * 0.5), Math.sin(t) * r * W * 0.55); ink.put(px, py, 1.1 * z + 0.4, 0.14, 0.08, 0.18, 0.45 * e); } // густое тёмное нутро
  for (let i = 0; i < S.edge; i++) { const [u, o] = rim(i / S.edge, H - W, W * 0.94), [px, py] = along(u, o); ink.put(px, py, 1.3 * z + 0.3, 0.08, 0.1, 0.2, 0.55 * e); } // плотный край
  const Sh = V.shell, sL = Math.max(0, H - W), sR = W * Sh.gap; // скорлупа (дизайнер, «пока скорлупа цела, клетку не съедят»): тонкая твёрдая оболочка с бликами
  shells.set(a.id, { x: a.x, y: a.y, ang: a.a, L: sL / z, R: sR / z, e, t: time });
  if (glow) for (let i = 0; i < Sh.n; i++) { const p = i / Sh.n, [u, o] = rim(p, sL, sR), [px, py] = along(u, o), gl = Math.max(0, Math.cos((p - 0.15) * 6.283 * 2)) ** 6; // два блика на твёрдом
    ink.put(px, py, Sh.w * z + 0.5, ...Sh.dark, 0.5 * e); glow.put(px, py, Sh.w * 0.7 * z + 0.4, ...Sh.color, (Sh.alpha + 0.4 * gl) * e); }
  const live = 1 - e; // крупинки замирают вместе со сном
  for (let i = 0; i < 4; i++) { const t = (time * live + i * 2.1) * (0.5 + i * 0.17) + a.id, [px, py] = along(Math.sin(t) * (H - W * 0.6), Math.cos(t * 1.3) * W * 0.4); ink.put(px, py, 0.9 * z + 0.7, 0.75, 0.85, 0.9, 0.35 + 0.15 * live); }
  for (let j = 0; j < 4; j++) for (let i = 1; i <= 10; i++) { // жгутики: на бодрой торчат вбок, у спящей сложены вдоль тела к корме
    const s = j % 2 ? 1 : -1, b = (j < 2 ? -0.5 : 0.5) * w * 2 * (1 - 0.6 * e), f = i / 10, wv = live * Math.sin(f * 7 - time * 6 + j) * w * 0.25 * f;
    const out = [b - f * w * 1.5, s * (w + f * w * 2.5) + wv], fold = [b - f * w * 2.4, s * w * 1.08];
    const [px, py] = along(out[0] + (fold[0] - out[0]) * e, out[1] + (fold[1] - out[1]) * e);
    ink.put(px, py, 0.7 * z + 0.3, 0.5, 0.55, 0.65, 0.35);
  }
}

// Умения на теле плывущей клетки. Тело (bodies.rod) рисует main.js, здесь — всё поверх.
// Как выглядит каждое — по описанию биолога (design/zaplyv_vid_i_fizika.md, часть 1); цвет — из стиля игры (урок L020).
// c: a (клетка), lk (look.js), x, y, ang, ax, ay, half, w, z (масштаб), along(u, o), arc(u), body (soft.js), scr, time, pdt, run,
//    phageNear, foodNear, spacers, plasmid, cfg, alive (все твои клетки), glow, ink.
export function skin(c) {
  const { a, lk, x, y, ang, ax, ay, half, w, z, along, arc, body, scr, time, pdt, run, phageNear, foodNear, spacers, plasmid, cfg, alive, glow, ink } = c;
  const fc = cfg.flag.color, L = half - w, m = keep(a, alive);
  const at = (u, o) => along(u, o + arc(u / z));
  Object.assign(m, { id: a.id, x: a.x, y: a.y, ang, L: L / z, w: w / z, sx: x, sy: y }); // sx, sy — где тело нарисовано на экране (мягкое тело отстаёт от a.x на рывке)
  const pu = pulses.get(a.id); if (pu) { const P = V.pulse, k = pu.t / P.life, head = pu.from * (L + w) * (1 - 2 * k), bw = P.band * w; // от того конца, где сработало, к другому
    for (let i = 0; i < P.dots; i++) { const [u, o] = rim(i / P.dots, L, w), d = Math.abs(u - head); if (d > bw) continue; const [px, py] = at(u, o); glow.put(px, py, P.r * z + 1, ...P.color, 0.95 * (1 - d / bw) * Math.sin(Math.PI * k)); }
    for (let i = -2; i <= 2; i++) { const u = head + i * bw * 0.3; if (Math.abs(u) > L + w * 0.5) continue; const [px, py] = at(u, 0); glow.put(px, py, w * 0.5, ...P.color, 0.35 * Math.sin(Math.PI * k)); } } // свет идёт и внутри: стекло тела
  // Заражена фагом (биолог: «Вирус: впрыск», «Дальше»): снаружи плывёт как обычно, но тело мутнеет от середины,
  // крупинки замирают, жгутик сбивается с ритма; в последнюю четверть стенка натягивается — клетка вспухает перед прорывом.
  const ill = a.sick >= 0 ? Math.min(1, 1 - a.sick / cfg.sick) : 0, I = V.ill;
  m.tl += pdt * (1 - ill * 0.9);
  if (a.held > 0) { // красная запятая внутри (биолог: «шарик»): клетка округлилась, в ней растёт свёрнутая кольцом нить хищника, к концу делится на части
    const hb = Math.min(1, 1 - a.held / cfg.bdello_kill), n = Math.round(6 + 22 * hb), parts = hb > 0.75 ? cfg.bdello_brood : 1;
    for (let k = 0; k < n; k++) { const s = k / n, t = s * 6.283 * 1.3 + time * 0.6, r = w * (0.25 + 0.3 * s);
      if (parts > 1 && (s * parts) % 1 < 0.18) continue; // перехваты между будущими хищниками
      const [px, py] = at(Math.cos(t) * r * 0.9, Math.sin(t) * r * 0.7); ink.put(px, py, w * 0.11, 0.85, 0.3, 0.12, 0.55 + 0.3 * hb); }
  }
  if (ill > 0) {
    for (let k = 0; k < I.cloud; k++) { const t = k * 2.39996, r = Math.sqrt((k + 0.5) / I.cloud) * ill, [px, py] = at(Math.cos(t) * r * (half - w * 0.5), Math.sin(t) * r * w * 0.6); ink.put(px, py, w * 0.32, I.color[0], I.color[1], I.color[2], I.alpha * ill); }
    const sw = Math.max(0, (ill - 0.75) / 0.25), st = (4 * L + 2 * Math.PI * w) / 40; // вспухание: стенка отходит наружу и светлеет
    if (sw > 0) for (let k = 0; k < 40; k++) { const [u, o] = rim(k / 40, L + w * I.swell * sw * 0.5, w * (1 + I.swell * sw)), [px, py] = at(u, o); glow.put(px, py, st * (1.1 + 0.5 * sw), 0.75, 0.9, 1, 0.06 + 0.1 * sw); } // одна натянутая стенка, толще и светлее к прорыву
  }
  if (!lk.pili) for (let k = 0; k < 16; k++) { // пили: короткие ворсинки по всей оболочке (без гена фимбрий)
    const t = k / 16 * 6.283, c = Math.cos(t), s = Math.sin(t), l = 1 + 0.25 * Math.sin(time * 3 + k * 1.7 + a.id);
    for (let i = 0; i <= V.pili.n; i++) { const e = 1.04 + (1.32 * l - 1.04) * i / V.pili.n, u = c * (half - w * 0.2) + c * w * (e - 1), [px, py] = along(u, s * w * e + arc(u / z)); ink.put(px, py, (V.pili.r * z + 0.25) * (1 - 0.4 * i / V.pili.n), ...V.pili.col, V.pili.a); } // сплошная тонкая ворсинка, не две бусины (L047)
  }
  if (lk.halo) { // капсула: стеклянная плёнка — ровный светлый ободок и пустое кольцо до тела; не колышется. Ткнулся хищник — прогнулась и спружинила
    const C = V.capsule, dn = dents.map(d => { const [dx, dy] = scr(d.x, d.y), f = d.t / C.dent_t; return [dx, dy, C.dent * w * Math.exp(-f * 4) * Math.cos(f * 14)]; });
    const step = (4 * L + 2 * Math.PI * w * C.r) / C.dots; // шаг точек на контуре: точка шире шага — линия сплошная
    for (let k = 0; k < C.dots; k++) {
      const [u, o, nu, no] = rim(k / C.dots, L, w * C.r), sx = ax * nu - ay * no, sy = ay * nu + ax * no, hi = Math.max(0, -0.6 * sx - 0.8 * sy); // блик сверху-слева
      let [px, py] = at(u, o), push = 0;
      for (const [dx, dy, amp] of dn) { const q = Math.hypot(px - dx, py - dy); if (q < w * 2.5) push += amp * (1 - q / (w * 2.5)); }
      const [qx, qy] = at(u - nu * push, o - no * push);
      glow.put(qx, qy, step * 1.7, 0.75, 0.93, 1, C.edge * (0.6 + 0.9 * hi * hi));
      if (k % 2 === 0) { const [fx, fy] = at(u * 0.97 - nu * (push + w * (C.r - 1) * 0.5), o * 0.82 - no * push); glow.put(fx, fy, w * (C.r - 1) * 0.7, 0.75, 0.92, 1, C.fill); }
    }
  }
  if (lk.stripes) { // память о вирусах: у кормы внутри цепочка одинаковых бусин — по бусине за пережитый фаг (так мы показываем память)
    const C = V.crispr, n = Math.min(C.max, C.base + spacers);
    if (m.beads >= 0 && n > m.beads) m.grow = 0; m.beads = n; m.grow = Math.min(1, m.grow + pdt / C.grow);
    const lit = phageNear && spacers ? 0.5 + 0.25 * Math.sin(time * 4) : 0;
    for (let k = 0; k < n; k++) {
      const last = k === n - 1 && spacers ? m.grow : 1, u = -L + w * 0.1 + k * w * C.step, o = Math.sin(k * 1.1 + a.id) * w * 0.12 - w * 0.25, [px, py] = at(u, o);
      glow.put(px, py, (k < C.base ? 1.6 : 2.2) * z * last + 0.5, 0.7, 1, 0.8, (C.alpha + lit) * last + (1 - last) * 0.8); ink.put(px, py, 0.6 * z * last, 0.1, 0.3, 0.2, 0.5 * last);
    }
  }
  for (let k = 0; k < (lk.toxin ? V.toxin.n : 0); k++) { // ядовитое касание: длинные жёсткие нити CdiA с узелком на конце, медленно водят
    const T = V.toxin, [u, o, nu, no] = rim(k / T.n + a.id * 0.13, L, w), sw = Math.sin(time * 1.3 + k * 2.1) * 0.25, cu = nu - no * sw, co = no + nu * sw;
    for (let j = 1; j <= T.seg; j++) { const r = w * T.len * j / T.seg, [px, py] = at(u + cu * r, o + co * r); ink.put(px, py, w * T.len / T.seg * 0.75, 0.78, 0.66, 0.92, 0.6); }
    const r = w * (T.len + 0.08), [px, py] = at(u + cu * r, o + co * r); ink.put(px, py, 1.1 * z + 0.4, 0.35, 0.12, 0.4, 0.85);
  }
  for (let k = 0; k < (lk.pili ? V.fim.n : 0); k++) { // липучки: густая короткая щетина по всему телу, прямая, как булавки; прилип — вытянулась и дрожит в потоке
    const P = V.fim, n = P.n, len = w * P.len * (0.6 + 0.4 * ((k * 0.618) % 1)) * (a.stuck ? P.stuck : 1), [u, o, nu, no] = rim(k / n + 0.01, L, w * 0.96);
    const sh = a.stuck ? Math.sin(time * 25 + k * 3) * w * 0.03 : 0;
    for (let j = 0; j < P.seg; j++) { const f = j / (P.seg - 1), [px, py] = at(u + nu * len * f - no * sh * f, o + no * len * f + nu * sh * f); ink.put(px, py, Math.max(0.35 * z, len / P.seg * 0.6), 0.6, 0.86, 1, (a.stuck ? 0.7 : 0.5) * (1 - f * 0.4)); } // штрих: точки внахлёст
  }
  for (let k = 0; k < (lk.studs ? V.lock.n : 0); k++) { // сменил замок: на одном боку бледно-голубые «зрачки» — новые поры; фагу T4 не за что зацепиться
    const D = V.lock, u = (k - (D.n - 1) / 2) * L * D.gap, o = w * 0.8, [cx, cy] = at(u, o);
    for (let i = 0; i < 6; i++) { const t = i * 1.047, [px, py] = [cx + Math.cos(t) * w * 0.26, cy + Math.sin(t) * w * 0.26]; ink.put(px, py, w * 0.08, 0.1, 0.22, 0.4, 0.65); }
    glow.put(cx, cy, w * 0.16, 0.7, 0.9, 1, 0.45);
  }
  if (plasmid && !a.g) for (let k = 0; k < 12; k++) { const t = k / 12 * 6.283 + time * 0.8, [px, py] = along(Math.cos(t) * w * 0.35 + w * 0.3, Math.sin(t) * w * 0.35); glow.put(px, py, 0.9 * z + 0.4, 1, 0.95, 0.6, 0.7); } // плазмида: колечко ДНК, теперь и ты донор
  if (lk.dormant) for (let k = 0; k < 6; k++) { const [px, py] = at(-L - w * 0.4 + (k % 3) * w * 0.18 + (k > 2 ? w * 0.09 : 0), ((k % 3) - 1) * w * 0.2 + (k > 2 ? w * 0.12 : -w * 0.05)); ink.put(px, py, w * 0.15, 0.09, 0.06, 0.2, 0.9); } // ген сна: у кормы тёмные плотные зёрна, без свечения
  m.smell += ((foodNear ? 1 : 0) - m.smell) * Math.min(1, pdt / V.sense.ease); // нюх разгорается и гаснет плавно, без мигания
  for (let k = 0; k < (lk.receptors ? V.sense.n : 0); k++) { // чутьё: на носу шапка рецепторов правильной сеткой; у еды мягко светится
    const r = (k % 3) - 1, q = Math.floor(k / 3) - 1, [px, py] = at(L + w * (0.72 - 0.12 * Math.abs(q)) + (r ? 0 : w * 0.06), q * w * 0.2 + r * w * 0.07);
    ink.put(px, py, w * 0.07, 0.95, 0.72, 0.4, 0.55 + 0.3 * m.smell);
  }
  if (lk.receptors && m.smell > 0.02) { const [px, py] = at(L + w * 0.7, 0); glow.put(px, py, w * 0.55, 1, 0.7, 0.35, 0.22 * m.smell * (0.9 + 0.1 * Math.sin(time * 3))); } // у еды — тёплый тусклый огонёк
  const R = V.grain, fast = lk.ribosomes > cfg.look.ribosomes[0], jit = (fast ? R.jit_fast : R.jit) * w * (1 - ill), tl = m.tl; // крупинки внутри всегда мелко дрожат; у сытой — живее
  const J = (k, s) => Math.sin(time * 31 + k * 7.1 + s) * jit + Math.sin(time * 17 + k * 3.3) * jit * 0.6;
  for (let k = 0; k < (fast ? R.fast_n : lk.ribosomes); k++) { // рибосомы: розовые зёрна; быстрый рост — содержимое гуще и зернистее, темнее
    const t = k * 2.4 + a.id, u = Math.sin(t + tl * 0.2) * (half - w * 0.8), [px, py] = at(u + J(k, 0), Math.cos(t * 1.7 + tl * 0.25) * w * 0.45 + J(k, 2));
    if (fast) ink.put(px, py, 1.3 * z + 0.4, 0.42, 0.06, 0.3, 0.6); else glow.put(px, py, 1.6 * z + 0.6, 1, 0.35, 0.75, 0.35);
  }
  for (let k = 0; k < 4; k++) { // зёрна плывут внутри
    const t = tl * (0.5 + k * 0.17) + a.id * 1.3 + k * 2.1, u = Math.sin(t) * (half - w * 0.6), [px, py] = at(u + J(k, 5), Math.cos(t * 1.3) * w * 0.4 + J(k, 7));
    ink.put(px, py, 0.9 * z + 0.7, 0.85, 1, 0.95, 0.5);
  }
  mutSkin({ a, lk, ink, glow, at, w, L, half, z, time, pdt, ill }); // новые мутации (mutacii.js, третий строитель)
  // Жгутики (по книге, «Движение»; Berg, «E. coli in Motion»). Состояние у каждой клетки своё и меняется плавно, без щелчков:
  // b — насколько нити собраны в пучок за кормой, fan — насколько пучок разлетелся веером в кувырке, ph — угол вращения моторов.
  // На ходу: пучок-штопор за кормой, по нему бежит спиральная волна, в повороте пучок запаздывает по следу тела.
  // Кувырок: моторы переключаются, пучок за долю секунды расходится веером; у части нитей спираль сжимается: шаг и размах вдвое меньше (биолог).
  // Покой: нити расходятся от боков, вяло колышутся и дрожат от ударов молекул воды; пучок собирается ~полсекунды.
  const F = whips(a, run, pdt, lk.beat * (1 - ill * 0.6 * (0.5 + 0.5 * Math.sin(time * 7 + a.id))), cfg, alive); // заражённая сбивается с ритма
  const mid = (lk.flagella - 1) / 2, sp5 = 5 / lk.flagella, B = F.b, P = F.fan, sb = Math.sin(ang), cb = Math.cos(ang);
  for (let f = 0; f < lk.flagella; f++) {
    const t0 = lk.flagella === 1 ? Math.PI : f * 6.283 / lk.flagella + 0.6 + a.id, c0 = Math.cos(t0), s0 = Math.sin(t0); // место мотора на боку (жгутики по всему телу); один хвост — на корме, как у вибриона
    const [rx0, ry0] = along(c0 * (half - w * 0.5), s0 * w * 0.9), l0 = Math.hypot(c0 * 1.2 - 0.8, s0 * 1.8) || 1;
    const rdx = (ax * (c0 * 1.2 - 0.8) - ay * s0 * 1.8) / l0, rdy = (ay * (c0 * 1.2 - 0.8) + ax * s0 * 1.8) / l0; // в покое — вбок и чуть назад
    const [sx0, sy0] = along(-half + w * 0.3, (f - mid) * w * 0.22 * sp5 + arc(half / z)), spread = (f - mid) * 0.6 * sp5;
    const fdx = -Math.cos(ang + spread), fdy = -Math.sin(ang + spread), curl = P * (f % 3 === 1 ? 1 : 0.25); // в кувырке нить меняет форму спирали
    const ph = F.ph + f * 0.5, slow = F.t * 0.6 + f * 1.7;
    for (let k = 1; k <= V.whip.n; k++) { // нить сплошная: точки гуще своего размера, не бусы (L047)
      const s = k / V.whip.n, grow = Math.min(1, s * 3);
      // покой: от бока наружу, медленная волна + броуновская дрожь
      let xr = 0, yr = 0, xt = 0, yt = 0;
      if (B < 0.995) { const Lr = s * w * 5.2, wr = (Math.sin(s * 7 - ph * 0.3) * 0.3 + Math.sin(s * 3 + slow) * 0.35 + Math.sin(s * 11 - slow * 2.3) * 0.08) * w * grow;
      xr = rx0 + rdx * Lr - rdy * wr; yr = ry0 + rdy * Lr + rdx * wr; }
      if (B > 0.005) { // считаем только те формы, которые сейчас видны: цена кадра та же
      // пучок: по следу тела за кормой, нити сходятся, спиральная волна бежит назад
      const back = s * w * 7, [qx, qy] = scr(...body.at(2 * half / z + back / z)), [ux2, uy2] = scr(...body.at(2 * half / z + back / z + 2));
      const tl = Math.hypot(ux2 - qx, uy2 - qy) || 1, nx = -(uy2 - qy) / tl, ny = (ux2 - qx) / tl, off = (f - mid) * sp5 * w * 0.22 * (1 - s * 0.9);
      const wb = Math.sin(s * 10 - ph) * w * 0.42 * grow;
      const xb = qx - ay * off + nx * wb, yb = qy + ax * off + ny * wb;
      // веер: от кормы каждая нить в свою сторону, кудрявые — частой спиралью
      const bs = s * w * 5.8, wf = Math.sin(s * (10 + 10 * curl) - ph) * w * (0.42 - 0.21 * curl) * grow;
      const xf = sx0 + fdx * bs - fdy * wf, yf = sy0 + fdy * bs + fdx * wf;
      xt = xb + (xf - xb) * P; yt = yb + (yf - yb) * P; }
      glow.put(xr + (xt - xr) * B, yr + (yt - yr) * B, (0.8 * Math.max(z, 0.7) + 0.3) * (1 - s * 0.45), fc[0], fc[1], fc[2], cfg.flag.alpha * V.whip.a * (1 - s * 0.6)); // нить в цвете оболочки: светло-голубая, тоньше и прозрачнее к концу
    }
  }
}

// Знак гена на сопернице (zhizn.js, С27: соседка научила её): тот же вид, что на твоей клетке, проще — ободок шубы, нити яда, бусины памяти.
// main.js зовёт там, где рисует соперниц: marks(q, { scr, z, glow, ink }).
export function marks(q, d) {
  const g = q.genes; if (!g) return; const { scr, z, glow, ink } = d, N = V.sosed.strain, L = N.L, w = N.w, ca = Math.cos(q.a || 0), sa = Math.sin(q.a || 0);
  const P = (u, o) => scr(q.x + ca * u - sa * o, q.y + sa * u + ca * o);
  if (g.capsule) for (let i = 0; i < 28; i++) { const [u, o] = rim(i / 28, L, w * V.capsule.r), [x, y] = P(u, o); glow.put(x, y, 2 * z, 0.6, 0.9, 1, 0.3); }
  if (g.toxin) for (let f = 0; f < 4; f++) { const [u0, o0, nu, no] = rim(f / 4 + 0.12, L, w); for (let k = 1; k <= 5; k++) { const s = k / 5 * w * V.toxin.len, [x, y] = P(u0 + nu * s, o0 + no * s); ink.put(x, y, (k === 5 ? 1.4 : 0.8) * z, 0.95, 0.5, 0.3, 0.8); } }
  if (g.crispr) for (let i = 0; i < 3; i++) { const [x, y] = P(-L * 0.6 + i * w * 0.35, 0); ink.put(x, y, 1.3 * z, 0.7, 1, 0.6, 0.8); }
}

// Деление (Роман 25.11: «расширялась и делилась, разъезжалась»; «почему мы не починили деление клеток?»). sim.js ставит мать и дочку
// на новые места мгновенно; здесь деление как у кишечной палочки: сначала рисуется сама мать, перетяжка посередине стягивается
// до конца, а сама она вытягивается в палочку двойной длины толщиной с дочку; в миг, когда перемычка стянулась, её заменяют
// две дочки — ровно её половинки, торец к торцу; дальше они расходятся вдоль оси, зазор открывается от нуля, и в конце клетка мягко отдаётся своему месту.
// fx.on('split') зовёт splitAt(мать, дочка); main.js рисует клетку по birth(...): место, угол, длина и толщина, перетяжка, hide.
const pairs = new Map();
export function splitAt(mom, kid) { if (mom && kid && born.get(mom)?.kid !== kid) pairs.set(mom, { kid, t: null }); } // повторный вызов той же пары не перезапускает деление
// ang, hd, wr, cx, cy — как дочка нарисовалась бы сама: угол, полудлина и полуширина в мире, центр; hm, wm — полудлина и полуширина матери.
export function birth(a, time, all, ang, hd, wr, cx, cy, hm, wm) {
  const P = V.split;
  for (const [mom, q] of pairs) if (q.t === null) { const A = all.find(c => c.id === mom), B = all.find(c => c.id === q.kid); pairs.delete(mom);
    if (!A || !B) continue; const mx = (A.x + B.x) / 2, my = (A.y + B.y) / 2, ax = Math.atan2(A.y - B.y, A.x - B.x); // ось деления — как разошлись в мире
    let a0 = ang - ax; a0 = Math.atan2(Math.sin(a0), Math.cos(a0)); if (a0 > Math.PI / 2) a0 -= Math.PI; if (a0 < -Math.PI / 2) a0 += Math.PI; // палочка симметрична: ближний к оси разворот
    const g = { t: time, mx, my, ang: ax, a0, lead: mom, kid: q.kid }; born.set(mom, { ...g, s: 1 }); born.set(q.kid, { ...g, s: -1 }); }
  const b = born.get(a.id); if (!b) return null;
  const k = (time - b.t) / P.slide; if (k >= 1 || k < 0) { born.delete(a.id); return null; }
  const sm = u => u * u * (3 - 2 * u);
  if (k < P.join) { const q = sm(k / P.join); // мать вытягивается в палочку двойной длины толщиной с дочку, стягивается посередине и плавно ложится на ось деления
    return a.id === b.lead ? { x: b.mx, y: b.my, ang: b.ang + b.a0 * (1 - q), fl: hm / hd + (2 - hm / hd) * q, fw: wm / wr + (1 - wm / wr) * q, pinch: P.pinch + (1 - P.pinch) * q, sag: 0 } : { hide: true }; }
  const u = (k - P.join) / (1 - P.join), fl = 1, fw = 1, sep = hd * (1 + P.gap * (1 - (1 - u) ** 3)); // половинки матери = дочки торец к торцу, зазор от нуля с замедлением
  const tx = b.mx + Math.cos(b.ang) * sep * b.s, ty = b.my + Math.sin(b.ang) * sep * b.s, m = u < P.free ? 0 : sm((u - P.free) / (1 - P.free)); // в конце мягко отдаём клетку её месту
  const da = Math.atan2(Math.sin(ang - b.ang), Math.cos(ang - b.ang));
  return { x: tx + (cx - tx) * m, y: ty + (cy - ty) * m, ang: b.ang + da * m, fl, fw, pinch: 0, sag: m };
}
// Акантамёба по образцам Романа (ref_amoeba_1..3): полупрозрачное желтоватое тело неправильной формы, во все стороны тонкие острые шипики
// (акантоподии — от них имя), внутри крупное круглое ядро-«стекло» и розовые пузырьки-вакуоли. Рисует main.js в цикле world.amoebas.
const hash = (i, k) => { const v = Math.sin(i * 127.1 + k * 311.7) * 43758.5453; return v - Math.floor(v); };
// Амёба сейчас ест (fx.engulf сообщает каждый кадр): в какую сторону обтекает и насколько (0..1).
const eats = new Map();
export function eating(id, ang, k) { if (eats.size > 32) eats.clear(); eats.set(id, { ang, k }); }
export function amoeba(c) {
  const { m, x, y, r, head, sp, time, z, glow, ink, bubbles, col } = c, A = V.amoeba, id = m.id || 0, hx = Math.cos(head), hy = Math.sin(head), mov = sp > 3 ? 1 : 0;
  const body = col || A.body, edge = col ? col.map(v => Math.min(1, v * 0.6 + 0.45)) : A.edge, eat = eats.get(id); eats.delete(id);
  const R = t => r * (A.core + A.lump * (Math.sin(t * 3 + id + time * 0.4) * 0.5 + Math.sin(t * 5 - id * 1.7 - time * 0.3) * 0.3 + Math.sin(t * 9 + id * 2.3) * 0.25) + A.lead * mov * Math.max(0, Math.cos(t - head)) ** 3) * (1 + A.flat * Math.cos(2 * (t - hash(id, 99) * 3.14))); // комковатый край, к ходу вытянут; тело сплюснуто, как на образцах
  for (let i = 0; i < A.fill; i++) { const t = i * 2.39996, q = Math.sqrt((i + 0.5) / A.fill), rr = R(t) * q * 0.95; ink.put(x + Math.cos(t) * rr, y + Math.sin(t) * rr, r * A.fill_r, ...body, A.fill_a); } // нутро: прозрачная желтизна
  for (let k = 0; k < A.veins; k++) { const ta = hash(id, k) * 6.283, tb = ta + 1.2 + hash(id, k + 9) * 2.5, bow = (hash(id, k + 5) - 0.5) * 0.6; // светлые складки мембраны: дуги поперёк тела, как сетка на образцах
    const ax = Math.cos(ta) * R(ta) * 0.9, ay = Math.sin(ta) * R(ta) * 0.9, bx = Math.cos(tb) * R(tb) * 0.9, by = Math.sin(tb) * R(tb) * 0.9;
    for (let i = 0; i <= A.vein_n; i++) { const f = i / A.vein_n, px = x + ax + (bx - ax) * f - (by - ay) * bow * f * (1 - f) * 2, py = y + ay + (by - ay) * f + (bx - ax) * bow * f * (1 - f) * 2; glow.put(px, py, 0.7 * z + 0.3, ...edge, A.vein_a * Math.sin(Math.PI * f)); } }
  for (let i = 0; i < A.rim; i++) { const t = i / A.rim * 6.283, rr = R(t); glow.put(x + Math.cos(t) * rr, y + Math.sin(t) * rr, 2.2 * z + 0.5, ...edge, A.rim_a * (0.6 + 0.4 * Math.sin(t * 7 + id))); } // светлый неровный край
  for (let k = 0; k < A.spikes; k++) { // шипики: тонкие, острые, чуть изогнуты, медленно шевелятся; к ходу длиннее. Шип — A.seg крупных налегающих точек (цена кадра, L015)
    const t = (k + 0.9 * hash(id, k)) / A.spikes * 6.283, base = R(t) * 0.92, ahead = Math.max(0, Math.cos(t - head)); let L = r * (A.spike_min + (A.spike_max - A.spike_min) * hash(id, k + 40)) * (1 + 0.5 * mov * ahead) * (0.85 + 0.15 * Math.sin(time * 1.3 + k * 2.1));
    const bend = (hash(id, k + 70) - 0.5) * A.bend + 0.12 * Math.sin(time * 0.9 + k), n = A.seg;
    if (eat) { const c = Math.max(0, Math.cos(t - eat.ang)); L *= 1 - eat.k * c ** 2; if (L < r * 0.05) continue; } // этим краем обтекает добычу — шипики втянуты
    for (let i = 0; i <= n; i++) { const f = i / n, a = t + bend * f * f + A.wave * f * Math.sin(f * 4 + hash(id, k + 80) * 6 + time * 0.5) * r / (base + L * f), d = base + L * f, px = x + Math.cos(a) * d, py = y + Math.sin(a) * d, w = Math.max(r * A.spike_w * (1 - f) ** A.taper, L / n * A.overlap * (1 - f * 0.7)) + 0.3 * z;
      ink.put(px, py, w, ...body, A.spike_a * (1 - f * 0.4)); const nx = -Math.sin(a) * w * 0.75, ny = Math.cos(a) * w * 0.75, gr = 0.5 * z + 0.25, ga = A.spike_glow * (1 - f * 0.5);
      glow.put(px + nx, py + ny, gr, ...edge, ga); glow.put(px - nx, py - ny, gr, ...edge, ga); } // стеклянный шип: светлые кромки по обоим краям, как на образцах
    if (hash(id, k + 55) < A.fork) { const f0 = 0.55, a0 = t + bend * f0 * f0, d0 = base + L * f0, side = hash(id, k + 56) < 0.5 ? -1 : 1, l2 = L * 0.4, m2 = Math.ceil(n / 2); // часть шипов ветвится
      for (let i = 1; i <= m2; i++) { const f = i / m2, a = a0 + side * 0.5 * f, px = x + Math.cos(a0) * d0 + Math.cos(a) * l2 * f, py = y + Math.sin(a0) * d0 + Math.sin(a) * l2 * f, w = Math.max(r * A.spike_w * 0.5 * (1 - f), l2 / m2 * A.overlap * (1 - f * 0.7)) + 0.3 * z;
        ink.put(px, py, w, ...body, A.spike_a * 0.8); } } }
  const nx = x - hx * r * 0.15 + hy * r * 0.1, ny = y - hy * r * 0.15 - hx * r * 0.1, nr = r * A.nucleus; // ядро: крупный голубовато-серый шар со стеклянным бликом
  ink.put(nx, ny, nr * 2, ...A.nuc, 0.55); for (let i = 0; i < 24; i++) { const t = i / 24 * 6.283; glow.put(nx + Math.cos(t) * nr, ny + Math.sin(t) * nr, 1.1 * z + 0.4, ...A.nuc_rim, 0.6); }
  for (let i = 0; i < 5; i++) glow.put(nx + (i - 2) * nr * 0.3, ny + Math.sin(i * 1.3) * nr * 0.35, 0.9 * z + 0.3, ...A.nuc_rim, 0.35); // складки ядра
  glow.put(nx - nr * 0.35, ny - nr * 0.35, nr * 0.35, 1, 1, 1, 0.35);
  for (let k = 0; k < A.vac; k++) { const t = hash(id, k + 90) * 6.283, d = r * (0.25 + 0.35 * hash(id, k + 91)), vr = r * (0.035 + 0.03 * hash(id, k + 92)), px = x + Math.cos(t) * d, py = y + Math.sin(t) * d; // розовые пузырьки
    ink.put(px, py, vr * 2, ...A.vac_col, 0.5); glow.put(px - vr * 0.3, py - vr * 0.3, vr * 0.6, 1, 1, 1, 0.45); }
  if (bubbles) { const v = (time / 6 + id * 0.37) % 1; bubbles.put(x - hx * r * 0.45 - hy * r * 0.2, y - hy * r * 0.45 + hx * r * 0.2, r * 0.16 * Math.sqrt(v) + 1, 0.95, 0.9, 1, 0.35 * (1 - v * v * v)); } // сократительная вакуоль: набухает и выплёскивает
}
// Коловратка как в жизни (биолог, «Вид существ» №2): на голове венец — два мерцающих полукруга ресничек, по ним бежит волна, и кажется,
// что колёса крутятся; по переднему краю панциря зубцы; сквозь прозрачное тело видны тёмная кишка и челюсти-мастакс, которые щёлкают.
export function roti(c) {
  const { tx, ty, vx, vy, L, w, pw, time, id, z, glow, ink, bite } = c, R = V.roti, P = (u, o) => [tx + vx * u - vy * o, ty + vy * u + vx * o];
  for (let i = 0; i < R.gut; i++) { const f = i / (R.gut - 1), [x, y] = P(L * (0.1 - 0.3 * f), Math.sin(f * 7 + id) * w * 0.12); ink.put(x, y, w * 0.18, ...R.gut_col, 0.35); } // кишка
  const speed = R.beat * (1 + R.beat_pw * pw), hu = L * 0.22;
  for (const s of [-1, 1]) { const cu = hu, co = s * w * 0.55, Rr = w * R.lobe; // венец: полукруг вперёд-наружу, по ресничкам бежит волна
    { const [x, y] = P(cu, co); glow.put(x, y, Rr * 2.2, ...R.cil_col, R.disc * (0.6 + 0.4 * pw)); } // мутный диск лопасти
    for (let k = 0; k < R.cilia; k++) { const a = -Math.PI / 2 * s * 0.2 + (k / (R.cilia - 1) - 0.5) * Math.PI * 1.25, ca = Math.cos(a), sa = Math.sin(a) * s;
      const wave = 0.5 + 0.5 * Math.sin(k * R.wave - s * time * speed), len = Rr * (R.len0 + R.len1 * wave);
      for (let j = 0; j < R.cil_dots; j++) { const d = Rr + len * j / (R.cil_dots - 1), [x, y] = P(cu + ca * d, co + sa * d); glow.put(x, y, (1.1 - j * 0.15) * z + 0.3, ...R.cil_col, (0.3 + 0.6 * wave) * (0.5 + 0.5 * pw) * (1 - j * 0.15)); } } }
  for (const s of [-1, 1]) for (let k = 0; k < R.teeth; k++) { const o = s * w * (0.8 + 0.18 * k), [bx, by] = P(hu - w * 0.2, o), [px, py] = P(hu + w * 0.25, o + s * w * 0.12); // зубцы по переднему краю панциря
    for (let j = 0; j <= 5; j++) { const f = j / 5; glow.put(bx + (px - bx) * f, by + (py - by) * f, (1.6 - f * 1.1) * z + 0.3, ...R.shell, 0.8); } }
  const open = bite > 0 ? Math.max(0, 1 - bite / R.snap) : 0.5 + 0.5 * Math.sin(time * (3 + 5 * pw) + id), ju = L * 0.1; // челюсти: две тёмные клешни, щёлк
  for (const s of [-1, 1]) for (let j = 0; j <= 6; j++) { const f = j / 6, ang = s * (0.25 + 0.6 * open) * (1 - f * 0.3), u = ju + Math.cos(ang) * w * 0.35 * f, o = Math.sin(ang) * w * 0.35 * f + s * w * 0.04 * f * f, [x, y] = P(u, o);
    ink.put(x, y, (1.6 - f * 0.8) * z + 0.4, ...R.jaw, 0.85); }
  if (open < 0.12) { const [x, y] = P(ju + w * 0.3, 0); glow.put(x, y, w * 0.35, 1, 0.95, 0.8, 0.5 * (1 - open / 0.12)); } // щелчок
}
// Колокольчик (сувойка) как в жизни (биолог, «Вид существ» №3; физика, п.5): испугался — стебель за один кадр сжимается в тугую спираль
// и подтягивает бокал к опоре, потом за V.bell.unfold плавно распрямляется. Пока он свёрнут, венец не работает (main.js, sim.js).
// Рисует стебель, возвращает, где на экране бокал, и насколько он раскрыт (1 — раскрыт).
export function bell(c) {
  const { x, y, dir, Ls, r, shut, time, id, z, ink } = c, B = V.bell, dx = Math.cos(dir), dy = Math.sin(dir);
  const coil = shut > 0 ? (shut > B.unfold ? 1 : shut / B.unfold) : 0, k = coil * coil * (3 - 2 * coil), len = Ls * (1 - (1 - B.short) * k); // плавно: быстрее в начале развёртки
  for (let i = 0; i <= B.dots; i++) { const f = i / B.dots, amp = r * B.amp * k + 2 * z * (1 - k), ph = f * B.turns * 6.283 * k + f * 5 + time * (1 - k), o = Math.sin(ph) * amp, u = len * f - Math.cos(ph) * amp * 0.35 * k; // спираль: виток на виток
    ink.put(x + dx * u - dy * o, y + dy * u + dx * o, (0.9 + 0.5 * k) * z + 0.4, ...B.col, 0.6 + 0.3 * k); }
  return [x + dx * len, y + dy * len, 1 - k];
}

// Лапы вируса (биолог, «Вид существ», вирус: «садится строго на лапы, перпендикулярно боку клетки, стоя как вышка»).
// Плывёт — шесть лап поджаты к хвосту и шевелятся. Сел (on) — лапы за V.legs.land с расставлены веером по борту:
// колено наружу, ступня на плёнке, все шесть ступней на одной линии поперёк хвоста. P(a, b): a — вдоль хвоста, b — поперёк.
export function phageLegs(c) {
  const { P, s, on, key, seed, time, ink } = c, L = V.legs, put = (p, r, a) => ink.put(p[0], p[1], r, ...L.col, a);
  const m = legs.get(key) || { k: 0, t: time }, k = Math.max(0, Math.min(1, m.k + (on ? 1 : -1) * Math.min(0.1, Math.max(0, time - m.t)) / L.land)); legs.set(key, { k, t: time });
  const e = k * k * (3 - 2 * k), base = 0.85 * s;
  for (let j = 0; j < 6; j++) {
    const sd = j < 3 ? -1 : 1, i = j % 3, wig = Math.sin(time * 9 + j + seed) * s * 0.15 * (1 - e);
    const kx = base + s * (0.35 + 0.15 * i), ky = sd * s * (0.7 + 0.4 * i), fx = base + s * (1.4 + 0.25 * i) + wig, fy = sd * s * (0.55 + 0.45 * i); // поджаты
    const lx = base + s * L.knee, ly = sd * s * (L.spread * (i + 1) * 0.55), gx = base + s * L.foot, gy = sd * s * L.spread * (i + 1); // веером на плёнке
    const K = [kx + (lx - kx) * e, ky + (ly - ky) * e], F = [fx + (gx - fx) * e, fy + (gy - fy) * e], A = [base, sd * 0.35 * s];
    for (let t = 0.2; t <= 1; t += 0.2) { put(P(A[0] + (K[0] - A[0]) * t, A[1] + (K[1] - A[1]) * t), s * L.w, L.a); put(P(K[0] + (F[0] - K[0]) * t, K[1] + (F[1] - K[1]) * t), s * L.w, L.a); }
    if (e > 0.5) put(P(F[0], F[1]), s * L.w * 1.8, L.a * e); // ступня-штифт на плёнке
  }
}
const legs = new WeakMap(); // по самому вирусу: у вирусов нет номера
const born = new Map();
