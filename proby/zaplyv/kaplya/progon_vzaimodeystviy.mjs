// Песочница всех взаимодействий «Капли» (pravki_po_blokam.md Д.11; Роман 27.11 14:44: «проверять все взаимодействия на стандарты индустрии»).
// node proby/zaplyv/kaplya/progon_vzaimodeystviy.mjs [--md путь]. Без экрана, мир настоящий (sim.js, таблица boj, кнопка «Яд», правило «живое не съесть»).
// Каждое оружие игрока (уровни 1 и 3) и «без оружия» × каждый житель из boj.celi, житель вплотную у носа, клетка вдвое тяжелее его, 15 с.
// По паре: ответ мира за 0,3 с (боль — укол, щит — отказ с причиной, нет), итог (убит за N с / жив), причина, повтор трижды — тот же итог.
// Ворота (стандарт отклика Д.10 п. 5): у каждой пары есть ответ мира за 0,3 с; кто не убит — у того видна причина; три повтора совпали. Иначе выход 1.
import fs from 'fs'; import { World, radius } from '../sim.js'; import * as mut from '../mutacii.js'; import * as zh from './zhiteli.js'; import * as boj from './boj.js';
const base = JSON.parse(fs.readFileSync(new URL('../data.json', import.meta.url))), KAP = JSON.parse(fs.readFileSync(new URL('./kaplya.json', import.meta.url))), B = KAP.boj, DT = 1 / 30, T = 15;
const PUSTO = ['pseudos', 'donors', 'bdellos', 'prey', 'amoebas', 'phages', 'bells', 'rotis', 'slippers', 'bodos', ...Object.values(zh.SPISKI), 'food', 'crumbs', 'plants', 'slime'];
const PRICHINA = { daleko: 'далеко', stenka: 'стенка не пускает', uroven: 'нужен уровень выше', zhivoe: 'живое: сначала убить' };
function para(g, l, ck) { const C = B.celi[ck], cfg = boj.v_mir(JSON.parse(JSON.stringify(base)), B); mut.addGenes(cfg); const w = new World(cfg, 5); w.mode = 'evo'; zh.nachalo(w); w.step(DT, null); w.lose = () => {};
  for (const k of PUSTO) w[k] = []; w.zhivoe = boj.zhivoe(B); const mq = C.massa, a = w.me[0]; a.m = mq * 2; a.a = 0; if (g) { w.genes[g] = true; (w.lvl ||= {})[g] = l; w.knopka = { [g]: true }; }
  const q = { id: 9999, x: 0, y: 0, a: Math.PI, m: mq, vx: 0, vy: 0, t: 0, faza: 'sidit', syt: 0, sytN: 0, dom: { x: 9e3, y: 9e3 } }; w[C.spisok] = [q];
  const d = radius(a.m) + radius(mq) * C.k_r + 2; let otvet = null, prichina = null, gibel = null;
  for (let t = 0; t < T && gibel == null; t += DT) { q.x = a.x + d; q.y = a.y; q.vx = q.vy = 0; a.vx = a.vy = 0; a.a = 0; w.events.length = 0; const S = boj.do_hoda(w, B); w.step(DT, null); if (!q.gone) { q.x = a.x + d; q.y = a.y; } boj.posle_hoda(w, DT, B, radius, S);
    for (const e of w.events) { if (e[0] === 'otkaz') { prichina ||= e[4]; if (otvet == null && t <= 0.3) otvet = 'щит'; } else if (g && e[0] === B.oruzhie[g].sobytie && otvet == null && t <= 0.3) otvet = 'боль'; }
    if (q.gone || !w[C.spisok].includes(q)) gibel = t; }
  return { otvet, prichina, gibel: gibel == null ? null : +gibel.toFixed(1) }; }
const oruzhie = [[null, 0], ...Object.keys(B.oruzhie).filter(g => g !== '_').flatMap(g => [[g, 1], [g, 3]])], celi = Object.keys(B.celi).filter(k => k !== '_');
const stroki = [], ploho = [];
for (const [g, l] of oruzhie) for (const ck of celi) { const r = [para(g, l, ck), para(g, l, ck), para(g, l, ck)], x = r[0], povtor = r.every(y => y.gibel === x.gibel && y.otvet === x.otvet);
  const imya = g ? `${B.oruzhie[g].imya} ${l}` : 'без оружия', itog = x.gibel != null ? `убит за ${x.gibel} с` : 'жив', pr = x.prichina ? PRICHINA[x.prichina] || x.prichina : x.gibel != null ? '' : 'не видна';
  const beda = [!x.otvet && 'нет ответа за 0,3 с', x.gibel == null && !x.prichina && 'причина не видна', !povtor && 'повторы разошлись'].filter(Boolean);
  stroki.push(`| ${imya} | ${ck} | ${x.otvet || '—'} | ${itog} | ${pr} | ${povtor ? 'да' : 'нет'} | ${beda.length ? beda.join('; ') : 'годится'} |`); if (beda.length) ploho.push(`${imya} × ${ck}: ${beda.join('; ')}`); }
const md = `# Прогон всех взаимодействий «Капли»\n\nСобрано \`kaplya/progon_vzaimodeystviy.mjs\` (pravki_po_blokam.md Д.11). Житель вплотную у носа, клетка вдвое тяжелее его, ${T} с; кнопочный яд держим. Ответ мира: «боль» — укол прошёл, «щит» — отказ с причиной (видно серой обводкой и щитом).\n\n| Оружие | Житель | Ответ за 0,3 с | Итог | Почему не берёт | 3 повтора | Отметка |\n|---|---|---|---|---|---|---|\n${stroki.join('\n')}\n\nПар: ${stroki.length}, не прошли стандарт: ${ploho.length}.\n`;
const i = process.argv.indexOf('--md'); if (i > 0) fs.writeFileSync(process.argv[i + 1], md); else console.log(md);
console.log(ploho.length ? `  ПРОВАЛ прогон взаимодействий: ${ploho.length} пар без ответа или причины:\n    ${ploho.slice(0, 12).join('\n    ')}` : `  ок прогон взаимодействий: ${stroki.length} пар, у каждой ответ мира за 0,3 с, причина видна, повторы совпали`);
process.exit(ploho.length ? 1 : 0);
