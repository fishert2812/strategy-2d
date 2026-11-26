// Сторож Ш3 «Кто колет тебя» (kolonia_eda_boy.md, законы З2–З3): node proby/zaplyv/kaplya/test_ukol.mjs. Мир настоящий (sim.js, evo.js), таблица боя boj.js.
// Судья: соперница-гарпунщица колет клетку вплотную. Масса от уколов не тает; ровня 1,5 гибнет не раньше 4-го укола; большая (5) переживает 10 уколов;
// после боя без урона геном лечится. Самопроверка: без строки na_tebya (по-старому, удар по массе) судья краснеет.
import fs from 'fs'; import { World, radius } from '../sim.js'; import * as mut from '../mutacii.js'; import * as zh from './zhiteli.js'; import * as boj from './boj.js';
const base = JSON.parse(fs.readFileSync(new URL('../data.json', import.meta.url))), KAP = JSON.parse(fs.readFileSync(new URL('./kaplya.json', import.meta.url))), B0 = KAP.boj, DT = 1 / 30;
let bad = 0; const check = (n, e) => { console.log((e ? '  ПРОВАЛ ' : '  ок ') + n + (e ? ': ' + e : '')); if (e) bad++; };
const mir = () => { const cfg = JSON.parse(JSON.stringify(base)); mut.addGenes(cfg); cfg.sense_idle = KAP.upravlenie.sense_idle; cfg.sense_pull = KAP.upravlenie.sense_pull; const w = new World(cfg, 9); w.mode = 'evo'; zh.nachalo(w); return w; };
const obr = { vx: 0, vy: 0, a: Math.PI, t: 1, rest: 0, cool: 0, m: 1.2 }; /* соперница-гарпунщица: ключ 'pseudo' (dvizhok.js klyuch), анкета с гарпуном (vidy.json) */
const boi = (B, M, T) => { const w = mir(); w.step(DT, null); let gibel = null; w.lose = () => { gibel = gibel ?? w.stats.time; }; boj.ohrana(w, B);
  for (const k of ['pseudos', 'donors', 'bdellos', 'prey', 'amoebas', 'phages', 'bells', 'rotis', 'slippers', 'food', 'crumbs', 'plants', 'slime', ...Object.values(zh.SPISKI)]) w[k] = [];
  w.me = [w.me[0]]; const a = w.me[0]; a.m = M; const q = { ...obr, id: 9999, gone: false, cool: 0, x: a.x + radius(M) + 8, y: a.y }; w.pseudos.push(q); let uk = 0, t0 = w.stats.time;
  for (let t = 0; t < T && !gibel; t += DT) { const d = Math.hypot(q.x - a.x, q.y - a.y) || 1, R = radius(a.m); if (d > R + 6) { a.x = q.x - (q.x - a.x) / d * (R + 4); a.y = q.y - (q.y - a.y) / d * (R + 4); } a.vx = a.vy = 0; for (const k of ['amoebas', 'phages', 'bdellos', 'bells', 'rotis', 'slippers']) w[k] = []; /* только она и ты */
    const m0 = new Map(w.me.map(b => [b, b.m])), S = boj.do_hoda(w, B); w.step(DT, null); boj.posle_hoda(w, DT, B, radius, S); boj.po_tebe(w, DT, B, m0); uk += w.events.filter(e => e[0] === 'zap').length; w.events.length = 0; }
  return { uk, gibel: gibel != null, m: a.m, f: a.gn ? a.gn.f : 1, w, a, q }; };
const sud = B => { if (!obr) return 'в мире нет гарпунщицы'; const r = boi(B, 1.5, 15); if (!r.uk) return 'гарпунщица не колола';
  if (r.m < 1.5 - 1e-6) return `масса тает от уколов: ${r.m.toFixed(2)}`; if (r.gibel && r.uk < 4) return `ровня погибла на ${r.uk}-м уколе, раньше 4-го`;
  const v = boi(B, 5, 13); if (v.gibel) return `большая клетка погибла на ${v.uk}-м уколе`; if (v.uk < 8) return `большую кололи только ${v.uk} раз`; return ''; };
check('test_ukol: гарпун бьёт по геному, а не по массе; ровню убивают не раньше 4 уколов, большую не убивают 10 (Ш3, З3)', sud(B0));
check('test_ukol_samoproverka: по-старому (удар по массе) судья краснеет', sud({ ...B0, na_tebya: {} }) ? '' : 'судья не заметил');
{ const r = boi(B0, 3, 2.5), f1 = r.a.gn ? r.a.gn.f : 1; r.w.pseudos = []; for (let t = 0; t < 8; t += DT) boj.po_tebe(r.w, DT, B0, new Map()); const f2 = r.a.gn ? r.a.gn.f : 1;
  check('test_ukol_lechenie: без урона геном лечится (З2)', f1 < 0.99 && f2 > f1 + 0.05 ? '' : `было ${f1.toFixed(2)}, стало ${f2.toFixed(2)}`); }
process.exit(bad ? 1 : 0);
