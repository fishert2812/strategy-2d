// Сторож урока L082 «Капли»: node proby/zaplyv/kaplya/test_sloj.cjs. Пачка 2, Т7: «игрок прячется под анабену и туфельку»; Т4 — порядок слоёв.
// Объёмные тела жителей (body3d.js) по глубине закрывали твою клетку: заплыл на нить анабены — тебя не видно. Теперь клетка поднята над жителями на sloi.ty.
// test_L082 test_ty_poverh: в живой игре 390×844 стоишь на нити анабены — в середине кадра видна твоя розовая клетка (пикселей цвета клетки не меньше 60).
// Самопроверка: со старым слоем (window.kaplyaStaryjSloj) клетку не видно — сторож краснеет. Кадр: design/kadry/pochinki_ty_poverh_anabeny.png.
const http = require('http'), fs = require('fs'), path = require('path');
const KOREN = path.resolve(__dirname, '..'), TIP = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.mp3': 'audio/mpeg' };
let bad = 0; const check = (n, e) => { console.log((e ? '  ПРОВАЛ ' : '  ок ') + n + (e ? ': ' + e : '')); if (e) bad++; };
async function kadr(pw, port, stary) { const b = await pw.chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME, args: ['--no-sandbox'] } : {}), p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
  const errs = []; p.on('pageerror', e => errs.push(e.message)); if (stary) await p.addInitScript(() => { window.kaplyaStaryjSloj = true; });
  await p.goto(`http://127.0.0.1:${port}/kaplya/`); await p.waitForFunction(() => window.zaplyvWorld && zaplyvWorld() && zaplyvWorld().me.length && zaplyvWorld().stats.time > 0.5, null, { timeout: 90000 });
  await p.evaluate(() => { const w = zaplyvWorld(), a = w.me[0]; w.choice = []; for (const k of ['amoebas', 'bells', 'rotis', 'bdellos', 'phages', 'bodos', 'pseudos', 'slippers']) if (w[k]) w[k].length = 0;
    w.plants.push({ x: a.x, y: a.y, m: 30, id: ++w.ids, t: 0 }); setInterval(() => { const q = w.plants.at(-1); a.x = q.x; a.y = q.y; a.vx = a.vy = 0; }, 16); }); /* стоишь на нити анабены */
  await p.waitForTimeout(1500); const png = (await p.screenshot({ clip: { x: 145, y: 340, width: 100, height: 100 } })).toString('base64');
  const n = await p.evaluate(async src => { const im = new Image(); im.src = 'data:image/png;base64,' + src; await im.decode(); const c = document.createElement('canvas'); c.width = im.width; c.height = im.height; const g = c.getContext('2d'); g.drawImage(im, 0, 0);
    const d = g.getImageData(0, 0, c.width, c.height).data; let k = 0; for (let i = 0; i < d.length; i += 4) if (d[i] > 140 && d[i + 2] > 110 && d[i + 1] < 110 && d[i] - d[i + 1] > 60) k++; return k; }, png); /* розовое нутро твоей клетки */
  await b.close(); return { n, errs }; }
(async () => {
  const srv = http.createServer((q, s) => { const f = path.join(KOREN, decodeURIComponent(q.url.split('?')[0])); const ff = fs.existsSync(f) && fs.statSync(f).isDirectory() ? path.join(f, 'index.html') : f;
    if (!ff.startsWith(KOREN) || !fs.existsSync(ff)) { s.writeHead(404); return s.end(); } s.writeHead(200, { 'Content-Type': TIP[path.extname(ff)] || 'application/octet-stream' }); fs.createReadStream(ff).pipe(s); }).listen(0);
  const pw = await import(process.env.PW || 'playwright').then(m => m.default || m), port = srv.address().port;
  const R = await kadr(pw, port, false); console.log('  ' + JSON.stringify(R));
  check('test_L082 test_ty_poverh: стоишь на нити анабены — твоя клетка видна поверх неё (Т7)', R.n < 60 ? `видно ${R.n} точек клетки` : R.errs.join(' | '));
  if (!process.env.BEZ_SAMOPROVERKI) { const S = await kadr(pw, port, true); console.log('  старое: ' + JSON.stringify(S)); check('test_ty_poverh_samoproverka: старый слой (анабена закрывает клетку) — сторож краснеет', S.n < 60 ? '' : 'не заметил'); }
  srv.close(); process.exit(bad ? 1 : 0); })();
