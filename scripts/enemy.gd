class_name Enemy
extends RefCounted
## Враг играет по тем же правилам и ценам: ставит лагеря к залежам, потом казармы и набеги.
## Сложность — числа в data/game.json, раздел enemy.

var sim: Sim
var side := Sim.ENEMY
var _wait := 0.0
var _whistle := 0.0
var _lost := {}  # лагерь → сколько носильщиков он потерял к прошлому свистку


func _init(s: Sim) -> void:
	sim = s


func step(dt: float) -> void:
	if sim.whistle > _whistle:
		_flee()
	_whistle = sim.whistle
	_wait -= dt
	if _wait > 0 or sim.winner != -1:
		return
	_wait = sim.cfg.enemy.think
	var e: Dictionary = sim.cfg.enemy
	for camp in sim.of_side(side, "camp"):
		if camp.target.is_empty() or camp.target.gold <= 0:
			var d := _free_deposit(camp.pos)
			if not d.is_empty():
				sim.set_path(camp, d.pos)
	for b in sim.of_side(side, "barracks").slice(e.guards):
		if sim.time >= e.raid_after and (b.target.is_empty() or b.target.hp <= 0):
			var t := _raid_target()
			if not t.is_empty():
				sim.set_path(b, t.pos)
	var camps := sim.of_side(side, "camp").size()
	var barracks := sim.of_side(side, "barracks").size()
	if camps < e.camps + int(sim.time / e.extra_camp_every):
		var d := _free_deposit(Sim._v(sim.cfg.homes[side]))
		if not d.is_empty():
			var camp := _build("camp", d.pos)
			if not camp.is_empty():
				sim.set_path(camp, d.pos)
	elif sim.time >= e.barracks_after and barracks < mini(e.max_barracks, maxi(sim.of_side(1 - side, "barracks").size(), 1 + int(sim.time / e.extra_barracks_every))):
		_build("barracks", Sim._v(sim.cfg.homes[1 - side]))


## Лагерь, потерявший за свисток flee носильщиков, уводит тропу на свободную залежь мимо башен.
func _flee() -> void:
	for camp in sim.of_side(side, "camp"):
		var n: int = camp.get("lost", 0) - _lost.get(camp.id, 0)
		_lost[camp.id] = camp.get("lost", 0)
		if n >= sim.cfg.enemy.flee:  # нет пути мимо башен — лагерь затихает, пока башня стоит
			camp.target = {}
			var d := _free_deposit(camp.pos)
			if not d.is_empty():
				sim.set_path(camp, d.pos)


## Ближайшая к точке залежь с золотом, к которой ещё не идёт наша тропа и путь к которой не под чужой башней.
func _free_deposit(from: Vector2) -> Dictionary:
	var taken := sim.of_side(side, "camp").map(func(c): return c.target)
	var towers := sim.of_side(1 - side, "tower")
	var best := {}
	for d in sim.deposits:
		var shot := towers.any(func(t): return t.pos.distance_to(Geometry2D.get_closest_point_to_segment(t.pos, from, d.pos)) < sim.cfg.tower.range)
		if d.gold > 0 and not shot and not taken.any(func(t): return is_same(t, d)):
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


## Строит как можно ближе к цели: шаг от своего здания в её сторону.
func _build(kind: String, toward: Vector2) -> Dictionary:
	var best := Vector2.INF
	for b in sim.of_side(side):
		for turn in [0.0, 0.6, -0.6, 1.2, -1.2]:
			var p: Vector2 = b.pos + (toward - b.pos).limit_length(sim.cfg.enemy.spread).rotated(turn)
			if sim.can_build(side, kind, p) == "" and p.distance_to(toward) < best.distance_to(toward):
				best = p
	return {} if best == Vector2.INF else sim.build(side, kind, best)
