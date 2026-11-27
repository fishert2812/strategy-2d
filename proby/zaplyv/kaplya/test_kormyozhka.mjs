// Сторож добычи по росту «Капли» (книга П35, ЛЭ10; Роман 26.11 23:03 «Разнообразие еды… не изменилось»): node proby/zaplyv/kaplya/test_kormyozhka.mjs.
// Судья на настоящем мире: клетка массы 2, 30, 300 стоит 20 с — вокруг неё набирается живая добыча массой 0,3–0,55 её массы, и вид добычи меняется с ростом
// (мелкую кормят шарики и спириллы, крупную — простейшие). Самопроверка: без добычи по росту у крупной клетки добычи по росту нет.
import fs from 'fs'; import { World } from '../sim.js'; import * as mut from '../mutacii.js'; import * as zh from './zhiteli.js'; import * as krm from './kormyozhka.js';
const base = JSON.parse(fs.readFileSync(new URL('../data.json', import.meta.url))), KAP = JSON.parse(fs.readFileSync(new URL('./kaplya.json', import.meta.url))), DT = 1 / 30;
let bad = 0; const check = (n, e) => { console.log((e ? '  ПРОВАЛ ' : '  ок ') + n + (e ? ': ' + e : '')); if (e) bad++; };
const SP = ['prey', 'spirilly', 'hlorelly', 'parafizo', 'cerko', 'spumelly', 'hlamido', 'ciklidii'];
const vokrug = (K, m) => { const cfg = JSON.parse(JSON.stringify(base)); mut.addGenes(cfg); const w = new World(cfg, 5); w.mode = 'evo'; zh.nachalo(w); w.step(DT, null); w.lose = () => {}; const a = w.me[0], S = krm.sozdat();
  for (let t = 0; t < 20; t += DT) { a.m = m; a.x = 0; a.y = 0; krm.shag(S, w, DT, K, null); }
  const [lo, hi] = krm.okno(K, m), vidy = new Set(); let n = 0; for (const sp of SP) for (const q of w[sp] || []) if (Math.hypot(q.x, q.y) < K.r && q.m >= lo - 1e-9 && q.m <= hi + 1e-9) { n++; vidy.add(sp); } return { n, vidy: [...vidy] }; };
const sud = K => { const r = [2, 30, 300].map(m => vokrug(K, m)); const pusto = r.findIndex(x => x.n < KAP.kormyozhka.n); if (pusto >= 0) return `у клетки массы ${[2, 30, 300][pusto]} добычи по росту ${r[pusto].n}`;
  if (r[0].vidy.join() === r[2].vidy.join()) return 'вид добычи не меняется с ростом: ' + r[0].vidy.join();
  return ''; };
check('test_kormyozhka: вокруг клетки любой массы есть добыча 0,3–0,55 её массы, и вид добычи меняется с ростом (П35)', sud(KAP.kormyozhka));
check('test_kormyozhka_samoproverka: без добычи по росту судья ловит', sud({ ...KAP.kormyozhka, n: 0 }) ? '' : 'судья не заметил');
process.exit(bad ? 1 : 0);
