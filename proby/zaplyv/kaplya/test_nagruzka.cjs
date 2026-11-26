// Сторож нагрузки «Капли»: node proby/zaplyv/kaplya/test_nagruzka.cjs. Провал — код 1.
// Роман 26.11: «Лагать и нагреваться телефон стал… большим стал!» Камера отъезжает с ростом, и в кадр входили сотни жителей полной записью.
// Мерка (координатор 26.11): большая клетка не тяжелее маленькой больше чем в 1,5 раза. Мерим то, что рисуется: жителей полным телом и частей тел,
// и время кадра (оно здесь шумное: видеокарты нет, рисует процессор, поэтому для него порог мягче — 2 раза).
// Самопроверка: с выключенной взвесью (window.kaplyaBezLod) сторож обязан покраснеть.
const http = require('http'), fs = require('fs'), path = require('path');
const KOREN = path.resolve(__dirname, '..'), TIP = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.mp3': 'audio/mpeg' };
const RAZ = 1.5, RAZ_KADR = 2, MALO = 10; // во сколько раз большая может быть тяжелее; MALO — столько тел допустимо всегда
let bad = 0; const check = (n, e) => { console.log((e ? '  ПРОВАЛ ' : '  ок ') + n + (e ? ': ' + e : '')); if (e) bad++; };
const sud = (s, b) => b.tel > Math.max(MALO, s.tel * RAZ) ? `телом ${b.tel} жителей против ${s.tel} у малышки` : b.chastey > s.chastey * RAZ ? `частей тел ${b.chastey} против ${s.chastey}` : b.kadr > s.kadr * RAZ_KADR ? `кадр ${b.kadr} мс против ${s.kadr}` : '';
check('test_nagruzka_sud: судья краснеет на придуманной тяжёлой клетке', sud({ tel: 8, chastey: 300, kadr: 50 }, { tel: 200, chastey: 300, kadr: 50 }) && !sud({ tel: 8, chastey: 300, kadr: 50 }, { tel: 3, chastey: 400, kadr: 83 }) ? '' : 'судья ошибается');
(async () => {
  const srv = http.createServer((q, s) => { const f = path.join(KOREN, decodeURIComponent(q.url.split('?')[0])); const ff = fs.existsSync(f) && fs.statSync(f).isDirectory() ? path.join(f, 'index.html') : f;
    if (!ff.startsWith(KOREN) || !fs.existsSync(ff)) { s.writeHead(404); return s.end(); } s.writeHead(200, { 'Content-Type': TIP[path.extname(ff)] || 'application/octet-stream' }); fs.createReadStream(ff).pipe(s); }).listen(0);
  const pw = await import(process.env.PW || 'playwright').then(m => m.default || m); // на CI playwright не рядом с файлом: путь даёт шаг (tools/web/kaplya_pw.sh)
  const b = await pw.chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME, args: ['--no-sandbox'] } : {}), p = await b.newPage({ viewport: { width: 393, height: 852 }, isMobile: true, hasTouch: true });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto(`http://127.0.0.1:${srv.address().port}/kaplya/`); await p.waitForFunction(() => window.zaplyvWorld && zaplyvWorld() && zaplyvWorld().stats.time > 2, null, { timeout: 90000 });
  await p.evaluate(() => { zaplyvWorld().lose = () => {}; });
  const zamer = async m => { await p.evaluate(m => { const w = zaplyvWorld(); w.me.forEach(a => a.m = m); w.me.length = 1; }, m);
    for (let i = 0; i < 8; i++) { await p.evaluate(i => { const a = zaplyvWorld().me[0]; a.x += Math.cos(i) * 80; a.y += Math.sin(i) * 80; }, i); await p.waitForTimeout(400); }
    return p.evaluate(() => new Promise(r => { const t = [], L = []; let l = performance.now(); const f = n => { t.push(n - l); l = n; L.push(kaplyaLod()); if (t.length < 40) requestAnimationFrame(f); else { t.sort((a, b) => a - b); const med = k => L.map(x => x[k]).sort((a, b) => a - b)[20]; r({ kadr: Math.round(t[20]), tel: med('tel'), chastey: med('chastey') }); } }; requestAnimationFrame(f); })); };
  const s = await zamer(1.4), v = await zamer(150); console.log('  малышка', JSON.stringify(s), 'большая', JSON.stringify(v));
  check('test_nagruzka_rost: большая клетка (масса 150) не тяжелее малышки больше чем в 1,5 раза', sud(s, v));
  await p.evaluate(() => { window.kaplyaBezLod = true; }); const v0 = await zamer(150); await p.evaluate(() => { window.kaplyaBezLod = false; });
  check('test_nagruzka_samoproverka: без взвеси сторож краснеет', sud(s, v0) ? '' : `без взвеси всё равно зелёный: ${JSON.stringify(v0)}`);
  check('test_nagruzka_oshibki: игра без ошибок', errs.length ? errs.join('; ') : '');
  await b.close(); srv.close(); process.exit(bad ? 1 : 0); })();
