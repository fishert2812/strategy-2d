// Сторож «"Яд" жмётся пальцем, а не джойстиком» «Капли» (урок L106): node proby/zaplyv/kaplya/test_yad_palec.cjs. Провал — код 1.
// Переигровка 711fa42 (тред проверки 27.11): «на кнопке „Яд“ под пальцем появляется второй круг джойстика»; «Зажал „Яд“ 4–9 с трижды… кокк в кольце 8,5 с — цел».
// Причина: слово «Яд» под кругом и уголки квадрата пропускали касание на холст — заводился джойстик, яд не шёл, клетку тянуло к кнопке.
// Должно: живая игра 390×844, взят «Яд», кокк в кольце; один палец ведёт клетку, второй — настоящим касанием на слово «Яд» — яд идёт, второй
// джойстик не заводится, кокк вдвое крупнее (как «двойной кокк» переигровки 06d0e96) лопается раньше, чем успевает съесть тебя (L113). Самопроверка: старая кнопка (body.staraKnopka) — сторож краснеет.
const http = require('http'), fs = require('fs'), path = require('path');
const KOREN = path.resolve(__dirname, '..'), TIP = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.mp3': 'audio/mpeg' };
let bad = 0; const check = (n, e) => { console.log((e ? '  ПРОВАЛ ' : '  ок ') + n + (e ? ': ' + e : '')); if (e) bad++; };
async function scena(pw, port, staroe) { const b = await pw.chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME, args: ['--no-sandbox'] } : {});
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }), p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message)); if (staroe === 'chisla') await p.addInitScript(() => { window.kaplyaStaryjYad = true; }); else if (staroe) await p.addInitScript(() => { addEventListener('DOMContentLoaded', () => document.body.classList.add('staraKnopka')); });
  await p.goto(`http://127.0.0.1:${port}/kaplya/`); await p.waitForFunction(() => window.zaplyvWorld && zaplyvWorld() && zaplyvWorld().me.length && zaplyvWorld().stats.time > 1, null, { timeout: 90000 });
  await p.evaluate(() => { const w = zaplyvWorld(), a0 = w.me[0]; w.genes.toxin = 1; const q = w.prey.filter(q => !q.gone).sort((x, y) => Math.hypot(x.x - a0.x, x.y - a0.y) - Math.hypot(y.x - a0.x, y.y - a0.y))[0]; window.YP = { q, pad: [] }; if (q) q.m = 2 * a0.m; /* L113: кокк вдвое крупнее тебя — как «двойной кокк» переигровки 06d0e96 */
    setInterval(() => { w.choice = []; const M = window.kaplyaMut && kaplyaMut(); if (M) M.vopros = null; const a = w.me[0]; if (!a || !q || q.gone) return; a.vx = a.vy = 0; q.x = a.x + 26; q.y = a.y; q.vx = q.vy = 0; YP.pad.push(zaplyvProbe.finger); }, 16); }); /* кокк прижат в кольце */
  await p.waitForTimeout(300);
  const g = await p.evaluate(() => { const s = document.querySelector('#kyad .kyad-slovo').getBoundingClientRect(); return [s.x + s.width / 2, s.y + s.height / 2]; });
  const c = await ctx.newCDPSession(p), T = (type, touchPoints) => c.send('Input.dispatchTouchEvent', { type, touchPoints });
  await T('touchStart', [{ x: 120, y: 650, id: 1 }]); await T('touchMove', [{ x: 121, y: 648, id: 1 }]); await p.waitForTimeout(150); /* ведущий палец почти на месте */
  await p.evaluate(() => { YP.pad = []; YP.f0 = zaplyvProbe.finger; YP.t0 = zaplyvWorld().stats.time; });
  await T('touchStart', [{ x: 121, y: 648, id: 1 }, { x: g[0], y: g[1], id: 2 }]); /* второй палец — на слово «Яд» */
  await p.waitForFunction(() => !YP.q || YP.q.gone || !zaplyvWorld().me.length || zaplyvWorld().stats.time - YP.t0 > 8, null, { timeout: 180000 }); /* съели тебя — партия встала, ждать нечего */
  const R = await p.evaluate(() => { const f = YP.pad.filter(Boolean), f0 = YP.f0; return { est: !!YP.q, zhiv: zaplyvWorld().me.length > 0, derzhu: kaplyaYad().derzhu, lopnul: !!YP.q && !!YP.q.gone, t: +(zaplyvWorld().stats.time - YP.t0).toFixed(1),
    f0, uvod: f0 && f.length ? Math.round(Math.max(...f.map(x => Math.hypot(x[0] - f0[0], x[1] - f0[1])))) : null }; }); /* как далеко «палец» джойстика уходил от ведущего пальца */
  await T('touchEnd', []); await b.close(); return { ...R, errs }; }
// Ведущий палец стоит у (120, 650); если «палец» джойстика уехал от него больше чем на 40 — касание на «Яд» завело второй джойстик.
const sud = R => !R.est ? 'рядом нет кокка — сцена не та' : !R.zhiv && !R.lopnul ? 'клетку съели раньше, чем кокк лопнул' : !R.derzhu ? 'палец на слове «Яд» — яд не держится (касание ушло в джойстик)' : !R.f0 ? 'ведущий палец не завёл джойстик — сцена не та' : R.uvod > 40 ? 'джойстик перескочил под палец на «Яд» (увод ' + R.uvod + ')' : !R.lopnul ? 'кокк в кольце не лопнул за ' + R.t + ' с игры с зажатым «Ядом»' : R.t > 3.3 ? 'кокк лопнул только за ' + R.t + ' с — вплотную кокк вдвое крупнее съедает тебя за 3,4–3,9 с, яд проигрывает гонку' : '';
(async () => {
  const srv = http.createServer((q, s) => { const f = path.join(KOREN, decodeURIComponent(q.url.split('?')[0])); const ff = fs.existsSync(f) && fs.statSync(f).isDirectory() ? path.join(f, 'index.html') : f;
    if (!ff.startsWith(KOREN) || !fs.existsSync(ff)) { s.writeHead(404); return s.end(); } s.writeHead(200, { 'Content-Type': TIP[path.extname(ff)] || 'application/octet-stream' }); fs.createReadStream(ff).pipe(s); }).listen(0);
  const pw = await import(process.env.PW || 'playwright').then(m => m.default || m), port = srv.address().port;
  const R = await scena(pw, port, false); console.log('  ' + JSON.stringify(R));
  check('test_L106 test_L113 test_yad_palec: один палец ведёт, второй на слове «Яд» — яд идёт, второго джойстика нет, кокк вдвое крупнее тебя лопается за один запас', R.errs.join(' | ') || sud(R));
  if (!process.env.BEZ_SAMOPROVERKI) { const St = await scena(pw, port, true); console.log('  старое: ' + JSON.stringify(St)); check('test_yad_palec_samoproverka: старая кнопка пропускает палец в джойстик — сторож краснеет', sud(St) ? '' : 'не заметил'); }
  if (!process.env.BEZ_SAMOPROVERKI) { const Sc = await scena(pw, port, 'chisla'); console.log('  старые числа: ' + JSON.stringify(Sc)); check('test_L113 test_yad_palec_chisla_samoproverka: прежние числа яда (доза за 5 с, стенка кокка 0,5) — кокк вдвое крупнее съедает раньше, сторож краснеет', sud(Sc) ? '' : 'не заметил'); }
  srv.close(); process.exit(bad ? 1 : 0); })();
