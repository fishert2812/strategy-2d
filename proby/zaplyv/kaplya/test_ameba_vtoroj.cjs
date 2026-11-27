// Сторож «вторая хватка амёбы и пробуждение» «Капли» (урок L116; вторая хватка — L117 — ещё не сторожится: сцена не вызывает хватку надёжно): node proby/zaplyv/kaplya/test_ameba_vtoroj.cjs. Провал — код 1.
// Переигровка 06d0e96 (тред проверки 27.11): «клетка осталась на краю, через ~5 с её снова втянуло без «Схватили!», пришла гибель, и копия проснулась внутри той же амёбы».
// Должно: живая игра 390×844. Вырвалась из чаши — вторая хватка снова говорит, что делать (L117). Съела амёба, копия рядом с ней — просыпаешься
// за её краем, и она тебя сразу не держит (L116). Самопроверка: window.kaplyaOdnaHvatka и window.kaplyaStaroeProbuzhdenie — сторож краснеет.
const http = require('http'), fs = require('fs'), path = require('path');
const KOREN = path.resolve(__dirname, '..'), TIP = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.mp3': 'audio/mpeg' };
const KAP = JSON.parse(fs.readFileSync(path.join(__dirname, 'kaplya.json'))), SL = KAP.ameba.slova;
let bad = 0; const check = (n, e) => { console.log((e ? '  ПРОВАЛ ' : '  ок ') + n + (e ? ': ' + e : '')); if (e) bad++; };
async function scena(pw, port, staroe) { const b = await pw.chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME, args: ['--no-sandbox'] } : {}), p = await b.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const errs = []; p.on('pageerror', e => errs.push(e.message)); if (staroe) await p.addInitScript(() => { window.kaplyaOdnaHvatka = true; window.kaplyaStaroeProbuzhdenie = true; });
  await p.goto(`http://127.0.0.1:${port}/kaplya/`); await p.waitForFunction(() => window.zaplyvWorld && zaplyvWorld() && zaplyvWorld().me.length && zaplyvWorld().stats.time > 1, null, { timeout: 90000 });
  const zhdi = async s => { const t0 = await p.evaluate(() => zaplyvWorld().stats.time); await p.waitForFunction(([t0, s]) => zaplyvWorld().stats.time - t0 > s || !zaplyvWorld().me.length, [t0, s], { timeout: 120000 }); };
  await p.evaluate(() => { const w = zaplyvWorld(), a = w.me[0]; a.m = 1.5; for (const k of ['amoebas', 'bells', 'slippers', 'rotis', 'bdellos', 'phages', 'bodos', 'pseudos', 'parafizo', 'cerko', 'spumelly', 'didinii', 'trubachi']) if (w[k]) w[k].length = 0;
    const q = { x: a.x + 30, y: a.y, vx: 0, vy: 0, m: 9, id: ++w.ids, ohv: { faza: 'otdyh', t: 0 }, syt: 99 }; w.amoebas.push(q); window.AV = { q, slova: [], lovi: true };
    setInterval(() => { const b = w.me[0]; if (b) { b.free = 0; b.spore = 0; } if (b && AV.lovi && AV.q.ohv && !AV.q.ohv.faza) { AV.q.x = b.x + 30; AV.q.y = b.y; } /* амёба у тебя, пока не начала хватать */ /* без защиты новорождённой: амёба может схватить */ w.choice = []; const M = window.kaplyaMut && kaplyaMut(); if (M) M.vopros = null; const T = document.getElementById('toast'); if (T.classList.contains('on') && AV.slova.at(-1) !== T.textContent) AV.slova.push(T.textContent); }, 5); });
  const prob = await p.evaluate(async () => { AV.lovi = false; const w = zaplyvWorld(), a = w.me[0], q = AV.q; q.syt = 0; q.oglush = 0; q.x = a.x; q.y = a.y; q.ohv = { faza: 'puzyr', t: 0, kogo: a };
    const kop = { id: ++w.ids, x: q.x + 2, y: q.y, a: 0, m: 0.6, t: 0, sama: 0, T: 30, pok: 1, mut: null, mt: 0 }; w.staya = [kop]; const derzh = setInterval(() => { if (w.me[0] === a) { a.x = q.x; a.y = q.y; a.vx = a.vy = 0; kop.x = q.x + 2; kop.y = q.y; kop.gone = false; w.staya = [kop]; } }, 5); /* копия всегда одна и в амёбе: просыпаешься именно ею */ /* пузырь переваривает тебя, копия в той же амёбе */
    const t0 = w.stats.time; await new Promise(r => { const k = setInterval(() => { if (w.me[0] !== a || w.stats.time - t0 > 15) { clearInterval(k); r(); } }, 10); }); clearInterval(derzh); const b = w.me[0]; if (!b || b === a) return { prosnulas: false, t: +(w.stats.time - t0).toFixed(1) };
    const d0 = Math.hypot(b.x - q.x, b.y - q.y), t1 = w.stats.time; await new Promise(r => { const k = setInterval(() => { if (w.stats.time - t1 > 1 || !w.me.length) { clearInterval(k); r(); } }, 20); });
    return { prosnulas: true, d0: Math.round(d0), zhiva: w.me.includes(b), derzhat: !!(w.derzhat && w.derzhat(b)), faza: q.ohv && q.ohv.faza }; }); /* L116 */
  await b.close(); return { prob, errs }; }
const sud = R => !R.prob.prosnulas ? 'копия не проснулась — сцена не та' : R.prob.d0 > 120 ? 'проснулась не копией из амёбы — сцена не та: ' + JSON.stringify(R.prob) : !R.prob.zhiva || R.prob.derzhat || R.prob.d0 < 30 || ['prilip', 'chasha', 'puzyr'].includes(R.prob.faza) ? 'проснулась в амёбе: ' + JSON.stringify(R.prob) : '';
(async () => {
  const srv = http.createServer((q, s) => { const f = path.join(KOREN, decodeURIComponent(q.url.split('?')[0])); const ff = fs.existsSync(f) && fs.statSync(f).isDirectory() ? path.join(f, 'index.html') : f;
    if (!ff.startsWith(KOREN) || !fs.existsSync(ff)) { s.writeHead(404); return s.end(); } s.writeHead(200, { 'Content-Type': TIP[path.extname(ff)] || 'application/octet-stream' }); fs.createReadStream(ff).pipe(s); }).listen(0);
  const pw = await import(process.env.PW || 'playwright').then(m => m.default || m), port = srv.address().port;
  const R = await scena(pw, port, false); console.log('  ' + JSON.stringify(R));
  check('test_L116 test_ameba_vtoroj: съела амёба, копия была в ней — просыпаешься за её краем, и она тебя не держит', R.errs.join(' | ') || sud(R));
  if (!process.env.BEZ_SAMOPROVERKI) { const St = await scena(pw, port, true); console.log('  старое: ' + JSON.stringify(St)); check('test_ameba_vtoroj_samoproverka: пробуждение в амёбе — сторож краснеет', sud(St) ? '' : 'не заметил'); }
  srv.close(); process.exit(bad ? 1 : 0); })();
