// Кнопка «Не так» (книга, раздел 7, Э7): одно касание ставит отметку с моментом игры — без окна текста.
// Отметки копятся в этом браузере, а «Отправить» отдаёт их одним сообщением через меню «Поделиться» телефона
// (в мессенджер, в заметки, в приложение Claude). Без DOM — проверяется тестом.
const LISTS = [['amoebas', 'amoeba'], ['bdellos', 'bdello'], ['phages', 'phage'], ['slippers', 'slipper'], ['rotis', 'roti'],
  ['pseudos', 'pseudo'], ['donors', 'donor'], ['prey', 'coccus'], ['plants', 'plant'], ['bells', 'bell']];

// Кто рядом с клеткой: имена из карточек, ближние первыми.
export function nearby(w, cards, r, c) {
  const out = [];
  for (const [list, key] of LISTS) for (const e of w[list] || []) {
    const [x, y] = key === 'bell' ? w.bell(e) : [e.x, e.y], d = Math.hypot(x - c.x, y - c.y);
    const k = e.strain ? 'strain' : key; if (d < r) out.push([d, cards[k]?.name || k]);
  }
  out.sort((a, b) => a[0] - b[0]);
  return [...new Set(out.map(o => o[1]))];
}

// Одна отметка — одна строка: версия, когда, где, что было вокруг.
export function mark(w, cards, ver, screen, r, c) {
  const t = Math.round(w.stats.time), genes = Object.keys(w.genes).filter(g => w.genes[g]).map(g => w.cfg.genes[g] || g); // только включённые; без имени — ключом (Роман 27.11: «гены: , cdiA, , tar»)
  return [`Заплыв ${ver}`, `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')} в заплыве`, screen,
    `клеток ${w.me.length}`, 'гены: ' + (genes.join(', ') || 'нет'), 'рядом: ' + (nearby(w, cards, r, c).join(', ') || 'никого'),
    w.me.length ? '' : 'убил: ' + (cards[w.stats.killer]?.name || w.stats.killer || '?')].filter(Boolean).join(' · ');
}

export function message(marks) {
  return '«Не так» из Заплыва, отметок ' + marks.length + ':\n' + marks.map((m, i) => `${i + 1}) ${m.at} — ${m.text}`).join('\n');
}
