// Сторож одной таблицы боя «Капли» (pravki_po_blokam.md Д.6, Д.10 п. 4): node proby/zaplyv/kaplya/test_boj_tablica.mjs.
// test_boj_odna_tablica: каждый житель капли (kaplya.json «zhiteli») — строка в boj.celi или назван в boj.ne_celi с причиной; числа ручного мира,
// что решают бой (boj.v_mir: толчок и щипок кокка, укол соперницы), берутся из строк celi и мир их слушается; код «Капли» не читает их мимо таблицы.
import fs from 'fs'; import { World } from '../sim.js'; import * as mut from '../mutacii.js'; import * as zh from './zhiteli.js'; import * as boj from './boj.js';
const base = JSON.parse(fs.readFileSync(new URL('../data.json', import.meta.url))), KAP = JSON.parse(fs.readFileSync(new URL('./kaplya.json', import.meta.url))), DT = 1 / 30;
let bad = 0; const check = (n, e) => { console.log((e ? '  ПРОВАЛ ' : '  ок ') + n + (e ? ': ' + e : '')); if (e) bad++; };
const bezStroki = (K, B) => { const est = new Set(Object.entries(B.celi).filter(([k]) => k !== '_').map(([, C]) => C.spisok));
  return Object.keys(K.zhiteli).filter(k => k !== '_' && !est.has(k) && !(B.ne_celi || {})[k]); };
const sudZhiteli = B => { const L = bezStroki(KAP, B); return L.length ? `нет строки в boj.celi: ${L.join(', ')}` : ''; };
check('test_boj_odna_tablica: каждый житель капли — строка в boj.celi (или назван в ne_celi с причиной)', sudZhiteli(KAP.boj));
const sudOtvet = B => { const L = Object.entries(B.celi).filter(([k, C]) => k !== '_' && !['beg', 'napad', 'szhat', 'net'].includes(C.otvet)).map(([k]) => k); return L.length ? `нет ответа раненого (otvet): ${L.join(', ')}` : ''; };
check('test_boj_otvet: у каждой строки celi есть ответ раненого (бежит, нападает, сжимается, не живой)', sudOtvet(KAP.boj));
check('test_boj_otvet_samoproverka: строку без ответа судья ловит', sudOtvet({ ...KAP.boj, celi: { ...KAP.boj.celi, kokk: { ...KAP.boj.celi.kokk, otvet: undefined } } }) ? '' : 'не заметил');
const B1 = JSON.parse(JSON.stringify(KAP.boj)); delete B1.celi.bodo; check('test_boj_odna_tablica_samoproverka_stroka: жителя без строки судья ловит', sudZhiteli(B1) ? '' : 'не заметил');
// Мир слушается таблицы: кокк, в которого упёрлась клетка, отъезжает на tolchok; с tolchok 0 стоит.
function sdvig(B) { const cfg = boj.v_mir(JSON.parse(JSON.stringify(base)), B); mut.addGenes(cfg); const w = new World(cfg, 5); w.mode = 'evo'; zh.nachalo(w); w.step(DT, null); w.lose = () => {};
  for (const k of ['pseudos', 'donors', 'bdellos', 'prey', 'amoebas', 'phages', 'bells', 'rotis', 'slippers', ...Object.values(zh.SPISKI), 'food', 'crumbs', 'plants', 'slime']) w[k] = [];
  const a = w.me[0]; a.m = 1; const q = { id: 9999, x: a.x + 14, y: a.y, a: 0, m: 1, vx: 0, vy: 0 }, x0 = q.x - a.x; w.prey.push(q);
  for (let t = 0; t < 0.5; t += DT) { a.vx = a.vy = 0; w.step(DT, null); } return Math.hypot(q.x - a.x, q.y - a.y) - x0; }
const sudMir = B => { const v = boj.v_mir({}, B); for (const [imya, put] of Object.entries(B.v_mir)) if (imya !== '_' && v[imya] !== boj.izTablicy(B, put)) return `${imya} не из таблицы`;
  const B1 = JSON.parse(JSON.stringify(B)); if (!B1.celi.kokk.tolchok) B1.celi.kokk.tolchok = B1.celi.kokk.tolchok_staryj || 6; /* L075: в игре кокк стоит (tolchok 0) — слушается ли мир, меряем на старом толчке */ const s = sdvig(B1), B0 = JSON.parse(JSON.stringify(B)); B0.celi.kokk.tolchok = 0; const s0 = sdvig(B0); return s > s0 + 3 ? '' : `кокк отъехал на ${s.toFixed(1)}, с толчком 0 — на ${s0.toFixed(1)}`; };
check(`test_boj_odna_tablica_mir: толчок кокка ${KAP.boj.celi.kokk.tolchok || KAP.boj.celi.kokk.tolchok_staryj} и щипок ${KAP.boj.celi.kokk.shchipok_t} с — из boj.celi, мир их слушается`, sudMir(KAP.boj));
// Код «Капли» не читает эти числа из data.json мимо таблицы (cfg.prey_push, world.cfg.pinch_t…).
const imena = Object.keys(KAP.boj.v_mir).filter(k => k !== '_'), mimo = new RegExp(`\\bcfg\\.(${imena.join('|')})\\b`);
const sudKod = faily => faily.filter(([, s]) => mimo.test(s)).map(([f]) => f);
const dir = new URL('./', import.meta.url), F = fs.readdirSync(dir).filter(f => f.endsWith('.js')).map(f => [f, fs.readFileSync(new URL(f, dir), 'utf8')]);
const L = sudKod(F); check('test_boj_odna_tablica_kod: kaplya/*.js не читают числа боя из data.json мимо boj', L.length ? `читают мимо: ${L.join(', ')}` : '');
check('test_boj_odna_tablica_samoproverka_kod: число боя мимо таблицы судья ловит', sudKod([['boj.js', F.find(([f]) => f === 'boj.js')[1] + '\nconst k = w.cfg.pinch_t;']]).length ? '' : 'не заметил');
process.exit(bad ? 1 : 0);
