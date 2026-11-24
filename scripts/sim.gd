class_name Sim
extends RefCounted
## Логика партии без экрана. Числа — data/game.json. Время идёт только через step(dt).

signal changed(what: String, data: Dictionary)

const PLAYER := 0
const ENEMY := 1
const DATA := "res://data/game.json"

var cfg: Dictionary
var time := 0.0
var gold := [0, 0]
var winner := -1
## Секунд до общего свистка: на свисток отряды обеих сторон выходят по своим тропам.
var whistle := 0.0
var buildings: Array = []
var deposits: Array = []
var units: Array = []
var _drip := 0.0
var _next_id := 1


func _init(overrides := {}) -> void:
	cfg = JSON.parse_string(FileAccess.get_file_as_string(DATA))
	cfg.merge(overrides, true)
	gold = [cfg.start_gold, cfg.start_gold]
	whistle = cfg.whistle.every
	for side in [PLAYER, ENEMY]:
		_add_building(side, "home", _v(cfg.homes[side]))
	for d in cfg.deposits:
		deposits.append({"id": _id(), "pos": _v(d.pos), "gold": float(d.gold), "max": float(d.gold)})


func step(dt: float) -> void:
	if winner != -1:
		return
	time += dt
	_drip += dt
	if _drip >= cfg.home_drip.every:
		_drip -= cfg.home_drip.every
		for side in [PLAYER, ENEMY]:
			if not of_side(side, "home").is_empty():
				gold[side] += cfg.home_drip.gold
	whistle -= dt
	if whistle <= 0:
		whistle += cfg.whistle.every
		for u in units:
			if u.kind == "warrior" and not u.go:
				u.go = true
				u.leg = 0
		changed.emit("whistle", {})
	for b in buildings.duplicate():
		if b.kind == "camp":
			_camp(b, dt)
		elif b.kind == "barracks":
			_barracks(b, dt)
	for u in units.duplicate():
		if u.hp <= 0:
			continue
		if u.kind == "carrier":
			_carrier(u, dt)
		else:
			_warrior(u, dt)


## Тропа от здания к точке: прилипает к ближайшей цели в радиусе snap.
## Лагерь — к залежи, казарма — к зданию врага.
func set_path(b: Dictionary, point: Vector2) -> bool:
	if b.kind == "barracks":
		return set_route(b, [point])
	var best := {}
	var choices := deposits.filter(func(d): return d.gold > 0) if b.kind == "camp" else of_side(1 - b.side)
	for c in choices:
		if c.pos.distance_to(point) <= cfg.snap and (best.is_empty() or c.pos.distance_to(point) < best.pos.distance_to(point)):
			best = c
	if best.is_empty():
		return false
	b.target = best
	changed.emit("path", b)
	return true


## Тропа воинов — натянутая нитка от казармы до пальца (design/natyanutaya_nitka.md).
## Конец у постройки врага (в радиусе snap) — отряд её ломает, иначе стоит в конце и держит место.
func set_route(b: Dictionary, trail: Array) -> bool:
	var t := thread(b, trail)
	if t.route.is_empty() or t.route[-1].distance_to(b.pos) < cfg.snap / 2.0:
		return false
	b.target = t.target
	b.route = t.route
	_rejoin(b)
	changed.emit("path", b)
	return true


## Отряд на новой нитке идёт с ближайшей к нему точки, а не напрямик к старой.
func _rejoin(b: Dictionary) -> void:
	for u in units:
		if is_same(u.home, b):
			u.leg = 0
			for i in b.route.size():
				u.leg = i if u.pos.distance_to(b.route[i]) < u.pos.distance_to(b.route[u.leg]) else u.leg

## Нитка по следу пальца: та же функция и под пальцем, и при отпускании. Возвращает route (без начала) и target.
func thread(b: Dictionary, trail: Array) -> Dictionary:
	var pts: Array = [b.pos]
	for p in trail:
		pts.append(Vector2(p).clamp(Vector2.ZERO, _v(cfg.field)))
	var target := {}  # конец у постройки врага (в радиусе snap) прилипает к ней
	for c in of_side(1 - b.side):
		if c.pos.distance_to(pts[-1]) <= cfg.snap and (target.is_empty() or c.pos.distance_to(pts[-1]) < target.pos.distance_to(pts[-1])):
			target = c
	if not target.is_empty():
		pts[-1] = target.pos
	var route := pull(pts, solids(), cfg.route.step)
	route.pop_front()
	return {"route": route, "target": target}


## Твёрдое на столе: печенье — круг [центр, радиус] с зазором route.margin. Постройки пока проходимы.
func solids() -> Array:
	var out := []
	for d in deposits:
		if d.gold > 0:
			out.append([d.pos, cfg.deposit_r + cfg.route.margin])
	return out


## Натянуть нитку: след из твёрдого — на край с той стороны, где шёл палец; лишние точки и углы в воздухе убрать.
static func pull(trail: Array, circles: Array, step: float) -> Array:
	var pts: Array = [trail[0]]
	for i in range(1, trail.size()):
		var n := maxi(1, ceili(trail[i - 1].distance_to(trail[i]) / step))
		for k in range(1, n):
			pts.append(trail[i - 1].lerp(trail[i], float(k) / n))
		pts.append(trail[i])
	for c in circles + circles:
		var side := 0.0  # с какой стороны круга шёл палец: по точкам следа внутри
		for i in range(1, pts.size()):
			if pts[i].distance_to(c[0]) < c[1]:
				side += (pts[i] - c[0]).cross(pts[-1] - pts[0])
		for i in range(1, pts.size()):
			pts[i] = _out(pts[i], c, pts[-1] - pts[0], side)
	var j := 0  # отрезок между вытолкнутыми точками режет печенье — середину на край
	while j < pts.size() - 1 and pts.size() < 400:
		var hit: Array = circles.filter(func(c): return _seg_dist(c[0], pts[j], pts[j + 1]) < c[1] - 0.5)
		if hit.is_empty(): j += 1
		else: pts.insert(j + 1, _out(Geometry2D.get_closest_point_to_segment(hit[0][0], pts[j], pts[j + 1]), hit[0], pts[j + 1] - pts[j], 0.0))
	var i := 1
	while i < pts.size() - 1:
		if circles.all(func(c): return not _touches(c, pts[i - 1], pts[i], pts[i + 1])):
			pts.remove_at(i)
			i = maxi(1, i - 1)
		else: i += 1
	# Угол в воздухе тянется к соседям, пока не упрётся в печенье: нитка ложится по краю, а не по пальцу.
	for pass_ in 24:
		for k in range(1, pts.size() - 1):
			for aim in [(pts[k - 1] + pts[k + 1]) / 2.0, pts[k - 1], pts[k + 1]]:  # к соседям и вдоль отрезков
				var f := 1.0
				while f > 0.01:
					var to: Vector2 = pts[k].lerp(aim, f)
					if circles.all(func(c): return not _touches(c, pts[k - 1], pts[k], to) and not _touches(c, pts[k + 1], pts[k], to)):
						pts[k] = to; break
					f /= 2.0
	return pts


## Точку внутри круга — поперёк направления dir на край круга, на сторону side.
static func _out(p: Vector2, c: Array, dir: Vector2, side: float) -> Vector2:
	var v: Vector2 = p - c[0]
	if v.length() >= c[1]:
		return p
	var d := dir.normalized()
	var across := d.orthogonal()
	var r: float = c[1] + 0.5 # с запасом полточки
	var along := clampf(v.dot(d), -r, r)
	var sgn := signf(side) if side != 0.0 else (signf(v.dot(across)) if v.dot(across) != 0.0 else 1.0)
	return c[0] + d * along + across * sgn * sqrt(r * r - along * along)


static func _seg_dist(c: Vector2, a: Vector2, b: Vector2) -> float:
	return c.distance_to(Geometry2D.get_closest_point_to_segment(c, a, b))

## Задевает ли треугольник a, b, c круг: центр внутри или край ближе радиуса.
static func _touches(circle: Array, a: Vector2, b: Vector2, c: Vector2) -> bool:
	var o: Vector2 = circle[0]
	var flat := absf((b - a).cross(c - a)) < 0.01
	return (not flat and Geometry2D.point_is_inside_triangle(o, a, b, c)) or [[a, b], [b, c], [a, c]].any(func(e): return _seg_dist(o, e[0], e[1]) < circle[1])


func _camp(b: Dictionary, dt: float) -> void:
	b.timer += dt
	var mine := units.filter(func(u): return is_same(u.home, b))
	if b.target.is_empty() or b.target.gold <= 0 or mine.size() >= cfg.camp.carriers or b.timer < cfg.camp.spawn_every:
		return
	b.timer = 0.0
	units.append({"id": _id(), "side": b.side, "kind": "carrier", "pos": b.pos, "hp": cfg.carrier.hp, "home": b, "out": true, "carry": 0.0})


func _barracks(b: Dictionary, dt: float) -> void:
	b.timer += dt
	var mine := units.filter(func(u): return is_same(u.home, b))
	if mine.size() >= cfg.whistle.squad:
		b.hungry = false
		return
	if b.timer < cfg.barracks.every:
		return
	# Войско ест крошки: воин стоит warrior.cost; не хватает — коробок голодный, отряд выйдет меньше.
	b.hungry = gold[b.side] < cfg.warrior.cost
	if b.hungry:
		return
	gold[b.side] -= cfg.warrior.cost
	b.timer = 0.0
	var post := Vector2((b.id % 5 - 2) * 14, 44 + (b.id % 3) * 10)
	units.append({"id": _id(), "side": b.side, "kind": "warrior", "pos": b.pos + post, "hp": cfg.warrior.hp, "home": b, "cd": 0.0, "post": post, "go": false, "leg": 0})


## Воин: дерётся с ближним чужим. После свистка идёт по тропе казармы: ломает постройку в её конце
## или стоит в конце и держит место. Без тропы ждёт у казармы следующего свистка.
func _warrior(u: Dictionary, dt: float) -> void:
	var w: Dictionary = cfg.warrior
	u.cd = maxf(0.0, u.cd - dt)
	var foe := {}
	var route: Array = u.home.route
	# Нитка — приказ: на марше отряд дерётся только с чужими воинами на пути, носильщиков не трогает.
	var marching: bool = u.go and u.leg < route.size() - 1
	var aggro: float = w.march_aggro if marching else w.aggro
	for o in units:
		if o.side != u.side and o.hp > 0 and o.pos.distance_to(u.pos) <= aggro and (o.kind == "warrior" or not marching):
			if foe.is_empty() or o.pos.distance_to(u.pos) < foe.pos.distance_to(u.pos):
				foe = o
	if not foe.is_empty():
		if _reach(u, foe.pos, w.reach, w.speed * dt):
			_hit(u, foe)
	elif u.go and not route.is_empty():
		_march(u, route, w.speed * dt)
	else:
		u.go = false
		_walk(u, u.home.pos + u.post, w.speed * dt)


func _march(u: Dictionary, route: Array, dist: float) -> void:
	var leg := mini(u.leg, route.size() - 1)
	var t: Dictionary = u.home.target
	if leg < route.size() - 1:
		if _walk(u, route[leg], dist):
			u.leg = leg + 1
	elif t.is_empty():
		_walk(u, route[leg] + u.post * 0.6, dist)
	elif t.hp > 0 and _reach(u, t.pos, cfg.warrior.reach + cfg.buildings[t.kind].size, dist):
		_hit(u, t)


func _reach(u: Dictionary, to: Vector2, r: float, dist: float) -> bool:
	if u.pos.distance_to(to) <= r:
		return true
	_walk(u, to, dist)
	return false


func _hit(u: Dictionary, x: Dictionary) -> void:
	if u.cd > 0:
		return
	u.cd = cfg.warrior.hit_every
	changed.emit("hit", {"side": u.side, "pos": x.pos, "id": x.id, "by": u.id, "max_hp": x.get("max_hp", 0)})
	if x.has("max_hp"):
		damage(x, cfg.warrior.siege)
		return
	x.hp -= cfg.warrior.damage
	if x.hp <= 0:
		units = units.filter(func(o): return not is_same(o, x))
		x.by = u.id
		changed.emit("killed", x)


## Носильщик: к залежи, взял золото, обратно в лагерь, сдал.
func _carrier(u: Dictionary, dt: float) -> void:
	var dep: Dictionary = u.home.target
	if u.out:
		if dep.is_empty() or dep.gold <= 0:
			u.out = false
		elif _walk(u, dep.pos, cfg.carrier.speed * dt):
			u.carry = minf(cfg.carrier.load, dep.gold)
			dep.gold -= u.carry
			u.out = false
	elif _walk(u, u.home.pos, cfg.carrier.speed * dt):
		if u.carry > 0:
			gold[u.side] += u.carry
			changed.emit("gold", {"side": u.side, "amount": u.carry, "pos": u.home.pos})
			u.carry = 0.0
		u.out = true


## Шаг к точке; true — дошёл.
func _walk(u: Dictionary, to: Vector2, dist: float) -> bool:
	u.pos = u.pos.move_toward(to, dist)
	return u.pos.distance_to(to) < 1.0


## Пустая строка, если строить можно; иначе причина для игрока.
func can_build(side: int, kind: String, pos: Vector2) -> String:
	var field := _v(cfg.field)
	if pos.x < 30 or pos.y < 30 or pos.x > field.x - 30 or pos.y > field.y - 30:
		return "вне поля"
	if gold[side] < cfg.buildings[kind].cost:
		return "мало крошек"
	# Ставить можно где угодно на столе; нельзя только поверх другой постройки или печенья.
	var r: float = cfg.buildings[kind].size
	for o in buildings:
		if o.pos.distance_to(pos) < r + cfg.buildings[o.kind].size:
			return "нельзя: тут постройка"
	for d in deposits:
		if d.gold > 0 and d.pos.distance_to(pos) < r + cfg.deposit_r:
			return "нельзя на печенье"
	return ""


func build(side: int, kind: String, pos: Vector2) -> Dictionary:
	if can_build(side, kind, pos) != "":
		return {}
	gold[side] -= cfg.buildings[kind].cost
	return _add_building(side, kind, pos)


func damage(b: Dictionary, amount: float) -> void:
	if b.hp <= 0:
		return
	b.hp -= amount
	if b.hp > 0:
		return
	buildings = buildings.filter(func(x): return not is_same(x, b))
	units = units.filter(func(u): return not is_same(u.home, b))
	changed.emit("destroyed", b)
	# Трофей: разрушившему достаётся доля цены постройки.
	var loot: float = floor(cfg.buildings[b.kind].cost * cfg.trophy)
	if loot > 0:
		gold[1 - b.side] += loot
		changed.emit("gold", {"side": 1 - b.side, "amount": loot, "pos": b.pos})
	_next_target(b)
	for side in [PLAYER, ENEMY]:
		if of_side(side).is_empty() and winner == -1:
			winner = 1 - side
			changed.emit("ended", {"winner": winner})


## Цель разрушена: отряды, шедшие на неё, сами идут к ближайшей следующей постройке врага.
func _next_target(gone: Dictionary) -> void:
	for bb in buildings:
		if not is_same(bb.target, gone):
			continue
		var next := {}
		for c in of_side(gone.side):
			if next.is_empty() or c.pos.distance_to(gone.pos) < next.pos.distance_to(gone.pos):
				next = c
		bb.target = next
		# Переезжает только конец нитки, обходы остаются; отряд идёт с ближайшей к нему точки нитки.
		bb.route = [] if next.is_empty() else thread(bb, bb.route.slice(0, -1) + [next.pos]).route
		_rejoin(bb)
		changed.emit("path", bb)


func of_side(side: int, kind := "") -> Array:
	return buildings.filter(func(b): return b.side == side and (kind == "" or b.kind == kind))


func building_at(pos: Vector2, side: int) -> Dictionary:
	for b in of_side(side):
		if b.pos.distance_to(pos) <= cfg.buildings[b.kind].size + 20:
			return b
	return {}


func _add_building(side: int, kind: String, pos: Vector2) -> Dictionary:
	var hp: float = cfg.buildings[kind].hp
	var b := {"id": _id(), "side": side, "kind": kind, "pos": pos, "hp": hp, "max_hp": hp, "target": {}, "route": [], "timer": 0.0, "hungry": false}
	buildings.append(b)
	changed.emit("built", b)
	return b


func _id() -> int:
	_next_id += 1
	return _next_id


static func _v(a: Array) -> Vector2:
	return Vector2(a[0], a[1])
