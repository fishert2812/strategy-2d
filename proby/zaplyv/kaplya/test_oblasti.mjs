// Сторож областей «Капли» (книга П29–П31, П33): node proby/zaplyv/kaplya/test_oblasti.mjs. Провал — код 1. Числа — из kaplya.json и data.json.
import fs from 'fs'; import { sozdat, shag } from './oblasti.js';
const K = JSON.parse(fs.readFileSync(new URL('./kaplya.json', import.meta.url))).oblasti, P = JSON.parse(fs.readFileSync(new URL('../data.json', import.meta.url))).pond;
let bad = 0; const check = (n, e) => { console.log((e ? '  ПРОВАЛ ' : '  ок ') + n + (e ? ': ' + e : '')); if (e) bad++; };
const mir = d => ({ cfg: { pond: P }, depth: y => y, me: [{ y: d, m: 10 }], plants: [{ t: 0.9 }], stats: { time: 0 } });
// прибавка 1 за шаг: на свету вся, без кислорода половина
const rost = d => { const w = mir(d), a = w.me[0], m0 = new Map([[a, 10]]); a.m = 11; shag(sozdat(), w, 0, K, m0, 1); return a.m - 10; };
check('test_oblasti_kislorod: ниже границы кислорода рост вдвое медленнее (П29)', rost(0.3) === 1 && Math.abs(rost(P.oxy + 0.05) - 0.5) < 1e-9 ? '' : `${rost(0.3)} и ${rost(P.oxy + 0.05)}`);
const hud = d => { const w = mir(d); shag(sozdat(), w, 1, K, new Map(), 1); return 10 - w.me[0].m; };
check('test_oblasti_hudeet: у плёнки и в сероводороде худеешь, в толще нет (П30, П31)', hud(0.01) > 0 && hud(0.99) > hud(0.9) && hud(0.9) > 0 && hud(0.3) === 0 ? '' : [0.01, 0.9, 0.99, 0.3].map(hud).join());
// тень: в главе 1 нет; в главе 2 первая через pervaya с, длится dlitsya с, сахара в тени нет
const ten = (glava, t) => { const w = mir(0.3), S = sozdat(); shag(S, w, 0, K, new Map(), glava); w.stats.time = t; const sk = shag(S, w, 0, K, new Map(), glava); return { ten: S.ten, sahar: w.plants[0].t > 0, sk }; };
const a = ten(1, K.ten.pervaya + 5), b = ten(2, K.ten.pervaya + 5), c = ten(2, K.ten.pervaya + K.ten.dlitsya + 5), e = ten(2, 10);
check('test_oblasti_ten: тень с главы 2 по расписанию, в тени сахара нет (П33)', !a.ten && b.ten && !b.sahar && b.sk.includes(K.slova.ten) && !c.ten && !e.ten ? '' : JSON.stringify({ a, b, c, e }));
check('test_oblasti_samoproverka: судья роста краснеет, если без кислорода расти как на свету', Math.abs(rost(0.3) - 0.5) < 1e-9 ? 'судья не отличает' : '');
process.exit(bad ? 1 : 0);
