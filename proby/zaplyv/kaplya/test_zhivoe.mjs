// Сторож «живое сначала убить» «Капли» (Роман 27.11 14:44: «То что нужно убить прежде чем съесть до сих пор этого нет»; pravki_po_blokam.md Д.10 п. 1–2):
// node proby/zaplyv/kaplya/test_zhivoe.mjs. Мир настоящий (sim.js, evo.js «Глотать», zhiteli.js, bodo.js, таблица боя boj.js).
// test_zhivoe_ne_est: для каждого жителя из boj.celi — живой, втрое легче тебя, вплотную, «Глотать» есть, оружия нет: за 1 с не съеден, вспыхнул отказ «zhivoe».
// Убит (геном 0) — съеден. test_zdorove: удар делится на здоровье строки (кокк 0,5 гибнет вдвое быстрее ровни 1). Самопроверки краснеют.
import fs from 'fs'; import { World, radius } from '../sim.js'; import * as mut from '../mutacii.js'; import * as evo from '../evo.js'; import * as zh from './zhiteli.js'; import * as bodo from './bodo.js'; import * as boj from './boj.js';
const base = JSON.parse(fs.readFileSync(new URL('../data.json', import.meta.url))), KAP = JSON.parse(fs.readFileSync(new URL('./kaplya.json', import.meta.url))), DT = 1 / 30;
let bad = 0; const check = (n, e) => { console.log((e ? '  ПРОВАЛ ' : '  ок ') + n + (e ? ': ' + e : '')); if (e) bad++; };
const SPISKI = ['pseudos', 'donors', 'bdellos', 'prey', 'amoebas', 'phages', 'bells', 'rotis', 'slippers', 'bodos', ...Object.values(zh.SPISKI), 'food', 'crumbs', 'plants', 'slime'];
function mir(B, pravilo) { const cfg = boj.v_mir(JSON.parse(JSON.stringify(base)), B); mut.addGenes(cfg); const w = new World(cfg, 5); w.mode = 'evo'; zh.nachalo(w); w.step(DT, null); w.lose = () => {};
  for (const k of SPISKI) w[k] = []; w.zhivoe = pravilo ? boj.zhivoe(B) : null; const a = w.me[0]; a.m = 6; a.vx = a.vy = 0; w.genes.gulp = true; (w.lvl ||= {}).gulp = 3; return w; }
// Кладёт жителя ck вплотную и держит секунду. Вернёт { syeden, otkaz }.
function opyt(B, ck, pravilo, ubit = false) { const w = mir(B, pravilo), a = w.me[0], C = B.celi[ck], q = { id: 9999, x: 0, y: 0, a: 0, m: 2, vx: 0, vy: 0, t: 0, faza: 'sidit', syt: 0, sytN: 0, dom: { x: 900, y: 900 } };
  if (ubit) q.gn = { f: 0, dozy: [], bez: 0, posl: new Map() }; w[C.spisok] = [q]; let otkaz = false, syeden = false;
  for (let t = 0; t < 1 && !syeden; t += DT) { const d = radius(a.m) + radius(q.m) * 0.3; q.x = a.x + d; q.y = a.y; q.vx = q.vy = 0; a.vx = a.vy = 0; w.events.length = 0;
    const S = boj.do_hoda(w, B); w.step(DT, null); if (!q.gone) { q.x = a.x + d; q.y = a.y; } boj.posle_hoda(w, DT, B, radius, S);
    zh.glotat(w, evo.E.glotat.bolshe, radius, true, () => {}); bodo.glotat(w, KAP.bodo, radius, evo.E.glotat.syt, 0, true, () => {});
    if (w.events.some(e => e[0] === 'otkaz' && e[4] === 'zhivoe')) otkaz = true; syeden = q.gone || (w.gulps || []).some(g => g.q === q || (g.who === 'bodo' && C.spisok === 'bodos')); }
  return { syeden, otkaz }; }
const GLOTAYUT = new Set([...['prey', 'pseudos', 'bdellos', 'amoebas', 'bells', 'rotis', 'slippers'], ...Object.values(zh.SPISKI), 'bodos']); // кого вообще берёт «Глотать»
const celi = B => Object.entries(B.celi).filter(([k, C]) => k !== '_' && GLOTAYUT.has(C.spisok));
const sud = (B, pravilo) => { const zhivye = [], bezShchita = [], mertvye = [];
  for (const [ck] of celi(B)) { const r = opyt(B, ck, pravilo); if (r.syeden) zhivye.push(ck); else if (!r.otkaz) bezShchita.push(ck); if (!opyt(B, ck, pravilo, true).syeden) mertvye.push(ck); }
  return zhivye.length ? `съеден живым: ${zhivye.join(', ')}` : bezShchita.length ? `нет щита «живое»: ${bezShchita.join(', ')}` : mertvye.length ? `убитый не стал едой: ${mertvye.join(', ')}` : ''; };
check(`test_zhivoe_ne_est: ${celi(KAP.boj).length} жителей — живого «Глотать» не берёт, отскок со щитом; убитый лопается едой`, sud(KAP.boj, true));
check('test_zhivoe_ne_est_samoproverka: без правила живых едят — судья ловит', sud(KAP.boj, false) ? '' : 'не заметил');
// Здоровье строки: «Яд 1» по неподвижной цели массы 1, сколько секунд до гибели при zdorove 0,5 и 1.
function dozhit(B, zd) { const BB = JSON.parse(JSON.stringify(B)); BB.celi.kokk.zdorove = zd; BB.celi.kokk.stenka.toxin = 1; BB.min_ubit = BB.min_ubit_rovnya = BB.min_ubit_krupnyj = 0; /* здесь — только делитель здоровья */ const w = mir(BB, true), a = w.me[0]; a.m = 1; w.genes.toxin = true; w.knopka = { toxin: true }; w.lvl.toxin = 1;
  const q = { id: 9999, x: 0, y: 0, a: 0, m: 1, vx: 0, vy: 0 }; w.prey = [q]; const d = radius(1) + radius(1) * BB.celi.kokk.k_r;
  for (let t = 0; t < 30; t += DT) { q.x = a.x + d; q.y = a.y; a.vx = a.vy = 0; const S = boj.do_hoda(w, BB); w.step(DT, null); q.x = a.x + d; q.y = a.y; boj.posle_hoda(w, DT, BB, radius, S); if (!w.prey.includes(q)) return t; } return 99; }
const sudZd = B => { const t1 = dozhit(B, 1), t05 = dozhit(B, 0.5), t3 = dozhit(B, 3); return t05 < t1 * 0.75 && t3 > t1 * 1.5 ? '' : `гибель за ${t05.toFixed(1)} / ${t1.toFixed(1)} / ${t3.toFixed(1)} с при здоровье 0,5 / 1 / 3`; };
check('test_zdorove: удар делится на здоровье строки boj.celi (0,5 — быстрее, 3 — дольше ровни 1)', sudZd(KAP.boj));
process.exit(bad ? 1 : 0);
