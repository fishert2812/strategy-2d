// Сторож скорости старта «Капли» с загрузочным экраном: node proby/zaplyv/kaplya/test_zagruzka_start.cjs. Провал — код 1.
// Урок 28.11 (откат #556): живая 3D-спираль загрузки отнимала главный поток, игра доходила до 20 кадров за 29 с вместо 2,7 с.
// Мерим в одном браузере три захода: без загрузочного экрана (мерка), с ним, и с нарочно тяжёлой загрузкой (самопроверка).
// Первый кадр игры, 20 кадров игры и кадры за первые 7 с с загрузкой не хуже мерки с запасом на шум: прежняя лёгкая загрузка
// (6b77071) на этом замере давала 54 кадра из 74, тяжёлая — 2–4 кадра. Тяжёлую загрузку сторож ловит.
const http = require('http'), fs = require('fs'), path = require('path');
const KOREN = path.resolve(__dirname, '..'), TIP = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.mp3': 'audio/mpeg' };
// тяжёлая загрузка: каждый кадр 120 мс занят — так вела себя 3D-сцена на слабом железе
const TYAZHELO = '(function(){function k(){var t=performance.now();while(performance.now()-t<120){}requestAnimationFrame(k)}requestAnimationFrame(k)})();';
let bad = 0; const check = (n, e) => { console.log((e ? '  ПРОВАЛ ' : '  ок ') + n + (e ? ': ' + e : '')); if (e) bad++; };
(async () => {
  let rezhim = 'est';
  const srv = http.createServer((q, s) => { const u = decodeURIComponent(q.url.split('?')[0]); const f = path.join(KOREN, u); const ff = fs.existsSync(f) && fs.statSync(f).isDirectory() ? path.join(f, 'index.html') : f;
    if (!ff.startsWith(KOREN) || !fs.existsSync(ff)) { s.writeHead(404); return s.end(); }
    s.writeHead(200, { 'Content-Type': TIP[path.extname(ff)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    if (u.endsWith('zagruzka.js') && rezhim !== 'est') return s.end(rezhim === 'net' ? '' : TYAZHELO);
    fs.createReadStream(ff).pipe(s); }).listen(0);
  const pw = await import(process.env.PW || 'playwright').then(m => m.default || m);
  const b = await pw.chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME, args: ['--no-sandbox'] } : {});
  async function zahod(r) {
    rezhim = r; const p = await b.newPage({ viewport: { width: 393, height: 852 }, isMobile: true, hasTouch: true });
    const oshibki = []; p.on('pageerror', e => oshibki.push(e.message));
    const t0 = Date.now(); p.goto(`http://localhost:${srv.address().port}/kaplya/`).catch(() => {});
    let pervyy = -1, za7 = 0, dvadcat = -1;
    while (Date.now() - t0 < 7000) {
      await p.waitForTimeout(100);
      const n = await p.evaluate(() => window.zaplyvProbe ? zaplyvProbe.frames : 0).catch(() => 0);
      if (n > 0 && pervyy < 0) pervyy = (Date.now() - t0) / 1000; if (n > 20 && dvadcat < 0) dvadcat = (Date.now() - t0) / 1000; za7 = n;
    }
    await p.close(); return { pervyy, za7, dvadcat, oshibki };
  }
  await zahod('net'); // прогрев: браузер и диск, чтобы первый замер не был заведомо хуже
  const mer = await zahod('net'), est = await zahod('est'), tyazh = await zahod('tyazh');
  console.log(`  паспорт: первый кадр игры без загрузки ${mer.pervyy} с, с загрузкой ${est.pervyy} с, с тяжёлой ${tyazh.pervyy} с; кадров за 7 с: ${mer.za7} / ${est.za7} / ${tyazh.za7}; 20 кадров игры через ${mer.dvadcat} / ${est.dvadcat} / ${tyazh.dvadcat} с`);
  const huzhe = (z) => z.pervyy < 0 ? 'игра не нарисовала ни кадра за 7 с' : z.pervyy > mer.pervyy * 1.25 + 0.5 ? `первый кадр через ${z.pervyy} с против ${mer.pervyy} с` : z.dvadcat < 0 || z.dvadcat > mer.dvadcat * 1.5 + 0.5 ? `20 кадров игры через ${z.dvadcat} с против ${mer.dvadcat} с` : z.za7 < mer.za7 * 0.6 ? `кадров за 7 с ${z.za7} против ${mer.za7}` : '';
  check('test_zagruzka_start_vidit: тяжёлую загрузку сторож ловит', huzhe(tyazh) ? '' : 'тяжёлая загрузка прошла незамеченной');
  check('test_zagruzka_start: с загрузочным экраном игра стартует не медленнее, чем без него', mer.pervyy < 0 ? 'игра не стартует и без загрузки' : huzhe(est));
  check('test_zagruzka_start_bez_oshibok: на странице нет ошибок скрипта', est.oshibki.join('; '));
  await b.close(); srv.close();
  console.log(bad ? `ПРОВАЛ: ${bad}` : 'ок: загрузка не замедляет старт игры');
  process.exit(bad ? 1 : 0);
})().catch(e => { console.log('  ПРОВАЛ ошибка сторожа: ' + e.message); process.exit(1); });
