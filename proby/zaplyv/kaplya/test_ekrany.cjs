// Сторож экранов «Капли» вне партии (урок L128, экраны 28.11; тред проверки vid_b44b767_ui.md п. 4–7, 15, 21, 22): node proby/zaplyv/kaplya/test_ekrany.cjs.
// Живая игра 393×659 (iPhone 16 в Safari). Пауза → «Геном» → Альманах; потом гибель от туфельки → итог и снова Альманах.
// test_ekrany_genom: под витками генов русские имена, ни одного латинского кода (flhDC, snap, steady), карточка без пунктира.
// test_ekrany_almanah: шапка Альманаха непрозрачна, счёт в одну строку, у закрытых карточек нет пунктира, известные стоят первыми.
// test_ekrany_itog: на портрете убийца (не своя клетка), убийца сразу записан в Альманах, нет «Поколений: 0» и «Мутации», флажок не ложится на карточку,
//   кнопка «Альманах» без переноса посреди счёта.
// test_ekrany_pauza: звук — переключатель с состоянием.
// Самопроверка: судьи на заведомо плохих данных (латиница, пунктир, своя клетка, перенос) краснеют.
const http = require('http'), fs = require('fs'), path = require('path');
const KOREN = path.resolve(__dirname, '..'), TIP = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.mp3': 'audio/mpeg' };
let bad = 0; const check = (n, e) => { console.log((e ? '  ПРОВАЛ ' : '  ок ') + n + (e ? ': ' + e : '')); if (e) bad++; };
const sudGenom = G => G.latin.length ? 'латиница под витками: ' + G.latin.join(', ') : !G.podpisi ? 'подписей нет' : G.punktir ? 'карточка в пунктире' : '';
const sudAlmanah = A => !A.shapkaPlotnaya ? 'шапка прозрачная: ' + A.shapkaFon : A.schetStrok > 1 ? 'счёт в ' + A.schetStrok + ' строки: «' + A.schet + '»' : A.punktir ? 'пунктир у закрытых карточек' : A.poryadok ? 'закрытая карточка стоит перед известной' : '';
const sudItog = I => I.tvoy ? 'на портрете своя клетка, а съела ' + I.kto : !I.ubiycaVAlmanahe ? 'убийца не записан в Альманах' : /Поколений: 0\b/.test(I.put) ? '«Поколений: 0» в итоге' : /Мутации:/.test(I.put) ? '«Мутации:» вместо «Гены:»' : I.flagNaKartochke ? 'флажок лежит на карточке убийцы' : I.cabH > 70 || I.cabVisit ? 'кнопка «Альманах» переносит счёт: «' + I.cab + '»' : '';
const sudPauza = P => !P.pereklyuchatel ? 'звук — просто надпись «' + P.zvuk + '»' : '';
(async () => {
  const srv = http.createServer((q, s) => { const f = path.join(KOREN, decodeURIComponent(q.url.split('?')[0])); const ff = fs.existsSync(f) && fs.statSync(f).isDirectory() ? path.join(f, 'index.html') : f;
    if (!ff.startsWith(KOREN) || !fs.existsSync(ff)) { s.writeHead(404); return s.end(); } s.writeHead(200, { 'Content-Type': TIP[path.extname(ff)] || 'application/octet-stream' }); fs.createReadStream(ff).pipe(s); }).listen(0);
  const pw = await import(process.env.PW || 'playwright').then(m => m.default || m), b = await pw.chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME, args: ['--no-sandbox'] } : {});
  const p = await b.newPage({ viewport: { width: 393, height: 659 }, isMobile: true, hasTouch: true }), errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto(`http://127.0.0.1:${srv.address().port}/kaplya/`); await p.waitForFunction(() => window.zaplyvWorld && zaplyvWorld() && zaplyvWorld().stats.time > 2, null, { timeout: 90000 });
  const tap = s => p.evaluate(s => { const e = document.querySelector(s); if (e) e.click(); }, s);
  await p.evaluate(() => { zaplyvWorld().genes.magnet = true; }); await tap('#pause'); await p.waitForTimeout(400);
  const P = await p.evaluate(() => { const z = document.getElementById('psound'); return { pereklyuchatel: !!z.querySelector('.sw'), zvuk: z.textContent }; });
  await tap('.prow[data-t="genome"]'); await p.waitForTimeout(1600);
  const G = await p.evaluate(() => { const S = window.kaplyaGenomDnk, pod = [...(S.podpisi || [])]; return { podpisi: pod.length, latin: pod.filter(t => /[A-Za-z]/.test(t)), punktir: getComputedStyle(document.getElementById('gcard')).borderStyle.includes('dash') }; });
  await tap('#gback'); await tap('.prow[data-t="alm"]'); await p.waitForTimeout(800);
  const almanah = () => p.evaluate(() => { const h = document.querySelector('#kshelf .khead'), fon = getComputedStyle(h).backgroundColor, a = (fon.match(/rgba?\(([^)]*)\)/) || [, '0,0,0,0'])[1].split(',').map(Number), c = document.getElementById('kcount'), lh = parseFloat(getComputedStyle(c).lineHeight) || 20;
    const kc = [...document.querySelectorAll('#shelf .kc')], perv = kc.findIndex(x => x.classList.contains('no')), posl = kc.map(x => !x.classList.contains('no')).lastIndexOf(true);
    return { shapkaFon: fon, shapkaPlotnaya: a.length === 3 || a[3] >= 0.99, schet: c.textContent, schetStrok: Math.round(c.getBoundingClientRect().height / lh), punktir: kc.some(x => getComputedStyle(x).borderTopStyle.includes('dash')), poryadok: perv >= 0 && posl > perv }; });
  const A = await almanah();
  await tap('#gon'); await p.waitForTimeout(300);
  for (let i = 0; i < 40 && !(await p.evaluate(() => document.getElementById('end').classList.contains('on'))); i++) {
    await p.evaluate(() => { const w = zaplyvWorld(); w.genes.spore = false; for (const [n, v] of Object.entries(w)) if (Array.isArray(v) && n !== 'me' && n !== 'staya' && v[0] && typeof v[0].x === 'number' && typeof v[0].m === 'number') v.length = 0; for (const a of [...w.me]) w.lose(a, a.x, a.y, 'slipper'); }); await p.waitForTimeout(400); }
  await p.waitForTimeout(900);
  const I = await p.evaluate(() => { const r = id => document.getElementById(id).getBoundingClientRect(), f = r('flag'), c = r('card'), cab = document.getElementById('cab'), sm = cab.querySelector('small');
    const lh = sm ? parseFloat(getComputedStyle(sm).lineHeight) || 16 : 20;
    return { kto: document.getElementById('who').textContent, tvoy: document.getElementById('card').classList.contains('tvoy'), ubiycaVAlmanahe: window.kaplyaAlmanah().vstrechen('slipper'), put: document.getElementById('stats').innerText,
      flagNaKartochke: f.width > 0 && f.bottom > c.top + 2 && f.left < c.right && f.right > c.left, cab: cab.textContent, cabH: Math.round(cab.getBoundingClientRect().height), cabVisit: sm ? sm.scrollWidth > sm.clientWidth + 1 || sm.getBoundingClientRect().height > lh * 1.5 : true }; });
  if (process.env.KADR) await p.screenshot({ path: path.join(process.env.KADR, 'ekrany_itog.png') });
  console.log('  ' + JSON.stringify({ P, G, A, I, errs }));
  check('test_ekrany_genom: под витками русские имена, без латиницы и пунктира', sudGenom(G));
  check('test_ekrany_almanah: шапка непрозрачна, счёт в одну строку, без пунктира, известные первыми', sudAlmanah(A));
  check('test_L128 test_ekrany_itog: портрет убийцы, убийца в Альманахе, без «Поколений: 0» и «Мутации», флажок не на карточке, «Альманах» без переноса', sudItog(I));
  check('test_ekrany_pauza: звук — переключатель', sudPauza(P));
  check('test_ekrany: без ошибок скрипта', errs.join('; '));
  const s1 = sudGenom({ ...G, latin: ['flhDC'] }), s2 = sudAlmanah({ ...A, punktir: true }), s3 = sudItog({ ...I, tvoy: true }), s4 = sudItog({ ...I, put: 'Поколений: 0 — в природе ≈ 0 мин' }), s5 = sudAlmanah({ ...A, schetStrok: 2 }), s6 = sudPauza({ pereklyuchatel: false, zvuk: 'Звук включён' });
  check('test_ekrany_samoproverka: латиница, пунктир, своя клетка, «Поколений: 0», перенос счёта, звук надписью — судьи краснеют', [s1, s2, s3, s4, s5, s6].every(Boolean) ? '' : 'не заметил: ' + [s1, s2, s3, s4, s5, s6].map(x => x ? 1 : 0).join(''));
  await b.close(); srv.close(); process.exit(bad ? 1 : 0);
})().catch(e => { console.log('  ПРОВАЛ test_ekrany: ' + e.message); process.exit(1); });
