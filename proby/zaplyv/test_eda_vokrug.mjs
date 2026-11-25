// Еда вокруг колонии (vokrug.js) без экрана: node proby/zaplyv/test_eda_vokrug.mjs. Провал — код 1.
// Отдельно от test.mjs: колония из десяти клеток считается долго, а у шага 50_zaplyv свой предел времени.
import { World } from './sim.js';
import { readFileSync } from 'node:fs';
const cfg = JSON.parse(readFileSync(new URL('./data.json', import.meta.url)));
let bad = 0;
const check = (name, fn) => {
  try { const r = fn(); if (r) { bad++; console.log('  ПРОВАЛ', name + ':', r); } else console.log('  ок   ', name); }
  catch (e) { bad++; console.log('  ПРОВАЛ', name + ':', e.stack); }
};
check('test_L052 (Роман 25.11, Заплыв 0.78, 7:15, клеток 10: «плаваю уже минут 5 нет еды вообще… Опять у нас нет еды? Еда на каждом шагу должна быть»): еда на экране не кончается ни у растущей колонии, ни у стоящей', () => {
  const V = cfg.eda_vokrug, R = 200, row = [], bad = [];
  for (const seed of [1, 2, 3, 4]) {
    const w = new World(cfg, seed); let dir = 0, gap = 0, worst = 0, acc = 0, n = 0, aim = null; const mins = [];
    for (let t = 0; t < 360 && w.me.length; t += 1 / 30) { // бот видит только экран: к крошке на экране, иначе прямо, изредка поворачивая
      const f6 = (t * 30 | 0) % 6 === 0, c = w.center(); // смотрит на экран 5 раз в секунду
      if (f6) { let bd = R; aim = null; let k = 0; for (const f of w.food) { const d = Math.hypot(f.x - c.x, f.y - c.y); if (d < R) k++; if (d < bd) { bd = d; aim = f; } }
        if (!aim && (t * 30 | 0) % 300 === 0) dir += 1.3;
        gap = k ? 0 : gap + 0.2; worst = Math.max(worst, gap); acc += k; n++; if (n === 300) { mins.push(acc / n); acc = n = 0; } }
      w.step(1 / 30, aim && !aim.gone && w.food.includes(aim) ? { x: aim.x, y: aim.y } : { x: c.x + Math.cos(dir) * 300, y: c.y + Math.sin(dir) * 300 }); w.events.length = 0; if (w.choice.length) w.pick(w.choice[0]);
    }
    const still = w.me.length; for (let t = 0; t < 60 && w.me.length; t += 1 / 30) { w.step(1 / 30, null); w.events.length = 0; if (w.choice.length) w.pick(w.choice[0]); } // палец убран минуту: колония стоит
    const c = w.center(); let k = 0; for (const f of w.food) if (Math.hypot(f.x - c.x, f.y - c.y) < R) k++;
    row.push(`${seed}: ${mins.map(m => m.toFixed(0)).join('/')} клеток ${still}, стоя ${k}, без еды ${worst.toFixed(0)} с`);
    if (mins.slice(1).some(m => m < V.baza * 0.8)) bad.push(`мир ${seed}: в минуту на экране меньше ${V.baza * 0.8} крошек (${mins.map(m => m.toFixed(1)).join(' ')})`);
    if (worst > 5) bad.push(`мир ${seed}: ${worst.toFixed(0)} с на экране ни крошки`);
    if (w.me.length && k < V.baza * 0.5) bad.push(`мир ${seed}: колония простояла минуту — на экране ${k} крошек`);
  }
  console.log('    паспорт: еды на экране по минутам (6 мин), клеток, после минуты стоя, дольше всего без еды —', row.join(' | '));
  return bad.join('; ');
});

console.log(bad ? `ЕДА ВОКРУГ: провалов ${bad}` : 'ЕДА ВОКРУГ: все проверки прошли');
process.exit(bad ? 1 : 0);
