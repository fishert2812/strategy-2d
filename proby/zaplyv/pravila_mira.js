// Правила взаимодействия «Заплыва» (Роман 25.11: «как кушает — откуда! Принцип то везде одинаковый!»; договор движка, раздел 3).
// Каждое взаимодействие — запись в pravila_mira.json: кто, с кем, когда касается, каким способом, что получают оба.
// Здесь один цикл на все записи и закрытый список способов и множителей: формула каждого живёт в коде один раз.
// Новое взаимодействие известным способом — новая запись, кода не требует (test_pravila_bez_koda).
// sim.js зовёт shag(world, dt, radius) в eat(); числа — в записях и data.json.
import * as rost from './rost.js';
const url = new URL('./pravila_mira.json', import.meta.url);
export const P = url.protocol === 'file:' ? JSON.parse((await import('node:fs')).readFileSync(url, 'utf8')) : await (await fetch(url)).json();

const dostup = (pr, q) => { const d = pr.kogo.dostup; return d == null ? null : typeof d === 'string' ? d : q[d.pole] || d.po_umolch; };
export const MNOZH = { // на что умножается то, что даёт кусок
  razmer: (w, a, q) => q.s || 1,
  cennost: (w, a, q, pr) => w.cfg.food_kinds[dostup(pr, q)].gain,
  kusok: (w, a) => rost.kusok(w, a),
};
export const SPOSOB = {
  kasanie(w, a, q, pr) { // съел целиком в миг касания
    const M = pr.itog.ohotnik.massa; q.gone = true;
    w.grow(a, M.na.reduce((v, k) => v * MNOZH[k](w, a, q, pr), w.cfg[M.osnova]));
    if (pr.itog.ohotnik.sobytie === 'eat') w.fed(q.x, q.y, q.s || 1);
  },
  gryzt(w, a, q, pr, dt) { // откусывает, пока касается; в «Росте» крупная клетка грызёт быстрее (rost.gryzt)
    const bite = Math.min(q.m, rost.gryzt(w, a, pr.hod.skorost, dt)); q.m -= bite; w.grow(a, bite);
  },
};

// Чего в записи не хватает — словами (тест и самопроверка).
export function oshibki(w) {
  const bad = [];
  for (const [k, pr] of Object.entries(P.pravila)) {
    const s = pr.kto?.spisok, t = pr.kogo?.spisok, u = pr.uslovie || {};
    if (!Array.isArray(w[s])) bad.push(k + ': kto.spisok «' + s + '» — нет такого списка в мире');
    if (!Array.isArray(w[t])) bad.push(k + ': kogo.spisok «' + t + '» — нет такого списка в мире');
    if (!SPOSOB[pr.sposob] || !P.sposoby.includes(pr.sposob)) bad.push(k + ': sposob «' + pr.sposob + '» — нет такого способа');
    if (u.rasstoyanie !== 'kasanie') bad.push(k + ': uslovie.rasstoyanie — пока только kasanie');
    for (const f of ['zazor', 'k_r']) if (!(typeof u[f] === 'number' && u[f] >= 0)) bad.push(k + ': uslovie.' + f + ' не число');
    if (!pr.zakon) bad.push(k + ': нет zakon (номер закона книги)');
    const M = pr.itog?.ohotnik?.massa;
    if (pr.sposob === 'kasanie') {
      if (!(typeof w.cfg[M?.osnova] === 'number')) bad.push(k + ': itog.ohotnik.massa.osnova — нет числа в data.json');
      for (const m of M?.na || []) if (!MNOZH[m] || !P.mnozhiteli.includes(m)) bad.push(k + ': множитель «' + m + '» неизвестен');
    }
    if (pr.sposob === 'gryzt') {
      if (!(pr.hod?.skorost > 0)) bad.push(k + ': hod.skorost не число');
      if (!(pr.itog?.ostatok >= 0)) bad.push(k + ': itog.ostatok не число');
    }
  }
  return bad;
}

// Шаг: каждая запись по очереди, каждый охотник с каждой жертвой в касании. Съеденное и догрызенное уходит из мира.
export function shag(w, dt, radius) {
  for (const pr of Object.values(P.pravila)) {
    const kto = w[pr.kto.spisok], kogo = w[pr.kogo.spisok], u = pr.uslovie, sp = SPOSOB[pr.sposob];
    if (!kto || !kogo || !sp) continue;
    for (const a of kto) {
      const r = radius(a.m) + u.zazor;
      for (const q of kogo) {
        if (q.gone || !(Math.hypot(a.x - q.x, a.y - q.y) < r + (u.k_r ? radius(q.m) * u.k_r : 0))) continue; // сначала касание: rost.can дорогой (ищет крупнейшую клетку)
        if (pr.kogo.dostup == null || rost.can(w, dostup(pr, q))) sp(w, a, q, pr, dt);
      }
    }
    const ost = pr.itog.ostatok;
    if (ost != null) w[pr.kogo.spisok] = kogo.filter(q => !q.gone && q.m > ost);
  }
}
