// Сторож портрета хозяина у линейки «Капли» (книга П5): node proby/zaplyv/kaplya/test_lineyka.mjs. Провал — код 1.
// Книга: «Над силуэтами: маленький портрет хозяина главы, если хозяина уже видели». Страница не нужна: столбик собирается на подставном документе.
import { obnovit } from './lineyka.js';
globalThis.document = { createElement: tag => ({ tag, dataset: {}, className: '' }) }; globalThis.Image = class { constructor() { this.tag = 'img'; this.dataset = {}; this.className = ''; } };
let bad = 0; const check = (n, e) => { console.log((e ? '  ПРОВАЛ ' : '  ок ') + n + (e ? ': ' + e : '')); if (e) bad++; };
const stolbik = (videl, eda, m, car, obn = obnovit) => { const L = { sil: Object.fromEntries(Object.keys(videl).map(k => [k, 'sil:' + k])), klyuch: '', box: { kids: [], set textContent(v) { this.kids = []; }, appendChild(x) { this.kids.push(x); } } };
  obn(L, videl, eda, m, { nizhe: 3, vyshe: 3 }, car); return L.box.kids; };
const sud = obn => { const v = { coccus: 0.5, pseudo: 3, bodo: 40 };
  let k = stolbik(v, new Set(['coccus']), 2, 'bodo', obn), top = k.at(-1); if (!top || !/car/.test(top.className) || top.src !== 'sil:bodo') return 'хозяина видели, а портрета над силуэтами нет';
  if (/eda/.test(top.className)) return 'хозяин не еда, а портрет светится едой';
  k = stolbik(v, new Set(['coccus', 'pseudo', 'bodo']), 80, 'bodo', obn); if (!/eda/.test(k.at(-1).className)) return 'хозяина уже можно есть, а портрет не тёплый';
  k = stolbik({ coccus: 0.5 }, new Set(), 2, 'bodo', obn); if (k.some(x => /car/.test(x.className))) return 'хозяина ещё не видели, а портрет есть';
  return ''; };
check('test_lineyka_car: над силуэтами линейки портрет хозяина главы, если его уже видели; тёплый, когда он еда (П5)', sud(obnovit));
check('test_lineyka_samoproverka: столбик без хозяина — судья краснеет', sud((L, v, e, m, K) => obnovit(L, v, e, m, K)) ? '' : 'судья не заметил');
process.exit(bad ? 1 : 0);
