// Сторож «рост на виду» «Капли» (урок L135): node proby/zaplyv/kaplya/test_rost_vidno.cjs. Провал — код 1.
// Итог ночи п. 4: «Роста не видно: 2,0 мкм после 10–30 крошек»; ui.md п. 14: «тонкая белая полоса во всю ширину внизу… ничем не подписана».
// Должно: 390×844, полоса внизу подписана «рост до N мкм»; клетка набирает массу — полоса растёт, на шаге — «Рост!» и вспышка числа.
// Самопроверка: window.kaplyaStaryjRost — сторож краснеет.
const http = require('http'), fs = require('fs'), path = require('path');
const KOREN = path.resolve(__dirname, '..'), TIP = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.mp3': 'audio/mpeg' };
let bad = 0; const check = (n, e) => { console.log((e ? '  ПРОВАЛ ' : '  ок ') + n + (e ? ': ' + e : '')); if (e) bad++; };
async function scena(pw, port, staroe) { const b = await pw.chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME, args: ['--no-sandbox'] } : {});
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }), p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message)); if (staroe) await p.addInitScript(() => { window.kaplyaStaryjRost = true; });
  await p.goto(`http://127.0.0.1:${port}/kaplya/`); await p.waitForFunction(() => window.zaplyvWorld && zaplyvWorld() && zaplyvWorld().me.length && zaplyvWorld().stats.time > 1.5, null, { timeout: 90000 });
  const R = await p.evaluate(() => new Promise(ok => { const w = zaplyvWorld(), a = w.me[0], f = () => parseFloat(document.getElementById('growfill').style.width) || 0, L = () => (document.getElementById('growlbl') || {}).textContent || '';
    const p0 = f(), l0 = L(); a.m *= 1.06; setTimeout(() => { const p1 = f(); a.m *= 1.25; setTimeout(() => ok({ l0, p0: +p0.toFixed(1), p1: +p1.toFixed(1), l1: L(), podroslo: window.kaplyaPodroslo || 0 }), 600); }, 600); }));
  await b.close(); return { ...R, errs }; }
const sud = R => !/рост до/.test(R.l0) ? 'полоса роста не подписана' : !(R.p1 > R.p0 + 5) ? `масса +6 %, а полоса ${R.p0} → ${R.p1} % — роста не видно` : !R.podroslo || R.l1 === R.l0 ? 'дорос до шага — ни «Рост!», ни новой цели' : '';
(async () => {
  const srv = http.createServer((q, s) => { const f = path.join(KOREN, decodeURIComponent(q.url.split('?')[0])); const ff = fs.existsSync(f) && fs.statSync(f).isDirectory() ? path.join(f, 'index.html') : f;
    if (!ff.startsWith(KOREN) || !fs.existsSync(ff)) { s.writeHead(404); return s.end(); } s.writeHead(200, { 'Content-Type': TIP[path.extname(ff)] || 'application/octet-stream' }); fs.createReadStream(ff).pipe(s); }).listen(0);
  const pw = await import(process.env.PW || 'playwright').then(m => m.default || m), port = srv.address().port;
  const R = await scena(pw, port, false); console.log('  ' + JSON.stringify(R));
  check('test_L135 test_rost_vidno: полоса роста подписана, растёт от еды, шаг отмечен', R.errs.join(' | ') || sud(R));
  if (!process.env.BEZ_SAMOPROVERKI) { const S = await scena(pw, port, true); console.log('  старое: ' + JSON.stringify(S)); check('test_rost_vidno_samoproverka: прежняя полоса без роста — сторож краснеет', sud(S) && !/сцена не та/.test(sud(S)) ? '' : 'не заметил'); }
  srv.close(); process.exit(bad ? 1 : 0); })();
