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
var buildings: Array = []
var deposits: Array = []
var units: Array = []
var _drip := 0.0
var _next_id := 1


func _init(overrides := {}) -> void:
	cfg = JSON.parse_string(FileAccess.get_file_as_string(DATA))
	cfg.merge(overrides, true)
	gold = [cfg.start_gold, cfg.start_gold]
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
	if mine.size() >= cfg.barracks.max or b.timer < cfg.barracks.every:
		return
	b.timer = 0.0
	var post := Vector2((b.id % 5 - 2) * 14, 44 + (b.id % 3) * 10)
	units.append({"id": _id(), "side": b.side, "kind": "warrior", "pos": b.pos + post, "hp": cfg.warrior.hp, "home": b, "cd": 0.0, "post": post})


## Воин: дерётся с ближним чужим, иначе идёт по тропе и ломает здание в её конце, без тропы стоит у казармы.
func _warrior(u: Dictionary, dt: float) -> void:
	var w: Dictionary = cfg.warrior
	u.cd = maxf(0.0, u.cd - dt)
	var foe := {}
	for o in units:
		if o.side != u.side and o.hp > 0 and o.pos.distance_to(u.pos) <= w.aggro:
			if foe.is_empty() or o.pos.distance_to(u.pos) < foe.pos.distance_to(u.pos):
				foe = o
	var t: Dictionary = u.home.target
	if not foe.is_empty():
		if _reach(u, foe.pos, w.reach, w.speed * dt):
			_hit(u, foe)
	elif not t.is_empty() and t.hp > 0:
		if _reach(u, t.pos, w.reach + cfg.buildings[t.kind].size, w.speed * dt):
			_hit(u, t)
	else:
		_walk(u, u.home.pos + u.post, w.speed * dt)


func _reach(u: Dictionary, to: Vector2, r: float, dist: float) -> bool:
	if u.pos.distance_to(to) <= r:
		return true
	_walk(u, to, dist)
	return false


func _hit(u: Dictionary, x: Dictionary) -> void:
	if u.cd > 0:
		return
	u.cd = cfg.warrior.hit_every
	changed.emit("hit", {"side": u.side, "pos": x.pos})
	if x.has("max_hp"):
		damage(x, cfg.warrior.damage)
		return
	x.hp -= cfg.warrior.damage
	if x.hp <= 0:
		units = units.filter(func(o): return not is_same(o, x))
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
		return "мало золота"
	for o in buildings + deposits:
		if o.pos.distance_to(pos) < cfg.build_gap:
			return "занято"
	if not _near_own(side, pos):
		return "далеко от своих"
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
	for side in [PLAYER, ENEMY]:
		if of_side(side).is_empty() and winner == -1:
			winner = 1 - side
			changed.emit("ended", {"winner": winner})


func of_side(side: int, kind := "") -> Array:
	return buildings.filter(func(b): return b.side == side and (kind == "" or b.kind == kind))


func building_at(pos: Vector2, side: int) -> Dictionary:
	for b in of_side(side):
		if b.pos.distance_to(pos) <= cfg.buildings[b.kind].size + 20:
			return b
	return {}


func _near_own(side: int, pos: Vector2) -> bool:
	for b in of_side(side):
		if b.pos.distance_to(pos) <= cfg.build_radius:
			return true
	return false


func _add_building(side: int, kind: String, pos: Vector2) -> Dictionary:
	var hp: float = cfg.buildings[kind].hp
	var b := {"id": _id(), "side": side, "kind": kind, "pos": pos, "hp": hp, "max_hp": hp, "target": {}, "timer": 0.0}
	buildings.append(b)
	changed.emit("built", b)
	return b


func _id() -> int:
	_next_id += 1
	return _next_id


static func _v(a: Array) -> Vector2:
	return Vector2(a[0], a[1])
