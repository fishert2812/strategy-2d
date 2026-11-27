// Сторож яда по кокку «Капли» (Роман 27.11 10:01, сборка 5999c85: «Яд не активируется!… радиус условно должен быть показан… По каким правилам это происходит»):
// node proby/zaplyv/kaplya/test_yad.mjs. Мир настоящий (sim.js, таблица боя boj.js). Клетка с «Ядом 1» жмётся к кокку вдвое тяжелее себя, кокк отталкивается сам (prey_push).
// Кольцо досягаемости яда видит кокка, укол в первую секунду, кокк лопается едой за 20 с. Самопроверка: таблица, где стенка кокка не пускает яд, — судья краснеет.
import fs from 'fs'; import { World, radius } from '../sim.js'; import * as mut from '../mutacii.js'; import * as zh from './zhiteli.js'; import * as boj from './boj.js';
const base = JSON.parse(fs.readFileSync(new URL('../data.json', import.meta.url))), KAP = JSON.parse(fs.readFileSync(new URL('./kaplya.json', import.meta.url))), DT = 1 / 30;
let bad = 0; const check = (n, e) => { console.log((e ? '  ПРОВАЛ ' : '  ок ') + n + (e ? ': ' + e : '')); if (e) bad++; };
function opyt(B, mKokk) { const cfg = JSON.parse(JSON.stringify(base)); mut.addGenes(cfg); const w = new World(cfg, 5); w.mode = 'evo'; zh.nachalo(w); w.step(DT, null); w.lose = () => {}; boj.ohrana(w, B);
  for (const k of ['pseudos', 'donors', 'bdellos', 'prey', 'amoebas', 'phages', 'bells', 'rotis', 'slippers', ...Object.values(zh.SPISKI), 'food', 'crumbs', 'plants', 'slime']) w[k] = [];
  const a = w.me[0]; a.m = 1; w.genes.toxin = true; (w.lvl ||= {}).toxin = 1; const q = { id: 9999, x: a.x + 40, y: a.y, a: 0, m: mKokk, vx: 0, vy: 0 }; w.prey.push(q);
  let kolco = null, ukol = null, gibel = null;
  for (let t = 0; t < 20 && gibel == null; t += DT) { const d = Math.hypot(q.x - a.x, q.y - a.y) || 1, zhmus = radius(a.m) + radius(q.m) * 0.5; /* клетка жмётся к кокку, а не стоит в нём */
    if (d > zhmus) { const s = Math.min(d - zhmus, 120 * DT); a.x += (q.x - a.x) / d * s; a.y += (q.y - a.y) / d * s; } a.vx = a.vy = 0; a.a = Math.atan2(q.y - a.y, q.x - a.x);
    if (kolco == null && boj.kolca(w, B, a, radius).some(o => o.g === 'toxin' && o.cel)) kolco = t;
    w.events.length = 0; const S = boj.do_hoda(w, B); w.step(DT, null); boj.posle_hoda(w, DT, B, radius, S);
    if (ukol == null && w.events.some(e => e[0] === 'yad')) ukol = t; if (q.gone || !w.prey.includes(q)) gibel = t; }
  return { kolco, ukol, gibel, genom: q.gn ? +q.gn.f.toFixed(2) : 1 }; }
const sud = r => r.kolco == null ? 'кольцо яда не видит кокка' : r.ukol == null || r.ukol > 1 ? `укола нет в первую секунду: ${JSON.stringify(r)}` : r.gibel == null ? `кокк жив через 20 с, геном ${r.genom}` : '';
const r = opyt(KAP.boj, 2); check(`test_yad_kokk: «Яд 1» по кокку вдвое тяжелее: кольцо видит его, укол на ${r.ukol?.toFixed(1)} с, лопнул на ${r.gibel?.toFixed(1)} с`, sud(r));
const B0 = JSON.parse(JSON.stringify(KAP.boj)); B0.celi.kokk.stenka.toxin = 0; check('test_yad_kokk_samoproverka: стенка, не пускающая яд, — судья ловит', sud(opyt(B0, 2)) ? '' : 'не заметил');
check('test_yad_dostaet: яд достаёт дальше касания по уровням, данные в kaplya.json boj.oruzhie.toxin.dostaet', (KAP.boj.oruzhie.toxin.dostaet || []).every((v, i, A) => v > KAP.boj.zazor && (!i || v >= A[i - 1])) ? '' : 'нет или убывает');
process.exit(bad ? 1 : 0);
