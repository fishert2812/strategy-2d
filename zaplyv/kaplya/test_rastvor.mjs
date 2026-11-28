// Сторож растворения, «Глотать» по размеру и слабого старта «Капли» (задание kolonia_eda_boy.md 11.6, Ш29–Ш31): node proby/zaplyv/kaplya/test_rastvor.mjs.
// На настоящем мире: «Глотать 1» берёт целиком шарик в 0,15 твоей массы и не берёт в 0,3 — тот тает у оболочки около 6 с; поплыла быстро — кусок отпал
// недоеденный и вернулся в воду легче. Старт: не меньше четырёх видов быстрее тебя; «Хвост 1» даёт половину прибавки «Хвоста 2». Самопроверки краснеют.
import fs from 'fs'; import { World, radius } from '../sim.js'; import * as mut from '../mutacii.js'; import * as evo from '../evo.js'; import * as rsv from './rastvor.js';
const base = JSON.parse(fs.readFileSync(new URL('../data.json', import.meta.url))), KAP = JSON.parse(fs.readFileSync(new URL('./kaplya.json', import.meta.url))), DT = 1 / 30;
let bad = 0; const check = (n, e) => { console.log((e ? '  ПРОВАЛ ' : '  ок ') + n + (e ? ': ' + e : '')); if (e) bad++; };
const SP = { coccus: 'prey' };
// Клетка массы 10 стоит (или плывёт), рядом шарик доли d её массы. Возвращает, когда он ушёл из мира, когда дорос и что вернулось.
function opyt(K, d, plyt) { const cfg = JSON.parse(JSON.stringify(base)); mut.addGenes(cfg); const w = new World(cfg, 3); w.mode = 'evo'; w.step(DT, null); w.lose = () => {};
  w.genes.gulp = true; const a = w.me[0]; a.m = 10; a.x = 0; a.y = 0; w.prey = [{ id: 999, x: radius(10) + 3, y: 0, a: 0, m: 10 * d, vx: 0, vy: 0, evo: true }]; for (const k of ['pseudos', 'bdellos', 'amoebas', 'bells', 'rotis', 'slippers', 'phages']) if (w[k]) w[k] = [];
  const S = rsv.sozdat(); let ushel = null, konec = null, m0 = a.m, otpal = false, ostatok0 = 0;
  for (let t = 0; t < 10; t += DT) { if (plyt && t > 1) { a.x += 400 * DT; } else { a.x = 0; a.y = 0; } w.step(DT, null); if (!plyt || t <= 1) { a.x = 0; a.y = 0; }
    for (const e of rsv.shag(S, w, DT, K, evo.E, SP, radius, 175, (q, m) => w.grow(q, m))) if (e === 'otpal') { otpal = true; const v = w.prey.find(q => q.id === 999 && !q.gone); ostatok0 = v ? v.m : 0; }
    if (ushel == null && !w.prey.some(q => q.id === 999 && !q.gone)) ushel = t; if (konec == null && ushel != null && !(w.gulps || []).length) konec = t; }
  return { ushel, konec, otpal, ostatok: ostatok0, rost: a.m - m0 }; }
const sudGlotat = K => { const mal = opyt(K, 0.15), kr = opyt(K, 0.3);
  if (mal.ushel == null || mal.konec == null || mal.konec - mal.ushel > 1.5) return `шарик 0,15 не проглочен целиком: ${JSON.stringify(mal)}`;
  if (kr.konec == null || kr.konec - kr.ushel < 4) return `шарик 0,3 не таял у оболочки, а проглочен за ${kr.konec == null ? '—' : (kr.konec - kr.ushel).toFixed(1)} с`; return ''; };
check('test_glotat_razmer: «Глотать 1» берёт целиком 0,15 массы, а 0,3 тает у оболочки дольше 4 с (Ш30)', sudGlotat(KAP.rastvor));
check('test_glotat_razmer_samoproverka: «Глотать», берущий всё целиком, судья ловит', sudGlotat({ ...KAP.rastvor, glotat: [1, 1, 1] }) ? '' : 'не заметил');
const pl = opyt(KAP.rastvor, 0.3, true);
check('test_rastvor_otpal: поплыла быстро — кусок отпал недоеденный, вернулся в воду легче (Ш29)', pl.otpal && pl.ostatok > 0 && pl.ostatok < 3 && pl.rost > 0 ? '' : JSON.stringify(pl));
const S = KAP.slabyy_start, ty = KAP.hod.v * S.hod, bystree = [['спирилла', KAP.novye.spirilla.hod.v], ['запятая', base.bdello_speed], ['соперница', base.pseudo_speed], ['бодо в рывке', KAP.bodo.ryvok.v], ['туфелька', base.slipper_speed]].filter(([, v]) => v > ty);
const sudStart = (S0) => { const t = KAP.hod.v * S0.hod, n = [KAP.novye.spirilla.hod.v, base.bdello_speed, base.pseudo_speed, KAP.bodo.ryvok.v, base.slipper_speed].filter(v => v > t).length; const h1 = S0.hvost[0] - 1, h2 = S0.hvost[1] - 1;
  if (n < 4) return `быстрее тебя только ${n} видов`; if (Math.abs(h1 - h2 / 2) > 0.011) return `«Хвост 1» даёт ${h1.toFixed(2)}, а не половину ${h2.toFixed(2)}`; return ''; };
check(`test_start_slabyy: на старте быстрее тебя (${Math.round(ty)} ед/с): ${bystree.map(x => x[0]).join(', ')}; «Хвост 1» — половина прибавки (Ш31)`, sudStart(S));
check('test_start_slabyy_samoproverka: прежний быстрый старт судья ловит', sudStart({ ...S, hod: 1.6 }) ? '' : 'не заметил');
{ const w = { genes: {} }; const v0 = rsv.hod(S, w); w.genes.steady = true; const v1 = rsv.hod(S, w); check('test_start_hvost: «Хвост 1» ускоряет', v1 > v0 ? '' : `${v0} → ${v1}`); }
process.exit(bad ? 1 : 0);
