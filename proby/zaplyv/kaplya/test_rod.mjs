// Сторож «Род жив» (книга П73): node proby/zaplyv/kaplya/test_rod.mjs. Провал — код 1. Числа — из kaplya.json.
import fs from 'fs'; import { sozdat, probudit } from './rod.js';
const K = JSON.parse(fs.readFileSync(new URL('./kaplya.json', import.meta.url))).rod;
let bad = 0; const check = (n, e) => { console.log((e ? '  ПРОВАЛ ' : '  ок ') + n + (e ? ': ' + e : '')); if (e) bad++; };
let s = 1; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
const sud = K => { const w = { me: [], ids: 0, amoebas: [{ x: 1500, y: 0 }, { x: -1500, y: 0 }, { x: 0, y: 1500 }] }, S = sozdat(), sis = probudit(S, w, K, 10, 0, 0, rnd);
  if (!sis || w.me.length !== 1) return 'сестра не проснулась'; const dal = Math.hypot(sis.x, sis.y), hish = Math.min(...w.amoebas.map(q => Math.hypot(q.x - sis.x, q.y - sis.y)));
  if (sis.m < 4 || sis.m > 5.5) return `масса сестры ${sis.m} из 10, а книга: 0,4–0,55`; if (dal < 1000) return `сестра в той же воде (${dal | 0})`; if (hish < K.bezopasno) return `сестра у хищника (${hish | 0})`;
  w.me.length = 0; return probudit(S, w, K, 10, 0, 0, rnd) ? 'проснулась второй раз за заплыв' : ''; };
check('test_rod_zhiv: раз за заплыв сестра в другой воде, вдали от хищника, 0,4–0,55 массы гибели (П73)', sud(K));
check('test_rod_samoproverka: сестра в полную массу — судья краснеет', sud({ ...K, dolya: 1 }) ? '' : 'судья не заметил');
process.exit(bad ? 1 : 0);
