// Новые мутации «Заплыва» по каталогу биолога (design/zaplyv_mutacii_katalog.md): поведение и вид на теле.
// Свой файл третьего строителя; sim.js зовёт отсюда узкие крюки, vid.js — mutSkin(). Числа — mutacii.json.
// Имена и тексты генов — только книга (kniga/teksty_genov.json по ключу), здесь их нет.
//   snap  — №5 «разворот рывком»: на крутом повороте вместо кувырка короткий щелчок, ход почти не теряется (чужой ген, только по трубочке).
//   abort — №43 «умереть за своих»: заражённая клетка гибнет целой, вирусы из неё не выходят, сёстры живы.
//   gas   — №26 «пузырьки для подъёма»: отпустил палец — клетка сама медленно всплывает; с пузырьками плывёт чуть тяжелее (чужой ген).
//   door  — №17 «закрыть дверь»: яд кокка больше не щиплет, зато любая еда даёт меньше.
//   flu   — Г24 «Сцепка» (Роман 24.11, «чтобы бактерии держались с друг другом вместе»): сёстры держатся плотом, между ними застёжки;
//           маленькие рты плот не берут, плот поворачивает лениво; вирус сел на одну — заболевает и соседняя. Живёт и в обычном заплыве.
//   steady — Г34 «Крепче жгут»: кувырок только на совсем крутом повороте и короче; остальные повороты — дугой на ходу, след без остановок. На корме тугой жгут.
//   citrate — Г35 «Ест голубую еду» (опыт Ленски): в капле режима голубые точки, которых никто не ест; с геном они твоя еда.
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
// Режим «Голод» (Роман 25.11 08:47: «Да отдельным режимом давай попробуем»): клетка без еды худеет; его умения — M.golod.genes.
const hungry = w => w.mode === 'golod';
const mutMode = w => w.mode === 'mut' || w.mode === 'evo'; // в «Эволюции» (evo.js) все умения тоже живут
const own = (w, g) => M.golod.genes.includes(g) ? hungry(w) : mutMode(w);
const on = w => mutMode(w) || hungry(w);
const has = (w, g) => (own(w, g) || everywhere(g)) && !!w.genes[g];
// Уровни (З1, З5): то же умение может прийти ещё раз, пока уровень ниже M.levels[g]. Первый приход — уровень 1.
export const lvl = (w, g) => w.genes[g] ? Math.max(1, (w.lvl || {})[g] || 0) : 0;
export const more = (w, g) => g in M.levels && own(w, g) && lvl(w, g) < M.levels[g];
export function up(w, g) { if (!(g in M.levels)) return; const n = (w.lvl ||= {})[g] = lvl(w, g) + 1; // sim.js pick: до того, как ген встал
  for (const c of ((M.combo || {})[g] || [])[n - 1] || []) { w.genes[c] = true; (w.from ||= {})[c] = 'kid'; } } // объединённое умение: ступень включает прежний ген
const parts = w => w.mode === 'mut' ? Object.entries(M.combo || {}).filter(([k]) => k !== '_').flatMap(([, v]) => v.flat()) : []; // в режиме прежние гены идут только ступенями
export const daet = (w, g, book) => (g in M.levels && book['uroven' + (lvl(w, g) + 1)]) || book.daet || ''; // на карточке дочки — текст следующего уровня из книги
const fresh = (w, list) => list.filter(g => !w.genes[g] || more(w, g));
// Из чего выбирают дочки при делении. В режиме — одна новая мутация (кроме чужих) и одно прежнее умение.
export function pool(w) {
  const old = Object.keys(w.cfg.genes).filter(g => !(g in M.genes) || everywhere(g));
  if (!on(w)) return old;
  const ok = g => !w.offer || w.offer(g), one = l => l.length ? [l[Math.floor(w.r() * l.length)]] : [];
  const no = parts(w), mine = fresh(w, Object.keys(M.genes).filter(g => !M.pipe.includes(g) && own(w, g) && !no.includes(g))).filter(ok), was = old.filter(g => !w.genes[g] && ok(g) && !no.includes(g));
  return [...one(mine), ...one(was)]; // одна дочка — с новой мутацией, другая — с прежним умением (прогон 0.61, О43: «Ядовитое касание» и «Запасная жизнь» не выпадали)
}
// Что передаёт по трубочке золотистая соседка. В режиме — сначала чужие мутации.
export function pipe(w) {
  const base = w.cfg.plasmid_genes;
  if (w.mode !== 'mut') return base;
  const mine = fresh(w, M.pipe);
  return mine.length ? mine : base;
}

// Крутой поворот (sim.js, вместо кувырка). true — щелчок: кувырка нет, поворот быстрый, ход сохраняется.
export function snap(w, a) {
  // Рассыпать плот кувырком (книга Г24) пока не делаем: кувырок идёт на каждом крутом повороте пальца, и плот рвался бы при каждом зигзаге.
  if (!has(w, 'snap') || (a.snapCool || 0) > w.stats.time) return false;
  a.snap = M.snap.time; a.snapCool = w.stats.time + M.snap.time + M.snap.cool;
  w.events.push(['snap', a.x, a.y, a.a, 'turn']); return true; // 'turn' — это разворот клетки, а не сувойка: fx рисует знак рывка
}
// Крепче жгут (sim.js, крутой поворот): порог кувырка выше, сам кувырок короче, ход в нём теряется меньше.
export const tumbleAngle = (w, base) => has(w, 'steady') ? Math.min(Math.PI * 0.95, base * M.steady.angle) : base;
export const tumbleTime = (w, base) => has(w, 'steady') ? base * M.steady.time : base;
export const tumbleKeep = (w, a) => a.tumble && has(w, 'steady') ? M.steady.keep : 1;
// Пока идёт щелчок: скорость поворота и разгон — щелчка, тяга почти полная.
export const turnRate = (w, a, base) => a.snap > 0 ? M.snap.turn : base * (raft(w) ? M.flu.turn : 1) * (!a.tumble && has(w, 'steady') ? M.steady.turn : 1) * (a.mag && a.pulled && a.pulled.length ? M.magnet.lvl[a.mag - 1].turn : 1) * (a.boost > 0.5 ? M.tail.wide : 1); // на разгоне хвоста поворот шире; // пока еда плывёт к клетке, поворот медленнее (цена магнита); плот поворачивает лениво; тугой жгут доворачивает на ходу
export const acc = (a, base) => a.snap > 0 ? M.snap.acc : base;
// Множитель тяги: газовые пузырьки занимают место — клетка плывёт чуть тяжелее.
export const thrust = (w, a) => (1 + (M.tail.boost - 1) * (a.boost || 0)) * (has(w, 'gas') ? M.gas.drag : 1) * (a.snap > 0 ? M.snap.keep : 1) * tumbleKeep(w, a);

// Шаг клетки после движения: щелчок гаснет; с пузырьками без тяги — всплытие вверх (к плёнке), бесплатно.
// Сцепка держит плот: есть ген, сестёр больше одной и плот не рассыпан кувырком.
export const raft = w => has(w, 'flu') && w.me.length > 1 && !((w.raftOff || 0) > w.stats.time);
export function cell(w, a, dt, th) {
  if (raft(w) && !a.grab) { // застёжки: каждая сестра тянется к середине плота, пока не встанет бок о бок
    const c = w.center(), dx = c.x - a.x, dy = c.y - a.y, d = Math.hypot(dx, dy), rest = 13 * Math.sqrt(a.m) * Math.sqrt(w.me.length) * M.flu.pack; // плот плотный: бок о бок, как соты; дальнюю (застряла, унесло) застёжки не тянут
    if (d > rest && d < M.flu.reach) { const k = Math.min(1, M.flu.k * dt) * (d - rest) / d; a.x += dx * k; a.y += dy * k; }
    const rs = 13 * Math.sqrt(a.m) * M.flu.sep; // но не налезают: палочка длинная, круг тесен — держим расстояние в длину палочки
    for (const b of w.me) { if (b === a) continue; const ex = a.x - b.x, ey = a.y - b.y, e = Math.hypot(ex, ey) || 0.01; if (e < rs) { const k = (rs - e) / e * Math.min(1, 6 * dt) * 0.5; a.x += ex * k; a.y += ey * k; } }
    let vx = 0, vy = 0; for (const b of w.me) { vx += b.vx; vy += b.vy; } const al = Math.min(1, M.flu.align * dt); // плывут как одно: ход сестры тянется к ходу плота
    a.vx += (vx / w.me.length - a.vx) * al; a.vy += (vy / w.me.length - a.vy) * al;
  }
  if (a.snap > 0) a.snap = Math.max(0, a.snap - dt);
  if (hungry(w)) starve(w, a, dt);
  if (has(w, 'magnet')) magnet(w, a, dt);
  if (has(w, 'tail')) tail(w, a, dt, th);
  if (has(w, 'decoy') && !(a.spore > 0) && (a.ves = (a.ves || 0) + dt) > M.decoy.every) { // обманки: пузырёк отщипывается у кормы
    a.ves = 0; const r = 13 * Math.sqrt(a.m); a.m = Math.max(0.6, a.m - M.decoy.cost);
    (w.vesicles ||= []).push({ x: a.x - Math.cos(a.a) * r, y: a.y - Math.sin(a.a) * r, t: 0 });
    if (w.vesicles.length > M.decoy.max) w.vesicles.shift();
  }
  if (a === w.me[0] && w.mode === 'mut') citrate(w);
  if (has(w, 'citrate') && w.cit) for (const q of w.cit) if (!q.gone && Math.hypot(q.x - a.x, q.y - a.y) < 13 * Math.sqrt(a.m) + M.citrate.r) { // голубую точку съедает только клетка с геном
    q.gone = true; w.grow(a, M.citrate.food); w.stats.citrate = (w.stats.citrate || 0) + 1; w.fed(q.x, q.y, 1); } // как обычная еда: счёт «съедено», звук
  if (a === w.me[0] && w.refuse) { for (const g of w.refuse) g.t += dt; w.refuse = w.refuse.filter(g => g.t < M.door.flash); }
  if (a === w.me[0] && w.aborts) { for (const g of w.aborts) g.t += dt; w.aborts = w.aborts.filter(g => g.t < M.abort.show); }
  if (a === w.me[0] && w.vesicles) { for (const v of w.vesicles) v.t += dt; w.vesicles = w.vesicles.filter(v => v.t < M.decoy.life); }
  if (!has(w, 'gas')) return;
  const up = !th && !a.stuck && !(a.spore > 0) && !(w.genes.sense && w.food.some(f => Math.hypot(f.x - a.x, f.y - a.y) < w.cfg.sense_r)); // чует еду рядом — ждёт у неё, а не всплывает
  a.lift = (a.lift || 0) + ((up ? M.gas.up : 0) - (a.lift || 0)) * Math.min(1, M.gas.ease * dt); a.y -= a.lift * dt; // вода гасит любой ход, а пузырьки тянут вверх всё время
}

// Голод: каждая клетка тратит силы на жизнь. Сначала тают крупинки запаса, потом масса; ниже порога клетка гибнет.
// «Копит запас» (Г42): масса сверх over × порога деления уходит в крупинки (до n), поэтому делится чуть позже.
// «Дольше без еды» (Г40): выше small клетка худеет быстрее (fast), ниже — тратит в k раз меньше.
function starve(w, a, dt) {
  const G = M.golod, S = M.store, L = M.lean;
  if (has(w, 'store') && (a.store || 0) < S.n && a.m > w.split() * S.over) { a.m -= S.grain; a.store = (a.store || 0) + 1; w.stats.stored = (w.stats.stored || 0) + 1; }
  let burn = G.burn * dt;
  if (has(w, 'lean')) burn *= a.m > L.small ? L.fast : L.k;
  if (has(w, 'store') && a.store > 0) { a.storeLeft = (a.storeLeft ?? S.grain) - burn; if (a.storeLeft <= 0) { a.store--; a.storeLeft = S.grain; w.stats.melted = (w.stats.melted || 0) + 1; } return; }
  a.m -= burn;
  if (a.m < G.die) { w.stats.starved = (w.stats.starved || 0) + 1; w.lose(a, a.x, a.y, 'me'); }
}

// Пищевой магнит (З1): ближняя еда сама плывёт к клетке изогнутым ручейком. Уровень — радиус, сколько крупинок разом и как быстро.
// Съеденная так крупинка светится внутри (warm), серия поглощений звучит восходящими нотами (событие magnet с номером в серии).
function magnet(w, a, dt) {
  const Q = M.magnet, L = Q.lvl[lvl(w, 'magnet') - 1], r = 13 * Math.sqrt(a.m), R = L.r + r;
  a.mag = lvl(w, 'magnet'); a.pulled ||= [];
  for (const f of a.pulled) if (f.gone) { a.warm = Q.warm; a.series = (w.stats.time - (a.lastMag ?? -9) < Q.series ? a.series || 0 : 0) + 1; a.lastMag = w.stats.time;
    w.stats.magnet = (w.stats.magnet || 0) + 1; w.events.push(['magnet', f.x, f.y, a.series]); }
  a.pulled = a.pulled.filter(f => !f.gone && Math.hypot(f.x - a.x, f.y - a.y) < R * Q.let || (f.pull = null));
  for (const f of w.food) { if (a.pulled.length >= L.n) break;
    if (f.gone || (f.pull && f.pull !== a && w.me.includes(f.pull)) || a.pulled.includes(f) || Math.hypot(f.x - a.x, f.y - a.y) > R) continue;
    f.pull = a; f.side = w.r() < 0.5 ? 1 : -1; a.pulled.push(f); }
  if (a.pulled.length >= Q.cascade && !(a.casc > 0)) { a.casc = Q.hold; (w.waves ||= []).push({ x: a.x, y: a.y, r: R, t: 0 }); w.stats.cascade = (w.stats.cascade || 0) + 1; } // вся россыпь разом: волна по воде
  for (const f of a.pulled) { const dx = a.x - f.x, dy = a.y - f.y, d = Math.hypot(dx, dy) || 1, c = Q.curl * Math.min(1, d / R) * f.side, v = L.v * dt; // ручеёк закручивается и выпрямляется у самой клетки
    f.x += (dx - dy * c) / d * v; f.y += (dy + dx * c) / d * v; }
  if (a.warm > 0) a.warm = Math.max(0, a.warm - dt);
  if (a.casc > 0) a.casc = Math.max(0, a.casc - dt);
  if (a === w.me[0] && w.waves) { for (const q of w.waves) q.t += dt; w.waves = w.waves.filter(q => q.t < Q.wave); }
}

// Сильный хвост: уровень 3 — разгон на прямой; уровень 2 — в слизи за клеткой остаётся чистый коридор (виден).
function tail(w, a, dt, th) {
  const T = M.tail, turn = Math.abs(Math.atan2(Math.sin(a.a - (a.pa ?? a.a)), Math.cos(a.a - (a.pa ?? a.a)))) / (dt || 1); a.pa = a.a;
  if (lvl(w, 'tail') >= 3 && th && !a.tumble && turn < T.straight) a.run = (a.run || 0) + dt; else a.run = 0;
  a.boost = Math.min(1, (a.run || 0) / T.ramp); if (a.boost >= 1) w.stats.boost = (w.stats.boost || 0) + dt;
  if (lvl(w, 'tail') >= 2 && th && w.inSlime(a.x, a.y) && !((a.cor || 0) > w.stats.time)) { a.cor = w.stats.time + 0.15; (w.corridor ||= []).push({ x: a.x, y: a.y, a: a.a, t: 0 }); w.stats.corridor = (w.stats.corridor || 0) + 1; }
  if (a === w.me[0] && w.corridor) { for (const q of w.corridor) q.t += dt; w.corridor = w.corridor.filter(q => q.t < T.trail); }
}
// Цена хвоста: толстый жгут шумит — хищники замечают клетку дальше (sim.js: амёба и запятая ищут добычу).
export const loud = w => has(w, 'tail') ? M.tail.loud : 1;

// Память о вирусах (sim.js, вирус впрыснул): true — память сработала, обычного заражения нет.
// Память о вирусах: вирус клетку уже не убьёт, поэтому совет «резко развернись» не нужен (main.js, событие stick).
export const calm = w => has(w, 'memory');
export function immune(w, h, g) {
  if (g.host !== 'me' || !has(w, 'memory')) return false;
  if (h.knows) { w.events.push(['cut', g.x, g.y]); w.stats.cutKnown = (w.stats.cutKnown || 0) + 1;
    if (lvl(w, 'memory') >= 3) { w.grow(h, M.memory.food); w.fed(g.x, g.y, 1); w.stats.virusFood = (w.stats.virusFood || 0) + 1; } return true; } // знакомый: нить рвётся, на третьем уровне — еда
  h.knows = true; h.m = Math.max(0.6, h.m * w.cfg.crispr_cost); w.events.push(['learn', g.x, g.y]); w.stats.learned = (w.stats.learned || 0) + 1; return true; // первая встреча: выжила, похудела, запомнила
}
// Дочка при делении (sim.js divide): на втором уровне памяти рождается, уже зная вирус матери.
export function kid(w, c, b) { if (c.knows && has(w, 'memory') && lvl(w, 'memory') >= 2) b.knows = true; return b; }

// Защита, уровень 3 (sim.js, вирус отскочил от оболочки): летит к ближайшему кокку и садится на него.
export function shrug(w, g) {
  if (!has(w, 'shield') || lvl(w, 'shield') < 3) return;
  let best = null, bd = M.shield.reach; for (const q of w.prey) { const d = Math.hypot(q.x - g.x, q.y - g.y); if (d < bd) { bd = d; best = q; } }
  if (!best) return; g.host = 'prey'; g.aim = best; g.from = { x: g.x, y: g.y }; w.stats.bounce = (w.stats.bounce || 0) + 1;
}
// Вирус с целью (после отскока) правит к ней сам: течение его не сносит (sim.js, шаг вируса).
export function steer(w, g, dt) {
  const q = g.aim; if (!q) return; if (q.gone) { g.aim = null; return; }
  const dx = q.x - g.x, dy = q.y - g.y, d = Math.hypot(dx, dy) || 1; g.vx = dx / d * M.shield.v; g.vy = dy / d * M.shield.v;
}

// Голубые точки режима «Мутации»: держим их число вокруг семьи, дальние уходят. Никто, кроме клетки с геном, их не ест.
function citrate(w) {
  const c = w.center(), C = M.citrate; w.cit = (w.cit || []).filter(q => !q.gone && Math.hypot(q.x - c.x, q.y - c.y) < C.far);
  while (w.cit.length < C.n) { const t = w.r() * 6.283, d = C.near * (0.25 + 0.75 * Math.sqrt(w.r())); w.cit.push({ x: c.x + Math.cos(t) * d, y: c.y + Math.sin(t) * d, ph: w.r() * 6.283 }); }
}

// Вирус сел на свою клетку (sim.js). В плоту с шансом M.flu.spread заболевает и ближайшая здоровая соседка вплотную —
// цена сцепки (книга Г24: «Сядет вирус на одну, заболеет и соседняя»). Соседка помечена тем же признаком, что и севший вирус.
export function landed(w, a) {
  if (!raft(w) || !(w.r() < M.flu.spread)) return;
  let best = null, bd = M.flu.r * 2;
  for (const b of w.me) { if (b === a || b.sick >= 0) continue; const d = Math.hypot(b.x - a.x, b.y - a.y) - 13 * Math.sqrt(a.m) - 13 * Math.sqrt(b.m); if (d < bd) { bd = d; best = b; } }
  if (!best) return;
  best.sick = w.cfg.sick; w.stats.fluSick = (w.stats.fluSick || 0) + 1; w.events.push(['sick', best.x, best.y]);
}

// Своя заражённая клетка дозрела (sim.js, перед лопанием). true — погибла тихо: целая, без вирусов и без облака.
export function burst(w, a) {
  if (!has(w, 'abort')) return false;
  const x = a.x, y = a.y, ang = a.a, m = a.m;
  w.lose(a, x, y, 'phage');
  if (w.me.indexOf(a) < 0) w.events.push(['abort', x, y, ang, m]); // спора могла спасти последнюю — тогда не гибель
  if (w.me.indexOf(a) < 0) { (w.aborts ||= []).push({ x, y, ang, m, t: 0, n: w.cfg.burst }); w.stats.trapped = (w.stats.trapped || 0) + w.cfg.burst; } // вирусы заперты внутри — их видно, пока тело гаснет
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
// Сколько от середины клетки до её оболочки в сторону phi (мир): тело — капсула, толщина и длина как в main.js (рисование клетки).
// Где и как нарисовано тело (vid.js отдаёт свою память через useBody): мягкое тело отстаёт от a.x и поворачивает позже, чем a.a.
let bodyFn = null; export const useBody = f => { bodyFn = f; }; const bodyOf = a => bodyFn && bodyFn(a.id);
const reach = (w, a, g, phi) => { const R = g ? g.w : 8.5 * Math.pow(a.m, 0.3), half = g ? g.L + g.w : R * (1.6 + Math.min(a.m, w.split()) / w.split());
  return (half - R) * Math.abs(Math.cos(phi - (g ? g.ang : a.a || 0))) + R; };
const claspsOf = new WeakMap(); // у каждого мира свои (снимок Альманаха рисует свою семью со своим временем): пара сестёр → { t0: когда застёжка защёлкнулась, seen: когда последний раз держала } (время заплыва)
export function drawWorld({ w, scr, z, glow, ink }) {
  const safe = w.me.length >= Math.min(...Object.values(M.flu.min)), br = safe ? 1 : 0.45; // застёжки загораются, когда семья уже не по зубам мелкому рту (книга: порог виден)
  if (!claspsOf.has(w)) claspsOf.set(w, new Map()); const clasps = claspsOf.get(w);
  const C = M.flu.clasp, now = w.stats.time, alive = new Set(); // щелчок застёжки (дизайнер): сёстры встали бок о бок — застёжки вспыхивают и сходятся зубцами, у шва мягкая вспышка
  if (raft(w)) for (let i = 0; i < w.me.length; i++) for (let j = i + 1; j < w.me.length; j++) { // застёжки между соседками: три светлые черты поперёк шва
    const p = w.me[i], q = w.me[j], d = Math.hypot(p.x - q.x, p.y - q.y), ri = 13 * Math.sqrt(p.m), rj = 13 * Math.sqrt(q.m);
    if (d > ri + rj + M.flu.r * 0.6) continue;
    const key = Math.min(p.id, q.id) + ':' + Math.max(p.id, q.id); alive.add(key); if (!clasps.has(key)) clasps.set(key, { t0: now, seen: now }); const cl = clasps.get(key); cl.seen = now;
    const k = Math.min(1, (now - cl.t0) / C.t), snap = 1 - k, fl = 1 + C.flash * snap * snap, spread = 5 * (1 + C.open * Math.max(0, 1 - k * 3)); // зубцы сначала врозь, за первую треть щелчка сходятся
    const gp = bodyOf(p), gq = bodyOf(q), [px, py] = gp && gp.scr === scr ? [gp.sx, gp.sy] : scr(p.x, p.y), [qx, qy] = gq && gq.scr === scr ? [gq.sx, gq.sy] : scr(q.x, q.y); // где тела нарисованы: мягкое тело отстаёт от a.x
    const ds = Math.hypot(qx - px, qy - py) || 1, ux = (qx - px) / ds, uy = (qy - py) / ds, phi = Math.atan2(uy, ux); // дальше всё в точках экрана
    const e0 = reach(w, p, gp, phi) * z, e1 = ds - reach(w, q, gq, phi + Math.PI) * z, len = Math.max(4 * z, e1 - e0 + 2 * C.inset * z), mid = (e0 + e1) / 2, rg = 1.1 * z * (1 + 0.5 * snap) + 0.35, nb = Math.max(2, Math.ceil(len / (rg * 0.35))); const far = Math.max(C.far_min, Math.min(1, 1 - ((e1 - e0) / z - C.touch) / C.fade)); // вплотную застёжка яркая, издалека — бледная нить: белок держит на касании // три зубца поперёк шва: светлые сплошные черты от оболочки до оболочки (заходят под кромку на C.inset), концы тают в тела (L047: не бусами)
    for (let kk = -1; kk <= 1; kk++) for (let s = 0; s <= nb; s++) { const e = s / nb, f = mid + len * (e - 0.5), o = kk * spread * z, end = Math.sin(Math.PI * e) ** 0.5;
      glow.put(px + ux * f - uy * o, py + uy * f + ux * o, rg, 0.55, 0.85, 1, Math.min(1, 0.4 * br * fl) * end * Math.max(far, snap) * 2.2 / Math.sqrt(nb)); }
    if (k < 1) glow.put(px + ux * mid, py + uy * mid, C.ring * z * (0.4 + 0.6 * Math.sqrt(k)), 0.75, 0.93, 1, C.ring_a * snap * snap); // мягкая вспышка у шва: одно пятно, без колец-схем
  }
  for (const [key, cl] of clasps) if (!alive.has(key) && now - cl.seen > C.forget) clasps.delete(key); // расцепились надолго — следующая сцепка снова щёлкнет (на краю застёжка не мигает щелчками)
  for (const q of w.cit || []) { const [x, y] = scr(q.x, q.y), r = 3.4 * z + 1.5; // голубая точка: плотная, с тёмной кромкой — не похожа на пустые кольца пузырей фона
    ink.put(x, y, r * 1.3, 0.03, 0.08, 0.16, 0.7); glow.put(x, y, r, 0.3, 0.75, 1, 0.95); glow.put(x - r * 0.3, y - r * 0.3, r * 0.4, 0.75, 0.92, 1, 0.7); }
  for (const g of w.refuse || []) { const f = 1 - g.t / M.door.flash, a = g.a; // отказ двери: дуга света на оболочке со стороны шарика
    for (let k = -3; k <= 3; k++) { const t = Math.atan2(g.uy, g.ux) + k * 0.18, [x, y] = scr(a.x + Math.cos(t) * (g.r + 3), a.y + Math.sin(t) * (g.r + 3));
      glow.put(x, y, (1.6 * z + 0.8) * (1 + 0.6 * (1 - f)), 0.75, 0.95, 0.85, 0.7 * f * (1 - Math.abs(k) / 4)); } }
  for (const g of w.aborts || []) { // тихая гибель: внутри погасшего тела видны запертые вирусы — тёмные головки с хвостиком, они тускнеют вместе с телом и не выходят
    const f = Math.max(0, 1 - g.t / M.abort.show), L = 13 * Math.sqrt(g.m), ux = Math.cos(g.ang), uy = Math.sin(g.ang);
    for (let k = 0; k < g.n; k++) { const u = (k / (g.n - 1 || 1) - 0.5) * L * 1.2, o = (k % 2 ? 1 : -1) * L * 0.18;
      const [x, y] = scr(g.x + ux * u - uy * o, g.y + uy * u + ux * o), r = 1.6 * z + 0.8;
      ink.put(x, y, r * 1.4, 0.2, 0.05, 0.12, 0.8 * f); glow.put(x, y, r * 0.7, 0.85, 0.35, 0.55, 0.45 * f); ink.put(x + ux * r * 1.8, y + uy * r * 1.8, r * 0.5, 0.2, 0.05, 0.12, 0.6 * f); } }
  if (has(w, 'magnet')) for (const a of w.me) { const [r, g, b] = M.magnet.gold, R = M.magnet.lvl[lvl(w, 'magnet') - 1].r + 13 * Math.sqrt(a.m), t0 = w.stats.time * 0.3; // магнит (сверено с ref_17, ref_23, Вид 3 и 6): золото только у еды и сигнала
    for (let k = 0; k < 40; k++) { const t = t0 + k / 40 * 6.283, [x, y] = scr(a.x + Math.cos(t) * R, a.y + Math.sin(t) * R); glow.put(x, y, 0.8 * z + 0.4, r, g, b, k % 2 ? 0.18 : 0.38); } // мелкие золотые бусины там, докуда магнит берёт: кольцо растёт с уровнем
    for (const f of a.pulled || []) { const dx = a.x - f.x, dy = a.y - f.y, s = f.side * 0.35, run = (w.stats.time * 1.8 + (f.side > 0 ? 0 : 0.5)) % 1; // ref_17: тонкая сплошная нить от крупинки к телу, по ней бежит одна капля света
      for (let k = 0; k <= 16; k++) { const u = k / 16, q = s * u * (1 - u) * 4, [x, y] = scr(f.x + dx * u - dy * q, f.y + dy * u + dx * q), hot = Math.abs(u - run) < 0.07;
        glow.put(x, y, (hot ? 1.7 : 0.55) * z + 0.4, r, g, b, hot ? 0.95 : 0.45); }
      const [x, y] = scr(f.x, f.y); glow.put(x, y, 3.2 * z + 1, r, g, b, 0.3); glow.put(x, y, 1.4 * z + 0.6, 1, 0.92, 0.7, 0.9); } } // крупинка — яркая капля с ореолом
  for (const q of w.corridor || []) { const f = 1 - q.t / M.tail.trail, ux = Math.cos(q.a), uy = Math.sin(q.a); // коридор в слизи: две светлые кромки по бокам пути, жгут разогнал слизь
    for (const s of [-1, 1]) { const [x, y] = scr(q.x - uy * s * 16, q.y + ux * s * 16); glow.put(x, y, 1.2 * z + 0.5, 0.55, 0.8, 0.9, 0.35 * f); ink.put(x, y, 1.6 * z + 0.6, 0.05, 0.1, 0.15, 0.25 * f); } }
  for (const g of w.phages) if (g.aim && g.from) { // защита 3: отскочивший вирус оставляет холодный след от клетки к кокку
    for (let k = 0; k <= 10; k++) { const u = k / 10, [x, y] = scr(g.from.x + (g.x - g.from.x) * u, g.from.y + (g.y - g.from.y) * u); glow.put(x, y, 0.6 * z + 0.4, 0.6, 0.85, 1, 0.35 * u); } }
  for (const q of w.waves || []) { const f = q.t / M.magnet.wave, [r, g, b] = M.magnet.gold; // каскад: волна по воде сходится к клетке
    for (let k = 0; k < 64; k++) { const t = k / 64 * 6.283, rr = q.r * (1.3 - f), [x, y] = scr(q.x + Math.cos(t) * rr, q.y + Math.sin(t) * rr); glow.put(x, y, 1.2 * z + 0.6, r, g, b, 0.5 * (1 - f)); } }
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
// Амёба проглотила сестру (sim.js). Плот она объедает с края по одной (книга Г24): после куска сыта M.flu.nibble с,
// и остальные успевают уплыть. Одиночку и пару — без передышки, как раньше.
export function bite(w, m) {
  if (!raft(w) || w.me.length + 1 < M.flu.min.amoeba) return;
  m.syt = M.flu.nibble; w.stats.nibble = (w.stats.nibble || 0) + 1; w.events.push(['bump', m.x, m.y]);
}
// Кокк щиплет ядом (sim.js). true — дверь закрыта: яд не вошёл.
export function shut(w, a, q) {
  if (!has(w, 'door')) return false;
  if (a && q) { const d = Math.hypot(q.x - a.x, q.y - a.y) || 1, r = 13 * Math.sqrt(a.m); // яд дошёл до оболочки и не вошёл: короткая светлая вспышка на боку, обращённом к шарику
    (w.refuse ||= []).push({ a, ux: (q.x - a.x) / d, uy: (q.y - a.y) / d, r, t: 0 }); w.stats.refuse = (w.stats.refuse || 0) + 1; }
  return true;
}
// Множитель еды: закрытая дверь пропускает меньше.
export const food = w => has(w, 'door') ? M.door.food : 1;

// Что рисовать на теле (дополнение к look.js).
export function mutLook(genes) {
  return { ...(genes.snap ? { flagella: M.snap.look } : {}), snap: !!genes.snap, gas: genes.gas ? M.gas.n : 0, abort: !!genes.abort, door: !!genes.door, decoy: !!genes.decoy, flu: genes.flu ? M.flu.pins : 0, steady: genes.steady ? M.steady.look : 0, citrate: !!genes.citrate, store: !!genes.store, lean: !!genes.lean, magnet: !!genes.magnet, shield: genes.shield ? M.shield.look : 0, tail: genes.tail ? M.tail.look : 0, memory: !!genes.memory };
}

// Вид мутаций на теле плывущей клетки (зовёт vid.js skin()). Цвет — из палитры клетки, без чистого белого (урок L020).
export function mutSkin({ a, lk, ink, glow, at, w, L, time }) {
  if (lk.gas) for (let k = 0; k < lk.gas; k++) { // газовые пузырьки: жёсткие светлые веретёнца внутри, чуть покачиваются
    const u = (k / (lk.gas - 1 || 1) - 0.5) * L * 1.6, o = (k % 2 ? 1 : -1) * w * 0.28 + Math.sin(time * 1.3 + k) * w * 0.03;
    for (let j = -2; j <= 2; j++) { const [px, py] = at(u + j * w * 0.09, o); ink.put(px, py, w * 0.16, 0.62, 0.8, 0.9, 0.55); }
    const [cx, cy] = at(u, o); glow.put(cx, cy, w * 0.2, 0.55, 0.75, 0.9, 0.08);
  }
  if (lk.door) { // закрытая дверь: на нижнем боку тёмный зрачок со светлым плотным краем
    for (let k = 0; k < 10; k++) { const t = k / 10 * 6.283, [px, py] = at(L * 0.2 + Math.cos(t) * w * 0.16, -w * 0.78 + Math.sin(t) * w * 0.11); ink.put(px, py, w * 0.09, 0.55, 0.78, 0.92, 0.9); } // светлый плотный край: на значке и в игре видно, что дверь есть и она закрыта (Роман, IMG_0668: значок был почти пустой)
    const [cx, cy] = at(L * 0.2, -w * 0.78); ink.put(cx, cy, w * 0.14, 0.05, 0.07, 0.12, 0.9);
  }
  if (lk.abort) for (let k = 0; k < 6; k++) { // умереть за своих: у носа тёмная перемычка — замок, который выключит заражённую
    const [px, py] = at(L + w * 0.35, (k / 5 - 0.5) * w * 1.1); ink.put(px, py, w * 0.12, 0.3, 0.12, 0.2, 0.7);
  }
  if (lk.decoy) for (let k = 0; k < 8; k++) { // обманки: у кормы на оболочке набухают пузырьки, вот-вот отщипнутся
    const t = k / 8, [px, py] = at(-L - w * 0.55 + Math.sin(time * 2 + k) * w * 0.05, (t - 0.5) * w * 1.3); glow.put(px, py, w * 0.12, 0.55, 0.8, 0.95, 0.3); }
  for (let k = 0; k < (lk.flu || 0); k++) { // сцепка: по бокам короткие светлые застёжки-зубчики, торчат наружу
    const s = k % 2 ? 1 : -1, u = ((k >> 1) / ((lk.flu >> 1) - 1 || 1) - 0.5) * L * 1.4;
    for (let j = 0; j < 7; j++) { const t = j / 6, [px, py] = at(u, s * (w * 0.82 + t * w * 0.2)); ink.put(px, py, w * (0.1 - 0.05 * t), 0.08, 0.14, 0.22, 0.45); glow.put(px, py, w * (0.07 - 0.035 * t), 0.55, 0.85, 1, 0.3); } } // сплошной сужающийся бугорок, сидит на оболочке, в воду не торчит
  for (let k = 0; k < (lk.steady || 0); k++) { // крепче жгут: у кормы, где выходит хвост, тугая тёмная скрутка из витков
    const u = -L - w * (0.15 + k * 0.16), o = (k % 2 ? 1 : -1) * w * 0.12; const [px, py] = at(u, o); ink.put(px, py, w * 0.13, 0.1, 0.16, 0.26, 0.75); glow.put(px, py, w * 0.06, 0.55, 0.8, 1, 0.3); }
  if (lk.citrate) for (let k = 0; k < 5; k++) { // ест голубую еду: внутри голубые крупинки съеденного
    const [px, py] = at((k / 4 - 0.5) * L * 1.2, (k % 2 ? 1 : -1) * w * 0.18); glow.put(px, py, w * 0.14, 0.25, 0.65, 0.95, 0.55); ink.put(px, py, w * 0.17, 0.05, 0.12, 0.22, 0.25); }
  if (lk.store) for (let k = 0; k < (a.store || 0); k++) { // копит запас: тёмные плотные крупинки внутри, по одной на крупинку запаса
    const [px, py] = at((k / 5 - 0.5) * L * 1.3, (k % 2 ? 1 : -1) * w * 0.22); ink.put(px, py, w * 0.2, 0.1, 0.06, 0.04, 0.8); glow.put(px - w * 0.05, py - w * 0.05, w * 0.06, 0.9, 0.75, 0.45, 0.35); }
  if (lk.lean) for (let k = 0; k < 6; k++) { // дольше без еды: по бокам частые складки оболочки — ей есть куда сжаться
    const s = k % 2 ? 1 : -1, [px, py] = at(((k >> 1) / 2 - 0.5) * L * 1.1, s * w * 0.86); ink.put(px, py, w * 0.08, 0.1, 0.16, 0.26, 0.6); glow.put(px, py + s * w * 0.05, w * 0.05, 0.6, 0.85, 1, 0.3); }
  if (lk.magnet) { const n = 2 + 2 * (a.mag || 1), go = (a.pulled || []).length ? (time * 2) % 1 : null, [r, g, b] = M.magnet.gold; // магнит (ref_17, Вид 4): на носу тонкие волоски-рецепторы с золотыми каплями на концах, их больше с уровнем
    for (let k = 0; k < n; k++) { const o = (k / (n - 1) - 0.5) * w * 1.5, lit = go !== null && Math.abs(go - k / (n - 1)) < 0.25; // пока еда плывёт, свет бежит по каплям от края к краю (Вид 6)
      for (let j = 1; j <= 4; j++) { const [px, py] = at(L + w * (0.2 + j * 0.14) - Math.abs(o) * 0.5, o * (1 + j * 0.12)); ink.put(px, py, w * 0.035, 0.1, 0.18, 0.26, 0.5); }
      const [px, py] = at(L + w * 0.9 - Math.abs(o) * 0.5, o * 1.6); glow.put(px, py, w * (lit ? 0.2 : 0.11), r, g, b, lit ? 0.95 : 0.7); }
    if (a.warm > 0) for (let k = -2; k <= 2; k++) { const [cx, cy] = at(k * L * 0.25, 0); glow.put(cx, cy, w * (0.5 - Math.abs(k) * 0.08), 1, 0.6, 0.18, 0.35 * a.warm / M.magnet.warm); } } // ref_21: съеденное тепло светится вдоль ядра
  if (lk.memory && a.knows) { const [hx, hy] = at(L * 0.1, w * 1.05); // память (Вид 7, ref_06, ref_28): на боку пустая скорлупа вируса — гранёная стеклянная головка без нити, трофей
    for (let k = 0; k < 6; k++) { const t = k / 6 * 6.283, [px, py] = at(L * 0.1 + Math.cos(t) * w * 0.22, w * 1.05 + Math.sin(t) * w * 0.22); ink.put(px, py, w * 0.06, 0.12, 0.18, 0.28, 0.7); glow.put(px, py, w * 0.05, 0.7, 0.9, 1, 0.5); }
    glow.put(hx, hy, w * 0.12, 0.6, 0.85, 1, 0.25); }
  if (lk.memory) for (let k = 0; k < 4; k++) { const [px, py] = at((k / 3 - 0.5) * L * 0.9, -w * 0.3); ink.put(px, py, w * 0.12, 0.1, 0.16, 0.26, 0.55); glow.put(px, py, w * 0.05, 0.6, 0.85, 1, 0.3); } // зарубки памяти внутри: короткие тёмные полоски вдоль оси
  if (lk.tail) for (let k = 0; k < lk.tail; k++) { const u = -L - w * (0.3 + k * 0.28), o = Math.sin(time * 9 + k * 1.3) * w * 0.12 * (1 + (a.boost || 0)); // сильный хвост (Вид 4): за кормой толстый жгут из сплетённых нитей; на разгоне бьёт шире
    const [px, py] = at(u, o); ink.put(px, py, w * (0.17 - k * 0.02), 0.08, 0.14, 0.22, 0.7); glow.put(px, py, w * 0.07, 0.55, 0.85, 1, 0.3 + 0.4 * (a.boost || 0)); }
  if (lk.shield) for (let k = 0; k < lk.shield * 2; k++) { const t = k / (lk.shield * 2) * 6.283, [px, py] = at(Math.cos(t) * (L + w * 0.75), Math.sin(t) * w * 1.12); // защита (Вид 2, 7): стеклянная кромка поверх оболочки — холодные блики по кругу
    ink.put(px, py, w * 0.07, 0.1, 0.2, 0.3, 0.45); glow.put(px, py, w * 0.09, 0.6, 0.9, 1, 0.55); }
  if (lk.snap && a.snap > 0) { const [px, py] = at(-L - w, 0); glow.put(px, py, w * 0.6, 0.6, 0.8, 1, 0.15 * a.snap / M.snap.time); } // щелчок: вспышка у кормы, где подломился хвост
}
