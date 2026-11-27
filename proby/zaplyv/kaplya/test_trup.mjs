// Сторож серого тела и «Глотать» пузырём «Капли» (pravki_po_blokam.md Ж.3, Ж.4; test_glotat_puzyr, test_glotat_ne_zhivoe): node proby/zaplyv/kaplya/test_trup.mjs.
// test_trup: убитый лежит t с и лопается. test_glotat_puzyr: с «Глотать» мелкое мёртвое втягивается внутрь и тает там v_puzyre с, масса тебе; крупное и живое не обволакивается.
import fs from 'fs'; import * as trp from './trup.js';
const KAP = JSON.parse(fs.readFileSync(new URL('./kaplya.json', import.meta.url))), K = KAP.trup, DT = 1 / 30;
let bad = 0; const check = (n, e) => { console.log((e ? '  ПРОВАЛ ' : '  ок ') + n + (e ? ': ' + e : '')); if (e) bad++; };
const R = m => 13 * Math.sqrt(m);
// Прогон: ты массы 1 у трупов массы ms (вплотную), «Глотать» уровня lvl, живой кокк рядом. Вернёт когда что случилось.
const progon = (ms, lvl, shag = trp.shag) => { const a = { x: 0, y: 0, a: 0, m: 1 }, w = { trupy: ms.map((m, i) => ({ ck: 'kokk', spisok: 'prey', q: { x: R(1) + 2, y: i * 3, m }, t: 0 })), prey: [{ x: R(1) + 2, y: -3, m: 0.1 }] };
  const o = { lop: [], obv: [], rast: [], vnutri: true, m0: a.m, el: 0 }; let t = 0; const grow = (b, d) => { b.m += d; o.el += d; };
  for (; t < 8; t += DT) { const { ev, lop } = shag(w, DT, K, a, lvl, grow); for (const x of lop) o.lop.push(+t.toFixed(2)); for (const [e] of ev) (e === 'obvolok' ? o.obv : o.rast).push(+t.toFixed(2));
    for (const x of w.trupy) if (x.puz && x.puz.t > K.smykanie && Math.hypot(x.q.x - a.x, x.q.y - a.y) > R(a.m)) o.vnutri = false; }
  o.zhivoy = w.prey.length; o.m = a.m; return o; };
const sud = (shag) => { let o = progon([0.15], 0, shag); if (o.obv.length || o.lop.length !== 1 || Math.abs(o.lop[0] - K.t) > 0.1) return `без «Глотать»: обволок ${o.obv}, лопнул в ${o.lop}, а не в ${K.t} с`;
  o = progon([0.15], 1, shag); if (o.obv[0] > 0.1 || !o.rast.length || Math.abs(o.rast[0] - K.smykanie - K.v_puzyre) > 0.1 || !o.vnutri || o.lop.length) return `с «Глотать»: ${JSON.stringify(o)}`;
  if (Math.abs(o.el - 0.15 * K.syt) > 1e-6) return `масса тебе ${o.el.toFixed(3)}, а не ${0.15 * K.syt}`;
  o = progon([0.3], 1, shag); if (o.obv.length || o.lop.length !== 1) return `крупное (0,3 при пороге ${K.glotat_s[0]}): обволок ${o.obv}`;
  o = progon([0.1, 0.1], 1, shag); if (o.obv.length !== 1) return `уровень 1: пузырьков сразу ${o.obv.length}`;
  o = progon([0.1, 0.1], 3, shag); if (o.obv.length !== 2) return `уровень 3: пузырьков сразу ${o.obv.length}, а не 2`; if (o.zhivoy !== 1) return 'живой кокк пропал'; return ''; };
check(`test_glotat_puzyr: убитый лежит ${K.t} с и лопается; с «Глотать» мелкое мёртвое втягивается за ${K.smykanie} с и тает внутри ${K.v_puzyre} с, масса тебе; крупное не берётся; на 3-м уровне два пузырька; живое не трогается (Ж.3)`, sud());
check('test_glotat_puzyr_samoproverka: «Глотать», что тает снаружи тела, судья ловит', sud((w, dt, K0, a, l, g) => trp.shag(w, dt, K0, a ? { ...a, x: a.x + 500 } : a, l, g)) ? '' : 'не заметил');
process.exit(bad ? 1 : 0);
