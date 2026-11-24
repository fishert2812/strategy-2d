extends RefCounted
## «Ручьи» без экрана. Колонии растут сами. От своей колонии тянешь ручей к другой — по нему течёт
## поток клеток, каждая уносит 1 из колонии; чем толще колония, тем гуще поток. Клетка, дошедшая
## до чужой колонии, отнимает 1, до своей — добавляет 1; чужая колония на нуле становится твоей.
## Встречные клетки двух сторон гибнут обе. Враг играет теми же ручьями.

signal event(kind: String, pos: Vector2, side: int)
const ME := 0
const FOE := 1
const NONE := 2
var cfg: Dictionary
var rng := RandomNumberGenerator.new()
var colonies: Array = []  # {pos, mass, side, path: PackedVector2Array, to: int, emit}
var cells: Array = []  # {d, path, to, side, id}
var time := 0.0
var bots := {FOE: {}}  # сторона -> характер; в тестах можно добавить и ME
var _ids := 0


func _init(c: Dictionary, seed: int, size: Vector2, top: float) -> void:
	cfg = c
	rng.seed = seed
	var mid := Vector2(size.x / 2, (size.y + top) / 2)
	var me := Vector2(rng.randf_range(180, size.x - 180), size.y - 170)
	_colony(me, cfg.start, ME)
	_colony(mid * 2 - me, cfg.start, FOE)
	# Ничьи — зеркально через середину: поле каждый раз другое, но честное.
	var tries := 0
	while colonies.size() < 2 + cfg.neutrals and tries < 500:
		tries += 1
		var p := Vector2(rng.randf_range(80, size.x - 80), rng.randf_range(mid.y + 40, size.y - 90))
		if colonies.any(func(c): return c.pos.distance_to(p) < cfg.gap or c.pos.distance_to(mid * 2 - p) < cfg.gap):
			continue
		var m := float(rng.randi_range(cfg.neutral_min, cfg.neutral_max))
		_colony(p, m, NONE)
		_colony(mid * 2 - p, m, NONE)
	for side in bots:
		bots[side] = new_bot()


func _colony(p: Vector2, m: float, side: int) -> void:
	colonies.append({pos = p, mass = m, side = side, path = PackedVector2Array(), to = -1, emit = 0.0})


## Характер бота на партию: как часто думает, с какой силы шлёт, любит ничьих или драку.
func new_bot() -> Dictionary:
	return {wait = 0.0, think = rng.randf_range(1.6, 3.4), min = rng.randf_range(14, 26),
		greed = rng.randf_range(0.0, 2.0), anger = rng.randf_range(0.0, 2.0), bend = rng.randf_range(0, 90)}


func radius(m: float) -> float:
	return cfg.r0 + sqrt(maxf(m, 0.0)) * cfg.rk


## Колония под точкой (в пределах радиуса и запаса пальца), иначе -1.
func at(p: Vector2, extra := 40.0) -> int:
	var best := -1
	var bd := INF
	for i in colonies.size():
		var d: float = colonies[i].pos.distance_to(p)
		if d < radius(colonies[i].mass) + extra and d < bd:
			best = i
			bd = d
	return best


## Ручей от колонии from по точкам пальца к колонии to. Путь выравнивается шагом cfg.step.
func set_stream(from: int, to: int, pts: PackedVector2Array) -> void:
	var c: Dictionary = colonies[from]
	if to < 0 or to == from:
		c.path = PackedVector2Array()
		c.to = -1
		return
	var raw := PackedVector2Array([c.pos])
	for p in pts:
		if p.distance_to(raw[-1]) > 6:
			raw.append(p)
	raw.append(colonies[to].pos)
	c.path = resample(raw, cfg.step)
	c.to = to


static func resample(raw: PackedVector2Array, step: float) -> PackedVector2Array:
	var total := 0.0
	for i in raw.size() - 1:
		total += raw[i].distance_to(raw[i + 1])
	var n := maxi(1, ceili(total / step))
	var out := PackedVector2Array([raw[0]])
	var k := 0
	var left := 0.0  # пройдено внутри отрезка k
	for j in range(1, n + 1):
		var need := total / n
		while k < raw.size() - 1:
			var seg := raw[k].distance_to(raw[k + 1])
			if seg - left >= need:
				left += need
				break
			need -= seg - left
			left = 0.0
			k += 1
		out.append(raw[-1] if k >= raw.size() - 1 else raw[k].lerp(raw[k + 1], left / maxf(raw[k].distance_to(raw[k + 1]), 0.001)))
	return out


static func along(path: PackedVector2Array, d: float, step: float) -> Vector2:
	var f := d / step
	var i := clampi(int(f), 0, path.size() - 2)
	return path[i].lerp(path[i + 1], clampf(f - i, 0.0, 1.0))


func step_len(path: PackedVector2Array) -> float:
	return 0.0 if path.size() < 2 else path[0].distance_to(path[1])


func step(dt: float) -> void:
	time += dt
	for side in bots:
		_bot(side, dt)
	for c in colonies:
		if c.side != NONE:
			c.mass = minf(cfg.cap, c.mass + (cfg.grow + c.mass * cfg.grow_k) * dt)
		if c.to >= 0 and colonies[c.to].side == c.side and colonies[c.to].mass >= cfg.cap - 1:
			c.to = -1  # своя цель полна — ручей стихает сам
			c.path = PackedVector2Array()
		if c.to < 0:
			continue
		c.emit += dt * (cfg.flow + c.mass * cfg.flow_k)
		while c.emit >= 1.0 and c.mass >= 2.0:
			c.emit -= 1.0
			c.mass -= 1.0
			_ids += 1
			cells.append({d = 0.0, path = c.path, to = c.to, side = c.side, id = _ids, s = step_len(c.path)})
		c.emit = minf(c.emit, 1.0)
	_move(dt)
	_clash()


func _move(dt: float) -> void:
	var keep: Array = []
	for cell in cells:
		cell.d += cfg.speed * dt
		if cell.d < cell.s * (cell.path.size() - 1):
			keep.append(cell)
			continue
		var t: Dictionary = colonies[cell.to]
		if t.side == cell.side:
			t.mass = minf(cfg.cap, t.mass + 1.0)
		else:
			t.mass -= 1.0
			if t.mass <= 0.0:
				t.side = cell.side
				t.mass = 1.0
				t.to = -1
				t.path = PackedVector2Array()
				event.emit("capture", t.pos, cell.side)
	cells = keep


## Встречные клетки гибнут парами. Сетка 32×32, чтобы не сверять всех со всеми.
func _clash() -> void:
	var grid := {}
	for cell in cells:
		cell.p = along(cell.path, cell.d, cell.s)
		var key := Vector2i(cell.p / 32.0)
		if not grid.has(key):
			grid[key] = []
		grid[key].append(cell)
	var dead := {}
	for cell in cells:
		if cell.side != ME or dead.has(cell.id):
			continue
		var k := Vector2i(cell.p / 32.0)
		for dx in [-1, 0, 1]:
			for dy in [-1, 0, 1]:
				for o in grid.get(k + Vector2i(dx, dy), []):
					if o.side != ME and not dead.has(o.id) and not dead.has(cell.id) and o.p.distance_to(cell.p) < cfg.hit:
						dead[o.id] = true
						dead[cell.id] = true
						event.emit("hit", (o.p + cell.p) / 2, o.side)
	if not dead.is_empty():
		cells = cells.filter(func(c): return not dead.has(c.id))


func total(side: int) -> float:
	var s := 0.0
	for c in colonies:
		if c.side == side:
			s += c.mass
	for cell in cells:
		if cell.side == side:
			s += 1.0
	return s


func owns(side: int) -> bool:
	return colonies.any(func(c): return c.side == side)


## Бот: раз в think секунд каждая его колония толще min выбирает цель —
## слабую ничью рядом (жадность), слабого игрока (злость), или свою, если на неё течёт чужой ручей.
func _bot(side: int, dt: float) -> void:
	var b: Dictionary = bots[side]
	b.wait -= dt
	if b.wait > 0:
		return
	b.wait = b.think * rng.randf_range(0.7, 1.3)
	for i in colonies.size():
		var c: Dictionary = colonies[i]
		if c.side != side or c.mass < b.min:
			continue
		var best := -1
		var score := -INF
		for j in colonies.size():
			var t: Dictionary = colonies[j]
			if j == i:
				continue
			var s: float = -c.pos.distance_to(t.pos) / 250.0 - t.mass / maxf(c.mass, 1.0) * 2.0 + rng.randf() * 0.6
			if t.side == NONE:
				s += b.greed
			elif t.side == side:
				var threat := cells.filter(func(x): return x.to == j and x.side != side).size()
				s += -3.0 + threat * 0.4
			else:
				s += b.anger
			if s > score:
				score = s
				best = j
		if best >= 0 and (c.to < 0 or colonies[c.to].side == side or rng.randf() < 0.25):
			var a: Vector2 = c.pos
			var z: Vector2 = colonies[best].pos
			var bend: Vector2 = (z - a).orthogonal().normalized() * rng.randf_range(-b.bend, b.bend)
			set_stream(i, best, PackedVector2Array([a.lerp(z, 0.5) + bend]))
