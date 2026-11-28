// Сторож «яд достаёт крупного кокка вплотную, одним пальцем» «Капли» (урок L124): node proby/zaplyv/kaplya/test_yad_vplotnuyu.cjs. Провал — код 1.
// Переигровка b44b767 (тред проверки 27.11): «Одним пальцем: крупный кокк (в 2,8 раза тяжелее) прижат к клетке, центр в 33, кольцо яда 30 — яд не достаёт,
// здоровье стоит 1,0, над ним щит»; «Запас яда ~2 с… клетку за эти 30 с уносит от очага». Причина (наш замер): палец на «Яд» не ведёт клетку, течение уносит её
// ~6 в секунду, край кольца 38 кокк переходил за 1–2 с, а запас кончался за 2,9 с.
// Должно: телефон 393×659, обычный адрес, кокк в 2,8 раза тяжелее вплотную, джойстика нет, один палец держит «Яд» настоящим касанием —
// кокк умирает за 8 с игры, ты жив. Самопроверка: window.kaplyaStaryjZapas (прежние кольцо, запас, кокк и клетку уносит) — сторож краснеет.
const http = require('http'), fs = require('fs'), path = require('path');
const KOREN = path.resolve(__dirname, '..'), TIP = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.mp3': 'audio/mpeg' };
let bad = 0; const check = (n, e) => { console.log((e ? '  ПРОВАЛ ' : '  ок ') + n + (e ? ': ' + e : '')); if (e) bad++; };
async function scena(pw, port, staroe) { const b = await pw.chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME, args: ['--no-sandbox'] } : {});
  const ctx = await b.newContext({ viewport: { width: 393, height: 659 }, isMobile: true, hasTouch: true }), p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message)); if (staroe) await p.addInitScript(() => { window.kaplyaStaryjZapas = true; globalThis.kaplyaStaryjZapas = true; });
  await p.goto(`http://127.0.0.1:${port}/kaplya/`); await p.waitForFunction(() => window.zaplyvWorld && zaplyvWorld() && zaplyvWorld().me.length && zaplyvWorld().stats.time > 1, null, { timeout: 90000 });
  await p.evaluate(() => { const w = zaplyvWorld(), a = w.me[0]; setInterval(() => { w.choice = []; const M = window.kaplyaMut && kaplyaMut(); if (M) M.vopros = null; for (const k of ['amoebas', 'bells', 'slippers', 'rotis', 'bdellos', 'phages', 'bodos']) if (w[k]) w[k].length = 0; }, 30);
    setInterval(() => { const b = w.me[0]; if (b && window.YQ && !YQ.gone) b.x -= 0.5; }, 30); /* течение несёт клетку прочь от кокка ровно (как в переигровке, но без случая): новое держит цель ворсом, старое уносит */ w.prey.length = 0; const q = { x: a.x + 33, y: a.y, vx: 0, vy: 0, m: 2.8 * a.m, a: 0, id: ++w.ids }; w.prey.push(q); window.YQ = q; }); /* кокк в 2,8 раза тяжелее, центр в 33 — как в переигровке */
  const g = await p.evaluate(() => { const s = document.querySelector('#kyad .kyad-slovo').getBoundingClientRect(); return [s.x + s.width / 2, s.y + s.height / 2]; });
  const c = await ctx.newCDPSession(p), T = (type, tp) => c.send('Input.dispatchTouchEvent', { type, touchPoints: tp });
  await T('touchStart', [{ x: g[0], y: g[1], id: 1 }]); const t0 = await p.evaluate(() => zaplyvWorld().stats.time);
  await p.waitForFunction(t0 => YQ.gone || !zaplyvWorld().me.length || zaplyvWorld().stats.time - t0 > 10, t0, { timeout: 180000 });
  const R = await p.evaluate(t0 => { const a = zaplyvWorld().me[0]; return { lopnul: !!YQ.gone, zhiv: !!a, t: +(zaplyvWorld().stats.time - t0).toFixed(1), f: YQ.gn ? +YQ.gn.f.toFixed(2) : 1, d: a ? Math.round(Math.hypot(YQ.x - a.x, YQ.y - a.y)) : null }; }, t0);
  await T('touchEnd', []); await b.close(); return { ...R, errs }; }
const sud = R => !R.zhiv && !R.lopnul ? 'тебя съели раньше, чем кокк умер' : !R.lopnul ? `кокк жив через ${R.t} с с зажатым «Ядом»: здоровье ${R.f}, расстояние ${R.d}` : '';
(async () => {
  const srv = http.createServer((q, s) => { const f = path.join(KOREN, decodeURIComponent(q.url.split('?')[0])); const ff = fs.existsSync(f) && fs.statSync(f).isDirectory() ? path.join(f, 'index.html') : f;
    if (!ff.startsWith(KOREN) || !fs.existsSync(ff)) { s.writeHead(404); return s.end(); } s.writeHead(200, { 'Content-Type': TIP[path.extname(ff)] || 'application/octet-stream' }); fs.createReadStream(ff).pipe(s); }).listen(0);
  const pw = await import(process.env.PW || 'playwright').then(m => m.default || m), port = srv.address().port;
  const R = await scena(pw, port, false); console.log('  ' + JSON.stringify(R));
  check('test_L124 test_yad_vplotnuyu: 393×659, кокк в 2,8 раза тяжелее вплотную, один палец на «Яд» — кокк умирает за 10 с, ты жив', R.errs.join(' | ') || sud(R));
  if (!process.env.BEZ_SAMOPROVERKI) { let lov = false; for (let i = 0; i < 3 && !lov; i++) { const S = await scena(pw, port, true); console.log('  старое: ' + JSON.stringify(S)); lov = !!sud(S); } check('test_yad_vplotnuyu_samoproverka: прежние кольцо и запас, клетку уносит — сторож краснеет (течение то к кокку, то от него: старое проигрывает 2 раза из 3, даём три попытки)', lov ? '' : 'не заметил'); }
  srv.close(); process.exit(bad ? 1 : 0); })();
