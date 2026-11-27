// Сквозная партия «Капли»: node proby/zaplyv/kaplya/test_partiya.cjs [секунд]. Провал — код 1.
// Урок 27.11 (Роман 20:43: «ты нахуевертил в игре без првоерок»): сторожа смотрели данные и функции, а не живую партию, и «Глотает целиком»
// приходил на 10-й секунде одной карточкой мимо лестницы питания, оружие не выпадало никогда. Здесь бот играет пальцем с первой секунды
// (джойстик к ближней еде, от хищника прочь; карточки берёт касанием, оружие первым) и проверяет то, что увидит игрок:
// test_partiya_kartochki — первая карточка до 40-й секунды, в каждой карточке до оружия больше одного варианта и среди них оружие;
// test_partiya_gulp_ne_rano — «Глотать» не предлагается, пока нет «Плотоядного»; test_partiya_oruzhie — оружие взято за партию;
// test_partiya_oshibki — ни одной ошибки страницы. Самопроверка: с window.kaplyaStarayaGlotat (старая выдача на 10-й секунде) сторож краснеет.
const http = require('http'), fs = require('fs'), path = require('path');
const KOREN = path.resolve(__dirname, '..'), TIP = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.mp3': 'audio/mpeg' };
const KAP = JSON.parse(fs.readFileSync(path.join(__dirname, 'kaplya.json'))), ORUZHIE = Object.keys(KAP.boj.oruzhie).filter(g => g !== '_'), SEK = +process.argv[2] || 75;
let bad = 0; const check = (n, e) => { console.log((e ? '  ПРОВАЛ ' : '  ок ') + n + (e ? ': ' + e : '')); if (e) bad++; };
const sud = P => { const pervaya = P.karty[0], doOruzhiya = P.karty.filter(k => k.t <= (P.oruzhieT ?? 1e9));
  return { kartochki: !pervaya ? 'за партию ни одной карточки' : pervaya.t > 40 ? `первая карточка на ${pervaya.t} с` : (doOruzhiya.find(k => k.v.length < 2 || !k.v.some(g => ORUZHIE.includes(g))) ? 'карточка без выбора или без оружия: ' + JSON.stringify(doOruzhiya.find(k => k.v.length < 2 || !k.v.some(g => ORUZHIE.includes(g)))) : ''),
    gulp: (P.karty.find(k => k.v.includes('gulp') && !k.plot) ? '«Глотать» в карточке без «Плотоядного»: ' + JSON.stringify(P.karty.find(k => k.v.includes('gulp') && !k.plot)) : '') || (P.gulpT != null && P.gulpT < (P.plotT ?? 1e9) ? `«Глотать» на теле с ${P.gulpT} с без «Плотоядного»` : ''),
    oruzhie: P.oruzhieT == null ? 'оружие за партию не пришло' : '' }; };
async function partiya(pw, port, staraya) { const b = await pw.chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME, args: ['--no-sandbox'] } : {}), p = await b.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const errs = []; p.on('pageerror', e => errs.push(e.message)); if (staraya) await p.addInitScript(() => { window.kaplyaStarayaGlotat = true; });
  await p.goto(`http://127.0.0.1:${port}/kaplya/`); await p.waitForFunction(() => window.zaplyvWorld && zaplyvWorld() && zaplyvWorld().me.length && zaplyvWorld().stats.time > 0.5, null, { timeout: 90000 });
  const P = { karty: [], oruzhieT: null, gulpT: null, plotT: null }, cx = 195, cy = 600; let derzhu = false, posled = '', posledS = null;
  for (let i = 0; i < SEK * 4; i++) { const s = await p.evaluate(O => { const w = zaplyvWorld(), a = w.me[0]; if (!a) return null; const d = q => Math.hypot(q.x - a.x, q.y - a.y), opas = [...(w.amoebas || []), ...(w.slippers || []), ...(w.bodos || [])].filter(q => d(q) < 260).sort((x, y) => d(x) - d(y))[0], eda = (w.food || []).filter(f => !f.gone).sort((x, y) => d(x) - d(y))[0];
      const k = opas ? [a.x - opas.x, a.y - opas.y] : eda ? [eda.x - a.x, eda.y - a.y] : [Math.cos(w.stats.time / 7), Math.sin(w.stats.time / 7)], n = Math.hypot(...k) || 1;
      return { m: +a.m.toFixed(2), syel: w.stats.eaten, t: w.stats.time, dir: [k[0] / n, k[1] / n], choice: w.choice.slice(), on: document.getElementById('offer').classList.contains('on'), genes: Object.keys(w.genes).filter(g => w.genes[g]) }; }, ORUZHIE);
    if (s) posledS = s; if (s && process.env.TRACE && i % 8 === 0) console.log('   ', s.t.toFixed(0), s.m, s.syel, s.choice.join());  if (!s) { if (derzhu) { await p.mouse.up(); derzhu = false; } await p.waitForTimeout(250); const zhiv = await p.evaluate(() => { const e = document.getElementById('end'); if (e && e.classList.contains('on')) { const b2 = [...e.querySelectorAll('button')].find(x => /Плыть снова/.test(x.textContent)); if (b2) b2.click(); } return !!(zaplyvWorld().me.length); }); continue; }
    if (s.genes.some(g => ORUZHIE.includes(g)) && P.oruzhieT == null) P.oruzhieT = +s.t.toFixed(1); if (s.genes.includes('gulp') && P.gulpT == null) P.gulpT = +s.t.toFixed(1); if (s.genes.includes('plotoyadnyy') && P.plotT == null) P.plotT = +s.t.toFixed(1);
    if (s.choice.length && s.choice.join() !== posled) { posled = s.choice.join(); P.karty.push({ t: +s.t.toFixed(1), v: s.choice, plot: s.genes.includes('plotoyadnyy') }); }
    if (!s.choice.length) posled = '';
    if (s.choice.length && s.on) { if (derzhu) { await p.mouse.up(); derzhu = false; } const g = s.choice.find(x => ORUZHIE.includes(x)) || s.choice[0], i2 = s.choice.indexOf(g); await p.evaluate(i3 => { const bt = document.getElementById('obtns').children[i3]; bt && bt.click(); }, i2); await p.waitForTimeout(150); continue; }
    if (!derzhu) { await p.mouse.move(cx, cy); await p.mouse.down(); derzhu = true; } await p.mouse.move(cx + s.dir[0] * 70, cy + s.dir[1] * 70); await p.waitForTimeout(250); }
  P.errs = errs; P.konec = posledS; await b.close(); return P; }
(async () => {
  const srv = http.createServer((q, s) => { const f = path.join(KOREN, decodeURIComponent(q.url.split('?')[0])); const ff = fs.existsSync(f) && fs.statSync(f).isDirectory() ? path.join(f, 'index.html') : f;
    if (!ff.startsWith(KOREN) || !fs.existsSync(ff)) { s.writeHead(404); return s.end(); } s.writeHead(200, { 'Content-Type': TIP[path.extname(ff)] || 'application/octet-stream' }); fs.createReadStream(ff).pipe(s); }).listen(0);
  const pw = await import(process.env.PW || 'playwright').then(m => m.default || m);
  const P = await partiya(pw, srv.address().port, false), S = sud(P); console.log('  партия: ' + JSON.stringify({ karty: P.karty.slice(0, 6), oruzhieT: P.oruzhieT, gulpT: P.gulpT, plotT: P.plotT, konec: P.konec }));
  check('test_L072 test_partiya_kartochki: первая карточка до 40-й секунды, до оружия в каждой больше одного варианта и среди них оружие', S.kartochki);
  check('test_partiya_gulp_ne_rano: «Глотать» не приходит раньше «Плотоядного»', S.gulp); check('test_partiya_oruzhie: оружие взято за партию', S.oruzhie);
  check('test_partiya_oshibki: ни одной ошибки страницы', P.errs.length ? P.errs.slice(0, 3).join(' | ') : '');
  if (!process.env.BEZ_SAMOPROVERKI) { const Q = await partiya(pw, srv.address().port, true), T = sud(Q); check('test_partiya_samoproverka: старая выдача «Глотать» на 10-й секунде — сторож краснеет', T.gulp || T.kartochki ? '' : 'не заметил: ' + JSON.stringify(Q.karty.slice(0, 3))); }
  srv.close(); process.exit(bad ? 1 : 0); })();
