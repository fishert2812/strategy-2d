// Сторож показа нового мира «Капли» (книга П13, П84): node proby/zaplyv/kaplya/test_pokaz.mjs. Провал — код 1. Числа — kaplya.json «pokaz».
import fs from 'fs'; import { sozdat, zhdat, shag, zoom } from './pokaz.js';
const K = JSON.parse(fs.readFileSync(new URL('./kaplya.json', import.meta.url))).pokaz;
let bad = 0; const check = (n, e) => { console.log((e ? '  ПРОВАЛ ' : '  ок ') + n + (e ? ': ' + e : '')); if (e) bad++; };
// судья: существо целиком в половине ширины экрана от тебя (книга: «ровно настолько, чтобы его было видно целиком»)
const S = [['amoebas', 'amoeba'], ['spumelly', 'spumella']], ms = q => q.m;
const sud = K => { const me = { x: 0, y: 0, m: 20 }, w = { amoebas: [{ x: 100, y: 0, m: 30 }], spumelly: [{ x: 600, y: 0, m: 150 }] }, P = sozdat();
  if (shag(P, w, me, K, S, ms, 0.1)) return 'показ без пройденного хозяина'; zhdat(P, { amoeba: 6 });
  const kto = shag(P, w, me, K, S, ms, 0.1); if (kto !== 'spumella') return `показ не нового существа: ${kto}`;
  let z = 2; for (let t = 0; t < K.t; t += 0.1) { shag(P, w, me, K, S, ms, 0.1); z = Math.min(z, zoom(P, me, K, 720, 160, z)); }
  if ((600 + 160) * z > 720 * 0.5 * 1.05 + 1) return `после показа существо не целиком в кадре (z ${z.toFixed(2)})`;
  for (let t = 0; t < K.derzhat + 1; t += 0.1) shag(P, w, me, K, S, ms, 0.1); if (zoom(P, me, K, 720, 160, z) !== Infinity) return 'показ не кончился';
  if (shag(P, w, me, K, S, ms, 0.1)) return 'второй показ без нового хозяина'; return ''; };
check('test_pokaz: после хозяина — первое новое существо крупнее тебя целиком в кадре за 3 с, один раз (П13)', sud(K));
check('test_pokaz_samoproverka: камера не отходит (dolya огромна) — судья краснеет', sud({ ...K, dolya: 100 }) ? '' : 'судья не заметил');
process.exit(bad ? 1 : 0);
