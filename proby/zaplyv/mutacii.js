// Новые мутации «Заплыва» по каталогу биолога (design/zaplyv_mutacii_katalog.md): поведение и вид на теле.
// Свой файл третьего строителя; sim.js зовёт отсюда узкие крюки, vid.js — mutSkin(). Числа — mutacii.json.
// Имена и тексты генов — только книга (kniga/teksty_genov.json по ключу), здесь их нет.
//   snap  — №5 «разворот рывком»: на крутом повороте вместо кувырка короткий щелчок, ход почти не теряется (чужой ген, только по трубочке).
//   abort — №43 «умереть за своих»: заражённая клетка гибнет целой, вирусы из неё не выходят, сёстры живы.
//   gas   — №26 «пузырьки для подъёма»: отпустил палец — клетка сама медленно всплывает; с пузырьками плывёт чуть тяжелее (чужой ген).
//   door  — №17 «закрыть дверь»: яд кокка больше не щиплет, зато любая еда даёт меньше.
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
// Мутации живут только в режиме «Мутации» (Роман 24.11: «Мы тестируем разные режимы!»); обычный заплыв как был.
const on = w => w.mode === 'mut';
const has = (w, g) => on(w) && !!w.genes[g];
const fresh = (w, list) => list.filter(g => !w.genes[g]);
// Из чего выбирают дочки при делении. В режиме — сначала новые мутации (кроме чужих), потом прежние гены.
export function pool(w) {
  const old = Object.keys(w.cfg.genes).filter(g => !(g in M.genes));
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
  if (!has(w, 'snap') || (a.snapCool || 0) > w.stats.time) return false;
  a.snap = M.snap.time; a.snapCool = w.stats.time + M.snap.time + M.snap.cool;
  w.events.push(['snap', a.x, a.y, a.a]); return true;
}
// Пока идёт щелчок: скорость поворота и разгон — щелчка, тяга почти полная.
export const turnRate = (a, base) => a.snap > 0 ? M.snap.turn : base;
export const acc = (a, base) => a.snap > 0 ? M.snap.acc : base;
// Множитель тяги: газовые пузырьки занимают место — клетка плывёт чуть тяжелее.
export const thrust = (w, a) => (has(w, 'gas') ? M.gas.drag : 1) * (a.snap > 0 ? M.snap.keep : 1);

// Шаг клетки после движения: щелчок гаснет; с пузырьками без тяги — всплытие вверх (к плёнке), бесплатно.
export function cell(w, a, dt, th) {
  if (a.snap > 0) a.snap = Math.max(0, a.snap - dt);
  if (!has(w, 'gas')) return;
  const up = !th && !a.stuck && !(a.spore > 0) && !(w.genes.sense && w.food.some(f => Math.hypot(f.x - a.x, f.y - a.y) < w.cfg.sense_r)); // чует еду рядом — ждёт у неё, а не всплывает
  a.lift = (a.lift || 0) + ((up ? M.gas.up : 0) - (a.lift || 0)) * Math.min(1, M.gas.ease * dt); a.y -= a.lift * dt; // вода гасит любой ход, а пузырьки тянут вверх всё время
}

// Своя заражённая клетка дозрела (sim.js, перед лопанием). true — погибла тихо: целая, без вирусов и без облака.
export function burst(w, a) {
  if (!has(w, 'abort')) return false;
  const x = a.x, y = a.y, ang = a.a, m = a.m;
  w.lose(a, x, y, 'phage');
  if (w.me.indexOf(a) < 0) w.events.push(['abort', x, y, ang, m]); // спора могла спасти последнюю — тогда не гибель
  return true;
}

// Кокк щиплет ядом (sim.js). true — дверь закрыта: яд не вошёл.
export const shut = w => has(w, 'door');
// Множитель еды: закрытая дверь пропускает меньше.
export const food = w => has(w, 'door') ? M.door.food : 1;

// Что рисовать на теле (дополнение к look.js).
export function mutLook(genes) {
  return { ...(genes.snap ? { flagella: M.snap.look } : {}), snap: !!genes.snap, gas: genes.gas ? M.gas.n : 0, abort: !!genes.abort, door: !!genes.door };
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
  if (lk.snap && a.snap > 0) { const [px, py] = at(-L - w, 0); glow.put(px, py, w * 0.6, 0.6, 0.8, 1, 0.15 * a.snap / M.snap.time); } // щелчок: вспышка у кормы, где подломился хвост
}
