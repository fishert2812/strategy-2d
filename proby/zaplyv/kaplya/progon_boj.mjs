// Прогон боя «Капли» без рисования (Роман 26.11 21:40: «Можно прогнать симуляции - простые в исполнении для того чтобы не обосраться»).
// node proby/zaplyv/kaplya/progon_boj.mjs [файл]. Мир настоящий (sim.js, evo.js, жители «Капли», таблица боя boj.js). Клетка с каждым навыком и каждым уровнем
// встречает по одному каждого жителя и держится к нему вплотную T секунд. В клетке: «Т 3.2» — житель погиб за 3,2 с; «Ж 5.1» — погибла ты;
// «·0.7» — оба живы, у жителя осталось 0,7 генома; «·» — оба живы и целы. Внизу — навыки, которые один на один ни с кем ничего не меняют против клетки без навыков.
// Гонять перед каждым шагом с навыками; вывод класть в design/partii/progon_boj.txt.
import fs from 'fs'; import { World, radius } from '../sim.js'; import * as evo from '../evo.js'; import * as mut from '../mutacii.js'; import * as zh from './zhiteli.js'; import * as boj from './boj.js';
const base = JSON.parse(fs.readFileSync(new URL('../data.json', import.meta.url))), KAP = JSON.parse(fs.readFileSync(new URL('./kaplya.json', import.meta.url))), B = KAP.boj;
const M = JSON.parse(fs.readFileSync(new URL('../mutacii.json', import.meta.url))), T = 20, DT = 1 / 30, MAS = 1.5;
const mir = () => { const cfg = JSON.parse(JSON.stringify(base)); mut.addGenes(cfg); cfg.sense_idle = KAP.upravlenie.sense_idle; cfg.sense_pull = KAP.upravlenie.sense_pull; const w = new World(cfg, 9); w.mode = 'evo'; zh.nachalo(w); return w; };
const SPISKI = ['pseudos', 'donors', 'bdellos', 'prey', 'amoebas', 'phages', 'bells', 'rotis', 'slippers', ...Object.values(zh.SPISKI)];
// по образцу каждого жителя: обходим воду и берём первого встречного каждого вида
const obrazcy = (() => { const w = mir(), out = new Map(); w.lose = () => {}; w.step(DT, null);
  for (let i = 0; i < 30 && out.size < 40; i++) { zh.shag(w, DT, KAP.novye, () => true, radius); for (const L of SPISKI) for (const q of w[L] || []) { const k = L + ':' + (q.vid || (q.strain ? 'strain' : '')); if (!out.has(k) && !q.gone) out.set(k, [L, JSON.parse(JSON.stringify(q, (key, v) => key === 'dom' || key === 'on' || key === 'gn' ? undefined : v))]); }
    if (!w.me[0]) break; w.me[0].x += 1600 * (i % 2 ? 1 : -1); w.me[0].y += 1100; w.step(DT, null); }
  return out; })();
const boi = (geny, [L, obr]) => { const w = mir(); w.step(DT, null); let gibel = null; w.lose = (a, x, y, who) => { gibel = gibel ?? who ?? 'кто-то'; };
  for (const k of SPISKI) w[k] = []; for (const k of ['food', 'crumbs', 'plants', 'slime']) w[k] = []; w.me = [w.me[0]]; const a = w.me[0]; a.m = MAS;
  for (const [g, l] of geny) { w.genes[g] = true; (w.lvl ||= {})[g] = l; }
  const q = { ...obr, id: 9999, gone: false, x: a.x + radius(MAS) + 14, y: a.y }; if (L === 'kaulo') q.dom = { x: q.x + 30, y: q.y }; w[L].push(q);
  for (let t = 0; t < T; t += DT) { const d = Math.hypot(q.x - a.x, q.y - a.y) || 1, R = radius(a.m); a.a = Math.atan2(q.y - a.y, q.x - a.x); if (d > R + 8) { a.x = q.x - (q.x - a.x) / d * (R + 6); a.y = q.y - (q.y - a.y) / d * (R + 6); } a.vx = a.vy = 0;
    const S = boj.do_hoda(w, B); w.step(DT, null); boj.posle_hoda(w, DT, B, radius, S);
    if (gibel) return 'Ж ' + t.toFixed(1); if (q.gone || !w[L].includes(q)) return 'Т ' + t.toFixed(1); if (!w.me.includes(a)) return 'Ж ' + t.toFixed(1); }
  return q.gn && q.gn.f < 0.995 ? '·' + Math.max(0, q.gn.f).toFixed(1) : '·'; };
const navyki = [['без навыков', []]], cfg0 = mir().cfg;
for (const g of [...new Set([...Object.keys(cfg0.genes), ...evo.E.svoi])]) { if (evo.E.bez.includes(g)) continue; const n = (B.oruzhie[g] || {}).sila?.length || M.levels[g] || 1; for (let l = 1; l <= n; l++) navyki.push([g + (n > 1 ? ' ' + l : ''), [[g, l]]]); }
const kto = [...obrazcy.entries()], shir = 9, row = (a, cells) => a.padEnd(17) + cells.map(c => c.padEnd(shir)).join('');
const lines = ['Прогон боя «Капли»: клетка массы ' + MAS + ', один на один, ' + T + ' с вплотную. Т — житель погиб, Ж — погибла ты, · — оба живы (число — геном жителя).', '', row('навык \\ житель', kto.map(([k]) => k.split(':').pop() || k.split(':')[0]))];
const res = new Map(); for (const [imya, geny] of navyki) { const r = kto.map(([, x]) => boi(geny, x)); res.set(imya, r); lines.push(row(imya, r)); }
const baza = res.get('без навыков'), nichego = [...res].filter(([k, r]) => k !== 'без навыков' && r.every((c, i) => c[0] === baza[i][0] && Math.abs(parseFloat(c.slice(1)) - parseFloat(baza[i].slice(1)) || 0) < 0.5 || c === baza[i])).map(([k]) => k);
lines.push('', 'Один на один ни с кем ничего не меняют: ' + (nichego.join(', ') || 'таких нет'), 'Жители: ' + kto.map(([k]) => k).join(', '));
const out = lines.join('\n') + '\n'; if (process.argv[2]) fs.writeFileSync(process.argv[2], out); console.log(out);
