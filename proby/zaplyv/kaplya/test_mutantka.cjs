// Сторож «копии и мутантка видны» «Капли» (урок L136): node proby/zaplyv/kaplya/test_mutantka.cjs. Провал — код 1.
// Итог ночи п. 7: «Мутантка отличается только точкой в списке «Стаи», на теле не видна; копии — пылинки».
// Тред «Довести Каплю» на main+#564: «копии липнут к телу клетки веером и закрывают её» — ближняя копия не ближе 2 твоих радиусов.
// Должно: 390×844, копия рисуется не меньше 0,45 твоего радиуса; у мутантки цветная оболочка.
// Самопроверка: window.kaplyaStaryeKopii — сторож краснеет.
const http = require('http'), fs = require('fs'), path = require('path');
const KOREN = path.resolve(__dirname, '..'), TIP = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.mp3': 'audio/mpeg' };
let bad = 0; const check = (n, e) => { console.log((e ? '  ПРОВАЛ ' : '  ок ') + n + (e ? ': ' + e : '')); if (e) bad++; };
async function scena(pw, port, staroe) { const b = await pw.chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME, args: ['--no-sandbox'] } : {});
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }), p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message)); if (staroe) await p.addInitScript(() => { window.kaplyaStaryeKopii = true; window.kaplyaStaryjStolbik = true; });
  await p.goto(`http://127.0.0.1:${port}/kaplya/`); await p.waitForFunction(() => window.zaplyvWorld && zaplyvWorld() && zaplyvWorld().me.length && zaplyvWorld().stats.time > 1.5, null, { timeout: 90000 });
  const R = await p.evaluate(() => new Promise(ok => { const w = zaplyvWorld(), a = w.me[0]; w.staya ||= []; for (let i = 0; i < 2; i++) w.staya.push({ id: ++w.ids, x: a.x - 30 - i * 8, y: a.y + 10, a: 0, m: 0.02 * a.m, t: 0, sama: 0, T: 30, pok: 1, ug: 0, mut: i ? 'ship' : null, mt: 0 });
    window.kaplyaMutObod = 0; setTimeout(() => { const b = w.me[0], R = 13 * Math.sqrt(b.m), bl = Math.min(...w.staya.map(q => Math.hypot(q.x - b.x, q.y - b.y))) / R; const kl = document.getElementById('klin'), podp = kl ? getComputedStyle(kl, '::after').content : ''; ok({ podp, kopiya: +(window.kaplyaKopiyaR || 0).toFixed(2), obod: window.kaplyaMutObod || 0, blizko: +bl.toFixed(2) }); }, 2500); }));
  await b.close(); return { ...R, errs }; }
const sud = R => !R.kopiya ? 'копий не рисовалось — сцена не та' : !/крупнее/.test(R.podp || '') ? 'столбик силуэтов без подписи «крупнее»' : R.blizko < 2 ? `копия в ${R.blizko} твоих радиуса — липнет к телу и закрывает его` : R.kopiya < 0.45 ? `копия ${R.kopiya} твоего радиуса — пылинка` : !R.obod ? 'у мутантки нет цветной оболочки — на теле не видна' : '';
(async () => {
  const srv = http.createServer((q, s) => { const f = path.join(KOREN, decodeURIComponent(q.url.split('?')[0])); const ff = fs.existsSync(f) && fs.statSync(f).isDirectory() ? path.join(f, 'index.html') : f;
    if (!ff.startsWith(KOREN) || !fs.existsSync(ff)) { s.writeHead(404); return s.end(); } s.writeHead(200, { 'Content-Type': TIP[path.extname(ff)] || 'application/octet-stream' }); fs.createReadStream(ff).pipe(s); }).listen(0);
  const pw = await import(process.env.PW || 'playwright').then(m => m.default || m), port = srv.address().port;
  const R = await scena(pw, port, false); console.log('  ' + JSON.stringify(R));
  check('test_L136 test_mutantka: копии клетками, мутантка с цветной оболочкой', R.errs.join(' | ') || sud(R));
  if (!process.env.BEZ_SAMOPROVERKI) { const S = await scena(pw, port, true); console.log('  старое: ' + JSON.stringify(S)); check('test_mutantka_samoproverka: прежние пылинки — сторож краснеет', sud(S) && !/сцена не та/.test(sud(S)) ? '' : 'не заметил'); }
  srv.close(); process.exit(bad ? 1 : 0); })();
