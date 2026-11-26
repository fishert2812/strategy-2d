// Сторож кислой воды «Капли» (книга П26, П39): node proby/zaplyv/kaplya/test_kislota.mjs. Провал — код 1. Числа — kaplya.json «kislota».
// Книга: шарики гроздьями по 4–8; «гроздь закисляет воду в круге 2 радиусов грозди: пока ты в кислой воде, крупинки, сахар и сок растят тебя вдвое слабее. Проглоченное это не режет».
import fs from 'fs'; import * as kis from './kislota.js';
const K = JSON.parse(fs.readFileSync(new URL('./kaplya.json', import.meta.url))).kislota;
let bad = 0; const check = (n, e) => { console.log((e ? '  ПРОВАЛ ' : '  ок ') + n + (e ? ': ' + e : '')); if (e) bad++; };
const sud = K => { const a = { x: 0, y: 0, m: 4 }, w = { me: [a], prey: [], ids: 1 }, S = kis.sozdat(); S.t = 1e9; kis.shag(S, w, 0.03, K, new Map(), false);
  const g = S.grozdi[0]; if (!g) return 'гроздь не села'; if (g.chleny.length < 4 || g.chleny.length > 8) return `в грозди ${g.chleny.length} шариков, в книге 4–8`;
  const k = kis.krug(g, w, K), x = g.chleny.reduce((s, q) => s + q.x, 0) / g.chleny.length, y = g.chleny.reduce((s, q) => s + q.y, 0) / g.chleny.length, Rg = k.r / K.r;
  if (Math.hypot(x, y) < 400) return 'гроздь села у самой клетки, а не за краем кадра';
  const rost = (d, glotnula) => { a.x = x + d * Rg; a.y = y; const m0 = new Map([[a, 4]]); a.m = 5; S.t = 0; kis.shag(S, w, 0.03, K, m0, glotnula); return a.m - 4; };
  if (Math.abs(rost(1.8) - 0.5) > 0.01) return `в 1,8 радиусах грозди кусок растит на ${rost(1.8).toFixed(2)} из 1 (книга: вдвое слабее в круге 2 радиусов)`;
  if (Math.abs(rost(2.3) - 1) > 0.01) return 'за кругом 2 радиусов еда тоже режется';
  if (Math.abs(rost(1, true) - 1) > 0.01) return 'проглоченное режется кислотой';
  for (const q of g.chleny) q.gone = true; kis.shag(S, w, 0.03, K, new Map(), false); if (S.grozdi.includes(g)) return 'гроздь съели, а кислота осталась';
  return ''; };
check('test_kislota: гроздь из 4–8 шариков за краем кадра; в круге 2 её радиусов еда растит вдвое слабее, проглоченное нет; съели гроздь — кислоты нет (П26, П39)', sud(K));
check('test_kislota_samoproverka_eda: кислота не режет — судья краснеет', sud({ ...K, eda: 1 }) ? '' : 'судья не заметил');
check('test_kislota_samoproverka_r: круг в 1 радиус — судья краснеет', sud({ ...K, r: 1 }) ? '' : 'судья не заметил');
check('test_kislota_cvet: муть бледно-жёлтая, без красного (П26)', K.cvet[0] > 0.8 && K.cvet[1] > 0.75 && K.cvet[2] < 0.6 && Math.abs(K.cvet[0] - K.cvet[1]) < 0.12 ? '' : 'цвет мути не бледно-жёлтый: ' + K.cvet);
process.exit(bad ? 1 : 0);
