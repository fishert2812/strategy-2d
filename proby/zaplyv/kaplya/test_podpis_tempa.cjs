// Сторож подписи темпа рода «Капли» (урок L093): node proby/zaplyv/kaplya/test_podpis_tempa.cjs. Провал — код 1.
// Повтор bac846d (тред проверки 27.11): «"каждые 14 с", "каждые 7 с", "стая полная" лежат прямо под клеткой и едут вместе с ней»; «Подпись перенести к полоске сверху».
// L094: «Карточка "Выбери умение" легла поверх плашки "Порция набрана"» — пока карточка на экране, плашку не видно.
// Живая игра 390×844: подпись видна, стоит в верхних 120 пикселях и не задевает круг клетки. Самопроверка: старая подпись (window.kaplyaStaryTempNaKletke) краснеет.
const http = require('http'), fs = require('fs'), path = require('path');
const KOREN = path.resolve(__dirname, '..'), TIP = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.mp3': 'audio/mpeg' };
let bad = 0; const check = (n, e) => { console.log((e ? '  ПРОВАЛ ' : '  ок ') + n + (e ? ': ' + e : '')); if (e) bad++; };
async function scena(pw, port, staroe) { const b = await pw.chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME, args: ['--no-sandbox'] } : {}), p = await b.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const errs = []; p.on('pageerror', e => errs.push(e.message)); if (staroe) await p.addInitScript(() => { window.kaplyaStaryTempNaKletke = true; addEventListener('DOMContentLoaded', () => document.body.classList.add('staraPlashka')); });
  await p.goto(`http://127.0.0.1:${port}/kaplya/`); await p.waitForFunction(() => window.zaplyvWorld && zaplyvWorld() && zaplyvWorld().me.length && zaplyvWorld().stats.time > 1, null, { timeout: 90000 });
  await p.evaluate(() => { kaplyaStaya().T = 14; }); const t0 = await p.evaluate(() => zaplyvWorld().stats.time); await p.waitForFunction(t0 => { kaplyaStaya().T = 14; return zaplyvWorld().stats.time - t0 > 0.5; }, t0, { timeout: 90000 });
  const R = await p.evaluate(() => { const L = document.getElementById('kstT'), a = zaplyvWorld().me[0], [x, y] = zaplyvScr(a.x, a.y), [x2] = zaplyvScr(a.x + 1, a.y), r = (x2 - x) * Math.cbrt(a.m) * 12; const b = L ? L.getBoundingClientRect() : null;
    return { tx: L && L.textContent, b: b && { l: b.left, t: b.top, r: b.right, n: b.bottom }, vid: !!L && L.style.display !== 'none', kl: { x, y } }; }); await p.evaluate(() => kaplyaSay('Порция набрана: сзади вытягивается капелька', 4000)); await p.evaluate(() => { zaplyvWorld().choice = ['magnet', 'kusalka']; }); await p.waitForFunction(() => document.getElementById('offer').classList.contains('on'), null, { timeout: 30000 });
  R.plashka = await p.evaluate(() => { const T = document.getElementById('toast'); return T.classList.contains('on') && getComputedStyle(T).visibility !== 'hidden'; }); /* L094: карточка и плашка разом */ await b.close(); R.errs = errs; return R; }
const sud = R => !R.vid || !R.tx ? 'подписи нет' : R.b.t > 120 ? `подпись на высоте ${R.b.t.toFixed(0)} — не у полосок сверху` : R.b.n > R.kl.y - 40 && R.b.t < R.kl.y + 40 && R.b.l < R.kl.x + 40 && R.b.r > R.kl.x - 40 ? 'подпись лежит на клетке' : '';
(async () => {
  const srv = http.createServer((q, s) => { const f = path.join(KOREN, decodeURIComponent(q.url.split('?')[0])); const ff = fs.existsSync(f) && fs.statSync(f).isDirectory() ? path.join(f, 'index.html') : f;
    if (!ff.startsWith(KOREN) || !fs.existsSync(ff)) { s.writeHead(404); return s.end(); } s.writeHead(200, { 'Content-Type': TIP[path.extname(ff)] || 'application/octet-stream' }); fs.createReadStream(ff).pipe(s); }).listen(0);
  const pw = await import(process.env.PW || 'playwright').then(m => m.default || m), port = srv.address().port;
  const R = await scena(pw, port, false); console.log('  ' + JSON.stringify(R));
  check('test_L093 test_podpis_tempa: «каждые N с» стоит сверху у полосок, не на клетке', R.errs.join(' | ') || sud(R));
  check('test_L094 test_karta_nad_plashkoy: пришла карточка выбора — плашки поверх неё не видно', R.plashka ? 'плашка видна вместе с карточкой' : '');
  if (!process.env.BEZ_SAMOPROVERKI) { const S = await scena(pw, port, true); console.log('  старое: ' + JSON.stringify(S)); check('test_podpis_tempa_samoproverka: старая подпись под клеткой — сторож краснеет', sud(S) ? '' : 'не заметил'); check('test_karta_nad_plashkoy_samoproverka: старая плашка поверх карточки — сторож краснеет', S.plashka ? '' : 'не заметил'); }
  srv.close(); process.exit(bad ? 1 : 0); })();
