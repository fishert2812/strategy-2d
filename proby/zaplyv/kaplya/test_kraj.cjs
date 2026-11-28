// Сторож «подписи целиком на экране» «Капли» (уроки L125, L127): node proby/zaplyv/kaplya/test_kraj.cjs. Провал — код 1.
// L125, переигровка b44b767: «Подпись версии внизу всё ещё «0.113»» — на экране должна стоять выкладка (sha), номер 0.113 от основного «Заплыва» и не меняется.
// L127, свой кадр на b44b767: подпись «Очаг синегнойки» у левого края экрана обрезана («…гнойки»).
// Должно: 390×844; version.txt отдаёт sha — внизу «Капля · <sha>» без 0.113; очаг у левого края — подпись целиком в экране.
// Самопроверка: window.kaplyaStarayaVersiya и window.kaplyaStarayaKraiOchaga — сторож краснеет.
const http = require('http'), fs = require('fs'), path = require('path');
const KOREN = path.resolve(__dirname, '..'), TIP = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.mp3': 'audio/mpeg' };
let bad = 0; const check = (n, e) => { console.log((e ? '  ПРОВАЛ ' : '  ок ') + n + (e ? ': ' + e : '')); if (e) bad++; };
async function scena(pw, port, staroe) { const b = await pw.chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME, args: ['--no-sandbox'] } : {}), p = await b.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const errs = []; p.on('pageerror', e => errs.push(e.message)); if (staroe) await p.addInitScript(() => { window.kaplyaStarayaVersiya = true; window.kaplyaStarayaKraiOchaga = true; });
  await p.route('**/kaplya/kaplya.json', async r => { const res = await r.fetch(), J = await res.json(); J.glava.strelka = 5000; r.fulfill({ response: res, body: JSON.stringify(J), headers: { 'content-type': 'application/json' } }); }); /* знак с подписью и вдали от тебя: очаг у самого края экрана */
  await p.route('**/version.txt', r => r.fulfill({ status: 200, contentType: 'text/plain', body: 'abc1234def\n' }));
  await p.goto(`http://127.0.0.1:${port}/kaplya/`); await p.waitForFunction(() => window.zaplyvWorld && zaplyvWorld() && zaplyvWorld().me.length && zaplyvWorld().stats.time > 1, null, { timeout: 90000 });
  const ver = await p.evaluate(() => document.getElementById('ver').textContent);
  await p.evaluate(() => { const w = zaplyvWorld(), o = kaplyaChistka().oc.find(o => o.sila > 0); let dx = 0, dy = 0; setInterval(() => { const a = w.me[0]; w.choice = []; if (!a) return; const [x, y] = zaplyvScr(o.x, o.y), [x1] = zaplyvScr(o.x + 1, o.y), k = x1 - x || 1; dx += (14 - x) / k * 0.2; dy += (380 - y) / k * 0.2; a.x = o.x - dx; a.y = o.y - dy; a.vx = a.vy = 0; }, 16); }); /* очаг у левого края экрана */
  const t0 = await p.evaluate(() => zaplyvWorld().stats.time); await p.waitForFunction(t0 => { const sk = document.getElementById('kochag'), b = sk.getBoundingClientRect(); return !zaplyvWorld().me.length || zaplyvWorld().stats.time - t0 > 8 || (zaplyvWorld().stats.time - t0 > 1.5 && !sk.hidden && sk.classList.contains('u') && b.left + b.width / 2 < 40); }, t0, { timeout: 120000 }).catch(() => {}); /* под нагрузкой знак доходит до края дольше */
  const och = await p.evaluate(() => { const sk = document.getElementById('kochag'), b = sk.getBoundingClientRect(), cs = getComputedStyle(sk, '::after'), c = document.createElement('canvas').getContext('2d'); c.font = '13px ' + (getComputedStyle(sk).fontFamily || 'sans-serif');
    const w = c.measureText(sk.dataset.p || '').width, sd = parseFloat(getComputedStyle(sk).getPropertyValue('--sdvig')) || 0, cx = b.left + b.width / 2 + sd; return { zhiv: zaplyvWorld().me.length, t: +zaplyvWorld().stats.time.toFixed(1), vid: !sk.hidden && sk.classList.contains('u'), znak: Math.round(b.left + b.width / 2), l: Math.round(cx - w / 2), r: Math.round(cx + w / 2), W: innerWidth }; });
  await b.close(); return { ver, och, errs }; }
const sudV = R => /0\.113/.test(R.ver) ? 'на экране «' + R.ver + '»' : !/abc1234/.test(R.ver) ? 'sha нет: «' + R.ver + '»' : '';
const sudO = R => !R.och.vid || R.och.znak > 60 ? 'сцена не та: ' + JSON.stringify(R.och) : R.och.l < 0 || R.och.r > R.och.W ? 'подпись очага за краем экрана: ' + JSON.stringify(R.och) : '';
(async () => {
  const srv = http.createServer((q, s) => { const f = path.join(KOREN, decodeURIComponent(q.url.split('?')[0])); const ff = fs.existsSync(f) && fs.statSync(f).isDirectory() ? path.join(f, 'index.html') : f;
    if (!ff.startsWith(KOREN) || !fs.existsSync(ff)) { s.writeHead(404); return s.end(); } s.writeHead(200, { 'Content-Type': TIP[path.extname(ff)] || 'application/octet-stream' }); fs.createReadStream(ff).pipe(s); }).listen(0);
  const pw = await import(process.env.PW || 'playwright').then(m => m.default || m), port = srv.address().port;
  const R = await scena(pw, port, false); console.log('  ' + JSON.stringify(R));
  check('test_L125 test_versiya_sha: внизу «Капля · sha», без 0.113', R.errs.join(' | ') || sudV(R));
  check('test_L127 test_ochag_kraj: очаг у левого края — подпись «Очаг синегнойки» целиком в экране', R.errs.join(' | ') || sudO(R));
  if (!process.env.BEZ_SAMOPROVERKI) { const S = await scena(pw, port, true); console.log('  старое: ' + JSON.stringify(S)); check('test_kraj_samoproverka: старая подпись версии и очага — сторож краснеет', sudV(S) && sudO(S) && !/сцена не та/.test(sudO(S)) ? '' : 'не заметил'); }
  srv.close(); process.exit(bad ? 1 : 0); })();
