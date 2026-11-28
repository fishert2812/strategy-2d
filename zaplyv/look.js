// Как мутации видны на теле (по таблице биолога, design/zaplyv_povadki.md, раздел 4). Без DOM — проверяется тестом.
// Возвращает, что рисовать: сколько жгутиков и как быстро бьют, ореол капсулы, полоски CRISPR,
// сколько рибосом, тёмные точки токсина у края, мерцающие рецепторы на переднем конце.
import { mutLook } from './mutacii.js';

export function look(genes, L, spacers = 0) {
  return {
    flagella: genes.flagellum ? L.flagella[1] : L.flagella[0],
    beat: genes.flagellum ? L.beat[1] : L.beat[0],
    halo: !!genes.capsule,
    stripes: genes.crispr ? L.stripes[0] + L.stripes[1] * spacers : 0, // штрихкод: повторы есть сразу, каждый пережитый фаг — ещё полоски
    ribosomes: genes.fast ? L.ribosomes[1] : L.ribosomes[0],
    toxin: genes.toxin ? L.toxin : 0,
    receptors: genes.sense ? L.receptors : 0,
    studs: genes.lock ? L.studs : 0, // сменил замок: другие белки-поры на оболочке — синие бугорки по краю
    pili: genes.fim ? L.pili : 0, // фимбрии: короткие волоски по всему телу
    dormant: !!genes.spore, // сон-персистер (hipA): у кормы тусклое голубое пятно медленно дышит
    ...mutLook(genes), // новые мутации (mutacii.js)
  };
}
