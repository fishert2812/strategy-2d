// Сторож «поверх паузы и итога ничего из игры» «Капли» (урок L098): node proby/zaplyv/kaplya/test_verh.cjs. Провал — код 1.
// Повтор 57bdfc3 (тред проверки 27.11): «Кнопка "Яд" и столбик портретов лежат поверх паузы, "Генома" и итога»; «Карточка "Выбери умение" вылезает в бою поверх "Гибели"».
// Живая игра 390×844, взяты «Яд» и карточка на руках: открыта пауза — ни кнопки «Яд», ни карточки, ни столбика стаи не видно. Самопроверка (body.staryjVerh) краснеет.
const http = require('http'), fs = require('fs'), path = require('path');
const KOREN = path.resolve(__dirname, '..'), TIP = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.mp3': 'audio/mpeg' };
let bad = 0; const check = (n, e) => { console.log((e ? '  ПРОВАЛ ' : '  ок ') + n + (e ? ': ' + e : '')); if (e) bad++; };
const IDS = ['kyad', 'kmut', 'kten', 'kstT', 'offer', 'koleso'];
async function scena(pw, port, staroe) { const b = await pw.chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME, args: ['--no-sandbox'] } : {}), p = await b.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const errs = []; p.on('pageerror', e => errs.push(e.message)); if (staroe) await p.addInitScript(() => { addEventListener('DOMContentLoaded', () => document.body.classList.add('staryjVerh')); });
  await p.goto(`http://127.0.0.1:${port}/kaplya/`); await p.waitForFunction(() => window.zaplyvWorld && zaplyvWorld() && zaplyvWorld().me.length && zaplyvWorld().stats.time > 1, null, { timeout: 90000 });
  await p.evaluate(() => { const w = zaplyvWorld(); w.genes.toxin = 1; w.choice = []; }); await p.waitForTimeout(1500);
  const vidno = () => p.evaluate(IDS => IDS.filter(id => { const e = document.getElementById(id); if (!e) return false; const s = getComputedStyle(e), r = e.getBoundingClientRect(); return s.display !== 'none' && s.visibility !== 'hidden' && r.width > 0 && r.height > 0 && (id !== 'offer' || e.classList.contains('on')); }), IDS);
  const doPauzy = await vidno(); await p.evaluate(() => document.getElementById('pause').click()); await p.waitForTimeout(1200); const vPauze = await vidno();
  await b.close(); return { doPauzy, vPauze, errs }; }
const sud = R => !R.doPauzy.includes('kyad') ? 'кнопки «Яд» нет и в игре — сцена не та' : R.vPauze.length ? 'поверх паузы видно: ' + R.vPauze.join(', ') : '';
(async () => {
  const srv = http.createServer((q, s) => { const f = path.join(KOREN, decodeURIComponent(q.url.split('?')[0])); const ff = fs.existsSync(f) && fs.statSync(f).isDirectory() ? path.join(f, 'index.html') : f;
    if (!ff.startsWith(KOREN) || !fs.existsSync(ff)) { s.writeHead(404); return s.end(); } s.writeHead(200, { 'Content-Type': TIP[path.extname(ff)] || 'application/octet-stream' }); fs.createReadStream(ff).pipe(s); }).listen(0);
  const pw = await import(process.env.PW || 'playwright').then(m => m.default || m), port = srv.address().port;
  const R = await scena(pw, port, false); console.log('  ' + JSON.stringify(R));
  check('test_L098 test_verh: открыта пауза — кнопки «Яд», карточки и столбиков игры поверх не видно', R.errs.join(' | ') || sud(R));
  if (!process.env.BEZ_SAMOPROVERKI) { const S = await scena(pw, port, true); console.log('  старое: ' + JSON.stringify(S)); check('test_verh_samoproverka: старое (Яд поверх паузы) — сторож краснеет', sud(S) ? '' : 'не заметил'); }
  srv.close(); process.exit(bad ? 1 : 0); })();
