// «Вдох» по книге (П13): каждый проглоченный кусок — клетка на t секунд раздувается на долю r радиуса и садится на новый размер. Числа — kaplya.json «vdoh».
export const nachat = K => K.t; // съела кусок: вдох начинается заново
export const shag = (ost, dt) => Math.max(0, ost - dt);
export const sila = (ost, K) => ost > 0 ? 1 + K.r * Math.sin(Math.PI * (1 - ost / K.t)) : 1; // во сколько раз клетка сейчас шире: плавно вверх и обратно
