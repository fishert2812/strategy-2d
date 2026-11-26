// Сторож «вдоха» клетки «Капли» (книга П13): node proby/zaplyv/kaplya/test_vdoh.mjs. Провал — код 1. Числа — kaplya.json «vdoh».
// Книга: «каждый проглоченный кусок даёт мягкий „вдох“: клетка на 0,2 с раздувается на 4 % радиуса и садится на новый размер».
import fs from 'fs'; import * as vd from './vdoh.js';
const K = JSON.parse(fs.readFileSync(new URL('./kaplya.json', import.meta.url))).vdoh;
let bad = 0; const check = (n, e) => { console.log((e ? '  ПРОВАЛ ' : '  ок ') + n + (e ? ': ' + e : '')); if (e) bad++; };
const sud = K => { let ost = vd.nachat(K), max = 1, min = 1, t = 0, pred = 1, skachok = 0; while (ost > 0 && t < 2) { ost = vd.shag(ost, 1 / 120); t += 1 / 120; const s = vd.sila(ost, K); max = Math.max(max, s); min = Math.min(min, s); skachok = Math.max(skachok, Math.abs(s - pred)); pred = s; }
  if (Math.abs(max - 1.04) > 0.005) return `раздувается на ${((max - 1) * 100).toFixed(1)} %, в книге 4 %`; if (Math.abs(t - 0.2) > 0.02) return `вдох длится ${t.toFixed(2)} с, в книге 0,2 с`;
  if (min < 1) return 'клетка сжимается'; if (vd.sila(0, K) !== 1) return 'после вдоха клетка не села на свой размер'; if (skachok > 0.01) return 'вдох рывком, а не мягко'; return ''; };
check('test_vdoh: каждый кусок — клетка мягко раздувается на 4 % за 0,2 с и садится на свой размер (П13)', sud(K));
check('test_vdoh_samoproverka: раздув на 20 % — судья краснеет', sud({ ...K, r: 0.2 }) ? '' : 'судья не заметил');
check('test_vdoh_samoproverka_t: вдох на секунду — судья краснеет', sud({ ...K, t: 1 }) ? '' : 'судья не заметил');
process.exit(bad ? 1 : 0);
