// Сторож «кнопка „Яд“ видна, а не чёрный пустой круг» «Капли» (урок L132): node proby/zaplyv/kaplya/test_knopka_yad.cjs. Провал — код 1.
// Снимок Романа IMG_0950 (b44b767): кнопка «Яд» — чёрный пустой круг. Причина: пустой запас гасил кнопку до 0.35, палочка мелкая на тёмном.
// L131 (переигровка b44b767: «у полосы нет подложки», «жители рисуются поверх ⏸, колонки портретов, спирали и подписи версии»): верх и низ экрана под тёмной подложкой, надписи над ней.
// Должно: 390×844, подложка верха и низа есть, ⏸ и полоса выше неё; палочка на кнопке увеличена (scale ≥ 1.4); при пустом запасе кнопка не тусклее 0.7 и подписана «копится».
// Самопроверка: window.kaplyaStarayaKnopkaYad и kaplyaStarayaPodlozhka — сторож краснеет.
const http = require('http'), fs = require('fs'), path = require('path');
const KOREN = path.resolve(__dirname, '..'), TIP = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.mp3': 'audio/mpeg' };
let bad = 0; const check = (n, e) => { console.log((e ? '  ПРОВАЛ ' : '  ок ') + n + (e ? ': ' + e : '')); if (e) bad++; };
async function scena(pw, port, staroe) { const b = await pw.chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME, args: ['--no-sandbox'] } : {});
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }), p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message)); if (staroe) await p.addInitScript(() => { window.kaplyaStarayaKnopkaYad = true; window.kaplyaStarayaPodlozhka = true; });
  await p.goto(`http://127.0.0.1:${port}/kaplya/`); await p.waitForFunction(() => window.zaplyvWorld && zaplyvWorld() && zaplyvWorld().me.length && zaplyvWorld().stats.time > 1, null, { timeout: 90000 });
  const R = await p.evaluate(() => new Promise(ok => { const b = document.getElementById('kyad'), im = b.querySelector('img'); const m = new DOMMatrix(getComputedStyle(im).transform === 'none' ? '' : getComputedStyle(im).transform);
    b.classList.add('derzhu'); const svet = parseFloat((getComputedStyle(b).boxShadow.match(/[\d.]+px/g) || [])[2] || 0) >= 20; b.classList.remove('derzhu'); let min = 1, kop = false; const t = setInterval(() => { kaplyaYad().zapas = 0; }, 2); const f = () => { kaplyaYad().zapas = 0; const o = +getComputedStyle(b).opacity; if (b.style.display !== 'none') { min = Math.min(min, o); kop = kop || b.classList.contains('pusto'); } };
    const r = setInterval(f, 5); setTimeout(() => { clearInterval(t); clearInterval(r); const pv = getComputedStyle(document.body, '::before'), pn = getComputedStyle(document.body, '::after'), z = +getComputedStyle(document.getElementById('hud')).zIndex || 0; ok({ svet, podl: pv.backgroundImage !== 'none' && pn.backgroundImage !== 'none' && z > 1, vid: b.style.display !== 'none', krupno: +m.a.toFixed(2), tusklo: +min.toFixed(2), kopitsya: kop }); }, 2500); }));
  await b.close(); return { ...R, errs }; }
const sud = R => !R.podl ? 'нет тёмной подложки верха и низа — жители поверх полосы и подписей' : !R.vid ? 'кнопки «Яд» нет — сцена не та' : R.krupno < 1.4 ? `палочка мелкая (×${R.krupno})` : R.tusklo < 0.7 ? `пустая кнопка гаснет до ${R.tusklo} — чёрный круг` : !R.kopitsya ? 'пустая кнопка не подписана «копится»' : !R.svet ? 'нажатая кнопка не вспыхивает' : '';
(async () => {
  const srv = http.createServer((q, s) => { const f = path.join(KOREN, decodeURIComponent(q.url.split('?')[0])); const ff = fs.existsSync(f) && fs.statSync(f).isDirectory() ? path.join(f, 'index.html') : f;
    if (!ff.startsWith(KOREN) || !fs.existsSync(ff)) { s.writeHead(404); return s.end(); } s.writeHead(200, { 'Content-Type': TIP[path.extname(ff)] || 'application/octet-stream' }); fs.createReadStream(ff).pipe(s); }).listen(0);
  const pw = await import(process.env.PW || 'playwright').then(m => m.default || m), port = srv.address().port;
  const R = await scena(pw, port, false); console.log('  ' + JSON.stringify(R));
  check('test_L132 test_knopka_yad: кнопка «Яд» крупная и видна при пустом запасе', R.errs.join(' | ') || sud(R));
  if (!process.env.BEZ_SAMOPROVERKI) { const S = await scena(pw, port, true); console.log('  старое: ' + JSON.stringify(S)); check('test_knopka_yad_samoproverka: прежний чёрный круг — сторож краснеет', sud(S) && !/сцена не та/.test(sud(S)) ? '' : 'не заметил'); }
  srv.close(); process.exit(bad ? 1 : 0); })();
