// Сторож цели «Очисти каплю» (pravki_po_blokam.md блок Ц, Ц.4 test_porazhenie_ponyatno, test_pobeda_dostizhima в простом виде): node proby/zaplyv/kaplya/test_glava.mjs.
// test_glava_ochagi: очаги в злой воде на своём расстоянии; рядом выпускают клетки по силе; убил клетку очага — сила −1 и событие (копия); вычистил все — победа.
// test_glava_porazhenie: без чистки очаги растут, чистота падает до 0 — поражение с причиной; вычищенный очаг не оживает.
import fs from 'fs'; import * as glc from './glava.js';
const KAP = JSON.parse(fs.readFileSync(new URL('./kaplya.json', import.meta.url))), K = KAP.glava, DT = 1 / 10;
let bad = 0; const check = (n, e) => { console.log((e ? '  ПРОВАЛ ' : '  ок ') + n + (e ? ': ' + e : '')); if (e) bad++; };
const rnd = (s => () => ((s = (s * 16807) % 2147483647) / 2147483647))(3), gde = (x, y) => (Math.floor(x / 200) + Math.floor(y / 200)) % 2 ? 'zlaya' : 'tihaya';
const sud = (shag = glc.shag) => { const G = glc.rasstavit(glc.sozdat(), K, 0, 0, rnd, gde), w = { [K.spisok]: [] };
  if (G.ochagi.length !== K.n) return `очагов ${G.ochagi.length}`; for (const o of G.ochagi) { const d = Math.hypot(o.x, o.y); if (d < K.dal[0] - 1 || d > K.dal[1] + 1 || gde(o.x, o.y) !== K.zona) return `очаг на ${d.toFixed(0)}, вода ${gde(o.x, o.y)}`; }
  const c0 = glc.chistota(G, K); if (Math.abs(c0 - (1 - K.sila0 / K.sila_max)) > 1e-9) return `чистота на старте ${c0}`;
  let ev = [], pobeda = false; const spawn = (o, n) => { for (let i = 0; i < n; i++) w[K.spisok].push({ x: o.x, y: o.y, oc: o }); };
  for (const o of G.ochagi) { const a = { x: o.x, y: o.y, m: 1 }; for (let k = 0; k < 200 && o.sila > 0; k++) { const e = shag(G, w, DT, K, a, [], spawn); const q = w[K.spisok].find(q => q.oc === o && !q.gone); if (!q) return 'очаг рядом с тобой не выпустил клеток';
      q.gone = true; w[K.spisok] = w[K.spisok].filter(x => !x.gone); ev = shag(G, w, DT, K, a, [[K.kto, q]], spawn); if (ev.some(([x]) => x === 'pobeda')) pobeda = true; if (!ev.some(([x]) => x === 'ubil')) return 'убил клетку очага — нет события'; } }
  if (!pobeda || G.konec !== 'pobeda') return `все очаги вычищены, а победы нет (${G.ochagi.map(o => o.sila.toFixed(1))})`; return ''; };
check(`test_glava_ochagi: ${K.n} очага в злой воде на ${K.dal.join('–')}; рядом выпускают клетки; убил клетку — сила −1; вычистил все — победа (Ц.3)`, sud());
check('test_glava_ochagi_samoproverka: убийства, что не снимают силу, судья ловит', sud((G, w, dt, K0, a, ub, sp) => glc.shag(G, w, dt, K0, a, [], sp)) ? '' : 'не заметил');
{ const G = glc.rasstavit(glc.sozdat(), K, 0, 0, rnd, gde), w = { [K.spisok]: [] }; let t = 0, ev = []; const mins = (K.sila_max - K.sila0) / K.rost_v_min;
  for (; t < 3600 && !G.konec; t += 1) ev = glc.shag(G, w, 1, K, null, [], () => {});
  const H = glc.rasstavit(glc.sozdat(), K, 0, 0, rnd, gde); H.ochagi[0].sila = 0; for (let k = 0; k < 600; k++) glc.shag(H, w, 1, K, null, [], () => {});
  check(`test_glava_porazhenie: без чистки зараза занимает каплю за ${(t / 60).toFixed(1)} мин (ждали ${mins.toFixed(1)}), поражение с причиной; вычищенный очаг не оживает (Ц.4)`,
    G.konec === 'porazhenie' && ev.some(([e]) => e === 'porazhenie') && Math.abs(t / 60 - mins) < 0.2 && K.slova.porazh_tekst && H.ochagi[0].sila === 0 ? '' : JSON.stringify({ konec: G.konec, t, zhivoy: H.ochagi[0].sila })); }
process.exit(bad ? 1 : 0);
