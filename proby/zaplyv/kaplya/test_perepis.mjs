// Сторож переписи жителей «Капли» (блок К, Роман 27.11 14:44: «в игре у меня 11 существ - нужно доабавиь много существ в каплю»; pravki_po_blokam.md 8е).
// node proby/zaplyv/kaplya/test_perepis.mjs [--vse]. Мир настоящий (sim.js, zhiteli.js, bodo.js, zona.js, sobytiya.js, частоты kaplya.json «mir»), без рисования.
// Бот-новичок раз в 2 с решает: к ближней еде или дальше своей дорогой, раз в 6–10 с меняет сторону; не гибнет — меряем мир, а не ловкость.
// «Встретил» — житель был в кадре телефона (390×844, камера как в main.js). Глава 1: жители глав 2–3 видны, только если у них есть «ranshe».
// test_perepis: в каждой из KAP.perepis.partii партий за KAP.perepis.minut минут встречено не меньше KAP.perepis.vidov видов. --vse печатает, кто и на какой минуте.
// test_perepis_kaulo: каулобактеры с бродяжками не плодятся без предела (было: тысячи за 10 минут, лаги) — не больше KAP.perepis.kaulo_max.
// Самопроверки: без новых жителей zhiteli.js и без ранних встреч судья краснеет; без предела na_kome, tesno, zhivyot — тоже. Партии идут разом в потоках (worker_threads).
import fs from 'fs'; import { Worker, isMainThread, parentPort, workerData } from 'worker_threads';
import { World, radius } from '../sim.js'; import * as mut from '../mutacii.js'; import * as rost from '../rost.js';
import * as zh from './zhiteli.js'; import * as boj from './boj.js'; import * as bodo from './bodo.js'; import * as zn from './zona.js'; import * as sob from './sobytiya.js';
const base = JSON.parse(fs.readFileSync(new URL('../data.json', import.meta.url))), KAP = JSON.parse(fs.readFileSync(new URL('./kaplya.json', import.meta.url))), DT = 0.05;
Object.assign(rost.R, KAP.temp); // рост «Капли», как в main.js
// список мира → вид; великаны после объятия — тот же вид, что обычные
const VIDY = { slippers: 'туфелька', tufelki3: 'туфелька', bells: 'колокольчик', rotis: 'коловратка', kolovratki3: 'коловратка', prey: 'кокки', bdellos: 'запятая', amoebas: 'амёба', ameby3: 'амёба', phages: 'вирус', bodos: 'бодо',
  spirilly: 'спирилла', kaulo: 'каулобактер', brodyazhki: 'каулобактер', hlorelly: 'хлорелла', plants: 'анабена', donors: 'соседка-донор', pseudos: 'соперница', parafizo: 'парафизомонада', cerko: 'церкомонада',
  spumelly: 'спумелла', hlamido: 'хламидомонада', ciklidii: 'циклидиум', krohi: 'кроха', sinegnoyki: 'синегнойка', didinii: 'дидиний', trubachi: 'трубач', nematody: 'нематода', griby: 'грибок' };
// N — novye (самопроверка подменяет); вернёт { вид: секунда первой встречи }
function partiya(seed, N) {
  let s0 = seed; Math.random = () => { s0 = s0 + 0x6D2B79F5 | 0; let t = Math.imul(s0 ^ s0 >>> 15, 1 | s0); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; // повтор партии один в один
  const cfg = boj.v_mir(JSON.parse(JSON.stringify(base)), KAP.boj); Object.assign(cfg, KAP.mir); mut.addGenes(cfg); cfg.sense_idle = KAP.upravlenie.sense_idle; cfg.sense_pull = KAP.upravlenie.sense_pull;
  const w = new World(cfg, seed), r = w.r; w.mode = 'evo'; zh.nachalo(w); bodo.nachalo(w, KAP.bodo); w.lose = () => {}; const vstrecha = {}; let kaulo = 0;
  const est = v => !!KAP.zhiteli[zh.SPISKI[v]], mozhno = v => est(v) && (1 >= (N[v].glava || 1) || (N[v].ranshe ? 'ranshe' : false)); // как в main.js при главе 1
  const ZON = zn.sozdat(), SOB = sob.sozdat(); w.zonaGde = (x, y) => zn.gde(ZON, KAP.zona, x, y); /* как в main.js */ let dir = r() * 6.283, smena = 0, kEde = 0, best = null;
  for (let t = 0; t < KAP.perepis.minut * 60; t += DT) { const a = w.me[0]; if (!a) break;
    if (t > smena) { dir += 1 + r() * 2.5; smena = t + 6 + r() * 4; }
    if (t > kEde) { kEde = t + 2; best = null; if (r() < 0.5) { let bd = 260; for (const f of w.food) { const d = Math.hypot(f.x - a.x, f.y - a.y); if (d < bd) { bd = d; best = f; } } } }
    const ZM = zn.do_hoda(w, KAP.zona); w.step(DT, best && !best.gone ? { x: best.x, y: best.y } : { dx: Math.cos(dir), dy: Math.sin(dir), p: 1 });
    zh.shag(w, DT, N, mozhno, radius); bodo.shag(w, DT, KAP.bodo, radius, () => {}); // кормёжка по росту (kormyozhka.js) в main.js только с главы 2
    zn.shag(ZON, w, DT, KAP.zona, ZM, radius, r); sob.shag(SOB, w, DT, KAP.sobytiya, ZON.zona || 'tihaya', radius, r);
    const z = Math.min(2.3, 2.45 - 0.17 * Math.sqrt(w.biggest())), hw = 360 / z, hh = hw * 844 / 390; // main.js: камера у малой клетки, W = 720
    kaulo = Math.max(kaulo, w.kaulo.length + w.brodyazhki.length); if (N.kaulo.tesno > 1e6 && kaulo > KAP.perepis.kaulo_max) break; // самопроверка: предел пройден — дальше мерить нечего
    for (const [L, vid] of Object.entries(VIDY)) { if (vstrecha[vid] != null) continue; for (const q of w[L] || []) if (!q.gone && Math.abs(q.x - a.x) < hw && Math.abs(q.y - a.y) < hh) { vstrecha[vid] = t; break; } } }
  return { vstrecha, kaulo }; }
const bezPredela = () => ({ ...KAP.novye, kaulo: { ...KAP.novye.kaulo, na_kome: 1e9, tesno: 1e9 }, brodyazhka: { ...KAP.novye.brodyazhka, zhivyot: 1e9 } });
const bez = () => Object.fromEntries(Object.entries(KAP.novye).map(([k, v]) => [k, v && typeof v === 'object' ? { ...v, ranshe: undefined, shans: [0, 0, 0] } : v]));
if (!isMainThread) parentPort.postMessage(partiya(workerData.seed, workerData.bez === 'novye' ? bez() : workerData.bez === 'kaulo' ? bezPredela() : KAP.novye));
else {
  const P = KAP.perepis, seeds = [...Array(P.partii)].map((_, i) => 1000 + i * 7919);
  const pusk = (b, ss = seeds) => Promise.all(ss.map(seed => new Promise((ok, ne) => { const t = new Worker(new URL(import.meta.url), { workerData: { seed, bez: b } }); t.once('message', ok); t.once('error', ne); })));
  let bad = 0; const check = (n, e) => { console.log((e ? '  ПРОВАЛ ' : '  ок ') + n + (e ? ': ' + e : '')); if (e) bad++; };
  const sud = vse => { const n = vse.map(v => Object.keys(v.vstrecha).length); return n.some(k => k < P.vidov) ? `видов по партиям ${n.join(', ')}, нужно ${P.vidov} в каждой` : ''; };
  const [est, net, rost_] = await Promise.all([pusk(false), pusk('novye'), pusk('kaulo', seeds.slice(0, 2))]), sudK = vse => vse.some(v => v.kaulo > P.kaulo_max) ? `каулобактеров с бродяжками до ${vse.map(v => v.kaulo).join(', ')}, предел ${P.kaulo_max}` : '';
  if (process.argv.includes('--vse')) est.forEach(({ vstrecha: v }, i) => { const e = Object.entries(v).sort((a, b) => a[1] - b[1]); console.log(`  партия ${i + 1}: ${e.length} — ` + e.map(([k, t]) => `${k} ${(t / 60).toFixed(1)}`).join(' · '));
    console.log('    не встретил: ' + [...new Set(Object.values(VIDY))].filter(k => v[k] == null).join(', ')); });
  check(`test_perepis: за ${P.minut} мин новичок встречает ${P.vidov}+ видов в каждой из ${P.partii} партий (${est.map(v => Object.keys(v.vstrecha).length).join(', ')})`, sud(est));
  check(`test_perepis_kaulo: каулобактеры не плодятся без предела, до ${P.kaulo_max} с бродяжками (${est.map(v => v.kaulo).join(', ')})`, sudK(est));
  check(`test_perepis_samoproverka: без новых жителей и ранних встреч судья краснеет (${net.map(v => Object.keys(v.vstrecha).length).join(', ')})`, sud(net) ? '' : 'не заметил');
  check(`test_perepis_kaulo_samoproverka: без предела у матерей и бродяжек судья краснеет (${rost_.map(v => v.kaulo).join(', ')})`, sudK(rost_) ? '' : 'не заметил');
  process.exit(bad ? 1 : 0); }
