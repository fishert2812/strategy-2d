// Сторож кромки угрозы «Капли» (блок В, pravki_po_blokam.md В.3 п. 1, 2, 4; В.6): node proby/zaplyv/kaplya/test_ugroza.mjs.
// test_ugroza_kromka: кромка горит у того, кто рядом и идёт на тебя; не горит у дальнего, уходящего, сытого и того, кто тебе по зубам; колокольчик горит, просто сидя рядом.
// test_net_udara_bez_znaka: каждый охотник с ходом из data.json, бросаясь с края экрана, к касанию горит не меньше za секунд, и перед касанием кромка мигает.
import fs from 'fs'; import * as ugr from './ugroza.js'; import * as zh from './zhiteli.js'; import * as cel from './cel.js';
const KAP = JSON.parse(fs.readFileSync(new URL('./kaplya.json', import.meta.url))), U = KAP.ugroza, D = JSON.parse(fs.readFileSync(new URL('../data.json', import.meta.url))), C = D.sim || D, DT = 1 / 30;
let bad = 0; const check = (n, e) => { console.log((e ? '  ПРОВАЛ ' : '  ок ') + n + (e ? ': ' + e : '')); if (e) bad++; };
const R = m => 13 * Math.sqrt(m), shagi = (Uu, w, a, n, op = () => true, K = U, hod = null) => { for (let i = 0; i < n; i++) { if (hod) hod(); ugr.shag(Uu, w, DT, K, a, op); } };
{ const a = { x: 0, y: 0, m: 1 }, idet = { x: 60, y: 0, m: 6, a: Math.PI }, spinoy = { x: 0, y: 60, m: 6, a: Math.PI / 2 }, daleko = { x: 900, y: 0, m: 6, a: Math.PI }, syt = { x: -60, y: 0, m: 6, a: 0, syt: 3 }, kol = { x: 0, y: -70, m: 2 };
  const w = { amoebas: [idet, spinoy, daleko, syt], bells: [kol], slippers: [] }, Uu = ugr.sozdat(); shagi(Uu, w, a, 10, q => !(q.syt > 0));
  const g = q => Uu.t.has(q), e = { idet: g(idet), spinoy: g(spinoy), daleko: g(daleko), syt: g(syt), kol: g(kol) };
  const ne_po_zubam = ugr.sozdat(); shagi(ne_po_zubam, w, a, 10, q => q !== idet);
  check('test_ugroza_kromka: горит у идущего на тебя и у колокольчика рядом; не горит у того, кто спиной, дальнего, сытого и того, кто тебе по зубам',
    e.idet && !e.spinoy && !e.daleko && !e.syt && e.kol && !ne_po_zubam.t.has(idet) ? '' : JSON.stringify({ ...e, po_zubam: ne_po_zubam.t.has(idet) })); }
const brosok = (K, spisok, v, derzhit = 0) => { const a = { x: 0, y: 0, m: 1 }, q = { x: 0, y: 0, m: 4 }, start = 430 + R(1) + R(4); q.x = start; q.a = Math.PI; /* край экрана телефона: полширины кадра при обычном увеличении */
  const w = { [spisok]: [q] }, Uu = ugr.sozdat(); let mig = false, t = 0; while (q.x - R(1) - R(4) > 0 && t < 60) { q.x -= v * DT; t += DT; ugr.shag(Uu, w, DT, K, a, () => true); if (Uu.mig.has(q)) mig = true; } for (let u = 0; u < derzhit; u += DT) { ugr.shag(Uu, w, DT, K, a, () => true); if (Uu.mig.has(q)) mig = true; } /* запятая убивает, провисев на тебе bdello_kill секунд */ return { gorit: Uu.t.get(q) || 0, mig }; };
const HOD = { amoebas: C.amoeba, slippers: C.slipper_speed, bdellos: C.bdello_speed, rotis: C.roti_speed }, DERZHIT = { bdellos: C.bdello_kill }; /* гарпун соперницы бьёт по геному, а не насмерть: её кромки нет (слабое место В) */
const plohie = K => Object.entries(HOD).filter(([, v]) => v).map(([s, v]) => [s, v, brosok(K, s, v, DERZHIT[s] || 0)]).filter(([, , r]) => r.gorit < K.za || !r.mig);
{ const p = plohie(U); check(`test_net_udara_bez_znaka: ${Object.keys(HOD).join(', ')} бросаются с края кадра — у каждого к смертельному удару кромка горит не меньше ${U.za} с и мигнула`, p.length ? JSON.stringify(p) : ''); }
check('test_net_udara_bez_znaka_samoproverka: кромка, что зажигается в упор, — судья ловит', plohie({ ...U, vidno: 0.3, zaranee: 0 }).some(([s]) => s === 'amoebas') ? '' : 'не заметил');
{ const D = ugr.dosyag(KAP.novye, zh.SPISKI), voronka = K => Object.entries(D).filter(([s, r]) => { const a = { x: 0, y: 0, m: 1 }, q = { x: R(1) + R(400) + r - 2, y: 0, m: 400, a: 0 }, Uu = ugr.sozdat(); ugr.shag(Uu, { [s]: [q] }, DT, K, a, () => true); return !Uu.t.has(q); }).map(([s]) => s);
  check(`test_net_udara_bez_znaka_voronka: у воронок (трубач, нематода, циклидиум, коловратка) кромка горит с края тяги (${Object.values(D).join(', ')}), до того как воронка потянула`, voronka({ ...U, dosyag: D }).join(', '));
  check('test_net_udara_bez_znaka_voronka_samoproverka: без досягаемости воронки судья краснеет', voronka(U).length ? '' : 'не заметил'); }
{ const stroka = (kto, spisok) => { const C = cel.sozdat(), me = { x: 0, y: 0, m: 1 }, w = Object.fromEntries(cel.SPIS.map(([l]) => [l, []])); w[spisok].push({ x: 900, y: 0, m: 200 }); C.videl[kto] = 200; cel.shag(C, w, me, KAP.cel, q => q.m, 1.8, true, 0.5); return C.stroka; }, ne = stroka('hlamido', 'hlamido'), da = stroka('amoeba', 'amoebas');
  check(`test_trevoga_po_delu_hozyain: «… ест таких, как ты» только про хищника — водоросль хламидомонада молчит («${ne}»), амёба названа («${da}»)`, /ест таких/.test(ne) || !/ест таких/.test(da) ? 'не так' : ''); }
{ const Uu = ugr.sozdat(), q = { x: 60, y: 0, m: 6, a: Math.PI }, a = { x: 0, y: 0, m: 1 }, w = { amoebas: [q] }, ranee = ugr.mozhno_bit(Uu, U, q); shagi(Uu, w, a, Math.ceil(U.za / DT) + 2);
  check(`test_net_udara_bez_znaka_vorota: пасть без кромки не хватает; после ${U.za} с горения — может`, !ranee && ugr.mozhno_bit(Uu, U, q) ? '' : `до: ${ranee}, после: ${ugr.mozhno_bit(Uu, U, q)}`); }
process.exit(bad ? 1 : 0);
