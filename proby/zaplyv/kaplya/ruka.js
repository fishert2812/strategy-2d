// Рука (книга П4): по первым kasaniy касаниям игры решаем, какой рукой ведут. Больше dolya касаний в правой половине — правая, линейка слева внизу;
// в левой — левая, линейка справа внизу. Решение хранится на телефоне. Числа — kaplya.json «ruka».
const KR = 'zaplyv.kaplya.ruka';
export function sozdat() { let r = ''; try { r = localStorage.getItem(KR) || ''; } catch (_) {} return { pravo: 0, levo: 0, ruka: r }; }
// Касание в точке x при ширине экрана Wpx. Возвращает 'prava' / 'leva', когда решение только что принято, иначе ''.
export function kasanie(S, x, Wpx, K) { if (S.ruka) return ''; if (x > Wpx / 2) S.pravo++; else S.levo++; const n = S.pravo + S.levo; if (n < K.kasaniy) return '';
  S.ruka = S.levo > n * K.dolya ? 'leva' : 'prava'; try { localStorage.setItem(KR, S.ruka); } catch (_) {} return S.ruka; }
