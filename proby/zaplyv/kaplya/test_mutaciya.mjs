// Сторож мутации, вируса по стае и закрепления «Капли» (задание kolonia_eda_boy.md 11.6, Ш34, Ш35, Ш37): node proby/zaplyv/kaplya/test_mutaciya.mjs.
// test_kusok_shans (Е.3 п. 8, И27): кусочки съеденного носителя поднимают шанс именно его мутации, до kusok_max; выпала — полоска обнуляется.
// test_mutaciya: мутантов shans ± 2 % из 1000 почкований, метка отрастает за 30 с, потомки наследуют. test_virus_otbor: из 16 с двумя устойчивыми
// после волны живы именно они; ты без замка просыпаешься устойчивой и маленькой; без устойчивых гибнут все. test_zakreplenie: три пути дают умение. Самопроверки краснеют.
import fs from 'fs'; import * as mtc from './mutaciya.js'; import * as sty from './staya.js';
const KAP = JSON.parse(fs.readFileSync(new URL('./kaplya.json', import.meta.url))), M = KAP.mutaciya, DT = 1 / 30;
let bad = 0; const check = (n, e) => { console.log((e ? '  ПРОВАЛ ' : '  ок ') + n + (e ? ': ' + e : '')); if (e) bad++; };
const rnd = s => () => ((s = (s * 16807) % 2147483647) / 2147483647);
const sudMut = M0 => { const r = rnd(11); let n = 0, z = 0; for (let i = 0; i < 1000; i++) { const m = mtc.rodit(null, M0, r); if (m) n++; if (m === 'zamok') z++; } if (Math.abs(n / 1000 - M.shans) > 0.02) return `мутантов ${n / 10} %`;
  if (Math.abs(z / n - 1 / 3) > 0.1) return `замков ${Math.round(z / n * 100)} % мутаций, а по симуляции треть`;
  const w = { staya: [{ x: 0, y: 0, m: 1, mut: 'ship', mt: 0 }], genes: {}, phages: [] }, S = mtc.sozdat(); let t15 = 0; for (let t = 0; t < 31; t += DT) { mtc.shag(S, w, DT, M0); if (Math.abs(t - 15) < DT / 2) t15 = w.staya[0].mt; }
  if (Math.abs(t15 - 15) > 0.1 || w.staya[0].mt !== M0.otrast) return `метка за 15 с ${t15.toFixed(1)}, за 31 с ${w.staya[0].mt}`;
  for (let i = 0; i < 50; i++) if (mtc.rodit('kapsula', M0, r) !== 'kapsula') return 'потомок мутанта без мутации';
  const a = { x: 0, y: 0, a: 0, m: 10 }, w2 = { me: [a], food: [], staya: [{ id: 1, x: -60, y: 0, a: 0, m: 1.5, t: 0, sama: 0, mut: 'obmanka', mt: 30, T: 4 }], ids: 1 }, S2 = sty.sozdat();
  for (let t = 0; t < 8; t += DT) sty.shag(S2, w2, DT, KAP.staya, new Map(), 175, r, M0); const deti = w2.staya.slice(1);
  if (!deti.length || deti.some(q => q.mut !== 'obmanka')) return `дочь мутантки: ${JSON.stringify(deti.map(q => q.mut))}`; return ''; };
check(`test_mutaciya: мутантов ${Math.round(M.shans * 100)} % ± 2 % из 1000 почкований, метка отрастает за ${M.otrast} с, потомки наследуют (Ш34)`, sudMut(M));
check('test_mutaciya_samoproverka: мутацию через раз судья ловит', sudMut({ ...M, shans: 0.5 }) ? '' : 'не заметил');
// Стая 16 клеток вплотную, двое с замком; вирус садится на крайнюю без замка.
function volna(M0, zamki = [5, 10], ty = true) { const st = []; for (let i = 0; i < 16; i++) st.push({ id: i + 1, x: (i % 4) * 28, y: Math.floor(i / 4) * 28, a: 0, m: 1, t: 0, sama: 0, mut: zamki.includes(i) ? 'zamok' : null, mt: 30, skazano: 1 });
  const w = { me: ty ? [{ x: 200, y: 0, a: 0, m: 10 }] : [], staya: st, genes: {}, phages: [{ x: 0, y: 0, host: 'me' }], ids: 99 }, S = mtc.sozdat(), ev = [];
  for (let t = 0; t < 20; t += DT) ev.push(...mtc.shag(S, w, DT, M0)); return { w, S, ev }; }
const sudVirus = M0 => { const { w } = volna(M0), zhivy = w.staya.map(q => q.id).sort().join(); if (zhivy !== '11,6') return `живы ${zhivy || 'никто'}, а должны 6 и 11`;
  w.me = []; const P = mtc.prosnutsya(mtc.sozdat(), w, M0); if (!P || P.mut !== 'zamok' || P.a.m > 2 || !w.genes.lock) return `проснулась ${JSON.stringify(P && { mut: P.mut, m: P.a.m, lock: w.genes.lock })}`;
  const vse = volna(M0, []); if (vse.w.staya.length) return `без устойчивых выжили ${vse.w.staya.length}`; return ''; };
check('test_virus_otbor: из 16 с двумя устойчивыми после волны живы именно они; ты просыпаешься устойчивой и маленькой; без устойчивых гибнут все (Ш35)', sudVirus(M));
check('test_virus_otbor_samoproverka: вирус, убивший устойчивую, судья ловит', sudVirus({ ...M, zamok: 'ship' }) ? '' : 'не заметил');
const sudZakrep = M0 => { const out = [];
  { const a = { x: 0, y: 0, a: 0, m: 10 }, q = { id: 2, x: 30, y: 0, a: 0, m: 1, mut: 'ship', mt: 30 }, w = { me: [a], staya: [q], genes: {}, ids: 2 }, S = mtc.sozdat(); mtc.statEyu(S, w, M0, q);
    if (!w.genes.ship || a.m !== 1 || w.staya.length !== 1 || w.staya[0].m !== 10) out.push(`перешла: ${JSON.stringify({ g: w.genes, m: a.m })}`); }
  { const { w, ev } = volna(M0); if (!w.genes.lock || !ev.some(e => e[0] === 'zakrep' && e[3] === 'vyzhili')) out.push('выжили только мутанты, а замок не закрепился'); }
  { const st = Array.from({ length: 9 }, (_, i) => ({ id: i, x: i * 100, y: 0, m: 1, mut: i < 3 ? 'kapsula' : null, mt: 30, skazano: 1 })), w = { me: [{}], staya: st, genes: {}, phages: [] }, S = mtc.sozdat(); let t19 = false;
    for (let t = 0; t < 21; t += DT) { mtc.shag(S, w, DT, M0); if (t < M0.tret - 0.5 && w.genes.capsule) t19 = true; } if (!w.genes.capsule || t19) out.push(`треть стаи: капсула ${w.genes.capsule ? 'раньше срока' : 'не закрепилась'}`); }
  return out.join('; '); };
check('test_zakreplenie: перешла в мутантку, выжили только мутанты, мутантов четверть стаи 15 с — каждое даёт умение уровня 1 (Ш37)', sudZakrep(M));
check('test_zakreplenie_samoproverka: закрепление за секунду судья ловит', sudZakrep({ ...M, tret: 0.5 }) ? '' : 'не заметил');
// 12.5: волна на 9 клеток, у четырёх замок; по вирусу на каждую клетку
const sudZamok = M0 => { const st = []; for (let i = 0; i < 9; i++) st.push({ id: i + 1, x: (i % 3) * 28, y: Math.floor(i / 3) * 28, a: 0, m: 1, mut: [0, 2, 6, 8].includes(i) ? 'zamok' : null, mt: 30, skazano: 1 });
  const w = { me: [], staya: st, genes: {}, phages: st.map(q => ({ x: q.x + 5, y: q.y, vx: 0, vy: 0, host: 'me' })), ids: 99 }, S = mtc.sozdat(), ots = new Set(); let spas = null;
  for (let t = 0; t < 12; t += DT) for (const e of mtc.shag(S, w, DT, M0)) { if (e[0] === 'otskok') ots.add(e[1].id); if (e[0] === 'spas') spas = e; }
  if (ots.size !== 4) return `отскоки у ${ots.size} клеток из 4 с замком`; if (!spas || spas[1] !== 4 || spas[2] !== 9) return `строка ${JSON.stringify(spas)}, а нужна «спас 4 из 9»`;
  if (w.staya.length !== 4) return `после волны живы ${w.staya.length}`; return ''; };
check('test_zamok_vidno: в волне из 9 клеток с 4 замками от всех четырёх вирус отскакивает, строка «Замок спас 4 из 9» совпадает с миром (12.5)', sudZamok(M));
check('test_zamok_vidno_samoproverka: замок без отскока судья ловит', sudZamok({ ...M, zamok: 'ship' }) ? '' : 'не заметил');
// Е.3 п. 8, Е.6 test_kusok_shans: десять съеденных кокков (по n точек) — полоска капсулы на kusok_max; 2000 делений с полной полоской дают капсулу не реже kusok_max.
const sudKusok = (rod = mtc.rodit) => { const S = mtc.sozdat(), r = rnd(5);
  const tochki = k => Array.from({ length: 8 }, () => ({ ot: k, n: 8 }));
  for (const f of tochki('ameba3')) if (mtc.kusok(S, M, f)) return 'кусочек от того, кто гена не несёт';
  const odin = tochki('kokk'); for (const f of odin) mtc.kusok(S, M, f); for (const f of odin) mtc.kusok(S, M, f); /* та же точка дважды не считается */
  if (Math.abs((S.kus.kapsula || 0) - M.kusok) > 1e-9) return `один кокк дал ${(S.kus.kapsula || 0).toFixed(3)}, а не ${M.kusok}`;
  for (let i = 0; i < 9; i++) for (const f of tochki('kokk')) mtc.kusok(S, M, f); if (Math.abs(S.kus.kapsula - M.kusok_max) > 1e-9) return `десять кокков: ${S.kus.kapsula.toFixed(3)}, потолок ${M.kusok_max}`;
  let kap = 0, bez = 0; const N = 2000; for (let i = 0; i < N; i++) { const kus = { kapsula: M.kusok_max }; if (rod(null, M, r, kus) === 'kapsula') { kap++; if (kus.kapsula !== 0) return 'выпала, а полоска не обнулилась'; } if (rod(null, M, r) === 'kapsula') bez++; }
  if (kap / N < M.kusok_max) return `с полной полоской капсула в ${(kap / N * 100).toFixed(1)} % делений, а не меньше ${M.kusok_max * 100} %`;
  if (bez / N > M.shans) return `без кусочков капсула в ${(bez / N * 100).toFixed(1)} %`; return ''; };
check(`test_kusok_shans: кокк даёт +${M.kusok} к капсуле, десять — потолок ${M.kusok_max}; с полной полоской капсула не реже ${M.kusok_max * 100} % делений, выпала — полоска на нуль (И27)`, sudKusok());
check('test_kusok_shans_samoproverka: кусочки, что не влияют на деление, судья ловит', sudKusok((m, M0, r) => mtc.rodit(m, M0, r)) ? '' : 'не заметил');
// Е.3 п. 13: погибла от вируса — просыпаешься самой крупной копией с замком, а не самой крупной; от другого — самой крупной.
{ const mk = () => ({ me: [], ids: 9, genes: {}, staya: [{ id: 1, x: 0, y: 0, a: 0, m: 0.9, mut: null }, { id: 2, x: 5, y: 0, a: 0, m: 0.5, mut: M.zamok }] }), w1 = mk(), w2 = mk();
  const v = mtc.prosnutsya(mtc.sozdat(), w1, M, true), d = mtc.prosnutsya(mtc.sozdat(), w2, M, false);
  check('test_virus_probuzhdenie: от вируса просыпаешься копией с замком (0,5), от другого — самой крупной (0,9) (Е.3 п. 13)', v && v.a.m === 0.5 && v.zamok && d && d.a.m === 0.9 && !d.zamok ? '' : JSON.stringify({ v: v && v.a.m, d: d && d.a.m })); }
process.exit(bad ? 1 : 0);
