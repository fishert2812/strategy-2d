// Стенд сравнения «Заплыва» (кусок Ж, proby/zaplyv/stend.js): на iPhone 16 открывается /zaplyv/?stend, для каждой пары
// из stend.json касанием выбирается пара, и в кадре обе половины непустые: слева ручной рисунок, справа запись движка.
// «Непустая» — в квадрате вокруг существа много резких перепадов яркости (тело, кромка, жгутики); размытый фон их не даёт.
// Выход касанием «‹ Выход» ведёт в игру. Паспорт: что заказано (пары) и что получилось (точек в каждой половине, кадры).
// node tools/web/zaplyv_stend.mjs <адрес /zaplyv/> [--selftest] [--kadry <папка>]
const pw = await import(process.env.PW || 'playwright').then(m => m.default || m);
const fs = await import('node:fs');
const url = process.argv[2], selftest = process.argv.includes('--selftest'), ki = process.argv.indexOf('--kadry'), kadry = ki > 0 ? process.argv[ki + 1] : '';
const S = JSON.parse(fs.readFileSync(new URL('../../proby/zaplyv/stend.json', import.meta.url), 'utf8'));
const opts = process.env.CHROME ? { executablePath: process.env.CHROME, args: ['--no-sandbox'] } : {};
const b = await pw.chromium.launch(opts);
const PROG = 250; // перепадов в квадрате существа меньше — половина пустая (пустая вода даёт десятки)

async function prohod(lomat) {
  const p = await (await b.newContext({ ...pw.devices['iPhone 16'], deviceScaleFactor: 1 })).newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  let bad = 0, pust = 0; const say = (ok, t) => { console.log((lomat ? '    [сломано: ' + lomat + '] ' : '') + (ok ? '  ок   ' : '  ПРОВАЛ ') + t); if (!ok) bad++; };
  await p.goto(url + '?stend' + (lomat ? '&lomat=' + lomat : ''), { timeout: 60000 });
  await p.waitForFunction(() => window.zaplyvStend && window.zaplyvProbe && zaplyvProbe.frames > 30, null, { timeout: 40000 });
  for (const P of S.pary) {
    await p.getByRole('button', { name: P.imya }).tap(); await p.waitForTimeout(700);
    const st = await p.evaluate(() => { const s = window.zaplyvStend, sc = window.zaplyvScr; return { ...s, L: sc(s.levo.x, s.levo.y), R: sc(s.pravo.x, s.pravo.y), frames: zaplyvProbe.frames }; });
    const png = await p.screenshot(); if (kadry && !lomat) fs.writeFileSync(`${kadry}/stend_${P.kto}.png`, png);
    const n = await p.evaluate(async ([src, boxes]) => { const im = new Image(); im.src = src; await im.decode();
      const c = document.createElement('canvas'); c.width = im.width; c.height = im.height; const g = c.getContext('2d'); g.drawImage(im, 0, 0);
      return boxes.map(([x, y]) => { const r = 70, d = g.getImageData(Math.round(x - r), Math.round(y - r), 2 * r, 2 * r).data, L = i => d[i] * 0.3 + d[i + 1] * 0.59 + d[i + 2] * 0.11; let k = 0;
        for (let v = 0; v < 2 * r - 1; v++) for (let u = 0; u < 2 * r - 1; u++) { const i = (v * 2 * r + u) * 4; if (Math.abs(L(i) - L(i + 4)) > 24 || Math.abs(L(i) - L(i + 8 * r)) > 24) k++; }
        return k; }); }, ['data:image/png;base64,' + png.toString('base64'), [st.L, st.R]]);
    if (!(n[0] >= PROG && n[1] >= PROG)) pust++;
    say(st.para === P.kto && n[0] >= PROG && n[1] >= PROG, `test_stend_obe_poloviny: «${P.imya}» — заказано: слева ручной рисунок (${P.ruka}), справа движок (${P.dvizhok}); получилось: слева ${n[0]} перепадов, справа ${n[1]} (${st.dvizhok}${st.chernovik ? ', черновик' : ''}), порог ${PROG}, кадров ${st.frames}`);
    const sz = await p.evaluate(() => [...document.querySelectorAll('#st a, #sk button')].map(e => { const r = e.getBoundingClientRect(); return [e.textContent, r.width, r.height]; }));
    const mal = sz.filter(([, w, h]) => Math.min(w, h) < 43.5); say(!mal.length, `test_stend_obe_poloviny: кнопки стенда не меньше 44` + (mal.length ? ': ' + mal.map(m => m[0]).join(', ') : ''));
  }
  await p.goto(url + '?stend' + (lomat ? '&lomat=' + lomat : ''), { timeout: 60000 }); // второй запуск: игра открывается меню режимов
  const vtoroy = await p.waitForFunction(() => window.zaplyvStend && zaplyvProbe.cells > 0, null, { timeout: 30000 }).then(() => true, () => false);
  say(vtoroy, 'test_stend_obe_poloviny: со второго запуска (игра открывается меню) стенд всё равно показывает пару');
  await p.getByText(S.slova.nazad).tap(); await p.waitForTimeout(1500);
  say(!/stend/.test(p.url()), `test_stend_obe_poloviny: «${S.slova.nazad}» касанием ведёт в игру (${p.url().replace(/^https?:\/\/[^/]+/, '')})`);
  say(!errs.length, 'test_stend_obe_poloviny: без ошибок скрипта' + (errs.length ? ': ' + errs[0] : ''));
  await p.context().close(); return lomat ? pust : bad;
}

let code = 0;
if (!selftest) { const bad = await prohod(''); console.log(`  паспорт: экран iPhone 16 393×852, пар ${S.pary.length} (${S.pary.map(p => p.kto).join(', ')}), провалов ${bad}`); code = bad ? 1 : 0; }
else for (const l of ['levo', 'pravo']) { const pust = await prohod(l); // каждая пара обязана покраснеть
  if (pust === S.pary.length) console.log(`  самопроверка: без ${l === 'levo' ? 'левой' : 'правой'} половины test_stend_obe_poloviny красный (так и должно быть)`);
  else { console.log(`  САМОПРОВЕРКА: ${l === 'levo' ? 'левой' : 'правой'} половины нет, а проверка зелёная — она ничего не доказывает`); code = 1; } }
await b.close(); process.exit(code);
