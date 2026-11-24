// Каждая вкладка книги открывается на телефоне без ошибки страницы и не пустая (урок 25.11: вкладка «Тексты»
// упала на записи без латинского имени, а заметил это только ручной обход перед слиянием).
// node proby/zaplyv/kniga/stranicy.mjs <адрес книги> ; PW — путь к playwright, CHROME — свой браузер.
const pw = await import(process.env.PW || 'playwright').then(m => m.default || m);
const url = process.argv[2];
const b = await pw.chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME, args: ['--no-sandbox'] } : {});
const p = await (await b.newContext({ ...pw.devices['iPhone 13'] })).newPage();
let errs = []; p.on('pageerror', e => errs.push(e.message));
await p.goto(url); await p.waitForSelector('nav a');
const pages = await p.evaluate(() => PAGES.map(x => x[0]));
let bad = 0;
for (const k of pages) {
  errs = []; await p.goto(url + '?' + k + '#' + k); await p.waitForTimeout(350);
  const len = await p.evaluate(() => document.getElementById('page').innerText.trim().length);
  if (errs.length || len < 40) { bad++; console.log('  КНИГА: вкладка ' + k + (errs.length ? ' падает: ' + errs[0] : ' пустая')); }
}
console.log(bad ? '  вкладок с ошибкой: ' + bad : '  вкладки книги открываются: ' + pages.length);
await b.close(); process.exit(bad ? 1 : 0);
