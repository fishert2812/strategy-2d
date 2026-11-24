// Обход интерфейса «Заплыва» пальцем (урок L017): телефон iPhone 13 с касаниями, каждую кнопку касаемся
// так, как палец на iPhone (touchscreen.tap по середине), и требуем видимый результат.
// Кнопка, которую перекрыл другой слой, или касание без видимого отклика — провал.
// node tools/web/zaplyv_tap.mjs <адрес /zaplyv/> [chromium|webkit]
const pwPath = process.env.PW || 'playwright';
const pw = await import(pwPath).then(m => m.default || m);
const url = process.argv[2], kind = process.argv[3] || 'chromium';
const opts = process.env.CHROME ? { executablePath: process.env.CHROME, args: ['--no-sandbox'] } : {};
const b = await pw[kind].launch(opts);
const p = await (await b.newContext({ ...pw.devices['iPhone 13'] })).newPage();
await p.addInitScript(() => { if (!localStorage.getItem('zaplyv.met')) localStorage.setItem('zaplyv.met', JSON.stringify(['me', 'phage', 'amoeba', 'plant'])); }); // Альманах: есть что листать
const errs = []; p.on('pageerror', e => errs.push(e.message));
let bad = 0; const say = (ok, t) => { console.log((ok ? '  ок   ' : '  ПРОВАЛ ') + t); if (!ok) bad++; };
await p.goto(url, { timeout: 60000 });
await p.waitForFunction(() => window.zaplyvProbe && zaplyvProbe.frames > 20, null, { timeout: 30000 });
// Касание пальцем: элемент должен быть виден, не меньше 44 pt и сверху в точке касания.
async function tap(sel, what) {
  const el = p.locator(sel).first(); await el.scrollIntoViewIfNeeded({ timeout: 2000 }).catch(() => {}); // длинный экран палец прокручивает
  const box = await el.boundingBox().catch(() => null);
  if (!box || box.width < 1) return say(false, `${what}: кнопки ${sel} не видно`), false;
  const top = await p.evaluate(([s, x, y]) => { const e = document.querySelector(s), h = document.elementFromPoint(x, y); return !!h && (h === e || e.contains(h)) || (h ? (h.id || h.tagName) + " " + h.textContent.slice(0, 20) : "пусто"); }, [sel, box.x + box.width / 2, box.y + box.height / 2]);
  if (top !== true) return say(false, `${what}: в точке касания ${sel} лежит другой слой (${top})`), false;
  if (Math.min(box.width, box.height) < 43.5) return say(false, `${what}: зона касания ${Math.round(box.width)}×${Math.round(box.height)} меньше 44`), false;
  await p.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2); await p.waitForTimeout(250);
  return true;
}
const seen = sel => p.evaluate(s => { const e = document.querySelector(s); if (!e) return false; const r = e.getBoundingClientRect(), st = getComputedStyle(e);
  return r.width > 0 && r.bottom > 0 && r.top < innerHeight && +st.opacity > 0.5 && st.visibility !== 'hidden' && st.display !== 'none'; }, sel);
const marks = () => p.evaluate(() => JSON.parse(localStorage.getItem('zaplyv.marks') || '[]').length);
const on = id => p.evaluate(i => document.getElementById(i).classList.contains('on'), id);

let m = await marks();
if (await tap('#flag', 'флажок в игре')) say(await seen('#note') && await marks() === m + 1, 'флажок в игре: отметка записана и надпись видна');
if (await tap('#pause', 'пауза')) say(await on('genome'), 'пауза открывает геном');
if (await tap('#ring .slot', 'ген на кольце')) say(await p.evaluate(() => !!document.querySelector('#gcard h2')), 'касание гена открывает карточку');
m = await marks();
if (await tap('#gflag', 'флажок в геноме')) say(await seen('#note') && await marks() === m + 1, 'флажок в геноме: отметка и надпись видна');
m = await marks();
if (await tap('#gno', '«Не так» в геноме')) say(await seen('#note') && await marks() === m + 1, '«Не так» в геноме: отметка и надпись видна');
if (await tap('#gcab', 'Альманах из генома')) say(await on('cabinet'), 'Альманах открылся');
// test_L019: у каждой карточки полки — снимок живой модели (картинка не пустая), разделы и карточка отвечают пальцу
await p.waitForTimeout(1500);
say(await p.evaluate(() => [...document.querySelectorAll('#shelf .kc img')].every(i => i.naturalWidth > 100 && i.src.length > 5000)), 'test_L019: у каждой записи Альманаха — снимок модели из игры');
if (await tap('#kpills button:nth-child(2)', 'раздел «Еда»')) say(await p.evaluate(() => document.querySelectorAll('#shelf .kc').length > 0 && document.querySelector('#kpills .on').dataset.g === 'food'), 'раздел «Еда» открылся');
if (await tap('#kpills button:nth-child(1)', 'раздел «Обитатели»')) say(await p.evaluate(() => !!document.querySelector('#shelf .kc[data-k=me]')), 'раздел «Обитатели» открылся');
if (await tap('#shelf .kc[data-k=me]', 'карточка «Ты»')) say(await seen('#kcard') && await p.evaluate(() => document.querySelectorAll('#kblocks .kb').length >= 2 && document.getElementById('kimg').naturalWidth > 100), 'карточка открылась: модель и блоки текста');
if (await tap('#knext', 'следующая карточка')) say(await p.evaluate(() => document.getElementById('kname').textContent !== 'Ты, кишечная палочка'), 'листается к следующей');
if (await tap('#kback', 'назад к полке')) say(await seen('#kshelf'), 'полка снова видна');
if (await tap('#back', 'назад из Альманаха')) say(!(await on('cabinet')) && await on('genome'), 'Альманах закрылся, геном на месте');
// «Отправить» в геноме: меню «Поделиться» телефона подменяем, отметки должны уйти одним сообщением.
await p.evaluate(() => { navigator.share = async d => { window.shared = d.text; }; });
m = await marks();
if (await tap('#gsend', '«Отправить» в геноме')) say(await p.evaluate(n => (window.shared || '').includes('отметок ' + n), m) && await marks() === 0, '«Отправить» отдаёт отметки и очищает их');
const t0 = await p.evaluate(() => zaplyvWorld().stats.time);
if (await tap('#gon', '«Плыть дальше»')) { await p.waitForTimeout(500); say(!(await on('genome')) && await p.evaluate(() => zaplyvWorld().stats.time) > t0, '«Плыть дальше» закрывает геном, мир идёт'); }
// Выбор дочки при делении: касание самой дочки берёт её ген.
await p.evaluate(() => { const w = zaplyvWorld(), all = Object.keys(w.cfg.genes).filter(g => !w.genes[g]); w.choice = all.slice(0, 2); });
await p.waitForTimeout(600);
const g1 = await p.evaluate(() => zaplyvWorld().choice[1]);
if (await tap('#genes .kid ~ .kid', 'дочка справа')) say(await p.evaluate(g => zaplyvWorld().genes[g] && !document.getElementById('genes').classList.contains('on'), g1), 'касание дочки даёт её ген и закрывает выбор');
await p.evaluate(() => { const w = zaplyvWorld(), all = Object.keys(w.cfg.genes).filter(g => !w.genes[g]); w.choice = all.slice(0, 2); });
await p.waitForTimeout(600);
const g0 = await p.evaluate(() => zaplyvWorld().choice[0]);
if (await tap('#cards button', 'карточка гена дочки')) say(await p.evaluate(g => zaplyvWorld().genes[g], g0), 'карточка дочки даёт её ген');
await p.evaluate(() => { const w = zaplyvWorld(); w.genes.spore = false; w.stats.killer = 'amoeba'; w.me.length = 0; });
await p.waitForTimeout(1200);
m = await marks();
if (await tap('#eno', '«Не так» на экране гибели')) say(await seen('#note') && await marks() === m + 1, '«Не так» на экране гибели: отметка и надпись видна');
// «Ночь рода» (спецификация design/zaplyv_noch_roda_spec.md): каждая кнопка ночи отвечает пальцу.
if (await tap('#nightgo', '«Ночь рода»')) say(await on('night') && await seen('#ndanger'), '«Ночь рода» открывает выбор опасности');
m = await marks();
if (await tap('#nflag', '«Не так» в ночи рода')) say(await seen('#note') && await marks() === m + 1, '«Не так» в ночи рода: отметка записана');
if (await tap('#nback', '«Назад» из ночи')) say(!(await on('night')) && await on('end'), '«Назад» возвращает на экран гибели');
if (await tap('#nightgo', '«Ночь рода» снова') && await tap('#ndanger [data-d=phage]', 'опасность «Фаги»')) {
  await p.waitForTimeout(600); say(await p.evaluate(() => zaplyvNight() && zaplyvNight().gen > 0), 'после выбора опасности поколения идут');
  await p.evaluate(() => zaplyvNight().run()); await p.waitForTimeout(500);
  if (await tap('#npicks button', 'ветка «выше всех»')) {
    const g = await p.evaluate(() => zaplyvNight().res.picks[0].genes);
    if (await tap('#ngo', '«Плыть этой веткой»')) { await p.waitForTimeout(300); say(await p.evaluate(g => !document.getElementById('night').classList.contains('on') && g.every(k => zaplyvWorld().genes[k]), g), '«Плыть этой веткой» начинает заплыв с генами ветки: ' + g); }
  }
  await p.evaluate(() => { const w = zaplyvWorld(); w.me.length = 0; }); await p.waitForTimeout(1200);
}
if (await tap('#again', '«Плыть снова»')) say(!(await on('end')), '«Плыть снова» начинает заплыв');
say(!errs.length, 'ошибок страницы нет' + (errs.length ? ': ' + errs.join('; ') : ''));
await b.close();
console.log(bad ? `КАСАНИЯ: провалов ${bad}` : 'КАСАНИЯ: все кнопки отвечают пальцу');
process.exit(bad ? 1 : 0);
