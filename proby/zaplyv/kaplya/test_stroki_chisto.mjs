// Сторож «строки по-людски» «Капли» (урок L139): node proby/zaplyv/kaplya/test_stroki_chisto.mjs. Провал — код 1.
// ui.md п. 16–17: «Шарик ужалил: −здоровье» (код-подобное), «еда растит в полтора раза сильнее», «теперь ты / — самая крупная копия» (тире в начале строки),
// «имя убийцы с маленькой буквы («бодо»)», «Зелёная нить: Держись рядом:» (два двоеточия).
// ui.md п. 16: «„Род жив“ — серый баннер, как обычная подсказка» — плашка «Гибель…» заметная (класс vazhno).
// Должно: в строках kaplya.json нет минуса-формулы перед словом и «растит … сильнее»; say() ставит неразрывный пробел перед тире; имя убийцы не в нижнем регистре; после имени в подсказке встречи — тире.
// Самопроверка: прежние строки и прежний код сторож ловит.
import fs from 'fs';
const KAP = JSON.parse(fs.readFileSync(new URL('./kaplya.json', import.meta.url))), MAIN = fs.readFileSync(new URL('./main.js', import.meta.url), 'utf8');
let bad = 0; const check = (n, e) => { console.log((e ? '  ПРОВАЛ ' : '  ок ') + n + (e ? ': ' + e : '')); if (e) bad++; };
const stroki = o => typeof o === 'string' ? [o] : o && typeof o === 'object' ? Object.entries(o).filter(([k]) => !k.startsWith('_')).flatMap(([, v]) => stroki(v)) : [];
const sud = (S, M) => { const minus = S.find(t => /[−-][а-яё]/i.test(t) && /: [−-]/.test(t)), rastit = S.find(t => /растит .* сильнее/.test(t));
  return minus ? `минус-формула: «${minus}»` : rastit ? `«${rastit}»` : !M.includes("text.replace(/ — /g, '\\u00a0— ')") ? 'плашка не ставит неразрывный пробел перед тире' : /imyaKto\(who\)\.toLowerCase\(\)\); if \(window\.kaplyaStaryeSlovaAmeby/.test(M) ? 'имя убийцы в «Род жив» с маленькой буквы' : !/' — ' \+ zn\[0\]\.toLowerCase\(\)/.test(M) ? 'подсказка встречи «Имя: Делай: …» с двумя двоеточиями' : !M.includes("classList.toggle('vazhno', !window.kaplyaStaryeStroki && /^Гибель:/.test(text))") ? '«Род жив» обычной серой плашкой' : ''; };
check('test_L139 test_stroki_chisto: строки без формул, тире не в начале строки, имя с большой буквы', sud(stroki(KAP), MAIN));
const STAR = [...stroki(KAP), 'Шарик ужалил: −здоровье. Отплыви', 'Окно света: тут дымка кислорода, еда растит в полтора раза сильнее'];
check('test_stroki_chisto_samoproverka: прежние строки сторож ловит', sud(STAR, MAIN) && sud(stroki(KAP), MAIN.replace("text.replace(/ — /g, '\\u00a0— ')", 'text')) ? '' : 'не заметил');
process.exit(bad ? 1 : 0);
