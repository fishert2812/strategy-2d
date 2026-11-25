// Структура меню «Заплыва» (урок L037, test_L037). Роман 25.11: «меню паузы не структурированное… все в разнобой… только на чипах…
// уже который раз меню поправить прошу». Меню чинили заплатками в чужих задачах, и структуру никто не проверял.
// Обход на iPhone 13 пальцем: у каждого экрана меню — заголовок сверху, главное действие внизу под большим пальцем,
// путь назад на каждом уровне, разделы — строками (не чипами), главное отделено от справочного и служебного,
// всё целиком на экране без прокрутки, кнопки не меньше 44. Новый экран меню — новая строка в SCREENS.
// node tools/web/zaplyv_menu.mjs <адрес /zaplyv/> [--selftest]
const pw = await import(process.env.PW || 'playwright').then(m => m.default || m);
const url = process.argv[2], selftest = process.argv.includes('--selftest');
const opts = process.env.CHROME ? { executablePath: process.env.CHROME, args: ['--no-sandbox'] } : {};
const b = await pw.chromium.launch(opts);
// Экраны меню: заголовок, главное действие, назад (куда ведёт), разделы (куда ведут), действия, служебное.
const SCREENS = [
  { name: 'Пауза', level: 1, title: 'Пауза', primary: '#gon', exit: 'game', nav: { '#phub [data-t=genome]': 'Геном', '#phub [data-t=alm]': 'Альманах', '#phub [data-t=map]': 'Карта' }, actions: ['#pnew', '#gmenu'], service: ['#psound', '#gflag'] },
  { name: 'Геном', level: 2, title: 'Геном', primary: '#gon', back: '#gback', to: 'Пауза', service: ['#gflag'] },
  { name: 'Альманах', level: 2, title: 'Альманах', primary: '#gon', back: '#gback', to: 'Пауза', service: ['#gflag'] },
  { name: 'Режимы', level: 2, tsel: '#mtop h1', title: 'Режимы', primary: '#mgo', back: '#mback', to: 'Пауза', nav: { '#malm': 'Альманах' }, actions: ['#mnew'], service: ['#mquiet'] },
  { name: 'Карта', level: 2, title: 'Карта', primary: '#gon', back: '#gback', to: 'Пауза', service: ['#gflag'] },
];
// Нарочно сломанные меню для самопроверки: каждое обязано дать красное.
const BROKEN = {
  'разделы чипами': '.prow { width: 110px !important; min-height: 44px !important; height: 44px !important; border-radius: 22px !important; }',
  'нет пути назад': '#gback { display: none !important; }',
  'главное сверху': '#gbar { order: -1; margin-top: 0 !important; }',
  'нет заголовка': '#gtitle { display: none !important; }',
  'связи не строками': '.kl { width: 120px !important; }',
  'значков нет': '.pico { display: none !important; }',
  'Альманах в режимах чипом': '#malm { width: 120px !important; min-height: 44px !important; border-radius: 22px !important; }',
};
async function walk(css) {
  const p = await (await b.newContext({ ...pw.devices['iPhone 13'] })).newPage();
  await p.addInitScript(() => { try { localStorage.setItem('zaplyv.met', JSON.stringify(['me', 'bdello', 'phage', 'amoeba'])); } catch (_) {} }); // игрок уже встречал красную запятую: у карточки «Ты» всегда есть связь «кто ест», по которой можно перейти (без этого проверка зависела от случайной встречи в начале заплыва)
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  let bad = 0; const say = (ok, t) => { if (!css) console.log((ok ? '  ок   ' : '  ПРОВАЛ ') + t); if (!ok) bad++; };
  await p.goto(url, { timeout: 60000 });
  await p.waitForFunction(() => window.zaplyvProbe && zaplyvProbe.frames > 20, null, { timeout: 30000 });
  if (css) await p.addStyleTag({ content: css });
  const box = s => p.evaluate(s => { const e = document.querySelector(s); if (!e) return null; const r = e.getBoundingClientRect(), st = getComputedStyle(e);
    if (st.display === 'none' || st.visibility === 'hidden' || r.width < 1 || +st.opacity < 0.5) return null;
    return { x: r.x, y: r.y, w: r.width, h: r.height, rad: parseFloat(st.borderTopLeftRadius), font: parseFloat(st.fontSize), text: e.textContent.trim(), H: innerHeight, W: innerWidth }; }, s);
  const tap = async s => { const r = await box(s); if (!r) return false; await p.touchscreen.tap(r.x + r.w / 2, r.y + r.h / 2); await p.waitForTimeout(400); return true; };
  const title = async () => (await box('#gtitle'))?.text || '';
  const pill = r => r.h < 52 && r.rad >= r.h / 2 - 1 && r.w < r.W * 0.6; // чип: низкая скруглённая кнопка не во всю ширину
  async function check(S) {
    const t = await box(S.tsel || '#gtitle');
    say(t && t.text === S.title && t.y + t.h < t.H * 0.2 && t.font >= 22, `test_L037: «${S.name}» — заголовок «${S.title}» крупно сверху` + (t ? '' : ': заголовка не видно'));
    const pr = await box(S.primary);
    say(pr && pr.y + pr.h / 2 > pr.H * 0.8 && pr.h >= 52 && pr.w >= pr.W * 0.5, `test_L037: «${S.name}» — главное действие «${pr?.text || S.primary}» внизу под большим пальцем, крупное`);
    const all = await p.evaluate(() => [...document.querySelectorAll('.layer.on button')].map(e => { const r = e.getBoundingClientRect(), st = getComputedStyle(e); let v = e; while (v && getComputedStyle(v).display !== 'none' && getComputedStyle(v).visibility !== 'hidden') v = v.parentElement;
      let q = e.parentElement; while (q && !(/(auto|scroll)/.test(getComputedStyle(q).overflowY) && q.scrollHeight > q.clientHeight + 1)) q = q.parentElement; // строка списка, который листается, — не кнопка экрана
      return v || q || r.width < 1 ? null : { id: e.id || e.textContent.trim().slice(0, 16), y: r.y, b: r.bottom, w: r.width, h: r.height, H: innerHeight }; }).filter(Boolean));
    const off = all.filter(r => r.y < 0 || r.b > r.H + 0.5 || Math.min(r.w, r.h) < 43.5);
    say(!off.length, `test_L037: «${S.name}» — все кнопки целиком на экране без прокрутки и не меньше 44` + (off.length ? ': ' + off.map(r => r.id).join(', ') : ''));
    if (pr) { const low = all.filter(r => r.y > pr.y + 1); say(!low.length, `test_L037: «${S.name}» — ниже главного действия ничего нет` + (low.length ? ': ' + low.map(r => r.id).join(', ') : '')); }
    if (S.back) { const bk = await box(S.back); say(bk && bk.y + bk.h / 2 > bk.H * 0.75 && /‹|назад/i.test(bk.text) && bk.text.includes(S.to), `test_L037: «${S.name}» — «‹ ${S.to}» внизу под пальцем, подпись говорит, куда ведёт`); }
    const navR = []; for (const s of Object.keys(S.nav || {})) { const r = await box(s); navR.push(r); say(r && !pill(r) && r.w >= r.W * 0.8 && r.h >= 56, `test_L037: «${S.name}» — раздел «${S.nav[s]}» строкой во всю ширину, не чипом`); }
    for (const s of S.actions || []) { const r = await box(s); say(r && navR.every(n => n && r.y > n.y + n.h) && r.y < pr.y, `test_L037: «${S.name}» — действие «${r?.text || s}» отделено от справочника и ниже его, у главного`); }
    for (const s of S.service || []) { const r = await box(s); say(r && r.h < pr.h && (s === '#gflag' || !navR.length || r.y + r.h <= Math.min(...navR.map(n => n.y)) || r.y >= Math.max(...navR.map(n => n.y + n.h))), `test_L037: «${S.name}» — служебное «${r?.text || s}» мельче главного и не среди разделов`); }
    const chips = all.filter(r => r.h < 52 && r.w < r.W * 0.6 && r.id !== 'gflag');
    say(chips.length < 3, `test_L037: «${S.name}» — экран не из одних чипов (мелких кнопок ${chips.length})`);
  }
  // Из игры: пауза → каждый раздел → назад → продолжить. Глубина не больше двух касаний до игры.
  if (await tap('#pause')) {
    const hub = SCREENS[0]; say(await title() === 'Пауза', 'test_L037: пауза всегда открывается первым уровнем «Пауза»'); await check(hub);
    await p.waitForTimeout(600); const ic = await p.evaluate(() => [...document.querySelectorAll('#phub .prow')].map(b => { const i = b.querySelector('.pico'); return [b.dataset.t, i && i.getBoundingClientRect().width >= 40 && i.naturalWidth >= 52 && i.src.length > 2000]; }));
    say(ic.length && ic.every(x => x[1]), 'test_L037: у каждой строки справочника — значок-снимок раздела (кольцо ДНК, встреченный, разрез пруда)' + (ic.every(x => x[1]) ? '' : ': пусто у ' + ic.filter(x => !x[1]).map(x => x[0]).join(', ')));
    for (const [s, name] of Object.entries(hub.nav)) {
      if (!(await tap(s))) { say(false, `test_L037: раздела «${name}» не видно`); continue; } if (name === 'Альманах') await p.waitForTimeout(800);
      const S = SCREENS.find(x => x.name === name); await check(S);
      if (name === 'Альманах') { // карточка → связь → назад по шагам: прошлая карточка, полка, пауза; подпись «‹ куда» говорит, куда
        const lbl = async () => (await box('#gback'))?.text || '';
        if (await tap('#shelf .kc[data-k=me]')) { say(await lbl() === '‹ Альманах', `test_L037: на карточке «назад» — «‹ Альманах» (${await lbl()})`); await check({ ...S, name: 'Карточка Альманаха', to: 'Альманах' });
          const link = await p.evaluate(() => [...document.querySelectorAll('#klinks .kl')].map(e => ({ r: e.getBoundingClientRect(), no: e.classList.contains('no') })).find(e => !e.no && e.r.width > 0)); // связь — строкой во всю ширину
          say(link && link.r.width >= 300 && link.r.height >= 56, 'test_L037: связи «кто ест / кого ест» на карточке — строками, по ним можно перейти');
          if (link) { await p.evaluate(() => { const e = [...document.querySelectorAll('#klinks .kl')].find(e => !e.classList.contains('no')); e.scrollIntoView({ block: 'center' }); }); await p.waitForTimeout(200);
            const lr = await p.evaluate(() => { const r = [...document.querySelectorAll('#klinks .kl')].find(e => !e.classList.contains('no')).getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2]; });
            await p.touchscreen.tap(lr[0], lr[1]); await p.waitForTimeout(500);
            say(/^‹ Ты/.test(await lbl()), `test_L037: после перехода по связи «назад» ведёт на прошлую карточку (${await lbl()})`);
            await tap('#gback'); say(await p.evaluate(() => document.getElementById('kname').textContent.startsWith('Ты')), 'test_L037: «‹ Ты…» вернул на карточку, откуда пришёл'); }
          await tap('#gback'); say(await p.evaluate(() => !document.getElementById('kshelf').hidden) && await lbl() === '‹ Пауза', 'test_L037: с карточки «‹ Альманах» — на полку, дальше «‹ Пауза»'); }
      }
      say((await tap(S.back)) && await title() === 'Пауза', `test_L037: из «${name}» «‹ Пауза» возвращает на первый уровень`);
    }
    // «Режимы» из паузы: тот же режим — «Продолжить», рядом «Новый заплыв»; «‹ Пауза» возвращает в паузу
    if (await tap('#gmenu')) { await p.waitForTimeout(400); const S = SCREENS.find(x => x.name === 'Режимы'); await check(S);
      say((await box('#mgo'))?.text === 'Продолжить', 'test_L037: в меню режимов из паузы главная — «Продолжить» тот же заплыв');
      say((await tap('#mback')) && await title() === 'Пауза', 'test_L037: из «Режимов» «‹ Пауза» возвращает в паузу'); }
    await tap('#phub [data-t=genome]'); const t0 = await p.evaluate(() => zaplyvWorld().stats.time);
    say((await tap('#gon')) && !(await p.evaluate(() => document.getElementById('genome').classList.contains('on'))), 'test_L037: «Продолжить» из раздела — сразу в игру, одним касанием');
    await p.waitForTimeout(400); say(await p.evaluate(t => zaplyvWorld().stats.time > t, t0), 'test_L037: после «Продолжить» тот же заплыв идёт дальше');
  } else say(false, 'test_L037: кнопки паузы не видно');
  // С экрана гибели «Кто это · … в Альманахе» — сразу карточка убийцы, «‹ Альманах» внизу ведёт на полку (прогон 0.68: вела в общий список)
  await p.evaluate(() => { const w = zaplyvWorld(); w.genes.spore = false; w.stats.killer = 'amoeba'; w.me.length = 0; }); await p.waitForTimeout(1500);
  if (await tap('#cab')) { await p.waitForTimeout(500); say(await p.evaluate(() => !document.getElementById('kcard').hidden && document.getElementById('kname').textContent === 'Амёба') && (await box('#back'))?.text === '‹ Альманах', 'test_L037: с экрана гибели Альманах открывает карточку того, кто съел, «‹ Альманах» — на полку'); }
  else say(false, 'test_L037: на экране гибели нет кнопки Альманаха');
  say(!errs.length, 'ошибок страницы нет' + (errs.length ? ': ' + errs.join('; ') : ''));
  await p.close(); return bad;
}
let fail = 0;
if (selftest) { // самопроверка защиты: на каждом нарочно сломанном меню обход обязан дать красное
  for (const [what, css] of Object.entries(BROKEN)) { const n = await walk(css); console.log((n ? '  ок   ' : '  ПРОВАЛ ') + `самопроверка L037: «${what}» — защита краснеет (${n} провалов)`); if (!n) fail++; }
} else fail = await walk('');
await b.close();
console.log(fail ? `  структура меню: КРАСНЫЙ (${fail})` : '  структура меню: всё на месте');
process.exit(fail ? 1 : 0);
