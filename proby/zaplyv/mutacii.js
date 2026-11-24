// Новые мутации «Заплыва» по каталогу биолога (design/zaplyv_mutacii_katalog.md): поведение и вид на теле.
// Свой файл третьего строителя; sim.js зовёт отсюда узкие крюки, vid.js — mutSkin(). Числа — mutacii.json.
// Имена и тексты генов — только книга (kniga/teksty_genov.json по ключу), здесь их нет.
//   snap  — №5 «разворот рывком»: на крутом повороте вместо кувырка короткий щелчок, ход почти не теряется (чужой ген, только по трубочке).
//   abort — №43 «умереть за своих»: заражённая клетка гибнет целой, вирусы из неё не выходят, сёстры живы.
//   gas   — №26 «пузырьки для подъёма»: отпустил палец — клетка сама медленно всплывает; с пузырьками плывёт чуть тяжелее (чужой ген).
//   door  — №17 «закрыть дверь»: яд кокка больше не щиплет, зато любая еда даёт меньше.
//   flu   — Г24 «Сцепка» (Роман 24.11, «чтобы бактерии держались с друг другом вместе»): сёстры держатся плотом, между ними застёжки;
//           маленькие рты плот не берут, плот поворачивает лениво, вирус в плоту переходит на соседок, кувырок рассыпает плот. Живёт и в обычном заплыве.
//   decoy — №14 «обманки»: за клеткой тянутся пузырьки её оболочки; вирус садится на пузырёк и гибнет с ним. Каждый пузырёк — кусочек сил.
const url = new URL('./mutacii.json', import.meta.url);
export const M = url.protocol === 'file:' ? JSON.parse((await import('node:fs')).readFileSync(url, 'utf8')) : await (await fetch(url)).json();

// Гены мутаций — в общий список генов мира (один раз на cfg). Ключ → латинское имя, как в data.json genes.
export function addGenes(cfg) {
  if (cfg._mut) return cfg; cfg._mut = true;
  const arr = Object.values(cfg.genes).some(Array.isArray); // старый вид data.json: ключ → [имя, что даёт]
  for (const [k, latin] of Object.entries(M.genes)) if (!cfg.genes[k]) cfg.genes[k] = arr ? [latin, ''] : latin;
  return cfg;
}
// Прежние гены без мутаций (для «Ночи рода»: её ветки мутаций не знают).
export const base = cfg => Object.keys(cfg.genes).filter(g => !(g in M.genes));
const everywhere = g => (M.everywhere || []).includes(g);
// Имена и «что даёт» — из книги (kniga/teksty_genov.json по klyuch), пока data.json держит гены как [имя, что даёт].
export function names(cfg, GENY) {
  if (!Object.values(cfg.genes).some(Array.isArray)) return;
  for (const c of Object.values((GENY && GENY.geny) || {})) if (c.klyuch in M.genes) cfg.genes[c.klyuch] = [c.imya, c.daet];
}
// Мутации живут только в режиме «Мутации» (Роман 24.11: «Мы тестируем разные режимы!»); обычный заплыв как был.
const on = w => w.mode === 'mut';
const has = (w, g) => (on(w) || everywhere(g)) && !!w.genes[g];
const fresh = (w, list) => list.filter(g => !w.genes[g]);
// Из чего выбирают дочки при делении. В режиме — сначала новые мутации (кроме чужих), потом прежние гены.
export function pool(w) {
  const old = Object.keys(w.cfg.genes).filter(g => !(g in M.genes) || everywhere(g));
  if (!on(w)) return old;
  const mine = fresh(w, Object.keys(M.genes).filter(g => !M.pipe.includes(g)));
  return mine.length ? mine : old;
}
// Что передаёт по трубочке золотистая соседка. В режиме — сначала чужие мутации.
export function pipe(w) {
  const base = w.cfg.plasmid_genes;
  if (!on(w)) return base;
  const mine = fresh(w, M.pipe);
  return mine.length ? mine : base;
}

// Крутой поворот (sim.js, вместо кувырка). true — щелчок: кувырка нет, поворот быстрый, ход сохраняется.
export function snap(w, a) {
  // Рассыпать плот кувырком (книга Г24) пока не делаем: кувырок идёт на каждом крутом повороте пальца, и плот рвался бы при каждом зигзаге.
  if (!has(w, 'snap') || (a.snapCool || 0) > w.stats.time) return false;
  a.snap = M.snap.time; a.snapCool = w.stats.time + M.snap.time + M.snap.cool;
  w.events.push(['snap', a.x, a.y, a.a]); return true;
}
// Пока идёт щелчок: скорость поворота и разгон — щелчка, тяга почти полная.
export const turnRate = (w, a, base) => a.snap > 0 ? M.snap.turn : base * (raft(w) ? M.flu.turn : 1); // плот поворачивает лениво
export const acc = (a, base) => a.snap > 0 ? M.snap.acc : base;
// Множитель тяги: газовые пузырьки занимают место — клетка плывёт чуть тяжелее.
export const thrust = (w, a) => (has(w, 'gas') ? M.gas.drag : 1) * (a.snap > 0 ? M.snap.keep : 1);

// Шаг клетки после движения: щелчок гаснет; с пузырьками без тяги — всплытие вверх (к плёнке), бесплатно.
// Сцепка держит плот: есть ген, сестёр больше одной и плот не рассыпан кувырком.
export const raft = w => has(w, 'flu') && w.me.length > 1 && !((w.raftOff || 0) > w.stats.time);
export function cell(w, a, dt, th) {
  if (raft(w) && !a.grab) { // застёжки: каждая сестра тянется к середине плота, пока не встанет бок о бок
    const c = w.center(), dx = c.x - a.x, dy = c.y - a.y, d = Math.hypot(dx, dy), rest = 13 * Math.sqrt(a.m) * Math.sqrt(w.me.length) * M.flu.pack; // плот плотный: бок о бок, как соты
    if (d > rest) { const k = Math.min(1, M.flu.k * dt) * (d - rest) / d; a.x += dx * k; a.y += dy * k; }
    const rs = 13 * Math.sqrt(a.m) * M.flu.sep; // но не налезают: палочка длинная, круг тесен — держим расстояние в длину палочки
    for (const b of w.me) { if (b === a) continue; const ex = a.x - b.x, ey = a.y - b.y, e = Math.hypot(ex, ey) || 0.01; if (e < rs) { const k = (rs - e) / e * Math.min(1, 6 * dt) * 0.5; a.x += ex * k; a.y += ey * k; } }
    let vx = 0, vy = 0; for (const b of w.me) { vx += b.vx; vy += b.vy; } const al = Math.min(1, M.flu.align * dt); // плывут как одно: ход сестры тянется к ходу плота
    a.vx += (vx / w.me.length - a.vx) * al; a.vy += (vy / w.me.length - a.vy) * al;
  }
  if (a.snap > 0) a.snap = Math.max(0, a.snap - dt);
  if (has(w, 'decoy') && !(a.spore > 0) && (a.ves = (a.ves || 0) + dt) > M.decoy.every) { // обманки: пузырёк отщипывается у кормы
    a.ves = 0; const r = 13 * Math.sqrt(a.m); a.m = Math.max(0.6, a.m - M.decoy.cost);
    (w.vesicles ||= []).push({ x: a.x - Math.cos(a.a) * r, y: a.y - Math.sin(a.a) * r, t: 0 });
    if (w.vesicles.length > M.decoy.max) w.vesicles.shift();
  }
  if (a === w.me[0] && w.vesicles) { for (const v of w.vesicles) v.t += dt; w.vesicles = w.vesicles.filter(v => v.t < M.decoy.life); }
  if (!has(w, 'gas')) return;
  const up = !th && !a.stuck && !(a.spore > 0) && !(w.genes.sense && w.food.some(f => Math.hypot(f.x - a.x, f.y - a.y) < w.cfg.sense_r)); // чует еду рядом — ждёт у неё, а не всплывает
  a.lift = (a.lift || 0) + ((up ? M.gas.up : 0) - (a.lift || 0)) * Math.min(1, M.gas.ease * dt); a.y -= a.lift * dt; // вода гасит любой ход, а пузырьки тянут вверх всё время
}

// Своя заражённая клетка дозрела (sim.js, перед лопанием). true — погибла тихо: целая, без вирусов и без облака.
export function burst(w, a) {
  if (raft(w) && !has(w, 'abort')) for (const b of w.me) if (b !== a && !(b.sick >= 0) && Math.hypot(b.x - a.x, b.y - a.y) < M.flu.r * 2 && w.r() < M.flu.spread) { b.sick = w.cfg.sick; w.events.push(['sick', b.x, b.y]); } // в плоту вирус садится на соседок вплотную
  if (!has(w, 'abort')) return false;
  const x = a.x, y = a.y, ang = a.a, m = a.m;
  w.lose(a, x, y, 'phage');
  if (w.me.indexOf(a) < 0) w.events.push(['abort', x, y, ang, m]); // спора могла спасти последнюю — тогда не гибель
  return true;
}

// Свободный вирус рядом с пузырьком-обманкой (sim.js, до поиска клетки). true — сел на пузырёк и погиб с ним.
export function decoy(w, g) {
  if (!has(w, 'decoy') || !w.vesicles) return false;
  const i = w.vesicles.findIndex(v => Math.hypot(v.x - g.x, v.y - g.y) < M.decoy.r);
  if (i < 0) return false;
  w.vesicles.splice(i, 1); g.gone = true; w.stats.decoy = (w.stats.decoy || 0) + 1; w.events.push(['cut', g.x, g.y]); return true;
}
// Пузырьки-обманки в воде (зовёт main.js рядом с fx.drawUnder): светлые колечки цвета оболочки, гаснут к концу жизни.
export function drawWorld({ w, scr, z, glow, ink }) {
  const safe = w.me.length >= Math.min(...Object.values(M.flu.min)), br = safe ? 1 : 0.45; // застёжки загораются, когда семья уже не по зубам мелкому рту (книга: порог виден)
  if (raft(w)) for (let i = 0; i < w.me.length; i++) for (let j = i + 1; j < w.me.length; j++) { // застёжки между соседками: тёмная кромка, поверх светлая черта
    const p = w.me[i], q = w.me[j], d = Math.hypot(p.x - q.x, p.y - q.y), ri = 13 * Math.sqrt(p.m), rj = 13 * Math.sqrt(q.m);
    if (d > ri + rj + M.flu.r * 0.6) continue;
    const ux = (q.x - p.x) / (d || 1), uy = (q.y - p.y) / (d || 1);
    for (let k = -1; k <= 1; k++) for (let s = 0; s <= 4; s++) { const f = ri + (d - ri - rj) * s / 4, ox = -uy * k * 5, oy = ux * k * 5;
      const [x, y] = scr(p.x + ux * f + ox, p.y + uy * f + oy); ink.put(x, y, 2.2 * z + 0.6, 0.08, 0.14, 0.22, 0.55); glow.put(x, y, 1.2 * z + 0.4, 0.55, 0.85, 1, 0.4 * br); }
  }
  for (const v of w.vesicles || []) { const [x, y] = scr(v.x, v.y), f = 1 - v.t / M.decoy.life, r = 2.2 * z + 1;
    for (let k = 0; k < 8; k++) { const t = k / 8 * 6.283; glow.put(x + Math.cos(t) * r, y + Math.sin(t) * r, 0.8 * z + 0.4, 0.55, 0.8, 0.95, 0.35 * f); }
    ink.put(x, y, r * 0.8, 0.2, 0.3, 0.45, 0.25 * f); }
}
// Пасть тянет сестру из плота (sim.js, grab). true — плот держит: сестёр рядом не меньше порога этой пасти.
export function raftHolds(w, a, who) {
  const need = M.flu.min[who]; if (!need || !raft(w)) return false;
  if (w.me.filter(b => Math.hypot(b.x - a.x, b.y - a.y) < M.flu.r * 2.5).length < need) return false;
  w.stats.raft = (w.stats.raft || 0) + 1;
  if (!((a.held0 || 0) > w.stats.time)) { a.held0 = w.stats.time + 1; w.events.push(['bump', a.x, a.y]); } // видно, что пасть сорвалась
  return true;
}
// Кокк щиплет ядом (sim.js). true — дверь закрыта: яд не вошёл.
export const shut = w => has(w, 'door');
// Множитель еды: закрытая дверь пропускает меньше.
export const food = w => has(w, 'door') ? M.door.food : 1;

// Что рисовать на теле (дополнение к look.js).
export function mutLook(genes) {
  return { ...(genes.snap ? { flagella: M.snap.look } : {}), snap: !!genes.snap, gas: genes.gas ? M.gas.n : 0, abort: !!genes.abort, door: !!genes.door, decoy: !!genes.decoy, flu: genes.flu ? M.flu.pins : 0 };
}

// Вид мутаций на теле плывущей клетки (зовёт vid.js skin()). Цвет — из палитры клетки, без чистого белого (урок L020).
export function mutSkin({ a, lk, ink, glow, at, w, L, time }) {
  if (lk.gas) for (let k = 0; k < lk.gas; k++) { // газовые пузырьки: жёсткие светлые веретёнца внутри, чуть покачиваются
    const u = (k / (lk.gas - 1 || 1) - 0.5) * L * 1.6, o = (k % 2 ? 1 : -1) * w * 0.28 + Math.sin(time * 1.3 + k) * w * 0.03;
    for (let j = -2; j <= 2; j++) { const [px, py] = at(u + j * w * 0.09, o); ink.put(px, py, w * 0.16, 0.62, 0.8, 0.9, 0.55); }
    const [cx, cy] = at(u, o); glow.put(cx, cy, w * 0.2, 0.55, 0.75, 0.9, 0.08);
  }
  if (lk.door) { // закрытая дверь: на нижнем боку тёмный зрачок с плотным краем
    for (let k = 0; k < 10; k++) { const t = k / 10 * 6.283, [px, py] = at(L * 0.2 + Math.cos(t) * w * 0.16, -w * 0.78 + Math.sin(t) * w * 0.11); ink.put(px, py, w * 0.09, 0.12, 0.16, 0.26, 0.85); }
    const [cx, cy] = at(L * 0.2, -w * 0.78); ink.put(cx, cy, w * 0.14, 0.05, 0.07, 0.12, 0.9);
  }
  if (lk.abort) for (let k = 0; k < 6; k++) { // умереть за своих: у носа тёмная перемычка — замок, который выключит заражённую
    const [px, py] = at(L + w * 0.35, (k / 5 - 0.5) * w * 1.1); ink.put(px, py, w * 0.12, 0.3, 0.12, 0.2, 0.7);
  }
  if (lk.decoy) for (let k = 0; k < 8; k++) { // обманки: у кормы на оболочке набухают пузырьки, вот-вот отщипнутся
    const t = k / 8, [px, py] = at(-L - w * 0.55 + Math.sin(time * 2 + k) * w * 0.05, (t - 0.5) * w * 1.3); glow.put(px, py, w * 0.12, 0.55, 0.8, 0.95, 0.3); }
  for (let k = 0; k < (lk.flu || 0); k++) { // сцепка: по бокам короткие светлые застёжки-зубчики, торчат наружу
    const s = k % 2 ? 1 : -1, u = ((k >> 1) / ((lk.flu >> 1) - 1 || 1) - 0.5) * L * 1.4;
    for (let j = 0; j < 3; j++) { const [px, py] = at(u, s * (w * 0.95 + j * w * 0.12)); ink.put(px, py, w * 0.1, 0.08, 0.14, 0.22, 0.5); glow.put(px, py, w * 0.07, 0.55, 0.85, 1, 0.35); } }
  if (lk.snap && a.snap > 0) { const [px, py] = at(-L - w, 0); glow.put(px, py, w * 0.6, 0.6, 0.8, 1, 0.15 * a.snap / M.snap.time); } // щелчок: вспышка у кормы, где подломился хвост
}
