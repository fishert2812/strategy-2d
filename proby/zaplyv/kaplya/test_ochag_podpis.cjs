// Сторож подписи очага заразы «Капли» (урок L096): node proby/zaplyv/kaplya/test_ochag_podpis.cjs. Провал — код 1.
// Повтор bac846d (тред проверки 27.11): «Я доплыл по ☣ до стайки розовых палочек (на месте ☣ пропадает, подписи "очаг" или "синегнойка" нет)». Должно: «У очага подпись "Очаг синегнойки"».
// Живая игра 390×844: ты у очага — знак ☣ стоит над ним с подписью. Самопроверка: старый знак (window.kaplyaStaryjOchag) пропадает — сторож краснеет.
const http = require('http'), fs = require('fs'), path = require('path');
const KOREN = path.resolve(__dirname, '..'), TIP = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.mp3': 'audio/mpeg' };
const KAP = JSON.parse(fs.readFileSync(path.join(__dirname, 'kaplya.json')));
let bad = 0; const check = (n, e) => { console.log((e ? '  ПРОВАЛ ' : '  ок ') + n + (e ? ': ' + e : '')); if (e) bad++; };
async function scena(pw, port, staroe) { const b = await pw.chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME, args: ['--no-sandbox'] } : {}), p = await b.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const errs = []; p.on('pageerror', e => errs.push(e.message)); if (staroe) await p.addInitScript(() => { window.kaplyaStaryjOchag = true; });
  await p.goto(`http://127.0.0.1:${port}/kaplya/`); await p.waitForFunction(() => window.zaplyvWorld && zaplyvWorld() && zaplyvWorld().me.length && zaplyvWorld().stats.time > 1, null, { timeout: 90000 });
  await p.evaluate(() => { const w = zaplyvWorld(), o = kaplyaChistka().oc.find(o => o.sila > 0); window.OCH = o; setInterval(() => { const a = w.me[0]; w.choice = []; if (a) { a.x = o.x + 120; a.y = o.y; a.vx = a.vy = 0; } }, 16); }); /* стоишь в 120 от очага */
  const t0 = await p.evaluate(() => zaplyvWorld().stats.time); await p.waitForFunction(t0 => zaplyvWorld().stats.time - t0 > 1.5, t0, { timeout: 90000 });
  const R = await p.evaluate(() => { const sk = document.getElementById('kochag'), [x, y] = zaplyvScr(OCH.x, OCH.y), b = sk.getBoundingClientRect(); return { vid: !sk.hidden && getComputedStyle(sk).display !== 'none', podpis: getComputedStyle(sk, '::after').content, dx: Math.round(b.left + b.width / 2 - x), dy: Math.round(b.top + b.height / 2 - y) }; });
  await b.close(); R.errs = errs; return R; }
// L111 (переигровка 711fa42: «"Очаг синегнойки" лежит на кнопке "Яд"»): очаг на экране у кнопки «Яд» — подпись встаёт над знаком и кнопку не задевает.
async function uKnopki(pw, port, staroe) { const b = await pw.chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME, args: ['--no-sandbox'] } : {}), p = await b.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const errs = []; p.on('pageerror', e => errs.push(e.message)); if (staroe) await p.addInitScript(() => { window.kaplyaStarayaPodpisOchaga = true; });
  await p.goto(`http://127.0.0.1:${port}/kaplya/`); await p.waitForFunction(() => window.zaplyvWorld && zaplyvWorld() && zaplyvWorld().me.length && zaplyvWorld().stats.time > 1, null, { timeout: 90000 });
  await p.evaluate(() => { const w = zaplyvWorld(), o = kaplyaChistka().oc.find(o => o.sila > 0); w.genes.toxin = 1; window.OCH = o; let dx = 150, dy = 260;
    setInterval(() => { const a = w.me[0]; w.choice = []; if (!a) return; const kb = document.getElementById('kyad').getBoundingClientRect(); if (kb.width) { const [x, y] = zaplyvScr(o.x, o.y), [x1] = zaplyvScr(o.x + 1, o.y), k = x1 - x || 1; dx += (kb.left + kb.width / 2 - 10 - x) / k * 0.2; dy += (kb.top - 12 - y) / k * 0.2; } a.x = o.x - dx; a.y = o.y - dy; a.vx = a.vy = 0; }, 16); }); /* очаг на экране прямо над кнопкой «Яд» */
  const t0 = await p.evaluate(() => zaplyvWorld().stats.time); await p.waitForFunction(t0 => zaplyvWorld().stats.time - t0 > 2.5, t0, { timeout: 90000 });
  const R = await p.evaluate(() => { const sk = document.getElementById('kochag'), b = sk.getBoundingClientRect(), kb = document.getElementById('kyad').getBoundingClientRect(), st = getComputedStyle(sk, '::after'), top = b.top + parseFloat(st.top), w = parseFloat(st.width) || 110, x0 = b.left + b.width / 2 - w / 2;
    const L = { l: x0, r: x0 + w, t: top, b: top + parseFloat(st.lineHeight || 16) }; return { vid: !sk.hidden && sk.classList.contains('u'), knopka: kb.width > 0, nalozh: L.r > kb.left && L.l < kb.right && L.b > kb.top && L.t < kb.bottom + 22, L: [Math.round(L.l), Math.round(L.t)], kb: [Math.round(kb.left), Math.round(kb.top)] }; });
  await b.close(); R.errs = errs; return R; }
const sudK = R => !R.vid || !R.knopka ? 'сцена не та: ' + JSON.stringify(R) : R.nalozh ? 'подпись очага лежит на кнопке «Яд»: ' + JSON.stringify(R) : '';
const sud = R => !R.vid ? 'у очага знака нет' : !R.podpis.includes(KAP.glava.podpis_ochaga) ? `подпись «${R.podpis}»` : Math.hypot(R.dx, R.dy) > 40 ? `знак не над очагом: ${R.dx}, ${R.dy}` : '';
(async () => {
  const srv = http.createServer((q, s) => { const f = path.join(KOREN, decodeURIComponent(q.url.split('?')[0])); const ff = fs.existsSync(f) && fs.statSync(f).isDirectory() ? path.join(f, 'index.html') : f;
    if (!ff.startsWith(KOREN) || !fs.existsSync(ff)) { s.writeHead(404); return s.end(); } s.writeHead(200, { 'Content-Type': TIP[path.extname(ff)] || 'application/octet-stream' }); fs.createReadStream(ff).pipe(s); }).listen(0);
  const pw = await import(process.env.PW || 'playwright').then(m => m.default || m), port = srv.address().port;
  const R = await scena(pw, port, false); console.log('  ' + JSON.stringify(R));
  check('test_L096 test_ochag_podpis: у очага знак ☣ стоит над ним с подписью «' + KAP.glava.podpis_ochaga + '»', R.errs.join(' | ') || sud(R));
  if (!process.env.BEZ_SAMOPROVERKI) { const S = await scena(pw, port, true); console.log('  старое: ' + JSON.stringify(S)); check('test_ochag_podpis_samoproverka: старый знак у очага пропадает — сторож краснеет', sud(S) ? '' : 'не заметил'); }
  const K = await uKnopki(pw, port, false); console.log('  у кнопки: ' + JSON.stringify(K)); check('test_L111 test_ochag_podpis_knopka: очаг у кнопки «Яд» — подпись над знаком, кнопку не задевает', K.errs.join(' | ') || sudK(K));
  if (!process.env.BEZ_SAMOPROVERKI) { const Ks = await uKnopki(pw, port, true); console.log('  старое, у кнопки: ' + JSON.stringify(Ks)); check('test_ochag_podpis_knopka_samoproverka: старая подпись на кнопке — сторож краснеет', sudK(Ks) && !/сцена не та/.test(sudK(Ks)) ? '' : 'не заметил'); }
  srv.close(); process.exit(bad ? 1 : 0); })();
