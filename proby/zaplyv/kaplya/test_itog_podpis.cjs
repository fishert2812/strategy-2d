// Сторож «итог на низком экране честный» и «метка ?yad» «Капли» (уроки L120, L121): node proby/zaplyv/kaplya/test_itog_podpis.cjs. Провал — код 1.
// Переигровка e5136e4 (тред проверки 27.11): «На портрете своя кишечная палочка, а подпись под ним — имя убийцы. «Клеток было до 1»,
// но «Отняли клеток: Парафизомонада — 2». Подсказка обрезана краем карточки»; «Если сделаешь метку вроде ?yad (яд с первой секунды), яд можно будет проверить сразу».
// Должно: живая игра 390×664 (Safari с панелями), ?yad, две клетки, обе съела парафизомонада — под твоим портретом не имя убийцы,
// «Клеток было до» не меньше «Отняли», подсказка целиком над нижней плашкой; с ?yad на первой секунде ген яда и кнопка «Яд» на экране.
// Самопроверка: window.kaplyaStaryjPodpis (старый итог) и window.kaplyaBezMetkiYad (метки нет) — сторож краснеет.
const http = require('http'), fs = require('fs'), path = require('path');
const KOREN = path.resolve(__dirname, '..'), TIP = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.mp3': 'audio/mpeg' };
const OHOTNIKI = JSON.parse(fs.readFileSync(path.join(__dirname, 'kaplya.json'))).zona.ohotniki; let bad = 0; const check = (n, e) => { console.log((e ? '  ПРОВАЛ ' : '  ок ') + n + (e ? ': ' + e : '')); if (e) bad++; };
async function scena(pw, port, flag) {
  const b = await pw.chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME, args: ['--no-sandbox'] } : {}), p = await b.newPage({ viewport: { width: 390, height: 664 }, isMobile: true, hasTouch: true });
  const errs = []; p.on('pageerror', e => errs.push(e.message)); if (flag) await p.addInitScript(f => { window[f] = true; if (f === 'kaplyaBezMetkiYad') window.kaplyaYadKartoy = true; /* L123: яд и так с первой секунды — метку проверяем без него */ }, flag);
  await p.goto(`http://127.0.0.1:${port}/kaplya/?yad`); await p.waitForFunction(() => window.zaplyvWorld && zaplyvWorld() && zaplyvWorld().me.length && zaplyvWorld().stats.time > 1, null, { timeout: 90000 });
  const yad = await p.evaluate(() => { const k = document.getElementById('kyad'), r = k ? k.getBoundingClientRect() : { width: 0 }; return { gen: !!zaplyvWorld().genes.toxin, knopka: !!k && getComputedStyle(k).display !== 'none' && r.width > 20 && r.top < innerHeight }; });
  await p.evaluate(OH => { const w = zaplyvWorld(); setInterval(() => { w.choice = []; const M = window.kaplyaMut && kaplyaMut(); if (M) M.vopros = null; for (const k of OH) if (w[k]) w[k].length = 0; /* в сцене убивает только парафизомонада сцены: настоящие охотники успевали первыми */ }, 30); w.me.push({ ...w.me[0], id: 77001, x: w.me[0].x + 30, grab: null });
    const k = setInterval(() => { for (const a of [...w.me]) w.lose(a, a.x, a.y, 'parafizo'); if (document.getElementById('end').classList.contains('on')) clearInterval(k); }, 60); /* до самого итога: проснувшуюся сестру тоже берёт парафизомонада, а не случайный житель (CI 6be21cf: «Тебя затянул трубач» — сцена не та) */ }, OHOTNIKI);
  await p.waitForFunction(() => document.getElementById('end').classList.contains('on'), null, { timeout: 90000 }); await p.waitForTimeout(1500);
  const R = await p.evaluate(() => { const $ = id => document.getElementById(id), vid = e => { const s = getComputedStyle(e), r = e.getBoundingClientRect(); return s.display !== 'none' && r.height > 2; };
    const st = $('stats').innerText, bylo = +((st.match(/Клеток было до (\d+)/) || [])[1] || 0), otn = [...(st.match(/Отняли клеток: (.*)/) || ['', ''])[1].matchAll(/— (\d+)/g)].reduce((x, m) => x + +m[1], 0);
    const tip = $('ctip'), tr = tip.getBoundingClientRect(), pod = $('ebtns').getBoundingClientRect().top;
    return { kto: $('who').textContent, portret: vid($('ckill')) ? 'есть' : 'нет', podpis: vid($('cname')) ? $('cname').textContent : '', bylo, otn, tip: tip.textContent.length, tipNiz: Math.round(tr.bottom), pod: Math.round(pod) }; });
  await b.close(); return { ...R, yad, errs }; }
const sud = R => !/парафизомонад/i.test(R.kto) ? 'сцена не та: «' + R.kto + '»' : R.portret === 'есть' && /Парафизомонада/.test(R.podpis) ? 'под твоим портретом имя убийцы «' + R.podpis + '»' : R.bylo < R.otn ? '«Клеток было до ' + R.bylo + '», а отняли ' + R.otn : !R.tip ? 'подсказки нет' : R.tipNiz > R.pod ? 'подсказка уходит под нижнюю плашку: низ ' + R.tipNiz + ' > ' + R.pod : '';
const sudYad = R => !R.yad.gen ? 'с ?yad гена яда нет' : !R.yad.knopka ? 'с ?yad кнопки «Яд» нет на экране' : '';
(async () => {
  const srv = http.createServer((q, s) => { const f = path.join(KOREN, decodeURIComponent(q.url.split('?')[0])); const ff = fs.existsSync(f) && fs.statSync(f).isDirectory() ? path.join(f, 'index.html') : f;
    if (!ff.startsWith(KOREN) || !fs.existsSync(ff)) { s.writeHead(404); return s.end(); } s.writeHead(200, { 'Content-Type': TIP[path.extname(ff)] || 'application/octet-stream' }); fs.createReadStream(ff).pipe(s); }).listen(0);
  const pw = await import(process.env.PW || 'playwright').then(m => m.default || m), port = srv.address().port;
  const R = await scena(pw, port, null); console.log('  ' + JSON.stringify(R));
  check('test_L120 test_itog_podpis: 390×664, съела парафизомонада — подпись не чужая, «было» не меньше «отняли», подсказка над плашкой', R.errs.join(' | ') || sud(R));
  check('test_L121 test_metka_yad: ?yad — яд и кнопка «Яд» с первой секунды', R.errs.join(' | ') || sudYad(R));
  if (!process.env.BEZ_SAMOPROVERKI) { const S = await scena(pw, port, 'kaplyaStaryjPodpis'); console.log('  старое: ' + JSON.stringify(S)); check('test_itog_podpis_samoproverka: старый итог — сторож краснеет', sud(S) && !/сцена не та/.test(sud(S)) ? '' : 'не заметил: ' + (sud(S) || 'зелёный')); }
  if (!process.env.BEZ_SAMOPROVERKI) { const S = await scena(pw, port, 'kaplyaBezMetkiYad'); console.log('  без метки: ' + JSON.stringify(S.yad)); check('test_metka_yad_samoproverka: метки нет — сторож краснеет', sudYad(S) ? '' : 'не заметил'); }
  srv.close(); process.exit(bad ? 1 : 0); })();
