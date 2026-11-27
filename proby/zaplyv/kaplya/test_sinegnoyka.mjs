// Сторож синегнойки «Капли» (блок К п. 2, Роман 27.11 14:44: «давай очисти каплю»; pravki_po_blokam.md Ц.1: «Её очаги живут в биоплёнке»).
// node proby/zaplyv/kaplya/test_sinegnoyka.mjs. Мир настоящий (sim.js, zhiteli.js, zona.js): клетка обходит 15×15 квадратов вокруг старта, каждый квадрат заселяется, как в игре.
// test_sinegnoyka_ochagi: синегнойка есть, вся — в злой воде, каждая клетка у своего очага (не дальше ochag.r·1,5 через 20 с жизни); в тихой воде её нет.
// Самопроверка: без zona синегнойка селится и в тихой воде — судья краснеет.
import fs from 'fs'; import { World, radius } from '../sim.js'; import * as mut from '../mutacii.js'; import * as zh from './zhiteli.js'; import * as boj from './boj.js'; import * as zn from './zona.js';
const base = JSON.parse(fs.readFileSync(new URL('../data.json', import.meta.url))), KAP = JSON.parse(fs.readFileSync(new URL('./kaplya.json', import.meta.url)));
let bad = 0; const check = (n, e) => { console.log((e ? '  ПРОВАЛ ' : '  ок ') + n + (e ? ': ' + e : '')); if (e) bad++; };
function obhod(N) { const cfg = boj.v_mir(JSON.parse(JSON.stringify(base)), KAP.boj); Object.assign(cfg, KAP.mir); mut.addGenes(cfg);
  const w = new World(cfg, 77), C = cfg.chunk, ZON = zn.sozdat(); w.mode = 'evo'; zh.nachalo(w); w.step(0.05, null); zn.shag(ZON, w, 0.05, KAP.zona, new Map(), radius, w.r); w.zonaGde = (x, y) => zn.gde(ZON, KAP.zona, x, y);
  const a = w.me[0], vse = new Set();
  for (let j = -7; j <= 7; j++) for (let i = -7; i <= 7; i++) { a.x = (i + 0.5) * C; a.y = (j + 0.5) * C; zh.shag(w, 0.05, N, () => true, radius); for (const q of w.sinegnoyki) if (!vse.has(q)) { vse.add(q); q.z0 = zn.gde(ZON, KAP.zona, q.x, q.y); } } // зона там, где родилась
  const v = [...vse].map(q => ({ zona: q.z0, q }));
  const zhivut = v.slice(0, 60).map(({ q }) => ({ ...q, x: q.x - q.oc.x + a.x, y: q.y - q.oc.y + a.y, oc: { x: a.x, y: a.y } })); // 20 с жизни у самой клетки: мир не забудет
  for (const k of Object.values(zh.SPISKI)) w[k] = []; w.sinegnoyki = zhivut; for (let t = 0; t < 20; t += 0.05) zh.shag(w, 0.05, N, () => false, null);
  return v.map(({ zona }, i) => ({ zona, ot: i < zhivut.length ? Math.hypot(zhivut[i].x - a.x, zhivut[i].y - a.y) : 0 })); }
const sud = N => { const v = obhod(N), O = KAP.novye.sinegnoyka.ochag; if (!v.length) return 'синегнойки нет нигде';
  const tiho = v.filter(q => q.zona !== 'zlaya').length, daleko = v.filter(q => q.ot > O.r * 1.5).length;
  return tiho || daleko ? `из ${v.length}: в тихой воде ${tiho}, дальше ${O.r * 1.5} от очага ${daleko}` : ''; };
check(`test_sinegnoyka_ochagi: синегнойка живёт очагами и только в злой воде`, sud(KAP.novye));
const bez = { ...KAP.novye, sinegnoyka: { ...KAP.novye.sinegnoyka, zona: undefined } };
check('test_sinegnoyka_ochagi_samoproverka: без зоны она селится и в тихой — судья краснеет', sud(bez) ? '' : 'не заметил');
process.exit(bad ? 1 : 0);
