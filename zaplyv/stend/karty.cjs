// Снимки для карточек умений (Роман 26.11 21:43: в карточки «из конструктора конкретную картинку»): node proby/zaplyv/stend/karty.cjs
// На каждое умение из vid_chasti.json navyki.spisok одна картинка: клетка игрока с этим умением (уровень 1, свои числа умения в snimok.svoi) крупно по центру,
// стенд в режиме ?snimok=1. Кладёт в proby/zaplyv/kaplya/karty/<ключ>.png. Новое умение в списке получает картинку этим же запуском.
// Аргументы: уровень (по умолчанию 1), папка (по умолчанию kaplya/karty), ключи через запятую (по умолчанию все). Числа снимка: mir.json hod.stend.snimok.
const http = require('http'), fs = require('fs'), path = require('path');
const KOREN = path.resolve(__dirname, '..'), TIP = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg' };
const ur = +(process.argv[2] || 1), kuda = path.resolve(process.argv[3] || path.join(KOREN, 'kaplya', 'karty')), tolko = process.argv[4] ? process.argv[4].split(',') : null;
(async () => {
  const srv = http.createServer((q, s) => { const f = path.join(KOREN, decodeURIComponent(q.url.split('?')[0]));
    if (!f.startsWith(KOREN) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { s.writeHead(404); s.end(); return; }
    s.writeHead(200, { 'content-type': TIP[path.extname(f)] || 'application/octet-stream' }); s.end(fs.readFileSync(f)); });
  await new Promise(r => srv.listen(0, r)); const port = srv.address().port;
  const N = JSON.parse(fs.readFileSync(path.join(KOREN, 'vid_chasti.json'), 'utf8')).navyki, SN = JSON.parse(fs.readFileSync(path.join(KOREN, 'mir.json'), 'utf8')).hod.stend.snimok;
  const pw = require('playwright'), b = await pw.chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await (await b.newContext({ viewport: { width: SN.storona, height: SN.storona }, deviceScaleFactor: 1 })).newPage(); let bad = 0; p.on('pageerror', e => { console.log('ОШИБКА', e.message.slice(0, 200)); bad++; });
  fs.mkdirSync(kuda, { recursive: true });
  for (const [kl, U] of Object.entries(N.spisok)) { if (tolko && !tolko.includes(kl)) continue; const u = Math.min(Math.max(ur, SN.svoi?.[kl]?.uroven || 1), U.urovni.length);
    await p.goto('http://localhost:' + port + '/stend/hod.html?zapis=1&snimok=1&sushchestvo=' + N.osnova + '&navyki=' + kl + ':' + u); await p.waitForFunction('window.stendReady');
    await p.evaluate(n => { for (let i = 0; i < n; i++) window.stend(1 / 60); }, Math.round(SN.sekund * 60));
    await p.screenshot({ path: path.join(kuda, kl + '.png') }); console.log('  ' + kl + '.png · ' + U.imya + ' ' + u); }
  await b.close(); srv.close(); process.exit(bad ? 1 : 0);
})();
