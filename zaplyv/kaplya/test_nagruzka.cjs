// Сторож нагрузки «Капли»: node proby/zaplyv/kaplya/test_nagruzka.cjs. Провал — код 1.
// Роман 26.11: «Лагать и нагреваться телефон стал… большим стал!» Камера отъезжает с ростом, и в кадр входили сотни жителей полной записью.
// Мерка (координатор 26.11): большая клетка не тяжелее маленькой больше чем в 1,5 раза. Мерим то, что рисуется: жителей полным телом и частей тел,
// и время кадра (оно здесь шумное: видеокарты нет, рисует процессор, поэтому для него порог мягче — 2 раза).
// Самопроверка: с выключенной взвесью (window.kaplyaBezLod) сторож обязан покраснеть.
const http = require('http'), fs = require('fs'), path = require('path');
const KOREN = path.resolve(__dirname, '..'), TIP = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.mp3': 'audio/mpeg' };
const RAZ = 1.5, RAZ_KADR = 2, MALO = 10; // во сколько раз большая может быть тяжелее; MALO — столько тел допустимо всегда
let bad = 0; const check = (n, e) => { console.log((e ? '  ПРОВАЛ ' : '  ок ') + n + (e ? ': ' + e : '')); if (e) bad++; };
const sud = (s, b) => b.tel > Math.max(MALO, s.tel * RAZ) ? `телом ${b.tel} жителей против ${s.tel} у малышки` : b.chastey > s.chastey * RAZ ? `частей тел ${b.chastey} против ${s.chastey}` : b.kadr > s.kadr * RAZ_KADR ? `кадр ${b.kadr} мс против ${s.kadr}` : '';
check('test_nagruzka_sud: судья краснеет на придуманной тяжёлой клетке', sud({ tel: 8, chastey: 300, kadr: 50 }, { tel: 200, chastey: 300, kadr: 50 }) && !sud({ tel: 8, chastey: 300, kadr: 50 }, { tel: 3, chastey: 400, kadr: 83 }) ? '' : 'судья ошибается');
(async () => {
  const srv = http.createServer((q, s) => { const f = path.join(KOREN, decodeURIComponent(q.url.split('?')[0])); const ff = fs.existsSync(f) && fs.statSync(f).isDirectory() ? path.join(f, 'index.html') : f;
    if (!ff.startsWith(KOREN) || !fs.existsSync(ff)) { s.writeHead(404); return s.end(); } s.writeHead(200, { 'Content-Type': TIP[path.extname(ff)] || 'application/octet-stream' }); fs.createReadStream(ff).pipe(s); }).listen(0);
  const pw = await import(process.env.PW || 'playwright').then(m => m.default || m); // на CI playwright не рядом с файлом: путь даёт шаг (tools/web/kaplya_pw.sh)
  const b = await pw.chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME, args: ['--no-sandbox'] } : {}), p = await b.newPage({ viewport: { width: 393, height: 852 }, isMobile: true, hasTouch: true });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto(`http://127.0.0.1:${srv.address().port}/kaplya/`); await p.waitForFunction(() => window.zaplyvWorld && zaplyvWorld() && zaplyvWorld().stats.time > 2, null, { timeout: 90000 });
  const start = await p.evaluate(() => ({ bodo: (zaplyvWorld().bodos || []).length, glava: window.kaplyaGlava && kaplyaGlava() })); // урок 26.11: комментарий съел строку, и хозяин бодо пропал со старта
  check('test_kaplya_start: на старте главы 1 есть хозяин бодо', start.glava === 1 && start.bodo >= 1 ? '' : JSON.stringify(start));
  await p.evaluate(() => { zaplyvWorld().lose = () => {}; if (window.kaplyaKarta) kaplyaKarta().pauza = false; }); /* Ш20: карточки ставят мир на паузу; нагрузку мерим в идущем мире */
  // П11: строка не перебивает строку. Судья: через 0,3 с видна первая, вторая показывается в ближайшие 6 с. Самопроверка: показ без очереди (kaplyaPokaz) судья ловит.
  const stroki = async f => { await p.waitForFunction(() => zaplyvWorld().stats.time > 16 && !document.getElementById('toast').classList.contains('on') && !kaplyaOchered(), null, { timeout: 60000 }).catch(() => {}); return p.evaluate(f => new Promise(r => { const T = document.getElementById('toast'), S = window[f]; T.classList.remove('on'); S('проверка А', 3000); S('проверка Б', 3000); setTimeout(() => { const a = T.textContent; let b = '', n = 0; const tik = setInterval(() => { if (T.textContent === 'проверка Б' && T.classList.contains('on')) b = 'проверка Б'; if (++n > 30 || b) { clearInterval(tik); r([a, b || T.textContent]); } }, 200); }, 300); }), f); }; /* Б должна показаться за 6 с, даже если игра вставила свою строку */
  const sudS = ([a, b]) => a !== 'проверка А' ? `первую строку перебили: «${a}»` : b !== 'проверка Б' ? `вторая строка пропала: «${b}»` : '';
  check('test_L112 test_kaplya_stroki: всплывающая строка не перебивает прошлую (П11)', sudS(await stroki('kaplyaSay')));
  await p.waitForTimeout(3500); check('test_kaplya_stroki_samoproverka: показ без очереди судья ловит', sudS(await stroki('kaplyaPokaz')) ? '' : 'судья не заметил');
  /* урок 27.11: малышку и большую мерили в разных местах мира, и замер малышки скакал от 190 до 990 частей — сторож краснел сам. Теперь пара мерится в одной точке P. */
  const zamer = async (m, P) => { await p.evaluate(m => { const w = zaplyvWorld(); w.me.forEach(a => a.m = m); w.me.length = 1; }, m);
    for (let i = 0; i < 8; i++) { await p.evaluate(([i, P]) => { const a = zaplyvWorld().me[0]; if (P) { a.x = P.x + Math.cos(i) * 80; a.y = P.y + Math.sin(i) * 80; } else { a.x += Math.cos(i) * 80; a.y += Math.sin(i) * 80; } }, [i, P]); await p.waitForTimeout(400); }
    return p.evaluate(() => new Promise(r => { const t = [], L = []; let l = performance.now(); const f = n => { t.push(n - l); l = n; L.push(kaplyaLod()); if (t.length < 40) requestAnimationFrame(f); else { t.sort((a, b) => a - b); const med = k => L.map(x => x[k]).sort((a, b) => a - b)[20]; r({ kadr: Math.round(t[20]), tel: med('tel'), chastey: med('chastey') }); } }; requestAnimationFrame(f); })); };
  // П5, П87: у линейки столбик живых силуэтов — кадр самой игры, а не пустая вода. Судья: среднее по силуэту ярче порога; самопроверка — чёрный кадр судья ловит.
  const yarko = src => p.evaluate(src => new Promise(r => { const im = new Image(); im.onload = () => { const c = document.createElement('canvas'); c.width = c.height = 24; const g = c.getContext('2d'); g.drawImage(im, 0, 0, 24, 24); const d = g.getImageData(0, 0, 24, 24).data; let s = 0; for (let i = 0; i < d.length; i += 4) s += Math.max(d[i], d[i + 1], d[i + 2]); r(s / 576); }; im.onerror = () => r(0); im.src = src; }), src);
  for (let i = 0; i < 6; i++) { await p.evaluate(i => { const a = zaplyvWorld().me[0]; a.x += 300 * Math.cos(i * 2); a.y += 300 * Math.sin(i * 2); }, i); await p.waitForTimeout(1000); }
  const sil = await p.evaluate(() => ({ s: kaplyaLin() ? Object.values(kaplyaLin().sil) : [], ty: !!document.querySelector('#klin i') }));
  const ya = []; for (const src of sil.s) ya.push(Math.round(await yarko(src)));
  check('test_kaplya_lineyka: у линейки силуэты из кадра игры и ты между ними (П5, П87)', !sil.s.length ? 'ни одного силуэта' : !sil.ty ? 'нет метки «ты»' : Math.max(...ya) < 60 ? `силуэты тёмные: ${ya}` : '');
  const chern = await yarko('data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24"><rect width="24" height="24" fill="#051018"/></svg>'));
  check('test_kaplya_lineyka_samoproverka: тёмный кадр судья ловит', chern < 60 ? '' : 'судья не отличает тёмное');
  const medN = A => Object.fromEntries(Object.keys(A[0]).map(k => [k, A.map(x => x[k]).sort((a, b) => a - b)[A.length >> 1]])); /* урок 26.11: один замер мира скачет — медиана попеременных замеров */
  const S3 = [], V3 = [], P0 = await p.evaluate(() => { const a = zaplyvWorld().me[0]; return { x: a.x, y: a.y }; });
  for (let i = 0; i < 5; i++) { const P = { x: P0.x + 400 * Math.cos(i * 1.3), y: P0.y + 400 * Math.sin(i * 1.3) }; S3.push(await zamer(1.4, P)); V3.push(await zamer(150, P)); }
  /* малышку берём по её тяжёлым местам (второй сверху замер из пяти): телефон их уже тянет, большая не должна быть тяжелее их в 1,5 раза. Большую по медиане. */
  const verh = A => Object.fromEntries(Object.keys(A[0]).map(k => [k, A.map(x => x[k]).sort((a, b) => a - b)[A.length - 2]]));
  const s = verh(S3), v = medN(V3); console.log('  малышка', JSON.stringify(s), 'большая', JSON.stringify(v));
  check('test_nagruzka_rost: большая клетка (масса 150) не тяжелее малышки больше чем в 1,5 раза', sud(s, v));
  await p.evaluate(() => { window.kaplyaBezLod = true; }); const v0 = await zamer(150); await p.evaluate(() => { window.kaplyaBezLod = false; });
  console.log('  без взвеси', JSON.stringify(v0)); check('test_nagruzka_samoproverka: без взвеси сторож краснеет', sud(s, v0) ? '' : `без взвеси всё равно зелёный: ${JSON.stringify(v0)}`);
  check('test_nagruzka_oshibki: игра без ошибок', errs.length ? errs.join('; ') : '');
  await b.close(); srv.close(); process.exit(bad ? 1 : 0); })();
