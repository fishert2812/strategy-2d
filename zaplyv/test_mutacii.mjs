// Проверки новых мутаций (mutacii.js) без экрана: node proby/zaplyv/test_mutacii.mjs. Каждая «сделал → случилось» с [ключом] гена.
import { World } from './sim.js';
import { look } from './look.js';
import { M, drawWorld } from './mutacii.js';
import * as mut from './mutacii.js';
import * as vid from './vid.js';
import { readFileSync, readdirSync } from 'node:fs';
const cfg = JSON.parse(readFileSync(new URL('./data.json', import.meta.url)));
let bad = 0;
// PART=a|b делит проверки на две половины, шаг 54 гоняет их параллельно: самый долгий бот-замер (b) идёт рядом со всем остальным (a).
const PART = process.env.PART, heavy = name => name.startsWith('бот в режиме');
const check = (name, fn) => {
  if (PART && (PART === 'b') !== heavy(name)) return;
  if (process.env.ONLY && !name.includes(process.env.ONLY)) return; // ONLY=[ключ] — прогнать один тест, пока чинишь
  try { const r = fn(); if (r) { bad++; console.log('  ПРОВАЛ', name + ':', r); } else console.log('  ок   ', name); }
  catch (e) { bad++; console.log('  ПРОВАЛ', name + ':', e.stack); }
};
const run = (w, sec, target) => { for (let t = 0; t < sec; t += 1 / 30) w.step(1 / 30, typeof target === 'function' ? target(w) : target); };
const empty = (w, keep = []) => { for (const k of ['food', 'prey', 'amoebas', 'phages', 'plants', 'crumbs', 'bdellos', 'slime', 'slippers', 'bells', 'rotis', 'pseudos', 'donors']) if (!keep.includes(k)) w[k] = []; w.tidy = 1e9; w.look = 1e9; return w; };
const mw = (seed, genes = [], mode = 'mut') => { const w = empty(new World(cfg, seed)); w.mode = mode; for (const g of genes) w.genes[g] = true; return w; };
const wrap = d => Math.atan2(Math.sin(d), Math.cos(d));

// Разворот на 180°: плывёт вправо, палец резко влево. Сколько секунд до курса и какая скорость в эту минуту.
const uturn = w => {
  run(w, 1.5, { dx: 1, dy: 0, p: 1 });
  const a = w.me[0], x0 = a.x; let t = 0, turned = 0;
  for (; t < 1.2; t += 1 / 30) { w.step(1 / 30, { dx: -1, dy: 0, p: 1 }); if (!turned && Math.abs(wrap(a.a - Math.PI)) < 0.3) turned = t; }
  return { t: turned || 9, v: x0 - a.x, snaps: w.events.filter(e => e[0] === 'snap').length };
};
check('[snap] резкий разворот: щелчок вместо кувырка — клетка разворачивается быстрее и не теряет хода', () => {
  const a = uturn(mw(3, ['snap'])), b = uturn(mw(3));
  console.log(`    паспорт: с умением разворот ${a.t.toFixed(2)} с, за 1,2 с после команды ушла назад на ${a.v.toFixed(0)}, щелчков ${a.snaps} | без умения ${b.t.toFixed(2)} с, ${b.v.toFixed(0)}`);
  if (!a.snaps) return 'щелчка не было';
  if (!(a.t < b.t * 0.8)) return 'разворот с умением не быстрее кувырка';
  if (!(a.v > b.v)) return 'с умением за то же время уходит назад не дальше — ход теряется';
});

check('[abort] вирус остаётся внутри: заражённая сестра гибнет целой, вирусы не выходят, другая жива', () => {
  const go = genes => { const w = mw(5, genes); w.me.push({ ...w.me[0], x: 200, id: 2, vx: 0, vy: 0 }); w.me[0].sick = 0.05; run(w, 0.5, null); return w; };
  const a = go(['abort']), b = go([]);
  const ev = w => w.events.map(e => e[0]);
  console.log(`    паспорт: с умением вирусов ${a.phages.length}, клеток ${a.me.length}, события ${[...new Set(ev(a))].join(',')} | без умения вирусов ${b.phages.length}`);
  if (a.phages.length) return 'из погибшей вышли вирусы';
  if (!ev(a).includes('abort') || ev(a).includes('burst')) return 'нет тихой гибели (abort) или клетка лопнула';
  if (a.me.length !== 1) return 'вторая сестра не жива';
  if (b.phages.length < cfg.burst) return 'без умения клетка не лопнула вирусами — сравнение не работает';
});

check('[abort] видно разницу: без умения из сестры выходит облако вирусов, с умением они заперты внутри погасшего тела', () => {
  const go = genes => { const w = mw(5, genes); w.me.push({ ...w.me[0], x: 200, id: 2, vx: 0, vy: 0 }); w.me[0].sick = 0.05; run(w, 0.5, null);
    w.cit = []; const pts = []; const brush = { put: (...v) => pts.push(v) }; mut.drawWorld({ w, scr: (x, y) => [x, y], z: 1, glow: brush, ink: brush });
    return { pts: pts.length, free: w.phages.length, trapped: w.stats.trapped || 0 }; };
  const a = go(['abort']), b = go([]);
  console.log(`    паспорт: с умением вирусов на воле ${a.free}, заперто ${a.trapped}, точек запертых на экране ${a.pts} | без умения на воле ${b.free}`);
  if (a.free || !a.trapped) return 'с умением вирусы вышли';
  if (a.pts < a.trapped * 2) return 'запертых вирусов не видно';
  if (!b.free) return 'без умения облака нет — сравнения нет';
});
check('[door] видно отказ: яд кокка доходит до оболочки и не входит — на боку к шарику вспыхивает свет', () => {
  const w = mw(9, ['door']), a = w.me[0]; w.prey = [{ x: 18, y: 0, vx: 0, vy: 0, m: 1, a: 0, sick: -1, id: 77 }]; let seen = 0;
  for (let t = 0; t < 4; t += 1 / 30) { w.prey[0].x = a.x + 18; w.prey[0].y = a.y; w.prey[0].vx = w.prey[0].vy = 0; w.step(1 / 30, null);
    w.cit = []; const pts = []; const brush = { put: (...v) => pts.push(v) }; mut.drawWorld({ w, scr: (x, y) => [x, y], z: 1, glow: brush, ink: brush }); if (pts.length) seen++; }
  console.log(`    паспорт: за 4 с у кокка отказов двери ${w.stats.refuse || 0}, кадров со вспышкой ${seen}, щипков ${a.pinch > 0 ? 1 : 0}`);
  if (!w.stats.refuse) return 'отказа не было';
  if (!seen) return 'вспышки не видно';
});
check('[gas] всплывает сама: убрал палец — клетка поднимается вверх, без умения стоит', () => {
  const lift = genes => { const w = mw(7, genes); const y0 = w.me[0].y; run(w, 4, null); return y0 - w.me[0].y; };
  const a = lift(['gas']), b = lift([]);
  console.log(`    паспорт: за 4 с без пальца поднялась на ${a.toFixed(0)} | без умения ${b.toFixed(0)}`);
  if (!(a > 100)) return 'с умением не всплывает';
  if (!(b < a / 3)) return 'без умения тоже плывёт вверх';
});

check('[door] шарики не вредят: кокк рядом не замедляет, но от еды растёшь меньше', () => {
  const pinch = genes => { const w = mw(9, genes); const a = w.me[0]; w.prey = [{ x: 18, y: 0, vx: 0, vy: 0, m: 1, a: 0, sick: -1, id: 77 }]; let n = 0; for (let t = 0; t < 4; t += 1 / 30) { w.prey[0].x = a.x + 18; w.prey[0].y = a.y; w.prey[0].vx = w.prey[0].vy = 0; w.step(1 / 30, null); if (a.pinch > 0) n++; } return n; };
  const food = genes => { const w = mw(9, genes); const a = w.me[0], m0 = a.m; w.grow(a, 1); return a.m - m0; };
  const pa = pinch(['door']), pb = pinch([]), fa = food(['door']), fb = food([]);
  console.log(`    паспорт: кадров со щипком с умением ${pa}, без ${pb} | рост от еды с умением ${fa.toFixed(2)}, без ${fb.toFixed(2)}`);
  if (pa) return 'кокк щиплет и с умением';
  if (!pb) return 'без умения кокк не щиплет — сравнение не работает';
  if (!(fa < fb)) return 'еда даёт столько же';
});

check('[decoy] отвлекает вирусы пузырьками: за клеткой пузырьки, вирус садится на пузырёк, клетка здорова', () => {
  const go = genes => { const w = mw(15, genes), a = w.me[0]; run(w, 2, null); const r = 13 * Math.sqrt(a.m);
    w.phages = [{ x: a.x - Math.cos(a.a) * (r + 1), y: a.y - Math.sin(a.a) * (r + 1), vx: 0, vy: 0, d: 0, host: 'me' }]; run(w, 0.5, null);
    return { ves: (w.vesicles || []).length, gone: !w.phages.length, sick: a.sick >= 0 || w.phages.some(g => g.on), m: a.m }; };
  const a = go(['decoy']), b = go([]);
  console.log(`    паспорт: с умением пузырьков ${a.ves}, вирус погиб ${a.gone}, клетка заражена ${a.sick}, сила ${a.m.toFixed(3)} | без умения заражена ${b.sick}, сила ${b.m.toFixed(3)}`);
  if (!a.ves) return 'пузырьков нет';
  if (!a.gone || a.sick) return 'вирус сел на клетку, а не на пузырёк';
  if (!b.sick) return 'без умения вирус не сел — сравнение не работает';
  if (!(a.m < b.m)) return 'пузырьки ничего не стоят';
});

check('[steady] плывёт ровнее: на зигзаге пальца клетка реже кувыркается и проходит дальше', () => {
  const go = genes => { const w = mw(5, genes), a = w.me[0]; let n = 0, was = 0, path = 0;
    for (let t = 0; t < 20; t += 1 / 30) { const ang = Math.floor(t / 1.5) * 2.1; w.step(1 / 30, { dx: Math.cos(ang), dy: Math.sin(ang), p: 1 }); // палец поворачивает на 120°
      if (a.tumble > 0 && !was) n++; was = a.tumble > 0; path += Math.hypot(a.vx, a.vy) / 30; }
    return { n, path }; };
  const a = go(['steady']), b = go([]);
  console.log(`    паспорт: за 20 с зигзага кувырков с умением ${a.n}, без ${b.n} | путь ${a.path.toFixed(0)} и ${b.path.toFixed(0)}`);
  if (!b.n) return 'без умения не кувыркается — сравнение не работает';
  if (!(a.n < b.n / 2)) return 'с умением кувыркается не реже';
  if (!(a.path > b.path)) return 'с умением проходит не дальше';
});

check('[citrate] ест голубую еду: без умения клетка проплывает сквозь голубую точку и не растёт, с умением съедает', () => {
  const go = genes => { const w = mw(8, genes), a = w.me[0]; run(w, 0.1, null); const m0 = a.m, q = { x: a.x + 60, y: a.y, ph: 0 }; w.cit.push(q);
    run(w, 2, { dx: 1, dy: 0, p: 1 }); return { ate: !!q.gone, grow: a.m - m0, n: w.cit.length }; };
  const a = go(['citrate']), b = go([]);
  console.log(`    паспорт: голубых точек вокруг ${b.n} | с умением съела ${a.ate}, выросла на ${a.grow.toFixed(3)} | без умения съела ${b.ate}, ${b.grow.toFixed(3)}`);
  if (!b.n) return 'голубых точек в капле нет';
  if (b.ate || b.grow > 0) return 'без умения голубая точка съедается';
  if (!a.ate || !(a.grow > 0)) return 'с умением голубая точка не стала едой';
});

// Пищевой магнит (З1): клетка стоит, палец отпущен. Крупинки на 32, 55 и 80 от неё и россыпь из 10 на 75 с другой стороны.
// Уровень 1 берёт ближнюю, по одной; 2 — дальше и по несколько; 3 — дальше всех и всю россыпь разом, с волной и ленивым поворотом.
const magnetAt = L => { const w = mw(9, L ? ['magnet'] : []), a = w.me[0]; if (L) w.lvl = { magnet: L }; run(w, 0.1, null);
  const one = d => ({ x: a.x + d, y: a.y, vx: 0, vy: 0, s: 0.7 }), near = one(32), mid = one(55), far = one(80), heap = [];
  for (let i = 0; i < 10; i++) { const t = Math.PI + (i - 4.5) * 0.2; heap.push({ x: a.x + Math.cos(t) * 75, y: a.y + Math.sin(t) * 75, vx: 0, vy: 0, s: 0.7 }); }
  w.food.push(near, mid, far, ...heap); let most = 0, ev = 0, lazy = 0;
  for (let t = 0; t < 5; t += 1 / 30) { w.step(1 / 30, null); most = Math.max(most, (a.pulled || []).length); ev += w.events.filter(e => e[0] === 'magnet').length; if (a.casc > 0) lazy++; w.events.length = 0; }
  return { near: !!near.gone, mid: !!mid.gone, far: !!far.gone, heap: heap.filter(f => f.gone).length, most, ev, cascade: w.stats.cascade || 0, lazy, turn: mut.turnRate(w, { mag: L, pulled: [{}] }, 1), still: mut.turnRate(w, { mag: L, pulled: [] }, 1) }; };
check('[magnet] пищевой магнит: еда рядом сама плывёт к клетке; с каждым уровнем — дальше и больше крупинок разом', () => {
  const r = [0, 1, 2, 3].map(magnetAt), [o, a, b, c] = r;
  console.log('    паспорт: уровень → ближняя/средняя/дальняя, из россыпи 10, крупинок разом, нот, каскадов:', r.map((x, i) => `${i}: ${+x.near}${+x.mid}${+x.far} ${x.heap} ×${x.most} ♪${x.ev} ${x.cascade}`).join(' | '));
  if (o.near || o.mid || o.heap) return 'без умения стоящая клетка съела еду издалека';
  if (!a.near || a.mid || a.far) return 'уровень 1 должен взять только ближнюю';
  if (a.most !== 1) return 'уровень 1 тянет не по одной крупинке';
  if (!b.near || !b.mid || b.far || b.most < 2) return 'уровень 2 должен брать дальше и по несколько';
  if (!c.far || c.heap < 10) return 'уровень 3 должен втянуть и дальнюю, и всю россыпь';
  if (!c.cascade || b.cascade) return 'каскад (вся россыпь разом, волна) — только у уровня 3';
  if (!(a.turn < 1 && b.turn < a.turn && c.turn < b.turn) || a.still !== 1) return 'цена: пока еда плывёт, поворот медленнее, и тем медленнее, чем выше уровень';
  if (!(c.ev > b.ev && b.ev > a.ev)) return 'нот серии с уровнем не больше';
  const w = mw(9, ['magnet']); w.lvl = { magnet: 1 }; const ok = w.offer('magnet'); w.pick('magnet'); w.pick('magnet'); const top = !w.offer('magnet');
  if (!ok || w.lvl.magnet !== 3 || !top) return 'дочка не поднимает уровень магнита до 3 (уровень ' + w.lvl.magnet + ')';
  const s = mw(9, ['magnet'], 'swim'); s.lvl = { magnet: 1 }; if (s.offer('magnet')) return 'в обычном заплыве магнит предлагают снова';
});

// Способности записями (Роман 25.11: «чтобы движок был как ядро наше… чтобы больше не пришлось руками писать»; договор design/dlya_dvizhka/dogovor.md, раздел 4):
// у каждого гена игры есть запись способности, её номер есть в книге, характеристики — только из списка договора, у каждой ступени уровня — запись.
check('[sposobnosti] у каждого гена есть запись способности по договору движка, номера — из книги; у каждой gde, zapusk, delaet, cena, vidno', () => {
  const S = JSON.parse(readFileSync(new URL('./sposobnosti.json', import.meta.url))), Z = S.sposobnosti, H = new Set(S.harakteristiki);
  const kniga = readdirSync(new URL('./kniga/zapisi/', import.meta.url)).map(f => readFileSync(new URL('./kniga/zapisi/' + f, import.meta.url), 'utf8')).join('') + readFileSync(new URL('./kniga/geny.md', import.meta.url), 'utf8');
  const net = [...Object.keys(M.genes), ...Object.keys(cfg.genes || {})].filter(g => !Z[g]); if (net.length) return 'нет записи способности: ' + net.join(', ');
  for (const [k, z] of Object.entries(Z)) {
    for (const g of [z.kniga].flat()) if (!g || !kniga.includes(g)) return k + ': номера ' + g + ' нет в книге';
    for (const u of [z, ...(z.urovni || [])]) for (const m of u.menyaet || []) if (m.harakteristika && !H.has(m.harakteristika)) return k + ': характеристики «' + m.harakteristika + '» нет в списке договора';
    if (z.ot && !Z[z.ot]) return k + ': родителя ' + z.ot + ' нет';
    if (!S.zony_gde.includes(z.gde)) return k + ': gde «' + z.gde + '» — не зона из списка';
    if (!S.zapuski.includes(z.zapusk)) return k + ': zapusk «' + z.zapusk + '» не из списка';
    if (!(typeof z.cena === 'number' && z.cena >= 0)) return k + ': cena — не число';
    if (!S.zagotovki.includes(z.vidno?.zagotovka) || !S.zony_gde.includes(z.vidno?.na)) return k + ': vidno — заготовка и зона из списков';
    if (!(z.daet_chast || z.menyaet || z.ishod || z.sled || z.urovni || z.nuzhno || z.ot || z.semya || z.eda_vidy || z.pravilo || z.nasledstvo)) return k + ': нет delaet — что способность делает';
    for (const u of z.urovni || []) for (const v of u.vklyuchaet || []) if (!Z[v]) return k + ': включает ' + v + ', а такой записи нет';
    if (k in M.levels && (z.urovni || []).length !== M.levels[k]) return k + ': ступеней в записи ' + (z.urovni || []).length + ', а в игре ' + M.levels[k];
  }
});

// Круг магнита виден при выборе и сразу после (книга 53, разбор навыков: «при выборе навыка показать его круг на воде»), и магнит тянет только еду.
check('[magnet] круг магнита: вокруг дочки на выборе и вспышкой после выбора; тянет только еду — не комок, не вирус, не клетку', () => {
  const gold = w => { let n = 0; const [r, g, b] = M.magnet.gold; mut.drawWorld({ w, scr: (x, y) => [x, y], z: 1, kids: w.kidsT, ink: { put() {} }, glow: { put: (x, y, s, cr, cg, cb, al) => { if (cr === r && cg === g && cb === b && al > 0.25) n++; } } }); return n; };
  const w = mw(13); const a = w.me[0]; w.kidsT = [{ g: 'magnet', x: a.x, y: a.y, m: 1.7 }, { g: 'shield', x: a.x + 300, y: a.y, m: 1.7 }];
  if (!gold(w)) return 'на выборе вокруг дочки с магнитом нет круга';
  w.kidsT = [{ g: 'shield', x: a.x, y: a.y, m: 1.7 }]; if (gold(w)) return 'круг рисуется и у дочки без магнита';
  w.kidsT = null; w.pick('magnet'); const just = gold(w); run(w, M.magnet.show.t + 0.5, null); const late = gold(w);
  if (!just || late) return 'после выбора круг не вспыхнул или не погас (' + just + ' → ' + late + ')';
  const q = { x: a.x + 15, y: a.y, vx: 0, vy: 0, m: 0.6, a: 0, id: 991, pair: false }; w.prey.push(q); w.crumbs.push({ x: a.x - 15, y: a.y, m: 3, id: 992 }); w.cloud(a.x, a.y + 15, 'me', 0);
  const c = w.crumbs.at(-1), g = w.phages.at(-1); a.pulled = []; w.food.length = 0;
  const inj = w.cfg.inject; w.cfg.inject = 1e9; for (let t = 0; t < 1; t += 1 / 30) w.step(1 / 30, null); w.cfg.inject = inj; // cfg общий на все тесты: вернуть
  if ((a.pulled || []).some(f => f === q || f === c || f === g)) return 'магнит тянет не еду';
});

// Защита от вирусов и яда (З5, книга Г48): уровни — дочка приносит умение снова. 1 — вирус не садится, 2 — и яд шариков не входит, 3 — отскочивший вирус летит на шарик.
const shieldAt = L => { const w = mw(11); for (let i = 0; i < L; i++) w.pick('shield'); return w; };
check('[shield] защита от вирусов и яда: с каждым уровнем — вирус не садится, яд шариков гаснет, вирус отскакивает на шарик; еда входит медленнее', () => {
  const hit = L => { const w = shieldAt(L), a = w.me[0]; run(w, 0.1, null); const q = { x: a.x + 90, y: a.y + 10, vx: 0, vy: 0, m: 0.6, a: 0, id: 990, pair: false }; w.prey.push(q);
    w.cloud(a.x - 12, a.y, 'me', 0); let stick = 0; for (let t = 0; t < 3; t += 1 / 30) { w.step(1 / 30, null); stick += w.events.filter(e => e[0] === 'stick').length; w.events.length = 0; }
    const m0 = a.m; w.grow(a, 0.1); return { stick, poison: mut.shut(w, null, null), coccus: q.sick >= 0 || !!q.gone, gain: a.m - m0, genes: Object.keys(w.genes).join(',') }; };
  const r = [0, 1, 2, 3].map(hit), [o, a, b, c] = r;
  console.log('    паспорт: уровень → вирус сел, яд закрыт, шарик заражён отскочившим, прирост от той же еды:', r.map((x, i) => `${i}: ${x.stick} ${+x.poison} ${+x.coccus} ${x.gain.toFixed(3)} [${x.genes}]`).join(' | '));
  if (!o.stick || o.poison || o.coccus) return 'без умения вирус должен сесть, яд — войти';
  if (a.stick || a.poison) return 'уровень 1: вирус не должен садиться, яд ещё входит';
  if (b.stick || !b.poison || b.coccus) return 'уровень 2: вирус не садится и яд не входит, отскока на шарик ещё нет';
  if (c.stick || !c.poison || !c.coccus) return 'уровень 3: отскочивший вирус должен сесть на шарик';
  if (!(a.gain < o.gain && b.gain < a.gain && c.gain <= b.gain)) return 'цена: от еды растёт медленнее, на уровне 2 заметно медленнее';
  const w = mw(11); w.me[0].m = 9; const got = new Set(); for (let i = 0; i < 40; i++) { w.choice = []; w.me[0].m = 9; w.divide(); w.choice.forEach(g => got.add(g)); }
  if (got.has('lock') || got.has('door')) return 'в режиме «Мутации» замок и дверь приходят по отдельности, а должны ступенями защиты';
});

// Сильный хвост (З5, книга Г49): 1 — ровный ход (steady), 2 — слизь не тормозит и за клеткой коридор, 3 — разгон на прямой. Цена: хищники замечают дальше.
const tailAt = L => { const w = mw(12); for (let i = 0; i < L; i++) w.pick('tail'); return w; };
check('[tail] сильный хвост: с каждым уровнем — ровнее, через слизь без торможения, разгон на прямой; хищники замечают дальше', () => {
  const swim = (L, slime) => { const w = tailAt(L), a = w.me[0]; if (slime) w.slime.push({ x: a.x + 150, y: a.y, a: 0, len: 600, w: 60, id: 995 }); const x0 = a.x; let top = 0;
    for (let t = 0; t < 4; t += 1 / 30) { w.step(1 / 30, { dx: 1, dy: 0, p: 1 }); top = Math.max(top, a.boost || 0); } return { path: a.x - x0, top, cor: (w.corridor || []).length, genes: Object.keys(w.genes).join(','), turn: mut.turnRate(w, { boost: 1 }, 1) / mut.turnRate(w, { boost: 0 }, 1) }; };
  const r = [0, 1, 2, 3].map(L => ({ L, water: swim(L, false), slime: swim(L, true) }));
  console.log('    паспорт: уровень → путь за 4 с в воде / в слизи, разгон, точек коридора:', r.map(x => `${x.L}: ${x.water.path.toFixed(0)}/${x.slime.path.toFixed(0)} ↑${x.water.top.toFixed(1)} ⋯${x.slime.cor} [${x.water.genes}]`).join(' | '));
  const [o, a, b, c] = r;
  if (!a.water.genes.includes('steady')) return 'уровень 1 должен дать ровный ход (steady)';
  if (!(b.slime.path > a.slime.path * 1.2) || !b.slime.cor || a.slime.cor) return 'уровень 2: в слизи не тормозит и оставляет коридор';
  if (!(c.water.top >= 1) || !(c.water.path > b.water.path * 1.1) || b.water.top) return 'уровень 3: разгон на прямой только у третьего';
  if (!(c.water.turn < 1)) return 'на разгоне поворот должен быть шире';
  const hear = L => { const w = tailAt(L), a = w.me[0]; return !!w.rodNear({ x: a.x + 115, y: a.y }, 100); };
  if (hear(0) || !hear(1) || !hear(3)) return 'цена: хищники должны замечать клетку с хвостом дальше, на каждом уровне';
});

// Память о вирусах (З5, книга Г50): 1 — пережила первый вирус, второй такой же режет; 2 — дочки рождаются с памятью матери; 3 — знакомый вирус становится едой.
check('[memory] память о вирусах: первый вирус не убивает, второй режется; дочки помнят; знакомый вирус становится едой', () => {
  const shot = (w, a) => { w.phages.push({ x: a.x, y: a.y, vx: 0, vy: 0, host: 'me', d: 0, on: a, t: 0.01, off: 0 }); const m0 = a.m; w.step(1 / 30, null); w.step(1 / 30, null); return { sick: a.sick >= 0, dm: a.m - m0 }; };
  const go = L => { const w = mw(14); for (let i = 0; i < L; i++) w.pick('memory'); const a = w.me[0]; a.m = 2; run(w, 0.1, null);
    const first = shot(w, a), second = shot(w, a); a.m = 9; w.divide(); w.choice = []; const kid = w.me.find(b => b !== a); const k = kid ? shot(w, kid) : null; return { first, second, kid: k }; };
  const r = [0, 1, 2, 3].map(go), f = x => `${+x.sick}/${x.dm.toFixed(2)}`;
  console.log('    паспорт: уровень → первый вирус (болеет/сила), второй, вирус на дочке:', r.map((x, i) => `${i}: ${f(x.first)} ${f(x.second)} ${x.kid ? f(x.kid) : '—'}`).join(' | '));
  const [o, a, b, c] = r;
  if (!o.first.sick) return 'без умения вирус заражает';
  if (a.first.sick || !(a.first.dm < 0)) return 'уровень 1: первый вирус не убивает, но клетка худеет';
  if (a.second.sick || a.second.dm < 0) return 'уровень 1: второй такой же вирус клетку не трогает';
  if (!a.kid || !(a.kid.dm < 0)) return 'уровень 1: дочка ещё не помнит вирус матери';
  if (!b.kid || b.kid.sick || b.kid.dm < 0) return 'уровень 2: дочка рождается с памятью матери';
  if (!(c.second.dm > 0) || b.second.dm > 0) return 'уровень 3: знакомый вирус становится едой';
});

// Режим «Голод» (Роман 25.11 08:47: «Да отдельным режимом давай попробуем»): без еды клетка худеет и гибнет.
const starveT = (genes, m0 = 1, mode = 'golod') => { const w = mw(4, genes, mode), a = w.me[0]; a.m = m0; let t = 0; for (; t < 200 && w.me.length; t += 1 / 30) w.step(1 / 30, null); return { t, w, a }; };
check('режим «Голод»: в пустой воде клетка худеет и гибнет от голода, в обычном заплыве — нет', () => {
  const a = starveT([]), b = starveT([], 1, 'swim');
  console.log(`    паспорт: в голоде клетка с силой 1 прожила ${a.t.toFixed(0)} с, гибель от голода ${a.w.stats.starved || 0} | в обычном заплыве за 200 с жива ${b.w.me.length > 0}, сила ${b.a.m.toFixed(2)}`);
  if (!a.w.stats.starved || a.t > 60) return 'в голоде клетка не гибнет без еды';
  if (!b.w.me.length || b.a.m < 1) return 'обычный заплыв тоже голодает';
  const w = mw(4, [], 'golod'); w.me[0].m = 9; w.divide(); const offer = [...w.choice];
  console.log(`    паспорт: в голоде дочки предложили ${offer.join(',')}`);
  if (!offer.some(g => M.golod.genes.includes(g))) return 'в голоде дочки не приносят умений голода';
  if (offer.some(g => g in M.genes && !M.golod.genes.includes(g))) return 'в голоде пришла мутация другого режима';
});
check('[lean] дольше без еды: без еды клетка быстро мельчает и живёт заметно дольше', () => {
  const a = starveT(['lean']), b = starveT([]);
  let small = 0; { const w = mw(4, ['lean'], 'golod'), c = w.me[0]; for (let t = 0; t < 12; t += 1 / 30) w.step(1 / 30, null); small = c.m; }
  console.log(`    паспорт: с умением прожила ${a.t.toFixed(0)} с, через 12 с сила ${small.toFixed(2)} | без умения ${b.t.toFixed(0)} с`);
  if (!(a.t > b.t * 1.5)) return 'с умением голодает не дольше';
  if (!(small < M.lean.small)) return 'клетка не мельчает';
});
check('[store] копит запас: наелась — внутри крупинки; в пустой воде они тают, и клетка живёт дольше', () => {
  const go = genes => { const w = mw(4, genes, 'golod'), a = w.me[0]; a.m = 1.9; for (let i = 0; i < 40; i++) { w.grow(a, w.cfg.food); w.step(1 / 30, null); if (a.m > 1.95) a.m = 1.95; } // ест вволю, но до деления не дорастает
    const st = a.store || 0; let t = 0; for (; t < 300 && w.me.length; t += 1 / 30) w.step(1 / 30, null); return { st, t, left: a.store || 0 }; };
  const a = go(['store']), b = go([]);
  console.log(`    паспорт: с умением крупинок после еды ${a.st}, прожила в пустой воде ${a.t.toFixed(0)} с, крупинок в конце ${a.left} | без умения ${b.t.toFixed(0)} с`);
  if (!a.st) return 'запас не копится';
  if (a.left >= a.st) return 'крупинки не тают';
  if (!(a.t > b.t)) return 'с запасом клетка живёт не дольше';
});

// «Сцепка» (Г24) — в обычном заплыве. Семья из шести сестёр плывёт за пальцем 10 с.
const family = (genes, n = 6) => { const w = mw(21, genes, 'swim'); const a = w.me[0]; a.m = 1.5;
  for (let i = 1; i < n; i++) w.me.push({ ...a, id: 10 + i, x: (i % 3) * 40 - 40, y: Math.floor(i / 3) * 40, vx: 0, vy: 0, sick: -1 }); return w; };
const spread = w => { const c = w.center(); return Math.max(...w.me.map(b => Math.hypot(b.x - c.x, b.y - c.y))); };
check('[flu] сцепка: сёстры держатся строем за пальцем, без гена расплываются (Роман 25.11: «все расплывается сильно по экрану»)', () => {
  // Шесть сестёр в живой капле (соседи едят и ловят как обычно) 40 с плывут за пальцем зигзагом. Меряем после первых 5 с:
  // среднее расстояние сестры до середины семьи и разнобой хода. Среднее, а не самая дальняя: одну сестру может на миг утащить пасть.
  const go = genes => { let far = 0, dis = 0, n = 0;
    for (const seed of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]) { const w = new World(cfg, seed); w.mode = 'swim'; w.divide = () => {}; for (const g of genes) w.genes[g] = true; // семья не растёт: у новорождённой рывок назад — это не разнобой строя
      const a = w.me[0]; a.m = 1.5; for (let i = 1; i < 6; i++) w.me.push({ ...a, id: 10 + i, x: a.x + (i % 3) * 40 - 40, y: a.y + Math.floor(i / 3) * 40, vx: 0, vy: 0, sick: -1 });
      for (let t = 0; t < 40 && w.me.length > 2; t += 1 / 30) { if (w.choice.length) w.pick(w.choice[0]);
        const ang = Math.floor(t / 1.5) * 2.1; w.step(1 / 30, { dx: Math.cos(ang), dy: Math.sin(ang), p: 1 }); // палец водит зигзагом
        if (t < 5) continue; const c = w.center(), L = w.me.length; let vx = 0, vy = 0; for (const b of w.me) { vx += b.vx; vy += b.vy; } vx /= L; vy /= L;
        far += w.me.reduce((s, b) => s + Math.hypot(b.x - c.x, b.y - c.y), 0) / L; dis += w.me.reduce((s, b) => s + Math.hypot(b.vx - vx, b.vy - vy), 0) / L; n++; } }
    return { far: far / n, dis: dis / n }; };
  const a = go(['flu']), b = go([]);
  console.log(`    паспорт: 10 заплывов по 40 с, шесть сестёр, палец зигзагом — сестра от середины семьи в среднем: со сцепкой ${a.far.toFixed(0)}, без ${b.far.toFixed(0)} | разнобой хода сестёр: ${a.dis.toFixed(1)} и ${b.dis.toFixed(1)}`);
  // Главное — семья стоит плотом: сестра от середины не дальше 1,3 размера плота (как соты, M.flu.pack). Без сцепки та же семья заметно шире;
  // насколько шире, решает мир (толчки, пасти), поэтому сравнение мягче: 0,8 (25.11, толчок кокка #188 сжал и семью без сцепки).
  const raftR = 13 * Math.sqrt(1.5) * Math.sqrt(6) * M.flu.pack;
  if (!(a.far < raftR * 1.3)) return 'со сцепкой семья не стоит плотом: сестра от середины ' + a.far.toFixed(0) + ' при плоте ' + raftR.toFixed(0);
  if (!(a.far < b.far * 0.8)) return 'со сцепкой семья не держится вместе';
  if (!(a.dis < b.dis * 0.6)) return 'со сцепкой сёстры плывут вразнобой';
});
check('[flu] сцепка: туфелька не втягивает сестру из плота, одиночку втягивает', () => {
  const hold = (genes, n) => { const w = family(genes, n); run(w, 3, null); const a = w.me[0]; w.grab(a, 'slipper', {}); return !!a.grab; };
  const big = hold(['flu'], M.flu.min.slipper + 1), small = hold(['flu'], 2), none = hold([], M.flu.min.slipper + 1);
  console.log(`    паспорт: пасть туфельки схватила — из плота в ${M.flu.min.slipper + 1}: ${big}, из пары: ${small}, без сцепки: ${none}`);
  if (big) return 'плот не спас'; if (!small) return 'пара спаслась, хотя меньше порога'; if (!none) return 'без сцепки не схватила — сравнение не работает';
});
check('[flu] сцепка: амёба объедает плот с края по одной — после куска сыта, остальные живы', () => {
  const left = genes => { const w = family(genes); w.divide = () => {}; run(w, 2, null); const c = w.center();
    w.amoebas = [{ x: c.x + 50, y: c.y, vx: 0, vy: 0, m: 8, id: 99 }]; run(w, 10, null); return w.me.length; };
  const a = left(['flu']), b = left([]);
  console.log(`    паспорт: шесть сестёр стоят у амёбы 10 с — осталось со сцепкой ${a}, без ${b}`);
  if (!(a >= 3)) return 'амёба глотает плот целиком';
  if (!(a > b)) return 'без сцепки амёба ест так же медленно — сравнение не работает';
});
check('[flu] сцепка: цена — вирус сел на сестру в плоту, соседняя помечена больной', () => {
  const land = genes => { let n = 0, m = 0;
    for (const seed of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]) { const w = family(genes); let k = seed; w.r = () => (k = (k * 16807) % 2147483647) / 2147483647; run(w, 3, null);
      const a = w.me[0]; w.phages = [{ x: a.x, y: a.y, vx: 0, vy: 0, d: 0, host: 'me', on: a, t: 0.02, off: 0 }]; run(w, 0.1, null);
      n += w.me.filter(b => b !== a && b.sick >= 0).length; m += w.events.filter(e => e[0] === 'sick').length; } return { n, m }; };
  const a = land(['flu']), b = land([]);
  console.log(`    паспорт: 10 раз вирус сел на сестру — заболело соседних со сцепкой ${a.n} (меток на экране ${a.m}), без ${b.n} (${b.m})`);
  if (!(a.n >= 3)) return 'вирус в плоту не переходит на соседнюю';
  if (a.n > 10) return 'вирус переходит больше чем на одну соседнюю';
  if (b.n) return 'без сцепки соседняя тоже заболевает — сравнение не работает';
  if (!(a.m > b.m)) return 'больную соседнюю не видно';
});

check('мутации только в режиме «Мутации»: в обычном заплыве их не дают и они не действуют', () => {
  const w = mw(11, [], 'swim'), keys = Object.keys(M.genes);
  w.me[0].m = 9; let offered = new Set();
  for (let i = 0; i < 30; i++) { w.choice = []; w.splits = i * cfg.gene_every; w.me.length = 1; w.me[0].m = 9; w.divide(); w.choice.forEach(g => offered.add(g)); if (w.choice[0]) w.pick(w.choice[0]); }
  const leak = keys.filter(g => offered.has(g) && !(M.everywhere || []).includes(g)), pipe = new World(cfg, 1); pipe.mode = 'swim';
  const s = mw(3, ['snap', 'gas'], 'swim'), u = uturn(s), y0 = mw(7, ['gas'], 'swim'); const yy = y0.me[0].y; run(y0, 4, null);
  console.log(`    паспорт: в обычном заплыве предложено ${[...offered].join(',')} | щелчков ${u.snaps}, подъём ${(yy - y0.me[0].y).toFixed(0)}`);
  if (leak.length) return 'в обычном заплыве дочки приносят ' + leak;
  if (u.snaps || yy - y0.me[0].y > 30) return 'мутации действуют вне режима';
});

check('режим «Мутации»: одна дочка приносит новую мутацию, другая — прежнее умение; чужие — только соседка по трубочке', () => {
  const w = mw(13); const got = [];
  for (let i = 0; i < 14; i++) { w.choice = []; w.splits = i * cfg.gene_every; w.me.length = 1; w.me[0].m = 9; w.divide(); if (w.choice[0]) { got.push(...w.choice); w.pick(w.choice.find(g => g in M.genes) || w.choice[0]); } }
  const own = Object.keys(M.genes).filter(g => !M.pipe.includes(g) && !M.golod.genes.includes(g) && !Object.values(M.combo).flat(2).includes(g)); // умения голода живут в режиме «Голод»; прежние гены объединённых умений приходят их ступенями
  console.log(`    паспорт: дочки предложили ${got.join(',')}`);
  if (!own.every(g => got.includes(g))) return 'не все свои мутации пришли дочкам';
  if (got.some(g => M.pipe.includes(g))) return 'чужая мутация пришла дочке, а не по трубочке';
  if (!got.some(g => !(g in M.genes))) return 'прежние умения дочкам не приходят (О43)';
});

// Облако вирусов вокруг клетки (как после лопнувшей соседки): встреча с вирусом в обычной игре редкая (замер 25.11: 7 посадок за 18 минут),
// поэтому бот-замер умений против вирусов ставит клетку в облако — проверяем, что умение работает в деле, а не то, как часто вирус встречается.
const virusy = (w, n = 14) => { const a = w.me[0]; for (let i = 0; i < n; i++) { const t = i / n * 6.283; w.cloud(a.x + Math.cos(t) * (120 + 20 * (i % 4)), a.y + Math.sin(t) * (120 + 20 * (i % 4)), 'me', 20); } };
// Бот режима «Мутации»: делится, плывёт к еде, от опасных отворачивает, берёт первую дочку. Встречает ли он то, где мутация важна.
const bot = w => {
  if (w.choice.length) w.pick(w.choice[0]);
  if (w.readyToSplit() && w.me.length < 6) w.divide(); // делится: сёстры — те, кого спасает тихая гибель
  const c = w.center(); let best = null, bd = 1e9;
  for (const f of [...w.food, ...w.donors]) { const d = Math.hypot(f.x - c.x, f.y - c.y); if (d < bd) { bd = d; best = f; } }
  let tx = best ? best.x : c.x + 100, ty = best ? best.y : c.y;
  for (const e of [...w.amoebas, ...w.bdellos, ...w.pseudos]) { const d = Math.hypot(e.x - c.x, e.y - c.y); if (d < 220) { tx = c.x + (c.x - e.x) * 2; ty = c.y + (c.y - e.y) * 2; } }
  return { x: tx, y: ty };
};
// Для каждой мутации — 6 заплывов бота, у которого с начала только она: встречает ли он то, где она важна.
check('бот в режиме «Мутации» встречает каждую мутацию в деле: щелчок, тихая гибель, всплытие, кокк у закрытой двери, вирус на пузырьке', () => {
  const meet = { snap: 0, abort: 0, gas: 0, door: 0, decoy: 0, flu: 0, steady: 0, citrate: 0, lean: 0, store: 0, magnet: 0, shield: 0, tail: 0, memory: 0 };
  for (const g of Object.keys(meet)) for (const seed of [1, 2, 3, 4, 5, 6]) {
    const w = new World(cfg, seed); w.mode = M.golod.genes.includes(g) ? 'golod' : 'mut'; if (g in M.levels) w.pick(g); else w.genes[g] = true; // умение с уровнями приходит, как от дочки
    if (g === 'abort' || g === 'decoy' || g === 'shield' || g === 'memory') { const P = cfg.pond; w.me[0].y = (P.film * 0.6 - P.y0) * P.h; w.tidy = 0; virusy(w); } // вирусы живут в сладкой воде под плёнкой; бот заплывает в их облако
    for (let t = 0; t < 120 && w.me.length; t += 1 / 30) {
      const near = g === 'abort' || g === 'decoy' || g === 'shield' || g === 'memory'; // против вирусов бот палец не отпускает: в живой капле стоящего съедают раньше вируса
      const aim = !near && (t % 6) < 1 ? null : bot(w), a0 = w.me[0];
      const sharp = g === 'steady' && aim && a0 && !a0.tumble && Math.abs(wrap(Math.atan2(aim.y - a0.y, aim.x - a0.x) - a0.a)) > cfg.swim.tumble_angle; // поворот, на котором без умения был бы кувырок
      w.step(1 / 30, aim); // иногда отпускает палец
      if (sharp && w.me[0] === a0 && !a0.tumble) meet.steady++;
      for (const e of w.events) if (e[0] === g || (g === 'shield' && e[0] === 'shrug')) meet[g]++; // защита: вирус отскочил от оболочки
      w.events.length = 0;
      if (g === 'door') for (const a of w.me) for (const q of w.prey) if (Math.hypot(a.x - q.x, a.y - q.y) < 30) meet.door++;
      if (g === 'gas' && w.me[0] && w.me[0].lift > M.gas.up / 2) meet.gas++;
      if (g === 'lean') for (const a of w.me) if (a.m < M.lean.small) meet.lean++; // голодала мелкой — там умение экономит
    }
    if (g === 'decoy') meet.decoy += w.stats.decoy || 0;
    if (g === 'flu') meet.flu += w.stats.raft || 0;
    if (g === 'citrate') meet.citrate += w.stats.citrate || 0;
    if (g === 'memory') meet.memory += (w.stats.learned || 0) + (w.stats.cutKnown || 0); // пережила вирус или разрезала знакомый
    if (g === 'tail') meet.tail += Math.round(w.stats.boost || 0) + (w.stats.corridor || 0); // разгон на прямой и коридор в слизи
    if (g === 'magnet') meet.magnet += w.stats.magnet || 0; // крупинка сама приплыла и съедена
    if (g === 'store') meet.store += w.stats.melted || 0; // крупинка растаяла, когда еды не было рядом
  }
  console.log('    паспорт: за 6 заплывов по 120 с — щелчков', meet.snap, '| тихих гибелей', meet.abort, '| кадров всплытия', meet.gas, '| кадров у кокка с закрытой дверью', meet.door, '| вирусов на пузырьках', meet.decoy, '| ровно на крутом повороте', meet.steady, '| голубых точек съедено', meet.citrate, '| кадров голода мелкой', meet.lean, '| растаяло крупинок', meet.store, '| приплыло магнитом', meet.magnet, '| вирус отскочил от защиты', meet.shield, '| хвост: секунд разгона и точек коридора', meet.tail, '| память: пережито и разрезано вирусов', meet.memory, '| пасть сорвалась с плота', meet.flu);
  const miss = Object.keys(meet).filter(g => !meet[g]);
  if (miss.length) return 'бот не встретил, где важно: ' + miss.join(', ');
});

// Бот обычного заплыва со сцепкой (новых генов не берёт: память о вирусах закрыла бы заражение). 6 заплывов по 3 минуты, раз в минуту рядом облако вирусов.
check('[flu] сцепка: в обычном заплыве бот встречает цену — вирус сел на сестру, заболела и соседняя', () => {
  const per = [];
  for (const seed of [1, 2, 3, 4, 5, 6]) { const w = new World(cfg, seed); w.mode = 'swim'; w.genes.flu = true; let sat = 0;
    virusy(w); for (let t = 0; t < 180 && w.me.length; t += 1 / 30) { w.choice = []; w.step(1 / 30, bot(w)); if (t > 0 && Math.abs(t % 60) < 1 / 60) virusy(w); sat += w.events.filter(e => e[0] === 'sick').length; w.events.length = 0; }
    per.push(`${sat - (w.stats.fluSick || 0)}/${w.stats.fluSick || 0}`); }
  console.log('    паспорт: по заплывам «вирус сел сам / заболела соседняя»:', per.join(' '));
  if (!per.some(x => +x.split('/')[1] > 0)) return 'за 18 минут игры цена ни разу не случилась';
});

// Вид на теле: те же кисти, что у клетки в игре (vid.skin). Своих точек не меньше 6, у разворота — один длинный хвост.
const paint = (genes, a = {}) => { const pts = [], brush = { put: (...v) => pts.push(v.map(n => Math.round(n * 100) / 100).join()) };
  const c = { id: 1, m: 1, a: 0, vx: 0, vy: 0, ...a }, lk = look(genes, cfg.look, 0);
  vid.skin({ a: c, lk, x: 0, y: 0, ang: 0, ax: 1, ay: 0, half: 20, w: 9, z: 1, along: (u, o) => [u, o], arc: () => 0, body: { at: () => [0, 0] }, scr: (x, y) => [x, y],
    time: 1, pdt: 0, run: false, phageNear: false, foodNear: false, spacers: 0, plasmid: false, cfg, alive: [c], glow: brush, ink: brush });
  const fl = ',' + cfg.flag.color.join() + ','; return { pts: pts.filter(p => !p.includes(fl)), lk }; };
check('каждая новая мутация видна на теле своими точками', () => {
  const base = new Set(paint({}).pts), miss = [], n = {};
  for (const g of Object.keys(M.genes)) { const own = paint({ [g]: true }, g === 'snap' ? { snap: M.snap.time } : g === 'store' ? { store: M.store.n } : {}).pts.filter(p => !base.has(p)).length; n[g] = own; if (own < 6 && g !== 'snap') miss.push(g + ' (' + own + ')'); }
  const sl = paint({ snap: true }).lk.flagella, sn = n.snap;
  console.log('    паспорт: своих точек', JSON.stringify(n), '| хвостов у разворота', sl);
  if (sl !== 1) miss.push('у разворота не один хвост');
  if (!sn) miss.push('щелчок разворота не виден');
  return miss.length ? 'не видно: ' + miss.join(', ') : '';
});

check('test_mut_scepka_shchelchok: сёстры сцепились — застёжка щёлкает: вспыхивает, зубцы сходятся, у шва мягкая вспышка и гаснет, зубцы — сплошные черты; расцепились надолго и снова встали — щёлкает снова, на краю не мигает (дизайнер)', () => {
  const w = mw(3, ['flu']), a = w.me[0]; a.m = 1; w.me.push({ ...a, id: 99, x: a.x + 40, y: a.y, vx: 0, vy: 0 }); // щель 14: застёжке есть что тянуть
  const shot = () => { const ring = [], hot = []; const b = { put: (x, y, r, cr, cg, cb, al) => { if (cr === 0.75) ring.push({ x, y, r, al }); else if (cr === 0.55) hot.push(al); } };
    drawWorld({ w, scr: (x, y) => [x, y], z: 1, glow: b, ink: { put: () => {} } }); return { ring: ring.filter(q => q.al > 0.01), hot: Math.max(0, ...hot) }; };
  w.stats.time = 10; const s0 = shot(); w.stats.time = 10.1; const s1 = shot(); w.stats.time = 11; const s2 = shot();
  if (!s0.hot) return 'застёжек нет'; if (!(s0.hot > s2.hot * 1.5)) return 'застёжка не вспыхнула при сцепке: ' + s0.hot.toFixed(2) + ' против ' + s2.hot.toFixed(2);
  if (s1.ring.length !== 1 || s1.ring[0].r < 4) return 'нет мягкой вспышки у шва (одно пятно): ' + s1.ring.length; if (s2.ring.length) return 'вспышка не погасла';
  const bar = []; drawWorld({ w, scr: (x, y) => [x, y], z: 1, glow: { put: (x, y, r, cr) => { if (cr === 0.55) bar.push({ x, y, r }); } }, ink: { put: () => {} } });
  let gap = 0; for (let i = 1; i < bar.length; i++) { const d = Math.hypot(bar[i].x - bar[i - 1].x, bar[i].y - bar[i - 1].y); if (d < 4 && d > bar[i].r + bar[i - 1].r) gap++; }
  if (gap) return 'застёжка бусами: разрывов ' + gap + ' (L047)';
  w.me[1].x += 200; w.stats.time = 11.2; shot(); w.me[1].x -= 200; w.stats.time = 11.4; if (shot().hot > s2.hot * 1.5) return 'на краю застёжка мигает щелчками';
  w.me[1].x += 200; w.stats.time = 12; shot(); w.stats.time = 14; shot(); w.me[1].x -= 200; w.stats.time = 15; const s3 = shot();
  if (!(s3.hot > s2.hot * 1.5)) return 'повторная сцепка не щёлкнула';
  return '';
});

console.log(bad ? `МУТАЦИИ: провалов ${bad}` : 'МУТАЦИИ: все проверки прошли');
process.exit(bad ? 1 : 0);
