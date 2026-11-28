// Сторож «дуги и кольца сплошные, не пунктир» «Капли» (урок L129): node proby/zaplyv/kaplya/test_sploshno.cjs. Провал — код 1.
// Правило Романа: «пунктир, точки, схемы вместо живого — провал». Тред постов на b44b767: здоровье раненой палочки красной дугой из точек, кольцо досягаемости яда пунктиром,
// кольцо вокруг клетки с ядом из бусин; тред проверки: «пиксельный белый щит», «кольцо досягаемости пунктиром… Показывай светом на самой цели».
// Должно: 390×844, держишь «Яд» у кокка — кольцо яда и дуга здоровья кокка рисуются точками чаще половины своей толщины (сплошная линия); значок щита 🛡 не показывается.
// Самопроверка: window.kaplyaStaryePunktiry — сторож краснеет. Кадры пишет в KADR, если задан.
const http = require('http'), fs = require('fs'), path = require('path');
const KOREN = path.resolve(__dirname, '..'), TIP = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.mp3': 'audio/mpeg' };
let bad = 0; const check = (n, e) => { console.log((e ? '  ПРОВАЛ ' : '  ок ') + n + (e ? ': ' + e : '')); if (e) bad++; };
async function scena(pw, port, staroe) { const b = await pw.chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME, args: ['--no-sandbox'] } : {});
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }), p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message)); if (staroe) await p.addInitScript(() => { window.kaplyaStaryePunktiry = true; });
  await p.goto(`http://127.0.0.1:${port}/kaplya/`); await p.waitForFunction(() => window.zaplyvWorld && zaplyvWorld() && zaplyvWorld().me.length && zaplyvWorld().stats.time > 1, null, { timeout: 90000 });
  await p.evaluate(() => { const w = zaplyvWorld(), a = w.me[0]; setInterval(() => { w.choice = []; const M = window.kaplyaMut && kaplyaMut(); if (M) M.vopros = null; for (const k of ['amoebas', 'bells', 'slippers', 'rotis', 'bdellos', 'phages', 'bodos']) if (w[k]) w[k].length = 0; }, 30); w.prey.length = 0; w.prey.push({ x: a.x + 36, y: a.y - 8, vx: 0, vy: 0, m: 2.8 * a.m, a: 0, id: ++w.ids }); });
  const g = await p.evaluate(() => { const s = document.querySelector('#kyad .kyad-slovo').getBoundingClientRect(); return [s.x + s.width / 2, s.y + s.height / 2]; });
  const c = await ctx.newCDPSession(p); await c.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: g[0], y: g[1], id: 1 }] });
  const t0 = await p.evaluate(() => zaplyvWorld().stats.time); await p.waitForFunction(t0 => zaplyvWorld().stats.time - t0 > 1.2, t0, { timeout: 90000 }); await p.evaluate(() => { window.kaplyaLukShag = 0; }); await p.waitForTimeout(400);
  if (process.env.KADR) await p.screenshot({ path: process.env.KADR + (staroe ? 's' : 'n') + '.png' });
  const R = await p.evaluate(() => { const e = document.getElementById('kshit'); return { shag: +(window.kaplyaLukShag || 0).toFixed(2), shit: !!e && getComputedStyle(e).display !== 'none', zdorove: (zaplyvWorld().prey[0] && zaplyvWorld().prey[0].gn) ? +zaplyvWorld().prey[0].gn.f.toFixed(2) : 1 }; });
  await b.close(); return { ...R, errs }; }
const sud = R => !R.shag ? 'дуг и колец не рисовалось — сцена не та' : R.zdorove >= 1 ? 'кокк не ранен — дуги здоровья нет, сцена не та' : R.shag > 0.5 ? `точки дуги идут через ${R.shag} толщины — пунктир` : R.shit ? 'значок щита 🛡 на экране' : '';
(async () => {
  const srv = http.createServer((q, s) => { const f = path.join(KOREN, decodeURIComponent(q.url.split('?')[0])); const ff = fs.existsSync(f) && fs.statSync(f).isDirectory() ? path.join(f, 'index.html') : f;
    if (!ff.startsWith(KOREN) || !fs.existsSync(ff)) { s.writeHead(404); return s.end(); } s.writeHead(200, { 'Content-Type': TIP[path.extname(ff)] || 'application/octet-stream' }); fs.createReadStream(ff).pipe(s); }).listen(0);
  const pw = await import(process.env.PW || 'playwright').then(m => m.default || m), port = srv.address().port;
  const R = await scena(pw, port, false); console.log('  ' + JSON.stringify(R));
  check('test_L129 test_sploshno: кольцо яда и дуга здоровья — сплошная линия, значка щита нет', R.errs.join(' | ') || sud(R));
  if (!process.env.BEZ_SAMOPROVERKI) { const S = await scena(pw, port, true); console.log('  старое: ' + JSON.stringify(S)); check('test_sploshno_samoproverka: прежний пунктир — сторож краснеет', sud(S) && !/сцена не та/.test(sud(S)) ? '' : 'не заметил'); }
  srv.close(); process.exit(bad ? 1 : 0); })();
