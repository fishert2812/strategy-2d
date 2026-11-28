// Сторож «пустых кругов нет» «Капли» (уроки L133, L134): node proby/zaplyv/kaplya/test_pustye_krugi.cjs. Провал — код 1.
// Переигровка b44b767 (vid_b44b767_igra.md п. 3, ui.md п. 9): «кольцо джойстика: пустой серый круг виден всё время, даже когда палец не стоит»; «пустые тёмные круги в левой колонке портретов»; «бледные пустые кольца-пузыри выглядят как пустые кружки».
// Должно: 390×844, без пальца пустое кольцо джойстика не рисуется; тёмный пустой кадр не становится портретом, светлый становится.
// Самопроверка: window.kaplyaStaryjKrugDzh и kaplyaStaryePortrety, kaplyaStaryePuzyri — сторож краснеет.
const http = require('http'), fs = require('fs'), path = require('path');
const KOREN = path.resolve(__dirname, '..'), TIP = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.mp3': 'audio/mpeg' };
let bad = 0; const check = (n, e) => { console.log((e ? '  ПРОВАЛ ' : '  ок ') + n + (e ? ': ' + e : '')); if (e) bad++; };
async function scena(pw, port, staroe) { const b = await pw.chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME, args: ['--no-sandbox'] } : {});
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }), p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message)); if (staroe) await p.addInitScript(() => { window.kaplyaStaryjKrugDzh = true; window.kaplyaStaryePortrety = true; window.kaplyaStaryePuzyri = true; });
  await p.goto(`http://127.0.0.1:${port}/kaplya/`); await p.waitForFunction(() => window.zaplyvWorld && zaplyvWorld() && zaplyvWorld().me.length && zaplyvWorld().stats.time > 1.5, null, { timeout: 90000 });
  const R = await p.evaluate(async () => { const lin = await import(location.origin + '/kaplya/lineyka.js'), K = await (await fetch('kaplya/kaplya.json')).json(), L = { sil: {} };
    const t = document.createElement('canvas'); t.width = t.height = 200; const g = t.getContext('2d'); g.fillStyle = '#06121a'; g.fillRect(0, 0, 200, 200); lin.snyat(L, K.lineyka, t, 'tyomny', 100, 100, 30, 200);
    g.fillStyle = '#e080c0'; g.beginPath(); g.arc(100, 100, 40, 0, 7); g.fill(); lin.snyat(L, K.lineyka, t, 'svetly', 100, 100, 30, 200);
    return { blik: window.kaplyaPuzyrBlik, krug: window.kaplyaKrugDzh, tyomny: !!L.sil.tyomny, svetly: !!L.sil.svetly }; });
  await b.close(); return { ...R, errs }; }
const sud = R => R.krug === undefined ? 'кольцо джойстика не проверялось — сцена не та' : !R.svetly ? 'светлый портрет не взят — сцена не та' : R.krug ? 'без пальца на экране пустое кольцо джойстика' : R.tyomny ? 'тёмный пустой кадр стал портретом — пустой круг в колонке' : !R.blik ? 'пузыри — пустые кольца без блика' : '';
(async () => {
  const srv = http.createServer((q, s) => { const f = path.join(KOREN, decodeURIComponent(q.url.split('?')[0])); const ff = fs.existsSync(f) && fs.statSync(f).isDirectory() ? path.join(f, 'index.html') : f;
    if (!ff.startsWith(KOREN) || !fs.existsSync(ff)) { s.writeHead(404); return s.end(); } s.writeHead(200, { 'Content-Type': TIP[path.extname(ff)] || 'application/octet-stream' }); fs.createReadStream(ff).pipe(s); }).listen(0);
  const pw = await import(process.env.PW || 'playwright').then(m => m.default || m), port = srv.address().port;
  const R = await scena(pw, port, false); console.log('  ' + JSON.stringify(R));
  check('test_L133 test_pustye_krugi: нет пустого кольца джойстика и пустых портретов', R.errs.join(' | ') || sud(R));
  if (!process.env.BEZ_SAMOPROVERKI) { const S = await scena(pw, port, true); console.log('  старое: ' + JSON.stringify(S)); check('test_pustye_krugi_samoproverka: прежние пустые круги — сторож краснеет', sud(S) && !/сцена не та/.test(sud(S)) ? '' : 'не заметил'); }
  srv.close(); process.exit(bad ? 1 : 0); })();
