// Сторож экрана гибели «Капли» (блок В.1, pravki_po_blokam.md 4.6): node proby/zaplyv/kaplya/test_gibel.cjs. Провал — код 1.
// Игроки 3b2484a: «Гибель: амёба», когда поймала туфелька; столбик значков поверх кнопок экрана гибели. 27.11: трубач показывался как «Это ты / Кишечная палочка».
// test_ubiyca_veren: у каждого, кто может убить по данным (gibel.ubiycy), есть имя и снимок; укол и яд соперницы — на ней (boj.gibel_ot); сверло в любом жителе — на нём.
// test_ekran_gibeli_kadr: настоящая партия 390×844, гибель от ручной туфельки, трубача и парафизомонады: имя убийцы, снимок не пустой, середину каждой кнопки не закрывает ничто.
// Самопроверки: убийца без имени и экран без защиты от значков (поверх кнопок значок, как линейка) судья краснеет.
const http = require('http'), fs = require('fs'), path = require('path');
const KOREN = path.resolve(__dirname, '..'), TIP = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.mp3': 'audio/mpeg' };
const KAP = JSON.parse(fs.readFileSync(path.join(__dirname, 'kaplya.json')));
let bad = 0; const check = (n, e) => { console.log((e ? '  ПРОВАЛ ' : '  ок ') + n + (e ? ': ' + e : '')); if (e) bad++; };
const sudUbiycy = (spisok, me) => spisok.filter(([, imya, snimok]) => !imya || imya === me || !snimok).map(([k, imya, s]) => k + (imya ? '' : ' без имени') + (s ? '' : ' без снимка')).join(', ');
// кадр экрана гибели: имя, снимок, кнопки открыты
const sudKadr = (r, imya) => [r.imya !== imya && `имя «${r.imya}», нужно «${imya}»`, !(r.snimok > 8) && `снимок пустой (разброс ${r.snimok})`, r.zakryto.length && 'кнопки закрыты: ' + r.zakryto.join(', ')].filter(Boolean).join('; ');
(async () => {
  const gib = await import('./gibel.js'); const B = KAP.boj;
  check('test_ubiyca_veren_yad: укол и яд соперницы записаны на ту, кто бьёт (boj.na_tebya.kto = boj.gibel_ot)', Object.values(B.na_tebya).filter(x => x && x.kto).every(x => x.kto.length === 1 && x.kto[0] === B.gibel_ot) ? '' : 'гибель по геному пишется не на того, кто бил');
  const SP = { parafizo: 'parafizo', trubach: 'trubachi' }, L = { amoeba: 'amoebas', slipper: 'slippers' };
  check('test_ubiyca_veren_sverlo: съели в сверле — убийца тот, в ком сверлила (не «амёба» по умолчанию)', gib.poSpisku('parafizo', L, SP) === 'parafizo' && gib.poSpisku('slippers', L, SP) === 'slipper' && gib.poSpisku('nichey', L, SP) === null ? '' : 'список мира не находит жителя');
  const srv = http.createServer((q, s) => { const f = path.join(KOREN, decodeURIComponent(q.url.split('?')[0])); const ff = fs.existsSync(f) && fs.statSync(f).isDirectory() ? path.join(f, 'index.html') : f;
    if (!ff.startsWith(KOREN) || !fs.existsSync(ff)) { s.writeHead(404); return s.end(); } s.writeHead(200, { 'Content-Type': TIP[path.extname(ff)] || 'application/octet-stream' }); fs.createReadStream(ff).pipe(s); }).listen(0);
  const pw = await import(process.env.PW || 'playwright').then(m => m.default || m); // на CI путь даёт шаг (tools/web/kaplya_pw.sh)
  const b = await pw.chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME, args: ['--no-sandbox'] } : {});
  const gibel = async (kto, bez) => { const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true }), osh = []; p.on('pageerror', e => osh.push(e.message));
    await p.goto(`http://127.0.0.1:${srv.address().port}/kaplya/`); await p.waitForFunction(() => window.zaplyvWorld && zaplyvWorld() && zaplyvWorld().stats.time > 2, null, { timeout: 90000 });
    if (bez) await p.addStyleTag({ content: '#end { z-index: auto !important; } #zachem { position: fixed; z-index: 2; left: 0; right: 0; bottom: 0; height: 60%; background: #f00; }' }).then(() => p.evaluate(() => document.body.appendChild(Object.assign(document.createElement('div'), { id: 'zachem' }))));
    for (let i = 0; i < 40 && !(await p.evaluate(() => document.getElementById('end').classList.contains('on'))); i++) { // род будит сестру — гибнем, пока не кончится род
      await p.evaluate(k => { const w = zaplyvWorld(); w.genes.spore = false; for (const a of [...w.me]) w.lose(a, a.x, a.y, k); }, kto); await p.waitForTimeout(400); }
    await p.waitForTimeout(600);
    const r = await p.evaluate(() => { const i = document.getElementById('ckill'); let snimok = 0;
      if (!i.hidden && i.naturalWidth) { const c = document.createElement('canvas'); c.width = 48; c.height = 30; const g = c.getContext('2d'); g.drawImage(i, 0, 0, 48, 30); const d = g.getImageData(0, 0, 48, 30).data; let s = 0, s2 = 0, n = 0; for (let j = 0; j < d.length; j += 4) { const v = d[j] + d[j + 1] + d[j + 2]; s += v; s2 += v * v; n++; } snimok = Math.round(Math.sqrt(s2 / n - (s / n) ** 2)); }
      const zakryto = [...document.querySelectorAll('#ebtns button')].filter(x => x.offsetParent && x.getBoundingClientRect().bottom <= innerHeight).filter(x => { const r = x.getBoundingClientRect(), e = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return !e || !x.contains(e); }).map(x => x.id);
      return { imya: document.getElementById('cname').textContent, snimok, zakryto }; });
    const sp = await p.evaluate(() => window.kaplyaUbiycy());
    if (process.env.KADR) await p.screenshot({ path: path.join(process.env.KADR, `gibel_${kto}${bez ? '_bez' : ''}.png`) }); await p.close(); return { ...r, osh, sp }; };
  const imena = { slipper: 'Туфелька', trubach: KAP.gibel.kto.trubach.imya, parafizo: KAP.karty_krupnyh.parafizo.name };
  const vse = []; for (const k of Object.keys(imena)) vse.push([k, await gibel(k)]);
  const me = JSON.parse(fs.readFileSync(path.join(KOREN, 'cards.json'))).me.name, sp = vse[0][1].sp;
  check(`test_ubiyca_veren: у всех ${sp.length}, кто может убить, есть имя (не «${me}») и снимок`, sudUbiycy(sp, me));
  check('test_ubiyca_veren_samoproverka: убийца без имени судья краснеет', sudUbiycy([...sp, ['zver', null, true]], me) ? '' : 'не заметил');
  for (const [k, r] of vse) check(`test_ekran_gibeli_kadr ${k}: «${imena[k]}», снимок, кнопки открыты`, sudKadr(r, imena[k]) || (r.osh.length ? 'ошибки: ' + r.osh.join('; ') : ''));
  const s = await gibel('slipper', true);
  check('test_ekran_gibeli_kadr_samoproverka: значок поверх кнопок судья видит', sudKadr(s, imena.slipper).includes('кнопки закрыты') ? '' : 'не заметил');
  await b.close(); srv.close(); process.exit(bad ? 1 : 0); })().catch(e => { console.log('  ПРОВАЛ test_gibel: ' + e.message); process.exit(1); });
