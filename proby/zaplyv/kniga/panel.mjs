// Проверка панели книги: у карточки с номером есть кнопка замечания, замечание переживает перезагрузку,
// а письмо «Отправить» несёт каждое замечание с номером пункта и уходит только текстом (без файлов).
// node proby/zaplyv/kniga/panel.mjs <адрес книги> [--selftest] ; PW — путь к playwright, CHROME — свой браузер, BROWSER=webkit — в WebKit.
const pw = await import(process.env.PW || 'playwright').then(m => m.default || m);
const url = process.argv[2], self = process.argv.includes('--selftest'), eng = process.env.BROWSER || 'chromium';
const b = await pw[eng].launch(process.env.CHROME && eng === 'chromium' ? { executablePath: process.env.CHROME, args: ['--no-sandbox'] } : {});
const ctx = await b.newContext({ ...pw.devices['iPhone 13'] }), p = await ctx.newPage();
if (self) await ctx.route('**/panel.js', r => r.abort()); // нарочно сломано: панель не загрузилась, проверка обязана покраснеть
await p.addInitScript(() => { navigator.share = async d => { window.__share = d; }; });
const bad = []; const need = (ok, m) => { if (!ok) bad.push(m); };
try {
  await p.goto(url + '#geny'); await p.waitForSelector('#page .card');
  await p.waitForSelector('.zm-b', { timeout: 4000 });
  const [btn, cards] = await p.evaluate(() => [document.querySelectorAll('.zm-b').length, [...document.querySelectorAll('#page .card')].filter(c => c.dataset.id || c.querySelector(':scope > .t > .code')).length]);
  need(btn > 0 && btn === cards, `кнопок ${btn}, карточек с номером ${cards}`);
  const id = await p.evaluate(() => document.querySelector('.zm-b').closest('.card').querySelector('.code').textContent);
  await p.locator('.zm-b').first().tap(); await p.fill('#zm-t', 'Первое замечание: не видно на клетке'); await p.tap('#zm-ok');
  await p.goto(url + '#ekrany'); await p.reload(); await p.waitForSelector('.zm-b');
  await p.tap('#zm-page'); await p.fill('#zm-t', 'Второе: про всю страницу'); await p.tap('#zm-ok');
  await p.goto(url + '#resheniya'); await p.reload(); await p.waitForSelector('.resh .zm-b');
  need((await p.textContent('#zm-send')).includes('2'), 'после перезагрузки в копилке не 2: ' + await p.textContent('#zm-send'));
  await p.tap('#zm-send'); const text = await p.inputValue('#zm-t');
  need(text.includes('[' + id + ' ·') && text.includes('Первое замечание: не видно на клетке'), 'в письме нет замечания к ' + id);
  need(text.includes('[вкладка «Экраны»] Второе: про всю страницу'), 'в письме нет замечания к странице');
  await p.tap('#zm-sh'); const sh = await p.evaluate(() => window.__share);
  need(sh && sh.text === text && !sh.files, '«Поделиться» отдаёт не тот текст или прикладывает файл');
  await p.tap('#zm-done'); need((await p.textContent('#zm-send')) === 'Замечаний нет', 'копилка не опустела после «Отправил»');
  await p.goto(url + '#geny'); await p.reload(); await p.waitForSelector('.zm-n.otpr', { timeout: 4000 }).catch(() => need(false, 'отправленное замечание не видно у пункта'));
  const [sw, cw] = await p.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth]); need(sw <= cw, `страница шире экрана: ${sw} при ${cw}`);
  if (!bad.length) console.log(`  ПАСПОРТ панели (${eng}, iPhone 13): кнопок на «Генах» ${btn}, замечаний в письме 2, знаков ${text.length}, файлов 0`);
} catch (e) { bad.push('панель не отвечает: ' + e.message.split('\n')[0]); }
for (const m of bad) console.log('  ПАНЕЛЬ: ' + m);
await b.close(); process.exit(bad.length ? 1 : 0);
