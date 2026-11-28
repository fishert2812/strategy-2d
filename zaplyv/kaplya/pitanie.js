// Лестница питания (Роман 27.11 14:48: «Глотает целиком должен быть как не первый скилл это какая то прокачка должна быть. Сначала плотоядный -
// сначала охотишься - чтобы было тяжелее убиваешь всасываешь»; 26.11 23:08: «Автоматически мне присвоили»; pravki_po_blokam.md Ж.3).
// Ступень 0 — растворяешь с рождения. «Плотоядный» не выпадает, пока нет ни одного оружия; с ним водоворот у рта всасывает точки убитого (rot.js),
// и они кормят в plotoyadnyy_k раз сильнее. «Глотать» не выпадает, пока не взят «Плотоядный» и ты короче glotat_ot_mkm мкм; сам не выдаётся никогда.
// Числа — kaplya.json «pitanie».
export const oruzhie = (w, B) => Object.keys(B.oruzhie).some(g => g !== '_' && w.genes[g]);
// Пока у «Плотоядного» нет части на теле и картинки (его нет в boj.novye_geny), «Глотать» ждёт вместо него первого оружия.
export function ne_dat(w, K, B, g, mkm) { if (g === 'plotoyadnyy') return !oruzhie(w, B); if (g === 'gulp') return !(B.novye_geny.includes('plotoyadnyy') ? w.genes.plotoyadnyy : oruzhie(w, B)) || mkm < K.glotat_ot_mkm; return false; }
