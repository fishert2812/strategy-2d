// Сторож знака вируса «Капли» (книга П7): node proby/zaplyv/kaplya/test_virus.mjs. Провал — код 1. Числа — kaplya.json «virus_znak».
// Книга: вирус без света; ближе, чем ты проплываешь за 1 с, вода вокруг зёрнышка мутнеет серым; облако (4 свободных в круге 80) — вода серая и мутная.
import fs from 'fs'; import { muti } from './virus.js';
const K = JSON.parse(fs.readFileSync(new URL('./kaplya.json', import.meta.url))).virus_znak;
let bad = 0; const check = (n, e) => { console.log((e ? '  ПРОВАЛ ' : '  ок ') + n + (e ? ': ' + e : '')); if (e) bad++; };
const me = { x: 0, y: 0 }, R = 13, v = 150, f = (x, y, o = {}) => ({ x, y, host: 'me', ...o });
const sud = K => { const t = (ph, vid, n) => muti(ph, me, K, R, v).filter(q => q.vid === vid).length === n;
  if (!t([0, 1, 2, 3].map(i => f(600 + i * 20, 600)), 'oblako', 4)) return 'облако из 4 вирусов в круге 80 (книга) не мутит воду';
  if (!t([0, 1, 2].map(i => f(600 + i * 20, 600)), 'oblako', 0)) return 'три вируса уже облако';
  if (!t([f(R + v * 0.9, 0)], 'blizko', 1)) return 'вирус ближе секунды пути, а вода вокруг чистая';
  if (!t([f(R + v * 1.5, 0)], 'blizko', 0)) return 'дальний одинокий вирус мутит воду';
  if (muti([f(R + 5, 0, { on: me }), f(R + 5, 0, { host: 'prey' })], me, K, R, v).length) return 'севший или чужой вирус мутит воду';
  return ''; };
check('test_virus: облако из четырёх вирусов и вирус ближе секунды пути мутят воду серым; дальний, севший и чужой — нет (П7)', sud(K));
check('test_virus_samoproverka_oblako: облако с десяти вирусов — судья краснеет', sud({ ...K, oblako: { ...K.oblako, n: 10 } }) ? '' : 'судья не заметил');
check('test_virus_samoproverka_blizko: близко за 3 с — судья краснеет', sud({ ...K, blizko_t: 3 }) ? '' : 'судья не заметил');
const c = K.cvet; check('test_virus_cvet: муть серая, без красного и розового (П7)', Math.max(...c) - Math.min(...c) < 0.08 ? '' : 'в мути есть цвет: ' + c);
process.exit(bad ? 1 : 0);
