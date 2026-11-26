// Стенд сравнения с образцом (proby/zaplyv/stend/obrazec.html): каждая запись существа из vid_chasti.json (раздел vidy) — кадр
// iPhone 16, сверху цветной образец из design/referensy/, снизу та же запись, собранная движком из частей. Один PNG на существо
// и лист всех разом (vse.png) — вход для оценки сходства отдельной сессией. Нет записи, нет строки образца в stend/obrazcy.json,
// нет файла образца, движок ничего не нарисовал — красное, а не пустой кадр.
// node tools/web/sravnenie.mjs <адрес /zaplyv/> [--obrazcy <папка referensy>] [--kadry <папка>] [--selftest] [vid …]
const pw = await import(process.env.PW || 'playwright').then(m => m.default || m);
const fs = await import('node:fs'), path = await import('node:path');
const A = process.argv.slice(2), arg = k => { const i = A.indexOf(k); return i >= 0 ? A.splice(i, 2)[1] : null; };
const selftest = A.includes('--selftest') && A.splice(A.indexOf('--selftest'), 1);
const OBR = arg('--obrazcy') || '/mnt/project-files/design/referensy', KADRY = arg('--kadry'), url = A.shift();
const VC = JSON.parse(fs.readFileSync(new URL('../../proby/zaplyv/vid_chasti.json', import.meta.url), 'utf8'));
const OB = JSON.parse(fs.readFileSync(new URL('../../proby/zaplyv/stend/obrazcy.json', import.meta.url), 'utf8'));
const opts = process.env.CHROME ? { executablePath: process.env.CHROME, args: ['--no-sandbox'] } : {};
const IM = pw.devices['iPhone 16'] ? 'iPhone 16' : 'iPhone 15', DEV = pw.devices[IM]; // в старом playwright iPhone 16 нет: тот же экран 393
const PROG = 0.004; // доля резких перепадов яркости в нижней половине: пустая вода — около нуля
const b = await pw.chromium.launch(opts);

async function snyat(vid, obr, ctx, say) {
  const p = await ctx.newPage(), errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto(url + 'stend/obrazec.html?vid=' + encodeURIComponent(vid), { timeout: 60000 });
  await p.waitForFunction(() => window.sravnenie?.gotov && window.sravnenie.kadrov > 20, null, { timeout: 40000 }).catch(() => {});
  const s = await p.evaluate(() => window.sravnenie || {}), M = OB.vidy[vid], f = M && path.join(obr, M.papka, M.fail);
  let ok = !!s.gotov && !s.oshibka, pochemu = s.gotov ? s.oshibka : 'страница не открылась' + (errs[0] ? ': ' + errs[0] : '');
  if (ok && !fs.existsSync(f)) { ok = false; pochemu = 'нет файла образца ' + f; }
  if (ok) { const typ = /\.png$/i.test(f) ? 'png' : 'jpeg', vz = await p.evaluate(([d, t]) => window.obrazec(d, t), ['data:image/' + typ + ';base64,' + fs.readFileSync(f).toString('base64'), M.fail]);
    if (!vz) { ok = false; pochemu = 'образец не открылся: ' + f; } }
  await p.waitForTimeout(400);
  const png = await p.screenshot();
  const dolya = await p.evaluate(async src => { const im = new Image(); im.src = src; await im.decode(); const c = document.createElement('canvas'); c.width = im.width; c.height = im.height; const g = c.getContext('2d'); g.drawImage(im, 0, 0);
    const y0 = Math.round(im.height * 0.56), h = Math.round(im.height * 0.4), d = g.getImageData(0, y0, im.width, h).data, L = i => d[i] * 0.3 + d[i + 1] * 0.59 + d[i + 2] * 0.11; let k = 0;
    for (let v = 0; v < h - 1; v++) for (let u = 0; u < im.width - 1; u++) { const i = (v * im.width + u) * 4; if (Math.abs(L(i) - L(i + 4)) > 24 || Math.abs(L(i) - L(i + 4 * im.width)) > 24) k++; }
    return k / (im.width * h); }, 'data:image/png;base64,' + png.toString('base64'));
  if (ok && !(s.chastey > 0 && dolya >= PROG)) { ok = false; pochemu = `движок ничего не нарисовал (частей ${s.chastey}, перепадов ${(dolya * 100).toFixed(2)} %)`; }
  if (ok && errs.length) { ok = false; pochemu = 'ошибка скрипта: ' + errs[0]; }
  say(ok, `test_sravnenie_obrazec: «${vid}» — заказано: запись vid_chasti.json и образец ${M ? M.papka + '/' + M.fail : '(нет строки)'}; получилось: ` + (ok ? `частей ${s.chastey}, перепадов внизу ${(dolya * 100).toFixed(2)} % (порог ${PROG * 100} %), кадров ${s.kadrov}` : pochemu));
  await p.close(); return ok ? png : null;
}

async function prohod(vidy, obr, kadry, tiho) {
  const ctx = await b.newContext({ ...DEV, hasTouch: true, isMobile: true }); let bad = 0; const gotovo = [];
  const say = (ok, t) => { if (!tiho) console.log((ok ? '  ок   ' : '  ПРОВАЛ ') + t); if (!ok) bad++; };
  for (const v of vidy) { const png = await snyat(v, obr, ctx, say); if (png) { gotovo.push([v, png]); if (kadry) fs.writeFileSync(path.join(kadry, v + '.png'), png); } }
  if (kadry && gotovo.length) { const p = await (await b.newContext({ viewport: { width: 1200, height: 800 } })).newPage(); // лист всех записей разом
    await p.setContent(`<body style="margin:0;background:#04101a;display:grid;grid-template-columns:repeat(${Math.min(4, gotovo.length)},1fr);gap:12px;padding:12px;font:600 22px system-ui;color:#dff3f5">` +
      gotovo.map(([v, png]) => `<figure style="margin:0"><figcaption style="padding:4px 0 8px">${v}</figcaption><img style="width:100%" src="data:image/png;base64,${png.toString('base64')}"></figure>`).join('') + '</body>');
    await p.waitForTimeout(300); fs.writeFileSync(path.join(kadry, 'vse.png'), await p.screenshot({ fullPage: true })); await p.close(); }
  await ctx.close(); return bad;
}

const vse = A.length ? A : Object.keys(VC.vidy).filter(k => !VC.vidy[k].igra);
let code = 0;
if (!selftest) { if (KADRY) fs.mkdirSync(KADRY, { recursive: true });
  const bad = await prohod(vse, OBR, KADRY);
  for (const v of Object.keys(OB.vidy)) if (!VC.vidy[v]) { console.log(`  ПРОВАЛ test_sravnenie_obrazec: в stend/obrazcy.json «${v}», а записи в vid_chasti.json нет`); code = 1; }
  console.log(`  паспорт: экран ${IM} ${DEV.viewport.width}×${DEV.viewport.height}, записей ${vse.length} (${vse.join(', ')}), образцы из ${OBR}, провалов ${bad}` + (KADRY ? `, кадры в ${KADRY}` : ''));
  if (bad) code = 1;
} else {
  const pusto = fs.mkdtempSync(path.join((await import('node:os')).tmpdir(), 'obr-'));
  for (const [chto, vidy, obr] of [['записи нет', ['net_takoy_zapisi'], OBR], ['образца нет', vse.slice(0, 1), pusto]]) {
    const bad = await prohod(vidy, obr, null, true);
    if (bad === vidy.length) console.log(`  самопроверка: ${chto} — test_sravnenie_obrazec красный (так и должно быть)`);
    else { console.log(`  САМОПРОВЕРКА: ${chto}, а test_sravnenie_obrazec зелёный — проверка ничего не доказывает`); code = 1; } }
}
await b.close(); process.exit(code);
