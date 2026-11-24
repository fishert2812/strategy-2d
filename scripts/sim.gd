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
	buildings.erase(b)
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
	var b := {"id": _id(), "side": side, "kind": kind, "pos": pos, "hp": hp, "max_hp": hp}
	buildings.append(b)
	changed.emit("built", b)
	return b


func _id() -> int:
	_next_id += 1
	return _next_id


static func _v(a: Array) -> Vector2:
	return Vector2(a[0], a[1])
