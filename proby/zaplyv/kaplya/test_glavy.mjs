// Сторож глав 2–5 «Капли» (книга П79–П83): node proby/zaplyv/kaplya/test_glavy.mjs. Провал — код 1. Числа — из kaplya.json и data.json.
import fs from 'fs'; import { nachat, proydena, kroha, shag } from './glavy.js'; import { shag as shagL } from './lestnica.js';
const K = JSON.parse(fs.readFileSync(new URL('./kaplya.json', import.meta.url))).glavy, P = JSON.parse(fs.readFileSync(new URL('../data.json', import.meta.url))).pond;
let bad = 0; const check = (n, e) => { console.log((e ? '  ПРОВАЛ ' : '  ок ') + n + (e ? ': ' + e : '')); if (e) bad++; };
const mir = () => ({ cfg: { pond: P }, depth: y => y, syel: { amoeba: 1 }, me: [{ x: 0, y: 0.3, m: 20 }] });
const sud = K => { const w = mir(), me = w.me[0]; let G = nachat(w, 2); if (proydena(G, w, me, K)) return 'глава 2 пройдена без амёбы'; w.syel.amoeba++; if (!proydena(G, w, me, K)) return 'амёба съедена, а глава 2 не пройдена';
  G = nachat(w, 3); me.y = P.oxy; w.syel.coccus = (w.syel.coccus || 0) + 1; if (kroha(G, w, me, K)) return 'выбор объятия от простого шарика'; w.syel.kroha = (w.syel.kroha || 0) + 1; if (!kroha(G, w, me, K)) return 'дышащая кроха проглочена, а выбора нет'; if (proydena(G, w, me, K)) return 'объятие без «Оставить жить»'; G.obyatie = true; if (!proydena(G, w, me, K)) return '«Оставить жить», а цель главы 3 не выполнена';
  G = nachat(w, 4); w.syel.slipper = 1; if (proydena(G, w, me, K)) return 'глава 4 без коловратки'; w.syel.roti = 1; if (!proydena(G, w, me, K)) return 'туфелька и коловратка, а глава 4 не пройдена';
  G = nachat(w, 5); w.me.length = 0; for (let i = 0; i < K[5].kletok - 1; i++) w.me.push({ y: 0.3 }); if (proydena(G, w, me, K)) return 'шар меньше нужного'; w.me.push({ y: 0.3 }); return proydena(G, w, me, K) ? '' : 'шар собран, а глава 5 не пройдена'; };
check('test_glavy: 2 — амёба, 3 — объятие с дышащей крохой, 4 — туфелька и коловратка, 5 — шар клеток (П79–П82)', sud(K));
// П77, П116: после цели главы — хозяин; съела его — глава пройдена
{ const w = mir(), me = w.me[0]; w.amoebas = [{ x: 500, y: 0.3, m: 40 }]; const G = nachat(w, 4); w.syel.slipper = 1; w.syel.roti = 1; let e = shag(G, w, me, K, q => q.m, shagL);
  const host = G.L.car && G.L.car.q; let msg = e !== 'cel' || !host ? `цель выполнена, а хозяина нет (${e})` : ''; if (!msg) { host.gone = true; w.amoebas = []; w.gulps = [{ x0: host.x, y0: host.y }]; e = shag(G, w, me, K, q => q.m, shagL); if (e !== 'proydena') msg = 'хозяин съеден, а глава не пройдена'; }
  check('test_glavy_hozyain: после цели главы хозяин в короне; съела — глава пройдена (П77, П116)', msg); }
// Крупнее нет — хозяин самый крупный из имеющихся, глава сама не проходит (поручение 26.11)
const zapas = K => { const w = mir(), me = w.me[0]; w.slippers = [{ x: 300, y: 0.3, m: 3 }]; w.rotis = [{ x: 200, y: 0.3, m: 8 }]; const G = nachat(w, 4); w.syel.slipper = 1; w.syel.roti = 1;
  const e = shag(G, w, me, K, q => q.m, shagL); if (e === 'proydena') return 'крупнее нет — глава прошла сама'; return G.L.car && G.L.car.q.m === 8 ? '' : 'хозяин не самый крупный из имеющихся'; };
check('test_glavy_zapas: крупнее никого — хозяин самый крупный из имеющихся, глава сама не проходит', zapas(K));
check('test_glavy_zapas_samoproverka: без zapas глава проходит сама — судья краснеет', zapas({ ...K, hozyain: { ...K.hozyain, zapas: false } }) ? '' : 'судья не заметил');
check('test_glavy_samoproverka: объятие от любого глотка — судья краснеет', (() => { const w = mir(), G = nachat(w, 3); w.syel.coccus = 5; return kroha(G, w, w.me[0], K) ? 'шарик дал объятие' : ''; })() === '' ? '' : 'судья не заметил');
process.exit(bad ? 1 : 0);
