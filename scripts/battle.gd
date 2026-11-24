extends Control
## Экран партии: поле, здания, постройка и тропы перетягиванием, конец партии.

const TEX := {
	"home": preload("res://art/rts/medievalStructure_05.png"),
	"camp": preload("res://art/rts/medievalStructure_10.png"),
	"barracks": preload("res://art/rts/medievalStructure_02.png"),
	"small": preload("res://art/rts/medievalEnvironment_17.png"),
	"rich": preload("res://art/rts/medievalEnvironment_19.png"),
}
## Люди по сторонам: [наш, врага].
const UNIT := {
	"carrier": [preload("res://art/rts/medievalUnit_23.png"), preload("res://art/rts/medievalUnit_05.png")],
	"warrior": [preload("res://art/rts/medievalUnit_03.png"), preload("res://art/rts/medievalUnit_09.png")],
}
const PATH_COLOR := [Color(0.2, 0.45, 1.0, 0.75), Color(0.95, 0.2, 0.15, 0.75)]
## Цвет стороны: синие мы, красные враг.
const TINT := [Color(0.6, 0.78, 1.0), Color(1.0, 0.6, 0.55)]
const TOP := 90.0
const BOTTOM := 190.0

var sim: Sim
var _sprites := {}
var _drag := {}
var _units := {}
var _lines := {}

@onready var world: Node2D = $World
@onready var things: Node2D = $World/Things
@onready var ghost: Sprite2D = $World/Ghost
@onready var buttons := {"camp": $Hud/Box/Bar/camp, "barracks": $Hud/Box/Bar/barracks}


func _ready() -> void:
	$Hud/Box/Top/Sha.text = Version.sha()
	$End/Center/Box/Again.pressed.connect(restart)
	SafeArea.apply($Hud)
	restart()


func restart() -> void:
	for c in things.get_children() + $World/Paths.get_children():
		c.free()
	_sprites.clear()
	_units.clear()
	_lines.clear()
	_drag = {}
	ghost.hide()
	sim = Sim.new()
	sim.changed.connect(_on_sim)
	for b in sim.buildings:
		_on_sim("built", b)
	for d in sim.deposits:
		_add_sprite(d.id, TEX.rich if d.max >= 400 else TEX.small, d.pos)
	$End.hide()


func _process(dt: float) -> void:
	sim.step(dt)
	var field := Sim._v(sim.cfg.field)
	world.position = Vector2((size.x - field.x) / 2, TOP + (size.y - TOP - BOTTOM - field.y) / 2)
	$Hud/Box/Top/Gold.text = "Золото %d" % sim.gold[Sim.PLAYER]
	$Hud/Box/Top/Time.text = "%d:%02d" % [int(sim.time) / 60, int(sim.time) % 60]
	for kind in buttons:
		buttons[kind].modulate.a = 1.0 if sim.gold[Sim.PLAYER] >= sim.cfg.buildings[kind].cost else 0.45
	for d in sim.deposits:
		var s: Node2D = _sprites[d.id]
		s.visible = d.gold > 0
		s.scale = Vector2.ONE * lerpf(1.0, 2.2, d.gold / 600.0)
	for b in sim.buildings:
		var bar: ProgressBar = _sprites[b.id].get_node("Hp")
		bar.value = b.hp / b.max_hp * 100.0
		bar.visible = b.hp < b.max_hp
	_sync_paths()
	_sync_units()


func _sync_paths() -> void:
	var seen := {}
	for b in sim.buildings:
		if b.target.is_empty() or b.target.get("gold", 1) <= 0 or b.target.get("hp", 1) <= 0:
			continue
		seen[b.id] = true
		if not _lines.has(b.id):
			_lines[b.id] = _line(PATH_COLOR[b.side])
		_lines[b.id].points = [b.pos, b.target.pos]
	_drop_missing(_lines, seen)


func _sync_units() -> void:
	var seen := {}
	for u in sim.units:
		seen[u.id] = true
		if not _units.has(u.id):
			var s := Sprite2D.new()
			s.texture = UNIT[u.kind][u.side]
			s.scale = Vector2.ONE * 1.6
			s.offset.y = -12
			things.add_child(s)
			_units[u.id] = s
		_units[u.id].position = u.pos
	_drop_missing(_units, seen)


func _drop_missing(nodes: Dictionary, seen: Dictionary) -> void:
	for id in nodes.keys():
		if not seen.has(id):
			nodes[id].queue_free()
			nodes.erase(id)


func _line(color: Color) -> Line2D:
	var line := Line2D.new()
	line.width = 10
	line.default_color = color
	line.begin_cap_mode = Line2D.LINE_CAP_ROUND
	line.end_cap_mode = Line2D.LINE_CAP_ROUND
	$World/Paths.add_child(line)
	return line


func _unhandled_input(e: InputEvent) -> void:
	if e is InputEventMouseButton and e.button_index == MOUSE_BUTTON_LEFT:
		if e.pressed:
			_press(e.position)
		elif not _drag.is_empty():
			_release(e.position)
	elif e is InputEventMouseMotion and _drag.has("from"):
		_drag.line.points = [_drag.from.pos, world.to_local(e.position)]
	elif e is InputEventMouseMotion and not _drag.is_empty():
		ghost.position = world.to_local(e.position)
		var ok: bool = sim.can_build(Sim.PLAYER, _drag.what, ghost.position) == ""
		ghost.modulate = Color(1, 1, 1, 0.7) if ok else Color(1, 0.3, 0.3, 0.7)


func _press(pos: Vector2) -> void:
	if sim.winner != -1:
		return
	for kind in buttons:
		if buttons[kind].get_global_rect().has_point(pos):
			_drag = {"what": kind}
			ghost.texture = TEX[kind]
			ghost.position = world.to_local(pos)
			ghost.show()
			return
	var b := sim.building_at(world.to_local(pos), Sim.PLAYER)
	if b.get("kind") in ["camp", "barracks"]:
		_drag = {"from": b, "line": _line(PATH_COLOR[Sim.PLAYER].lightened(0.4))}


func _release(pos: Vector2) -> void:
	ghost.hide()
	var at := world.to_local(pos)
	if _drag.has("from"):
		_drag.line.queue_free()
		if not sim.set_path(_drag.from, at) and _drag.from.pos.distance_to(at) > 60:
			hint("тяни тропу к залежи" if _drag.from.kind == "camp" else "тяни тропу к зданию врага")
		_drag = {}
		return
	var kind: String = _drag.what
	_drag = {}
	if pos.y > size.y - BOTTOM:
		return
	var why := sim.can_build(Sim.PLAYER, kind, at)
	if why != "":
		hint(why)
	else:
		sim.build(Sim.PLAYER, kind, at)


func hint(text: String) -> void:
	var label: Label = $Hud/Box/Hint
	label.text = text
	label.modulate.a = 1.0
	create_tween().tween_property(label, "modulate:a", 0.0, 1.2).set_delay(0.6)


func _on_sim(what: String, data: Dictionary) -> void:
	match what:
		"built":
			var s := _add_sprite(data.id, TEX[data.kind], data.pos)
			s.scale = Vector2.ONE * (1.9 if data.kind == "home" else 1.5)
			s.modulate = TINT[data.side]
			var bar := ProgressBar.new()
			bar.name = "Hp"
			bar.show_percentage = false
			bar.size = Vector2(44, 6)
			bar.position = Vector2(-22, -30)
			bar.hide()
			s.add_child(bar)
		"destroyed":
			_sprites[data.id].queue_free()
			_sprites.erase(data.id)
		"ended":
			$End/Center/Box/Title.text = "Победа!" if data.winner == Sim.PLAYER else "Поражение"
			$End.show()


func _add_sprite(id: int, tex: Texture2D, pos: Vector2) -> Sprite2D:
	var s := Sprite2D.new()
	s.texture = tex
	s.position = pos
	things.add_child(s)
	_sprites[id] = s
	return s
