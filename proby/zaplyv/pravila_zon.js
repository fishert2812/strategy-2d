// «Зона коснулась зоны» (Роман 25.11 22:32: «Зону рта!… оболочка зона!»; карта движка, кусок 4). Таблица — pravila_zon.json:
// пара зон, условие, исход. Здесь один разбор на все строки и закрытый список условий: каждое живёт в коде один раз.
// Чистая математика без рисования и без мира: вход — два существа и их зоны, выход — что случилось. В игру подключает
// хозяин движка, когда зоны встанут на тело (поиск касания — его).
const zagr = async name => { const url = new URL(name, import.meta.url);
  return url.protocol === 'file:' ? JSON.parse((await import('node:fs')).readFileSync(url, 'utf8')) : await (await fetch(url)).json(); };
export const Z = await zagr('./pravila_zon.json');
export const S = (await zagr('./sposobnosti.json')).sposobnosti;

// Способность «ключ» или «ключ:N» — есть, и уровень не ниже N. Объединённые навыки включают прежние по уровням (urovni[].vklyuchaet).
export function umeet(sush, k) {
  const [key, n = 1] = k.split(':'), sp = sush.sposobnosti || {};
  if ((sp[key] || 0) >= +n) return true;
  return +n === 1 && Object.entries(sp).some(([g, lv]) => (S[g]?.urovni || []).slice(0, lv).some(u => (u.vklyuchaet || []).includes(key)));
}
const est = (sush, chasti) => chasti.some(c => (sush.chasti || []).includes(c));
const svoystvo = (sush, put) => { const [zona, pole] = put.split('.'); return sush.zony?.[zona]?.[pole]; };

// Закрытый список условий строки: имя → проверка (a, b — существа, ra — случай 0…1).
export const USLOVIE = {
  u_a_est: (v, a) => est(a, v),
  u_b_est: (v, a, b) => est(b, v),
  u_b_sposobnost: (v, a, b) => v.some(k => umeet(b, k)),
  net_u_b_sposobnosti: (v, a, b) => !v.some(k => umeet(b, k)),
  mir_b: (v, a, b) => v.includes(b.mir),
  razmer_do: (v, a, b) => b.m <= a.m * svoystvo(a, v),                // рот берёт тех, кто не больше своей доли от охотника
  sila_bolshe: (v, a, b) => (a.zony?.udar?.sila || 0) > svoystvo(b, v), // удар пробивает, если сильнее прочности оболочки
  rod_odin: (v, a, b) => (a.zony?.scepka?.rod ?? a.mir) === (b.zony?.scepka?.rod ?? b.mir) === v,
  shans: (v, a, b, ra) => ra() < v,
};

// Исход заражения по способностям жертвы: последняя по уровню запись с ishod.pravilo = zarazhenie (договор, раздел 4).
export function zarazhenie(b) {
  let na = null;
  for (const [g, lv] of Object.entries(b.sposobnosti || {})) {
    const z = S[g]; if (!z) continue;
    for (const u of [z, ...(z.urovni || []).slice(0, lv)]) if (u.ishod?.pravilo === 'zarazhenie') na = u.ishod.na;
  }
  return na || Z.zarazhenie.po_umolch;
}

// Касание: зона za существа a коснулась зоны zb существа b. Возвращает { ishod, stroka, zarazhenie? } или null — пара не в таблице.
export function kasanie(a, za, b, zb, ra = Math.random) {
  for (let i = 0; i < Z.stroki.length; i++) {
    const s = Z.stroki[i]; if (s.a !== za || s.b !== zb) continue;
    if (!Object.entries(s.esli).every(([k, v]) => USLOVIE[k](v, a, b, ra))) continue;
    const out = { ishod: s.ishod, stroka: i };
    if (s.ishod === 'zarazil') out.zarazhenie = s.zarazhenie || zarazhenie(b);
    return out;
  }
  return null;
}

// Чего в таблице не хватает — словами (тест и самопроверка).
export function oshibki(T = Z) {
  const bad = [], zony = new Set(T.zony), ish = new Set(T.ishody), zar = new Set(T.zarazhenie.na);
  T.stroki.forEach((s, i) => {
    const n = 'строка ' + i + ' (' + s.a + ' × ' + s.b + ')';
    if (!zony.has(s.a) || !zony.has(s.b)) bad.push(n + ': зоны нет в списке');
    if (!ish.has(s.ishod)) bad.push(n + ': исход «' + s.ishod + '» не из списка');
    if (s.zarazhenie && !zar.has(s.zarazhenie)) bad.push(n + ': заражение «' + s.zarazhenie + '» не из списка');
    for (const [k, v] of Object.entries(s.esli || {})) {
      if (!USLOVIE[k]) bad.push(n + ': условия «' + k + '» нет');
      if (/sposobnost/.test(k)) for (const g of v) if (!S[g.split(':')[0]]) bad.push(n + ': способности «' + g + '» нет в sposobnosti.json');
      if (k === 'shans' && !(v > 0 && v < 1)) bad.push(n + ': shans — доля от 0 до 1');
    }
  });
  for (const [g, z] of Object.entries(S)) for (const u of [z, ...(z.urovni || [])])
    if (u.ishod?.pravilo === 'zarazhenie' && !zar.has(u.ishod.na)) bad.push('способность ' + g + ': исход заражения «' + u.ishod.na + '» не из списка таблицы');
  // У каждой пары, что есть в таблице, последняя строка — без условий: исход есть всегда, касание не «теряется».
  const pary = new Map(); T.stroki.forEach(s => pary.set(s.a + '×' + s.b, s));
  for (const [p, s] of pary) if (Object.keys(s.esli || {}).length) bad.push('пара ' + p + ': последняя строка с условием — нужен исход по умолчанию');
  return bad;
}

// Вход от движка (zony.js kasanie(A, B, zazor) даёт { a, b, glubina, x, y }): исход касания двух записей по таблице.
export const ishod = (k, A, B, ra = Math.random) => { const r = kasanie(A, k.a, B, k.b, ra); return r && { ...r, x: k.x, y: k.y }; };
