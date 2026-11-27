// Сторож кадра поглощения амёбой «Капли» (урок L095): node proby/zaplyv/kaplya/test_puzyr.cjs. Провал — код 1.
// Повтор bac846d (тред проверки 27.11): «Стою, амёба наползает, и меня нет… Через 3 с картинка вдруг другая… Нечестно и непонятно». Должно: «кадр поглощения
// (клетка сжимается внутри амёбы)», «своя клетка видна сквозь амёбу». Живая игра 390×844: ты в пузыре амёбы — клетку видно в начале, к концу переваривания
// её на кадре заметно меньше. Самопроверка: без сжатия (window.kaplyaStaryPuzyr) сторож краснеет.
const http = require('http'), fs = require('fs'), path = require('path');
const KOREN = path.resolve(__dirname, '..'), TIP = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.mp3': 'audio/mpeg' };
const KAP = JSON.parse(fs.readFileSync(path.join(__dirname, 'kaplya.json')));
let bad = 0; const check = (n, e) => { console.log((e ? '  ПРОВАЛ ' : '  ок ') + n + (e ? ': ' + e : '')); if (e) bad++; };
async function scena(pw, port, staroe) { const b = await pw.chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME, args: ['--no-sandbox'] } : {}), p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
  const errs = []; p.on('pageerror', e => errs.push(e.message)); if (staroe) await p.addInitScript(() => { window.kaplyaStaryPuzyr = true; });
  await p.goto(`http://127.0.0.1:${port}/kaplya/`); await p.waitForFunction(() => window.zaplyvWorld && zaplyvWorld() && zaplyvWorld().me.length && zaplyvWorld().stats.time > 1, null, { timeout: 90000 });
  await p.evaluate(() => { const w = zaplyvWorld(), a = w.me[0]; w.choice = []; a.m = 1.5; for (const k of ['amoebas', 'bells', 'slippers', 'rotis', 'bdellos', 'phages', 'bodos', 'pseudos', 'parafizo']) if (w[k]) w[k].length = 0;
    let X = a.x, Y = a.y; for (let r = 300; r < 6000 && w.zonaGde(X, Y) !== 'zlaya'; r += 150) for (let u = 0; u < 6.283; u += 0.5) { const x = a.x + Math.cos(u) * r, y = a.y + Math.sin(u) * r; if (w.zonaGde(x, y) === 'zlaya') { X = x; Y = y; break; } } a.x = X; a.y = Y; a.vx = a.vy = 0; /* в тихой воде охотник отворачивает (zona.js): ловят в злой */ window.PZ0 = { X, Y }; });
  { const t0 = await p.evaluate(() => zaplyvWorld().stats.time); await p.waitForFunction(t0 => { const a = zaplyvWorld().me[0]; a.x = PZ0.X; a.y = PZ0.Y; a.vx = a.vy = 0; return zaplyvWorld().stats.time - t0 > 2.5; }, t0, { timeout: 90000 }); } /* камера доезжает */
  await p.evaluate(() => { const w = zaplyvWorld(), a = w.me[0], { X, Y } = PZ0; const q = { x: X, y: Y, vx: 0, vy: 0, m: 9, id: ++w.ids, ohv: { faza: 'puzyr', t: 0, kogo: a }, lovit: true }; w.amoebas.push(q); window.PZ = q; window.PZT = 0;
    const st = w.step.bind(w); w.step = (...r) => { q.x = X; q.y = Y; q.vx = q.vy = 0; if (q.ohv) { q.ohv.faza = 'puzyr'; q.ohv.t = window.PZT; } const v = st(...r); q.x = X; q.y = Y; if (q.ohv) q.ohv.t = window.PZT; return v; }; /* пузырь замер на доле PZT переваривания: кадр снимаем, пока он держится */ setInterval(() => { w.choice = []; }, 20); });
  const kadr = async T => { await p.evaluate(T => { window.PZT = T; }, T); { const t0 = await p.evaluate(() => zaplyvWorld().stats.time); await p.waitForFunction(t0 => zaplyvWorld().stats.time - t0 > 0.4, t0, { timeout: 90000 }); } if (await p.evaluate(() => !PZ.ohv || PZ.ohv.faza !== 'puzyr' || !zaplyvWorld().me.includes(PZ.ohv.kogo))) return -1;
    const [x, y] = await p.evaluate(() => zaplyvScr(PZ.x, PZ.y)), buf = await p.screenshot({ clip: { x: Math.round(x) - 60, y: Math.round(y) - 60, width: 120, height: 120 } }); if (process.env.KADR) fs.writeFileSync(process.env.KADR + (staroe ? "s" : "n") + T + ".png", buf); const png = buf.toString("base64");
    return p.evaluate(async src => { const im = new Image(); im.src = 'data:image/png;base64,' + src; await im.decode(); const c = document.createElement('canvas'); c.width = im.width; c.height = im.height; const g = c.getContext('2d'); g.drawImage(im, 0, 0);
      const d = g.getImageData(0, 0, c.width, c.height).data; let k = 0; for (let i = 0; i < d.length; i += 4) if (d[i] > 140 && d[i + 2] > 110 && d[i + 1] < 110 && d[i] - d[i + 1] > 60) k++; return k; }, png); }; /* розовое нутро твоей клетки, как в test_sloj */
  const nachalo = await kadr(0.15), konec = await kadr(KAP.ameba.perevar * 0.85); await b.close(); return { nachalo, konec, errs }; }
const sud = R => R.nachalo < 0 || R.konec < 0 ? 'пузырь кончился раньше кадра: ' + JSON.stringify(R) : R.nachalo < 40 ? `в пузыре клетку не видно (${R.nachalo} розовых точек)` : R.konec > R.nachalo * 0.7 ? `к концу переваривания клетка не сжалась: ${R.nachalo} → ${R.konec}` : '';
(async () => {
  const srv = http.createServer((q, s) => { const f = path.join(KOREN, decodeURIComponent(q.url.split('?')[0])); const ff = fs.existsSync(f) && fs.statSync(f).isDirectory() ? path.join(f, 'index.html') : f;
    if (!ff.startsWith(KOREN) || !fs.existsSync(ff)) { s.writeHead(404); return s.end(); } s.writeHead(200, { 'Content-Type': TIP[path.extname(ff)] || 'application/octet-stream' }); fs.createReadStream(ff).pipe(s); }).listen(0);
  const pw = await import(process.env.PW || 'playwright').then(m => m.default || m), port = srv.address().port;
  const R = await scena(pw, port, false); console.log('  ' + JSON.stringify(R));
  check('test_L095 test_puzyr: в пузыре амёбы клетку видно, к концу переваривания она заметно меньше', R.errs.join(' | ') || sud(R));
  if (!process.env.BEZ_SAMOPROVERKI) { const S = await scena(pw, port, true); console.log('  старое: ' + JSON.stringify(S)); check('test_puzyr_samoproverka: без сжатия — сторож краснеет', sud(S) ? '' : 'не заметил'); }
  srv.close(); process.exit(bad ? 1 : 0); })();
