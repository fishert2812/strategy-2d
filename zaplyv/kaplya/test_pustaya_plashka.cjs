// Сторож урока L160 «Капли»: node proby/zaplyv/kaplya/test_pustaya_plashka.cjs. Провал — код 1.
// Живая партия 28.11 (main + #564, экран 393×852): над джойстиком с первой секунды висит тёмный мазок 20×6 — пустая плашка строки стаи (#kstT.plashka без текста).
// test_L160 test_pustaya_plashka: пока в строке стаи нет слов, её плашки на экране нет (нулевая площадь или прозрачный фон). Самопроверка: body.staraPustayaPlashka (прежний стиль) — сторож краснеет.
const http = require('http'), fs = require('fs'), path = require('path');
const KOREN = path.resolve(__dirname, '..'), TIP = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.mp3': 'audio/mpeg' };
let bad = 0; const check = (n, e) => { console.log((e ? '  ПРОВАЛ ' : '  ок ') + n + (e ? ': ' + e : '')); if (e) bad++; };
async function scena(pw, port, staroe) { const b = await pw.chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME, args: ['--no-sandbox'] } : {}), p = await b.newPage({ viewport: { width: 393, height: 852 }, isMobile: true, hasTouch: true });
  const errs = []; p.on('pageerror', e => errs.push(e.message)); if (staroe) await p.addInitScript(() => { addEventListener('DOMContentLoaded', () => document.body.classList.add('staraPustayaPlashka')); });
  await p.goto(`http://127.0.0.1:${port}/kaplya/`); await p.waitForFunction(() => window.zaplyvWorld && zaplyvWorld() && zaplyvWorld().me.length && zaplyvWorld().stats.time > 1 && document.getElementById('kstT'), null, { timeout: 90000 });
  const R = await p.evaluate(() => { const e = document.getElementById('kstT'), r = e.getBoundingClientRect(), s = getComputedStyle(e), a = (s.backgroundColor.match(/rgba\(.*,\s*([\d.]+)\)/) || [0, s.backgroundColor === 'transparent' ? 0 : 1])[1];
    return { ekran: innerWidth + '×' + innerHeight, t: +zaplyvWorld().stats.time.toFixed(1), staya: (zaplyvWorld().staya || []).length, tekst: e.textContent, plashka: e.classList.contains('plashka'), w: Math.round(r.width), h: Math.round(r.height), fon: +a, vidna: s.visibility !== 'hidden' && s.display !== 'none' }; });
  await b.close(); return { ...R, errs }; }
const sud = R => R.tekst ? 'в строке стаи уже слова («' + R.tekst + '») — сцена не та' : !R.plashka ? 'у строки стаи нет плашки — сцена не та' : R.vidna && R.w * R.h > 0 && R.fon > 0.05 ? `пустая плашка ${R.w}×${R.h} с фоном ${R.fon} висит на экране` : '';
(async () => {
  const srv = http.createServer((q, s) => { const f = path.join(KOREN, decodeURIComponent(q.url.split('?')[0])); const ff = fs.existsSync(f) && fs.statSync(f).isDirectory() ? path.join(f, 'index.html') : f;
    if (!ff.startsWith(KOREN) || !fs.existsSync(ff)) { s.writeHead(404); return s.end(); } s.writeHead(200, { 'Content-Type': TIP[path.extname(ff)] || 'application/octet-stream' }); fs.createReadStream(ff).pipe(s); }).listen(0);
  const pw = await import(process.env.PW || 'playwright').then(m => m.default || m), port = srv.address().port;
  const R = await scena(pw, port, false); console.log('  паспорт: заказано 393×852, старт партии, стая пуста; получилось ' + JSON.stringify(R));
  check('test_L160 test_pustaya_plashka: пустая строка стаи не оставляет тёмного мазка над джойстиком', R.errs.join(' | ') || sud(R));
  if (!process.env.BEZ_SAMOPROVERKI) { const S = await scena(pw, port, true); console.log('  старое: ' + JSON.stringify(S)); check('test_L160_samoproverka: прежний стиль (плашка с отступами и фоном без слов) — сторож краснеет', sud(S) && !/сцена не та/.test(sud(S)) ? '' : 'не заметил: ' + sud(S)); }
  srv.close(); process.exit(bad ? 1 : 0); })();
