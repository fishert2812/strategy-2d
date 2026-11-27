// Сторож «очаг чистится ядом и игра говорит как» «Капли» (урок L097): node proby/zaplyv/kaplya/test_ochag_yad.cjs. Провал — код 1.
// Повтор 57bdfc3 (тред проверки 27.11): «Касаюсь — щит, отскок. Жму "Яд" — белая вспышка на мне самом. Чистота только падает. Как чистить, я так и не понял».
// Должно: «палочку очага можно съесть или убить ядом». Живая игра 390×844, взят «Яд»: касаешься палочки без кнопки — строка говорит зажать «Яд»;
// зажал рядом — палочка гибнет. Самопроверка: без строки (window.kaplyaStaryOtkaz) сторож краснеет.
const http = require('http'), fs = require('fs'), path = require('path');
const KOREN = path.resolve(__dirname, '..'), TIP = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.mp3': 'audio/mpeg' };
const KAP = JSON.parse(fs.readFileSync(path.join(__dirname, 'kaplya.json'))), S = KAP.boj.otkaz_slova;
let bad = 0; const check = (n, e) => { console.log((e ? '  ПРОВАЛ ' : '  ок ') + n + (e ? ': ' + e : '')); if (e) bad++; };
async function scena(pw, port, staroe) { const b = await pw.chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME, args: ['--no-sandbox'] } : {}), p = await b.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const errs = []; p.on('pageerror', e => errs.push(e.message)); if (staroe === 'vkonce') await p.addInitScript(() => { window.kaplyaStaryOtkazVkonce = true; }); else if (staroe) await p.addInitScript(() => { window.kaplyaStaryOtkaz = true; });
  await p.goto(`http://127.0.0.1:${port}/kaplya/`); await p.waitForFunction(() => window.zaplyvWorld && zaplyvWorld() && zaplyvWorld().me.length && zaplyvWorld().stats.time > 1, null, { timeout: 90000 });
  const zhdi = async s => { const t0 = await p.evaluate(() => zaplyvWorld().stats.time); await p.waitForFunction(([t0, s]) => zaplyvWorld().stats.time - t0 > s, [t0, s], { timeout: 90000 }); };
  await p.evaluate(() => { const w = zaplyvWorld(), o = kaplyaChistka().oc.find(o => o.sila > 0); w.genes.toxin = 1; window.OC = { o, q: null, slova: [] }; const say0 = window.kaplyaSay;
    setInterval(() => { w.choice = []; const M = kaplyaMut(); if (M) M.vopros = null; const a = w.me[0]; if (!a) return; a.m = Math.max(a.m, 1.5); /* крупнее палочки: тронул живую мельче себя — щит */ const L = (w.sinegnoyki || []).filter(q => q.oc === o && !q.gone); if (!OC.q || OC.q.gone) OC.q = OC.q ? OC.q : L[0]; const q = OC.q;
      if (q && !q.gone) { a.x = q.x + 10; a.y = q.y; } else if (!q) { a.x = o.x + 40; a.y = o.y; } a.vx = a.vy = 0; const T = document.getElementById('toast').textContent; if (T && !OC.slova.includes(T)) OC.slova.push(T); }, 16); }); /* прижат к одной палочке очага */
  { const t0 = await p.evaluate(() => zaplyvWorld().stats.time); await p.waitForFunction(([t0, S]) => OC.slova.includes(S) || !zaplyvWorld().me.length || zaplyvWorld().stats.time - t0 > 8, [t0, S.zhivoe_yad], { timeout: 180000 }); } const slova = await p.evaluate(() => OC.slova); /* ждём строку до 8 с игры, а не 4: под нагрузкой палочки встают позже (тред слияний 27.11 17:44) */ await p.evaluate(() => { kaplyaYad().zapas = 1; setInterval(() => { kaplyaYad().derzhu = true; }, 16); }); await zhdi(5); /* L101: запас один полный, без подкачки — как у игрока (повтор 7481ab9: «цели в нём целы») */
  const R = await p.evaluate(() => ({ zhiv: zaplyvWorld().me.length > 0, killer: zaplyvWorld().stats.killer, est: !!OC.q, umerla: !!OC.q && (OC.q.gone || !zaplyvWorld().sinegnoyki.includes(OC.q) || OC.q.gn.f <= 0) })); await b.close(); return { ...R, slova, errs }; }
const sud = R => !R.est ? 'у очага нет палочек — сцена не та' : !R.slova.includes(S.zhivoe_yad) ? 'касание без кнопки молчит: ' + JSON.stringify(R.slova) : !R.umerla ? 'один полный запас «Яда» вплотную палочку не убил' : '';
(async () => {
  const srv = http.createServer((q, s) => { const f = path.join(KOREN, decodeURIComponent(q.url.split('?')[0])); const ff = fs.existsSync(f) && fs.statSync(f).isDirectory() ? path.join(f, 'index.html') : f;
    if (!ff.startsWith(KOREN) || !fs.existsSync(ff)) { s.writeHead(404); return s.end(); } s.writeHead(200, { 'Content-Type': TIP[path.extname(ff)] || 'application/octet-stream' }); fs.createReadStream(ff).pipe(s); }).listen(0);
  const pw = await import(process.env.PW || 'playwright').then(m => m.default || m), port = srv.address().port;
  const R = await scena(pw, port, false); console.log('  ' + JSON.stringify(R));
  check('test_L097 test_L115 test_ochag_yad: тронул палочку очага без кнопки — строка «зажми "Яд"»; зажал рядом — палочка гибнет', R.errs.join(' | ') || sud(R));
  if (!process.env.BEZ_SAMOPROVERKI) { const St = await scena(pw, port, true); console.log('  старое: ' + JSON.stringify(St)); check('test_ochag_yad_samoproverka: старое молчание у щита — сторож краснеет', sud(St) ? '' : 'не заметил'); }
  if (!process.env.BEZ_SAMOPROVERKI) { const Sv = await scena(pw, port, 'vkonce'); console.log('  в конце очереди: ' + JSON.stringify(Sv)); check('test_L115 test_ochag_yad_ochered_samoproverka: ответ на касание в конце очереди строк (за «Альманахом» и целью главы) — не успевает, сторож краснеет', sud(Sv) ? '' : 'не заметил'); }
  srv.close(); process.exit(bad ? 1 : 0); })();
