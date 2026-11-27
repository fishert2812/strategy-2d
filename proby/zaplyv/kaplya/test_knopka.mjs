// Сторож кнопки «Яд» «Капли» (Роман 27.11 14:44: «Кнопку добавьте Яд ! Пошел распылять кончился - яд восстанавливается»; pravki_po_blokam.md Д.10 п. 3, Н.6):
// node proby/zaplyv/kaplya/test_knopka.mjs. Мир настоящий (sim.js, таблица боя boj.js, облако knopki.js).
// test_yad_knopka: держишь — запас падает, облако тянется следом, кокк в облаке травится и лопается; пустил — запас растёт; пустой запас — облака нет.
// test_yad_bez_knopki: не держишь — касание кокка ядом не травит (яд — умение нажатием). Самопроверки краснеют.
import fs from 'fs'; import { World, radius } from '../sim.js'; import * as mut from '../mutacii.js'; import * as zh from './zhiteli.js'; import * as boj from './boj.js'; import * as kn from './knopki.js';
const base = JSON.parse(fs.readFileSync(new URL('../data.json', import.meta.url))), KAP = JSON.parse(fs.readFileSync(new URL('./kaplya.json', import.meta.url))), DT = 1 / 30;
let bad = 0; const check = (n, e) => { console.log((e ? '  ПРОВАЛ ' : '  ок ') + n + (e ? ': ' + e : '')); if (e) bad++; };
function mir(B) { const cfg = boj.v_mir(JSON.parse(JSON.stringify(base)), B); mut.addGenes(cfg); const w = new World(cfg, 5); w.mode = 'evo'; zh.nachalo(w); w.step(DT, null); w.lose = () => {};
  for (const k of ['pseudos', 'donors', 'bdellos', 'prey', 'amoebas', 'phages', 'bells', 'rotis', 'slippers', ...Object.values(zh.SPISKI), 'food', 'crumbs', 'plants', 'slime']) w[k] = [];
  const a = w.me[0]; a.m = 1; w.genes.toxin = true; (w.lvl ||= {}).toxin = 1; w.zhivoe = boj.zhivoe(B); return w; }
// Клетка плывёт вправо с кнопкой по плану derzhu(t); кокк стоит у начала пути (за кормой — его накроет только облако).
function opyt(B, derzhu, T, kokk = true) { const X = B.oruzhie.toxin, w = mir(B), a = w.me[0], Y = kn.sozdat(X), x0 = a.x, q = { id: 9999, x: x0 - 2, y: a.y + radius(1) * 1.2, a: 0, m: 1, vx: 0, vy: 0 };
  if (kokk) w.prey.push(q); const zap = [], obl = [];
  for (let t = 0; t < T; t += DT) { Y.derzhu = derzhu(t); w.knopka = { toxin: Y.derzhu && Y.zapas > 0 }; const s = Math.min(t, 3) * 8; a.x = x0 + s; a.vx = a.vy = 0; q.x = x0 - 2; q.vx = q.vy = 0;
    const S = boj.do_hoda(w, B); w.step(DT, null); a.x = x0 + s; boj.posle_hoda(w, DT, B, radius, S);
    kn.shag(Y, X, a, radius(a.m), DT, w.stats.time, false); boj.oblako(w, B, 'toxin', (x, y) => kn.vOblake(Y, X, x, y, w.stats.time), radius); zap.push(Y.zapas); obl.push(Y.oblaka.length); }
  return { zap, obl, q, w }; }
const sud = B => { const X = B.oruzhie.toxin, n = Math.round(1 / DT);
  const r = opyt(B, t => t < 2, 12); if (!(r.zap[n * 2 - 1] < X.zapas - X.zapas_rashod * 1.5)) return `держишь 2 с, а запас ${r.zap[n * 2 - 1].toFixed(2)}`;
  if (!r.obl[n]) return 'держишь, а облака нет'; if (!(r.zap[r.zap.length - 1] > r.zap[n * 2 + 2])) return 'пустил, а запас не растёт';
  if (!r.q.gone && r.w.prey.includes(r.q)) return `кокк в облаке жив, геном ${r.q.gn ? r.q.gn.f.toFixed(2) : 1}`;
  const p = opyt(B, () => true, X.zapas / X.zapas_rashod + X.oblako_t + 0.5, false); if (p.zap.at(-1) > 0.01 || p.obl.at(-1) > 0) return `держишь пустую кнопку (запас ${p.zap.at(-1).toFixed(2)}), а облако идёт: ${p.obl.at(-1)} клубов`; return ''; };
check(`test_yad_knopka: держишь — запас тает ${KAP.boj.oruzhie.toxin.zapas_rashod}/с, облако следом травит кокка; пустил — копится; пусто — облака нет`, sud(KAP.boj));
const B0 = JSON.parse(JSON.stringify(KAP.boj)); B0.oruzhie.toxin.zapas_rashod = 0; check('test_yad_knopka_samoproverka: бесконечный запас судья ловит', sud(B0) ? '' : 'не заметил');
// Не держишь кнопку: касание кокка ядом не травит.
function kasanie(B, knopka) { const w = mir(B), a = w.me[0], q = { id: 9999, x: 0, y: 0, a: 0, m: 1, vx: 0, vy: 0 }; w.prey.push(q); const d = radius(1) + radius(1) * B.celi.kokk.k_r;
  for (let t = 0; t < 2; t += DT) { q.x = a.x + d; q.y = a.y; a.vx = a.vy = 0; w.knopka = { toxin: knopka }; const S = boj.do_hoda(w, B); w.step(DT, null); q.x = a.x + d; q.y = a.y; boj.posle_hoda(w, DT, B, radius, S); }
  return !!(q.gn && q.gn.f < 1) || q.gone; }
const sudBez = B => kasanie(B, false) ? 'без кнопки касание травит' : !kasanie(B, true) ? 'с кнопкой касание не травит' : '';
check('test_yad_bez_knopki: яд касанием — только пока держишь кнопку', sudBez(KAP.boj));
const B1 = JSON.parse(JSON.stringify(KAP.boj)); B1.oruzhie.toxin.knopka = false; check('test_yad_bez_knopki_samoproverka: яд без кнопки судья ловит', sudBez(B1) ? '' : 'не заметил');
process.exit(bad ? 1 : 0);
