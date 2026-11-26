// Сторож мигания «Заплыва»: node tools/web/test_miganie.cjs (образец — сторож «Капли», PR 390). Провал — код 1.
// Роман 26.11: «Почему экран мигает? Что за проблема такая!?» Причина была в снимке для Альманаха: он рисуется на холсте игры, и если делался
// вне кадра (встреча существа, карточка), телефон на кадр показывал студию с одним существом. Сторож каждый кадр читает весь холст
// и ищет кадр, который резко ярче или темнее соседей с обеих сторон (вспышка или чёрный кадр). Самопроверка: снимок без защиты сторож обязан поймать.
const { chromium } = require(process.env.PW || 'playwright'), http = require('http'), fs = require('fs'), path = require('path');
const KOREN = path.resolve(__dirname, '../../proby/zaplyv'), TIP = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.mp3': 'audio/mpeg' };
const PROVAL = 12; // насколько средняя яркость кадра (0–765) отличается от обоих соседей, чтобы считаться миганием
// Ищет одиночные выбросы: кадр отличается от предыдущего и следующего в одну сторону больше чем на PROVAL
const vybrosy = r => r.map((v, i) => i && i < r.length - 1 && ((v - r[i - 1] > PROVAL && v - r[i + 1] > PROVAL) || (r[i - 1] - v > PROVAL && r[i + 1] - v > PROVAL)) ? i : -1).filter(i => i >= 0);
let bad = 0; const check = (n, e) => { console.log((e ? '  ПРОВАЛ ' : '  ок ') + n + (e ? ': ' + e : '')); if (e) bad++; };
check('test_miganie_storozh_vidit: сторож ловит придуманную вспышку и чёрный кадр', vybrosy([100, 101, 140, 100, 99, 10, 98, 99, 100]).join() === '2,5' && !vybrosy([100, 105, 110, 115, 120]).length ? '' : 'сторож не видит выброс или видит его на ровном росте');
(async () => {
  const srv = http.createServer((q, s) => { const f = path.join(KOREN, decodeURIComponent(q.url.split('?')[0])); const ff = fs.existsSync(f) && fs.statSync(f).isDirectory() ? path.join(f, 'index.html') : f;
    if (!ff.startsWith(KOREN) || !fs.existsSync(ff)) { s.writeHead(404); return s.end(); } s.writeHead(200, { 'Content-Type': TIP[path.extname(ff)] || 'application/octet-stream' }); fs.createReadStream(ff).pipe(s); }).listen(0);
  const b = await chromium.launch(), p = await b.newPage({ viewport: { width: 393, height: 852 }, isMobile: true, hasTouch: true });
  await p.addInitScript(() => { const g = HTMLCanvasElement.prototype.getContext; HTMLCanvasElement.prototype.getContext = function (t, o) { if (t === 'webgl' || t === 'webgl2') o = { ...(o || {}), preserveDrawingBuffer: true }; return g.call(this, t, o); };
    window.__ryad = []; window.__zapis = false; const tick = () => { const c = document.querySelector('canvas'); if (window.__zapis && c) { const gl = c.getContext('webgl2') || c.getContext('webgl'), W = c.width, H = c.height, px = new Uint8Array(4 * W * H); gl.readPixels(0, 0, W, H, gl.RGBA, gl.UNSIGNED_BYTE, px);
      let s = 0, n = 0; for (let i = 0; i < px.length; i += 28) { s += px[i] + px[i + 1] + px[i + 2]; n++; } window.__ryad.push(s / n); } requestAnimationFrame(tick); }; requestAnimationFrame(tick); });
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('response', r => r.status() >= 400 && process.env.DBG && console.log(r.status(), r.url())); p.on('console', m => process.env.DBG && console.log(m.text()));
  await p.goto(`http://127.0.0.1:${srv.address().port}/`); await p.waitForFunction(() => window.zaplyvWorld && zaplyvWorld() && zaplyvWorld().stats.time > 2, null, { timeout: 90000 });
  const zapis = async (bez) => { await p.evaluate(() => { window.__ryad = []; window.__zapis = true; }); // снимки вне кадра, как при встрече существа: по таймеру
    await p.evaluate(bez => { for (let i = 0; i < 6; i++) setTimeout(() => window.zaplyvSnimok(['coccus', 'amoeba', 'bell', 'phage', 'roti', 'slipper'][i], bez), 250 + i * 400); }, bez);
    await p.waitForTimeout(3200); return p.evaluate(() => { window.__zapis = false; return window.__ryad; }); };
  const s = await zapis(false), v = vybrosy(s);
  check('test_miganie_net: шесть снимков Альманаха во время игры, экран не мигает', s.length < 10 ? `записано кадров ${s.length}` : v.length ? `мигнуло ${v.length} раз: ${v.map(i => s[i - 1].toFixed(0) + '→' + s[i].toFixed(0) + '→' + s[i + 1].toFixed(0)).join(', ')}` : '');
  const s0 = await zapis(true), v0 = vybrosy(s0);
  check('test_miganie_samoproverka: снимок без защиты сторож ловит', v0.length ? '' : `без защиты мигания не видно (кадров ${s0.length}): сторож слепой`);
  check('test_miganie_oshibki: игра без ошибок', errs.length ? errs.join('; ') : '');
  await b.close(); srv.close(); process.exit(bad ? 1 : 0); })();
