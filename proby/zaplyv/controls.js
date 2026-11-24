// Джойстик под большой палец, без DOM — чтобы его можно было проверить тестом.
// Коснулся где угодно — там кольцо; сдвиг от центра — куда и как быстро плыть; ушёл дальше края — кольцо тянется за пальцем.
// Короткое касание без сдвига — «делиться», но не если палец только что отпустил и перехватил на ходу.
export class Stick {
  constructor(full = 56) { this.full = full; this.down = null; this.finger = null; this.lastUp = -1e9; this.drag = false; }
  start(x, y, t) { this.down = { x, y, t }; this.finger = { x, y }; this.drag = false; }
  move(x, y) {
    if (!this.down) return;
    this.finger = { x, y };
    const dx = x - this.down.x, dy = y - this.down.y, l = Math.hypot(dx, dy);
    if (l > this.full) { this.down.x = x - dx / l * this.full; this.down.y = y - dy / l * this.full; }
    if (l > 20) this.drag = true;
  }
  // true — это было касание «делиться»
  end(t) {
    if (!this.down) return false;
    const tap = !this.drag && t - this.down.t < 250 && this.down.t - this.lastUp > 350;
    this.down = this.finger = null; this.lastUp = t;
    return tap;
  }
  // {dx, dy, p}: направление и сила 0..1 — мягкий старт, полный ход на трёх четвертях кольца
  value() {
    if (!this.down) return null;
    const dx = this.finger.x - this.down.x, dy = this.finger.y - this.down.y, l = Math.hypot(dx, dy);
    if (l <= 4) return null;
    const q = Math.min(1, (l - 4) / (this.full * 0.75));
    return { dx: dx / l, dy: dy / l, p: q * (2 - q) };
  }
}
