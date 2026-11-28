// Сторож «пасть туфельки не щёлкает» «Капли» (урок L150): node proby/zaplyv/kaplya/test_skachok_pasti.cjs. Провал — код 1.
// Тред проверки на d99c6f6: «Туфелька втягивает плавно, но в конце один скачок: клетка за кадр прыгает на 30 единиц… пасть туфельки резко меняет место при её повороте».
// Должно: туфелька держит клетку и разворачивается на месте (пасть перескакивает) — клетка за кадр сдвигается не больше 12 единиц (прежде 40+).
// Самопроверка: window.kaplyaStaryjSkachokPasti — сторож краснеет.
const http = require('http'), fs = require('fs'), path = require('path');
const KOREN = path.resolve(__dirname, '..'), TIP = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.mp3': 'audio/mpeg' };
let bad = 0; const check = (n, e) => { console.log((e ? '  ПРОВАЛ ' : '  ок ') + n + (e ? ': ' + e : '')); if (e) bad++; };
async function scena(pw, port, staroe) { const b = await pw.chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME, args: ['--no-sandbox'] } : {});
  const ctx = await b.newContext({ viewport: { width: 393, height: 659 }, isMobile: true, hasTouch: true }), p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message)); if (staroe) await p.addInitScript(() => { window.kaplyaStaryjSkachokPasti = true; });
  await p.goto(`http://127.0.0.1:${port}/kaplya/`); await p.waitForFunction(() => window.zaplyvWorld && zaplyvWorld() && zaplyvWorld().me.length && zaplyvWorld().stats.time > 1, null, { timeout: 90000 });
  const R = await p.evaluate(() => new Promise(ok => { const w = zaplyvWorld(), a = w.me[0]; setInterval(() => { w.choice = []; const M = window.kaplyaMut && kaplyaMut(); if (M) M.vopros = null; }, 50);
    for (const k of ['amoebas', 'bells', 'slippers', 'rotis', 'bdellos', 'bodos', 'kolovratki3', 'ameby3', 'tufelki3', 'spumelly', 'ciklidii', 'parafizo', 'cerko']) if (w[k]) w[k].length = 0;
    const q = { x: a.x + 90, y: a.y, a: Math.PI, t: 0, id: ++w.ids }; w.slippers.push(q); const m = w.mouth(q); a.x = m[0] + 15; a.y = m[1];
    let prev = null, maxs = 0, pov = false, derzhal = 0; const tick = () => { const c = w.me[0]; if (!c) return ok({ maxs, pov, derzhal, umerla: true }); if (c.grab && c.grab.by === q) { derzhal++; if (derzhal === 4 && !pov) { q.a += Math.PI * 0.9; pov = true; } if (prev && pov) maxs = Math.max(maxs, Math.hypot(c.x - prev[0], c.y - prev[1])); prev = [c.x, c.y]; } else prev = null; requestAnimationFrame(tick); };
    tick(); setTimeout(() => ok({ maxs: +maxs.toFixed(1), pov, derzhal }), 3000); }));
  await b.close(); return { ...R, errs }; }
const sud = R => !R.pov ? 'туфелька не схватила — сцена не та' : R.maxs > 12 ? `клетка в пасти прыгнула на ${R.maxs} единиц за кадр — щелчок` : '';
(async () => {
  const srv = http.createServer((q, s) => { const f = path.join(KOREN, decodeURIComponent(q.url.split('?')[0])); const ff = fs.existsSync(f) && fs.statSync(f).isDirectory() ? path.join(f, 'index.html') : f;
    if (!ff.startsWith(KOREN) || !fs.existsSync(ff)) { s.writeHead(404); return s.end(); } s.writeHead(200, { 'Content-Type': TIP[path.extname(ff)] || 'application/octet-stream' }); fs.createReadStream(ff).pipe(s); }).listen(0);
  const pw = await import(process.env.PW || 'playwright').then(m => m.default || m), port = srv.address().port;
  const R = await scena(pw, port, false); console.log('  ' + JSON.stringify(R));
  check('test_L150 test_skachok_pasti: пасть туфельки повернулась — клетка без скачка', R.errs.join(' | ') || sud(R));
  if (!process.env.BEZ_SAMOPROVERKI) { const S = await scena(pw, port, true); console.log('  старое: ' + JSON.stringify(S)); check('test_skachok_pasti_samoproverka: прежний щелчок — сторож краснеет', sud(S) && !/сцена не та/.test(sud(S)) ? '' : 'не заметил'); }
  srv.close(); process.exit(bad ? 1 : 0); })();
