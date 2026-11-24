class_name Enemy
extends RefCounted
## Враг играет по тем же правилам и ценам. Характер (data/enemies.json) — как он строит, когда и куда нападает,
## ставит ли башни. Первая партия — спокойная Тихоня, дальше по очереди (Роман 24.11: «бот ведет себя одинаково»).

const CHARS := "res://data/enemies.json"
static var played := 0  # сколько партий сыграно с запуска: по нему следующий характер

var sim: Sim
var side := Sim.ENEMY
var who: String
var p: Dictionary
var towers_built := 0
var _wait := 0.0


## Характер следующей партии.
static func upcoming() -> String:
	var order: Array = JSON.parse_string(FileAccess.get_file_as_string(CHARS)).order
	return order[played % order.size()]


static func title(name: String) -> String:
	return JSON.parse_string(FileAccess.get_file_as_string(CHARS)).chars[name].title


func _init(s: Sim, name := "") -> void:
	sim = s
	var all: Dictionary = JSON.parse_string(FileAccess.get_file_as_string(CHARS))
	who = name if name != "" else all.default
	p = all.chars[who].duplicate()


func step(dt: float) -> void:
	_wait -= dt
	if _wait > 0 or sim.winner != -1:
		return
	_wait = sim.cfg.enemy.think
	if p.has("late_after") and sim.time >= p.late_after and p.target != "home":
		p.merge(p.late, true)  # Тихоня к пятой минуте накопила и идёт на кружку всем
		for b in sim.of_side(side, "barracks"):
			b.target = {}
	for camp in sim.of_side(side, "camp"):
		if camp.target.is_empty() or camp.target.gold <= 0:
			var d := _free_deposit(camp.pos)
			if not d.is_empty():
				sim.set_path(camp, d.pos)
	for b in sim.of_side(side, "barracks").slice(p.guards):
		if sim.time >= p.raid_after and (b.target.is_empty() or b.target.hp <= 0):
			var t := _aim()
			if not t.is_empty():
				sim.set_path(b, t.pos)
	var camps := sim.of_side(side, "camp").size()
	var barracks := sim.of_side(side, "barracks").size()
	var his_home := Sim._v(sim.cfg.homes[1 - side])
	if camps < p.camps + int(sim.time / p.extra_camp_every):
		var d := _free_deposit(Sim._v(sim.cfg.homes[side]))
		if not d.is_empty():
			var camp := _build("camp", d.pos)
			if not camp.is_empty():
				sim.set_path(camp, d.pos)
	elif _want_tower(his_home):
		sim.build(side, "tower", _tower_spot(his_home))
		towers_built += 1
	elif sim.time >= p.barracks_after and barracks < mini(p.max_barracks, _barracks_wanted()):
		_build("barracks", his_home)


## Сколько казарм хочет сейчас: Задира (mirror) — не меньше, чем у игрока, и одна в extra_barracks_every с начала;
## остальные — одна в extra_barracks_every с первой.
func _barracks_wanted() -> int:
	if p.get("mirror", false):
		return maxi(sim.of_side(1 - side, "barracks").size(), 1 + int(sim.time / p.extra_barracks_every))
	return 1 + int((sim.time - p.barracks_after) / p.extra_barracks_every)


## Башня по характеру: не раньше tower_after и по одной в tower_every, когда крошек хватает с запасом.
func _want_tower(his_home: Vector2) -> bool:
	if towers_built >= p.towers or sim.time < p.tower_after + towers_built * p.tower_every:
		return false
	if sim.gold[side] < sim.cfg.buildings.tower.cost + sim.cfg.enemy.tower_spare:
		return false
	var at := _tower_spot(his_home)
	if at == Vector2.INF:
		return false
	if sim.can_build(side, "tower", at) != "":
		towers_built += 1  # место занято: эту башню пропускаем
		return false
	return true


## home — у своего лагеря в сторону игрока; front — у самой передней казармы, слева и справа по очереди;
## raid — у середины тропы лагеря игрока, со своей стороны.
func _tower_spot(his_home: Vector2) -> Vector2:
	var t: Dictionary = sim.cfg.enemy.tower_at
	if p.tower_place == "home":
		var cs := sim.of_side(side, "camp")
		if cs.is_empty():
			return Vector2.INF
		var from: Vector2 = cs[towers_built % cs.size()].pos
		return from + (his_home - from).normalized() * t.home
	if p.tower_place == "front":
		var bs := sim.of_side(side, "barracks")
		if bs.is_empty():
			return Vector2.INF
		var from: Vector2 = bs.reduce(func(a, b): return b if b.pos.distance_to(his_home) < a.pos.distance_to(his_home) else a, bs[0]).pos
		return from + (his_home - from).normalized().rotated(0.7 * (1 if towers_built % 2 == 0 else -1)) * t.front
	if p.tower_place == "raid":
		var cs := sim.of_side(1 - side, "camp").filter(func(c): return not c.target.is_empty() and c.target.gold > 0)
		if cs.is_empty():
			return Vector2.INF
		var c: Dictionary = cs[towers_built % cs.size()]
		var mid: Vector2 = (c.pos + c.target.pos) / 2.0
		return mid + (Sim._v(sim.cfg.homes[side]) - mid).normalized() * t.raid
	return Vector2.INF


## Цель набега по характеру: кружка, ближняя казарма или башня игрока, иначе его добыча.
func _aim() -> Dictionary:
	if p.target == "home" and not sim.of_side(1 - side, "home").is_empty():
		return sim.of_side(1 - side, "home")[0]
	if p.target == "barracks":
		var home := Sim._v(sim.cfg.homes[side])
		var near := sim.of_side(1 - side, "barracks") + sim.of_side(1 - side, "tower")
		if not near.is_empty():
			return near.reduce(func(a, b): return b if b.pos.distance_to(home) < a.pos.distance_to(home) else a, near[0])
	return _raid_target()


## Ближайшая к точке залежь с золотом, к которой ещё не идёт наша тропа.
func _free_deposit(from: Vector2) -> Dictionary:
	var taken := sim.of_side(side, "camp").map(func(c): return c.target)
	var best := {}
	for d in sim.deposits:
		if d.gold > 0 and not taken.any(func(t): return is_same(t, d)):
			if best.is_empty() or d.pos.distance_to(from) < best.pos.distance_to(from):
				best = d
	return best


## Набег на самую длинную тропу добычи игрока, иначе на ближнее к нам здание.
func _raid_target() -> Dictionary:
	var best := {}
	var longest := 0.0
	for c in sim.of_side(1 - side, "camp"):
		if not c.target.is_empty() and c.target.gold > 0 and c.pos.distance_to(c.target.pos) > longest:
			longest = c.pos.distance_to(c.target.pos)
			best = c
	if best.is_empty():
		var home := Sim._v(sim.cfg.homes[side])
		for b in sim.of_side(1 - side):
			if best.is_empty() or b.pos.distance_to(home) < best.pos.distance_to(home):
				best = b
	return best


## Строит как можно ближе к цели: шаг от своего здания в её сторону. Без forward казармы — только на своей половине.
func _build(kind: String, toward: Vector2) -> Dictionary:
	var best := Vector2.INF
	for b in sim.of_side(side):
		for turn in [0.0, 0.6, -0.6, 1.2, -1.2]:
			var q: Vector2 = b.pos + (toward - b.pos).limit_length(sim.cfg.enemy.spread).rotated(turn)
			var own_half: bool = absf(q.y - Sim._v(sim.cfg.homes[side]).y) < sim.cfg.field[1] * 0.45
			if (p.forward or kind == "camp" or own_half) and sim.can_build(side, kind, q) == "" and q.distance_to(toward) < best.distance_to(toward):
				best = q
	return {} if best == Vector2.INF else sim.build(side, kind, best)
