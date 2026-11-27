// Экран гибели «Капли» (блок В.1, pravki_po_blokam.md 4: «Экран гибели называет не того убийцу и закрыт значками»).
// Было: убийца без строки в книге и без карточки (трубач, нематода) показывался как «Это ты / Кишечная палочка», снимок — пустой рамкой,
// сверло любого жителя кроме ручных списывалось на амёбу. Здесь: кто убил словами (книга → карточка → kaplya.json «gibel.kto»), снимок любого жителя мира.
// Убийцы: кто может убить по данным (ручные пасти и паразиты, бодо, укол соперницы, хищные жители novye) — список для ворот test_ubiyca_veren.
export function kto(kk, cards, TEKSTY, G) { const t = TEKSTY[kk] || {}, k = cards[kk] || {}, g = (G.kto || {})[kk] || {}, imya = t.imya || k.name || g.imya;
  if (!kk || kk === 'me' || !imya) return null;
  return { who: t.ubil || k.who || g.ubil || G.nikto.ubil, name: imya, text: t.kto || k.text || g.kto || '', tip: t.sovet || k.tip || g.kak || '', fact: t.priroda || k.fact || '' }; }
// Список мира → ключ убийцы (сверло: «съели вместе с добычей»). Сначала ручные списки, потом жители книги.
export const poSpisku = (x, LISTS, SPISKI) => Object.keys(LISTS).find(k => LISTS[k] === x) || Object.keys(SPISKI).find(k => SPISKI[k] === x) || null;
// Снимок убийцы, которого нет в Альманахе: житель книги в студии, рамка по его размеру.
export function kadr(kk, SPISKI, N, G, radius) { const D = (G.dop || {})[kk] || {}, s = SPISKI[kk] || D.spisok, n = N[kk] || D; if (!s || !n || !n.massa) return null; const [spisok, vid] = s.split(':'), m = (n.massa[0] + n.massa[1]) / 2;
  return { a: -0.35, span: radius(m) * ((G.ramka_k || {})[kk] || G.ramka), spisok, vid, m, pole: D.pole }; }
// Кто может убить по данным: ключи lose() во всех местах игры.
export function ubiycy(KAP, LISTS) { const N = KAP.novye, B = KAP.boj;
  return [...new Set([...Object.keys(LISTS).filter(k => !KAP.gibel.ne_ubiyca.includes(k)), 'bodo', B.gibel_ot, ...Object.values(B.na_tebya).filter(x => x && x.kto).flatMap(x => x.kto),
    ...Object.keys(N).filter(k => N[k] && (N[k].povadka === 'oxotnik' || N[k].povadka === 'potok') && N[k].bolshe < 1000)])]; }
