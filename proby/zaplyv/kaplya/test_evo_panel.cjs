// Сторож панели «Эволюция» (блок Э PR 1, pravki_po_blokam.md 8а.6): node proby/zaplyv/kaplya/test_evo_panel.cjs. Провал — код 1.
// Роман 27.11 14:29 (И25): «Зачем она скрыта?… Нужно чтобы эволюция была централизована не скрыта».
// test_panel_evo_pravda: настоящая партия, клетке выданы гены; касание спирали ДНК открывает панель, мир на паузе. Черты равны данным игры
// (размер как на экране, уровень оружия, число генов защиты), каждый ген назван словами книги, каждая видимая часть подписана линией.
// test_panel_evo_shansy_rod: съеденные кусочки гена — полоска шанса мутации и «чей кусочек»; дерево рода: ты, дочки, внучка, мутантки цветом, линии к матери.
// test_panel_evo_kadr: на 390×844 и 375×667 снимок и черты помещаются без прокрутки. Самопроверки: снятая подпись и чужое число судья краснеет.
const http = require('http'), fs = require('fs'), path = require('path');
const KOREN = path.resolve(__dirname, '..'), TIP = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.mp3': 'audio/mpeg' };
const KAP = JSON.parse(fs.readFileSync(path.join(__dirname, 'kaplya.json'))), GENY = JSON.parse(fs.readFileSync(path.join(KOREN, 'kniga/teksty_genov.json'))).geny;
const imya = g => (Object.values(GENY).find(q => q.klyuch === g) || Object.values(GENY).find(q => q.plan === g) || {}).imya || g;
const GENES = { toxin: true, capsule: true, flagellum: true, lock: true }, LVL = { toxin: 2 };
let bad = 0; const check = (n, e) => { console.log((e ? '  ПРОВАЛ ' : '  ок ') + n + (e ? ': ' + e : '')); if (e) bad++; };
// r — что на панели; ждём: размер как в HUD, оружие ур. 2, защиты 2 (капсула, замок), гены словами книги, у каждой видимой части подпись
const M = KAP.mutaciya, V = M.ves, zhgutik = Math.round((M.shans * V.filter(x => x === 'zhgutik').length / V.length + Math.min(M.kusok_max, 3 * M.kusok)) * 100) + ' %';
const sudRod = r => [!r.zhg && 'нет полоски «лишний жгутик»', r.zhg && r.zhg.pr !== zhgutik && `шанс жгутика ${r.zhg && r.zhg.pr}, по данным ${zhgutik}`, r.zhg && !/туфелька ×2/.test(r.zhg.kto) && `чей кусочек: «${r.zhg.kto}»`,
  r.tochek !== 4 && `в дереве точек ${r.tochek}, нужно 4 (ты и трое)`, r.cvetnyh !== 2 && `мутанток цветом ${r.cvetnyh}, нужно 2`, r.liniy !== 3 && `линий ${r.liniy}, нужно 3`].filter(Boolean).join('; ');
const sud = r => [!r.pauza && 'мир не на паузе', r.cherty.razmer !== r.hud && `размер ${r.cherty.razmer}, на экране ${r.hud}`, r.cherty.oruzhie !== 'ур. 2' && `оружие «${r.cherty.oruzhie}»`,
  r.cherty.zashchita !== '2' && `защита «${r.cherty.zashchita}»`, Object.keys(GENES).some(g => !r.geny.includes(imya(g))) && 'гены не словами книги: ' + r.geny.join(', '),
  r.vidny.length < 2 && 'видимых частей меньше двух: ' + r.vidny.join(', '), r.vidny.some(n => !r.podpisi.includes(n)) && 'не подписаны: ' + r.vidny.filter(n => !r.podpisi.includes(n)).join(', ')].filter(Boolean).join('; ');
(async () => {
  const srv = http.createServer((q, s) => { const f = path.join(KOREN, decodeURIComponent(q.url.split('?')[0])); const ff = fs.existsSync(f) && fs.statSync(f).isDirectory() ? path.join(f, 'index.html') : f;
    if (!ff.startsWith(KOREN) || !fs.existsSync(ff)) { s.writeHead(404); return s.end(); } s.writeHead(200, { 'Content-Type': TIP[path.extname(ff)] || 'application/octet-stream' }); fs.createReadStream(ff).pipe(s); }).listen(0);
  const pw = await import(process.env.PW || 'playwright').then(m => m.default || m); // на CI путь даёт шаг (tools/web/kaplya_pw.sh)
  const b = await pw.chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME, args: ['--no-sandbox'] } : {});
  for (const [W, H] of [[390, 844], [375, 667]]) { const p = await b.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: process.env.KADR ? 2 : 1, isMobile: true, hasTouch: true }), osh = []; p.on('pageerror', e => osh.push(e.message));
    await p.goto(`http://127.0.0.1:${srv.address().port}/kaplya/`); await p.waitForFunction(() => window.zaplyvWorld && zaplyvWorld() && zaplyvWorld().stats.time > 2, null, { timeout: 90000 });
    await p.evaluate(([G, L]) => { const w = zaplyvWorld(); if (window.kaplyaKarta) kaplyaKarta().pauza = false; w.choice = []; Object.assign(w.genes, G); w.lvl = { ...(w.lvl || {}), ...L }; }, [GENES, LVL]);
    await p.evaluate(() => { const w = zaplyvWorld(), a = w.me[0], E = window.kaplyaEvo(); E.kusok({ ot: 'tufelka', n: 1 }); E.kusok({ ot: 'tufelka', n: 1 }); E.kusok({ ot: 'spirilla', n: 1 });
      w.staya = [{ id: 9900, ot: 0, pok: 1, mut: 'ship', x: a.x + 40, y: a.y, a: 0, m: 0.5, t: 0, sama: 0, T: 30, mt: 0 }, { id: 9901, ot: 0, pok: 1, x: a.x - 40, y: a.y, a: 0, m: 0.5, t: 0, sama: 0, T: 30, mt: 0 }, { id: 9902, ot: 9900, pok: 2, mut: 'ship', x: a.x + 60, y: a.y + 20, a: 0, m: 0.5, t: 0, sama: 0, T: 30, mt: 0 }]; }); /* съела 2 кусочка туфельки и 1 спириллы; стая в два поколения */
    await p.waitForTimeout(800); const box = await p.evaluate(() => { const r = document.getElementById('evobtn').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, h: r.height }; });
    await p.touchscreen.tap(box.x, box.y); await p.waitForTimeout(1200); const t0 = await p.evaluate(() => zaplyvWorld().stats.time); await p.waitForTimeout(600);
    const r = await p.evaluate(() => { const e = document.getElementById('evo'), ch = {}; for (const d of e.querySelectorAll('.echerty div')) ch[d.dataset.k] = d.childNodes[1].textContent;
      const M = window.kaplyaEvo().model, nz = M.chasti.filter(c => c.x != null).map(c => c.imya), ech = e.querySelector('.echerty').getBoundingClientRect();
      return { otkryto: e.classList.contains('on'), cherty: ch, hud: (document.getElementById('count').textContent.match(/[\d,]+\s*мкм/) || [''])[0].replace(/\s+/g, ' '), geny: [...e.querySelectorAll('li b')].map(x => x.textContent),
        zhg: (x => x && { pr: x.querySelector('span').textContent, kto: x.querySelector('small').textContent })(e.querySelector('.eshans li[data-m="zhgutik"]')), tochek: e.querySelectorAll('.erod circle').length, cvetnyh: [...e.querySelectorAll('.erod circle')].filter(c => /^#/.test(c.getAttribute('fill')) && c.getAttribute('r') === '6').length, liniy: e.querySelectorAll('.erod line').length,
        vidny: nz, podpisi: [...e.querySelectorAll('svg text')].map(x => x.textContent), vlezlo: ech.bottom <= innerHeight + 1, t: zaplyvWorld().stats.time }; });
    r.pauza = Math.abs(r.t - t0) < 0.05; r.cherty.razmer = (r.cherty.razmer || '').replace(/\s+/g, ' ');
    if (process.env.KADR) await p.screenshot({ path: path.join(process.env.KADR, `evo_${W}x${H}.png`) });
    if (process.env.KADR) { await p.evaluate(() => { document.getElementById('evo').scrollTop = 360; }); await p.waitForTimeout(200); await p.screenshot({ path: path.join(process.env.KADR, `evo_${W}x${H}_niz.png`) }); }
    check(`test_panel_evo_pravda ${W}×${H}: касание ДНК открыло панель, черты и гены — данные игры, части подписаны (${r.vidny.join(', ')})`, (r.otkryto ? '' : 'панель не открылась; ') + sud(r) + (osh.length ? ' ошибки: ' + osh.join('; ') : ''));
    if (W === 390) { check(`test_panel_evo_shansy_rod: шанс жгутика ${zhgutik} с кусочками «туфелька ×2», дерево — ты, две дочки и внучка, мутантки цветом`, sudRod(r));
      check('test_panel_evo_shansy_samoproverka: шанс без кусочков — судья краснеет', sudRod({ ...r, zhg: { ...r.zhg, pr: '1 %' } }) ? '' : 'не заметил'); }
    check(`test_panel_evo_kadr ${W}×${H}: снимок и черты без прокрутки`, r.vlezlo ? '' : 'черты ниже края экрана');
    if (W === 390) { await p.evaluate(() => document.querySelector('#evo .ezak').click()); const t1 = await p.evaluate(() => zaplyvWorld().stats.time); await p.waitForTimeout(700);
      const z = await p.evaluate(() => ({ on: document.getElementById('evo').classList.contains('on'), t: zaplyvWorld().stats.time })); check('test_panel_evo_zakryt: «Плыть дальше» закрывает панель, мир снова идёт', !z.on && z.t > t1 + 0.1 ? '' : JSON.stringify(z)); }
    if (W === 390) { check('test_panel_evo_samoproverka: снятая подпись части — судья краснеет', sud({ ...r, podpisi: r.podpisi.slice(1) }) ? '' : 'не заметил');
      check('test_panel_evo_samoproverka_chislo: чужой уровень оружия — судья краснеет', sud({ ...r, cherty: { ...r.cherty, oruzhie: 'ур. 1' } }) ? '' : 'не заметил'); }
    await p.close(); }
  await b.close(); srv.close(); process.exit(bad ? 1 : 0); })().catch(e => { console.log('  ПРОВАЛ test_evo_panel: ' + e.message); process.exit(1); });
