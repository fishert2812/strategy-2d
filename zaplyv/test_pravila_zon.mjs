// Тест таблицы «зона коснулась зоны» (pravila_zon.json, pravila_zon.js). Каждый случай — два существа записями и пара зон;
// исход решает таблица, а не код под пару. Самопроверка: нарочно сломанная таблица обязана дать красное.
import { Z, kasanie, ishod, oshibki, umeet } from './pravila_zon.js';
let bad = 0;
const check = (name, fn) => { try { const r = fn(); if (r) { bad++; console.log('  ПРОВАЛ', name + ':', r); } else console.log('  ок   ', name); } catch (e) { bad++; console.log('  ПРОВАЛ', name + ':', e.stack); } };
const kto = (o = {}) => ({ m: 1, mir: 'bakteriya', chasti: [], sposobnosti: {}, zony: { obolochka: { prochnost: 1 } }, ...o });
const ameba = kto({ m: 6, mir: 'prosteyshee', zony: { rot: { do: 0.5 }, obolochka: { prochnost: 2 } } });
const virus = kto({ m: 0.01, mir: 'virus', zony: { posadka: { vid: 'T4' } } });
const nikogda = () => 0.99, vsegda = () => 0;
const ish = (a, za, b, zb, ra = nikogda) => (kasanie(a, za, b, zb, ra) || {}).ishod;

check('таблица без ошибок: зоны, исходы, условия и способности из списков, у каждой пары есть исход по умолчанию', () => oshibki().join('; '));

check('рот × оболочка: амёба съедает мелкую клетку, крупную нет, клетку в капсуле упускает', () => {
  const r = [ish(ameba, 'rot', kto(), 'obolochka'), ish(ameba, 'rot', kto({ m: 4 }), 'obolochka'), ish(ameba, 'rot', kto({ chasti: ['kapsula'] }), 'obolochka')];
  return r.join() === 'syel,otskochil,vyskolznul' ? '' : 'исходы ' + r.join();
});

check('посадка вируса × оболочка: садится на палочку; сменённый замок и «Защита» отбивают; слизь вязнет; на амёбу не садится', () => {
  const r = [ish(virus, 'posadka', kto(), 'obolochka'), ish(virus, 'posadka', kto({ sposobnosti: { lock: 1 } }), 'obolochka'),
    ish(virus, 'posadka', kto({ sposobnosti: { shield: 1 } }), 'obolochka'), ish(virus, 'posadka', kto({ chasti: ['sliz'] }), 'obolochka', vsegda),
    ish(virus, 'posadka', kto({ chasti: ['sliz'] }), 'obolochka', nikogda), ish(virus, 'posadka', ameba, 'obolochka')];
  return r.join() === 'zarazil,otskochil,otskochil,zavyaz,zarazil,otskochil' ? '' : 'исходы ' + r.join();
});

check('заражение решают способности жертвы: лопнет, тихо, жилец, память, на третьем уровне память — еда, обманка', () => {
  const z = sp => kasanie(virus, 'posadka', kto({ sposobnosti: sp }), 'obolochka', nikogda)?.zarazhenie;
  const r = [z({}), z({ abort: 1 }), z({ tenant: 1 }), z({ memory: 1 }), z({ memory: 2 }), z({ memory: 3 })];
  const p = kasanie(virus, 'posadka', kto({ chasti: ['puzyrki_obolochki'] }), 'obolochka', vsegda)?.zarazhenie;
  return r.join() === 'lopnet,tiho,zhilec,pamyat,pamyat,pamyat_eda' && p === 'na_puzyrek' ? '' : 'исходы ' + r.join() + ' / обманка ' + p;
});

check('удар × оболочка: яд шарика травит, закрытая дверь и «Защита» 2-го уровня не пускают, 1-го пускает; сильный удар пробивает', () => {
  const shar = kto({ chasti: ['yad'], zony: { udar: { sila: 0.5 } } }), igla = kto({ zony: { udar: { sila: 3 } } });
  const r = [ish(shar, 'udar', kto(), 'obolochka'), ish(shar, 'udar', kto({ sposobnosti: { door: 1 } }), 'obolochka'), ish(shar, 'udar', kto({ sposobnosti: { shield: 2 } }), 'obolochka'),
    ish(shar, 'udar', kto({ sposobnosti: { shield: 1 } }), 'obolochka'), ish(igla, 'udar', kto(), 'obolochka'), ish(igla, 'udar', ameba, 'obolochka')];
  return r.join() === 'otravil,otskochil,otskochil,otravil,proboy,proboy' ? '' : 'исходы ' + r.join();
});

check('сцепка: сёстры одного рода прилипают, чужие отталкиваются; оболочки просто расталкиваются', () => {
  const sestra = kto({ zony: { scepka: { rod: 'nash' }, obolochka: { prochnost: 1 } } }), chuzhaya = kto({ zony: { scepka: { rod: 'seno' } } });
  const r = [ish(sestra, 'scepka', sestra, 'scepka'), ish(sestra, 'scepka', chuzhaya, 'scepka'), ish(kto(), 'obolochka', kto(), 'obolochka')];
  return r.join() === 'prilip,ottolknul,ottolknul' ? '' : 'исходы ' + r.join();
});

check('объединённый навык включает прежний по уровню: «Защита» 1 — замок, 2 — и дверь; «Память» включает CRISPR', () =>
  umeet({ sposobnosti: { shield: 1 } }, 'lock') && !umeet({ sposobnosti: { shield: 1 } }, 'door') && umeet({ sposobnosti: { shield: 2 } }, 'door') && umeet({ sposobnosti: { memory: 1 } }, 'crispr') ? '' : 'уровни не включают прежние');

check('новая пара зон — новая строка без кода: «рот × рот» даёт свой исход', () => {
  Z.stroki.push({ a: 'rot', b: 'rot', esli: {}, ishod: 'ottolknul' }); const r = ish(ameba, 'rot', ameba, 'rot'); Z.stroki.pop();
  return r === 'ottolknul' ? '' : 'новая строка не сработала: ' + r;
});

check('вход от движка: касание { a, b, x, y } из zony.js даёт исход в той же точке', () => {
  const r = ishod({ a: 'rot', b: 'obolochka', glubina: 1, x: 5, y: 7 }, ameba, kto(), nikogda);
  return r && r.ishod === 'syel' && r.x === 5 && r.y === 7 ? '' : 'получено ' + JSON.stringify(r);
});

// Самопроверка: каждая поломка таблицы обязана дать красное.
const kopiya = () => JSON.parse(JSON.stringify(Z));
const LOMKA = {
  'исход не из списка': T => { T.stroki[0].ishod = 'ischez'; },
  'зона не из списка': T => { T.stroki[0].a = 'hvost'; },
  'условие неизвестно': T => { T.stroki[1].esli = { cvet: 'zelyonyi' }; },
  'способности нет': T => { T.stroki[3].esli = { u_b_sposobnost: ['teleport'] }; },
  'у пары нет исхода по умолчанию': T => { T.stroki = T.stroki.filter(s => !(s.a === 'udar' && Object.keys(s.esli).length === 0)); },
  'shans больше 1': T => { T.stroki[4].esli.shans = 3; },
};
for (const [what, lom] of Object.entries(LOMKA)) { const T = kopiya(); lom(T); const n = oshibki(T).length; console.log((n ? '  ок   ' : '  ПРОВАЛ ') + 'самопроверка: «' + what + '» — таблица краснеет (' + n + ')'); if (!n) bad++; }
console.log(bad ? 'ЗОНЫ: провалов ' + bad : 'ЗОНЫ: все проверки прошли'); process.exit(bad ? 1 : 0);
