// Панель книги «Заплыва», шаг 1: замечание у любого пункта и отправка всех замечаний одним текстом.
// Роман, 25.11: «Чтобы я мог прокомментировать, мои комментарии обрабатывались, вносились в документ! Из них составляли задачи!»
// Замечания лежат в этом браузере (localStorage), пока их не отправили. Сервера нет: текст уходит через «Поделиться»
// или «Скопировать» и при этом стоит на экране в поле, откуда его можно выделить руками. Файл ведёт тред панели.
(() => {
  if (location.search === '?vse') return; // лента для PDF: без кнопок
  const KEY = 'zaplyv_zamechaniya', $ = (s, el = document) => el.querySelector(s);
  const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const load = () => { try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; } };
  let mem = load(); // если хранилище закрыто (частный режим), замечания живут до закрытия страницы
  const save = a => { mem = a; try { localStorage.setItem(KEY, JSON.stringify(a)); } catch {} };
  const novye = () => mem.filter(z => !z.otpr);
  const today = () => new Date().toLocaleDateString('ru-RU');

  document.head.insertAdjacentHTML('beforeend', `<style>
.zm-b { float: right; min-width: 44px; min-height: 44px; margin: -6px -8px 0 6px; border-radius: 14px; border: 1px solid var(--line); background: rgba(120, 220, 255, 0.08); color: var(--accent); font: inherit; font-size: 20px; -webkit-appearance: none; touch-action: manipulation; }
.zm-b.on { background: rgba(255, 209, 102, 0.22); border-color: var(--energy); color: var(--energy); }
.zm-n { clear: both; margin-top: 10px; padding: 8px 12px; border-radius: 14px; border: 1px dashed var(--energy); font-size: 15px; white-space: pre-wrap; }
.zm-n b { display: block; font-size: 13px; font-weight: 500; color: var(--energy); } .zm-n.otpr { border-color: var(--line); } .zm-n.otpr b { color: var(--dim); }
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

  function decorate() {
    const by = {}; for (const z of mem) (by[z.punkt] = by[z.punkt] || []).push(z);
    document.querySelectorAll('#page .card').forEach(card => {
      const tg = target(card); if (!tg) return;
      card.querySelectorAll(':scope > .zm-n').forEach(e => e.remove());
      let b = card.querySelector(':scope > .t > .zm-b');
      if (!b) { b = document.createElement('button'); b.type = 'button'; b.className = 'zm-b'; b.textContent = '✎'; b.setAttribute('aria-label', 'Замечание к ' + tg.punkt); card.querySelector(':scope > .t').prepend(b); }
      const zs = by[tg.punkt] || []; b.classList.toggle('on', zs.some(z => !z.otpr));
      for (const z of zs) card.insertAdjacentHTML('beforeend', `<div class="zm-n${z.otpr ? ' otpr' : ''}"><b>${z.otpr ? 'Твоё замечание · отправлено ' + esc(z.otpr) : 'Твоё замечание · ещё не отправлено'}</b>${esc(z.text)}</div>`);
    });
    const n = novye().length, s = $('#zm-send'); s.textContent = n ? 'Отправить · ' + n : 'Замечаний нет'; s.disabled = !n;
    $('#zm-page').classList.toggle('on', mem.some(z => !z.otpr && z.punkt === 'вкладка:' + tab().k));
  }

  // Письмо: одна строка на замечание, номер пункта в квадратных скобках. Так же отвечает сторонний агент.
  const pismo = () => { const a = novye(); return `Замечания к книге «Заплыва» · ${today()} · ${a.length} шт.\n\n` +
    a.map(z => (z.punkt.startsWith('вкладка:') ? `[вкладка «${z.nazv}»] ` : `[${z.punkt} · ${z.nazv}] `) + z.text.trim()).join('\n\n'); };

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
  }, true);
  let busy = false; // страница перерисовывается при смене вкладки: расставляем кнопки заново
  new MutationObserver(() => { if (busy) return; busy = true; requestAnimationFrame(() => { decorate(); busy = false; }); }).observe($('#page'), { childList: true });
  addEventListener('hashchange', () => setTimeout(decorate, 0));
  window.zaplyvPanel = { pismo, novye }; decorate();
})();
