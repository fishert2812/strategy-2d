// Сторож новых жителей «Капли» (блок К п. 3, Роман 27.11 14:44: «нужно доабавиь много существ в каплю»; pravki_po_blokam.md К.3).
// node proby/zaplyv/kaplya/test_novye_zhiteli.mjs. Мир настоящий (sim.js, zhiteli.js), числа — kaplya.json «novye».
// test_didiniy_tufelka: дидиний догоняет туфельку и глотает её целиком; тебя-малышку рядом не трогает.
// test_trubach_voronka: стоишь у трубача — воронка тянет тебя к его рту; гребёшь прочь полным ходом — уходишь.
// Самопроверки: дидиний без «na» туфельку не берёт, воронка сильнее хода — судья краснеет.
import fs from 'fs'; import { World, radius } from '../sim.js'; import * as mut from '../mutacii.js'; import * as zh from './zhiteli.js'; import * as boj from './boj.js';
const base = JSON.parse(fs.readFileSync(new URL('../data.json', import.meta.url))), KAP = JSON.parse(fs.readFileSync(new URL('./kaplya.json', import.meta.url))), DT = 1 / 30;
let bad = 0; const check = (n, e) => { console.log((e ? '  ПРОВАЛ ' : '  ок ') + n + (e ? ': ' + e : '')); if (e) bad++; };
function mir() { const cfg = boj.v_mir(JSON.parse(JSON.stringify(base)), KAP.boj); Object.assign(cfg, KAP.mir); mut.addGenes(cfg); const w = new World(cfg, 9); w.mode = 'evo'; zh.nachalo(w); w.step(DT, null);
  for (const k of ['pseudos', 'donors', 'bdellos', 'prey', 'amoebas', 'phages', 'bells', 'rotis', 'slippers', ...Object.values(zh.SPISKI)]) w[k] = []; w.novyeKv = { has: () => true, add() {} }; return w; }
function didiniy(N) { const w = mir(), a = w.me[0], S = N.didiniy; a.m = 1; let s = 0; w.lose = () => { s++; };
  w.didinii = [{ id: 701, x: a.x + 300, y: a.y, a: 0, m: 10, t: 0, faza: 'beg' }]; w.slippers = [{ id: 702, x: a.x + 300, y: a.y + 250, a: 0, back: 0 }];
  for (let t = 0; t < 12; t += DT) zh.shag(w, DT, N, () => false, radius);
  return w.slippers.length ? 'туфелька цела через 12 с' : s ? 'съел тебя-малышку' : ''; }
check(`test_didiniy_tufelka: дидиний ловит туфельку и глотает целиком, тебя не берёт`, didiniy(KAP.novye));
check('test_didiniy_tufelka_samoproverka: без «na» туфелька цела — судья краснеет', didiniy({ ...KAP.novye, didiniy: { ...KAP.novye.didiniy, na: undefined } }) ? '' : 'не заметил');
function trubach(N, uhodit) { const w = mir(), a = w.me[0], S = N.trubach; a.m = 1; let s = null; w.lose = () => { s = s ?? 1; };
  const q = { id: 703, x: a.x + radius(400) + 120, y: a.y, a: 0, m: 400, t: 0, faza: 'beg' }; w.trubachi = [q]; const d0 = Math.hypot(q.x - a.x, q.y - a.y), hod = w.cfg.speed;
  for (let t = 0; t < 3; t += DT) { if (uhodit) a.x -= hod * DT; zh.shag(w, DT, N, () => false, radius); }
  return { d: Math.hypot(q.x - a.x, q.y - a.y) - d0, s }; }
const sudT = N => { const st = trubach(N, false), uh = trubach(N, true); if (!(st.d < -30)) return `стоишь — воронка подтянула на ${(-st.d).toFixed(0)} ед за 3 с, нужно 30`; if (uh.s || !(uh.d > 0)) return `гребёшь прочь — ${uh.s ? 'проглочена' : 'не ушла'}`; return ''; };
check(`test_trubach_voronka: воронка трубача тянет к его рту, полным ходом от неё уходишь`, sudT(KAP.novye));
check('test_trubach_voronka_samoproverka: воронка сильнее хода — судья краснеет', sudT({ ...KAP.novye, trubach: { ...KAP.novye.trubach, potok: { r: 220, v: 400 } } }) ? '' : 'не заметил');
process.exit(bad ? 1 : 0);
