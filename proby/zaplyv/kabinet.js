// Кабинет (макет design/zaplyv_kabinet_maket.png, гейм-дизайнер 24.11): полка с разделами и карточка по касанию.
// Картинки — снимки живых моделей из игры (snap из main.js). Тексты — из книги (kniga/teksty_sushchestv.json).
// Чистые функции сверху проверяет test.mjs; экран — kabinetScreen.

const few = n => n % 10 === 1 && n % 100 !== 11 ? 'обитателя' : 'обитателей';
// Что на полке: счётчик словами, разделы с числом встреченных, карточки раздела по порядку kabinet.json.
export function shelf(K, met, group = 'all') {
  const keys = Object.keys(K.items), others = keys.filter(k => K.items[k].group !== 'me');
  const seen = others.filter(k => met.has(k)).length;
  const pills = K.groups.map(([g, name]) => {
    const n = (g === 'all' ? others : others.filter(k => K.items[k].group === g)).filter(k => met.has(k)).length; // «Ты» не в счёт: счёт тот же, что сверху
    return { g, label: n ? `${name} · ${n}` : name };
  });
  const list = keys.filter(k => group === 'all' || K.items[k].group === group);
  return { count: `Ты встретил ${seen} ${few(seen)} капли из ${others.length}`, part: seen / others.length, pills, list };
}

// Карточка: тексты книги (T — teksty_sushchestv.json, прошли копирайтера), запасные — cards.json; невстреченный — только где искать.
export function page(k, K, cards, T, met) {
  const it = K.items[k], c = cards[k], t = T[k] || {}, color = K.colors[it.group];
  if (!met.has(k)) return { name: 'Ещё не встречал', line: it.hint || 'Плыви дальше', color, met: false };
  const blocks = [['КТО ЭТО', t.kto || c.text, '#7cc8ff']];
  if (t.sovet || c.tip) blocks.push(['СОВЕТ', t.sovet || c.tip, '#ff8a4c']);
  if (t.priroda || c.fact) blocks.push(['В ПРИРОДЕ', t.priroda || c.fact, '#b79cff', t.nomer ? `Запись ${t.nomer} в книге игры · проверено биологом` : 'Из книги игры']);
  return { name: t.imya || c.name, line: it.line, size: it.size || '', color, blocks, met: true };
}

export function kabinetScreen({ K, cards, T, met, snap, onSwim }) {
  const $ = id => document.getElementById(id);
  const shots = new Map(), keys = Object.keys(K.items);
  let group = 'all', cur = null, queue = [], top = 0;
  const shot = k => { if (!shots.has(k)) { try { shots.set(k, snap(k)); } catch (e) { shots.set(k, ''); } } return shots.get(k); };
  const seenNew = () => { try { return new Set(JSON.parse(localStorage.getItem('zaplyv.opened') || '[]')); } catch (_) { return new Set(); } };
  const opened = seenNew();
  // снимки по одному за кадр: полка появляется сразу, модели проявляются
  function fill() {
    const job = queue.shift(); if (!job) return;
    job.img.src = shot(job.k); requestAnimationFrame(fill);
  }
  function drawShelf() {
    const S = shelf(K, met, group);
    $('kcount').textContent = S.count; $('kbar').firstElementChild.style.width = Math.round(S.part * 100) + '%';
    const pills = $('kpills'); pills.innerHTML = '';
    for (const p of S.pills) { const b = document.createElement('button'); b.textContent = p.label; b.className = p.g === group ? 'on' : ''; b.dataset.g = p.g;
      b.onclick = () => { group = p.g; drawShelf(); }; pills.appendChild(b); }
    const box = $('shelf'); box.innerHTML = ''; queue = [];
    for (const k of S.list) {
      const P = page(k, K, cards, T, met), b = document.createElement('button');
      b.className = 'kc' + (P.met ? '' : ' no'); b.dataset.k = k; b.style.setProperty('--g', P.met ? P.color : '');
      const img = document.createElement('img'); img.alt = ''; b.appendChild(img);
      if (shots.has(k)) img.src = shots.get(k); else queue.push({ k, img });
      const n = document.createElement('b'); n.textContent = P.name; b.appendChild(n);
      const l = document.createElement('span'); l.textContent = P.line; b.appendChild(l);
      if (P.met && !opened.has(k) && k !== 'me') { const d = document.createElement('i'); d.className = 'new'; b.appendChild(d); }
      b.onclick = () => P.met && openCard(k);
      box.appendChild(b);
    }
    requestAnimationFrame(fill);
  }
  function openCard(k) {
    cur = k; opened.add(k); try { localStorage.setItem('zaplyv.opened', JSON.stringify([...opened])); } catch (_) {}
    const P = page(k, K, cards, T, met), card = $('kcard');
    card.style.setProperty('--g', P.color);
    $('khead').textContent = 'Кабинет'; $('kname').textContent = P.name; $('ktag').textContent = P.line; $('ksize').textContent = P.size;
    $('kimg').src = shot(k);
    const box = $('kblocks'); box.innerHTML = '';
    for (const [h, t, c, src] of P.blocks) {
      const d = document.createElement('div'); d.className = 'kb'; d.style.setProperty('--c', c);
      const hh = document.createElement('h3'); hh.textContent = h; d.appendChild(hh);
      const p = document.createElement('p'); p.textContent = t; d.appendChild(p);
      if (src) { const s = document.createElement('small'); s.textContent = src; d.appendChild(s); }
      box.appendChild(d);
    }
    const mine = keys.filter(x => met.has(x)), i = mine.indexOf(k), prev = mine[(i - 1 + mine.length) % mine.length], next = mine[(i + 1) % mine.length];
    $('kprev').textContent = '‹ ' + page(prev, K, cards, T, met).name; $('kprev').onclick = () => openCard(prev);
    $('knext').textContent = page(next, K, cards, T, met).name + ' ›'; $('knext').onclick = () => openCard(next);
    $('kprev').style.visibility = $('knext').style.visibility = mine.length > 1 ? '' : 'hidden';
    if (!$('kshelf').hidden) top = $('cabinet').scrollTop; // место на полке — вернёмся ровно туда
    $('kshelf').hidden = true; card.hidden = false; $('cabinet').scrollTop = 0;
  }
  function toShelf() { $('kcard').hidden = true; $('kshelf').hidden = false; drawShelf(); $('cabinet').scrollTop = top; }
  function open() { group = 'all'; $('kcard').hidden = true; $('kshelf').hidden = false; drawShelf(); $('cabinet').classList.add('on'); $('cabinet').scrollTop = 0; }
  function close() { $('cabinet').classList.remove('on'); }
  $('back').onclick = close; $('kback').onclick = toShelf;
  let sx = null; // смахивание от левого края вправо — назад, как в приложениях iPhone
  $('cabinet').addEventListener('touchstart', e => { const t = e.touches[0]; sx = t.clientX < 28 ? [t.clientX, t.clientY] : null; }, { passive: true });
  $('cabinet').addEventListener('touchend', e => { const t = e.changedTouches[0]; if (sx && t.clientX - sx[0] > 70 && Math.abs(t.clientY - sx[1]) < 60) ($('kcard').hidden ? close : toShelf)(); sx = null; }, { passive: true });
  $('kswim').onclick = () => { close(); onSwim(); };
  return { open, close, openCard, label: () => { const o = keys.filter(k => K.items[k].group !== 'me'); return `Кабинет · встретил ${o.filter(k => met.has(k)).length} из ${o.length}`; } };
}
