// Сторож «карточки умения строками» «Капли» (урок L138): node proby/zaplyv/kaplya/test_karty_ryady.cjs. Провал — код 1.
// ui.md п. 13: «Во всех трёх карточках почти одна и та же розовая палочка. Описания по 6–8 строк в узкой колонке, местами по одному слову в строке».
// Должно: 390×844, три умения — три строки во всю ширину, картинка-круг не меньше 70 точек, описание не длиннее 4 строк; касание берёт умение.
// Самопроверка: window.kaplyaStaryeKarty — сторож краснеет.
const http = require('http'), fs = require('fs'), path = require('path');
const KOREN = path.resolve(__dirname, '..'), TIP = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.mp3': 'audio/mpeg' };
let bad = 0; const check = (n, e) => { console.log((e ? '  ПРОВАЛ ' : '  ок ') + n + (e ? ': ' + e : '')); if (e) bad++; };
async function scena(pw, port, staroe) { const b = await pw.chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME, args: ['--no-sandbox'] } : {});
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }), p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message)); if (staroe) await p.addInitScript(() => { window.kaplyaStaryeKarty = true; });
  await p.goto(`http://127.0.0.1:${port}/kaplya/`); await p.waitForFunction(() => window.zaplyvWorld && zaplyvWorld() && zaplyvWorld().me.length && zaplyvWorld().stats.time > 1.5, null, { timeout: 90000 });
  await p.evaluate(() => { zaplyvWorld().choice = ['magnet', 'kusalka', 'sense']; }); await p.waitForFunction(() => document.getElementById('offer').classList.contains('on') && document.querySelectorAll('#obtns button').length === 3, null, { timeout: 30000 });
  const R = await p.evaluate(() => { const bs = [...document.querySelectorAll('#obtns button')]; return { shir: Math.min(...bs.map(b => b.getBoundingClientRect().width)) | 0, krug: Math.min(...bs.map(b => (b.querySelector('.gkrug') || b.querySelector('img')).getBoundingClientRect().width)) | 0,
    strok: Math.max(...bs.map(b => { const s = b.querySelector('small'); return Math.round(s.getBoundingClientRect().height / parseFloat(getComputedStyle(s).lineHeight)); })) }; });
  await p.tap('#obtns button:first-child'); await p.waitForTimeout(600); const vzyal = await p.evaluate(() => !!zaplyvWorld().genes.magnet);
  await b.close(); return { ...R, vzyal, errs }; }
const sud = R => !R.vzyal ? 'касание не взяло умение' : R.shir < 300 ? `карточка ${R.shir} точек в ширину — узкая колонка` : R.krug < 70 ? `картинка ${R.krug} точек` : R.strok > 4 ? `описание в ${R.strok} строк` : '';
(async () => {
  const srv = http.createServer((q, s) => { const f = path.join(KOREN, decodeURIComponent(q.url.split('?')[0])); const ff = fs.existsSync(f) && fs.statSync(f).isDirectory() ? path.join(f, 'index.html') : f;
    if (!ff.startsWith(KOREN) || !fs.existsSync(ff)) { s.writeHead(404); return s.end(); } s.writeHead(200, { 'Content-Type': TIP[path.extname(ff)] || 'application/octet-stream' }); fs.createReadStream(ff).pipe(s); }).listen(0);
  const pw = await import(process.env.PW || 'playwright').then(m => m.default || m), port = srv.address().port;
  const R = await scena(pw, port, false); console.log('  ' + JSON.stringify(R));
  check('test_L138 test_karty_ryady: умения строками, картинка крупно, описание до 4 строк', R.errs.join(' | ') || sud(R));
  if (!process.env.BEZ_SAMOPROVERKI) { const S = await scena(pw, port, true); console.log('  старое: ' + JSON.stringify(S)); check('test_karty_ryady_samoproverka: прежние узкие колонки — сторож краснеет', sud(S) && !/сцена не та/.test(sud(S)) ? '' : 'не заметил'); }
  srv.close(); process.exit(bad ? 1 : 0); })();
