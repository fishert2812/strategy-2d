// Знак вируса по книге (П7): вирус сам без света, опасность видна водой. Числа — kaplya.json «virus_znak».
// Ближе, чем ты проплываешь за blizko_t секунд, вода вокруг зёрнышка мутнеет серым; облако (в круге oblako.r не меньше oblako.n свободных вирусов) — вода в нём серая и мутная.
// Возвращает, где мутить воду: [{ x, y, vid: 'blizko' | 'oblako' }]. Севший вирус и чужой (host не 'me') воду не мутят.
export function muti(phages, me, K, R, v) {
  const svob = phages.filter(g => !g.on && !g.gone && g.host === 'me'), out = [];
  for (const g of svob) {
    const n = svob.reduce((s, h) => s + (Math.hypot(h.x - g.x, h.y - g.y) < K.oblako.r ? 1 : 0), 0);
    if (n >= K.oblako.n) out.push({ x: g.x, y: g.y, vid: 'oblako' });
    else if (me && Math.hypot(g.x - me.x, g.y - me.y) - R < v * K.blizko_t) out.push({ x: g.x, y: g.y, vid: 'blizko' });
  }
  return out;
}
