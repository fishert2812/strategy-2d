// Сторож амёбы «Капли» (Роман 27.11 14:44: «Врезался в амебу. Она к тебе быстро разворачивается или как она делает?»; pravki_po_blokam.md Д.10 п. 7):
// node proby/zaplyv/kaplya/test_ameba.mjs. Мир настоящий (sim.js, boj.ohrana, ameba.js).
// test_ameba_ohvat: касание амёбы не убивает сразу — вырост, прилип, чаша, пузырь, гибель не раньше vyrost+ohvat+perevar; стоишь — съедена.
// Разворот и ход прочь, когда чаша пошла, вырывает: жива. Самопроверки: мгновенная поимка и чаша сильнее хода — судья краснеет.
import fs from 'fs'; import { World, radius } from '../sim.js'; import * as mut from '../mutacii.js'; import * as zh from './zhiteli.js'; import * as boj from './boj.js'; import * as am from './ameba.js';
const base = JSON.parse(fs.readFileSync(new URL('../data.json', import.meta.url))), KAP = JSON.parse(fs.readFileSync(new URL('./kaplya.json', import.meta.url))), DT = 1 / 30;
let bad = 0; const check = (n, e) => { console.log((e ? '  ПРОВАЛ ' : '  ок ') + n + (e ? ': ' + e : '')); if (e) bad++; };
// uhodit: с какой фазы клетка плывёт прочь полным ходом (null — стоит). Вернёт { gibel: секунда гибели или null, fazy: порядок фаз, vyrvalas }.
function opyt(A, B, uhodit) { const cfg = boj.v_mir(JSON.parse(JSON.stringify(base)), B); mut.addGenes(cfg); const w = new World(cfg, 5); w.mode = 'evo'; zh.nachalo(w); w.step(DT, null);
  for (const k of ['pseudos', 'donors', 'bdellos', 'prey', 'amoebas', 'phages', 'bells', 'rotis', 'slippers', ...Object.values(zh.SPISKI), 'food', 'crumbs', 'plants', 'slime']) w[k] = [];
  let gibel = null; const fazy = [], a = w.me[0]; a.m = 1; let t = 0; w.lose = (b, x, y, who) => { if (gibel == null) gibel = t; }; boj.ohrana(w, B);
  const m = { id: 777, x: a.x + radius(6) + radius(1) + 20, y: a.y, vx: 0, vy: 0, m: 6 }; w.amoebas.push(m); const hod = cfg.speed; let idu = false, vyrvalas = false;
  for (; t < 14 && gibel == null; t += DT) { if (idu) { const d = Math.hypot(a.x - m.x, a.y - m.y) || 1; a.x += (a.x - m.x) / d * hod * DT; a.y += (a.y - m.y) / d * hod * DT; } a.vx = a.vy = 0;
    const m0 = am.massy(w); w._bojHod = true; w.step(DT, null); w._bojHod = false; if (!w.me.includes(a)) w.me.unshift(a);
    for (const [e] of am.shag(w, DT, A, radius, hod, m0)) { fazy.push(e); if (e === uhodit) idu = true; if (e === 'vyrvalas') vyrvalas = true; } }
  return { gibel, fazy, vyrvalas }; }
const sud = (A, B) => { const P = A.vyrost + A.ohvat + A.perevar, s = opyt(A, B, null);
  if (s.gibel == null) return `стоишь 14 с — не съедена (${s.fazy.join(' → ')})`; if (s.gibel < A.ohvat + A.perevar) return `съедена за ${s.gibel.toFixed(1)} с, раньше чаши и переваривания ${A.ohvat + A.perevar} с (${s.fazy.join(' → ')})`;
  const u = opyt(A, B, 'chasha'); if (u.gibel != null || !u.vyrvalas) return `ушла, когда пошла чаша, а ${u.gibel != null ? 'съедена на ' + u.gibel.toFixed(1) + ' с' : 'не вырвалась'} (${u.fazy.join(' → ')})`; return ''; };
check(`test_ameba_ohvat: касание не убивает сразу (вырост ${KAP.ameba.vyrost} с, чаша ${KAP.ameba.ohvat} с, переваривание ${KAP.ameba.perevar} с); ушла от чаши — вырвалась`, sud(KAP.ameba, KAP.boj));
const B0 = JSON.parse(JSON.stringify(KAP.boj)); B0.lovit_medlenno = []; check('test_ameba_ohvat_samoproverka_srazu: мгновенную поимку судья ловит', sud(KAP.ameba, B0) ? '' : 'не заметил');
check('test_ameba_ohvat_samoproverka_sila: чашу сильнее хода судья ловит', sud({ ...KAP.ameba, tyaga_chasha: 3, vyhod: 5 }, KAP.boj) ? '' : 'не заметил');
// L083 (пачка 2, Т3: «"Свобода! Амёба осталась ни с чем" сразу после того, как амёба съела»): амёба держала тебя, ты погибла и проснулась копией в стороне — амёба тихо отпускает, «Свободы!» нет
const sudSvoboda = stary => { const A = KAP.ameba, a1 = { x: 0, y: 0, m: 1, a: 0 }, m = { id: 5, x: 30, y: 0, m: 9 }, w = { me: [a1], amoebas: [m], genes: {}, stats: { time: 0 }, staraSvoboda: stary }; const ev = [];
  m.ohv = { faza: 'chasha', t: 0.5 }; ev.push(...am.shag(w, DT, A, radius, 100)); w.me = [{ x: 400, y: 0, m: 0.5, a: 0 }]; for (let k = 0; k < 10; k++) ev.push(...am.shag(w, DT, A, radius, 100));
  const sv = ev.filter(e => e[0] === 'vyrvalas').length; return sv ? `после твоей гибели «Свобода!» ${sv} раз` : ''; };
check('test_L083 test_ameba_svoboda_lozh: держала погибшую — новой тебе «Свободы!» не говорит', sudSvoboda(false));
check('test_ameba_svoboda_samoproverka: старое («Свобода!» новой тебе) судья ловит', sudSvoboda(true) ? '' : 'не заметил');
process.exit(bad ? 1 : 0);
