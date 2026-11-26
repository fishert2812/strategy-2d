// Сторож карточек умений (Ш20, К2–К3 задания kolonia_eda_boy.md): node proby/zaplyv/kaplya/test_karta.cjs. Провал — код 1. Числа — kaplya.json «karta».
// Роман 26.11 21:10: «Пускай все таки карточки высвечиваются. И ты их выбираешь. Тапом. Потому что в игре не успеваешь среагировать. И описание не прочитать».
// Судья: пока лежат карточки, время мира стоит; на каждой снимок клетки, имя и строка; одно касание берёт и пускает мир. «Глотать» приходит карточкой.
// Самопроверка: карточки без паузы (karta.pauza = false) судья ловит.
const http = require('http'), fs = require('fs'), path = require('path');
const KOREN = path.resolve(__dirname, '..'), TIP = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.mp3': 'audio/mpeg' };
let bad = 0; const check = (n, e) => { console.log((e ? '  ПРОВАЛ ' : '  ок ') + n + (e ? ': ' + e : '')); if (e) bad++; };
(async () => {
  const srv = http.createServer((q, s) => { const f = path.join(KOREN, decodeURIComponent(q.url.split('?')[0])); const ff = fs.existsSync(f) && fs.statSync(f).isDirectory() ? path.join(f, 'index.html') : f;
    if (!ff.startsWith(KOREN) || !fs.existsSync(ff)) { s.writeHead(404); return s.end(); } s.writeHead(200, { 'Content-Type': TIP[path.extname(ff)] || 'application/octet-stream' }); fs.createReadStream(ff).pipe(s); }).listen(0);
  const pw = await import(process.env.PW || 'playwright').then(m => m.default || m);
  const b = await pw.chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME, args: ['--no-sandbox'] } : {}), p = await b.newPage({ viewport: { width: 393, height: 852 }, isMobile: true, hasTouch: true });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto(`http://127.0.0.1:${srv.address().port}/kaplya/`); await p.waitForFunction(() => window.zaplyvWorld && zaplyvWorld() && zaplyvWorld().stats.time > 1, null, { timeout: 90000 });
  await p.evaluate(() => { zaplyvWorld().lose = () => {}; });
  const vremya = () => p.evaluate(() => zaplyvWorld().stats.time);
  const karty = () => p.evaluate(() => { const O = document.getElementById('offer'); return { on: O.classList.contains('on'), karta: O.classList.contains('karta'), k: [...document.querySelectorAll('#obtns button')].map(b => ({ img: (b.querySelector('img').src || '').length, imya: b.querySelector('span').textContent.trim(), stroka: b.querySelector('small').textContent.trim(), vidno: getComputedStyle(b.querySelector('small')).display !== 'none' && b.querySelector('img').getBoundingClientRect().width >= 80 })) }; });
  // судья: карточки лежат, мир стоит wait секунд, тап по первой берёт её и пускает мир
  const sud = async (wait) => { await p.waitForFunction(() => document.getElementById('offer').classList.contains('on'), null, { timeout: 5000 }).catch(() => {});
    const K = await karty(); if (!K.on || !K.k.length) return 'карточки не показались';
    const t0 = await vremya(); await p.waitForTimeout(wait * 1000); const t1 = await vremya(); if (t1 - t0 > 0.05) return `мир шёл ${(t1 - t0).toFixed(1)} с, пока лежали карточки`;
    const plohaya = K.k.find(k => !k.img || !k.imya || !k.stroka || !k.vidno); if (plohaya) return `карточка без снимка, имени или строки: ${JSON.stringify(plohaya)}`;
    const g = await p.evaluate(() => zaplyvWorld().choice[0]); await p.tap('#obtns button:first-child');
    await p.waitForTimeout(1200); const t2 = await vremya(), vzyal = await p.evaluate(g => !!zaplyvWorld().genes[g] && !zaplyvWorld().choice.length, g);
    if (!vzyal) return `одно касание не взяло «${g}»`; if (t2 - t1 < 0.5) return 'после выбора мир не пошёл'; return ''; };
  // «Глотать» карточкой на glotat_s секунде (Р5)
  const G = await p.evaluate(() => { const K = kaplyaKarta(); return { glotat: K.glotat }; });
  await p.waitForFunction(() => zaplyvWorld().choice.includes('gulp') || zaplyvWorld().genes.gulp, null, { timeout: 40000 }).catch(() => {});
  const gl = await p.evaluate(() => ({ karta: zaplyvWorld().choice.includes('gulp'), est: !!zaplyvWorld().genes.gulp }));
  check('test_karta_glotat: «Глотать» приходит карточкой, а не само', G.glotat && gl.karta && !gl.est ? await sud(2) : JSON.stringify(gl));
  const dat = () => p.evaluate(() => { const w = zaplyvWorld(); w.choice = Object.keys(w.cfg.genes).filter(g => !w.genes[g] && g !== 'gulp').slice(0, 3); });
  await dat(); check('test_karta_pauza: пока лежат карточки, мир стоит 5 с; на каждой снимок, имя, строка; одно касание берёт', await sud(5));
  await p.evaluate(() => { kaplyaKarta().pauza = false; }); await dat();
  check('test_karta_samoproverka: карточки без паузы судья ловит', await sud(2) ? '' : 'судья не заметил, что мир шёл');
  check('test_karta_oshibki: игра без ошибок', errs.length ? errs.join('; ') : '');
  await b.close(); srv.close(); process.exit(bad ? 1 : 0); })();
