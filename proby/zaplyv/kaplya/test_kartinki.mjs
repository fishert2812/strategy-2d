// Сторож картинок карточек (Роман 26.11 21:43: «в карточки… из конструктора конкретную картинку из игры»): node proby/zaplyv/kaplya/test_kartinki.mjs.
// Судья: у каждого гена из kaplya.json karta.kartinki лежит снимок из движка kaplya/karty/<ключ>.png, ключ есть в navyki.spisok движка; оружие «Капли» с видом на теле тоже с картинкой.
// Самопроверка: ген со снимком, которого нет, судья ловит.
import fs from 'fs'; import { VC } from '../vid_chasti.js';
const KAP = JSON.parse(fs.readFileSync(new URL('./kaplya.json', import.meta.url)));
let bad = 0; const check = (n, e) => { console.log((e ? '  ПРОВАЛ ' : '  ок ') + n + (e ? ': ' + e : '')); if (e) bad++; };
const sud = K => { for (const [g, k] of Object.entries(K)) { if (g === '_') continue; if (!VC.navyki.spisok[k]) return `«${g}» → «${k}»: такого умения нет в движке`;
    if (!fs.existsSync(new URL(`./karty/${k}.png`, import.meta.url))) return `«${g}»: нет снимка karty/${k}.png`; }
  for (const g of KAP.boj.novye_geny || []) if (!K[g]) return `новое оружие «${g}» без картинки`; return ''; };
check('test_kartinki: у карточек умений снимки клетки из движка', sud(KAP.karta.kartinki));
check('test_kartinki_samoproverka: снимка нет — судья ловит', sud({ ...KAP.karta.kartinki, toxin: 'net_takogo' }) ? '' : 'судья не заметил');
process.exit(bad ? 1 : 0);
