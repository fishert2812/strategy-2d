// Сторож событий области «Капли» (книга П85): node proby/zaplyv/kaplya/test_golod.mjs. Провал — код 1. Числа — kaplya.json «golod».
import fs from 'fs'; import { sozdat, shag, idet } from './golod.js';
const K = JSON.parse(fs.readFileSync(new URL('./kaplya.json', import.meta.url))).golod;
let bad = 0; const check = (n, e) => { console.log((e ? '  ПРОВАЛ ' : '  ок ') + n + (e ? ': ' + e : '')); if (e) bad++; };
const mir = () => ({ stats: { time: 0 }, cfg: { food_per_chunk: [3, 5, 2], food_patches: [1, 2, 1] }, plants: [{ t: 0.5 }] });
const sud = K => { const S = sozdat(), w = mir(), dt = 0.1, slova = []; let golodT = 0, sahar = 0;
  const idti = (sek, gl, ten = false) => { for (let t = 0; t < sek; t += dt) { w.stats.time += dt; w.plants[0].t = 0.5; const s = shag(S, w, dt, K, gl, ten); if (s) slova.push(s); if (idet(S)) { golodT += dt; if (w.plants[0].t) sahar++; if (w.cfg.food_per_chunk.some(x => x)) sahar++; } } };
  idti(300, 1); if (slova.length || golodT) return 'голод в главе 1';
  idti(175, 2); if (slova.length) return 'голод раньше 3-й минуты главы';
  idti(5000, 2); const nado = K.volny.reduce((a, b) => a + b, 0);
  if (slova[0] !== K.slova.golod) return 'нет строки «Голод»'; if (!slova.includes(K.slova.zasuha)) return 'нет засухи'; if (slova.at(-1) !== K.slova.konec) return 'голод не кончился';
  if (Math.abs(golodT - nado) > 1) return `голода ${golodT.toFixed(0)} с, а по книге ${nado}`; if (sahar) return 'в голод появлялись крупинки или сахар';
  if (w.cfg.food_per_chunk[1] !== 5) return 'после голода еда в квадратах не вернулась';
  const n = slova.length; idti(2000, 2); if (slova.length > n) return 'второй голод в той же главе';
  const S2 = sozdat(), w2 = mir(); w2.stats.time = 0; shag(S2, w2, 0.1, K, 3, false); w2.stats.time = K.ot_s + 10; if (shag(S2, w2, 0.1, K, 3, true)) return 'голод начался в тень';
  return ''; };
check('test_golod: с главы 2, не раньше 3-й минуты и не в тень, раз за главу: волны голода, последняя — засуха; в голод новой еды нет (П85)', sud(K));
check('test_golod_samoproverka: голод с первой секунды — судья краснеет', sud({ ...K, ot_s: 0 }) ? '' : 'судья не заметил');
process.exit(bad ? 1 : 0);
