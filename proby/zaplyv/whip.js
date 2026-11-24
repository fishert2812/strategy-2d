// Жгутики кишечной палочки между кадрами (Berg, «E. coli in Motion»; Turner, Ryu, Berg 2000). Без DOM — проверяется тестом.
// F.b — насколько нити собраны в пучок за кормой (0 — врозь, 1 — пучок), F.fan — насколько пучок разлетелся веером в кувырке,
// F.om — скорость вращения моторов, F.ph — накопленный угол (поэтому смена скорости не даёт скачка волны).
// На ходу пучок собирается за ~полсекунды; в кувырке моторы переключаются и он за доли секунды расходится веером;
// в покое нити расходятся от боков и вяло колышутся. Всё тянется к цели плавно, без щелчков.
export function whip(F, mode, dt, beat, S) {
  const tb = mode === 'tumble' ? S.tumble_b : mode === 'run' ? 1 : 0, tf = mode === 'tumble' ? 1 : 0;
  const to = mode === 'tumble' ? beat * 0.8 : mode === 'run' ? beat : S.rest_spin;
  F.b += (tb - F.b) * Math.min(1, dt * (tb > F.b ? S.bundle : S.unbundle));
  F.fan += (tf - F.fan) * Math.min(1, dt * (tf > F.fan ? S.fan_out : S.fan_in));
  F.om += (to - F.om) * Math.min(1, dt * S.spin); F.ph += F.om * dt; F.t += dt;
  return F;
}
