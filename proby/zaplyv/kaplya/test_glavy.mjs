// Сторож глав 2–5 «Капли» (книга П79–П83): node proby/zaplyv/kaplya/test_glavy.mjs. Провал — код 1. Числа — из kaplya.json и data.json.
import fs from 'fs'; import { nachat, proydena } from './glavy.js';
const K = JSON.parse(fs.readFileSync(new URL('./kaplya.json', import.meta.url))).glavy, P = JSON.parse(fs.readFileSync(new URL('../data.json', import.meta.url))).pond;
let bad = 0; const check = (n, e) => { console.log((e ? '  ПРОВАЛ ' : '  ок ') + n + (e ? ': ' + e : '')); if (e) bad++; };
const mir = () => ({ cfg: { pond: P }, depth: y => y, syel: { amoeba: 1 }, me: [{ y: 0.3, m: 20 }] });
const sud = K => { const w = mir(), me = w.me[0]; let G = nachat(w, 2); if (proydena(G, w, me, K)) return 'глава 2 пройдена без амёбы'; w.syel.amoeba++; if (!proydena(G, w, me, K)) return 'амёба съедена, а глава 2 не пройдена';
  G = nachat(w, 3); w.syel.coccus = 1; if (proydena(G, w, me, K)) return 'объятие вдали от границы кислорода'; me.y = P.oxy; w.syel.coccus++; if (!proydena(G, w, me, K)) return 'глоток на границе кислорода не засчитан';
  G = nachat(w, 4); w.syel.slipper = 1; if (proydena(G, w, me, K)) return 'глава 4 без коловратки'; w.syel.roti = 1; if (!proydena(G, w, me, K)) return 'туфелька и коловратка, а глава 4 не пройдена';
  G = nachat(w, 5); w.me.length = 0; for (let i = 0; i < K[5].kletok - 1; i++) w.me.push({ y: 0.3 }); if (proydena(G, w, me, K)) return 'шар меньше нужного'; w.me.push({ y: 0.3 }); return proydena(G, w, me, K) ? '' : 'шар собран, а глава 5 не пройдена'; };
check('test_glavy: 2 — амёба, 3 — объятие на границе кислорода, 4 — туфелька и коловратка, 5 — шар клеток (П79–П82)', sud(K));
check('test_glavy_samoproverka: «граница» на всю каплю — судья краснеет', sud({ ...K, 3: { ...K[3], polosa: 1 } }) ? '' : 'судья не заметил');
process.exit(bad ? 1 : 0);
