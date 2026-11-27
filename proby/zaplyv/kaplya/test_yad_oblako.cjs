// Сторож облака яда «Капли» (урок L090): node proby/zaplyv/kaplya/test_yad_oblako.cjs. Провал — код 1.
// Повтор bac846d (тред проверки 27.11): «Нажал: моя клетка вспыхнула белым, и я сам себя потерял на экране». Должно: «зелёное облако заполняет круг
// до кольца досягаемости, своя клетка видна». В живой игре 390×844 держим «Яд» 1,5 с игры и считаем пиксели кадра: у клетки нет белой засветки,
// между оболочкой и кольцом — зелень. Самопроверка: со старым облаком (window.kaplyaStaroeOblako, сложение поверх клетки) сторож краснеет.
const http = require('http'), fs = require('fs'), path = require('path');
const KOREN = path.resolve(__dirname, '..'), TIP = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.mp3': 'audio/mpeg' };
let bad = 0; const check = (n, e) => { console.log((e ? '  ПРОВАЛ ' : '  ок ') + n + (e ? ': ' + e : '')); if (e) bad++; };
async function kadr(pw, port, staroe, plyvi) { const b = await pw.chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME, args: ['--no-sandbox'] } : {}), p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
  const errs = []; p.on('pageerror', e => errs.push(e.message)); if (staroe) await p.addInitScript(() => { window.kaplyaStaroeOblako = true; });
  await p.goto(`http://127.0.0.1:${port}/kaplya/`); await p.waitForFunction(() => window.zaplyvWorld && zaplyvWorld() && zaplyvWorld().me.length && zaplyvWorld().stats.time > 1, null, { timeout: 90000 });
  await p.evaluate(plyvi => { const w = zaplyvWorld(); w.choice = []; w.genes.toxin = 1; kaplyaYad().derzhu = true; if (plyvi) { const st = w.step.bind(w); w.step = (...r) => { const a = w.me[0]; if (a) { a.x += 2.5; a.vx = 150; a.vy = 0; } return st(...r); }; } }, !!plyvi); /* L101: плывёшь — облако идёт с клеткой */
  const t0 = await p.evaluate(() => zaplyvWorld().stats.time); await p.waitForFunction(t0 => { kaplyaYad().derzhu = true; kaplyaYad().zapas = 1; return zaplyvWorld().stats.time - t0 > 1.5; }, t0, { timeout: 90000 }); /* время игры: под нагрузкой игра медленнее часов */
  const g = await p.evaluate(() => { const w = zaplyvWorld(), a = w.me[0], [x, y] = zaplyvScr(a.vidX ?? a.x, a.vidY ?? a.y), [x2] = zaplyvScr(a.x + 1, a.y), k = x2 - x; return { x, y, k }; });
  const buf = await p.screenshot(); if (process.env.KADR) fs.writeFileSync(process.env.KADR + (staroe ? 's' : 'n') + (plyvi ? 'p' : '') + '.png', buf); const png = buf.toString('base64');
  const n = await p.evaluate(async ([src, g]) => { const im = new Image(); im.src = 'data:image/png;base64,' + src; await im.decode(); const c = document.createElement('canvas'); c.width = im.width; c.height = im.height; const x2 = c.getContext('2d'); x2.drawImage(im, 0, 0); const d = x2.getImageData(0, 0, c.width, c.height).data;
    const px = (x, y) => { const i = (Math.round(y) * c.width + Math.round(x)) * 4; return [d[i], d[i + 1], d[i + 2]]; }; let bel = 0, zel = 0, vsego = 0;
    for (let r = 0; r < 41; r += 2) for (let u = 0; u < 6.283; u += 0.1) { const [R, G, B] = px(g.x + Math.cos(u) * r, g.y + Math.sin(u) * r); if (r < 30 && R > 215 && G > 215 && B > 200) bel++; if (r >= 32) { vsego++; if (G > R + 25 && G > B + 10) zel++; } } /* в 30 пикселях — клетка, от 32 до 40 — облако до кольца (кольцо ~42 пикселя у клетки на старте) */
    return { bel, zel: zel / vsego }; }, [png, g]); await b.close(); return { n, errs }; }
(async () => {
  const srv = http.createServer((q, s) => { const f = path.join(KOREN, decodeURIComponent(q.url.split('?')[0])); const ff = fs.existsSync(f) && fs.statSync(f).isDirectory() ? path.join(f, 'index.html') : f;
    if (!ff.startsWith(KOREN) || !fs.existsSync(ff)) { s.writeHead(404); return s.end(); } s.writeHead(200, { 'Content-Type': TIP[path.extname(ff)] || 'application/octet-stream' }); fs.createReadStream(ff).pipe(s); }).listen(0);
  const pw = await import(process.env.PW || 'playwright').then(m => m.default || m), port = srv.address().port; 
  const nov = await kadr(pw, port, false), n = nov.n; const pl = (await kadr(pw, port, false, true)).n; console.log('  плывёшь: ' + JSON.stringify(pl)); console.log('  ' + JSON.stringify(n));
  check('test_L090 test_yad_oblako: держишь «Яд» — клетка без белой засветки, вокруг неё до кольца зелёное облако', nov.errs.join(' | ') || (n.bel > 10 ? `белых пикселей у клетки ${n.bel}` : n.zel < 0.3 ? `зелени между оболочкой и кольцом ${(n.zel * 100).toFixed(0)} % (нужно 30+, без облака вода бирюзовая — 0)` : ''));
  check('test_L101 test_yad_oblako_plyvi: плывёшь с зажатым «Яд» — облако на клетке, а не отстаёт пустым кольцом', pl.zel < 0.3 ? `зелени у клетки ${(pl.zel * 100).toFixed(0)} %` : pl.bel > 10 ? 'белая засветка' : '');
  if (!process.env.BEZ_SAMOPROVERKI) { const sp = (await kadr(pw, port, true, true)).n; console.log('  старое, плывёшь: ' + JSON.stringify(sp)); check('test_yad_oblako_plyvi_samoproverka: старое облако следом — сторож краснеет', sp.zel < 0.3 || sp.bel > 10 ? '' : 'не заметил'); }
  if (!process.env.BEZ_SAMOPROVERKI) { const s = (await kadr(pw, port, true)).n; console.log('  старое: ' + JSON.stringify(s)); check('test_yad_oblako_samoproverka: старое облако (сложение поверх клетки) — сторож краснеет', s.bel > 10 || s.zel < 0.3 ? '' : 'не заметил'); }
  srv.close(); process.exit(bad ? 1 : 0); })();
