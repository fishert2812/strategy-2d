// Вся книга «Заплыва» одним текстом для стороннего агента: у каждого пункта номер в скобках, сверху правило ответа.
// Одна функция на два входа: кнопка «Скопировать книгу для агента» в панели и `node agentu.mjs` (файл для адреса). Ведёт тред панели.
(g => { g.knigaDlyaAgenta = (D, navyki) => { // navyki = true: только разделы про навыки (втрое короче)
  const SH = { nauka: 'база науки', adaptaciya: 'адаптация', biolog: 'у биолога', gotov: 'готов к стройке', stroyka: 'строим', v_igre: 'в игре' }, out = [], p = (id, t, st, rows) =>
    out.push(`[${id}] ${t}${st ? ' · ' + st : ''}` + rows.filter(r => r[1]).map(([b, v]) => `\n  ${b}: ${String(v).replace(/\s+/g, ' ')}`).join(''));
  const h = t => out.push('\n== ' + t + ' ==');
  out.push('КНИГА ИГРЫ «ЗАПЛЫВ» ДЛЯ РАЗБОРА\nИгра для телефона: ты бактерия в капле пруда, ешь, растёшь, делишься, получаешь умения. Ниже все пункты книги, у каждого номер в квадратных скобках.\n\n' +
    'КАК ОТВЕЧАТЬ. Каждое замечание отдельной строкой, в начале номер пункта в квадратных скобках:\n[Г2] что не так и как сделать лучше\n[Ф17] ...\nЗамечание ко всей книге начинай с [общее]. Номера не меняй и не придумывай. Новую идею без пункта пиши как [новое]. Весь ответ одним сообщением: его вставят в панель книги, и она разложит строки по пунктам.');
  h('Навыки: разбор (зачем брать, как выглядит, уровни)'); for (const c of D.razbor.kartochki) p(c.id, c.t, c.step, c.r);
  if (!navyki) { h('Решения, которые ждут Романа'); for (const r of D.resheniya.resheniya) p(r.id, r.zagolovok, '', [['Что делаешь', r.palec], ['Что будет', r.proishodit], ['Зачем', r.zachem], ['Пункты', r.punkty.join(', ')]]);
  h('Проблемы, найденные Романом'); for (const r of D.problemy) p(r.id, '«' + r.slova + '»', r.status, [['Что с этим', r.chto]]);
  h('Все пункты книги'); for (const r of D.zapisi) p(r.id, r.name, SH[r.shag] + (r.versiya ? ' с ' + r.versiya : '') + (r.novaya && !r.roman ? ', ждёт слова Романа' : ''), [['В игре', r.igra], ['Наука', r.nauka]]);
  } h('Навыки в игре: что видно на клетке'); for (const u of D.umeniya.v_igre) p(u.nomer, u.imya, { da: 'видно', slabo: 'видно слабо', net: 'не видно' }[u.vidno], [['Что делает', u.daet], ['На кадре', u.kadr], ['Что сделать', u.komment]]);
  if (!navyki) { h('Анимации'); for (const a of D.animacii) p(a.id, a.chto, a.ocenka, [['Сейчас', a.seychas], ['Нужно', a.nuzhno]]);
  } h('Каталог: 70 умений из природы'); for (const c of D.katalog.kartochki) p(c.id, c.t, c.step, c.r.filter(r => r[0] !== 'У кого'));
  h('Замечания, которые уже в работе'); for (const c of D.zamechaniya.kartochki) p(c.id, c.t, c.step, c.r);
  return out.join('\n') + '\n';
}; g.knigaFayly = ['razbor', 'resheniya', 'problemy', 'umeniya', 'animacii', 'katalog', 'zamechaniya'];
})(typeof window !== 'undefined' ? window : globalThis);
