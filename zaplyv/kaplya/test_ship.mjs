// Сторож Ш25 «Шип» (kolonia_eda_boy.md; Роман 26.11 21:05 «тебе нужен шип!»): node proby/zaplyv/kaplya/test_ship.mjs. Мир настоящий (sim.js), таблица боя boj.js.
// Судья: клетка с «Шипом» носом к сопернице-ровне убивает её не дольше 10 с; без оружия за 20 с не убивает. У каждого нового оружия есть вид на теле из движка.
// Самопроверки: шип без силы судья ловит; новое оружие без вида на теле судья ловит.
import fs from 'fs'; import { World, radius } from '../sim.js'; import * as mut from '../mutacii.js'; import * as zh from './zhiteli.js'; import * as boj from './boj.js'; import { VC } from '../vid_chasti.js';
const base = JSON.parse(fs.readFileSync(new URL('../data.json', import.meta.url))), KAP = JSON.parse(fs.readFileSync(new URL('./kaplya.json', import.meta.url))), B0 = KAP.boj, DT = 1 / 30;
let bad = 0; const check = (n, e) => { console.log((e ? '  ПРОВАЛ ' : '  ок ') + n + (e ? ': ' + e : '')); if (e) bad++; };
const boi = (B, geny, T) => { const cfg = JSON.parse(JSON.stringify(base)); mut.addGenes(cfg); const w = new World(cfg, 9); w.mode = 'evo'; zh.nachalo(w); w.step(DT, null); w.lose = () => {}; boj.ohrana(w, B);
  w.me = [w.me[0]]; const a = w.me[0]; a.m = 1.5; for (const g of geny) w.genes[g] = true;
  const q = { strain: true, x: a.x + radius(1.5) + 12, y: a.y, vx: 0, vy: 0, a: 0, t: 1, rest: 0, cool: 0, m: 1.2, id: 999 };
  for (let t = 0; t < T; t += DT) { for (const k of ['pseudos', 'donors', 'bdellos', 'prey', 'amoebas', 'phages', 'bells', 'rotis', 'slippers', ...Object.values(zh.SPISKI)]) w[k] = k === 'pseudos' ? w[k].filter(c => c === q) : []; if (!w.pseudos.includes(q) && !q.gone) w.pseudos.push(q);
    const d = Math.hypot(q.x - a.x, q.y - a.y) || 1, R = radius(a.m); a.a = Math.atan2(q.y - a.y, q.x - a.x); if (d > R + 8) { a.x = q.x - (q.x - a.x) / d * (R + 6); a.y = q.y - (q.y - a.y) / d * (R + 6); } a.vx = a.vy = 0;
    const m0 = new Map(w.me.map(b => [b, b.m])), S = boj.do_hoda(w, B); w.step(DT, null); boj.posle_hoda(w, DT, B, radius, S); boj.po_tebe(w, DT, B, m0); w.events.length = 0;
    if (q.gone || !w.pseudos.includes(q)) return t; }
  return null; };
const sud = B => { const s = boi(B, ['ship'], 10), bez = boi(B, [], 20); return s == null ? 'с «Шипом» ровня жива 10 с' : bez != null ? `без оружия ровня погибла за ${bez.toFixed(1)} с` : ''; };
check('test_ship: «Шип» убивает ровню носом не дольше 10 с, без оружия её не убить (Ш25, Роман 21:05)', sud(B0));
check('test_ship_samoproverka: шип без силы судья ловит', sud({ ...B0, oruzhie: { ...B0.oruzhie, ship: { ...B0.oruzhie.ship, sila: [0, 0, 0] } } }) ? '' : 'судья не заметил');
const vid = B => { for (const g of B.novye_geny) { const k = (B.na_tele || {})[g]; if (!k || !VC.navyki.spisok[k]) return `у «${g}» нет вида на теле`; if (!B.oruzhie[g]) return `«${g}» нет в таблице боя`; } return ''; };
check('test_ship_vid: у нового оружия есть вид на теле из движка и строка в таблице боя', vid(B0));
check('test_ship_vid_samoproverka: оружие без вида на теле судья ловит', vid({ ...B0, na_tele: {} }) ? '' : 'судья не заметил');
process.exit(bad ? 1 : 0);
