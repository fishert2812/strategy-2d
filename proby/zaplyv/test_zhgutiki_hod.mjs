// Жгутики движка ведут себя, как в ручной игре (hod.js shag_zhgutikov + vid_chasti.js zhgutiki): node test_zhgutiki_hod.mjs.
// Самопроверки в tools/checks/73_zhgutiki.sh: веер не раскрывается (veer 0) — краснеет test_zhgutiki_veer; угол волны из часов × скорость
// (ph = om · t, ошибка, которой ручная игра избежала накопленным углом) — краснеет test_zhgutiki_faza.
import { plyt, shag_zhgutikov, pasport_hoda } from './hod.js';
import { sobrat, VC } from './vid_chasti.js';
import { MR } from './mir_zhizn.js';
let bad = 0; const check = (n, f) => { let e; try { e = f(); } catch (x) { e = 'ошибка скрипта: ' + x.message; } console.log((e ? '  ПРОВАЛ ' : '  ок    ') + n + (e ? ': ' + e : '')); if (e) bad++; };
const K = MR.hod, S = K.zhgutiki.storozh, Z = MR.zhizn, dt = 1 / 30, w = 26, f2 = x => x.toFixed(2);
// одна клетка плывёт минуту; каждый кадр собираем только жгутики и меряем, как разбросаны концы нитей (в долях длины нити)
function proplyt(vid, sek = 60) { let s = 11; const rnd = () => (s = s * 16807 % 2147483647) / 2147483647, z0 = VC.vidy[vid], zapis = { forma: z0.forma, chasti: { zhgutiki: z0.chasti.zhgutiki } }, q = { id: 3, x: 0, y: 0, a: 0, m: 1 }, kadry = [];
  for (let i = 0; i < sek * 30; i++) { const ph0 = q.zh?.ph ?? 0, r = plyt(q, z0, K, Z, dt, rnd, 0, w); const niti = [];
    sobrat(zapis, { x: q.x, y: q.y, a: q.a, tolshchina: w, z: 1, time: i * dt, id: 3, zh: q.zh, gnut: q.gnut_vid }, { sphere() {}, niti(p) { niti.push(p); } });
    const ko = niti.map(p => [p[p.length - 2], p[p.length - 1]]), L = Math.max(...niti.map(p => { let l = 0; for (let k = 2; k < p.length; k += 2) l += Math.hypot(p[k] - p[k - 2], p[k + 1] - p[k - 1]); return l; }));
    const cx = ko.reduce((a, k) => a + k[0], 0) / ko.length, cy = ko.reduce((a, k) => a + k[1], 0) / ko.length, sa = Math.sin(q.a), ca = Math.cos(q.a), razb = Math.sqrt(ko.reduce((a, k) => a + (-(k[0] - cx) * sa + (k[1] - cy) * ca) ** 2, 0) / ko.length) / L; /* поперёк оси тела: пучок узкий, веер широкий (вдоль оси концы и в пучке лежат вразбег) */
    kadry.push({ ...q.zh, faza: q.h?.faza, razb, dph: q.zh.ph - ph0, n: niti.length }); }
  return { kadry, P: pasport_hoda(z0, K) }; }
const med = a => { const b = [...a].sort((x, y) => x - y); return b.length ? b[b.length >> 1] : NaN; };
const R = proplyt('nasha');
check(`test_zhgutiki_puchok: на бегу нити собраны за кормой — концы поперёк оси разбросаны не больше ${S.beg_max} длины нити`, () => { const b = R.kadry.filter(k => k.b > 0.9 && k.fan < 0.05);
  if (b.length < 200) return 'бега почти нет: ' + b.length + ' кадров'; const m = med(b.map(k => k.razb)); console.log('    паспорт: бег', b.length, 'кадров, разброс', f2(m), '· нитей', R.kadry[0].n); if (m > S.beg_max) return 'разброс ' + f2(m); });
check(`test_zhgutiki_veer: в кувырке пучок разлетается веером — концы поперёк оси разбросаны не меньше ${S.kuvyrok_min} длины нити`, () => { const v = R.kadry.filter(k => k.fan > 0.8);
  if (v.length < 20) return 'веера почти нет: ' + v.length + ' кадров (кувырков ' + R.kadry.filter((k, i) => i && k.faza === 'kuvyrok' && R.kadry[i - 1].faza !== 'kuvyrok').length + ')'; const m = med(v.map(k => k.razb)); console.log('    паспорт: веер', v.length, 'кадров, разброс', f2(m)); if (m < S.kuvyrok_min) return 'разброс ' + f2(m); });
check(`test_zhgutiki_faza: смена бега, кувырка и покоя без скачка волны — за кадр угол меняется не больше чем на ${S.skachok} скорости моторов`, () => { let hud = 0;
  for (let i = 1; i < R.kadry.length; i++) { const k = R.kadry[i], om = Math.max(Math.abs(k.om), Math.abs(R.kadry[i - 1].om)), r = Math.abs(k.dph) / (om * dt || 1e-9); hud = Math.max(hud, r); if (r > S.skachok) return `кадр ${i}: угол прыгнул на ${f2(k.dph)} рад при ${f2(om * dt)}`; }
  console.log('    паспорт: худший кадр', f2(hud), 'от скорости моторов'); });
check('test_zhgutiki_motor: частота моторов из тяги zakony.js — у вибриона (мощность 3) втрое быстрее эталона, у кокков моторов нет', () => {
  const e = pasport_hoda(VC.vidy.nasha, K).om, v = pasport_hoda(VC.vidy.zapyataya, K).om, k = pasport_hoda(VC.vidy.kokki, K).om;
  if (Math.abs(e - 6.283 * K.zhgutiki.oboroty) > 1e-6) return 'эталон ' + f2(e); if (Math.abs(v / e - (VC.vidy.zapyataya.chasti.zhgutiki.moshch ?? 1)) > 0.01) return 'вибрион ' + f2(v / e); if (k) return 'у кокков ' + f2(k); });
check('test_zhgutiki_polus: полюсный жгутик (синегнойка) тоже собирается за кормой на бегу и даёт веер в щелчке', () => { const r = proplyt('sinegnoyka', 40), b = r.kadry.filter(k => k.b > 0.9 && k.fan < 0.05);
  if (!b.length) return 'бега нет'; const m = med(b.map(k => k.razb)); if (m > S.beg_max) return 'на бегу разброс ' + f2(m); });
console.log(bad ? 'ЖГУТИКИ: провалов ' + bad : 'ЖГУТИКИ: все проверки прошли'); process.exit(bad ? 1 : 0);
