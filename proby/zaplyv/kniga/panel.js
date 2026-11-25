// Панель книги «Заплыва», шаг 1: замечание у любого пункта и отправка всех замечаний одним текстом.
// Роман, 25.11: «Чтобы я мог прокомментировать, мои комментарии обрабатывались, вносились в документ! Из них составляли задачи!»
// Замечания лежат в этом браузере (localStorage), пока их не отправили. Сервера нет: текст уходит через «Поделиться»
// или «Скопировать» и при этом стоит на экране в поле, откуда его можно выделить руками. Файл ведёт тред панели.
(() => {
  const PDF = location.search === '?vse'; // лента для PDF: страницы панели наполняем, кнопок не ставим
  const KEY = 'zaplyv_zamechaniya', $ = (s, el = document) => el.querySelector(s);
  const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const load = () => { try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; } };
  let mem = load(), ZD = []; // если хранилище закрыто (частный режим), замечания живут до закрытия страницы
  const save = a => { mem = a; try { localStorage.setItem(KEY, JSON.stringify(a)); } catch {} };
  const novye = () => mem.filter(z => !z.otpr);
  const today = () => new Date().toLocaleDateString('ru-RU');

  document.head.insertAdjacentHTML('beforeend', `<style>
.zm-b { float: right; min-width: 44px; min-height: 44px; margin: -6px -8px 0 6px; border-radius: 14px; border: 1px solid var(--line); background: rgba(120, 220, 255, 0.08); color: var(--accent); font: inherit; font-size: 20px; -webkit-appearance: none; touch-action: manipulation; }
.zm-b.on { background: rgba(255, 209, 102, 0.22); border-color: var(--energy); color: var(--energy); }
.zm-n { clear: both; margin-top: 10px; padding: 8px 12px; border-radius: 14px; border: 1px dashed var(--energy); font-size: 15px; white-space: pre-wrap; }
.zm-n b { display: block; font-size: 13px; font-weight: 500; color: var(--energy); } .zm-n.otpr { border-color: var(--line); } .zm-n.otpr b { color: var(--dim); } .zm-n.zd { border-style: solid; border-color: var(--accent); } .zm-n.zd b { color: var(--accent); }
#zm-bar { position: fixed; z-index: 3; left: 0; right: 0; bottom: 0; display: flex; gap: 8px; padding: 8px 16px calc(env(safe-area-inset-bottom) + 8px); background: #04121a; border-top: 1px solid var(--line); }
#zm-bar button, .zm-s button { flex: 1; min-height: 48px; border-radius: 16px; border: 1px solid var(--line); background: rgba(120, 220, 255, 0.08); color: var(--ink); font: inherit; font-size: 16px; font-weight: 600; -webkit-appearance: none; touch-action: manipulation; }
#zm-bar button.go, .zm-s button.go { border-color: var(--accent); background: rgba(60, 255, 200, 0.18); } #zm-bar button:disabled { opacity: 0.45; }
body { padding-bottom: calc(env(safe-area-inset-bottom) + 96px) !important; } #toast { bottom: calc(env(safe-area-inset-bottom) + 84px) !important; z-index: 6; }
#zm-w { position: fixed; z-index: 5; inset: 0; background: rgba(0, 0, 0, 0.55); display: none; align-items: flex-end; } #zm-w.on { display: flex; }
.zm-s { width: 100%; max-width: 640px; margin: 0 auto; max-height: 92vh; overflow-y: auto; padding: 16px 16px calc(env(safe-area-inset-bottom) + 16px); border-radius: 22px 22px 0 0; background: #0a2832; border-top: 1px solid var(--accent); }
.zm-s h3 { margin: 0 0 4px; } .zm-s p { margin: 4px 0 10px; color: var(--dim); font-size: 14px; }
.zm-s textarea { width: 100%; min-height: 150px; padding: 10px 12px; border-radius: 14px; border: 1px solid var(--line); background: rgba(0, 0, 0, 0.3); color: var(--ink); font: inherit; font-size: 16px; -webkit-appearance: none; }
.zm-s .row { display: flex; gap: 8px; margin-top: 10px; }
@media print { .zm-b, #zm-bar, #zm-w, .zm-n { display: none !important; } }
</style>`);
  document.body.insertAdjacentHTML('beforeend', '<div id="zm-bar"><button type="button" id="zm-page">✎ К этой странице</button><button type="button" id="zm-send" class="go"></button></div><div id="zm-w"><div class="zm-s"></div></div>');
  const say = m => { const t = $('#toast'); if (!t) return; t.textContent = m; t.classList.add('on'); setTimeout(() => t.classList.remove('on'), 1800); };

  // Куда привязано замечание: карточка с номером (Г7, Б8, А3), решение (№5) или вкладка целиком.
  const tab = () => { const a = $('nav .tb a.on') || $('nav .gr a.on'); return { k: location.hash.slice(1) || 'oblozhka', n: a ? a.textContent.trim() : 'Главная' }; };
  function target(card) {
    const t = card.querySelector(':scope > .t'), c = t && t.querySelector(':scope > .code');
    const id = card.dataset.id || (c && c.textContent.trim()); if (!id || !t) return null;
    const x = t.cloneNode(true); x.querySelectorAll('.code, .zm-b, .zn').forEach(e => e.remove());
    return { punkt: id, nazv: x.textContent.trim().replace(/^\d+\.\s*/, '').slice(0, 90), vkladka: tab().n };
  }
  const pageTarget = () => ({ punkt: 'вкладка:' + tab().k, nazv: tab().n, vkladka: tab().n });

  // Страницы панели: строка {{panel:имя}} в .md даёт div[data-panel], сюда встают карточки из имя.json (один вид на все файлы).
  const karta = c => (c.h ? `<h2>${esc(c.h)}</h2>` : '') + `<div class="card"><div class="t"><span class="code">${esc(c.id)}</span>${esc(c.t)}</div><div class="step s${c.s}">${esc(c.step)}</div>` +
    c.r.map(([b, v]) => `<div class="r"><b>${esc(b)}</b><span>${esc(v)}</span></div>`).join('') + '</div>';
  const DATA = {}, get = async k => DATA[k] || (DATA[k] = await (await fetch(k + '.json', { cache: 'no-cache' })).json());
  async function fill() {
    for (const el of document.querySelectorAll('#page [data-panel]:not([data-ok])')) { el.dataset.ok = '1';
      try { const d = await get(el.dataset.panel);
        el.innerHTML = (d.itog ? `<div class="card"><div class="t">Всего: ${d.kartochki.length}</div>` + d.itog.map(([b, v]) => `<div class="r"><b>${esc(b)}</b><span>${v}</span></div>`).join('') + '</div>' : '') + (d.kartochki.map(karta).join('') || '<p>Пока пусто.</p>');
        if (el.dataset.panel === 'zamechaniya' && !PDF) el.insertAdjacentHTML('afterbegin', AG);
      } catch { el.innerHTML = '<p>Не открылось. Обнови страницу.</p>'; } }
    if (!PDF) decorate();
  }
  // Другой агент: отдаём ему книгу одним текстом (agentu.js), его ответ строками «[Г7] текст» раскладываем по пунктам как замечания.
  const AG = '<div class="card zm-s" style="border-radius:20px;background:none;border:1px solid var(--line);max-height:none"><div class="t">Дать книгу другому агенту</div><p>1. Скопируй книгу и вставь агенту. 2. Его ответ вставь сюда. Строки разойдутся по пунктам, и ты отправишь их вместе со своими.</p>' +
    '<div class="row"><button type="button" data-ag="1">Скопировать навыки</button><button type="button" data-ag="">Скопировать всю книгу</button></div><textarea id="zm-in" style="margin-top:10px;min-height:96px" placeholder="Сюда вставь ответ агента"></textarea><div class="row"><button type="button" id="zm-razl" class="go">Разложить по пунктам</button></div></div>';
  async function kniga(navyki) {
    if (!window.knigaDlyaAgenta) await new Promise((ok, no) => { const s = document.createElement('script'); s.src = 'agentu.js'; s.onload = ok; s.onerror = no; document.head.append(s); });
    const D = Object.fromEntries(await Promise.all(window.knigaFayly.map(async f => [f, await get(f)])));
    D.zapisi = (await Promise.all((await get('zapisi/spisok')).map(f => get('zapisi/' + f)))).flat();
    return window.knigaDlyaAgenta(D, navyki);
  }
  function razlozhit(text, kto) { // «[Г7] текст» или «[Г7 · Название] текст»; строка без номера продолжает прошлую
    const a = []; for (const l of text.split('\n')) { const m = l.match(/^\s*[-*•]?\s*\[([^\]·]+)[^\]]*\]\s*(.*)/); if (m) a.push({ punkt: m[1].trim(), nazv: kto, vkladka: 'разбор агента', text: m[2], kogda: new Date().toISOString(), otpr: '' }); else if (a.length && l.trim()) a[a.length - 1].text += '\n' + l.trim(); }
    const ok = a.filter(z => z.text.trim()); if (ok.length) save([...mem, ...ok]); return ok.length;
  }
  function decorate() {
    const by = {}; for (const z of mem) (by[z.punkt] = by[z.punkt] || []).push(z);
    document.querySelectorAll('#page .card').forEach(card => {
      const tg = target(card); if (!tg) return;
      card.querySelectorAll(':scope > .zm-n').forEach(e => e.remove());
      let b = card.querySelector(':scope > .t > .zm-b');
      if (!b) { b = document.createElement('button'); b.type = 'button'; b.className = 'zm-b'; b.textContent = '✎'; b.setAttribute('aria-label', 'Замечание к ' + tg.punkt); card.querySelector(':scope > .t').prepend(b); }
      const zs = by[tg.punkt] || []; b.classList.toggle('on', zs.some(z => !z.otpr));
      const sam = card.closest('[data-panel="zamechaniya"]'); // задачи из принятых замечаний: номер З и что сделано, у того же пункта
      if (!sam) for (const z of ZD.filter(z => z.punkt === tg.punkt)) card.insertAdjacentHTML('beforeend', `<div class="zm-n zd"><b>Задача ${esc(z.id)} · ${esc(z.step)}</b>${esc(z.t)}</div>`);
      for (const z of zs) card.insertAdjacentHTML('beforeend', `<div class="zm-n${z.otpr ? ' otpr' : ''}"><b>${z.otpr ? 'Твоё замечание · отправлено ' + esc(z.otpr) : 'Твоё замечание · ещё не отправлено'}</b>${esc(z.text)}</div>`);
    });
    const n = novye().length, s = $('#zm-send'); s.textContent = n ? 'Отправить · ' + n : 'Замечаний нет'; s.disabled = !n;
    $('#zm-page').classList.toggle('on', mem.some(z => !z.otpr && z.punkt === 'вкладка:' + tab().k));
  }

  // Письмо: одна строка на замечание, номер пункта в квадратных скобках. Так же отвечает сторонний агент.
  const pismo = () => { const a = novye(); return `Замечания к книге «Заплыва» · ${today()} · ${a.length} шт.\n\n` +
    a.map(z => (z.punkt.startsWith('вкладка:') ? `[вкладка «${z.nazv}»] ` : `[${z.punkt} · ${z.nazv} · вкладка «${z.vkladka}»] `) + z.text.trim()).join('\n\n'); };

  const close = () => { $('#zm-w').classList.remove('on'); decorate(); };
  function edit(tg) {
    const old = mem.find(z => !z.otpr && z.punkt === tg.punkt);
    $('.zm-s').innerHTML = `<h3>${esc(tg.punkt.startsWith('вкладка:') ? 'Страница «' + tg.nazv + '»' : tg.punkt + ' · ' + tg.nazv)}</h3><p>Напиши или наговори, что не так и как ты это видишь.</p>` +
      `<textarea id="zm-t" placeholder="Твоё замечание">${old ? esc(old.text) : ''}</textarea><div class="row"><button type="button" id="zm-x">${old ? 'Удалить' : 'Отмена'}</button><button type="button" id="zm-ok" class="go">Сохранить</button></div>`;
    $('#zm-w').classList.add('on'); $('#zm-t').focus();
    $('#zm-x').onclick = () => { if (old) save(mem.filter(z => z !== old)); close(); };
    $('#zm-ok').onclick = () => { const text = $('#zm-t').value.trim(); if (!text) return say('Пока пусто');
      if (old) { old.text = text; save(mem); } else save([...mem, { ...tg, text, kogda: new Date().toISOString(), otpr: '' }]);
      close(); say('Сохранено. Отправь, когда соберёшь все'); };
  }
  function send() {
    const text = pismo();
    $('.zm-s').innerHTML = `<h3>Отправить замечания: ${novye().length}</h3><p>Весь текст ниже. Отправь его в чат проекта любым способом.</p><textarea id="zm-t" readonly>${esc(text)}</textarea>` +
      `<div class="row">${navigator.share ? '<button type="button" id="zm-sh" class="go">Поделиться</button>' : ''}<button type="button" id="zm-cp" class="go">Скопировать</button></div>` +
      '<div class="row"><button type="button" id="zm-back">Ещё не отправил</button><button type="button" id="zm-done">Отправил, убрать из списка</button></div>';
    $('#zm-w').classList.add('on');
    const copy = async () => { const t = $('#zm-t'); t.focus(); t.select(); t.setSelectionRange(0, text.length);
      try { await navigator.clipboard.writeText(text); say('Скопировано. Вставь в чат'); } catch { say(document.execCommand && document.execCommand('copy') ? 'Скопировано. Вставь в чат' : 'Текст выделен: нажми «Скопировать»'); } };
    $('#zm-cp').onclick = copy;
    if ($('#zm-sh')) $('#zm-sh').onclick = async () => { try { await navigator.share({ text }); } catch (e) { if (e.name !== 'AbortError') copy(); } }; // только текст, без файлов: файл вытеснял текст (урок флажка 24.11)
    $('#zm-back').onclick = close;
    $('#zm-done').onclick = () => { const d = today(); save(mem.map(z => z.otpr ? z : { ...z, otpr: d })); close(); say('Убрано. Номера задач появятся у пунктов'); };
  }

  document.addEventListener('click', e => {
    const b = e.target.closest('.zm-b');
    if (b) { e.stopPropagation(); const tg = target(b.closest('.card')); if (tg) edit(tg); return; }
    if (e.target.closest('#zm-page')) return edit(pageTarget());
    if (e.target.closest('#zm-send')) return send();
    if (e.target.id === 'zm-w') close();
    const ag = e.target.closest('[data-ag]');
    if (ag) { const t = ag.textContent; ag.textContent = 'Собираю…'; kniga(!!ag.dataset.ag).then(async x => { try { await navigator.clipboard.writeText(x); say('Скопировано: ' + Math.round(x.length / 1000) + ' тыс. знаков. Вставь агенту'); } catch { $('#zm-in').value = x; say('Текст в поле ниже: выдели и скопируй'); } }).catch(() => say('Не собралось. Обнови страницу')).finally(() => { ag.textContent = t; }); }
    if (e.target.id === 'zm-razl') { const n = razlozhit($('#zm-in').value, 'агент'); if (n) $('#zm-in').value = ''; decorate(); say(n ? 'Разложено по пунктам: ' + n + '. Проверь и отправь' : 'Не нашёл строк вида [Г7] текст'); }
  }, true);
  let busy = false; // страница перерисовывается при смене вкладки: расставляем кнопки заново
  new MutationObserver(() => { if (busy) return; busy = true; requestAnimationFrame(() => { fill(); busy = false; }); }).observe($('#page'), { childList: true });
  if (PDF) return void fill();
  addEventListener('hashchange', () => setTimeout(fill, 0));
  window.zaplyvPanel = { pismo, novye, kniga, razlozhit }; fill(); get('zamechaniya').then(d => { ZD = d.kartochki; decorate(); }).catch(() => {});
})();
