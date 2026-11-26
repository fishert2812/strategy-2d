// Сторож великанов после большого события «Капли» (книга П53, П13; Роман 26.11 23:03 «Я вырос и что? Что делать то?»): node proby/zaplyv/kaplya/test_velikany.mjs.
// Судья на настоящем мире: клетка массы 1000 (20 мкм, объятие пройдено) и 30000 стоит 30 с — рядом есть великан вдвое-впятеро тяжелее её, он живёт (не забывается
// у большой клетки), большая амёба плывёт к ней. Самопроверка: без великанов (n 0) судья краснеет.
import fs from 'fs'; import { World, radius } from '../sim.js'; import * as mut from '../mutacii.js'; import * as zh from './zhiteli.js'; import * as krm from './kormyozhka.js';
const base = JSON.parse(fs.readFileSync(new URL('../data.json', import.meta.url))), KAP = JSON.parse(fs.readFileSync(new URL('./kaplya.json', import.meta.url))), DT = 1 / 30;
let bad = 0; const check = (n, e) => { console.log((e ? '  ПРОВАЛ ' : '  ок ') + n + (e ? ': ' + e : '')); if (e) bad++; };
const SP = KAP.velikany.vidy.map(v => v.spisok);
const vokrug = (K, m) => { const cfg = JSON.parse(JSON.stringify(base)); mut.addGenes(cfg); const w = new World(cfg, 7); w.mode = 'evo'; zh.nachalo(w); w.step(DT, null); w.lose = () => {}; const a = w.me[0], S = krm.sozdat();
  let blizhe = 0, d0 = null;
  for (let t = 0; t < 30; t += DT) { a.m = m; a.x = 0; a.y = 0; krm.shag(S, w, DT, K, null, radius); zh.shag(w, DT, KAP.novye, () => false, radius);
    for (const q of w.ameby3 || []) { const d = Math.hypot(q.x, q.y); if (d0 == null) d0 = d; else if (d < d0 - radius(m)) blizhe = 1; } }
  const vel = SP.flatMap(sp => w[sp] || []).filter(q => q.m >= m * K.okno[0] - 1e-6 && q.m <= m * K.okno[1] + 1e-6); return { n: vel.length, blizhe, ameb: (w.ameby3 || []).length }; };
const sud = K => { for (const m of [1000, 30000]) { const r = vokrug(K, m); if (r.n < 1) return `у клетки массы ${m} великанов нет`; } 
  let plyvet = false; for (let i = 0; i < 6 && !plyvet; i++) { const r = vokrug({ ...K, vidy: K.vidy.filter(v => v.vid === 'ameba3') }, 1000 + i); plyvet = !!r.blizhe; } return plyvet ? '' : 'большая амёба не плывёт к клетке'; };
check('test_velikany: после объятия рядом с клеткой любого роста есть великан вдвое-впятеро тяжелее, большая амёба плывёт к ней (П53)', sud(KAP.velikany));
check('test_velikany_samoproverka: без великанов судья ловит', sud({ ...KAP.velikany, n: 0 }) ? '' : 'судья не заметил');
process.exit(bad ? 1 : 0);
