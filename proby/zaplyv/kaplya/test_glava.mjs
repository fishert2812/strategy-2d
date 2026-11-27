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
// L089 (переигровка bac846d: «+1 % за палочку съедается за 10 с, "очагов 4" стоит»): за минуту у одного очага съел 6 палочек (раз в 10 с) — чистота выросла на 6+ %, очагов стало меньше
const sudObgon = K0 => { const G = glc.rasstavit(glc.sozdat(), K0, 0, 0, rnd, gde), w = { [K0.spisok]: [] }, c0 = glc.chistota(G, K0), o = G.ochagi[0], a = { x: o.x, y: o.y, m: 1 }; const spawn = (oc, n) => { for (let i = 0; i < n; i++) w[K0.spisok].push({ x: oc.x, y: oc.y, oc }); };
  for (let t = 0; t < 60; t += 1) { let ub = []; if (t % 10 === 5) { const q = w[K0.spisok].find(q => q.oc === o && !q.gone); if (q) { q.gone = true; ub = [[K0.kto, q]]; w[K0.spisok] = w[K0.spisok].filter(x => !x.gone); } } glc.shag(G, w, 1, K0, a, ub, spawn); }
  const c1 = glc.chistota(G, K0), n = G.ochagi.filter(x => x.sila > 0).length; return c1 - c0 < 0.06 ? `чистота ${Math.round(c0 * 100)} → ${Math.round(c1 * 100)} %` : n >= K0.n ? `очагов по-прежнему ${n}` : ''; };
check('test_L089 test_glava_obgon: минута у очага, палочка раз в 10 с — чистота растёт на 6+ % и очагов меньше', sudObgon(K));
check('test_glava_obgon_samoproverka: прежние числа (сила 6 из 16, рост 0,8 в минуту) судья ловит', sudObgon({ ...K, sila0: 6, sila_max: 16, rost_v_min: 0.8 }) ? '' : 'не заметил');
process.exit(bad ? 1 : 0);
