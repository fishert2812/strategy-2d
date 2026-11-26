// Сторож крупных П40 «Капли»: node proby/zaplyv/kaplya/test_krupnye.mjs. Провал — код 1. Числа — kaplya.json «novye».
import fs from 'fs'; import { nachalo, shag, SPISKI } from './zhiteli.js';
const K = JSON.parse(fs.readFileSync(new URL('./kaplya.json', import.meta.url))), radius = m => 13 * Math.sqrt(m);
let bad = 0; const check = (n, e) => { console.log((e ? '  ПРОВАЛ ' : '  ок ') + n + (e ? ': ' + e : '')); if (e) bad++; };
const mir = (m) => { let s = 1; const w = { cfg: { chunk: 1000 }, r: () => (s = (s * 16807) % 2147483647) / 2147483647, ids: 0, crumbs: [], plants: [], biome: () => 1, me: [{ x: 0, y: 0, m }], poteri: [] };
  w.lose = (a, x, y, who) => { w.poteri.push(who); w.me = w.me.filter(o => o !== a); }; nachalo(w); return w; };
const gon = (w, N, sek, mozhno = () => false) => { for (let t = 0; t < sek; t += 1 / 30) shag(w, 1 / 30, N, mozhno, radius); };
const sud = N => { const S = N.spumella;
  let w = mir(20); w.spumelly.push({ id: 1, x: 260, y: 0, a: 0, m: 150, t: 0, faza: 'beg' }); gon(w, N, 3); if (!w.poteri.includes('spumella')) return 'спумелла видит лёгкую тебя рядом и не берёт';
  w = mir(150 / S.bolshe + 5); w.spumelly.push({ id: 1, x: 260, y: 0, a: 3.14, m: 150, t: 0, faza: 'beg' }); gon(w, N, 3); if (w.poteri.length) return 'спумелла взяла тебя, хотя ты тяжелее её доли';
  w = mir(20); w.hlamido.push({ id: 1, x: 150, y: 0, a: 3.14, m: 200, t: 0, faza: 'beg' }); gon(w, N, 4); if (w.poteri.length) return 'хламидомонада съела тебя, а она не опасна';
  w = mir(20); w.ciklidii.push({ id: 1, x: 500, y: 0, a: 0, m: 600, t: 0, faza: 'stop' }); const x0 = w.me[0].x; gon(w, N, 0.5); if (!(w.me[0] && w.me[0].x > x0 + 5)) return 'циклидиум не тянет мелочь потоком';
  w = mir(20); w.me[0].x = 5000; gon(w, N, 0.1); if (SPISKI && Object.values(SPISKI).some(k => w[k].length && ['parafizo', 'cerko', 'spumelly', 'hlamido', 'ciklidii'].includes(k))) return 'крупные появились без записи движка';
  return ''; };
check('test_krupnye: спумелла хватает лёгкую тебя рывком, тяжёлую нет; хламидомонада не опасна; циклидиум тянет потоком; без записи движка их нет (П40)', sud(K.novye));
check('test_krupnye_samoproverka: спумелла слепая — судья краснеет', sud({ ...K.novye, spumella: { ...K.novye.spumella, chutyo: 0 } }) ? '' : 'судья не заметил');
check('test_krupnye_samoproverka2: хламидомонада-охотник — судья краснеет', sud({ ...K.novye, hlamido: { ...K.novye.spumella, massa: [200, 200] } }) ? '' : 'судья не заметил');
process.exit(bad ? 1 : 0);
