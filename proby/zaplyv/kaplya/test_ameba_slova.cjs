// Сторож строк и еды в хватке амёбы «Капли» (урок L092): node proby/zaplyv/kaplya/test_ameba_slova.cjs. Провал — код 1.
// Повтор bac846d (тред проверки 27.11): «ни вспышки, ни "Свобода!" нет, и пока я внутри, "съедено" растёт: внутри хищника я ем»; «Амёба прилипла…» гаснет в момент гибели;
// «На кадре выхода "Свобода!" есть, "прилипла" нет». Живая игра 390×844: амёба держит чашей среди крошек — «съедено» стоит; выход из чаши — в тот же миг строка «Свобода!»;
// гибель в пузыре — строки про хватку нет. Самопроверка: со старыми строками (window.kaplyaStaryeSlovaAmeby) сторож краснеет.
const http = require('http'), fs = require('fs'), path = require('path');
const KOREN = path.resolve(__dirname, '..'), TIP = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.mp3': 'audio/mpeg' };
const KAP = JSON.parse(fs.readFileSync(path.join(__dirname, 'kaplya.json'))), ZH = [...Object.values(KAP.ameba.slova), ...Object.values(KAP.zahvat.slova)].filter(t => !/Свобода/.test(t));
let bad = 0; const check = (n, e) => { console.log((e ? '  ПРОВАЛ ' : '  ок ') + n + (e ? ': ' + e : '')); if (e) bad++; };
async function scena(pw, port, staroe) { const b = await pw.chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME, args: ['--no-sandbox'] } : {}), p = await b.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const errs = []; p.on('pageerror', e => errs.push(e.message)); if (staroe) await p.addInitScript(() => { window.kaplyaStaryeSlovaAmeby = true; });
  await p.goto(`http://127.0.0.1:${port}/kaplya/`); await p.waitForFunction(() => window.zaplyvWorld && zaplyvWorld() && zaplyvWorld().me.length && zaplyvWorld().stats.time > 1, null, { timeout: 90000 });
  const zhdi = async s => { const t0 = await p.evaluate(() => zaplyvWorld().stats.time); try { await p.waitForFunction(([t0, s]) => zaplyvWorld().stats.time - t0 > s, [t0, s], { timeout: 90000 }); } catch (e) { throw new Error('игра встала: ' + errs.join(' | ') + ' ' + await p.evaluate(() => JSON.stringify({ me: zaplyvWorld().me.length, t: zaplyvWorld().stats.time, toast: document.getElementById('toast').textContent }))); } }; /* время игры */
  await p.evaluate(() => { const w = zaplyvWorld(), a = w.me[0]; w.choice = []; a.m = 1.5; for (const k of ['amoebas', 'bells', 'slippers', 'rotis', 'bdellos', 'phages', 'bodos', 'pseudos', 'parafizo']) if (w[k]) w[k].length = 0;
    const q = { x: a.x + 40, y: a.y, vx: 0, vy: 0, m: 9, id: ++w.ids, ohv: { faza: 'chasha', t: 0, kogo: a }, lovit: true }; w.amoebas.push(q); window.AM = { q, e0: null, eat: 0 };
    const st = w.step.bind(w); w.step = (...r) => { if (AM.derzhi && q.ohv && w.me[0]) { q.ohv.faza = 'chasha'; q.ohv.t = 0; q.ohv.kogo = w.me[0]; q.x = w.me[0].x + 10; q.y = w.me[0].y; } const a = w.me[0]; if (AM.derzhi && a) { for (let i = 0; i < 3; i++) w.food.push({ x: a.x + (Math.random() - 0.5) * 8, y: a.y + (Math.random() - 0.5) * 8, s: 1, kind: 'bits' }); } return st(...r); }; AM.derzhi = true; setInterval(() => { w.choice = []; const M = kaplyaMut(); if (M) M.vopros = null; }, 20); }); /* карточки не ставят мир на паузу */ /* амёба держит чашей, у рта всё время крошки */
  await zhdi(0.5); const e0 = await p.evaluate(() => zaplyvWorld().stats.eaten); await zhdi(2); const e1 = await p.evaluate(() => zaplyvWorld().stats.eaten);
  await p.evaluate(() => kaplyaSay(window.kaplyaStaryeSlovaAmeby ? 'Амёба обходит чашей! Резко разворачивайся: три рывка — вырвешься' : 'Амёба обходит чашей! Резко разворачивайся: три рывка — вырвешься')); /* строка хватки на экране, как в игре */
  await p.evaluate(() => { const w = zaplyvWorld(), a = w.me[0]; AM.derzhi = false; a.x += 400; a.vx = a.vy = 0; }); await zhdi(0.3); const vyhod = await p.evaluate(() => document.getElementById('toast').textContent); /* вырвалась: далеко от амёбы */
  await zhdi(3); await p.evaluate(() => { const w = zaplyvWorld(), a = w.me[0], q = AM.q; q.syt = 0; q.oglush = 0; q.x = a.x; q.y = a.y; q.ohv = { faza: 'puzyr', t: 0, kogo: a }; kaplyaSay('Амёба обходит чашей! Резко разворачивайся: три рывка — вырвешься'); });
  await zhdi(KAP.ameba.perevar + 0.4); const gibel = await p.evaluate(() => document.getElementById('toast').classList.contains('on') ? document.getElementById('toast').textContent : '');
  await b.close(); return { eda: e1 - e0, vyhod, gibel, errs }; }
(async () => {
  const srv = http.createServer((q, s) => { const f = path.join(KOREN, decodeURIComponent(q.url.split('?')[0])); const ff = fs.existsSync(f) && fs.statSync(f).isDirectory() ? path.join(f, 'index.html') : f;
    if (!ff.startsWith(KOREN) || !fs.existsSync(ff)) { s.writeHead(404); return s.end(); } s.writeHead(200, { 'Content-Type': TIP[path.extname(ff)] || 'application/octet-stream' }); fs.createReadStream(ff).pipe(s); }).listen(0);
  const pw = await import(process.env.PW || 'playwright').then(m => m.default || m), port = srv.address().port;
  const sud = R => [R.eda > 0 ? `в чаше съедено +${R.eda} за 2 с` : '', !/Свобода/.test(R.vyhod) ? `на выходе строка «${R.vyhod}», а не «Свобода!»` : '', ZH.some(t => R.gibel.includes(t)) ? `после гибели висит «${R.gibel}»` : !/^Гибель/.test(R.gibel) ? `сразу после гибели строка «${R.gibel}», а не «Гибель: …»` : ''].filter(Boolean).join('; ');
  const R = await scena(pw, port, false); console.log('  ' + JSON.stringify(R));
  check('test_L092 test_L100 test_ameba_slova: в чаше амёбы «съедено» стоит, на выходе сразу «Свобода!», после гибели сразу «Гибель: амёба», строки хватки нет', R.errs.join(' | ') || sud(R));
  if (!process.env.BEZ_SAMOPROVERKI) { const S = await scena(pw, port, true); console.log('  старое: ' + JSON.stringify(S)); check('test_ameba_slova_samoproverka: старые строки и еда в хватке — сторож краснеет', sud(S) ? '' : 'не заметил'); }
  srv.close(); process.exit(bad ? 1 : 0); })();
