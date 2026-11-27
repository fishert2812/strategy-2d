// Сторож «экран итога честный» «Капли» (урок L107): node proby/zaplyv/kaplya/test_itog.cjs. Провал — код 1.
// Переигровка 711fa42 (тред проверки 27.11): «Рамка портрета пустая (оба раза). Мутации: «Ядовитое касание, Нить-игла, Шип» — я брал только Шип…
// «trubach» латиницей в обоих»; «столбик портретов (5–6 штук + полоска)» и «Амёба рядом!» поверх итога; «Гибель: хищник» без имени.
// Должно: живая игра 390×844, взят один ген, в игре видны столбик слева и строка цели, клетку съел трубач — на итоге «Гибель: Трубач», в рамке портрет,
// в мутациях только взятый ген, ни слова латиницей, поверх листа ничего из игры (кроме ⚑ — инструмент правок на всех экранах).
// Самопроверка: старый итог (window.kaplyaStaryjItog и body.staryjItog) — сторож краснеет.
const http = require('http'), fs = require('fs'), path = require('path');
const KOREN = path.resolve(__dirname, '..'), TIP = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.mp3': 'audio/mpeg' };
let bad = 0; const check = (n, e) => { console.log((e ? '  ПРОВАЛ ' : '  ок ') + n + (e ? ': ' + e : '')); if (e) bad++; };
async function scena(pw, port, staroe) { const b = await pw.chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME, args: ['--no-sandbox'] } : {}), p = await b.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const errs = []; p.on('pageerror', e => errs.push(e.message)); if (staroe) await p.addInitScript(() => { window.kaplyaStaryjItog = true; addEventListener('DOMContentLoaded', () => document.body.classList.add('staryjItog')); });
  await p.goto(`http://127.0.0.1:${port}/kaplya/`); await p.waitForFunction(() => window.zaplyvWorld && zaplyvWorld() && zaplyvWorld().me.length && zaplyvWorld().stats.time > 1, null, { timeout: 90000 });
  const vzyal = await p.evaluate(() => { const w = zaplyvWorld(); const nol = Object.keys(w.genes).filter(g => !w.genes[g]); w.genes.toxin = 1; setInterval(() => { w.choice = []; const M = window.kaplyaMut && kaplyaMut(); if (M) M.vopros = null; }, 30); return { nol }; });
  await p.waitForTimeout(1500); const vIgre = await p.evaluate(() => ['klin', 'kcel'].filter(id => { const e = document.getElementById(id); if (!e) return false; const s = getComputedStyle(e), r = e.getBoundingClientRect(); return s.display !== 'none' && s.visibility !== 'hidden' && r.width > 4 && r.height > 4; })); /* в игре видны столбик слева и строка цели внизу */
  await p.evaluate(() => { const w = zaplyvWorld(); const k = setInterval(() => { for (const a of [...w.me]) w.lose(a, a.x, a.y, 'trubach'); if (!w.me.length) clearInterval(k); }, 60); });
  await p.waitForFunction(() => document.getElementById('end').classList.contains('on'), null, { timeout: 90000 }); await p.waitForTimeout(1500);
  const R = await p.evaluate(() => { const L = document.getElementById('end'), img = document.getElementById('ckill'), poverh = [];
    for (const e of document.body.querySelectorAll('[id]')) { if (L.contains(e) || e.id === 'flag' || e.id === 'c' || e.closest('#flag')) continue; const s = getComputedStyle(e), r = e.getBoundingClientRect(); if (s.display === 'none' || s.visibility === 'hidden' || +s.opacity === 0 || r.width < 4 || r.height < 4 || r.bottom < 0 || r.top > innerHeight || e.closest('.layer:not(.on)')) continue; if (s.position === 'fixed' || s.position === 'absolute') poverh.push(e.id); }
    const txt = L.innerText; return { kto: document.getElementById('who').textContent, ramka: !img.hidden && getComputedStyle(img).display !== 'none' ? (img.naturalWidth > 0 ? 'портрет' : 'пустая') : 'нет', latin: (txt.match(/[a-z]{4,}/g) || []), mut: (txt.match(/Мутации: [^\n]*/) || [''])[0], poverh, }; });
  await b.close(); return { ...R, vIgre, vzyal, errs }; }
// L110 (переигровка 711fa42): «Пауза → «Новый заплыв» → «Точно заново?» → сразу новый старт, итога нет». Должно: сначала экран итога, с него «Плыть снова».
async function novyj(pw, port, staroe) { const b = await pw.chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME, args: ['--no-sandbox'] } : {}), p = await b.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const errs = []; p.on('pageerror', e => errs.push(e.message)); if (staroe) await p.addInitScript(() => { window.kaplyaStaryjNovyj = true; });
  await p.goto(`http://127.0.0.1:${port}/kaplya/`); await p.waitForFunction(() => window.zaplyvWorld && zaplyvWorld() && zaplyvWorld().me.length && zaplyvWorld().stats.time > 1, null, { timeout: 90000 });
  await p.evaluate(() => { zaplyvWorld().choice = []; }); await p.click('#pause'); await p.waitForTimeout(600); await p.click('#pnew'); await p.waitForTimeout(300); await p.click('#pnew');
  const itog = await p.waitForFunction(() => document.getElementById('end').classList.contains('on'), null, { timeout: 8000 }).then(() => true).catch(() => false);
  const kto = await p.evaluate(() => document.getElementById('who').textContent); await b.close(); return { itog, kto, errs }; }
const sudNov = (R, S) => !R.itog ? '«Новый заплыв» начал сразу, итога нет' : R.kto !== S ? 'на итоге «' + R.kto + '»' : '';
const sud = R => R.vIgre.length < 2 ? 'в игре нет столбика и строки цели — сцена не та: ' + R.vIgre.join(',') : !/Трубач/.test(R.kto) ? 'нет имени убийцы: «' + R.kto + '»' : R.ramka !== 'портрет' ? 'рамка портрета: ' + R.ramka : R.latin.length ? 'латиница на итоге: ' + R.latin.join(', ') : R.mut !== 'Мутации: Ядовитое касание' ? 'чужие мутации: «' + R.mut + '»' : R.poverh.length ? 'поверх итога: ' + R.poverh.join(', ') : '';
(async () => {
  const srv = http.createServer((q, s) => { const f = path.join(KOREN, decodeURIComponent(q.url.split('?')[0])); const ff = fs.existsSync(f) && fs.statSync(f).isDirectory() ? path.join(f, 'index.html') : f;
    if (!ff.startsWith(KOREN) || !fs.existsSync(ff)) { s.writeHead(404); return s.end(); } s.writeHead(200, { 'Content-Type': TIP[path.extname(ff)] || 'application/octet-stream' }); fs.createReadStream(ff).pipe(s); }).listen(0);
  const pw = await import(process.env.PW || 'playwright').then(m => m.default || m), port = srv.address().port;
  const R = await scena(pw, port, false); console.log('  ' + JSON.stringify(R));
  check('test_L107 test_itog: клетку съел трубач — «Гибель: Трубач», портрет в рамке, только взятый ген, без латиницы, ничего поверх', R.errs.join(' | ') || sud(R));
  const SAM = JSON.parse(fs.readFileSync(path.join(__dirname, 'kaplya.json'))).rod.slova.itog_sam;
  const N = await novyj(pw, port, false); console.log('  новый: ' + JSON.stringify(N)); check('test_L110 test_itog_novyj: пауза → «Новый заплыв» → «Точно заново?» — сначала итог заплыва', N.errs.join(' | ') || sudNov(N, SAM));
  if (!process.env.BEZ_SAMOPROVERKI) { const Ns = await novyj(pw, port, true); console.log('  старое, новый: ' + JSON.stringify(Ns)); check('test_itog_novyj_samoproverka: старый сразу новый старт — сторож краснеет', sudNov(Ns, SAM) ? '' : 'не заметил'); }
  if (!process.env.BEZ_SAMOPROVERKI) { const St = await scena(pw, port, true); console.log('  старое: ' + JSON.stringify(St)); check('test_itog_samoproverka: старый итог — сторож краснеет', sud(St) ? '' : 'не заметил'); }
  srv.close(); process.exit(bad ? 1 : 0); })();
