// Сторож навыков «Капли» (Роман 26.11 23:03: «Навки почти ничего не дают либо не работают»; 23:17 «Навки сверь! И допиши - доделай»): node proby/zaplyv/kaplya/test_navyki.mjs.
// Судья на настоящем мире (sim.js, evo.js, mutacii.js, boj.js): взятое оружие приходит снова следующим уровнем (П63); прежние гены не приходят отдельно (П65);
// «Шип» оглушает: цель стоит (П65 «Гарпун»); «Голубая еда» в «Капле» кормит; спасшее умение говорит о себе строкой (П11).
// Самопроверки: без настройки навыков уровень не приходит; шип без оглушения, капля без голубой еды и пустой счёт строк судья ловит.
import fs from 'fs'; import { World, radius } from '../sim.js'; import * as mut from '../mutacii.js'; import * as evo from '../evo.js'; import * as zh from './zhiteli.js'; import * as boj from './boj.js'; import * as nv from './navyki.js';
const base = JSON.parse(fs.readFileSync(new URL('../data.json', import.meta.url))), KAP = JSON.parse(fs.readFileSync(new URL('./kaplya.json', import.meta.url))), DT = 1 / 30;
let bad = 0; const check = (n, e) => { console.log((e ? '  ПРОВАЛ ' : '  ок ') + n + (e ? ': ' + e : '')); if (e) bad++; };
const mir = (N = KAP.navyki) => { const cfg = JSON.parse(JSON.stringify(base)); mut.addGenes(cfg); const w = new World(cfg, 9); w.mode = 'evo'; if (N) nv.nastroit(w, mut, N); zh.nachalo(w); w.step(DT, null); w.lose = () => {}; for (const g of KAP.boj.novye_geny) if (!evo.E.svoi.includes(g)) evo.E.svoi.push(g); return w; };
const urovni = N => { const w = mir(N); w.pick('ship'); if (!evo.pool(w).includes('ship')) return 'взятый «Шип» больше не приходит карточкой'; w.pick('ship'); w.pick('ship');
  if (mut.lvl(w, 'ship') !== 3) return `уровень «Шипа» ${mut.lvl(w, 'ship')} после трёх карточек`; if (evo.pool(w).includes('ship')) return '«Шип» 3 предлагается снова';
  const dubl = ['lock', 'crispr', 'flagellum', 'steady'].filter(g => evo.pool(w).includes(g)); return dubl.length ? 'отдельно предлагаются ступени других умений: ' + dubl.join(', ') : ''; };
check('test_navyki_urovni: «Шип» приходит уровнями до 3, Замок/CRISPR/слизь/ровный ход только ступенями (П63, П65)', urovni(KAP.navyki));
check('test_navyki_urovni_samoproverka: без настройки навыков судья ловит', urovni(null) ? '' : 'судья не заметил');
const oglush = B => { const w = mir(); w.me = [w.me[0]]; const a = w.me[0]; a.m = 1.5; w.genes.ship = true; boj.ohrana(w, B);
  const q = { strain: true, x: a.x + radius(1.5) + 12, y: a.y, vx: 0, vy: 0, a: 0, t: 1, rest: 0, cool: 0, m: 6, id: 999 }; let stoit = 0;
  for (let t = 0; t < 3; t += DT) { for (const k of ['pseudos', 'donors', 'bdellos', 'prey', 'amoebas', 'phages', 'bells', 'rotis', 'slippers', ...Object.values(zh.SPISKI)]) w[k] = k === 'pseudos' ? [q] : [];
    a.a = Math.atan2(q.y - a.y, q.x - a.x); const R = radius(a.m), d = Math.hypot(q.x - a.x, q.y - a.y) || 1; if (d > R + 8) { a.x = q.x - (q.x - a.x) / d * (R + 6); a.y = q.y - (q.y - a.y) / d * (R + 6); } a.vx = a.vy = 0;
    const x0 = q.x, y0 = q.y, S = boj.do_hoda(w, B); w.step(DT, null); boj.posle_hoda(w, DT, B, radius, S); w.events.length = 0; if (q.oglush > w.stats.time && Math.hypot(q.x - x0, q.y - y0) < 1e-6) stoit += DT; }
  return stoit >= 0.5 ? '' : `оглушённая крупная стоит только ${stoit.toFixed(2)} с из 3`; };
check('test_navyki_oglush: «Шип» оглушает, цель стоит (книга П65 «Гарпун»)', oglush(KAP.boj));
check('test_navyki_oglush_samoproverka: шип без оглушения судья ловит', oglush({ ...KAP.boj, oruzhie: { ...KAP.boj.oruzhie, ship: { ...KAP.boj.oruzhie.ship, oglush: 0 } } }) ? '' : 'судья не заметил');
const golubaya = N => { const w = mir(N); w.me = [w.me[0]]; w.genes.citrate = true; let n = 0; for (let t = 0; t < 20 && !n; t += DT) { const a = w.me[0], q = (w.cit || []).find(c => !c.gone); if (q) { a.x = q.x; a.y = q.y; } w.step(DT, null); n = w.stats.citrate || 0; }
  return n ? '' : 'за 20 с ни одной голубой точки не съедено'; };
check('test_navyki_golubaya: ген «Ест голубую еду» в «Капле» кормит голубыми точками', golubaya(KAP.navyki));
check('test_navyki_golubaya_samoproverka: капля без голубой еды судья ловит', golubaya(null) ? '' : 'судья не заметил');
const slova = N => { const w = mir(); w.genes.shield = true; const S = nv.sozdat(), skazano = []; w.events.push(['shrug', 0, 0]); nv.shag(S, w, N, (t, ms, g) => skazano.push(g)); w.genes.shield = false; w.events.push(['spore', 0, 0]); nv.shag(S, w, N, (t, ms, g) => skazano.push(g));
  return skazano.length !== 1 || skazano[0] !== 'shield' ? 'строки: ' + JSON.stringify(skazano) : ''; };
check('test_navyki_slova: «Щит» отбил вирус — строка с его именем; умения нет — строки нет (П11)', slova(KAP.navyki));
check('test_navyki_slova_samoproverka: строки выключены — судья ловит', slova({ ...KAP.navyki, raz: 0 }) ? '' : 'судья не заметил');
const teksty = () => { const G = JSON.parse(fs.readFileSync(new URL('../kniga/teksty_genov.json', import.meta.url))).geny, T = { ...G }; for (const [k, v] of Object.entries(KAP.navyki.teksty)) if (k !== '_') T[k] = { ...T[k], ...v };
  const net = ['gvpA', 'snap', 'citT'].filter(k => !/еды|пасти|драться/.test(T[k]?.daet || '')); return net.length ? 'карточка не говорит пользу: ' + net.join(', ') : ''; };
check('test_navyki_teksty: карточки «Всплывает», «Разворот», «Голубая еда» говорят, зачем они игроку (Роман 22:20)', teksty());
process.exit(bad ? 1 : 0);
