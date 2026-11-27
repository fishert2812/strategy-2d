// Сторож «яд в обычном заплыве убивает пальцем» «Капли» (урок L123): node proby/zaplyv/kaplya/test_yad_partiya.cjs. Провал — код 1.
// Координатор 27.11 21:47: «Тред проверки на e5136e4 за 4 заплыва не получил яд ни в одной карточке, а на 06d0e96 кокк не лопнул ни разу из 5 попыток».
// Роман 27.11: «Яд так не починили здоровье не отнимает анимация яда просто никакая… старые ошибки просто никто не исправляет».
// Должно: обычный адрес без меток, 390×844, ничего не подкладываем в гены — на первой секунде кнопка «Яд» на экране; рядом живой кокк крупнее тебя,
// он не прижат и плывёт сам; один палец ведёт клетку к нему, второй держит «Яд» настоящим касанием — кокк умирает от яда, ты жив.
// Самопроверка: window.kaplyaYadKartoy (яд только из карточки, как было) — сторож краснеет.
const http = require('http'), fs = require('fs'), path = require('path');
const KOREN = path.resolve(__dirname, '..'), TIP = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.mp3': 'audio/mpeg' };
let bad = 0; const check = (n, e) => { console.log((e ? '  ПРОВАЛ ' : '  ок ') + n + (e ? ': ' + e : '')); if (e) bad++; };
async function scena(pw, port, staroe) { const b = await pw.chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME, args: ['--no-sandbox'] } : {});
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }), p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message)); if (staroe) await p.addInitScript(() => { window.kaplyaYadKartoy = true; });
  await p.goto(`http://127.0.0.1:${port}/kaplya/`); await p.waitForFunction(() => window.zaplyvWorld && zaplyvWorld() && zaplyvWorld().me.length && zaplyvWorld().stats.time > 1, null, { timeout: 90000 });
  const nachalo = await p.evaluate(() => { const k = document.getElementById('kyad'), r = k ? k.getBoundingClientRect() : null; return { gen: !!zaplyvWorld().genes.toxin, knopka: !!r && getComputedStyle(k).display !== 'none' && r.width > 20 && r.top < innerHeight }; });
  if (!nachalo.knopka) { await b.close(); return { nachalo, errs }; }
  await p.evaluate(() => { const w = zaplyvWorld(), a = w.me[0]; setInterval(() => { w.choice = []; const M = window.kaplyaMut && kaplyaMut(); if (M) M.vopros = null; for (const k of ['amoebas', 'bells', 'slippers', 'rotis', 'bdellos', 'phages', 'bodos']) if (w[k]) w[k].length = 0; }, 30);
    const q = { x: a.x + 70, y: a.y - 20, vx: 0, vy: 0, m: 1.5 * a.m, a: 0, id: ++w.ids }; w.prey.push(q); window.YQ = { q, t0: w.stats.time }; }); /* живой кокк крупнее тебя, плывёт сам */
  const g = await p.evaluate(() => { const s = document.querySelector('#kyad .kyad-slovo').getBoundingClientRect(); return [s.x + s.width / 2, s.y + s.height / 2]; });
  const c = await ctx.newCDPSession(p), T = (type, touchPoints) => c.send('Input.dispatchTouchEvent', { type, touchPoints }), C0 = [150, 640];
  await T('touchStart', [{ x: C0[0], y: C0[1], id: 1 }]); await p.waitForTimeout(100); await T('touchStart', [{ x: C0[0], y: C0[1], id: 1 }, { x: g[0], y: g[1], id: 2 }]);
  let R = null; for (let i = 0; i < 400; i++) { R = await p.evaluate(() => { const w = zaplyvWorld(), a = w.me[0], q = YQ.q; const smert = q.gone || (w.trupy || []).some(t => t.q === q);
      const out = { id: a && a.id, qm: +q.m.toFixed(2), zhiv: !!a, lopnul: smert, t: +(w.stats.time - YQ.t0).toFixed(1), derzhu: kaplyaYad().derzhu }; if (a && !smert) { const dx = q.x - a.x, dy = q.y - a.y, n = Math.hypot(dx, dy) || 1; out.dir = [dx / n, dy / n]; out.d = Math.round(n); } return out; });
    if (!R.zhiv || R.lopnul || R.t > 12) break; await T('touchMove', [{ x: C0[0] + R.dir[0] * 50, y: C0[1] + R.dir[1] * 50, id: 1 }, { x: g[0], y: g[1], id: 2 }]); await p.waitForTimeout(120); }
  await T('touchEnd', []); await b.close(); return { nachalo, ...R, errs }; }
const sud = R => !R.nachalo.gen ? 'в обычном заплыве гена яда нет на первой секунде' : !R.nachalo.knopka ? 'кнопки «Яд» нет на экране' : !R.derzhu && !R.lopnul ? 'палец на «Яд» — яд не держится' : !R.lopnul ? (R.zhiv ? 'кокк жив после ' + R.t + ' с игры с зажатым «Ядом»' : 'кокк съел тебя за ' + R.t + ' с, яд не успел') : !R.zhiv ? 'кокк умер, но и тебя съели' : '';
(async () => {
  const srv = http.createServer((q, s) => { const f = path.join(KOREN, decodeURIComponent(q.url.split('?')[0])); const ff = fs.existsSync(f) && fs.statSync(f).isDirectory() ? path.join(f, 'index.html') : f;
    if (!ff.startsWith(KOREN) || !fs.existsSync(ff)) { s.writeHead(404); return s.end(); } s.writeHead(200, { 'Content-Type': TIP[path.extname(ff)] || 'application/octet-stream' }); fs.createReadStream(ff).pipe(s); }).listen(0);
  const pw = await import(process.env.PW || 'playwright').then(m => m.default || m), port = srv.address().port;
  let R = await scena(pw, port, false); console.log('  ' + JSON.stringify(R)); if (sud(R) && R.nachalo.knopka) { R = await scena(pw, port, false); console.log('  вторая попытка: ' + JSON.stringify(R)); } /* живой кокк плывёт сам: раз из ~10 он уходит из кольца — вторая попытка; старое без кнопки краснеет в обеих */
  check('test_L123 test_yad_partiya: обычный заплыв — «Яд» с первой секунды, живой кокк крупнее тебя умирает от яда под пальцем, ты жив', R.errs.join(' | ') || sud(R));
  if (!process.env.BEZ_SAMOPROVERKI) { const S = await scena(pw, port, true); console.log('  старое: ' + JSON.stringify(S)); check('test_yad_partiya_samoproverka: яд только из карточки — сторож краснеет', sud(S) ? '' : 'не заметил'); }
  srv.close(); process.exit(bad ? 1 : 0); })();
