// Обход интерфейса «Заплыва» пальцем (урок L017): телефон iPhone 13 с касаниями, каждую кнопку касаемся
// так, как палец на iPhone (touchscreen.tap по середине), и требуем видимый результат.
// Кнопка, которую перекрыл другой слой, или касание без видимого отклика — провал.
// node tools/web/zaplyv_tap.mjs <адрес /zaplyv/> [chromium|webkit]
const pwPath = process.env.PW || 'playwright';
const pw = await import(pwPath).then(m => m.default || m);
const url = process.argv[2], kind = process.argv[3] || 'chromium';
const opts = process.env.CHROME ? { executablePath: process.env.CHROME, args: ['--no-sandbox'] } : {};
const b = await pw[kind].launch(opts);
const p = await (await b.newContext({ ...pw.devices['iPhone 13'] })).newPage();
await p.addInitScript(() => { if (!localStorage.getItem('zaplyv.met')) localStorage.setItem('zaplyv.met', JSON.stringify(['me', 'phage', 'amoeba', 'plant'])); }); // Альманах: есть что листать
const errs = []; p.on('pageerror', e => errs.push(e.message));
let bad = 0; const say = (ok, t) => { console.log((ok ? '  ок   ' : '  ПРОВАЛ ') + t); if (!ok) bad++; only(ok, t); };
// ONLY=Lxxx (самопроверка ломает защиту урока и ждёт красного): как только проверка этого урока покраснела, обход сразу выходит с провалом —
// не гонять весь обход ради одного случая. Зелёный исход по-прежнему только после всего обхода, так что сторож не слабеет.
function only(ok, t) { if (ok || !process.env.ONLY || !new RegExp('test_' + process.env.ONLY + '\\b').test(t)) return; console.log(`КАСАНИЯ: провалов ${bad} (покраснел ${process.env.ONLY}, дальше не идём)`); process.exit(1); }
// test_L018 (расширен 24.11, Роман: «описание талантов писал… имбицил»): на каждом экране, где игра говорит про умение или существо,
// каждая строка — из файлов книги. Раньше сверка смотрела только Альманах, а выбор дочки и «Ген от сородича» брали черновые строки из data.json.
const BOOK = async () => p.evaluate(async () => { const out = [], walk = o => { if (typeof o === 'string') out.push(o.trim()); else if (o && typeof o === 'object') Object.values(o).forEach(walk); };
  for (const [f, k] of [['kniga/teksty_genov.json', 'geny'], ['kniga/teksty_sushchestv.json', 'sushchestva'], ['genome.json', 'from']]) walk((await (await fetch(f)).json())[k]); return out; });
const notBook = async (texts, where) => { const B = await BOOK(), odd = texts.map(t => (t || '').trim()).filter(t => t && !B.includes(t));
  say(texts.length && !odd.length, `test_L018: ${where} — каждая строка из книги` + (odd.length ? ': чужие «' + odd.join('» «') + '»' : texts.length ? '' : ': строк нет')); };
await p.goto(url, { timeout: 60000 });
await p.waitForFunction(() => window.zaplyvProbe && zaplyvProbe.frames > 20, null, { timeout: 30000 });
// Касание пальцем: элемент должен быть виден, не меньше 44 pt и сверху в точке касания.
async function tap(sel, what) {
  const el = p.locator(sel).first(); await el.scrollIntoViewIfNeeded({ timeout: 2000 }).catch(() => {}); // длинный экран палец прокручивает
  await el.waitFor({ state: 'visible', timeout: 3000 }).catch(() => {}); // лист ещё открывается: ждём саму кнопку, а не паузу
  let box = await el.boundingBox().catch(() => null);
  for (let i = 0; i < 10 && box; i++) { await p.waitForTimeout(60); const b2 = await el.boundingBox().catch(() => null); if (b2 && Math.abs(b2.x - box.x) < 0.5 && Math.abs(b2.y - box.y) < 0.5) break; box = b2; } // лист выехал до конца
  if (!box || box.width < 1) return say(false, `${what}: кнопки ${sel} не видно`), false;
  const top = await p.evaluate(([s, x, y]) => { const e = document.querySelector(s), h = document.elementFromPoint(x, y); return !!h && (h === e || e.contains(h)) || (h ? (h.id || h.tagName) + " " + h.textContent.slice(0, 20) : "пусто"); }, [sel, box.x + box.width / 2, box.y + box.height / 2]);
  if (top !== true) return say(false, `${what}: в точке касания ${sel} лежит другой слой (${top})`), false;
  if (Math.min(box.width, box.height) < 43.5) return say(false, `${what}: зона касания ${Math.round(box.width)}×${Math.round(box.height)} меньше 44`), false;
  await p.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2); await p.waitForTimeout(250);
  return true;
}
const seen = sel => p.evaluate(s => { const e = document.querySelector(s); if (!e) return false; const r = e.getBoundingClientRect(), st = getComputedStyle(e);
  return r.width > 0 && r.bottom > 0 && r.top < innerHeight && +st.opacity > 0.5 && st.visibility !== 'hidden' && st.display !== 'none'; }, sel);
const marks = () => p.evaluate(() => JSON.parse(localStorage.getItem('zaplyv.marks') || '[]').length);
// флажок снимает кадр и пишет отметку не мгновенно (на медленной машине CI дольше 250 мс): ждём надпись и запись до 4 с, а не смотрим в первый миг
const noted = m => p.waitForFunction(m => { const e = document.getElementById('note'), st = e && getComputedStyle(e); return !!e && +st.opacity > 0.5 && st.visibility !== 'hidden' && JSON.parse(localStorage.getItem('zaplyv.marks') || '[]').length === m + 1; }, m, { timeout: 4000 }).then(() => true, () => false);
const on = id => p.evaluate(i => document.getElementById(i).classList.contains('on'), id);

// test_L025 (Роман 24.11: «почему я не вижу этот режим?» — кнопка «Ночь рода» стояла ниже края экрана iPhone): каждая кнопка
// экрана целиком внутри видимой высоты Safari с панелями (iPhone 13: 664) без прокрутки, иначе красное.
const whole = async (sels, where) => { const out = await p.evaluate(ss => ss.map(s => { const e = document.querySelector(s); if (!e) return s + ' нет'; const r = e.getBoundingClientRect(), st = getComputedStyle(e);
  if (st.display === 'none' || r.width < 1) return null; return r.top >= 0 && r.bottom <= innerHeight + 0.5 ? null : `${s} ${Math.round(r.top)}–${Math.round(r.bottom)} при высоте ${innerHeight}`; }).filter(Boolean), sels);
  say(!out.length, `test_L025: ${where} — все кнопки на экране без прокрутки` + (out.length ? ': ' + out.join('; ') : '')); };
say(!(await on('menu')), 'самый первый запуск — сразу заплыв, без меню (дизайнер)');
// Обход проверяет кнопки, а не деление: само деление по таймеру во время шагов открывало выбор «Две дочки», он по замыслу прячет
// паузу и флажок — шаги краснели случайно (WebKit, #204). Выбор дочки шаги, которым он нужен, ставят сами (w.choice = …).
await p.evaluate(() => { zaplyvWorld().cfg.auto_split = 1e9; });
let m = await marks();
await whole(['#pause', '#flag'], 'заплыв');
// test_L038 (Роман 25.11: «даже еда стала чуть-чуть размытая. И как будто сама бактерия стала чуть-чуть размытая»): на телефоне с плотностью 3
// кадр считается в 2,5 точки на точку экрана, а не растягивается из двойной (3 — кадр тяжелее в полтора раза, L015).
say(await p.evaluate(() => { const c = document.getElementById('c'); return devicePixelRatio >= 3 && c.width >= Math.round(innerWidth * 2.5) - 1; }), 'test_L038: кадр плотнее двойной на экране iPhone (холст ' + await p.evaluate(() => document.getElementById('c').width + ' на ширину ' + innerWidth) + ')');
// test_L043 (Роман 25.11 на 0.67: «Большие коричневые шары это кто в игре?… они нападают» — амёбу видел много раз, а имени и что делать
// при встрече нет: надпись была одна на всю жизнь игры, а совет при захвате — раз за заплыв): опасный в заплыве впервые — имя и что делать
// из книги, даже если в Альманахе он уже есть; схватили — совет каждый раз.
await p.evaluate(() => { const w = zaplyvWorld(), a = w.me[0]; w.met.delete('amoeba'); w.look = 0; w.amoebas.length = 0; w.amoebas.push({ x: a.x + w.cfg.meet * 0.7, y: a.y, vx: 0, vy: 0, m: 4, id: 9001 }); });
await p.waitForTimeout(700); { const t = await p.evaluate(() => [...document.querySelectorAll('#toast.on')].map(e => e.textContent).join(''));
  say(/^Амёба: .*уплывай/.test(t), 'test_L043: встретил амёбу в заплыве — сразу её имя и что делать (' + (t || 'надписи нет') + ')'); }
{ const n = await p.evaluate(async () => { const w = zaplyvWorld(), a = w.me[0], T = document.getElementById('toast'); w.amoebas.length = 0; let k = 0;
    for (let i = 0; i < 2; i++) { T.classList.remove('on'); T.textContent = ''; w.events.push(['grab', a.x, a.y]); await new Promise(r => setTimeout(r, 300)); if (T.classList.contains('on') && /развернись/.test(T.textContent)) k++; } return k; });
  say(n === 2, `test_L043: схватили второй раз — совет «развернись» снова на экране (показан ${n} из 2)`); }
// test_L052 (Роман 25.11: «мутнота», ночью «расплывчатое»): на экране плотности 3 кадр начинается в полную плотность; на тяжёлом кадре
// (здесь — программная видеокарта) один раз откатывается до cfg.dpr_max и дальше не скачет.
{ await p.evaluate(() => { const w = zaplyvWorld(); w.tidy = 1e9; for (const l of ['amoebas', 'bdellos', 'slippers', 'bells', 'rotis', 'pseudos', 'phages']) if (w[l]) w[l].length = 0; }); // пока ждём кадры, клетку никто не съест
  await p.waitForFunction(() => zaplyvProbe.frames > 90 + 2 * 60 + 10, null, { timeout: 30000 }).catch(() => {});
  await p.evaluate(() => { zaplyvWorld().tidy = 0; });
  await p.evaluate(() => { const w = zaplyvWorld(); w.choice.length = 0; if (w.me.length) { w.me.length = 1; w.me[0].m = 1; } }); // пока ждали, клетка могла вырасти до выбора дочки — он прячет кнопки
  const d = await p.evaluate(() => ({ slow: zaplyvWorld().cfg.dpr_slow, d0: zaplyvProbe.dpr0, d: zaplyvProbe.dpr, drop: zaplyvProbe.dprDrop, avg: zaplyvProbe.avg, dpr: devicePixelRatio }));
  say(d.dpr >= 3 && d.d0 === 3 && (d.avg > d.slow ? d.drop && d.d === 2.5 : d.d === 3), `test_L052: кадр в полную плотность 3, на тяжёлом кадре откат до 2,5 (было ${d.d0}, сейчас ${d.d}, откат на кадре ${d.drop || '—'}, средний кадр ${Math.round(d.avg)} мс)`); }
// test_L046 (Роман 25.11 на 0.68: «Почему какая то мутнота стала? Какой то фильтр мутно стоит?»): тяж слизи — прозрачный гель с тонкой
// кромкой, а не светлая пелена во всю ширину. Внутри тяжа вода почти той же яркости, что рядом, кромка видна.
{ // Замер «до и после» на одной и той же полосе экрана: тот же кадр без тяжа и с тяжем. Раньше сравнивали с полосой рядом, а там
  // то фон, то светлое пятно воды — сторож краснел зря (WebKit: «62 / 4»). Мутная пелена всё равно прибавляет яркости внутри.
  await p.evaluate(() => { const w = zaplyvWorld(); w.slime.length = 0; w.tidy = 1e9; for (const l of ['food', 'prey', 'amoebas', 'bdellos', 'slippers', 'bells', 'rotis', 'pseudos', 'phages', 'plants', 'crumbs', 'donors']) if (w[l]) w[l].length = 0; for (const q of w.me) q.vx = q.vy = 0; }); // в кадре только вода и клетка
  const lum = async clip => p.evaluate(async b64 => { const im = new Image(); im.src = 'data:image/png;base64,' + b64; await im.decode(); const c = document.createElement('canvas'); c.width = im.width; c.height = im.height;
    const x = c.getContext('2d'); x.drawImage(im, 0, 0); const d = x.getImageData(0, 0, c.width, c.height).data; let s = 0; for (let i = 0; i < d.length; i += 4) s += d[i] * 0.3 + d[i + 1] * 0.59 + d[i + 2] * 0.11; return s / (d.length / 4); },
    (await p.screenshot({ clip })).toString('base64'));
  const one = async () => { const [cx] = await p.evaluate(() => { const a = zaplyvWorld().me[0]; return zaplyvScr(a.x + 70, a.y); }); return lum({ x: cx - 4, y: 120, width: 8, height: 120 }); };
  const strip = async () => { const v = []; for (let k = 0; k < 5; k++) { const f = await p.evaluate(() => zaplyvProbe.frames); await p.waitForFunction(f => zaplyvProbe.frames > f + 1, f, { timeout: 5000 }).catch(() => {}); v.push(await one()); } // медиана пяти дорисованных кадров:
    return v.sort((a, b) => a - b)[2]; }; // один чёрный или пересвеченный кадр (вода плывёт, кадр не дорисован) замер не сбивает
  await p.waitForTimeout(300); const before = await strip();
  await p.evaluate(() => { const w = zaplyvWorld(), a = w.me[0]; w.slime.push({ x: a.x + 70, y: a.y, a: Math.PI / 2, len: 380, w: 40, id: 77 }); });
  await p.waitForTimeout(400); const inside = await strip();
  await p.evaluate(() => { const w = zaplyvWorld(); w.slime.length = 0; w.tidy = 0; });
  say(inside - before < 25, `test_L046: тяж слизи прозрачный, не пелена (яркость полосы без тяжа ${before.toFixed(0)}, с тяжем ${inside.toFixed(0)})`); }
// test_L039 (Роман 25.11: «в процессе игры они просто уплывают куда-то, исчезают. И я не понимаю, почему»): сестра за кадром видна стрелкой у края,
// а гибель за краем называет убийцу.
{ await p.evaluate(() => { const w = zaplyvWorld(), a = w.me[0]; w.me.push({ ...a, id: 990, x: a.x + 2500, y: a.y, held: 1, vx: 0, vy: 0 }); });
  await p.waitForTimeout(400); const e = await p.evaluate(() => zaplyvProbe.sisEdge);
  await p.evaluate(() => { const w = zaplyvWorld(), b = w.me.find(q => q.id === 990); if (b) w.lose(b, b.x, b.y, 'bdello'); }); await p.waitForTimeout(300);
  const t = await p.textContent('#toast');
  say(e >= 1 && /за краем/.test(t) && t.includes('Бделловибрион'), 'test_L039: сестра за кадром — стрелка у края (' + e + '), гибель за краем названа: «' + t + '»'); }
// test_L040 (Роман 25.11: «Здоровье и опыт можешь показать полосой… линию… заменить на опыт. Размер оставить только числом»):
// полоса внизу растёт к делению и ползёт назад, когда клетка теряет; заражение — красная засечка; размер — число в микрометрах.
{ const fill = () => p.evaluate(() => parseFloat(document.getElementById('growfill').style.width) || 0);
  await p.evaluate(() => { const w = zaplyvWorld(); w.me.length = 1; w.me[0].m = w.split() * 0.8; }); await p.waitForTimeout(400); await p.waitForFunction(() => parseFloat(document.getElementById('growfill').style.width) > 50, null, { timeout: 2500 }).catch(() => {}); const hi = await fill(); // WebKit на CI пропускает кадры: ждём, пока полоса догонит клетку, а не 400 мс
  await p.evaluate(() => { const w = zaplyvWorld(); w.me[0].m = w.split() * 0.6; }); await p.waitForTimeout(400); await p.waitForFunction(h => parseFloat(document.getElementById('growfill').style.width) < h - 20, hi, { timeout: 2500 }).catch(() => {}); const lo = await fill();
  await p.evaluate(() => { zaplyvWorld().me[0].sick = 3; }); await p.waitForTimeout(300); await p.waitForFunction(() => document.getElementById('sicknotch').getBoundingClientRect().width > 4, null, { timeout: 2000 }).catch(() => {});
  const notch = await p.evaluate(() => document.getElementById('sicknotch').getBoundingClientRect().width), cnt = await p.textContent('#count');
  await p.evaluate(() => { const a = zaplyvWorld().me[0]; a.sick = -1; a.m = 1; });
  say(hi > 50 && lo < hi - 20 && lo > 5 && notch > 4 && /мкм/.test(cnt) && await seen('#growbar'), 'test_L040: полоса роста ' + hi.toFixed(0) + '% → ' + lo.toFixed(0) + '% назад, засечка заражения ' + notch.toFixed(0) + ' px, «' + cnt + '»'); }
// test_L042 (прогоны 0.61 и 0.63, О44: «вирус молчит в момент посадки… совет только на экране гибели»): вирус сел на клетку —
// в ту же секунду надпись, что случилось и что делать пальцем.
await p.evaluate(() => { window.__toasts = []; new MutationObserver(() => window.__toasts.push(document.getElementById('toast').textContent)).observe(document.getElementById('toast'), { childList: true, characterData: true, subtree: true }); }); // все надписи подряд: знакомство с вирусом может сразу перекрыть совет
await p.evaluate(() => { const w = zaplyvWorld(), a = w.me[0]; w.phages.length = 0; w.cfg.inject_was = w.cfg.inject; w.cfg.inject = 1e9; w.phages.push({ x: a.x + 8, y: a.y, vx: 0, vy: 0, d: Math.PI, t: 0, id: 91, host: 'me', cool: 0 }); }); // вирус садится, но не впрыскивает: шаги дальше идут живой клеткой (L045 — стряхнуть только сразу)
await p.waitForTimeout(600); { const t = await p.evaluate(() => (window.__toasts || []).concat([...document.querySelectorAll('#toast.on')].map(e => e.textContent)).join(' | ')); say(/Сел вирус![^|]*развернись/.test(t) && /развернись/.test(t), 'test_L042: вирус сел на клетку — сразу надпись, что делать (' + (t || 'надписи нет') + ')'); }
await p.evaluate(() => { const w = zaplyvWorld(); w.phages.length = 0; w.cfg.inject = w.cfg.inject_was; for (const a of w.me) a.sick = -1; });
if (await tap('#flag', 'флажок в игре')) say(await noted(m), 'флажок в игре: отметка записана и надпись видна');
// test_L050 (Роман 25.11 на 0.70: «почему мы не починили блять деление клеток?»): плавное деление лежало в vid.js, но main.js его не звал —
// дочка появлялась рывком. После деления несколько кадров рисуется рождение: дочки из одной клетки с перетяжкой расходятся.
{ const ok = await p.evaluate(async () => { const w = zaplyvWorld(); w.choice = []; w.cfg.auto_split = 1e9; const a = w.me[0]; a.m = w.split() + 0.01; a.held = 0; a.grab = null; a.sick = -1; a.spore = 0;
    await new Promise(r => setTimeout(r, 100)); const n = w.divide(); w.choice = []; const t0 = zaplyvProbe.birth || 0; await new Promise(r => setTimeout(r, 250));
    return n > 0 && (zaplyvProbe.birth || 0) > t0; });
  say(ok, 'test_L050: деление рисуется — дочка выходит из матери с перетяжкой, а не появляется рывком'); }
if (await tap('#pause', 'пауза')) say(await on('genome') && (await p.textContent('#gtitle')) === 'Пауза', 'пауза открывает меню «Пауза»');
if (await tap('#phub [data-t=genome]', 'строка «Геном» в паузе')) say(await seen('#ring'), 'строка «Геном» открывает кольцо');
if (await tap('#ring .slot', 'ген на кольце')) say(await p.evaluate(() => !!document.querySelector('#gcard h2')), 'касание гена открывает карточку');
m = await marks();
if (await tap('#gflag', 'флажок в геноме')) say(await noted(m), 'флажок в геноме: отметка и надпись видна');
if (await tap('#gback', '«‹ Пауза» из генома') && await tap('#phub [data-t=alm]', 'строка «Альманах»')) say(await on('cabinet'), 'Альманах открылся из паузы');
// test_L019: у каждой карточки полки — снимок живой модели (картинка не пустая), разделы и карточка отвечают пальцу
await p.waitForFunction(() => { const a = [...document.querySelectorAll('#shelf .kc img')]; return a.length && a.every(i => i.naturalWidth > 100 && i.src.length > 5000); }, null, { timeout: 6000 }).catch(() => {}); // снимки встают по одному: ждём их, а не время
say(await p.evaluate(() => [...document.querySelectorAll('#shelf .kc img')].every(i => i.naturalWidth > 100 && i.src.length > 5000)), 'test_L019: у каждой записи Альманаха — снимок модели из игры');
// test_L044 (Роман 25.11: «у нас образовательная игра… чтобы выглядело примерно как в жизни»): в Альманахе сказано, что цвета — наши
// метки (под микроскопом почти все бесцветные), а еду в воде не видно — мы рисуем её точками; слова из книги (подписи).
{ const P = await p.evaluate(async () => (await (await fetch('kniga/teksty_sushchestv.json')).json()).podpisi), note = () => p.evaluate(() => { const e = document.getElementById('knote'); return e && !e.hidden && e.getBoundingClientRect().height > 10 ? e.textContent : ''; });
  say(P.almanah_cveta && await note() === P.almanah_cveta, 'test_L044: в «Обитателях» строка книги, что цвета — наши метки');
  if (await tap('#kpills button:nth-child(2)', 'раздел «Еда» (подпись)')) say(P.eda_tochki && await note() === P.eda_tochki, 'test_L044: в «Еде» строка книги, что еду не видно и мы рисуем её точками'); }
if (await tap('#kpills button:nth-child(2)', 'раздел «Еда»')) say(await p.evaluate(() => document.querySelectorAll('#shelf .kc').length > 0 && document.querySelector('#kpills .on').dataset.g === 'food'), 'раздел «Еда» открылся');
if (await tap('#kpills button:nth-child(1)', 'раздел «Обитатели»')) say(await p.evaluate(() => !!document.querySelector('#shelf .kc[data-k=me]')), 'раздел «Обитатели» открылся');
if (await tap('#shelf .kc[data-k=me]', 'карточка «Ты»')) say(await seen('#kcard') && await p.evaluate(() => document.querySelectorAll('#kblocks .kb').length >= 2 && document.getElementById('kimg').naturalWidth > 100), 'карточка открылась: модель и блоки текста');
if (await tap('#klinks .kl:not(.no)', 'связь «кто ест» на карточке')) say(await seen('#kcard') && await p.evaluate(() => document.getElementById('kname').textContent !== 'Ты, кишечная палочка'), 'связь открывает карточку того, о ком речь');
if (await tap('#gback', '«‹ Ты» назад по связи')) say(await p.evaluate(() => document.getElementById('kname').textContent === 'Ты, кишечная палочка'), '«назад» возвращает на карточку, с которой пришёл');
if (await tap('#gback', '«‹ Альманах» к полке')) say(await seen('#kshelf'), 'полка снова видна');
if (await tap('#gback', '«‹ Пауза» из Альманаха') && await tap('#phub [data-t=genome]', 'снова «Геном»')) say(!(await on('cabinet')) && await on('genome') && await seen('#ring'), '«Геном»: Альманах закрылся, кольцо на месте');
// Карта на паузе (Э17–Э18): вкладка открывает разрез пруда, на нём нарисовано (не пустой холст), «ты» в шапке словами.
if (await tap('#gback', '«‹ Пауза» из генома') && await tap('#phub [data-t=map]', 'строка «Карта»')) { await p.waitForTimeout(400);
  say(await seen('#mcv') && await p.evaluate(() => { const c = document.getElementById('mcv'), d = c.getContext('2d').getImageData(c.width / 2, c.height / 2, 1, 1).data; return c.width > 200 && d[3] > 0 && /слое/.test(document.getElementById('mhead').textContent); }), 'карта: разрез пруда нарисован, слой назван'); }
// Отметка гибели на карте: касание — карточка места, «Запомнить это место» ставит метку-цель (Э19–Э20).
await p.evaluate(() => { const c = zaplyvWorld().center(); zaplyvKarta.data().marks.push({ kind: 'death', x: c.x + 2500, y: c.y + 3000, who: 'amoeba', run: 0 }); });
await p.waitForTimeout(300);
const mk = await p.evaluate(() => { const h = zaplyvKarta.hits().find(q => q.kind === 'death'), r = document.getElementById('mcv').getBoundingClientRect(); return h && [r.left + h.x, r.top + h.y]; });
if (mk) { await p.touchscreen.tap(mk[0], mk[1]); await p.waitForTimeout(300); say(await seen('#mcard') && /погиб/.test(await p.evaluate(() => document.getElementById('mcard').textContent)), 'карта: касание отметки гибели открывает карточку места'); }
else say(false, 'карта: отметки гибели не видно');
if (await tap('#mgoal', '«Запомнить это место»')) say(await p.evaluate(() => !!zaplyvKarta.data().goal), 'метка-цель запомнена');
if (await tap('#gback', '«‹ Пауза» с карты')) say(!(await seen('#mcv')) && (await p.textContent('#gtitle')) === 'Пауза', '«‹ Пауза» с карты возвращает на первый уровень');
// «Отправить» в геноме: меню «Поделиться» телефона подменяем, отметки должны уйти одним сообщением.
await p.evaluate(() => { navigator.share = async d => { window.shared = d.text; }; });
m = await marks();
if (await tap('#gsend', '«Отметки» в геноме') && await tap('#mlsend', '«Отправить» в списке отметок') && await p.waitForFunction(() => window.shared, null, { timeout: 5000 }).then(() => true, () => true)) say(await p.evaluate(n => (window.shared || '').includes('отметок ' + n), m) && await marks() === 0, '«Отправить» отдаёт отметки и очищает их');
const t0 = await p.evaluate(() => zaplyvWorld().stats.time);
// test_L021: на кольце у каждого живого гена значок-снимок, карточка гена — со значком 64.
say(await p.evaluate(() => { const live = Object.keys(zaplyvWorld().cfg.genes).length, im = [...document.querySelectorAll('#ring image')];
  return im.length >= live && im.every(i => (i.getAttribute('href') || '').length > 3000); }), 'test_L021: на кольце — значки всех генов');
await tap('#phub [data-t=genome]', 'строка «Геном» перед значками');
await p.evaluate(() => [...document.querySelectorAll('#ring .slot')].find(s => s.querySelector('image')).dispatchEvent(new MouseEvent('click', { bubbles: true })));
await p.waitForTimeout(300);
say(await p.evaluate(() => { const i = document.querySelector('#gcard .gicon'); return !!i && i.getBoundingClientRect().width >= 60 && i.src.length > 3000; }), 'test_L021: в карточке гена — значок');
await whole(['#gon', '#gback', '#gflag'], 'геном с выбранным геном');
await notBook(await p.evaluate(() => [[...(document.querySelector('#gcard h2')?.childNodes || [])].filter(n => n.nodeType === 3).map(n => n.textContent).join(''), ...[...document.querySelectorAll('#gcard p')].filter(e => e.querySelector('b')).map(e => [...e.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent).join(''))]), 'карточка гена на кольце');
if (await tap('#gon', '«Плыть дальше»')) { await p.waitForTimeout(500); say(!(await on('genome')) && await p.evaluate(() => zaplyvWorld().stats.time) > t0, '«Плыть дальше» закрывает геном, мир идёт'); }
// test_L031 (прогон 0.44: «из игры в меню режимов попасть нельзя»): из паузы «Меню» открывает меню режимов, «Плыть» возвращает в тот же заплыв.
if (await p.evaluate(() => { const w = zaplyvWorld(); w.choice = []; }) === undefined && await tap('#pause', 'пауза снова') && await tap('#gmenu', '«Режимы» в паузе')) { const t1 = await p.evaluate(() => zaplyvWorld().stats.time); say(await on('menu'), 'test_L031: «Режимы» в паузе открывают меню режимов');
  if (await tap('#mgo', '«Плыть» из меню паузы')) { await p.waitForTimeout(500); say(!(await on('menu')) && await p.evaluate(t => zaplyvWorld().stats.time > t, t1), 'test_L031: «Плыть» из меню паузы продолжает тот же заплыв'); } }
// test_L023 (Б16, Роман: «куда я его могу поставить чтобы игра вырезала…»): флажок тянут пальцем на место — игра вырезает кусок кадра и спрашивает словами.
{ const fb = await p.locator('#flag').boundingBox(), sx = fb.x + fb.width / 2, sy = fb.y + fb.height / 2; m = await marks();
  await p.mouse.move(sx, sy); await p.mouse.down(); for (let i = 1; i <= 10; i++) await p.mouse.move(sx + (195 - sx) * i / 10, sy + (430 - sy) * i / 10);
  const frozen = await p.evaluate(() => { const t = zaplyvWorld().stats.time; return new Promise(r => setTimeout(() => r(zaplyvWorld().stats.time === t), 300)); });
  await p.mouse.up(); await p.waitForTimeout(400);
  const img = await p.evaluate(() => document.getElementById('fsheet').classList.contains('on') ? document.getElementById('fimg').src.length : 0);
  say(frozen && img > 3000, 'test_L023: флажок тянется на место, мир замер, кусок кадра вырезан (' + img + ' байт)');
  await p.fill('#ftext', 'тут странно'); if (await tap('#fsave', '«Записать» отметку с картинкой')) {
    const last = await p.evaluate(() => { const q = JSON.parse(localStorage.getItem('zaplyv.marks') || '[]'); return q[q.length - 1] || {}; });
    say(await marks() === m + 1 && (last.text || '').includes('тут странно') && (last.img || '').length > 3000 && !(await on('fsheet')), 'test_L023: отметка со словами и картинкой записана, лист закрыт');
    await p.evaluate(() => { navigator.canShare = () => true; navigator.share = async d => { window.shared = d.text; window.sharedFiles = (d.files || []).map(f => [f.name, f.size, f.type]); window.sharedRaw = d.files || []; }; window.sharedFiles = null; });
    await p.evaluate(() => { zaplyvWorld().choice.length = 0; }); await p.waitForTimeout(250); // случайное деление прячет паузу выбором «Две дочки»: снимаем его, шаг про отправку
    if (await tap('#pause', 'пауза перед отправкой') && await tap('#gsend', '«Отметки» перед отправкой') && await tap('#mlsend', '«Отправить» отметку с местом')) { await p.waitForFunction(() => window.sharedFiles, null, { timeout: 5000 }).catch(() => {}); const sf = await p.evaluate(() => [window.shared || '', window.sharedFiles || []]);
      say(sf[0].includes('тут странно') && sf[1].some(f => f[1] > 3000 && /mesto/.test(f[0]) && f[2] === 'image/jpeg'), 'test_L023: «Отправить» отдаёт слова и картинку места (' + sf[1].map(f => f[0]).join(', ') + ')');
      // test_L035 (Роман 25.11: «фото поделится без текста идут… текст куда ушел я не знаю»): слова отметки впечатаны в картинку —
      // под куском кадра полоса подписи, в ней светлые буквы; дойдёт даже там, где «Поделиться» отдаёт одни фото.
      const cap = await p.evaluate(async () => { const f = window.sharedRaw.find(x => /_1_mesto/.test(x.name)); if (!f) return null; const b = await createImageBitmap(f), c = document.createElement('canvas'); c.width = b.width; c.height = b.height;
        const g = c.getContext('2d'); g.drawImage(b, 0, 0); const top = b.width, d = g.getImageData(0, top, b.width, b.height - top).data; let lit = 0; for (let i = 0; i < d.length; i += 4) if (d[i] + d[i + 1] + d[i + 2] > 450) lit++;
        const k = window.sharedRaw.find(x => /_1_kadr/.test(x.name)), kb = k && await createImageBitmap(k); return { w: b.width, h: b.height, lit, kadr: kb ? kb.width : 0 }; });
      say(cap && cap.h > cap.w + 100 && cap.lit > 400 && cap.kadr >= 720, 'test_L035: под картинкой отметки впечатана подпись со словами, весь кадр не уже 720 точек (' + JSON.stringify(cap) + ')'); }
    if (await on('genome')) await tap('#gon', '«Плыть дальше» после отправки'); } }
// test_L053 (Роман 25.11: «Прерывает игру зачем то — пускай просто всплывает навыки. Игра продолжается аккуратно»): выбор навыка
// не останавливает мир и не закрывает экран — полоса у нижнего края, касание на ходу берёт ген; не выбрал — сворачивается в значок.
await p.evaluate(() => { const w = zaplyvWorld(), all = Object.keys(w.cfg.genes).filter(g => !w.genes[g]); w.choice = all.slice(0, 2); });
await p.waitForTimeout(600);
{ const r = await p.evaluate(async () => { const w = zaplyvWorld(), t0 = w.stats.time; await new Promise(q => setTimeout(q, 500)); const b = document.getElementById('offer').getBoundingClientRect();
    return { go: w.stats.time - t0, top: b.top, h: innerHeight, pause: getComputedStyle(document.getElementById('pause')).display !== 'none' }; });
  say(r.go > 0.3 && r.top > r.h * 0.6 && r.pause, `test_L053: при выборе навыка мир плывёт (${r.go.toFixed(2)} с за 0,5 с), полоса у нижнего края (верх ${Math.round(r.top)} из ${r.h}), пауза на месте`); }
// test_L021 (Роман: «в меню генома нет ни одного значка»): у вариантов выбора — значок гена, снимок клетки, не пустой.
say(await p.evaluate(() => [...document.querySelectorAll('#obtns .gicon')].length === 2 && [...document.querySelectorAll('#obtns .gicon')].every(i => i.naturalWidth >= 64 && i.src.length > 3000)), 'test_L021: у вариантов выбора — значки генов');
await notBook(await p.evaluate(() => [...document.querySelectorAll('#obtns button span, #obtns button small')].map(e => e.textContent)), 'выбор навыка');
const g1 = await p.evaluate(() => zaplyvWorld().choice[1]);
if (await tap('#obtns button:nth-child(2)', 'второй вариант')) say(await p.evaluate(g => !zaplyvWorld().genes[g] && document.querySelector('#obtns button:nth-child(2)').classList.contains('sel'), g1), 'test_L053: первое касание только выбирает вариант (случайный тап большим пальцем навык не берёт)');
if (await tap('#obtns button:nth-child(2)', 'второй вариант ещё раз')) say(await p.evaluate(g => zaplyvWorld().genes[g] && !document.getElementById('offer').classList.contains('on') && document.getElementById('toast').textContent.startsWith('Взято'), g1), 'второе касание даёт ген, убирает полосу и пишет «Взято: …»');
await p.evaluate(() => { const w = zaplyvWorld(), all = Object.keys(w.cfg.genes).filter(g => !w.genes[g]); w.choice = all.slice(0, 2); w.cfg.offer_fold = 0.5; });
await p.waitForTimeout(1200);
say(await seen('#odot') && !(await seen('#offer')), 'test_L053: не выбрал — полоса свернулась в значок у края');
const g0 = await p.evaluate(() => zaplyvWorld().choice[0]);
await p.evaluate(() => { zaplyvWorld().cfg.offer_fold = 6; });
if (await tap('#odot', 'значок выбора') && await tap('#obtns button', 'вариант после раскрытия') && await tap('#obtns button', 'вариант ещё раз')) say(await p.evaluate(g => zaplyvWorld().genes[g], g0), 'значок раскрывает полосу, вариант даёт ген');
// test_L030 (дизайнер 24.11: колокольчик и коловратка убивают новичка без признака): у воронки на экране оранжевый край, у ближайшей он разгорается.
{ const lit = async d => { await p.evaluate(d => { const w = zaplyvWorld(), a = w.me[0]; for (const l of ['amoebas', 'bdellos', 'slippers', 'bells', 'rotis']) w[l].length = 0; w.choice = []; w.me.length = 1; Object.assign(a, { vx: 0, vy: 0, grab: null, held: 0 }); // одна клетка у края: встреча с воронкой гарантирована
    w.bells.push({ x: a.x + 300, y: a.y, dir: 0, shut: 0, id: 7001 }); const [bx, by] = w.bell(w.bells[0]); w.bells[0].x -= bx - (a.x + w.cfg.vortex_r + d); w.bells[0].y -= by - a.y; zaplyvProbe.warn = {}; }, d);
    if (d < 200) await p.waitForFunction(() => zaplyvProbe.warn.bell > 0, null, { timeout: 2500 }).catch(() => {}); else await p.waitForTimeout(400); // ждём сам признак, а не паузу (WebKit рисует первые кадры с задержкой)
    return p.evaluate(() => zaplyvProbe.warn.bell || 0); };
  const near = await lit(60), far = await lit(900);
  say(near > 0 && !far, `test_L030: край воронки разгорается, когда до него меньше полутора секунд хода (кадров с тревогой ${near}), и молчит вдали (${far})`); }
await p.evaluate(() => { const w = zaplyvWorld(), c = w.center(); w.events.push(['gene', c.x, c.y, 'fim']); }); await p.waitForFunction(() => document.getElementById('toast').textContent.startsWith('Ген от сородича'), null, { timeout: 4000 }).catch(() => {});
{ const t = await p.evaluate(() => document.getElementById('toast').textContent); const m2 = t.match(/^Ген от сородича: (.*?) — (.*)$/); await notBook(m2 ? [m2[1], m2[2]] : [t], '«Ген от сородича»'); }
// test_L029 (Роман 24.11: «хоть все бактерии уже по краям мертвы игра обратно не приближается»): колония расползлась — камера отъехала;
// дальние погибли или застряли вдали — за 3 с камера снова у живых, и клетка на экране не мельче cfg.cam.min_px.
{ const z = () => p.evaluate(() => zaplyvProbe.z), cam = async (f, a) => { await p.evaluate(f, a); await p.waitForTimeout(3000); return z(); };
  await p.evaluate(() => { const w = zaplyvWorld(); w.me.length = 1; Object.assign(w.me[0], { m: 1, grab: null, held: 0, sick: -1 }); for (const l of ['amoebas', 'bdellos', 'slippers', 'bells', 'rotis', 'phages']) w[l].length = 0; });
  await p.waitForTimeout(3000); const z1 = await z();
  const zs = await cam(() => { const w = zaplyvWorld(), a = w.me[0]; for (let i = 0; i < 6; i++) w.me.push({ ...a, id: 900 + i, x: a.x + Math.cos(i) * 450, y: a.y + Math.sin(i) * 450, vx: 0, vy: 0 }); });
  const zd = await cam(() => { zaplyvWorld().me.length = 1; });
  const zf = await cam(() => { const w = zaplyvWorld(), a = w.me[0]; for (let i = 0; i < 3; i++) w.me.push({ ...a, id: 950 + i, x: a.x - 2000, y: a.y + i * 30, vx: 0, vy: 0, stun: 1e9 }); });
  const px = await p.evaluate(() => { const w = zaplyvWorld(); return 13 * Math.sqrt(w.me[0].m) * zaplyvProbe.z >= w.cfg.cam.min_px; });
  say(zs < z1 * 0.8 && zd > z1 * 0.9 && zf > z1 * 0.9 && px, `test_L029: камера отъехала к расползшейся колонии (${z1.toFixed(2)} → ${zs.toFixed(2)}), вернулась после гибели дальних (${zd.toFixed(2)}) и не уходит к застрявшим вдали (${zf.toFixed(2)})`); }
await p.evaluate(() => { const w = zaplyvWorld(); w.genes.spore = false; w.stats.killer = 'amoeba'; w.me.length = 0; });
await p.waitForTimeout(1200); await notBook(await p.evaluate(() => ['who', 'cname', 'ctext', 'cfact', 'ctip'].map(i => document.getElementById(i).textContent)), 'экран гибели');
say(await p.evaluate(async () => { const C = await (await fetch('cards.json')).json(), T = (await (await fetch('kniga/teksty_sushchestv.json')).json()).sushchestva, st = document.getElementById('stats').textContent;
  return Object.keys(C).every(k => !T[k] || T[k].imya === C[k].name || !st.includes(C[k].name)); }), 'test_L018: в строке «кто забрал» на экране гибели имена только из книги (прогон 0.44: «Сувойка» вместо «Колокольчик»)');
await whole(['#again', '#tomenu', '#cab', '#eno'], 'экран гибели'); // до любых касаний: экран не прокручен
say(await p.evaluate(() => ['hud', 'scalebox', 'ver'].every(i => getComputedStyle(document.getElementById(i)).visibility === 'hidden') && getComputedStyle(document.getElementById('end')).backgroundColor.startsWith('rgb(')), 'test_L031: лист гибели непрозрачный, надписи игры под ним скрыты');
m = await marks();
if (await tap('#eno', '«Не так» на экране гибели')) say(await noted(m), '«Не так» на экране гибели: отметка и надпись видна');
// test_L034 (Роман 25.11: «Сбрось пожалуйста счетчик проблем! Там куча говна записана»): случайную отметку убирает «Убрать»,
// в списке отметок одна уходит по ✕, все — «Стереть все» и второе касание. Счётчик на кнопке идёт за ними.
if (await tap('#nundo', '«Убрать» случайную отметку')) say(await marks() === m, 'test_L034: «Убрать» под надписью снимает только что записанную отметку');
await tap('#eno', '«Не так» ещё раз'); await tap('#eno', '«Не так» в третий раз'); m = await marks();
if (await tap('#esend', '«Отметки» на экране гибели')) {
  say(await on('mlist') && await p.locator('#mlrows .mlrow').count() === m && (await p.textContent('#esend')).includes('· ' + m), 'test_L034: «Отметки · ' + m + '» открывает список всех отметок');
  if (await tap('#mlrows .mlrow button', '✕ у первой отметки')) say(await marks() === m - 1 && (await p.textContent('#esend')).includes('· ' + (m - 1)), 'test_L034: ✕ убирает одну отметку, счётчик меньше на 1');
  if (await tap('#mlwipe', '«Стереть все»')) say(await marks() === m - 1 && /Точно/.test(await p.textContent('#mlwipe')), 'test_L034: первое касание «Стереть все» только спрашивает');
  if (await tap('#mlwipe', '«Точно стереть»')) say(await marks() === 0 && !(await on('mlist')) && !(await seen('#esend')), 'test_L034: второе касание стирает все отметки, кнопки счётчика нет'); }
// «Ночь рода» (спецификация design/zaplyv_noch_roda_spec.md): каждая кнопка ночи отвечает пальцу.
const toNight = async w => await tap('#tomenu', '«Меню режимов» ' + w) && await tap('#mscene [data-m=night]', 'режим «Ночь рода» ' + w) && await tap('#mgo', '«Начать ночь» ' + w);
if (await toNight('с экрана гибели')) say(await on('night') && await seen('#ndanger'), '«Ночь рода» из меню открывает выбор опасности');
m = await marks();
if (await tap('#nflag', '«Не так» в ночи рода')) say(await noted(m), '«Не так» в ночи рода: отметка записана');
if (await tap('#nback', '«Назад» из ночи')) say(!(await on('night')) && await on('menu'), '«Назад» из ночи возвращает в меню');
if (await tap('#mscene [data-m=swim]', 'объект «Заплыв»') && await tap('#mgo', '«Плыть»')) { await p.evaluate(() => { const w = zaplyvWorld(); w.me.length = 0; }); await p.waitForTimeout(1200); }
if (await toNight('снова') && await tap('#ndanger [data-d=phage]', 'опасность «Фаги»')) {
  await p.waitForTimeout(600); say(await p.evaluate(() => zaplyvNight() && zaplyvNight().gen > 0), 'после выбора опасности поколения идут');
  await p.evaluate(() => zaplyvNight().run()); await p.waitForFunction(() => document.querySelector('#npicks button'), null, { timeout: 8000 }).catch(() => {}); await p.waitForTimeout(200); // ждём сами кнопки веток, а не время (WebKit рисует позже)
  await whole(['#nback', '#nflag', '#ngo', '#npicks button'], 'конец ночи рода');
  // test_L036 (тред слияний 25.11: вкладка WebKit падала после «Ночи рода», «Target crashed»): экран ночи не заводит холсты заново каждый кадр.
  say(await p.evaluate(async () => { const P = HTMLCanvasElement.prototype, D = Object.getOwnPropertyDescriptor(P, 'width'); let n = 0;
    Object.defineProperty(P, 'width', { configurable: true, get: D.get, set(v) { n++; D.set.call(this, v); } });
    await new Promise(ok => setTimeout(ok, 1000)); Object.defineProperty(P, 'width', D); return n < 5; }), 'test_L036: экран «Ночи рода» за секунду не пересоздаёт холсты (было по два каждый кадр)');
  if (await tap('#npicks button', 'ветка «выше всех»')) {
    const g = await p.evaluate(() => zaplyvNight().res.picks[0].genes);
    if (await tap('#ngo', '«Плыть этой веткой»')) { await p.waitForTimeout(300); say(await p.evaluate(g => !document.getElementById('night').classList.contains('on') && g.every(k => zaplyvWorld().genes[k]), g), '«Плыть этой веткой» начинает заплыв с генами ветки: ' + g); }
  }
  await p.evaluate(() => { const w = zaplyvWorld(); w.me.length = 0; }); await p.waitForTimeout(1200);
}
await p.evaluate(() => { document.getElementById('end').scrollTop = 400; }); // игрок долистал лист гибели вниз
if (await tap('#again', '«Плыть снова»')) say(!(await on('end')), '«Плыть снова» начинает заплыв');
await p.evaluate(() => { const w = zaplyvWorld(); w.me.length = 0; }); await p.waitForTimeout(1200);
say(await p.evaluate(() => document.getElementById('end').scrollTop === 0), 'test_L031: второй экран гибели открывается с начала, убийца сверху');
if (await tap('#again', '«Плыть снова» ещё раз')) await p.waitForTimeout(300);
// Меню-сценка (Э21): после гибели меню встречает при входе; объект выбирает режим, нижняя кнопка запускает.
await p.evaluate(() => { const w = zaplyvWorld(); w.me.length = 0; }); await p.waitForTimeout(1200);
await p.reload(); await p.waitForFunction(() => window.zaplyvProbe && zaplyvProbe.frames > 5, null, { timeout: 30000 }); await p.waitForTimeout(800);
say(await on('menu'), 'со второго запуска игра открывается меню режимов (Роман: «почему нет меню выбора режима»)');
await whole(['#mgo', '#mquiet', '#malm'], 'меню режимов');
say((await p.textContent('#mgo')) === 'Плыть', 'по умолчанию выбран заплыв: одно касание до игры');
if (await tap('#mscene [data-m=hunt]', 'закрытый режим «Охота»')) say(await seen('#mscene [data-m=hunt] .mtip') && (await p.textContent('#mgo')) === 'Плыть', 'закрытый режим отвечает строкой у самого объекта, выбор не меняется');
if (await tap('#mscene [data-m=night]', 'объект «Ночь рода»')) say((await p.textContent('#mgo')) === 'Начать ночь', 'касание объекта меняет подпись кнопки');
if (await tap('#mgo', '«Начать ночь»')) say(await on('night') && !(await on('menu')), '«Начать ночь» открывает ночь рода');
if (await tap('#nback', '«Назад» из ночи в меню')) say(await on('menu'), '«Назад» возвращает в меню');
if (await tap('#mquiet', '«Звук вкл»')) say((await p.textContent('#mquiet')) === 'Звук выкл', '«Звук вкл» выключает звук');
await tap('#mquiet', '«Звук выкл»');
if (await tap('#mscene [data-m=swim]', 'объект «Заплыв»') && await tap('#mgo', '«Плыть» из меню')) say(!(await on('menu')) && await p.evaluate(() => zaplyvWorld().me.length > 0), '«Плыть» начинает заплыв');
// Режим «Мутации» (новые мутации, mutacii.js): объект в меню, кнопка запускает заплыв в этом режиме.
await p.evaluate(() => { const w = zaplyvWorld(); w.me.length = 0; }); await p.waitForTimeout(1200);
await p.reload(); await p.waitForFunction(() => window.zaplyvProbe && zaplyvProbe.frames > 5, null, { timeout: 30000 }); await p.waitForTimeout(800);
if (await tap('#mscene [data-m=mut]', 'объект «Мутации»')) say((await p.textContent('#mgo')) === 'Плыть с мутациями', 'касание «Мутаций» меняет подпись кнопки');
if (await tap('#mgo', '«Плыть с мутациями»')) say(!(await on('menu')) && await p.evaluate(() => zaplyvWorld().mode === 'mut' && zaplyvWorld().me.length > 0), '«Плыть с мутациями» начинает заплыв в режиме мутаций');
// Режим «Голод» (Роман 25.11: «Да отдельным режимом давай попробуем»): объект в меню, кнопка запускает заплыв, где без еды худеешь.
await p.evaluate(() => { const w = zaplyvWorld(); w.me.length = 0; }); await p.waitForTimeout(1200);
await p.reload(); await p.waitForFunction(() => window.zaplyvProbe && zaplyvProbe.frames > 5, null, { timeout: 30000 }); await p.waitForTimeout(800);
if (await tap('#mscene [data-m=golod]', 'объект «Голод»')) say((await p.textContent('#mgo')) === 'Плыть в голод', 'касание «Голода» меняет подпись кнопки');
if (await tap('#mgo', '«Плыть в голод»')) { const m0 = await p.evaluate(() => { const w = zaplyvWorld(); w.food.length = 0; return w.me[0].m; }); await p.waitForTimeout(1500);
  say(!(await on('menu')) && await p.evaluate(m0 => { const w = zaplyvWorld(); w.food.length = 0; return w.mode === 'golod' && w.me.length > 0 && w.me[0].m < m0; }, m0), '«Плыть в голод» начинает заплыв, и без еды клетка худеет'); }
// Память о вирусах (Роман 25.11, кадр 0.83): с памятью вирус клетку не убьёт — совета «резко развернись» нет; без памяти он есть.
await p.reload(); await p.waitForFunction(() => window.zaplyvProbe && zaplyvProbe.frames > 5, null, { timeout: 30000 }); await p.waitForTimeout(800);
if (await tap('#mscene [data-m=mut]', 'объект «Мутации»') && await tap('#mgo', '«Плыть с мутациями»')) {
  const land = id => p.evaluate(id => { const w = zaplyvWorld(), a = w.me[0]; w.choice = []; w.phages.length = 0; w.cfg.inject = 1e9; w.phages.push({ x: a.x + 8, y: a.y, vx: 0, vy: 0, d: Math.PI, t: 0, id, host: 'me', cool: 0 }); }, id);
  const toast = () => p.evaluate(() => [...document.querySelectorAll('#toast.on')].map(e => e.textContent).join(''));
  await p.evaluate(() => { const w = zaplyvWorld(); w.genes.memory = true; w.genes.crispr = true; }); await land(93); await p.waitForTimeout(1500); const t1 = await toast();
  await p.evaluate(() => { const w = zaplyvWorld(); w.genes.memory = false; w.genes.crispr = false; }); await land(94); await p.waitForTimeout(1500); const t2 = await toast();
  say(!/Сел вирус/.test(t1) && /Сел вирус/.test(t2), `с памятью о вирусах совета «Сел вирус! Резко развернись» нет, без памяти есть («${t1}» / «${t2}»)`); }
say(!errs.length, 'ошибок страницы нет' + (errs.length ? ': ' + errs.join('; ') : ''));
await b.close();
console.log(bad ? `КАСАНИЯ: провалов ${bad}` : 'КАСАНИЯ: все кнопки отвечают пальцу');
process.exit(bad ? 1 : 0);
