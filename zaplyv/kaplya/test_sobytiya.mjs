// Сторож событий «кто нас убивает» «Капли» (задание kolonia_eda_boy.md Ш41, частоты 12.8): node proby/zaplyv/kaplya/test_sobytiya.mjs.
// Каждое событие объявлено строкой за 3 с до прихода и всё это время видно мутью воды; волна вируса в злой воде — раз в 125 с, в тихой — раз в 500 с (симуляция ±5 %);
// налёт запятых только в злой. Самопроверки: приход без объявления краснеет, частота не по симуляции краснеет.
import fs from 'fs'; import * as sob from './sobytiya.js';
const KAP = JSON.parse(fs.readFileSync(new URL('./kaplya.json', import.meta.url))), K = KAP.sobytiya, SIM = { tihaya: 0.002, zlaya: 0.008 } /* design/partii/sim_staya/itog.json virus */, DT = 0.25;
let bad = 0; const check = (n, e) => { console.log((e ? '  ПРОВАЛ ' : '  ок ') + n + (e ? ': ' + e : '')); if (e) bad++; };
const rnd = s => () => ((s = (s * 16807) % 2147483647) / 2147483647); const radius = m => 13 * Math.sqrt(m);
function progon(K0, zona, T) { const w = { me: [{ x: 0, y: 0, a: 0, m: 2 }], phages: [], bdellos: [], ids: 0 }, S = sob.sozdat(), r = rnd(9), n = { virus: 0, nalet: 0 }, oshibki = [];
  let obyav = null, mut = true; for (let t = 0; t < T; t += DT) { const ev = sob.shag(S, w, DT, K0, zona, radius, r); w.phages = []; w.bdellos = [];
    if (S.idet && !S.idet.prishlo && !sob.muti(S, K0)) mut = false;
    for (const [e, v] of ev) { if (e === 'obyavleno') obyav = t; if (e === 'prishlo') { n[v]++; if (obyav == null || t - obyav < 3 - 1e-6) oshibki.push(`${v}: пришло через ${obyav == null ? '—' : (t - obyav).toFixed(2)} с после строки`); obyav = null; } } }
  return { n, oshibki, mut }; }
const sud = K0 => { const T = 200000, out = [];
  for (const z of ['zlaya', 'tihaya']) { const r = progon(K0, z, T); if (r.oshibki.length) out.push(r.oshibki[0]); if (!r.mut) out.push('до прихода вода не мутнеет');
    const zanyato = (K0.za + K0.posle + K0.pauza), vsego = r.n.virus + r.n.nalet, vremya = T - vsego * zanyato, chast = r.n.virus / vremya;
    if (Math.abs(chast / SIM[z] - 1) > 0.05) out.push(`${z}: волна вируса раз в ${(1 / chast).toFixed(0)} с, а по симуляции раз в ${1 / SIM[z]}`);
    if (z === 'tihaya' && r.n.nalet) out.push('налёт запятых в тихой воде'); }
  return out.join('; '); };
check('test_sobytiya: беда объявлена строкой за 3 с и видна мутью воды; вирус в злой раз в 125 с, в тихой раз в 500 с (симуляция ±5 %); налёта в тихой нет (Ш41)', sud(K));
check('test_sobytiya_samoproverka_za: приход без объявления судья ловит', sud({ ...K, za: 0.5 }) ? '' : 'не заметил');
check('test_sobytiya_samoproverka_chastota: вирус чаще симуляции судья ловит', sud({ ...K, vidy: { ...K.vidy, virus: { ...K.vidy.virus, chastota: { tihaya: 0.004, zlaya: 0.016 } } } }) ? '' : 'не заметил');
process.exit(bad ? 1 : 0);
