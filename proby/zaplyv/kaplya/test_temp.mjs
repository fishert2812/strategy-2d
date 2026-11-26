// Сторож темпа роста «Капли» (Ш26 kolonia_eda_boy.md; Роман 26.11 21:22: «когда вырастаешь во первых очень быстро»): node proby/zaplyv/kaplya/test_temp.mjs. Провал — код 1.
// Числа: kaplya.json «temp» ложится поверх rost.json только в «Капле» (основной «Заплыв» не меняется). Бот в настоящем мире режима «Эволюция», без хищников:
// медленный (смотрит на еду раз в 1,5 с) получает первый рост на 50–75 с, следующие через 60–100 с; ловкий растёт не чаще раза в 25 с.
// Самопроверка: прежние числа rost.json (рост за секунды) судья ловит.
import fs from 'fs'; import { World } from '../sim.js'; import * as rost from '../rost.js';
const base = JSON.parse(fs.readFileSync(new URL('../data.json', import.meta.url))), KAP = JSON.parse(fs.readFileSync(new URL('./kaplya.json', import.meta.url))), R0 = { ...rost.R };
let bad = 0; const check = (n, e) => { console.log((e ? '  ПРОВАЛ ' : '  ок ') + n + (e ? ': ' + e : '')); if (e) bad++; };
const SAFE = ['amoebas', 'phages', 'bdellos', 'slippers', 'bells', 'rotis', 'pseudos'];
const bot = w => { const c = w.center(); let best = null, bd = 400; for (const f of w.food.filter(f => rost.can(w, f.kind || 'bits'))) { const d = Math.hypot(f.x - c.x, f.y - c.y); if (d < bd) { bd = d; best = f; } }
  return best ? { x: best.x, y: best.y } : { dx: Math.cos(w.dir), dy: Math.sin(w.dir), p: 1 }; };
const play = (seed, sec, lenivy) => { const cfg = JSON.parse(JSON.stringify(base)); cfg.sense_idle = KAP.upravlenie.sense_idle; cfg.sense_pull = KAP.upravlenie.sense_pull;
  const w = new World(cfg, seed); w.mode = 'evo'; w.lose = () => {}; w.dir = seed * 1.3; const lv = []; let cel = null;
  for (let i = 0; i < 30 * sec && w.me.length; i++) { for (const k of SAFE) w[k] = []; if (i % lenivy === 0) cel = bot(w); w.step(1 / 30, cel);
    for (const e of w.events) if (e[0] === 'rost') lv[e[3]] = w.stats.time; w.events.length = 0; if (w.choice.length) w.pick(w.choice[0]); if (i % 300 === 0) w.dir += 0.7; }
  return lv; };
const sud = T => { Object.assign(rost.R, R0, T); const len = [2, 3, 4, 5].map(s => play(s, 330, 45)), lov = [2, 3, 4].map(s => play(s, 240, 1));
  const perv = len.map(l => l[1]), dalee = len.flatMap(l => l.slice(1, 4).map((t, i) => l[i + 2] - t).filter(x => x > 0)), chast = lov.flatMap(l => l.slice(1).map((t, i) => t - (i ? l[i] : 0)).filter(x => x > 0));
  console.log('    медленный, первый рост:', perv.map(t => t ? t.toFixed(0) : 'нет').join(' '), '| следующие через:', dalee.map(x => x.toFixed(0)).join(' '), '| ловкий между ростами:', chast.map(x => x.toFixed(0)).join(' '));
  const sr = a => a.reduce((x, y) => x + y, 0) / a.length;
  if (perv.some(t => !(t > 0))) return 'медленный не дождался первого роста за 5,5 мин'; if (sr(perv) < 50 || sr(perv) > 75) return `медленный ждёт первого роста в среднем ${sr(perv).toFixed(0)} с, рамка 50–75`;
  if (dalee.length && (sr(dalee) < 60 || sr(dalee) > 100)) return `медленный между ростами в среднем ${sr(dalee).toFixed(0)} с, рамка 60–100`;
  if (sr(chast) < 25) return `ловкий растёт в среднем раз в ${sr(chast).toFixed(0)} с — чаще раза в 25 с`; if (chast.some(x => x < 8)) return `ловкий вырос через ${Math.min(...chast).toFixed(0)} с — рывком`; return ''; };
check('test_temp: медленный получает первый рост на 50–75 с, следующие через 60–100 с; ловкий в среднем не чаще раза в 25 с (Роман 21:22)', sud(KAP.temp));
check('test_temp_samoproverka: прежние числа rost.json (рост за секунды) судья ловит', sud({}) ? '' : 'судья не заметил');
process.exit(bad ? 1 : 0);
