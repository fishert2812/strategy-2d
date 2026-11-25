// Поведение существ без игрока (карта движка, кусок 5). Чистая математика, без рисования и без мира:
// на входе — кто я, что я чую вокруг и моё состояние; на выходе — куда и как быстро хочу плыть и чем занят.
// Одни правила на всех, разница только в числах анкеты (povedenie.json: obshchee + отличия вида).
//
//   hochet(ya, vokrug, A, sost, rnd) → { ux, uy, skorost, zanyatie }
//   ya     — { x, y, m, a, vid }                a — нынешний курс (радианы), vid — ключ анкеты
//   vokrug — [{ x, y, m, tip, vid? }]           tip: 'eda' | 'zhivoe'; живое своего вида — родня
//   A      — анкета: anketa(vid)               числа поведения
//   sost   — { sytost 0–1, ustalost 0–1, pole? { gx, gy } }   pole — куда растёт то, что вид любит (свет, кислород, сахар)
//   rnd    — число 0–1 (случай для брожения; движок даёт своё, тест — своё)
//
// Как решает (каждое желание — вектор, сила падает с расстоянием как (1 − d/chuet)²):
//   страх — от каждого, кто тяжелее в strah раз; если сила страха больше panika — только бежит;
//   охота — к ближайшему живому легче в dobycha раз, если hishchnik и не сыт;
//   еда   — к ближайшей еде, если не сыт;
//   родня — к своим, но не ближе blizko_rodnya;
//   поле  — по уклону поля;
//   сыт или устал, а страха нет — отдыхает; ничего нет — бродит, понемногу меняя курс.
const url = new URL('./povedenie.json', import.meta.url);
export const P = url.protocol === 'file:' ? JSON.parse((await import('node:fs')).readFileSync(url, 'utf8')) : await (await fetch(url)).json();

const slit = (a, b) => { const o = { ...a }; for (const [k, v] of Object.entries(b || {})) o[k] = v && typeof v === 'object' && !Array.isArray(v) ? slit(a[k] || {}, v) : v; return o; };
// Анкета вида: общие числа, поверх — отличия вида. Неизвестный вид живёт по общим.
export const anketa = vid => slit(P.obshchee, P.vidy[vid]);

const sila = (d, R) => d >= R ? 0 : (1 - d / R) ** 2;

export function hochet(ya, vokrug, A, sost = {}, rnd = 0.5) {
  const syt = (sost.sytost ?? 0) >= A.syt, ustal = (sost.ustalost ?? 0) >= A.ustal, V = A.vesa;
  let sx = 0, sy = 0, strah = 0, cel = null, cd = Infinity, eda = null, ed = Infinity, rx = 0, ry = 0, rn = 0;
  for (const o of vokrug) {
    const dx = o.x - ya.x, dy = o.y - ya.y, d = Math.hypot(dx, dy) || 1e-6;
    if (d > A.chuet) continue;
    if (o.tip === 'eda') { if (d < ed) { ed = d; eda = { dx, dy, d }; } continue; }
    if (o.vid && o.vid === ya.vid) { if (d > A.blizko_rodnya) { rx += dx / d; ry += dy / d; rn++; } continue; }
    if (o.m >= ya.m * A.strah) { const s = sila(d, A.chuet); sx -= dx / d * s; sy -= dy / d * s; strah += s; continue; }
    if (A.hishchnik && o.m * A.dobycha <= ya.m && d < cd) { cd = d; cel = { dx, dy, d }; }
  }
  const vyhod = (x, y, zanyatie) => { const l = Math.hypot(x, y); return l < 1e-9 ? { ux: 0, uy: 0, skorost: 0, zanyatie: 'otdyh' } : { ux: x / l, uy: y / l, skorost: A.skorost[zanyatie] ?? 0, zanyatie }; };
  if (strah > A.panika) return vyhod(sx, sy, 'bezhit'); // паника: ни еда, ни добыча не отвлекают
  let x = sx * V.strah, y = sy * V.strah, zanyatie = null;
  if (!syt && !ustal && cel) { x += cel.dx / cel.d * V.ohota; y += cel.dy / cel.d * V.ohota; zanyatie = 'gonitsya'; }
  else if (!syt && !ustal && eda) { x += eda.dx / eda.d * V.eda; y += eda.dy / eda.d * V.eda; zanyatie = 'est'; }
  if (rn) { x += rx / rn * V.rodnya; y += ry / rn * V.rodnya; zanyatie ??= 'k_rodne'; }
  if (sost.pole) { x += sost.pole.gx * V.pole; y += sost.pole.gy * V.pole; }
  if (zanyatie) return vyhod(x, y, zanyatie);
  if (syt || ustal) return { ux: 0, uy: 0, skorost: A.skorost.otdyh, zanyatie: 'otdyh' };
  const a = (ya.a || 0) + (rnd - 0.5) * 2 * A.ryskanie; // бродит: курс плавно гуляет
  return vyhod(Math.cos(a) + x, Math.sin(a) + y, 'brodit');
}

// Проверка анкеты: все числа на месте и в разумных пределах. Пустой список — анкета годна.
export function oshibki(A, vid = '?') {
  const out = [], num = (v, k, lo = 0, hi = Infinity) => { if (typeof v !== 'number' || !(v >= lo && v <= hi)) out.push(`${vid}.${k} = ${v}`); };
  num(A.chuet, 'chuet'); num(A.strah, 'strah', 1); num(A.dobycha, 'dobycha', 0.5); num(A.syt, 'syt', 0, 1); num(A.ustal, 'ustal', 0, 1);
  num(A.panika, 'panika'); num(A.ryskanie, 'ryskanie', 0, Math.PI); num(A.blizko_rodnya, 'blizko_rodnya');
  if (typeof A.hishchnik !== 'boolean') out.push(`${vid}.hishchnik не да/нет`);
  for (const k of ['eda', 'strah', 'ohota', 'rodnya', 'pole']) num(A.vesa?.[k], 'vesa.' + k);
  for (const k of ['bezhit', 'gonitsya', 'est', 'k_rodne', 'brodit', 'otdyh']) num(A.skorost?.[k], 'skorost.' + k, 0, 1);
  return out;
}
